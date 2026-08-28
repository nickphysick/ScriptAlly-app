/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — the hero, and the facts line's honesty rule ════════════════════════════
 *
 * ⚠️ THE ONE RULE WORTH THE MOST HERE IS THE ASYMMETRY BETWEEN A NOUGHT AND AN ABSENCE. `0 queries
 * sent` is a fact the writer needs; `Querying since —` is the app asserting a start it does not
 * know. They look alike in a template and are opposites, and this repo has shipped the second kind
 * before (an "Added" date derived from an imported query's send).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ManuscriptHero } from "./ManuscriptHero";
import { queryingSinceMs, shelfMeta, profileDate } from "../../lib/manuscriptProfile";
import { Query, QueryStatus } from "../../types";

const css = readFileSync(join(__dirname, "bookProfile.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
/**
 * ⚠️ MEDIA BLOCKS ARE STRIPPED BEFORE THE ONE-RULE SCAN, and that is a real distinction rather
 * than a convenience. A responsive override is a SECOND declaration on purpose — `.msp-herorow`
 * wraps below 900 — so counting it as a duplicate would either fail on correct CSS or force the
 * check to be loosened until it caught nothing. The fault this scan exists for is two base rules
 * at the same breakpoint, where the cascade silently takes half of each.
 */
const base = css.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
/** Every metacharacter escaped — these selectors carry `>`, `+`, `*` and `::`. */
const rx = (sel: string) => sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const baseRules = (sel: string): string[] => {
  const out: string[] = [];
  const re = new RegExp(`(?:^|\\n)\\s*${rx(sel)}\\s*\\{([^}]*)\\}`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(base))) out.push(m[1]);
  return out;
};
const theRule = (sel: string): string => {
  const all = baseRules(sel);
  expect(all.length, `${sel} has ${all.length} base rules, expected exactly 1`).toBe(1);
  return all[0];
};

const q = (id: string, dateSent: string): Query =>
  ({ id, userId: "u", manuscriptId: "m1", agentId: "a1", packageId: "", status: QueryStatus.QUERIED,
     dateSent, materialsWanted: [] } as unknown as Query);

const hero = (over: Partial<React.ComponentProps<typeof ManuscriptHero>> = {}) =>
  renderToStaticMarkup(
    <ManuscriptHero
      title="Murphy's Day Out"
      status="Querying"
      shelved={false}
      genres={["Young Adult", "Thriller"]}
      wordCount={50000}
      stats={{ queriesSent: 26, responses: 12, lastActivity: "2 Jun" }}
      onPrev={null}
      onNext={null}
      tab="overview"
      onTabChange={() => {}}
      {...over}
    />,
  );

// ─────────────────────────────────────────────────────────────────────────────
describe("queryingSinceMs — the EARLIEST send, and never a stand-in for it", () => {
  it("is the first query out, not the last and not the manuscript's own age", () => {
    const ms = queryingSinceMs([q("a", "2026-05-02"), q("b", "2026-01-14"), q("c", "2026-03-09")]);
    expect(profileDate(ms!)).toBe("14 Jan 2026");
  });

  /** Nothing sent → no date exists. The caller then states no clause, rather than dashing one. */
  it("is null when nothing has gone out", () => {
    expect(queryingSinceMs([])).toBeNull();
  });

  /** An undated import must not become "today" by falling through a coercion. */
  it("ignores a query with no send date rather than inventing one", () => {
    const undated = { ...q("x", ""), dateSent: undefined } as unknown as Query;
    expect(queryingSinceMs([undated])).toBeNull();
    expect(profileDate(queryingSinceMs([undated, q("b", "2026-02-01")])!)).toBe("1 Feb 2026");
  });

  it("reads a Firestore Timestamp as well as an ISO string", () => {
    const stamped = { ...q("t", ""), dateSent: { seconds: Date.parse("2026-04-05") / 1000 } } as unknown as Query;
    expect(profileDate(queryingSinceMs([stamped])!)).toBe("5 Apr 2026");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
/**
 * ⚠️ `heroFacts` IS RETIRED AND ITS ONE RULE MOVED RATHER THAN LAPSED. It built the three derived
 * clauses in the facts line; those are the hero's stat CELLS now. The rule it existed to hold —
 * a count of nought is stated, a date nobody has is NOT — is asserted at the component, where the
 * cell either renders or does not.
 */
describe("shelfMeta", () => {
  it("agrees with its own verbs, at one and at many", () => {
    expect(shelfMeta(1, 1)).toBe("1 manuscript · 1 query");
    expect(shelfMeta(2, 26)).toBe("2 manuscripts · 26 queries");
    expect(shelfMeta(0, 0)).toBe("0 manuscripts · 0 queries");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the hero", () => {
  /**
   * ⚠️ THE BANNER IS GONE AND SO IS ITS KEY. It cost ~190px of height for decoration, and a
   * `data-slot` naming artwork nobody is drawing any more is a dangling instruction — the failure
   * mode is a future reader commissioning a piece for a surface that no longer exists.
   */
  it("draws no banner and leaves no commission key behind it", () => {
    const html = hero();
    expect(html).not.toContain("msp-banner");
    expect(html).not.toContain("ms-hero-banner");
    expect(html).not.toContain("msp-artkey");
  });

  /**
   * ⚠️ THE TITLE COMES BEFORE THE STATUS IN THE DOM, not just on screen. Reordering with flex would
   * leave a screen reader hearing "Querying, Murphy's Day Out" — the pill first, as it is in the
   * plate variant, where it sits above the title and that reading is correct.
   */
  it("puts the title before its status pill, in one row", () => {
    const html = hero();
    const row = /<div class="msv-toprow">([\s\S]*?)<\/div><\/div>/.exec(html)?.[1] ?? "";
    expect(row).toContain("Murphy");
    expect(row.indexOf("msv-platetitle")).toBeGreaterThan(-1);
    expect(row.indexOf("msv-platetitle")).toBeLessThan(row.indexOf("msv-statuspill"));
  });

  /**
   * ⚠️ THE COVER OVERLAPS IN FLOW. A negative margin against a white keyline, never
   * `position: absolute` — positioned, it leaves the flow and a wrapped title runs underneath it.
   */
  /**
   * ⚠️ NO OVERHANG. The negative margin existed to sit the cover on a banner; with the banner gone
   * it would be a book hanging off the top of nothing. It sits in the row, on the page ground.
   */
  it("sits in the flow with no overhang and no keyline", () => {
    const rule = theRule(".msp-cover");
    expect(rule).not.toMatch(/margin-top:\s*-/);
    expect(rule).not.toMatch(/position:\s*absolute/);
    expect(rule).toContain("flex: none");
    /* ⚠️ 52×65 SINCE THE RECORD CARD (amendment 4). It was 74×92 when the band was bare on the
       page ground; inside a framed card the cover is one item in a row rather than the band's
       anchor, and at the old size it set the card's whole height. */
    expect(rule).toContain("width: 52px");
    expect(rule).toContain("height: 65px");
    // A hairline, not a 4px white keyline cut out of a banner.
    expect(rule).toContain("border: 1px solid var(--hair)");
  });

  /**
   * ⚠️ ONE ROW, CENTRED — and it is `.msp-heroband` now, not `.msp-herorow`. The wrapper went with
   * the record card: the band IS the row, holding a chevron either side of the card, so a second
   * flex row inside it was a box with one child.
   */
  it("is one vertically centred row", () => {
    expect(theRule(".msp-heroband")).toContain("align-items: center");
    expect(theRule(".msp-card")).toContain("align-items: center");
  });

  /**
   * ⚠️ 1.3 IS THE PLAYFAIR FLOOR AND THE REF DRAWS 1.05. That value is tuned to a title somebody
   * typed into a mockup; a real title is whatever a writer names their book, and "Murphy's Day Out"
   * alone carries two descenders.
   */
  it("keeps the title above the descender floor", () => {
    expect(parseFloat(theRule(".msv-plateband--hero .msv-platetitle").match(/line-height:\s*([\d.]+)/)![1]))
      .toBeGreaterThanOrEqual(1.3);
  });

  /**
   * ⚠️ AN OBJECT ON THE GROUND, NOT A SECOND PAGE HEADER. The band used to sit bare beneath a
   * masthead of the same shape — mark, Playfair title, supporting line, twice over — and the eye
   * took the manuscript's name for the page's. A frame is what separates them.
   */
  it("is a bordered card, not a bare band", () => {
    const rule = theRule(".msp-card");
    expect(rule).toContain("background: var(--ws-window)");
    expect(rule).toContain("border: 1px solid var(--hair)");
    expect(rule).toMatch(/border-radius:\s*12px/);
  });

  /**
   * ⚠️ NO `overflow: hidden` ON THE CARD — a card inside a scroll container is exactly where that
   * clips a focus ring, and a keyboard user would lose the outline on the ⋯ with nothing to point
   * at. The cover is a separate box and clips its own image; the card must not.
   */
  it("clips nothing, so a focus ring inside it survives", () => {
    expect(theRule(".msp-card")).not.toMatch(/overflow\s*:\s*(hidden|clip)/);
  });

  /** ⚠️ THE CHEVRONS ACT ON THE CARD, so they sit outside it — inside they would read as controls
   *  of the book they are about to replace. */
  it("puts the chevrons outside the card, one each side", () => {
    const html = hero();
    const first = html.indexOf("msp-chev");
    const card = html.indexOf("msp-card");
    const last = html.lastIndexOf("msp-chev");
    expect(first).toBeLessThan(card);
    expect(last).toBeGreaterThan(card);
    expect(html.match(/msp-chev/g)).toHaveLength(2);
  });

  /**
   * ⚠️ RETARGETED: THE FIGURES LEFT AND THE ⋯ STAYED. The three-figure row moved into the
   * five-figure strip under the tab rail; three of those five were stated in both places, which is
   * the same numbers on one page twice. What remains in this group is the book's ⋯ alone — shelve,
   * reactivate, Edit details and the guarded delete, which have no other surface on the page.
   *
   * ⚠️ STILL BOUNDED ON THE NEXT CHEVRON, NOT ON `</div></div>`. The group holds nested divs, so a
   * non-greedy close matches the FIRST inner one and cuts the ⋯ off the end — the slice would then
   * report the very absence the assertion is testing for.
   */
  it("keeps the book's ⋯ in the record group, and no figures with it", () => {
    const html = hero({ bookActions: <button type="button">dots</button> });
    const start = html.indexOf('<div class="msp-recstats">');
    expect(start, "the record group is not on the page").toBeGreaterThan(-1);
    const group = html.slice(start, html.indexOf("msp-chev", start));
    expect(group).toContain("dots");
    expect(group, "the figure row came back to the hero").not.toContain("msp-hsrow");
    expect(theRule(".msp-recstats")).toContain("margin-left: auto");
  });

  it("draws exactly one book image — the hero's cover, not the plate's mark too", () => {
    expect(hero().match(/<img/g)).toHaveLength(1);
    expect(hero()).not.toContain("msv-plateimg");
  });

  /** The counts and the actions moved to the hero; the plate's own side column must not render. */
  it("drops the plate's stat strip and action column", () => {
    const html = hero();
    expect(html).not.toContain("msv-plateside");
    expect(html).not.toContain("msv-statstrip");
  });

  /**
   * ⚠️ THE HERO STATES NO FIGURES AT ALL NOW. This replaces "states the three figures as cells" —
   * the law did not weaken, it moved: the figures are `bookFigures`, locked in bookFigures.test.ts,
   * and rendered by the dossier under the tab rail. Asserting their ABSENCE here is what stops them
   * being quietly reinstated alongside.
   */
  it("states no figures of its own", () => {
    const html = hero();
    for (const cls of ["msp-hsrow", "msp-hsn", "msp-hsl"]) {
      expect(html, `${cls} came back to the hero`).not.toContain(cls);
    }
    for (const label of ["Queries sent", "Responses", "Querying since"]) {
      expect(html, `${label} is stated in the hero as well as the strip`).not.toContain(label);
    }
  });

  /**
   * ⚠️ NOT TWICE ON ONE ROW. The three figures were clauses in the facts line, then the hero's
   * right-hand cells, and are now the strip's. The facts line has kept genre and word count
   * throughout, and this is the assertion that has stopped them coming back at each move.
   */
  it("states none of the three figures in the facts line as well", () => {
    const line = /class="msv-platemeta"([\s\S]*?)<\/div>/.exec(hero())?.[1] ?? "";
    expect(line).toContain("Young Adult");
    expect(line).toContain("50,000 words");
    for (const word of ["queries sent", "responses", "Querying since"]) {
      expect(line.toLowerCase(), `${word} is stated twice on one row`).not.toContain(word.toLowerCase());
    }
  });

  /**
   * ⚠️ THE `Querying since` CELL AND ITS OMIT-RATHER-THAN-DASH RULE ARE BOTH RETIRED, and this
   * records why rather than deleting the case. That rule existed because an omitted cell had to
   * take its own `border-left` divider with it; the strip has a FIXED five cells, so nothing is
   * omitted and nothing is left hanging. `Last sent` states `—` for a book never sent — which is
   * the established form (`plateStatCells` does the same for `Last activity`) and reads as "this
   * has not happened" rather than asserting a date.
   *
   * The live claim is in bookFigures.test.ts: nought where zero is true, `—` where nothing happened.
   */
  it("no longer renders a since cell for the hero to omit", () => {
    expect(hero()).not.toContain("Querying since");
  });

  /**
   * ⚠️ THE CHEVRONS RENDER WHEN THEY CANNOT BE USED. Dimmed and disabled at one manuscript, so the
   * affordance is visible before a second book exists — and NO WRAP-AROUND, so a writer can tell
   * from the control that they have reached the end of their own shelf.
   */
  it("renders both chevrons disabled when there is nowhere to page", () => {
    const html = hero();
    const chevs = html.match(/<button[^>]*msp-chev[^>]*>/g) ?? [];
    expect(chevs).toHaveLength(2);
    for (const c of chevs) expect(c).toContain("disabled");
    expect(html).toContain('aria-label="Previous manuscript"');
    expect(html).toContain('aria-label="Next manuscript"');
  });

  it("enables only the direction that has a neighbour", () => {
    const first = hero({ onPrev: null, onNext: () => {} });
    const prev = /<button[^>]*aria-label="Previous manuscript"[^>]*>/.exec(first)![0];
    const next = /<button[^>]*aria-label="Next manuscript"[^>]*>/.exec(first)![0];
    expect(prev, "first manuscript offers a previous").toContain("disabled");
    expect(next, "a next exists and is disabled anyway").not.toContain("disabled");
  });

  /** ⚠️ THE ACTION CLUSTER IS RETIRED — the rail's collapsed primary is the page's one CTA. */
  it("carries no actions at all", () => {
    const html = hero();
    for (const word of ["Send a query", "Query Centre", "More actions"]) {
      expect(html, `${word} is still in the hero`).not.toContain(word);
    }
    expect(html).not.toContain("msp-heroacts");
  });

  /**
   * ⚠️ THE SEPARATOR IS STILL A `::before` AND STILL MATTERS, for a smaller line than before. The
   * facts row is genre chips and word count now; the ref draws `<span class="ip">·</span>` between
   * them, and taken literally a manuscript with no word count would leave the dot behind.
   */
  it("carries no punctuation-only markup between the facts", () => {
    expect(hero()).not.toContain(">·<");
    expect(theRule(".msv-plateband--hero .msv-platemeta > * + *::before")).toContain('content: "·"');
  });

  it("seats the tab rail inside the hero, under the identity", () => {
    const html = hero();
    expect(html.indexOf("msp-tabs")).toBeGreaterThan(html.indexOf("msv-toprow"));
    expect(html.indexOf("msp-tabs")).toBeLessThan(html.lastIndexOf("</div>"));
  });


});

// ─────────────────────────────────────────────────────────────────────────────
describe("the stylesheet", () => {
  for (const sel of [".msp-hero", ".msp-cover", ".msp-heroin", ".msp-heroband", ".msp-card",
                     ".msp-tabs", ".msp-tab", ".msv-plateband--hero"]) {
    it(`${sel} has exactly one base rule`, () => { theRule(sel); });
  }

  /**
   * ⚠️ A `var()` ON A TOKEN NOBODY DEFINES PAINTS NOTHING, SILENTLY — and one on a THEME-scoped
   * token is worse, because it resolves on some pages and not on others. `--sage-band` is declared
   * on `.t-f12` alone; read here it would have looked parameterised and painted its fallback.
   */
  it("reads no token that this page cannot resolve", () => {
    const root = readFileSync(join(__dirname, "..", "..", "index.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    /* ⚠️ EVERY `:root` BLOCK, NOT THE FIRST. index.css opens several; slicing one is the
       first-match fault this repo keeps rediscovering, and here it would have reported five live
       tokens as undefined. A THEME class is still excluded on purpose — it is not an ancestor of
       every page, which is the whole point of the check. */
    const defined = new Set<string>();
    /* ⚠️ `@theme` COUNTS. Tailwind v4 emits that block's custom properties into `:root`, so
       `--font-sans` / `--font-mono` are as global as anything in it — verified by the check going
       red on exactly those two before this line existed. */
    /* ⚠️ THE SHARED CONTAINER GRAMMAR COUNTS TOO. `--cap-outgoing/incoming/pro/reference` are
       declared at `:root` in `containers/containers.css`, which this page imports through
       `CappedCard`; excluding it reported four live tokens as undefined. A THEME class is still
       excluded on purpose — it is not an ancestor of every page, which is the whole check. */
    const shared = readFileSync(join(__dirname, "..", "containers", "containers.css"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const blk of (root + shared).matchAll(/(?:^|\n)\s*(?::root|@theme)\s*\{([\s\S]*?)\n\}/g)) {
      for (const m = blk[1].matchAll(/(--[a-z0-9-]+)\s*:/gi), it = m; ;) {
        const n = it.next();
        if (n.done) break;
        defined.add(n.value[1]);
      }
    }
    for (const m of css.matchAll(/(--[a-z0-9-]+)\s*:/gi)) defined.add(m[1]);
    const unresolved = [...css.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)]
      .map((m) => m[1]).filter((t) => !defined.has(t));
    expect([...new Set(unresolved)]).toEqual([]);
  });

  it("declares its one stand-in colour rather than borrowing a theme's", () => {
    expect(css).not.toContain("--sage-band");
    /* The banner went; the cover keeps the stand-in, and the token was renamed with it rather than
       left naming a surface that no longer exists. */
    expect(css).not.toContain("--msp-banner-a");
    /* ⚠️ AND IT IS DECLARED ON THE ELEMENT THAT READS IT. Losing this declaration is exactly how
       the rename could have gone wrong: `var()` on an undefined token paints NOTHING, silently, and
       the cover would have come out transparent through a green build. The sweep above caught it. */
    expect(theRule(".msp-cover")).toContain("--msp-cover-a:");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the re-cut's cascade — what went, and the one thing knowingly left", () => {
  const exists = (p: string) => {
    try { readFileSync(join(__dirname, p), "utf8"); return true; } catch { return false; }
  };

  /**
   * ⚠️ A REPLACEMENT THAT IS *ADDED* LEAVES THE ORIGINAL REACHABLE; ONLY ONE THAT IS *SWAPPED*
   * RETIRES IT. Four panes were swapped out by this re-cut and a fifth module fell with them:
   *   ManuscriptPitchPane · ManuscriptDetailTiles · ManuscriptPackagesPane — unreached at Phase 2
   *   ManuscriptCompsPane — unreached at Phase 5, replaced by the read-only `CompsPane`
   *   manuscriptMarks — the cascade: its five marks had no other consumer
   * Verified by a fixed-point sweep and then symbol by symbol, because a grep for `MARK` matches
   * forty unrelated files and would have reported every one of them as alive.
   */
  it("the swapped-out panes are gone, not merely unimported", () => {
    for (const f of ["ManuscriptPitchPane.tsx", "ManuscriptDetailTiles.tsx",
                     "ManuscriptPackagesPane.tsx", "ManuscriptCompsPane.tsx", "manuscriptMarks.tsx"]) {
      expect(exists(f), `${f} is still on disk`).toBe(false);
    }
  });

  /**
   * ⚠️ AND `manuscriptTiles.ts` IS UNREFERENCED ON PURPOSE, PENDING A DECISION THAT IS NOT MINE.
   * It holds `PITCH_PHRASE` / `PITCH_LABEL` and the ‘X meets Y’ pitch line, whose only renderers
   * were three of the panes above — and the Comparable titles PAGE does not render it either. So
   * that line now appears nowhere in the app. Deleting the module would foreclose the choice;
   * leaving it silent is how an inert file comes to be read as live. This assertion is the third
   * option: it states the situation where a reader will meet it, and fails the day somebody either
   * gives the line a home or removes the module — both of which are answers.
   */
  it("manuscriptTiles is inert and says so, awaiting the pitch line's home", () => {
    expect(exists("../../lib/manuscriptTiles.ts"), "manuscriptTiles.ts was removed — was the pitch line rehomed?").toBe(true);
    const src = readFileSync(join(__dirname, "..", "..", "lib", "manuscriptTiles.ts"), "utf8");
    expect(src).toContain("PITCH_PHRASE");
    /* If anything imports it again, the ‘X meets Y’ line has a home and this note is spent. */
    const importers = ["OverviewPane.tsx", "JourneyPane.tsx", "CompsPane.tsx", "VersionsPane.tsx",
                       "NotesPane.tsx", "ManuscriptDossier.tsx", "ManuscriptHero.tsx"]
      .filter((f) => exists(f) && readFileSync(join(__dirname, f), "utf8").includes("manuscriptTiles"));
    expect(importers, "the pitch line found a home — retire this assertion with the flag").toEqual([]);
  });
});
