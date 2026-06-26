import { NextResponse } from "next/server";
import { cleanText, getSupabaseAdmin, normalizePhone } from "../_supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const id = cleanText(body.id);
    const fullName = cleanText(body.full_name || body.fullName);
    const phone = cleanText(body.phone);
    const phoneNormalized = normalizePhone(phone);

    if (!id || !fullName || !phoneNormalized) {
      return NextResponse.json({ ok: false, error: "Missing RSVP ID, name, or phone." }, { status: 400 });
    }

    const update = {
      attending: cleanText(body.attending),
      guest_count: Number(body.guest_count || 1),
      travel_from: cleanText(body.travel_from),
      additional_guests: cleanText(body.additional_guests),
      confirmed_guests: cleanText(body.confirmed_guests),
      comments: cleanText(body.comments),
      updated_at: new Date().toISOString(),
    };

    if (!Number.isFinite(update.guest_count) || update.guest_count < 1) update.guest_count = 1;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("rsvps")
      .update(update)
      .eq("id", id)
      .eq("phone_normalized", phoneNormalized)
      .ilike("full_name", fullName)
      .select("id, full_name, travel_from, attending, guest_count, additional_guests, confirmed_guests, phone, comments, updated_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ ok: true, rsvp: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Update error." }, { status: 500 });
  }
}
