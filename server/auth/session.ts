import "server-only";

import { auth } from "@/lib/auth";

type BetterAuthSession = typeof auth.$Infer.Session;
export type AppSession = BetterAuthSession & {
  user: BetterAuthSession["user"] & { role?: string | null };
};

export async function getAppSession(
  headers: Headers,
): Promise<AppSession | null> {
  return auth.api.getSession({ headers }) as Promise<AppSession | null>;
}

export function hasAdminRole(session: AppSession | null) {
  return session?.user.role === "admin";
}
