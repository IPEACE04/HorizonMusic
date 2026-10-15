---
version: alpha
colors:
  primary: "#f4c34d"
  brand: "#f4c34d"
  brand-hover: "#eab62f"
  brand-soft: "#fff5d7"
  canvas: "#f5f7f7"
  ink: "#090909"
  panel: "#f5f7f7"
  surface: "#ffffff"
  line: "#e5e4df"
  muted: "#717171"
  success: "#36a96b"
  focus: "#946d08"
  scroll-thumb: "#b5b2a7"
  scroll-hover: "#858174"
  scroll-active: "#5c584b"
  scroll-track: "#f5f7f7"
typography:
  wordmark:
    fontFamily: "Prompt, sans-serif"
  body:
    fontFamily: "Prompt, sans-serif"
rounded:
  shell: "0"
  panel: "0"
  control: "0"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
  section: "7rem"
components:
  hero:
    rounded: "0"
  search-panel:
    rounded: "0"
---

# Horizon Music Design System

## Overview

Horizon Music ใช้ภาพลักษณ์แบบ cinematic rehearsal contact sheet: Hero ภาพดนตรีขาวดำและ overlay ดำพร้อม headline Music Community กึ่งกลางและแถบควบคุมด้านล่าง ส่วนภาพห้องและ gallery รักษาสีจริง พื้นขาว หัวเว็บดำ สีทองสำหรับ CTA และ active navigation ส่วนสีเขียวสื่อสถานะพร้อมใช้งาน ไม่ใช้ gradient สีสดหรือ card เงาหนักหลายระดับ

Landing เป็น brand register ส่วน customer/admin screens ใช้ product register ที่กระชับกว่า แต่แชร์ typography, สี, radius และ interaction language ชุดเดียวกัน

## Colors

`app/globals.css` เป็น canonical runtime owner ของ tokens (Model B) และไฟล์นี้ mirror ค่าที่อนุมัติแล้ว ไม่มี generated theme หรือ ThemeProvider อีกชุด สีทองใช้กับแบรนด์และปุ่มหลัก; focus ใช้ทองเข้มสำหรับ contrast ส่วนสีเขียวใช้เฉพาะ success และ availability ไม่ใช้เป็นสีตกแต่งทั่วไป ข้อผิดพลาดใช้สีแดงพร้อมข้อความ; การยืนยันที่ต้องระวังใช้ amber เข้มกับข้อความขาว

Scrollbar ทุกพื้นที่ของแอปใช้ thumb/track/hover/active tokens เดียวกันผ่าน standard properties และ WebKit fallback ส่วน forced-colors คืนสีให้ระบบ

## Typography

Google Prompt ใช้ทั้งภาษาไทยและอังกฤษทั่วเว็บ โดยลดน้ำหนักหนึ่งระดับตามผู้ใช้: body 16px/300, public navigation 16px/300 (padding 0 12px, line-height 35px), workspace navigation 14px/400, label 14px/400, section title 24–32px/300, workspace h1 24–36px/300, Hero 40–88px/200. font-normal=300, font-medium/semibold/bold=400, font-extrabold=500; b/strong=500. Hero eyebrow 18px มือถือ / 22px จอใหญ่ และคำอธิบาย 18px / 20px. หัวข้ออังกฤษใช้ tracking 0.18em; เนื้อหาไทยใช้ระยะปกติ ปุ่มเส้นขอบและรูปทรงสี่เหลี่ยมตาม reference. โหลดผ่าน next/font/google และ self-host ใน build.

## Layout

Landing ใช้พื้นผิวเต็มความกว้าง ไม่มีกรอบโค้งรอบหน้า; Hero สูงอย่างน้อย 100svh และกว้างเต็มหน้า ส่วนเนื้อหากว้าง 1280px, section rhythm 64–112px ตาม viewport และ content ภายในไม่ชิดขอบภาพ Hero หรือกรอบหน้า. Public navigation ไม่มีพื้นหลังสี่เหลี่ยมสำหรับ Home/active link.

