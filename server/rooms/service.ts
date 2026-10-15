import type { RoomListQuery, RoomType } from "@/server/rooms/contracts";
import type { EquipmentCategory } from "@/lib/equipment-categories";

type RoomRecord = Readonly<{
  capacity: number;
  currency: string;
  description: string;
  hourlyRate: string;
  id: string;
  imagePath: string | null;
  name: string;
  slug: string;
  type: RoomType;
}>;

type RoomDetailRecord = RoomRecord &
  Readonly<{
    equipment: ReadonlyArray<
      Readonly<{
        category: EquipmentCategory;
        description: string;
        id: string;
        name: string;
        note: string | null;
        quantity: number;
      }>
    >;
    images: ReadonlyArray<Readonly<{ altText: string; path: string }>>;
    status: "AVAILABLE" | "UNAVAILABLE" | "MAINTENANCE";
  }>;

type RoomRepository = Readonly<{
  findPublishedRooms(
    query: Partial<Pick<RoomListQuery, "limit" | "roomType" | "search">>,
  ): Promise<RoomRecord[]>;
  findPublishedRoomBySlug(slug: string): Promise<RoomDetailRecord | null>;
}>;

export type PublicRoomDto = Readonly<{
  capacity: number;
  currency: string;
  description: string;
  hourlyRate: number;
  id: string;
  imageUrl: string | null;
  name: string;
  slug: string;
  type: RoomType;
}>;

export type PublicRoomDetailDto = PublicRoomDto &
  Readonly<{
    equipment: RoomDetailRecord["equipment"];
    images: ReadonlyArray<Readonly<{ altText: string; url: string }>>;
    status: RoomDetailRecord["status"];
  }>;

function publicRoomImageUrl(path: string) {
  return path.startsWith("/") || path.startsWith("http")
    ? path
    : `/storage/room-images/${path}`;
}

export function createRoomService(repository: RoomRepository) {
  return {
    async listPublishedRooms(
      query: Partial<Pick<RoomListQuery, "limit" | "roomType" | "search">>,
    ): Promise<PublicRoomDto[]> {
      const rooms = await repository.findPublishedRooms(query);

      return rooms.map((room) => ({
        capacity: room.capacity,
        currency: room.currency,
        description: room.description,
        hourlyRate: Number(room.hourlyRate),
        id: room.id,
        imageUrl: room.imagePath ? publicRoomImageUrl(room.imagePath) : null,
        name: room.name,
        slug: room.slug,
        type: room.type,
      }));
    },
    async getPublishedRoom(slug: string): Promise<PublicRoomDetailDto | null> {
      const room = await repository.findPublishedRoomBySlug(slug);
      if (!room) return null;

      return {
        capacity: room.capacity,
        currency: room.currency,
        description: room.description,
        equipment: room.equipment,
        hourlyRate: Number(room.hourlyRate),
        id: room.id,
        imageUrl: room.images[0]
          ? publicRoomImageUrl(room.images[0].path)
          : null,
        images: room.images.map((image) => ({
          altText: image.altText,
          url: publicRoomImageUrl(image.path),
        })),
        name: room.name,
        slug: room.slug,
        status: room.status,
        type: room.type,
      };
    },
  };
}
