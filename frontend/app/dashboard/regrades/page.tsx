"use client";


import { formatDateTime } from "../../../lib/format-date";
import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { Check, X } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { TableToolbar } from "../../../components/TableToolbar";
import { useAuth } from "../../../lib/auth-context";
import { can } from "../../../lib/permissions";
import { useClientTable } from "../../../lib/use-client-table";
import { useToast } from "../../../lib/toast";
import type { PaginatedResponse } from "../../../lib/pagination";
import type { RegradeRequest } from "../../../lib/types";

type Tab = "pending" | "handled";

const fmt = (value: string) => formatDateTime(value);

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { get label() { return tr("Chờ xử lý"); }, tone: "amber" },
  approved: { get label() { return tr("Đã chấp nhận"); }, tone: "green" },
  rejected: { get label() { return tr("Giữ nguyên điểm"); }, tone: "red" }
};

function ReviewForm({ item, onDone }: { item: RegradeRequest; onDone: () => void }) {
  const { showToast } = useToast();
  const [newScore, setNewScore] = useState(String(Number(item.current_score ?? 0)));
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function decide(status: "approved" | "rejected") {
    setError(null);
    if (status === "rejected" && !response.trim()) {
      setError(tr("Hãy ghi lý do giữ nguyên điểm để thí sinh biết."));
      return;
    }
    setBusy(true);
    try {
      await api.post(`/regrade-requests/${item.id}/review`, { status, new_score: status === "approved" ? Number(newScore) : null, response: response.trim() || null });
      showToast(status === "approved" ? tr("Đã chấp nhận và cập nhật điểm.") : tr("Đã giữ nguyên điểm."));
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors?.new_score?.[0] ?? err.errors?.response?.[0] ?? err.message) : tr("Không thể xử lý yêu cầu."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="sideTitle">{tr("Lý do thí sinh nêu")}</p>
      <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{item.reason}</p>
      <Link className="approveButton" href={`/dashboard/attempts/${item.exam_attempt_id}`}>
        {tr("Xem bài làm")}
      </Link>

      {item.status === "pending" ? (
        <div style={{ marginTop: 14 }}>
          {error ? <div className="formError" role="alert" style={{ marginBottom: 10 }}>{error}</div> : null}
          <div className="controlRow" style={{ margin: 0, alignItems: "flex-end", flexWrap: "wrap" }}>
            <label className="field" style={{ width: 170 }}>
              <span>{tr("Điểm mới (nếu chấp nhận)")}</span>
              <input type="number" min={0} max={Number(item.total_points ?? 1000)} step={0.25} value={newScore} onChange={(event) => setNewScore(event.target.value)} />
            </label>
            <label className="field" style={{ flex: "1 1 280px" }}>
              <span>{tr("Phản hồi cho thí sinh (bắt buộc khi giữ nguyên điểm)")}</span>
              <input value={response} onChange={(event) => setResponse(event.target.value)} maxLength={2000} />
            </label>
          </div>
          <div className="controlRow" style={{ margin: "12px 0 0" }}>
            <button className="primaryButton" disabled={busy} onClick={() => decide("approved")}>
              <Check size={16} aria-hidden="true" />
              {tr("Chấp nhận, sửa điểm")}
            </button>
            <button className="dangerButton" disabled={busy} onClick={() => decide("rejected")}>
              <X size={16} aria-hidden="true" />
              {tr("Giữ nguyên điểm")}
            </button>
          </div>
        </div>
      ) : (
        <div className={`approvalDecision ${item.status === "approved" ? "approved" : "rejected"}`} style={{ marginTop: 14 }}>
          <strong>
            {item.status === "approved" ? tr("Điểm {0} → {1}", Number(item.old_score ?? 0), Number(item.new_score ?? 0)) : tr("Giữ nguyên điểm")} · {item.reviewer_name}
          </strong>
          <span>{item.reviewed_at ? fmt(item.reviewed_at) : ""}</span>
          {item.response ? <p>{item.response}</p> : null}
        </div>
      )}
    </div>
  );
}

const SORTERS = {
  student: (item: RegradeRequest) => item.student_name,
  session: (item: RegradeRequest) => item.exam_session_title,
  score: (item: RegradeRequest) => Number(item.current_score ?? 0),
  sent: (item: RegradeRequest) => item.created_at,
  status: (item: RegradeRequest) => item.status
};

export default function RegradesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<RegradeRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<PaginatedResponse<RegradeRequest>>("/regrade-requests", { status: tab === "pending" ? "pending" : "approved,rejected", per_page: 100 });
      setItems(result.data);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const matches = useCallback((item: RegradeRequest, query: string) => `${item.student_name ?? ""} ${item.student_email ?? ""} ${item.exam_session_title ?? ""} ${item.reason}`.toLowerCase().includes(query), []);
  const table = useClientTable(items, { matches, initialPageSize: 10, sorters: SORTERS });

  if (!can(user, "regrades.review")) {
    return <div className="emptyState">{tr("Bạn không có quyền xử lý phúc khảo.")}</div>;
  }

  return (
    <>
      <PageHeader title={tr("Phúc khảo")} description={tr("Yêu cầu chấm lại của thí sinh trong các kỳ thi bạn được phân công. Mở một dòng để xem lý do và xử lý.")} />

      <div className="tabBar" role="tablist" aria-label={tr("Trạng thái yêu cầu")}>
        {(["pending", "handled"] as Tab[]).map((key) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "tabButton active" : "tabButton"} onClick={() => { setTab(key); table.reset(); }}>
            {key === "pending" ? tr("Chờ xử lý") : tr("Đã xử lý")}
          </button>
        ))}
      </div>

      <section className="panel">
        <TableToolbar search={{ value: table.query, onChange: table.setQuery, placeholder: tr("Tìm theo thí sinh, kỳ thi, lý do…"), label: tr("Tìm yêu cầu phúc khảo") }} active={Boolean(table.query.trim())} onReset={table.reset} />
        <DataTable
          label={tr("Yêu cầu phúc khảo")}
          rows={table.visible}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={Boolean(table.query.trim())}
          searchTerm={table.query.trim()}
          onClearFilters={table.reset}
          emptyMessage={tab === "pending" ? tr("Không có yêu cầu phúc khảo nào đang chờ") : tr("Chưa xử lý yêu cầu nào")}
          emptyHint={tab === "pending" ? tr("Khi thí sinh gửi yêu cầu cho kỳ thi bạn coi, nó sẽ hiện ở đây.") : undefined}
          pagination={table.pagination}
          sort={table.sort}
          expandable={{ render: (item) => <ReviewForm item={item} onDone={load} /> }}
          columns={[
            { key: "student", sortKey: "student", header: tr("Thí sinh"), render: (item) => (<div><strong>{item.student_name}</strong><div className="reviewEmpty" style={{ margin: 0 }}>{item.student_email}</div></div>) },
            { key: "session", sortKey: "session", header: tr("Kỳ thi"), render: (item) => tr("{0} · lần {1}", item.exam_session_title ?? "—", item.attempt_number ?? "—") },
            { key: "score", sortKey: "score", header: tr("Điểm hiện tại"), numeric: true, render: (item) => `${Number(item.current_score ?? 0)} / ${Number(item.total_points ?? 0)}` },
            { key: "sent", sortKey: "sent", header: tr("Gửi lúc"), render: (item) => fmt(item.created_at) },
            { key: "status", sortKey: "status", header: tr("Trạng thái"), render: (item) => <span className={`badge ${STATUS[item.status].tone}`}>{STATUS[item.status].label}</span> }
          ]}
        />
      </section>
    </>
  );
}
