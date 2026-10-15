import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { promoError } from "@/server/admin/promos/http";
import { archivePromo, updatePromo } from "@/server/admin/promos/service";
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
      await updatePromo(
        (await params).id,
        session.user.id,
        await request.json(),
      ),
    );
  } catch (error) {
    return promoError(error);
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await actor(request);
  if (!session) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(await archivePromo((await params).id, session.user.id));
  } catch (error) {
    return promoError(error);
  }
}
