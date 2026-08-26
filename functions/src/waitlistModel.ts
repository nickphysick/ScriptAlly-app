/**
 * waitlistModel — the founding waitlist's shape, its constants and every pure decision.
 *
 * Split out from `waitlist.ts` deliberately: everything here is a function of its arguments, so
 * the root Vitest suite exercises it with no emulator and no network. What is left in the handler
 * is Firestore and HTTP, which is the part that genuinely needs one.
 *
 * ⚠️ NORMALISATION IS DELIBERATELY UNCHANGED — trim and lowercase, nothing else. The document id
 * is `sha256(normalised)`, so ANY change to normalisation changes the id of every future signup
 * and orphans every existing one. Stripping gmail dots or `+tags` would fold two addresses onto
 * one doc AND silently re-key the collection. Disposable domains are refused separately, which is
 * the same defence without the migration.
 */

import { createHash, randomBytes, timingSafeEqual } from "crypto";

/* ══════════════ Constants ══════════════ */

/** The founding cap. Stored on the counter doc so it can be raised without a deploy. */
export const DEFAULT_CAP = 100;

/**
 * ⚠️ ZERO — THE REAL COUNT SHOWS FROM THE FIRST SIGN-UP. It was 20 so that `3/100` would not sit
 * on the page saying nobody wants this; the better answer is to seed the list with genuine
 * sign-ups rather than hide the number, so the floor's job is gone. A threshold that no longer
 * serves a purpose is just a thing that surprises someone later.
 *
 * The MECHANISM stays, which is why this is a constant and not a deleted branch: raising it again
 * is one number, not a redesign. And the floor is still SERVER-SIDE — a client-side hide is not a
 * floor, because a number in the payload is public whatever the page chooses to draw.
 *
 * ⚠️ ZERO AS A FLOOR IS FINE; ZERO AS A FALLBACK IS NOT. An unreadable count must render NOTHING,
 * never `0/100` — that would be a false claim by accident, on the one page whose whole design is
 * that the number is the number. `countPayload(null)` is what keeps those two apart.
 */
export const COUNTER_FLOOR = 0;

/**
 * ⚠️ DOUBLE OPT-IN IS BUILT AND OFF. Verification needs an email, and there is no transport yet —
 * with this `true` and no Resend key, every signup would sit `pending` forever and the counter
 * would never move. `false` means a POST verifies immediately, which is exactly today's behaviour;
 * the verify endpoint, the tokens and the expiry all exist and are exercised by the tests.
 *
 * FLIPPING THIS IS THE WHOLE OF TURNING DOUBLE OPT-IN ON, once mail sends.
 */
export const REQUIRE_VERIFICATION = false;

/** A verify link is good for 48 hours. */
export const VERIFY_TTL_MS = 48 * 60 * 60 * 1000;

/** Per hashed IP, per rolling window. */
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

/**
 * A submission faster than this was not typed by a person.
 *
 * ⚠️ 800, NOT 1500, AND THE REASON IS THAT THIS GUARD FAILS SILENTLY. A too-fast submission gets
 * the SUCCESS shape and no write — so a real writer who trips it is told they hold a founding
 * place and does not. Invisible to them, invisible to us, and permanent, because nobody signs up
 * for the same thing twice.
 *
 * The two errors are not close. A bot slipping through at 900ms puts one address onto a list that
 * already has dedupe, a rate limit and a hundred-place cap — cost near zero. A writer with
 * autofill submitting at 1.2s costs one of the hundred and is never discovered. 800ms is still
 * unreachable by a person doing this deliberately and still catches every naive script.
 *
 * The clock starts when the FORM MOUNTS, not when the page loads — see `mountedAt` in
 * `FoundingSignup`. Reading for a minute and then signing up is a long elapsed time and fine.
 */
export const MIN_SUBMIT_MS = 800;

/** POST bodies larger than this are refused unread. */
export const MAX_BODY_BYTES = 1024;

/** RFC 5321's practical maximum. */
export const MAX_EMAIL_CHARS = 254;

