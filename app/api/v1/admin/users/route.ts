import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { listAdminUsers } from "@/server/admin/operations";
import { adminOperationsError } from "@/server/admin/operations-http";
import { apiError, apiSuccess } from "@/server/http";

export async function GET(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  if (!hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(await listAdminUsers(new URL(request.url).searchParams));
  } catch (error) {
    return adminOperationsError(error);
  }
}
