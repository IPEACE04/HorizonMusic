# SMT Studio

เว็บแอปสำหรับค้นหาและจองห้องซ้อมดนตรี/ห้องบันทึกเสียงของ Smoothie Studio ครอบคลุมการจัดการสมาชิก ห้อง อุปกรณ์ บริการเสริม Promo Code การจอง การตรวจสลิปแบบ Manual แชต การแจ้งเตือน รายงาน และระบบหลังบ้านสำหรับ Admin

> สถานะปัจจุบัน: วาง Better Auth + Drizzle foundation แล้ว แต่ Business API, หน้า Login/Register และ Frontend อื่น ๆ ยังไม่ถูก implement

## เป้าหมาย

- ลูกค้าดูห้องและเวลาว่าง คำนวณราคา ใช้ Promo Code และจองห้องได้ตลอด 24 ชั่วโมง
- ป้องกันการจองห้องทับซ้อน แม้มีคำขอเข้ามาพร้อมกัน
- ลูกค้าอัปโหลดสลิป และ Admin ตรวจสอบการชำระเงินด้วยตนเอง
- ลูกค้าและ Admin สนทนาและรับการแจ้งเตือนแบบ Realtime
- Admin จัดการทรัพยากรทั้งหมด ดูปฏิทิน รายได้ สถิติ และ Activity Log ได้
- ใช้ Better Auth สำหรับ authentication และ role-based authorization

## Target Stack

| Layer | Technology | หน้าที่ |
| --- | --- | --- |
| Web | Next.js 16 App Router, React 19, TypeScript | Public site, Customer portal, Admin portal และ Route Handlers |
| Styling | Tailwind CSS 4 | Design tokens และ UI styling |
| Authentication | Better Auth + Admin plugin | Email/password, session และ role `user` / `admin` |
| Validation | Zod | ตรวจ request และ form ด้วย schema ร่วมกัน |
| Database | Supabase PostgreSQL | เก็บข้อมูลหลักและบังคับ integrity |
| ORM | Drizzle ORM | Typed queries, schema และ migrations |
| Object storage | Supabase Storage | รูปห้องและหลักฐานการชำระเงิน |
| Realtime | Supabase Realtime Broadcast | Chat และ in-app notification ผ่าน private channels |
| Testing | Vitest, Testing Library, Playwright | Unit, integration, component และ E2E tests |

## ขอบเขตสำคัญ

- ร้านเปิด 24 ชั่วโมง
- จองขั้นต่ำ 60 นาที และเพิ่มระยะเวลาครั้งละ 30 นาที
- ยกเลิกได้เมื่อเหลือเวลาอย่างน้อย 12 ชั่วโมงก่อนเริ่มใช้งาน
- การชำระเงินใช้การโอนเงินและตรวจสลิปโดย Admin เท่านั้น
- ไม่มี EasySlip และไม่มี payment gateway ในขอบเขตปัจจุบัน
- ส่วนลดใช้ Promo Code แบบเปอร์เซ็นต์หรือจำนวนเงินคงที่ หนึ่ง Booking ใช้ได้หนึ่งโค้ด
- ทุก write สำคัญต้องสร้าง Activity Log

กฎทั้งหมดอยู่ใน [RULES.md](./RULES.md) และ requirement FR-01–FR-47 อยู่ใน [CONTEXT.md](./CONTEXT.md)

## Architecture โดยย่อ

ระบบเป็น Modular Monolith ภายใน repository เดียว แต่แยก layer ชัดเจน:

```text
Browser
  ├─ Public / Customer / Admin UI
  ├─ Better Auth client
  └─ Supabase Realtime client (private channels only)
             │
             ▼
Next.js App Router
  ├─ Server Components       -> Application services (read)
  ├─ /api/auth/*             -> Better Auth
  └─ /api/v1/*               -> Route Handlers -> Application services (HTTP)
                                      │
                                      ▼
                         Repositories / Integrations
                           ├─ Supabase PostgreSQL
                           ├─ Supabase Storage
                           └─ Supabase Realtime
```

