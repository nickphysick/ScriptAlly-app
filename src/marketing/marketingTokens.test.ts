/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Marketing tier surface tokens — read as SOURCE, deliberately. These are claims about which
 * values the stylesheet emits, which is exactly what a source lock is for; the claims about what
 * the browser then DOES with them (the two surfaces, the boundary, the contrast) are measured on
 * a rendered page instead.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const css = (f: string) => readFileSync(resolve(here, f), "utf8");
/** ⚠️ Comments first — this file's prose names every value it retires. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const marketing = decls(css("marketing.css"));

/**
 * Every marketing component's source, as `[filename, text]`. Comments are NOT stripped: the check
 * that uses this looks for a class name inside a `className` attribute, and a prose mention would
 * be a false positive rather than a false negative — the direction that costs an hour, not a bug.
 */
const SOURCES: Array<[string, string]> = readdirSync(here)
  .filter((f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx"))
  .map((f) => [f, readFileSync(resolve(here, f), "utf8")]);
const app = decls(css("../index.css"));

const value = (src: string, token: string) => {
  const m = new RegExp("\\" + token + "\\s*:\\s*([^;]+);").exec(src);
  return m ? m[1].trim() : null;
};

/**
 * The stylesheet with every `@media` / `@supports` / `@keyframes` BODY removed, so what is left is
 * the base cascade — the rules that apply at every width. An override inside a media query is the
 * legitimate way to restate a property and must not be counted as a duplicate of it.
 */
const baseCss = (() => {
  let out = "", i = 0;
  for (;;) {
    const m = /@(?:media|supports|keyframes)[^{]*\{/.exec(marketing.slice(i));
    if (!m) return out + marketing.slice(i);
    out += marketing.slice(i, i + m.index);
    let j = i + m.index + m[0].length, depth = 1;
    while (j < marketing.length && depth) {
      if (marketing[j] === "{") depth++;
      else if (marketing[j] === "}") depth--;
      j++;
    }
    i = j;
  }
})();

/** Every BASE rule body for a selector, in source order. A grouped rule counts for each member. */
const baseRules = (sel: string): string[] => {
  const bodies: string[] = [];
  for (const m of baseCss.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)) {
    if (m[1].split(",").some((s) => s.trim() === sel)) bodies.push(m[2]);
  }
  return bodies;
};

/**
 * The declarations of a rule whose selector is EXACTLY `sel`.
 *
 * ⚠️ ANCHORED AT A LINE START, AND THAT IS NOT FUSSINESS. A bare `.mk-beta\s*\{` also matches the
 * tail of `.mk-fw .mk-beta {` — so the moment a page scoped an override to that selector, every
 * assertion about the base rule silently began reading a two-line block that happened to come
 * first. Measured: two locks went red claiming the founding band declared no background, about a
 * band whose background had not changed. First-match slicing is a fault this repo has met three
 * times; this is the same one wearing a descendant selector.
 */
const ruleFor = (sel: string): string => {
  const all = baseRules(sel);
  expect(all.length, `${sel} has a rule of its own`).toBeGreaterThan(0);
  /* ⚠️ AND IT MUST HAVE EXACTLY ONE, or this helper is reading a rule the browser does not apply.
     Every lock in this file goes through here, so the guard belongs here rather than in each of
     them: `ruleFor` takes the FIRST base rule, the cascade takes the LAST, and where a selector is
     declared twice those are different blocks. That is not hypothetical — the ref this pass was
     drawn from carries four such selectors, and the brief quoted the SUPERSEDED value of one of
     them, because reading the file top-down is how a person reads it too. */
  expect(all.length, `${sel} is declared ${all.length} times at base level — ruleFor would read ` +
    "the first while the browser applies the last").toBe(1);
  return all[0];
};

describe("the hero's ground is a documented copy of the app's, not a reference to it", () => {
  /**
   * ⚠️ THIS TEST IS THE WHOLE REASON THE COPY IS ALLOWED. A direct `var(--ws-ground)` from the
   * marketing tier would never drift, but it makes a marketing surface depend on a workspace
   * token whose owner has no idea marketing reads it — and the tier's stated discipline is that
   * its palette is self-contained. The copy keeps the tiers independent; this assertion is what
   * stops the copy going stale in silence.
   *
   * ⚠️ AND IT ASSERTS AGAINST THE APP'S FILE, NOT AGAINST A LITERAL ON BOTH SIDES. A hand-written
   * hex in this test would go green the day someone changed both the app and the test and left
   * marketing behind. Two derivations against each other, per the house rule.
   */
  it("--mk-hero-ground equals --ws-ground", () => {
    const ws = value(app, "--ws-ground");
    expect(ws).toBeTruthy();
    expect(value(marketing, "--mk-hero-ground")).toBe(ws);
  });

  /**
   * ⚠️ `--ws-ground` MUST STAY UN-THEMED FOR THE COPY TO MEAN ANYTHING. It is declared once at
   * bare `:root` today. If a theme class ever overrides it, "the hero sits on the app's ground"
   * stops being a single value and this copy starts describing one theme out of three.
   */
  it("--ws-ground is declared exactly once in the app", () => {
    expect(app.match(/--ws-ground\s*:/g) ?? []).toHaveLength(1);
  });
});

describe("two surfaces, and the step between them is real", () => {
  /**
   * ⚠️ THE BOUNDARY IS MARKED BY COLOUR ALONE, so the step has to be big enough to read as one.
   * An earlier plan put the lower surface at #f9f6f1 — LIGHTER than the hero, a ~2-point step
   * inside perceptual noise, with the parchment cards below flattening out on it. This asserts
   * the direction and a floor on the size; it does not pin the value, which is Nick's to move.
   */
  it("the lower surface is darker than the hero's, by a margin that reads", () => {
    const hex = (t: string) => {
      const v = value(marketing, t)!;
      const m = /^#([0-9a-f]{6})$/i.exec(v);
      expect(m, `${t} should be a plain 6-digit hex, got ${v}`).toBeTruthy();
      return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16));
    };
    const hero = hex("--mk-hero-ground");
    const lower = hex("--mk-lower");
    const mean = (c: number[]) => c.reduce((a, b) => a + b, 0) / 3;
    expect(mean(lower)).toBeLessThan(mean(hero));
    expect(mean(hero) - mean(lower)).toBeGreaterThanOrEqual(4);
  });

  /** One token, so changing the surface is one line. */
  it("--mk-lower has exactly one definition and one reader", () => {
    expect(marketing.match(/--mk-lower\s*:/g) ?? []).toHaveLength(1);
    expect(marketing.match(/var\(--mk-lower\)/g) ?? []).toHaveLength(1);
  });

  /**
   * ⚠️ THE RETIRED PARCHMENT BAND MUST NOT COME BACK. It was a third surface inside the second,
   * and its hairlines competed with the colour boundary that now does that job. `--mk-parch`
   * itself stays — twelve other surfaces read it, including the hero's paper slip.
   */
  it("the features band paints no background and no hairlines", () => {
    const rule = /\.mk-featband\s*\{([^}]*)\}/.exec(marketing);
    expect(rule).toBeTruthy();
    expect(rule![1]).not.toMatch(/background/);
    expect(rule![1]).not.toMatch(/border/);
  });
});

