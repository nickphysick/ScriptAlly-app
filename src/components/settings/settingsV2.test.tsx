/**
 * Settings v2 (non-workspace v1, Phase 2; ref: design-refs/settings-v2.html) — the locks.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve } from "path";
import { renderPage, renderPageSeeded, noNavigate } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { AccountSettings } from "../AccountSettings";
import { ACCOUNT_ROUTES, accountRedirectFor } from "../../lib/accountRoutes";
import { saveEmailToggle, finishQuerying, type EmailToggle } from "../../lib/settingsSaves";
import { notifyPrefs, marketingGranted, type NotifyPrefs } from "../../lib/accountPrefs";
import { settingsHeadline, type HeadlineFacts } from "../../lib/settingsHeadline";

const SRC = readFileSync(resolve(__dirname, "../AccountSettings.tsx"), "utf8");

/** A tiny user doc that applies the page's patches the way updateUserProfile merges top-level keys. */
function fakeUser(start: { notifyPrefs: NotifyPrefs; marketingConsent?: unknown; scheduledDeletion?: unknown }) {
  const doc: Record<string, unknown> = { ...start };
  const writes: Record<string, unknown>[] = [];
  const updateUserProfile = async (patch: Record<string, unknown>) => { writes.push(patch); Object.assign(doc, patch); };
  return { doc, writes, updateUserProfile, notify: () => notifyPrefs(doc.notifyPrefs as NotifyPrefs) };
}
const emailState = (u: ReturnType<typeof fakeUser>) => ({
  nudges: u.notify().nudges, weekly: u.notify().weeklyDigest, news: marketingGranted(u.doc.marketingConsent as never),
});

describe("each email toggle round-trips, and Undo restores it", () => {
  for (const kind of ["nudges", "weekly", "news"] as EmailToggle[]) {
    for (const to of [true, false]) {
      it(`${kind} → ${to ? "on" : "off"}, then Undo`, async () => {
        const u = fakeUser({ notifyPrefs: { nudges: !to, weeklyDigest: !to, discover: false, scout: true, comps: false } });
        if (!to) u.doc.marketingConsent = { granted: true, at: "2026-11-01T00:00:00.000Z" };
        const before = emailState(u);
        const { message, undo } = await saveEmailToggle(kind, to, { notify: u.notify(), updateUserProfile: u.updateUserProfile });
        expect(emailState(u)[kind]).toBe(to);
        expect(message).toMatch(new RegExp(`${to ? "on" : "off"}$`));
        /* the other two are untouched, and so are keys the page does not draw (scout) */
        for (const other of (["nudges", "weekly", "news"] as EmailToggle[]).filter((k) => k !== kind)) expect(emailState(u)[other]).toBe(before[other]);
        expect(u.notify().scout).toBe(true);
        await undo();
        expect(emailState(u)).toEqual(before);
      });
    }
  }
});

describe("the delete dialog's \"finished querying\" way out deletes nothing", () => {
  it("turns the two reminder emails off and writes nothing else", async () => {
    const u = fakeUser({ notifyPrefs: { nudges: true, weeklyDigest: true, discover: false, scout: false, comps: false } });
    const { undo } = await finishQuerying({ notify: u.notify(), updateUserProfile: u.updateUserProfile });
    expect(u.notify()).toMatchObject({ nudges: false, weeklyDigest: false });
    expect(u.writes.flatMap((w) => Object.keys(w))).toEqual(["notifyPrefs"]);
    expect(u.doc.scheduledDeletion).toBeUndefined();
    await undo();
    expect(u.notify()).toMatchObject({ nudges: true, weeklyDigest: true });
  });
  it("the dialog wires that link to finishQuerying, never to the deletion request", () => {
    const fn = SRC.slice(SRC.indexOf("const finishedQuerying"), SRC.indexOf("/* ── sections ──"));
    expect(fn).toContain("finishQuerying(");
    expect(fn).not.toMatch(/deletionRequest|scheduledDeletion/);
    expect(SRC).toContain("Keep your records and stop the reminder emails instead");
  });
});

