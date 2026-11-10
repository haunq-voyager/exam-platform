/**
 * Every role has its own entry URL, but they all share one set of pages that physically live under /dashboard.
 * The URL prefixes below are served by those pages (rewrites keep the role URL in the browser).
 * Keep this list in sync with AREA_PREFIX in lib/role-routes.ts.
 */
const ROLE_PREFIXES = ["admin", "teacher", "dean", "training"];

/** Students own the site root: "/" is their overview and their pages sit directly under it. */
const STUDENT_PATHS = ["student-exams", "results", "settings"];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/dashboard" },
        ...ROLE_PREFIXES.map((prefix) => ({ source: `/${prefix}/:path*`, destination: "/dashboard/:path*" })),
        ...STUDENT_PATHS.map((segment) => ({ source: `/${segment}/:path*`, destination: `/dashboard/${segment}/:path*` }))
      ]
    };
  }
};

export default nextConfig;
