"use client";


import { tr } from "../lib/i18n";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";
import { homePath } from "../lib/role-routes";

// "/" is rewritten to the student dashboard (next.config.mjs); this page is only a fallback.
export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? homePath(user.role) : "/login");
  }, [isLoading, user, router]);

  return (
    <main className="authShell">
      <p style={{ color: "var(--muted)" }}>{tr("Đang tải...")}</p>
    </main>
  );
}
