/**
 * email — THE transport. Every message the product sends goes through `sendEmail`, and nothing
 * else in `functions/src` may talk to Resend.
 *
 * ⚠️ ONE THROAT TO CHOKE. Deliverability failures are diffuse by nature — a domain's reputation,
 * a header, a rate limit, a bounce nobody saw — and the only way to diagnose one is to have a
 * single place where every send is made and every outcome is logged. A template that called the
 * provider directly would be a second place, and the day it misbehaves nobody would look there.
 *
 * ⚠️ A SEND FAILURE MUST NEVER LOSE A SIGNUP. `sendEmail` returns an outcome and never throws:
 * the caller writes its document, returns success to the reader, and the mail either arrived or is
 * a line in the log. Losing the founding place because a mail provider hiccuped would be a far
 * worse failure than a confirmation that has to be resent.
 *
 * ⚠️ NO ADDRESS IN ANY LOG LINE. The recipient is hashed. Logs are read by more people, kept in
 * more places and retained on someone else's schedule than a Firestore document is.
 *
 * ⚠️ PLAIN `fetch`, NOT THE RESEND SDK, AND DELIBERATELY. It is one documented POST to one
 * endpoint; a dependency would add an install to `functions/` and a supply-chain surface for
 * roughly twelve lines of code. Node 20 has global fetch. If the API ever needs more than this,
 * that is the moment to reconsider — not before.
 */

import { defineSecret } from "firebase-functions/params";
import { createHash } from "crypto";
import { MailConfig, resolveMailConfig, replyToWarning } from "./emailConfig";

/**
 * ⚠️ A DEPLOY-TIME PRECONDITION, NOT A RUNTIME ONE. A function referencing a secret that does not
 * exist in Secret Manager will not deploy AT ALL — it fails before anything runs, with a message
 * about the missing secret. Nick sets `RESEND_API_KEY` on a project before deploying to it; prod
 * will refuse until it has its own.
 */
export const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const SEND_TIMEOUT_MS = 10_000;

/** Which message this is. Renderers live in `emailTemplates.ts`; this file only sends. */
export type EmailTemplate = "confirm" | "welcome";

/** What a renderer produces. Both parts are required — see the plain-text note below. */
export interface RenderedEmail {
  subject: string;
  html: string;
  /**
   * ⚠️ NOT OPTIONAL. A message with no plain-text part is scored as more likely to be spam by
   * most filters, is unreadable in a text-only client, and is what a screen reader gets when the
   * HTML is hostile. Every template ships both.
   */
  text: string;
}

export interface SendOutcome {
  ok: boolean;
  /** Resend's message id, when it gave one. Useful for tracing a single send in their dashboard. */
  id?: string;
  /** A short reason, for the log. Never shown to a reader. */
  reason?: string;
}

/** For logs: enough to count and correlate, not enough to identify. */
const recipientHash = (address: string): string =>
  createHash("sha256").update(address.trim().toLowerCase()).digest("hex").slice(0, 16);

/**
 * Send one message.
 *
 * ⚠️ IT RETURNS AN OUTCOME AND NEVER THROWS. Every failure mode — no key, no network, a 4xx from
 * Resend, a timeout — resolves to `{ ok: false, reason }`. The caller decides what that means; for
 * a confirmation it means "the document stands, tell the reader they are in, and the log says the
 * mail did not go".
 */
export const sendEmail = async (
  to: string,
  template: EmailTemplate,
  rendered: RenderedEmail,
  env: NodeJS.ProcessEnv = process.env,
): Promise<SendOutcome> => {
  const cfg: MailConfig = resolveMailConfig(env);
  const toHash = recipientHash(to);
  const started = Date.now();

  /* ⚠️ LOGGED, NOT THROWN — see `replyToWarning`. In this state a reader's reply goes to an
     address that is not currently delivering, and nothing else in the system would say so. */
  const warning = replyToWarning(env);
  if (warning) console.warn(JSON.stringify({ event: "email.config", warning }));

  const key = RESEND_API_KEY.value();
  if (!key) {
    /* Not an exception: a missing key is a configuration state, and the caller's document must
       still stand. The deploy-time precondition above is what normally prevents this. */
    console.error(JSON.stringify({
      event: "email.send", template, toHash, outcome: "no-key",
    }));
    return { ok: false, reason: "no-key" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: cfg.from,
        to: [to],
        reply_to: cfg.replyTo,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      }),
      signal: controller.signal,
    });

    /* ⚠️ THE BODY IS READ BEFORE THE STATUS IS BELIEVED, because Resend puts the useful part of a
       failure in the body and the status alone does not say which field was wrong. */
    let body: Record<string, unknown> = {};
    try { body = (await res.json()) as Record<string, unknown>; } catch { body = {}; }

    if (!res.ok) {
      console.error(JSON.stringify({
        event: "email.send", template, toHash, outcome: "rejected",
        status: res.status, reason: String(body.message ?? body.name ?? "").slice(0, 200),
        ms: Date.now() - started,
      }));
      return { ok: false, reason: `http-${res.status}` };
    }

    const id = typeof body.id === "string" ? body.id : undefined;
    console.info(JSON.stringify({
      event: "email.send", template, toHash, outcome: "sent", id, ms: Date.now() - started,
    }));
    return { ok: true, id };
  } catch (e) {
    /* Aborted, offline, DNS — all one class from here: it did not go. */
    const aborted = e instanceof Error && e.name === "AbortError";
    console.error(JSON.stringify({
      event: "email.send", template, toHash,
      outcome: aborted ? "timeout" : "network", ms: Date.now() - started,
    }));
    return { ok: false, reason: aborted ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
};
