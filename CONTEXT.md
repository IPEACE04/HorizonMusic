# Project Context

## Product Summary

SMT Studio เป็นระบบเว็บสำหรับบริหารการจองห้องซ้อมดนตรีและห้องบันทึกเสียง ผู้ใช้ค้นหาห้อง ตรวจเวลาว่าง เลือกบริการเสริม ใช้ Promo Code จอง อัปโหลดสลิป และติดต่อ Admin ได้ ส่วน Admin บริหารห้อง อุปกรณ์ ราคา ส่วนลด การจอง การชำระเงิน แชต รายงาน และ Audit trail จากระบบเดียว

เอกสารนี้กำหนดปัญหา ขอบเขต คำศัพท์ และ Functional Requirements ส่วนกฎเชิงพฤติกรรมอยู่ใน [RULES.md](./RULES.md), การวางระบบอยู่ใน [ARCHITECTURE.md](./ARCHITECTURE.md), และโครงสร้างข้อมูลอยู่ใน [SCHEMA.md](./SCHEMA.md)

## Current State

- Repository สร้างจาก Next.js 16 App Router และยังเป็น starter page
- Dependency ที่ติดตั้งแล้วมี Next.js, React, TypeScript และ Tailwind CSS
- Better Auth, Drizzle, Supabase clients, validation และ test tooling ยังไม่ได้ติดตั้ง
- มี asset เริ่มต้นใน `public/logo` และ `public/picture`
- ยังไม่มี database migration, auth flow, API หรือหน้าธุรกิจ

ดังนั้นเอกสารทั้งหมดอธิบาย target state ไม่ใช่ความสามารถที่ใช้งานได้แล้ว

## Product Goals

1. ลดขั้นตอนการสอบถามห้องว่างและการจองผ่านช่องทาง Manual
2. ให้ราคาและส่วนลดโปร่งใสก่อนลูกค้ายืนยัน
3. ป้องกัน Double booking ด้วย enforcement ที่ฐานข้อมูล
4. ให้ Admin ตรวจสอบการชำระเงินและจัดการงานประจำวันได้จากศูนย์กลางเดียว
5. ทำให้การติดต่อและการแจ้งเตือนรวดเร็วโดยไม่สูญเสียข้อมูลเมื่อ Realtime ขัดข้อง
6. ตรวจสอบย้อนหลังได้ว่าใครทำอะไร เมื่อใด และกับข้อมูลใด

## Actors

| Actor | คำอธิบาย | สิทธิ์ระดับสูง |
| --- | --- | --- |
| Visitor | ผู้ที่ยังไม่เข้าสู่ระบบ | ดู Landing, ห้องที่เผยแพร่ รายละเอียด และ availability |
| User | ลูกค้าที่เข้าสู่ระบบ | จัดการ Profile และข้อมูลของตนเอง สร้าง/ยกเลิก Booking ส่งสลิป Chat และอ่าน Notification |
| Admin | พนักงานที่มี Better Auth role `admin` | จัดการข้อมูลระบบ ตรวจสลิป เปลี่ยนสถานะ Booking ตอบ Chat ดูรายงานและ Activity Log |
| System | งานเบื้องหลัง/เหตุการณ์อัตโนมัติ | หมดอายุ Booking, Broadcast event, สร้าง Notification และ Activity Log |

## Confirmed Decisions

- ใช้ Next.js 16 แบบ Modular Monolith แยก Frontend, API, Domain และ Infrastructure ชัดเจน
- ใช้ Supabase PostgreSQL, Storage และ Realtime แต่ไม่ใช้ Supabase Auth
- ใช้ Better Auth email/password และ Admin plugin สำหรับ authentication/session/role
- ใช้ Drizzle ORM กับ PostgreSQL
- ร้านเปิด 24 ชั่วโมงและ Booking ข้ามวันได้
- ระยะเวลาขั้นต่ำ 60 นาที เพิ่มครั้งละ 30 นาที
- ผู้ใช้ยกเลิกได้ก่อนเวลาเริ่มอย่างน้อย 12 ชั่วโมง
- การตรวจสลิปเป็น Manual โดย Admin; ไม่ใช้ EasySlip และ payment gateway
- ส่วนลดเป็น Promo Code แบบ percentage/fixed พร้อมเงื่อนไข วันใช้งาน และ quota
- หนึ่ง Booking ใช้ Promo Code ได้สูงสุดหนึ่งโค้ด
- Activity Log เป็น append-only และครอบคลุม write สำคัญ
- ใช้เวลา UTC ในฐานข้อมูลและแสดงผลด้วย timezone `Asia/Bangkok`
- รายงาน Gross received อ้างอิง Payment ที่รับเงินจริง (`PAID`, `REFUND_PENDING`, `REFUNDED`) และ Net received หักยอดที่คืนแล้ว

