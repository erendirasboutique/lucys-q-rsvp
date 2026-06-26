import { NextResponse } from "next/server";
import { cleanText, getSupabaseAdmin, normalizePhone } from "../_supabase";

function answerValue(answer) {
  if (!answer) return "";
  if (answer.type === "text") return answer.text || "";
  if (answer.type === "email") return answer.email || "";
  if (answer.type === "phone_number") return answer.phone_number || "";
  if (answer.type === "number") return String(answer.number ?? "");
  if (answer.type === "boolean") return answer.boolean ? "Sí" : "No";
  if (answer.type === "choice") return answer.choice?.label || "";
  if (answer.type === "choices") return (answer.choices?.labels || []).join(", ");
  return "";
}

function isPhone(value) {
  return normalizePhone(value).length >= 7;
}

export async function GET() {
  return NextResponse.json({ ok: true, message: "Typeform webhook route is live" });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const answers = payload?.form_response?.answers || [];
    const values = answers.map(answerValue).map(cleanText).filter(Boolean);

    const fullName = values[0] || "";
    const travelFrom = values[1] || "";
    const attending = values[2] || "";
    const guestCount = Number(values.find((v) => !isNaN(Number(v))) || 1);

    const phone = values.find((v) => isPhone(v)) || "";
    const phoneNormalized = normalizePhone(phone);

    const afterGuestCount = values.filter(
      (v) =>
        v !== fullName &&
        v !== travelFrom &&
        v !== attending &&
        v !== String(guestCount) &&
        v !== phone &&
        !isPhone(v)
    );

    let additionalGuests = "";
    let confirmedGuests = "";
    let comments = "";

    if (guestCount > 1) {
      additionalGuests = afterGuestCount[0] || "";
      confirmedGuests = afterGuestCount[1] || "";
      comments = afterGuestCount[2] || "";
    } else {
      comments = afterGuestCount[0] || "";
    }

    if (!fullName || !phoneNormalized) {
      return NextResponse.json(
        { ok: false, error: "Missing full name or phone.", debug: { values } },
        { status: 400 }
      );
    }

    const rsvp = {
      full_name: fullName,
      travel_from: travelFrom,
      attending,
      guest_count: guestCount,
      additional_guests: additionalGuests,
      confirmed_guests: confirmedGuests,
      phone,
      phone_normalized: phoneNormalized,
      comments,
      typeform_response_id: payload?.form_response?.token || null,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("rsvps")
      .select("id")
      .eq("phone_normalized", phoneNormalized)
      .ilike("full_name", fullName)
      .limit(1)
      .maybeSingle();

    const result = existing?.id
      ? await supabase.from("rsvps").update(rsvp).eq("id", existing.id).select("*").single()
      : await supabase.from("rsvps").insert(rsvp).select("*").single();

    if (result.error) throw result.error;

    return NextResponse.json({ ok: true, rsvp: result.data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Webhook error." },
      { status: 500 }
    );
  }
}
