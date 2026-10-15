import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { createElement, isValidElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import { FormField } from "../components/ui/form-field";

type Element = ReactElement<Record<string, unknown>>;
const require = createRequire(import.meta.url);

// Executes the real components with explicit route/state context. This harness
// checks handlers and rendered semantics; it does not claim DOM/browser QA.
function harness(
  pathname = "/profile",
  initialState?: unknown,
  mocks: Record<string, unknown> = {},
) {
  const slots: unknown[] = [];
  let cursor = 0;
  let effectRan = false;
  const initialLoads: (() => void)[] = [];
  const cache = new Map<string, Record<string, unknown>>();
  function load(file: string): Record<string, unknown> {
    if (cache.has(file)) return cache.get(file)!;
    const source = readFileSync(new URL(`../${file}.tsx`, import.meta.url), "utf8");
    const exports: Record<string, unknown> = {};
    cache.set(file, exports);
    runInNewContext(
      ts.transpileModule(source, {
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.CommonJS,
          target: ts.ScriptTarget.ES2020,
          esModuleInterop: true,
        },
      }).outputText,
      {
        exports,
        window: {
          setTimeout: (callback: () => void) => initialLoads.push(callback),
          setInterval: () => 1,
          clearTimeout() {},
          clearInterval() {},
        },
        fetch: async () => ({ ok: true, json: async () => ({ data: mocks.__badge_response }) }),
        require(name: string) {
          if (name in mocks) return mocks[name];
          if (name === "react") return {
            useState(value: unknown) {
              const index = cursor++;
              if (!(index in slots)) slots[index] = initialState ?? value;
              return [slots[index], (next: unknown) => {
                slots[index] = typeof next === "function" ? next(slots[index]) : next;
              }];
            },
            useId: () => "password-generated-id",
            useEffect(callback: () => void) {
              if ("__badge_response" in mocks && !effectRan) {
                effectRan = true;
                callback();
              }
            },
            useCallback: (callback: unknown) => callback,
          };
          if (name === "next/navigation") return { usePathname: () => pathname };
          if (name === "next/link" || name === "next/image") return {
            __esModule: true, default: name === "next/link" ? "a" : "img",
          };
          if (name === "@/components/ui/form-field") return { FormField };
          if (name === "@/lib/pagination") return require("../lib/pagination");
          if (name === "@/features/auth/logout-button") return {
            LogoutButton: ({ compact }: { compact?: boolean }) => createElement("button", {
              type: "button", "aria-label": "ออกจากระบบ", "data-compact": compact,
            }, "ออกจากระบบ"),
          };
          if (name === "@/components/brand-mark") return { BrandMark: () => createElement("a", { href: "/" }, "SMT STUDIO") };
          if (name.startsWith("@/components/")) return load(name.slice(2));
          if (name === "@/features/notifications/notification-list") return load(name.slice(2));
          return require(name);
        },
      },
    );
    return exports;
  }
  return {
    async flushBadgeLoad() {
      for (const callback of initialLoads.splice(0)) callback();
      await new Promise((resolve) => setImmediate(resolve));
    },
    render(file: string, name: string, props: Record<string, unknown> = {}) {
      cursor = 0;
      return (load(file)[name] as (props: Record<string, unknown>) => Element)(props);
    },
  };
}

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children)];
}

function attribute(markup: string, name: string) {
  const value = markup.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  assert.ok(value, `Missing ${name}`);
  return value;
}

for (const [pathname, owner] of [["/bookings/booking-1", "/bookings"], ["/chat/thread-1", "/chat"], ["/notifications", "/notifications"]]) {
  test(`customer desktop/mobile navigation marks ${owner} active at ${pathname}`, () => {
    const tree = harness(pathname).render("components/customer-shell", "CustomerShell", { children: "content", name: "ชื่อ", email: "user@example.test" });
    const markup = renderToStaticMarkup(tree);
    const active = [...markup.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)];
    assert.equal(active.length, 2);
    assert.ok(active.every(([link]) => attribute(link, "href") === owner));
    assert.match(markup, /aria-label="เมนูลูกค้า"/);
    assert.match(markup, /aria-label="เมนูลูกค้าบนมือถือ"/);
    assert.match(markup, /data-compact="true"/);
  });
}

