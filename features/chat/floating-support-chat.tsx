"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { RiChat3Line, RiChatSmile2Line, RiCloseLine } from "react-icons/ri";
import { ChatPanel } from "@/features/chat/chat-panel";

export function FloatingSupportChat({ currentUserId }: { currentUserId: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedOnce, setOpenedOnce] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const hidden = pathname === "/admin" || pathname.startsWith("/admin/") || ["/chat", "/login", "/register"].includes(pathname);
  const workspace = ["/profile", "/bookings", "/booking", "/notifications"].some((path) => pathname === path || pathname.startsWith(`${path}/`));

  function close() {
    setOpen(false);
    launcher.current?.focus();
  }

  useEffect(() => {
    if (!open || hidden) return;
    panel.current?.querySelector<HTMLElement>("textarea, a[href]")?.focus();
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        launcher.current?.focus();
      }
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [open, hidden, currentUserId]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!open || hidden || !viewport) return;
    const element = container.current;
    function resize() {
      if (!element || !viewport) return;
      const lift = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      element.style.setProperty("--chat-viewport-height", `${viewport.height}px`);
      element.style.setProperty("--chat-keyboard-offset", `${lift}px`);
      if (lift > 100) element.style.setProperty("--chat-base-bottom", "1rem");
      else element.style.removeProperty("--chat-base-bottom");
    }
    resize();
    viewport.addEventListener("resize", resize);
    viewport.addEventListener("scroll", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      viewport.removeEventListener("scroll", resize);
      element?.style.removeProperty("--chat-viewport-height");
      element?.style.removeProperty("--chat-keyboard-offset");
      element?.style.removeProperty("--chat-base-bottom");
    };
  }, [open, hidden]);

  if (hidden) return null;
  return (
    <div ref={container} className={`fixed bottom-[calc(var(--chat-base-bottom)+env(safe-area-inset-bottom)+var(--chat-keyboard-offset,0px))] right-4 z-[var(--z-chat)] [--chat-base-bottom:1.25rem] sm:right-6 lg:[--chat-base-bottom:1.5rem] ${workspace ? "max-lg:[--chat-base-bottom:5.5rem]" : ""}`}>
      {openedOnce ? (
        <div
          ref={panel}
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-label="คุยกับทีมงาน Horizon Music"
          className={`absolute bottom-[calc(100%+0.75rem)] right-0 h-[min(560px,calc(var(--chat-viewport-height,100dvh)-var(--chat-base-bottom)-5rem))] w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-[0_12px_45px_rgba(0,0,0,0.16)] ${open ? "flex flex-col" : "hidden"}`}
        >
          {currentUserId ? (
            <ChatPanel key={currentUserId} currentUserId={currentUserId} endpoint="/api/v1/chat" title="คุยกับทีม Horizon Music" compact active={open} onClose={close} />
          ) : (
            <>
              <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-3 text-black">
                <h2 className="text-base font-medium">คุยกับทีม Horizon Music</h2>
                <button type="button" onClick={close} aria-label="ย่อหน้าต่างแชท" className="grid size-11 place-items-center"><RiCloseLine aria-hidden /></button>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <RiChatSmile2Line aria-hidden className="text-5xl text-[var(--focus)]" />
                <h3 className="mt-5 text-lg font-medium">คุยกับทีมงานได้ที่นี่</h3>
                <p className="mt-3 text-sm leading-7 text-zinc-500">เข้าสู่ระบบเพื่อส่งข้อความและเก็บบทสนทนาของคุณไว้คุยต่อ</p>
                <Link href={`/login?callbackUrl=${encodeURIComponent(pathname)}`} className="studio-button studio-button--primary mt-6 w-full">เข้าสู่ระบบเพื่อแชท</Link>
              </div>
            </>
          )}
        </div>
      ) : null}
      <button
        ref={launcher}
        type="button"
        aria-label={open ? "ย่อหน้าต่างแชท" : "แชทกับทีมงาน Horizon Music"}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={openedOnce ? panelId : undefined}
        onClick={() => {
          setOpenedOnce(true);
          setOpen((value) => !value);
        }}
        className="grid size-14 place-items-center rounded-full bg-[var(--ink)] text-white shadow-lg transition hover:bg-zinc-800"
      >
        {open ? <RiCloseLine aria-hidden className="text-2xl" /> : <RiChat3Line aria-hidden className="text-2xl" />}
      </button>
    </div>
  );
}
