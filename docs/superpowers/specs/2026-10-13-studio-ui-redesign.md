# SMT Studio UI redesign — approved scope

The user approved the Cinematic Studio direction, instructed implementation, then requested a full Superpowers plan executed by subagents. This continues the current work; it does not restart the redesign.

## Outcome

Make the existing Thai rehearsal/recording studio website, customer workspace and admin workspace more beautiful, readable and consistent. Fix verified presentation and interaction defects while preserving all business logic.

## Binding boundaries

- Preserve business logic, API payloads/endpoints, domain validation, pricing, booking/payment lifecycle, permissions, database schema and data.
- Do not edit `server/`, `db/`, `lib/`, `app/api/`, feature `*contracts.ts`, auth redirects or mutation semantics.
- Continue from the existing dirty checkout. Preserve pre-existing user changes; no commits, staging, resets, branch switches, migrations, account creation or external mutations.
- UI behavior may change for accessibility, responsive layout, error presentation, carousel controls and active navigation.
- Do not change authentication request behavior or fix partial-registration business flow in this task.
- No new production dependencies. Use the existing Next.js 16.3.4, React 19, Tailwind 4, Framer Motion, react-icons and native dialog/select/date inputs.
- Native select/date/time popup ownership remains as documented in UX-CONTRACT.md.
- User-facing product copy remains Thai, with restrained existing English brand labels. Do not invent studio facts, availability or testimonials.

## Design

Cinematic photography is the signature: a disciplined studio contact sheet with a legible left-aligned Thai headline and a dedicated lower control strip. Search follows the hero in normal flow, without covering content. Cards and room galleries retain real image colors. Product screens are quiet, compact workspaces.

Canonical runtime token owner: `app/globals.css`; DESIGN.md mirrors these exact tokens:

| Role | Value |
| --- | --- |
| canvas | #e9ece8 |
| ink/primary | #181b1a |
| panel | #f7f8f5 |
| surface | #ffffff |
| line | #dce1da |
| muted | #646b65 |
| success | #5add9a |
| focus | #356b50 |

Audiowide remains wordmark-only. Chakra Petch owns Thai headings, body and controls. Shell radius 2.25rem, panel 1.75rem, control 1rem. Green is semantic availability/success/focus, not general decoration.

## Shared interface requirements

- BrandMark and NavigationLink are canonical owners; active links work for exact admin overview and nested customer detail routes.
- Customer desktop/sidebar and mobile/bottom navigation both expose active state. Mobile logout stays reachable. Badges stay legible on light and dark surfaces.
- Admin desktop/sidebar and mobile/scrolling navigation use the same destinations and active semantics. Shared shells keep natural document scrolling and do not impose table height on forms.
- FormField preserves caller className and ARIA attributes, supplies unique IDs when omitted, associates errors/hints correctly and has visible field focus without normal-mode input outlines.
- PasswordField remains masked by default, reserves space for an accessible reveal button and respects disabled state; login/registration requests stay unchanged.
- ConfirmDialog has accessible title/description, native modal focus behavior, reachable actions in short viewports and generic busy wording. No mutation behavior changes.
- Global scrollbar colors and visible focus work across owned surfaces, with forced-colors and reduced-motion support.

## Public flow requirements

- Hero text, CTA, carousel thumbnails and controls never overlap search. Thumbnails have stable geometry.
- Carousel can pause, respects reduced motion, pauses on focus and hover, and manual selection does not immediately auto-advance.
- Empty-date search reports an inline correction and focuses the date input, with no new date/time business rules.
- Room cards retain 16:9 colored images and four columns on large screens. Preserve price formatting and image delivery behavior.
- Public error feedback must not introduce false availability/business promises.

## Verification and limitations

Run lint, typecheck, all existing TS and MJS tests, production build, strict Premium audit, DESIGN.md lint, whitespace checks and a protected-file hash comparison. Add focused tests for real UI regressions, not snapshots that merely repeat implementation.

Initial baseline: lint/typecheck passed; 55 tests passed, 4 DB integration tests skipped. The old `focus-style.test.mjs` regex bans every focus outline despite its field-specific title; scope its assertion to actual form-field styling while verifying a visible keyboard focus indicator.

Browser baseline was inspected, but subsequent Computer Use returned `Computer Use was not approved to use Brave Browser`. Do not bypass that rejection with another UI automation path. Browser interaction, mobile rendering, popup and screenshot QA remain explicitly unverified unless the user restores permission. HTTP checks and component rendering tests are permitted engineering checks, not substitutes for browser evidence.

Baseline copy: `/tmp/smt-ui-before-20261013`; protected hashes: `/tmp/smt-ui-before-20261013/protected-hashes.json`. Compare to this snapshot rather than HEAD, because much of the user's application is untracked.
