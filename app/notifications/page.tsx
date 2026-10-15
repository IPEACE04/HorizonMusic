import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { NotificationList } from "@/features/notifications/notification-list";
import { getAppSession } from "@/server/auth/session";
import { listNotificationsPage } from "@/server/notifications/service";

type Notice = {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt: string | null;
  createdAt: string;
};
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await getAppSession(await headers());
  if (!session) redirect("/login?callbackUrl=/notifications");
  const requestedPage = Number((await searchParams).page ?? "1");
  const result = await listNotificationsPage(
    session.user.id,
    Number.isInteger(requestedPage) ? requestedPage : 1,
    10,
  );
  const items = result.items as Notice[];
  return (
    <CustomerShell email={session.user.email} name={session.user.name}>
      <div className="mx-auto max-w-4xl">
        <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
          UPDATES
        </p>
        <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
          การแจ้งเตือน
        </h1>
        <p className="mt-4 text-zinc-500">
          ติดตามการจอง การชำระเงิน และคำตอบจากทีมงานในที่เดียว
        </p>
        <NotificationList
          initialItems={items}
          page={result.page}
          pageSize={result.pageSize}
          total={result.total}
          pageHrefPrefix="/notifications?page="
        />
      </div>
    </CustomerShell>
  );
}
