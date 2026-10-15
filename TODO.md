# Implementation Roadmap

เอกสารนี้เป็น backlog ระดับระบบ งานถูกแยกเป็น Frontend, API/Backend, Database และ Infrastructure อย่างชัดเจน แต่ควรส่งมอบตาม Milestone เพื่อให้แต่ละ vertical slice ทดสอบได้ครบตั้งแต่ UI ถึง database

## Status Legend

- `[ ]` ยังไม่เริ่ม
- `[-]` กำลังทำ
- `[x]` เสร็จและผ่าน Definition of Done
- Requirement อ้างอิงด้วย `(FR-xx)`

## Documentation Baseline

- [x] กำหนด Product Context และ FR-01–FR-47 ใน `CONTEXT.md`
- [x] กำหนด Business/Engineering Rules ใน `RULES.md`
- [x] กำหนด Frontend/API/Domain/Infrastructure architecture ใน `ARCHITECTURE.md`
- [x] กำหนด target schema, constraints, Storage และ Realtime ใน `SCHEMA.md`
- [ ] Review และอนุมัติเอกสารชุดนี้ก่อนเริ่ม implementation
- [ ] สร้าง implementation plan แบบ task-by-task สำหรับ Milestone 1

---

# Workstream A — Frontend

## A1. Frontend Foundation

- [ ] วาง route groups `(public)`, `(customer)` และ `admin`
- [x] สร้าง design tokens, typography, spacing, color และ responsive breakpoints
- [-] สร้าง UI primitives: Button, Input, Select, Dialog, Drawer, Table, Badge, Alert, Toast, Skeleton และ Empty State
- [x] สร้าง App Shell แยก Public/Customer/Admin
- [ ] เพิ่ม Thai copy conventions, THB formatter และ Asia/Bangkok date-time formatter
- [ ] สร้าง typed API client ที่รองรับ error contract, request ID, auth failure และ abort signal
- [ ] วาง loading/error/not-found boundary ตาม route
- [ ] ตรวจ keyboard navigation, label, focus state, contrast และ reduced motion
- [ ] เพิ่ม component tests สำหรับ primitives และ shells

## A2. Public and Room Discovery

- [x] สร้าง Landing page จาก asset ที่มี พร้อม responsive images/alt text (FR-05)
- [x] สร้าง Room List พร้อม filter ประเภท/สถานะและ pagination (FR-05)
- [x] สร้าง Room Detail พร้อม gallery, ราคา, ความจุ, รายละเอียด และอุปกรณ์ (FR-06, FR-07)
- [x] สร้าง Availability picker แบบ 24 ชั่วโมง รองรับข้ามวันและ slot 30 นาที (FR-08, FR-11)
- [ ] แสดง `UNAVAILABLE`/`MAINTENANCE` และ Room Block อย่างชัดเจน (FR-08, FR-29)
- [ ] ทดสอบ public pages บน mobile/tablet/desktop

## A3. Authentication and Profile

- [x] สร้าง Register form: first name, last name, email, phone, password/confirm (FR-01)
- [x] สร้าง Login form และแสดง auth errors แบบไม่เปิดเผยว่า email มีจริงหรือไม่ (FR-02, FR-26)
- [x] สร้าง Logout action และ session-expired state (FR-03)
- [x] สร้าง Customer Profile view/edit form (FR-04)
- [x] สร้าง navigation guard/redirect เพื่อ UX โดยไม่ถือเป็น authorization boundary
- [x] สร้าง Admin shell ที่แสดงเฉพาะเมื่อ session role เป็น `admin` (FR-26)
- [ ] ทดสอบ validation, loading, error, keyboard และ session expiry

## A4. Booking and Discount