CustomerShell และ AdminShell กว้างเต็ม viewport และสูงอย่างน้อย 100svh โดยไม่มี outer padding หรือ max-width; ระยะภายในเนื้อหายังใช้ studio-content. ข้อความนำหน้า Contact ใช้ 24px. การ์ดห้อง admin ใช้รูป 1:1 แบบ object-contain เพื่อเห็นภาพทั้งหมด และข้อมูลแบบกระชับ รองรับ 1/2/3/4 คอลัมน์ตาม viewport; ไม่แสดง badge AVAILABLE แต่ยังแสดง MAINTENANCE/UNAVAILABLE.

Admin sidebar บน desktop สูง 100svh และ sticky top:0; เฉพาะ navigation เลื่อนได้เมื่อเมนูยาว ส่วนโลโก้และ account/logout ไม่หดและอยู่ด้านบน/ล่าง. Admin room management ใช้ roomDisplayOrder เดียวกับ public room repository เพื่อให้ลำดับความจุและ Western ตรงกับ landing.

## Elevation & Depth

Booking search panel อยู่ถัดจาก Hero ใน document flow และใช้เงาบาง โดยไม่ซ้อน headline, CTA หรือ carousel controls ส่วน card อื่นใช้ border หรือเงาบางเพื่อรักษาลำดับชั้น

## Shapes

Shell, cards, panels และ controls ใช้มุมเหลี่ยม (radius 0) ตาม reference; รูปทรงวงกลมสงวนไว้สำหรับ icon controls, avatar และ status dot

## Components

Current brand direction: black header, gold CTA and selected navigation, white content. ContactSection owns the contact details from the supplied Horizon Music reference: Soccer Pro Ratchada 18, 062-309-8937, info.thehorizonmusic@gmail.com, LINE @thehorizonmusic and Facebook TheHorizonMusicOfficial. BrandMark uses the user-selected `/logo/logo.png` asset, retaining its aspect ratio at 64px height on mobile and 80px on larger screens.

Public SiteHeader ใช้ BrandMark prominent ขนาด 72px บนมือถือและ 104px บนจอใหญ่; padding บน/ล่าง 4px และด้านข้าง clamp(16px, 3vw, 48px) เพื่อให้ logo และ menu อยู่ใกล้ขอบกว่า content. Workspace ใช้ขนาดเดิม. ราคา ความจุ และรายละเอียดใน RoomCard ใช้น้ำหนัก 300 และสี zinc-700 เหมือนกัน.

SiteHeader รวม navigation และ account link ไว้ฝั่งขวาของโลโก้บน desktop ตามลำดับ Home, Book Now, Contact Us, My Order, Login. BookingWizard วาง label เหนือ field ทุกช่อง; select ในฟอร์มนี้ยืดเต็มคอลัมน์เพื่อให้ตรงกับ date/time ส่วน ContentSelect ใน filter อื่นยังขยายตามข้อความ. กล่องสรุปราคาเป็นสีดำ หัวข้อและ CTA สีทอง; เริ่ม layout สองคอลัมน์ที่ xl เพื่อไม่บีบฟอร์มเมื่อมี sidebar.

NotificationPreview เป็น non-modal disclosure ใน public navbar สำหรับผู้เข้าสู่ระบบ. เปิดแล้วอ่าน GET /api/v1/notifications?page=1&pageSize=5; แสดงล่าสุดไม่เกิน 5 รายการ พร้อม loading/empty/error/retry. See more ไป /notifications; การเปิด preview ไม่เปลี่ยน read status. Escape, คลิกนอก และ focus ออกจาก disclosure ปิด panel; ยกเลิก request เมื่อปิด/unmount และไม่ใช้ข้อมูลจาก request เก่า.

