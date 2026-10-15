# SMT Studio UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the approved Cinematic Studio redesign and verified UI fixes without changing business logic.

**Architecture:** Extend existing shared components and CSS tokens, then finish public screens and workspace shells. Keep server/domain/API boundaries intact. Continue the partial implementation already present and review task-specific diffs against the saved pre-redesign working tree.

**Tech Stack:** Next.js 16.3.4 App Router, React 19.2.8, TypeScript, Tailwind CSS 4, Framer Motion, react-icons, native dialog/select/date/time controls.

**Spec:** `docs/superpowers/specs/2026-10-13-studio-ui-redesign.md`

## Global Constraints

- Preserve business logic, API payloads/endpoints, domain validation, pricing, booking/payment lifecycle, permissions, database schema and data.
- Do not edit `server/`, `db/`, `lib/`, `app/api/`, feature `*contracts.ts`, auth redirects or mutation semantics.
- Continue from the existing dirty checkout. Preserve pre-existing user changes; no commits, staging, resets, branch switches, migrations, account creation or external mutations.
- No new production dependencies. Use the existing Next.js 16.3.4, React 19, Tailwind 4, Framer Motion, react-icons and native dialog/select/date inputs.
- Native select/date/time popup ownership remains as documented in UX-CONTRACT.md.
- User-facing product copy remains Thai, with restrained existing English brand labels. Do not invent studio facts, availability or testimonials.
- Browser access was rejected. Do not bypass that rejection with another UI automation path. Report browser verification as unavailable.
- Read `AGENTS.md` and relevant installed Next.js docs before implementation. Apply both frontend-design and frontend-design-premium skills already chosen by the user.

## Review Focus

1. Keyboard users need a visible field focus indicator while ordinary fields retain the existing no-outline preference; Task 1 tests the field CSS rule and forced-colors fallback.
2. Form consumers without an ID or with extra ARIA description/className must retain correct associations; Task 1 renders the component to assert those outputs.
3. Hero pause/play and manual selection must not race or hide controls at narrow widths; Task 2 checks timer cleanup and layout boundaries; unavailable browser evidence is explicit.
4. Active navigation must match nested routes without matching all admin routes to overview; Task 3 checks exact and descendant matching.
5. Password reveal buttons must not overlap typed content or become enabled during submission; Task 3 tests markup and verifies auth request code against baseline.

## Execution and evidence

Use one implementation agent at a time, then a fresh task reviewer for spec and quality. A final independent reviewer examines the whole UI change. The controller owns plan/progress and verification aggregation; workers do not spawn helpers. Keep reports and review packages in this plan's `.superpowers/sdd/` workspace. Because changes are uncommitted, use full-context snapshot diffs rather than commit-range diffs. Preserve artifacts instead of deleting evidence which is not stored in Git.

## Existing partial work (do not repeat blindly)

- Shared tokens, brand mark, active link component and focus/scrollbar styles are present.
- Hero, search, room cards and room detail styling have been modified.
- Customer/admin shells and auth/password presentation have been modified.
- Lint/typecheck passed immediately after these edits.
- Full MJS test run: 10 passed, one focus-style test failed because its regex also matches button and forced-color outlines. No other observed MJS failures.
- DESIGN.md and UX-CONTRACT.md have not yet been reconciled; build and after-change browser QA are pending.

---

### Task 1: Finish shared UI foundations and design contracts

**Files:**
- Modify: `app/globals.css`, `components/brand-mark.tsx`, `components/ui/navigation-link.tsx`, `components/ui/form-field.tsx`, `components/ui/confirm-dialog.tsx`, `components/ui/status-banner.tsx` only if needed.
- Modify: `DESIGN.md`, `UX-CONTRACT.md`, `tests/focus-style.test.mjs`.
- Create: `tests/ui-primitives.test.ts`.

