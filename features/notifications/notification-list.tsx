"use client";

import { useCallback, useEffect, useState } from "react";
import {
  RiBankCardLine,
  RiCalendarCheckLine,
  RiChat3Line,
  RiCheckDoubleLine,
  RiNotification3Line,
} from "react-icons/ri";
import { Pagination } from "@/components/ui/pagination";

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};
const icons = {
  BOOKING: RiCalendarCheckLine,
  PAYMENT: RiBankCardLine,
  CHAT: RiChat3Line,
  SYSTEM: RiNotification3Line,
} as const;

export function NotificationList({
  initialItems,
  page = 1,
  pageSize = 10,
  total = initialItems.length,
  pageHrefPrefix,
}: {
  initialItems: Notification[];
  page?: number;
  pageSize?: number;
  total?: number;
  pageHrefPrefix?: string;
}) {
  const [items, setItems] = useState(initialItems);
  const load = useCallback(async () => {
    const response = await fetch("/api/v1/notifications", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      data?: { items?: Notification[] };
    };
    if (response.ok && payload.data?.items) setItems(payload.data.items);
  }, []);
  useEffect(() => {
    const interval = window.setInterval(() => void load(), 10_000);
    return () => window.clearInterval(interval);
  }, [load]);

  async function markRead(id?: string) {
    const response = await fetch("/api/v1/notifications", {
      body: JSON.stringify(id ? { id } : {}),
      headers: { "content-type": "application/json" },
      method: "PATCH",
    });
    if (response.ok)
      setItems((current) =>
        current.map((item) =>
          !id || item.id === id
            ? { ...item, readAt: item.readAt ?? new Date().toISOString() }
            : item,
        ),
      );
  }

  if (!items.length)
    return (
      <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-12 text-center">
        <RiNotification3Line className="mx-auto text-4xl" />
        <h2 className="mt-5 text-xl font-medium">ยังไม่มีการแจ้งเตือน</h2>
        <p className="mt-2 text-zinc-500">
          สถานะการจอง การชำระเงิน และข้อความใหม่จะแสดงที่นี่
        </p>
      </div>
    );

  return (
    <section className="mt-10">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void markRead()}
          className="inline-flex items-center gap-2 rounded-full border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-black hover:text-white"
        >
          <RiCheckDoubleLine /> อ่านทั้งหมด
        </button>
      </div>
      <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {items.map((item) => {
          const Icon =
            icons[item.type as keyof typeof icons] ?? RiNotification3Line;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => void markRead(item.id)}
              className={`grid w-full grid-cols-[auto_1fr_auto] gap-4 border-b border-zinc-100 p-5 text-left last:border-0 sm:p-6 ${item.readAt ? "opacity-60" : "bg-[#fbfbf8]"}`}
            >
              <span
                className={`grid size-11 place-items-center rounded-full ${item.readAt ? "bg-zinc-100" : "bg-black text-white"}`}
              >
                <Icon className="text-lg" />
              </span>
              <span>
                <span className="block font-medium">{item.title}</span>
                <span className="mt-1 block text-sm leading-6 text-zinc-500">
                  {item.body}
                </span>
                <span className="mt-2 block text-xs text-zinc-400">
                  {new Intl.DateTimeFormat("th-TH", {
                    dateStyle: "medium",
                    timeStyle: "short",
                    timeZone: "Asia/Bangkok",
                  }).format(new Date(item.createdAt))}
                </span>
              </span>
              {!item.readAt ? (
                <span
                  className="mt-2 size-2 rounded-full bg-black"
                  aria-label="ยังไม่ได้อ่าน"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        pageHrefPrefix={pageHrefPrefix}
      />
    </section>
  );
}
