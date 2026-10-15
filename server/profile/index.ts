import "server-only";

import { createProfileRepository } from "@/server/profile/repository";

export const profileRepository = createProfileRepository();
