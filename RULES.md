# Project Rules

เอกสารนี้เป็นกฎบังคับของ SMT Studio หาก UI, API หรือ implementation ขัดกับเอกสารนี้ ให้แก้ implementation หรืออัปเดตเอกสารผ่านการตัดสินใจร่วมกันก่อน กฎ schema เชิงกายภาพดูที่ [SCHEMA.md](./SCHEMA.md)

## 1. Source of Truth

1. PostgreSQL เป็น source of truth ของข้อมูลธุรกิจ
2. Realtime event เป็นเพียงสัญญาณให้ UI อัปเดต ไม่ใช่ข้อมูล authoritative
3. Server คำนวณราคา availability permission และ status transition ใหม่ทุกครั้ง ห้ามเชื่อค่าที่ Client ส่งมา
4. Booking เก็บ snapshot ราคาและชื่อรายการ ณ เวลาสร้าง ประวัติเดิมต้องไม่เปลี่ยนเมื่อ Admin แก้ข้อมูลต้นฉบับ
5. เวลาเก็บใน PostgreSQL เป็น `timestamptz` (UTC) และแสดง/รับ input ตาม `Asia/Bangkok`
6. เงินเก็บเป็น `numeric(12,2)` และ currency `THB`; ห้ามใช้ floating-point คำนวณเงิน

## 2. Identity and Access Rules

### AUTH-01 Authentication

- ใช้ Better Auth email/password และ Drizzle adapter เท่านั้น ไม่ใช้ Supabase Auth
- Better Auth handler อยู่ที่ `/api/auth/[...all]`
- รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร และต้องไม่ถูกเก็บหรือ log ในรูป plaintext
- Logout ต้อง revoke session ปัจจุบัน
- MVP ยังไม่บังคับยืนยันอีเมล การเปิด email verification ต้องมาพร้อม transactional email provider และ migration/testing ที่เกี่ยวข้อง

### AUTH-02 Roles

- Role ที่เปิดใช้มี `user` และ `admin` ตาม Better Auth Admin plugin
- สมัครใหม่ได้ role `user` เท่านั้น Client ห้ามกำหนด role ตอนสมัคร
- การสร้าง Admin คนแรกใช้ Better Auth CLI ใน trusted environment
- User/API ทั่วไปห้ามเปลี่ยน role
- MVP ไม่เปิด Admin impersonation แม้ plugin จะรองรับ

### AUTH-03 Authorization

- Route Handler และ application service ทุกตัวต้องตรวจ session ที่ server
- Resource ของลูกค้าต้องตรวจ `resource.userId === session.user.id`
- Admin route ต้องตรวจ role `admin` ใกล้จุดเข้าถึงข้อมูลอีกครั้ง
- `proxy.ts`, layout redirect และการซ่อน UI ใช้เพื่อ UX เท่านั้น ไม่ถือเป็น security boundary
- Authorization เป็น default deny: ถ้าไม่พบกฎอนุญาต ให้ตอบ `403 FORBIDDEN`
- Frontend, publishable key และ request payload ไม่ใช่ trusted source

### AUTH-04 Sensitive Operations

- การอนุมัติ/ปฏิเสธ Payment, ยกเลิกแทนลูกค้า, เปลี่ยนราคา, role, ห้อง, Promo และ system setting ต้องสร้าง Activity Log
- Admin ต้องส่งเหตุผลเมื่อปฏิเสธสลิป ยกเลิก Booking หรือ override สถานะ
- ห้ามส่ง password hash, session token, cookie, secret, Realtime private key หรือ signed URL ลง response/log ที่ไม่จำเป็น

## 3. User Profile Rules

- Email เป็น unique แบบ case-insensitive ตาม normalization ของ Better Auth
- Profile ต้องมี `firstName`, `lastName` และ `phone`
- เบอร์โทรเก็บในรูป E.164 เมื่อทำ normalization สำเร็จ; UI แสดงรูปแบบท้องถิ่นได้
- User แก้ไขได้เฉพาะ Profile ของตน
- การแก้ email/password ใช้ Better Auth flow แยกจาก Profile update
- ประวัติ Booking/Payment/Audit ห้ามหายเมื่อ Profile เปลี่ยนชื่อ จึงใช้ snapshot ในเอกสารธุรกิจที่ต้องคงอดีต

