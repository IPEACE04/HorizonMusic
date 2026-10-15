import "server-only";

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret)
  throw new Error("Supabase server credentials are required");

export const supabaseAdmin = createClient(url, secret, {
  auth: { autoRefreshToken: false, persistSession: false },
});
