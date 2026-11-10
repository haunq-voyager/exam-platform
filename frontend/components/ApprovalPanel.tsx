"use client";


import { tr } from "../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock3, Send, Undo2, XCircle } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { APPROVAL_ACTION_LABEL, APPROVAL_STATUS_LABEL } from "../lib/permissions";
import { formatDateTime } from "../lib/session-phase";
import { useToast } from "../lib/toast";
import type { ApprovalState } from "../lib/types";

interface Props {
  sessionId: number | string;
  /** Called after any action so the surrounding page can refresh (status, enable switch...). */
  onChanged?: () => void | Promise<void>;
}

/** Approval progress of one session: the chain, the history, and the actions the current user may take. */
export function ApprovalPanel({ sessionId, onChanged }: Props) {
  const { showToast } = useToast();
  const base = `/exam-sessions/${sessionId}/approval`;
  const [state, setState] = useState<ApprovalState | null>(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: ApprovalState }>(base);
      setState(response.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tải trạng thái duyệt."));
    }
  }, [base]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(path: string, body: unknown, success: string) {
    setError(null);
    setBusy(true);
    try {
      const response = await api.post<{ data: ApprovalState }>(`${base}/${path}`, body);
      setState(response.data);
      setComment("");
      showToast(success);
      await onChanged?.();
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors?.comment?.[0] ?? err.message) : tr("Không thể thực hiện thao tác."));
    } finally {
      setBusy(false);
    }
  }

  if (!state) return <div className="emptyState">{error ?? tr("Đang tải trạng thái duyệt...")}</div>;

  const status = APPROVAL_STATUS_LABEL[state.status];

  return (
    <div>
      <div className="controlRow" style={{ margin: "0 0 12px", alignItems: "center", flexWrap: "wrap" }}>
        <span className={`badge ${status.tone}`}>{status.label}</span>
        {!state.required ? <span className="reviewEmpty" style={{ margin: 0 }}>{tr("Chưa cấu hình cấp duyệt nào nên kỳ thi không cần duyệt.")}</span> : null}
        {state.department_name ? <span className="reviewEmpty" style={{ margin: 0 }}>{tr("Khoa:")} {state.department_name}</span> : null}
        {state.creator_name ? <span className="reviewEmpty" style={{ margin: 0 }}>{tr("Người tạo:")} {state.creator_name}</span> : null}
      </div>

      {error ? <div className="formError" style={{ marginBottom: 12 }}>{error}</div> : null}

      {state.levels.length > 0 ? (
        <ol className="approvalSteps">
          {state.levels.map((level) => (
            <li key={level.position} className={`approvalStep ${level.state}`}>
              {level.state === "done" ? <CheckCircle2 size={18} /> : level.state === "current" ? <Clock3 size={18} /> : <Circle size={18} />}
              <div>
                <strong>{tr(level.name)}</strong>
                <span>
                  {level.role_label} · {level.scope === "department" ? "theo khoa" : tr("toàn trường")}
                </span>
              </div>
            </li>
          ))}
        </ol>
      ) : null}

      {state.status === "pending" && state.current_level ? (
        <p className="reviewEmpty">
          {tr("Đang chờ")} <strong>{tr(state.current_level.name)}</strong>
          {state.submitted_at ? tr(" (gửi lúc {0})", formatDateTime(state.submitted_at)) : ""}.
        </p>
      ) : null}

      <div className="controlRow" style={{ margin: "12px 0", flexWrap: "wrap" }}>
        {state.can_submit ? (
          <button className="primaryButton" onClick={() => act("submit", undefined, tr("Đã gửi kỳ thi đi duyệt."))} disabled={busy}>
            <Send size={16} />
            {state.status === "rejected" ? tr("Sửa xong, gửi duyệt lại") : tr("Gửi duyệt")}
          </button>
        ) : null}
        {state.can_withdraw ? (
          <button className="approveButton" onClick={() => act("withdraw", undefined, tr("Đã thu hồi yêu cầu duyệt."))} disabled={busy}>
            <Undo2 size={16} />
            {tr("Thu hồi để chỉnh sửa")}
          </button>
        ) : null}
      </div>

      {state.can_act ? (
        <div className="panel" style={{ boxShadow: "none", marginBottom: 14 }}>
          <p className="eyebrow">{tr("Bạn là người duyệt ở cấp này")}</p>
          <label className="field">
            <span>{tr("Nhận xét (bắt buộc khi từ chối)")}</span>
            <textarea className="textarea" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={tr("VD: Đề cần thêm câu về chương 3...")} maxLength={2000} />
          </label>
          <div className="controlRow" style={{ margin: "10px 0 0" }}>
            <button className="primaryButton" onClick={() => act("approve", { comment: comment || null }, tr("Đã duyệt kỳ thi."))} disabled={busy}>
              <CheckCircle2 size={16} />
              {tr("Duyệt")}
            </button>
            <button
              className="dangerButton"
              onClick={() => {
                if (comment.trim().length < 3) {
                  setError(tr("Hãy nhập lý do từ chối để người tạo biết cần sửa gì."));
                  return;
                }
                act("reject", { comment }, tr("Đã từ chối kỳ thi."));
              }}
              disabled={busy}
            >
              <XCircle size={16} />
              {tr("Từ chối")}
            </button>
          </div>
        </div>
      ) : null}

      {state.history.length > 0 ? (
        <div>
          <p className="sideTitle">{tr("Lịch sử duyệt")}</p>
          <div className="approvalHistory">
            {state.history.map((entry) => (
              <div className="approvalEntry" key={entry.id}>
                <span className={`badge ${entry.action === "rejected" ? "red" : entry.action === "approved" || entry.action === "auto_approved" ? "green" : entry.action === "reset" ? "amber" : "blue"}`}>
                  {APPROVAL_ACTION_LABEL[entry.action]}
                </span>
                <div>
                  <strong>
                    {entry.actor_name ?? tr("Hệ thống")}
                    {entry.actor_role ? ` (${entry.actor_role})` : ""}
                    {entry.level_name ? ` · ${tr(entry.level_name)}` : ""}
                  </strong>
                  {entry.comment ? <p>{entry.comment}</p> : null}
                  <small>{formatDateTime(entry.created_at)}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
