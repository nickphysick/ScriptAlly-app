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
