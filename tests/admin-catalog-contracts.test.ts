import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAddonInput,
  parseEquipmentInput,
  parseRoomImageInput,
  parseRoomInput,
} from "../features/admin/catalog-contracts";

test("room input normalizes text and numeric values", () => {
  assert.deepEqual(
    parseRoomInput({
      capacity: "6",
      description: "  ห้องซ้อมหลัก  ",
      hourlyRate: "750.50",
      isPublished: true,
      name: "  Studio A  ",
      slug: " Studio-A ",
      status: "AVAILABLE",
      type: "REHEARSAL",
    }),
    {
      capacity: 6,
      description: "ห้องซ้อมหลัก",
      hourlyRate: 750.5,
      isPublished: true,
      name: "Studio A",
      slug: "studio-a",
      status: "AVAILABLE",
      type: "REHEARSAL",
    },
  );
});

test("room input rejects unsafe slugs and invalid money", () => {
  assert.throws(
    () =>
      parseRoomInput({
        capacity: 1,
        hourlyRate: 0,
        name: "A",
        slug: "ห้อง A",
        status: "AVAILABLE",
        type: "REHEARSAL",
      }),
    /ราคา/,
  );
  assert.throws(
    () =>
      parseRoomInput({
        capacity: 1,
        hourlyRate: 10,
        name: "A",
        slug: "../a",
        status: "AVAILABLE",
        type: "REHEARSAL",
      }),
    /slug/i,
  );
});

test("equipment and add-on inputs validate their pricing models", () => {
  assert.deepEqual(
    parseEquipmentInput({
      category: "MIC",
      name: "  SM57 ",
      description: " Mic ",
    }),
    { category: "MIC", name: "SM57", description: "Mic" },
  );
  assert.throws(
    () => parseEquipmentInput({ category: "SPEAKER", name: "SM57" }),
    /ประเภทอุปกรณ์/,
  );
  assert.deepEqual(
    parseAddonInput({
      name: " Engineer ",
      description: "",
      pricingType: "PER_HOUR",
      unitPrice: "500",
      isActive: true,
    }),
    {
      name: "Engineer",
      description: "",
      pricingType: "PER_HOUR",
      unitPrice: 500,
      isActive: true,
    },
  );
  assert.throws(
    () =>
      parseAddonInput({
        name: "Engineer",
        pricingType: "UNKNOWN",
        unitPrice: 500,
      }),
    /รูปแบบราคา/,
  );
});

test("room image metadata permits only bucket-safe paths and image types", () => {
  assert.deepEqual(
    parseRoomImageInput({
      altText: "  ห้อง Studio A ",
      mimeType: "image/webp",
      size: 1000,
    }),
    {
      altText: "ห้อง Studio A",
      extension: "webp",
      mimeType: "image/webp",
      size: 1000,
    },
  );
  assert.throws(
    () =>
      parseRoomImageInput({
        altText: "Room",
        mimeType: "application/pdf",
        size: 1000,
      }),
    /JPEG, PNG หรือ WebP/,
  );
  assert.throws(
    () =>
      parseRoomImageInput({
        altText: "Room",
        mimeType: "image/png",
        size: 10_485_761,
      }),
    /10 MB/,
  );
});