## 4. Room and Equipment Rules

### ROOM-01 Visibility

- Visitor เห็นเฉพาะห้อง `isPublished = true`, `deletedAt IS NULL`
- ห้องสถานะ `UNAVAILABLE` หรือ `MAINTENANCE` ยังเปิดดูรายละเอียดได้ แต่สร้าง Booking ใหม่ไม่ได้
- Room slug ต้อง unique และไม่ควรเปลี่ยนหลังเผยแพร่โดยไม่มี redirect

### ROOM-02 Status and Blocks

- `AVAILABLE`: จองได้หากไม่มี Booking/Room Block ทับซ้อน
- `UNAVAILABLE`: ปิดรับ Booking ใหม่แบบไม่มีกำหนด
- `MAINTENANCE`: ปิดใช้งานเพื่อซ่อมบำรุงแบบไม่มีกำหนด
- การปิดเฉพาะช่วงเวลาใช้ `room_blocks` ประเภท `UNAVAILABLE` หรือ `MAINTENANCE`
- Room Block ต้องมี `endsAt > startsAt` และมีเหตุผล
- การเปลี่ยนสถานะหรือสร้าง Block ไม่ยกเลิก Booking เดิมอัตโนมัติ Admin ต้องจัดการ Booking ที่ได้รับผลกระทบอย่างชัดเจน

### ROOM-03 Pricing and Inventory

- `hourlyRate > 0`, `capacity > 0`, จำนวนอุปกรณ์ต้องเป็นจำนวนเต็มบวก
- เปลี่ยนราคามีผลเฉพาะ price quote/Booking ที่สร้างหลังการเปลี่ยน
- ห้อง อุปกรณ์ หรือ Add-on ที่เคยถูกใช้อ้างอิงให้ Archive/soft delete แทน hard delete
- Room image ต้องมี alt text และลำดับแสดงผล

## 5. Availability and Booking Rules

### BOOK-01 Operating Time

- ร้านเปิด 24 ชั่วโมงทุกวัน
- Booking สามารถข้ามเที่ยงคืนได้
- เวลาเริ่มต้องตรงช่วง 30 นาที เช่น `10:00`, `10:30`
- ระยะเวลาขั้นต่ำ 60 นาที และเพิ่มครั้งละ 30 นาที
- ไม่มีระยะเวลาสูงสุดใน MVP แต่ต้องไม่เกินช่วงที่ว่างต่อเนื่อง
- `endsAt` ต้องมากกว่า `startsAt` และ `startsAt` ต้องอยู่ในอนาคตขณะสร้าง

### BOOK-02 Availability

ห้องว่างเมื่อครบทุกข้อ:

1. ห้องเป็น `AVAILABLE`, `isPublished = true` และไม่ถูก soft delete
2. ไม่มี `room_blocks` ที่ช่วงเวลาเหลื่อมกัน
3. ไม่มี Booking ห้องเดียวกันสถานะ `PENDING_PAYMENT` หรือ `CONFIRMED` ที่ช่วงเวลาเหลื่อมกัน

ช่วงเวลาใช้ half-open interval `[startsAt, endsAt)` ดังนั้น Booking 10:00–11:00 และ 11:00–12:00 ไม่ทับกัน

### BOOK-03 Conflict Prevention

- Availability response เป็นข้อมูล ณ ขณะหนึ่ง ไม่รับประกันว่าช่วงเวลาจะยังว่างตอนกดยืนยัน
- การสร้าง Booking ต้องตรวจซ้ำใน transaction
- PostgreSQL exclusion constraint เป็นด่านสุดท้ายสำหรับ Active Booking
- Database conflict ต้องแปลงเป็น HTTP `409 BOOKING_CONFLICT`
- ห้ามแก้/ปิด constraint เพื่อแก้ race condition

### BOOK-04 Creation and Hold