- [x] สร้าง Booking wizard: room -> date/time -> duration -> Add-ons -> Promo -> review (FR-09, FR-12, FR-14)
- [x] Refetch availability/quote เมื่อ input เปลี่ยนและก่อน submit (FR-08, FR-10, FR-13)
- [x] แสดง price breakdown: room, Add-ons, subtotal, discount, total (FR-13, FR-14, FR-46)
- [x] สร้าง Promo Code input พร้อมข้อความ expired/ineligible/quota/room scope (FR-45, FR-46)
- [x] ส่ง idempotency key และป้องกัน double submit (FR-09, FR-10)
- [ ] แสดง Booking conflict พร้อมทางเลือกช่วงเวลาใหม่ (FR-10)
- [-] สร้าง Booking History พร้อม status filter และ pagination (FR-18)
- [x] สร้าง Booking Detail พร้อม snapshot, Payment และ status timeline (FR-19)
- [x] สร้าง Cancellation confirmation แสดง cutoff 12 ชั่วโมงและ refund implication (FR-20)
- [ ] ทดสอบ crossing-midnight, slot boundary, conflict, Promo และ cancellation states

## A5. Manual Payment

- [x] สร้าง Payment instructions และยอดที่ต้องโอน (FR-15)
- [x] สร้าง slip upload สำหรับ JPEG/PNG/PDF สูงสุด 10 MB พร้อม progress/error (FR-15)
- [x] ยืนยัน upload intent แล้วแสดง Payment attempt/status (FR-15, FR-16)
- [ ] เปิดให้ส่งสลิปใหม่เมื่อ attempt `FAILED` และ Booking ยังไม่หมดอายุ (FR-16)
- [ ] แสดงสถานะ `REFUND_PENDING`/`REFUNDED` บน Booking detail (FR-16, FR-20)
- [ ] ทดสอบ invalid MIME, oversize, expired intent และ retry

## A6. Customer Chat and Notifications

- [ ] สร้าง Support Conversation history ด้วย cursor pagination (FR-21, FR-23)
- [x] สร้าง composer ข้อความ text สูงสุด 2,000 ตัวอักษร (FR-22)
- [x] แสดง unread count/read cursor (FR-24)
- [ ] เชื่อม private Realtime channel และ refetch เมื่อรับ event (FR-25)
- [x] ทำ polling fallback ทุก 5 วินาทีเมื่อ Realtime ยังไม่พร้อม (FR-25)
- [x] สร้าง Notification list/badge/mark read (FR-43)
- [ ] ทดสอบ event ซ้ำ, out-of-order, reconnect และ unread

## A7. Admin Operations

- [ ] Dashboard cards/charts พร้อม date range (FR-27, FR-41, FR-42)
- [-] Room CRUD/archive/publish/status/image/block UI (CRUD/archive/publish/status/image upload เสร็จ; Room Block คงเหลือ) (FR-28, FR-29, FR-33)
- [x] Equipment CRUD/archive และ Room assignment UI (FR-30, FR-31)
- [x] Add-on CRUD/archive/pricing UI (FR-32)
- [x] Promo Code CRUD/activate/archive/room scope/limits UI (FR-45)
- [ ] Booking table/detail พร้อม search/filter/status actions (FR-34, FR-35, FR-39)
- [ ] Booking calendar แยกห้อง แสดง Booking/Block และ timezone ชัดเจน (FR-40)
- [ ] Payment review queue, secure slip preview, approve/reject/refund UI (FR-36)
- [ ] User list/detail แบบ read-only ใน MVP (FR-37)
- [-] Conversation inbox, unread filter และ reply UI (inbox/search/reply เสร็จ; unread filter คงเหลือ) (FR-38)
- [ ] Revenue/Booking Statistics report และ export ที่ไม่เปิดข้อมูลเกินจำเป็น (FR-41, FR-42)
- [x] Admin Notification badge/list (FR-44)
- [ ] Activity Log list/detail/filter โดยไม่มี edit/delete action (FR-47)
- [ ] Booking policy setting UI พร้อม validation/version conflict (FR-11, FR-20)
- [ ] ทดสอบทุก destructive/privileged action ด้วย confirmation และ reason field

---

# Workstream B — API and Backend

## B1. Server Foundation