Client Components เรียกข้อมูลผ่าน `/api/v1/*` ส่วน Server Components อ่านผ่าน server-only service โดยตรงเพื่อหลีกเลี่ยง HTTP self-fetch ตามแนวทาง Next.js ทั้งสองทางต้องผ่าน authorization และ repository เดียวกัน Frontend ห้ามเข้าฐานข้อมูลโดยตรง

ดูรายละเอียดที่ [ARCHITECTURE.md](./ARCHITECTURE.md) และแบบข้อมูลที่ [SCHEMA.md](./SCHEMA.md)

## โครงสร้างเป้าหมาย

```text
app/
├── (public)/                  # Landing, room list และ room detail
├── (customer)/                # Profile, booking, payment, chat, notification
├── admin/                     # Admin portal
└── api/
    ├── auth/[...all]/         # Better Auth handler
    └── v1/                    # HTTP API
components/
├── ui/                        # Primitive UI
├── customer/                  # Customer-specific UI
└── admin/                     # Admin-specific UI
features/                      # Client state, forms, hooks และ API clients
server/
├── auth/                      # Better Auth และ authorization helpers
├── modules/                   # Domain/application services
├── repositories/              # Database access
└── integrations/              # Storage, Realtime และ notification adapters
db/
├── schema/                    # Drizzle schemas
└── migrations/                # Versioned SQL migrations
tests/                         # Integration และ E2E support
```

## เริ่มต้นโปรเจกต์ปัจจุบัน

ต้องมี Node.js เวอร์ชันที่ Next.js 16 รองรับและ npm

```bash
npm install
npm run dev
```

เปิด <http://localhost:3000>

