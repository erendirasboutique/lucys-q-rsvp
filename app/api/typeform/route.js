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

function normalizeTitle(text) {
  return (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findByAnyTitle(answers, phrases) {
  const normalizedPhrases = phrases.map(normalizeTitle);

  const found = answers.find((answer) => {
    const title = normalizeTitle(answer.field?.title || "");
    return normalizedPhrases.some((phrase) => title.includes(phrase));
  });

  return answerValue(found);
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

    const fullName = cleanText(
      findByAnyTitle(answers, [
        "por favor ingrese su nombre completo",
        "ingrese su nombre completo",
        "nombre completo",
      ])
    );

    const phone = cleanText(
      findByAnyTitle(answers, [
        "mejor numero de telefono",
        "numero de telefono",
        "telefono",
        "phone number",
        "best phone",
      ])
    );

    const phoneNormalized = normalizePhone(phone);

    if (!fullName || !phoneNormalized) {
      return NextResponse.json(
        {
          ok: false,
          error: "Typeform submission is missing full name or phone.",
          debug: {
            foundFullName: fullName,
            foundPhone: phone,
            receivedQuestions: answers.map((answer) => answer.field?.title || ""),
          },
        },
        { status: 400 }
      );
    }

    const rsvp = {
      full_name: fullName,
      travel_from: cleanText(
        findByAnyTitle(answers, [
          "desde donde viaja",
          "desde donde",
          "where are you traveling",
        ])
      ),
      attending: cleanText(
        findByAnyTitle(answers, [
          "vas a asistir",
          "asistir a la quinceanera",
          "asistir",
          "attending",
        ])
      ),
      guest_count: Number(
        findByAnyTitle(answers, [
          "cuantas personas habra",
          "cuantas personas",
          "personas habra",
          "grupo",
          "group",
        ]) || 1
      ),
      additional_guests: cleanText(
        findByAnyTitle(answers, [
          "invitados adicionales",
          "nombres de los invitados",
          "additional guests",
        ])
      ),
      confirmed_guests: cleanText(
        findByAnyTitle(answers, [
          "confirmar su grupo",
          "confirme su grupo",
          "confirmar",
        ])
      ),
      phone,
      phone_normalized: phoneNormalized,
      comments: cleanText(
        findByAnyTitle(answers, [
          "pregunta",
          "comentario",
          "comment",
          "question",
        ])
      ),
      typeform_response_id: payload?.form_response?.token || null,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();

    const { data: existing, error: findError } = await supabase
      .from("rsvps")
      .select("id")
      .eq("phone_normalized", phoneNormalized)
      .ilike("full_name", fullName)
      .limit(1)
      .maybeSingle();

    if (findError) throw findError;

    let result;

    if (existing?.id) {
      result = await supabase
        .from("rsvps")
        .update(rsvp)
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

    return NextResponse.json({
      ok: true,
      rsvp: result.data,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error.message || "Webhook error." },
      { status: 500 }
    );
  }
}