- [ ] ติดตั้ง Better Auth, Drizzle, PostgreSQL driver, Supabase JS, Zod และ test dependencies
- [x] สร้าง env validation และแยก browser/server variables
- [x] สร้าง `server-only` boundaries, dependency structure และ shared actor context
- [-] สร้าง request ID, response helpers, pagination contract และ error mapper
- [ ] สร้าง domain error catalog ตาม `ARCHITECTURE.md`
- [ ] เพิ่ม structured operational logger พร้อม redaction
- [ ] เพิ่ม rate-limit interface/store สำหรับ auth, booking, upload และ chat
- [ ] เพิ่ม scripts: typecheck, unit, integration, e2e, db generate/migrate/seed

## B2. Better Auth and Authorization

- [x] ตั้ง Better Auth email/password + Drizzle adapter provider `pg` (FR-01–FR-03)
- [x] Mount handler ที่ `/api/auth/[...all]` (FR-01–FR-03, FR-26)
- [x] เปิด Admin plugin roles `user`/`admin`; default สมัครใหม่เป็น `user` (FR-26)
- [ ] สร้าง first-admin runbook ด้วย Better Auth CLI (FR-26)
- [x] สร้าง Profile lifecycle/sync กับ Better Auth user (FR-01, FR-04)
- [-] สร้าง session/role/ownership authorization helpers (FR-04, FR-26, FR-37)
- [ ] เพิ่ม rate limit และ email-enumeration-safe auth responses
- [ ] สร้าง auth hooks สำหรับ Activity Log โดย redact sensitive data (FR-47)
- [ ] เขียน unit/integration tests สำหรับ register/login/logout/session/role/ownership

## B3. Room, Equipment and Add-on APIs

- [x] `GET /api/v1/rooms` และ `/rooms/:slug` พร้อม public DTO (FR-05–FR-07)
- [ ] Availability query/service รวม status, blocks และ active Booking (FR-08)
- [x] Admin Room CRUD/archive/publish/status (FR-28, FR-29, FR-33)
- [-] Admin Room image upload/delete/reorder service (signed upload เสร็จ; delete/reorder คงเหลือ) (FR-28)
- [ ] Admin Room Block CRUD พร้อมตรวจ Booking ที่ได้รับผลกระทบ (FR-29, FR-40)
- [x] Admin Equipment CRUD/archive และ assignment (FR-30, FR-31)
- [x] Admin Add-on CRUD/archive/pricing (FR-32)
- [-] เพิ่ม authorization, validation, Audit และ cache invalidation ทุก mutation (Catalog mutations ครบ; โมดูล Admin อื่นคงเหลือ) (FR-47)
- [ ] เขียน contract/integration tests

## B4. Pricing, Promo and Booking APIs

- [ ] สร้าง decimal money utilities และ deterministic rounding (FR-13)
- [ ] สร้าง Pricing service รองรับ room + `FIXED`/`PER_HOUR`/`PER_UNIT` Add-ons (FR-12, FR-13)
- [ ] สร้าง Promo eligibility/calculation policy (FR-45, FR-46)
- [ ] `POST /api/v1/booking-quotes` โดยไม่ reserve ห้อง/Promo (FR-08, FR-13, FR-14)
- [ ] Booking create transaction: idempotency, overlap, snapshots, Promo reserve, history, Audit และ Notification (FR-09–FR-14, FR-43, FR-47)
- [ ] Booking history/detail API ตรวจ ownership (FR-18, FR-19)
- [ ] Cancellation service cutoff 12 ชั่วโมง + Promo/refund branches (FR-20)
- [ ] Admin booking search/filter/detail/status/cancel APIs (FR-34, FR-35, FR-39)
- [ ] Calendar query รวม Booking และ Room Block (FR-40)
- [x] Promo Admin CRUD/activate/archive/room scope APIs (FR-45)
- [ ] Expire Booking use case แบบ idempotent (FR-17)
- [ ] ทดสอบ concurrent Booking, idempotency payload mismatch, Promo quota และ status transitions

## B5. Manual Payment APIs

