/**
 * Plan rules v1 — what the founding-flag scripts may do to one account. PURE (tested in
 * src/test/foundingFlagScripts.test.ts).
 *
 * @param {{ current: boolean|null, mark: boolean, foundingCount: number, cap: number, overCap?: boolean }} x
 *   current: the account's flag now (null = absent); foundingCount: accounts founding now; overCap: the dev backfill's
 *   explicit permission to pass the cap (Nick, 12 Nov: every dev account becomes founding).
 * @returns {{ action: "mark"|"unmark"|"none", reason: string }}
 */
export function decideFlag({ current, mark, foundingCount, cap, overCap = false }) {
  if (mark) {
    if (current === true) return { action: "none", reason: "already founding" };
    if (foundingCount >= cap && !overCap) return { action: "none", reason: `cap reached (${foundingCount} of ${cap})` };
    return { action: "mark", reason: foundingCount >= cap ? `over the cap (${foundingCount + 1} of ${cap}), allowed by --over-cap` : `${foundingCount + 1} of ${cap}` };
  }
  if (current === false) return { action: "none", reason: "already unmarked" };
  return { action: "unmark", reason: current === true ? "founding → not founding" : "absent → explicitly not founding" };
}
