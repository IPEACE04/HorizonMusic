import { randomUUID } from "node:crypto";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAppSession } from "@/server/auth/session";
import { apiError, apiSuccess } from "@/server/http";
import { InputValidationError } from "@/features/auth/contracts";
import { maxProfileImageSize, profileImageExtension, validateProfileImage } from "@/features/auth/profile-image-contract";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return apiError("INVALID_ORIGIN", "ไม่สามารถอัปโหลดจากเว็บไซต์อื่นได้", 403);
  const session = await getAppSession(request.headers);
  if (!session) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  if (Number(request.headers.get("content-length")) > maxProfileImageSize + 65536)
    return apiError("IMAGE_TOO_LARGE", "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 3 MB", 413);

  let uploadedPath: string | null = null;
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!(file instanceof File)) throw new InputValidationError("กรุณาเลือกรูปโปรไฟล์");
    validateProfileImage(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = profileImageExtension(bytes, file.type);
    const path = `${encodeURIComponent(session.user.id)}/${randomUUID()}.${extension}`;
    const storage = supabaseAdmin.storage.from("profile-images");
    const upload = await storage.upload(path, bytes, { contentType: file.type, upsert: false });
    if (upload.error) return apiError("IMAGE_UPLOAD_FAILED", "ไม่สามารถอัปโหลดรูปได้ กรุณาลองใหม่", 503);
    uploadedPath = path;
    const image = storage.getPublicUrl(path).data.publicUrl;
    const updated = await auth.api.updateUser({
      headers: request.headers,
      body: { image },
      asResponse: true,
    });
    if (!updated.ok) throw new Error("Profile image update failed");
    uploadedPath = null;
    const response = apiSuccess({ image });
    for (const cookie of updated.headers.getSetCookie()) response.headers.append("set-cookie", cookie);
    return response;
  } catch (error) {
    if (uploadedPath) await supabaseAdmin.storage.from("profile-images").remove([uploadedPath]).catch(() => null);
    if (error instanceof InputValidationError) return apiError("INVALID_PROFILE_IMAGE", error.message, 400);
    return apiError("IMAGE_UPDATE_FAILED", "ไม่สามารถบันทึกรูปโปรไฟล์ได้ กรุณาลองใหม่", 500);
  }
}
