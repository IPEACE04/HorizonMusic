import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { catalogError } from "@/server/admin/catalog/http";
import {
  createEquipment,
  listAdminEquipment,
} from "@/server/admin/catalog/service";
import { apiError, apiSuccess } from "@/server/http";
export async function GET(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session || !hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(await listAdminEquipment());
  } catch (error) {
    return catalogError(error);
  }
}
export async function POST(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session || !hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(
      await createEquipment(session.user.id, await request.json()),
      201,
    );
  } catch (error) {
    return catalogError(error);
  }
}
