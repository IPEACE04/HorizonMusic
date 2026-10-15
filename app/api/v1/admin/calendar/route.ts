import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { listAdminCalendar } from "@/server/admin/operations";
import { adminOperationsError } from "@/server/admin/operations-http";
import { apiError, apiSuccess } from "@/server/http";

export async function GET(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  if (!hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    const params = new URL(request.url).searchParams;
    const from = params.get("from");
    const to = params.get("to");
    if (!from || !to)
      return apiError("INVALID_CALENDAR_RANGE", "ต้องระบุช่วงวันที่", 400);
    return apiSuccess(
      await listAdminCalendar(from, to, params.get("roomId") ?? undefined),
    );
  } catch (error) {
    return adminOperationsError(error);
  }
}
