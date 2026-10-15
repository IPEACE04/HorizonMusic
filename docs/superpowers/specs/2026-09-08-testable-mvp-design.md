# SMT Studio Testable MVP Design

## Goal

ส่งมอบ UX/UI และ API ของ SMT Studio เป็น vertical slices ที่ทดสอบ flow จริงกับ Better Auth, Supabase PostgreSQL และ Supabase Storage ได้ตั้งแต่ visitor ถึง customer และ admin โดยยึด FR-01–FR-47, `RULES.md`, `ARCHITECTURE.md`, `SCHEMA.md` และ `DESIGN.md`

## Product Surfaces

- Public: Landing, room discovery, room detail และ availability
- Customer: Authentication, profile, booking wizard, booking history/detail, manual payment, support chat และ notifications
- Admin: Dashboard, catalog, bookings/calendar, payments, users, chat, reports, notifications, activity logs และ policy settings

## Architecture

ใช้ Next.js modular monolith: Server Components อ่านผ่าน application service, Client Components mutation ผ่าน `/api/v1/*`, Route Handler ทำ transport/auth mapping, service ถือ business rules และ repository ติดต่อ PostgreSQL. Better Auth เป็น identity/session provider; Supabase ใช้ PostgreSQL, Storage และ Realtime เท่านั้น

## UX Direction

- Public ใช้ cinematic monochrome imagery และพื้นที่ว่างแบบ premium
- Customer ใช้ editorial workspace ที่เน้นราคา เวลา และสถานะ
- Admin ใช้ operations dashboard ที่กระชับ แต่ใช้ visual language เดียวกัน
- Audiowide ใช้เฉพาะ wordmark; Chakra Petch ใช้ข้อความทั้งหมด
- Motion ใช้เพื่อ context transition และเคารพ `prefers-reduced-motion`
- ทุก async workflow มี pending, success, error, empty และ recovery state
- Accessibility เป้าหมาย WCAG 2.2 AA

## Business Invariants

- ร้านเปิด 24 ชั่วโมง, slot 30 นาที, ขั้นต่ำ 60 นาที และจองข้ามวันได้
- ยกเลิกได้ก่อนเริ่มอย่างน้อย 12 ชั่วโมง
- Server คำนวณราคา ส่วนลด และ availability ใหม่ทุกครั้ง
- Active booking ห้ามทับซ้อน โดย PostgreSQL constraint เป็นด่านสุดท้าย
- Payment ใช้สลิปและ Admin ตรวจ manual; ไม่มี EasySlip/payment gateway
- `room-images` public; `payment-slips` private และ signed URL อายุสั้น
- Mutation สำคัญสร้าง append-only Activity Log

## Delivery Slices

1. Foundation and Auth
2. Availability, Pricing, Promo and Booking
3. Manual Payment and Booking Lifecycle
4. Chat and Notifications
5. Admin Operations, Reports and Audit

แต่ละ slice ต้องมี UI และ API ที่เชื่อม database จริงก่อนเริ่ม slice ถัดไป

## Error and Security Model

- API ใช้ stable error code, request ID และ field errors
- Protected API ตรวจ session; customer resource ตรวจ ownership; admin API ตรวจ role
- ไม่ส่ง secret, token, password, stack หรือ private object URL ลง client/log
- Form validation เป็น app-owned, ป้องกัน duplicate submit และไม่เปิดเผย email enumeration

## Verification

ใช้ unit tests เฉพาะ business policy/contract ที่เสี่ยง, TypeScript, lint, migration checks, production build และ browser flow เมื่อเครื่องมือพร้อม โดยไม่เพิ่ม test ที่ซ้ำกับ database constraints โดยไม่มีประโยชน์
