import { apiError, apiSuccess } from "@/server/http";
import { parseRoomListQuery } from "@/server/rooms/contracts";
import { roomService } from "@/server/rooms";

export async function GET(request: Request) {
  try {
    const query = parseRoomListQuery(new URL(request.url).searchParams);
    const rooms = await roomService.listPublishedRooms(query);
    return apiSuccess(rooms);
  } catch (error) {
    if (
      error instanceof Error &&
      /ประเภทห้อง|จำนวนรายการ/.test(error.message)
    ) {
      return apiError("INVALID_QUERY", error.message, 400);
    }

    return apiError(
      "ROOM_LIST_UNAVAILABLE",
      "ไม่สามารถโหลดรายการห้องได้ในขณะนี้",
      500,
    );
  }
}
