import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const servicePath = new URL("../server/chat/service.ts", import.meta.url);

test("chat notification payload casts conversation id to uuid for both actors", async () => {
  const source = await readFile(servicePath, "utf8");
  const matches =
    source.match(/jsonb_build_object\('conversationId',\$1::uuid\)/g) ?? [];
  assert.equal(matches.length, 2);
});
