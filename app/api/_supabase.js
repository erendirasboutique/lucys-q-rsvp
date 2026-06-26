import { createClient } from "@supabase/supabase-js";

export function cleanText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizePhone(value) {
  return cleanText(value).replace(/\D/g, "");
}

export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in Vercel Environment Variables.");
  if (!key) throw new Error("Missing SUPABASE_SECRET_KEY in Vercel Environment Variables.");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
