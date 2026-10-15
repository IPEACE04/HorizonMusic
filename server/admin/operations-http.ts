import { InputValidationError } from "@/features/auth/contracts";
import { AdminOperationsError } from "@/server/admin/operations";
import { apiError } from "@/server/http";

export function adminOperationsError(error: unknown) {
  if (error instanceof InputValidationError)
    return apiError(
      "INVALID_ADMIN_INPUT",
      error.message,
      400,
      error.fieldErrors,
    );
  if (error instanceof AdminOperationsError)
    return apiError(error.code, error.message, error.status);
  return apiError(
    "ADMIN_OPERATIONS_UNAVAILABLE",
    "ไม่สามารถดำเนินการได้ กรุณาลองใหม่",
    500,
  );
}
