/**
 * Plan rules v1 — who the nightly backstop marks as a founding writer. PURE, so the cap and the order are tested
 * without a database (`foundingFlagPlan.test.ts`).
 *
 * ⚠️ A BACKSTOP ONLY. It fills an ABSENT flag and never touches one that is set either way: `true` is already founding,
 *    and `false` is an explicit unmark by `scripts/founding-flag.mjs`, which the backstop must not undo.
 * ⚠️ TWO PROOFS, IN ORDER OF AUTHORITY, both joined by the sign-in email (no account is linked to either by uid):
 *    1. a redeemed founder's code — `inviteCodes/{CODE}.usedBy` (redeemInviteCode records the email it was used with,
 *       before the account exists, so this join is the only way to reach it without rewriting it);
 *    2. a verified waitlist place — `waitlist/{emailHash}.status === "verified"`.
 * ⚠️ THE CAP HOLDS. Accounts already founding count against it; once it is reached nobody more is marked, and each one
 *    refused is returned so the run can log it.
 */
export type FoundingSource = "invite" | "waitlist";

export interface FlagAccount { uid: string; email: string | null; createdMs?: number | null }

export interface FlagPlan {
  set: { uid: string; source: FoundingSource }[];
  capped: { uid: string; source: FoundingSource }[];
  /** Founding accounts before this run. */
  already: number;
}

/**
 * @param accounts      every sign-in account, with its normalised email
 * @param flags         each account's current flag: true, false (unmarked) or undefined (absent)
 * @param invitedEmails normalised emails a founder's code was redeemed with
 * @param placedEmails  normalised emails holding a verified waitlist place
 */
export function planFoundingFlags(
  accounts: FlagAccount[],
  flags: Map<string, boolean | undefined>,
  invitedEmails: Set<string>,
  placedEmails: Set<string>,
  cap: number,
): FlagPlan {
  const already = [...flags.values()].filter((v) => v === true).length;
  const proof = (a: FlagAccount): FoundingSource | null =>
    a.email && invitedEmails.has(a.email) ? "invite" : a.email && placedEmails.has(a.email) ? "waitlist" : null;
  const rank = (s: FoundingSource) => (s === "invite" ? 0 : 1);
  const candidates = accounts
    .filter((a) => flags.get(a.uid) === undefined)
    .map((a) => ({ a, source: proof(a) }))
    .filter((x): x is { a: FlagAccount; source: FoundingSource } => x.source !== null)
    .sort((x, y) => rank(x.source) - rank(y.source) || (x.a.createdMs ?? Infinity) - (y.a.createdMs ?? Infinity) || x.a.uid.localeCompare(y.a.uid));
  const set: FlagPlan["set"] = [];
  const capped: FlagPlan["capped"] = [];
  let count = already;
  for (const { a, source } of candidates) {
    if (count < cap) { set.push({ uid: a.uid, source }); count++; } else capped.push({ uid: a.uid, source });
  }
  return { set, capped, already };
}
