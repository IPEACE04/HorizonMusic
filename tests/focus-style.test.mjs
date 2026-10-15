import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import postcss from "postcss";

const stylesheet = postcss.parse(
  await readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
);

function within(rule, name, params) {
  for (let parent = rule.parent; parent; parent = parent.parent) {
    if (
      parent.type === "atrule" &&
      parent.name === name &&
      parent.params === params
    )
      return true;
  }
  return false;
}

function declarations(rule) {
  return Object.fromEntries(
    rule.nodes
      .filter((node) => node.type === "decl")
      .map(({ prop, value }) => [prop, value]),
  );
}

const rules = [];
stylesheet.walkRules((rule) => rules.push(rule));
const fieldFocus = rules.filter(
  (rule) =>
    rule.selector.includes(":focus-visible") &&
    /\b(input|select|textarea)\b/.test(rule.selector),
);
const normalFieldFocus = fieldFocus.filter(
  (rule) => !within(rule, "media", "(forced-colors: active)"),
);

test("normal form-field focus suppresses outlines and keeps border/shadow feedback", () => {
  assert.ok(
    normalFieldFocus.length,
    "Expected explicit form-field focus rules",
  );
  for (const rule of normalFieldFocus) {
    for (const [prop, value] of Object.entries(declarations(rule))) {
      if (
        prop === "outline" ||
        prop === "outline-style" ||
        prop === "outline-width"
      ) {
        assert.match(
          value,
          /^(none|0(?:px)?)$/,
          `${rule.selector} draws a normal field outline`,
        );
      }
    }
  }
  const directFocus = normalFieldFocus.find(
    (rule) => rule.selector === ":where(input, select, textarea):focus-visible",
  );
  assert.ok(directFocus);
  const focus = declarations(directFocus);
  assert.equal(
    focus.outline,
    "none",
    "Suppress the native normal-mode outline explicitly",
  );
  assert.equal(focus["border-color"], "var(--focus)");
  assert.match(focus["box-shadow"], /0 0 0 3px.*var\(--focus\)/);
  // Search inputs delegate their shadow to the visible wrapper indicator.
  const search = rules.find(
    (rule) => rule.selector === ".studio-search-field:focus-within",
  );
  assert.ok(search);
  assert.equal(declarations(search)["border-color"], "var(--focus)");
  assert.match(declarations(search)["box-shadow"], /0 0 0 3px.*var\(--focus\)/);
});

test("forced-colors form-field focus uses a visible system outline", () => {
  const forcedFocus = fieldFocus.find((rule) =>
    within(rule, "media", "(forced-colors: active)"),
  );
  assert.ok(forcedFocus);
  const focus = declarations(forcedFocus);
  assert.equal(focus.outline, "2px solid Highlight");
  assert.equal(focus["outline-offset"], "3px");
  assert.equal(focus["box-shadow"], "none");
});

test("shared sizing/layout recipes allow Tailwind responsive overrides", () => {
  // Unlayered recipes outrank utilities, breaking hidden sm:inline-flex and min-h-16.
  for (const selector of [
    ".studio-button",
    ".studio-frame",
    ".studio-nav-link",
  ]) {
    const rule = rules.find((candidate) => candidate.selector === selector);
    assert.ok(rule);
    assert.ok(
      within(rule, "layer", "components"),
      `${selector} must not outrank Tailwind utilities`,
    );
  }
});
