/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE SHARED CONTAINERS — the extraction, and the proof it changed nothing ══════════════════
 *
 * The section header was inline JSX in three places on the packages page before this. Extracting
 * it renamed three classes on that page (`pkgb-bandhead` → `sa-sechead`, `pkgb-tag` → `sa-secmeta`
 * inside a header, `pkgb-bandacts` → `sa-secacts`) and changed nothing else: the rendered DOM was
 * diffed element by element and differs ONLY in those class attributes.
 *
 * ⚠️ SO THE CLAIM THAT NEEDS LOCKING IS THAT THE NEW CLASSES CARRY THE OLD DECLARATIONS — a
 * rename is only harmless while that holds, and nothing else in the repo is watching it.
 *
 * ⚠️ AND THE TOKEN SUBSTITUTION IS THE FRAGILE HALF. The old rules read `--pkg-ink`, `--pkg-muted`
 * and `--pkgo-hairline`, all declared on `.pkgw` (packageWorkshop.css) and therefore resolving on
 * the packages page and NOWHERE else. The shared sheet reads `--shell-ink` / `--shell-muted`
 * directly and declares `--sa-sec-rule` itself. That is value-preserving ONLY while the `.pkgw`
 * aliases still point at the same things, so the aliases are asserted rather than assumed: the day
 * someone gives `--pkg-ink` a literal, this fails instead of the two pages quietly diverging.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SectionHeader } from "./SectionHeader";
import { CappedCard } from "./CappedCard";
import { CAP_TINTS } from "../packages/CardBand";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** ⚠️ COMMENTS FIRST. Every retirement in these sheets is documented by quoting what it retired,
 *  so a bare `toContain` over raw source reads the prose and not the code. */
const decls = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const shared = decls(read("src/components/containers/containers.css"));
const broadsheet = decls(read("src/components/packages/packagesBroadsheet.css"));
const workshop = decls(read("src/components/packages/packageWorkshop.css"));

/**
 * Every BASE rule for a selector — anchored at a line start so `.sa-sechead` cannot match the tail
 * of `.pkgb-band .sa-sechead`, and returning ALL of them so a duplicate is visible rather than
 * silently shadowed by first-match slicing.
 */
const baseRules = (css: string, sel: string): string[] => {
  const out: string[] = [];
  const re = new RegExp(`(?:^|\\n)\\s*${sel.replace(/\./g, "\\.")}\\s*\\{([^}]*)\\}`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(css))) out.push(m[1]);
  return out;
};
/** One rule, or a named failure. Never `[0]` on a possibly-empty list. */
const theRule = (css: string, sel: string): string => {
  const all = baseRules(css, sel);
  expect(all.length, `${sel} has ${all.length} base rules, expected exactly 1`).toBe(1);
  return all[0];
};
/** `prop: value` pairs, normalised, so a reordered rule still compares equal. */
const props = (rule: string): Record<string, string> =>
  Object.fromEntries(
    rule.split(";").map((d) => d.trim()).filter(Boolean).map((d) => {
      const i = d.indexOf(":");
      return [d.slice(0, i).trim(), d.slice(i + 1).trim().replace(/\s+/g, " ")];
    }),
  );

