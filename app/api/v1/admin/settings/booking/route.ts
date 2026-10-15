import { getAppSession, hasAdminRole } from "@/server/auth/session";
import {
  getBookingPolicy,
  updateBookingPolicy,
} from "@/server/admin/operations";
import { adminOperationsError } from "@/server/admin/operations-http";
import { apiError, apiSuccess } from "@/server/http";

async function admin(request: Request) {
  const session = await getAppSession(request.headers);
  return session && hasAdminRole(session) ? session : null;
}

export async function GET(request: Request) {
  const session = await admin(request);
  if (!session) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(await getBookingPolicy());
  } catch (error) {
    return adminOperationsError(error);
  }
}

export async function PATCH(request: Request) {
  const session = await admin(request);
  if (!session) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(
      await updateBookingPolicy(session.user.id, await request.json()),
    );
  } catch (error) {
    return adminOperationsError(error);
  }
}
