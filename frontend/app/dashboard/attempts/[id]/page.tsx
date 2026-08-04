"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { api } from "../../../../lib/api-client";
import {
  ATTEMPT_STATUS_LABEL,
  PROCTORING_EVENT_LABEL,
  SEVERITY_LABEL,
  statusLabel
} from "../../../../lib/status-labels";
import type { ExamAttemptDetail, ProctoringEvent } from "../../../../lib/types";

const SEVERITY_BADGE: Record<string, string> = { low: "blue", medium: "amber", high: "red" };

export default function AttemptDetailPage() {
  const params = useParams<{ id: string }>();
  const attemptId = params.id;
  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [events, setEvents] = useState<ProctoringEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [attemptResponse, eventsResponse] = await Promise.all([
          api.get<{ data: ExamAttemptDetail }>(`/exam-attempts/${attemptId}`),
          api.get<{ data: ProctoringEvent[] }>(`/exam-attempts/${attemptId}/proctoring-events`)
        ]);
        setAttempt(attemptResponse.data);
        setEvents(eventsResponse.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [attemptId]);

  if (loading || !attempt) {
    return <div className="emptyState">Đang tải...</div>;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Chi tiết lượt làm bài</p>
          <h1>{attempt.exam_title}</h1>
        </div>
      </header>

      <section className="roleBand resultBand">
        <div>
          <span>Thí sinh: {attempt.student_name}</span>
          <h2>Điểm: {attempt.score ?? "—"} / {attempt.total_points ?? "—"}</h2>
          <p>Trạng thái: {statusLabel(ATTEMPT_STATUS_LABEL, attempt.status)}</p>
        </div>
      </section>

      <section className="contentGrid">
        <article className="panel examPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Bài làm</p>
              <h2>Câu trả lời</h2>
            </div>
          </div>
          <div className="questionList">
            {attempt.questions.map((question) => (
              <div className="questionItem" key={question.question_id} style={{ gridTemplateColumns: "1fr" }}>
                <div>
                  <strong>{question.question_text}</strong>
                  <span>
                    Trả lời: {question.selected_answer?.join(", ") ?? "(chưa trả lời)"} · Đáp án đúng:{" "}
                    {question.correct_answer?.join(", ")} ·{" "}
                    <span className={`badge ${question.is_correct ? "green" : "red"}`}>
                      {question.is_correct ? "Đúng" : "Sai"}
                    </span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel cameraPanel">
          <div className="panelHeader">
            <div>
              <p className="eyebrow">Camera proctoring</p>
              <h2>Cảnh báo giám sát</h2>
            </div>
          </div>

          <div className="riskScore">
            <BarChart3 size={18} />
            <div>
              <span>Số sự kiện cảnh báo</span>
              <strong>{events.length}</strong>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="emptyState">Không có cảnh báo nào được ghi nhận.</div>
          ) : (
            <div className="eventList">
              {events.map((event) => (
                <div className="eventItem" key={event.id}>
                  <AlertTriangle size={17} />
                  <div>
                    <strong>{statusLabel(PROCTORING_EVENT_LABEL, event.event_type)}</strong>
                    <span>
                      {new Date(event.occurred_at).toLocaleString("vi-VN")} ·{" "}
                      <span className={`badge ${SEVERITY_BADGE[event.severity]}`}>
                        {statusLabel(SEVERITY_LABEL, event.severity)}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>
    </>
  );
}
