"use client";


import { tr } from "../../../../lib/i18n";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { api } from "../../../../lib/api-client";
import { AttemptHistory } from "../../../../components/AttemptHistory";
import { useBreadcrumbLabel } from "../../../../components/Breadcrumbs";
import { RegradeRequestControl } from "../../../../components/RegradeRequestControl";
import { AttemptReview } from "../../../../components/AttemptReview";
import { ATTEMPT_STATUS_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { ExamAttempt, ExamAttemptDetail } from "../../../../lib/types";

export default function ResultDetailPage() {
  const params = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<ExamAttempt[]>([]);

  useEffect(() => {
    api
      .get<{ data: ExamAttemptDetail }>(`/exam-attempts/${params.attemptId}`)
      .then((response) => setAttempt(response.data))
      .finally(() => setLoading(false));
  }, [params.attemptId]);

  const sessionId = attempt?.exam_session_id;
  useEffect(() => {
    if (sessionId === undefined) return;
    api
      .get<{ data: ExamAttempt[] }>("/exam-attempts")
      .then((response) => setHistory(response.data.filter((item) => item.exam_session_id === sessionId)))
      .catch(() => setHistory([]));
  }, [sessionId]);

  useBreadcrumbLabel(attempt ? tr("{0} · lần {1}", attempt.exam_title, attempt.attempt_number) : null);

  if (loading || !attempt) {
    return <div className="emptyState" role="status">{tr("Đang tải…")}</div>;
  }

  const isGraded = attempt.status === "graded";
  const hasNotice = attempt.is_cancelled || attempt.is_flagged;

  return (
    <>
      <header className="reviewHeader">
        <div>
          <p className="eyebrow">{tr("Kết quả chi tiết")}</p>
          <h1 id="page-title" tabIndex={-1}>{attempt.exam_title}</h1>
        </div>
        <div className="reviewChips">
          <span className="reviewChip score">{isGraded ? tr("Điểm {0} / {1}", attempt.score, attempt.total_points) : tr("Đang xử lý...")}</span>
          <span className="reviewChip">
            {tr("Lần thi")} {attempt.attempt_number}/{attempt.max_attempts}
          </span>
          <span className="reviewChip">{attempt.is_cancelled ? tr("Bị hủy do gian lận") : statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}</span>
          {attempt.status === "graded" ? <RegradeRequestControl attemptId={attempt.id} eligible={!attempt.is_cancelled} /> : null}
        </div>
      </header>

      {attempt.is_cancelled ? (
        <div className="reviewNotice">
          <ShieldAlert size={16} />
          {attempt.cancelled_by_proctor
            ? tr("Bài thi bị giám thị hủy và chấm 0 điểm{0}.", attempt.cancel_note ? `: ${attempt.cancel_note}` : "")
            : tr("Bài thi bị hủy và chấm 0 điểm do vi phạm quy chế quá số lần cho phép ({0} vi phạm); đã đánh dấu gian lận.", attempt.violation_count)}
        </div>
      ) : attempt.is_flagged ? (
        <div className="reviewNotice">
          <ShieldAlert size={16} />
          {tr("Ghi nhận")} {attempt.violation_count} {tr("vi phạm trong bài làm này; bài đã được đánh dấu để giảng viên xem xét.")}
        </div>
      ) : null}

      <AttemptReview
        key={attempt.id}
        attempt={attempt}
        perspective="student"
        fitOffset={hasNotice ? 250 : 205}
        sidebarTop={
          history.length > 1 || attempt.max_attempts > 1 ? (
            <>
              <p className="sideTitle">
                {tr("Các lần thi (")}{history.length}/{attempt.max_attempts})
              </p>
              <AttemptHistory compact attempts={history} activeId={attempt.id} audience="student" scoringMethod={attempt.scoring_method} />
            </>
          ) : null
        }
      />
    </>
  );
}
