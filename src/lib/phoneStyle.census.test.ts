/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone style v1, Phase 4c — THE RATCHET (design-refs/phone-style-v1/phone-style-v1.html). A forbid-lock over SOURCE:
 * it reads every phone stylesheet and counts, per file, the declarations that break the sheet. It does not prove
 * layout — PS1 (tests/e2e/phoneStyle.measure.ts) does that on the rendered page.
 *
 *   A phone stylesheet: `phone*.css` anywhere, any `.css` under a `phone/` folder, and any sheet with rules under the
 *   phone media query (`max-width: 767.98px` or lower) — of which only the rules inside that query are counted.
 *   A breach:
 *     font    a font-size (or a `font:` shorthand's size) in px or rem outside 56 / 28 / 20 / 16 / 14 / 12 (P8);
 *     hex     a hex colour outside the sheet's palette and the stage table (P1–P4);
 *     legacy  a reader of `--pa-inset-legacy`, the holding value (ruling 1b, 22 Nov), until it takes its sheet colour;
 *     radius  a border-radius outside 0 / 16 / 24 / fully round / the disc (P19);
 *     shadow  a box-shadow that is not `none` or one of the two tokens (P20).
 *   Values the scanner cannot judge (em, %, calc, var() other than the named tokens) are not counted.
 *
 * Counts may only go down. A file's count rising, or a phone stylesheet missing from the baseline with any breach, is red.
 * Lowering the baseline is part of any pack that fixes a screen: `PS_CENSUS_WRITE=1 npx vitest run <this file>`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { STAGE_COLOURS, STAGE_INK } from "./stageColours";

const BASELINE = "src/lib/phoneStyle.baseline.json";
const KINDS = ["font", "hex", "legacy", "radius", "shadow"] as const;
type Kind = (typeof KINDS)[number];
type Counts = Record<Kind, number>;

/* the sheet's palette (its colour table, the fill, the pressed button) and the stage table */
const PALETTE = new Set([
  "#f2eee8", "#ffffff", "#2a3a52", "#1f2633", "#4a4f5a", "#6b6f78", "#c9d2df", "#e8c8bc", "#7a3f31", "#efebe4", "#ece7de", "#222f44",
  ...Object.values(STAGE_COLOURS).flatMap((c) => Object.values(c)), STAGE_INK,
].map((h) => h.toLowerCase()));
const SIZES = new Set([56, 28, 20, 16, 14, 12]);

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".css")) out.push(p);
  }
  return out;
}
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const isPhoneFile = (f: string) => /(^|\/)phone[^/]*\.css$/i.test(f) || /\/phone\//i.test(f);
/** the bodies of the phone media queries (max-width under 768) */
function phoneBlocks(css: string): string {
  let out = "";
  for (const m of css.matchAll(/@media[^{]*max-width:\s*(\d+(?:\.\d+)?)px[^{]*\{/g)) {
    if (Number(m[1]) >= 768) continue;
    let depth = 1, i = m.index! + m[0].length; const start = i;
    while (i < css.length && depth > 0) { if (css[i] === "{") depth++; else if (css[i] === "}") depth--; i++; }
    out += css.slice(start, i - 1) + "\n";
  }
  return out;
}
const px = (v: string): number | null => { const m = /^(-?\d*\.?\d+)(px|rem)$/.exec(v.trim()); return m ? Number(m[1]) * (m[2] === "rem" ? 16 : 1) : null; };
const fontSizeOf = (shorthand: string): string | null => { const m = /(?:^|\s)(\d*\.?\d+(?:px|rem))(?:\s*\/|\s)/.exec(` ${shorthand} `); return m ? m[1] : null; };

export function breaches(css: string): Counts {
  const c: Counts = { font: 0, hex: 0, legacy: 0, radius: 0, shadow: 0 };
  for (const d of css.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)/gi)) {
    const prop = d[1].toLowerCase(), val = d[2].trim().replace(/\s*!important$/, "");
    if (prop === "font-size" || prop === "font") {
      const s = prop === "font" ? fontSizeOf(val) : val;
      const n = s ? px(s) : null;
      if (n != null && !SIZES.has(Math.round(n * 100) / 100)) c.font++;
    }
    for (const h of val.replace(/url\([^)]*\)/g, "").matchAll(/#([0-9a-f]{3}|[0-9a-f]{6})\b/gi)) {
      const x = h[1].length === 3 ? `#${[...h[1]].map((k) => k + k).join("")}` : `#${h[1]}`;
      if (!PALETTE.has(x.toLowerCase())) c.hex++;
    }
    if (val.includes("var(--pa-inset-legacy)")) c.legacy++;
    if (prop === "border-radius" || /^border-(top|bottom)-(left|right)-radius$/.test(prop)) {
      /* a token or any other var() cannot be judged here (PS1 measures it); the sheet's radius tokens are 16 and 24 */
      const ok = /var\(/.test(val) || val.split(/[\s/]+/).every((t) => { if (t === "0" || t === "50%" || t === "inherit") return true; const n = px(t); return n != null && (n === 0 || n === 16 || n === 24 || n >= 999); });
      if (!ok) c.radius++;
    }
    if (prop === "box-shadow" && !/^(none|var\(--ps-sh-(card|raised)\))$/.test(val)) c.shadow++;
  }
  return c;
}

function census(): Record<string, Counts> {
  const out: Record<string, Counts> = {};
  for (const f of walk("src").sort()) {
    const css = strip(readFileSync(f, "utf8"));
    const body = isPhoneFile(f) ? css : phoneBlocks(css);
    if (!body.trim()) continue;
    out[f] = breaches(body);
  }
  return out;
}

describe("Phone style v1 — the census of every phone stylesheet (counts only go down)", () => {
  const now = census();
  if (process.env.PS_CENSUS_WRITE) writeFileSync(BASELINE, JSON.stringify(now, null, 1) + "\n");
  const base = JSON.parse(readFileSync(BASELINE, "utf8")) as Record<string, Counts>;

  it("the census reads the phone stylesheets (population)", () => {
    expect(Object.keys(now).length).toBeGreaterThanOrEqual(40);
    expect(Object.keys(now)).toContain("src/components/phone/phoneStyle.css");
  });

  it("the sheet's own parts break nothing", () => {
    expect(now["src/components/phone/phoneStyle.css"]).toEqual({ font: 0, hex: 0, legacy: 0, radius: 0, shadow: 0 });
  });

  it("no phone stylesheet's count of any kind has risen", () => {
    const rose: string[] = [];
    for (const [f, c] of Object.entries(now)) {
      const b = base[f];
      for (const k of KINDS) {
        if (!b) { if (c[k] > 0) rose.push(`${f} (not in the baseline): ${k} ${c[k]}`); continue; }
        if (c[k] > b[k]) rose.push(`${f}: ${k} ${b[k]} → ${c[k]}`);
      }
    }
    expect(rose).toEqual([]);
  });

  it("the scanner counts each kind (a known line of each)", () => {
    expect(breaches(".a { font-size: 15px; }").font).toBe(1);
    expect(breaches(".a { font: 600 0.9375rem/1.2 x; }").font).toBe(1);
    expect(breaches(".a { font: var(--ps-name); font-size: 1rem; }").font).toBe(0);
    expect(breaches(".a { color: #123456; background: #fff; }").hex).toBe(1);
    expect(breaches(".a { background: var(--pa-inset-legacy); }").legacy).toBe(1);
    expect(breaches(".a { border-radius: 12px; } .b { border-radius: 24px 24px 0 0; } .c { border-radius: 50%; }").radius).toBe(1);
    expect(breaches(".a { box-shadow: 0 1px 2px #000; } .b { box-shadow: var(--ps-sh-card); }").shadow).toBe(1);
  });
});
