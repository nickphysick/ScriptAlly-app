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
export const CONTACT_ENV = "WAITLIST_CONTACT_EMAIL";
/** Non-workspace v1, 9b: the sender of every email that is not one of the four founding emails. */
export const ACCOUNT_FROM_ENV = "ACCOUNT_FROM";
/** Non-workspace v1, 9b: the app's own origin, for links into the app (/join, /account, /dashboard). */
export const APP_URL_ENV = "APP_PUBLIC_URL";

/**
 * ⚠️ "at", NOT "@" — some mail clients render a second `@` in a display name as a second address,
 * which makes the sender look forged to a reader and to some filters. Overridable per environment
 * so a sandbox or a subdomain can be swapped in without touching a template.
 */
export const DEFAULT_FROM = "Nick at QueryHawk <nick@queryhawk.net>";

/**
 * ⚠️ A VISIBLE CONTACT ROUTE IN THE BODY, NOT JUST A HEADER. A reader cannot see a `Reply-To`
 * header, so someone who wants a human needs an address they can read. (This mattered most when
 * the old domain's mail was forwarded and replies were lost; nick@queryhawk.net is a real mailbox.)
 *
 * ⚠️ THE SAME STRING AS `SUPPORT_EMAIL` IN `src/lib/companyInfo.ts`, DELIBERATELY DUPLICATED.
 * `functions/` cannot import from `src/` (they are separate TypeScript projects with their own
 * dependency trees — the enum duplication that forced that split is recorded in CLAUDE.md), so the
 * value is stated twice on purpose. The Help Centre, the landing copy and the legal copy all read
 * the other one; if either moves, both move.
 *
 * ⚠️ queryhawk.net SINCE 17 OCT. hello@ is an alias of the nick@queryhawk.net mailbox, so it
 * delivers. The value an email PRINTS is still `WAITLIST_CONTACT_EMAIL`, which falls back to this,
 * and each environment states it explicitly.
 */
export const SUPPORT_EMAIL = "hello@queryhawk.net";

/**
 * ⚠️ THE SENDER SPLIT (non-workspace v1, 9b; ref design-refs/emails-v1.html). The four founding emails — confirm,
 * welcome, reserve list and the invite — come from Nick, because they are one person writing to fifty. Everything
 * else (account emails, reminders, the weekly summary, plan notices) comes from the product. One map decides it,
 * `SENDER_OF`, and `sendEmail` reads it, so a template cannot pick its own sender.
 * Same "at, not @" care as DEFAULT_FROM: the display name is the bare brand.
 */
export const DEFAULT_ACCOUNT_FROM = "QueryHawk <hello@queryhawk.net>";

/** Every message the product sends, by name. `feedback` keeps its own overrides (betaFeedback, feedbackNotes). */
export type EmailKind =
  | "confirm" | "welcome" | "waiting" | "invite"
  | "signin" | "reset" | "newEmail" | "emailChanged"
  | "nudge" | "weekly" | "trialEnding" | "planEnding"
  | "feedback";

export type Sender = "founding" | "account";

export const SENDER_OF: Readonly<Record<EmailKind, Sender>> = {
  confirm: "founding", welcome: "founding", waiting: "founding", invite: "founding",
  signin: "account", reset: "account", newEmail: "account", emailChanged: "account",
  nudge: "account", weekly: "account", trialEnding: "account", planEnding: "account",
  /* Unchanged from before the split: feedback mail names its own sender and reply route by override. */
  feedback: "founding",
};

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
  /**
   * The address an email PRINTS in its body. Falls back to `SUPPORT_EMAIL`.
   *
   * ⚠️ A PRINTED ADDRESS THAT BOUNCES IS WORSE THAN A DEAD `Reply-To`. A reply-to that fails is
   * invisible; an address in the body is a promise made in the text of the email, and the founding
   * offer is built on "a direct line to the founder". So it must always point somewhere that
   * answers; each environment states it explicitly.
   */
  contactEmail: string;
  /** The product's sender (`ACCOUNT_FROM`, else `DEFAULT_ACCOUNT_FROM`). Replies go to the same address. */
  accountFrom: string;
  /**
   * The app's origin (`APP_PUBLIC_URL`), or `null` when unset — and then every email that links into the app
   * REFUSES, exactly as a missing `publicUrl` does. No fallback to the landing origin: on prod that is a different
   * site, and a guessed host is the dead link this file exists to prevent.
   */
  appUrl: string | null;
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
       signup is worth more than the reply route. The from-address is a real mailbox, so the
       fallback is fine; `replyToWarning` only makes the missing key visible in the logs. */
    replyTo: replyTo || from,
    publicUrl: publicUrl || null,
    contactEmail: clean(env[CONTACT_ENV]) || SUPPORT_EMAIL,
    accountFrom: clean(env[ACCOUNT_FROM_ENV]) || DEFAULT_ACCOUNT_FROM,
    appUrl: clean(env[APP_URL_ENV]) || null,
  };
};

/** Who a message comes from and where its replies go, by kind. Read by `sendEmail`; nothing else picks a sender. */
export const senderFor = (cfg: MailConfig, kind: EmailKind): { from: string; replyTo: string } =>
  SENDER_OF[kind] === "account"
    ? { from: cfg.accountFrom, replyTo: cfg.accountFrom }
    : { from: cfg.from, replyTo: cfg.replyTo };

/**
 * LOGGED, NEVER THROWN. An unset `WAITLIST_REPLY_TO` falls back to the from-address, which is fine:
 * nick@queryhawk.net is a real mailbox. The warning exists only so a missing key is visible in the
 * logs rather than silent. (It mattered more when the old domain's mail was forwarded and lost.)
 */
export const replyToWarning = (env: Env): string | null =>
  clean(env[REPLY_TO_ENV])
    ? null
    : `${REPLY_TO_ENV} is unset — replies will go to the from-address.`;

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

/* ══════════════ Links into the app (non-workspace v1) ══════════════ */

/** Paths in the app an email links to. The origin is `appUrl`; the path is a constant (see the note on VERIFY_PATH). */
export const APP_PATHS = {
  join: "/join/",
  signInLink: "/signin-link",
  emailSettings: "/account/emails",
  profile: "/account/profile",
  plan: "/account/plan",
  plans: "/plans",
  dashboard: "/dashboard",
} as const;

/** An absolute link into the app, or `null` when the app's origin is unknown or malformed. */
export const appLink = (cfg: MailConfig, path: string): string | null => {
  if (!cfg.appUrl || !path) return null;
  try {
    return new URL(path, cfg.appUrl).toString();
  } catch {
    return null;
  }
};

/** The founder's invite link: `<app>/join/<CODE>` (the route `src/lib/inviteCode.ts` reads). */
export const inviteLink = (cfg: MailConfig, code: string): string | null =>
  code && /^[A-Z0-9-]+$/.test(code) ? appLink(cfg, `${APP_PATHS.join}${code}`) : null;
