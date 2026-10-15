import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin-shell";
import { getAppSession, hasAdminRole } from "@/server/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getAppSession(await headers());
  if (!session) redirect("/login?callbackUrl=/admin");
  if (!hasAdminRole(session)) redirect("/profile");
  return <AdminShell name={session.user.name}>{children}</AdminShell>;
}
