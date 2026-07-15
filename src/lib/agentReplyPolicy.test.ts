/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks the agent "if they don't reply" tri-state round-trip (polish pass P1). Proves the reported
 * snap-back bug can't recur: "Not stated" CLEARS the field (never undefined/false), and an absent
 * field reads back as "Not stated" (never "They reply either way").
 */
import { describe, it, expect } from "vitest";
import { replyPolicyOf, replyPolicyWrite, type ReplyPolicy } from "./agentReplyPolicy";

describe("agentReplyPolicy — read side", () => {
  it("maps the stored boolean (incl. absent) to the selected button", () => {
    expect(replyPolicyOf(true)).toBe("no");
    expect(replyPolicyOf(false)).toBe("either");
    expect(replyPolicyOf(undefined)).toBe("unstated"); // absent → Not stated, NOT "either"
  });
});

describe("agentReplyPolicy — write side", () => {
  it("'Not stated' CLEARS the field — never undefined, never false", () => {
    expect(replyPolicyWrite("unstated")).toEqual({ clear: true });
  });
  it("the boolean choices write their value", () => {
    expect(replyPolicyWrite("no")).toEqual({ value: true });
    expect(replyPolicyWrite("either")).toEqual({ value: false });
  });
});

describe("agentReplyPolicy — round-trip (write → resulting stored value → read back)", () => {
  // Simulate what Firestore holds after each write: { value } stores the bool; { clear: true } removes
  // the field, so the re-read sees `undefined`.
  const storedAfter = (next: ReplyPolicy): boolean | undefined => {
    const w = replyPolicyWrite(next);
    return "clear" in w ? undefined : w.value;
  };

  it.each<ReplyPolicy>(["no", "either", "unstated"])("%s round-trips to itself", (policy) => {
    expect(replyPolicyOf(storedAfter(policy))).toBe(policy);
  });
});
