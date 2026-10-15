# Horizon Music UX Contract

## Product context

- Audience: ลูกค้าห้องซ้อมและทีม Admin ของ Horizon Music
- Primary jobs: ค้นหา/จอง/ชำระเงิน และบริหาร catalog/operations จากระบบเดียว
- Target market and locale: ไทย, `th-TH`
- Timezone/calendar: Gregorian calendar, `Asia/Bangkok`; เก็บ instant เป็น UTC
- Accessibility target: WCAG 2.2 AA

## Business-context sources

| Domain | Source | Reviewed |
| --- | --- | --- |
| Permission and role | `CONTEXT.md`, `ARCHITECTURE.md` | 2026-09-08 |
| Lifecycle, soft-delete and audit | `RULES.md`, `SCHEMA.md` | 2026-09-08 |
| Booking and payment | `RULES.md`, `CONTEXT.md` | 2026-09-08 |
| API boundaries | `ARCHITECTURE.md` | 2026-09-08 |

## Visual contract

- `DESIGN.md` owns visual intent; `app/globals.css` owns runtime tokens and mirrors its approved values.
- Supported theme: light product surfaces; Admin uses the same surfaces inside a black operational shell.
- Prompt owns Thai and English typography throughout the public, customer, auth and Admin interfaces.

## Canonical UI Map

| Capability | Canonical owner | Allowed variants | Verification |
| --- | --- | --- | --- |
| Select/Listbox | Native `select` through catalog field styles | Native popup accepted | keyboard + narrow viewport |
| Date/time | Native `datetime-local` + explicit Bangkok conversion | Native popup accepted | timezone unit + browser |
| Form | Feature contract parser + `FormField`/catalog field components | create/edit | unit + flow |
| Password field | `PasswordField` composing `FormField` | masked by default; disabled reveal follows field | rendering + keyboard |
| Brand | `BrandMark` | light / inverted | rendering + sibling comparison |
| Navigation | `NavigationLink` + customer/admin shells | exact Admin overview; nested detail active; desktop/mobile | route semantics + browser |
| Scrollbar | `app/globals.css` | stable-gutter exceptions | static + browser |
| Status feedback | `StatusBanner` live region | success/info/error | lint + flow |
| Confirmation | `ConfirmDialog`, app-owned native `dialog` wrapper | archive/danger; native modal focus management | rendering + keyboard + focus |
| CRUD | `/api/v1/admin/*` + feature manager | stay in owning list | API + flow |

## Dataset and flow behavior

- Admin operational lists are server-bounded. Current MVP page size is 100; server pagination is required before exceeding that operational bound.
- Search is local only over the bounded result, clears immediately, and always includes an explicit clear control.
- Create/edit stays in the owning list, refreshes canonical server data and shows persistent inline success feedback.
- Mutations are pessimistic, disable duplicate submission and preserve entered values after recoverable errors.
- Archive is reversible soft-delete, requires an app-owned confirmation, disappears from the active list and writes Activity Log.
- Hard-delete is not exposed.

## Navigation and responsive behavior

- Document titles use `{Page} — Horizon Music` when route metadata is added.
- Admin sidebar becomes a horizontal scrollable route list on narrow screens.
- Customer sidebar becomes bottom navigation on narrow screens; active destinations and logout remain reachable.
- Shared navigation marks the active destination with `aria-current="page"`; Admin overview uses exact matching and customer detail routes keep their owning section active.
- Tables retain horizontal scrolling when comparison matters; independent catalog records may use responsive cards.
- Shell remains usable on route errors and authorization redirects to an allowed surface.

## Validation and resilience

- Product forms use `noValidate`; server validation is authoritative and client parser provides matching early feedback.
- Errors appear in a form-level banner and beside the affected field when available.
- `FormField` retains caller classes and ARIA attributes, generates unique IDs when omitted, and combines supplied help IDs with its rendered error/hint association.
- `PasswordField` reserves room for a keyboard-accessible Thai show/hide control and respects disabled fields; authentication requests and redirects keep their existing semantics.
- Native `select`, `date`, `time`, and `datetime-local` popups remain browser/OS-owned: popup locale, geometry and interaction are accepted platform behavior, not app-authored UI. Closed-control styling does not claim ownership of the open popup.
- A 401 returns to login through the established auth flow; a 403 never relies on hidden UI as authorization.
- Failed writes retain form state and expose retry. Background refetch never clears an open form.
- Secrets, raw database errors and private payloads never appear in UI feedback or Activity Log snapshots.

## Verification

- Static: `next typegen`, TypeScript, ESLint, focused policy tests, `git diff --check`.
- Premium audit: bundled `audit_project.py --mode strict`; findings outside the touched workflow are reported separately.
- Browser coverage is required before production release for create/edit/archive, upload, keyboard dialog flow and narrow viewport.
