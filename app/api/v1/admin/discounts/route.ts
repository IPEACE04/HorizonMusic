import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { promoError } from "@/server/admin/promos/http";
import { createPromo, listAdminPromos } from "@/server/admin/promos/service";
import { apiError, apiSuccess } from "@/server/http";
export async function GET(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  if (!hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(await listAdminPromos());
  } catch (error) {
    return promoError(error);
  }
}
export async function POST(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  if (!hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(
      await createPromo(session.user.id, await request.json()),
      201,
    );
  } catch (error) {
    return promoError(error);
  }
}
