import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { randomUUID } from "node:crypto";

dotenv.config({ path: ".env.local", quiet: true });
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Supabase server credentials are required");
const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
async function main() {
  const existing = await client.storage.getBucket("profile-images");
  if (existing.data) {
    console.log("profile-images bucket already exists");
  } else {
    const created = await client.storage.createBucket("profile-images", {
      public: true,
      fileSizeLimit: 3 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    if (created.error) throw new Error(created.error.message);
    console.log("Created profile-images bucket");
  }
  if (process.argv.includes("--verify")) {
    const path = `_verification/${randomUUID()}.png`;
    const bytes = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6MRsAAAAASUVORK5CYII=", "base64");
    const storage = client.storage.from("profile-images");
    const upload = await storage.upload(path, bytes, { contentType: "image/png", upsert: false });
    if (upload.error) throw new Error(upload.error.message);
    try {
      const response = await fetch(storage.getPublicUrl(path).data.publicUrl);
      if (!response.ok || !Buffer.from(await response.arrayBuffer()).equals(bytes)) throw new Error("Profile image public-read verification failed");
      console.log("Verified profile image upload and public read");
    } finally {
      const removed = await storage.remove([path]);
      if (removed.error) throw new Error(removed.error.message);
      console.log("Removed verification fixture");
    }
  }
}
void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Profile storage setup failed");
  process.exitCode = 1;
});