describe("five sections, in the ref's order, and the retired addresses redirect", () => {
  it("You, Preferences, Emails, Plan, Your data", () => {
    expect(ACCOUNT_ROUTES.map((r) => r.label)).toEqual(["You", "Preferences", "Emails", "Plan", "Your data"]);
  });
  it("security, notifications and tasks land on their new homes", () => {
    expect(accountRedirectFor("/account/security")).toBe("/account/profile");
    expect(accountRedirectFor("/account/notifications")).toBe("/account/emails");
    expect(accountRedirectFor("/account/tasks")).toBe("/account/preferences");
  });
});

describe("one filled button per section", () => {
  for (const r of ACCOUNT_ROUTES) {
    for (const seeded of [false, true]) {
      it(`${r.label}${seeded ? " (populated)" : ""}`, () => {
        const el = <AccountSettings section={r.id} onNavigate={noNavigate} />;
        const html = seeded ? renderPageSeeded(el, r.path) : renderPage(el, r.path);
        expect((html.match(/acct-btn--primary/g) ?? []).length).toBeLessThanOrEqual(1);
      });
    }
  }
});

describe("the live headlines", () => {
  const f = (o: Partial<HeadlineFacts> = {}): HeadlineFacts => ({
    name: "Maya Ellison", country: "United Kingdom", email: "m@example.com", basis: "founding", trialDaysLeft: null,
    emailsOn: { nudges: true, weekly: true, news: false }, quietWeeks: 4, counts: { queries: 83, agents: 61, manuscripts: 1 }, ...o,
  });
  it("You names the writer and where they write from", () => {
    expect(settingsHeadline("profile", f())[0]).toBe("Maya Ellison, writing from the United Kingdom.");
    expect(settingsHeadline("profile", f({ country: "Ireland" }))[0]).toBe("Maya Ellison, writing from Ireland.");
  });
  it("Emails counts what is on", () => {
    expect(settingsHeadline("emails", f())[0]).toBe("Two emails on. One off.");
    expect(settingsHeadline("emails", f({ emailsOn: { nudges: true, weekly: true, news: true } }))[0]).toBe("All three emails on.");
    expect(settingsHeadline("emails", f({ emailsOn: { nudges: false, weekly: false, news: false } }))[0]).toBe("No emails on.");
    expect(settingsHeadline("emails", f({ emailsOn: { nudges: true, weekly: false, news: false } }))[0]).toBe("One email on. Two off.");
  });
  it("Your data counts, or says nothing is here yet", () => {
    expect(settingsHeadline("data", f())[0]).toBe("83 queries, 61 agents and 1 manuscript. All yours.");
    expect(settingsHeadline("data", f({ counts: { queries: 0, agents: 0, manuscripts: 0 } }))[0]).toBe("Nothing here yet. It's all yours when there is.");
  });
  it("Preferences states the quiet window", () => {
    expect(settingsHeadline("preferences", f({ quietWeeks: 6 }))[0]).toBe("A query goes quiet 6 weeks after its reply date.");
  });
});

describe("what the ref removed is gone", () => {
  it("no \"emails aren't being sent yet\" notice, no green, no theme switcher", () => {
    expect(SRC).not.toMatch(/doesn't send these emails yet|aren't being sent/);
    expect(SRC).not.toMatch(/#3B6D11|SUCCESS_GREEN|sageAccent/);
    expect(SRC).not.toContain("queriesTheme");
  });
  it("a saved change confirms with the stamp and the snackbar with Undo", () => {
    const fn = SRC.slice(SRC.indexOf("const saved = "), SRC.indexOf("const failed = "));
    expect(fn).toContain("stamp(el)");
    expect(fn).toMatch(/showToast\(\{ message, \.\.\.\(undo \? \{ undo \} : \{\}\)/);
  });
});
