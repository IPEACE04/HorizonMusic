import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

import * as authSchema from "@/db/schema/auth";
import { loadServerEnv, type ServerEnv } from "@/lib/env";

type DrizzleDatabase = Parameters<typeof drizzleAdapter>[0];

export function createAuthOptions(
  database: DrizzleDatabase,
  environment: ServerEnv = loadServerEnv(process.env),
) {
  return {
    baseURL: environment.BETTER_AUTH_URL,
    secret: environment.BETTER_AUTH_SECRET,
    trustedOrigins: [environment.NEXT_PUBLIC_APP_URL],
    database: drizzleAdapter(database, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 128,
    },
    plugins: [
      admin({
        defaultRole: "user",
      }),
      nextCookies(),
    ],
  };
}
