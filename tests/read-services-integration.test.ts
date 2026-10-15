import assert from "node:assert/strict";
import test from "node:test";

import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env.local", quiet: true });

const databaseUrl = process.env.DATABASE_URL;
const integrationTest =
  process.env.SMT_DATABASE_INTEGRATION === "1" && databaseUrl
    ? test
    : test.skip;

integrationTest(
  "read services backing the public and admin APIs query Supabase successfully",
  async () => {
    const pool = new Pool({ connectionString: databaseUrl });

    try {
      const [userResult, roomResult] = await Promise.all([
        pool.query<{ id: string; role: string | null }>(
          `select id,role from public."user" order by created_at limit 100`,
        ),
        pool.query<{ id: string; slug: string }>(
          `select id,slug::text from public.rooms where is_published=true and deleted_at is null order by created_at limit 1`,
        ),
      ]);
      const userId = userResult.rows[0]?.id;
      const room = roomResult.rows[0];

      const [
        { createRoomRepository },
        { createRoomService },
        catalog,
        promos,
        payments,
        notifications,
        chat,
        bookings,
        operations,
        { createProfileRepository },
        { getDashboardSummary },
      ] = await Promise.all([
        import("../server/rooms/repository"),
        import("../server/rooms/service"),
        import("../server/admin/catalog/service"),
        import("../server/admin/promos/service"),
        import("../server/payments/service"),
        import("../server/notifications/service"),
        import("../server/chat/service"),
        import("../server/bookings/service"),
        import("../server/admin/operations"),
        import("../server/profile/repository"),
        import("../server/admin/dashboard"),
      ]);

      const roomService = createRoomService(createRoomRepository(pool));
      const roomList = await roomService.listPublishedRooms({ limit: 100 });
      assert.ok(Array.isArray(roomList));

      if (room) {
        const [detail, availability] = await Promise.all([
          roomService.getPublishedRoom(room.slug),
          bookings.checkAvailability(
            room.id,
            "2030-01-01T10:00:00.000Z",
            60,
            pool,
          ),
        ]);
        assert.ok(detail === null || detail.id === room.id);
        assert.equal(typeof availability.available, "boolean");
      }

      const results = await Promise.all([
        catalog.listAdminRooms(pool),
        catalog.listAdminEquipment(pool),
        catalog.listAdminAddons(pool),
        promos.listAdminPromos(pool),
        payments.listPendingPayments(pool),
        operations.listAdminBookings(
          new URLSearchParams("page=1&pageSize=50"),
          pool,
        ),
        operations.listAdminUsers(
          new URLSearchParams("page=1&pageSize=50"),
          pool,
        ),
        operations.listActivityLogs(
          new URLSearchParams("page=1&pageSize=50"),
          pool,
        ),
        operations.listAdminCalendar(
          "2026-09-06T17:00:00.000Z",
          "2026-09-13T17:00:00.000Z",
          undefined,
          pool,
        ),
        operations.getBookingPolicy(pool),
        bookings.getActiveAddons(pool),
        getDashboardSummary(),
      ]);
      results.forEach((result) => assert.ok(result));

      if (userId) {
        const profile = createProfileRepository(pool);
        const [userBookings, userProfile, userNotifications, unread] =
          await Promise.all([
            bookings.listUserBookings(userId, pool),
            profile.findByUserId(userId),
            notifications.listNotifications(userId, pool),
            notifications.notificationUnreadCount(userId, pool),
          ]);
        assert.ok(Array.isArray(userBookings));
        assert.ok(userProfile === null || userProfile.userId === userId);
        assert.ok(Array.isArray(userNotifications));
        assert.equal(typeof unread, "number");

        const admin = userResult.rows.find((user) => user.role === "admin");
        if (admin) {
          const conversations = await chat.listAdminConversations(
            admin.id,
            pool,
          );
          assert.ok(Array.isArray(conversations));
        }
      }
    } finally {
      await pool.end();
    }
  },
);
