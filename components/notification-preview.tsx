"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { RiNotification3Line } from "react-icons/ri";

type Notification = {
  id: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export function NotificationPreview() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const request = useRef<AbortController | null>(null);
  const panelId = useId();

  function close() {
    request.current?.abort();
    setOpen(false);
  }

  async function load() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setStatus("loading");
    try {
      const response = await fetch("/api/v1/notifications?page=1&pageSize=5", {
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await response.json() as { data?: { items?: Notification[] } };
      if (!response.ok || !Array.isArray(payload.data?.items)) throw new Error("Unable to load notifications");
      if (controller.signal.aborted) return;
      setItems(payload.data.items.slice(0, 5));
      setStatus("ready");
    } catch {
      if (!controller.signal.aborted) setStatus("error");
    }
  }

  useEffect(() => () => request.current?.abort(), []);

  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (!container.current?.contains(event.target as Node)) close();
    }
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
        trigger.current?.focus();
      }
    }
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div
      ref={container}
      className="sm:relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-label="การแจ้งเตือน"
        aria-expanded={open}
        aria-controls={panelId}
        className="studio-icon-button"
        onClick={() => {
          if (open) close();
          else {
            setOpen(true);
            void load();
          }
        }}
      >
        <RiNotification3Line aria-hidden />
      </button>
      {open ? (
        <section
          id={panelId}
          aria-label="การแจ้งเตือนล่าสุด"
          className="absolute right-4 top-[calc(100%+0.75rem)] w-[min(24rem,calc(100vw-2rem))] border border-[var(--line)] bg-white text-[var(--ink)] shadow-xl sm:right-0"
        >
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="text-base font-medium">การแจ้งเตือน</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">5 รายการล่าสุด</p>
          </div>
          <div className="max-h-[min(24rem,55svh)] min-h-32 overflow-y-auto" aria-busy={status === "loading"}>
            {status === "loading" ? (
              <p role="status" className="px-5 py-10 text-center text-sm text-[var(--muted)]">กำลังโหลดการแจ้งเตือน…</p>
            ) : status === "error" ? (
              <div className="px-5 py-6 text-center">
                <p role="alert" className="text-sm">โหลดการแจ้งเตือนไม่สำเร็จ</p>
                <button type="button" onClick={() => void load()} className="studio-button studio-button--secondary mt-3">ลองอีกครั้ง</button>
              </div>
            ) : items.length ? (
              <ul>
                {items.map((item) => (
                  <li key={item.id} className={`border-b border-[var(--line)] px-5 py-4 last:border-0 ${item.readAt ? "bg-white" : "bg-[var(--brand-soft)]"}`}>
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-sm font-medium">{item.title}</p>
                        <p className="mt-1 break-words text-sm leading-6 text-zinc-600">{item.body}</p>
                        <time dateTime={item.createdAt} className="mt-2 block text-xs text-[var(--muted)]">{dateFormatter.format(new Date(item.createdAt))}</time>
                      </div>
                      {!item.readAt ? <span aria-label="ยังไม่ได้อ่าน" className="mt-2 size-2 shrink-0 rounded-full bg-[var(--focus)]" /> : null}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status" className="px-5 py-10 text-center text-sm text-[var(--muted)]">ยังไม่มีการแจ้งเตือน</p>
            )}
          </div>
          <Link href="/notifications" onClick={close} className="block border-t border-[var(--line)] bg-[var(--brand)] px-5 py-3 text-center text-sm font-medium text-black hover:bg-[var(--brand-hover)]">
            See more
          </Link>
        </section>
      ) : null}
    </div>
  );
}
