import assert from "node:assert/strict";
import test from "node:test";

import { postLoginDestination } from "../features/auth/post-login-destination";

test("admin is routed to the admin console after login", () => {
  assert.equal(postLoginDestination("admin", "/profile"), "/admin");
  assert.equal(postLoginDestination("admin", "/admin/chat"), "/admin");
  assert.equal(postLoginDestination("admin", undefined), "/admin");
});

test("user is routed to a customer page and cannot enter admin through callback", () => {
  assert.equal(postLoginDestination("user", "/bookings"), "/bookings");
  assert.equal(postLoginDestination("user", "/admin"), "/profile");
  assert.equal(postLoginDestination(undefined, undefined), "/profile");
});
