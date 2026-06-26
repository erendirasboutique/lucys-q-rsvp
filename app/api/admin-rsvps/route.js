import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../_supabase";

export async function POST(request) {
  try {
    const { password } = await request.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { ok: false, error: "Wrong password." },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase
      .from("rsvps")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);

    if (error) throw error;

    return NextResponse.json({ ok: true, rsvps: data || [] });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Admin error." },
      { status: 500 }
    );
  }
}
