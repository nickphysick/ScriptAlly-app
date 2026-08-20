/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountDeletion — the window, the confirmation, and the sentence that must not over-promise.
 */
import { describe, it, expect } from "vitest";
import {
  DELETION_GRACE_DAYS, DELETION_CONFIRM_WORD, deletionArmed,
  deletionRequest, daysRemaining, scheduledDeletion, deletionNotice,
  RETENTION_LINE, DELETION_REMOVES,
} from "./accountDeletion";
import { ACCOUNT_DELETION_ENABLED } from "./dataExport";
import { DELETION_WINDOW_DAYS } from "./companyInfo";

const NOW = new Date("2026-08-20T10:00:00.000Z");

describe("the confirmation arms only on the exact word", () => {
  it("accepts the word, forgiving case and surrounding space", () => {
    expect(deletionArmed("DELETE")).toBe(true);
    expect(deletionArmed(" delete ")).toBe(true);
    expect(deletionArmed("Delete")).toBe(true);
  });

  it("refuses everything else, including near-misses and the empty field", () => {
    for (const typed of ["", "   ", "DELET", "DELETEE", "delete my account", "yes", "confirm"]) {
      expect(deletionArmed(typed), JSON.stringify(typed)).toBe(false);
    }
  });

  it("the word is the one the UI renders", () => {
    expect(DELETION_CONFIRM_WORD).toBe("DELETE");
  });
});

describe("the grace window", () => {
  it("is 14 days, and lands inside the policy's own stated period", () => {
    expect(DELETION_GRACE_DAYS).toBe(14);
    const policy = Number(DELETION_WINDOW_DAYS.replace(/\D/g, ""));
    expect(DELETION_GRACE_DAYS).toBeLessThan(policy);
  });

  it("a request stamps now and 14 days out", () => {
    const r = deletionRequest(NOW);
    expect(r.requestedAt).toBe(NOW.toISOString());
    expect(new Date(r.purgeAfter).getTime() - NOW.getTime()).toBe(14 * 86400000);
  });

  it("counts down whole days", () => {
    const r = deletionRequest(NOW);
    expect(daysRemaining(r, NOW)).toBe(14);
    expect(daysRemaining(r, new Date("2026-08-27T10:00:00.000Z"))).toBe(7);
    expect(daysRemaining(r, new Date("2026-09-03T10:00:00.000Z"))).toBe(0);
  });

  /* ⚠️ PAST THE DATE IS STILL A LIVE REQUEST. With no purge job, an account past its window has
     NOT been deleted — treating the state as expired would hide the request and take away the only
     way to cancel it. */
  it("never goes negative, and the record survives its own date", () => {
    const r = deletionRequest(NOW);
    const late = new Date("2026-10-01T10:00:00.000Z");
    expect(daysRemaining(r, late)).toBe(0);
    expect(scheduledDeletion(r)).not.toBeNull();
  });
});

describe("scheduledDeletion tolerates a half-written or corrupt record", () => {
  it("reads a complete record", () => {
    const r = deletionRequest(NOW);
    expect(scheduledDeletion(r)).toEqual(r);
  });

  it("reads anything incomplete or unparseable as no request", () => {
    expect(scheduledDeletion(undefined)).toBeNull();
    expect(scheduledDeletion(null)).toBeNull();
    expect(scheduledDeletion({})).toBeNull();
    expect(scheduledDeletion({ requestedAt: NOW.toISOString() })).toBeNull();
    expect(scheduledDeletion({ requestedAt: "x", purgeAfter: "not-a-date" })).toBeNull();
  });
});

/* ⚠️ THE COPY IS THE POINT OF THIS PHASE. Nothing purges anything, so nothing may say it will. */
describe("the notice states a request, never a guarantee", () => {
  const r = deletionRequest(NOW);

  it("names the date and the days left", () => {
    expect(deletionNotice(r, NOW)).toContain("3 September 2026");
    expect(deletionNotice(r, NOW)).toContain("14 days");
  });

  it("agrees with itself at one day", () => {
    const oneLeft = new Date("2026-09-02T10:00:00.000Z");
    expect(deletionNotice(r, oneLeft)).toContain("1 day");
    expect(deletionNotice(r, oneLeft)).not.toContain("1 days");
  });

  it("switches to the past tense once the date has gone by", () => {
    expect(deletionNotice(r, new Date("2026-10-01T10:00:00.000Z"))).toContain("was due");
  });

  /* ⚠️ NO FUTURE-TENSE PROMISE OF AN AUTOMATIC DELETION. "due for deletion" is a statement about a
     request; "will be deleted" would be a statement about a job that does not exist. */
  it("promises no automatic purge", () => {
    for (const t of [NOW, new Date("2026-10-01T10:00:00.000Z")]) {
      const n = deletionNotice(r, t).toLowerCase();
      for (const promise of ["will be deleted", "will be removed", "will be permanently"]) {
        expect(n, promise).not.toContain(promise);
      }
    }
    expect(ACCOUNT_DELETION_ENABLED, "and the purge flag still says it does not exist").toBe(false);
  });
});

describe("what the writer is told they will lose", () => {
  it("names the records rather than reassuring vaguely", () => {
    const all = DELETION_REMOVES.join(" ").toLowerCase();
    for (const kind of ["manuscript", "agent", "quer", "note"]) {
      expect(all, kind).toContain(kind);
    }
  });

  /* One source for the retention period, shared with the privacy policy — including its brackets,
     which mark it as a figure nobody has confirmed. */
  /* ⚠️ THE LINE NOW CARRIES NO PERIOD AT ALL, AND THAT IS THE INSTRUCTION. `DELETION_WINDOW_DAYS`
     is still the placeholder "[30]" that the privacy policy renders; the v5 copy brief made the
     retention period a REQUIRED INPUT and it arrived blank, with an explicit rule for that case —
     ship without a figure, leave the constant's brackets alone, flag it. A bracketed placeholder
     reaching a reader is worse than no figure, and inventing a confirmed one is not a formatting
     decision. When a period is agreed, one edit to the constant fixes settings and the policy
     together and this line takes its number back. */
  it("states no retention period, because none has been confirmed", () => {
    expect(RETENTION_LINE).not.toContain("[");
    expect(RETENTION_LINE).not.toMatch(/\d+\s*days?/);
    expect(RETENTION_LINE).toContain("soon afterwards");
    /* the placeholder is untouched where it lives — this build did not turn it into a promise */
    expect(DELETION_WINDOW_DAYS).toBe("[30]");
  });
});
