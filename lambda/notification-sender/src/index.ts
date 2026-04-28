/**
 * notification-sender Lambda
 *
 * Trigger: SQS queue spaza-notifications, batch size up to 10
 *
 * Receives outbound notification jobs and delivers them via the S2S WhatsApp
 * provider API. Records each message in outbound_messages before calling the
 * API so a failed call still has a row for audit and retry tracking.
 *
 * On API errors, the error is allowed to propagate so SQS handles retries
 * via the queue's redrive policy. Do not swallow errors silently.
 *
 * Network note: this is the only Lambda deployed in a public subnet because
 * it needs to reach the external S2S WhatsApp API over the internet. All
 * other Lambdas run in private subnets.
 */

import { SQSEvent } from "aws-lambda";
import { eq } from "drizzle-orm";
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { getDb } from "../../shared/db";

// ---------------------------------------------------------------------------
// Inline schema (subset needed by this Lambda)
// ---------------------------------------------------------------------------

const outboundMessages = pgTable("outbound_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  referenceId: text("reference_id").notNull(),
  requestKey: text("request_key").notNull(),
  waNumber: text("wa_number").notNull(),
  messageBody: text("message_body").notNull(),
  providerMessageId: text("provider_message_id"),
  purpose: text("purpose").notNull(),
  weekId: text("week_id"),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// S2S WhatsApp API client
// ---------------------------------------------------------------------------

interface S2SResponse {
  messageId?: string;
  wamid?: string;
}

/**
 * Sends a WhatsApp message via the S2S provider API.
 *
 * @param waNumber - Recipient WhatsApp number (digits only)
 * @param messageBody - Plain text message to deliver
 * @param requestKey - Unique key for idempotent delivery
 * @returns The provider's message ID (wamid) for delivery status correlation
 *
 * @throws When the S2S API returns a non-2xx response — let SQS handle retries
 *
 * @example
 * ```typescript
 * const wamid = await sendWhatsAppMessage("27821234567", "Hello!", "req_abc123");
 * // "wamid.abc123..."
 * ```
 */
async function sendWhatsAppMessage(
  waNumber: string,
  messageBody: string,
  requestKey: string
): Promise<string | null> {
  const apiUrl = process.env.S2S_API_URL;
  const apiKey = process.env.S2S_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("S2S_API_URL and S2S_API_KEY must be set");
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
      "X-Request-Key": requestKey,
    },
    body: JSON.stringify({
      to: waNumber,
      type: "text",
      text: { body: messageBody },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`S2S API error ${response.status}: ${body}`);
  }

  const data = await response.json() as S2SResponse;
  return data.wamid ?? data.messageId ?? null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

/**
 * SQS event handler — delivers up to 10 outbound WhatsApp notifications per
 * invocation.
 *
 * @param event - SQS event with Records array (batch size ≤ 10)
 *
 * @example
 * ```typescript
 * // SQS message body shape (published by whatsapp-processor or prize-draw)
 * {
 *   "waNumber": "27821234567",
 *   "messageBody": "Please complete your registration here: https://...",
 *   "purpose": "registration_complete",
 *   "weekId": "2026-W18",
 *   "requestKey": "27821234567:registration_complete:1745000000000"
 * }
 * ```
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  const db = await getDb();

  for (const record of event.Records) {
    const payload = JSON.parse(record.body) as {
      waNumber: string;
      messageBody: string;
      purpose: string;
      weekId?: string;
      requestKey: string;
    };

    const { waNumber, messageBody, purpose, weekId, requestKey } = payload;
    const referenceId = record.messageId;

    // Insert before calling the API so a failed call still has a row for audit
    await db.insert(outboundMessages).values({
      referenceId,
      requestKey,
      waNumber,
      messageBody,
      purpose,
      weekId,
    }).onConflictDoNothing();

    // Call S2S API — propagate errors so SQS retries via redrive policy
    const wamid = await sendWhatsAppMessage(waNumber, messageBody, requestKey);
    console.log(`[notification-sender] Sent to ${waNumber} (${purpose}) wamid=${wamid}`);

    if (wamid) {
      await db
        .update(outboundMessages)
        .set({ providerMessageId: wamid, acceptedAt: new Date() })
        .where(eq(outboundMessages.referenceId, referenceId));
    }
  }
};