## Functional Requirements

### Account and Access

**FR-01 User Registration**

ระบบให้ผู้ใช้งานสมัครสมาชิกโดยบันทึกชื่อ นามสกุล อีเมล เบอร์โทรศัพท์ และรหัสผ่าน

**FR-02 User Login**

ระบบตรวจสอบและยืนยันตัวตนก่อนเข้าสู่ระบบด้วย Better Auth

**FR-03 User Logout**

ระบบให้ผู้ใช้งานออกจากระบบและยกเลิก session ปัจจุบันได้

**FR-04 User Profile Management**

ผู้ใช้งานดูและแก้ไขชื่อ นามสกุล เบอร์โทรศัพท์ และข้อมูลส่วนตัวของตนเองได้ การเปลี่ยนอีเมลหรือรหัสผ่านต้องผ่าน flow ของ Better Auth

### Room Discovery

**FR-05 Room List**

ระบบแสดงรายการห้องซ้อมดนตรีและห้องบันทึกเสียงที่เผยแพร่และพร้อมให้ลูกค้าดู

**FR-06 Room Detail**

ระบบแสดงประเภทห้อง ราคา ความจุ รายละเอียด สถานะ และรูปภาพของแต่ละห้อง

**FR-07 Room Equipment Information**

ระบบแสดงอุปกรณ์และจำนวนที่มีในแต่ละห้อง

**FR-08 Room Availability**

ระบบแสดงวันและช่วงเวลาว่างโดยพิจารณา Booking ที่ active, สถานะห้อง และ Room Block

### Booking and Pricing

**FR-09 Booking Creation**

ผู้ใช้เลือกห้อง วัน เวลาเริ่ม และระยะเวลาเพื่อสร้าง Booking ได้

**FR-10 Booking Conflict Prevention**

ระบบป้องกัน Booking ช่วงเวลาทับซ้อนทั้งใน service และ PostgreSQL constraint

**FR-11 Booking Duration Validation**

ระบบตรวจขั้นต่ำ 60 นาที เพิ่มครั้งละ 30 นาที และรองรับการจองข้ามวันเพราะร้านเปิด 24 ชั่วโมง

**FR-12 Add-on Selection**

ผู้ใช้เลือกบริการเสริม เช่น Recording, Sound Engineer หรือเช่าอุปกรณ์เพิ่มเติมได้

**FR-13 Automatic Price Calculation**

Server คำนวณราคาจากค่าห้อง ระยะเวลา Add-on และ Promo Code โดยไม่เชื่อค่าราคาจาก Client

**FR-14 Booking Confirmation**

ระบบแสดงสรุปห้อง ช่วงเวลา รายการราคา ส่วนลด และยอดสุทธิก่อนยืนยัน

### Payment and Booking Lifecycle

**FR-15 Payment Record**

ระบบบันทึกหลักฐาน ยอด เวลา ผู้ตรวจ และผลการตรวจชำระเงินของ Booking

**FR-16 Payment Status**

ระบบรองรับ `PENDING`, `PAID`, `FAILED`, `REFUND_PENDING` และ `REFUNDED`

**FR-17 Booking Status**

ระบบรองรับ `PENDING_PAYMENT`, `CONFIRMED`, `COMPLETED`, `CANCELLED` และ `EXPIRED`

**FR-18 Booking History**

ผู้ใช้ดูประวัติ Booking ทั้งหมดของตนเองแบบแบ่งหน้าและกรองตามสถานะได้

**FR-19 Booking Detail**

ผู้ใช้เปิดดูข้อมูล เวลา ราคา Add-on ส่วนลด Payment และ status history ของ Booking ตนเองได้

**FR-20 Booking Cancellation**

ผู้ใช้ยกเลิกได้จนถึงเวลา `startsAt - 12 ชั่วโมง`; Booking ที่ชำระแล้วหรือมีสลิปรอตรวจเข้าสู่ Manual refund/review flow

### Chat

**FR-21 Chat Conversation**

ผู้ใช้เริ่มหรือเปิดบทสนทนากับ Admin ได้ โดย MVP มีหนึ่ง Support Conversation ต่อผู้ใช้

