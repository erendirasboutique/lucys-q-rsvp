
import { NextResponse } from "next/server";
import {
  cleanText,
  getSupabaseAdmin,
  normalizePhone,
} from "../_supabase";
import crypto from "node:crypto";

export const runtime = "nodejs";

/* ========================================
   TYPEFORM FIELD IDS
======================================== */

const FIELDS = {
  fullName: "f5dd5c4e-635c-477f-aba0-0b74a03a3e01",
  travelFrom: "005ac1d0-68a4-4cc9-ba32-d0974a03f222",
  attending: "affad57e-f25e-4a7c-ae8a-4c951c054561",
  guestCount: "f09b5c17-0c14-45aa-b9e4-925cf15c5dfb",

  guest2: "f31a1607-c8af-46b0-966e-fe891a42e754",
  guest3: "051023f1-227a-4314-9864-319545ed7ffa",
  guest4: "289077df-4aff-4311-8402-8e6a2ad86b5d",

  confirmedGuests: "64b2a037-78c2-422a-a0cb-cb03128c404f",
  phone: "4db6e773-41d7-4d52-a21f-980502147a34",
};

/* ========================================
   EXTRACT TYPEFORM ANSWERS
======================================== */

function answerValue(answer) {
  if (!answer) return "";

  switch (answer.type) {
    case "text":
      return answer.text || "";

    case "email":
      return answer.email || "";

    case "phone_number":
      return answer.phone_number || "";

    case "number":
      return answer.number ?? "";

    case "boolean":
      return answer.boolean ? "Sí" : "No";

    case "choice":
      return answer.choice?.label || "";

    case "choices":
      return (answer.choices?.labels || []).join(", ");

    case "date":
      return answer.date || "";

    default:
      return "";
  }
}

function getAnswer(answers, fieldId) {
  const answer = answers.find(
    (item) =>
      item?.field?.id === fieldId ||
      item?.field?.ref === fieldId
  );

  return answerValue(answer);
}

function getByTitle(answers, keywords) {
  const answer = answers.find((item) => {
    const title = (item?.field?.title || "").toLowerCase();

    return keywords.some((keyword) =>
      title.includes(keyword.toLowerCase())
    );
  });

  return answerValue(answer);
}

/* ========================================
   VERIFY TYPEFORM SIGNATURE
======================================== */

function verifySignature(rawBody, signature, secret) {
  if (!signature || !secret) return false;

  const expected =
    "sha256=" +
    crypto
      .createHmac("sha256", secret)
      .update(rawBody)
      .digest("base64");

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

/* ========================================
   HEALTH CHECK
======================================== */

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Lucy's Typeform webhook is active.",
  });
}

/* ========================================
   RECEIVE TYPEFORM SUBMISSION
======================================== */

export async function POST(request) {
  try {
    const rawBody = await request.text();

    const secret = process.env.TYPEFORM_WEBHOOK_SECRET;

    if (!secret) {
      return NextResponse.json(
        {
          ok: false,
          error: "Typeform webhook secret not configured",
        },
        { status: 503 }
      );
    }

    const signature =
      request.headers.get("typeform-signature") || "";

    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Typeform signature",
        },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    const formResponse = payload?.form_response;

    if (!formResponse) {
      return NextResponse.json(
        {
          ok: false,
          error: "Missing form_response",
        },
        { status: 400 }
      );
    }

    const answers = formResponse.answers || [];

    /* ====================================
       NAME AND PHONE
    ==================================== */

    const fullName = cleanText(
      getAnswer(answers, FIELDS.fullName)
    );

    const phone = cleanText(
      getAnswer(answers, FIELDS.phone)
    );

    const phoneNormalized = normalizePhone(phone);

    if (!fullName || !phoneNormalized) {
      console.error("Typeform field mapping failed", {
        hasName: Boolean(fullName),
        hasPhone: Boolean(phone),
        hasNormalizedPhone: Boolean(phoneNormalized),
        receivedFieldIds: answers.map(
          (answer) => answer?.field?.id
        ),
      });

      return NextResponse.json(
        {
          ok: false,
          error:
            "Typeform submission is missing full name or phone.",
        },
        { status: 400 }
      );
    }

    /* ====================================
       ATTENDANCE
    ==================================== */

    const attending = cleanText(
      getAnswer(answers, FIELDS.attending)
    );

    /* ====================================
       GUEST COUNT
    ==================================== */

    const guestCountRaw = getAnswer(
      answers,
      FIELDS.guestCount
    );

    const parsedCount = Number(guestCountRaw);

    const guestCount =
      Number.isFinite(parsedCount) && parsedCount > 0
        ? Math.floor(parsedCount)
        : 1;

    /* ====================================
       ADDITIONAL GUESTS
    ==================================== */

    const additionalGuestNames = [
      getAnswer(answers, FIELDS.guest2),
      getAnswer(answers, FIELDS.guest3),
      getAnswer(answers, FIELDS.guest4),
    ]
      .map((name) => cleanText(name))
      .filter(Boolean);

    const additionalGuests =
      additionalGuestNames.join(", ");

    const confirmedGuests = cleanText(
      getAnswer(answers, FIELDS.confirmedGuests)
    );

    /* ====================================
       TRAVEL AND COMMENTS
    ==================================== */

    const travelFrom = cleanText(
      getAnswer(answers, FIELDS.travelFrom)
    );

    const comments = cleanText(
      getByTitle(answers, [
        "comentario",
        "comments",
        "pregunta",
      ])
    );

    const responseId =
      formResponse.token ||
      formResponse.response_id ||
      null;

    /* ====================================
       PREPARE SUPABASE DATA
    ==================================== */

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
      typeform_response_id: responseId,
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdmin();

    /* ====================================
       CHECK FOR EXISTING RESPONSE
    ==================================== */

    let existing = null;

    if (responseId) {
      const { data, error } = await supabase
        .from("rsvps")
        .select("id")
        .eq("typeform_response_id", responseId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      existing = data;
    }

    /* ====================================
       FALLBACK: NAME + PHONE
    ==================================== */

    if (!existing) {
      const { data, error } = await supabase
        .from("rsvps")
        .select("id")
        .eq("phone_normalized", phoneNormalized)
        .ilike("full_name", fullName)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      existing = data;
    }

    /* ====================================
       INSERT OR UPDATE RSVP
    ==================================== */

    let result;

    if (existing?.id) {
      result = await supabase
        .from("rsvps")
        .update(rsvp)
        .eq("id", existing.id)
        .select("id")
        .single();
    } else {
      result = await supabase
        .from("rsvps")
        .insert(rsvp)
        .select("id")
        .single();
    }

    if (result.error) {
      throw result.error;
    }

    console.log("Typeform RSVP saved", {
      responseId,
      operation: existing?.id ? "updated" : "created",
    });

    return NextResponse.json({
      ok: true,
      message: "RSVP saved successfully",
      response_id: responseId,
    });
  } catch (error) {
    console.error("Typeform webhook error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to process RSVP submission.",
      },
      { status: 500 }
    );
  }
}
