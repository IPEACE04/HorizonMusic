import { InputValidationError } from "@/features/auth/contracts";
import { getAppSession } from "@/server/auth/session";
import { parseBookingIntent } from "@/server/bookings/contracts";
import {
  BookingDomainError,
  createBooking,
  listUserBookings,
} from "@/server/bookings/service";
import { apiError, apiSuccess } from "@/server/http";

export async function GET(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  try {
    return apiSuccess(await listUserBookings(session.user.id));
  } catch {
    return apiError(
      "BOOKINGS_UNAVAILABLE",
      "ไม่สามารถโหลดประวัติการจองได้",
      500,
    );
  }
}
export async function POST(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  try {
    return apiSuccess(
      await createBooking(
        parseBookingIntent(await request.json(), true),
        session.user.id,
      ),
      201,
    );
  } catch (error) {
    if (error instanceof InputValidationError)
      return apiError("INVALID_BOOKING", error.message, 400, error.fieldErrors);
    if (error instanceof BookingDomainError)
      return apiError(error.code, error.message, error.status);
    return apiError("BOOKING_CREATE_FAILED", "ไม่สามารถสร้างรายการจองได้", 500);
  }
}