**FR-22 Send Chat Message**

User และ Admin ส่งข้อความผ่าน API ได้

**FR-23 Chat History**

ระบบเก็บและแสดงข้อความย้อนหลังแบบแบ่งหน้า

**FR-24 Chat Unread Status**

ระบบเก็บ read cursor ต่อผู้เข้าร่วม และแสดงจำนวนข้อความที่ยังไม่อ่าน

**FR-25 Real-time Chat Update**

ระบบ Broadcast ข้อความใหม่ผ่าน private Supabase Realtime channel และ fallback เป็น refetch/polling เมื่อเชื่อมต่อไม่ได้

### Administration

**FR-26 Admin Login**

ระบบตรวจ Better Auth session และ role `admin` ก่อนให้เข้าถึง Admin resource

**FR-27 Admin Dashboard**

Admin ดูจำนวน Booking, ผู้ใช้, รายได้ และสถานะ Booking ตามช่วงเวลาได้

**FR-28 Room Management**

Admin เพิ่ม แก้ไข ดู Archive และเผยแพร่ข้อมูลห้องได้ การลบข้อมูลที่มีประวัติใช้ soft delete

**FR-29 Room Status Management**

Admin กำหนด `AVAILABLE`, `UNAVAILABLE`, `MAINTENANCE` และสร้าง Room Block แบบมีช่วงเวลาได้

**FR-30 Equipment Management**

Admin เพิ่ม แก้ไข ดู และ Archive อุปกรณ์ได้

**FR-31 Room Equipment Management**

Admin กำหนดอุปกรณ์และจำนวนในแต่ละห้องได้

**FR-32 Add-on Management**

Admin เพิ่ม แก้ไข Archive กำหนดราคาและรูปแบบราคา Add-on ได้

**FR-33 Pricing Management**

Admin แก้อัตราค่าห้องสำหรับ Booking ใหม่ได้ โดยไม่เปลี่ยน snapshot ของ Booking เดิม

**FR-34 Booking Management**

Admin ดูรายละเอียด Booking ทั้งหมดและ status history ได้

**FR-35 Booking Status Management**

Admin เปลี่ยนสถานะตาม transition ที่อนุญาต พร้อมระบุเหตุผลสำหรับการยกเลิกหรือ override

**FR-36 Payment Management**

Admin ดูสลิปผ่าน signed URL และอนุมัติ ปฏิเสธ หรือบันทึกการคืนเงินได้

**FR-37 User Management**

Admin ดูรายการและรายละเอียดผู้ใช้ได้ MVP ไม่เปิด impersonation หรือลบบัญชีผ่าน UI

**FR-38 Admin Chat Management**

Admin ดู Conversation ทั้งหมด กรอง unread และตอบข้อความได้

**FR-39 Search and Filter Booking**

Admin ค้นหาจาก booking number หรือผู้ใช้ และกรองตามวันที่ ห้อง ผู้ใช้ และสถานะได้

**FR-40 Booking Calendar**

Admin ดู Booking และ Room Block ในปฏิทินแยกตามห้องได้

### Reports and Notifications

**FR-41 Revenue Report**

ระบบสรุปยอดรับจริง รายได้สุทธิ ยอดคืน และยอดรอคืนตามวัน เดือน ปี หรือช่วงวันที่

**FR-42 Booking Statistics**

ระบบแสดงจำนวน Booking ห้องยอดนิยม ชั่วโมงใช้งาน และอัตราการใช้งานตามช่วงเวลา

**FR-43 Notification**

ผู้ใช้ได้รับ in-app notification เมื่อสร้าง Booking, Payment ผ่าน/ไม่ผ่าน, Booking ยืนยัน/ยกเลิก/หมดอายุ หรือมีข้อความใหม่

**FR-44 Admin Notification**

Admin ได้รับ in-app notification เมื่อมี Booking ใหม่ สลิปใหม่ หรือ Chat ใหม่

### Added Requirements

**FR-45 Discount Management**

Admin สร้าง แก้ไข เปิด/ปิด และ Archive Promo Code โดยกำหนดประเภท มูลค่า ช่วงเวลา ยอดขั้นต่ำ เพดาน จำนวนสิทธิ์ต่อระบบ/ผู้ใช้ และห้องที่ร่วมรายการได้

**FR-46 Discount Application**

ผู้ใช้ใช้ Promo Code หนึ่งโค้ดต่อ Booking ระบบตรวจเงื่อนไขและเก็บ price snapshot ก่อนยืนยัน

