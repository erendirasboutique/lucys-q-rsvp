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

export async function GET() {
  return NextResponse.json({ ok: true, message: "Typeform webhook route is live" });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const answers = payload?.form_response?.answers || [];

    const values = answers.map(answerValue);

    const fullName = cleanText(values[0]);
    const travelFrom = cleanText(values[1]);
    const attending = cleanText(values[2]);
    const guestCount = Number(values[3] || 1);
    const additionalGuests = cleanText(values[4]);
    const confirmedGuests = cleanText(values[5]);
const phone =
  cleanText(values.find((value) => normalizePhone(value).length >= 10)) || "";

const comments =
  cleanText(values.find((value) =>
    value &&
    value !== fullName &&
    value !== travelFrom &&
    value !== attending &&
    value !== String(guestCount) &&
    value !== phone &&
    normalizePhone(value).length < 10
  )) || "";

    const phoneNormalized = normalizePhone(phone);

    if (!fullName || !phoneNormalized) {
      return NextResponse.json(
        {
          ok: false,
          error: "Typeform submission is missing full name or phone.",
          debug: { values }
        },
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
