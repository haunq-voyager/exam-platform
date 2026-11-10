"use client";

import { useRouter as useNextRouter } from "next/navigation";
import { useMemo } from "react";
import { useAuth } from "./auth-context";
import { toRolePath } from "./role-routes";

/** next/navigation's router whose push/replace/prefetch turn "/dashboard/..." into the signed-in role's own URL. */
export function useRouter() {
  const router = useNextRouter();
  const { user } = useAuth();
  const role = user?.role;

  return useMemo(() => {
    const resolve = (path: string) => (role ? toRolePath(role, path) : path);

    return {
      ...router,
      push: (path: string, options?: Parameters<typeof router.push>[1]) => router.push(resolve(path), options),
      replace: (path: string, options?: Parameters<typeof router.replace>[1]) => router.replace(resolve(path), options),
      prefetch: (path: string) => router.prefetch(resolve(path))
    };
  }, [router, role]);
}
