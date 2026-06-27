import { NextResponse } from "next/server";
import { cleanText, getSupabaseAdmin, normalizePhone } from "../_supabase";

const REFS = {
  fullName: "f5dd5c4e-635c-477f-aba0-0b74a03a3e01",
  travelFrom: "005ac1d0-68a4-4cc9-ba32-d0974a03f222",
  attending: "affad57e-f25e-4a7c-ae8a-4c951c054561",
  guestCount: "f09b5c17-0c14-45aa-b9e4-925cf15c5dfb",
  guests: [
    "f31a1607-c8af-46b0-966e-fe891a42e754",
    "051023f1-227a-4314-9864-319545ed7ffa",
    "289077df-4aff-4311-8402-8e6a2ad86b5d",
    "58ebd28e-a404-4375-972a-f33f800fce82",
    "54297145-92c2-4e15-bbd9-3b0e6cb2ee21",
  ],
  confirmGroup: "64b2a037-78c2-422a-a0cb-cb03128c404f",
  phone: "4db6e773-41d7-4d52-a21f-980502147a34",
  comments: "30f15be4-92ce-4553-ba3f-e67cc679a59a",
};

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

function byRef(answers, ref) {
  const found = answers.find((answer) => answer.field?.ref === ref);
  return cleanText(answerValue(found));
}

function makeCheckinCode(fullName, phoneNormalized) {
  const digits = phoneNormalized.slice(-4);
  const initials = cleanText(fullName)
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 3);

  return `LUCY-${initials || "G"}-${digits || Math.floor(1000 + Math.random() * 9000)}`;
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

    const fullName = byRef(answers, REFS.fullName);
    const travelFrom = byRef(answers, REFS.travelFrom);
    const attending = byRef(answers, REFS.attending);
    const guestCountRaw = byRef(answers, REFS.guestCount);
    const guest_count = Number(guestCountRaw || 1);

    const phone = byRef(answers, REFS.phone);
    const phone_normalized = normalizePhone(phone);

    const guestNames = REFS.guests
      .map((ref) => byRef(answers, ref))
      .filter(Boolean);

    const additional_guests = guestNames.join("\n");
    const confirmed_guests = [fullName, ...guestNames].filter(Boolean).join("\n");

    const comments = byRef(answers, REFS.comments);

    if (!fullName || !phone_normalized) {
      return NextResponse.json(
        {
          ok: false,
          error: "Typeform submission is missing full name or phone.",
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