/** `GET` is cached at the edge — three surfaces ask on every page view for a number that crawls. */
export const GET_CACHE_SECONDS = 60;

/**
 * ⚠️ THE ALLOWLIST IS EXACT AND NEVER REFLECTED. An origin that is not on it is refused rather
 * than echoed back — reflecting an arbitrary `Origin` header is the same as having no allowlist,
 * dressed as having one.
 */
export const ALLOWED_ORIGINS: readonly string[] = [
  "https://scriptally.ink",
  "https://www.scriptally.ink",
  "https://scriptally-app.web.app",
  "https://scriptally-dev.web.app",
];

/* ══════════════ Types ══════════════ */

/**
 * `pending`  — signed up, verify link sent, not counted.
 * `verified` — counted, holds a founding place.
 * `waiting`  — arrived (or verified) after the cap filled; on the plain waiting list.
 * `unsubscribed` — asked to be removed; never counted again.
 */
export type WaitlistStatus = "pending" | "verified" | "waiting" | "unsubscribed";

/** Which surface a signup came from. Recorded so the funnel is answerable later. */
export type WaitlistSource = "landing-panel" | "founders-hero" | "sealed-band" | "holding-page" | "unknown";

export const SOURCES: readonly WaitlistSource[] = [
  "landing-panel", "founders-hero", "sealed-band", "holding-page", "unknown",
];

export const readSource = (raw: unknown): WaitlistSource =>
  typeof raw === "string" && (SOURCES as readonly string[]).includes(raw)
    ? (raw as WaitlistSource)
    : "unknown";

/* ══════════════ Hashing ══════════════ */

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/** Deterministic doc id from a normalised email, so one address cannot double-insert. */
export const emailHash = (normalisedEmail: string): string => sha256(normalisedEmail);

/**
 * ⚠️ THE TOKEN IS STORED AS A HASH AND NEVER IN PLAIN. A verify token is a bearer credential for
 * one founding place; a database dump of plain tokens is a database dump of claimable places.
 */
export const tokenHash = (token: string): string => sha256(token);

/**
 * ⚠️ IPs ARE HASHED WITH A SALT AND THE RAW ADDRESS IS NEVER WRITTEN. It is personal data under
 * UK GDPR and we want it for exactly two things — rate limiting and abuse review — both of which
 * work on a one-way hash. The salt stops the hash being reversible by enumerating IPv4 space,
 * which is trivial without one.
 */
export const ipHash = (ip: string, salt: string): string => sha256(`${salt}:${ip}`);

/**
 * ⚠️ THE UNSUBSCRIBE TOKEN IS SIGNED, NOT STORED, AND THAT IS WHAT MAKES IT PERMANENT. Every other
 * approach fails a real case:
 *   · storing a hash and minting a fresh token per email kills the link in every PREVIOUS email —
 *     so a reader who keeps the confirmation and unsubscribes from it a month later finds a dead
 *     link, which is a compliance failure, not an inconvenience;
 *   · storing the token in plain puts a bearer credential at rest for no benefit.
 * A `<docId>.<hmac>` pair needs no storage at all: the id is the lookup key, the signature proves
 * we issued it, and the same token is valid for the life of the document.
 *
 * ⚠️ DOMAIN-SEPARATED (`unsub:`) so this signature can never be confused with any other use of the
 * same salt. Reusing the salt without a context string is how one token becomes valid somewhere it
 * was never meant to be.
 */
export const unsubscribeToken = (docId: string, salt: string): string =>
  `${docId}.${sha256(`unsub:${salt}:${docId}`)}`;

/**
 * Returns the document id a token authenticates, or `null`.
 *
 * ⚠️ COMPARED IN CONSTANT TIME, and shape-checked first — `tokensMatch` refuses anything that is
 * not a sha256 hex digest, which is what stops two malformed halves comparing equal.
 */
