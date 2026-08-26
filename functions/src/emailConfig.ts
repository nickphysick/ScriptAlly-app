/**
 * emailConfig — where mail comes from, where it replies to, and how a link is built.
 *
 * Pure: every function here is a function of its arguments, so the root Vitest suite exercises it
 * with no network and no emulator. The transport that actually talks to Resend is `email.ts`.
 *
 * ⚠️ THE THREE VALUES COME FROM `functions/.env.<projectId>`, THE SAME MECHANISM AS
 * `FIRESTORE_DATABASE_ID`. That precedent exists because a value which is correct on dev by
 * accident is the one that breaks on prod — so each is stated explicitly per environment rather
 * than defaulted into looking right.
 */

/* ══════════════ Environment keys ══════════════ */

export const PUBLIC_URL_ENV = "WAITLIST_PUBLIC_URL";
export const REPLY_TO_ENV = "WAITLIST_REPLY_TO";
export const FROM_ENV = "WAITLIST_FROM";

/**
 * ⚠️ "at", NOT "@" — some mail clients render a second `@` in a display name as a second address,
 * which makes the sender look forged to a reader and to some filters. Overridable per environment
 * so a sandbox or a subdomain can be swapped in without touching a template.
 */
export const DEFAULT_FROM = "Nick at ScriptAlly <nick@scriptally.ink>";

/**
 * ⚠️ A VISIBLE CONTACT ROUTE IN THE BODY, NOT JUST A HEADER. Replies to the from-address are
 * currently diverted (see `replyTo` below) and a reader cannot see a `Reply-To` header. Someone who
 * wants a human needs an address they can read.
 */
export const SUPPORT_EMAIL = "hello@scriptally.ink";

/* ══════════════ Paths ══════════════ */

/**
 * ⚠️ THE PATH IS A CONSTANT AND ONLY THE ORIGIN IS CONFIGURED. A URL assembled by concatenating
 * two configurable halves is one trailing slash away from a dead link — and a dead link in a
 * hundred founding invites is not discovered until it is expensive. `new URL(path, origin)`
 * normalises the join, so a configured origin with or without a trailing slash produces the same
 * address.
 */
export const VERIFY_PATH = "/api/waitlist/verify";
export const UNSUBSCRIBE_PATH = "/api/waitlist/unsubscribe";

/* ══════════════ Resolution ══════════════ */

export interface MailConfig {
  from: string;
  /** Always a real address — falls back to `from` when unset. See `replyToWarning`. */
  replyTo: string;
  /**
   * ⚠️ `null` WHEN UNSET, AND THE CALLER MUST REFUSE TO SEND. Prod's env file is deliberately
   * absent, exactly as it is for the database id: a function that cannot name its own public host
   * must not email a link, because the link would go nowhere and nobody would find out until a
   * founding writer tried to click it.
   */
  publicUrl: string | null;
}

type Env = Record<string, string | undefined>;

const clean = (v: string | undefined): string => (typeof v === "string" ? v.trim() : "");

export const resolveMailConfig = (env: Env): MailConfig => {
  const from = clean(env[FROM_ENV]) || DEFAULT_FROM;
  const replyTo = clean(env[REPLY_TO_ENV]);
  const publicUrl = clean(env[PUBLIC_URL_ENV]);
  return {
    from,
    /* ⚠️ FALL BACK, NEVER THROW. A missing reply-to must not stop a confirmation going out — the
       signup is worth more than the reply route. But see `replyToWarning`: in that state a
       writer's reply lands somewhere that currently bounces, and nothing else would say so. */
    replyTo: replyTo || from,
    publicUrl: publicUrl || null,
  };
};

/**
 * ⚠️ THE WARNING IS THE WHOLE POINT OF THE FALLBACK BEING SILENT-BUT-LOGGED. Namecheap forwarding
 * for the from-address is configured and not delivering, so replies to it are lost — and because
 * the MX record was replaced by that forwarding, bounce feedback does not reach Resend either.
 * Nobody would find out. When forwarding works, `WAITLIST_REPLY_TO` is deleted and the
 * from-address becomes the reply route again.
 */
export const replyToWarning = (env: Env): string | null =>
  clean(env[REPLY_TO_ENV])
    ? null
    : `${REPLY_TO_ENV} is unset — replies will go to the from-address, which is not currently ` +
      "delivering. Set it in functions/.env so a writer's reply reaches a person.";

/* ══════════════ Links ══════════════ */

/**
 * ⚠️ RETURNS `null` RATHER THAN A BROKEN STRING when the origin is unknown. The alternative — an
 * empty origin producing `/api/waitlist/verify?token=…` in an email — is a relative URL in a mail
 * client, which resolves against nothing and simply fails.
 */
const link = (publicUrl: string | null, path: string, token: string): string | null => {
  if (!publicUrl || !token) return null;
  try {
    const url = new URL(path, publicUrl);
    url.searchParams.set("token", token);
    return url.toString();
  } catch {
    /* A malformed origin is a configuration error, not a runtime condition to paper over. */
    return null;
  }
};

export const verifyLink = (cfg: MailConfig, token: string): string | null =>
  link(cfg.publicUrl, VERIFY_PATH, token);

export const unsubscribeLink = (cfg: MailConfig, token: string): string | null =>
  link(cfg.publicUrl, UNSUBSCRIBE_PATH, token);
