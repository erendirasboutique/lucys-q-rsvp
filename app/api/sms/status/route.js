
import twilio from "twilio";
import { db } from "../../../../lib/lucy-sms";

export const runtime = "nodejs";

const TERMINAL_STATUSES = new Set([
  "delivered",
  "undelivered",
  "failed",
  "canceled",
]);

export async function POST(req) {
  try {
    const signature =
      req.headers.get("x-twilio-signature") || "";

    const rawBody = await req.text();

    const params = Object.fromEntries(
      new URLSearchParams(rawBody)
    );

    const baseUrl = (
      process.env.SMS_PUBLIC_BASE_URL || ""
    ).trim().replace(/\/+$/, "");

    const authToken =
      process.env.TWILIO_AUTH_TOKEN || "";

    if (!baseUrl.startsWith("https://") || !authToken) {
      console.error(
        "SMS status webhook: missing or invalid configuration",
        {
          hasBaseUrl: Boolean(baseUrl),
          hasAuthToken: Boolean(authToken),
        }
      );

      return new Response(
        "Webhook configuration error",
        { status: 500 }
      );
    }

    const callbackUrl =
      `${baseUrl}/api/sms/status`;

    const validSignature = twilio.validateRequest(
      authToken,
      signature,
      callbackUrl,
      params
    );

    if (!validSignature) {
      console.error(
        "SMS status webhook: invalid Twilio signature"
      );

      return new Response(
        "Invalid signature",
        { status: 403 }
      );
    }

    const messageSid =
      params.MessageSid || params.SmsSid;

    const messageStatus =
      params.MessageStatus || params.SmsStatus;

    if (!messageSid || !messageStatus) {
      return new Response(
        "Missing message fields",
        { status: 400 }
      );
    }

    const supabase = db();

    const { data: row, error: readError } =
      await supabase
        .from("sms_outbox")
        .select("id,status")
        .eq("twilio_sid", messageSid)
        .maybeSingle();

    if (readError) {
      console.error(
        "SMS status webhook: database lookup failed",
        {
          code: readError.code,
          message: readError.message,
        }
      );

      return new Response(
        "Database lookup failed",
        { status: 500 }
      );
    }

    // The message might not yet be recorded locally.
    if (!row) {
      console.warn(
        "SMS status webhook: message SID not found"
      );

      return new Response("OK", { status: 200 });
    }

    // Do not replace a final status with an earlier status.
    if (
      TERMINAL_STATUSES.has(row.status) &&
      !TERMINAL_STATUSES.has(messageStatus)
    ) {
      return new Response("OK", { status: 200 });
    }

    // Do not change one terminal status to another.
    if (
      TERMINAL_STATUSES.has(row.status) &&
      row.status !== messageStatus
    ) {
      return new Response("OK", { status: 200 });
    }

    const { error: updateError } =
      await supabase
        .from("sms_outbox")
        .update({
          status: messageStatus,
          error_message: params.ErrorCode
            ? `Twilio error ${params.ErrorCode}`
            : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id);

    if (updateError) {
      console.error(
        "SMS status webhook: database update failed",
        {
          code: updateError.code,
          message: updateError.message,
        }
      );

      return new Response(
        "Database update failed",
        { status: 500 }
      );
    }

    console.log("SMS delivery status updated", {
      status: messageStatus,
    });

    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error(
      "SMS status webhook unexpected error:",
      error
    );

    return new Response(
      "Internal webhook error",
      { status: 500 }
    );
  }
}
