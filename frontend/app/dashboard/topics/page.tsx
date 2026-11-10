"use client";


import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import Link from "@/components/RoleLink";
import { useRouter } from "@/lib/use-role-router";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useServerSort } from "../../../lib/use-server-sort";
import { api } from "../../../lib/api-client";
import { DataTable } from "../../../components/DataTable";
import { PageHeader } from "../../../components/PageHeader";
import { FilterSelect, TableToolbar } from "../../../components/TableToolbar";
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

  const serverSort = useServerSort(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [topicsResponse, subjectsResponse] = await Promise.all([
        api.get<PaginatedResponse<Topic>>("/topics", {
          search,
          subject_id: subjectFilter || undefined,
          page,
          per_page: 15,
          ...serverSort.params
        }),
        api.get<{ data: Subject[] }>("/subjects", { per_page: 100 })
      ]);
      setTopics(topicsResponse.data);
      setMeta(metaOf(topicsResponse));
      setSubjects(subjectsResponse.data);
    } finally {
      setLoading(false);
    }
  }, [search, subjectFilter, page, serverSort.params]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(topic: Topic) {
    setIsDeleting(true);
    try {
      await api.delete(`/topics/${topic.id}`);
      showToast(tr("Đã xoá chủ đề \"{0}\".", topic.name));
      setDeleteTarget(null);
      await load();
    } catch {
      showToast(tr("Không thể xoá chủ đề."), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/topics/${id}`)));
      showToast(tr("Đã xoá {0} chủ đề.", selectedIds.size));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast(tr("Không thể xoá một số chủ đề."), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={tr("Ngân hàng câu hỏi")}
        title={tr("Chủ đề")}
        description={tr("Mỗi chủ đề thuộc một môn học; câu hỏi được xếp theo chủ đề.")}
        actions={
          <button className="primaryButton" onClick={() => router.push("/dashboard/topics/new")}>
            <Plus size={16} aria-hidden="true" />
            {tr("Tạo chủ đề")}
          </button>
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
            placeholder: tr("Tìm chủ đề…"),
            label: tr("Tìm chủ đề")
          }}
          active={Boolean(search.trim() || subjectFilter)}
          onReset={() => {
            setPage(1);
            setSearch("");
            setSubjectFilter("");
          }}
        >
          <FilterSelect
            label={tr("Môn học")}
            value={subjectFilter}
            onChange={(value) => {
              setPage(1);
              setSubjectFilter(value);
            }}
            options={subjects.map((subject) => ({ value: String(subject.id), label: subject.name }))}
            allLabel={tr("Tất cả môn học")}
          />
        </TableToolbar>

        <DataTable
          label={tr("Danh sách chủ đề")}
          rows={topics}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={Boolean(search.trim() || subjectFilter)}
          searchTerm={search.trim()}
          onClearFilters={() => {
            setPage(1);
            setSearch("");
            setSubjectFilter("");
          }}
          emptyMessage={tr("Chưa có chủ đề nào")}
          emptyHint={tr("Bấm “Tạo chủ đề” để thêm chủ đề đầu tiên.")}
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
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(topics.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                {tr("Xoá đã chọn")}
              </button>
            )
          }}
          columns={[
            { key: "name", sortKey: "name", header: tr("Tên chủ đề"), render: (row) => <strong>{row.name}</strong> },
            { key: "subject", header: tr("Môn học"), render: (row) => row.subject_name ?? "—" },
            { key: "description", header: tr("Mô tả"), render: (row) => row.description ?? "—" },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/topics/${row.id}/edit`} title={tr("Sửa")} aria-label={tr("Sửa {0}", row.name)}>
                    <Pencil size={16} aria-hidden="true" />
                  </Link>
                  <button className="iconButton" title={tr("Xoá")} aria-label={tr("Xoá {0}", row.name)} onClick={() => setDeleteTarget(row)}>
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
        title={tr("Xoá chủ đề?")}
        description={deleteTarget ? tr("Xoá \"{0}\"?", deleteTarget.name) : undefined}
        confirmLabel={tr("Xoá")}
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={tr("Xoá các chủ đề đã chọn?")}
        description={tr("Xoá {0} chủ đề?", selectedIds.size)}
        confirmLabel={tr("Xoá")}
        danger
        loading={isDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
