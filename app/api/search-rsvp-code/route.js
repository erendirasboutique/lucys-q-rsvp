import { NextResponse } from "next/server";
import { cleanText, getSupabaseAdmin } from "../_supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const code = cleanText(body.code || "").toUpperCase();

    if (!code) {
      return NextResponse.json(
        { ok: false, error: "Missing RSVP code." },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("rsvps")
      .select("*")
      .eq("checkin_code", code)
      .limit(1)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { ok: false, error: "We could not find this RSVP code." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, rsvp: data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Code search error." },
      { status: 500 }
    );
  }
}
