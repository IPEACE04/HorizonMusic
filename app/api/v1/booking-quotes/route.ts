import { InputValidationError } from "@/features/auth/contracts";
import { parseBookingIntent } from "@/server/bookings/contracts";
import { getAppSession } from "@/server/auth/session";
import { BookingDomainError, getBookingQuote } from "@/server/bookings/service";
import { apiError, apiSuccess } from "@/server/http";

export async function POST(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session)
    return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบก่อนขอราคา", 401);
  try {
    return apiSuccess(
      await getBookingQuote(
        parseBookingIntent(await request.json()),
        session.user.id,
      ),
    );
  } catch (error) {
    if (error instanceof InputValidationError)
      return apiError("INVALID_BOOKING", error.message, 400, error.fieldErrors);
    if (error instanceof BookingDomainError)
      return apiError(error.code, error.message, error.status);
    return apiError(
      "QUOTE_FAILED",
      error instanceof Error ? error.message : "ไม่สามารถคำนวณราคาได้",
      400,
    );
  }
}
