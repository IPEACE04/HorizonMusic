import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http";
import {
  createSlipViewUrl,
  PaymentDomainError,
} from "@/server/payments/service";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAppSession(request.headers);
  if (!hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(await createSlipViewUrl((await params).id));
  } catch (error) {
    if (error instanceof PaymentDomainError)
      return apiError(error.code, error.message, error.status);
    return apiError("SLIP_UNAVAILABLE", "ไม่สามารถเปิดสลิปได้", 500);
  }
}
