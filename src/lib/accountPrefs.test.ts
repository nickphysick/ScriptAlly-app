/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountPrefs — the totality of the resolvers, and the consent rules PECR actually requires.
 */
import { describe, it, expect } from "vitest";
import {
  notifyPrefs, NOTIFY_DEFAULT,
  marketingGranted, marketingConsentRecord, ALWAYS_SENT_LINE,
  resolveTimeZone, tzOptions, TZ_CHOICES, FALLBACK_TZ,
} from "./accountPrefs";

describe("notifyPrefs is total — absent, partial and nonsense all resolve", () => {
  it("absent and empty read as the stated defaults", () => {
    expect(notifyPrefs(undefined)).toEqual(NOTIFY_DEFAULT);
    expect(notifyPrefs(null)).toEqual(NOTIFY_DEFAULT);
    expect(notifyPrefs({})).toEqual(NOTIFY_DEFAULT);
  });

  it("a stored false is honoured — the case a lazy `??` gets wrong", () => {
    expect(notifyPrefs({ nudges: false }).nudges).toBe(false);
    expect(notifyPrefs({ weeklyDigest: false }).weeklyDigest).toBe(false);
  });

  it("one field set leaves the other at its default", () => {
    expect(notifyPrefs({ nudges: false }).weeklyDigest).toBe(NOTIFY_DEFAULT.weeklyDigest);
  });

  it("a nonsense value resolves to the default rather than propagating", () => {
    expect(notifyPrefs({ nudges: "yes" as unknown as boolean }).nudges).toBe(true);
  });
});

/* ⚠️ THE CONSENT RULES ARE LEGAL, NOT AESTHETIC. Affirmative, evidenced, withdrawable. */
describe("marketing consent", () => {
  it("is NOT granted when absent — no account starts opted in", () => {
    expect(marketingGranted(undefined)).toBe(false);
    expect(marketingGranted(null)).toBe(false);
  });

  it("is not granted by a truthy-looking record either", () => {
    expect(marketingGranted({ granted: false, at: "2026-08-20T00:00:00.000Z" })).toBe(false);
    expect(marketingGranted({ granted: "true" as unknown as boolean, at: "x" })).toBe(false);
  });

  it("is granted only by an explicit true", () => {
    expect(marketingGranted({ granted: true, at: "2026-08-20T00:00:00.000Z" })).toBe(true);
  });

  /* ⚠️ WITHDRAWAL IS RECORDED, NOT ERASED. Deleting the field on withdrawal would lose the
     evidence that consent was ever given, and the date it stopped — which is the half a regulator
     asks about. */
  it("stamps the moment for BOTH directions", () => {
    const now = new Date("2026-08-20T09:30:00.000Z");
    expect(marketingConsentRecord(true, now)).toEqual({ granted: true, at: now.toISOString() });
    expect(marketingConsentRecord(false, now)).toEqual({ granted: false, at: now.toISOString() });
  });

  it("the account-mail carve-out names the three kinds and promises nothing else", () => {
    for (const kind of ["sign-in", "billing", "data requests"]) {
      expect(ALWAYS_SENT_LINE).toContain(kind);
    }
    expect(ALWAYS_SENT_LINE).toContain("always sent");
  });
});

describe("resolveTimeZone — read-time, never a backfill to London", () => {
  it("prefers what is stored", () => {
    expect(resolveTimeZone("America/Chicago")).toBe("America/Chicago");
  });

  /* ⚠️ AN EXISTING ACCOUNT WITH NOTHING STORED READS AS ITS BROWSER'S ZONE. Defaulting to London
     would give a writer in Chicago wrong day boundaries with nothing on screen to explain it. */
  it("falls back to the browser's zone, not to a hardcoded one", () => {
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(resolveTimeZone(undefined)).toBe(browser || FALLBACK_TZ);
    expect(resolveTimeZone("")).toBe(browser || FALLBACK_TZ);
  });
});

describe("tzOptions never hides the zone you are actually on", () => {
  it("returns the list unchanged for a known zone", () => {
    expect(tzOptions("Europe/London")).toEqual([...TZ_CHOICES]);
  });

  /* A writer whose browser reports a zone outside the shortlist must still see their own — a
     select whose value is absent from its options renders as blank or silently reassigns. */
  it("prepends an unlisted zone rather than dropping it", () => {
    const opts = tzOptions("Antarctica/Troll");
    expect(opts[0]).toBe("Antarctica/Troll");
    expect(opts).toHaveLength(TZ_CHOICES.length + 1);
  });

  it("offers no duplicates", () => {
    expect(new Set(tzOptions("Europe/London")).size).toBe(tzOptions("Europe/London").length);
  });
});
