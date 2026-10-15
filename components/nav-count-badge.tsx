"use client";

import { useEffect, useState } from "react";

export function NavCountBadge({
  endpoint,
  mode = "notifications",
}: {
  endpoint: string;
  mode?: "chat" | "conversations" | "notifications";
}) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(endpoint, { cache: "no-store" });
        const payload = (await response.json()) as { data?: unknown };
        if (!response.ok || !active) return;
        if (mode === "chat")
          setCount(
            Number(
              (payload.data as { unreadCount?: number })?.unreadCount ?? 0,
            ),
          );
        else if (mode === "conversations")
          setCount(
            ((payload.data as { unreadCount?: number }[]) ?? []).reduce(
              (sum, item) => sum + Number(item.unreadCount ?? 0),
              0,
            ),
          );
        else {
          const items = (payload.data as { items?: unknown } | undefined)?.items;
          setCount(
            Array.isArray(items)
              ? items.filter((item: { readAt?: string | null }) => !item.readAt)
                  .length
              : 0,
          );
        }
      } catch {
        /* Navigation remains usable when badge refresh fails. */
      }
    }
    const initial = window.setTimeout(() => void load(), 0);
    const interval = window.setInterval(() => void load(), 10_000);
    return () => {
      active = false;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [endpoint, mode]);
  if (!count) return null;
  return (
    <span
      aria-label={`${count} รายการที่ยังไม่ได้อ่าน`}
      className="ml-auto grid min-w-5 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-white px-1.5 text-[10px] font-medium leading-5 tabular-nums text-[var(--ink)]"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