test("customer route segment boundaries do not activate similarly prefixed destinations", () => {
  const tree = harness("/bookings-archive").render("components/customer-shell", "CustomerShell", { name: "ชื่อ", email: "user@example.test" });
  assert.doesNotMatch(renderToStaticMarkup(tree), /aria-current=/);
});

for (const [pathname, owner] of [["/admin", "/admin"], ["/admin/rooms/room-1", "/admin/rooms"], ["/admin/bookings/booking-1", "/admin/bookings"]]) {
  test(`admin desktop/mobile navigation activates only ${owner} at ${pathname}`, () => {
    const tree = harness(pathname).render("components/admin-shell", "AdminShell", { name: "ผู้ดูแล", children: "content" });
    const markup = renderToStaticMarkup(tree);
    const active = [...markup.matchAll(/<a\b[^>]*aria-current="page"[^>]*>/g)];
    assert.equal(active.length, 2);
    assert.ok(active.every(([link]) => attribute(link, "href") === owner));
    assert.match(markup, /overflow-x-auto/);
    assert.match(markup, /data-compact="true"/);
  });
}

test("workspace identity stays fully available and shells preserve natural scrolling", () => {
  for (const [file, name] of [["components/customer-shell", "CustomerShell"], ["components/admin-shell", "AdminShell"]]) {
    const identity = "ชื่อผู้ใช้งานที่ยาวมาก".repeat(8);
    const tree = harness().render(file, name, { name: identity, email: "long-address@example.test", children: createElement("table", null, createElement("tbody", null, createElement("tr", null, createElement("td", null, "content")))) });
    const paragraphs = elements(tree).filter((element) => element.type === "p" && element.props.children === identity);
    assert.equal(paragraphs.length, 1);
    assert.doesNotMatch(String(paragraphs[0].props.className), /truncate|overflow-hidden/);
    assert.match(String(paragraphs[0].props.className), /break-words/);
    for (const element of elements(tree)) {
      assert.doesNotMatch(String(element.props.className), /(?:^|\s)(?:h-screen|h-dvh|overflow-hidden)(?:\s|$)/);
    }
  }
});

test("PasswordField masks initially, integrates FormField labels/hints and preserves caller attributes", () => {
  const tree = harness().render("components/ui/password-field", "PasswordField", { label: "รหัสผ่าน", name: "password", autoComplete: "current-password", hint: "คำแนะนำ", className: "custom-field", "aria-describedby": "external-help" });
  const markup = renderToStaticMarkup(tree);
  const input = markup.match(/<input\b[^>]*>/)![0];
  assert.equal(attribute(input, "type"), "password");
  assert.equal(attribute(input, "autoComplete"), "current-password");
  assert.equal(attribute(input, "name"), "password");
  assert.match(attribute(input, "class"), /pr-14/);
  assert.match(attribute(input, "class"), /custom-field/);
  const id = attribute(input, "id");
  assert.match(markup, new RegExp(`for="${id}"`));
  assert.equal(attribute(input, "aria-describedby"), `external-help ${id}-message`);
  assert.match(markup, new RegExp(`id="${id}-message"`));
  assert.match(markup, /aria-label="แสดงรหัสผ่าน"/);
});

test("PasswordField reveal toggles type and accessible state without submitting", () => {
  const instance = harness();
  const props = { id: "password", label: "รหัสผ่าน", autoComplete: "new-password" };
  let tree = instance.render("components/ui/password-field", "PasswordField", props);
  let button = elements(tree).find((element) => element.type === "button")!;
  assert.equal(button.props.type, "button");
  assert.equal(button.props["aria-pressed"], false);
  (button.props.onClick as () => void)();
  tree = instance.render("components/ui/password-field", "PasswordField", props);
  assert.equal(elements(tree).find((element) => element.type === FormField)?.props.type, "text");
  button = elements(tree).find((element) => element.type === "button")!;
  assert.equal(button.props["aria-label"], "ซ่อนรหัสผ่าน");
  assert.equal(button.props["aria-pressed"], true);
  (button.props.onClick as () => void)();
  tree = instance.render("components/ui/password-field", "PasswordField", props);
  assert.equal(elements(tree).find((element) => element.type === FormField)?.props.type, "password");
});

