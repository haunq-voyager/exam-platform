"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { api, ApiError } from "../../../../lib/api-client";
import { useToast } from "../../../../lib/toast";
import type { UserRole } from "../../../../lib/types";

export default function NewUserPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("teacher");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await api.post("/users", { name, email, password, role });
      showToast("Đã lưu tài khoản mới.");
      router.push("/dashboard/users");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể tạo người dùng.");
    } finally {
      setIsSubmitting(false);
    }
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
          <h1>Thêm người dùng mới</h1>
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
            <span>Mật khẩu</span>
            <input type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} required />
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
            {isSubmitting ? "Đang lưu..." : "Tạo tài khoản"}
          </button>
        </form>
      </section>
    </>
  );
}