**Interfaces:**
- Produces: existing `BrandMark({ inverted?: boolean })`, `NavigationLink({ href: string, children: ReactNode, exact?: boolean, className?: string })` APIs.
- Preserves: `FormField(InputHTMLAttributes<HTMLInputElement> & { error?: string; hint?: string; label: string })`, `ConfirmDialog` existing callbacks/open/busy props.
- Produces: canonical `.studio-*` CSS classes already consumed by public and workspace screens; keep names stable.

- [x] Inspect partial changes and baseline. Identify concrete defects before editing; avoid unrelated changes.
- [x] Add rendering tests: `FormField` preserves caller className; supplied help IDs coexist with field error ID; omitted ID generates a label association; external aria-invalid is preserved; dialog title/description IDs resolve to rendered elements. Use React server rendering and Node assertions through existing tsx tooling.
- [x] Run focused tests and record any expected failures before fixes. The original baseline may be used for a red/green comparison without overwriting the live checkout.
- [x] Correct the focus-style test to inspect form-field rules specifically, assert border/box-shadow focus remains visible, and separately assert forced-colors fallback. Do not weaken the no-normal-outline preference or remove assertions to hide failure.
- [x] Review CSS cascade/layers, mobile class overrides, semantic colors, scrollbar baseline, dialog overflow/focus and shared component formatting. Fix demonstrated foundation issues.
- [x] Reconcile DESIGN.md to spec tokens and add explicit CSS-to-component token mapping. Document intentional drift: search no longer overlaps hero; room imagery is colored; carousel pause supported. Update UX canonical map for shared navigation/password fields and preserved native popup ownership; do not rewrite unrelated domain rules.
- [x] Run focused tests, `npm run lint`, `npm run typecheck`, strict Premium audit with saved JSON, and DESIGN.md lint if available. Report exact pass/fail/block status and no browser claims.
- [x] Write Task 1 report with files, tests, limitations and self-review. Leave changes uncommitted.

### Task 2: Finish public studio experience

**Files:**
- Modify: `app/page.tsx`, `app/rooms/page.tsx`, `app/rooms/[slug]/page.tsx`, `components/site-header.tsx`, `components/hero-carousel.tsx`, `components/availability-search.tsx`, `components/room-card.tsx`, `components/reveal.tsx` only if needed.
- Tests: existing `tests/hero-carousel.test.ts`, `tests/room-card-layout.test.mjs`, `tests/room-image-delivery-ui.test.mjs`; add `tests/public-ui.test.ts` only for meaningful regressions.

**Interfaces:**
- Consumes Task 1 tokens and BrandMark/NavigationLink with unchanged signatures.
- Preserves `HeroCarousel()`, `AvailabilitySearch()`, `RoomCard({ room: PublicRoomDto, index?: number })` and all room-service call arguments.
- Does not edit Task 1 files; report any cross-owner dependency to the controller.

- [x] Read Task 1 report, spec and current public components; use the previous snapshot to preserve query construction, price formatting and image delivery behavior.
- [x] Audit/fix carousel pause button focus interactions, autoplay cleanup, manual selection timer resets and reduced-motion behavior. Pause and play must have predictable semantics for mouse and keyboard.
- [x] Finish hero composition: legible Thai heading, music photography, stable contact-sheet controls, independent search panel, reachable CTA; no invented facts or decorative metrics.
- [x] Finish responsive header, room listing/card and detail gallery. Preserve four-column large-screen grid, colored 16:9 cards, status visibility and real data; address long room names without clipping controls.
- [x] Verify missing-date feedback focuses the input and preserves existing search URL fields/defaults. Do not implement new availability rules or change server contracts.
- [x] Add a focused regression test for any remaining functional UI fix, run it against the failing case and then the corrected code. Keep existing hero/room tests passing.
- [x] Run targeted tests, lint/typecheck and save a report describing exact checks plus desktop/mobile layout reasoning. Browser screenshots remain blocked and must not be claimed.
- [x] Write Task 2 report; leave changes uncommitted.

