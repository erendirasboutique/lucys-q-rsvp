// Sign in with full name + phone (or the check-in code), then remember this phone.
import { NextResponse } from "next/server";
import { db, cleanText, setSessionCookie, rateLimited, fail, serverError, newAccessToken } from "../../../../lib/portal-server";
import { normalizePhone } from "../../_supabase";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    if (rateLimited(req, "login", 10)) return fail("Too many tries. Please wait a minute and try again.", 429);
    const body = await req.json();
    const remember = body.remember !== false;
    const database = db();
    let rows;
    if (body.code) {
      const code = cleanText(body.code).toUpperCase();
      if (code.length < 6) return fail("not_found", 404);
      const { data, error } = await database.from("rsvps").select("id,access_token").eq("checkin_code", code).limit(2);
      if (error) throw error;
      rows = data;
    } else {
      const name = cleanText(body.full_name);
      const phone = normalizePhone(body.phone);
      if (name.length < 3 || phone.length < 7) return fail("Enter your full name and at least 7 phone digits.");
      const { data, error } = await database.from("rsvps").select("id,access_token").ilike("full_name", name).like("phone_normalized", "%" + phone.slice(-10)).limit(2);
      if (error) throw error;
      rows = data;
    }
    if (!rows || rows.length !== 1) return fail("not_found", 404);
    let guest = rows[0];
    if (!guest.access_token) {
      const { data, error } = await database.from("rsvps").update({ access_token: newAccessToken(), access_token_created_at: new Date().toISOString() }).eq("id", guest.id).select("id,access_token").single();
      if (error) throw error;
      guest = data;
    }
    await database.from("rsvps").update({ last_opened_at: new Date().toISOString() }).eq("id", guest.id);
    return setSessionCookie(NextResponse.json({ ok: true }), guest, remember);
  } catch (e) {
    return serverError("Guest login failed", e);
  }
}
