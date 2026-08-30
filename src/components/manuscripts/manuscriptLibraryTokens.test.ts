/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Theme verification for the library grid.
 *
 * ⚠️ CHECKED FROM CONSUMPTION TO DEFINITION, NOT THE OTHER WAY. `var()` on an UNDEFINED custom
 * property yields nothing and CSS says nothing — the declaration is simply dropped. That is how a
 * shell selector once rendered 0px wide through a green typecheck, a green build and a green suite.
 * Grepping for the tokens we ADDED cannot catch a token we REFERENCED and never wrote, so this
 * walks every `var(--x)` this stylesheet reads and demands a definition for it.
 *
 * ⚠️ AND EDITORIAL IS CHECKED BY CHROMA SPREAD, NOT BY HUE NAME. A rule saying "no sage in
 * Editorial" names one hue and is passed by pink — which is exactly how the plate tiles' pink once
 * went straight through a check written to the letter of that ruling.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const here = (f: string) => strip(readFileSync(resolve(__dirname, f), "utf8"));

const LIB = here("./manuscriptLibrary.css");
/**
 * Where the tokens this sheet consumes are actually defined.
 *
 * ⚠️ THE SHELL SHEETS ARE IN THE SET BECAUSE THE DOSSIER READS ACROSS. `--content-top-gap` is the
 * grid's, and the dossier's bottom gutter reads it deliberately so the vertical inset matches the top
 * BY CONSTRUCTION. Widening the search keeps the law's teeth — a read still has to resolve to a real
 * declaration somewhere — while not pretending the page owns a token it borrows.
 */
const DEFINED_IN = [
  LIB,
  here("./manuscriptPlate.css"),
  here("./manuscripts.css"),
  here("../shell/workspacePageGrid.css"),
  here("../shell/pageHeader.css"),
].join("\n");

const THEMES = [".t-capp .msv1", ".t-bold .msv1", ".t-edn  .msv1"] as const;

function block(css: string, selector: string): string {
  const re = new RegExp(`${selector.replace(/[.\\]/g, "\\$&")}\\s*\\{([^}]*)\\}`, "m");
  const m = re.exec(css);
  expect(m, `${selector} must exist as a rule of its own`).not.toBeNull();
  return m![1];
}

/**
 * Every declaration that applies to `selector`, joined across ALL its blocks.
 *
 * ⚠️ A GROUPED RULE MAKES FIRST-MATCH SLICING AMBIGUOUS, and this file met that immediately: the
 * hover treatment is written `.mlib-book:hover, .mlib-book:focus-visible { … }`, so a helper that
 * finds one block by exact-match returns nothing and the lock reports a missing rule. Joining every
 * block that lists the selector cannot be defeated by grouping or by a second rule added later.
 */
function rule(css: string, selector: string): string {
  const bodies = [...css.matchAll(/([^{}]+)\{([^}]*)\}/g)]
    .filter(([, sel]) => sel.split(",").some((s) => s.trim() === selector))
    .map(([, , body]) => body);
  expect(bodies.length, `${selector} must appear in at least one rule`).toBeGreaterThan(0);
  return bodies.join("\n");
}

const token = (css: string, selector: string, name: string): string => {
  const m = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(block(css, selector));
  expect(m, `${name} must be defined on ${selector}`).not.toBeNull();
  return m![1].trim();
};