**FR-47 Activity Log**

ระบบบันทึก actor, action, target, before/after ที่ผ่านการ redact, request context และเวลา สำหรับกิจกรรมสำคัญ โดยแก้ไขหรือลบผ่านแอปไม่ได้

## Requirement-to-Module Map

| Module | Requirements |
| --- | --- |
| Auth/Profile | FR-01–FR-04, FR-26, FR-37 |
| Rooms/Equipment | FR-05–FR-08, FR-28–FR-33 |
| Booking/Pricing | FR-09–FR-14, FR-17–FR-20, FR-34–FR-35, FR-39–FR-40 |
| Discount | FR-13–FR-14, FR-45–FR-46 |
| Payment | FR-15–FR-16, FR-36, FR-41 |
| Chat | FR-21–FR-25, FR-38 |
| Reports | FR-27, FR-41–FR-42 |
| Notifications | FR-43–FR-44 |
| Audit | FR-47 และ write สำคัญจากทุก module |

## Non-Functional Requirements

- **Security:** Default-deny authorization, server-only secrets, private payment evidence, input validation และ rate limiting
- **Consistency:** Booking/discount/payment transition ใช้ transaction และ database constraints
- **Availability:** ความถูกต้องไม่ขึ้นกับ Realtime; reconnect แล้ว refetch authoritative state ได้
- **Performance:** Pagination ทุก list, index ตาม query pattern และห้าม N+1 query ใน Room/Booking list
- **Accessibility:** UI ใช้งานด้วย keyboard, มี label, focus state และ contrast ที่เหมาะสม
- **Observability:** ทุก request มี request ID; structured error log และ Activity Log แยกวัตถุประสงค์กัน
- **Localization:** UI หลักเป็นภาษาไทย, เงินเป็น THB, แสดงเวลา Asia/Bangkok
- **Privacy:** เก็บข้อมูลเท่าที่จำเป็นและไม่บันทึก password, token, cookie หรือไฟล์สลิปลง log payload

## Out of Scope

- EasySlip หรือบริการตรวจสลิปอัตโนมัติ
- Payment gateway, card payment และ automatic refund
- Native mobile application
- Marketplace หลายร้านหรือหลายสาขา
- ระบบบัญชี/ใบกำกับภาษีเต็มรูปแบบ
- SMS, email marketing และ push notification นอก browser
- Admin impersonation และการลบบัญชีผู้ใช้ผ่าน UI ใน MVP
- Dynamic pricing ตามช่วงเวลา แพ็กเกจสมาชิก และ loyalty points

## Success Criteria

- ไม่มี Booking active สองรายการของห้องเดียวกันที่เวลาทับซ้อนกัน แม้ยิง request พร้อมกัน
- User เข้าถึงได้เฉพาะ Profile, Booking, Payment, Chat และ Notification ของตน
- Admin action และ lifecycle event สำคัญตรวจย้อนหลังได้จาก Activity Log
- ราคาสรุปและยอดที่เก็บใน Booking ตรงกับกฎบน Server และไม่เปลี่ยนเมื่อแก้ราคาหรือ Promo ภายหลัง
- Realtime หลุดแล้วข้อความไม่หาย เพราะ API/Database เป็น source of truth
- FR-01–FR-47 มี test หรือ verification item ใน [TODO.md](./TODO.md)

## Glossary

| Term | ความหมาย |
| --- | --- |
| Active Booking | Booking สถานะ `PENDING_PAYMENT` หรือ `CONFIRMED` ที่กันเวลาห้อง |
| Add-on | บริการ/อุปกรณ์เสริมที่คิดราคาเพิ่มตาม Booking, ชั่วโมง หรือจำนวน |
| Availability | ช่วงเวลาที่ไม่มี Active Booking/Room Block และห้องอยู่สถานะ `AVAILABLE` |
| Booking snapshot | ชื่อและราคาที่คัดลอกมาเก็บ ณ เวลาจองเพื่อรักษาประวัติ |
| Manual review | Admin ตรวจสลิป ยอด ผู้รับ และเวลาโอนด้วยตนเอง |
| Promo reservation | การกัน quota Promo ระหว่างรอ Payment |
| Private channel | Supabase Realtime channel ที่ต้องผ่าน JWT และ RLS authorization |
| Activity Log | Audit record แบบ append-only สำหรับตรวจสอบการเปลี่ยนแปลง |
