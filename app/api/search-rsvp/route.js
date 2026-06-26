import { NextResponse } from "next/server";
import { cleanText, getSupabaseAdmin, normalizePhone } from "../_supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const fullName = cleanText(body.full_name || body.fullName);
    const phoneNormalized = normalizePhone(body.phone);

    if (!fullName || !phoneNormalized) {
      return NextResponse.json({ ok: false, error: "Enter your full name and phone number." }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("rsvps")
      .select("id, full_name, travel_from, attending, guest_count, additional_guests, confirmed_guests, phone, comments, updated_at")
      .eq("phone_normalized", phoneNormalized)
      .ilike("full_name", fullName)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ ok: false, error: "We could not find your RSVP. Check the name and phone number." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, rsvp: data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "Search error." }, { status: 500 });
  }
}
