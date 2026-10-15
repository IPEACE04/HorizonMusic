import assert from "node:assert/strict";
import test from "node:test";

import { loadServerEnv } from "../lib/env";

const validEnvironment = {
  DATABASE_URL:
    "postgresql://postgres:password@pooler.example.com:6543/postgres",
  DATABASE_URL_DIRECT:
    "postgresql://postgres:password@db.example.com:5432/postgres",
  BETTER_AUTH_SECRET: "a-strong-secret-that-is-at-least-thirty-two-chars",
  BETTER_AUTH_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
};

test("loadServerEnv returns the server-only Better Auth connection settings", () => {
  assert.deepEqual(loadServerEnv(validEnvironment), validEnvironment);
});

test("loadServerEnv rejects a missing direct migration connection", () => {
  const environmentWithoutDirectUrl = Object.fromEntries(
    Object.entries(validEnvironment).filter(
      ([key]) => key !== "DATABASE_URL_DIRECT",
    ),
  );

  assert.throws(
    () => loadServerEnv(environmentWithoutDirectUrl),
    /DATABASE_URL_DIRECT is required/,
  );
});

test("loadServerEnv rejects an insecurely short Better Auth secret", () => {
  assert.throws(
    () =>
      loadServerEnv({
        ...validEnvironment,
        BETTER_AUTH_SECRET: "too-short",
      }),
    /BETTER_AUTH_SECRET must be at least 32 characters/,
  );
});

test("loadServerEnv rejects a non-HTTP application URL", () => {
  assert.throws(
    () =>
      loadServerEnv({
        ...validEnvironment,
        NEXT_PUBLIC_APP_URL: "ftp://localhost:3000",
      }),
    /NEXT_PUBLIC_APP_URL must be a valid HTTP\(S\) URL/,
  );
});
