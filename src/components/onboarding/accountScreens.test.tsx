/**
 * The account screens (onboarding v5, part 1): sign-up, sign-in, reset, inside the account frame.
 * Rendered to a string — this repo has no DOM — so these hold what is DRAWN and its order. What a
 * press does is held on the rendered page (tests/e2e/onbV5.measure.ts, A1 and A3).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { renderPage } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { Auth } from "../Auth";
import { HERO_H1, FOUNDING_EYEBROW, FOUNDING_GET_LEAD, FOUNDING_GETS } from "../../marketing/landingCopy";
import { INVITE_LABEL, INVITE_MISSING } from "../../lib/inviteCode";
import { INVITE_GATE_ENABLED } from "../../lib/beta";

const here = dirname(fileURLToPath(import.meta.url));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const signup = () => renderPage(<Auth initialMode="signup" />, "/").replace(/<!-- -->/g, "");
const signin = () => renderPage(<Auth initialMode="login" />, "/").replace(/<!-- -->/g, "");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("A1 the account frame: two tabs, a navy panel, one card", () => {
  it("names the place in the tab and offers the other mode as the recessed tab", () => {
    const up = signup();
    expect(up).toContain('data-setup-frame="account"');
    expect(up).toMatch(/<small class="ws-ftg">Your account<\/small><b class="ws-ftn"[^>]*>Create account<\/b>/);
    expect(up).toMatch(/<button[^>]*class="ws-ftsib"[^>]*>Sign in<\/button>/);
    const inn = signin();
    expect(inn).toMatch(/<b class="ws-ftn"[^>]*>Sign in<\/b>/);
    expect(inn).toMatch(/<button[^>]*class="ws-ftsib"[^>]*>Create account<\/button>/);
  });

  it("the sign-up panel states the founding offer in the landing page's own words", () => {
    const up = signup();
    expect(up).toContain(`<p class="sf-eyebrow">${esc(FOUNDING_EYEBROW)}</p>`);
    expect(up).toContain(`<h1 class="sf-offerh">${esc(HERO_H1)}</h1>`);
    expect(up).toContain(esc(FOUNDING_GET_LEAD));
    expect(FOUNDING_GETS.length).toBe(4);
    for (const line of FOUNDING_GETS) expect(up).toContain(`<li>${esc(line)}</li>`);
  });

  it("…and those words are imported, never restated", () => {
    const src = readFileSync(resolve(here, "../Auth.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toMatch(/from "\.\.\/marketing\/landingCopy"/);
    for (const line of [HERO_H1, ...FOUNDING_GETS]) expect(src, `"${line}" is typed into Auth.tsx`).not.toContain(line);
  });

  it("the sign-in panel greets a returning writer with the card's old heading and lede", () => {
    const inn = signin();
    expect(inn).toContain('<h1 class="sf-offerh">Welcome back.</h1>');
    expect(inn).toContain('<p class="sf-offerp">Sign in to pick up your querying where you left off.</p>');
    expect(inn).toContain('<h2 class="sf-h">Sign in</h2>');
    expect(inn, "the sign-in card has no lede").not.toMatch(/<h2 class="sf-h">Sign in<\/h2><p class="sf-lede"/);
  });

  it("the card's words: the new heading, the built lede, the quiet password hint", () => {
    const up = signup();
    expect(up).toContain('<h2 class="sf-h">Create your account</h2>');
    expect(up).toContain("Let’s put QueryHawk to work on organising your pipeline.");
    expect(up).toMatch(/Password<span class="sf-labq"> · at least 8 characters<\/span>/);
    expect(signin(), "sign-in shows no hint").not.toContain("at least 8 characters");
  });

  it("what is not changed is still there, verbatim", () => {
    const up = text(signup()), inn = text(signin());
    expect(up).toContain("Sign up with Google");
    expect(inn).toContain("Continue with Google");
    expect(up).toContain("or with email");
    expect(up).toMatch(/By continuing you agree to our\s+Terms\s+(?:&amp;|&)\s+Privacy Policy\s*\./);
    expect(inn).toContain("Forgot?");
    expect(inn).toContain("New to QueryHawk? Create an account");
  });

  it("the old furniture is gone: no preview, no segmented control, no feature column, no quill", () => {
    const up = signup();
    for (const gone of ["seg-opt", "col-feature", "preview-wrap", "brand-lock", "sa-au-root", "split-card"]) {
      expect(up, `${gone} is retired`).not.toMatch(new RegExp('["\\s`]' + gone + '["\\s`]'));
    }
    expect(text(up)).not.toContain("Query with confidence");
    expect(text(up)).not.toContain("Take the eerie out of query");
  });

  it("the ids the harness and the labels read are unchanged", () => {
    const up = signup(), inn = signin();
    for (const id of ["au-name", "au-email", "au-pw"]) expect(up).toContain(`id="${id}"`);
    for (const id of ["au-email", "au-pw"]) expect(inn).toContain(`id="${id}"`);
    expect(renderPage(<Auth initialMode="login" lab={{ view: "reset" }} />, "/")).toContain('id="au-reset"');
  });

  it("reset: one card, one state at a time, and the back link is a link", () => {
    const req = renderPage(<Auth initialMode="login" lab={{ view: "reset" }} />, "/");
    expect(req).toContain('<h2 class="sf-h">Reset your password</h2>');
    expect(req).toContain("‹ Back to sign in");
    expect(req).toContain("Send reset link");
    expect(req).not.toContain("Check your inbox");
    const sent = renderPage(<Auth initialMode="login" lab={{ view: "reset", resetSent: true, email: "w@example.com" }} />, "/");
    expect(sent).toContain('<h2 class="sf-h">Check your inbox</h2>');
    expect(sent).toContain("a reset link is on its way. It expires in an hour.");
    expect(sent, "no tick ring").not.toContain("ok-ring");
    expect(sent).not.toContain("Send reset link");
  });
});

describe("A2 the invite field follows the flag as built — gate OFF", () => {
  it("the flag is off in this build, and this pack did not change it", () => {
    expect(INVITE_GATE_ENABLED).toBe(false);
  });
  it("no invite field and no empty box", () => {
    const up = signup();
    expect(up).not.toContain('id="au-invite"');
    expect(up).not.toMatch(/["\s`]sf-invite["\s`]/);
    expect(up).not.toContain(esc(INVITE_LABEL));
  });
  it("the submit still refuses a missing code when the gate is on (the handler is as built)", () => {
    const src = readFileSync(resolve(here, "../Auth.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).toContain("const needsInvite = BETA_MODE && INVITE_GATE_ENABLED && mode === \"signup\";");
    expect(src).toContain("setInviteError(inviteMissing ? INVITE_MISSING : null);");
    expect(INVITE_MISSING.length).toBeGreaterThan(0);
  });
});
