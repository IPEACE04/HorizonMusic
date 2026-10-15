import Link from "next/link";
import type { ReactNode } from "react";
import {
  RiBankCardLine,
  RiCalendarLine,
  RiChat3Line,
  RiDashboardLine,
  RiFileList3Line,
  RiHistoryLine,
  RiMusic2Line,
  RiNotification3Line,
  RiPriceTag3Line,
  RiSettings3Line,
  RiUser3Line,
} from "react-icons/ri";

import { LogoutButton } from "@/features/auth/logout-button";
import { NavCountBadge } from "@/components/nav-count-badge";
import { BrandMark } from "@/components/brand-mark";
import { NavigationLink } from "@/components/ui/navigation-link";

const items = [
  ["/admin", "ภาพรวม", RiDashboardLine],
  ["/admin/calendar", "ปฏิทิน", RiCalendarLine],
  ["/admin/bookings", "การจอง", RiFileList3Line],
  ["/admin/payments", "ชำระเงิน", RiBankCardLine],
  ["/admin/rooms", "ห้องและอุปกรณ์", RiMusic2Line],
  ["/admin/discounts", "ส่วนลด", RiPriceTag3Line],
  ["/admin/users", "ผู้ใช้งาน", RiUser3Line],
  ["/admin/chat", "แชต", RiChat3Line],
  ["/admin/notifications", "แจ้งเตือน", RiNotification3Line],
  ["/admin/activity-logs", "Activity log", RiHistoryLine],
  ["/admin/settings", "ตั้งค่า", RiSettings3Line],
] as const;

export function AdminShell({
  children,
  name,
}: {
  children: ReactNode;
  name: string;
}) {
  return (
    <main className="studio-workspace min-h-svh w-full bg-[var(--ink)]">
      <a href="#admin-content" className="studio-skip-link">
        ข้ามไปเนื้อหา
      </a>
      <div className="grid min-h-svh w-full bg-[var(--panel)] lg:grid-cols-[256px_minmax(0,1fr)]">
        <aside className="hidden bg-[var(--ink)] px-4 pb-4 text-white lg:sticky lg:top-0 lg:flex lg:h-svh lg:flex-col">
          <div className="flex shrink-0 justify-center py-1">
            <BrandMark inverted />
          </div>
          <p className="shrink-0 px-3 text-[10px] font-medium tracking-[.18em] text-white/60">
            OPERATIONS
          </p>
          <nav aria-label="เมนูผู้ดูแล" className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pb-3">
            {items.map(([href, label, Icon]) => (
              <NavigationLink
                key={href}
                exact={href === "/admin"}
                href={href}
                className="studio-nav-link--dark group"
              >
                <Icon aria-hidden className="text-lg" />
                {label}
                {href === "/admin/chat" ? (
                  <NavCountBadge
                    endpoint="/api/v1/admin/conversations"
                    mode="conversations"
                  />
                ) : href === "/admin/notifications" ? (
                  <NavCountBadge endpoint="/api/v1/notifications" />
                ) : null}
              </NavigationLink>
            ))}
          </nav>
          <div className="mt-3 shrink-0 rounded-xl border border-white/15 p-3">
            <p className="break-words px-4 text-sm font-medium">{name}</p>
            <div className="mt-3 rounded-lg bg-white text-[var(--ink)]">
              <LogoutButton />
            </div>
          </div>
        </aside>
        <section className="min-w-0 rounded-lg border border-white bg-[var(--panel)]">
          <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[var(--ink)] px-5 py-4 text-[var(--brand)] sm:px-8">
            <span className="text-xs font-medium tracking-[.14em] text-[var(--brand)]">
              HORIZON / ADMIN CONSOLE
            </span>
            <div className="flex items-center gap-2">
              <div className="lg:hidden">
                <LogoutButton compact />
              </div>
              <Link
                href="/"
                className="studio-button studio-button--secondary"
              >
                ดูเว็บไซต์
              </Link>
            </div>
          </header>
          <nav
            aria-label="เมนูผู้ดูแลบนมือถือ"
            className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-white/60 px-4 py-3 lg:hidden"
          >
            {items.map(([href, label, Icon]) => (
              <NavigationLink
                key={href}
                exact={href === "/admin"}
                href={href}
                className="shrink-0"
              >
                <Icon aria-hidden />
                {label}
              </NavigationLink>
            ))}
          </nav>
          <div
            id="admin-content"
            tabIndex={-1}
            className="studio-content"
          >
            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
