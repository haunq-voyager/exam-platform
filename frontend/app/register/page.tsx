"use client";


import { tr } from "../../lib/i18n";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { homePath } from "../../lib/role-routes";
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
      const me = await register(name, email, password);
      router.push(homePath(me.role));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tr("Không thể đăng ký, vui lòng thử lại."));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="authShell">
      <div className="authLang">
        <LanguageSwitcher />
      </div>
      <div className="authCard">
        <div className="authBrand">
          <div className="authLogo">
            <GraduationCap size={24} />
          </div>
          <h1>{tr("ExamHub")}</h1>
          <p>{tr("Đăng ký tài khoản thí sinh")}</p>
        </div>
        <h1>{tr("Tạo tài khoản mới")}</h1>
        <p style={{ color: "var(--muted)" }}>{tr("Tài khoản đăng ký mới sẽ có vai trò thí sinh.")}</p>

        <form onSubmit={handleSubmit}>
          {error ? <div className="formError">{error}</div> : null}
          <label className="field">
            <span>{tr("Họ tên")}</span>
            <input value={name} onChange={(event) => setName(event.target.value)} required />
          </label>
          <label className="field">
            <span>{tr("Email")}</span>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="field">
            <span>{tr("Mật khẩu")}</span>
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button className="primaryButton" type="submit" disabled={isSubmitting}>
            {isSubmitting ? tr("Đang tạo tài khoản...") : tr("Đăng ký")}
          </button>
        </form>

        <p className="authFooter">
          {tr("Đã có tài khoản?")} <Link href="/login">{tr("Đăng nhập")}</Link>
        </p>
      </div>
    </main>
  );
}