- ต้อง login ก่อนสร้าง Booking
- Client ส่งเพียง `roomId`, `startsAt`, `durationMinutes`, Add-on quantities, `promoCode` และ `idempotencyKey`
- Server โหลดราคาปัจจุบัน ตรวจทั้งหมด และคำนวณ quote ใหม่
- Booking ที่มียอดสุทธิมากกว่า 0 เริ่มที่ `PENDING_PAYMENT` และกันห้องทันที
- Booking ต้องส่งสลิปภายใน 30 นาทีตาม `paymentDueAt`; เมื่อมี Payment `PENDING` รอ Admin ตรวจ ระบบยังไม่หมดอายุ Booking
- งานเบื้องหลังเปลี่ยนเป็น `EXPIRED` เมื่อเลย `paymentDueAt` และไม่มี Payment สถานะ `PENDING`, `PAID`, `REFUND_PENDING` หรือ `REFUNDED`; หาก Admin ปฏิเสธสลิปหลังครบกำหนดให้หมดอายุ Booking ใน transaction เดียวกัน
- ถ้ายอดสุทธิเป็น 0 ให้สร้าง Booking เป็น `CONFIRMED`, เปลี่ยน Promo reservation เป็น `APPLIED` และไม่สร้าง Payment
- `idempotencyKey` unique ต่อ User; request ซ้ำคืน Booking เดิมโดยไม่สร้างรายการใหม่

### BOOK-05 Status Transitions

| From | To | ผู้กระทำ/เงื่อนไข |
| --- | --- | --- |
| — | `PENDING_PAYMENT` | User สร้าง Booking ผ่าน validation |
| — | `CONFIRMED` | User สร้าง Booking ยอดสุทธิ 0 |
| `PENDING_PAYMENT` | `CONFIRMED` | Admin อนุมัติ Payment |
| `PENDING_PAYMENT` | `CANCELLED` | User ยกเลิกก่อน cutoff หรือ Admin ยกเลิกพร้อมเหตุผล |
| `PENDING_PAYMENT` | `EXPIRED` | System เมื่อเลย `paymentDueAt` และยังไม่ชำระสำเร็จ |
| `CONFIRMED` | `COMPLETED` | Admin หลังบริการจบ |
| `CONFIRMED` | `CANCELLED` | User ก่อน cutoff หรือ Admin พร้อมเหตุผล; ถ้าชำระแล้วเริ่ม refund flow |

- `COMPLETED`, `CANCELLED`, `EXPIRED` เป็น terminal state สำหรับ flow ปกติ
- การแก้ terminal state ต้องเป็น explicit administrative repair พร้อม reason และ Activity Log; ไม่มี UI ใน MVP
- ทุก transition สร้าง `booking_status_history`, Activity Log และ Notification ที่เกี่ยวข้องใน transaction เดียวกัน

### BOOK-06 Cancellation

- User ยกเลิกได้เมื่อ `now <= startsAt - 12 ชั่วโมง`
- เมื่อเหลือน้อยกว่า 12 ชั่วโมง User API ต้องตอบ `422 CANCELLATION_CUTOFF_PASSED`
- Admin ยกเลิกหลัง cutoff ได้ แต่ต้องระบุเหตุผล
- Booking ที่ยังไม่มี Payment: ยกเลิกแล้วปล่อยห้องและ Promo reservation
- Booking ที่มี Payment `PENDING`: ยกเลิกแล้วปล่อยห้อง/Promo แต่เก็บ Payment ไว้ให้ Admin ตรวจ หากสลิปถูกต้องให้เข้าสู่ `REFUND_PENDING` โดยไม่ Confirm Booking
- Booking ที่ชำระแล้ว: เปลี่ยน Payment เป็น `REFUND_PENDING`; Admin บันทึกการคืนเงินจริงเป็น `REFUNDED`
- การคืนเงินเป็น Manual และไม่ถือว่าเสร็จจากการเปลี่ยน Booking เป็น `CANCELLED` เพียงอย่างเดียว

## 6. Add-on and Pricing Rules

### PRICE-01 Add-on Types

- `FIXED`: คิดต่อ Booking หนึ่งครั้ง
- `PER_HOUR`: `unitPrice × durationHours × quantity`
- `PER_UNIT`: `unitPrice × quantity`
- Add-on ต้อง active จึงเลือกกับ Booking ใหม่ได้
- Quantity เป็นจำนวนเต็มบวก; Add-on ที่ไม่ต้องเลือกจำนวนใช้ค่า `1`