test("disabled PasswordField disables reveal and keeps error associations", () => {
  const tree = harness().render("components/ui/password-field", "PasswordField", { id: "password", label: "รหัสผ่าน", error: "ตรวจสอบรหัสผ่าน", hint: "คำแนะนำ", disabled: true });
  const markup = renderToStaticMarkup(tree);
  assert.match(markup.match(/<input\b[^>]*>/)![0], /disabled=""/);
  assert.match(markup.match(/<button\b[^>]*>/)![0], /disabled=""/);
  assert.equal(attribute(markup, "aria-invalid"), "true");
  assert.equal(attribute(markup, "aria-describedby"), "password-message");
  assert.match(markup, /id="password-message"[^>]*>ตรวจสอบรหัสผ่าน/);
  assert.doesNotMatch(markup, />คำแนะนำ</);
});

test("unread badge keeps a readable explicit surface and complete accessible count", () => {
  const tree = harness("/chat", 123).render("components/nav-count-badge", "NavCountBadge", { endpoint: "/api/v1/chat", mode: "chat" });
  const markup = renderToStaticMarkup(tree);
  assert.match(markup, /aria-label="123 รายการที่ยังไม่ได้อ่าน"/);
  assert.match(markup, />99\+</);
  assert.match(markup, /bg-white/);
  assert.match(markup, /text-\[var\(--ink\)\]/);
  assert.doesNotMatch(markup, /group-hover:/);
});

test("notification badge reads the existing paginated API items and hides empty/unexpected responses", async () => {
  for (const [response, count] of [
    [{ items: [{ readAt: null }, { readAt: "2026-10-13T12:00:00Z" }, { readAt: null }], total: 99, page: 1, pageSize: 10 }, 2],
    [{ items: [], total: 0, page: 1, pageSize: 10 }, 0],
    [{ items: [{ readAt: "2026-10-13T12:00:00Z" }] }, 0],
    [{ items: null }, 0],
  ] as const) {
    const instance = harness("/notifications", undefined, { __badge_response: response });
    const props = { endpoint: "/api/v1/notifications" };
    instance.render("components/nav-count-badge", "NavCountBadge", props);
    await instance.flushBadgeLoad();
    const tree = instance.render("components/nav-count-badge", "NavCountBadge", props);
    if (count) {
      assert.ok(tree, "Expected unread badge after paginated notification response");
      assert.equal(tree.props["aria-label"], `${count} รายการที่ยังไม่ได้อ่าน`);
    } else assert.equal(tree, null);
  }
});

test("badge adapter preserves chat and conversation unreadCount interpretation", async () => {
  for (const [mode, response, count] of [["chat", { unreadCount: 8 }, 8], ["conversations", [{ unreadCount: 2 }, { unreadCount: 3 }], 5]] as const) {
    const instance = harness("/chat", undefined, { __badge_response: response });
    const props = { endpoint: "/api/v1/chat", mode };
    instance.render("components/nav-count-badge", "NavCountBadge", props);
    await instance.flushBadgeLoad();
    assert.equal(instance.render("components/nav-count-badge", "NavCountBadge", props).props["aria-label"], `${count} รายการที่ยังไม่ได้อ่าน`);
  }
});

const paginatedRoutes = [
  ["app/bookings/page", "/bookings", "listUserBookingsPage", "@/server/bookings/service"],
  ["app/admin/payments/page", "/admin/payments", "listPendingPaymentsPage", "@/server/payments/service"],
  ["app/notifications/page", "/notifications", "listNotificationsPage", "@/server/notifications/service"],
  ["app/admin/notifications/page", "/admin/notifications", "listNotificationsPage", "@/server/notifications/service"],
] as const;

