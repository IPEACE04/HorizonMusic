import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { catalogError } from "@/server/admin/catalog/http";
import { replaceRoomEquipment } from "@/server/admin/catalog/service";
import { apiError, apiSuccess } from "@/server/http";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAppSession(request.headers);
  if (!session || !hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(
      await replaceRoomEquipment(
        (await params).id,
        session.user.id,
        await request.json(),
      ),
    );
  } catch (error) {
    return catalogError(error);
  }
}
