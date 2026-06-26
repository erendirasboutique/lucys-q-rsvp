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

function titleIncludes(answer, phrases) {
  const title = normalizeText(answer?.field?.title || "");
  const ref = normalizeText(answer?.field?.ref || "");
  const id = normalizeText(answer?.field?.id || "");
  return phrases.some((phrase) => {
    const p = normalizeText(phrase);
    return title.includes(p) || ref.includes(p) || id.includes(p);
  });
}

function findAnswer(answers, phrases) {
  const found = answers.find((answer) => titleIncludes(answer, phrases));
  return cleanText(answerValue(found));
}

function findAllAnswers(answers, phrases) {
  return answers
    .filter((answer) => titleIncludes(answer, phrases))
    .map(answerValue)
    .map(cleanText)
    .filter(Boolean);
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

    const fullName =
      findAnswer(answers, [
        "por favor ingrese su nombre completo",
        "ingrese su nombre completo",
        "nombre completo",
      ]) || allValues[0] || "";

    const travelFrom =
      findAnswer(answers, [
        "desde donde viaja",
        "desde dónde viaja",
        "where are you traveling",
      ]) || "";

    const attending =
      findAnswer(answers, [
        "vas a asistir",
        "asistir a la quinceanera",
        "asistir a la quinceañera",
      ]) || "";

    const guestCountRaw =
      findAnswer(answers, [
        "cuantas personas habra",
        "cuántas personas habrá",
        "personas habra en su grupo",
        "personas habrá en su grupo",
      ]) || "";

    const guest_count = Number(guestCountRaw || 1);

    const phone =
      findAnswer(answers, [
        "numero de telefono",
        "número de teléfono",
        "telefono",
        "teléfono",
        "phone number",
        "best phone",
      ]) ||
      allValues.find((value) => looksLikePhone(value)) ||
      "";

    const phone_normalized = normalizePhone(phone);

    const comments =
      findAnswer(answers, [
        "alguna pregunta",
        "pregunta o comentario",
        "preguntas o comentarios",
        "comentario",
        "comments",
      ]) || "";

    const guestNameAnswers = findAllAnswers(answers, [
      "invitado",
      "nombre e inicial",
      "invitados adicionales",
      "nombres de los invitados adicionales",
    ]).filter((value) => {
      const normalized = normalizeText(value);
      return (
        value !== fullName &&
        value !== phone &&
        value !== travelFrom &&
        value !== attending &&
        value !== guestCountRaw &&
        value !== comments &&
        !looksLikePhone(value) &&
        !normalized.includes("todo se ve bien")
      );
    });

    const additional_guests = guestNameAnswers.join("\n");

    const confirmed_guests = [fullName, ...guestNameAnswers]
      .filter(Boolean)
      .join("\n");

    if (!fullName || !phone_normalized) {
      return NextResponse.json(
        {
          ok: false,
          error: "Typeform submission is missing full name or phone.",
          debug: {
            allValues,
            fullName,
            phone,
            fieldInfo: answers.map((answer) => ({
              id: answer.field?.id || "",
              ref: answer.field?.ref || "",
              title: answer.field?.title || "",
              value: answerValue(answer),
            })),
          },
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

    let result;

    if (existing?.id) {
      result = await supabase
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
        .single();
    } else {
      result = await supabase
        .from("rsvps")
        .insert(rsvp)
        .select("*")
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ ok: true, rsvp: result.data });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Webhook error." },
      { status: 500 }
    );
  }
}
