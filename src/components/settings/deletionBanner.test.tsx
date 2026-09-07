/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The scheduled-deletion banner, and the copy audit that goes with it.
 *
 * ⚠️ THE AUDIT IS ASSERTED, NOT NOTED. `ACCOUNT_DELETION_ENABLED` is false — no job purges an
 * account — so every sentence in this flow has to be checkable against what the code does. A note
 * in a report is read once; this fails the day someone writes "will be permanently deleted on".
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { stripComments } from "../../test/pageSmoke";
import {
  deletionRequest, deletionNotice, deletionCancelled, scheduledDeletion,
  DELETION_BANNER_ACTION, DELETION_REMOVES, RETENTION_LINE, DELETION_GRACE_DAYS,
} from "../../lib/accountDeletion";
import { ACCOUNT_DELETION_ENABLED } from "../../lib/dataExport";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

const BANNER = read("DeletionBanner.tsx");
const SHELL = read("../shell/AppShell.tsx");

describe("it is app-wide, and it renders nothing until there is something to say", () => {
  /**
   * ⚠️ MOUNTED AS A SIBLING OF THE WORKSPACE, beside the beta strip — outside `.wpg`, so the page
   * header's collapse arithmetic cannot see it. Asserted as ORDER, because a banner mounted INSIDE
   * the shell would be clipped by the content window and would scroll with the page.
   */
  it("mounts above the workspace, in the strip slot", () => {
    const at = SHELL.indexOf("<DeletionBanner");
    expect(at, "not mounted").toBeGreaterThan(-1);
    expect(SHELL.indexOf("<BetaStrip")).toBeLessThan(at);
    expect(at).toBeLessThan(SHELL.indexOf('className="sv2-app ws-host"'));
  });

  it("⚠️ returns null with no request, so it costs nothing on the ordinary day", () => {
    expect(BANNER).toContain("if (!pending) return null;");
    expect(scheduledDeletion(undefined)).toBeNull();
    expect(scheduledDeletion(deletionCancelled())).toBeNull();
  });

  /**
   * ⚠️ NOT DISMISSIBLE, AND THAT IS THE DIFFERENCE FROM `BetaStrip`. A beta notice dismissed in
   * March should be gone by April; this is true until it is cancelled or carried out, and the only
   * control that should remove it is the one that changes the fact.
   */
  it("⚠️ carries no dismiss — no × , no sessionStorage, no 'dismissed'", () => {
    expect(BANNER).not.toMatch(/dismiss/i);
    expect(BANNER).not.toContain("sessionStorage");
    expect(BANNER).not.toContain("localStorage");
  });

  /** One cancel SHAPE, two callers — the settings card and this. */
  it("cancels through the shared record rather than a hand-written object", () => {
    expect(BANNER).toContain("deletionCancelled()");
    expect(BANNER).not.toMatch(/requestedAt:\s*""/);
    expect(read("../AccountSettings.tsx")).toContain("deletionCancelled()");
  });
});

describe("⚠️ THE COPY AUDIT — nothing promises a deletion nothing performs", () => {
  const notice = deletionNotice(deletionRequest(new Date("2026-09-07T10:00:00Z")), new Date("2026-09-07T10:00:00Z"));

  /* The flag is the premise of every assertion below it. If it ever turns true, these change. */
  it("the purge flag still says the job does not exist", () => {
    expect(ACCOUNT_DELETION_ENABLED).toBe(false);
  });

  /**
   * ⚠️ "DUE FOR DELETION", NEVER "WILL BE DELETED". Nothing runs on that date. The distinction is
   * the whole of this audit: one states that a dated, cancellable request exists, the other states
   * that an automatic process will act, and only the first is true.
   */
  it("the notice states a request, not an event that will happen", () => {
    expect(notice).toContain("due for deletion");
    expect(notice.toLowerCase()).not.toMatch(/will be (?:permanently )?deleted|will be removed|automatically/);
  });

  it("and the banner reuses that notice rather than writing its own sentence", () => {
    expect(BANNER).toContain("deletionNotice(pending)");
  });

  /**
   * ⚠️ THE BANNER MUST NOT REPEAT THE ONE FALSE CLAIM IN THIS FLOW. The design ref's banner reads
   * "Signing in cancels it." Nothing in this app cancels a scheduled deletion on sign-in:
   * `scheduledDeletion` is written by the request and cleared by the cancel button, and there is no
   * auth-time hook anywhere near it. The settings card carries that sentence TODAY and it is false;
   * it is reported rather than rewritten, because it is copy a brief fixed. A second surface
   * repeating it is what this forbids.
   */
  it("⚠️ the banner does not claim that signing in cancels anything", () => {
    expect(BANNER.toLowerCase()).not.toMatch(/signing in|sign in again/);
    expect(DELETION_BANNER_ACTION).toBe("Cancel deletion");
  });

  /** It says what IS true and reassuring: nothing has gone yet. */
  it("it says nothing has been removed, because nothing has", () => {
    expect(BANNER).toContain("Nothing has been removed");
  });

  /**
   * ⚠️ THE SETTINGS CARD ADMITS THE PURGE IS MANUAL. That admission is what makes the rest of the
   * flow honest; without it the fortnight and the date read as an automatic process.
   */
  it("the settings card states that completion is by hand", () => {
    expect(read("../AccountSettings.tsx")).toContain("Deletion isn't automatic yet");
  });

  /** Scope is named rather than reassured about — vague comfort is not consent to lose your work. */
  it("what goes is enumerated, and the grace period is one number everywhere", () => {
    expect(DELETION_REMOVES.length).toBeGreaterThan(3);
    expect(DELETION_GRACE_DAYS).toBe(14);
    expect(RETENTION_LINE).toContain("30 days");
    /* ⚠️ 14 AND 30 ARE DIFFERENT NUMBERS FOR DIFFERENT THINGS — the cancellable window and the
       backup window. The earlier pack conflated them, which is why they are asserted apart. */
    expect(RETENTION_LINE).not.toContain(`${DELETION_GRACE_DAYS} days`);
  });
});
