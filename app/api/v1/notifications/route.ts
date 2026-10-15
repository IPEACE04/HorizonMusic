import { getAppSession } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http";
import {
  listNotificationsPage,
  markNotificationsRead,
} from "@/server/notifications/service";
export async function GET(request: Request) {
  const s = await getAppSession(request.headers);
  if (!s) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  const params = new URL(request.url).searchParams;
  return apiSuccess(
    await listNotificationsPage(
      s.user.id,
      Number(params.get("page") ?? "1"),
      Number(params.get("pageSize") ?? "10"),
    ),
  );
}
export async function PATCH(request: Request) {
  const s = await getAppSession(request.headers);
  if (!s) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  return apiSuccess(await markNotificationsRead(s.user.id, body.id));
}
