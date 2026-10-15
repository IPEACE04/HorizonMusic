import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NotificationList } from "@/features/notifications/notification-list";
import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { listNotificationsPage } from "@/server/notifications/service";

type Notice = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};
export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getAppSession(await headers());
  if (!session || !hasAdminRole(session))
    redirect("/login?callbackUrl=/admin/notifications");
  const requestedPage = Number((await searchParams).page ?? "1");
  const result = await listNotificationsPage(
    session.user.id,
    Number.isInteger(requestedPage) ? requestedPage : 1,
    10,
  );
  const items = result.items as Notice[];
  return (
    <>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        OPERATIONS FEED
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
        การแจ้งเตือน Admin
      </h1>
      <p className="mt-4 text-zinc-500">
        รายการจอง การชำระเงิน และข้อความใหม่ที่ทีมต้องดำเนินการ
      </p>
      <NotificationList
        initialItems={items}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        pageHrefPrefix="/admin/notifications?page="
      />
    </>
  );
}