export const parseUnsubscribeToken = (raw: unknown, salt: string): string | null => {
  if (typeof raw !== "string" || !salt) return null;
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const docId = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);
  /* The id is a document path segment; anything outside the id charset is not one of ours. */
  if (!/^[0-9a-f]{64}$/.test(docId)) return null;
  return tokensMatch(sig, sha256(`unsub:${salt}:${docId}`)) ? docId : null;
};

/**
 * ⚠️ A CONFIRMATION IS NOT RE-SENT ON EVERY SUBMIT. Without this the form is a mail cannon aimed
 * at whoever's address was typed: hit the button five times and they get five emails, and someone
 * who types a stranger's address can do it deliberately.
 */
export const CONFIRM_RESEND_MS = 10 * 60 * 1000;

export const mayResendConfirm = (lastSentMs: number | null, nowMs: number): boolean =>
  lastSentMs === null || nowMs - lastSentMs >= CONFIRM_RESEND_MS;

/** 32 bytes of CSPRNG, url-safe. */
export const newVerifyToken = (): string => randomBytes(32).toString("base64url");

/**
 * ⚠️ CONSTANT-TIME. Token comparison is the one place a timing side-channel is worth closing, and
 * `===` on hex strings leaks the length of the shared prefix.
 */
const SHA256_HEX = /^[0-9a-f]{64}$/;

export const tokensMatch = (aHex: string, bHex: string): boolean => {
  /* ⚠️ THE SHAPE IS CHECKED BEFORE THE COMPARE, AND THE TEST IS WHY. `Buffer.from(s, "hex")`
     stops at the first non-hex character and returns what it has — so `Buffer.from("zzzz","hex")`
     is EMPTY, two empty buffers are equal, and `timingSafeEqual` cheerfully returned true. Any
     malformed stored hash would then have matched any malformed token. Both sides must be a real
     sha256 hex digest before there is anything worth comparing in constant time. */
  if (!SHA256_HEX.test(aHex) || !SHA256_HEX.test(bHex)) return false;
  try {
    return timingSafeEqual(Buffer.from(aHex, "hex"), Buffer.from(bHex, "hex"));
  } catch {
    return false;
  }
};

/* ══════════════ Email ══════════════ */

/** Trim and lowercase. Nothing else — see the file docblock. */
export const normaliseEmail = (raw: unknown): string =>
  typeof raw === "string" ? raw.trim().toLowerCase() : "";

/** Pragmatic single-line check. A server-side gate, not a deliverability guarantee. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * ⚠️ A SHORT, OBVIOUS LIST — NOT AN ATTEMPT AT COMPLETENESS. There are thousands of disposable
 * domains and a list in a repo is stale the day it ships. This refuses the handful that turn up
 * unprompted; the real defences are the rate limit, the honeypot and double opt-in. Anyone
 * treating this as the abuse control has the wrong model of it.
 */
export const DISPOSABLE_DOMAINS: readonly string[] = [
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
  "throwawaymail.com", "yopmail.com", "trashmail.com", "sharklasers.com",
  "getnada.com", "temp-mail.org", "dispostable.com", "maildrop.cc",
];

export const domainOf = (normalisedEmail: string): string =>
  normalisedEmail.slice(normalisedEmail.lastIndexOf("@") + 1);

export const isDisposable = (normalisedEmail: string): boolean =>
  DISPOSABLE_DOMAINS.includes(domainOf(normalisedEmail));

export type EmailVerdict = "ok" | "malformed" | "too-long" | "disposable";

export const checkEmail = (normalisedEmail: string): EmailVerdict => {
  if (!normalisedEmail || !EMAIL_RE.test(normalisedEmail)) return "malformed";
  if (normalisedEmail.length > MAX_EMAIL_CHARS) return "too-long";
  if (isDisposable(normalisedEmail)) return "disposable";
  return "ok";
};

/* ══════════════ Retention ══════════════ */

/**
 * ⚠️ TWENTY-FOUR MONTHS FROM LAST INTERACTION, NOT FROM SIGN-UP. "Since we last heard from you" is
 * what a retention period is meant to measure; from sign-up it would delete an active subscriber
 * on their second anniversary regardless of whether they answered an email last week.
 * `lastInteractionAt` is touched on every join, verify and unsubscribe for exactly this.
 */
