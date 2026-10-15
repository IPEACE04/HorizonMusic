import { getAppSession } from "@/server/auth/session";
import { parseMessageBody } from "@/server/chat/contracts";
import {
  getCustomerChat,
  markCustomerChatRead,
  sendCustomerMessage,
} from "@/server/chat/service";
import { apiError, apiSuccess } from "@/server/http";
export async function GET(request: Request) {
  const s = await getAppSession(request.headers);
  if (!s) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  try {
    return apiSuccess(await getCustomerChat(s.user.id));
  } catch {
    return apiError("CHAT_UNAVAILABLE", "ไม่สามารถโหลดข้อความได้", 500);
  }
}
export async function POST(request: Request) {
  const s = await getAppSession(request.headers);
  if (!s) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  try {
    return apiSuccess(
      await sendCustomerMessage(
        s.user.id,
        parseMessageBody(await request.json()),
      ),
      201,
    );
  } catch (error) {
    return apiError(
      "INVALID_MESSAGE",
      error instanceof Error ? error.message : "ข้อความไม่ถูกต้อง",
      400,
    );
  }
}
export async function PUT(request: Request) {
  const s = await getAppSession(request.headers);
  if (!s) return apiError("UNAUTHORIZED", "กรุณาเข้าสู่ระบบ", 401);
  return apiSuccess(await markCustomerChatRead(s.user.id));
}