### PRICE-02 Calculation Order

1. `roomSubtotal = hourlyRate × durationMinutes / 60`
2. คำนวณแต่ละ Add-on ตาม pricing type
3. `subtotal = roomSubtotal + addonSubtotal`
4. ตรวจ Promo กับ `subtotal`
5. คำนวณ `discountAmount`
6. `totalAmount = max(0, subtotal - discountAmount)`

- ปัดทศนิยมเป็น 2 ตำแหน่งด้วย decimal arithmetic หลังคำนวณแต่ละ line total
- Promo ใช้กับยอดรวมค่าห้องและ Add-on ก่อนส่วนลด
- Server ต้องคืน price breakdown ที่อธิบายได้
- ค่าใน `bookings` และ `booking_addons` เป็น snapshot และ immutable หลังสร้าง ยกเว้น administrative repair

## 7. Promo Code Rules

### PROMO-01 Definition

- Code normalize ด้วย trim + uppercase และ unique แบบ case-insensitive
- Discount type มี `PERCENTAGE` และ `FIXED`
- `PERCENTAGE` ต้องมากกว่า 0 และไม่เกิน 100
- `FIXED` ต้องมากกว่า 0
- `maxDiscountAmount` ใช้เป็นเพดานสำหรับ percentage และเป็น optional
- `minBookingAmount >= 0`
- `startsAt < endsAt` เมื่อกำหนดวันหมดอายุ
- `totalUsageLimit` และ `perUserLimit` เป็นจำนวนเต็มบวกหรือ `NULL` เมื่อไม่จำกัด
- `appliesToAllRooms = false` ต้องมีอย่างน้อยหนึ่งรายการใน `promo_code_rooms`

### PROMO-02 Eligibility

Promo ใช้ได้เมื่อ:

1. Active และไม่ถูก Archive
2. เวลาปัจจุบันอยู่ในช่วงใช้งาน
3. Subtotal ถึงยอดขั้นต่ำ
4. ห้องอยู่ในขอบเขต Promo
5. Total usage และ per-user usage ยังไม่เต็ม
6. Booking ไม่มี Promo อื่น

### PROMO-03 Concurrency and Lifecycle

- ตอนสร้าง Booking ให้ lock แถว Promo, ตรวจ quota และสร้าง redemption สถานะ `RESERVED` ใน transaction เดียวกัน
- `RESERVED` เปลี่ยนเป็น `APPLIED` เมื่อ Payment เป็น `PAID`
- Booking ที่ `CANCELLED` ก่อนชำระหรือ `EXPIRED` เปลี่ยน reservation เป็น `RELEASED`
- Booking ที่เคยชำระแล้วถือว่าใช้สิทธิ์ `APPLIED` แม้ภายหลังยกเลิก/คืนเงิน
- การปิดหรือแก้ Promo ไม่เปลี่ยน Booking snapshot ที่มีอยู่
- Discount ห้ามทำให้ `totalAmount` ติดลบ

## 8. Payment Rules

### PAY-01 Submission

- Payment เป็นการโอนเงินและ Admin ตรวจ Manual เท่านั้น
- หนึ่ง Booking มี Payment attempt ได้หลายรายการ แต่มี `PAID` ได้สูงสุดหนึ่งรายการ
- User ขอ upload intent และยืนยัน upload ได้เฉพาะ Booking ของตนที่ `PENDING_PAYMENT` และก่อน `paymentDueAt`; Payment `PENDING` ที่ส่งทันกำหนดจะคง Booking ไว้รอ Admin ตรวจ
- รองรับ JPEG, PNG และ PDF ขนาดไม่เกิน 10 MB
- Server สุ่ม object path; ห้ามใช้ชื่อไฟล์จาก User เป็น path โดยตรง
- Bucket `payment-slips` เป็น private และ `upsert = false`
- Server คำนวณ SHA-256 ของไฟล์หลัง upload และปฏิเสธไฟล์ hash ซ้ำเพื่อช่วยตรวจการนำสลิปเดิมกลับมาใช้ ทั้งนี้ Admin ยังต้องตรวจธุรกรรมด้วยตนเอง

