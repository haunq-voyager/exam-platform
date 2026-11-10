"use client";

import NextLink from "next/link";
import type { ComponentProps } from "react";
import { useAuth } from "../lib/auth-context";
import { toRolePath } from "../lib/role-routes";

type Props = ComponentProps<typeof NextLink>;

/** next/link that turns "/dashboard/..." hrefs into the signed-in role's own URL (e.g. "/admin/..."). */
export default function RoleLink({ href, ...rest }: Props) {
  const { user } = useAuth();
  const resolved = typeof href === "string" && user ? toRolePath(user.role, href) : href;

  return <NextLink href={resolved} {...rest} />;
}
