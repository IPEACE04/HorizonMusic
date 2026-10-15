import { apiError, apiSuccess } from "@/server/http";
import {
  checkAvailability,
  BookingDomainError,
} from "@/server/bookings/service";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  try {
    return apiSuccess(
      await checkAvailability(
        query.get("roomId") ?? "",
        query.get("startsAt") ?? "",
        Number(query.get("durationMinutes")),
      ),
    );
  } catch (error) {
    if (error instanceof BookingDomainError)
      return apiError(error.code, error.message, error.status);
    return apiError(
      "INVALID_AVAILABILITY_QUERY",
      error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง",
      400,
    );
  }
}
