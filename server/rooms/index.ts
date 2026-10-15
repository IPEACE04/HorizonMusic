import "server-only";

import { createRoomRepository } from "@/server/rooms/repository";
import { createRoomService } from "@/server/rooms/service";

export const roomService = createRoomService(createRoomRepository());
