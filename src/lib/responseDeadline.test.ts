/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for the canonical response-deadline formula (Prompt 3). This util is the single source of
 * truth the stored deadline, the fan-out, and the activityUtils display fallback all share.
 */
import { describe, it, expect } from "vitest";
import { computeResponseDeadline } from "./responseDeadline";

describe("computeResponseDeadline", () => {
  it("adds weeks*7 days to the send date, returning ISO", () => {
    // 1 Jan 2026 + 6 weeks (42 days) = 12 Feb 2026.
    const out = computeResponseDeadline("2026-01-01T00:00:00.000Z", 6);
    expect(out).toBe(new Date("2026-02-12T00:00:00.000Z").toISOString());
  });

  it("matches the inline formula it replaces (dateSent + weeks*7), across weeks", () => {
    const dateSent = "2026-03-10T09:30:00.000Z";
    for (const weeks of [0, 1, 4, 8, 12, 52]) {
      const expected = new Date(dateSent);
      expected.setDate(expected.getDate() + weeks * 7);
      expect(computeResponseDeadline(dateSent, weeks)).toBe(expected.toISOString());
    }
  });

  it("zero weeks yields the send date unchanged", () => {
    const dateSent = "2026-06-25T12:00:00.000Z";
    expect(computeResponseDeadline(dateSent, 0)).toBe(new Date(dateSent).toISOString());
  });
});

/**
 * §3 (provenance pack) — the latent throw.
 *
 * ⚠️ IT WAS NOT A TYPE ERROR THE COMPILER COULD SEE. `weeks` is declared `number`, and `addQuery`
 * passed `agent.responseTimeWeeks` — an OPTIONAL field — straight in. With nothing stated,
 * `setDate(NaN)` makes the date invalid and `toISOString()` raises a `RangeError`, so adding a
 * query for an agency that states no response time would have killed the whole create path.
 *
 * ⚠️ §1 REMOVED THAT CALL — the create-time seed is gone — and the guard stays anyway: two other
 * callers pass weeks from records that may not carry them.
 */
describe("§3 · absence is absence, not a thrown RangeError", () => {
  const sent = "2026-03-10T09:30:00.000Z";

  it("no stated weeks yields no deadline, and does not throw", () => {
    expect(() => computeResponseDeadline(sent, undefined)).not.toThrow();
    expect(computeResponseDeadline(sent, undefined)).toBe("");
    expect(computeResponseDeadline(sent, null)).toBe("");
    expect(computeResponseDeadline(sent, NaN)).toBe("");
    expect(computeResponseDeadline(sent, -1)).toBe("");
  });

  /* ⚠️ AND IT NEVER RETURNS A GUESSED DATE — an invented house figure in a field every reader takes
     as a fact about the agency is worse than the throw it replaces. */
  it("an unparseable send date yields no deadline either", () => {
    expect(computeResponseDeadline("not a date", 6)).toBe("");
  });

  /* ⚠️ `0` IS UNCHANGED. It is the retired "not stated" convention rather than a missing value, and
     a falsiness guard would have swept it up with `undefined` and altered the fan-out. */
  it("zero weeks keeps the answer it always gave", () => {
    expect(computeResponseDeadline(sent, 0)).toBe(new Date(sent).toISOString());
  });
});
