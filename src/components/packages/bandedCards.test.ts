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
/** The shared cap grammar the four material tints now read. */
const shared = readFileSync(join(root, "src/components/containers/containers.css"), "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "");

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
  /**
   * ⚠️ IT RESOLVES THE CHAIN, because the hexes MOVED (book profile, Phase 1). `--pkgt-*` keeps the
   * material names on this page and now READS the general cap grammar in
   * `containers/containers.css`, where a second page needed the same four tints under names that
   * do not claim a pink cap is a query letter. The law below is untouched — the package band is
   * still darker than every material band — but the value that paints is one hop away, and a
   * helper that only accepted a literal would have gone red about a colour nobody had moved.
   *
   * ⚠️ AND FOLLOWING THE HOP IS STRICTLY STRONGER THAN THE LITERAL IT REPLACES. A literal here
   * could be a stale copy of a value the browser never uses; this reads what the cascade will.
   */
  const hex = (name: string): number => {
    let v = new RegExp(`--pkgt-${name}:\\s*([^;]+);`).exec(decls)?.[1]?.trim();
    expect(v, `--pkgt-${name} is not declared`).toBeTruthy();
    for (let hop = 0; hop < 4 && v && v.startsWith("var("); hop++) {
      const ref = /var\(\s*(--[a-z0-9-]+)\s*\)/i.exec(v)![1];
      v = new RegExp(`${ref}:\\s*([^;]+);`).exec(shared)?.[1]?.trim();
      expect(v, `${ref} is not declared in containers.css`).toBeTruthy();
    }
    expect(v, `--pkgt-${name} does not resolve to a literal`).toMatch(/^#[0-9a-f]{6}$/i);
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(v!.slice(i, i + 2), 16));
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
    /* ⚠️ THE TINT MAP KEEPS ALL THREE — archived samples still render in the archive drawer.
       It is the LEGEND that lost its swatch (D13), asserted just below. */
    for (const t of ["QUERY_LETTER", "SYNOPSIS", "SAMPLE_PAGES"]) {
      expect(glyph).toContain(`[ComponentType.${t}]:`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D6 — the legend renders the real band", () => {
  const legend = readFileSync(join(root, "src/components/packages/CardBand.tsx"), "utf8");
  const mats = readFileSync(join(root, "src/components/packages/MaterialsBand.tsx"), "utf8");
  const pkgs = readFileSync(join(root, "src/components/packages/PackagesBand.tsx"), "utf8");
  const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  it("the legend mounts CardBand rather than drawing a swatch", () => {
    /* Same law as StatusDot's legends: a key that reproduces its subject goes on being right about
       a band that has since changed. */
    expect(strip(legend)).toMatch(/<CardBand kind=\{k\}/);
    expect(strip(legend)).not.toMatch(/pkgb-legcell[\s\S]{0,200}background/);
  });

  it("names all four kinds, parent first", () => {
    /* ⚠️ THREE, NOT FOUR (D13) — the legend teaches what the shelf offers, and the shelf offers
       two material types. A key that still showed a sample swatch would teach a type nothing can
       create. */
    expect(strip(legend)).toContain('"package", ComponentType.QUERY_LETTER, ComponentType.SYNOPSIS,');
    expect(strip(legend)).not.toMatch(/LEGEND[\s\S]{0,200}SAMPLE_PAGES/);
  });

  it("⚠️ and BOTH card surfaces render the same component — there is one band head now", () => {
    /* The package card used to hand-write its own parcel <svg> while the material cards went
       through TypeGlyph: two implementations of one head, before a legend asked for a third. */
    expect(strip(mats)).toContain("<CardBand kind={sh.type}");
    expect(strip(pkgs)).toContain('<CardBand kind="package"');
    expect(strip(pkgs), "the package head still hand-draws a parcel").not.toContain("M16 4 28 10v12L16 28 4 22V10z");
  });

  it("the tint map lives in one place", () => {
    expect(strip(mats), "MaterialsBand keeps a local copy of the tint map").not.toContain("TYPE_BAND");
    expect(strip(mats)).toContain("BAND_CLASS[sh.type]");
  });
});

describe("D7 — no dashed placeholder on a user-facing slot", () => {
  const strip = (x: string) => x.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  /**
   * ⚠️ THE DASHED RIM LIVES ON `.pkgb-plate` AND IS DROPPED BY `--bare` ONLY. So the check is not
   * "does the file say dashed" — it is which SHAPE each live call site asks for. A `chip`, a `disc`
   * or the default `rect` all draw the commission border.
   */
  for (const f of ["FootnoteBand", "PackagesBand", "PackagesDrawer"]) {
    it(`${f} renders no plated slot`, () => {
      const src = strip(readFileSync(join(root, `src/components/packages/${f}.tsx`), "utf8"));
      for (const m of src.matchAll(/<IllustrationSlot([^>]*)>/g)) {
        expect(m[1], `${f} draws a plated slot: ${m[1].trim()}`).toMatch(/shape="bare"/);
      }
    });
  }

  it("the ghost buttons keep their own dashed border — a different device", () => {
    /* An add affordance is dashed by house convention across the app (the versions panel, the
       materials ghost). What D7 retires is the COMMISSION plate, which says "artwork pending". */
    expect(decls).toMatch(/\.pkgb-msheetadd \{[^}]*dashed/);
  });
});
