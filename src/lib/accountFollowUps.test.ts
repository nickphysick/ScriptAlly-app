/**
 * Settings › You follow-ups (non-workspace v1, Phase 5) — the client half of the locks.
 * (The server half — other sessions refused, this one kept — is functions/src/signOutOthers.test.ts.)
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { resolve, join } from "path";

const read = (p: string) => readFileSync(resolve(__dirname, p), "utf8");
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

describe("an unconfirmed email change leaves the sign-in address unchanged", () => {
  const files: string[] = [];
  const walk = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(n) && !/\.test\./.test(n)) files.push(p); } };
  walk(resolve(__dirname, ".."));
  it("nothing in the app changes the address directly", () => {
    expect(files.length).toBeGreaterThan(500);
    const hits = files.filter((f) => /\bupdateEmail\s*\(/.test(code(readFileSync(f, "utf8"))));
    expect(hits).toEqual([]);
  });
  it("starting a change only asks for a confirmation at the new address", () => {
    const fn = code(read("authActions.ts"));
    const body = fn.slice(fn.indexOf("export const startEmailChange"), fn.indexOf("export const pendingEmailChange"));
    expect(body).toContain('requestAccountEmail("newEmail", { newEmail: newEmail.trim() })');
    expect(body).not.toMatch(/updateProfile|updateUserProfile|updateEmail/);
  });
  it("the fallback is Firebase's verify-before-update, which changes nothing until the link is opened", () => {
    expect(code(read("accountEmail.ts"))).toMatch(/verifyBeforeUpdateEmail/);
  });
  it("the old address hears only once the account's address IS the new one", () => {
    const fn = code(read("authActions.ts"));
    const body = fn.slice(fn.indexOf("export const settlePendingEmailChange"));
    expect(body).toMatch(/auth\.currentUser\?\.email\?\.toLowerCase\(\) !== p\.to\.toLowerCase\(\)\) return false/);
  });
});

describe("other devices: this device signs back in on the fresh session", () => {
  it("the client signs in with the server's token straight after the revoke", () => {
    const fn = code(read("authActions.ts"));
    const body = fn.slice(fn.indexOf("export const signOutOtherDevices"), fn.indexOf("export const PENDING_EMAIL_KEY"));
    expect(body).toContain(`"signOutOtherDevices")({})`);
    expect(body).toContain("await signInWithCustomToken(auth, token)");
  });
  it("Settings' row is live, not a disabled placeholder", () => {
    const s = read("../components/AccountSettings.tsx");
    expect(s).toContain("onClick={(e) => void outEverywhere(e.currentTarget)}");
    expect(s).not.toMatch(/data-acct="outall" disabled className/);
  });
});

describe("the pending email-change panel (non-workspace v1.1, 5a)", () => {
  const s = readFileSync(resolve(__dirname, "../components/AccountSettings.tsx"), "utf8");
  const panel = s.slice(s.indexOf('data-acct="email-pending"'), s.indexOf("</SettingsNote>", s.indexOf('data-acct="email-pending"')));
  it("ends with the way out, and draws no cancel control", () => {
    expect(panel.length).toBeGreaterThan(50);
    expect(panel).toContain("Changed your mind? Ignore that email and nothing changes.");
    expect(panel).not.toMatch(/<button|Cancel/);
  });
});
