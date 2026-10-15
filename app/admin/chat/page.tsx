import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AdminChatWorkspace } from "@/features/chat/admin-chat-workspace";
import { getAppSession, hasAdminRole } from "@/server/auth/session";

export default async function AdminChatPage() {
  const session = await getAppSession(await headers());
  if (!session || !hasAdminRole(session))
    redirect("/login?callbackUrl=/admin/chat");
  return (
    <>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        CUSTOMER CARE
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
        บทสนทนาลูกค้า
      </h1>
      <p className="mt-4 text-zinc-500">
        ตอบข้อความ ติดตาม unread และดูประวัติการสนทนาแบบต่อเนื่อง
      </p>
      <div className="mt-9">
        <AdminChatWorkspace adminId={session.user.id} />
      </div>
    </>
  );
}
