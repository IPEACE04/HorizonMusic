// This module is used only by the Better Auth CLI. Do not import it from app code.
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";

import { createAuthOptions } from "@/lib/auth-options";
import * as authSchema from "@/db/schema/auth";
import { loadServerEnv } from "@/lib/env";

const environment = loadServerEnv(process.env);
const pool = new Pool({ connectionString: environment.DATABASE_URL });
const db = drizzle({ client: pool, schema: authSchema });

export const auth = betterAuth(createAuthOptions(db, environment));