### PAY-02 Review

- Payment ใหม่เป็น `PENDING`
- ยอด Payment ต้องเท่ากับ `booking.totalAmount`; Client ไม่มีสิทธิ์กำหนดยอดเอง
- Admin ตรวจยอด ผู้รับ วันเวลา และความซ้ำด้วยตนเอง
- ผ่าน: `PENDING -> PAID` และ `Booking -> CONFIRMED` ใน transaction เดียวกัน
- ไม่ผ่าน: `PENDING -> FAILED` พร้อม `reviewNote`; User ส่ง attempt ใหม่ได้ถ้า Booking ยังไม่หมดอายุ
- Booking ที่ถูกยกเลิกขณะรอตรวจ: ถ้าสลิปถูกต้องให้ `PENDING -> REFUND_PENDING` เพื่อคืนเงิน โดยห้าม Confirm Booking
- ห้ามเปลี่ยน Payment เป็น `PAID` เมื่อ Booking เป็น `CANCELLED`, `EXPIRED` หรือมี settled Payment แล้ว
- Signed download URL ต้องออกหลังตรวจ role/ownership และมีอายุสั้น ค่าแนะนำ 5 นาที

### PAY-03 Refund

- `PAID -> REFUND_PENDING` เมื่อ Booking ที่ชำระแล้วถูกยกเลิก
- `REFUND_PENDING -> REFUNDED` เมื่อ Admin ยืนยันว่าคืนเงินจริงแล้ว
- Admin ต้องบันทึกวันที่ ยอด ช่องทาง/reference และเหตุผล
- Gross received นับยอดของ `PAID`, `REFUND_PENDING`, `REFUNDED`; Net received หัก `refundAmount` ของ `REFUNDED` และแสดง `REFUND_PENDING` เป็นภาระค้างคืนเงิน

## 9. Chat and Notification Rules

### CHAT-01 Conversation

- MVP มีหนึ่ง Support Conversation ต่อ User
- User อ่าน/ส่งได้เฉพาะ Conversation ของตน
- Admin อ่าน/ส่งได้ทุก Support Conversation
- ข้อความว่างหรือมีแต่ whitespace ใช้ไม่ได้; จำกัด 2,000 ตัวอักษร
- MVP รองรับข้อความ text เท่านั้น ไม่รองรับ attachment
- ข้อความที่บันทึกสำเร็จแล้วไม่แก้ไขหรือลบผ่าน UI

### CHAT-02 Unread

- ใช้ read cursor ต่อ `conversationId + userId`
- จำนวน unread คือข้อความหลัง cursor ที่ผู้ส่งไม่ใช่ User คนนั้น
- การ mark read ต้องขยับ cursor ไปข้างหน้าเท่านั้น

### RT-01 Realtime

- ใช้ private Supabase Realtime Broadcast channels เท่านั้น และปิด public channel access
- Browser ขอ short-lived Supabase-compatible JWT จาก API หลัง Better Auth ตรวจ session
- JWT ต้องใช้ asymmetric key ที่ import เข้า Supabase มี `kid`, `sub`, `role`, `aud`, `iat`, `exp` และอายุสั้น
- Topic รูปแบบ `conversation:<id>` และ `user:<id>`; RLS ต้องยืนยัน membership/subject
- การส่ง Chat ต้องผ่าน API และ commit database ก่อน broadcast
- Event payload ส่งเฉพาะ ID/type/version; Client refetch authoritative data ได้
- เมื่อ Realtime disconnect ให้ reconnect และ refetch/polling ห้ามถือว่าข้อความสูญหาย

### NOTIFY-01 Notifications

- Notification ถูกบันทึกในฐานข้อมูลก่อน broadcast
- User event: Booking created/confirmed/cancelled/expired, Payment paid/failed/refund และ Chat ใหม่
- Admin event: Booking ใหม่, Payment submission ใหม่ และ Chat ใหม่
- Read state เป็นราย User; mark read ต้องตรวจ ownership

## 10. Reporting Rules

