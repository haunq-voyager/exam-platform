"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { api, ApiError } from "../../../lib/api-client";
import type { User, UserRole } from "../../../lib/types";

const ROLE_LABEL: Record<UserRole, string> = {
  admin: "Quản trị viên",
  teacher: "Giảng viên",
  student: "Thí sinh"
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const response = await api.get<{ data: User[] }>("/users");
      setUsers(response.data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/users", { name, email, password, role });
      setName("");
      setEmail("");
      setPassword("");
      setRole("teacher");
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo người dùng.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRoleChange(user: User, nextRole: UserRole) {
    await api.patch(`/users/${user.id}`, { role: nextRole });
    await load();
  }

  async function handleDelete(user: User) {
    if (!confirm(`Xóa tài khoản ${user.name}?`)) return;
    await api.delete(`/users/${user.id}`);
    await load();
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1>Người dùng</h1>
        </div>
        <button className="primaryButton" onClick={() => setShowForm((value) => !value)}>
          <Plus size={18} />
          Thêm người dùng
        </button>
      </header>

      {showForm ? (
        <section className="panel" style={{ marginBottom: 18 }}>
          <form onSubmit={handleCreate} className="controlRow" style={{ flexWrap: "wrap" }}>
            {error ? <div className="formError" style={{ width: "100%" }}>{error}</div> : null}
            <label className="field wide">
              <span>Họ tên</span>
              <input value={name} onChange={(event) => setName(event.target.value)} required />
            </label>
            <label className="field wide">
              <span>Email</span>
              <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="field wide">
              <span>Mật khẩu</span>
              <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
            </label>
            <label className="field compact">
              <span>Vai trò</span>
              <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                <option value="admin">Quản trị viên</option>
                <option value="teacher">Giảng viên</option>
                <option value="student">Thí sinh</option>
              </select>
            </label>
            <button className="primaryButton" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
          </form>
        </section>
      ) : null}

      <section className="panel">
        {loading ? (
          <div className="emptyState">Đang tải...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Họ tên</th>
                <th>Email</th>
                <th>Vai trò</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    <select value={user.role} onChange={(event) => handleRoleChange(user, event.target.value as UserRole)}>
                      <option value="admin">{ROLE_LABEL.admin}</option>
                      <option value="teacher">{ROLE_LABEL.teacher}</option>
                      <option value="student">{ROLE_LABEL.student}</option>
                    </select>
                  </td>
                  <td>
                    <button className="linkButton" onClick={() => handleDelete(user)} title="Xóa">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
