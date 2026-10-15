import Image from "next/image";
import Link from "next/link";
import { RiArrowRightDoubleLine } from "react-icons/ri";
import { formatThaiBaht } from "@/lib/presentation";
import type { PublicRoomDto } from "@/server/rooms/service";
const fallbackImages = [
  "/picture/guitar1.jpg",
  "/picture/concert.jpg",
  "/picture/concert2.jpg",
];
export function RoomCard({
  room,
  index = 0,
}: {
  room: PublicRoomDto;
  index?: number;
}) {
  return (
    <article className="studio-room-card flex h-full min-w-0 flex-col text-center">
      <Link
        href={`/rooms/${room.slug}`}
        aria-label={`ดูรายละเอียด ${room.name}`}
        className="group relative block aspect-square overflow-hidden bg-black"
      >
        <Image
          src={room.imageUrl ?? fallbackImages[index % fallbackImages.length]}
          alt={room.name}
          fill
          unoptimized={Boolean(room.imageUrl)}
          className="object-cover transition duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) calc(100vw - 40px), (max-width: 1024px) 45vw, 400px"
        />
      </Link>
      <div className="flex flex-1 flex-col items-center px-3 pb-2 pt-7 sm:pt-8">
        <Link href={`/rooms/${room.slug}`} className="hover:text-[var(--focus)]">
          <h3 className="wrap-anywhere text-xl font-normal leading-relaxed sm:text-2xl">
            {room.name}
          </h3>
        </Link>
        <p className="mt-1 text-lg font-normal tabular-nums text-zinc-700 sm:text-xl">
          {formatThaiBaht(room.hourlyRate)}/ชม.
        </p>
        <p className="mb-5 text-lg font-normal text-zinc-700 sm:text-xl">สำหรับ {room.capacity} ท่าน</p>
        {room.description ? (
          <p className="mb-5 whitespace-pre-line text-base font-normal leading-8 text-zinc-700">
            {room.description}
          </p>
        ) : null}
        <Link
          href={`/booking/new?roomId=${room.id}`}
          aria-label={`Book Now — ${room.name}`}
          className="studio-button studio-button--secondary mt-auto w-full max-w-64 gap-4 rounded-none border-black bg-transparent py-3 text-lg hover:bg-[var(--brand)]"
        >
          Book Now <RiArrowRightDoubleLine className="text-2xl" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