/**
 * ⚠️ THE CONTAINER-CAP PRE-CHECK, AS A TEST RATHER THAN AS A HABIT. A `clamp(min, Nvw, max)` must
 * reach its ceiling at or BEFORE the container it sits in stops growing. Past the cap the measure
 * is frozen, so anything still climbing is type growing against a fixed column — invisible at the
 * width a ref was drawn at, and the reason the landing statement broke to three lines at 1440
 * while holding two at 1280.
 *
 * This has now decided five numbers in this project (the statement's 5rem → 3.65rem → 3rem, the
 * lede's constant, `.mk-turn-b`'s 1.7rem, About's mission 2.65rem). It is one division —
 * `max / N` against the cap — so it belongs in a lock, not in a paragraph someone has to
 * remember to re-read.
 *
 * ⚠️ IT ASSERTS THE RELATION, NOT THE VALUES. Pinning "3rem" and "1300" would go red on every
 * legitimate redesign and train the next person to rebaseline it without reading it; pinning the
 * relation stays true through any redesign that is correct and fails every one that is not.
 */
describe("every viewport-scaled clamp reaches its ceiling before its container stops growing", () => {
  /** `max-width` of the box each token's text is measured inside. */
  const CONTAINERS: Record<string, { selector: string; token: string }> = {
    "--mk-hero-h1": { selector: ".mk-heroinner", token: "--mk-hero-h1" },
  };

  /** The `max-width` a selector declares, in px. */
  const capOf = (selector: string) => {
    const m = /max-width\s*:\s*([\d.]+)px/.exec(ruleFor(selector));
    expect(m, `${selector} declares a px max-width`).toBeTruthy();
    return parseFloat(m![1]);
  };

  /** The viewport width at which `clamp(min, Nvw, max)` first reaches `max`. */
  const ceilingReachedAt = (token: string) => {
    const raw = value(marketing, token);
    expect(raw, `${token} is declared`).toBeTruthy();
    const m = /clamp\(\s*[\d.]+rem\s*,\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)/.exec(raw!);
    expect(m, `${token} is a clamp(min, Nvw, max)`).toBeTruthy();
    const vw = parseFloat(m![1]);
    const maxPx = parseFloat(m![2]) * 16;
    return maxPx / (vw / 100);
  };

  for (const [name, { selector, token }] of Object.entries(CONTAINERS)) {
    it(`${name} tops out inside ${selector}'s cap`, () => {
      const reached = ceilingReachedAt(token);
      const cap = capOf(selector);
      expect(
        reached,
        `${name} reaches its ceiling at ${Math.round(reached)}px, past ${selector}'s ${cap}px cap — ` +
        `between those widths the type grows against a frozen measure`,
      ).toBeLessThanOrEqual(cap);
    });
  }
});

