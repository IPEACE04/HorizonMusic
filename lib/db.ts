import "server-only";

import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import * as authSchema from "@/db/schema/auth";
import { loadServerEnv } from "@/lib/env";

declare global {
  var smtStudioDatabasePool: Pool | undefined;
}

const environment = loadServerEnv(process.env);

const pool =
  globalThis.smtStudioDatabasePool ??
  new Pool({
    connectionString: environment.DATABASE_URL,
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.smtStudioDatabasePool = pool;
}

export const db = drizzle({ client: pool, schema: authSchema });
export const databasePool = pool;