- Report filter ใช้ช่วงเวลาแบบ `[from, to)` เพื่อไม่ให้นับขอบเขตซ้ำ
- Gross received รวม Payment ที่ `PAID`, `REFUND_PENDING`, `REFUNDED`; Net received หักยอด `refundAmount` ของ `REFUNDED` ตามวันที่คืนเงิน
- `PENDING` และ `REFUND_PENDING` ไม่ใช่รายได้สุทธิ แต่รายงานแยกได้
- Booking count ระบุชัดว่านับสถานะใด; dashboard default แยกทุกสถานะ
- Popular room ใช้จำนวน Booking `CONFIRMED`/`COMPLETED`
- Usage hours ใช้ระยะเวลาของ `CONFIRMED`/`COMPLETED`
- ทุก list/report ต้องใช้ pagination หรือช่วงวันที่จำกัด

## 11. Activity Log Rules

### AUDIT-01 Events

อย่างน้อยต้อง log:

- Register, login success/failure ที่มีนัยสำคัญ, logout และ password/session security events
- Profile update และ role change
- Room, Equipment, Room Equipment, Add-on, Promo และ Setting create/update/archive
- Booking create/status/cancel/expire/admin override
- Payment submit/review/refund
- Chat conversation create/close; ไม่เก็บข้อความเต็มใน audit payload
- Signed slip URL access โดย Admin

### AUDIT-02 Integrity and Privacy

- Activity Log เป็น append-only ไม่มี Update/Delete endpoint
- Business write สำคัญและ Activity Log ต้องอยู่ transaction เดียวกัน
- เก็บ `actorType`, `actorUserId`, `action`, `entityType`, `entityId`, `beforeData`, `afterData`, `requestId`, IP, user agent และเวลา
- System task ใช้ `actorType = SYSTEM` และ `actorUserId = NULL`
- Redact password, token, cookie, secret, authorization header, raw slip, signed URL และ Chat body
- `beforeData`/`afterData` เก็บเฉพาะ field ที่เปลี่ยน ไม่ dump object ทั้งหมดโดยไม่จำเป็น
- Application role ไม่มีสิทธิ์แก้หรือลบ log; retention/archival เป็นงาน infrastructure ที่มี audit แยก

## 12. API Rules

### API-01 Boundaries

- `/api/auth/*` สงวนให้ Better Auth
- Business HTTP API อยู่ใต้ `/api/v1/*`
- Route Handler ทำเพียง parse, authenticate, authorize, validate, call service และ map response
- Business logic ห้ามอยู่ใน React component หรือ Route Handler
- Repository เป็น layer เดียวที่ query database
- Client Component ใช้ API client; Server Component เรียก server-only service โดยตรงและห้าม HTTP self-fetch

### API-02 Responses

สำเร็จ:

```json
{
  "data": {},
  "meta": { "requestId": "..." }
}
```

