# SMT Studio Testable MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build all customer and admin MVP flows with matching premium UI and real APIs.

**Architecture:** Extend the existing Next.js modular monolith one vertical slice at a time. UI consumes typed contracts; Route Handlers authorize and delegate; services enforce policy; repositories own SQL and Supabase adapters own Storage/Realtime.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Better Auth, Drizzle, PostgreSQL, Supabase Storage/Realtime, Zod.

**Spec:** `docs/superpowers/specs/2026-09-08-testable-mvp-design.md`

## Global Constraints

- Asia/Bangkok, THB, 24-hour operation, 30-minute slots, 60-minute minimum.
- Cancellation cutoff is 12 hours.
- Better Auth owns identity; Supabase Auth is not used.
- Manual slip verification only.
- Audiowide wordmark and Chakra Petch content typography.
- Server owns authorization, availability, pricing, discount and state transitions.

---

### Task 1: Foundation and Authentication

**Files:** `components/ui/*`, `components/app-shell.tsx`, `features/auth/*`, `server/auth/*`, `app/login/*`, `app/register/*`, `app/profile/*`, `app/api/v1/profile/*`

**Produces:** shared UI primitives, safe auth forms, session/role helpers, customer/admin shells and profile API.

- [x] Write focused validation/authorization tests and observe failure.
- [-] Implement primitives and typed API client.
- [x] Implement Register/Login/Logout/Profile UI and API.
- [x] Implement session and admin role guards.
- [ ] Verify typecheck, focused tests and browser states.

### Task 2: Availability, Quote, Promo and Booking

**Files:** `server/availability/*`, `server/pricing/*`, `server/bookings/*`, `features/booking/*`, `app/booking/new/*`, `app/bookings/*`, `app/api/v1/rooms/*/availability/*`, `app/api/v1/booking-quotes/*`, `app/api/v1/bookings/*`

**Produces:** authoritative availability, deterministic quotes, idempotent booking creation/history/detail/cancellation.

- [x] Test slot, overlap, crossing-midnight, money and promo policies first.
- [x] Implement availability and quote APIs.
- [x] Implement booking transaction and customer wizard.
- [x] Implement history/detail/cancellation.
- [ ] Verify concurrent conflict and ownership behavior.

### Task 3: Manual Payment

**Files:** `server/payments/*`, `server/integrations/storage/*`, `features/payments/*`, `app/api/v1/bookings/*/payment-upload-intents/*`, `app/api/v1/payments/*`

**Produces:** signed upload, confirmation, retry, admin review and refund status flow.

- [x] Test MIME/size/state/duplicate guards first.
- [x] Implement signed upload and confirmation.
- [x] Add customer payment UI.
- [x] Add admin approve/reject/refund UI and APIs.
- [ ] Verify private access and terminal-state guards.

### Task 4: Chat and Notifications

**Files:** `server/chat/*`, `server/notifications/*`, `features/chat/*`, `app/chat/*`, `app/notifications/*`, `app/api/v1/chat/*`, `app/api/v1/notifications/*`

**Produces:** one support conversation per user, messages, unread/read cursor, notifications and polling/realtime refresh.

- [ ] Test ownership, cursor and duplicate delivery behavior first.
- [x] Implement APIs and customer UI.
- [x] Implement Admin inbox/reply.
- [-] Add polling fallback and Realtime adapter (polling complete; private Realtime pending).
- [ ] Verify reconnect and unread states.

### Task 5: Admin Operations and Audit

**Files:** `app/admin/*`, `server/admin/*`, `server/reports/*`, `server/activity-logs/*`, `app/api/v1/admin/*`

**Produces:** catalog CRUD, dashboard, calendar, bookings, payments, users, reports, settings and read-only audit log.

- [ ] Test role, mutation audit and report inclusion rules first.
- [x] Implement Room, Equipment and Add-on catalog management with signed room-image upload.
- [x] Implement Promo Code lifecycle, room scope, limits and Admin UI/API.
- [ ] Implement admin shell and shared tables/forms/dialogs.
- [ ] Implement catalog and operations APIs/screens.
- [ ] Implement reports/settings/activity log.
- [ ] Run strict design audit, typecheck, focused tests and production build.
