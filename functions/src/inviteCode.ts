/**
 * redeemInviteCode — callable Cloud Function (europe-west2): the founder's code gate.
 * (Non-workspace v1, Phase 1 — ref: design-refs/getting-in-v1.html.)
 *
 * Three modes, one function:
 *  - "check"  — no account needed. Says whether a code works, has been used, is unknown, or rides on an
 *               invite link that has run out (48 hours). Never changes anything.
 *  - "redeem" — SIGNED IN. Marks the code used by this account (in a transaction, single use) and then
 *               sets the founding flag through THE ONE SETTER, `markFoundingFlags` (foundingStats.ts),
 *               so the cap and the order rules are the nightly backstop's own. No second path writes it.
 *  - "fresh"  — no account needed. An invite link has run out: its place is still held, and the code
 *               gets a new 48-hour link. Sending the fresh email is `sendFreshInvite`'s job.
 *
 * ⚠️ AN EXPIRED LINK NEVER LOSES THE PLACE. Expiry is about the link, not the code: a used code is
 *    "used", an unused one past its `linkExpiresAt` is "expired", and "fresh" pushes the date on.
 * ⚠️ REDEEM IS IDEMPOTENT FOR THE SAME ACCOUNT. A writer whose first redeem call dropped on the way
 *    back can call again; another account presenting a used code is refused.
 *
 * Code doc: inviteCodes/{CODE} = { issuedToEmail, name?, foundingNo?, linkExpiresAt?, createdAt,
 *                                   usedAt?, usedBy?, usedByUid? }
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import type { Firestore } from "firebase-admin/firestore";
import { db } from "./firestore";
import { listAllUsers, markFoundingFlags, type Account } from "./foundingStats";

const FieldValue = admin.firestore.FieldValue;

const MAX_CODE = 64;
export const LINK_TTL_MS = 48 * 60 * 60 * 1000;

/** The server's words. "Founder's code", never "invite code". */
export const MSG = {
  unknown: "We don't recognise that founder's code. Check it against your invite email, or copy and paste it.",
  used: "That founder's code has already been used to create an account.",
  signIn: "Sign in first, then we can add your founder's code to your account.",
  internal: "Something went wrong. Please try again.",
} as const;

export const normaliseCode = (raw: unknown): string =>
  typeof raw === "string"
    ? raw.trim().toUpperCase().replace(/\s+/g, "").replace(/[‐-―−]/g, "-")
    : "";

const ms = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v && typeof (v as { toMillis?: unknown }).toMillis === "function") return (v as { toMillis: () => number }).toMillis();
  return null;
};

export type CheckAnswer =
  | { status: "ok"; email: string | null; name: string | null; foundingNo: number | null }
  | { status: "expired"; email: string | null; foundingNo: number | null }
  | { status: "used" }
  | { status: "unknown" };

export interface CodeDeps {
  now?: () => number;
  listUsers?: () => Promise<Account[]>;
  /** Sends the fresh invite. Absent in tests; the callable wires the real sender. */
  sendFreshInvite?: (to: { email: string; name: string | null; code: string; foundingNo: number | null }) => Promise<void>;
}

/** What a code is, read without changing anything. */
export async function checkCode(store: Firestore, rawCode: unknown, deps: CodeDeps = {}): Promise<CheckAnswer> {
  const code = normaliseCode(rawCode);
  if (!code || code.length > MAX_CODE) return { status: "unknown" };
  const snap = await store.doc(`inviteCodes/${code}`).get();
  if (!snap.exists) return { status: "unknown" };
  if (snap.get("usedAt")) return { status: "used" };
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
  const code = normaliseCode(rawCode);
  if (!code || code.length > MAX_CODE) throw new HttpsError("not-found", MSG.unknown);
  const email = who.email ? who.email.trim().toLowerCase() : null;
  await store.runTransaction(async (tx) => {
    const ref = store.doc(`inviteCodes/${code}`);
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", MSG.unknown);
    if (snap.get("usedAt")) {
      if (snap.get("usedByUid") === who.uid) return; // the same account again: nothing to do
      throw new HttpsError("already-exists", MSG.used);
    }
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

/** A new 48-hour link for an unused code whose link has run out. Silent for anything else. */
export async function freshLink(store: Firestore, rawCode: unknown, deps: CodeDeps = {}): Promise<{ ok: true }> {
  const code = normaliseCode(rawCode);
  if (!code || code.length > MAX_CODE) return { ok: true };
  const ref = store.doc(`inviteCodes/${code}`);
  const snap = await ref.get();
  if (!snap.exists || snap.get("usedAt")) return { ok: true };
  const now = (deps.now ?? Date.now)();
  await ref.update({ linkExpiresAt: admin.firestore.Timestamp.fromMillis(now + LINK_TTL_MS) });
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

export const redeemInviteCode = onCall(
  { region: "europe-west2", timeoutSeconds: 60, memory: "256MiB" },
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