export const RETENTION_MS = 24 * 30.44 * 24 * 60 * 60 * 1000;

/**
 * ⚠️ A SHORT GRACE AFTER UNSUBSCRIBING, NOT AN IMMEDIATE DELETE. The record of "this address asked
 * not to be contacted" is the only thing that stops a re-import or a stray script writing to them
 * again — deleting it the same day removes the suppression along with the subscription. Thirty
 * days is long enough to catch that and short enough to be an honest "we remove you promptly".
 */
export const UNSUBSCRIBED_GRACE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * ⚠️ THE JOB IS A DRY RUN UNTIL SOMEBODY HAS WATCHED IT. `RETENTION_LIVE=true` in the environment
 * is what arms it; anything else logs what it WOULD delete and deletes nothing. A deletion job
 * nobody has observed is not a job to leave running unattended over real data — and the failure
 * mode of getting it wrong is silent, permanent and unrecoverable.
 */
export const RETENTION_LIVE_ENV = "RETENTION_LIVE";

export const retentionIsLive = (env: Record<string, string | undefined>): boolean =>
  String(env[RETENTION_LIVE_ENV] ?? "").trim().toLowerCase() === "true";

export type DeletionReason = "dormant" | "unsubscribed";

/**
 * Whether a document is due deletion, and why. Pure, so the boundary conditions are testable
 * without a database.
 *
 * ⚠️ AN ABSENT `lastInteractionAt` IS NEVER DUE. A document with no timestamp is one this code
 * does not understand — an older shape, or a partial write — and "I cannot tell how old this is"
 * must never resolve to "delete it". The safe default for an irreversible action is to do nothing.
 */
export const deletionReason = (
  doc: { status?: unknown; lastInteractionAt?: number | null; unsubscribedAt?: number | null },
  nowMs: number,
): DeletionReason | null => {
  const last = typeof doc.lastInteractionAt === "number" ? doc.lastInteractionAt : null;
  const unsub = typeof doc.unsubscribedAt === "number" ? doc.unsubscribedAt : null;
  if (doc.status === "unsubscribed") {
    /* Fall back to `lastInteractionAt` when the stamp is missing — an older unsubscribe still
       ages out, it just measures from the last thing we know about. */
    const from = unsub ?? last;
    return from !== null && nowMs - from >= UNSUBSCRIBED_GRACE_MS ? "unsubscribed" : null;
  }
  if (last === null) return null;
  return nowMs - last >= RETENTION_MS ? "dormant" : null;
};

/* ══════════════ The counter ══════════════ */

/**
 * ⚠️ `counters/waitlist` IS KEPT, NOT RENAMED. It is live on dev and (if the holding page ever
 * took a signup) on prod; renaming it to `counters/founding` would strand whatever is in it behind
 * a path nothing reads, and the only thing gained is a nicer name.
 */
export const COUNTER_PATH = "counters/waitlist";

export interface CounterState {
  verifiedCount: number;
  cap: number;
}

/**
 * ⚠️ THE MIGRATION IS A READ, AND IT TREATS EXISTING DOCS AS VERIFIED. The old counter carried
 * `count`, incremented on submission under single opt-in. Those people gave the same consent this
 * flow asks for — they submitted an address to join a list — so their number carries over as
 * `verifiedCount` rather than being reset, which would tell prod it had zero founding writers when
 * it had some.
 *
 * It happens on the first write that touches the doc, inside that write's transaction, and it is
 * idempotent: once `verifiedCount` exists, `count` is never read again.
 *
 * ⚠️ AND THE INCREMENT IS AN EXPLICIT SET, NOT `FieldValue.increment`. Increment on an absent
 * field creates it at 1 — which would silently discard a historical `count` of 37 and restart at
 * one. Inside a transaction an explicit `read + 1` is safe, because contention re-runs the whole
 * transaction.
 */
