import { CatalogValidationError } from "@/features/admin/catalog-contracts";
import { CatalogDomainError } from "@/server/admin/catalog/service";
import { apiError } from "@/server/http";

export function catalogError(error: unknown) {
  if (error instanceof CatalogValidationError)
    return apiError(
      "INVALID_CATALOG_INPUT",
      error.message,
      400,
      error.fieldErrors,
    );
  if (error instanceof CatalogDomainError)
    return apiError(error.code, error.message, error.status, error.fieldErrors);
  return apiError(
    "CATALOG_UNAVAILABLE",
    "ไม่สามารถดำเนินการได้ กรุณาลองใหม่",
    500,
  );
}
