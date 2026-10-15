import {
  RiArrowRightUpLine,
  RiFacebookFill,
  RiLineFill,
  RiMailLine,
  RiMapPinLine,
  RiPhoneLine,
} from "react-icons/ri";

const mapQuery = encodeURIComponent("Soccer Pro Ratchada 18 Bangkok");
const mapUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
const contacts = [
  { icon: RiPhoneLine, label: "โทรศัพท์", text: "062-309-8937", href: "tel:0623098937" },
  { icon: RiMailLine, label: "อีเมล", text: "info.thehorizonmusic@gmail.com", href: "mailto:info.thehorizonmusic@gmail.com" },
  { icon: RiLineFill, label: "LINE", text: "@thehorizonmusic", href: "https://line.me/R/ti/p/@thehorizonmusic" },
  { icon: RiFacebookFill, label: "Facebook", text: "TheHorizonMusicOfficial", href: "https://www.facebook.com/TheHorizonMusicOfficial" },
] as const;

export function ContactSection({ dark = false }: { dark?: boolean }) {
  return (
    <section id="contact" aria-labelledby="contact-heading" className={`studio-section border-t border-[var(--line)] ${dark ? "studio-full-bleed bg-[var(--ink)] px-[var(--page-gutter)] text-white" : ""}`}>
      <div className="mb-10 flex flex-col items-center gap-4 text-center sm:mb-16">
        <div>
          <h2 id="contact-heading" className="studio-section-title">CONTACT US</h2>
        </div>
        <p className={`max-w-xl text-base leading-8 ${dark ? "text-white/75" : "text-[var(--muted)]"}`}>สอบถามรายละเอียดห้องซ้อม การจอง หรือเส้นทางมาสตูดิโอ</p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-12">
        <div className="min-w-0">
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className={`group flex items-start gap-5 rounded-lg p-5 transition sm:p-6 ${dark ? "border border-white/20 hover:border-[var(--brand)]" : "border border-[var(--line)] bg-[var(--panel)] hover:border-[var(--brand)]"}`}>
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--brand)] text-xl"><RiMapPinLine aria-hidden /></span>
            <div className="min-w-0">
              <h3 className="font-medium">The Horizon Music</h3>
              <p className={`mt-1 text-base leading-8 ${dark ? "text-white/75" : "text-[var(--muted)]"}`}>อยู่ใน Soccer Pro Ratchada 18</p>
              <span className="mt-3 inline-flex items-center gap-2 text-sm font-medium">ดูเส้นทาง <RiArrowRightUpLine aria-hidden /></span>
            </div>
          </a>
          <div className={`mt-4 divide-y ${dark ? "divide-white/15" : "divide-[var(--line)]"}`}>
            {contacts.map(({ icon: Icon, label, text, href }) => (
              <a key={label} href={href} target={href.startsWith("https:") ? "_blank" : undefined} rel={href.startsWith("https:") ? "noopener noreferrer" : undefined} className={`flex min-h-20 items-center gap-5 rounded-lg px-2 py-4 transition ${dark ? "hover:bg-white/10" : "hover:bg-[var(--brand-soft)]"}`}>
                <Icon aria-hidden className="shrink-0 text-2xl" />
                <div className="min-w-0">
                  <p className={`text-xs ${dark ? "text-white/65" : "text-[var(--muted)]"}`}>{label}</p>
                  <p className="mt-1 break-words text-sm font-medium sm:text-base">{text}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
          <iframe title="แผนที่ Horizon Music — Soccer Pro Ratchada 18" src={`https://maps.google.com/maps?q=${mapQuery}&output=embed`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-80 w-full flex-1 border-0 sm:h-[420px] lg:min-h-[400px]" />
          <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 border-t border-[var(--line)] bg-white px-5 py-4 text-sm font-medium text-[var(--ink)] hover:bg-[var(--brand-soft)]">เปิดใน Google Maps <RiArrowRightUpLine aria-hidden /></a>
        </div>
      </div>
    </section>
  );
}
