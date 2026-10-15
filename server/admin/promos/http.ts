import { PromoDomainError } from "@/server/admin/promos/service";
import { apiError } from "@/server/http";
export function promoError(error: unknown) {
  if (error instanceof PromoDomainError)
    return apiError(error.code, error.message, error.status, error.fieldErrors);
  return apiError(
    "PROMO_UNAVAILABLE",
    "ไม่สามารถดำเนินการได้ กรุณาลองใหม่",
    500,
  );
}