describe("every token the grid READS resolves to a definition", () => {
  it("reads at least one — a zero-length sweep would pass against an empty file", () => {
    expect([...LIB.matchAll(/var\((--[a-z0-9-]+)/gi)].length).toBeGreaterThan(10);
  });

  it("and no rule reads a token that does not exist", () => {
    const read = new Set([...LIB.matchAll(/var\((--[a-z0-9-]+)/gi)].map((m) => m[1]));
    for (const name of read) {
      /* A definition is `--x:` anywhere in the manuscripts sheet set. `--msv-hue`/`--msv-huec`
         resolve one further hop, to --sd-hue/--sd-centre in index.css — manuscripts.css defines
         them, so they are caught here like any other. */
      const defined = new RegExp(`${name}\\s*:`).test(DEFINED_IN);
      expect(defined, `${name} is read by manuscriptLibrary.css and defined nowhere`).toBe(true);
    }
  });
});

describe("the meter's two roles are declared in every theme", () => {
  it.each(THEMES)("%s defines both", (sel) => {
    expect(token(LIB, sel, "--mlib-segon")).toBeTruthy();
    expect(token(LIB, sel, "--mlib-segoff")).toBeTruthy();
  });

  /**
   * A token defined in two files is a silent override — which one wins becomes load order.
   *
   * ⚠️ ONE NAMED EXCEPTION, AND IT IS A CONTRIBUTION RATHER THAN AN OVERRIDE. `workspacePageGrid.css`
   * states its `padding-bottom` as a `calc()` sum precisely so a page can contribute to it without
   * replacing anything — a page and a component both writing one property must SUM through tokens,
   * because raising specificity makes one replace the other.
   *
   * ⚠️ `--wpg-reclaim-pad` HAS LEFT THIS LIST WITH THE SETTLE. It was the second term: the working
   * state's compensation for a masthead that shed height when it pinned. Nothing settles now, so
   * the sum has one term — and the SHAPE is kept anyway, because the collision it solves is still
   * live. Listed BY NAME, not as a `--wpg-*` wildcard, so a third grid token cannot slip in behind
   * this allowance.
   */
  const PAGE_CONTRIBUTIONS = new Set(["--wpg-foot"]);

  it("and the grid redefines nothing the plate or page sheets already own", () => {
    const mine = new Set(
      [...LIB.matchAll(/(--mlib-[a-z0-9-]+)\s*:/gi)].map((m) => m[1])
    );
    expect(mine.size).toBeGreaterThan(0);
    for (const name of [...LIB.matchAll(/(--[a-z0-9-]+)\s*:/gi)].map((m) => m[1])) {
      if (mine.has(name) || PAGE_CONTRIBUTIONS.has(name)) continue;
      expect(name, `${name} is redefined by the library sheet`).toBe("");
    }
  });

  /**
   * ⚠️ THE DEAD BAND UNDER THE DOSSIER CARD WAS THE SCROLL ROW'S OWN `padding-bottom`, not a height
   * lost anywhere in the chain — the working state's `--wpg-reclaim-pad`, which compensated a
   * SCROLLING page for the header shedding height when it pinned, landing on a page whose dossier
   * did not scroll. Both the reclaim and the settle it answered are deleted; the value stated here
   * is what the page actually wants.
   */
  it("states the dossier's foot inset as a value, because the token it mirrored is retired", () => {
    /* ⚠️ AMENDED (in-flow masthead, step 4). This asserted `--wpg-foot: var(--content-top-gap)` —
       the dossier's bottom inset reading the TOP gap's own token, so the two ends matched by
       construction rather than by two numbers someone had aligned. That was the right shape while
       a chrome hairline owned the top gap. The masthead states its own rhythm now, and in the
       dossier it is collapsed to nothing, so there is no top inset left to mirror; the token is
       deleted and the value — 44px, exactly what it resolved to — is stated here instead.
       ⚠️ AND THE RECLAIM OPT-OUT GOES WITH THE RECLAIM. `--wpg-reclaim-pad` compensated for a
       header collapse that no longer happens; a rule zeroing a token nothing reads is a rule about
       nothing. */
    const r = rule(LIB, ".msv-wpg.wpg--fill > .wpg-scroll");
    expect(r).toContain("--wpg-foot: 44px");
    expect(r, "the reclaim opt-out survived the reclaim").not.toContain("--wpg-reclaim-pad");
    expect(r, "the foot went back to borrowing a retired token").not.toContain("--content-top-gap");
  });

  /* ⚠️ NO HEIGHT ARITHMETIC ANYWHERE — the height arrives from the grid row and is passed down. */
  it("computes the dossier's height from nothing of its own", () => {
    expect(LIB).not.toMatch(/height:\s*calc/);
    expect(LIB).not.toContain("dvh");
  });
});

describe("Editorial stays monochrome", () => {
  const edn = (name: string) => token(LIB, ".t-edn  .msv1", name);

  it.each(["--mlib-segon", "--mlib-segoff"])("%s carries no hue", (name) => {
    const hex = edn(name);
    expect(hex, `${name} must be a hex so its chroma can be measured`).toMatch(/^#[0-9a-f]{6}$/i);
    const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    const chroma = Math.max(...ch) - Math.min(...ch);
    expect(chroma, `${hex} carries a hue (chroma ${chroma}) and Editorial is monochrome`).toBeLessThanOrEqual(6);
  });

  /* A filled segment and an empty one must stay distinguishable once hue is gone — by value. */
  it("and its filled segment still reads against its empty one", () => {
    const v = (name: string) => parseInt(edn(name).slice(1, 3), 16);
    expect(Math.abs(v("--mlib-segon") - v("--mlib-segoff"))).toBeGreaterThanOrEqual(24);
  });
});

/**
 * ⚠️ THE HEIGHT CHAIN IS RETIRED, AND THIS ASSERTS ITS ABSENCE RATHER THAN ITS SHAPE.
 *
 * It used to be four elements — `.msv-wrap--doss`, `.msv-doss`, `.msv-dcard`, `.msv-dpane` — each
 * claiming `flex: 1; min-height: 0`, and the block here checked every link, because a missing one
 * is invisible: the page measured working, the SCROLL ROW scrolled 1810px while the pane, 1456px
 * tall, scrolled not at all, and every element was mounted, styled and correct.
 *
 * The chain existed for one reason. The dossier sat in a card that CLIPPED (`overflow: hidden`), so
 * its pane had to scroll inside that card, so every ancestor had to hand it a definite height, so
 * the page had to be `fill`. Removing the card's frame is a look; removing its clip is what let the
 * page scroll as a page — and the chain then had nothing left to do.
 *
 * ⚠️ SO THE FAULT TO GUARD IS NOW THE OPPOSITE ONE: a `flex: 1` left behind on a page with no flex
 * parent applies to nothing, silently, and this repo has twice measured that shape compute to
 * EXACTLY 0 with every child mounted and correct. What is checked is that no link survives, that
 * nothing here opens a second scrollport, and that the page still computes no height of its own.
 */
describe("the dossier flows — no card, no chain, no second scrollport", () => {
  for (const sel of [".msv-wrap--doss", ".msv-dcard", ".msv-dpane"]) {
    it(`${sel} is gone, not merely unused`, () => {
      expect(LIB, `${sel} still has a rule`).not.toMatch(
        new RegExp(`(?:^|\\n)\\s*\\${sel}\\s*[,{]`),
      );
    });
  }

  /* ⚠️ ONE SCROLLPORT ON THE PAGE, AND IT IS THE GRID'S ROW. A nested `overflow` here is what the
     card's clip used to force; anything reintroducing one puts the chrome inside a scrollport it is
     meant to sit above. */
  it("opens no scroller of its own", () => {
    const decls = LIB.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(decls).not.toMatch(/overflow(-y)?\s*:\s*(auto|scroll)/);
  });

  /* A gutter reserved for a scrollbar that cannot appear insets the content for nothing. */
  it("reserves no scrollbar gutter", () => {
    expect(LIB.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("scrollbar-gutter");
  });

  /* No `dvh`, and no arithmetic against a bar height — the height arrives from the grid row. */
  it("computes no height of its own", () => {
    expect(LIB).not.toContain("dvh");
    expect(LIB).not.toMatch(/calc\([^)]*100vh/);
  });
});

describe("the dossier condenses the header by mode", () => {
  const RAW = readFileSync(resolve(__dirname, "../AllManuscripts.tsx"), "utf8");
  /* ⚠️ COMMENTS STRIPPED FIRST — this rule is about CODE. The page's own comment EXPLAINS the union
     by naming `stuck`, so a bare-string sweep flagged the prose describing the decision as if it
     were the decision being broken. It caught this test on its first run. */
  const PAGE = RAW.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("reads as code once the prose is gone — the strip did not empty the file", () => {
    expect(PAGE).toContain("export const AllManuscripts");
    expect(PAGE).not.toContain("⚠️");
  });

  it("no longer folds the masthead when a dossier opens — that is the writer's call", () => {
    /* ⚠️ AMENDED (masthead rethink, step 4): the dossier no longer folds the masthead. It used to
       pass `condensed={!!selected}` — sound reasoning (the panes scroll internally, so the header
       was spending height nobody was choosing from) with the wrong MECHANISM: it inferred that the
       writer had started working, which is the guess the click-anywhere vanish also made. The fold
       is an explicit Hide now, on this page as on every fill page. */
    expect(PAGE, "the dossier folds the masthead again — that decision is the writer's now")
      .not.toContain("condensed={");
  });

  /* ⚠️ AND SYNTHESISES NO SCROLL SIGNAL TO GET THERE — two sources of truth for one state, with no
     way to reconcile them, is the failure the grid's own comment forbids. */
  it("and invents no scroll signal of its own", () => {
    for (const s of ["scrollTop", "IntersectionObserver", "stuck", "onScroll"]) {
      expect(PAGE, `the page grew its own scroll signal (${s})`).not.toContain(s);
    }
  });
});

describe("the card's structure holds the rules that make it work", () => {
  /**
   * ⚠️ `margin-top: auto` IS WHAT LINES THE METERS UP. Cards in a row have loglines of different
   * lengths; without it each meter sits directly under its own prose and the row reads as ragged.
   */
  it("pins the meter to the card's foot", () => {
    expect(block(LIB, ".mlib-meter")).toContain("margin-top: auto");
  });

  /**
   * ⚠️ THE SEGMENT CONTAINER MUST NOT BE A PREFIX OF THE SEGMENT CLASS. `mlib-segs` wrapping
   * `mlib-seg` made every prefix-matching selector and test read the container as a fifth segment —
   * it did exactly that when this card was built.
   */
  it("keeps the meter row's class clear of the segment's prefix", () => {
    expect(LIB).toContain(".mlib-meterrow");
    expect(LIB).not.toContain(".mlib-segs");
  });

  /**
   * ⚠️ A CARD FLUSH TO A CLIPPING BOUNDARY HOVERS BY SHADOW, NEVER BY LIFT — the rule the spine and
   * the detail tiles already carry, and which was lost once before by an in-flight revision.
   */
  it("hovers by shadow, never by lift", () => {
    const hover = rule(LIB, ".mlib-book:hover");
    expect(hover).toContain("box-shadow");
    expect(hover).not.toContain("translate");
    /* And nowhere else on the card either — a lift added to the resting rule is the same bug. */
    expect(rule(LIB, ".mlib-book")).not.toContain("translate");
  });
});
