/**
 * Locks for the route-to-shell map. The rule that matters most is the FAILURE mode: loud in
 * development, forgiving in production.
 */
import { describe, it, expect } from "vitest";
import { TOPNAV_SHELL_PATHS, WORKSPACE_SHELL_PATHS, shellForRoute } from "./shellForRoute";
import { WORKSPACE_PATHS } from "../marketing/routeTiers";

describe("the map", () => {
  it("pages you WORK IN take the workspace shell", () => {
    for (const p of ["/queries", "/todo", "/agents", "/agents/discover", "/manuscripts",
      "/manuscripts/packages", "/manuscripts/comps", "/import"]) {
      expect(shellForRoute(p, true), p).toBe("workspace");
    }
  });

  it("pages you READ take the top-nav shell", () => {
    for (const p of ["/dashboard", "/account", "/plans", "/help"]) {
      expect(shellForRoute(p, true), p).toBe("topnav");
    }
  });

  it("no route is in both", () => {
    for (const p of WORKSPACE_SHELL_PATHS) expect(TOPNAV_SHELL_PATHS.has(p), p).toBe(false);
  });

  it("⚠️ EVERY signed-in route is mapped — the map and the router cannot drift", () => {
    // If a route exists and is not here, the app throws in dev the first time someone opens it.
    for (const p of WORKSPACE_PATHS) {
      expect(WORKSPACE_SHELL_PATHS.has(p) || TOPNAV_SHELL_PATHS.has(p), `${p} is in no shell`).toBe(true);
    }
  });

  it("⚠️ the map holds the routes we HAVE, not the product we want", () => {
    // Every one of these was in the pack's list; none is a route. Adding one here without
    // building it is the one way to reintroduce a dead link.
    const all = new Set([...WORKSPACE_SHELL_PATHS, ...TOPNAV_SHELL_PATHS]);
    for (const unbuilt of ["/archive", "/query-letters", "/synopses", "/opening-samples",
      "/guides", "/contact", "/task-settings"]) {
      expect(all.has(unbuilt), unbuilt).toBe(false);
    }
  });
});

describe("⚠️ an unmapped route fails LOUDLY in dev and FORGIVINGLY in production", () => {
  it("throws in development, naming the file and the fix", () => {
    expect(() => shellForRoute("/brand-new-page", true)).toThrow(/is in no shell/);
    expect(() => shellForRoute("/brand-new-page", true)).toThrow(/shellForRoute\.ts/);
  });

  it("falls back to the workspace shell in production — wrong chrome beats a white screen", () => {
    expect(shellForRoute("/brand-new-page", false)).toBe("workspace");
  });

  it("the throw is a THROW, not a console warning — a warning is a silent default with extra steps", () => {
    let threw = false;
    try { shellForRoute("/nope", true); } catch { threw = true; }
    expect(threw).toBe(true);
  });
});
