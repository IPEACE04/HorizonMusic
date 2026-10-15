import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { FormField } from "../components/ui/form-field";
import { ConfirmDialog } from "../components/ui/confirm-dialog";

function attribute(markup: string, name: string) {
  const value = markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  assert.ok(value, `Expected ${name} in ${markup}`);
  return value;
}

test("FormField keeps caller input classes and native input attributes", () => {
  const markup = renderToStaticMarkup(
    createElement(FormField, {
      label: "อีเมล",
      className: "pr-14 custom-field",
      name: "email",
      autoComplete: "email",
      disabled: true,
    }),
  );
  const input = markup.match(/<input\b[^>]*>/)?.[0];
  assert.ok(input);
  assert.match(attribute(input, "class"), /\bpr-14 custom-field\b/);
  assert.equal(attribute(input, "name"), "email");
  assert.equal(attribute(input, "autoComplete"), "email");
  assert.match(input, /\bdisabled=""/);
});

test("FormField combines supplied help IDs with its rendered error", () => {
  const markup = renderToStaticMarkup(
    createElement(FormField, {
      id: "email",
      label: "อีเมล",
      error: "ตรวจสอบอีเมล",
      hint: "ใช้ที่อยู่ที่ติดต่อได้",
      "aria-describedby": "help privacy",
    }),
  );
  const descriptions = attribute(markup, "aria-describedby").split(" ");
  assert.deepEqual(descriptions, ["help", "privacy", "email-message"]);
  assert.match(markup, /<span id="email-message"[^>]*>ตรวจสอบอีเมล<\/span>/);
  assert.equal(attribute(markup, "aria-invalid"), "true");
});

test("FormField creates distinct IDs and matching label/hint associations", () => {
  const markup = renderToStaticMarkup(
    createElement(
      "div",
      null,
      createElement(FormField, { label: "ชื่อ", hint: "ชื่อของคุณ" }),
      createElement(FormField, { label: "นามสกุล", hint: "นามสกุลของคุณ" }),
    ),
  );
  const labels = [...markup.matchAll(/<label\b[^>]*>(.*?)<\/label>/g)];
  assert.equal(labels.length, 2);
  const ids = labels.map(([label]) => {
    const id = attribute(label, "for");
    assert.equal(attribute(label.match(/<input\b[^>]*>/)![0], "id"), id);
    const description = attribute(label, "aria-describedby");
    assert.ok(label.includes(`id="${description}"`));
    return id;
  });
  assert.notEqual(ids[0], ids[1]);
});

test("FormField preserves caller aria-invalid when no owned error is present", () => {
  for (const invalid of [true, false, "grammar", "spelling"] as const) {
    const markup = renderToStaticMarkup(
      createElement(FormField, {
        label: "ชื่อ",
        "aria-invalid": invalid,
      }),
    );
    assert.equal(attribute(markup, "aria-invalid"), String(invalid));
  }
});

test("FormField keeps external help references when no own message exists", () => {
  const markup = renderToStaticMarkup(
    createElement(FormField, {
      label: "ชื่อ",
      "aria-describedby": "external-help",
    }),
  );
  assert.equal(attribute(markup, "aria-describedby"), "external-help");
  assert.doesNotMatch(markup, /aria-invalid=/);
});

test("ConfirmDialog names and describes itself through rendered elements", () => {
  const markup = renderToStaticMarkup(
    createElement(ConfirmDialog, {
      title: "เก็บรายการ",
      description: "รายการจะออกจากรายการที่ใช้งาน",
      confirmLabel: "เก็บรายการ",
      open: true,
      onClose() {},
      onConfirm() {},
    }),
  );
  const titleId = attribute(markup, "aria-labelledby");
  const descriptionId = attribute(markup, "aria-describedby");
  assert.ok(markup.includes(`<h2 id="${titleId}"`));
  assert.ok(markup.includes(`<p id="${descriptionId}"`));
  assert.match(markup, /<button[^>]*autofocus=""[^>]*>ยกเลิก<\/button>/);
});

test("ConfirmDialog marks busy and disables both actions with generic copy", () => {
  const markup = renderToStaticMarkup(
    createElement(ConfirmDialog, {
      title: "ดำเนินการ",
      description: "ยืนยันการเปลี่ยนแปลง",
      confirmLabel: "ยืนยัน",
      open: true,
      busy: true,
      onClose() {},
      onConfirm() {},
    }),
  );
  assert.equal(attribute(markup, "aria-busy"), "true");
  assert.equal([...markup.matchAll(/<button[^>]*disabled=""/g)].length, 2);
  assert.match(markup, /กำลังดำเนินการ…/);
});
