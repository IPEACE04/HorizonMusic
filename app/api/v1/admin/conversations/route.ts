import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http";
import { listAdminConversations } from "@/server/chat/service";
export async function GET(request: Request) {
  const s = await getAppSession(request.headers);
  if (!s) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  if (!hasAdminRole(s)) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  return apiSuccess(await listAdminConversations(s.user.id));
}
