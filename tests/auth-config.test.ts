import assert from "node:assert/strict";
import test from "node:test";

import { createAuthOptions } from "../lib/auth-options";

const authEnvironment = {
  DATABASE_URL:
    "postgresql://postgres:password@pooler.example.com:6543/postgres",
  DATABASE_URL_DIRECT:
    "postgresql://postgres:password@db.example.com:5432/postgres",
  BETTER_AUTH_SECRET: "a-strong-secret-that-is-at-least-thirty-two-chars",
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

test("Better Auth enables email-password users and the admin role plugin", () => {
  const authOptions = createAuthOptions({} as never, authEnvironment);

  assert.equal(authOptions.emailAndPassword.enabled, true);
  assert.deepEqual(authOptions.trustedOrigins, ["http://localhost:3000"]);
  assert.ok(authOptions.plugins.some((plugin) => plugin.id === "admin"));
});
