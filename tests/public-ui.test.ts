import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { isValidElement, type ReactElement } from "react";
import ts from "typescript";

type Element = ReactElement<Record<string, unknown>>;
type Effect = { dependencies: unknown[]; cleanup?: () => void };
const require = createRequire(import.meta.url);

// Runs the real component handlers/effects with deterministic hooks and timers.
// This is deliberately a unit harness, not DOM or browser interaction coverage.
function componentHarness(
  file: string,
  exportName: string,
  reducedMotion = false,
) {
  const slots: unknown[] = [];
  const effects = new Map<number, Effect>();
  const timers = new Map<number, () => void>();
  const destinations: string[] = [];
  let cursor = 0;
  let timerId = 0;
  let focusCount = 0;
  const hooks = {
    useState(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value: unknown) => {
          slots[index] =
            typeof value === "function" ? value(slots[index]) : value;
        },
      ];
    },
    useRef(initial: unknown) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useId() {
      return `field-${cursor++}`;
    },
    useEffect(
      callback: () => (() => void) | undefined,
      dependencies: unknown[],
    ) {
      const index = cursor++;
      const previous = effects.get(index);
      if (
        previous &&
        dependencies.every((value, index) =>
          Object.is(value, previous.dependencies[index]),
        )
      )
        return;
      previous?.cleanup?.();
      effects.set(index, { dependencies, cleanup: callback() });
    },
  };
  const source = readFileSync(new URL(file, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText;
  const exports: Record<string, () => Element> = {};
  runInNewContext(compiled, {
    exports,
    URLSearchParams,
    window: {
      setTimeout(callback: () => void, delay: number) {
        assert.equal(delay, 3000);
        timers.set(++timerId, callback);
        return timerId;
      },
      clearTimeout(id: number) {
        timers.delete(id);
      },
    },
    require(name: string) {
      if (name === "react") return hooks;
      // This harness tests search values; DOM text sizing belongs to ContentSelect.
      if (name === "@/components/ui/content-select")
        return { ContentSelect: "select" };
      if (name === "framer-motion")
        return {
          useReducedMotion: () => reducedMotion,
          AnimatePresence: "presence",
          motion: { div: "div", span: "span" },
        };
      if (name === "next/navigation")
        return {
          useRouter: () => ({ push: (url: string) => destinations.push(url) }),
        };
      if (name === "next/image" || name === "next/link")
        return {
          __esModule: true,
          default: name === "next/image" ? "img" : "a",
        };
      if (name === "@/components/hero-carousel-state")
        return require("../components/hero-carousel-state");
      return require(name);
    },
  });
  return {
    timers,
    destinations,
    get focusCount() {
      return focusCount;
    },
    render() {
      cursor = 0;
      const tree = exports[exportName]();
      for (const element of elements(tree)) {
        if (element.props.type === "date" && element.props.ref) {
          (element.props.ref as { current: unknown }).current = {
            focus: () => focusCount++,
          };
        }
      }
      return tree;
    },
    advance() {
      for (const [id, callback] of [...timers]) {
        timers.delete(id);
        callback();
      }
    },
    unmount() {
      for (const effect of effects.values()) effect.cleanup?.();
    },
  };
}

function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!isValidElement<Record<string, unknown>>(node)) return [];
  return [node, ...elements(node.props.children)];
}

function labeled(tree: Element, label: string) {
  const element = elements(tree).find(
    (element) => element.props["aria-label"] === label,
  );
  assert.ok(element, `Missing control: ${label}`);
  return element;
}

function event(element: Element, name: string, argument: unknown = {}) {
  const handler = element.props[name];
  if (typeof handler === "function") handler(argument);
}

test("hero rotates every three seconds, wraps, has no slideshow controls, and clears timers", () => {
  const harness = componentHarness("../components/hero-carousel.tsx", "HeroCarousel");
  let tree = harness.render();
  assert.equal(harness.timers.size, 1);
  assert.equal(elements(tree).filter((element) => element.type === "button").length, 0);
  for (const src of ["/picture/concert.jpg", "/picture/concert2.jpg", "/picture/guitar1.jpg"]) {
    harness.advance();
    tree = harness.render();
    assert.equal(elements(tree).find((element) => element.props.src)?.props.src, src);
    assert.equal(harness.timers.size, 1);
  }
  harness.unmount();
  assert.equal(harness.timers.size, 0);
});

test("reduced motion shows a static hero without autoplay or controls", () => {
  const harness = componentHarness("../components/hero-carousel.tsx", "HeroCarousel", true);
  const tree = harness.render();
  assert.equal(harness.timers.size, 0);
  assert.equal(elements(tree).filter((element) => element.type === "button").length, 0);
  assert.equal(elements(tree).find((element) => element.props.src)?.props.src, "/picture/guitar1.jpg");
});

test("missing date focuses the date field and valid search preserves default and selected URL values", () => {
  const harness = componentHarness(
    "../components/availability-search.tsx",
    "AvailabilitySearch",
  );
  let tree = harness.render();
  const submit = () => event(tree, "onSubmit", { preventDefault() {} });
  submit();
  tree = harness.render();
  const date = labeled(tree, "วันที่จอง");
  assert.equal(harness.focusCount, 1);
  assert.equal(harness.destinations.length, 0);
  assert.equal(date.props["aria-invalid"], true);
  assert.ok(
    elements(tree).find(
      (element) =>
        element.props.id === date.props["aria-describedby"] &&
        element.props.children,
    ),
  );
  event(date, "onChange", { target: { value: "2026-10-20" } });
  tree = harness.render();
  assert.equal(labeled(tree, "วันที่จอง").props["aria-invalid"], false);
  submit();
  assert.equal(
    harness.destinations[0],
    "/rooms?date=2026-10-20&time=18%3A00&duration=120",
  );
  event(labeled(tree, "เวลาเริ่ม"), "onChange", { target: { value: "20:30" } });
  const selects = elements(tree).filter((element) => element.type === "select");
  event(selects[0], "onChange", { target: { value: "RECORDING" } });
  event(selects[1], "onChange", { target: { value: "180" } });
  tree = harness.render();
  submit();
  assert.equal(
    harness.destinations[1],
    "/rooms?date=2026-10-20&time=20%3A30&duration=180&type=RECORDING",
  );
});
