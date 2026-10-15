import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { isValidElement, type ReactElement } from "react";
import ts from "typescript";

type Element = ReactElement<Record<string, unknown>>;
const require = createRequire(import.meta.url);
function harness(file: string, name: string) {
  const slots: unknown[] = [];
  const effects = new Map<number, { deps: unknown[]; cleanup?: () => void }>();
  const timeouts = new Map<number, () => void>();
  const intervals = new Map<number, () => void>();
  const calls: { method: string; body?: string; signal?: AbortSignal }[] = [];
  const listeners = new Map<string, (event: unknown) => void>();
  let cursor = 0;
  let timerId = 0;
  let failSend = false;
  let pendingEffects: (() => void)[] = [];
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value: unknown) => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useId: () => "support-chat",
    useCallback(callback: unknown, deps: unknown[]) {
      const index = cursor++;
      const old = slots[index] as { callback: unknown; deps: unknown[] } | undefined;
      if (old && deps.every((value, i) => Object.is(value, old.deps[i]))) return old.callback;
      slots[index] = { callback, deps };
      return callback;
    },
    useEffect(callback: () => (() => void) | undefined, deps: unknown[]) {
      const index = cursor++;
      const old = effects.get(index);
      if (old && deps.every((value, i) => Object.is(value, old.deps[i]))) return;
      old?.cleanup?.();
      pendingEffects.push(() => effects.set(index, { deps, cleanup: callback() }));
    },
  };
  const compiled = ts.transpileModule(readFileSync(new URL(file, import.meta.url), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports: Record<string, (props: Record<string, unknown>) => Element | null> = {};
  runInNewContext(compiled, {
    exports, AbortController,
    window: {
      setTimeout: (callback: () => void) => { timeouts.set(++timerId, callback); return timerId; },
      clearTimeout: (id: number) => timeouts.delete(id),
      setInterval: (callback: () => void, delay: number) => { assert.equal(delay, 5000); intervals.set(++timerId, callback); return timerId; },
      clearInterval: (id: number) => intervals.delete(id),
    },
    document: {
      addEventListener: (name: string, callback: (event: unknown) => void) => listeners.set(name, callback),
      removeEventListener: (name: string) => listeners.delete(name),
    },
    fetch: async (url: string, options: { method?: string; body?: string; signal?: AbortSignal } = {}) => {
      assert.equal(url, "/api/v1/chat");
      const method = options.method ?? "GET";
      calls.push({ method, body: options.body, signal: options.signal });
      return {
        ok: method !== "POST" || !failSend,
        json: async () => method === "GET" ? { data: { messages: [{ id: "admin-message", body: "สวัสดีครับ", senderUserId: "admin", senderName: "Operator", createdAt: "2026-10-13T00:00:00Z" }] } } : failSend ? { error: { message: "ส่งไม่สำเร็จ" } } : { data: { id: "sent-message" } },
      };
    },
    require: (id: string) => id === "react" ? hooks : id === "next/navigation" ? { usePathname: () => "/" } : id === "next/link" ? { __esModule: true, default: "a" } : id === "@/features/chat/chat-panel" ? { ChatPanel: "ChatPanel" } : require(id),
  });
  return {
    render(props: Record<string, unknown>) {
      cursor = 0;
      pendingEffects = [];
      const tree = exports[name](props);
      pendingEffects.forEach((effect) => effect());
      return tree;
    },
    start() { for (const [id, callback] of timeouts) { timeouts.delete(id); callback(); } },
    failSend() { failSend = true; },
    succeedSend() { failSend = false; },
    calls, intervals, listeners,
  };
}
function nodes(root: unknown): Element[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!isValidElement(root)) return [];
  const element = root as Element;
  return [element, ...nodes(element.props.children)];
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test("widget opens inline and minimizes without unmounting its conversation on public pages", () => {
  const h = harness("../features/chat/floating-support-chat.tsx", "FloatingSupportChat");
  const props = { currentUserId: "customer" };
  assert.equal(nodes(h.render(props)).some((node) => node.type === "ChatPanel"), false);
  const button = nodes(h.render(props)).find((node) => node.props["aria-haspopup"] === "dialog")!;
  (button.props.onClick as () => void)();
  let chat = nodes(h.render(props)).find((node) => node.type === "ChatPanel")!;
  assert.equal(chat.props.endpoint, "/api/v1/chat");
  assert.equal(chat.props.active, true);
  (chat.props.onClose as () => void)();
  chat = nodes(h.render(props)).find((node) => node.type === "ChatPanel")!;
  assert.equal(chat.props.active, false);
  assert.equal(chat.key, "customer");
});

test("anonymous widget prompts sign-in on the same page instead of starting an anonymous conversation", () => {
  const h = harness("../features/chat/floating-support-chat.tsx", "FloatingSupportChat");
  const props = { currentUserId: null };
  const button = nodes(h.render(props)).find((node) => node.props["aria-haspopup"] === "dialog")!;
  (button.props.onClick as () => void)();
  const tree = nodes(h.render(props));
  assert.equal(tree.some((node) => node.type === "ChatPanel"), false);
  assert.equal(tree.find((node) => node.type === "a")?.props.href, "/login?callbackUrl=%2F");
});

test("minimized chat keeps its draft and stops polling/read updates until reopened", async () => {
  const h = harness("../features/chat/chat-panel.tsx", "ChatPanel");
  const props = { currentUserId: "customer", endpoint: "/api/v1/chat", compact: true, active: false };
  h.render(props); h.start(); await flush();
  assert.equal(h.calls.length, 0);
  let tree = nodes(h.render({ ...props, active: true }));
  h.start(); await flush();
  assert.equal(h.intervals.size, 1);
  assert.ok(h.calls.some((call) => call.method === "PUT"));
  const textarea = tree.find((node) => node.type === "textarea")!;
  (textarea.props.onChange as (event: unknown) => void)({ target: { value: "ข้อความร่าง" } });
  tree = nodes(h.render(props));
  assert.equal(tree.find((node) => node.type === "textarea")?.props.value, "ข้อความร่าง");
  assert.equal(h.intervals.size, 0);
  const count = h.calls.length;
  h.start(); await flush();
  assert.equal(h.calls.length, count);
});

test("closing during a history request aborts it without marking unseen messages read", async () => {
  const h = harness("../features/chat/chat-panel.tsx", "ChatPanel");
  const props = { currentUserId: "customer", endpoint: "/api/v1/chat", compact: true };
  h.render(props);
  h.start();
  h.render({ ...props, active: false });
  await flush();
  assert.equal(h.calls[0].signal?.aborted, true);
  assert.equal(h.calls.some((call) => call.method === "PUT"), false);
});

test("sending uses the existing endpoint, keeps failed drafts and clears successful drafts", async () => {
  const h = harness("../features/chat/chat-panel.tsx", "ChatPanel");
  const props = { currentUserId: "customer", endpoint: "/api/v1/chat", compact: true };
  let tree = nodes(h.render(props)); h.start(); await flush();
  (tree.find((node) => node.type === "textarea")!.props.onChange as (event: unknown) => void)({ target: { value: " hello " } });
  h.failSend();
  tree = nodes(h.render(props));
  await (tree.find((node) => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault() {} });
  tree = nodes(h.render(props));
  assert.equal(tree.find((node) => node.type === "textarea")?.props.value, " hello ");
  assert.ok(tree.some((node) => node.props.role === "alert"));
  assert.equal(h.calls.find((call) => call.method === "POST")?.body, '{"body":"hello"}');
  h.succeedSend();
  await (tree.find((node) => node.type === "form")!.props.onSubmit as (event: unknown) => Promise<void>)({ preventDefault() {} });
  tree = nodes(h.render(props));
  assert.equal(tree.find((node) => node.type === "textarea")?.props.value, "");
  let submitted = 0;
  const keyDown = tree.find((node) => node.type === "textarea")!.props.onKeyDown as (event: unknown) => void;
  keyDown({ key: "Enter", shiftKey: false, nativeEvent: { isComposing: true }, preventDefault() {}, currentTarget: { form: { requestSubmit() { submitted++; } } } });
  assert.equal(submitted, 0);
});
