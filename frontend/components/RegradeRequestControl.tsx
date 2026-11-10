"use client";


import { formatDateTime } from "../lib/format-date";
import { tr } from "../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { Gavel, X } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { useToast } from "../lib/toast";
import type { RegradeRequest } from "../lib/types";

const fmt = (value: string) => formatDateTime(value);

interface Props {
  attemptId: number;
  /** Only a graded, not cancelled attempt can be regraded. */
  eligible: boolean;
  /** Called after the score changed so the page can reload it. */
  onScoreChanged?: () => void;
}

/** Student's regrading (phúc khảo) request for one attempt: send it, follow it, read the teacher's answer. */
export function RegradeRequestControl({ attemptId, eligible }: Props) {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<RegradeRequest[]>([]);
  const [open, setOpen] = useState<"form" | "detail" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ data: RegradeRequest[] }>("/regrade-requests/mine");
      setRequests(response.data.filter((item) => item.exam_attempt_id === attemptId));
    } catch {
      setRequests([]);
    }
  }, [attemptId]);

  useEffect(() => {
    load();
  }, [load]);

  if (!eligible && requests.length === 0) return null;

  const latest = requests[0];
  const pending = latest?.status === "pending";

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await api.post("/regrade-requests", { exam_attempt_id: attemptId, reason });
      showToast(tr("Đã gửi yêu cầu phúc khảo."));
      setReason("");
      setOpen(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors?.reason?.[0] ?? err.message) : tr("Không thể gửi yêu cầu."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {latest ? (
        <button
          className={`reviewChip badgeButton`}
          style={{ cursor: "pointer", background: latest.status === "approved" ? "#f0fdf4" : latest.status === "rejected" ? "#fef2f2" : "#fffbeb" }}
          onClick={() => setOpen("detail")}
        >
          <Gavel size={14} />
          {tr("Phúc khảo:")} {latest.status === "pending" ? tr("đang chờ xử lý") : latest.status === "approved" ? tr("đã chấp nhận (điểm mới {0})", Number(latest.new_score)) : tr("giữ nguyên điểm")}
        </button>
      ) : null}
      {eligible && !pending ? (
        <button className="reviewChip badgeButton" style={{ cursor: "pointer" }} onClick={() => setOpen("form")}>
          <Gavel size={14} />
          {latest ? tr("Phúc khảo lại") : tr("Yêu cầu phúc khảo")}
        </button>
      ) : null}

      {open === "form" ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="confirmModal" onClick={(event) => event.stopPropagation()}>
            <h2>{tr("Yêu cầu phúc khảo")}</h2>
            <p>{tr("Nêu rõ câu nào, vì sao bạn cho rằng chấm chưa đúng. Giáo viên phụ trách kỳ thi sẽ xem xét và phản hồi.")}</p>
            {error ? <div className="formError" style={{ marginBottom: 10 }}>{error}</div> : null}
            <label className="field">
              <span>{tr("Lý do")}</span>
              <textarea className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={2000} placeholder={tr("VD: Câu 3 có hai đáp án đúng...")} autoFocus />
            </label>
            <div className="controlRow" style={{ marginTop: 12 }}>
              <button className="iconButton" style={{ width: "auto", padding: "0 16px" }} onClick={() => setOpen(null)} disabled={busy}>
                {tr("Hủy")}
              </button>
              <button className="primaryButton" onClick={submit} disabled={busy || reason.trim().length < 5}>
                {busy ? tr("Đang gửi...") : tr("Gửi yêu cầu")}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {open === "detail" && latest ? (
        <div className="modalBackdrop" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <div className="confirmModal approvalModal" onClick={(event) => event.stopPropagation()}>
            <div className="panelHeader" style={{ marginBottom: 8 }}>
              <div>
                <p className="eyebrow">{tr("Phúc khảo")}</p>
                <h2 style={{ margin: 0 }}>{tr("Các yêu cầu của bạn")}</h2>
              </div>
              <button className="iconButton" onClick={() => setOpen(null)} aria-label={tr("Đóng")}>
                <X size={16} />
              </button>
            </div>
            <div className="approvalHistory">
              {requests.map((item) => (
                <div key={item.id}>
                  <p className="sideTitle">{tr("Gửi lúc")} {fmt(item.created_at)}</p>
                  <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{item.reason}</p>
                  {item.status === "pending" ? (
                    <p className="reviewEmpty">{tr("Đang chờ giáo viên xử lý.")}</p>
                  ) : (
                    <div className={`approvalDecision ${item.status === "approved" ? "approved" : "rejected"}`}>
                      <strong>
                        {item.status === "approved" ? tr("Chấp nhận: điểm {0} → {1}", Number(item.old_score), Number(item.new_score)) : tr("Giữ nguyên điểm")}
                        {item.reviewer_name ? ` · ${item.reviewer_name}` : ""}
                      </strong>
                      <span>{item.reviewed_at ? fmt(item.reviewed_at) : ""}</span>
                      {item.response ? <p>{item.response}</p> : null}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
