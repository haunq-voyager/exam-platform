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
import type { User, UserRole } from "../../../lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Quản trị viên",
  teacher: "Giảng viên",
  student: "Thí sinh"
};

export default function UsersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<User>>("/users", { search, role: roleFilter || undefined, page, per_page: 15 });
      setUsers(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, page]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(user: User) {
    setIsDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      showToast(`Đã xoá tài khoản "${user.name}".`);
      setDeleteTarget(null);
      await load();
    } catch {
      showToast("Không thể xoá tài khoản.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/users/${id}`)));
      showToast(`Đã xoá ${selectedIds.size} tài khoản.`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await load();
    } catch {
      showToast("Không thể xoá một số tài khoản.", "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1>Người dùng</h1>
        </div>
        <button className="primaryButton" onClick={() => router.push("/dashboard/users/new")}>
          <Plus size={18} />
          Thêm người dùng
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
              placeholder="Tìm theo tên hoặc email..."
            />
          </label>
          <label className="field compact" style={{ width: 180 }}>
            <span>Vai trò</span>
            <select
              value={roleFilter}
              onChange={(event) => {
                setPage(1);
                setRoleFilter(event.target.value);
              }}
            >
              <option value="">Tất cả vai trò</option>
              <option value="admin">{ROLE_LABEL.admin}</option>
              <option value="teacher">{ROLE_LABEL.teacher}</option>
              <option value="student">{ROLE_LABEL.student}</option>
            </select>
          </label>
        </div>
      </div>

      <section className="panel">
        <DataTable
          rows={users}
          rowKey={(row) => row.id}
          loading={loading}
          emptyMessage="Chưa có người dùng nào."
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
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(users.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                Xoá đã chọn
              </button>
            )
          }}
          columns={[
            { key: "name", header: "Họ tên", render: (row) => <strong>{row.name}</strong> },
            { key: "email", header: "Email", render: (row) => row.email },
            { key: "role", header: "Vai trò", render: (row) => <span className="badge blue">{ROLE_LABEL[row.role]}</span> },
            {
              key: "actions",
              header: "",
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/users/${row.id}/edit`} title="Sửa">
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
        title="Xoá người dùng?"
        description={deleteTarget ? `Xoá tài khoản "${deleteTarget.name}" (${deleteTarget.email})?` : undefined}
        confirmLabel="Xoá"
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title="Xoá các người dùng đã chọn?"
        description={`Xoá ${selectedIds.size} tài khoản?`}
        confirmLabel="Xoá"
        danger
        loading={isDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
