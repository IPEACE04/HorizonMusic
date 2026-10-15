import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { ChatPanel } from "@/features/chat/chat-panel";
import { getAppSession } from "@/server/auth/session";

export default async function ChatPage() {
  const session = await getAppSession(await headers());
  if (!session) redirect("/login?callbackUrl=/chat");
  return (
    <CustomerShell email={session.user.email} name={session.user.name}>
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
          PRIVATE CONCIERGE
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
          คุยกับทีม Horizon Music
        </h1>
        <p className="mt-4 max-w-2xl leading-7 text-zinc-500">
          ทุกคำถามเรื่อง session ของคุณอยู่ในบทสนทนาเดียว
          คุยต่อได้โดยไม่ต้องเริ่มใหม่
        </p>
        <div className="mt-9">
          <ChatPanel currentUserId={session.user.id} endpoint="/api/v1/chat" />
        </div>
      </div>
    </CustomerShell>
  );
}
