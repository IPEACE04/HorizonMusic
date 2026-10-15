import { apiError, apiSuccess } from "@/server/http";
import { roomService } from "@/server/rooms";
import {
  BookingDomainError,
  checkAvailability,
} from "@/server/bookings/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const room = await roomService.getPublishedRoom((await params).slug);
    if (!room) return apiError("ROOM_NOT_FOUND", "ไม่พบห้องที่ต้องการ", 404);
    const query = new URL(request.url).searchParams;
    return apiSuccess(
      await checkAvailability(
        room.id,
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
