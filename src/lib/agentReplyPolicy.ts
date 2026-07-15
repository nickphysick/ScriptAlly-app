/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent "if they don't reply" tri-state — the pure read/write mapping behind the Contact List's
 * Response-guidelines toggle (interaction-layer 6c; extracted + locked in the polish pass).
 *
 * MODEL LAW (Nick): `Agent.noResponseMeansNo?` is an OPTIONAL boolean — absence = "not stated",
 * never a magic 0/false. So the three states round-trip as:
 *   true      ↔ "No response means no"   ("no")
 *   false     ↔ "They reply either way"  ("either")
 *   ABSENT    ↔ "Not stated"             ("unstated")
 *
 * The write for "Not stated" must therefore CLEAR the field (deleteField() in the component) — NEVER
 * write `undefined` (a Firestore no-op that leaves the prior boolean in place — the snap-back bug) and
 * NEVER write `false` (that's "They reply either way", a different meaning). `replyPolicyWrite` returns
 * `{ clear: true }` for that case so the caller maps it to deleteField().
 */

export type ReplyPolicy = "no" | "either" | "unstated";

/** Read side: map the stored (possibly absent) boolean to the selected tri-state button. */
export function replyPolicyOf(noResponseMeansNo?: boolean): ReplyPolicy {
  return noResponseMeansNo === true ? "no" : noResponseMeansNo === false ? "either" : "unstated";
}

/**
 * Write side: the field INTENT for a chosen button. `{ value }` sets the boolean; `{ clear: true }`
 * means remove the field (→ deleteField()). Never `undefined`, never `false` for "unstated".
 */
export type ReplyPolicyWrite = { value: boolean } | { clear: true };
export function replyPolicyWrite(next: ReplyPolicy): ReplyPolicyWrite {
  return next === "no" ? { value: true } : next === "either" ? { value: false } : { clear: true };
}
