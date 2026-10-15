import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { transitionAdminBooking } from "@/server/admin/operations";
import { adminOperationsError } from "@/server/admin/operations-http";
import { parseBookingTransitionInput } from "@/server/admin/operations-contracts";
import { apiError, apiSuccess } from "@/server/http";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  if (!hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    const input = parseBookingTransitionInput(await request.json());
    return apiSuccess(
      await transitionAdminBooking(
        (await params).id,
        session.user.id,
        input.status,
        input.reason,
      ),
    );
  } catch (error) {
    return adminOperationsError(error);
  }
}
