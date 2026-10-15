import { RiBankCardLine } from "react-icons/ri";
import { Pagination } from "@/components/ui/pagination";
import { PaymentReviewActions } from "@/features/payments/payment-review-actions";
import { formatBangkokDateTime, formatThaiBaht } from "@/lib/presentation";
import { listPendingPaymentsPage } from "@/server/payments/service";
type Payment = {
  id: string;
  bookingNumber: string;
  roomName: string;
  customerName: string;
  amount: number;
  status: string;
  attemptNumber: number;
  submittedAt: string;
};
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const requestedPage = Number((await searchParams).page ?? "1");
  const result = await listPendingPaymentsPage(
    Number.isInteger(requestedPage) ? requestedPage : 1,
    10,
  );
  const payments = result.items as Payment[];
  return (
    <>
      <p className="text-xs font-medium tracking-[.16em] text-zinc-500">
        PAYMENT OPERATIONS
      </p>
      <h1 className="mt-3 text-4xl font-medium tracking-normal sm:text-5xl">
        ตรวจสอบการชำระเงิน
      </h1>
      <p className="mt-4 text-zinc-500">
        เปิดสลิปผ่านลิงก์ส่วนตัวอายุ 5 นาที และบันทึกผลการตรวจด้วยตัวเอง
      </p>
      {payments.length ? (
        <div className="mt-10 overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full min-w-[880px] text-left">
            <thead className="bg-zinc-100 text-xs text-zinc-500">
              <tr>
                <th className="p-4">Booking</th>
                <th className="p-4">ลูกค้า</th>
                <th className="p-4">ส่งเมื่อ</th>
                <th className="p-4">ยอด</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4">ดำเนินการ</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id} className="border-t border-zinc-100">
                  <td className="p-4">
                    <b>{payment.bookingNumber}</b>
                    <small className="block text-zinc-500">
                      {payment.roomName} · ครั้งที่ {payment.attemptNumber}
                    </small>
                  </td>
                  <td className="p-4">{payment.customerName}</td>
                  <td className="p-4 text-sm">
                    {formatBangkokDateTime(payment.submittedAt)}
                  </td>
                  <td className="p-4 font-medium">
                    {formatThaiBaht(payment.amount)}
                  </td>
                  <td className="p-4 text-sm">{payment.status}</td>
                  <td className="p-4">
                    <PaymentReviewActions
                      paymentId={payment.id}
                      status={payment.status}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 pb-4">
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              pageHrefPrefix="/admin/payments?page="
            />
          </div>
        </div>
      ) : (
        <div className="mt-10 rounded-lg border border-dashed border-zinc-300 p-12 text-center">
          <RiBankCardLine className="mx-auto text-4xl" />
          <h2 className="mt-5 text-xl font-medium">ไม่มีสลิปรอตรวจ</h2>
          <p className="mt-2 text-zinc-500">
            รายการใหม่จะปรากฏที่นี่โดยอัตโนมัติ
          </p>
        </div>
      )}
    </>
  );
}