- [ ] สร้าง upload-intent service ตรวจ ownership/state/MIME/size/path (FR-15)
- [ ] สร้าง signed upload URL ผ่าน server integration (FR-15)
- [ ] Confirm upload โดยตรวจ deadline/object metadata/SHA-256 uniqueness แล้วสร้าง Payment `PENDING` (FR-15, FR-16)
- [x] Admin Payment queue/detail และ signed download URL อายุสั้น (FR-36)
- [x] Approve transaction: Payment paid + Booking confirmed + Promo applied + history/audit/notification (FR-16, FR-17, FR-36, FR-43, FR-47)
- [ ] รองรับสลิปรอตรวจของ Booking ที่ถูกยกเลิก: valid -> refund pending, invalid -> failed โดยไม่ Confirm Booking (FR-16, FR-20, FR-36)
- [x] Reject transaction พร้อม reason และ resubmission flow (FR-16, FR-36)
- [x] Refund pending/refunded service พร้อม reference (FR-16, FR-20, FR-36, FR-41)
- [ ] ป้องกัน approve ซ้ำ/approve Booking terminal ด้วย status guard
- [ ] เขียน authorization, storage failure, retry และ atomicity tests

## B6. Chat, Notification and Realtime APIs

- [x] Get-or-create Support Conversation หนึ่งรายการ/User (FR-21)
- [ ] Message send/list service + cursor pagination (FR-22, FR-23)
- [x] Read cursor/unread queries ที่ cursor ถอยหลังไม่ได้ (FR-24)
- [ ] Admin conversation list/filter/reply/close (FR-38)
- [x] Notification create/list/mark read service (FR-43, FR-44)
- [ ] Realtime token endpoint หลัง Better Auth session/role check (FR-25, FR-43, FR-44)
- [ ] Broadcast adapter ที่ส่งเฉพาะ event ID/type/version หลัง DB commit
- [ ] เพิ่ม retry/outbox ก่อน production หาก delivery metric ต้องการ guarantee สูงขึ้น
- [ ] เขียน tests สำหรับ ownership, unread, pagination, duplicate event และ broadcast failure

## B7. Dashboard, Reports and Audit APIs

- [ ] Dashboard aggregate query พร้อม date range/timezone (FR-27)
- [ ] Revenue report: gross received, refunded, net received และ pending refund breakdown (FR-41)
- [ ] Booking count, popular rooms, usage hours/utilization queries (FR-42)
- [ ] Activity Log append service + centralized redaction (FR-47)
- [ ] Activity Log Admin list/detail/filter read-only API (FR-47)
- [ ] ตรวจ query performance และเพิ่ม indexes/materialization เมื่อมีหลักฐาน
- [ ] ทดสอบ timezone boundary, status inclusion, refund และ data privacy

---

# Workstream C — Database

## C1. Database Foundation

- [ ] สร้าง Supabase project แยก development/staging/production
- [ ] ตั้ง runtime pooler URL และ direct migration URL
- [ ] ติดตั้ง/configure Drizzle schema และ migration tooling
- [ ] เปิด PostgreSQL extensions `citext`, `btree_gist` และ extension อื่นเมื่อมีเหตุผล
- [ ] Generate/review Better Auth core + Admin plugin schema
- [ ] สร้าง application DB role/privilege ตาม least privilege
- [ ] ตั้ง backup/PITR ตาม Supabase plan และทดสอบ restore runbook ก่อน production

## C2. Core Schemas and Migrations

- [ ] Migration: Better Auth tables + Admin fields (FR-01–FR-03, FR-26)
- [ ] Migration: `user_profiles` one-to-one (FR-01, FR-04)
- [ ] Migration: rooms, images, equipment, room equipment, blocks, Add-ons (FR-05–FR-08, FR-28–FR-33)
- [ ] Migration: bookings, booking Add-ons, status history (FR-09–FR-20, FR-34–FR-40)
- [ ] Migration: Promo codes, room scope, redemptions (FR-45, FR-46)
- [ ] Migration: upload intents and payments (FR-15, FR-16, FR-36, FR-41)
- [ ] Migration: conversations, messages, read states (FR-21–FR-25, FR-38)
- [ ] Migration: notifications (FR-43, FR-44)
- [ ] Migration: system settings และ seed booking/payment policy
- [ ] Migration: append-only Activity Logs + application privilege (FR-47)

