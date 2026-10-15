import "server-only";

import { betterAuth } from "better-auth";

import { createAuthOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export const auth = betterAuth(createAuthOptions(db));
