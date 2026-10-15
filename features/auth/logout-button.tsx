"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiLogoutBoxRLine } from "react-icons/ri";

import { authClient } from "@/lib/auth-client";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  async function logout() {
    setPending(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={logout}
      disabled={pending}
      aria-busy={pending}
      aria-label={compact ? "ออกจากระบบ" : undefined}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-50"
    >
      <RiLogoutBoxRLine />
      {compact ? null : pending ? "กำลังออก…" : "ออกจากระบบ"}
    </button>
  );
}
