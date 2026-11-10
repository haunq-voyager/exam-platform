"use client";


import { tr } from "../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { api, ApiError } from "../lib/api-client";
import { metaOf, type PaginatedResponse } from "../lib/pagination";
import { useToast } from "../lib/toast";
import type { User } from "../lib/types";
import { ConfirmDialog } from "./ConfirmDialog";
import { DataTable } from "./DataTable";

const PAGE_SIZE = 10;

interface Props {
  sessionId: number | string;
  /** Called after students were assigned so the parent can refresh the assigned list. */
  onAssigned: () => void;
}

/**
 * Table of students that are not yet in the exam session: tick rows (selection survives paging and filtering) and
 * assign them in one go, or assign everyone matching the current major / search filter.
 */
export function StudentPicker({ sessionId, onAssigned }: Props) {
  const { showToast } = useToast();
  const [rows, setRows] = useState<User[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: PAGE_SIZE, total: 0 });
  const [majors, setMajors] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [major, setMajor] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmFilterAssign, setConfirmFilterAssign] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ data: string[] }>("/users/majors")
      .then((response) => setMajors(response.data))
      .catch(() => setMajors([]));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  // A new filter always starts from the first page.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, major]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<User>>(`/exam-sessions/${sessionId}/assignable-students`, {
        search: debouncedSearch,
        major,
        page,
        per_page: PAGE_SIZE
      });
      setRows(response.data);
      setMeta(metaOf(response));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể tải danh sách thí sinh."));
    } finally {
      setLoading(false);
    }
  }, [sessionId, debouncedSearch, major, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function assign(payload: { student_ids?: number[]; major?: string; search?: string }) {
    setError(null);
    setBusy(true);
    try {
      const response = await api.post<{ data: { assigned_count: number } }>(`/exam-sessions/${sessionId}/assignments/bulk`, payload);
      showToast(tr("Đã gán {0} thí sinh vào kỳ thi.", response.data.assigned_count));
      setSelectedIds(new Set());
      setConfirmFilterAssign(false);
      onAssigned();
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể gán thí sinh."));
    } finally {
      setBusy(false);
    }
  }

  const hasFilter = major !== "" || debouncedSearch !== "";

  return (
    <div>
      <div className="controlRow" style={{ alignItems: "center", flexWrap: "wrap", margin: "0 0 12px" }}>
        <label className="searchField">
          <Search size={17} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tr("Tìm theo tên hoặc email...")} />
        </label>
        <label className="field compact" style={{ minWidth: 220 }}>
          <select value={major} onChange={(event) => setMajor(event.target.value)} aria-label={tr("Lọc theo ngành")}>
            <option value="">{tr("Tất cả ngành")}</option>
            {majors.map((item) => (
              <option value={item} key={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        {hasFilter && meta.total > 0 ? (
          <button className="approveButton" onClick={() => setConfirmFilterAssign(true)} disabled={busy}>
            <Users size={16} />
            {tr("Gán tất cả")} {meta.total} {tr("thí sinh đang lọc")}
          </button>
        ) : null}
      </div>

      {error ? <div className="formError" style={{ marginBottom: 12 }}>{error}</div> : null}

      <DataTable
        rows={rows}
        rowKey={(row) => row.id}
        loading={loading}
        emptyMessage={hasFilter ? tr("Không có thí sinh phù hợp (hoặc đã được gán hết).") : tr("Tất cả thí sinh đã được gán vào kỳ thi.")}
        columns={[
          { key: "name", header: tr("Họ tên"), render: (row) => <strong>{row.name}</strong> },
          { key: "email", header: "Email", render: (row) => row.email },
          { key: "code", header: tr("Mã sinh viên"), render: (row) => row.user_code ?? "—" },
          { key: "major", header: tr("Ngành"), render: (row) => row.major ?? "—" },
          { key: "class", header: tr("Mã lớp"), render: (row) => row.class_code ?? "—" }
        ]}
        pagination={{ page: meta.current_page, perPage: meta.per_page, total: meta.total, onPageChange: setPage }}
        selection={{
          selectedIds,
          getId: (row) => row.id,
          onToggle: (id) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            }),
          onToggleAll: (checked) =>
            setSelectedIds((prev) => {
              const next = new Set(prev);
              rows.forEach((row) => (checked ? next.add(row.id) : next.delete(row.id)));
              return next;
            }),
          onClear: () => setSelectedIds(new Set()),
          bulkActions: (
            <button className="primaryButton" onClick={() => assign({ student_ids: Array.from(selectedIds) })} disabled={busy}>
              <Plus size={16} />
              {tr("Gán")} {selectedIds.size} {tr("thí sinh")}
            </button>
          )
        }}
      />

      <ConfirmDialog
        open={confirmFilterAssign}
        title={tr("Gán tất cả thí sinh đang lọc?")}
        description={tr("Gán {0} thí sinh{1}{2} vào kỳ thi này?", meta.total, major ? ` thuộc ngành "${major}"` : "", debouncedSearch ? ` khớp "${debouncedSearch}"` : "")}
        confirmLabel={tr("Gán tất cả")}
        loading={busy}
        onCancel={() => setConfirmFilterAssign(false)}
        onConfirm={() => assign({ major: major || undefined, search: debouncedSearch || undefined })}
      />
    </div>
  );
}
