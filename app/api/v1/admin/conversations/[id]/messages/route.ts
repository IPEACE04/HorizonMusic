import { getAppSession, hasAdminRole } from "@/server/auth/session";
import { parseMessageBody } from "@/server/chat/contracts";
import {
  getAdminConversation,
  markAdminChatRead,
  sendAdminMessage,
} from "@/server/chat/service";
import { apiError, apiSuccess } from "@/server/http";
async function actor(request: Request) {
  const s = await getAppSession(request.headers);
  return s && hasAdminRole(s) ? s : null;
}
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await actor(request);
  if (!s) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  return apiSuccess(await getAdminConversation((await params).id, s.user.id));
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await actor(request);
  if (!s) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  try {
    return apiSuccess(
      await sendAdminMessage(
        (await params).id,
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
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const s = await actor(request);
  if (!s) return apiError("FORBIDDEN", "ไม่มีสิทธิ์เข้าถึง", 403);
  return apiSuccess(await markAdminChatRead((await params).id, s.user.id));
}
