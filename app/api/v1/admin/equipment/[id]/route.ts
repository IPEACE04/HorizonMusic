import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { catalogError } from "@/server/admin/catalog/http";
import {
  archiveCatalogItem,
  updateEquipment,
} from "@/server/admin/catalog/service";
import { apiError, apiSuccess } from "@/server/http";
async function actor(request: Request) {
  const session = await getAppSession(request.headers);
  return session && hasAdminRole(session) ? session : null;
}
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await actor(request);
  if (!session) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(
      await updateEquipment(
        (await params).id,
        session.user.id,
        await request.json(),
      ),
    );
  } catch (error) {
    return catalogError(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await actor(request);
  if (!session) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(
      await archiveCatalogItem("equipment", (await params).id, session.user.id),
    );
  } catch (error) {
    return catalogError(error);
  }
}
