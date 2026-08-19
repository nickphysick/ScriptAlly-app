/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * accountRoutes — the settings sections as paths.
 *
 * ⚠️ THE REGISTRATION ASSERTIONS ARE THE POINT OF THIS FILE. A section path that is not in
 * `WORKSPACE_PATHS` does not 404 — it silently redirects to /dashboard, and the page looks like
 * it was never built. They are asserted against the DERIVED list, so adding a section to
 * ACCOUNT_ROUTES and forgetting a set fails here rather than in someone's browser.
 */
import { describe, it, expect } from "vitest";
import {
  ACCOUNT_ROUTES,
  ACCOUNT_ROOT,
  ACCOUNT_DEFAULT_PATH,
  ACCOUNT_SECTION_PATHS,
  accountSectionForPath,
  accountRedirectFor,
} from "./accountRoutes";
import { WORKSPACE_PATHS } from "../marketing/routeTiers";
import { WORKSPACE_SHELL_PATHS } from "./shellForRoute";
import { SHELL_SETUP_PATHS, shellCrumbForPath } from "../components/shell/shellV2Nav";

describe("accountRoutes — the table", () => {
  it("every path sits under /account/ and every id is unique", () => {
    for (const r of ACCOUNT_ROUTES) expect(r.path.startsWith(`${ACCOUNT_ROOT}/`)).toBe(true);
    expect(new Set(ACCOUNT_ROUTES.map((r) => r.id)).size).toBe(ACCOUNT_ROUTES.length);
    expect(new Set(ACCOUNT_ROUTES.map((r) => r.path)).size).toBe(ACCOUNT_ROUTES.length);
  });

  it("the default path is one of the sections", () => {
    expect(accountSectionForPath(ACCOUNT_DEFAULT_PATH)).toBe("profile");
  });

  it("ACCOUNT_SECTION_PATHS is derived from the table, and excludes the bare root", () => {
    expect(ACCOUNT_SECTION_PATHS).toEqual(ACCOUNT_ROUTES.map((r) => r.path));
    expect(ACCOUNT_SECTION_PATHS).not.toContain(ACCOUNT_ROOT);
  });
});

describe("accountSectionForPath", () => {
  it("resolves each section exactly", () => {
    for (const r of ACCOUNT_ROUTES) expect(accountSectionForPath(r.path)).toBe(r.id);
  });

  it("does not resolve the bare root, a trailing slash, or a stranger", () => {
    expect(accountSectionForPath(ACCOUNT_ROOT)).toBeNull();
    expect(accountSectionForPath("/account/profile/")).toBeNull();
    expect(accountSectionForPath("/account/nonsense")).toBeNull();
    expect(accountSectionForPath("/dashboard")).toBeNull();
  });
});

describe("accountRedirectFor", () => {
  it("sends the bare root and any unknown sub-path to Profile", () => {
    expect(accountRedirectFor(ACCOUNT_ROOT)).toBe(ACCOUNT_DEFAULT_PATH);
    expect(accountRedirectFor("/account/nonsense")).toBe(ACCOUNT_DEFAULT_PATH);
    expect(accountRedirectFor("/account/profile/extra")).toBe(ACCOUNT_DEFAULT_PATH);
  });

  it("leaves a real section alone", () => {
    for (const r of ACCOUNT_ROUTES) expect(accountRedirectFor(r.path)).toBeNull();
  });

  /* ⚠️ THE LOOSE-PREFIX CASE. `startsWith("/account")` matches all three of these, and a redirect
     here would capture routes this file has never heard of. */
  it("claims nothing that merely BEGINS with the eight characters of /account", () => {
    expect(accountRedirectFor("/accounts")).toBeNull();
    expect(accountRedirectFor("/account-recovery")).toBeNull();
    expect(accountRedirectFor("/accountancy/profile")).toBeNull();
  });

  it("ignores paths outside settings entirely", () => {
    expect(accountRedirectFor("/dashboard")).toBeNull();
    expect(accountRedirectFor("/plans")).toBeNull();
  });
});

/* ⚠️ THE FOUR REGISTRATIONS. Each of these sets answers a different question about a path, and
   each fails SILENTLY and differently when a path is missing from it. */
describe("every section path is registered on all four surfaces", () => {
  it("is a workspace path — else the router sends it to /dashboard", () => {
    for (const p of ACCOUNT_SECTION_PATHS) expect(WORKSPACE_PATHS.has(p)).toBe(true);
  });

  it("is mapped to the workspace shell — else shellForRoute throws in dev", () => {
    for (const p of ACCOUNT_SECTION_PATHS) expect(WORKSPACE_SHELL_PATHS.has(p)).toBe(true);
  });

  it("is in the Setup family — else the rail's Setup rib stops lighting", () => {
    for (const p of ACCOUNT_SECTION_PATHS) expect(SHELL_SETUP_PATHS.has(p)).toBe(true);
  });

  it("has a breadcrumb — else the bar renders none", () => {
    for (const p of ACCOUNT_SECTION_PATHS) {
      const crumb = shellCrumbForPath(p);
      expect(crumb).not.toBeNull();
      expect(crumb?.section).toBe("Setup");
    }
  });

  /* The bare root keeps its own registration: it is redirected, not rendered, but it must survive
     long enough for the redirect to run. */
  it("the bare /account is still registered everywhere", () => {
    expect(WORKSPACE_PATHS.has(ACCOUNT_ROOT)).toBe(true);
    expect(WORKSPACE_SHELL_PATHS.has(ACCOUNT_ROOT)).toBe(true);
    expect(SHELL_SETUP_PATHS.has(ACCOUNT_ROOT)).toBe(true);
    expect(shellCrumbForPath(ACCOUNT_ROOT)).not.toBeNull();
  });
});
