"use client";


import { formatTimeWithSeconds } from "../../../lib/format-date";
import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/use-role-router";
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, ClipboardCheck, Radio, Save, ShieldCheck } from "lucide-react";
import { api } from "../../../lib/api-client";
import { ExamRulesModal } from "../../../components/ExamRulesModal";
import { isRulesAcknowledged, markRulesAcknowledged } from "../../../lib/exam-rules";
import { createVideoFaceCounter, type FaceCountResult } from "../../../lib/face-detector";
import { createVideoGazeMonitor, type GazeReading } from "../../../lib/gaze-detector";
import { PROCTORING_EVENT_LABEL, statusLabel } from "../../../lib/status-labels";
import type { ExamAttemptDetail, ProctoringEventType, ViolationState } from "../../../lib/types";

// A face that is missing / cut off must be reported almost immediately: ~1.4s (2 consecutive checks) filters
// single-frame detector drop-outs without letting a student hide for long.
const FACE_CHECK_INTERVAL_MS = 700;
const CONSECUTIVE_CHECKS_BEFORE_ALERT = 2;
// The same kind of violation is counted again at most this often while the student keeps doing it.
const SAME_EVENT_COOLDOWN_MS = 10000;
// Looking away needs to persist ~2s (3 checks) so a quick glance or saccade is not punished.
const GAZE_CONSECUTIVE_CHECKS_BEFORE_ALERT = 3;
// Focus/permission UI right after the exam opens, and the moment a warning is dismissed, must not count.
const MONITORING_START_DELAY_MS = 1500;
const POST_WARNING_GRACE_MS = 3000;
const FOCUS_LOSS_DEDUPE_MS = 1500;
const BLUR_CONFIRM_DELAY_MS = 250;

