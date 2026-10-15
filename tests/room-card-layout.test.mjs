import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("customer room card keeps images in color with a square vertical layout", async () => {
  const source = await readFile(
    new URL("../components/room-card.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /sm:grid-cols-\[minmax\(0,\.95fr\)_minmax\(0,1fr\)\]/);
  assert.match(source, /aspect-square/);
  assert.doesNotMatch(source, /grayscale/);
});

test("room card collections use three columns for vertical cards on large screens", async () => {
  const [home, rooms] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/rooms/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(home, /studio-room-collection/);
  assert.match(rooms, /studio-room-collection/);
});
