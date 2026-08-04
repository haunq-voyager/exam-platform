"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { ApiError } from "../../lib/api-client";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register(name, email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể đăng ký, vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="authShell">
      <div className="authCard">
        <div className="authBrand">
          <div className="authLogo">
            <GraduationCap size={24} />
          </div>
          <h1>ExamHub</h1>
          <p>Đăng ký tài khoản thí sinh</p>
        </div>
        <h1>Tạo tài khoản mới</h1>
        <p style={{ color: "var(--muted)" }}>Tài khoản đăng ký mới sẽ có vai trò thí sinh.</p>

        <form onSubmit={handleSubmit}>
          {error ? <div className="formError">{error}</div> : null}
          <label className="field">
            <span>Họ tên</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="primaryButton" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="authFooter">
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </p>
      </div>
    </main>
  );
}
