# SMT Studio UI verification — 2026-10-13

## Scope and result

The approved redesign covers shared tokens/fields/navigation/dialogs, the public cinematic hero/search/room presentation, and customer/admin/auth shells. Runtime tokens stay in `app/globals.css`; `DESIGN.md` and `UX-CONTRACT.md` record the same design and behavior contracts. All changes remain uncommitted in the existing dirty checkout.

Task 3 keeps desktop/mobile navigation on `NavigationLink`, exact Admin overview matching, reachable mobile logout, full wrapping for long account names/emails, explicit badge contrast, and initially masked password fields with accessible reveal controls and preserved FormField hint/error associations. Auth submit buttons consume the shared button recipe. No auth submit behavior changed.

The user's reported red Runtime Error was confirmed in the development log: plain `hrefForPage` callbacks crossed Server → Client Component boundaries. The minimal fix replaces those callbacks with serializable `pageHrefPrefix` strings in Pagination/NotificationList and all four affected server pages: `/bookings`, `/admin/payments`, `/notifications`, `/admin/notifications`. URL construction remains inside the client component. Existing URLs, page/pageSize/total values, client `onPageChange` handlers, fetch/mutation bodies and redirects retain their behavior.

The notification badge also had a verified UI decoding error: the existing GET returns `data.items`, while the badge treated `data` as an array. The adapter now reads `items` and counts the returned unread entries exactly as before. Endpoint, polling timing, chat/conversation interpretation and returned-list counting policy remain unchanged.

## Verification evidence

Evidence directory: [SDD artifacts](../../../.superpowers/sdd/2026-10-13-studio-ui-redesign/).

| Check | Exact outcome | Evidence |
| --- | --- | --- |
| Focused workspace/component/Flight checks | 21 passed, 0 failed after the final badge fix | `task-3-badge-green.log` |
| Regression RED: identity wrapping | Before the wrapping fix, 11 passed and 1 failed: customer name used `truncate` without full-value access | Focused tool output retained in task execution |
| Regression RED: server/client boundary | Before the prefix fix, 12 passed and 6 failed across four real server page props, URL rendering and NotificationList forwarding | `task-3-boundary-red.log` |
| Actual React Flight serialization | Installed Next React Flight successfully serializes the four real server page boundaries with synthetic session/service data. The old callback graph is a positive control that emits the user's exact error | Included in workspace suite |
| Regression RED: badge payload | Before the adapter fix, 20 passed and 1 failed: the notification badge remained null after receiving paginated unread items | `task-3-badge-red.log` |
| Final complete `npm test` | Exit 0: 13 MJS + 81 TS = 94 passed, 4 database integration tests skipped, 0 failed | `final-controller-tests.log` |
| `npm run lint` | Exit 0, no errors or warnings | `task-3-lint.log` |
| `npm run typecheck` | Exit 0, no diagnostics | `task-3-typecheck.log` |
| Strict Premium audit | Exit 0; 0 errors, violations, warnings or unresolved findings | `task-3-premium-audit.json` |
| Default `npm run build` | Blocked by the environment. Sandboxed run could not fetch configured Google fonts; escalated Turbopack run failed binding its CSS worker port with EPERM | `task-3-build.log`, `task-3-build-escalated.log` and controller evidence |
| Supported `npm run build -- --webpack` fallback | Final post-badge build exit 0; compiled in 4.3s, TypeScript in 1573ms, generated 42/42 static pages, completed route collection/build traces, no errors or warnings | `final-controller-build.log` |
| Official DESIGN.md lint | Controller ran `npx -p @google/design.md designmd lint DESIGN.md`: exit 0, 0 errors, 11 orphan-token warnings and 1 informational finding. All 13 color tokens matched canonical CSS/frontmatter | Controller verified evidence |
| `git diff --check` | Exit 0 | Fresh check after final source edits |
| Formatting | No formatter command is configured in package.json; ESLint and whitespace checks passed | Package scripts and lint output |
| Protected files | 83/83 SHA-256 hashes match the pre-redesign snapshot; 0 differences | `task-3-preservation.json` |
| Auth/mutation preservation | Both auth `submit` function bodies and notification `markRead` body are AST-equivalent to baseline. All 3 feature contracts are byte-identical. Package change is test-script-only | `task-3-preservation.json` |
| Read-only HTTP | `/`, `/rooms`, `/login`, `/register`, emitted CSS and hero photograph returned 200. Four unauthenticated workspace URLs returned the expected 307 login redirects. No callback-boundary error or unexpected error shell | `task-3-http.json` |

The complete test script now runs every `tests/*.test.mjs` and every existing `tests/*.test.ts`. Database integration skips remain explicit: pending-payment approval, already-reviewed payment conflict, Admin activity/calendar reads, and public/admin read services. No database integration or account creation was performed.

HTTP checks used no credentials and did not exercise authenticated content. An initial HTTP heuristic mistakenly treated Next's `__next_error__` redirect shell as an error; the classifier was corrected to recognize expected 307 login redirects. This required no application change.

## Limits and preserved issues

Computer Use rejected browser access with `Computer Use was not approved to use Brave Browser`. No alternative browser automation was used. Visual/mobile rendering, screenshots, keyboard DOM interaction, screen-reader output, native popups, dialog focus management, and real authenticated create/edit/archive/upload/auth workflows remain unverified. Component handler/markup tests, React Flight tests and HTTP checks do not replace browser QA.

The tests use synthetic session/service results when invoking real server pages; React Flight is real, but these are not authenticated browser or live-database checks. The serialization regression is verified at the framework boundary that produced the user's error.

Source-confirmed behavior outside the approved presentation/boundary correction: NotificationList background refresh still requests the existing first-page notifications endpoint while retaining the page's existing pagination metadata. That pre-existing polling workflow remains unchanged. Badge counts intentionally remain counts of the returned items rather than an invented total-unread policy. Database skips and the default Turbopack environment restriction remain release-validation limitations.

No server/database/API/lib files, schema, account data, dependency versions, auth policies, pricing or booking/payment lifecycle were changed. No staging, commit, branch operation or publishing was performed.
