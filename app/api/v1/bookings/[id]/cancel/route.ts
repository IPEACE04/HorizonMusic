import { getAppSession } from "@/server/auth/session";
import {
  BookingDomainError,
  cancelUserBooking,
} from "@/server/bookings/service";
import { apiError, apiSuccess } from "@/server/http";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  try {
    return apiSuccess(
      await cancelUserBooking((await params).id, session.user.id),
    );
  } catch (error) {
    if (error instanceof BookingDomainError)
      return apiError(error.code, error.message, error.status);
    return apiError(
      "BOOKING_CANCEL_FAILED",
      "ไม่สามารถยกเลิกรายการจองได้",
      500,
    );
  }
}