RoomCard ใช้รูปสีจริงอัตราส่วน 1:1 ด้านบน ไม่มีกรอบหรือเงารอบการ์ด ข้อมูลชื่อ ราคา ความจุ และ description จากระบบจัดกึ่งกลางด้านล่าง พร้อมปุ่ม Book Now แบบกรอบดำที่ส่ง roomId เดิมไปหน้า booking. Grid แสดง 1/2/3 คอลัมน์ตาม viewport; ไม่เติมราคา อุปกรณ์ หรือรูปโปรโมชันที่ไม่มีในระบบ.

Room collection ใช้ flex-wrap และ justify-content:center เพื่อให้แถวสุดท้ายอยู่กึ่งกลางด้วย. Landing แสดงทุกห้องที่เผยแพร่โดยไม่มี limit; API search และหน้า booking ยังคง limit เดิม. เรียงความจุจากน้อยไปมาก โดย Western/West มาก่อน Eastern/East เมื่อความจุเท่ากัน แล้วเรียงชื่อและ id เพื่อให้ลำดับคงที่.

Spacing runtime owners: `--page-gutter` (20px minimum, centered 1280px content) → studio-frame/header; `--section-space` (64–112px) → studio-section; `--content-space` (20–48px) → customer/admin studio-content. Preserve table scrolling and mobile navigation clearance.

Hero สลับภาพทุก 3 วินาที ไม่มีปุ่มควบคุม ภาพย่อ หรือแถบ progress ตามคำขอผู้ใช้; ไม่หยุดเมื่อ hover/focus และแสดงภาพนิ่งเมื่อเปิด `prefers-reduced-motion`. Section อื่น reveal ครั้งเดียวเมื่อเข้า viewport. How it works ใช้หัวข้อ/คำโปรยกึ่งกลางกับสามขั้นตอน ไอคอนบนช่องดำสีทองเชื่อมเส้นทองบน desktop การ์ดข้อมูลเหลี่ยมสีขาว และ CTA เริ่มจองด้านล่าง.

Profile page จัดกึ่งกลางด้วย max-width 768px; ProfileAvatar ใช้ preview ของไฟล์แล้วบันทึกแยกจากข้อมูลส่วนตัว รองรับ JPG/PNG/WebP ไม่เกิน 3 MB. POST /api/v1/profile/image ตรวจ session, origin, size และ file signature; เก็บใน profile-images และบันทึกฟิลด์ user.image ผ่าน Better Auth พร้อม cookie ใหม่. Navbar ใช้ UserAvatar แทนข้อความโปรไฟล์ และ fallback รูปคนเมื่อไม่มีรูปหรือรูปโหลดไม่สำเร็จ.

Admin calendar ใช้ referenceDate ที่ส่งจาก server และ helper Bangkok date ที่คำนวณ UTC+7 พร้อมชื่อวัน/เดือนคงที่ เพื่อไม่ให้ ICU หรือ timezone ฝั่ง browser ทำให้ hydration ไม่ตรงกัน.

FloatingSupportChat อยู่ขวาล่างเป็นปุ่มวงกลมดำ/ไอคอนขาว ตาม reference ของผู้ใช้. กล่องสีขาวมุมมน 24px เป็นข้อยกเว้นจาก square cards; ข้อความลูกค้าพื้นเทา มุมมน 20px และช่องพิมพ์แบบ pill. ใช้ ChatPanel compact และ /api/v1/chat เดิม ไม่สร้าง conversation/API ชุดใหม่. ย่อแล้วเก็บ draft แต่หยุด polling/read updates; เปิดจึงเริ่มโหลดและตรวจข้อความทุก 5 วินาที. Guest ต้องเข้าสู่ระบบและกลับมาหน้าเดิม; ซ่อนใน admin, auth และหน้า /chat เต็ม. Panel เป็น non-modal dialog ไม่ trap focus; เปิดแล้ว focus ช่องพิมพ์, Escape/ปุ่มย่อคืน focus ให้ launcher. Layer --z-chat=60 อยู่เหนือ public header/mobile nav และใต้ native modal top layer. ความกว้างไม่เกิน 380px และปรับความสูง/ตำแหน่งตาม visual viewport กับ keyboard; customer mobile มีระยะพ้น bottom navigation.

