import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("room image upload uses an icon-led picker with a selected-file preview", async () => {
  const source = await readFile(
    new URL("../features/admin/catalog-manager.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /RiUploadCloud2Line/);
  assert.match(source, /type="file"[\s\S]{0,300}className="sr-only"/);
  assert.match(source, /URL\.createObjectURL/);
  assert.match(source, /เปลี่ยนภาพ/);
});
