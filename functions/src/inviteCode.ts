/**
 * redeemInviteCode — callable Cloud Function (europe-west2): the founder's code gate.
 * (Non-workspace v1, Phase 1 — ref: design-refs/getting-in-v1.html.)
 *
 * Three modes, one function:
 *  - "check"  — no account needed. Says whether a code works, is refused (used OR unrecognised — one answer),
 *               or rides on an invite link that has run out (48 hours). Never changes anything.
 *  - "redeem" — SIGNED IN. Marks the code used by this account (in a transaction, single use) and then
 *               sets the founding flag through THE ONE SETTER, `markFoundingFlags` (foundingStats.ts),
 *               so the cap and the order rules are the nightly backstop's own. No second path writes it.
 *  - "fresh"  — no account needed. An invite link has run out: its place is still held, and the code
 *               gets a new 48-hour link. Sending the fresh email is `sendFreshInvite`'s job. Rate-limited per
 *               code (one send every 10 minutes, five in any 24 hours); over the limit the answer is the same
 *               `{ ok: true }` and nothing is sent or changed.
 *
 * ⚠️ USED AND UNRECOGNISED ARE ONE ANSWER (Nick, non-workspace v1.1), so the gate cannot be used to learn which
 *    codes exist. Body, HttpsError code and message are identical, and both paths make the same single read of
 *    an inviteCodes doc before answering (a malformed code reads a placeholder doc that can never exist).
 *    "expired" is only ever said of an UNUSED code — reached by its link.
 *
 * ⚠️ AN EXPIRED LINK NEVER LOSES THE PLACE. Expiry is about the link, not the code: a used code is
 *    "refused", an unused one past its `linkExpiresAt` is "expired", and "fresh" pushes the date on.
 * ⚠️ REDEEM IS IDEMPOTENT FOR THE SAME ACCOUNT. A writer whose first redeem call dropped on the way
 *    back can call again; another account presenting a used code is refused.
 *
 * Code doc: inviteCodes/{CODE} = { issuedToEmail, name?, foundingNo?, linkExpiresAt?, createdAt,
 *                                   usedAt?, usedBy?, usedByUid?, freshSentAt?: number[] (ms, last 24h) }
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { db } from "./firestore";
import { listAllUsers, markFoundingFlags, type Account } from "./foundingStats";
import { RESEND_API_KEY } from "./email";
import { IP_HASH_SALT } from "./waitlistMail";

const FieldValue = admin.firestore.FieldValue;

const MAX_CODE = 64;
export const LINK_TTL_MS = 48 * 60 * 60 * 1000;
/** Fresh-link sends per code: at most one in any 10 minutes, five in any rolling 24 hours. */
export const FRESH_GAP_MS = 10 * 60 * 1000;
export const FRESH_DAY_MS = 24 * 60 * 60 * 1000;
export const FRESH_PER_DAY = 5;
/** Read in place of a malformed code, so every refusal costs the same one read. No issued code can have this id. */
const NO_SUCH_CODE = "--";

/** The server's words. "Founder's code", never "invite code". */
export const MSG = {
  /** ⚠️ One sentence for used AND unrecognised — the client's CODE_REFUSED (src/lib/inviteCode.ts) is the same words. */
  refused: "That founder's code isn't one of ours, or it's already been used. Check the email we sent, or ask us to look it up.",
  signIn: "Sign in first, then we can add your founder's code to your account.",
  internal: "Something went wrong. Please try again.",
} as const;

export const normaliseCode = (raw: unknown): string =>
  typeof raw === "string"
    ? raw.trim().toUpperCase().replace(/\s+/g, "").replace(/[‐-―−]/g, "-")
    : "";

/** The doc a code is looked up at: its own, or the placeholder for anything that cannot be a code (too long, a slash…). */
const codeDocId = (code: string): string =>
  code && code.length <= MAX_CODE && /^[A-Z0-9-]+$/.test(code) && /[A-Z0-9]/.test(code) ? code : NO_SUCH_CODE;

const ms = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof (v as { toMillis?: unknown }).toMillis === "function") return (v as { toMillis: () => number }).toMillis();
  return null;
};

export type CheckAnswer =
  | { status: "ok"; email: string | null; name: string | null; foundingNo: number | null }
  | { status: "expired"; email: string | null; foundingNo: number | null }
  | { status: "refused" };

/** The one refusal: used and unrecognised are the same object, byte for byte. */
const REFUSED = (): CheckAnswer => ({ status: "refused" });

export interface CodeDeps {
  now?: () => number;
  listUsers?: () => Promise<Account[]>;
  /** Sends the fresh invite. Absent in tests; the callable wires the real sender. */
  sendFreshInvite?: (to: { email: string; name: string | null; code: string; foundingNo: number | null }) => Promise<void>;
}

/** What a code is, read without changing anything. */
export async function checkCode(store: Firestore, rawCode: unknown, deps: CodeDeps = {}): Promise<CheckAnswer> {
  const snap = await store.doc(`inviteCodes/${codeDocId(normaliseCode(rawCode))}`).get();
  if (!snap.exists || snap.get("usedAt")) return REFUSED();
  const email = (snap.get("issuedToEmail") as string | undefined) ?? null;
  const foundingNo = typeof snap.get("foundingNo") === "number" ? (snap.get("foundingNo") as number) : null;
  const expires = ms(snap.get("linkExpiresAt"));
  const now = (deps.now ?? Date.now)();
  if (expires != null && now > expires) return { status: "expired", email, foundingNo };
  return { status: "ok", email, name: (snap.get("name") as string | undefined) ?? null, foundingNo };
}