## C3. Constraints and Indexes

- [ ] เพิ่ม check constraints สำหรับ duration, money, dates, quantity และ snapshots
- [ ] เพิ่ม Booking partial exclusion constraint `[startsAt, endsAt)` (FR-10)
- [ ] เพิ่ม unique `(userId, idempotencyKey)` และ payload hash (FR-09, FR-10)
- [ ] เพิ่ม unique Promo per Booking + indexes สำหรับ total/per-user quota (FR-45, FR-46)
- [ ] เพิ่ม partial unique settled Payment per Booking (FR-16)
- [ ] เพิ่ม cursor/list/calendar/report indexes ตาม `SCHEMA.md`
- [ ] ทดสอบ concurrent inserts จริงกับ PostgreSQL
- [ ] ใช้ `EXPLAIN (ANALYZE, BUFFERS)` กับ query สำคัญบนข้อมูลจำลองขนาดสมจริง

## C4. Database Security and Realtime RLS

- [ ] ปิด/deny direct Data API access ของ business tables สำหรับ browser roles
- [ ] Import/configure asymmetric signing key ที่ใช้กับ custom Realtime JWT
- [ ] ปิด Supabase Realtime public channel access
- [ ] สร้าง `realtime.messages` SELECT policies สำหรับ conversation/User/Admin topics
- [ ] จำกัด policy ที่ Broadcast extension และทดสอบ cross-user denial
- [ ] ตรวจ key rotation/revocation runbook
- [ ] ยืนยัน application role ไม่มี UPDATE/DELETE ที่ `activity_logs`

## C5. Seeds and Test Data

- [ ] Seed system settings ค่า 24h/60m/30m/12h/30m payment due
- [ ] Seed development rooms, equipment, Add-ons และ Promo examples
- [ ] สร้าง fixture Users/Admin ผ่าน supported Better Auth flow ไม่ insert password hash เอง
- [ ] สร้าง booking/payment/chat fixtures ครอบคลุมทุกสถานะ
- [ ] ห้าม seed production secret, real PII หรือ real payment slip

---

# Workstream D — Infrastructure, Storage and Quality

## D1. Supabase Storage

- [-] สร้าง `room-images` bucket และ Admin-only write policy/integration (FR-06, FR-28)
- [x] สร้าง private `payment-slips` bucket (FR-15, FR-36)
- [x] กำหนด MIME/size/path และ `upsert = false`
- [ ] สร้าง signed upload/download URL flows
- [ ] สร้าง orphan upload cleanup job แบบ dry-run/test ก่อนเปิดลบจริง
- [ ] ทดสอบว่า public URL ใช้กับสลิปไม่ได้และ signed URL หมดอายุ

## D2. Realtime

- [ ] สร้าง/เก็บ asymmetric private key ใน secret manager
- [ ] ทำ short-lived JWT mint/refresh/revoke behavior
- [ ] สร้าง private topics `conversation:<id>`, `user:<id>`, `admin:operations`
- [ ] ทดสอบ RLS allow/deny สำหรับ User เจ้าของ, User อื่น และ Admin
- [ ] ทำ reconnect/backoff/refetch/polling fallback
- [ ] เก็บ metrics connection, join denial และ broadcast failure
- [ ] ประเมิน transactional outbox ก่อน production launch

## D3. Scheduled Jobs

- [ ] ตั้ง expire pending Booking ทุก 1–5 นาที โดยไม่หมดอายุรายการที่มี Payment `PENDING` รอตรวจ (FR-17)
- [ ] Job ต้องเปลี่ยน Booking, Promo, history, Notification และ Audit แบบ idempotent
- [ ] ตั้ง orphan payment upload cleanup
- [ ] เพิ่ม job lock, retry, timeout, alert และ manual rerun command
- [ ] ทดสอบ clock/timezone boundary และ job ทำซ้ำ

