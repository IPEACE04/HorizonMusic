import assert from "node:assert/strict";
import test from "node:test";

import { createRoomService } from "../server/rooms/service";

test("room service maps public rooms without exposing internal audit fields", async () => {
  const service = createRoomService({
    async findPublishedRooms() {
      return [
        {
          capacity: 6,
          currency: "THB",
          description: "พร้อมกลองและแอมป์",
          hourlyRate: "450.00",
          id: "room-1",
          imagePath: null,
          name: "Studio A",
          slug: "studio-a",
          type: "REHEARSAL" as const,
        },
      ];
    },
    async findPublishedRoomBySlug() {
      return null;
    },
  });

  assert.deepEqual(await service.listPublishedRooms({ limit: 12 }), [
    {
      capacity: 6,
      currency: "THB",
      description: "พร้อมกลองและแอมป์",
      hourlyRate: 450,
      id: "room-1",
      imageUrl: null,
      name: "Studio A",
      slug: "studio-a",
      type: "REHEARSAL",
    },
  ]);
});

test("room service returns a published room detail with gallery and equipment", async () => {
  const service = createRoomService({
    async findPublishedRooms() {
      return [];
    },
    async findPublishedRoomBySlug() {
      return {
        capacity: 8,
        currency: "THB",
        description: "ห้องซ้อมขนาดใหญ่",
        equipment: [
          {
            category: "DRUM" as const,
            description: "กลองชุด 5 ชิ้น",
            id: "equipment-1",
            name: "Drum kit",
            quantity: 1,
            note: null,
          },
        ],
        hourlyRate: "650.00",
        id: "room-1",
        imagePath: "studio-a/hero.jpg",
        images: [{ altText: "Studio A", path: "studio-a/hero.jpg" }],
        name: "Studio A",
        slug: "studio-a",
        status: "AVAILABLE" as const,
        type: "REHEARSAL" as const,
      };
    },
  });

  assert.deepEqual(await service.getPublishedRoom("studio-a"), {
    capacity: 8,
    currency: "THB",
    description: "ห้องซ้อมขนาดใหญ่",
    equipment: [
      {
        category: "DRUM",
        description: "กลองชุด 5 ชิ้น",
        id: "equipment-1",
        name: "Drum kit",
        quantity: 1,
        note: null,
      },
    ],
    hourlyRate: 650,
    id: "room-1",
    imageUrl: "/storage/room-images/studio-a/hero.jpg",
    images: [
      { altText: "Studio A", url: "/storage/room-images/studio-a/hero.jpg" },
    ],
    name: "Studio A",
    slug: "studio-a",
    status: "AVAILABLE",
    type: "REHEARSAL",
  });
});
