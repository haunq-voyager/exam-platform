"use client";


import { tr } from "../../../lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { ClientTable } from "../../../components/ClientTable";
import { PageHeader } from "../../../components/PageHeader";
import { useAuth } from "../../../lib/auth-context";
import { can } from "../../../lib/permissions";
import { useToast } from "../../../lib/toast";
import type { Department } from "../../../lib/types";

export default function DepartmentsPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Department | "new" | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get<{ data: Department[] }>("/departments");
      setDepartments(response.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(target: Department | "new") {
    setEditing(target);
    setName(target === "new" ? "" : target.name);
    setCode(target === "new" ? "" : target.code ?? "");
    setError(null);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError(null);
    try {
      const body = { name, code: code || null };
      if (editing === "new") await api.post("/departments", body);
      else await api.put(`/departments/${editing.id}`, body);
      showToast(tr("Đã lưu khoa."));
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? (err.errors?.name?.[0] ?? err.message) : tr("Không thể lưu khoa."));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api.delete(`/departments/${deleting.id}`);
      showToast(tr("Đã xóa khoa."));
      setDeleting(null);
      await load();
    } catch (err) {
      showToast(err instanceof ApiError ? err.message : tr("Không thể xóa khoa."), "error");
    }
  }

  if (!can(user, "departments.manage")) {
    return <div className="emptyState">{tr("Bạn không có quyền quản lý khoa.")}</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow={tr("Quản trị")}
        title={tr("Khoa")}
        description={tr("Giảng viên, trưởng khoa và kỳ thi thuộc một khoa. Trưởng khoa chỉ duyệt các kỳ thi của khoa mình.")}
        actions={
          <button className="primaryButton" onClick={() => startEdit("new")}>
            <Plus size={16} aria-hidden="true" />
            {tr("Thêm khoa")}
          </button>
        }
      />

      {editing ? (
        <section className="panel" style={{ maxWidth: 560, marginBottom: 16 }}>
          <form onSubmit={save}>
            {error ? <div className="formError" role="alert" style={{ marginBottom: 12 }}>{error}</div> : null}
            <div className="controlRow" style={{ margin: 0, alignItems: "flex-end", flexWrap: "wrap" }}>
              <label className="field" style={{ flex: "2 1 240px" }}>
                <span>{tr("Tên khoa")}</span>
                <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={255} autoFocus />
              </label>
              <label className="field" style={{ flex: "1 1 120px" }}>
                <span>{tr("Mã (tuỳ chọn)")}</span>
                <input value={code} onChange={(event) => setCode(event.target.value)} maxLength={50} />
              </label>
              <button className="primaryButton" type="submit" disabled={saving}>
                <Save size={16} />
                {saving ? tr("Đang lưu...") : tr("Lưu")}
              </button>
              <button className="iconButton" type="button" onClick={() => setEditing(null)} title={tr("Hủy")} aria-label={tr("Hủy")}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="panel">
        <ClientTable
          label={tr("Danh sách khoa")}
          sorters={{ name: (row) => row.name, code: (row) => row.code, users: (row) => row.users_count ?? 0, sessions: (row) => row.sessions_count ?? 0 }}
          rows={departments}
          rowKey={(row) => row.id}
          loading={loading}
          searchText={(row) => `${row.name} ${row.code ?? ""}`}
          searchPlaceholder={tr("Tìm theo tên hoặc mã khoa…")}
          emptyMessage={tr("Chưa có khoa nào")}
          emptyHint={tr("Bấm “Thêm khoa” để tạo khoa đầu tiên.")}
          columns={[
            { key: "name", sortKey: "name", header: "Khoa", render: (row) => <strong>{row.name}</strong> },
            { key: "code", sortKey: "code", header: tr("Mã"), render: (row) => row.code ?? "—" },
            { key: "users", sortKey: "users", header: tr("Nhân sự"), numeric: true, render: (row) => row.users_count ?? 0 },
            { key: "sessions", sortKey: "sessions", header: tr("Kỳ thi"), numeric: true, render: (row) => row.sessions_count ?? 0 },
            {
              key: "actions",
              header: tr("Thao tác"),
              actions: true,
              render: (row) => (
                <div className="controlRow" style={{ margin: 0, justifyContent: "flex-end" }}>
                  <button className="iconButton" title={tr("Sửa")} aria-label={tr("Sửa {0}", row.name)} onClick={() => startEdit(row)}>
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button className="iconButton" title={tr("Xóa")} aria-label={tr("Xóa {0}", row.name)} onClick={() => setDeleting(row)}>
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              )
            }
          ]}
        />
      </section>

      <ConfirmDialog
        open={deleting !== null}
        title={tr("Xóa khoa?")}
        description={deleting ? tr("Xóa \"{0}\"? Nhân sự và kỳ thi thuộc khoa này sẽ không còn thuộc khoa nào (cần chọn lại khoa để được duyệt).", deleting.name) : undefined}
        confirmLabel={tr("Xóa khoa")}
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
    </>
  );
}
