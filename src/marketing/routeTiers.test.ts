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
  it("puts the landing in the marketing tier", () => {
    expect(tierForPath("/")).toBe("marketing");
  });

  it("puts the public pricing page in the marketing tier", () => {
    expect(tierForPath("/pricing")).toBe("marketing");
  });

  /**
   * ⚠️ THE LEGAL PAGES ARE MARKETING-TIER ROUTES, AND THEY HAVE TO BE ROUTES. Both hosting configs
   * rewrite `**` to `/index.html`, so a static file at these paths is served the SPA instead —
   * which is why the sign-up screen spent a long time linking to pages that could not exist.
   */
  it("puts the legal documents in the marketing tier, public to everyone", () => {
    expect(tierForPath("/terms")).toBe("marketing");
    expect(tierForPath("/privacy")).toBe("marketing");
  });

  /**
   * ⚠️ THE COMPANY PAGES ARE PUBLIC, AND THAT IS THE WHOLE POINT OF THEM. A privacy request has to
   * be makeable by someone who cannot sign in — including someone whose account is the thing they
   * are asking about. Putting Contact behind the auth gate would close the only door that has to
   * stay open.
   */
  it("puts the company pages in the marketing tier, public to everyone", () => {
    expect(tierForPath("/about")).toBe("marketing");
    expect(tierForPath("/contact")).toBe("marketing");
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
  /**
   * ⚠️ RETARGET: the anon CTA is the FOUNDING OFFER until launch, not `Start tracking — it's
   * free`. There is no self-serve product behind that label yet, so a chrome button offering one
   * is a door to a room that is not built; `Log in` continues to serve existing accounts and the
   * founding list is the funnel. The law is unchanged — logged out means one ghost link and one
   * primary — and the destination is asserted alongside the label, because a CTA whose wording
   * changed without its target changing is the half-done version of this.
   */
  it("logged out: Log in ghost + the founding CTA", () => {
    const s = marketingNavState(null);
    expect(s.mode).toBe("anon");
    expect(s.showLogIn).toBe(true);
    expect(s.primaryLabel).toBe("Become a Founding Writer");
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
