"use client";


import { formatDateTime } from "../lib/format-date";
import { tr } from "../lib/i18n";
import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Clock3, History, X } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { APPROVAL_ACTION_LABEL, APPROVAL_STATUS_LABEL } from "../lib/permissions";
import type { ApprovalHistoryEntry, ApprovalState, SessionApprovalSummary } from "../lib/types";

const fullDateTime = (value: string) => formatDateTime(value);

const toneOf = (action: ApprovalHistoryEntry["action"]) =>
  action === "rejected" ? "red" : action === "approved" || action === "auto_approved" ? "green" : action === "reset" ? "amber" : "blue";

interface ModalProps {
  sessionId: number;
  sessionTitle?: string;
  onClose: () => void;
}

/** Read-only record of who approved or rejected a session, at which level, when, and what they wrote. */
export function ApprovalHistoryModal({ sessionId, sessionTitle, onClose }: ModalProps) {
  const [state, setState] = useState<ApprovalState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: ApprovalState }>(`/exam-sessions/${sessionId}/approval`)
      .then((response) => setState(response.data))
      .catch((err) => setError(err instanceof ApiError ? err.message : tr("Không thể tải lịch sử duyệt.")));
  }, [sessionId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The last decision, newest first, is what people usually want to know.
  const decision = state ? [...state.history].reverse().find((entry) => entry.action === "approved" || entry.action === "rejected" || entry.action === "auto_approved") : undefined;
  const status = state ? APPROVAL_STATUS_LABEL[state.status] : null;

  return (
    <div className="modalBackdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="confirmModal approvalModal" onClick={(event) => event.stopPropagation()}>
        <div className="panelHeader" style={{ marginBottom: 8 }}>
          <div>
            <p className="eyebrow">{tr("Lịch sử phê duyệt")}</p>
            <h2 style={{ margin: 0 }}>{sessionTitle ?? tr("Kỳ thi #{0}", sessionId)}</h2>
          </div>
          <button className="iconButton" onClick={onClose} title={tr("Đóng")} aria-label={tr("Đóng")}>
            <X size={16} />
          </button>
        </div>

        {error ? <div className="formError">{error}</div> : null}
        {!state && !error ? <div className="emptyState">{tr("Đang tải...")}</div> : null}

        {state && status ? (
          <>
            <div className="controlRow" style={{ margin: "0 0 10px", alignItems: "center", flexWrap: "wrap" }}>
              <span className={`badge ${status.tone}`}>{status.label}</span>
              {state.status === "pending" && state.current_level ? (
                <span className="reviewEmpty" style={{ margin: 0 }}>
                  {tr("đang chờ")} <strong>{tr(state.current_level.name)}</strong>
                </span>
              ) : null}
              {state.creator_name ? <span className="reviewEmpty" style={{ margin: 0 }}>{tr("Người tạo:")} {state.creator_name}</span> : null}
              {state.department_name ? <span className="reviewEmpty" style={{ margin: 0 }}>{tr("Khoa:")} {state.department_name}</span> : null}
            </div>

            {decision ? (
              <div className={`approvalDecision ${decision.action === "rejected" ? "rejected" : "approved"}`}>
                <strong>
                  {decision.action === "rejected" ? tr("Bị từ chối") : decision.action === "auto_approved" ? tr("Tự động duyệt") : tr("Được duyệt")}
                  {decision.actor_name ? tr(" bởi {0}", decision.actor_name) : ""}
                  {decision.actor_role ? ` (${decision.actor_role})` : ""}
                </strong>
                <span>
                  {decision.level_name ? `${tr(decision.level_name)} · ` : ""}
                  {fullDateTime(decision.created_at)}
                </span>
                {decision.comment ? <p>“{decision.comment}”</p> : null}
              </div>
            ) : null}

            {state.levels.length > 0 ? (
              <ol className="approvalSteps">
                {state.levels.map((level) => (
                  <li key={level.position} className={`approvalStep ${level.state}`}>
                    {level.state === "done" ? <CheckCircle2 size={18} /> : level.state === "current" ? <Clock3 size={18} /> : <Circle size={18} />}
                    <div>
                      <strong>{tr(level.name)}</strong>
                      <span>{level.role_label}</span>
                    </div>
                  </li>
                ))}
              </ol>
            ) : null}

            <p className="sideTitle" style={{ marginTop: 14 }}>
              {tr("Toàn bộ lịch sử (")}{state.history.length})
            </p>
            {state.history.length === 0 ? (
              <p className="reviewEmpty">{tr("Kỳ thi chưa được gửi duyệt lần nào.")}</p>
            ) : (
              <div className="approvalHistory">
                {[...state.history].reverse().map((entry) => (
                  <div className="approvalEntry" key={entry.id}>
                    <span className={`badge ${toneOf(entry.action)}`}>{APPROVAL_ACTION_LABEL[entry.action]}</span>
                    <div>
                      <strong>
                        {entry.actor_name ?? tr("Hệ thống")}
                        {entry.actor_role ? ` (${entry.actor_role})` : ""}
                        {entry.level_name ? ` · ${tr(entry.level_name)}` : ""}
                      </strong>
                      {entry.comment ? <p>{entry.comment}</p> : null}
                      <small>{fullDateTime(entry.created_at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : null}

        <div className="controlRow" style={{ justifyContent: "flex-end", margin: "16px 0 0" }}>
          <button className="primaryButton" onClick={onClose}>
            {tr("Đóng")}
          </button>
        </div>
      </div>
    </div>
  );
}

interface BadgeProps {
  sessionId: number;
  sessionTitle?: string;
  approval: SessionApprovalSummary;
  className?: string;
}

/** The approval status as a badge; clicking it opens the popup with who approved/rejected and when. */
export function ApprovalBadge({ sessionId, sessionTitle, approval, className = "" }: BadgeProps) {
  const [open, setOpen] = useState(false);
  const status = APPROVAL_STATUS_LABEL[approval.status];
  const label = approval.status === "pending" && approval.level_name ? tr("Chờ: {0}", tr(approval.level_name)) : status.label;

  return (
    <>
      <button
        type="button"
        className={`badge ${status.tone} badgeButton ${className}`.trim()}
        title={tr("Bấm để xem ai duyệt/từ chối, vào lúc nào")}
        onClick={(event) => {
          // Also used inside <summary>/links: do not toggle or navigate.
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        {label}
        <History size={12} />
      </button>
      {open ? <ApprovalHistoryModal sessionId={sessionId} sessionTitle={sessionTitle} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
