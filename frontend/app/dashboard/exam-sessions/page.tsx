"use client";


import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { Eye, Plus, Settings2 } from "lucide-react";
import { useServerSort } from "../../../lib/use-server-sort";
import { api } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { FilterSelect, TableToolbar } from "../../../components/TableToolbar";
import { ApprovalBadge } from "../../../components/ApprovalBadge";
import { ToggleSwitch, useSessionSwitch } from "../../../components/SessionSwitch";
import { metaOf, type PaginatedResponse } from "../../../lib/pagination";
import { useAuth } from "../../../lib/auth-context";
import { can } from "../../../lib/permissions";
import { scheduleText, sessionPhase } from "../../../lib/session-phase";
import type { ExamSession } from "../../../lib/types";

export default function ExamSessionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canEnable = can(user, "sessions.enable");
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("");
  const [startFrom, setStartFrom] = useState("");
  const [startTo, setStartTo] = useState("");
  const [page, setPage] = useState(1);

  const serverSort = useServerSort(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<ExamSession>>("/exam-sessions", {
        search,
        status: statusFilter || undefined,
        approval_status: approvalFilter || undefined,
        start_from: startFrom || undefined,
        start_to: startTo || undefined,
        page,
        per_page: 15,
        ...serverSort.params
      });
      setSessions(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, approvalFilter, startFrom, startTo, page, serverSort.params]);

  useEffect(() => {
    load();
  }, [load]);

  const { requestToggle, isBusy, dialog } = useSessionSwitch(load);

  const hasFilters = Boolean(search.trim() || statusFilter || approvalFilter || startFrom || startTo);
  const clearFilters = () => {
    setPage(1);
    setSearch("");
    setStatusFilter("");
    setApprovalFilter("");
    setStartFrom("");
    setStartTo("");
  };

  return (
    <>
      <PageHeader
        eyebrow={tr("Lịch thi")}
        title={tr("Danh sách kỳ thi")}
        description={tr("Soạn kỳ thi trước, gửi duyệt, rồi bật khi sẵn sàng.")}
        actions={
          can(user, "sessions.create") ? (
            <button className="primaryButton" onClick={() => router.push("/dashboard/exam-sessions/new")}>
              <Plus size={16} aria-hidden="true" />
              {tr("Tạo kỳ thi")}
            </button>
          ) : null
        }
      />

      <section className="panel">
        <TableToolbar
          search={{
            value: search,
            onChange: (value) => {
              setPage(1);
              setSearch(value);
            },
            placeholder: tr("Tìm theo mã hoặc tên kỳ thi…"),
            label: tr("Tìm kỳ thi")
          }}
          active={hasFilters}
          onReset={clearFilters}
        >
          <FilterSelect
            label={tr("Công tắc")}
            value={statusFilter}
            onChange={(value) => {
              setPage(1);
              setStatusFilter(value);
            }}
            options={[
              { value: "draft", label: tr("Chưa bật") },
              { value: "open", label: tr("Đang bật") },
              { value: "closed", label: tr("Đã tắt / kết thúc") }
            ]}
          />
          <FilterSelect
            label={tr("Duyệt")}
            value={approvalFilter}
            onChange={(value) => {
              setPage(1);
              setApprovalFilter(value);
            }}
            options={[
              { value: "draft", label: tr("Chưa gửi duyệt") },
              { value: "pending", label: tr("Chờ duyệt") },
              { value: "approved", label: tr("Đã duyệt") },
              { value: "rejected", label: tr("Bị từ chối") }
            ]}
          />
          <label className="tableFilter">
            <span>{tr("Thi từ ngày")}</span>
            <input
              type="date"
              value={startFrom}
              max={startTo || undefined}
              onChange={(event) => {
                setPage(1);
                setStartFrom(event.target.value);
              }}
            />
          </label>
          <label className="tableFilter">
            <span>{tr("Đến ngày")}</span>
            <input
              type="date"
              value={startTo}
              min={startFrom || undefined}
              onChange={(event) => {
                setPage(1);
                setStartTo(event.target.value);
              }}
            />
          </label>
        </TableToolbar>

        <DataTable
          label={tr("Danh sách kỳ thi")}
          rows={sessions}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={hasFilters}
          searchTerm={search.trim()}
          onClearFilters={clearFilters}
          emptyMessage={tr("Chưa có kỳ thi nào")}
          emptyHint={tr("Bấm “Tạo kỳ thi” để bắt đầu; bạn có thể soạn trước rồi bật sau.")}
          pagination={{ page: meta.current_page, perPage: meta.per_page, total: meta.total, onPageChange: setPage }}
          sort={serverSort.sort}
          columns={[
            {
              key: "switch",
              header: tr("Bật"),
              width: "70px",
              render: (row) => {
                const blocked = !row.is_enabled && row.approval.required && row.approval.status !== "approved";
                return (
                  <ToggleSwitch
                    checked={row.is_enabled}
                    disabled={isBusy(row.id) || !canEnable || blocked}
                    label={
                      !canEnable
                        ? tr("Bạn không có quyền bật/tắt kỳ thi")
                        : blocked
                          ? tr("Cần được duyệt xong mới bật được")
                          : row.is_enabled
                            ? tr("Tắt kỳ thi")
                            : tr("Bật kỳ thi")
                    }
                    onClick={() => requestToggle(row)}
                  />
                );
              }
            },
            { key: "code", sortKey: "code", header: tr("Mã kỳ thi"), width: "120px", render: (row) => row.code ?? "—" },
            {
              key: "title",
              sortKey: "title",
              header: tr("Kỳ thi"),
              render: (row) => (
                <div>
                  <Link href={`/dashboard/exam-sessions/${row.id}`}>
                    <strong>{row.title}</strong>
                  </Link>
                  <div className="reviewEmpty" style={{ margin: 0 }}>
                    {row.question_count ?? 0} {tr("câu ·")} {row.duration_minutes ?? "—"} {tr("phút")}
                  </div>
                </div>
              )
            },
            {
              key: "status",
              sortKey: "status",
              header: tr("Trạng thái"),
              render: (row) => {
                const phase = sessionPhase(row);
                return <span className={`badge ${phase.tone}`}>{phase.label}</span>;
              }
            },
            {
              key: "approval",
              header: tr("Duyệt"),
              render: (row) => (row.approval.required ? <ApprovalBadge sessionId={row.id} sessionTitle={row.title} approval={row.approval} /> : "—")
            },
            { key: "schedule", sortKey: "start_at", header: tr("Thời gian thi"), render: (row) => scheduleText(row) },
            { key: "students", header: tr("Thí sinh"), numeric: true, render: (row) => row.assigned_student_count ?? 0 },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/exam-sessions/${row.id}/preview`} title={tr("Xem trước đề thi")} aria-label={tr("Xem trước đề {0}", row.title)}>
                    <Eye size={16} aria-hidden="true" />
                  </Link>
                  <Link className="iconButton" href={`/dashboard/exam-sessions/${row.id}`} title={tr("Quản lý kỳ thi")} aria-label={tr("Quản lý {0}", row.title)}>
                    <Settings2 size={16} aria-hidden="true" />
                  </Link>
                </div>
              )
            }
          ]}
        />
      </section>

      {dialog}
    </>
  );
}
