import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { BookingWizard } from "@/features/booking/booking-wizard";
import { getAppSession } from "@/server/auth/session";
import { getActiveAddons } from "@/server/bookings/service";
import { roomService } from "@/server/rooms";
export default async function NewBookingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getAppSession(await headers());
  if (!session) redirect("/login?callbackUrl=/booking/new");
  const query = await searchParams;
  const [rooms, addons] = await Promise.all([
    roomService.listPublishedRooms({ limit: 50 }),
    getActiveAddons(),
  ]);
  return (
    <CustomerShell email={session.user.email} name={session.user.name}>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        NEW BOOKING
      </p>
      <h1 className="mt-3 text-3xl font-normal leading-relaxed tracking-normal sm:text-4xl">
        วางแผน session ของคุณ
      </h1>
      <p className="mb-8 mt-3 max-w-2xl text-sm leading-7 text-zinc-500 sm:text-base">
        ราคาและเวลาว่างจะถูกตรวจซ้ำก่อนสร้างรายการจอง
      </p>
      <BookingWizard
        rooms={rooms}
        addons={addons}
        initialRoomId={typeof query.roomId === "string" ? query.roomId : ""}
      />
    </CustomerShell>
  );
}
