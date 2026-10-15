import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http";
import {
  completeRefund,
  PaymentDomainError,
  reviewPayment,
} from "@/server/payments/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  if (!hasAdminRole(session))
    return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    const body = (await request.json()) as { action?: string; note?: string };
    const id = (await params).id;
    if (body.action === "REFUND")
      return apiSuccess(
        await completeRefund(id, session.user.id, body.note ?? ""),
      );
    if (body.action !== "APPROVE" && body.action !== "REJECT")
      return apiError("INVALID_REVIEW", "คำสั่งไม่ถูกต้อง", 400);
    return apiSuccess(
      await reviewPayment(id, session.user.id, body.action, body.note),
    );
  } catch (error) {
    if (error instanceof PaymentDomainError)
      return apiError(error.code, error.message, error.status);
    return apiError(
      "PAYMENT_REVIEW_FAILED",
      error instanceof Error ? error.message : "ไม่สามารถตรวจสลิปได้",
      500,
    );
  }
}