คำสั่งที่มีในปัจจุบัน:

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm test
npm run test:auth
npm run auth:generate
npm run db:generate
npm run db:migrate
```

`auth:generate` ใช้ generate Drizzle schema ใหม่เมื่อ Better Auth config หรือ plugin เปลี่ยน ส่วน `db:generate` ใช้สร้าง migration ใหม่ และ `db:migrate` ใช้ apply เฉพาะ Drizzle migrations ที่อยู่ใน `db/drizzle`

## ลำดับตั้งค่า Database และ Better Auth

1. เติม server environment variables ใน `.env.local` ตาม [.env.example](./.env.example) โดยใช้ `DATABASE_URL` ของ Supabase pooler และ `DATABASE_URL_DIRECT` ของ direct connection
2. รัน [0001_business_schema.sql](./db/migrations/0001_business_schema.sql) ใน Supabase SQL Editor หนึ่งครั้ง และตรวจว่า result เป็น `21` ทั้งจำนวนตารางและ RLS
3. รัน `npm run db:migrate` เพื่อ apply Better Auth migration ใน `db/drizzle` ห้าม copy SQL migration ชุดนี้ไปรันเอง เพราะ Drizzle ต้องบันทึก migration journal
4. ตรวจว่า `public."user".id` เป็น `text` แล้วจึงรัน [0002_auth_foreign_keys.sql](./db/migrations/0002_auth_foreign_keys.sql) ใน Supabase SQL Editor
5. สร้าง Admin คนแรกหลัง migration ครบด้วย `npx auth@latest create-admin --email admin@example.com --name "Admin" --role admin`

ห้ามรัน `0001_business_schema.sql` ซ้ำกับฐานข้อมูลเดิม และห้ามใช้ Supabase Auth เพราะ session และ roles ถูกจัดการโดย Better Auth

## Environment Variables เป้าหมาย

สร้าง `.env.local` และห้าม commit secret ลง Git

| Variable | Exposure | การใช้งาน |
| --- | --- | --- |
| `DATABASE_URL` | Server only | Supabase pooler connection สำหรับ runtime |
| `DATABASE_URL_DIRECT` | Server only | Direct connection สำหรับ migration |
| `BETTER_AUTH_SECRET` | Server only | Secret สำหรับ Better Auth; ต้องเป็นค่าสุ่มที่แข็งแรง |
| `BETTER_AUTH_URL` | Server only | Canonical origin ของ auth server |
| `NEXT_PUBLIC_APP_URL` | Browser | Canonical origin ของเว็บ |
| `SUPABASE_URL` | Server only | Supabase project URL สำหรับ server client |
| `SUPABASE_SECRET_KEY` | Server only | สิทธิ์ server สำหรับ Storage/Realtime; ห้ามส่งเข้า browser |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser | Endpoint สำหรับ Realtime client |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser | Publishable key; ไม่ใช่สิทธิ์เข้าข้อมูลด้วยตัวเอง |
| `SUPABASE_JWT_PRIVATE_KEY` | Server only | Private key ที่ import เข้า Supabase เพื่อออก short-lived Realtime JWT |
| `SUPABASE_JWT_KEY_ID` | Server only | `kid` ของ imported signing key |
| `SUPABASE_JWT_ISSUER` | Server only | Issuer claim ของ Realtime JWT |

Bucket เป้าหมาย:

- `room-images`: public-read สำหรับรูปห้องที่ไม่ใช่ข้อมูลลับ; Public API เปิดเผยเฉพาะรูปของห้องที่เผยแพร่แล้ว และ write ผ่าน Admin API
- `profile-images`: public-read สำหรับ avatar; อัปโหลดผ่าน authenticated Profile API เท่านั้น รองรับ JPG/PNG/WebP ไม่เกิน 3 MB. สร้างเฉพาะ bucket นี้ด้วย `node --import tsx scripts/setup-profile-storage.ts`; เพิ่ม `--verify` เพื่อทดสอบ upload/read แล้วลบไฟล์ทดสอบ. หน้า `/profile` ใช้ฟิลด์ `user.image` เดิมของ Better Auth โดยไม่ต้องเพิ่ม schema.
- `payment-slips`: private; upload/download ผ่าน URL ที่ server ออกให้เท่านั้น

## การตั้งค่าเริ่มต้น

ค่าเหล่านี้อยู่ใน `system_settings` และแก้ผ่าน Admin API ไม่ hard-code ใน Frontend:

| Setting | Default |
| --- | --- |
| Timezone | `Asia/Bangkok` |
| Currency | `THB` |
| เปิดบริการ | 24 ชั่วโมง |
| ระยะเวลาจองขั้นต่ำ | 60 นาที |
| Booking increment | 30 นาที |
| ยกเลิกล่วงหน้า | 12 ชั่วโมง |
| เวลาชำระเงินก่อน Booking หมดอายุ | 30 นาที |

## เอกสารในโปรเจกต์

- [CONTEXT.md](./CONTEXT.md) — เป้าหมาย Actors, scope, glossary และ FR-01–FR-47
- [RULES.md](./RULES.md) — กฎธุรกิจ ความปลอดภัย API และการพัฒนา
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Frontend, API, domain, infrastructure, flows และ testing
- [SCHEMA.md](./SCHEMA.md) — ERD, tables, constraints, indexes, Storage และ Realtime
- [TODO.md](./TODO.md) — Roadmap แยกตาม workstream พร้อม requirement traceability

## เอกสารอ้างอิงทางเทคนิค

- [Next.js: Backend for Frontend](https://nextjs.org/docs/app/guides/backend-for-frontend)
- [Next.js: Authentication](https://nextjs.org/docs/app/guides/authentication)
- [Better Auth: Next.js integration](https://better-auth.com/docs/integrations/next)
- [Better Auth: Admin plugin](https://better-auth.com/docs/plugins/admin)
- [Better Auth: Drizzle adapter](https://better-auth.com/docs/adapters/drizzle)
- [Supabase: Realtime authorization](https://supabase.com/docs/guides/realtime/authorization)
- [Supabase: Private Storage](https://supabase.com/docs/guides/storage/serving/downloads)
