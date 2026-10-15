import Link from "next/link";
import Image from "next/image";

export function BrandMark({
  inverted = false,
  prominent = false,
}: {
  inverted?: boolean;
  prominent?: boolean;
}) {
  return (
    <Link href="/" aria-label="Horizon Music — หน้าหลัก" className={`inline-flex shrink-0 items-center rounded-lg ${inverted ? "bg-transparent" : "bg-white"}`}>
      <Image
        src="/logo/logo.png"
        alt="Horizon Music"
        width={1046}
        height={1045}
        sizes={prominent ? "(max-width: 639px) 72px, 104px" : "(max-width: 639px) 64px, 80px"}
        className={`${prominent ? "h-18 sm:h-26" : "h-16 sm:h-20"} w-auto rounded-lg object-contain`}
      />
    </Link>
  );
}
