/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Landing-only live: queryhawk.net shows the public site and the waitlist, and never the app.
 *
 * Each case flips the flag with `vi.stubEnv` and RE-IMPORTS the modules, so every module evaluates
 * `import.meta.env.VITE_LANDING_ONLY` the way a production build does. A test that passed the flag in
 * as an argument would prove the argument, not the build.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import React from "react";
import { readFileSync } from "fs";
import { join } from "path";
import { renderPage, stripComments } from "../test/pageSmoke";

vi.mock("./db", async () => (await import("../test/pageSmoke")).dbMock());
vi.mock("./firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
vi.mock("../components/toast/ToastProvider", async () => (await import("../test/pageSmoke")).toastMock());

const ROOT = process.cwd();
const read = (f: string) => readFileSync(join(ROOT, f), "utf8");
const noop = () => {};

/** The sign-in screen and onboarding are drawn in SetupFrame (`sf-`); the workspace is `ws-app`. */
const AUTH_MARK = /class="sf-/;
const SHELL_MARK = /ws-app\b/;
const LANDING_MARK = /class="mk-scope/;

const withFlag = async (on: boolean) => {
  vi.resetModules();
  if (on) vi.stubEnv("VITE_LANDING_ONLY", "true");
  else vi.stubEnv("VITE_LANDING_ONLY", "");
  return {
    site: await import("../marketing/LandingOnlySite"),
    mode: await import("./siteMode"),
    nav: await import("../marketing/marketingNav"),
    shell: await import("../marketing/MarketingShell"),
  };
};

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });

describe("L1 · landing-only renders the public site, or sends you home, and never the app", () => {
  const HOME = [
    ["/dashboard", ""], ["/agents", ""], ["/account", ""], ["/nonsense", ""],
    ["/", "#/signup"], ["/", "#/login"], ["/", "#/signin"], ["/pricing", "#/login"],
  ] as const;

  it("the decision: every workspace or unknown path and every sign-in hash goes home", async () => {
    const { site } = await withFlag(true);
    for (const [path, hash] of HOME) expect(site.landingDecision(path, hash), `${path}${hash}`).toBe("home");
    for (const path of ["/", "/founders", "/pricing", "/about", "/contact", "/terms", "/privacy"])
      expect(site.landingDecision(path, ""), path).toBe("page");
  });

  it("rendered: none of them draws the sign-in screen or the workspace", async () => {
    const { site, mode } = await withFlag(true);
    expect(mode.LANDING_ONLY).toBe(true);
    for (const [path, hash] of HOME) {
      const html = renderPage(<site.LandingOnlySite path={path} hash={hash} onNavigate={noop} />, path);
      expect(html, `${path}${hash}`).not.toMatch(AUTH_MARK);
      expect(html, `${path}${hash}`).not.toMatch(SHELL_MARK);
      /* Away from `/` it is a redirect (renders nothing); on `/` it is the landing itself. */
      if (path === "/") expect(html, `${path}${hash}`).toMatch(LANDING_MARK);
      else expect(html, `${path}${hash}`).toBe("");
    }
  });

  it("App takes the landing-only branch before the boot splash and before any sign-in screen", () => {
    const app = stripComments(read("src/App.tsx"));
    const branch = app.indexOf("if (LANDING_ONLY) {");
    expect(branch, "the branch exists").toBeGreaterThan(-1);
    expect(branch).toBeLessThan(app.indexOf("if (!authReady)"));
    expect(branch).toBeLessThan(app.indexOf("<Auth "));
    expect(app.slice(branch, branch + 200)).toContain("return <LandingOnlySite");
  });
});

describe("L2 · landing-only offers no way into the app", () => {
  it("nav, mobile menu and footer carry no Log in, Open dashboard or Open QueryHawk, signed in or not", async () => {
    const { shell } = await withFlag(true);
    for (const user of [null, { name: "Nick", email: "nick@queryhawk.net" }]) {
      const html = renderPage(
        <shell.MarketingShell user={user} onNavigate={noop} path="/"><p>page</p></shell.MarketingShell>, "/");
      expect(html, "the shell rendered").toMatch(LANDING_MARK);
      expect(html).toContain("Become a Founding Writer");
      for (const door of ["Log in", "Open dashboard", "Open QueryHawk"]) expect(html, door).not.toContain(door);
    }
  });
});

describe("L3 · with the flag off, the whole app is exactly as before (dev)", () => {
  it("the flag is off when the variable is unset", async () => {
    const { mode } = await withFlag(false);
    expect(mode.LANDING_ONLY).toBe(false);
  });

  it("the nav offers Log in and the footer Open QueryHawk again", async () => {
    const { shell, nav } = await withFlag(false);
    expect(nav.marketingNavState(null).showLogIn).toBe(true);
    const html = renderPage(<shell.MarketingShell user={null} onNavigate={noop} path="/"><p>page</p></shell.MarketingShell>, "/");
    expect(html).toContain("Log in");
    expect(html).toContain("Open QueryHawk");
  });

  it("a signed-out /dashboard still reaches <Auth/> through App's untouched front door", () => {
    const app = stripComments(read("src/App.tsx"));
    expect(app).toMatch(/if \(!currentUser\) \{\s*if \(hash === "#\/login" \|\| hash === "#\/signin"\) return <Auth initialMode="login" \/>;\s*return <Auth initialMode="signup" \/>;/);
  });
});

describe("L4 · only the production build is landing-only", () => {
  const flag = (f: string) => read(f).match(/^\s*VITE_LANDING_ONLY\s*=\s*(\S*)\s*$/m)?.[1];
  it(".env.production sets it, and .env.development does not set it to true", () => {
    expect(flag(".env.production")).toBe("true");
    expect(flag(".env.development")).not.toBe("true");
  });
});
