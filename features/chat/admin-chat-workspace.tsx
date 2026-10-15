"use client";

import { useCallback, useEffect, useState } from "react";
import { RiChat3Line, RiSearchLine } from "react-icons/ri";
import { ChatPanel } from "@/features/chat/chat-panel";

type Conversation = {
  id: string;
  customerName: string;
  email: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

export function AdminChatWorkspace({ adminId }: { adminId: string }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/v1/admin/conversations", {
        cache: "no-store",
      });
      const payload = (await response.json()) as { data?: Conversation[] };
      if (response.ok && payload.data) {
        setConversations(payload.data);
        setSelectedId((current) => current ?? payload.data?.[0]?.id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 5_000);
    return () => window.clearInterval(interval);
  }, [load]);
  const filtered = conversations.filter((item) =>
    `${item.customerName} ${item.email}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const selected = conversations.find((item) => item.id === selectedId);

  return (
    <div className="grid min-h-[680px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-[0_28px_80px_-55px_rgba(0,0,0,.45)] xl:grid-cols-[360px_1fr]">
      <aside className="border-b border-zinc-200 xl:border-b-0 xl:border-r">
        <div className="border-b border-zinc-100 p-5">
          <h2 className="text-xl font-medium">Inbox</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {conversations.reduce(
              (sum, item) => sum + Number(item.unreadCount),
              0,
            )}{" "}
            ข้อความที่ยังไม่ได้อ่าน
          </p>
          <label className="mt-4 flex items-center gap-2 rounded-full bg-zinc-100 px-4">
            <RiSearchLine className="text-zinc-400" />
            <span className="sr-only">ค้นหาลูกค้า</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาชื่อหรืออีเมล"
              className="min-h-11 w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>
        <div className="max-h-[310px] overflow-y-auto xl:max-h-[570px]">
          {loading ? (
            <p className="p-6 text-sm text-zinc-400">กำลังโหลดบทสนทนา…</p>
          ) : null}
          {!loading && !filtered.length ? (
            <div className="p-8 text-center">
              <RiChat3Line className="mx-auto text-3xl" />
              <p className="mt-3 font-medium">ยังไม่มีบทสนทนา</p>
            </div>
          ) : null}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedId(item.id)}
              className={`w-full border-b border-zinc-100 p-5 text-left transition ${selectedId === item.id ? "bg-black text-white" : "hover:bg-zinc-50"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.customerName}</p>
                  <p
                    className={`mt-1 truncate text-xs ${selectedId === item.id ? "text-white/50" : "text-zinc-400"}`}
                  >
                    {item.email}
                  </p>
                </div>
                {Number(item.unreadCount) > 0 ? (
                  <span
                    className={`grid min-w-6 place-items-center rounded-full px-1.5 text-xs font-medium ${selectedId === item.id ? "bg-white text-black" : "bg-black text-white"}`}
                  >
                    {item.unreadCount}
                  </span>
                ) : null}
              </div>
              <p
                className={`mt-3 truncate text-sm ${selectedId === item.id ? "text-white/65" : "text-zinc-500"}`}
              >
                {item.lastMessage ?? "ยังไม่มีข้อความ"}
              </p>
            </button>
          ))}
        </div>
      </aside>
      <div className="min-w-0 bg-[#f5f5f2] p-3 sm:p-5">
        {selectedId ? (
          <ChatPanel
            key={selectedId}
            currentUserId={adminId}
            endpoint={`/api/v1/admin/conversations/${selectedId}/messages`}
            title={selected?.customerName ?? "บทสนทนาลูกค้า"}
          />
        ) : (
          <div className="grid min-h-[620px] place-items-center text-center">
            <div>
              <RiChat3Line className="mx-auto text-5xl text-zinc-300" />
              <p className="mt-4 font-medium">เลือกบทสนทนาเพื่อเริ่มตอบกลับ</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