/**
 * ⚠️ EVERY `var(--mk-…)` THIS SHEET READS MUST RESOLVE TO A DECLARATION — the missing-custom-
 * property guard, pointed from CONSUMPTION to DEFINITION.
 *
 * A `var()` naming a property nobody declares does not error and does not warn. Where there is no
 * fallback the whole declaration is DROPPED, so the surface paints nothing; where there is one,
 * the rule looks parameterised and is not, and a grep for the token's definition finds nothing —
 * which reads as "already cleaned" rather than as "still read". Both go green through a build and
 * a suite.
 *
 * ⚠️ THE DIRECTION IS THE POINT. Checking that what you wrote arrived cannot catch what you
 * referenced and never wrote. The shell sheets have carried this lock since a `calc()` on an
 * undefined token rendered the app's only active marker 0px wide through 2,259 green tests; the
 * public pages are a harder place to find out, because nobody is signed in to notice.
 */
describe("no marketing rule reads a token that does not exist", () => {
  const declared = new Set(
    [...marketing.matchAll(/(--mk-[a-z0-9-]+)\s*:/g)].map((m) => m[1]),
  );
  const read = [...marketing.matchAll(/var\(\s*(--mk-[a-z0-9-]+)/g)].map((m) => m[1]);

  it("reads at least the tokens we know about (the scan is not vacuous)", () => {
    expect(read.length).toBeGreaterThan(40);
    expect(declared.size).toBeGreaterThan(30);
  });

  it("every token read is declared", () => {
    const missing = [...new Set(read)].filter((t) => !declared.has(t)).sort();
    expect(missing, `read but never declared: ${missing.join(", ")}`).toEqual([]);
  });

  /**
   * ⚠️ AND THE INVERSE IS A DIFFERENT, WEAKER CLAIM, kept because a token nobody reads is a knob
   * that does nothing — the next person to open the file goes looking for what it controls.
   */
  it("every token declared is read somewhere", () => {
    const readSet = new Set(read);
    const unread = [...declared].filter((t) => !readSet.has(t)).sort();
    expect(unread, `declared but never read: ${unread.join(", ")}`).toEqual([]);
  });
});

/**
 * ⚠️ THE FOUNDING BAND IS THE ONE PLACE INSIDE `.mk-lower` THAT REPAINTS THE GROUND, and that is
 * a decision rather than a drift. The two-surface rule exists because the retired parchment band
 * repainted by accident, over its whole height, flattening the cards on it. A bounded band with a
 * hairline declaring its top edge is a section; an unbounded repaint is a seam. This asserts the
 * count is ONE, so a second one has to be argued for rather than added.
 */
describe("the founding band is the lower surface's only repaint", () => {
  it("declares a ground and a top hairline", () => {
    const decls = ruleFor(".mk-beta");
    expect(decls).toMatch(/background:\s*var\(--mk-blush\)/);
    expect(decls).toMatch(/border-top:\s*1px solid var\(--mk-blush-line\)/);
  });

  it("and it is the only ground repaint under the wrapper", () => {
    /* Sections that sit inside `.mk-lower`, by the classes `Landing` renders there. */
    const INSIDE = [".mk-sect", ".mk-featband", ".mk-beta", ".mk-foot"];
    const painted = INSIDE.filter((sel) => /background(?!-image)\s*:/.test(ruleFor(sel)));
    expect(painted).toEqual([".mk-beta"]);
  });
});

/**
 * ⚠️ `align-items` ON A GRID IS A ROW DEFAULT; PER-ITEM ALIGNMENT BELONGS ON THE ITEM. The hero
 * needs `start` for the copy column and `center` for the artwork, and the way to get both is one
 * container default plus one `align-self` override — not a container set to `center` and the copy
 * pushed back with something else. Inherited `start` is what pinned the plate to the top-left of
 * its cell; the override is the fix, and it goes on the plate.
 *
 * ⚠️ AND THE OVERLAP, IF ANY, IS NATURAL SIZE PLUS CENTRING — NEVER A NEGATIVE MARGIN. A centred
 * box taller than its row extends past it by itself; an offset draws the same picture and then has
 * to be re-tuned on every copy edit, because the row's height is whatever the copy makes it.
 */
describe("the hero grid aligns per item, and overlaps by construction", () => {
  const rule = ruleFor;

  it("the container states the row default and the artwork overrides it on itself", () => {
    expect(rule(".mk-heroinner")).toMatch(/align-items:\s*start/);
    const art = rule(".mk-hero .mk-illo--tall");
    expect(art).toMatch(/align-self:\s*center/);
    /* The container must NOT be the thing that centres — that would move the copy column too. */
    expect(rule(".mk-heroinner")).not.toMatch(/align-items:\s*center/);
  });

  /**
   * ⚠️ RETARGET, AND THE CLAIM NARROWS RATHER THAN RELAXES. The rule was "no negative margin
   * anywhere in the hero", written when one would only ever have been faking an alignment the
   * layout should produce. The artwork now carries `margin-right: -56px` DELIBERATELY: it is the
   * bleed itself, cancelling the container's own 56px gutter so the plate reaches the page edge.
   * That is the effect, not a substitute for it.
   *
   * So the text items keep the absolute prohibition, and the plate is allowed exactly one — a
   * right margin that equals the gutter it cancels. A different value, or a negative margin on any
   * other side, is back to faking.
   */
  it("no text item in the hero fakes the layout with a negative margin", () => {
    for (const sel of [".mk-heroinner", ".mk-hcopy", ".mk-statement", ".mk-statementrow", ".mk-turn"]) {
      expect(rule(sel), `${sel} uses no negative margin`).not.toMatch(/margin[^:]*:\s*[^;]*-\d/);
    }
  });

  /**
   * ⚠️ THE ISOLATION AND THE NEGATIVE Z ARE ONE MECHANISM AND FAIL TOGETHER. The burst is
   * `z-index: -1` so it tucks behind the headline; a negative-z child paints behind the
   * BACKGROUNDS of every ancestor up to the nearest stacking context, so without `isolation` on
   * the row it sinks behind the hero's own ground and disappears — the rule applying perfectly
   * and nothing painted, which is the marketing halo's fault exactly.
   *
   * Asserted as a PAIR rather than as two properties, because either one alone is meaningless
   * and someone removing the isolation as an unused declaration is the way this breaks.
   */
  it("the burst's negative z-index is paired with a stacking context to live in", () => {
    expect(rule(".mk-heroburst"), "the burst tucks behind the words").toMatch(/z-index:\s*-1/);
    expect(rule(".mk-statementrow"), "…and the row gives it a context to be behind them IN")
      .toMatch(/isolation:\s*isolate/);
  });

  /**
   * ══════════════ One class, one surface ══════════════
   *
   * ⚠️ A CLASS THAT CARRIES `pointer-events: none` OR A NEGATIVE `z-index` MAY BE RENDERED BY ONE
   * COMPONENT AND ONE ONLY — because when it lands on a second, that page becomes INVISIBLE AND
   * INERT rather than merely wrong, and nothing anywhere reports it.
   *
   * This is not hypothetical. The hero's burst was introduced as `.mk-fw`; `/founders` had
   * rendered `<div class="mk-fw">` as its PAGE WRAPPER since the eighth pass — the root of its own
   * `mk-fw*` namespace. So a rule written for a 132px image landed on a 7,000px page: `z-index:
   * -1` painted the whole thing behind the page ground, `pointer-events: none` made every control
   * on it inert, and `width: 132px` squeezed it. It reached dev.
   *
   * ⚠️ AND EVERY INSTRUMENT SAID IT WAS FINE. Nothing threw, no console error, the route resolved,
   * `innerText` returned all 2,084 characters of the page's copy and `getBoundingClientRect`
   * reported a 7,263px-tall element. Text and geometry survive being painted behind the ground;
   * only a screenshot — or this lock — can tell. The repo already records that a computed
   * `z-index` proves the declaration took and never that anything was drawn.
   *
   * THE CHECK IS THE RENDERER COUNT, NOT THE NAME. A naming convention is advice; this fails.
   */
  it("no invisibility-making class is rendered by two different components", () => {
    const RISKY = /pointer-events:\s*none|z-index:\s*-/;
    const owners: Record<string, string[]> = {};
    for (const m of marketing.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)) {
      if (!RISKY.test(m[2])) continue;
      for (const raw of m[1].split(",")) {
        const sel = raw.trim();
        /* Single-class selectors only — a descendant selector cannot collide this way. */
        const cls = sel.match(/^\.(mk-[a-z0-9-]+)$/);
        if (cls) owners[cls[1]] = [];
      }
    }
    expect(Object.keys(owners).length, "the sweep found classes to check").toBeGreaterThan(1);
    for (const cls of Object.keys(owners)) {
      const bounded = new RegExp(`["\\s\`]${cls}["\\s\`]`);
      owners[cls] = SOURCES.filter(([, src]) => bounded.test(src)).map(([name]) => name);
    }
    const clashes = Object.entries(owners).filter(([, who]) => who.length > 1);
    expect(clashes, "a class that hides what it touches belongs to one component").toEqual([]);
  });

  /**
   * ⚠️ THE HERO ALLOWS EXACTLY TWO NEGATIVE MARGINS AND BOTH ARE THE EFFECT ITSELF: the plate's
   * bleed past the gutter, and the burst's pull back over the headline's last word. Neither
   * substitutes for an alignment the layout could produce — there is no layout that puts one
   * element behind the tail of another.
   *
   * The claim is the SET, not the values. `.mk-fw`'s offsets are fixed pixels against type that
   * is not, so they will legitimately be re-tuned; pinning them would be a lock that has to be
   * rewritten every time the headline's clamp moves, which is a lock being weakened on schedule.
   * A sixth selector appearing here is the thing worth failing on.
   *
   * ⚠️ SWEPT OVER THE WHOLE SHEET, NOT A SLICE OF IT. The first version of this sliced from
   * `.mk-hero {` to `.mk-featband` — and the plate's rule lives eight hundred lines further down,
   * so the slice covered neither of the two it was written about while quietly reporting a third.
   * The hero's rules are not contiguous, and a positional slice over a file that does not group
   * by feature answers a question nobody asked.
   */
  it("…and the whole sheet's negative margins are the five that are meant to be there", () => {
    const owners = new Set<string>();
    for (const m of marketing.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)) {
      if (/margin[^:]*:\s*[^;]*-\d/.test(m[2])) m[1].split(",").forEach((x) => owners.add(x.trim()));
    }
    expect([...owners].sort()).toEqual([
      /* the plate, bleeding past the container's own gutter to the page edge */
      ".mk-hero .mk-illo--tall",
      /* the burst, pulled back over the headline's last word */
      ".mk-heroburst",
      /* both sentinels cancel their own height so they occupy no space */
      ".mk-navsentinel--condense",
      ".mk-navsentinel--release",
      /* the highlighter stroke reaches past the text it marks */
      ".mk-turn-lead",
    ]);
  });

  it("…and the plate's one negative margin is exactly the gutter it cancels", () => {
    const art = rule(".mk-hero .mk-illo--tall");
    const gutter = /padding:\s*0\s+(\d+)px/.exec(rule(".mk-heroinner"));
    expect(gutter, ".mk-heroinner declares a horizontal padding").toBeTruthy();
    const m = /margin-right:\s*-(\d+)px/.exec(art);
    expect(m, "the plate declares a negative right margin").toBeTruthy();
    expect(m![1], "the bleed must equal the gutter, or it is not a bleed").toBe(gutter![1]);
    /* …and nothing else negative on it. */
    expect(art).not.toMatch(/margin-(top|bottom|left)[^:]*:\s*-\d/);
  });

  /**
   * ⚠️ THE ARTWORK PASSES BEHIND THE WORDS, AND THE LAYERING IS THE GUARANTEE RATHER THAN THE
   * EFFECT. Measured, the plate does not currently reach the headline — its top sits ~54px below
   * the statement's bottom at 1440. Remove the z-indexes and a taller asset, or a shorter copy
   * column, silently prints artwork over the largest text on the site.
   */
  it("the words are layered above the artwork", () => {
    expect(rule(".mk-statement")).toMatch(/z-index:\s*2/);
    expect(rule(".mk-hcopy")).toMatch(/z-index:\s*2/);
    expect(rule(".mk-hero .mk-illo--tall")).toMatch(/z-index:\s*1/);
  });

  /**
   * ⚠️ THE AREAS COLLAPSE WITH THE COLUMNS OR THE GRID GROWS SIDEWAYS IN SILENCE. Auto-placement
   * never overlaps: leaving a two-column template on a one-column grid pushes every `"x x"` row
   * into an implicit SECOND column, and nothing errors.
   */
  /**
   * ⚠️ RETARGET, SAME LAW: the hero places every item by hand now, because the artwork spans rows
   * and a named area cannot overlap another item's. So the thing that must collapse with the
   * columns is the PLACEMENTS, not a template. An item left at `grid-column: 2` on a one-column
   * grid is pushed into an implicit second column and the grid grows sideways in silence — the
   * same auto-placement trap, reached by a different route.
   */
  it("the stacked hero collapses its placements as well as its columns", () => {
    const block = /@media \(max-width: 900px\) \{([\s\S]*?)\n\}/.exec(marketing);
    expect(block, "the 900px block exists").toBeTruthy();
    expect(block![1]).toMatch(/grid-template-columns:\s*1fr/);
    /* Every item the two-column grid places by hand is put back into column 1. */
    for (const sel of [".mk-statement", ".mk-hcopy", ".mk-turn", ".mk-found"]) {
      expect(block![1], `${sel} returns to column 1 when stacked`).toContain(sel);
    }
    /* And the areas are gone entirely — a stale template is worse than none. */
    expect(marketing).not.toContain("grid-template-areas");
  });
});

