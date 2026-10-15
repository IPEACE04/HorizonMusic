"use client";

import Image from "next/image";
import { useState } from "react";
import { RiUser3Line } from "react-icons/ri";

export function UserAvatar({ image, className = "size-11" }: { image?: string | null; className?: string }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  return (
    <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--brand)] bg-[var(--brand-soft)] text-[var(--focus)] ${className}`}>
      {image && failedImage !== image ? (
        <Image src={image} alt="รูปโปรไฟล์" fill unoptimized sizes="128px" className="object-cover" onError={() => setFailedImage(image)} />
      ) : <RiUser3Line aria-hidden className="h-1/2 w-1/2" />}
    </span>
  );
}
