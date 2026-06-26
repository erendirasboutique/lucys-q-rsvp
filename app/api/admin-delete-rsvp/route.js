import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../_supabase";
 
export async function POST(request) {
  const { password, id } = await request.json();
 
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "Wrong password." }, { status: 401 });
  }
 
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("rsvps").delete().eq("id", id);
 
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
 
  return NextResponse.json({ ok: true });
}
