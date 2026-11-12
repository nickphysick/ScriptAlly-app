/**
 * The account screens — getting in (non-workspace v1, Phase 1; ref: design-refs/getting-in-v1.html). Rendered to a
 * string — this repo has no DOM — so these hold what is DRAWN and its order. Re-pointed from the onboarding-v5 locks:
 * the offer panel now speaks the ref's words, and the mono eyebrow above its heading is gone.
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
vi.mock("../../lib/beta", async (orig) => ({ ...(await orig<typeof import("../../lib/beta")>()), BETA_MODE: true, INVITE_GATE_ENABLED: false }));

import { Auth, AUTH_COPY } from "../Auth";

const here = dirname(fileURLToPath(import.meta.url));
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/'/g, "&#x27;").replace(/"/g, "&quot;");
const signup = () => renderPage(<Auth initialMode="signup" />, "/").replace(/<!-- -->/g, "");
const signin = () => renderPage(<Auth initialMode="login" />, "/").replace(/<!-- -->/g, "");
const text = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");

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

  it("no small mono label above the panel's heading", () => {
    expect(signup()).not.toContain("sf-eyebrow");
    expect(signin()).not.toContain("sf-eyebrow");
  });

  it("sign-in greets a returning writer in the ref's words", () => {
    const inn = signin();
    expect(inn).toContain(`<h1 class="sf-offerh">${esc(AUTH_COPY.signinHeading)}</h1>`);
    expect(inn).toContain(`<p class="sf-offerp">${esc(AUTH_COPY.signinLead)}</p>`);
    expect(inn).toContain('<h2 class="sf-h">Sign in</h2>');
  });

  it("sign-in offers Google, the password, the forgotten link and the email link instead", () => {
    const t = text(signin());
    expect(t).toContain("Continue with Google");
    expect(t).toContain("or with your email");
    expect(t).toContain("Forgotten it?");
    expect(t).toContain("Email me a sign-in link instead");
  });

  it("create account (gate off): Google, the name, a password hinted at 8, the Terms and Privacy policy", () => {
    const up = signup(), t = text(up);
    expect(up).toContain('<h2 class="sf-h">Create your account</h2>');
    expect(t).toContain("Continue with Google");
    expect(t).toContain("or set a password");
    expect(t).toContain("At least 8 characters");
    expect(t).toMatch(/By continuing you agree to our\s+Terms\s+and\s+Privacy policy\s*\./);
  });

  it("the ids the harness and the labels read are unchanged", () => {
    const up = signup(), inn = signin();
    for (const id of ["au-name", "au-email", "au-pw"]) expect(up).toContain(`id="${id}"`);
    for (const id of ["au-email", "au-pw"]) expect(inn).toContain(`id="${id}"`);
    expect(renderPage(<Auth initialMode="login" lab={{ view: "reset" }} />, "/")).toContain('id="au-reset"');
  });

  it("reset: one state at a time, in the ref's words", () => {
    const req = text(renderPage(<Auth initialMode="login" lab={{ view: "reset" }} />, "/"));
    expect(req).toContain("Locked out?");
    expect(req).toContain("Set a new password");
    expect(req).toContain("Send me the link");
    expect(req).not.toContain("Check your email.");
    const sent = text(renderPage(<Auth initialMode="login" lab={{ view: "reset", resetSent: true, email: "w@example.com" }} />, "/"));
    expect(sent).toContain("Check your email.");
    expect(sent).toContain("If w@example.com has a QueryHawk account, a link to set a new password is on its way.");
    expect(sent).toContain("Send it again");
    expect(sent).not.toContain("Send me the link");
  });

  it("one filled navy button per view", () => {
    for (const h of [signup(), signin(), renderPage(<Auth initialMode="login" lab={{ view: "reset" }} />, "/")]) {
      const filled = (h.match(/class="sf-btn(?! sf-btn--line)[^"]*"/g) ?? []).length;
      expect(filled).toBe(1);
    }
  });

  it("no label in the mono capitals: the account card's labels are the sans face", () => {
    const css = readFileSync(resolve(here, "../auth.css"), "utf8");
    expect(css).toMatch(/\.sf \.sf-authcard \.sf-lab \{[^}]*font-family: var\(--font-sans\)[^}]*text-transform: none/);
  });
});
