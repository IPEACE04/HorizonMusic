import { getAppSession } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http";
import {
  createPaymentUploadIntent,
  PaymentDomainError,
} from "@/server/payments/service";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  try {
    const body = (await request.json()) as { mimeType?: string; size?: number };
    return apiSuccess(
      await createPaymentUploadIntent(
        (await params).id,
        session.user.id,
        body.mimeType ?? "",
        Number(body.size),
      ),
      201,
    );
  } catch (error) {
    if (error instanceof PaymentDomainError)
      return apiError(error.code, error.message, error.status);
    return apiError(
      "INVALID_SLIP",
      error instanceof Error ? error.message : "ไฟล์ไม่ถูกต้อง",
      400,
    );
  }
}