for (const [file, route, service, serviceModule] of paginatedRoutes) {
  test(`${route} server page sends only serializable props into paginated client boundary`, async () => {
    const fixture = { id: "fixture", bookingNumber: "TEST", roomName: "ห้องทดสอบ", startsAt: "2026-10-13T12:00:00Z", submittedAt: "2026-10-13T12:00:00Z", status: "CONFIRMED", totalAmount: 0, amount: 0 };
    const instance = harness(route, undefined, {
      "next/headers": { headers: async () => ({}) },
      "next/navigation": { redirect: () => { throw new Error("Unexpected redirect"); } },
      "@/server/auth/session": { getAppSession: async () => ({ user: { id: "fixture", name: "ทดสอบ", email: "fixture@example.test" } }), hasAdminRole: () => true },
      [serviceModule]: { [service]: async () => ({ items: [fixture], page: 1, pageSize: 10, total: 2 }) },
      "@/lib/presentation": { formatBangkokDateTime: () => "เวลา", formatThaiBaht: () => "0 บาท" },
      "@/features/payments/payment-review-actions": { PaymentReviewActions: () => null },
    });
    const tree = await instance.render(file, "default", { searchParams: Promise.resolve({}) });
    const boundary = elements(tree).find((element) => typeof element.type === "function" && ["Pagination", "NotificationList"].includes(element.type.name));
    assert.ok(boundary, "Missing real pagination/notification boundary");
    assert.equal(Object.values(boundary.props).some((value) => typeof value === "function"), false, "A plain server callback cannot cross a Client Component boundary, even for a single page");
    assert.equal(boundary.props.pageHrefPrefix, `${route}?page=`);
    assert.equal(boundary.props.page, 1);
    assert.equal(boundary.props.pageSize, 10);
    assert.equal(boundary.props.total, 2);
  });
}

test("serializable pagination link mode preserves previous, numbered and next URLs and boundaries", () => {
  for (const prefix of paginatedRoutes.map(([, route]) => `${route}?page=`)) {
    const tree = harness().render("components/ui/pagination", "Pagination", { page: 2, pageSize: 10, total: 25, pageHrefPrefix: prefix });
    const links = elements(tree).filter((element) => element.type === "a");
    assert.deepEqual(links.map((link) => link.props.href), [`${prefix}1`, `${prefix}1`, `${prefix}2`, `${prefix}3`, `${prefix}3`]);
    assert.equal(links[2].props["aria-current"], "page");
    const first = harness().render("components/ui/pagination", "Pagination", { page: 1, total: 25, pageHrefPrefix: prefix });
    const previous = elements(first).find((element) => element.props["aria-label"] === "หน้าก่อนหน้า")!;
    assert.equal(previous.props.href, undefined);
    assert.equal(previous.props["aria-disabled"], true);
    const last = harness().render("components/ui/pagination", "Pagination", { page: 3, total: 25, pageHrefPrefix: prefix });
    const next = elements(last).find((element) => element.props["aria-label"] === "หน้าถัดไป")!;
    assert.equal(next.props.href, undefined);
    assert.equal(next.props["aria-disabled"], true);
  }
});

test("client pagination keeps existing callbacks and NotificationList forwards its serializable URL prefix", () => {
  const selected: number[] = [];
  const tree = harness().render("components/ui/pagination", "Pagination", { page: 2, total: 25, onPageChange: (page: number) => selected.push(page) });
  const buttons = elements(tree).filter((element) => element.type === "button");
  for (const button of buttons) (button.props.onClick as () => void)();
  assert.deepEqual(selected, [1, 1, 2, 3, 3]);
  const notifications = harness().render("features/notifications/notification-list", "NotificationList", { initialItems: [{ id: "fixture", type: "SYSTEM", title: "ทดสอบ", body: "ข้อความ", readAt: null, createdAt: "2026-10-13T12:00:00Z" }], page: 2, total: 25, pageHrefPrefix: "/notifications?page=" });
  const pagination = elements(notifications).find((element) => typeof element.type === "function" && element.type.name === "Pagination")!;
  assert.equal(pagination.props.pageHrefPrefix, "/notifications?page=");
  assert.equal(pagination.props.page, 2);
  assert.equal(pagination.props.pageSize, 10);
});

