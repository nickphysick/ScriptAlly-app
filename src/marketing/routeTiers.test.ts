/**
 * Locks for the route-tier model (design ref: design-refs/chrome-overview-v1.html): which
 * shell wraps which path, the auth-aware marketing nav states, and the focus breadcrumb.
 * The guard behaviour itself lives in App.tsx ordering — these tests pin the resolution
 * table App.tsx branches on (repo convention: pure node tests, no DOM).
 */

import { describe, it, expect } from "vitest";
import { tierForPath, focusCrumb, MARKETING_PATHS, FOCUS_PATHS, WORKSPACE_PATHS } from "./routeTiers";
import { marketingNavState } from "./marketingNav";

describe("tierForPath", () => {
  it("puts the landing and public pricing in the marketing tier", () => {
    expect(tierForPath("/")).toBe("marketing");
    expect(tierForPath("/pricing")).toBe("marketing");
  });

  it("puts account, plans and help in the focus tier", () => {
    expect(tierForPath("/account")).toBe("focus");
    expect(tierForPath("/plans")).toBe("focus");
    expect(tierForPath("/help")).toBe("focus");
  });

  it("keeps every workspace route in the workspace tier", () => {
    for (const p of [
      "/dashboard", "/queries", "/agents", "/agents/discover",
      "/manuscripts", "/manuscripts/packages", "/import", "/email-import-dev",
    ]) {
      expect(tierForPath(p)).toBe("workspace");
    }
  });

  it("returns null for unknown paths (App redirects those to /dashboard)", () => {
    expect(tierForPath("/nope")).toBeNull();
    expect(tierForPath("/queries/deep")).toBeNull();
  });

  it("assigns every path to exactly one tier (no overlaps between the sets)", () => {
    const all = [...MARKETING_PATHS, ...FOCUS_PATHS, ...WORKSPACE_PATHS];
    expect(new Set(all).size).toBe(all.length);
  });

  it("moved the old secondary routes out of the workspace set", () => {
    for (const p of ["/pricing", "/plans", "/help", "/account"]) {
      expect(WORKSPACE_PATHS.has(p)).toBe(false);
    }
  });
});

describe("marketingNavState", () => {
  it("logged out: Log in ghost + the free-start button", () => {
    const s = marketingNavState(null);
    expect(s.mode).toBe("anon");
    expect(s.showLogIn).toBe(true);
    expect(s.primaryLabel).toBe("Start tracking — it's free");
    expect(s.avatarInitial).toBeNull();
  });

  it("logged in: Open dashboard + avatar chip, no Log in", () => {
    const s = marketingNavState({ name: "Nick", email: "n@example.com" });
    expect(s.mode).toBe("authed");
    expect(s.showLogIn).toBe(false);
    expect(s.primaryLabel).toBe("Open dashboard");
    expect(s.avatarInitial).toBe("N");
  });

  it("falls back to the email initial, then W", () => {
    expect(marketingNavState({ email: "writer@example.com" }).avatarInitial).toBe("W");
    expect(marketingNavState({ name: "  " }).avatarInitial).toBe("W");
  });
});

describe("focusCrumb", () => {
  it("renders the mono breadcrumb per the chrome ref", () => {
    expect(focusCrumb("/account")).toBe("/ ACCOUNT");
    expect(focusCrumb("/plans")).toBe("/ PLANS");
    expect(focusCrumb("/help")).toBe("/ HELP");
  });
});
