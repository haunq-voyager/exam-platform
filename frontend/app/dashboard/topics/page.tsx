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
import type { Subject, Topic } from "../../../lib/types";

export default function TopicsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Topic | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [topicsResponse, subjectsResponse] = await Promise.all([
        api.get<PaginatedResponse<Topic>>("/topics", {
          search,
          subject_id: subjectFilter || undefined,
          page,
          per_page: 15
        }),
        api.get<{ data: Subject[] }>("/subjects", { per_page: 100 })
      ]);
      setTopics(topicsResponse.data);
      setMeta(metaOf(topicsResponse));
      setSubjects(subjectsResponse.data);
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(topic: Topic) {
    setIsDeleting(true);
    try {
      await api.delete(`/topics/${topic.id}`);
      showToast(`Đã xoá chủ đề "${topic.name}".`);
      setDeleteTarget(null);
      await load();
    } catch {
      showToast("Không thể xoá chủ đề.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/topics/${id}`)));
      showToast(`Đã xoá ${selectedIds.size} chủ đề.`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast("Không thể xoá một số chủ đề.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Ngân hàng câu hỏi</p>
          <h1>Chủ đề</h1>
        </div>
        <button className="primaryButton" onClick={() => router.push("/dashboard/topics/new")}>
          <Plus size={18} />
          Tạo chủ đề
        </button>
      </header>

      <div className="toolbar">
        <div className="controlRow" style={{ margin: 0 }}>
          <label className="searchField">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm chủ đề..."
            />
          </label>
          <label className="field compact" style={{ width: 200 }}>
            <span>Môn học</span>
            <select
              value={subjectFilter}
              onChange={(event) => {
                setPage(1);
                setSubjectFilter(event.target.value);
              }}
            >
              <option value="">Tất cả môn học</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <section className="panel">
        <DataTable
          rows={topics}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="Chưa có chủ đề nào."
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
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(topics.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                Xoá đã chọn
              </button>
            )
          }}
          columns={[
            { key: "name", header: "Tên chủ đề", render: (row) => <strong>{row.name}</strong> },
            { key: "subject", header: "Môn học", render: (row) => row.subject_name ?? "—" },
            { key: "description", header: "Mô tả", render: (row) => row.description ?? "—" },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/topics/${row.id}/edit`} title="Sửa">
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
        title="Xoá chủ đề?"
        description={deleteTarget ? `Xoá "${deleteTarget.name}"?` : undefined}
        confirmLabel="Xoá"
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Xoá các chủ đề đã chọn?"
        description={`Xoá ${selectedIds.size} chủ đề?`}
        confirmLabel="Xoá"
        danger
        loading={isDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
