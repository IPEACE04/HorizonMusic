import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http";
import { listPendingPaymentsPage } from "@/server/payments/service";
export async function GET(request: Request) {
  const session = await getAppSession(request.headers);
  if (!hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    const params = new URL(request.url).searchParams;
    const page = Number(params.get("page") ?? "1");
    const pageSize = Number(params.get("pageSize") ?? "10");
    return apiSuccess(await listPendingPaymentsPage(page, pageSize));
  } catch {
    return apiError(
      "PAYMENTS_UNAVAILABLE",
      "ไม่สามารถโหลดรายการชำระเงินได้",
      500,
    );
  }
}
