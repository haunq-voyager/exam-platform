"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { api } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { metaOf, type PaginatedResponse } from "../../../lib/pagination";
import { useToast } from "../../../lib/toast";
import type { Subject } from "../../../lib/types";

export default function SubjectsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Subject>>("/subjects", { search, page, per_page: 15 });
      setSubjects(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(subject: Subject) {
    setIsDeleting(true);
    try {
      await api.delete(`/subjects/${subject.id}`);
      showToast(`Đã xoá môn học "${subject.name}".`);
      setDeleteTarget(null);
      await load();
    } catch {
      showToast("Không thể xoá môn học.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/subjects/${id}`)));
      showToast(`Đã xoá ${selectedIds.size} môn học.`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast("Không thể xoá một số môn học.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ngân hàng câu hỏi</p>
          <h1>Môn học</h1>
        </div>
        <button className="primaryButton" onClick={() => router.push("/dashboard/subjects/new")}>
          <Plus size={18} />
          Tạo môn học
        </button>
      </header>

      <div className="toolbar">
        <label className="searchField">
          <Search size={17} />
          <input
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Tìm môn học..."
          />
        </label>
      </div>

      <section className="panel">
        <DataTable
          rows={subjects}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="Chưa có môn học nào."
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
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(subjects.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                Xoá đã chọn
              </button>
            )
          }}
          columns={[
            { key: "name", header: "Tên môn học", render: (row) => <strong>{row.name}</strong> },
            { key: "description", header: "Mô tả", render: (row) => row.description ?? "—" },
            { key: "topics_count", header: "Số chủ đề", render: (row) => row.topics_count ?? 0 },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/subjects/${row.id}/edit`} title="Sửa">
                    <Pencil size={16} />
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
        title="Xoá môn học?"
        description={deleteTarget ? `Xoá "${deleteTarget.name}"? Các chủ đề liên quan cũng sẽ bị xoá.` : undefined}
        confirmLabel="Xoá"
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Xoá các môn học đã chọn?"
        description={`Xoá ${selectedIds.size} môn học? Các chủ đề liên quan cũng sẽ bị xoá.`}
        confirmLabel="Xoá"
        danger
        loading={isDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
