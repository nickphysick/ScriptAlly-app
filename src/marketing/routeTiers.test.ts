/**
 * Locks for the route-tier model: which shell wraps which path + the auth-aware marketing nav
 * states. The focus tier is RETIRED (capsule fixes P5) — every signed-in route is workspace,
 * rendered in the one capsule shell. The guard behaviour itself lives in App.tsx ordering —
 * these tests pin the resolution table App.tsx branches on (pure node tests, no DOM).
 */

import { describe, it, expect } from "vitest";
import { tierForPath, MARKETING_PATHS, WORKSPACE_PATHS } from "./routeTiers";
import { marketingNavState } from "./marketingNav";

describe("tierForPath", () => {
  it("puts the landing and public pricing in the marketing tier", () => {
    expect(tierForPath("/")).toBe("marketing");
    expect(tierForPath("/pricing")).toBe("marketing");
  });

  it("the focus tier is retired — account, plans and help are workspace routes (capsule fixes P5)", () => {
    expect(tierForPath("/account")).toBe("workspace");
    expect(tierForPath("/plans")).toBe("workspace");
    expect(tierForPath("/help")).toBe("workspace");
  });

  it("keeps every workspace route in the workspace tier", () => {
    for (const p of [
      "/dashboard", "/queries", "/todo", "/agents", "/agents/discover",
      "/manuscripts", "/manuscripts/comps", "/manuscripts/packages", "/import",
    ]) {
      expect(tierForPath(p)).toBe("workspace");
    }
  });

  it("returns null for unknown paths (App redirects those to /dashboard)", () => {
    expect(tierForPath("/nope")).toBeNull();
    expect(tierForPath("/queries/deep")).toBeNull();
  });

  it("assigns every path to exactly one tier (no overlaps between the sets)", () => {
    const all = [...MARKETING_PATHS, ...WORKSPACE_PATHS];
    expect(new Set(all).size).toBe(all.length);
  });

  it("public pricing stays out of the workspace set", () => {
    expect(WORKSPACE_PATHS.has("/pricing")).toBe(false);
    expect(WORKSPACE_PATHS.has("/")).toBe(false);
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
