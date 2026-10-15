import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error(
    "ต้องกำหนด SUPABASE_URL และ SUPABASE_SECRET_KEY ใน .env.local",
  );
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const buckets: Array<{
  id: string;
  options: {
    allowedMimeTypes: string[];
    fileSizeLimit: string;
    public: boolean;
  };
}> = [
  {
    id: "room-images",
    options: {
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: "10MB",
      public: true,
    },
  },
  {
    id: "profile-images",
    options: {
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      fileSizeLimit: "3MB",
      public: true,
    },
  },
  {
    id: "payment-slips",
    options: {
      allowedMimeTypes: ["image/jpeg", "image/png", "application/pdf"],
      fileSizeLimit: "10MB",
      public: false,
    },
  },
];

async function main() {
  const { data: existingBuckets, error: listError } =
    await supabase.storage.listBuckets();
  if (listError) throw listError;

  const existingIds = new Set(existingBuckets.map((bucket) => bucket.id));

  for (const bucket of buckets) {
    const result = existingIds.has(bucket.id)
      ? await supabase.storage.updateBucket(bucket.id, bucket.options)
      : await supabase.storage.createBucket(bucket.id, bucket.options);

    if (result.error) throw result.error;
    console.log(
      `${existingIds.has(bucket.id) ? "updated" : "created"}: ${bucket.id}`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Storage setup failed",
  );
  process.exitCode = 1;
});
