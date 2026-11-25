/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone style v1, Phase 1 — THE TOKENS (design-refs/phone-style-v1/phone-style-v1.html, the `<pre id="tok">` block).
 * Source locks, read off the files:
 *   - every `--ps-*` token the sheet lists is declared in phoneTokens.css with the sheet's own value (read from the ref,
 *     so a drift on either side is red);
 *   - `--pa-page` reads the desktop's page colour (`--ws-page`, oat at :root), and that colour is the sheet's #f2eee8;
 *   - ruling 1b: `--pa-inset-legacy` keeps the old #f8f6f2 and is read by exactly the insets named in the
 *     ruling — a fourteenth reader is a new use of a holding value, which the ruling forbids;
 *   - ruling 1a: the two fades that started from a hard-coded old page colour now start from the page's own channels.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const read = (p: string) => readFileSync(p, "utf8");
const TOKENS = read("src/components/phone/phoneTokens.css");
const REF = read("design-refs/phone-style-v1/phone-style-v1.html");
const norm = (v: string) => v.replace(/\s+/g, " ").replace(/\s*,\s*/g, ",").trim();

/** the sheet's block: `--ps-x: value;` pairs (several may share a line) */
function sheetTokens(): Map<string, string> {
  const m = REF.match(/<pre id="tok">([\s\S]*?)<\/pre>/);
  if (!m) throw new Error("the ref has no token block");
  const body = m[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const out = new Map<string, string>();
  for (const d of body.matchAll(/(--ps-[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(d[1], norm(d[2]));
  return out;
}
/** the phone root block's declarations */
function declared(): Map<string, string> {
  const body = TOKENS.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = new Map<string, string>();
  for (const d of body.matchAll(/(--p[as]-[a-z0-9-]+)\s*:\s*([^;]+);/g)) out.set(d[1], norm(d[2]));
  return out;
}

const LEGACY_READERS = [
  "src/components/queryActions/phoneFlow.css .pf-av.pf-empty",
  "src/components/queryActions/phoneFlow.css .pf-lctray",
  "src/components/agents/phone/agentsPhone.css .pa-addrow",
  "src/components/agents/phone/agentsPhone.css .pa-anote",
  "src/components/agents/phone/agentsPhone.css .pa-aq",
  "src/components/agents/phone/agentsPhone.css .pa-dwish",
  "src/components/phone/v5/phoneV5.css .pa5-gc-where",
  "src/components/phone/phoneShell.css .pa-mtile .pa-mi",
  "src/components/phone/pages/settingsPhone.css .pa-set .sc-cf",
  "src/components/phone/pages/pagesPhone.css .pa-pg .pa-annote",
  "src/components/phone/v3/phoneV3.css .pa3 .pa3-row:active",
  "src/components/phone/v3/phoneV3.css .pa3 .pa3-opt.on",
];

function cssFiles(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...cssFiles(p));
    else if (p.endsWith(".css")) out.push(p);
  }
  return out;
}

describe("Phone style v1 — the tokens", () => {
  it("the sheet lists its tokens (population)", () => {
    expect(sheetTokens().size).toBe(38);
  });

  it("every --ps-* token is declared on the phone roots with the sheet's value", () => {
    const have = declared();
    const bad = [...sheetTokens()].filter(([k, v]) => have.get(k) !== v).map(([k, v]) => `${k}: sheet "${v}" · built "${have.get(k) ?? "missing"}"`);
    expect(bad).toEqual([]);
  });

  it("the tokens sit on both phone roots, below 768px", () => {
    expect(TOKENS).toMatch(/@media \(max-width: 767\.98px\) \{\s*\.sa-shellframe,\s*\.pa-layer \{/);
  });

  it("--pa-page is the desktop's page colour, and that colour is the sheet's oat", () => {
    expect(declared().get("--pa-page")).toBe("var(--ws-page,#f2eee8)");
    const idx = read("src/index.css");
    expect(idx).toMatch(/--ws-page-rgb: 242, 238, 232;\s*--ws-page: rgb\(var\(--ws-page-rgb\)\);/);
    const hex = sheetTokens().get("--ps-page")!;
    expect([1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ")).toBe("242, 238, 232");
  });

  it("ruling 1b: --pa-inset-legacy holds #f8f6f2 and is read by exactly the named insets (thirteen; twelve since Phone Birds-eye world v1 retired BirdsViewV5)", () => {
    expect(declared().get("--pa-inset-legacy")).toBe("#f8f6f2");
    const found: string[] = [];
    for (const f of cssFiles("src")) {
      const src = read(f).replace(/\/\*[\s\S]*?\*\//g, "");
      for (const r of src.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
        if (!r[2].includes("var(--pa-inset-legacy)")) continue;
        for (const sel of r[1].split(",")) found.push(`${f} ${sel.trim()}`);
      }
    }
    expect(found.sort()).toEqual([...LEGACY_READERS].sort());
  });

  it("ruling 1a: the two fades start from the page's own channels, and no old page colour is left", () => {
    expect(read("src/components/todo/phone/todoPhoneV1.css")).toContain("linear-gradient(rgba(var(--ws-page-rgb), 0), var(--pa-page) 22%)");
    expect(read("src/components/phone/phoneShell.css")).toContain("linear-gradient(rgba(var(--ws-page-rgb), 0), rgba(var(--ws-page-rgb), 0.9) 55%, var(--pa-page))");
    const left = cssFiles("src/components").filter((f) => /phone/i.test(f) && /248,\s*246,\s*242/.test(read(f)));
    expect(left).toEqual([]);
  });
});
