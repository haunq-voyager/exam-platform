"use client";


import { formatDateTime } from "../../../lib/format-date";
import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { TableToolbar } from "../../../components/TableToolbar";
import { useAuth } from "../../../lib/auth-context";
import { can } from "../../../lib/permissions";
import { useClientTable } from "../../../lib/use-client-table";
import { useToast } from "../../../lib/toast";
import type { ExamFeedback } from "../../../lib/types";

type Tab = "unanswered" | "answered";

const fmt = (value: string) => formatDateTime(value);

function ReplyForm({ item, onDone }: { item: ExamFeedback; onDone: () => void }) {
  const { showToast } = useToast();
  const [text, setText] = useState(item.reply ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setError(null);
    setBusy(true);
    try {
      await api.post(`/feedback/${item.id}/reply`, { reply: text.trim() });
      showToast(tr("Đã gửi phản hồi cho thí sinh."));
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể gửi phản hồi."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="sideTitle">{tr("Nội dung thí sinh gửi")}</p>
      <p style={{ whiteSpace: "pre-wrap", marginTop: 0 }}>{item.message}</p>
      {item.reply ? (
        <div className="approvalDecision approved">
          <strong>{item.replied_by_name}</strong>
          <span>{item.replied_at ? fmt(item.replied_at) : ""}</span>
          <p>{item.reply}</p>
        </div>
      ) : null}
      {error ? <div className="formError" role="alert" style={{ margin: "10px 0" }}>{error}</div> : null}
      <div className="controlRow" style={{ margin: "10px 0 0", alignItems: "flex-end" }}>
        <label className="field" style={{ flex: 1 }}>
          <span>{item.reply ? tr("Sửa câu trả lời") : tr("Trả lời thí sinh")}</span>
          <textarea className="textarea" value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} placeholder={tr("Nhập nội dung phản hồi…")} />
        </label>
        <button className="primaryButton" onClick={send} disabled={busy || !text.trim()}>
          <Send size={16} aria-hidden="true" />
          {tr("Gửi")}
        </button>
      </div>
    </div>
  );
}

const SORTERS = {
  student: (item: ExamFeedback) => item.student_name,
  session: (item: ExamFeedback) => item.exam_session_title,
  message: (item: ExamFeedback) => item.message,
  sent: (item: ExamFeedback) => item.created_at,
  status: (item: ExamFeedback) => (item.reply ? 1 : 0)
};

export default function FeedbackPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("unanswered");
  const [items, setItems] = useState<ExamFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: ExamFeedback[] }>("/feedback", { scope: tab });
      setItems(response.data);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  const matches = useCallback((item: ExamFeedback, query: string) => `${item.student_name ?? ""} ${item.student_email ?? ""} ${item.exam_session_title ?? ""} ${item.message}`.toLowerCase().includes(query), []);
  const table = useClientTable(items, { matches, initialPageSize: 10, sorters: SORTERS });

  if (!can(user, "feedback.respond")) {
    return <div className="emptyState">{tr("Bạn không có quyền trả lời phản hồi bài thi.")}</div>;
  }

  return (
    <>
      <PageHeader title={tr("Phản hồi bài thi")} description={tr("Góp ý và thắc mắc của thí sinh trong các kỳ thi bạn được phân công. Mở một dòng để đọc và trả lời.")} />

      <div className="tabBar" role="tablist" aria-label={tr("Trạng thái phản hồi")}>
        {(["unanswered", "answered"] as Tab[]).map((key) => (
          <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? "tabButton active" : "tabButton"} onClick={() => { setTab(key); table.reset(); }}>
            {key === "unanswered" ? tr("Chưa trả lời") : tr("Đã trả lời")}
          </button>
        ))}
      </div>

      <section className="panel">
        <TableToolbar search={{ value: table.query, onChange: table.setQuery, placeholder: tr("Tìm theo thí sinh, kỳ thi, nội dung…"), label: tr("Tìm phản hồi") }} active={Boolean(table.query.trim())} onReset={table.reset} />
        <DataTable
          label={tr("Phản hồi bài thi")}
          rows={table.visible}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={Boolean(table.query.trim())}
          searchTerm={table.query.trim()}
          onClearFilters={table.reset}
          emptyMessage={tab === "unanswered" ? tr("Không có phản hồi nào đang chờ bạn trả lời") : tr("Chưa trả lời phản hồi nào")}
          emptyHint={tab === "unanswered" ? tr("Khi thí sinh gửi phản hồi cho kỳ thi bạn coi, nó sẽ hiện ở đây.") : undefined}
          pagination={table.pagination}
          sort={table.sort}
          expandable={{ render: (item) => <ReplyForm item={item} onDone={load} /> }}
          columns={[
            { key: "student", sortKey: "student", header: tr("Thí sinh"), render: (item) => (<div><strong>{item.student_name}</strong><div className="reviewEmpty" style={{ margin: 0 }}>{item.student_email}</div></div>) },
            { key: "session", sortKey: "session", header: tr("Kỳ thi"), render: (item) => `${item.exam_session_title ?? "—"}${item.attempt_number ? tr(" · lần {0}", item.attempt_number) : ""}` },
            { key: "message", sortKey: "message", header: tr("Nội dung"), render: (item) => <span className="lineClamp2">{item.message}</span> },
            { key: "sent", sortKey: "sent", header: tr("Gửi lúc"), render: (item) => fmt(item.created_at) },
            { key: "status", sortKey: "status", header: tr("Trạng thái"), render: (item) => <span className={`badge ${item.reply ? "green" : "amber"}`}>{item.reply ? tr("Đã trả lời") : tr("Chưa trả lời")}</span> }
          ]}
        />
      </section>
    </>
  );
}
