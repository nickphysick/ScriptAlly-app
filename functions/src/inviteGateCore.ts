/**
 * The invite check's logic (App site v1, Phase 1). Pure apart from the reads it is handed, so the root Vitest suite
 * covers it with a fake store; `inviteGate.ts` wires it to the blocking trigger and the named database.
 *
 * ⚠️ THE SOURCE OF TRUTH IS `inviteCodes`, NOT THE WAITLIST. A verified waitlist row is a place in the queue; a
 *    writer is invited when `scripts/founding-invite.ts` has written their `inviteCodes/{CODE}` doc and sent the
 *    email. So "invited" means: an UNUSED code names this address, as `issuedToEmail` (lower-cased by the script) or
 *    as `allowedEmail` (the other address a code-holder chose on the invite screen — `redeemInviteCode`'s "allow").
 * ⚠️ AN EXPIRED LINK IS STILL AN INVITATION. Expiry is about the link, never the place (inviteCode.ts).
 * ⚠️ IT FAILS CLOSED. If the list cannot be read, no account is made; the writer can try again.
 */

/** The words the client looks for in the refusal. Mirrored, byte for byte, as `NOT_INVITED_MARK` in src/lib/notInvited.ts. */
export const NOT_INVITED = "QH_NOT_INVITED";

/** The narrow slice of an Admin Firestore handle the check reads with. */
export interface InviteStore {
  collection(name: string): {
    where(field: string, op: "==", value: string): {
      limit(n: number): { get(): Promise<{ docs: ReadonlyArray<{ get(field: string): unknown }> }> };
    };
  };
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normaliseEmail = (v: unknown): string => (typeof v === "string" ? v.trim().toLowerCase() : "");

export async function isInvited(store: InviteStore, email: unknown): Promise<boolean> {
  const e = normaliseEmail(email);
  if (!e) return false;
  const codes = store.collection("inviteCodes");
  const [issued, allowed] = await Promise.all([
    codes.where("issuedToEmail", "==", e).limit(10).get(),
    codes.where("allowedEmail", "==", e).limit(10).get(),
  ]);
  return [...issued.docs, ...allowed.docs].some((d) => !d.get("usedAt"));
}

export type GateDecision = { allow: true } | { allow: false; reason: typeof NOT_INVITED | "unavailable" };

export async function gateDecision(store: InviteStore, email: unknown): Promise<GateDecision> {
  try {
    return (await isInvited(store, email)) ? { allow: true } : { allow: false, reason: NOT_INVITED };
  } catch (e) {
    console.error("inviteGate: the invite list could not be read; refusing:", e);
    return { allow: false, reason: "unavailable" };
  }
}

/**
 * "Use a different one" (the invite screen): may this code carry another address? Only an unused code whose link
 * still works, and only a real-looking address. The answer is what to write as `allowedEmail`, or nothing.
 */
export function allowEmailFor(
  code: { exists: boolean; usedAt: unknown; linkExpiresAt: number | null },
  rawEmail: unknown,
  now: number,
): { write: string | null } {
  const e = normaliseEmail(rawEmail);
  if (!code.exists || code.usedAt || !EMAIL_SHAPE.test(e) || e.length > 254) return { write: null };
  if (code.linkExpiresAt != null && now > code.linkExpiresAt) return { write: null };
  return { write: e };
}