// ─────────────────────────────────────────────────────────────────────────────
describe("the fold — one base rule, and it is the union of the two it replaces", () => {
  /**
   * `.pkgb-bandhead` was declared TWICE. `position: relative` came only from the first block and
   * `padding-bottom: 9px` only from the second, so neither described the header on screen. The
   * fold has to carry BOTH or the tick loses its containing block, silently.
   */
  it("`.sa-sechead` is declared once and carries every live declaration of the pair", () => {
    expect(props(theRule(shared, ".sa-sechead"))).toEqual({
      position: "relative",           // from the FIRST retired block — the tick's containing block
      display: "flex",                // ┐
      "align-items": "center",        // │ from the SECOND
      "flex-wrap": "wrap",            // │
      gap: "14px",                    // ┘
      "border-bottom": "1px solid var(--sa-sec-rule)",
      "padding-bottom": "9px",        // the SECOND won this one — the first said 10px
      "margin-bottom": "18px",
    });
  });

  for (const sel of [".sa-sechead", ".sa-secmeta", ".sa-secacts", ".sa-card", ".sa-cardbody"]) {
    it(`${sel} has exactly one base rule`, () => { theRule(shared, sel); });
  }

  it("the packages sheet no longer declares the header at all", () => {
    for (const sel of [".pkgb-bandhead", ".pkgb-bandacts"]) {
      expect(baseRules(broadsheet, sel).length, `${sel} still has a rule`).toBe(0);
    }
    expect(broadsheet).not.toMatch(/\.pkgb-bandhead\s*(::before|h2)/);
  });

  it("but every selector the extraction was NOT about survives", () => {
    // ⚠️ A REMOVAL IS VERIFIED AGAINST THE POST-EDIT FILE, BOTH DIRECTIONS. `.pkgb-tag` in
    // particular is still used four times by TrackingBand's inner panel heads, which are not
    // section headers and were not touched.
    for (const sel of [".pkgb-tag", ".pkgb-how", ".pkgb-newpkg", ".pkgb-band", ".pkgb-cardhead",
                       ".pkgb-pkgcard", ".pkgb-msheet"]) {
      expect(baseRules(broadsheet, sel).length, `${sel} was destroyed by the removal`).toBe(1);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the rename is value-preserving", () => {
  it("`.sa-secmeta` states exactly what `.pkgb-tag` states", () => {
    const tag = props(theRule(broadsheet, ".pkgb-tag"));
    const meta = props(theRule(shared, ".sa-secmeta"));
    expect(meta).toEqual({ ...tag, color: "var(--shell-muted)" });
    expect(tag.color).toBe("var(--pkg-muted)");
  });

  it("the heading keeps its family, size, weight and the 1.3 Playfair floor", () => {
    const h2 = props(theRule(shared, ".sa-sechead h2"));
    expect(h2["font-family"]).toBe("var(--font-serif)");
    expect(h2["font-size"]).toBe("23px");
    expect(h2["font-weight"]).toBe("600");
    expect(h2.color).toBe("var(--shell-ink)");
    // ⚠️ Mixed-case Playfair below 1.3 crops its own descenders — a house floor, not a taste.
    expect(parseFloat(h2["line-height"])).toBeGreaterThanOrEqual(1.3);
  });

  it("the `.pkgw` aliases still point where the substitution assumed", () => {
    expect(workshop).toMatch(/--pkg-ink:\s*var\(--shell-ink\)/);
    expect(workshop).toMatch(/--pkg-muted:\s*var\(--shell-muted\)/);
    // The rule under a header. `--pkgo-hairline` is `.pkgw`-scoped; `--sa-sec-rule` is its value.
    const hair = /--pkgo-hairline:\s*([^;]+);/.exec(workshop)?.[1].trim();
    const mine = /--sa-sec-rule:\s*([^;]+);/.exec(shared)?.[1].trim();
    expect(hair).toBeTruthy();
    expect(mine?.replace(/\s+/g, "")).toBe(hair?.replace(/\s+/g, ""));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the cap grammar — one source of hexes, two vocabularies", () => {
  const ROLES = ["a", "b", "edge", "ink"] as const;

  it("the four tints are declared in the shared sheet, as literals", () => {
    for (const t of CAP_TINTS) {
      for (const r of ROLES) {
        const m = new RegExp(`--cap-${t}-${r}:\\s*(#[0-9a-f]{6})`, "i").exec(shared);
        expect(m, `--cap-${t}-${r} is missing or is not a literal`).toBeTruthy();
      }
    }
  });

  /**
   * ⚠️ THE MATERIAL NAMES SURVIVE AND MUST READ THE GENERAL ONES. Two sets of hexes is the failure
   * this move exists to prevent, and it is invisible: both pages would render correctly on the day
   * they were written and drift on the first retint.
   */
  it("packages' material-named tints read them rather than restating the values", () => {
    for (const [mat, gen] of [["pro", "slate"], ["let", "pink"], ["syn", "sage"], ["sam", "tan"]]) {
      for (const r of ROLES) {
        const m = new RegExp(`--pkgt-${mat}-${r}:\\s*([^;]+);`).exec(broadsheet);
        expect(m, `--pkgt-${mat}-${r} is missing`).toBeTruthy();
        expect(m![1].trim(), `--pkgt-${mat}-${r} restates a hex`).toBe(`var(--cap-${gen}-${r})`);
      }
    }
  });

  it("every tint class paints all three cap colours from its own trio", () => {
    for (const t of CAP_TINTS) {
      const rule = theRule(shared, `.sa-cap--${t}`);
      expect(rule).toContain(`var(--cap-${t}-a)`);
      expect(rule).toContain(`var(--cap-${t}-b)`);
      expect(rule).toContain(`border-bottom-color: var(--cap-${t}-edge)`);
      expect(rule).toContain(`color: var(--cap-${t}-ink)`);
    }
  });

  /** ⚠️ A `var()` ON A TOKEN NOBODY DEFINES PAINTS NOTHING, SILENTLY. */
  it("no rule in the shared sheet reads a token that does not exist", () => {
    const defined = new Set<string>();
    for (const m of shared.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
    const appRoot = decls(read("src/index.css"));
    for (const m of appRoot.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
    const unresolved = [...shared.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/gi)]
      .map((m) => m[1]).filter((t) => !defined.has(t));
    expect([...new Set(unresolved)]).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("SectionHeader — the two slots differ by one auto margin", () => {
  it("the tick is opt-in, and opting out leaves no trace of it", () => {
    expect(renderToStaticMarkup(<SectionHeader title="A" />))
      .toContain('class="sa-sechead"');
    expect(renderToStaticMarkup(<SectionHeader title="A" tick />))
      .toContain('class="sa-sechead sa-sechead--tick"');
  });

  it("`actions` is grouped and `children` are bare — which is what decides where they sit", () => {
    const html = renderToStaticMarkup(
      <SectionHeader title="A" meta="M" actions={<button>Go</button>}>
        <button>Bare</button>
      </SectionHeader>,
    );
    // The bare child is a direct sibling of the meta; the action is inside the group.
    expect(html).toContain('<span class="sa-secmeta">M</span><button>Bare</button>');
    expect(html).toContain('<span class="sa-secacts"><button>Go</button></span>');
  });

  it("an absent meta renders no element at all — never an empty span", () => {
    expect(renderToStaticMarkup(<SectionHeader title="A" />)).not.toContain("sa-secmeta");
  });

  /** A count of nought is a true count and must survive the falsy check the naive guard would make. */
  it("a meta of `0` still renders", () => {
    expect(renderToStaticMarkup(<SectionHeader title="A" meta={0} />)).toContain('<span class="sa-secmeta">0</span>');
  });

  it("the heading takes an id so a section can be labelled by it", () => {
    expect(renderToStaticMarkup(<SectionHeader headingId="x-h" title="A" />)).toContain('<h2 id="x-h">A</h2>');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("CappedCard — the cap is CardBand, not a copy of it", () => {
  it("renders the one band-head DOM this app has, with the tint on it", () => {
    const html = renderToStaticMarkup(<CappedCard tint="sage" label="Who holds what" right="4 agents">body</CappedCard>);
    // `pkgb-cardhead` is CardBand's own box; `sa-cap--sage` is only the colour.
    expect(html).toContain('class="pkgb-cardhead sa-cap--sage"');
    expect(html).toContain('<span class="pkgb-chlbl">Who holds what</span>');
    expect(html).toContain('<span class="pkgb-chrt">4 agents</span>');
    expect(html).toContain('<div class="sa-cardbody">body</div>');
  });

  it("a tint resolves no glyph of its own — the caller supplies one or there is none", () => {
    expect(renderToStaticMarkup(<CappedCard tint="pink" label="Elevator pitch">x</CappedCard>))
      .toContain('<div class="pkgb-cardhead sa-cap--pink"><span class="pkgb-chlbl">Elevator pitch</span>');
  });

  it("every tint is reachable", () => {
    for (const t of CAP_TINTS) {
      expect(renderToStaticMarkup(<CappedCard tint={t} label="L">x</CappedCard>)).toContain(`sa-cap--${t}`);
    }
  });
});
