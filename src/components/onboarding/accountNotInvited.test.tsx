/**
 * App site v1, Phase 1 — a refused account. The server's invite check (`inviteGate`, functions/) refuses any email
 * no unused founder's code names, by email, by Google and by sign-in link. The writer sees one plain message, in the
 * screen's own error style, that sends them to the waitlist on the landing site.
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
import { NOT_INVITED_MARK, NOT_INVITED_COPY, NOT_INVITED_LINK, NotInvitedError, isNotInvited, waitlistHref } from "../../lib/notInvited";

const here = dirname(fileURLToPath(import.meta.url));
const src = (p: string) => readFileSync(resolve(here, p), "utf8");
const text = (h: string) => h.replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/&#x27;/g, "'");

describe("recognising the server's refusal", () => {
  it("finds the marker in the Auth SDK's blocking-function error, whatever code it rides on", () => {
    const sdk = { code: "auth/internal-error", message: `Firebase: HTTP Cloud Function returned an error: {"error":{"code":403,"message":"${NOT_INVITED_MARK}","status":"PERMISSION_DENIED"}} (auth/internal-error).` };
    expect(isNotInvited(sdk)).toBe(true);
    expect(isNotInvited(new NotInvitedError())).toBe(true);
    expect(isNotInvited({ code: "auth/internal-error", message: "Firebase: something else" })).toBe(false);
    expect(isNotInvited(null)).toBe(false);
  });
  it("the marker is the server's, byte for byte", () => {
    expect(src("../../../functions/src/inviteGateCore.ts")).toContain(`export const NOT_INVITED = "${NOT_INVITED_MARK}";`);
  });
  it("the waitlist link is the landing site's address from the build, or this site's home without one", () => {
    expect(waitlistHref("https://queryhawk.net")).toBe("https://queryhawk.net/");
    expect(waitlistHref("https://queryhawk.net/")).toBe("https://queryhawk.net/");
    expect(waitlistHref(undefined)).toBe("/");
    expect(waitlistHref("not a url")).toBe("/");
  });
});

describe("every door that can make an account turns the refusal into the message", () => {
  it("email and password (db.tsx signup), Google and a sign-in link (authActions.ts)", () => {
    expect(src("../../lib/db.tsx")).toMatch(/if \(isNotInvited\(error\)\) throw new NotInvitedError\(\);\s*throw new Error\(friendlyAuthError\(error\?\.code\)\);/);
    const a = src("../../lib/authActions.ts");
    expect(a.match(/if \(isNotInvited\(err\)\) throw new NotInvitedError\(\);/g)?.length).toBe(2);
  });
  it("the screen keeps the refusal apart from the ordinary banner, and clears it when the screen changes", () => {
    const s = src("../Auth.tsx");
    expect(s.match(/if \(isNotInvited\(err\)\) \{ setNotInvited\(true\);/g)?.length).toBe(4);
    expect(s).toMatch(/const go = \(s: Screen, focusId\?: string\) => \{\s*setScreen\(s\); setErrs\(\{\}\); setBanner\(null\); setNotInvited\(false\);/);
  });
});

describe("what the refused writer sees", () => {
  const msg = (html: string) => html.match(/<p[^>]*data-auth="not-invited"[^>]*>[\s\S]*?<\/p>/)?.[0] ?? "";

  it("on the create-account form: the plain message, in the error style, with a link to the waitlist", () => {
    const html = renderPage(<Auth initialMode="signup" lab={{ notInvited: true }} />, "/");
    const p = msg(html);
    expect(p).toContain('class="sf-msg sf-msg--error"');
    expect(p).toContain('role="alert"');
    expect(text(p)).toContain(NOT_INVITED_COPY);
    expect(p).toMatch(new RegExp(`<a class="sf-link sf-link--in" href="[^"]+">${NOT_INVITED_LINK}</a>`));
  });
  it("on the sign-in tab, where Google can make an account too", () => {
    const html = renderPage(<Auth initialMode="login" lab={{ notInvited: true }} />, "/");
    expect(text(msg(html))).toContain(NOT_INVITED_COPY);
  });
  it("nobody sees it before a refusal", () => {
    expect(renderPage(<Auth initialMode="signup" />, "/")).not.toContain('data-auth="not-invited"');
    expect(renderPage(<Auth initialMode="login" />, "/")).not.toContain('data-auth="not-invited"');
  });
});

describe("Use a different one: the other address is told to the server before the account is made", () => {
  it("onCreate records the other address with the code, then signs up", () => {
    const s = src("../Auth.tsx");
    expect(s).toMatch(/if \(otherEmail && status\?\.status === "ok"\) await callFoundersCode\("allow", code, em\)/);
    expect(s.indexOf('callFoundersCode("allow", code, em)')).toBeLessThan(s.indexOf("await signup(name.trim(), em, password)"));
  });
});
