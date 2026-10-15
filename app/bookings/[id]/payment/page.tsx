import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { CustomerShell } from "@/components/customer-shell";
import { SlipUpload } from "@/features/payments/slip-upload";
import { formatThaiBaht } from "@/lib/presentation";
import { getAppSession } from "@/server/auth/session";
import { getUserBooking } from "@/server/bookings/service";
export default async function PaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAppSession(await headers());
  if (!session) redirect("/login?callbackUrl=/bookings");
  const detail = (await getUserBooking(
    (await params).id,
    session.user.id,
  ).catch(() => null)) as {
    id: string;
    bookingNumber: string;
    roomName: string;
    status: string;
    totalAmount: number;
    paymentDueAt: string | null;
  } | null;
  if (!detail) notFound();
  if (detail.status !== "PENDING_PAYMENT") redirect(`/bookings/${detail.id}`);
  return (
    <CustomerShell email={session.user.email} name={session.user.name}>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        MANUAL PAYMENT
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
        ส่งหลักฐานการชำระเงิน
      </h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <SlipUpload bookingId={detail.id} />
        <aside className="h-fit rounded-lg bg-black p-7 text-white">
          <p className="text-sm text-white/55">ยอดที่ต้องโอน</p>
          <p className="mt-2 text-4xl font-medium">
            {formatThaiBaht(detail.totalAmount)}
          </p>
          <div className="my-6 h-px bg-white/15" />
          <p className="font-medium">{detail.roomName}</p>
          <p className="mt-2 text-sm text-white/55">{detail.bookingNumber}</p>
          <p className="mt-6 text-xs leading-6 text-white/50">
            ทีมงานตรวจสอบสลิปด้วยตนเอง กรุณาตรวจชื่อผู้รับ ยอด
            และวันเวลาให้ถูกต้องก่อนส่ง
          </p>
        </aside>
      </div>
    </CustomerShell>
  );
}
