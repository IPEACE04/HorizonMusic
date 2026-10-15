import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({ path: ".env.local" });

if (!process.env.DATABASE_URL_DIRECT) {
  throw new Error("DATABASE_URL_DIRECT is required to run Drizzle migrations");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./db/schema/auth.ts",
  out: "./db/drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_DIRECT,
  },
});