## D4. Security Hardening

- [ ] Secret scan และยืนยัน `.env*` ไม่ถูก commit
- [ ] ตั้ง secure headers/CSP และ trusted origins
- [ ] Rate limit register/login, quote/booking, upload/token และ chat
- [ ] Validate file MIME/size/object metadata และป้องกัน path traversal
- [ ] ทบทวน CSRF/session cookie/host configuration ตาม Better Auth
- [ ] สร้าง authorization matrix tests ทุก resource
- [ ] Redact structured log/Audit และทดสอบ password/token/cookie/signed URL ไม่หลุด
- [ ] Dependency/license/vulnerability scan
- [ ] Threat-model Booking race, Promo abuse, slip reuse, IDOR, role escalation และ Realtime topic guessing

## D5. Test and CI

- [ ] ตั้ง Vitest + Testing Library
- [ ] ตั้ง isolated PostgreSQL integration test environment
- [ ] ตั้ง Playwright E2E พร้อม User/Admin fixtures
- [ ] CI: lint, typecheck, unit, integration, build และ E2E smoke
- [ ] เพิ่ม migration-from-empty และ migration-upgrade tests
- [ ] เพิ่ม concurrent Booking/Promo tests
- [ ] เพิ่ม accessibility checks สำหรับ critical pages
- [ ] เก็บ test artifact/screenshot/trace เมื่อ E2E ล้ม

## D6. Observability and Operations

- [ ] Structured logger + request ID propagation
- [ ] Error monitoring พร้อม source maps ที่ไม่ expose แก่ Client
- [ ] Metrics/alerts: API error/latency, conflict rate, Payment queue age, job/realtime/storage failures
- [ ] Admin operations runbook: Payment review, refund, Room maintenance และ Booking incident
- [ ] Backup/restore, key rotation และ incident response runbooks
- [ ] กำหนด production retention สำหรับ Payment slip, Chat และ Activity Log
- [ ] สร้าง privacy/data access process ตามนโยบายธุรกิจ

## D7. Deployment

- [ ] สร้าง staging environment และ preview-safe configuration
- [ ] ตั้ง Vercel/hosting env โดยแยก browser/server secrets
- [ ] กำหนด migration-before-deploy และ rollback/forward-fix strategy
- [ ] Smoke tests หลัง deploy: auth, room list, quote, booking, upload, admin review, chat
- [ ] ตั้ง custom domain, HTTPS, Better Auth trusted origin และ Supabase allowed origins
- [ ] Production readiness review ก่อนเปิด User จริง

---

# Milestones

## Milestone 1 — Foundation and Auth

ขอบเขต: A1, A3, B1, B2, C1, auth/profile ส่วน C2, D4/D5 ขั้นพื้นฐาน

Exit criteria:

- [ ] Register/login/logout/profile ใช้งานผ่าน Better Auth (FR-01–FR-04)
- [ ] Admin/User role และ ownership tests ผ่าน (FR-26, FR-37)
- [ ] Frontend/API/Domain/Repository boundaries ถูก enforce
- [ ] CI lint/typecheck/test/build ผ่าน

## Milestone 2 — Rooms and Catalog

ขอบเขต: A2, B3, room/catalog C2–C3, room-images D1

Exit criteria:

- [ ] Visitor ดูห้อง รายละเอียด อุปกรณ์ และ availability ได้ (FR-05–FR-08)
- [ ] Admin จัดการห้อง สถานะ Block อุปกรณ์ Add-on และราคาได้ (FR-28–FR-33)
- [ ] ทุก Admin mutation มี Activity Log (FR-47)

## Milestone 3 — Booking, Pricing and Discount

ขอบเขต: A4, B4, booking/promo C2–C3, expiry D3

Exit criteria:

