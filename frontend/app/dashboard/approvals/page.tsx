"use client";


import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "@/components/RoleLink";
import { api } from "../../../lib/api-client";
import { ApprovalBadge } from "../../../components/ApprovalBadge";
import { ApprovalPanel } from "../../../components/ApprovalPanel";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { FilterSelect, TableToolbar } from "../../../components/TableToolbar";
import { useAuth } from "../../../lib/auth-context";
import { scheduleText } from "../../../lib/session-phase";
import { useClientTable } from "../../../lib/use-client-table";
import type { ApprovalStatus, ExamSession } from "../../../lib/types";

type Scope = "awaiting" | "mine" | "handled";

const TABS: { key: Scope; label: string; empty: string; hint: string }[] = [
  { key: "awaiting", get label() { return tr("Chờ tôi duyệt"); }, get empty() { return tr("Không có kỳ thi nào đang chờ bạn duyệt"); }, get hint() { return tr("Khi có kỳ thi gửi tới cấp duyệt của bạn, nó sẽ hiện ở đây."); } },
  { key: "mine", get label() { return tr("Kỳ thi của tôi"); }, get empty() { return tr("Không có yêu cầu duyệt nào đang chờ hoặc bị từ chối"); }, get hint() { return tr("Các kỳ thi bạn đã gửi duyệt và chưa xong sẽ hiện ở đây."); } },
  { key: "handled", get label() { return tr("Tôi đã xử lý"); }, get empty() { return tr("Bạn chưa duyệt hoặc từ chối kỳ thi nào"); }, get hint() { return tr("Lịch sử các kỳ thi bạn đã xử lý sẽ hiện ở đây."); } }
];

const STATUS_OPTIONS: { value: ApprovalStatus; label: string }[] = [
  { value: "pending", get label() { return tr("Chờ duyệt"); } },
  { value: "approved", get label() { return tr("Đã duyệt"); } },
  { value: "rejected", get label() { return tr("Bị từ chối"); } }
];

const SORTERS = {
  title: (session: ExamSession) => session.title,
  creator: (session: ExamSession) => session.creator_name,
  department: (session: ExamSession) => session.department_name,
  questions: (session: ExamSession) => session.question_count,
  schedule: (session: ExamSession) => session.start_at,
  approval: (session: ExamSession) => session.approval.status
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [scope, setScope] = useState<Scope>("awaiting");
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [counts, setCounts] = useState({ awaiting: 0, rejected_mine: 0 });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        api.get<{ data: ExamSession[] }>("/approvals", { scope }),
        api.get<{ data: { awaiting: number; rejected_mine: number } }>("/approvals/counts")
      ]);
      setSessions(list.data);
      setCounts(count.data);
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    load();
  }, [load]);

  const byStatus = useMemo(() => sessions.filter((session) => !status || session.approval.status === status), [sessions, status]);
  const matches = useCallback(
    (session: ExamSession, query: string) => `${session.title} ${session.creator_name ?? ""} ${session.department_name ?? ""}`.toLowerCase().includes(query),
    []
  );
  const table = useClientTable(byStatus, { matches, initialPageSize: 10, sorters: SORTERS });
  const tab = TABS.find((item) => item.key === scope) ?? TABS[0];
  const hasFilters = Boolean(table.query.trim() || status);
  const clear = () => {
    table.reset();
    setStatus("");
  };

  return (
    <>
      <PageHeader title={tr("Phê duyệt kỳ thi")} description={tr("Duyệt hoặc từ chối kỳ thi theo cấp duyệt của bạn. Mở một dòng để xem tiến trình và xử lý.")} />

      <div className="tabBar" role="tablist" aria-label={tr("Nhóm kỳ thi")}>
        {TABS.map((item) => (
          <button
            key={item.key}
            role="tab"
            aria-selected={scope === item.key}
            className={scope === item.key ? "tabButton active" : "tabButton"}
            onClick={() => {
              setScope(item.key);
              clear();
            }}
          >
            {item.label}
            {item.key === "awaiting" && counts.awaiting ? ` (${counts.awaiting})` : ""}
            {item.key === "mine" && counts.rejected_mine ? tr(" ({0} bị từ chối)", counts.rejected_mine) : ""}
          </button>
        ))}
      </div>

      <section className="panel">
        <TableToolbar search={{ value: table.query, onChange: table.setQuery, placeholder: tr("Tìm theo kỳ thi, người tạo, khoa…"), label: tr("Tìm kỳ thi cần duyệt") }} active={hasFilters} onReset={clear}>
          <FilterSelect label={tr("Trạng thái duyệt")} value={status} onChange={setStatus} options={STATUS_OPTIONS} />
        </TableToolbar>

        <DataTable
          label={tab.label}
          rows={table.visible}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={hasFilters}
          searchTerm={table.query.trim()}
          onClearFilters={clear}
          emptyMessage={tab.empty}
          emptyHint={tab.hint}
          pagination={table.pagination}
          sort={table.sort}
          expandable={{ render: (session) => <ApprovalPanel sessionId={session.id} onChanged={load} /> }}
          columns={[
            {
              key: "title",
              sortKey: "title",
              header: tr("Kỳ thi"),
              render: (session) => (
                <div>
                  <strong>{session.title}</strong>
                  {session.approval.can_act ? <div><span className="badge amber">{tr("Cần bạn duyệt")}</span></div> : null}
                </div>
              )
            },
            { key: "creator", sortKey: "creator", header: tr("Người tạo"), render: (session) => session.creator_name ?? "—" },
            { key: "department", sortKey: "department", header: "Khoa", render: (session) => session.department_name ?? "—" },
            { key: "questions", sortKey: "questions", header: tr("Số câu"), numeric: true, render: (session) => session.question_count ?? 0 },
            { key: "schedule", sortKey: "schedule", header: tr("Thời gian thi"), render: (session) => scheduleText(session) },
            { key: "approval", sortKey: "approval", header: tr("Duyệt"), render: (session) => <ApprovalBadge sessionId={session.id} sessionTitle={session.title} approval={session.approval} /> },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (session) => (
                <Link className="approveButton" href={`/dashboard/exam-sessions/${session.id}`}>
                  {tr("Xem kỳ thi")}
                </Link>
              )
            }
          ]}
        />
      </section>

      {user?.is_approver ? null : <p className="reviewEmpty">{tr("Bạn không nằm trong cấp duyệt nào nên chỉ thấy tab “Kỳ thi của tôi”.")}</p>}
    </>
  );
}
