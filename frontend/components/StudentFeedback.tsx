"use client";


import { formatDateTime } from "../lib/format-date";
import { tr } from "../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { MessageSquareText, Send } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { useToast } from "../lib/toast";
import type { ExamAttempt, ExamFeedback } from "../lib/types";

const fmt = (value: string) => formatDateTime(value);

interface Props {
  sessionId: number;
  /** The student's attempts in this session, to attach feedback to a specific one. */
  attempts: ExamAttempt[];
}

/** Feedback about an exam to the responsible teachers, with their replies. */
export function StudentFeedback({ sessionId, attempts }: Props) {
  const { showToast } = useToast();
  const [items, setItems] = useState<ExamFeedback[]>([]);
  const [message, setMessage] = useState("");
  const [attemptId, setAttemptId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: ExamFeedback[] }>("/feedback/mine", { exam_session_id: sessionId });
      setItems(response.data);
    } catch {
      setItems([]);
    }
  }, [sessionId]);

  useEffect(() => {
    load();
  }, [load]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await api.post(`/exam-sessions/${sessionId}/feedback`, { message, exam_attempt_id: attemptId ? Number(attemptId) : null });
      showToast(tr("Đã gửi phản hồi cho giáo viên."));
      setMessage("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors?.message?.[0] ?? err.message) : tr("Không thể gửi phản hồi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form onSubmit={send} className="feedbackForm">
        {error ? <div className="formError">{error}</div> : null}
        {attempts.length > 0 ? (
          <label className="field">
            <span>{tr("Về lần thi (tuỳ chọn)")}</span>
            <select value={attemptId} onChange={(event) => setAttemptId(event.target.value)}>
              <option value="">{tr("Cả kỳ thi")}</option>
              {attempts.map((attempt) => (
                <option key={attempt.id} value={attempt.id}>
                  {tr("Lần")} {attempt.attempt_number}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label className="field">
          <span>{tr("Nội dung phản hồi")}</span>
          <textarea className="textarea" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={2000} placeholder={tr("Nhập thắc mắc hoặc góp ý về đề thi, đáp án, sự cố khi làm bài...")} />
        </label>
        <button className="approveButton" type="submit" disabled={busy || message.trim().length < 3}>
          <Send size={16} />
          {busy ? tr("Đang gửi...") : tr("Gửi cho giáo viên")}
        </button>
      </form>

      {items.length > 0 ? (
        <div style={{ marginTop: 16 }}>
          <p className="sideTitle">{tr("Phản hồi của bạn (")}{items.length})</p>
          <div className="scrollArea" style={{ maxHeight: 320, minHeight: 0 }}>
            {items.map((item) => (
              <div className="groupCard" key={item.id} style={{ padding: 14 }}>
                <p className="reviewEmpty" style={{ margin: 0 }}>
                  <MessageSquareText size={13} /> {fmt(item.created_at)}
                  {item.attempt_number ? tr(" · lần thi {0}", item.attempt_number) : ""}
                </p>
                <p style={{ whiteSpace: "pre-wrap" }}>{item.message}</p>
                {item.reply ? (
                  <div className="approvalDecision approved">
                    <strong>{tr("Giáo viên")} {item.replied_by_name} {tr("trả lời")}</strong>
                    <span>{item.replied_at ? fmt(item.replied_at) : ""}</span>
                    <p>{item.reply}</p>
                  </div>
                ) : (
                  <span className="badge amber">{tr("Chờ giáo viên trả lời")}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
