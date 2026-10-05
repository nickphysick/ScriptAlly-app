/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The agent card's sheet and mounts (Agent card v1). What a stylesheet can be asked honestly: that
 * every token it READS resolves where the card lives, that the tones are decision 2's values, and
 * that nothing sizes it from the viewport. Everything about where things end up on screen is the
 * rendered suite's (tests/e2e/agentCardV1.measure.ts), never this file's.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const SRC = resolve(__dirname, "../../..");
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const sheet = strip(readFileSync(resolve(__dirname, "agentCard.css"), "utf8"));
const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(resolve(dir, d.name)) : d.name.endsWith(".css") ? [resolve(dir, d.name)] : []);

/** Every custom property declared in a `:root` block or Tailwind's `@theme` (which builds to `:root`). */
function rootTokens(): Set<string> {
  const out = new Set<string>();
  for (const f of walk(SRC)) {
    const css = strip(readFileSync(f, "utf8"));
    for (const m of css.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const sel = m[1].trim();
      if (!/(^|,)\s*:root\s*(,|$)/.test(sel) && !/@theme\s*$/.test(sel)) continue;
      for (const d of m[2].matchAll(/(--[\w-]+)\s*:/g)) out.add(d[1]);
    }
  }
  return out;
}

describe("the card's sheet", () => {
  it("⚠️ every token it reads is declared at :root — the card portals to <body>, outside every page class", () => {
    const declared = rootTokens();
    const read = [...new Set([...sheet.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]))];
    expect(read.length, "the sweep found the sheet's reads").toBeGreaterThan(15);
    const missing = read.filter((t) => !declared.has(t));
    expect(missing, `read but never declared at :root: ${missing.join(", ")}`).toEqual([]);
  });

  it("the five tones are decision 2's, and only the query section reads them", () => {
    const tone = (k: string) => (sheet.match(new RegExp(`--ac-tone-${k}:\\s*(#[0-9a-f]{6})`, "i")) ?? [])[1];
    expect([tone("you"), tone("agent"), tone("offer"), tone("closed")]).toEqual(["#f5e6df", "#f7efe3", "#d7e0e8", "#e4e1db"]);
    /* "not queried" is white with a hairline — a tone with no fill of its own */
    expect(sheet).toMatch(/\.acq-q\[data-tone="none"\]\s*\{[^}]*background:\s*#fff;[^}]*box-shadow:\s*inset 0 0 0 1px/);
    const readers = [...sheet.matchAll(/([^{}]+)\{[^{}]*var\(--ac-tone-/g)].map((m) => m[1].trim());
    expect(readers.length).toBeGreaterThan(0);
    for (const sel of readers) expect(sel, "a tone painted outside the query section").toMatch(/\.acq-(q|dot)/);
  });

  it("the band is slate on every agent — one rule, the Contact list's own token", () => {
    expect(sheet).toMatch(/\.ac \.ac-band\s*\{[^}]*background:\s*var\(--clv-slate\)/);
    /* no variant repaints it — the old pop-up's rose and taupe bands are not the card's */
    expect(sheet).not.toMatch(/\.ac-band[.\w-]*\.(rose|taupe|ink)\b/);
  });

  it("nothing is sized from the viewport: the card's height comes from the overlay it is centred in", () => {
    expect(sheet).not.toMatch(/100vh|100dvh/);
    expect(sheet).toMatch(/\.ac-ov \.ac\s*\{[^}]*max-height:\s*calc\(100% - 64px\)/);
    expect(sheet).toMatch(/\.ac-ov \.ac\s*\{[^}]*width:\s*min\(548px, calc\(100% - 48px\)\)/);
    expect(sheet).toMatch(/\.ac-ov \.ac\.big\s*\{[^}]*width:\s*min\(780px, calc\(100% - 48px\)\)/);
  });

  it("the overlay sits between the page's menus (60) and the query drawer (70)", () => {
    const z = Number((sheet.match(/\.ac-ov\s*\{[^}]*z-index:\s*(\d+)/) ?? [])[1]);
    expect(z).toBeGreaterThan(60);
    expect(z).toBeLessThan(70);
  });
});

describe("the one host", () => {
  const read = (rel: string) => readFileSync(resolve(SRC, rel), "utf8");
  it("is mounted by App and by the lab (which returns before App's hosts mount)", () => {
    expect(read("App.tsx")).toMatch(/<AgentCardHost\s*\/>/);
    expect(read("components/agents/ContactListLab.tsx")).toMatch(/<AgentCardHost sandbox=\{cardSandbox\}\s*\/>/);
  });
  it("the quick view's own writes never go through updateAgent — its Undo would append an activity", () => {
    const host = strip(read("components/agents/card/AgentCardHost.tsx"));
    const quick = strip(read("components/agents/card/AgentQuickView.tsx"));
    expect(quick).not.toMatch(/updateAgent/);
    expect(host).not.toMatch(/\bupdateAgent\(/);
    expect(host).toMatch(/commitAgentEdits\(db, currentUser\.id, id, patch\)/);
  });
});
