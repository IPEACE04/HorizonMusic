import { getAppSession } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http";
import {
  confirmPaymentUpload,
  PaymentDomainError,
} from "@/server/payments/service";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  try {
    return apiSuccess(
      await confirmPaymentUpload((await params).id, session.user.id),
    );
  } catch (error) {
    if (error instanceof PaymentDomainError)
      return apiError(error.code, error.message, error.status);
    return apiError("PAYMENT_CONFIRM_FAILED", "ไม่สามารถยืนยันไฟล์ได้", 500);
  }
}
