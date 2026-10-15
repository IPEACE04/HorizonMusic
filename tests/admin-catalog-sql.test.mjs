import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const servicePath = new URL(
  "../server/admin/catalog/service.ts",
  import.meta.url,
);

test("catalog activity log JSON values have explicit PostgreSQL types", async () => {
  const source = await readFile(servicePath, "utf8");

  assert.match(
    source,
    /ROOM_CREATED.*jsonb_build_object\('name',\$3::text,'status',\$4::text,'isPublished',\$5::boolean\)/s,
  );
  assert.match(
    source,
    /ROOM_EQUIPMENT_REPLACED.*jsonb_build_object\('itemCount',\$3::int\)/s,
  );
  assert.match(
    source,
    /ROOM_IMAGE_ADDED.*jsonb_build_object\('roomId',\$3::uuid\)/s,
  );
  assert.match(
    source,
    /jsonb_build_object\('name',\$5::text\)/s,
  );
});
