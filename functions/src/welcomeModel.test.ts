/**
 * The founding welcome's pure rules: the redirect, the reference, what the page may learn, and the
 * three quick answers.
 */
import { describe, expect, it } from "vitest";
import {
  welcomeRedirect, newWelcomeRef, welcomePayload, readWelcomeAnswers, WELCOME_REF_TTL_MS,
} from "./waitlistModel";
import { welcomeLead } from "./emailCopy";

describe("the redirect a confirmation link lands on", () => {
  it("for verified, already and waiting it carries the kind and a reference, and no number outside it", () => {
    const ref = newWelcomeRef();
    for (const kind of ["verified", "already", "waiting"] as const) {
      const url = welcomeRedirect(kind, ref);
      expect(url.startsWith(`/welcome?v=${kind}&r=`)).toBe(true);
      const withoutRef = url.replace(/[?&]r=[^&]*/, "");
      expect(withoutRef, "a number in plain text could be forged").not.toMatch(/\d/);
    }
  });

  it("expired and unknown carry no reference", () => {
    expect(welcomeRedirect("expired", null)).toBe("/welcome?v=expired");
    expect(welcomeRedirect("unknown", null)).toBe("/welcome?v=unknown");
  });

  it("the reference is at least 128 bits, URL-safe, and fresh each time", () => {
    const a = newWelcomeRef(), b = newWelcomeRef();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Buffer.from(a, "base64url").length * 8).toBeGreaterThanOrEqual(128);
    expect(WELCOME_REF_TTL_MS).toBe(30 * 60 * 1000);
  });
});

describe("what the welcome page may learn", () => {
  const doc = {
    email: "lucy@example.com", emailNormalised: "lucy@example.com", ipHash: "abc", source: "founders-hero",
    status: "verified", foundingNumber: 23, verifiedAt: new Date("2026-10-18T19:56:00Z"), welcomeRefKind: "verified",
  };

  it("a founding writer: the kind, their number and the date confirmed, and nothing else", () => {
    expect(welcomePayload(doc)).toEqual({ kind: "verified", foundingNumber: 23, confirmedOn: "2026-10-18" });
  });

  it("never contains an email address, or anything else about the writer", () => {
    const json = JSON.stringify(welcomePayload(doc));
    expect(json).not.toContain("@");
    expect(json).not.toContain("abc");
    expect(json).not.toContain("founders-hero");
  });

  it("a waiting-list writer: their reserve number and the day they confirmed", () => {
    expect(welcomePayload({
      status: "waiting", reserveNumber: 2, reserveAt: new Date("2026-10-18T22:30:00Z"), welcomeRefKind: "waiting",
    })).toEqual({ kind: "waiting", reserveNumber: 2, confirmedOn: "2026-10-18" });
  });

  it("the date is the UK calendar date, not UTC's", () => {
    expect(welcomePayload({ ...doc, verifiedAt: new Date("2026-10-18T23:30:00Z") }).confirmedOn).toBe("2026-10-19");
  });
});

describe("the three quick taps", () => {
  it("accepts exactly the listed values and returns flat fields", () => {
    expect(readWelcomeAnswers({ stage: "in-the-thick", queried: "11-50", tracker: "querytracker" }))
      .toEqual({ answerStage: "in-the-thick", answerQueried: "11-50", answerTracker: "querytracker" });
  });

  it("refuses anything else", () => {
    for (const bad of [
      { stage: "nearly", queried: "none", tracker: "inbox" },
      { stage: "revising", queried: "100", tracker: "inbox" },
      { stage: "revising", queried: "none", tracker: "trello" },
      { stage: "revising", queried: "none" },
      { stage: "revising", queried: "none", tracker: "inbox", extra: "x" },
      null, "stage=revising",
    ]) expect(readWelcomeAnswers(bad as unknown), JSON.stringify(bad)).toBeNull();
  });
});

describe("the welcome email's opening line", () => {
  it("names the founding number, unpadded", () => {
    expect(welcomeLead(23)).toBe("You're Founding Writer No. 23.");
  });
});
