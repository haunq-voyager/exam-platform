"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileQuestion, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Exam>>("/exams", { search, page, per_page: 15 });
      setExams(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(exam: Exam) {
    setIsDeleting(true);
    try {
      await api.delete(`/exams/${exam.id}`);
      showToast(`Đã xoá đề thi "${exam.title}".`);
      setDeleteTarget(null);
      await load();
    } catch {
      showToast("Không thể xoá đề thi (có thể đang được dùng trong một kỳ thi).", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/exams/${id}`)));
      showToast(`Đã xoá ${selectedIds.size} đề thi.`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast("Không thể xoá một số đề thi.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ngân hàng đề thi</p>
          <h1>Danh sách đề thi</h1>
        </div>
        <button className="primaryButton" onClick={() => router.push("/dashboard/exams/new")}>
          <Plus size={18} />
          Tạo đề thi
        </button>
      </header>

      <p style={{ color: "var(--muted)", marginTop: -8, marginBottom: 18 }}>
        Đề thi là bộ câu hỏi + thời lượng dùng làm mẫu. Để mở cho thí sinh làm bài theo lịch cụ thể, tạo{" "}
        <Link className="linkButton" href="/dashboard/exam-sessions">
          kỳ thi
        </Link>{" "}
        từ đề thi này.
      </p>

      <div className="toolbar">
        <label className="searchField">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Tìm đề thi..."
          />
        </label>
      </div>

      <section className="panel">
        <DataTable
          rows={exams}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="Chưa có đề thi nào."
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
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(exams.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                Xoá đã chọn
              </button>
            )
          }}
          columns={[
            { key: "title", header: "Tên đề thi", render: (row) => <strong>{row.title}</strong> },
            { key: "duration", header: "Thời gian", render: (row) => `${row.duration_minutes} phút` },
            { key: "question_count", header: "Số câu", render: (row) => row.question_count ?? 0 },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/exams/${row.id}`} title="Quản lý câu hỏi">
                    <FileQuestion size={16} />
                  </Link>
                  <button className="iconButton" title="Xoá" onClick={() => setDeleteTarget(row)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </section>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Xoá đề thi?"
        description={deleteTarget ? `Xoá "${deleteTarget.title}"? Không thể hoàn tác.` : undefined}
        confirmLabel="Xoá"
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Xoá các đề thi đã chọn?"
        description={`Xoá ${selectedIds.size} đề thi?`}
        confirmLabel="Xoá"
        danger
        loading={isDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
