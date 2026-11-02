/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Landing waitlist clarity v1 (2 Nov; ref design-refs/landing-waitlist-clarity-v1.html, section 4) — the
 * landing's and the welcome page's half (the emails' half is functions/src/waitlistClarity.test.ts).
 *   WLC-4 · the copy, word for word, and no dates on the welcome page.
 *   WLC-5 · the overflow state is the "reserve list" in every user-facing word.
 * ⚠️ TYPED FROM THE BRIEF, NOT IMPORTED: a lock that imports the constant agrees with any edit to it.
 */
import { describe, it, expect } from "vitest";
/* ── WLC-4 · the copy (ref section 4, exact); WLC-5 · the overflow state is the reserve list ── */
import { FOUNDING_SENT, FOUNDING_FULL } from "./landingCopy";
import { heroCopy, nextSteps, PASS_LABEL_WAITING, WELCOME_KINDS, NOTE, NOTE_WAITING, READY_LIST, CLOSE_LINE } from "./welcomeCopy";

const MONTHS = /\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/;

describe("WLC-4 · the landing's and the welcome page's copy, word for word", () => {
  it("FOUNDING_SENT", () => {
    expect(FOUNDING_SENT).toBe("Nearly there. We've emailed you a link: click it to confirm your place on the waitlist. If it isn't in your inbox in a few minutes, check your spam folder.");
  });
  it("verified: the lede", () => {
    expect(heroCopy("verified", {}).lede).toBe("Everything's locked in. You'll be getting a QueryHawk campaign totally free of charge. Watch out for your invite – it'll be arriving soon.");
  });
  it("already: the heading", () => {
    expect(heroCopy("already", {}).heading).toBe("You're already on the list.");
  });
  it("the invitation step promises an email, not a date", () => {
    const step = nextSteps("verified", { foundingNumber: 3 }).find((s) => s.title === "Your invitation arrives");
    expect(step?.body).toBe("We're letting people in a few at a time so that everyone gets a proper welcome and the best experience possible. We'll email you as soon as your wave opens.");
  });
  it("no dates anywhere in the welcome page's words, in any state", () => {
    const words = WELCOME_KINDS.flatMap((k) => {
      const h = heroCopy(k, { foundingNumber: 3, reserveNumber: 2 });
      return [h.heading, h.lede, h.line ?? "", ...nextSteps(k, { foundingNumber: 3, reserveNumber: 2 }).flatMap((s) => [s.title, s.body])];
    }).concat(NOTE, NOTE_WAITING, READY_LIST, CLOSE_LINE).join(" \n ");
    expect(words).not.toMatch(MONTHS);
    expect(words).not.toMatch(/\bmid-|weeks, not months/i);
  });
});

describe("WLC-5 · the overflow state is the reserve list, in every user-facing word", () => {
  it("the landing's full message", () => {
    expect(FOUNDING_FULL).toBe("All fifty founding places have gone, but we've emailed you a link: click it to join the reserve list, and we'll email you if a place opens up.");
  });
  it("the welcome page's reserve state: pass, heading, lede and steps", () => {
    expect(PASS_LABEL_WAITING).toBe("Reserve list");
    const h = heroCopy("waiting", {});
    expect(h.heading).toBe("So close. You're on the reserve list.");
    const steps = nextSteps("waiting", {});
    expect(steps[0]).toEqual({ title: "You're on the reserve list", body: "On the reserve list, in the order writers confirmed." });
    const all = [h.heading, h.lede, h.line ?? "", ...steps.flatMap((s) => [s.title, s.body]), heroCopy("waiting", { reserveNumber: 3 }).heading].join(" ");
    expect(all).toContain("on the reserve list, in the order people confirmed");
    expect(all).not.toMatch(/waiting list/i);
  });
});
