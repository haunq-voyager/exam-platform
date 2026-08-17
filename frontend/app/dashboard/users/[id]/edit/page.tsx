"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { api, ApiError } from "../../../../../lib/api-client";
import { useToast } from "../../../../../lib/toast";
import type { User, UserRole } from "../../../../../lib/types";

export default function EditUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.get<{ data: User }>(`/users/${params.id}`);
        setName(response.data.name);
        setEmail(response.data.email);
        setRole(response.data.role);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.patch(`/users/${params.id}`, {
        name,
        email,
        role,
        ...(password ? { password } : {})
      });
      showToast("Đã lưu thay đổi người dùng.");
      router.push("/dashboard/users");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể lưu người dùng.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loading) {
    return <div className="emptyState">Đang tải...</div>;
  }

  return (
    <>
      <header className="topbar">
        <div>
          <Link className="approveButton" href="/dashboard/users" style={{ marginBottom: 10 }}>
            <ArrowLeft size={16} />
            Danh sách người dùng
          </Link>
          <p className="eyebrow">Quản trị</p>
          <h1>Sửa người dùng</h1>
        </div>
      </header>

      <section className="panel" style={{ maxWidth: 560 }}>
        <form onSubmit={handleSubmit}>
          {error ? <div className="formError" style={{ marginBottom: 14 }}>{error}</div> : null}
          <label className="field">
            <span>Họ tên</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Mật khẩu mới (để trống nếu không đổi)</span>
            <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="field" style={{ marginTop: 14 }}>
            <span>Vai trò</span>
            <select value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
              <option value="admin">Quản trị viên</option>
              <option value="teacher">Giảng viên</option>
              <option value="student">Thí sinh</option>
            </select>
          </label>
          <button className="primaryButton" type="submit" style={{ marginTop: 18 }} disabled={isSubmitting}>
            <Save size={16} />
            {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </form>
      </section>
    </>
  );
}