export const readCounter = (data: Record<string, unknown> | undefined): CounterState => {
  const n = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : null;
  const verified = n(data?.verifiedCount) ?? n(data?.count) ?? 0;
  const cap = n(data?.cap) ?? DEFAULT_CAP;
  return { verifiedCount: verified, cap: cap === 0 ? DEFAULT_CAP : cap };
};

/* ══════════════ The GET contract ══════════════ */

export interface CountPayload {
  visible: boolean;
  cap: number;
  count?: number;
}

/**
 * ⚠️ THE NUMBER IS ABSENT FROM THE PAYLOAD, NOT FALSE IN A FLAG. `visible: false` with a `count`
 * beside it would be a request to please not look; the count simply is not sent. The client
 * already renders live-or-absent, so an absent count needs no new UI — `readCount` in
 * `src/marketing/waitlist.ts` requires a numeric `count` and yields `null` without one.
 *
 * ⚠️ `null` MEANS THE COUNT COULD NOT BE READ, AND IT IS NOT THE SAME AS ZERO. A missing counter
 * document is not evidence that nobody has signed up — it is evidence that we do not know. With
 * the floor at 0 the two would otherwise collapse into each other and an outage would render
 * `0/100`: a false claim about how many founding writers there are, made by accident, on the one
 * page whose entire design is that the number is the number.
 */
export const countPayload = (c: CounterState | null): CountPayload =>
  c === null
    ? { visible: false, cap: DEFAULT_CAP }
    : c.verifiedCount < COUNTER_FLOOR
      ? { visible: false, cap: c.cap }
      : { visible: true, cap: c.cap, count: c.verifiedCount };

/* ══════════════ Rate limiting ══════════════ */

/**
 * The window key. Rounded to the window so a document per IP per hour ages out naturally and is
 * TTL-eligible, rather than one growing document per address forever.
 */
export const rateLimitKey = (hashedIp: string, nowMs: number): string =>
  `${hashedIp}_${Math.floor(nowMs / RATE_LIMIT_WINDOW_MS)}`;

export const RATELIMIT_COLLECTION = "ratelimits";

/**
 * ⚠️ PERSISTED, NEVER IN MEMORY. Cloud Functions scale to many instances and each gets its own
 * heap, so an in-process counter limits one instance and nothing else — which reads as a rate
 * limit right up until it is load-tested. This is a Firestore transaction for that reason alone.
 */
export const overRateLimit = (countInWindow: number): boolean => countInWindow >= RATE_LIMIT_MAX;

/* ══════════════ The POST verdict ══════════════ */

/**
 * ⚠️ A HONEYPOT HIT RETURNS THE SUCCESS SHAPE AND WRITES NOTHING. Telling a bot it failed teaches
 * it which field to leave alone next time; telling it that it succeeded ends the conversation.
 */
export type JoinVerdict =
  | { kind: "honeypot" }
  | { kind: "too-fast" }
  | { kind: "bad-email"; reason: EmailVerdict }
  | { kind: "ok" };

export interface JoinInput {
  email: string;
  /** The field no person ever fills. */
  trap?: unknown;
  /** Milliseconds between the form rendering and the submit. */
  elapsedMs?: unknown;
}

export const judgeJoin = (input: JoinInput): JoinVerdict => {
  if (typeof input.trap === "string" && input.trap.trim() !== "") return { kind: "honeypot" };
  /* ⚠️ AN ABSENT `elapsedMs` IS NOT A FAILURE. Older clients do not send it, and refusing them
     would break the live forms the moment this deploys. Only a present-and-too-small value is
     evidence of anything. */
  const elapsed = input.elapsedMs;
  if (typeof elapsed === "number" && Number.isFinite(elapsed) && elapsed < MIN_SUBMIT_MS) {
    return { kind: "too-fast" };
  }
  const verdict = checkEmail(input.email);
  return verdict === "ok" ? { kind: "ok" } : { kind: "bad-email", reason: verdict };
};
