"use client";


import { formatDateTime } from "../../../../lib/format-date";
import { tr } from "../../../../lib/i18n";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "@/components/RoleLink";
import { useParams } from "next/navigation";
import { useRouter } from "@/lib/use-role-router";
import { ArrowLeft, BookOpenCheck, CalendarClock, CheckCircle2, ClipboardList, Clock3, FileText, MessageSquareText, PlayCircle, ShieldCheck } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { AttemptHistory } from "../../../../components/AttemptHistory";
import { useBreadcrumbLabel } from "../../../../components/Breadcrumbs";
import { ExamRulesModal } from "../../../../components/ExamRulesModal";
import { StudentFeedback } from "../../../../components/StudentFeedback";
import { markRulesAcknowledged } from "../../../../lib/exam-rules";
import { ATTEMPT_STATUS_LABEL, EXAM_STATUS_LABEL, SCORING_METHOD_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { ExamAttempt, StudentExam } from "../../../../lib/types";

function formatDate(value: string | null): string {
  if (!value) return tr("Chưa đặt lịch");
  return formatDateTime(value);
}

function formatCountdown(value: string | null): string {
  if (!value) return tr("Đang cập nhật");
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return tr("Có thể vào thi");
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return days > 0 ? tr("{0} ngày {1} giờ", days, hours) : tr("{0} giờ {1} phút", hours, minutes);
}

export default function StudentExamDetailPage() {
  const params = useParams<{ examId: string }>();
  const examId = Number(params.examId);
  const router = useRouter();
  const [exams, setExams] = useState<StudentExam[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [examResponse, attemptResponse] = await Promise.all([
          api.get<{ data: StudentExam[] }>("/student/exams"),
          api.get<{ data: ExamAttempt[] }>("/exam-attempts")
        ]);
        setExams(examResponse.data);
        setAttempts(attemptResponse.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const exam = useMemo(() => exams.find((item) => item.id === examId) ?? null, [exams, examId]);
  const examAttempts = useMemo(() => attempts.filter((attempt) => attempt.exam_session_id === examId), [attempts, examId]);

  async function handleConfirmStart() {
    if (!exam) return;
    setError(null);
    setIsStarting(true);
    try {
      let attemptId = exam.my_attempt_id;
      if (!attemptId || exam.my_attempt_status !== "in_progress") {
        const response = await api.post<{ data: { id: number } }>(`/exam-sessions/${exam.id}/attempts`);
        attemptId = response.data.id;
      }
      markRulesAcknowledged(attemptId);
      router.push(`/exam/${attemptId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể bắt đầu làm bài."));
      setShowRules(false);
    } finally {
      setIsStarting(false);
    }
  }

  useBreadcrumbLabel(exam?.title);

  if (loading) {
    return <div className="emptyState" role="status">{tr("Đang tải chi tiết kỳ thi…")}</div>;
  }

  if (!exam) {
    return (
      <section className="panel">
        <div className="emptyState">{tr("Không tìm thấy kỳ thi.")}</div>
      </section>
    );
  }

  const canStart = exam.can_attempt;
  const startLabel =
    exam.my_attempt_status === "in_progress"
      ? tr("Tiếp tục bài đang làm")
      : exam.my_attempt_count > 0
        ? tr("Thi lại (lần {0}/{1})", exam.my_attempt_count + 1, exam.max_attempts)
        : tr("Bắt đầu làm bài");

  return (
    <>
      {error ? <div className="formError" role="alert" style={{ marginBottom: 14 }}>{error}</div> : null}

      <section className="examDetailHero">
        <div>
          <p className="eyebrow">{tr("Chi tiết kỳ thi")}</p>
          <h1 id="page-title" tabIndex={-1}>{exam.title}</h1>
          <p>{exam.description ?? tr("Đọc kỹ thông tin, quy định và lịch sử các lần thi trước khi vào phòng thi.")}</p>
          <div className="examDetailStats">
            <span>
              <Clock3 size={16} />
              {exam.duration_minutes} {tr("phút")}
            </span>
            <span>
              <FileText size={16} />
              {exam.question_count} {tr("câu hỏi")}
            </span>
            <span>
              <CalendarClock size={16} />
              {formatDate(exam.start_at)}
            </span>
          </div>
        </div>
        <div className="examStartCard">
          <span className="badge blue">{statusLabel(EXAM_STATUS_LABEL, exam.status)}</span>
          <strong>{exam.status === "scheduled" ? formatCountdown(exam.start_at) : statusLabel(ATTEMPT_STATUS_LABEL, exam.my_attempt_status)}</strong>
          <p>{exam.end_at ? tr("Hạn kết thúc: {0}", formatDate(exam.end_at)) : tr("Giáo viên chưa đặt hạn kết thúc.")}</p>
          <button className="primaryButton wide" onClick={() => setShowRules(true)} disabled={!canStart}>
            <PlayCircle size={17} />
            {startLabel}
          </button>
          {exam.my_score !== null ? (
            <p>
              {tr("Điểm hiện tại (")}{statusLabel(SCORING_METHOD_LABEL, exam.scoring_method).toLowerCase()}): <strong>{exam.my_score}</strong>
            </p>
          ) : null}
        </div>
      </section>

      <section className="detailGrid">
        <article className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Mô tả")}</p>
              <h2>{tr("Thông tin bài thi")}</h2>
            </div>
          </div>
          <div className="detailInfoGrid">
            <div>
              <BookOpenCheck size={20} />
              <strong>{tr("Nội dung")}</strong>
              <span>{exam.description ?? tr("Bài thi đánh giá kiến thức tổng hợp theo đề cương môn học.")}</span>
            </div>
            <div>
              <ShieldCheck size={20} />
              <strong>{tr("Giám sát")}</strong>
              <span>
                {exam.proctoring_enabled
                  ? exam.max_violations === 0
                    ? tr("Có giám sát camera và rời tab. Vi phạm lần đầu sẽ bị nộp bài, chấm 0 điểm và đánh dấu gian lận.")
                    : tr("Có giám sát camera và rời tab. Được cảnh báo tối đa {0} lần; vi phạm quá số lần này bài thi bị nộp, chấm 0 điểm. Mọi vi phạm đều bị đánh dấu.", exam.max_violations)
                  : tr("Kỳ thi này không bật giám sát camera. Bài thi tự động nộp khi hết giờ.")}
              </span>
            </div>
            <div>
              <ClipboardList size={20} />
              <strong>{tr("Chấm điểm")}</strong>
              <span>
                {exam.max_attempts > 1
                  ? tr("Được thi tối đa {0} lần. Điểm cuối cùng: {1}. Đáp án chỉ hiển thị khi bạn hết lượt thi.", exam.max_attempts, statusLabel(SCORING_METHOD_LABEL, exam.scoring_method).toLowerCase())
                  : tr("Chỉ được thi 1 lần. Kết quả hiển thị sau khi nộp bài và hệ thống chấm đáp án.")}
              </span>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Quy định")}</p>
              <h2>{tr("Trước khi vào thi")}</h2>
            </div>
          </div>
          <ul className="rulesList">
            <li>{tr("Không rời khỏi tab thi trong quá trình làm bài.")}</li>
            <li>{tr("Đáp án được tự động lưu định kỳ, nhưng bạn vẫn nên kiểm tra trước khi nộp.")}</li>
            <li>{tr("Khi còn 5 phút, hệ thống sẽ hiện cảnh báo thời gian.")}</li>
            <li>{tr("Nếu thoát giữa chừng, vào lại sẽ tiếp tục đúng attempt đang làm nếu còn thời gian.")}</li>
          </ul>
        </article>

        <article className="panel detailWide">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Lịch sử")}</p>
              <h2>
                {tr("Các lần thi (")}{examAttempts.length}/{exam.max_attempts})
              </h2>
            </div>
            {exam.my_score !== null ? (
              <span className="scorePill">
                <CheckCircle2 size={16} />
                {tr("Điểm cuối cùng:")} {exam.my_score}
              </span>
            ) : null}
          </div>
          <AttemptHistory attempts={examAttempts} audience="student" scoringMethod={exam.scoring_method} />
        </article>

        <article className="panel detailWide">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">{tr("Góp ý")}</p>
              <h2>{tr("Phản hồi bài thi cho giáo viên")}</h2>
            </div>
          </div>
          <StudentFeedback sessionId={exam.id} attempts={examAttempts} />
        </article>
      </section>

      {showRules ? (
        <ExamRulesModal
          title={exam.title}
          durationMinutes={exam.duration_minutes}
          questionCount={exam.question_count}
          maxAttempts={exam.max_attempts}
          scoringMethod={exam.scoring_method}
          proctoringEnabled={exam.proctoring_enabled}
          maxViolations={exam.max_violations}
          confirmLabel={exam.my_attempt_status === "in_progress" ? tr("Tôi đồng ý, tiếp tục làm bài") : tr("Tôi đồng ý, bắt đầu làm bài")}
          loading={isStarting}
          onConfirm={handleConfirmStart}
          onCancel={() => setShowRules(false)}
        />
      ) : null}
    </>
  );
}
