/**
 * App site v1, Phase 4 — the emails point at the app site, by configuration only.
 *
 * Every link into the app (the founder's invite `/join/<CODE>`, the account emails) is built from `APP_PUBLIC_URL`
 * (`functions/.env.<projectId>`, or the environment the invite script runs in). Nothing hard-codes an app host, so
 * the day prod's file says https://app.queryhawk.net every email says it too. Every sender stays @queryhawk.net.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { resolveMailConfig, inviteLink, appLink, DEFAULT_FROM, DEFAULT_ACCOUNT_FROM, SUPPORT_EMAIL } from "./emailConfig";
import { FEEDBACK_FROM_DEFAULT, FEEDBACK_TO_DEFAULT } from "./betaFeedbackCore";

const APP = "https://app.queryhawk.net";

describe("links into the app come from APP_PUBLIC_URL", () => {
  it("the founder's invite goes to the app site's /join/<CODE>", () => {
    expect(inviteLink(resolveMailConfig({ APP_PUBLIC_URL: APP }), "QH-7K2M-9XTD")).toBe(`${APP}/join/QH-7K2M-9XTD`);
    expect(inviteLink(resolveMailConfig({ APP_PUBLIC_URL: `${APP}/` }), "QH-7K2M-9XTD")).toBe(`${APP}/join/QH-7K2M-9XTD`);
  });
  it("without it there is no link, and the caller refuses to send", () => {
    expect(inviteLink(resolveMailConfig({}), "QH-7K2M-9XTD")).toBeNull();
    expect(appLink(resolveMailConfig({ WAITLIST_PUBLIC_URL: "https://queryhawk.net" }), "/account")).toBeNull();
  });
  it("no function's code names an app host: only the waitlist's origin allowlist lists sites", () => {
    const dir = __dirname;
    const hosts = /https:\/\/(app\.queryhawk\.net|queryhawk-app\.web\.app|scriptally-app\.web\.app|scriptally-dev(-landing)?\.web\.app)/;
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const hits = readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !/\.(test|spec)\.ts$|emulator\.spec\.ts$/.test(f))
      .filter((f) => !["waitlistModel.ts", "emailSamples.ts"].includes(f)) // the allowlist; the design-ref samples
      .filter((f) => hosts.test(strip(readFileSync(resolve(dir, f), "utf8"))));
    expect(hits).toEqual([]);
  });
});

describe("every sender stays @queryhawk.net", () => {
  it("the founding, account and feedback defaults", () => {
    for (const from of [DEFAULT_FROM, DEFAULT_ACCOUNT_FROM, FEEDBACK_FROM_DEFAULT]) expect(from).toMatch(/<[a-z]+@queryhawk\.net>$/);
    expect(SUPPORT_EMAIL).toMatch(/@queryhawk\.net$/);
    expect(FEEDBACK_TO_DEFAULT).toMatch(/@queryhawk\.net$/);
  });
});

describe("the template for prod's functions env names the app site", () => {
  it(".env.example shows APP_PUBLIC_URL as the app site, not a placeholder", () => {
    const ex = readFileSync(resolve(__dirname, "../.env.example"), "utf8");
    expect(ex).toMatch(/^# APP_PUBLIC_URL=https:\/\/app\.queryhawk\.net$/m);
    expect(ex).not.toContain("APP_PUBLIC_URL=https://app.example");
  });
  it("the invite script's dry run shapes its links on the app site", () => {
    const s = readFileSync(resolve(__dirname, "../../scripts/founding-invite.ts"), "utf8");
    expect(s).toContain('export const DRY_APP_URL = "https://app.queryhawk.net";');
  });
});
