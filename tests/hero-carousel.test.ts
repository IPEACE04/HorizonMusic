import assert from "node:assert/strict";
import test from "node:test";

import {
  nextHeroIndex,
  normalizeHeroIndex,
} from "../components/hero-carousel-state";

test("nextHeroIndex loops back to the first hero image", () => {
  assert.equal(nextHeroIndex(0, 3), 1);
  assert.equal(nextHeroIndex(2, 3), 0);
});

test("normalizeHeroIndex keeps thumbnail selection within bounds", () => {
  assert.equal(normalizeHeroIndex(1, 3), 1);
  assert.equal(normalizeHeroIndex(-1, 3), 0);
  assert.equal(normalizeHeroIndex(9, 3), 2);
});