function formatTime(totalSeconds: number): string {
  const minutes = Math.max(0, Math.floor(totalSeconds / 60));
  const seconds = Math.max(0, Math.floor(totalSeconds % 60));
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function ExamTakingPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();

  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string[]>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [eventLog, setEventLog] = useState<{ type: ProctoringEventType; time: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showFiveMinuteWarning, setShowFiveMinuteWarning] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [cameraConsentAccepted, setCameraConsentAccepted] = useState(false);
  const [detection, setDetection] = useState<{ status: "loading" | "running" | "failed"; result: FaceCountResult | null; message?: string }>({
    status: "loading",
    result: null
  });
  const [gaze, setGaze] = useState<{ status: "loading" | "running" | "failed"; reading: GazeReading | null; message?: string }>({
    status: "loading",
    reading: null
  });
  const [violation, setViolation] = useState<ViolationState | null>(null);
  const [violationNotice, setViolationNotice] = useState<{ eventType: ProctoringEventType; state: ViolationState } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const submittedRef = useRef(false);
  const answersRef = useRef<Record<number, string[]>>({});
  const warningShownRef = useRef(false);
  // Violations are only counted once monitoring is ready, while no warning is open, and outside the post-warning grace.
  const monitoringReadyRef = useRef(false);
  const noticeOpenRef = useRef(false);
  const graceUntilRef = useRef(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await api.get<{ data: ExamAttemptDetail }>(`/exam-attempts/${attemptId}`);
      if (response.data.status !== "in_progress") {
        submittedRef.current = true;
        router.replace(`/dashboard/results/${attemptId}`);
        return;
      }
      setAttempt(response.data);
      // Rules were accepted in the pre-exam popup; only a direct visit/reload of this URL has to accept them again.
      if (isRulesAcknowledged(attemptId)) setCameraConsentAccepted(true);
      setViolation({
        count: response.data.violation_count,
        max_violations: response.data.max_violations,
        remaining: Math.max(0, response.data.max_violations - response.data.violation_count),
        flagged: response.data.is_flagged,
        cancelled: false
      });
      const initialAnswers: Record<number, string[]> = {};
      response.data.questions.forEach((question) => {
        if (question.selected_answer) initialAnswers[question.question_id] = question.selected_answer;
      });
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
      setLoading(false);
    }
    load();
  }, [attemptId, router]);

  const proctoringEnabled = attempt?.proctoring_enabled ?? false;

  const saveAnswer = useCallback(
    async (questionId: number, selectedAnswer: string[]) => {
      await api.patch(`/exam-attempts/${attemptId}/answers`, { question_id: questionId, selected_answer: selectedAnswer });
      setLastSavedAt(formatTimeWithSeconds(new Date()));
    },
    [attemptId]
  );

  const autosaveSnapshot = useCallback(async () => {
    const entries = Object.entries(answersRef.current);
    if (entries.length === 0) return;
    await Promise.allSettled(entries.map(([questionId, selectedAnswer]) => saveAnswer(Number(questionId), selectedAnswer)));
  }, [saveAnswer]);

  const submitAttempt = useCallback(async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setIsSubmitting(true);
    try {
      await autosaveSnapshot();
      await api.post(`/exam-attempts/${attemptId}/submit`);
    } finally {
      router.push(`/dashboard/results/${attemptId}`);
    }
  }, [attemptId, autosaveSnapshot, router]);

  useEffect(() => {
    if (!attempt || attempt.status !== "in_progress") return;

    // Server-computed deadline: the exam duration or the session end date, whichever comes first.
    const endsAt = new Date(attempt.ends_at).getTime();
    function tick() {
      const remaining = (endsAt - Date.now()) / 1000;
      setRemainingSeconds(remaining);
      if (remaining <= 300 && remaining > 0 && !warningShownRef.current) {
        warningShownRef.current = true;
        setShowFiveMinuteWarning(true);
      }
      if (remaining <= 0) {
        submitAttempt();
      }
    }
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [attempt, submitAttempt]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      autosaveSnapshot().catch(() => {});
    }, 60_000);
    return () => window.clearInterval(interval);
  }, [autosaveSnapshot]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (attempt?.status === "in_progress" && !submittedRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [attempt?.status]);

  const canReportViolation = useCallback(
    () =>
      !submittedRef.current && monitoringReadyRef.current && !noticeOpenRef.current && Date.now() >= graceUntilRef.current,
    []
  );

  const dismissViolationNotice = useCallback(() => {
    noticeOpenRef.current = false;
    graceUntilRef.current = Date.now() + POST_WARNING_GRACE_MS;
    setViolationNotice(null);
  }, []);

  const recordEvent = useCallback(
    async (eventType: ProctoringEventType, severity: "low" | "medium" | "high") => {
      if (!canReportViolation()) return;
      setEventLog((prev) => [{ type: eventType, time: formatTimeWithSeconds(new Date()) }, ...prev].slice(0, 8));
      try {
        const response = await api.post<{ data: { violation: ViolationState } }>(`/exam-attempts/${attemptId}/proctoring-events`, {
          event_type: eventType,
          severity
        });
        const state = response.data.violation;
        setViolation(state);
        if (state.cancelled) submittedRef.current = true;
        noticeOpenRef.current = true;
        setViolationNotice({ eventType, state });
      } catch {
        // Telemetry failures must never block the exam; the server stays the source of truth for violations.
      }
    },
    [attemptId, canReportViolation]
  );

  // The exam is only allowed on this tab/window: leaving it (other tab, other app/monitor, address bar, devtools) is a violation.
  useEffect(() => {
    if (!proctoringEnabled || !cameraConsentAccepted) return;
    let lastFocusViolationAt = 0;
    let blurTimer: number | undefined;

    function reportFocusLoss(eventType: ProctoringEventType) {
      const now = Date.now();
      if (now - lastFocusViolationAt < FOCUS_LOSS_DEDUPE_MS) return;
      lastFocusViolationAt = now;
      recordEvent(eventType, "medium");
    }

    function handleVisibilityChange() {
      if (document.hidden) reportFocusLoss("tab_switch");
    }

    function handleBlur() {
      window.clearTimeout(blurTimer);
      // Wait briefly so a tab switch (blur + hidden) is reported once, as tab_switch rather than window_blur.
      blurTimer = window.setTimeout(() => {
        if (document.hidden) reportFocusLoss("tab_switch");
        else if (!document.hasFocus()) reportFocusLoss("window_blur");
      }, BLUR_CONFIRM_DELAY_MS);
    }

    function handleFocus() {
      window.clearTimeout(blurTimer);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    return () => {
      window.clearTimeout(blurTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [recordEvent, proctoringEnabled, cameraConsentAccepted]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectInterval: number | undefined;
    let cancelled = false;
    let consecutiveCount = 0;
    let lastResult: FaceCountResult | null = null;
    const lastEventAt: Partial<Record<ProctoringEventType, number>> = {};

    let armTimer: number | undefined;

    function maybeRecord(eventType: ProctoringEventType, severity: "low" | "medium" | "high") {
      if (!canReportViolation()) return;
      const now = Date.now();
      const last = lastEventAt[eventType] ?? 0;
      if (now - last < SAME_EVENT_COOLDOWN_MS) return;
      lastEventAt[eventType] = now;
      recordEvent(eventType, severity);
    }

    // Start counting violations only after the camera permission prompt is gone, so its focus changes are not penalised.
    function armMonitoring() {
      armTimer = window.setTimeout(() => {
        monitoringReadyRef.current = true;
      }, MONITORING_START_DELAY_MS);
    }

    async function enableCamera() {
      // Step 1: show the camera. A failure here (permission denied, no device) is the only case that means "no camera".
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      } catch {
        setCameraEnabled(false);
        armMonitoring();
        return;
      }
      armMonitoring();
      if (cancelled) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      video.play().catch(() => {});
      setCameraEnabled(true);

      // Step 2: face detection is best-effort; if the model cannot load the camera preview must stay visible.
      try {
        const { detectFaceCount } = await createVideoFaceCounter(video);
        if (cancelled) return;
        setDetection({ status: "running", result: null });

        // Gaze tracking loads separately (bigger model); if it fails, face presence checks keep working.
        let detectGaze: (() => GazeReading | null) | null = null;
        let gazeAwayCount = 0;
        setGaze({ status: "loading", reading: null });
        createVideoGazeMonitor(video)
          .then((monitor) => {
            if (cancelled) return;
            detectGaze = monitor.detectGaze;
            setGaze({ status: "running", reading: null });
          })
          .catch((error) => {
            console.error("Gaze tracking could not start", error);
            if (!cancelled) setGaze({ status: "failed", reading: null, message: error instanceof Error ? error.message : String(error) });
          });

        detectInterval = window.setInterval(() => {
          let result: FaceCountResult | null;
          try {
            result = detectFaceCount();
          } catch (error) {
            console.error("Face detection tick failed", error);
            setDetection({ status: "failed", result: null, message: error instanceof Error ? error.message : String(error) });
            return;
          }
          if (result === null) return;
          setDetection((prev) => (prev.status === "running" && prev.result === result ? prev : { status: "running", result }));

          if (result === lastResult) {
            consecutiveCount += 1;
          } else {
            consecutiveCount = 1;
            lastResult = result;
          }

          if (consecutiveCount >= CONSECUTIVE_CHECKS_BEFORE_ALERT) {
            if (result === "no_face") maybeRecord("no_face", "medium");
            if (result === "multiple_faces") maybeRecord("multiple_faces", "high");
            if (result === "face_out_of_frame") maybeRecord("face_out_of_frame", "medium");
          }

          // Gaze only matters while exactly one face is properly in frame.
          if (detectGaze) {
            if (result !== "ok") {
              gazeAwayCount = 0;
              setGaze((prev) => (prev.reading === null ? prev : { ...prev, reading: null }));
            } else {
              try {
                const reading = detectGaze();
                if (reading) {
                  setGaze({ status: "running", reading });
                  gazeAwayCount = reading.state === "looking_away" ? gazeAwayCount + 1 : 0;
                  if (gazeAwayCount >= GAZE_CONSECUTIVE_CHECKS_BEFORE_ALERT) maybeRecord("looking_away", "medium");
                }
              } catch (error) {
                console.error("Gaze tick failed", error);
                detectGaze = null;
                setGaze({ status: "failed", reading: null, message: error instanceof Error ? error.message : String(error) });
              }
            }
          }
        }, FACE_CHECK_INTERVAL_MS);
      } catch (error) {
        console.error("Face detection could not start", error);
        if (!cancelled) setDetection({ status: "failed", result: null, message: error instanceof Error ? error.message : String(error) });
      }
    }

    if (proctoringEnabled && cameraConsentAccepted) enableCamera();

    return () => {
      cancelled = true;
      window.clearTimeout(armTimer);
      monitoringReadyRef.current = false;
      if (detectInterval) window.clearInterval(detectInterval);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [recordEvent, canReportViolation, cameraConsentAccepted, proctoringEnabled]);

  function handleSelectAnswer(questionId: number, option: string, questionType: string) {
    setAnswers((prev) => {
      let next: string[];
      if (questionType === "multiple_choice") {
        const current = prev[questionId] ?? [];
        next = current.includes(option) ? current.filter((value) => value !== option) : [...current, option];
      } else {
        next = [option];
      }
      const updated = { ...prev, [questionId]: next };
      answersRef.current = updated;
      saveAnswer(questionId, next).catch(() => {});
      return updated;
    });
  }

  const question = attempt?.questions[activeIndex];
  const answeredCount = useMemo(() => Object.values(answers).filter((value) => value.length > 0).length, [answers]);

  if (loading || !attempt) {
    return (
      <main className="authShell">
        <p style={{ color: "var(--muted)" }}>{tr("Đang tải đề thi...")}</p>
      </main>
    );
  }

  // Camera frame border: green while everything is fine, red while a violation condition is visible.
  const frameTone =
    detection.status !== "running" || detection.result === null
      ? ""
      : detection.result !== "ok" || gaze.reading?.state === "looking_away"
        ? "statusAlert"
        : "statusOk";
  const unansweredCount = attempt.questions.length - answeredCount;
  const progressPercent = Math.round((answeredCount / Math.max(1, attempt.questions.length)) * 100);

  return (
    <main className="shell clientExamShell">
      <section className="workspace" style={{ gridColumn: "1 / -1", padding: "16px 24px" }}>
        <header className={remainingSeconds <= 300 ? "topbar examTopbar urgent" : "topbar examTopbar"}>
          <div>
            <p className="eyebrow">
              {tr("Đang làm bài · Lần thi")} {attempt.attempt_number}/{attempt.max_attempts}
            </p>
            <h1>{attempt.exam_title}</h1>
            <div className="examStats">
              <span>
                <ClipboardCheck size={15} />
                {answeredCount}/{attempt.questions.length} {tr("đã trả lời")}
              </span>
              {proctoringEnabled ? (
                <span>
                  <ShieldCheck size={15} />
                  {tr("Camera proctoring")}
                </span>
              ) : null}
              {proctoringEnabled && violation ? (
                <span style={violation.count > 0 ? { color: "var(--danger, #dc2626)", fontWeight: 700 } : undefined}>
                  <AlertTriangle size={15} />
                  {tr("Cảnh báo:")} {violation.count}/{violation.max_violations}
                </span>
              ) : null}
              <span>
                <Save size={15} />
                {lastSavedAt ? tr("Đã lưu {0}", lastSavedAt) : tr("Autosave mỗi 1 phút")}
              </span>
            </div>
          </div>
          <div className="topActions">
            <span className="timer">{formatTime(remainingSeconds)}</span>
            <button className="primaryButton" onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting}>
              {tr("Nộp bài")}
            </button>
          </div>
        </header>

        <section className={`examWorkspaceGrid fitViewport${proctoringEnabled ? "" : " twoColumns"}`} style={{ ["--fit-offset" as string]: "170px" }}>
          <aside className="panel questionSidebar">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">{tr("Sidebar câu hỏi")}</p>
                <h2>{tr("Tiến trình")}</h2>
              </div>
            </div>
            <div className="examProgressLine">
              <i style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="paletteGrid">
              {attempt.questions.map((item, index) => {
                const isAnswered = (answers[item.question_id] ?? []).length > 0;
                return (
                  <button
                    key={item.question_id}
                    className={`${index === activeIndex ? "paletteDot active" : "paletteDot"} ${isAnswered ? "answered" : ""}`}
                    onClick={() => setActiveIndex(index)}
                    title={tr("Câu {0}{1}", index + 1, isAnswered ? " đã trả lời" : " chưa trả lời")}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="paletteLegend">
              <span><i className="legendAnswered" /> {tr("Đã trả lời")}</span>
              <span><i className="legendCurrent" /> {tr("Đang xem")}</span>
              <span><i /> {tr("Chưa làm")}</span>
            </div>
          </aside>

          <article className="panel examPanel fitPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">
                  {tr("Câu")} {activeIndex + 1} / {attempt.questions.length} {tr("| Còn")} {unansweredCount} {tr("câu chưa trả lời")}
                </p>
              </div>
            </div>

            <div className="fitBody">
              {question ? (
                <div className="examQuestion">
                  <span>{tr("Câu")} {activeIndex + 1}</span>
                  <h3>{question.question_text}</h3>
                  {question.options.map((option) => (
                    <button
                      key={option}
                      className={(answers[question.question_id] ?? []).includes(option) ? "answer selected" : "answer"}
                      onClick={() => handleSelectAnswer(question.question_id, option, question.question_type)}
                    >
                      <b>{option.charAt(0)}</b>
                      <span>{option}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="fitFooter controlRow" style={{ justifyContent: "space-between" }}>
              <button className="iconButton" style={{ width: "auto", padding: "0 16px" }} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} disabled={activeIndex === 0}>
                <ChevronLeft size={17} />
                {tr("Câu trước")}
              </button>
              {activeIndex < attempt.questions.length - 1 ? (
                <button className="primaryButton" onClick={() => setActiveIndex((index) => index + 1)}>
                  {tr("Câu tiếp theo")}
                  <ChevronRight size={17} />
                </button>
              ) : (
                <button className="primaryButton" onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting}>
                  {isSubmitting ? tr("Đang nộp bài...") : tr("Nộp bài")}
                </button>
              )}
            </div>
          </article>

          {proctoringEnabled ? (
          <article className="panel cameraPanel examCameraPanel fitPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">{tr("Camera proctoring")}</p>
                <h2>{tr("Giám sát hỗ trợ")}</h2>
              </div>
            </div>

            <div className={`cameraFrame${cameraEnabled ? " online" : ""}${frameTone ? ` ${frameTone}` : ""}`}>
              {/* Always mounted so videoRef is set before the stream is attached. */}
              {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraEnabled ? "block" : "none" }}
              />
              {!cameraEnabled && (
                <div className="faceGuide">
                  <Camera size={36} />
                </div>
              )}
              <span className="liveBadge">
                <Radio size={14} />
                {cameraEnabled ? tr("Đang giám sát") : tr("Chưa cấp quyền camera")}
              </span>
            </div>
            {cameraEnabled ? (
              <p
                style={{
                  fontSize: 12,
                  marginTop: 10,
                  fontWeight: 700,
                  color: detection.status === "failed" ? "var(--danger, #dc2626)" : detection.result === "ok" ? "#16a34a" : "var(--muted)"
                }}
              >
                {detection.status === "loading"
                  ? tr("Nhận diện khuôn mặt: đang tải mô hình...")
                  : detection.status === "failed"
                    ? tr("Nhận diện khuôn mặt: không khởi động được ({0}). Camera vẫn hiển thị; việc phát hiện rời tab vẫn hoạt động.", detection.message ?? "lỗi không rõ")
                    : tr("Nhận diện khuôn mặt: đang chạy · {0}", detection.result === null
                          ? "đang chờ hình từ camera"
                          : detection.result === "ok"
                            ? "thấy 1 khuôn mặt"
                            : detection.result === "no_face"
                              ? "không thấy khuôn mặt"
                              : detection.result === "multiple_faces"
                                ? "nhiều khuôn mặt"
                                : "khuôn mặt sát mép khung hình")}
              </p>
            ) : null}
            {cameraEnabled && detection.status === "running" ? (
              <p style={{ fontSize: 12, marginTop: 6, fontWeight: 700, color: gaze.reading?.state === "looking_away" ? "var(--danger, #dc2626)" : "var(--muted)" }}>
                {gaze.status === "loading"
                  ? tr("Hướng nhìn: đang tải mô hình...")
                  : gaze.status === "failed"
                    ? tr("Hướng nhìn: không khởi động được ({0}).", gaze.message ?? "lỗi không rõ")
                    : gaze.reading === null
                      ? tr("Hướng nhìn: chờ khuôn mặt vào khung")
                      : gaze.reading.state === "looking_away"
                        ? tr("Hướng nhìn: đang nhìn ra ngoài màn hình thi")
                        : gaze.reading.state === "eyes_closed"
                          ? tr("Hướng nhìn: mắt đang nhắm")
                          : tr("Hướng nhìn: đang nhìn vào màn hình thi")}
                {gaze.reading
                  ? tr(" (đầu xoay {0}°, mắt liếc ngang {1})", Math.round(gaze.reading.yawDeg), gaze.reading.eyeHorizontal.toFixed(2))
                  : ""}
              </p>
            ) : null}
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              {tr("Hệ thống ghi nhận mọi hành vi bất thường. Vi phạm quá")} {attempt.max_violations} {tr("lần cảnh báo, bài thi sẽ bị nộp tự động và chấm 0 điểm.")}
            </p>

            <div className="eventList" style={{ marginTop: 14 }}>
              {eventLog.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{tr("Chưa có cảnh báo nào.")}</span>
              ) : (
                eventLog.map((event, index) => (
                  <div className="eventItem" key={index}>
                    <div>
                      <strong>{statusLabel(PROCTORING_EVENT_LABEL, event.type)}</strong>
                      <span>{event.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
          ) : null}
        </section>
      </section>

      {!cameraConsentAccepted ? (
        <ExamRulesModal
          title={attempt.exam_title ?? tr("Bài thi")}
          durationMinutes={attempt.duration_minutes}
          questionCount={attempt.questions.length}
          maxAttempts={attempt.max_attempts}
          proctoringEnabled={attempt.proctoring_enabled}
          maxViolations={attempt.max_violations}
          onConfirm={() => {
            markRulesAcknowledged(attemptId);
            setCameraConsentAccepted(true);
          }}
        />
      ) : null}

      {violationNotice ? (
        <div className="modalBackdrop" role="alertdialog" aria-modal="true">
          <div className="confirmModal">
            <AlertTriangle size={30} />
            {violationNotice.state.cancelled ? (
              <>
                <h2>{tr("Bài thi đã bị hủy do gian lận")}</h2>
                <p>
                  {tr("Hệ thống phát hiện:")} <strong>{statusLabel(PROCTORING_EVENT_LABEL, violationNotice.eventType)}</strong>{tr(". Bạn đã vi phạm quá số lần cảnh báo cho phép")}
                  {violationNotice.state.max_violations === 0 ? tr(" (kỳ thi không cho phép vi phạm)") : tr(" ({0} lần)", violationNotice.state.max_violations)}.
                </p>
                <p>{tr("Bài thi được nộp tự động, bị chấm")} <strong>{tr("0 điểm")}</strong> {tr("và đánh dấu gian lận.")}</p>
                <button className="primaryButton wide" onClick={() => router.push(`/dashboard/results/${attemptId}`)}>
                  {tr("Xem kết quả")}
                </button>
              </>
            ) : (
              <>
                <h2>{tr("Cảnh báo vi phạm quy chế thi")}</h2>
                <p>
                  {tr("Hệ thống phát hiện:")} <strong>{statusLabel(PROCTORING_EVENT_LABEL, violationNotice.eventType)}</strong>{tr(". Đây là cảnh báo thứ")} {violationNotice.state.count}/
                  {violationNotice.state.max_violations}{tr("; bài làm của bạn đã bị đánh dấu.")}
                </p>
                <p>
                  {violationNotice.state.remaining > 0 ? (
                    <>{tr("Bạn còn")} <strong>{violationNotice.state.remaining} {tr("lần")}</strong> {tr("cảnh báo.")} </>
                  ) : (
                    <>{tr("Đây là")} <strong>{tr("cảnh báo cuối cùng")}</strong>. </>
                  )}
                  {tr("Nếu vi phạm thêm, bài thi sẽ bị nộp tự động, chấm 0 điểm và đánh dấu gian lận.")}
                </p>
                <button className="primaryButton wide" onClick={dismissViolationNotice}>
                  {tr("Tôi đã hiểu, tiếp tục làm bài")}
                </button>
              </>
            )}
          </div>
        </div>
      ) : null}

      {showFiveMinuteWarning ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="confirmModal">
            <AlertTriangle size={30} />
            <h2>{tr("Còn 5 phút làm bài")}</h2>
            <p>{tr("Kiểm tra các câu chưa trả lời trong sidebar trước khi nộp bài.")}</p>
            <button className="primaryButton wide" onClick={() => setShowFiveMinuteWarning(false)}>
              {tr("Đã hiểu")}
            </button>
          </div>
        </div>
      ) : null}

      {showSubmitConfirm ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="confirmModal">
            <ClipboardCheck size={30} />
            <h2>{tr("Xác nhận nộp bài?")}</h2>
            <p>{tr("Bạn đã trả lời")} {answeredCount}/{attempt.questions.length} {tr("câu. Sau khi nộp, bài thi sẽ được chấm điểm và không thể sửa đáp án.")}</p>
            <div className="controlRow">
              <button className="iconButton" style={{ width: "auto", padding: "0 16px" }} onClick={() => setShowSubmitConfirm(false)} disabled={isSubmitting}>
                {tr("Kiểm tra lại")}
              </button>
              <button className="primaryButton" onClick={submitAttempt} disabled={isSubmitting}>
                {isSubmitting ? tr("Đang nộp...") : tr("Nộp bài")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