/**
 * ⚠️ A SINGLE-CLASS RULE FOR ONE ELEMENT INSIDE A SECTION THAT ALSO STYLES ITS ELEMENTS
 * GENERICALLY WILL LOSE, AND LOSE SILENTLY. `.mk-fwhonest p` is 0-1-1 — a class and an element —
 * and a bare `.mk-fwlead` is 0-1-0, so the broad paragraph rule outranks the specific one on every
 * property it happens to set.
 *
 * Measured: the lifted line and the quote mark both computed at 16px against an intended 28px and
 * 3.4rem. **And the fault predates the pass that found it** — `.mk-fwsign` had been losing its
 * COLOUR to the same rule since the page shipped, rendering `rgb(138, 122, 108)` on the deployed
 * build where the rule asks for burgundy. It survived because `.mk-fwhonest p` did not set a
 * font-size then, so the Caveat face came through and the signature looked right at a glance.
 *
 * This asserts the scoping rather than the values, so it stays true through any restyle and fails
 * the moment someone "tidies" a selector back to its bare class.
 */
describe("every specific rule on /founders outranks the generic one beside it", () => {
  /**
   * ⚠️ THE CARDS' KICKER IS IN THIS LIST BECAUSE THE SWEEP FOUND IT, NOT BECAUSE THE BRIEF DID.
   * `.mk-fwcard p` beat `.mk-fwk` exactly as `.mk-fwhonest p` beat the other three — measured, the
   * kicker rendered at 15.68px in `--mk-muted` where the rule asked for .55rem in `--mk-kicker`,
   * THROUGH a phase written to retune it. The mono face, tracking and uppercase came through
   * because the generic rule does not set those, which is why it still looked like a kicker.
   * The lesson is the one this repo already records about symptom reports: scan for the fault
   * CLASS, do not treat the element you were pointed at as the search space.
   */
  const SCOPED = [
    ".mk-fwcard .mk-fwk",
    ".mk-fwhonest .mk-fwmark", ".mk-fwhonest .mk-fwlead", ".mk-fwhonest .mk-fwsign",
  ];

  it("each element rule is scoped to the section", () => {
    for (const sel of SCOPED) {
      expect(
        new RegExp("(?:^|\\n)\\s*" + sel.replace(/\./g, "\\.") + "\\s*\\{").test(marketing),
        `${sel} is declared scoped`,
      ).toBe(true);
    }
  });

  it("…and none of them is ALSO declared bare, where the generic rule would beat it", () => {
    for (const sel of SCOPED) {
      const bare = sel.split(" ")[1];
      expect(
        new RegExp("(?:^|\\n)\\s*" + bare.replace(/\./g, "\\.") + "\\s*\\{").test(marketing),
        `${bare} must not be declared unscoped — .mk-fwhonest p would outrank it`,
      ).toBe(false);
    }
  });

  /** The generic rules that do the outranking are still there — not a licence to delete them. */
  it("the generic paragraph rules they compete with are still declared", () => {
    expect(/(?:^|\n)\s*\.mk-fwhonest p\s*\{/.test(marketing)).toBe(true);
    expect(/(?:^|\n)\s*\.mk-fwcard p\s*\{/.test(marketing)).toBe(true);
  });
});

/**
 * ⚠️ WHEN TYPE AND MEASURE MUST NOT DIVERGE, THE MEASURE BELONGS IN THE TYPE'S OWN UNITS.
 *
 * The hero's turn is 89 characters that cannot hold one line, so its line count is the thing under
 * control. A `rem` measure is FROZEN — the ref's `33rem` is 528px at every width — while its
 * `1.68vw` type grows until 1276px, so between ~1050 and there the type climbs against a fixed
 * column and the count can flip to three. Expressed in `em` on the element that sets the
 * font-size, the two grow together and the count becomes a property of the SENTENCE rather than
 * of the viewport.
 *
 * This is the same carve-out `/founders`'s lifted line carries, and it is the second time this
 * month the fix has been to change the UNIT rather than the value. Asserting the unit is what
 * stops the next person tidying it to `rem` — where it would look consistent with every other
 * measure in the sheet and be the one place that must not be.
 */
describe("measures that must track their type are expressed in `em`", () => {
  const IN_EM = [".mk-turn", ".mk-fwhonest .mk-fwlead"];

  it("each is declared with a max-width in `em` or `ch`, never `rem` or `px`", () => {
    for (const sel of IN_EM) {
      const m = new RegExp("(?:^|\\n)\\s*" + sel.replace(/\./g, "\\.") + "\\s*\\{([^}]*)\\}").exec(marketing);
      expect(m, `${sel} has a rule`).toBeTruthy();
      const mw = /max-width:\s*([\d.]+)(em|ch|rem|px|%)/.exec(m![1]);
      expect(mw, `${sel} declares a max-width`).toBeTruthy();
      expect(["em", "ch"], `${sel} measures in ${mw![2]} — it must track its own type`)
        .toContain(mw![2]);
    }
  });

  /** …and each of them sets the font-size the measure is counting. */
  it("…on the element that sets the font-size it is counting", () => {
    for (const sel of IN_EM) {
      const m = new RegExp("(?:^|\\n)\\s*" + sel.replace(/\./g, "\\.") + "\\s*\\{([^}]*)\\}").exec(marketing);
      expect(m![1], `${sel} sets its own font-size`).toMatch(/font-size:/);
    }
  });
});

/**
 * ══════════════ One selector, one statement of each property ══════════════
 *
 * ⚠️ THE FAULT IS A SECOND DECLARATION THAT SILENTLY WINS, AND IT IS INVISIBLE TO EVERY READER WHO
 * STOPS AT THE FIRST. A selector may legitimately appear twice — a shared group (`.a, .b { … }`)
 * followed by a specialisation (`.a { … }`) is the normal idiom and is not this. The fault is the
 * same PROPERTY stated twice for the same selector at base level: the earlier value is dead, the
 * source reads as though it applies, and anyone patching it patches the loser.
 *
 * It is not a hypothetical. The ref this pass was drawn from carries four selectors with two base
 * rules each — and the brief written from it quoted the superseded value of `.fm-count`, because
 * reading top-down is how a person reads a stylesheet. It is also why `ruleFor` above now refuses
 * a selector with more than one base rule: this file's locks would otherwise assert about the
 * block the browser discards.
 */
describe("no base selector states the same property twice", () => {
  const repeats = (): Record<string, string[]> => {
    const seen: Record<string, string[]> = {};
    for (const m of baseCss.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)) {
      const props = m[2].split(";").filter((d) => d.includes(":"))
        .map((d) => d.slice(0, d.indexOf(":")).trim()).filter(Boolean);
      for (const raw of m[1].split(",")) {
        const sel = raw.trim().replace(/\s+/g, " ");
        if (sel) (seen[sel] ||= []).push(...props);
      }
    }
    const out: Record<string, string[]> = {};
    for (const [sel, props] of Object.entries(seen)) {
      const twice = [...new Set(props)].filter((p) => props.filter((q) => q === p).length > 1);
      if (twice.length) out[sel] = twice.sort();
    }
    return out;
  };

  it("scans the whole stylesheet, not a fragment of it (the sweep is not vacuous)", () => {
    const sels = new Set<string>();
    for (const m of baseCss.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)) {
      m[1].split(",").forEach((s) => sels.add(s.trim()));
    }
    expect(sels.size, "base selectors scanned").toBeGreaterThan(300);
    expect(baseCss).not.toContain("@media");
  });

  /**
   * ⚠️ NO EXEMPTIONS, AND THE ONE THIS SWEEP FOUND WAS FIXED RATHER THAN LISTED. `.mk-foot` stated
   * `display` twice — flex for the single-row footer the shared footer superseded, then block two
   * hundred lines later — so `align-items` and `gap` were describing a layout that no longer
   * existed. Folding it was render-neutral (both are inert on a block box) and it is worth more
   * than an exemption entry would have been: a sweep that tolerates its own findings teaches the
   * next reader that the finding is acceptable.
   */
  it("…and every selector states each property once", () => {
    expect(repeats()).toEqual({});
  });

  it("the hero and the panel are clean without exemption", () => {
    const mine = Object.keys(repeats())
      .filter((s) => /^\.mk-(hero|hcopy|statement|turn|illo|found|fm)/.test(s));
    expect(mine).toEqual([]);
  });
});
