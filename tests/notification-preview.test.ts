import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { isValidElement, type ReactElement } from "react";
import ts from "typescript";

type Element = ReactElement<Record<string, unknown>>;
const require = createRequire(import.meta.url);

function harness() {
  const slots: unknown[] = [];
  const effects = new Map<number, { deps: unknown[]; cleanup?: () => void }>();
  const listeners = new Map<string, (event: unknown) => void>();
  const requests: { url: string; signal: AbortSignal }[] = [];
  let cursor = 0;
  let response: { ok: boolean; data?: { items: unknown[] } } = {
    ok: true,
    data: { items: Array.from({ length: 8 }, (_, index) => ({
      id: String(index), title: `Notification ${index}`, body: "Details",
      readAt: null, createdAt: "2026-10-13T00:00:00Z",
    })) },
  };
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next: unknown) => { slots[index] = next; }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useId: () => "notifications-preview",
    useEffect(callback: () => (() => void) | undefined, deps: unknown[]) {
      const index = cursor++;
      const previous = effects.get(index);
      if (previous && deps.every((value, i) => Object.is(value, previous.deps[i]))) return;
      previous?.cleanup?.();
      effects.set(index, { deps, cleanup: callback() });
    },
  };
  const source = readFileSync(new URL("../components/notification-preview.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports: { NotificationPreview?: () => Element } = {};
  runInNewContext(compiled, {
    exports, AbortController, Intl,
    document: {
      addEventListener: (name: string, callback: (event: unknown) => void) => listeners.set(name, callback),
      removeEventListener: (name: string) => listeners.delete(name),
    },
    fetch: async (url: string, options: { signal: AbortSignal }) => {
      requests.push({ url, signal: options.signal });
      return { ok: response.ok, json: async () => ({ data: response.data }) };
    },
    require: (id: string) => id === "react" ? hooks : id === "next/link" ? { __esModule: true, default: "a" } : require(id),
  });
  return {
    render() { cursor = 0; return exports.NotificationPreview!(); },
    requests, listeners,
    fail() { response = { ok: false }; },
  };
}

function nodes(root: unknown): Element[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!isValidElement(root)) return [];
  const element = root as Element;
  return [element, ...nodes(element.props.children)];
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function click(element: Element) { (element.props.onClick as () => void)(); }

test("bell opens the latest five records without navigation; See more owns the full-page link", async () => {
  const h = harness();
  const initial = nodes(h.render());
  assert.equal(h.requests.length, 0);
  const bell = initial.find((node) => node.props["aria-label"] === "การแจ้งเตือน")!;
  assert.equal(bell.type, "button");
  click(bell);
  await flush();
  const opened = nodes(h.render());
  assert.equal(h.requests[0].url, "/api/v1/notifications?page=1&pageSize=5");
  assert.equal(opened.filter((node) => node.type === "li").length, 5);
  const more = opened.find((node) => node.type === "a")!;
  assert.equal(more.props.href, "/notifications");
  assert.equal(more.props.children, "See more");
  click(more);
  assert.equal(h.requests[0].signal.aborted, true);
  assert.equal(nodes(h.render()).some((node) => node.type === "section"), false);
});

test("failed fetch can retry and Escape closes the preview and cancels its request", async () => {
  const h = harness();
  h.fail();
  click(nodes(h.render()).find((node) => node.type === "button")!);
  await flush();
  const failed = nodes(h.render());
  assert.ok(failed.some((node) => node.props.role === "alert"));
  click(failed.find((node) => node.type === "button" && node.props.children === "ลองอีกครั้ง")!);
  await flush();
  h.render();
  assert.equal(h.requests.length, 2);
  h.listeners.get("keydown")!({ key: "Escape" });
  assert.equal(h.requests[1].signal.aborted, true);
  assert.equal(nodes(h.render()).some((node) => node.type === "section"), false);
});