Shared layout recipes อยู่ใน `@layer components` เพื่อให้ Tailwind utilities ของแต่ละหน้าปรับ responsive display, gap และ min-height ได้ Focus ของ form fields ใช้ border/shadow โดยไม่มี outline ในโหมดปกติ; forced-colors ใช้ system outline ส่วนปุ่มและลิงก์ใช้ two-tone ring ที่อ่านได้ทั้งพื้นอ่อนและ shell เข้ม

### CSS-to-component token mapping

| DESIGN.md path | Runtime owner / adapter | Shared consumers |
| --- | --- | --- |
| `colors.canvas` | `--canvas` → CSS / `bg-[var(--canvas)]` | document, workspace backgrounds, secondary hover |
| `colors.ink` | `--ink` → CSS / `text-[var(--ink)]` | heading, black header, workspace shell |
| `colors.primary`, `colors.brand*` | `--brand`, `--brand-hover`, `--brand-soft` | BrandMark, primary buttons, active NavigationLink, contact links |
| `colors.panel` | `--panel` → CSS / `bg-[var(--panel)]` | studio-frame, workspace tables, search fields |
| `colors.surface` | `--surface` → CSS / `bg-[var(--surface)]` | ConfirmDialog, secondary buttons, focus contrast |
| `colors.line` | `--line` → CSS / `border-[var(--line)]` | FormField, ConfirmDialog, frames and buttons |
| `colors.muted` | `--muted` → CSS / `text-[var(--muted)]` | NavigationLink, eyebrow, dialog description |
| `colors.success` | `--success` → `bg-[var(--success)]` | availability dot; StatusBanner success uses the existing emerald semantic recipe |
| `colors.focus` | `--focus` → unlayered focus rules | fields, search wrapper, buttons and links |
| `colors.scroll-*` | matching `--scroll-*` → global scrollbar properties | all app-owned scroll containers; no opt-in class |
| `rounded.shell` | `--radius-shell` → studio-frame | public frame; mobile geometry exception above |
| `rounded.panel`, `components.search-panel.rounded` | `--radius-panel` → arbitrary Tailwind radius | ConfirmDialog, availability-search panel |
| `rounded.control` | `--radius-control` → CSS / arbitrary Tailwind radius | studio-button, FormField, dialog actions |
| `typography.wordmark.fontFamily` | Next font `--font-prompt` → `.font-wordmark` | BrandMark only |
| `typography.body.fontFamily` | Next font `--font-prompt` → body inheritance | headings, labels, fields, buttons and tables |
| `spacing.*` | documented rhythm → existing Tailwind spacing utilities | screen composition; no duplicate spacing token package |
| `components.hero.rounded` | square full-bleed surface | HeroCarousel |

### Approved reconciliation

| Previous rule | Approved direction | Resolution |
| --- | --- | --- |
| Old neutral palette and oversized rounded controls | Horizon black/gold palette and square cards/controls | Frontmatter mirrors globals.css |
| Search overlaps Hero | Search follows Hero in normal flow | Elevation/layout prose corrected |
| All photography described as grayscale | Hero is cinematic; room images retain color | Overview distinguishes their roles |
| Carousel motion described without pause | Pause/play and focus/hover pause supported | Component contract records controls |

## Do's and Don'ts

- ใช้พื้นที่ว่างและภาพจริงเป็นองค์ประกอบหลัก
- ใช้ motion เพื่อเปลี่ยนบริบท ไม่ใช้กับทุกชิ้นส่วน
- ใช้ Prompt กับข้อความไทยและอังกฤษทุกหน้าของเว็บ
- ไม่เพิ่ม accent color ใหม่โดยไม่มี semantic role
