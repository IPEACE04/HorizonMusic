import {
  InputValidationError,
  parseProfileInput,
} from "@/features/auth/contracts";
import { apiError, apiSuccess } from "@/server/http";
import { getAppSession } from "@/server/auth/session";
import { profileRepository } from "@/server/profile";

export async function GET(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);

  try {
    const profile = await profileRepository.findByUserId(session.user.id);
    return apiSuccess(
      profile ?? {
        email: session.user.email,
        firstName: session.user.name,
        lastName: "",
        phone: "",
        userId: session.user.id,
      },
    );
  } catch {
    return apiError(
      "PROFILE_UNAVAILABLE",
      "ไม่สามารถโหลดข้อมูลส่วนตัวได้",
      500,
    );
  }
}

export async function PUT(request: Request) {
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);

  try {
    const input = parseProfileInput(await request.json());
    const requestId = crypto.randomUUID();
    const profile = await profileRepository.upsert(
      session.user.id,
      input,
      requestId,
    );
    return apiSuccess(profile);
  } catch (error) {
    if (error instanceof InputValidationError) {
      return apiError("INVALID_PROFILE", error.message, 400, error.fieldErrors);
    }
    return apiError(
      "PROFILE_UPDATE_FAILED",
      "ไม่สามารถบันทึกข้อมูลส่วนตัวได้",
      500,
    );
  }
}
