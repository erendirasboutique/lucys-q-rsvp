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

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function looksLikePhone(value) {
  return normalizePhone(value).length >= 7;
}

function makeCheckinCode(fullName, phoneNormalized) {
  const digits = phoneNormalized.slice(-4) || Math.floor(1000 + Math.random() * 9000);
  const initials = cleanText(fullName)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  return `LUCY-${initials || "G"}-${digits}`;
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Typeform webhook route is live",
  });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const answers = payload?.form_response?.answers || [];
    const allValues = answers.map(answerValue).map(cleanText).filter(Boolean);

    const fullName = allValues[0] || "";
    const travelFrom = allValues[1] || "";
    const attending = allValues[2] || "";

    const guestCountIndex = allValues.findIndex((value) => {
      const num = Number(value);
      return Number.isFinite(num) && num >= 1 && num <= 20;
    });

    const guestCountRaw = guestCountIndex >= 0 ? allValues[guestCountIndex] : "1";
    const guest_count = Number(guestCountRaw || 1);

    const phoneIndex = allValues.findIndex((value) => looksLikePhone(value));
    const phone = phoneIndex >= 0 ? allValues[phoneIndex] : "";
    const phone_normalized = normalizePhone(phone);

    const comments =
      phoneIndex >= 0 && phoneIndex + 1 < allValues.length
        ? allValues.slice(phoneIndex + 1).join("\n")
        : "";

    const guestNameAnswers =
      guestCountIndex >= 0 && phoneIndex > guestCountIndex
        ? allValues
            .slice(guestCountIndex + 1, phoneIndex)
            .filter((value) => {
              const normalized = normalizeText(value);
              return (
                value &&
                value !== fullName &&
                value !== phone &&
                value !== travelFrom &&
                value !== attending &&
                value !== guestCountRaw &&
                !looksLikePhone(value) &&
                !normalized.includes("todo se ve bien")
              );
            })
        : [];

    const additional_guests = guestNameAnswers.join("\n");
    const confirmed_guests = [fullName, ...guestNameAnswers].filter(Boolean).join("\n");

    if (!fullName || !phone_normalized) {
      return NextResponse.json(
        {
          ok: false,
          error: "Typeform submission is missing full name or phone.",
          debug: { allValues, guestCountIndex, phoneIndex },
        },
        { status: 400 }
      );
    }

    const rsvp = {
      full_name: fullName,
      travel_from: travelFrom,
      attending,
      guest_count,
      additional_guests,
      confirmed_guests,
      phone,
      phone_normalized,
      comments,
      typeform_response_id: payload?.form_response?.token || null,
      checkin_code: makeCheckinCode(fullName, phone_normalized),
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();

    const { data: existing, error: findError } = await supabase
      .from("rsvps")
      .select("id, checkin_code, table_number, checked_in, checked_in_at")
      .eq("phone_normalized", phone_normalized)
      .ilike("full_name", fullName)
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    const result = existing?.id
      ? await supabase
          .from("rsvps")
          .update({
            ...rsvp,
            checkin_code: existing.checkin_code || rsvp.checkin_code,
            table_number: existing.table_number || null,
            checked_in: existing.checked_in || false,
            checked_in_at: existing.checked_in_at || null,
          })
          .eq("id", existing.id)
          .select("*")
          .single()
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
