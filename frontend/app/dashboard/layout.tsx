"use client";


import { tr } from "../../lib/i18n";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "@/components/RoleLink";
import { usePathname, useRouter } from "next/navigation";
import {
  BadgeCheck,
  BookOpenCheck,
  Building2,
  CalendarClock,
  ChevronDown,
  ClipboardList,
  FileQuestion,
  GraduationCap,
  Gavel,
  KeyRound,
  Layers,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageSquareText,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  ScanEye,
  Settings,
  ShieldCheck,
  UserRound,
  Users
} from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { BreadcrumbProvider, Breadcrumbs } from "../../components/Breadcrumbs";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { NotificationBell } from "../../components/NotificationBell";
import { api } from "../../lib/api-client";
import { useAuth } from "../../lib/auth-context";
import { can, canAny, ROLE_LABEL } from "../../lib/permissions";
import { areaOfUrl, canonicalPath, homePath, toRolePath } from "../../lib/role-routes";
import type { User, Workload } from "../../lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: number;
}

/** Menu entries come from the user's permissions, so a role only sees what it may use. */
function buildNav(user: User, pendingCount: number, workload: Workload | null): NavItem[] {
  if (user.role === "student") {
    return [
      { href: "/dashboard", label: tr("Tổng quan"), icon: LayoutDashboard },
      { href: "/dashboard/student-exams", label: tr("Đề thi của tôi"), icon: GraduationCap },
      { href: "/dashboard/results", label: tr("Kết quả"), icon: ClipboardList },
      { href: "/dashboard/settings", label: tr("Cài đặt"), icon: Settings }
    ];
  }

  const items: (NavItem | false)[] = [
    { href: "/dashboard", label: tr("Tổng quan"), icon: LayoutDashboard },
    (user.is_approver || can(user, "sessions.create")) && { href: "/dashboard/approvals", label: tr("Phê duyệt"), icon: BadgeCheck, badge: pendingCount },
    can(user, "sessions.proctor") && { href: "/dashboard/proctoring", label: "Coi thi", icon: ScanEye, badge: workload?.in_progress_attempts },
    can(user, "regrades.review") && { href: "/dashboard/regrades", label: tr("Phúc khảo"), icon: Gavel, badge: workload?.pending_regrades },
    can(user, "feedback.respond") && { href: "/dashboard/feedback", label: tr("Phản hồi bài thi"), icon: MessageSquareText, badge: workload?.unanswered_feedback },
    canAny(user, "sessions.view", "sessions.create", "sessions.update") && { href: "/dashboard/exam-sessions", label: tr("Kỳ thi"), icon: CalendarClock },
    can(user, "exams.manage") && { href: "/dashboard/exams", label: tr("Đề thi"), icon: ClipboardList },
    can(user, "questions.manage") && { href: "/dashboard/questions", label: tr("Ngân hàng câu hỏi"), icon: FileQuestion },
    can(user, "catalog.manage") && { href: "/dashboard/subjects", label: tr("Môn học"), icon: BookOpenCheck },
    can(user, "catalog.manage") && { href: "/dashboard/topics", label: tr("Chủ đề"), icon: Layers },
    canAny(user, "users.view", "users.manage") && { href: "/dashboard/users", label: tr("Người dùng"), icon: Users },
    can(user, "departments.manage") && { href: "/dashboard/departments", label: "Khoa", icon: Building2 },
    can(user, "roles.manage") && { href: "/dashboard/roles", label: tr("Phân quyền & cấp duyệt"), icon: KeyRound },
    can(user, "roles.manage") && { href: "/dashboard/mail-templates", label: tr("Mẫu email"), icon: Mail }
  ];

  return items.filter((item): item is NavItem => item !== false);
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // SPA navigation: keep the tab title meaningful and move focus to the new view so keyboard and screen-reader users
  // start at its content (not at the top of the menu).
  const firstRender = useRef(true);
  useEffect(() => {
    if (!user) return;
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const heading = document.getElementById("page-title");
    (heading ?? document.getElementById("main"))?.focus({ preventScroll: true });
  }, [pathname, user]);

  // Each role lives under its own URL. The address bar is the source of truth here (usePathname reports the
  // internally rewritten path), so read window.location: old /dashboard links move to the role URL, and a URL that
  // belongs to another role sends the user back to their own home.
  useEffect(() => {
    if (!user) return;
    const url = window.location.pathname;
    const area = areaOfUrl(url);
    if (area === "legacy") {
      router.replace(toRolePath(user.role, url + window.location.search + window.location.hash));
    } else if (area !== user.role) {
      router.replace(homePath(user.role));
    }
  }, [user, pathname, router]);

  // Remember the collapsed state between visits (read after mount to keep server and client markup identical).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("sidebar-collapsed") === "1");
    } catch {
      // Storage unavailable: start expanded.
    }
  }, []);

  // The mobile drawer closes after navigating.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("sidebar-collapsed", next ? "1" : "0");
      } catch {
        // Not persisted; still works for this visit.
      }
      return next;
    });
  }

  // Number of sessions waiting for the user (as approver) or sent back to them; refreshed on every navigation.
  const [pendingCount, setPendingCount] = useState(0);
  useEffect(() => {
    if (!user || user.role === "student" || !(user.is_approver || can(user, "sessions.create"))) return;
    api
      .get<{ data: { awaiting: number; rejected_mine: number } }>("/approvals/counts")
      .then((response) => setPendingCount(response.data.awaiting + response.data.rejected_mine))
      .catch(() => setPendingCount(0));
  }, [user, pathname]);

  // Work waiting for teachers (live attempts, regrading requests, unanswered feedback).
  const [workload, setWorkload] = useState<Workload | null>(null);
  useEffect(() => {
    if (!user || !canAny(user, "sessions.proctor", "regrades.review", "feedback.respond")) return;
    api
      .get<{ data: Workload }>("/workload")
      .then((response) => setWorkload(response.data))
      .catch(() => setWorkload(null));
  }, [user, pathname]);

  const navItems = useMemo(() => (user ? buildNav(user, pendingCount, workload) : []), [user, pendingCount, workload]);

  if (isLoading || !user) {
    return (
      <main className="authShell">
        <p style={{ color: "var(--muted)" }}>{tr("Đang tải...")}</p>
      </main>
    );
  }

  const workspaceLabel =
    user.role === "student" ? "Student workspace" : user.role === "admin" ? "Admin console" : `${ROLE_LABEL[user.role] ?? "Staff"} workspace`;

  return (
    <BreadcrumbProvider>
    <div className={`saasShell${collapsed ? " collapsed" : ""}${mobileOpen ? " mobileOpen" : ""}`}>
      <a className="skipLink" href="#main">
        {tr("Bỏ qua, tới nội dung chính")}
      </a>
      {mobileOpen ? <div className="sidebarBackdrop" onClick={() => setMobileOpen(false)} /> : null}
      <aside className="saasSidebar" aria-label={tr("Thanh bên")}>
        <div className="saasSidebarHead">
          <Link href="/dashboard" className="saasBrand" title={tr("ExamHub")}>
            <span className="saasBrandMark">
              <GraduationCap size={22} />
            </span>
            <span>
              <strong>{tr("ExamHub")}</strong>
              <small>{workspaceLabel}</small>
            </span>
          </Link>
          <button
            className="sidebarToggle"
            onClick={toggleCollapsed}
            aria-label={collapsed ? tr("Mở rộng thanh bên") : tr("Thu gọn thanh bên")}
            title={collapsed ? tr("Mở rộng thanh bên") : tr("Thu gọn thanh bên")}
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
        </div>

        <nav className="saasNav" aria-label={tr("Điều hướng")}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const current = canonicalPath(pathname);
            const isActive = item.href === "/dashboard" ? current === item.href : current.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} title={item.label} className={isActive ? "saasNavItem active" : "saasNavItem"}>
                <Icon size={18} />
                <span>{item.label}</span>
                {item.badge ? <em className="navBadge">{item.badge}</em> : null}
              </Link>
            );
          })}
        </nav>

        <button className="saasNavItem logout" onClick={() => logout()} title={tr("Đăng xuất")}>
          <LogOut size={18} />
          <span>{tr("Đăng xuất")}</span>
        </button>

        <div className="saasSidebarProfile">
          <Avatar name={user.name} url={user.avatar_url} />
          <div>
            <strong>{user.name}</strong>
            <small>{ROLE_LABEL[user.role]}</small>
          </div>
        </div>
      </aside>

      <section className="saasMain">
        <header className="saasTopbar">
          <button className="menuToggle" onClick={() => setMobileOpen(true)} aria-label={tr("Mở menu")}>
            <Menu size={20} />
          </button>
          <div className="saasTopbarTitle">
            <Breadcrumbs />
          </div>
          <div className="topbarRight">
          <LanguageSwitcher />
          <NotificationBell />
          <div className="userMenuWrap">
            <button className="userMenuButton" onClick={() => setMenuOpen((value) => !value)}>
              <Avatar name={user.name} url={user.avatar_url} />
              <span>{user.name}</span>
              <ChevronDown size={16} />
            </button>
            {menuOpen ? (
              <div className="userDropdown">
                <Link href="/dashboard/settings" onClick={() => setMenuOpen(false)}>
                  <UserRound size={16} />
                  {tr("Đổi thông tin")}
                </Link>
                <Link href="/dashboard/settings#password" onClick={() => setMenuOpen(false)}>
                  <ShieldCheck size={16} />
                  {tr("Đổi mật khẩu")}
                </Link>
                <button onClick={() => logout()}>
                  <LogOut size={16} />
                  {tr("Đăng xuất")}
                </button>
              </div>
            ) : null}
          </div>
          </div>
        </header>
        <main id="main" tabIndex={-1} className="saasContent pageEnter" key={canonicalPath(pathname)}>
          {children}
        </main>
      </section>
    </div>
    </BreadcrumbProvider>
  );
}