### Task 3: Finish customer/admin/auth surfaces and integrated verification

**Files:**
- Modify: `components/customer-shell.tsx`, `components/admin-shell.tsx`, `components/auth-shell.tsx`, `components/nav-count-badge.tsx`, `components/ui/password-field.tsx`, `features/auth/login-form.tsx`, `features/auth/register-form.tsx`.
- Runtime boundary fix: `components/ui/pagination.tsx`, `features/notifications/notification-list.tsx`, `app/bookings/page.tsx`, `app/admin/payments/page.tsx`, `app/notifications/page.tsx`, `app/admin/notifications/page.tsx`; add boundary regressions in `tests/workspace-ui.test.ts`. Preserve all pagination URLs, metadata, query/service arguments and notification fetch/mark-read behavior.
- Optional presentation-only: `app/admin/page.tsx`, `app/bookings/page.tsx` when needed to align existing hierarchy with shared shells.
- Modify: `package.json` test script only, to run all `tests/*.test.mjs` alongside existing TS tests; no dependency/version changes.
- Create: `tests/workspace-ui.test.ts` and `docs/superpowers/reports/2026-10-13-studio-ui-verification.md`.

**Interfaces:**
- Consumes Task 1 shared tokens/navigation/field contracts and Task 2 public layout.
- Preserves all auth function calls, callbacks, redirects, endpoint strings and payloads.
- `PasswordField(props: Omit<ComponentProps<typeof FormField>, "type">)` remains masked initially, retains autocomplete/error/hint props and disables reveal when the field is disabled.

- [x] Inspect shells and auth changes against baseline; fix consistency, markup formatting, mobile reachability and semantic names without changing auth or mutation behavior.
- [x] Verify desktop and mobile customer navigation both use NavigationLink; admin overview uses exact match while nested routes match their owner. Add tests for the matching cases if a pure helper is appropriate, otherwise use a focused component test with explicit route context.
- [x] Verify password markup is masked, labelled, padded and disabled correctly. Test FormField integration, including hint/error associations. Keep existing auth policy tests untouched.
- [x] Fix shared-shell-specific readability problems (dark badge contrast, mobile logout, long names, table overflow) through existing primitives. Do not alter feature workflows.
- [x] Fix the runtime Server-to-Client function serialization error observed in dev logs for pagination and notification list; add a regression that exercises the boundary and retain client pagination callbacks. This user-reported runtime issue was missed by typecheck/unit-only verification.
- [x] Correct NavCountBadge decoding of the existing paginated notification response (`data.items`) and test read/unread/empty results; preserve endpoints, polling and the same readAt-based counting semantics. No total-unread feature or API change.
- [x] Change npm test to include all MJS tests, run all tests once, and report skipped database integration tests explicitly.
- [x] Run `npm run lint`, `npm run typecheck`, `npm run build`, strict Premium audit, `git diff --check`, and compare every protected-file hash in `/tmp/smt-ui-before-20261013/protected-hashes.json`. No protected file may differ.
- [x] If localhost is available, perform read-only HTTP page/asset checks, using command escalation for sandbox network restrictions. Do not dump personal data, credentials or env values. HTTP is not browser QA.
- [x] Save integrated verification report with changed areas, all exact outcomes, browser permission limitation and any remaining source-confirmed issues outside scope.
- [x] Write Task 3 report; leave changes uncommitted for final controller review.

### Final review and handoff (controller)

- [ ] Gather task reports and full-context UI diff against the pre-redesign snapshot, including new files and documentation.
- [ ] Dispatch a fresh final reviewer to assess design consistency, UI correctness and business-logic preservation.
- [ ] Dispatch one consolidated fix task if needed, then obtain a scoped re-review.
- [ ] Update task checkboxes and verification report. Preserve report artifacts, do not commit or publish.
- [ ] Deliver concise Thai summary, plan/report links, actual test/build outcomes and explicit missing browser verification.
