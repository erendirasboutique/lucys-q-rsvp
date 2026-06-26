
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../_supabase";
 
function normalizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}
 
export async function POST(request) {
  const { password, rsvp } = await request.json();
 
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }
 
  const supabase = getSupabaseAdmin();
 
  const { data, error } = await supabase
    .from("rsvps")
    .update({
      full_name: rsvp.full_name,
      attending: rsvp.attending,
      guest_count: rsvp.guest_count,
      travel_from: rsvp.travel_from,
      additional_guests: rsvp.additional_guests,
      confirmed_guests: rsvp.confirmed_guests,
      phone: rsvp.phone,
      phone_normalized: normalizePhone(rsvp.phone),
      comments: rsvp.comments,
      table_number: rsvp.table_number,
      checkin_code: rsvp.checkin_code,
      checked_in: Boolean(rsvp.checked_in),
      checked_in_at: rsvp.checked_in_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rsvp.id)
    .select("*")
    .single();
 
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
 
  return NextResponse.json({ ok: true, rsvp: data });
}
