export type RoomType = "REHEARSAL" | "RECORDING";

export type RoomListQuery = Readonly<{
  cursor: string | undefined;
  limit: number;
  roomType: RoomType | undefined;
  search: string | undefined;
}>;

export function parseRoomListQuery(
  searchParams: URLSearchParams,
): RoomListQuery {
  const requestedType = searchParams.get("type")?.trim();
  const requestedLimit = searchParams.get("limit")?.trim();
  const search = searchParams.get("q")?.trim() || undefined;
  const cursor = searchParams.get("cursor")?.trim() || undefined;

  if (
    requestedType &&
    requestedType !== "REHEARSAL" &&
    requestedType !== "RECORDING"
  ) {
    throw new Error("ประเภทห้องไม่ถูกต้อง");
  }

  const limit = requestedLimit ? Number(requestedLimit) : 12;
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw new Error("จำนวนรายการต้องอยู่ระหว่าง 1 ถึง 50");
  }

  return {
    cursor,
    limit,
    roomType: requestedType as RoomType | undefined,
    search,
  };
}