ผิดพลาด:

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "ช่วงเวลานี้ไม่ว่างแล้ว",
    "fieldErrors": {},
    "requestId": "..."
  }
}
```

- `400`: malformed request
- `401`: ไม่มี/หมดอายุ session
- `403`: ไม่มีสิทธิ์
- `404`: ไม่พบ resource หรือจงใจซ่อน resource ที่ไม่มี ownership
- `409`: uniqueness/concurrency conflict
- `422`: business validation ไม่ผ่าน
- `429`: rate limit
- `500`: unexpected error; response ห้ามมี stack trace

### API-03 List and Mutation

- List endpoint ต้องกำหนด pagination, stable sort และเพดาน page size
- Date filter ใช้ ISO 8601 พร้อม timezone หรือ UTC `Z`
- Mutation สำคัญรองรับ idempotency เมื่อการ retry อาจสร้างข้อมูลซ้ำ
- API version เปลี่ยนเมื่อ contract แตก ไม่ผูก response กับ Drizzle row โดยตรง
- Request ID ต้องไหลผ่าน response, structured log และ Activity Log

## 13. Storage Rules

- `room-images` เป็น public-read และเก็บเฉพาะ asset ที่ไม่ใช่ข้อมูลลับ; Public API เปิดเผย path เฉพาะรูปของห้องที่เผยแพร่แล้ว การเขียน/ลบผ่าน Admin service
- `payment-slips` เป็น private เสมอ
- Upload slip ใช้ signed upload URL ที่ server สร้างหลังตรวจ session/ownership; URL ของ Supabase มีอายุจำกัดตาม platform
- Download slip ใช้ signed URL อายุสั้นหลังตรวจ permission ทุกครั้ง
- Path แนะนำ: `bookings/<bookingId>/payments/<paymentId>/<uuid>.<ext>`
- ตรวจ MIME, extension และ size ทั้งก่อนออก upload token และหลัง upload ก่อนสร้าง Payment
- ไม่ overwrite object; ส่งสลิปใหม่ต้องสร้าง path/Payment attempt ใหม่
- ลบ orphan upload ด้วย scheduled cleanup หลังพ้นระยะเวลาที่กำหนด

## 14. Engineering Rules

### CODE-01 Layering

- ไฟล์ใน `server/` และ `db/` ต้อง import `server-only` ที่ boundary ที่เหมาะสม
- Domain module ไม่ import React หรือ component
- Frontend ไม่ import Drizzle schema, database client หรือ server secret
- ใช้ schema validation ที่แชร์ได้เฉพาะ contract; อย่าแชร์ database entity เป็น API DTO
- Dependency direction: UI -> API/service -> repository/integration; ห้ามย้อนกลับ

### CODE-02 Next.js 16

- อ่าน guide ที่เกี่ยวข้องใน `node_modules/next/dist/docs/` ก่อนใช้ API ใหม่
- ใช้ `proxy.ts` แทน convention `middleware.ts` ที่ deprecated ใน Next.js 16
- Route Handler เป็น public endpoint จึงต้องตรวจ auth/authorization ภายใน
- Server Component อ่าน server service โดยตรง ห้าม fetch Route Handler ของแอปตัวเอง
- Client Component มีเฉพาะส่วนที่ต้องใช้ browser state/event; default เป็น Server Component

### CODE-03 Database

- ทุก schema change ผ่าน versioned migration ห้ามแก้ production database ด้วย dashboard โดยไม่มี migration คู่กัน
- Foreign key, check, unique และ exclusion constraint ต้องอยู่ใน database ไม่พึ่ง application อย่างเดียว
- Transaction ครอบ Booking create, Promo reserve, Payment approve/refund และ status transition
- Query list ต้องมี index รองรับและทดสอบ query plan เมื่อข้อมูลโต
- ห้ามใช้ `SELECT *` ใน contract-sensitive query

### CODE-04 Error and Logging

- Domain error ใช้ stable machine-readable code
- Structured operational log และ Activity Log เป็นคนละระบบ: log ใช้ debug/monitor, audit ใช้ตรวจการกระทำ
- ห้าม swallow error; map expected error และ report unexpected error พร้อม request ID
- Broadcast failure หลัง database commit ห้าม rollback ธุรกิจ ให้ retry/outbox หรือ Client refetch

### CODE-05 Testing and Delivery

- Feature/bugfix เริ่มจาก failing test ตามระดับที่เหมาะสม
- Pricing, discount, cancellation, transition และ authorization ต้องมี unit tests
- Constraint/transaction ต้องมี integration test กับ PostgreSQL จริง
- Critical User/Admin journeys ต้องมี E2E tests
- ก่อนส่งงานอย่างน้อยต้องผ่าน lint, typecheck, relevant tests และ build
- ห้ามอ้างว่า feature เสร็จเพียงเพราะ UI แสดงผล ต้องพิสูจน์ API, permission และ persistence ด้วย

## 15. Definition of Done

งานหนึ่งรายการเสร็จเมื่อ:

1. ตรง requirement และกฎในเอกสาร
2. แยก Frontend/API/Domain/Repository ตาม architecture
3. มี validation, authorization, error mapping และ Activity Log ที่เกี่ยวข้อง
4. มี migration/index/constraint หากเปลี่ยนข้อมูล
5. มี tests ตามความเสี่ยงและผ่าน verification
6. ไม่มี secret/sensitive data ใน client bundle หรือ log
7. อัปเดต README, CONTEXT, RULES, ARCHITECTURE, SCHEMA หรือ TODO หาก contract เปลี่ยน
