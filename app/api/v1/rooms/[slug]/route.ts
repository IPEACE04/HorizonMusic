import { apiError, apiSuccess } from "@/server/http";
import { roomService } from "@/server/rooms";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const room = await roomService.getPublishedRoom(slug);
    if (!room) return apiError("ROOM_NOT_FOUND", "ไม่พบห้องที่ต้องการ", 404);
    return apiSuccess(room);
  } catch {
    return apiError(
      "ROOM_DETAIL_UNAVAILABLE",
      "ไม่สามารถโหลดรายละเอียดห้องได้ในขณะนี้",
      500,
    );
  }
}
