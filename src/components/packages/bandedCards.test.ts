/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BANDED CARDS — the construction (packages Part 1) ═════════════════════════════════════
 *
 * ⚠️ THESE ARE SOURCE CHECKS AND THEY PROVE THE CONSTRUCTION, NOT THE LAYOUT. "The band is flush"
 * is a claim about a rendered box and is measured in `tests/e2e/bandGeometry.measure.ts`. What can
 * honestly be locked here is the shape that makes flush possible — no padding on the frame, the
 * clip present, one rule per selector — and the one fault that started this: a selector declared
 * twice, whose dead half decided the layout.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(__dirname, "..", "..", "..");
const css = readFileSync(join(root, "src/components/packages/packagesBroadsheet.css"), "utf8");
/** ⚠️ Comments first — this sheet's prose quotes every value and class it retired. */
const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");

/** Every BASE rule for a selector (no pseudo, no descendant), in file order. */
const baseRules = (sel: string): string[] => {
  const out: string[] = [];
  const re = new RegExp(`(?:^|\\n)\\s*${sel.replace(".", "\\.")}\\s*\\{([^}]*)\\}`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(decls))) out.push(m[1]);
  return out;
};

// ─────────────────────────────────────────────────────────────────────────────
describe("⚠️ one rule per selector — the fault that decided the layout", () => {
  /**
   * `.pkgb-pkgcard` was declared TWICE. The later block wins per property, but it declared no
   * `padding`, so `18px 20px 13px` survived from the earlier one and held every package band 18px
   * off the top of its own card. Nothing was wrong with the winning rule; the offset came from a
   * block nobody was reading.
   */
  for (const sel of [".pkgb-pkgcard", ".pkgb-msheet", ".pkgb-cardhead", ".pkgb-pkgname",
                     ".pkgb-slotline", ".pkgb-pkgbody", ".pkgb-mbody"]) {
    it(`${sel} has exactly one base rule`, () => {
      expect(baseRules(sel).length, `${sel} is declared ${baseRules(sel).length} times`).toBe(1);
    });
  }
});

describe("D2 — the frame is bare and the body carries the inset", () => {
  it("neither card declares padding — the band must reach all three edges", () => {
    for (const sel of [".pkgb-pkgcard", ".pkgb-msheet"]) {
      expect(baseRules(sel)[0], `${sel} pads its own frame`).not.toMatch(/(^|;)\s*padding\s*:/);
    }
  });

  it("both cards clip, which is what rounds the band's corners", () => {
    for (const sel of [".pkgb-pkgcard", ".pkgb-msheet"]) {
      expect(baseRules(sel)[0], `${sel} does not clip`).toContain("overflow: hidden");
    }
  });

  it("the inset lives on the bodies instead", () => {
    for (const sel of [".pkgb-pkgbody", ".pkgb-mbody"]) {
      expect(baseRules(sel)[0], `${sel} carries no inset`).toMatch(/padding:/);
    }
  });

  it("the band itself takes no radius and no margin — the frame does the clipping", () => {
    const head = baseRules(".pkgb-cardhead")[0];
    expect(head).not.toMatch(/border-radius/);
    expect(head).not.toMatch(/(^|;)\s*margin\s*:/);
  });
});

describe("D4 — the folded corner is gone", () => {
  it("declares no ::before on the sheet, and no per-corner radius", () => {
    expect(decls).not.toContain(".pkgb-msheet::before");
    /* the 16px top-right corner existed only to make room for the fold */
    expect(baseRules(".pkgb-msheet")[0]).toMatch(/border-radius:\s*10px\s*;/);
  });
});

describe("D3 — the package band outweighs the material tints", () => {
  /**
   * ⚠️ COMPARED AS LIGHTNESS, NOT BY EYE. The package is the parent object; a band paler than the
   * materials it holds inverts the hierarchy, which is what "reads as disabled" meant.
   */
  const hex = (name: string): number => {
    const m = new RegExp(`--pkgt-${name}:\\s*(#[0-9a-f]{6})`, "i").exec(decls);
    expect(m, `--pkgt-${name} is not declared`).toBeTruthy();
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(m![1].slice(i, i + 2), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  it("the package band's top stop is darker than every material band's", () => {
    const pro = hex("pro-a");
    for (const t of ["let-a", "syn-a", "sam-a"]) {
      expect(pro, `pro-a is lighter than ${t}`).toBeLessThan(hex(t));
    }
  });

  it("and its edge and ink hold the same order", () => {
    for (const t of ["let-edge", "syn-edge", "sam-edge"]) expect(hex("pro-edge")).toBeLessThan(hex(t));
  });
});

describe("D5 — the slot label is a lead-in", () => {
  it("takes no fixed track", () => {
    const rule = /\.pkgb-slotline \.pkgb-sl \{([^}]*)\}/.exec(decls)?.[1] ?? "";
    expect(rule, "the label is still a column").not.toMatch(/flex:\s*0\s+0\s+\d/);
    expect(rule).toMatch(/flex:\s*none/);
  });

  it("and the row's gap is a word gap, not a column gap", () => {
    /* ⚠️ THE VALUE IS EXTRACTED AND COMPARED, never matched with a negative lookahead — this repo
       has twice shipped `(?!…)` after `\s*`, which backtracks and matches everything. */
    const gap = /\.pkgb-slotline \{[^}]*gap:\s*([\d.]+)px/.exec(decls)?.[1];
    expect(gap, "no gap declared on the slot row").toBeTruthy();
    expect(Number(gap)).toBeLessThanOrEqual(7);
  });
});

describe("F-BA — the letter mark is an envelope, not a question mark", () => {
  const glyph = readFileSync(join(root, "src/components/packages/TypeGlyph.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("draws no question-mark arc and no dot", () => {
    /* the `?` was `M8.5 9a3.5 3.5 0 116 2.4…` over `<circle cy="19" r="0.6">` */
    expect(glyph).not.toContain("a3.5 3.5 0 116 2.4");
    expect(glyph).not.toContain('r="0.6"');
  });

  it("draws a rect and a flap", () => {
    const i = glyph.indexOf("ComponentType.QUERY_LETTER");
    expect(i).toBeGreaterThan(-1);
    const body = glyph.slice(i, glyph.indexOf("ComponentType.SYNOPSIS"));
    expect(body).toContain("<rect");
    expect(body).toMatch(/<path d="M3\.6 6\.6/);
  });

  it("⚠️ and the map still resolves every type it did before — the fault was the ARTWORK", () => {
    /* A missing entry renders NOTHING here (`if (!g) return null`), which is why "every other type
       resolved" was the tell that this was a drawn `?` rather than a lookup failure. */
    for (const t of ["QUERY_LETTER", "SYNOPSIS", "SAMPLE_PAGES"]) {
      expect(glyph).toContain(`[ComponentType.${t}]:`);
    }
  });
});
