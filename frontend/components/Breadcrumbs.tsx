"use client";


import { tr } from "../lib/i18n";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Home } from "lucide-react";
import Link from "@/components/RoleLink";
import { canonicalPath } from "../lib/role-routes";

/** Readable names of the URL segments. Segments without a list page of their own are not linked. */
const SEGMENT_LABELS: Record<string, string> = {
  get users() { return tr("Người dùng"); },
  get subjects() { return tr("Môn học"); },
  get topics() { return tr("Chủ đề"); },
  get questions() { return tr("Ngân hàng câu hỏi"); },
  get exams() { return tr("Đề thi"); },
  get "exam-sessions"() { return tr("Kỳ thi"); },
  get approvals() { return tr("Phê duyệt"); },
  proctoring: "Coi thi",
  get regrades() { return tr("Phúc khảo"); },
  get feedback() { return tr("Phản hồi bài thi"); },
  departments: "Khoa",
  get roles() { return tr("Phân quyền & cấp duyệt"); },
  get "mail-templates"() { return tr("Mẫu email"); },
  get "student-exams"() { return tr("Đề thi của tôi"); },
  get results() { return tr("Kết quả"); },
  get settings() { return tr("Cài đặt"); },
  get attempts() { return tr("Bài làm"); },
  get new() { return tr("Tạo mới"); },
  get edit() { return tr("Chỉnh sửa"); },
  get preview() { return tr("Xem trước đề"); }
};

/** `/dashboard/attempts` has no index page, so "Bài làm" is shown as plain text. */
const UNLINKED = new Set(["attempts"]);

interface BreadcrumbContextValue {
  /** Name of the record on the current page (e.g. the exam session title), replacing "#12". */
  label: string | null;
  setLabel: (label: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({ label: null, setLabel: () => {} });

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const value = useMemo(() => ({ label, setLabel }), [label]);
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

/** Pages with a record id in their URL call this with the record's name so the trail reads naturally. */
export function useBreadcrumbLabel(label: string | null | undefined) {
  const { setLabel } = useContext(BreadcrumbContext);
  useEffect(() => {
    setLabel(label ?? null);
    return () => setLabel(null);
  }, [label, setLabel]);
}

export interface Crumb {
  label: string;
  href?: string;
}

export function buildCrumbs(pathname: string, recordLabel: string | null): Crumb[] {
  const canonical = canonicalPath(pathname).split(/[?#]/)[0];
  const segments = canonical.split("/").filter(Boolean).slice(1); // drop "dashboard"
  const crumbs: Crumb[] = [{ label: tr("Tổng quan"), href: "/dashboard" }];

  let href = "/dashboard";
  segments.forEach((segment, index) => {
    href += `/${segment}`;
    const isLast = index === segments.length - 1;
    const isId = /^\d+$/.test(segment);
    const next = segments[index + 1];
    const label = isId ? (isLast || next === "edit" || next === "preview" ? (recordLabel ?? `#${segment}`) : `#${segment}`) : (SEGMENT_LABELS[segment] ?? segment);
    crumbs.push({ label, href: isLast || UNLINKED.has(segment) ? undefined : href });
  });

  return crumbs;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const { label } = useContext(BreadcrumbContext);
  const crumbs = useMemo(() => buildCrumbs(pathname, label), [pathname, label]);

  // The tab title follows the current place, newest segment first.
  useEffect(() => {
    document.title = `${[...crumbs].reverse().slice(0, 2).map((crumb) => crumb.label).join(" · ")} | ExamHub`;
  }, [crumbs]);

  return (
    <nav className="breadcrumbs" aria-label={tr("Đường dẫn")}>
      <ol>
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`}>
              {crumb.href && !last ? (
                <Link href={crumb.href}>
                  {index === 0 ? <Home size={13} aria-hidden="true" style={{ marginInlineEnd: 4, verticalAlign: "-2px" }} /> : null}
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} title={crumb.label}>
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
