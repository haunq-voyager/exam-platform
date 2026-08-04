"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/auth-context";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [isLoading, user, router]);

  return (
    <main className="authShell">
      <p style={{ color: "var(--muted)" }}>Đang tải...</p>
    </main>
  );
}
