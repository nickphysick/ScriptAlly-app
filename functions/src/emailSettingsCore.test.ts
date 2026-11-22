/**
 * Email settings without signing in — the pure half (non-workspace v1.1, item 5b): the token, the state, the write
 * and the page. The Firestore round trip is emailSettings.emulator.spec.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COPY, SETTINGS_TOKEN_TTL_MS, actionOf, emailPatch, emailSettingsPage, emailState, headline, makeSettingsToken, readSettingsToken,
} from "./emailSettingsCore";
import { prepareNudge, prepareWeekly } from "./emailTemplates";
import { emailSettingsLink, resolveMailConfig } from "./emailConfig";
import { runReminders } from "./reminderEmails";

const S = "secret";
const NOW = Date.parse("2026-11-13T09:00:00Z");
const cfg = resolveMailConfig({ APP_PUBLIC_URL: "https://scriptally-dev.web.app", WAITLIST_PUBLIC_URL: "https://scriptally-dev.web.app" } as never);

describe("the token names one account, and nothing else", () => {
  it("round-trips its uid, and carries no address", () => {
    const t = makeSettingsToken("uid-1", S, NOW)!;
    expect(readSettingsToken(t, S, NOW)).toBe("uid-1");
    expect(t).not.toMatch(/@/);
    expect(t.split(".")).toHaveLength(3);
  });
  it("tampered, re-signed with another key, or expired: null", () => {
    const t = makeSettingsToken("uid-1", S, NOW)!;
    const [, e, sig] = t.split(".");
    expect(readSettingsToken(`${Buffer.from("uid-2").toString("base64url")}.${e}.${sig}`, S, NOW)).toBeNull();
    expect(readSettingsToken(t, "other", NOW)).toBeNull();
    expect(readSettingsToken(t, S, NOW + SETTINGS_TOKEN_TTL_MS)).toBeNull();
    expect(readSettingsToken(t, S, NOW + SETTINGS_TOKEN_TTL_MS - 1000)).toBe("uid-1");
    expect(readSettingsToken(undefined, S, NOW)).toBeNull();
  });
  it("no secret, no token, and nothing accepted", () => {
    expect(makeSettingsToken("uid-1", "", NOW)).toBeNull();
    expect(readSettingsToken(makeSettingsToken("uid-1", S, NOW), "", NOW)).toBeNull();
  });
  it("the bad-link page states the code's own lifetime", () => {
    expect(SETTINGS_TOKEN_TTL_MS).toBe(60 * 86_400_000);
    expect(COPY.badBody).toContain("60 days");
  });
});

describe("state and writes are Settings › Emails' own", () => {
  it("defaults: nudges and weekly on, news off", () => {
    expect(emailState({})).toEqual({ nudges: true, weekly: true, news: false });
  });
  it("notifyPrefs is written as the whole map; news as { granted, at }", () => {
    expect(emailPatch({ notifyPrefs: { scout: true } }, { kind: "flip", key: "nudges" }, "T")).toEqual({
      notifyPrefs: { nudges: false, weeklyDigest: true, discover: false, scout: true, comps: false },
    });
    expect(emailPatch({}, { kind: "flip", key: "news" }, "T")).toEqual({ marketingConsent: { granted: true, at: "T" } });
  });
  it("off on something already off writes nothing; looking writes nothing", () => {
    expect(emailPatch({ marketingConsent: { granted: false, at: "old" } }, { kind: "off", key: "news" }, "T")).toBeNull();
    expect(emailPatch({}, { kind: "view" }, "T")).toBeNull();
  });
  it("a request's action: a POSTed switch, a Turn off link, or just looking", () => {
    expect(actionOf("POST", { flip: "weekly" }, {})).toEqual({ kind: "flip", key: "weekly" });
    expect(actionOf("GET", undefined, { off: "nudges" })).toEqual({ kind: "off", key: "nudges" });
    expect(actionOf("POST", { "List-Unsubscribe": "One-Click" }, { off: "weekly" })).toEqual({ kind: "off", key: "weekly" });
    expect(actionOf("GET", undefined, { off: "everything" })).toEqual({ kind: "view" });
  });
});

describe("the page, as the ref draws it", () => {
  it("the headline counts what is on", () => {
    expect(headline({ nudges: false, weekly: false, news: false })).toBe("No emails on.");
    expect(headline({ nudges: false, weekly: true, news: false })).toBe("One email on.");
    expect(headline({ nudges: true, weekly: true, news: false })).toBe("Two emails on.");
    expect(headline({ nudges: true, weekly: true, news: true })).toBe("All three emails on.");
  });
  const page = emailSettingsPage({ kind: "ok", token: "a.1.b", email: "maya@example.com", state: { nudges: false, weekly: true, news: false }, done: { key: "nudges", on: false } });
  it("says what was done, for whom, and draws the three switches with their state", () => {
    expect(page).toContain("<h1>One email on.</h1>");
    expect(page).toContain("<h2>Nudge reminders are off.</h2>");
    expect(page).toContain("<b>maya@example.com</b>");
    expect(page.match(/role="switch"/g)).toHaveLength(3);
    expect(page).toContain('value="nudges" role="switch" aria-checked="false"');
    expect(page).toContain('value="weekly" role="switch" aria-checked="true"');
  });
  it("no script, no filled button, no green, no small upper-case labels", () => {
    expect(page).not.toMatch(/<script/i);
    expect(page).not.toMatch(/text-transform\s*:\s*uppercase/i);
    expect(page).not.toMatch(/green/i);
    expect(page).not.toMatch(/btn pri|class="[^"]*\bpri\b/);
  });
  it("a bad or expired link: a plain screen with a link to sign in, and no switches", () => {
    const bad = emailSettingsPage({ kind: "bad", signInUrl: "https://scriptally-dev.web.app/account/emails#/login" });
    expect(bad.replace(/&#39;/g, "'")).toContain(COPY.badHeading);
    expect(bad).toContain('href="https://scriptally-dev.web.app/account/emails#/login"');
    expect(bad).not.toContain('role="switch"');
  });
});

describe("⚠️ the non-founding emails carry the account's token", () => {
  const link = emailSettingsLink(cfg, "TOKEN");
  it("the link is the page's, on the app's origin", () => {
    expect(link).toBe("https://scriptally-dev.web.app/api/email-settings?t=TOKEN");
    expect(emailSettingsLink(cfg, "TOKEN", "nudges")).toBe("https://scriptally-dev.web.app/api/email-settings?t=TOKEN&off=nudges");
    expect(emailSettingsLink(cfg, null)).toBeNull();
  });
  it("the nudge and the weekly put it in Turn off and Email settings, for that writer only", async () => {
    const sends: { to: string; html: string; headers?: Record<string, string> }[] = [];
    const DAY = 86_400_000;
    const NOWM = Date.parse("2026-11-16T08:00:00Z");
    const users = ["w1", "w2"].map((uid) => ({ uid, email: `${uid}@example.com` }));
    const out = await runReminders("nudge", {
      listUsers: async () => users,
      facts: async (u) => ({
        user: u, queries: [{ id: "q", status: "Queried", agentId: "a", manuscriptId: "m", dateSent: new Date(NOWM - 70 * DAY).toISOString() }],
        agents: new Map([["a", { id: "a", name: "Ada" }]]), manuscripts: new Map([["m", { id: "m", title: "T" }]]),
      }),
      send: async (to, _k, email) => { sends.push({ to, ...(email as { html: string; headers?: Record<string, string> }) }); return { ok: true }; },
      flagOn: true, cfg, nowMs: NOWM, settingsToken: (uid) => `tok-${uid}`,
    });
    expect(out.sent).toBe(2);
    for (const s of sends) {
      const uid = s.to.split("@")[0];
      const other = uid === "w1" ? "w2" : "w1";
      expect(s.html).toContain(`/api/email-settings?t=tok-${uid}&amp;off=nudges`);
      expect(s.html).toContain(`/api/email-settings?t=tok-${uid}"`);
      expect(s.html).not.toContain(`tok-${other}`);
      expect(JSON.stringify(s.headers)).toContain(`t=tok-${uid}&off=nudges`);
    }
  });
  it("with no token the links stay on Settings › Emails", () => {
    const p = prepareWeekly(cfg, {
      weekPhrase: "w", happened: [{ kind: "sent", agentNames: ["A"] }], coming: [], standing: { queriesOut: 1, requests: 0, sent: 1, quiet: 0 },
      turnOffUrl: "https://scriptally-dev.web.app/account/emails",
    });
    expect(p.ok && p.email.html).toContain("https://scriptally-dev.web.app/account/emails");
    expect(p.ok && p.email.html).not.toContain("/api/email-settings");
    void prepareNudge;
  });
  it("the sign-in and reset emails get it; the new-address and old-address emails do not", () => {
    const src = readFileSync(join(process.cwd(), "functions/src/accountEmailsCore.ts"), "utf8");
    expect(src).toMatch(/prepareSignIn\(cfg, signInLink, settingsUrl\)/);
    expect(src).toMatch(/prepareReset\(cfg, link, settingsUrl\)/);
    expect(src).toMatch(/prepareNewEmail\(cfg, link\)\)/);
    expect(src).toMatch(/prepareEmailChanged\(cfg, \{/);
  });
});

describe("v1.1: the page at the function's own URL (no hosting rewrite)", () => {
  it("EMAIL_SETTINGS_URL wins over the app origin", () => {
    const cfg = resolveMailConfig({ APP_PUBLIC_URL: "https://scriptally-dev.web.app" } as never);
    const was = process.env.EMAIL_SETTINGS_URL;
    process.env.EMAIL_SETTINGS_URL = "https://europe-west2-scriptally-dev.cloudfunctions.net/emailSettings";
    try {
      expect(emailSettingsLink(cfg, "TOKEN", "weekly")).toBe("https://europe-west2-scriptally-dev.cloudfunctions.net/emailSettings?t=TOKEN&off=weekly");
    } finally { if (was === undefined) delete process.env.EMAIL_SETTINGS_URL; else process.env.EMAIL_SETTINGS_URL = was; }
  });
});
