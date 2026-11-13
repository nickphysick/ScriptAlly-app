/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * STALE-1 (2 Nov, the live landing drawn half-blank): a tab opened before a deploy asks for the
 * previous build's hashed chunk after it. Two halves stop that leaving a half-drawn page:
 *   - the hosting catch-all no longer answers for /assets/…, so a missing chunk is a real 404 and
 *     never the index page served as a script with status 200;
 *   - the entry reloads the page once when a chunk fails to load (lib/chunkReload).
 * The hosting half is also checked on the hosting emulator; this is the unit half.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { SPA_REWRITE_REGEX } from "../../scripts/landingRedirect.mjs";
import { reloadOnceForStaleChunk, CHUNK_RELOAD_KEY, CHUNK_RELOAD_WINDOW_MS } from "./chunkReload";

const json = (f: string) => JSON.parse(readFileSync(join(process.cwd(), f), "utf8"));

describe("STALE-1 · a missing chunk is a 404, never the index page", () => {
  for (const f of ["firebase.json", "firebase.dev.json"]) {
    it(`${f}: the last rewrite is the SPA regex, not a bare **`, () => {
      const rw = json(f).hosting.rewrites;
      const last = rw[rw.length - 1];
      expect(last).toEqual({ regex: SPA_REWRITE_REGEX, destination: "/index.html" });
      expect(rw.some((r: { source?: string }) => r.source === "**")).toBe(false);
    });
  }
  it("is RE2-safe (no lookaround or backreference)", () => {
    expect(SPA_REWRITE_REGEX).not.toMatch(/\(\?[=!<]|\\[1-9]/);
  });
  const re = new RegExp(SPA_REWRITE_REGEX);
  it("still sends every page to the app", () => {
    for (const p of ["/", "/welcome", "/privacy", "/dashboard", "/queries/analytics", "/a", "/as", "/ass",
      "/asse", "/asset", "/assets", "/assetsx", "/assetsx/y", "/agents", "/about", "/x/assets/y"]) {
      expect(re.test(p), p).toBe(true);
    }
  });
  it("never answers for a file under /assets/", () => {
    for (const p of ["/assets/", "/assets/PublicRoot-OLDHASH.js", "/assets/x/y.css"]) {
      expect(re.test(p), p).toBe(false);
    }
  });
});

describe("STALE-1 · the page reloads once when a chunk fails", () => {
  const store = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };
  it("reloads the first time and records when", () => {
    const s = store(); let reloads = 0;
    expect(reloadOnceForStaleChunk({ storage: s, now: () => 1000, reload: () => reloads++ })).toBe(true);
    expect(reloads).toBe(1);
    expect(s.m.get(CHUNK_RELOAD_KEY)).toBe("1000");
  });
  it("does not reload again inside the window, so a broken deploy cannot loop", () => {
    const s = store(); let reloads = 0;
    const deps = (t: number) => ({ storage: s, now: () => t, reload: () => reloads++ });
    reloadOnceForStaleChunk(deps(1000));
    expect(reloadOnceForStaleChunk(deps(1000 + CHUNK_RELOAD_WINDOW_MS - 1))).toBe(false);
    expect(reloads).toBe(1);
    expect(reloadOnceForStaleChunk(deps(1000 + CHUNK_RELOAD_WINDOW_MS + 1))).toBe(true);
    expect(reloads).toBe(2);
  });
  it("does nothing when storage is unavailable, rather than risk a loop", () => {
    let reloads = 0;
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(reloadOnceForStaleChunk({ storage: broken, now: () => 1, reload: () => reloads++ })).toBe(false);
    expect(reloads).toBe(0);
  });
  it("main.tsx wires both the chunk import and Vite's preload error to it", () => {
    const src = readFileSync(join(process.cwd(), "src/main.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).toMatch(/addEventListener\(\s*['"]vite:preloadError['"]/);
    expect(src).toMatch(/load\(\)[\s\S]*?\.catch\(/);
    expect(src).toContain("reloadOnceForStaleChunk");
  });
});

describe("BLUR-1 · no backdrop-filter on the public pages", () => {
  // Chrome's Graphite renderer (Mac) left the landing half-drawn below a backdrop-filter inside an
  // overflow:hidden band (2 Nov). The blur sat on flat navy and showed nothing; it stays out.
  for (const f of ["heroCard", "marketing", "privacy", "public", "waitlist", "welcome"]) {
    it(`${f}.css`, () => {
      const css = readFileSync(join(process.cwd(), `src/marketing/${f}.css`), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
      expect(css).not.toMatch(/backdrop-filter/);
    });
  }
});
