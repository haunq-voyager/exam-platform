"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { ApiError } from "../../lib/api-client";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("teacher1@example.com");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Không thể đăng nhập, vui lòng thử lại.");
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
          <p>Hệ thống thi trực tuyến</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error ? <div className="formError">{error}</div> : null}
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            <span>Mật khẩu</span>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
          <button className="primaryButton" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="authFooter">
          Chưa có tài khoản thí sinh? <Link href="/register">Đăng ký ngay</Link>
        </p>
        <p className="authFooter" style={{ fontSize: 12 }}>
          Demo: admin@example.com · teacher1@example.com · student1@example.com (mật khẩu: password)
        </p>
      </div>
    </main>
  );
}
