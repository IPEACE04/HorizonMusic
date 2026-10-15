import test from "node:test";
import assert from "node:assert/strict";

import { getPaginationMeta } from "@/lib/pagination";

test("pagination metadata uses ten items per page and hides when total is ten or less", () => {
  assert.deepEqual(getPaginationMeta(1, 10, 10), {
    totalPages: 1,
    start: 1,
    end: 10,
    shouldRender: false,
    hasPrevious: false,
    hasNext: false,
  });

  assert.deepEqual(getPaginationMeta(2, 10, 25), {
    totalPages: 3,
    start: 11,
    end: 20,
    shouldRender: true,
    hasPrevious: true,
    hasNext: true,
  });
});

test("pagination metadata clamps invalid pages and final range", () => {
  assert.deepEqual(getPaginationMeta(99, 10, 21), {
    totalPages: 3,
    start: 21,
    end: 21,
    shouldRender: true,
    hasPrevious: true,
    hasNext: false,
  });
});
