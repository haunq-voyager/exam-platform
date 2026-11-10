"use client";


import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { FileQuestion, Plus, Trash2 } from "lucide-react";
import { useServerSort } from "../../../lib/use-server-sort";
import { api } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { TableToolbar } from "../../../components/TableToolbar";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { metaOf, type PaginatedResponse } from "../../../lib/pagination";
import { useToast } from "../../../lib/toast";
import type { Exam } from "../../../lib/types";

export default function ExamsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [exams, setExams] = useState<Exam[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Exam | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const serverSort = useServerSort(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Exam>>("/exams", { search, page, per_page: 15, ...serverSort.params });
      setExams(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [search, page, serverSort.params]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(exam: Exam) {
    setIsDeleting(true);
    try {
      await api.delete(`/exams/${exam.id}`);
      showToast(tr("Đã xoá đề thi \"{0}\".", exam.title));
      setDeleteTarget(null);
      await load();
    } catch {
      showToast(tr("Không thể xoá đề thi (có thể đang được dùng trong một kỳ thi)."), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/exams/${id}`)));
      showToast(tr("Đã xoá {0} đề thi.", selectedIds.size));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast(tr("Không thể xoá một số đề thi."), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={tr("Ngân hàng đề thi")}
        title={tr("Danh sách đề thi")}
        description={tr("Đề thi là bộ câu hỏi và thời lượng dùng làm mẫu. Muốn mở cho thí sinh làm bài theo lịch, hãy tạo kỳ thi từ đề này.")}
        actions={
          <>
            <Link className="approveButton" href="/dashboard/exam-sessions">
              {tr("Đến danh sách kỳ thi")}
            </Link>
            <button className="primaryButton" onClick={() => router.push("/dashboard/exams/new")}>
              <Plus size={16} aria-hidden="true" />
              {tr("Tạo đề thi")}
            </button>
          </>
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
            placeholder: tr("Tìm đề thi…"),
            label: tr("Tìm đề thi")
          }}
          active={Boolean(search.trim())}
          onReset={() => {
            setPage(1);
            setSearch("");
          }}
        />

        <DataTable
          label={tr("Danh sách đề thi")}
          rows={exams}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={Boolean(search.trim())}
          searchTerm={search.trim()}
          onClearFilters={() => {
            setPage(1);
            setSearch("");
          }}
          emptyMessage={tr("Chưa có đề thi nào")}
          emptyHint={tr("Bấm “Tạo đề thi” để soạn đề đầu tiên.")}
          pagination={{ page: meta.current_page, perPage: meta.per_page, total: meta.total, onPageChange: setPage }}
          sort={serverSort.sort}
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
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(exams.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                {tr("Xoá đã chọn")}
              </button>
            )
          }}
          columns={[
            { key: "title", sortKey: "title", header: tr("Tên đề thi"), render: (row) => <strong>{row.title}</strong> },
            { key: "duration", sortKey: "duration_minutes", header: tr("Thời gian"), numeric: true, render: (row) => tr("{0} phút", row.duration_minutes) },
            { key: "question_count", header: tr("Số câu"), numeric: true, render: (row) => row.question_count ?? 0 },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/exams/${row.id}`} title={tr("Quản lý câu hỏi")} aria-label={tr("Quản lý câu hỏi của {0}", row.title)}>
                    <FileQuestion size={16} aria-hidden="true" />
                  </Link>
                  <button className="iconButton" title={tr("Xoá")} aria-label={tr("Xoá {0}", row.title)} onClick={() => setDeleteTarget(row)}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              )
            }
          ]}
        />
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={tr("Xoá đề thi?")}
        description={deleteTarget ? tr("Xoá \"{0}\"? Không thể hoàn tác.", deleteTarget.title) : undefined}
        confirmLabel={tr("Xoá")}
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={tr("Xoá các đề thi đã chọn?")}
        description={tr("Xoá {0} đề thi?", selectedIds.size)}
        confirmLabel={tr("Xoá")}
        danger
        loading={isDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
