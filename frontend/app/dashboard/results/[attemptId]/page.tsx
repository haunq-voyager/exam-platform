"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../../../lib/api-client";
import { ATTEMPT_STATUS_LABEL, statusLabel } from "../../../../lib/status-labels";
import type { ExamAttemptDetail } from "../../../../lib/types";

export default function ResultDetailPage() {
  const params = useParams<{ attemptId: string }>();
  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ data: ExamAttemptDetail }>(`/exam-attempts/${params.attemptId}`)
      .then((response) => setAttempt(response.data))
      .finally(() => setLoading(false));
  }, [params.attemptId]);

  if (loading || !attempt) {
    return <div className="emptyState">Đang tải...</div>;
  }

  const isGraded = attempt.status === "graded";

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Kết quả chi tiết</p>
          <h1>{attempt.exam_title}</h1>
        </div>
      </header>

      <section className="roleBand resultBand">
        <div>
          <span>Trạng thái: {statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}</span>
          <h2>{isGraded ? `Điểm: ${attempt.score} / ${attempt.total_points}` : "Bài thi đang được xử lý..."}</h2>
        </div>
      </section>

      <section className="panel">
        <div className="questionList">
          {attempt.questions.map((question, index) => (
            <div className="questionItem" key={question.question_id} style={{ gridTemplateColumns: "1fr" }}>
              <div>
                <strong>
                  Câu {index + 1}. {question.question_text}
                </strong>
                <span>Bạn chọn: {question.selected_answer?.join(", ") ?? "(chưa trả lời)"}</span>
                {isGraded ? (
                  <>
                    <span>
                      Đáp án đúng: {question.correct_answer?.join(", ")} ·{" "}
                      <span className={`badge ${question.is_correct ? "green" : "red"}`}>
                        {question.is_correct ? "Đúng" : "Sai"} ({question.points_earned}/{question.points} điểm)
                      </span>
                    </span>
                    {question.explanation ? <span>Giải thích: {question.explanation}</span> : null}
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
