import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("room images bypass the Next optimizer after the local storage redirect", async () => {
  const [card, detail] = await Promise.all([
    readFile(new URL("../components/room-card.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rooms/[slug]/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(card, /unoptimized=\{Boolean\(room\.imageUrl\)\}/);
  assert.match(detail, /unoptimized=\{image\.url\.startsWith\("\/storage\/"\)\}/);
});

test("room image picker presents upload and preview inside one shared card", async () => {
  const source = await readFile(
    new URL("../features/admin/catalog-manager.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /sm:grid-cols-\[auto_minmax\(0,1fr\)\]/);
  assert.match(source, /sm:border-l sm:border-zinc-200/);
});
