import type { UserRole } from "./types";

/**
 * Every role works under its own URL: students at the site root, teachers at /teacher, admins at /admin ...
 * All roles share the same pages, which physically live under /dashboard (see rewrites in next.config.mjs).
 * Code keeps writing "/dashboard/..." and these helpers turn it into the URL of the current role.
 * Keep AREA_PREFIX in sync with next.config.mjs.
 */
export const AREA_PREFIX: Record<UserRole, string> = {
  student: "",
  teacher: "/teacher",
  admin: "/admin",
  department_head: "/dean",
  training_office: "/training"
};

const STUDENT_SEGMENTS = ["student-exams", "results", "settings"];
const LEGACY = "/dashboard";

/** First screen of a role after signing in. */
export function homePath(role: UserRole): string {
  return AREA_PREFIX[role] || "/";
}

/** "/dashboard/users?x=1#y" -> "/admin/users?x=1#y" for an admin ("/dashboard" alone -> the role home). Other paths are untouched. */
export function toRolePath(role: UserRole, path: string): string {
  const match = /^\/dashboard(?=$|[/?#])/.exec(path);
  if (!match) return path;

  const rest = path.slice(match[0].length); // "", "/users", "?x", "#y", "/users?x=1"
  const prefix = AREA_PREFIX[role];
  if (rest === "" || rest.startsWith("?") || rest.startsWith("#")) {
    return `${prefix || "/"}${rest}`;
  }

  return `${prefix}${rest}`;
}

/** Which area a browser URL belongs to: a role, or "legacy" for the old /dashboard URLs. */
export function areaOfUrl(pathname: string): UserRole | "legacy" {
  if (pathname === LEGACY || pathname.startsWith(`${LEGACY}/`)) return "legacy";

  for (const [role, prefix] of Object.entries(AREA_PREFIX) as [UserRole, string][]) {
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) return role;
  }

  // Everything else (/, /student-exams, /results, /settings) is the student area.
  return "student";
}

/**
 * Any of the URL forms (role URL or rewritten /dashboard URL) -> the canonical "/dashboard/..." form, so menu
 * highlighting works no matter which one the router reports.
 */
export function canonicalPath(pathname: string): string {
  if (pathname === LEGACY || pathname.startsWith(`${LEGACY}/`)) return pathname;

  for (const prefix of Object.values(AREA_PREFIX)) {
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
      return `${LEGACY}${pathname.slice(prefix.length)}`;
    }
  }

  if (pathname === "/") return LEGACY;
  const first = pathname.split("/")[1];
  return STUDENT_SEGMENTS.includes(first) ? `${LEGACY}${pathname}` : pathname;
}
