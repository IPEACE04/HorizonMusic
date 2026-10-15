"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import {
  RiArrowUpLine,
  RiChatSmile2Line,
  RiCloseLine,
  RiLoader4Line,
  RiRefreshLine,
} from "react-icons/ri";

type ChatMessage = {
  id: string;
  body: string;
  senderUserId: string;
  senderName: string;
  createdAt: string;
};

type ChatPayload = { messages: ChatMessage[] };
type ApiEnvelope<T> = { data?: T; error?: { message?: string } };

export function ChatPanel({
  currentUserId,
  endpoint,
  title = "Horizon Music",
  compact = false,
  active = true,
  onClose,
}: {
  currentUserId: string;
  endpoint: string;
  title?: string;
  compact?: boolean;
  active?: boolean;
  onClose?: () => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const viewportRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
    return () => { activeRef.current = false; };
  }, [active]);
  const requestRef = useRef<AbortController | null>(null);

  const loadMessages = useCallback(
    async (quiet = false, force = false) => {
      if (!activeRef.current) return;
      if (quiet && !force && requestRef.current) return;
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;
      if (!quiet) setLoading(true);
      try {
        const response = await fetch(endpoint, { cache: "no-store", signal: controller.signal });
        const payload = (await response.json()) as ApiEnvelope<ChatPayload>;
        if (!response.ok || !payload.data)
          throw new Error(payload.error?.message ?? "โหลดข้อความไม่สำเร็จ");
        if (controller.signal.aborted || !activeRef.current) return;
        setMessages(payload.data.messages);
        setError("");
        if (payload.data.messages.length) {
          await fetch(endpoint, { method: "PUT", signal: controller.signal }).catch(() => undefined);
        }
      } catch (cause) {
        if (!quiet && !controller.signal.aborted && activeRef.current)
          setError(
            cause instanceof Error ? cause.message : "โหลดข้อความไม่สำเร็จ",
          );
      } finally {
        if (!controller.signal.aborted && activeRef.current) setLoading(false);
        if (requestRef.current === controller) requestRef.current = null;
      }
    },
    [endpoint],
  );

  useEffect(() => {
    if (!active) return;
    const initialLoad = window.setTimeout(() => void loadMessages(), 0);
    const interval = window.setInterval(() => void loadMessages(true), 5_000);
    return () => {
      window.clearTimeout(initialLoad);
      window.clearInterval(interval);
      requestRef.current?.abort();
    };
  }, [loadMessages, active]);

  useEffect(() => {
    if (!viewportRef.current) return;
    viewportRef.current.scrollTo({
      behavior: "auto",
      top: viewportRef.current.scrollHeight,
    });
  }, [messages]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        body: JSON.stringify({ body }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (!response.ok)
        throw new Error(payload.error?.message ?? "ส่งข้อความไม่สำเร็จ");
      setDraft("");
      await loadMessages(true, true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "ส่งข้อความไม่สำเร็จ");
    } finally {
      setSending(false);
    }
  }

  return (
    <section className={`flex flex-col overflow-hidden bg-white ${compact ? "h-full min-h-0" : "min-h-[620px] rounded-lg border border-zinc-200 shadow-[0_28px_80px_-55px_rgba(0,0,0,.45)]"}`}>
      <header className={`flex shrink-0 items-center justify-between gap-2 border-b px-4 ${compact ? "min-h-16 border-zinc-100 text-black" : "min-h-20 border-zinc-100 sm:px-7"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <span className={`${compact ? "hidden" : "grid"} size-10 place-items-center rounded-full bg-black text-lg text-white`}>
            <RiChatSmile2Line />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-medium">{title}</h2>
            <p className="text-xs text-zinc-500">
              สอบถามเรื่องห้อง การจอง และบริการเสริม
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
          type="button"
          onClick={() => void loadMessages()}
          aria-label="โหลดข้อความใหม่"
          className={`grid size-10 place-items-center rounded-full transition ${compact ? "text-zinc-500 hover:bg-zinc-100" : "border border-zinc-200 hover:bg-zinc-100"}`}
        >
          <RiRefreshLine />
        </button>
        {onClose ? <button type="button" onClick={onClose} aria-label="ย่อหน้าต่างแชท" className="grid size-10 place-items-center rounded-full text-zinc-500 hover:bg-zinc-100"><RiCloseLine aria-hidden /></button> : null}
        </div>
      </header>

      <div
        ref={viewportRef}
        aria-live="polite"
        className={`min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 ${compact ? "bg-white" : "bg-[var(--panel)] sm:px-7"}`}
      >
        {loading ? (
          <div className={`grid place-items-center text-zinc-400 ${compact ? "min-h-40" : "min-h-72"}`} role="status" aria-label="กำลังโหลดข้อความ">
            <RiLoader4Line className="animate-spin text-2xl" />
          </div>
        ) : null}
        {!loading && !messages.length ? (
          <div className={`grid place-items-center text-center ${compact ? "min-h-40" : "min-h-72"}`}>
            <div>
              <RiChatSmile2Line className="mx-auto text-4xl" />
              <h3 className="mt-4 text-lg font-medium">เริ่มบทสนทนาได้เลย</h3>
              <p className="mt-2 text-sm text-zinc-500">
                สอบถามเรื่องห้อง การจอง หรือบริการเสริมได้ที่นี่
              </p>
            </div>
          </div>
        ) : null}
        {messages.map((message) => {
          const mine = message.senderUserId === currentUserId;
          return (
            <article
              key={message.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[88%] px-4 py-3 ${compact ? `rounded-[1.25rem] ${mine ? "bg-zinc-100 text-black" : "bg-white text-black"}` : `rounded-lg sm:max-w-[70%] ${mine ? "rounded-br-sm bg-black text-white" : "rounded-bl-sm border border-zinc-200 bg-white"}`}`}
              >
                <p className={`whitespace-pre-wrap break-words leading-7 ${compact ? "text-base" : "text-sm"}`}>
                  {message.body}
                </p>
                <p
                  className={`mt-2 text-[10px] ${mine && !compact ? "text-white/45" : "text-zinc-500"}`}
                >
                  {mine ? "คุณ" : message.senderName} ·{" "}
                  {new Intl.DateTimeFormat("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                    timeZone: "Asia/Bangkok",
                  }).format(new Date(message.createdAt))}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      <form
        onSubmit={submit}
        noValidate
        className={`shrink-0 border-t border-zinc-100 p-3 ${compact ? "" : "sm:p-5"}`}
      >
        {error ? (
          <p
            role="alert"
            className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        ) : null}
        <div className={`flex items-end gap-2 border border-zinc-200 bg-white p-2 ${compact ? "rounded-full" : "rounded-lg"}`}>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            maxLength={2000}
            rows={1}
            placeholder="พิมพ์ข้อความ…"
            aria-label="ข้อความ"
            className="max-h-32 min-h-11 min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm outline-none"
          />
          <button
            disabled={!draft.trim() || sending}
            type="submit"
            aria-label="ส่งข้อความ"
            aria-busy={sending}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-black text-lg text-white transition hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {sending ? (
              <RiLoader4Line className="animate-spin" />
            ) : (
              <RiArrowUpLine />
            )}
          </button>
        </div>
        <div className="mt-2 flex justify-between px-2 text-[10px] text-zinc-400">
          <span>Enter เพื่อส่ง · Shift + Enter เพื่อขึ้นบรรทัดใหม่</span>
          <span>{draft.length}/2,000</span>
        </div>
      </form>
    </section>
  );
}
