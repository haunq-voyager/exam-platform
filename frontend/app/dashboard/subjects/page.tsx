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
import { TableToolbar } from "../../../components/TableToolbar";
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

  const serverSort = useServerSort(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Subject>>("/subjects", { search, page, per_page: 15, ...serverSort.params });
      setSubjects(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [search, page, serverSort.params]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(subject: Subject) {
    setIsDeleting(true);
    try {
      await api.delete(`/subjects/${subject.id}`);
      showToast(tr("Đã xoá môn học \"{0}\".", subject.name));
      setDeleteTarget(null);
      await load();
    } catch {
      showToast(tr("Không thể xoá môn học."), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/subjects/${id}`)));
      showToast(tr("Đã xoá {0} môn học.", selectedIds.size));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast(tr("Không thể xoá một số môn học."), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={tr("Ngân hàng câu hỏi")}
        title={tr("Môn học")}
        description={tr("Nhóm các chủ đề và câu hỏi theo môn.")}
        actions={
          <button className="primaryButton" onClick={() => router.push("/dashboard/subjects/new")}>
            <Plus size={16} aria-hidden="true" />
            {tr("Tạo môn học")}
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
            placeholder: tr("Tìm môn học…"),
            label: tr("Tìm môn học")
          }}
          active={Boolean(search.trim())}
          onReset={() => {
            setPage(1);
            setSearch("");
          }}
        />

        <DataTable
          label={tr("Danh sách môn học")}
          rows={subjects}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={Boolean(search.trim())}
          searchTerm={search.trim()}
          onClearFilters={() => {
            setPage(1);
            setSearch("");
          }}
          emptyMessage={tr("Chưa có môn học nào")}
          emptyHint={tr("Bấm “Tạo môn học” để thêm môn đầu tiên.")}
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
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(subjects.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                {tr("Xoá đã chọn")}
              </button>
            )
          }}
          columns={[
            { key: "name", sortKey: "name", header: tr("Tên môn học"), render: (row) => <strong>{row.name}</strong> },
            { key: "description", header: tr("Mô tả"), render: (row) => row.description ?? "—" },
            { key: "topics_count", header: tr("Số chủ đề"), numeric: true, render: (row) => row.topics_count ?? 0 },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/subjects/${row.id}/edit`} title={tr("Sửa")} aria-label={tr("Sửa {0}", row.name)}>
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
        title={tr("Xoá môn học?")}
        description={deleteTarget ? tr("Xoá \"{0}\"? Các chủ đề liên quan cũng sẽ bị xoá.", deleteTarget.name) : undefined}
        confirmLabel={tr("Xoá")}
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={tr("Xoá các môn học đã chọn?")}
        description={tr("Xoá {0} môn học? Các chủ đề liên quan cũng sẽ bị xoá.", selectedIds.size)}
        confirmLabel={tr("Xoá")}
        danger
        loading={isDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
