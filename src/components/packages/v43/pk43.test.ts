/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v43 — the source locks (the rendered ones are tests/e2e/pk43.measure.ts).
 *   P6 (source half)  the pinned Archivist is gone: Pk41Hawk.tsx no longer resolves, nothing imports it, no stylesheet
 *                     draws `.p41-perch`; v41's header (Pk41Header) is gone with it
 */
import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const SRC = resolve(__dirname, "../../..");
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const files = walk(SRC);
const page = readFileSync(resolve(SRC, "components/SubmissionPackages.tsx"), "utf8");

describe("PK43 P6 — the Archivist stands in the header; nothing is pinned", () => {
  it("finds the population it reads", () => {
    expect(files.filter((f) => f.endsWith(".css")).length).toBeGreaterThan(100);
    expect(page).toContain("Pk43Header");
  });
  it("Pk41Hawk no longer resolves, and nothing imports it", async () => {
    expect(existsSync(resolve(SRC, "components/packages/v41/Pk41Hawk.tsx"))).toBe(false);
    await expect(import("../v41/Pk41Hawk" as string)).rejects.toThrow();
    const importers = files.filter((f) => !f.endsWith("pk43.test.ts") && /\.(tsx?|mjs)$/.test(f) && /Pk41Hawk/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")));
    expect(importers).toEqual([]);
  });
  it("no stylesheet draws the pinned hawk", () => {
    const perch = files.filter((f) => f.endsWith(".css") && /\.p41-perch\b/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")));
    expect(perch).toEqual([]);
  });
  it("v41's header is gone with it: the page renders the shared OpenHeader through Pk43Header", () => {
    expect(existsSync(resolve(SRC, "components/packages/v41/Pk41Header.tsx"))).toBe(false);
    const hd = readFileSync(resolve(SRC, "components/packages/v43/Pk43Header.tsx"), "utf8");
    expect(hd).toMatch(/import \{ OpenHeader \} from "\.\.\/\.\.\/shell\/OpenHeader"/);
    expect(hd).toContain('className="qc151 qc153 pk43-hdw"');
    expect(hd).toMatch(/src=\{HAWK_STANDING\}/);
    expect(readFileSync(resolve(SRC, "lib/packagesV43.ts"), "utf8")).toContain('HAWK_STANDING = "/images/packages/packages-hawk-standing.png"');
  });
});

/* ── P7 / P9 (source halves) ── */
const css = (f: string) => readFileSync(resolve(SRC, f), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const decl = (sheet: string, sel: string) => {
  const m = new RegExp(`(?:^|\\n)\\s*${sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`).exec(sheet);
  return m ? m[1].split(";").map((d) => d.trim()).filter(Boolean) : null;
};

describe("PK43 P7 (source) — the list is Query letters' rows, reused; the stat tiles are gone", () => {
  const ql = css("components/letters/queryLetters.css");
  const pk = css("components/packages/v43/pk43.css");
  it("the stat tiles' component and rules are deleted", () => {
    expect(existsSync(resolve(SRC, "components/packages/v42/Pk42Tiles.tsx"))).toBe(false);
    expect(css("components/packages/v42/pk42.css")).not.toMatch(/\.p42-tile|\.p42-tiles|\.p42-cb|\.p42-bw/);
    expect(page).not.toContain("Pk42Tiles");
    expect(page).toContain('import "./letters/queryLetters.css"');
  });
  it("the --ql-* tokens this page states equal the letters page's", () => {
    const toks = (s: string, root: string) => Object.fromEntries([...(decl(s, root) ?? []).join(";").matchAll(/(--ql-[\w-]+)\s*:\s*([^;]+)/g)].map((m) => [m[1], m[2].trim()]));
    const a = toks(ql, ".qlp"), b = toks(pk, ".pk43");
    expect(Object.keys(b).length).toBe(9);
    expect(b).toEqual(Object.fromEntries(Object.keys(b).map((k) => [k, a[k]])));
  });
  it("the three root-scoped row rules are restated with the letters page's values", () => {
    for (const [q, p] of [[".qlp .qlp-row-n", ".pk43 .qlp-row-n"], [".qlp .qlp-row-f b", ".pk43 .qlp-row-f b"]] as const) {
      expect(decl(ql, q), q).not.toBeNull();
      expect(decl(pk, p), p).toEqual(decl(ql, q));
    }
    const h = decl(pk, ".pk43 h2.qlp-h2")!, hq = decl(ql, ".qlp h2.qlp-h2")!;
    /* the letters page's own reset supplies margin 0 above; this page states it in the rule */
    expect(h.filter((d) => !d.startsWith("margin"))).toEqual(hq.filter((d) => !d.startsWith("margin")));
  });
});

describe("PK43 P9 (source) — no green in the builder on this page", () => {
  it("the step disc, the open step and the status dot are navy here", () => {
    const s = css("components/packages/v41/pk41.css");
    expect(s).toMatch(/\.p41 \.p41-bld \.p93-done \.p93-sn \{ background: #2d3a50; color: #f4eee5; \}/);
    for (const g of ["#3e7d5a", "#4e6b58", "#f3f6f2", "#7fc89a"]) expect(s, g).not.toContain(g);
  });
});