test("React Flight serializes all four real server page boundaries and rejects the former callback contract", () => {
  const script = String.raw`
    const fs = require("node:fs");
    const vm = require("node:vm");
    const ts = require("typescript");
    const React = require("react");
    const Flight = require("next/dist/compiled/react-server-dom-turbopack/server.node");
    const routes = JSON.parse(fs.readFileSync(0, "utf8"));
    const Pagination = Flight.registerClientReference(() => {}, "fixture", "Pagination");
    const NotificationList = Flight.registerClientReference(() => {}, "fixture", "NotificationList");
    const bundlerConfig = { fixture: { id: "fixture", chunks: [], name: "*", async: false } };
    function elements(node) {
      if (Array.isArray(node)) return node.flatMap(elements);
      if (!React.isValidElement(node)) return [];
      return [node, ...elements(node.props.children)];
    }
    async function serialize(element) {
      const errors = [];
      const stream = await Flight.renderToReadableStream(element, bundlerConfig, { onError: error => { errors.push(error.message); } });
      const body = await new Response(stream).text();
      return { errors, body };
    }
    (async () => {
      const results = [];
      for (const [file, route, service, serviceModule] of routes) {
        const exports = {};
        const fixture = { id: "fixture", bookingNumber: "TEST", roomName: "ห้องทดสอบ", startsAt: "2026-10-13T12:00:00Z", submittedAt: "2026-10-13T12:00:00Z", status: "CONFIRMED", totalAmount: 0, amount: 0 };
        const compiled = ts.transpileModule(fs.readFileSync(file + ".tsx", "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText;
        vm.runInNewContext(compiled, { exports, require(name) {
          if (name === "next/headers") return { headers: async () => ({}) };
          if (name === "next/navigation") return { redirect: () => { throw new Error("Unexpected redirect"); } };
          if (name === "@/server/auth/session") return { getAppSession: async () => ({ user: { id: "fixture", name: "ทดสอบ", email: "fixture@example.test" } }), hasAdminRole: () => true };
          if (name === serviceModule) return { [service]: async () => ({ items: [fixture], page: 1, pageSize: 10, total: 2 }) };
          if (name === "@/lib/presentation") return { formatBangkokDateTime: () => "เวลา", formatThaiBaht: () => "0 บาท" };
          if (name === "@/components/ui/pagination") return { Pagination };
          if (name === "@/features/notifications/notification-list") return { NotificationList };
          if (name === "@/components/customer-shell") return { CustomerShell: () => null };
          if (name === "@/features/payments/payment-review-actions") return { PaymentReviewActions: () => null };
          if (name === "next/link") return { __esModule: true, default: "a" };
          return require(name);
        } });
        const tree = await exports.default({ searchParams: Promise.resolve({}) });
        const boundary = elements(tree).find(element => element.type === Pagination || element.type === NotificationList);
        if (!boundary) throw new Error("Missing client boundary " + route);
        const current = await serialize(boundary);
        const oldContract = await serialize(React.createElement(boundary.type, { ...boundary.props, pageHrefPrefix: undefined, hrefForPage: nextPage => route + "?page=" + nextPage }));
        results.push({ route, errors: current.errors, hasPrefix: current.body.includes(JSON.stringify(route + "?page=")), oldContractRejected: oldContract.errors.some(error => error.includes("Functions cannot be passed directly to Client Components")) });
      }
      process.stdout.write(JSON.stringify(results));
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync(process.execPath, ["--conditions=react-server", "-e", script], {
    input: JSON.stringify(paginatedRoutes), encoding: "utf8", timeout: 20_000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const outcomes = JSON.parse(result.stdout) as { route: string; errors: string[]; hasPrefix: boolean; oldContractRejected: boolean }[];
  assert.equal(outcomes.length, 4);
  for (const outcome of outcomes) {
    assert.deepEqual(outcome.errors, [], outcome.route);
    assert.equal(outcome.hasPrefix, true, outcome.route);
    assert.equal(outcome.oldContractRejected, true, outcome.route);
  }
});
