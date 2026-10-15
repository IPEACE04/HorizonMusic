import "server-only";

import type { Pool, PoolClient } from "pg";

import { databasePool } from "@/lib/db";

export type ProfileRecord = Readonly<{
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  userId: string;
}>;

type ProfileRow = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_id: string;
};

async function profileByUserId(client: Pool | PoolClient, userId: string) {
  const result = await client.query<ProfileRow>(
    `
      select u.email, p.user_id, p.first_name, p.last_name, p.phone
      from public.user_profiles p
      join public."user" u on u.id = p.user_id
      where p.user_id = $1
      limit 1
    `,
    [userId],
  );
  const row = result.rows[0];
  return row
    ? {
        email: row.email,
        firstName: row.first_name,
        lastName: row.last_name,
        phone: row.phone,
        userId: row.user_id,
      }
    : null;
}

export function createProfileRepository(pool: Pool = databasePool) {
  return {
    findByUserId(userId: string) {
      return profileByUserId(pool, userId);
    },
    async upsert(
      userId: string,
      input: Readonly<{ firstName: string; lastName: string; phone: string }>,
      requestId?: string,
    ): Promise<ProfileRecord> {
      const client = await pool.connect();
      try {
        await client.query("begin");
        const existed = await profileByUserId(client, userId);
        await client.query(
          `
            insert into public.user_profiles (user_id, first_name, last_name, phone)
            values ($1, $2, $3, $4)
            on conflict (user_id) do update set
              first_name = excluded.first_name,
              last_name = excluded.last_name,
              phone = excluded.phone,
              updated_at = now()
          `,
          [userId, input.firstName, input.lastName, input.phone],
        );
        await client.query(
          `update public."user" set name = $2, updated_at = now() where id = $1`,
          [userId, `${input.firstName} ${input.lastName}`],
        );
        await client.query(
          `
            insert into public.activity_logs
              (actor_type, actor_user_id, action, entity_type, entity_id, after_data, request_id)
            values ('USER', $1, $2, 'USER_PROFILE', $1, '{"profileCompleted":true}'::jsonb, $3::uuid)
          `,
          [
            userId,
            existed ? "PROFILE_UPDATED" : "PROFILE_CREATED",
            requestId ?? null,
          ],
        );
        const profile = await profileByUserId(client, userId);
        if (!profile) throw new Error("Profile write did not return a record");
        await client.query("commit");
        return profile;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
