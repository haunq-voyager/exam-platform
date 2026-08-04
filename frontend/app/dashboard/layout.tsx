"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpenCheck,
  ChevronDown,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Settings,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users
} from "lucide-react";
import { useAuth } from "../../lib/auth-context";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  admin: [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/dashboard/users", label: "Người dùng", icon: Users },
    { href: "/dashboard/subjects", label: "Môn học & chủ đề", icon: BookOpenCheck },
    { href: "/dashboard/questions", label: "Ngân hàng câu hỏi", icon: FileQuestion },
    { href: "/dashboard/exams", label: "Đề thi & kỳ thi", icon: ClipboardList }
  ],
  teacher: [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/dashboard/subjects", label: "Môn học & chủ đề", icon: BookOpenCheck },
    { href: "/dashboard/questions", label: "Ngân hàng câu hỏi", icon: FileQuestion },
    { href: "/dashboard/ai-generate", label: "AI tạo câu hỏi", icon: Sparkles },
    { href: "/dashboard/exams", label: "Đề thi & kỳ thi", icon: ClipboardList }
  ],
  student: [
    { href: "/dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { href: "/dashboard/student-exams", label: "Đề thi của tôi", icon: GraduationCap },
    { href: "/dashboard/results", label: "Kết quả", icon: ClipboardList },
    { href: "/dashboard/settings", label: "Cài đặt", icon: Settings }
  ]
};

const ROLE_LABEL: Record<string, string> = {
  admin: "Quản trị viên",
  teacher: "Giảng viên",
  student: "Thí sinh"
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  const navItems = useMemo(() => (user ? NAV_BY_ROLE[user.role] ?? [] : []), [user]);

  if (isLoading || !user) {
    return (
      <main className="authShell">
        <p style={{ color: "var(--muted)" }}>Đang tải...</p>
      </main>
    );
  }

  if (user.role === "student") {
    return (
      <main className="saasShell">
        <aside className="saasSidebar">
          <Link href="/dashboard" className="saasBrand">
            <span className="saasBrandMark">
              <GraduationCap size={22} />
            </span>
            <span>
              <strong>ExamHub</strong>
              <small>Student workspace</small>
            </span>
          </Link>

          <nav className="saasNav" aria-label="Điều hướng thí sinh">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} className={isActive ? "saasNavItem active" : "saasNavItem"}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <button className="saasNavItem logout" onClick={() => logout()}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>

          <div className="saasSidebarProfile">
            <span className="avatarBubble">{initials(user.name)}</span>
            <div>
              <strong>{user.name}</strong>
              <small>{ROLE_LABEL[user.role]}</small>
            </div>
          </div>
        </aside>

        <section className="saasMain">
          <header className="saasTopbar">
            <div>
              <p>Xin chào, {user.name}</p>
              <h1>Dashboard</h1>
            </div>
            <div className="userMenuWrap">
              <button className="userMenuButton" onClick={() => setMenuOpen((value) => !value)}>
                <span className="avatarBubble">{initials(user.name)}</span>
                <span>{user.name}</span>
                <ChevronDown size={16} />
              </button>
              {menuOpen ? (
                <div className="userDropdown">
                  <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)}>
                    <UserRound size={16} />
                    Đổi thông tin
                  </Link>
                  <Link href="/dashboard/settings#password" onClick={() => setMenuOpen(false)}>
                    <ShieldCheck size={16} />
                    Đổi mật khẩu
                  </Link>
                  <button onClick={() => logout()}>
                    <LogOut size={16} />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </header>
          <div className="saasContent">{children}</div>
        </section>
      </main>
    );
  }

  return (
    <main className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brandMark">
            <GraduationCap size={24} />
          </div>
          <div>
            <strong>ExamHub</strong>
            <span>Admin console</span>
          </div>
        </div>

        <nav className="navGroup" aria-label="Điều hướng">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href} className={isActive ? "navItem active" : "navItem"}>
                <span className="navIcon">
                  <Icon size={18} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button className="navItem" onClick={() => logout()} style={{ marginTop: 8 }}>
          <LogOut size={18} />
          <span>Đăng xuất</span>
        </button>

        <div className="privacyBox">
          <ShieldCheck size={18} />
          <div>
            <span>Phiên làm việc</span>
            <p>
              {user.name} · {ROLE_LABEL[user.role]}
            </p>
          </div>
        </div>
      </aside>

      <section className="workspace">{children}</section>
    </main>
  );
}