/** Mark the code used by this account, then set the founding flag through the one setter. */
export async function redeemCode(
  store: Firestore,
  rawCode: unknown,
  who: { uid: string; email: string | null },
  deps: CodeDeps = {},
): Promise<{ ok: true; founding: boolean }> {
  const code = codeDocId(normaliseCode(rawCode));
  const email = who.email ? who.email.trim().toLowerCase() : null;
  await store.runTransaction(async (tx) => {
    const ref = store.doc(`inviteCodes/${code}`);
    const snap = await tx.get(ref);
    if (snap.exists && snap.get("usedAt") && snap.get("usedByUid") === who.uid) return; // the same account again
    /* ⚠️ Used by someone else and unrecognised: the same error, code and message. */
    if (!snap.exists || snap.get("usedAt")) throw new HttpsError("not-found", MSG.refused);
    tx.update(ref, { usedAt: FieldValue.serverTimestamp(), usedBy: email, usedByUid: who.uid });
  });
  /* THE ONE SETTER, over every account so the cap counts everyone — with no waitlist proofs, so this call marks
     only accounts whose email redeemed a code (this one, and any the nightly run has not reached yet). */
  const accounts = await (deps.listUsers ?? listAllUsers)();
  const here = accounts.some((a) => a.uid === who.uid) ? accounts : [...accounts, { uid: who.uid, email, createdMs: null }];
  await markFoundingFlags(store, here, []);
  const ent = await store.doc(`users/${who.uid}/private/entitlement`).get();
  return { ok: true, founding: ent.exists && ent.get("founding") === true };
}

/** The sends a code may still make: none within FRESH_GAP_MS of the last, none once FRESH_PER_DAY in the last day. */
export function freshAllowed(sentAt: unknown, now: number): { ok: boolean; keep: number[] } {
  const keep = (Array.isArray(sentAt) ? sentAt : []).filter((t): t is number => typeof t === "number" && Number.isFinite(t) && now - t < FRESH_DAY_MS);
  const last = keep.length ? Math.max(...keep) : null;
  const ok = keep.length < FRESH_PER_DAY && (last == null || now - last >= FRESH_GAP_MS);
  return { ok, keep };
}

/**
 * A new 48-hour link for an unused code. Silent for anything else, and silent over the rate limit: every caller
 * gets `{ ok: true }`, so the answer says nothing about the code or the limit.
 */
export async function freshLink(store: Firestore, rawCode: unknown, deps: CodeDeps = {}): Promise<{ ok: true }> {
  const code = codeDocId(normaliseCode(rawCode));
  const ref = store.doc(`inviteCodes/${code}`);
  const now = (deps.now ?? Date.now)();
  /* The limit is checked and the send recorded in one transaction, so two quick calls cannot both send. */
  const snap = await store.runTransaction(async (tx) => {
    const s = await tx.get(ref);
    if (!s.exists || s.get("usedAt")) return null;
    const { ok, keep } = freshAllowed(s.get("freshSentAt"), now);
    if (!ok) return null;
    tx.update(ref, { linkExpiresAt: admin.firestore.Timestamp.fromMillis(now + LINK_TTL_MS), freshSentAt: [...keep, now] });
    return s;
  });
  if (!snap) return { ok: true };
  const email = (snap.get("issuedToEmail") as string | undefined) ?? null;
  if (email && deps.sendFreshInvite) {
    await deps.sendFreshInvite({
      email, code,
      name: (snap.get("name") as string | undefined) ?? null,
      foundingNo: typeof snap.get("foundingNo") === "number" ? (snap.get("foundingNo") as number) : null,
    });
  }
  return { ok: true };
}

/* Non-workspace v1, 9d: the fresh-link path now SENDS the invite, so the callable binds the mail key and the salt
   the invite's unsubscribe link is signed with (both already exist wherever the waitlist function deploys). */
export const redeemInviteCode = onCall(
  { region: "europe-west2", timeoutSeconds: 60, memory: "256MiB", secrets: [RESEND_API_KEY, IP_HASH_SALT] },
  async (request) => {
    const data = (request.data ?? {}) as Record<string, unknown>;
    const mode = data.mode === "redeem" || data.mode === "fresh" ? data.mode : "check";
    try {
      switch (mode) {
        case "check":
          return await checkCode(db, data.code);
        case "fresh": {
          const { sendFreshInvite } = await import("./inviteSend");
          return await freshLink(db, data.code, { sendFreshInvite });
        }
        case "redeem": {
          if (!request.auth?.uid) throw new HttpsError("unauthenticated", MSG.signIn);
          const email = typeof request.auth.token?.email === "string" ? request.auth.token.email : null;
          return await redeemCode(db, data.code, { uid: request.auth.uid, email });
        }
        default: {
          const unhandled: never = mode;
          throw new HttpsError("invalid-argument", `unknown mode ${String(unhandled)}`);
        }
      }
    } catch (e) {
      if (e instanceof HttpsError) throw e;
      console.error("redeemInviteCode: failed:", e);
      throw new HttpsError("internal", MSG.internal);
    }
  },
);
