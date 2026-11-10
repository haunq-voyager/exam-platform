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
import { ROLE_LABEL } from "../../../lib/permissions";
import type { User } from "../../../lib/types";


const TABS: { key: string; label: string }[] = [
  { key: "", get label() { return tr("Tất cả"); } },
  { key: "admin", get label() { return tr("Quản trị viên"); } },
  { key: "teacher", get label() { return tr("Giáo viên"); } },
  { key: "department_head", get label() { return tr("Trưởng khoa"); } },
  { key: "training_office", get label() { return tr("Phòng đào tạo"); } },
  { key: "student", get label() { return tr("Thí sinh"); } }
];

export default function UsersPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState({ current_page: 1, per_page: 15, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<string>("");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const serverSort = useServerSort(() => setPage(1));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<User>>("/users", { search, role: tab || undefined, page, per_page: 15, ...serverSort.params });
      setUsers(response.data);
      setMeta(metaOf(response));
    } finally {
      setLoading(false);
    }
  }, [search, tab, page, serverSort.params]);

  useEffect(() => {
    load();
  }, [load]);

  /** Number of accounts per tab (one tiny request each: only `meta.total` is read). */
  const loadCounts = useCallback(async () => {
    const entries = await Promise.all(
      TABS.map(async (item) => {
        try {
          const response = await api.get<PaginatedResponse<User>>("/users", { role: item.key || undefined, per_page: 1 });
          return [item.key || "all", metaOf(response).total] as const;
        } catch {
          return null;
        }
      })
    );
    setCounts(Object.fromEntries(entries.filter((entry): entry is readonly [string, number] => entry !== null)));
  }, []);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  function changeTab(next: string) {
    setTab(next);
    setPage(1);
    setSelectedIds(new Set());
  }

  async function handleDelete(user: User) {
    setIsDeleting(true);
    try {
      await api.delete(`/users/${user.id}`);
      showToast(tr("Đã xoá tài khoản \"{0}\".", user.name));
      setDeleteTarget(null);
      await Promise.all([load(), loadCounts()]);
    } catch {
      showToast(tr("Không thể xoá tài khoản."), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setIsDeleting(true);
    try {
      await Promise.all(Array.from(selectedIds).map((id) => api.delete(`/users/${id}`)));
      showToast(tr("Đã xoá {0} tài khoản.", selectedIds.size));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      await Promise.all([load(), loadCounts()]);
    } catch {
      showToast(tr("Không thể xoá một số tài khoản."), "error");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow={tr("Quản trị")}
        title={tr("Người dùng")}
        description={tr("Tài khoản quản trị viên, giáo viên, trưởng khoa, phòng đào tạo và thí sinh.")}
        actions={
          <button className="primaryButton" onClick={() => router.push("/dashboard/users/new")}>
            <Plus size={16} aria-hidden="true" />
            {tr("Thêm người dùng")}
          </button>
        }
      />

      <div className="tabBar" role="tablist" aria-label={tr("Nhóm người dùng")}>
        {TABS.map((item) => (
          <button
            key={item.key || "all"}
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? "tabButton active" : "tabButton"}
            onClick={() => changeTab(item.key)}
          >
            {item.label}
            {counts[item.key || "all"] !== undefined ? ` (${counts[item.key || "all"]})` : ""}
          </button>
        ))}
      </div>

      <section className="panel">
        <TableToolbar
          search={{
            value: search,
            onChange: (value) => {
              setPage(1);
              setSearch(value);
            },
            placeholder: tr("Tìm theo tên, email, mã số, mã lớp…"),
            label: tr("Tìm người dùng")
          }}
          active={Boolean(search.trim())}
          onReset={() => {
            setPage(1);
            setSearch("");
          }}
        />

        <DataTable
          label={tr("Danh sách {0}", TABS.find((item) => item.key === tab)?.label.toLowerCase() ?? "người dùng")}
          rows={users}
          rowKey={(row) => row.id}
          loading={loading}
          filtered={Boolean(search.trim())}
          searchTerm={search.trim()}
          onClearFilters={() => {
            setPage(1);
            setSearch("");
          }}
          emptyMessage={tab === "" ? tr("Chưa có người dùng nào") : tr("Chưa có {0} nào", TABS.find((item) => item.key === tab)?.label.toLowerCase())}
          emptyHint={tr("Bấm “Thêm người dùng” để tạo tài khoản.")}
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
            onToggleAll: (checked) => setSelectedIds(checked ? new Set(users.map((row) => row.id)) : new Set()),
            bulkActions: (
              <button className="dangerButton" onClick={() => setBulkDeleteOpen(true)}>
                <Trash2 size={16} />
                {tr("Xoá đã chọn")}
              </button>
            )
          }}
          columns={[
            { key: "code", sortKey: "user_code", header: tab === "student" ? tr("Mã sinh viên") : tab === "" ? tr("Mã số") : tr("Mã cán bộ"), render: (row) => row.user_code ?? "—" },
            {
              key: "name",
              sortKey: "name",
              header: tr("Họ tên"),
              render: (row) => (
                <div>
                  <strong>{row.name}</strong>
                  <div className="cellSub">{row.email}</div>
                </div>
              )
            },
            { key: "unit", sortKey: "major", header: tab === "student" ? tr("Ngành") : tab === "" ? tr("Khoa / Ngành") : "Khoa", render: (row) => (row.role === "student" ? row.major ?? "—" : row.department_name ?? "—") },
            ...(tab === "student" ? [{ key: "class", sortKey: "class_code", header: tr("Mã lớp"), render: (row: User) => row.class_code ?? "—" }, { key: "year", sortKey: "academic_year", header: tr("Khóa"), render: (row: User) => row.academic_year ?? "—" }] : []),
            ...(tab !== "" ? [{ key: "phone", header: tr("Điện thoại"), render: (row: User) => row.phone ?? "—" }] : []),
            // Inside a role tab every row has the same role, so the column is only shown in "Tất cả".
            ...(tab === "" ? [{ key: "role", sortKey: "role", header: tr("Vai trò"), render: (row: User) => <span className="badge blue">{ROLE_LABEL[row.role]}</span> }] : []),
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <Link className="iconButton" href={`/dashboard/users/${row.id}/edit`} title={tr("Sửa")} aria-label={tr("Sửa {0}", row.name)}>
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
        title={tr("Xoá người dùng?")}
        description={deleteTarget ? tr("Xoá tài khoản \"{0}\" ({1})?", deleteTarget.name, deleteTarget.email) : undefined}
        confirmLabel={tr("Xoá")}
        danger
        loading={isDeleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && handleDelete(deleteTarget)}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        title={tr("Xoá các người dùng đã chọn?")}
        description={tr("Xoá {0} tài khoản?", selectedIds.size)}
        confirmLabel={tr("Xoá")}
        danger
        loading={isDeleting}
        onCancel={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
      />
    </>
  );
}
