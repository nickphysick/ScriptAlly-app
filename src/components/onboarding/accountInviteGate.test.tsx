/**
 * Getting in with the gate ARMED (non-workspace v1, Phase 1). A file of its own because the flag is mocked for the
 * whole module. Re-pointed from the A2 locks: the code now comes with the link, and the typed field is the fallback.
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
vi.mock("../../lib/beta", async (orig) => ({ ...(await orig<typeof import("../../lib/beta")>()), BETA_MODE: true, INVITE_GATE_ENABLED: true }));

import { Auth } from "../Auth";
import { CODE_PLACEHOLDER } from "../../lib/inviteCode";

const here = dirname(fileURLToPath(import.meta.url));
const text = (h: string) => h.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");
const ok = { code: "QH-7K2M-9XTD", status: { status: "ok" as const, email: "maya@example.com", name: "Maya Ellison", foundingNo: 12 } };

describe("arriving from the invite link", () => {
  const h = () => renderPage(<Auth initialMode="signup" lab={{ code: ok }} />, "/");

  it("the code is filled in and accepted: there is no code field to type into", () => {
    const html = h();
    expect(html).not.toContain('id="au-code"');
    expect(text(html)).toContain("Founder's code QH-7K2M-9XTD accepted");
    expect(text(html)).toContain("Your founder's code came with the link, so there's nothing to type in.");
  });

  it("greets the writer by first name and locks the invited address", () => {
    const t = text(h());
    expect(t).toContain("Your place is held, Maya.");
    expect(t).toContain("maya@example.com");
    expect(t).toContain("Use a different one");
  });

  it("the link's code is kept for the visit and redeemed after sign-up, so it is never asked for again", () => {
    const src = readFileSync(resolve(here, "../Auth.tsx"), "utf8");
    expect(src).toContain("codeFromPath(window.location.pathname)");
    expect(src).toMatch(/case "ok":\s*keepCode\(c\)/);
    const app = readFileSync(resolve(here, "../../App.tsx"), "utf8");
    expect(app).toContain("if (currentUser?.id) void redeemKeptCode();");
  });
});

describe("arriving without a code (the typed fallback)", () => {
  it("asks for the founder's code in its QH- shape", () => {
    const html = renderPage(<Auth initialMode="signup" />, "/");
    expect(html).toContain('id="au-code"');
    expect(html).toContain(`placeholder="${CODE_PLACEHOLDER}"`);
    expect(CODE_PLACEHOLDER).toBe("QH-XXXX-XXXX");
    expect(text(html)).toContain("Enter your founder's code");
  });
  it("the three outcomes the ref shows: works, already used (with Sign in instead), not recognised", () => {
    const src = readFileSync(resolve(here, "../Auth.tsx"), "utf8");
    expect(src).toMatch(/case "ok":[\s\S]*?go\("invite"/);
    expect(src).toMatch(/case "used":[\s\S]*?CODE_USED[\s\S]*?setUsedCode\(true\)/);
    expect(src).toMatch(/case "unknown":[\s\S]*?CODE_UNKNOWN/);
    expect(src).toMatch(/usedCode && [\s\S]*?CODE_USED_LINK/);
  });
});

describe("an expired invite link", () => {
  it("holds the place and offers a fresh link", () => {
    const t = text(renderPage(<Auth initialMode="signup" lab={{ code: { code: "QH-7K2M-9XTD", status: { status: "expired", email: "maya@example.com", foundingNo: 12 } } }} />, "/"));
    expect(t).toContain("That link has run out.");
    expect(t).toContain("Invite links last 48 hours. Your place, No. 12, is still held for maya@example.com.");
    expect(t).toContain("Send me a fresh link");
    expect(t).toContain("I already have an account");
  });
});

describe("an existing account signs in with the gate armed", () => {
  it("sign-in draws no code field and its handler never consults the gate", () => {
    const html = renderPage(<Auth initialMode="login" />, "/");
    expect(html).not.toContain('id="au-code"');
    const src = readFileSync(resolve(here, "../Auth.tsx"), "utf8");
    const onSignin = src.slice(src.indexOf("const onSignin"), src.indexOf("const onLinkInstead"));
    expect(onSignin.length).toBeGreaterThan(100);
    expect(onSignin).not.toMatch(/gateOn|status|code/i);
    expect(onSignin).toContain("await login(em, password)");
  });
});
