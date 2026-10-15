import { apiError, apiSuccess } from "@/server/http";
import { getActiveAddons } from "@/server/bookings/service";

export async function GET() {
  try {
    return apiSuccess(await getActiveAddons());
  } catch {
    return apiError("ADDONS_UNAVAILABLE", "ไม่สามารถโหลดบริการเสริมได้", 500);
  }
}
