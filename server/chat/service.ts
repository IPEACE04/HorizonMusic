import "server-only";

import type { Pool } from "pg";
import { databasePool } from "@/lib/db";

export class ChatDomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

async function conversationForCustomer(userId: string, pool: Pool) {
  await pool.query(
    `insert into public.conversations (customer_id) values ($1) on conflict (customer_id) do nothing`,
    [userId],
  );
  const result = await pool.query<{ id: string; status: string }>(
    `select id,status from public.conversations where customer_id=$1`,
    [userId],
  );
  return result.rows[0]!;
}
async function messages(conversationId: string, pool: Pool) {
  const result = await pool.query(
    `select m.id,m.body,m.sender_user_id as "senderUserId",u.name as "senderName",m.created_at as "createdAt" from public.messages m join public."user" u on u.id=m.sender_user_id where m.conversation_id=$1 order by m.created_at asc,m.id asc limit 200`,
    [conversationId],
  );
  return result.rows;
}
async function markRead(conversationId: string, userId: string, pool: Pool) {
  await pool.query(
    `insert into public.conversation_read_states (conversation_id,user_id,last_read_message_id,last_read_at) select $1,$2,m.id,m.created_at from public.messages m where m.conversation_id=$1 order by m.created_at desc,m.id desc limit 1 on conflict (conversation_id,user_id) do update set last_read_message_id=excluded.last_read_message_id,last_read_at=excluded.last_read_at where public.conversation_read_states.last_read_at <= excluded.last_read_at`,
    [conversationId, userId],
  );
}

export async function getCustomerChat(
  userId: string,
  pool: Pool = databasePool,
) {
  const conversation = await conversationForCustomer(userId, pool);
  const list = await messages(conversation.id, pool);
  const unread = await pool.query<{ count: string }>(
    `select count(*)::text from public.messages m left join public.conversation_read_states r on r.conversation_id=m.conversation_id and r.user_id=$2 where m.conversation_id=$1 and m.sender_user_id<>$2 and m.created_at>coalesce(r.last_read_at,'epoch')`,
    [conversation.id, userId],
  );
  return {
    conversationId: conversation.id,
    messages: list,
    status: conversation.status,
    unreadCount: Number(unread.rows[0]?.count ?? 0),
  };
}
export async function sendCustomerMessage(
  userId: string,
  body: string,
  pool: Pool = databasePool,
) {
  const conversation = await conversationForCustomer(userId, pool);
  return sendMessage(conversation.id, userId, body, "USER", pool);
}
export async function markCustomerChatRead(
  userId: string,
  pool: Pool = databasePool,
) {
  const conversation = await conversationForCustomer(userId, pool);
  await markRead(conversation.id, userId, pool);
  return { read: true };
}

async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  actorType: "USER" | "ADMIN",
  pool: Pool,
) {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await client.query<{ id: string }>(
      `insert into public.messages (conversation_id,sender_user_id,body) values ($1,$2,$3) returning id`,
      [conversationId, senderId, body],
    );
    await client.query(
      `update public.conversations set last_message_at=now(),updated_at=now(),status='OPEN' where id=$1`,
      [conversationId],
    );
    if (actorType === "USER")
      await client.query(
        `insert into public.notifications (user_id,type,title,body,data) select id,'CHAT','ข้อความแชตใหม่','มีข้อความใหม่จากลูกค้า',jsonb_build_object('conversationId',$1::uuid) from public."user" where role='admin'`,
        [conversationId],
      );
    else
      await client.query(
        `insert into public.notifications (user_id,type,title,body,data) select customer_id,'CHAT','ทีมงานตอบกลับแล้ว','มีข้อความใหม่จาก SMT Studio',jsonb_build_object('conversationId',$1::uuid) from public.conversations where id=$1`,
        [conversationId],
      );
    await client.query(
      `insert into public.activity_logs (actor_type,actor_user_id,action,entity_type,entity_id) values ($1,$2,'CHAT_MESSAGE_SENT','CONVERSATION',$3)`,
      [actorType, senderId, conversationId],
    );
    await client.query("commit");
    return { id: result.rows[0]!.id };
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function listAdminConversations(
  adminId: string,
  pool: Pool = databasePool,
) {
  const result = await pool.query(
    `select c.id,c.status,c.last_message_at as "lastMessageAt",u.id as "customerId",u.name as "customerName",u.email,(select body from public.messages where conversation_id=c.id order by created_at desc,id desc limit 1) as "lastMessage",(select count(*)::int from public.messages m where m.conversation_id=c.id and m.sender_user_id<>$1 and m.created_at>coalesce((select last_read_at from public.conversation_read_states where conversation_id=c.id and user_id=$1),'epoch')) as "unreadCount" from public.conversations c join public."user" u on u.id=c.customer_id order by c.last_message_at desc nulls last limit 100`,
    [adminId],
  );
  return result.rows;
}
export async function getAdminConversation(
  conversationId: string,
  adminId: string,
  pool: Pool = databasePool,
) {
  const exists = await pool.query(
    `select 1 from public.conversations where id=$1`,
    [conversationId],
  );
  if (!exists.rowCount)
    throw new ChatDomainError("CONVERSATION_NOT_FOUND", "ไม่พบบทสนทนา", 404);
  const list = await messages(conversationId, pool);
  return { conversationId, messages: list, adminId };
}
export async function sendAdminMessage(
  conversationId: string,
  adminId: string,
  body: string,
  pool: Pool = databasePool,
) {
  const exists = await pool.query(
    `select 1 from public.conversations where id=$1`,
    [conversationId],
  );
  if (!exists.rowCount)
    throw new ChatDomainError("CONVERSATION_NOT_FOUND", "ไม่พบบทสนทนา", 404);
  return sendMessage(conversationId, adminId, body, "ADMIN", pool);
}
export async function markAdminChatRead(
  conversationId: string,
  adminId: string,
  pool: Pool = databasePool,
) {
  await markRead(conversationId, adminId, pool);
  return { read: true };
}
