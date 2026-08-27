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
import { readFileSync, readdirSync } from "node:fs";
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
    /* ⚠️ `.pkgb-newpkg` HAS SINCE BEEN RETIRED ON PURPOSE, so it leaves this survivor list rather
       than being restored to satisfy it. It was `＋ New package` in the ledger head — one of three
       build affordances on one tab, where the ref has one. A survivor assertion that outlives the
       thing it protects turns every deliberate removal into a red, which trains the next reader to
       delete the line without reading it. */
    for (const sel of [".pkgb-tag", ".pkgb-how", ".pkgb-band", ".pkgb-cardhead",
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

  /**
   * ⚠️ NO COLOUR-NAMED CAP TOKEN MAY SURVIVE. The whole move is from naming the hex to naming the
   * reason; a `--cap-pink-*` left behind would be a second, silent vocabulary for the same value,
   * and the next person would reach for whichever they saw first.
   */
  it("names no cap token after its colour", () => {
    for (const colour of ["slate", "pink", "sage", "tan"]) {
      expect(shared, `--cap-${colour}-* survives`).not.toContain(`--cap-${colour}-`);
      expect(broadsheet, `packages still reads --cap-${colour}-*`).not.toContain(`--cap-${colour}-`);
    }
  });

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
    /* material name → the ROLE its colour actually means. `let` is outgoing because correspondence
       is what you send; `syn` and `sam` are the incoming and reference tints that page happens to
       put a synopsis and a sample in. The mapping is the point: one set of hexes, two vocabularies. */
    for (const [mat, gen] of [["pro", "pro"], ["let", "outgoing"], ["syn", "incoming"], ["sam", "reference"]]) {
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
    const html = renderToStaticMarkup(<CappedCard tint="incoming" label="Who holds what" right="4 agents">body</CappedCard>);
    // `pkgb-cardhead` is CardBand's own box; `sa-cap--incoming` is only the colour.
    expect(html).toContain('class="pkgb-cardhead sa-cap--incoming"');
    expect(html).toContain('<span class="pkgb-chlbl">Who holds what</span>');
    expect(html).toContain('<span class="pkgb-chrt">4 agents</span>');
    expect(html).toContain('<div class="sa-cardbody">body</div>');
  });

  it("a tint resolves no glyph of its own — the caller supplies one or there is none", () => {
    expect(renderToStaticMarkup(<CappedCard tint="outgoing" label="Elevator pitch">x</CappedCard>))
      .toContain('<div class="pkgb-cardhead sa-cap--outgoing"><span class="pkgb-chlbl">Elevator pitch</span>');
  });

  it("every tint is reachable", () => {
    for (const t of CAP_TINTS) {
      expect(renderToStaticMarkup(<CappedCard tint={t} label="L">x</CappedCard>)).toContain(`sa-cap--${t}`);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the book profile's cap assignment — one table, checked against the render", () => {
  /**
   * ⚠️ THE ASSIGNMENT IS A CLAIM ABOUT MEANING AND IT DRIFTED ONCE ALREADY. While the tints were
   * named after colours, the same KIND of data was tinted two different ways on one page: "Who
   * holds what" and "Out with agents now" list the same thing — material that is out with an agent
   * — and one was sage while the other was pink. Naming the roles is what made that visible; this
   * table is what stops it happening again.
   *
   * ⚠️ WHERE PRO AND OUTGOING BOTH APPLY, PRO WINS. "Who holds which version" is material out with
   * an agent AND a gated feature; the gate is the more useful thing for a reader to see first, and
   * a card that changed tint when a writer upgraded would be worse than either answer.
   *
   * Read from the SOURCE rather than from a rendered page, because the claim is about which card
   * declares which role — every one of these components is separately smoke-tested for its render.
   */
  /**
   * ⚠️ OVERVIEW HAS NO CAPPED CARDS AT ALL SINCE AMENDMENT 2, and both of its entries left for
   * different reasons. The PITCH lost its container entirely — it is two quotation marks and the
   * words between them, because it is the one thing on the page the writer composed rather than the
   * app derived, and a cap made it look like another panel of figures. `Who holds what` left the
   * PANE: it is "Out with agents now" on Journey, the same table, and one fact with two homes
   * disagrees the moment either moves. Neither change touches the other eight assignments.
   */
  const CARDS: [string, string, string][] = [
    ["JourneyPane.tsx", "Current standing", "incoming"],
    ["JourneyPane.tsx", "Out with agents now", "outgoing"],
    ["JourneyPane.tsx", "How far queries reached", "incoming"],
    ["VersionsPane.tsx", "Requests by opening", "pro"],
    ["VersionsPane.tsx", "Who holds which version", "pro"],
    ["CompsPane.tsx", "Comparable titles", "reference"],
    ["NotesPane.tsx", "Note", "reference"],
  ];

  const pane = (f: string) =>
    readFileSync(join(root, "src/components/manuscripts", f), "utf8").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

  it.each(CARDS)("%s · %s is capped %s", (file, label, role) => {
    const src = pane(file);
    /* The `tint` and the `label` must belong to the SAME card — anchored on one `<CappedCard`,
       never on the two strings appearing somewhere in the file. */
    const cards = [...src.matchAll(/<CappedCard[\s\S]*?>/g)].map((m) => m[0]);
    const mine = cards.filter((c) => c.includes(`label="${label}"`) || c.includes(`label={\`${label}`));
    expect(mine.length, `${label} is declared ${mine.length} times in ${file}`).toBeGreaterThan(0);
    for (const c of mine) expect(c, `${label} in ${file}`).toContain(`tint="${role}"`);
  });

  it("Versions is the one card whose label repeats, and both are Pro", () => {
    const cards = [...pane("VersionsPane.tsx").matchAll(/<CappedCard[\s\S]*?>/g)]
      .map((m) => m[0]).filter((c) => c.includes('label="Versions"'));
    expect(cards).toHaveLength(2); // the free offer, and the Pro panel
    for (const c of cards) expect(c).toContain('tint="pro"');
  });

  /** Every role in the grammar is used, so none is a token nobody reads. */
  it("uses all four roles", () => {
    const all = new Set(CARDS.map(([, , role]) => role));
    expect([...all].sort()).toEqual(["incoming", "outgoing", "pro", "reference"]);
  });

  /**
   * ⚠️ OVERVIEW CAPS NOTHING AT ALL AGAIN (amendment 4), AND THIS ASSERTS THE REMOVAL REACHED NOTHING.
   *
   * The attachments panel was the pane's one capped card. It was the only filled, capped, coloured
   * element on a page of unboxed editorial content, so it read as pasted in from elsewhere — and the
   * fix was to stop it being a card, NOT to restyle the card. That distinction is the whole safety
   * argument: `CappedCard` renders `CardBand`, which the packages page consumes in three places, so
   * restyling either would have reached a page this pass does not own.
   *
   * Both halves are asserted: Overview no longer calls `CappedCard`, and `CardBand`'s packages
   * consumers are all still there. A removal is verified against the post-edit file in BOTH
   * directions — reading the diff tells you what you took out, only re-reading tells you what went
   * with it.
   */
  it("Overview caps nothing, and packages' band consumers are untouched", () => {
    /**
     * ⚠️ COMMENTS STRIPPED FIRST, and this lock proved the rule on its own first run. The prose
     * explaining WHY the panel stopped being a card necessarily names `CappedCard` — as every
     * retirement in this codebase is documented by quoting what it retired — so a bare read went red
     * over a correct file. The fault is never carelessness; it is that the lock read the wrong artefact.
     */
    const overview = decls(readFileSync(join(root, "src/components/manuscripts/OverviewPane.tsx"), "utf8"));
    expect(overview, "the attachments panel is a card again").not.toContain("CappedCard");

    /**
     * ⚠️ THE CENSUS IS SCANNED, NOT TYPED — and typing it is what went wrong first. I wrote the
     * consumer list from memory as PackagesBand · MaterialsBand · PackageDetailDrawer; the first of
     * those imports `CardBand` and never renders it, so the loop failed on its own bad list rather
     * than on anything real, and it failed identically under two mutations that changed nothing it
     * was looking at. Both "proofs" were the loop dying at element one.
     *
     * ⚠️ AND THE TOKEN IS BOUNDED. `toContain("CardBand")` is satisfied by `CardBandX` — the
     * prefix-match fault — which is how the first form survived a rename aimed straight at it.
     *
     * The set is the claim: a consumer that stopped rendering the band shrinks it, and a new one
     * grows it. Either is a thing to look at.
     */
    const rendersBand = readdirSync(join(root, "src"), { recursive: true })
      .map(String)
      .filter((f) => f.endsWith(".tsx") && !f.includes(".test."))
      .filter((f) => /<CardBand[\s/>]/.test(readFileSync(join(root, "src", f), "utf8")))
      .map((f) => f.split("/").pop()!)
      .sort();

    expect(rendersBand).toEqual(["CappedCard.tsx", "CardBand.tsx", "MaterialsBand.tsx", "PackageDetailDrawer.tsx"]);
  });

  /** ⚠️ AND THE PANEL SPEAKS THE FIELDS' GRAMMAR — the same `SectionHeader` the pitch and synopsis use. */
  /**
   * ⚠️ RETARGETED TO THE PANEL'S OWN FILE. The law is unchanged — the attachments panel speaks the
   * fields' grammar, one size down — and only the file that renders it moved, because the built
   * panel needs the db context and the pane must stay pure. A lock bound to a PATH cannot tell a
   * relocation from a regression, which is the only thing a lock is for.
   */
  it("the attachments panel uses the shared section header, one size down", () => {
    const overview = decls(readFileSync(join(root, "src/components/manuscripts/AttachmentsPanel.tsx"), "utf8"));
    expect(overview).toContain('<SectionHeader title="Attachments"');
    const css = readFileSync(join(root, "src/components/manuscripts/bookProfile.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    /* 0-2-1, so it beats `.sa-sechead h2` on specificity rather than on stylesheet order. */
    expect(css).toContain(".sa-sechead.msp-attsec h2 { font-size: 19px; }");
  });
});
