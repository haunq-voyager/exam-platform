"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AlertTriangle, Camera, ChevronLeft, ChevronRight, ClipboardCheck, Radio, Save, ShieldCheck, Video } from "lucide-react";
import { api } from "../../../lib/api-client";
import { createVideoFaceCounter, type FaceCountResult } from "../../../lib/face-detector";
import type { ExamAttemptDetail, ProctoringEventType } from "../../../lib/types";

const FACE_CHECK_INTERVAL_MS = 3000;
const CONSECUTIVE_CHECKS_BEFORE_ALERT = 2;
const SAME_EVENT_COOLDOWN_MS = 20000;

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
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const submittedRef = useRef(false);
  const answersRef = useRef<Record<number, string[]>>({});
  const warningShownRef = useRef(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const response = await api.get<{ data: ExamAttemptDetail }>(`/exam-attempts/${attemptId}`);
      setAttempt(response.data);
      const initialAnswers: Record<number, string[]> = {};
      response.data.questions.forEach((question) => {
        if (question.selected_answer) initialAnswers[question.question_id] = question.selected_answer;
      });
      setAnswers(initialAnswers);
      answersRef.current = initialAnswers;
      setLoading(false);
    }
    load();
  }, [attemptId]);

  const saveAnswer = useCallback(
    async (questionId: number, selectedAnswer: string[]) => {
      await api.patch(`/exam-attempts/${attemptId}/answers`, { question_id: questionId, selected_answer: selectedAnswer });
      setLastSavedAt(new Date().toLocaleTimeString("vi-VN"));
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

    const startedAt = new Date(attempt.started_at).getTime();
    const durationSeconds = attempt.duration_minutes * 60;
    function tick() {
      const elapsed = (Date.now() - startedAt) / 1000;
      const remaining = durationSeconds - elapsed;
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

  const recordEvent = useCallback(
    async (eventType: ProctoringEventType, severity: "low" | "medium" | "high") => {
      setEventLog((prev) => [{ type: eventType, time: new Date().toLocaleTimeString("vi-VN") }, ...prev].slice(0, 8));
      try {
        await api.post(`/exam-attempts/${attemptId}/proctoring-events`, { event_type: eventType, severity });
      } catch {
        // Best-effort telemetry should never block the exam.
      }
    },
    [attemptId]
  );

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden) recordEvent("tab_switch", "medium");
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [recordEvent]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let detectInterval: number | undefined;
    let cancelled = false;
    let consecutiveCount = 0;
    let lastResult: FaceCountResult | null = null;
    const lastEventAt: Partial<Record<ProctoringEventType, number>> = {};

    function maybeRecord(eventType: ProctoringEventType, severity: "low" | "medium" | "high") {
      const now = Date.now();
      const last = lastEventAt[eventType] ?? 0;
      if (now - last < SAME_EVENT_COOLDOWN_MS) return;
      lastEventAt[eventType] = now;
      recordEvent(eventType, severity);
    }

    async function enableCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraEnabled(true);

        const video = videoRef.current;
        if (!video) return;
        const { detectFaceCount } = await createVideoFaceCounter(video);
        if (cancelled) return;

        detectInterval = window.setInterval(() => {
          const result = detectFaceCount();
          if (result === null) return;

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
        }, FACE_CHECK_INTERVAL_MS);
      } catch {
        setCameraEnabled(false);
      }
    }

    if (cameraConsentAccepted) enableCamera();

    return () => {
      cancelled = true;
      if (detectInterval) window.clearInterval(detectInterval);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [recordEvent, cameraConsentAccepted]);

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
        <p style={{ color: "var(--muted)" }}>Đang tải đề thi...</p>
      </main>
    );
  }

  const unansweredCount = attempt.questions.length - answeredCount;
  const progressPercent = Math.round((answeredCount / Math.max(1, attempt.questions.length)) * 100);

  return (
    <main className="shell clientExamShell">
      <section className="workspace" style={{ gridColumn: "1 / -1" }}>
        <header className={remainingSeconds <= 300 ? "topbar examTopbar urgent" : "topbar examTopbar"}>
          <div>
            <p className="eyebrow">Đang làm bài</p>
            <h1>{attempt.exam_title}</h1>
            <div className="examStats">
              <span>
                <ClipboardCheck size={15} />
                {answeredCount}/{attempt.questions.length} đã trả lời
              </span>
              <span>
                <ShieldCheck size={15} />
                Camera proctoring
              </span>
              <span>
                <Save size={15} />
                {lastSavedAt ? `Đã lưu ${lastSavedAt}` : "Autosave mỗi 1 phút"}
              </span>
            </div>
          </div>
          <div className="topActions">
            <span className="timer">{formatTime(remainingSeconds)}</span>
            <button className="primaryButton" onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting}>
              Nộp bài
            </button>
          </div>
        </header>

        <section className="examWorkspaceGrid">
          <aside className="panel questionSidebar">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Sidebar câu hỏi</p>
                <h2>Tiến trình</h2>
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
                    title={`Câu ${index + 1}${isAnswered ? " đã trả lời" : " chưa trả lời"}`}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            <div className="paletteLegend">
              <span><i className="legendAnswered" /> Đã trả lời</span>
              <span><i className="legendCurrent" /> Đang xem</span>
              <span><i /> Chưa làm</span>
            </div>
          </aside>

          <article className="panel examPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">
                  Câu {activeIndex + 1} / {attempt.questions.length} | Còn {unansweredCount} câu chưa trả lời
                </p>
                <h2>Đề thi</h2>
              </div>
            </div>

            {question ? (
              <div className="examQuestion">
                <span>Câu {activeIndex + 1}</span>
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

            <div className="controlRow" style={{ justifyContent: "space-between" }}>
              <button className="iconButton" style={{ width: "auto", padding: "0 16px" }} onClick={() => setActiveIndex((index) => Math.max(0, index - 1))} disabled={activeIndex === 0}>
                <ChevronLeft size={17} />
                Câu trước
              </button>
              {activeIndex < attempt.questions.length - 1 ? (
                <button className="primaryButton" onClick={() => setActiveIndex((index) => index + 1)}>
                  Câu tiếp theo
                  <ChevronRight size={17} />
                </button>
              ) : (
                <button className="primaryButton" onClick={() => setShowSubmitConfirm(true)} disabled={isSubmitting}>
                  {isSubmitting ? "Đang nộp bài..." : "Nộp bài"}
                </button>
              )}
            </div>
          </article>

          <article className="panel cameraPanel examCameraPanel">
            <div className="panelHeader">
              <div>
                <p className="eyebrow">Camera proctoring</p>
                <h2>Giám sát hỗ trợ</h2>
              </div>
            </div>

            <div className={cameraEnabled ? "cameraFrame online" : "cameraFrame"}>
              {cameraEnabled ? (
                // eslint-disable-next-line jsx-a11y/media-has-caption
                <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <div className="faceGuide">
                  <Camera size={36} />
                </div>
              )}
              <span className="liveBadge">
                <Radio size={14} />
                {cameraEnabled ? "Đang giám sát" : "Chưa cấp quyền camera"}
              </span>
            </div>
            <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
              Hệ thống ghi nhận sự kiện cảnh báo trong lúc làm bài và không chặn thao tác trả lời.
            </p>

            <div className="eventList" style={{ marginTop: 14 }}>
              {eventLog.length === 0 ? (
                <span style={{ fontSize: 13, color: "var(--muted)" }}>Chưa có cảnh báo nào.</span>
              ) : (
                eventLog.map((event, index) => (
                  <div className="eventItem" key={index}>
                    <div>
                      <strong>{event.type}</strong>
                      <span>{event.time}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </section>

      {!cameraConsentAccepted ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="confirmModal">
            <Video size={30} />
            <h2>Thông báo sử dụng camera giám sát</h2>
            <p>
              Trong suốt thời gian làm bài, hệ thống sẽ bật camera của bạn để hỗ trợ giám sát. Vui lòng đọc kỹ trước
              khi tiếp tục:
            </p>
            <ul className="rulesList">
              <li>Hệ thống chỉ gửi về máy chủ các <strong>sự kiện cảnh báo</strong> (không có khuôn mặt, nhiều khuôn mặt, rời khung hình, chuyển tab) — không ghi lại hay lưu trữ video.</li>
              <li>Hình ảnh camera chỉ hiển thị tại trình duyệt của bạn, không được truyền đi.</li>
              <li>Đây là cơ chế <strong>cảnh báo hỗ trợ</strong> giảng viên/giám thị — hệ thống không tự động kết luận gian lận hay trừ điểm.</li>
            </ul>
            <button className="primaryButton wide" onClick={() => setCameraConsentAccepted(true)}>
              Tôi đã hiểu, bắt đầu làm bài
            </button>
          </div>
        </div>
      ) : null}

      {showFiveMinuteWarning ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="confirmModal">
            <AlertTriangle size={30} />
            <h2>Còn 5 phút làm bài</h2>
            <p>Kiểm tra các câu chưa trả lời trong sidebar trước khi nộp bài.</p>
            <button className="primaryButton wide" onClick={() => setShowFiveMinuteWarning(false)}>
              Đã hiểu
            </button>
          </div>
        </div>
      ) : null}

      {showSubmitConfirm ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true">
          <div className="confirmModal">
            <ClipboardCheck size={30} />
            <h2>Xác nhận nộp bài?</h2>
            <p>Bạn đã trả lời {answeredCount}/{attempt.questions.length} câu. Sau khi nộp, bài thi sẽ được chấm điểm và không thể sửa đáp án.</p>
            <div className="controlRow">
              <button className="iconButton" style={{ width: "auto", padding: "0 16px" }} onClick={() => setShowSubmitConfirm(false)} disabled={isSubmitting}>
                Kiểm tra lại
              </button>
              <button className="primaryButton" onClick={submitAttempt} disabled={isSubmitting}>
                {isSubmitting ? "Đang nộp..." : "Nộp bài"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