- [ ] Quote/Booking/History/Detail/Cancel ทำงาน (FR-09–FR-20)
- [ ] Concurrent overlap test ยืนยันว่ามี Booking สำเร็จเพียงหนึ่งรายการ (FR-10)
- [ ] Promo ทุกเงื่อนไข/quota/snapshot ผ่าน tests (FR-45, FR-46)
- [ ] Booking ยอดสุทธิ 0 Confirm โดยไม่สร้าง Payment และยังใช้ Promo quota ถูกต้อง
- [ ] Admin search/calendar/status พร้อมใช้งาน (FR-34, FR-35, FR-39, FR-40)

## Milestone 4 — Manual Payment

ขอบเขต: A5, B5, payment C2–C3, payment-slips D1

Exit criteria:

- [ ] User upload/retry และเห็น Payment status ได้ (FR-15, FR-16)
- [ ] Admin ดู signed slip, approve/reject/refund ได้ (FR-36)
- [ ] Payment approval เปลี่ยน Booking/Promo/Audit/Notification แบบ atomic
- [ ] สลิปไม่สามารถเปิดเป็น public URL

## Milestone 5 — Chat and Notifications

ขอบเขต: A6, B6, chat/notification C2, C4, D2

Exit criteria:

- [ ] User/Admin Chat history/send/unread ทำงาน (FR-21–FR-24, FR-38)
- [ ] Private Realtime update และ fallback ทำงาน (FR-25)
- [ ] User/Admin notifications ครบ event สำคัญ (FR-43, FR-44)
- [ ] Cross-user channel/resource access ถูกปฏิเสธ

## Milestone 6 — Admin Reports and Production Readiness

ขอบเขต: A7 ที่เหลือ, B7, D4–D7

Exit criteria:

- [ ] Dashboard/revenue/statistics ตรงกับ source transactions (FR-27, FR-41, FR-42)
- [ ] Activity Log ค้นหาได้และ immutable (FR-47)
- [ ] Security, performance, accessibility, backup/restore และ operations review ผ่าน
- [ ] Critical E2E journeys และ production smoke tests ผ่าน

---

# Requirement Traceability

| Requirements | Primary tasks | Milestone |
| --- | --- | --- |
| FR-01–FR-04 | A3, B2, C2 | 1 |
| FR-05–FR-08 | A2, B3, C2–C3 | 2 |
| FR-09–FR-14 | A4, B4, C2–C3 | 3 |
| FR-15–FR-16 | A5, B5, C2–C3, D1 | 4 |
| FR-17–FR-20 | A4–A5, B4–B5, D3 | 3–4 |
| FR-21–FR-25 | A6, B6, C2/C4, D2 | 5 |
| FR-26–FR-27 | A3/A7, B2/B7 | 1, 6 |
| FR-28–FR-33 | A7, B3, C2–C3, D1 | 2 |
| FR-34–FR-40 | A7, B4–B5, C2–C3 | 3–4 |
| FR-41–FR-42 | A7, B7, C3 | 6 |
| FR-43–FR-44 | A6, B4–B6, C2/C4, D2 | 3–5 |
| FR-45–FR-46 | A4/A7, B4, C2–C3 | 3 |
| FR-47 | ทุก Admin/business mutation, B7, C2/C4, D4/D6 | 1–6 |

# Definition of Done

Checklist ต่อ feature:

- [ ] Requirement และ acceptance scenario ชัดเจน
- [ ] UI ครบ loading/empty/error/success/responsive/accessibility
- [ ] API contract มี validation, stable errors และ request ID
- [ ] Session, role และ ownership ตรวจฝั่ง server
- [ ] Business rule อยู่ application/domain service
- [ ] Schema migration, FK/check/unique/index/constraint ครบ
- [ ] Activity Log และ Notification ที่เกี่ยวข้องถูกสร้าง
- [ ] Unit/integration/E2E tests ตามความเสี่ยงผ่าน
- [ ] Lint, typecheck และ production build ผ่าน
- [ ] ไม่มี secret/sensitive data ใน Client, error หรือ log
- [ ] README/RULES/CONTEXT/ARCHITECTURE/SCHEMA/TODO อัปเดตเมื่อ contract เปลี่ยน
