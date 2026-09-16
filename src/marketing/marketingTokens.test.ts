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

  /**
   * ⚠️ ONE DEFINITION, AND BOTH READERS ARE `.mk-lower`'S OWN — the flat fill, and the end stop of
   * the 80px fade that now marks the join. This used to require exactly ONE reader, which would go
   * red over a change that made the boundary softer: a lock on a count rather than on the claim.
   * The claim is that changing the lower surface is still one line, so nothing OUTSIDE this rule
   * may read the token — that is what would give the colour two homes again.
   */
  it("--mk-lower has one definition, and only its own rule reads it", () => {
    expect(marketing.match(/--mk-lower\s*:/g) ?? []).toHaveLength(1);
    const own = ruleFor(".mk-lower");
    expect((own.match(/var\(--mk-lower\)/g) ?? []).length, "the fill and the fade's end stop").toBe(2);
    expect((marketing.match(/var\(--mk-lower\)/g) ?? []).length, "and nothing else reads it").toBe(2);
    expect(own, "the fade replaced the hairline that used to mark the join")
      .toMatch(/linear-gradient\(180deg,\s*var\(--mk-hero-ground\),\s*var\(--mk-lower\)\s*80px\)/);
    /* ⚠️ SEPARATE LONGHANDS, NEVER THE SHORTHAND. `background:` resets every longhand including
       the colour, so a gradient that failed to parse would leave the whole lower surface
       transparent — through a green build, on a public page. */
    expect(own).toMatch(/background-color:\s*var\(--mk-lower\)/);
    expect(own).not.toMatch(/background:\s/);
  });

  /**
   * ⚠️ AND THE HAIRLINE AT THE JOIN IS GONE, WHICH IS HALF OF WHAT MAKES THE FADE VISIBLE. The
   * status band carried `border-top: 1px solid var(--mk-hair)` at exactly the boundary the fade
   * now crosses. Two separators at one edge is one too many — the rule wins and the fade is
   * wasted — and the line also cut the hero's shadow in half at the one place it is meant to pass
   * through. Asserting its absence is what stops it returning from a diff.
   */
  it("the status band declares no top rule, so the fade has the boundary to itself", () => {
    expect(ruleFor(".mk-statband")).not.toMatch(/border-top/);
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
 * ⚠️ THE GLYPH ROW CAN HIDE ITSELF, AND THIS IS THE LOCK THAT STOPS IT DOING SO PERMANENTLY.
 *
 * The six marks animate in when they are scrolled to, which means their CSS start state is
 * `opacity: 0`. Anything that stops the observer firing therefore leaves six invisible glyphs
 * under a heading that introduces them — on a public page, with nothing to point at and no way
 * back. The defence is that hiding is OPT-IN: `.mk-statglyphs` alone paints six visible marks, and
 * only `--armed` hides them, which `StatusBand` adds during its first render and ONLY where
 * `IntersectionObserver` exists. A browser without the API and `renderToStaticMarkup` both get the
 * plain class.
 *
 * This is the same law the ECG trace it replaced carried from the other end: its play-state
 * default was "running", never "paused", because a browser with no way to start the animation must
 * not be left with a dead line.
 *
 * ⚠️ AND A CLASS THE STYLESHEET SELECTS ON THAT NO COMPONENT EMITS IS A RULE WITH NO SUBJECT —
 * silent in both directions. So this asserts the pair: the rules exist, and the component renders
 * both class names.
 */
describe("the status glyphs animate in once, and the hidden state is opt-in", () => {
  const source = async () => {
    const { readFileSync } = await import("fs");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    return readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "StatusBand.tsx"), "utf8");
  };

  it("the base class paints nothing hidden — only `--armed` does", () => {
    expect(ruleFor(".mk-statglyph"), "the mark itself is simply a 26px box")
      .not.toMatch(/opacity|animation/);
    expect(ruleFor(".mk-statglyphs"), "the row does not hide its own children")
      .not.toMatch(/opacity:\s*0\b/);
    expect(ruleFor(".mk-statglyphs--armed .mk-statglyph")).toMatch(/opacity:\s*0\b/);
  });

  it("the keyframes overshoot and carry no token", () => {
    const frames = /@keyframes mkGlyphIn\s*\{([\s\S]*?)\n\}/.exec(marketing);
    expect(frames, "the animation is declared").toBeTruthy();
    expect(frames![1]).toMatch(/60%\s*\{[^}]*scale\(1\.06\)/);
    expect(frames![1]).toMatch(/100%\s*\{[^}]*scale\(1\)/);
    /* ⚠️ A `var()` INSIDE `@keyframes` FAILS SILENTLY IN THIS SETUP — no error, no warning, no
       animation. Frames carry opacity and transform only; any colour is declared on the rule. */
    expect(frames![1], "a token in a keyframe block kills the animation with no diagnostic")
      .not.toMatch(/var\(/);
  });

  it("runs once, forwards, staggered 90ms apart across all six", () => {
    const run = ruleFor(".mk-statglyphs--in .mk-statglyph");
    expect(run, "without `forwards` every glyph snaps back to opacity 0 as it ends")
      .toMatch(/animation:\s*mkGlyphIn \.5s cubic-bezier\(\.34, 1\.56, \.64, 1\) forwards/);
    for (let i = 1; i <= 6; i++) {
      const decls = ruleFor(`.mk-statglyphs--in .mk-statglyph:nth-child(${i})`);
      expect(decls, `glyph ${i} is delayed`).toMatch(new RegExp(`animation-delay:\\s*${(i - 1) * 90}ms`));
    }
  });

  /**
   * ⚠️ IT FORCES THE END STATE RATHER THAN ONLY KILLING THE ANIMATION. `animation: none` alone
   * would leave `--armed`'s `opacity: 0` standing and hide the row for exactly the readers who
   * asked for less motion. And it must sit AFTER the rules it overrides: a media query confers no
   * specificity, so an override placed earlier in the file loses on source order — measured on
   * this stylesheet last pass at 0.5s under `reduce`, from a declaration that read correctly.
   */
  it("reduced motion shows them, rather than merely not moving them", () => {
    const at = marketing.indexOf(".mk-statglyphs--in .mk-statglyph:nth-child(6)");
    const block = marketing.slice(at).match(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/);
    expect(block, "the override comes after the rules it overrides").toBeTruthy();
    expect(block![1]).toMatch(/\.mk-statglyphs--armed \.mk-statglyph/);
    expect(block![1]).toMatch(/\.mk-statglyphs--in \.mk-statglyph/);
    expect(block![1]).toMatch(/opacity:\s*1/);
    expect(block![1]).toMatch(/animation:\s*none/);
  });

  it("…and the component emits both classes, so neither rule is a rule with no subject", async () => {
    const src = await source();
    expect(src).toContain("mk-statglyphs--${phase}");
    expect(src, "`rest` renders the bare class").toMatch(/phase === "rest" \? "mk-statglyphs"/);
    /* ⚠️ THE FALLBACK IS "SHOWN". `typeof` is what makes the reference safe where the global does
       not exist, and the initialiser runs during RENDER rather than in an effect — arming from an
       effect would paint the glyphs, hide them, then animate them in, flashing on every load. */
    expect(src).toMatch(/useState<GlyphPhase>\(\s*\(\) => \(typeof IntersectionObserver === "undefined" \? "rest" : "armed"\)/);
    expect(src, "fires once and lets go").toContain("io.disconnect()");
    expect(src).toMatch(/threshold: 0\.6/);
  });
});

/* ⚠️ THE CONTAINER-CAP LOCK IS RETIRED WITH ITS LAST SUBJECT (16 Sep). It ran the arithmetic for
   `--mk-hero-h1`, the statement hero's headline: a `clamp(min, Nvw, max)` whose ceiling is reached
   past its container's cap grows type against a frozen measure. The rebuilt hero sizes from its own
   container instead, and no viewport-scaled clamp on this page sets type inside a capped box any
   more, so the table had nothing left in it. The law still stands and is recorded in CLAUDE.md —
   reinstate this describe the moment a `vw` clamp goes back inside a capped container. */

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
describe("the founding-writers banner is the lower surface's only repaint", () => {
  /**
   * ⚠️ RETARGETED, AND THE HAIRLINE HALF IS DELETED RATHER THAN MOVED. `.mk-beta` was a blush band
   * with a `border-top` declaring its top edge; `.mk-claimband` is full-bleed and carries the
   * artwork, so its own ground IS its edge and it has no top rule at all. Asserting a hairline it
   * does not have would be a lock on the retired shape.
   */
  it("declares its own ground, and the artwork that sits on it", () => {
    const decls = ruleFor(".mk-claimband");
    expect(decls).toMatch(/background-color:\s*var\(--mk-claim-ground\)/);
    expect(decls).toMatch(/background-image:\s*url\(/);
    /* ⚠️ THE SHORTHAND WOULD BE A REAL BUG HERE, not a style point: the picture is deliberately
       removed below 1000px, and a shorthand would have taken the ground with it — blanking the
       band on every phone while the source read correctly. */
    expect(decls, "separate longhands, so removing the image keeps the ground").not.toMatch(/background:\s/);
  });

  it("and it is the only ground repaint under the wrapper", () => {
    /* Sections that sit inside `.mk-lower`, by the classes `Landing` renders there. */
    const INSIDE = [".mk-statband", ".mk-featband", ".mk-claimband", ".mk-foot"];
    const painted = INSIDE.filter((sel) => /background(?:-color)?\s*:/.test(ruleFor(sel)));
    expect(painted).toEqual([".mk-claimband"]);
  });

  /**
   * ⚠️ THE ARTWORK'S CACHE-BUSTING VERSION LIVES IN THE STYLESHEET, AND THIS READS BOTH SIDES.
   * Nothing under `public/` is fingerprinted by the build and hosting lets a browser keep a file
   * for an hour, so a re-export served under the same name goes on being served stale. It is a CSS
   * background rather than an `<img>` because it has to LEAVE below 1000px, and an inline style —
   * where a version-stamped `src` would have to live — beats a media query however the query is
   * written. So the hash cannot ride a component constant, and this is the lock that keeps it
   * honest: the eight hex digits in the URL against the bytes on disk.
   */
  it("versions the banner's background by the file's own content", async () => {
    const { readFileSync } = await import("fs");
    const { createHash } = await import("crypto");
    const { resolve, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const here = dirname(fileURLToPath(import.meta.url));
    const url = /url\("(\/images\/[^"?]+)\?v=([0-9a-f]{8})"\)/.exec(ruleFor(".mk-claimband"));
    expect(url, "the background states a path and a version").toBeTruthy();
    const bytes = readFileSync(resolve(here, "../..", "public" + url![1]));
    expect(url![2], "the version IS the file, not a number kept in step by hand")
      .toBe(createHash("md5").update(bytes).digest("hex").slice(0, 8));
  });
});

/**
 * ⚠️ THE HERO IS TWO EQUAL COLUMNS AND ONE DELIBERATE OVERFLOW (brief, 16 Sep). The shadow is wider
 * than its own column and pushed further right, so the only thing keeping it off the document's
 * scroll width is the hero's own clip — that pairing is the lock, because either half alone is a
 * horizontal scrollbar or a cropped column.
 *
 * ⚠️ AND THE HEADLINE'S FAMILY IS !important FOR THE SAME REASON THE FEATURE HEADINGS' IS: brand.tsx
 * injects a rule at runtime that gives every bare h1, h2 and h3 the brand heading font with
 * !important. Two classes outrank its `h1:not(.wsh-title)`; a normal declaration would not.
 */
describe("the hero is two columns, and its shadow overflows on purpose", () => {
  it("two equal columns, centred, clipped, in the feature rows' own container", () => {
    const hero = ruleFor(".mk-hero");
    expect(hero).toMatch(/grid-template-columns:\s*1fr 1fr/);
    expect(hero).toMatch(/align-items:\s*center/);
    /* ⚠️ `clip` ON ONE AXIS AND `visible` ON THE OTHER IS THE ONLY PAIR THAT DOES THIS, and the
       obvious spelling does not work: `overflow-x: hidden` with `overflow-y: visible` FORCES the
       visible axis to `auto`, which makes the hero a scroll container instead of letting the
       shadow spill. Both halves are the lock — x still guarantees the art can never reach the
       document's scroll width, y is what lets the shadow cross into the band. */
    expect(hero, "the clip is what makes the horizontal overflow safe").toMatch(/overflow-x:\s*clip/);
    expect(hero, "and `hidden` here would force x to `auto`").toMatch(/overflow-y:\s*visible/);
    expect(hero, "no single-axis shorthand, which would clip both").not.toMatch(/overflow:\s*hidden/);
    /* ⚠️ 520, NOT 660, AND THE NUMBER IS ARITHMETIC RATHER THAN TASTE. The row centres copy that
       measures 308.8px at 1440, so slack = (min-height - 308.8) / 2 and band top = 88 +
       min-height. Less slack therefore always means MORE band visible, never less; there is no
       value that both closes the slack and shows only 100px of band. */
    expect(hero).toMatch(/min-height:\s*520px/);
    expect(hero).toMatch(/margin:\s*0 auto/);
    /* ⚠️ READ OFF `.mk-rows` RATHER THAN PINNED AS LITERALS ON BOTH SIDES. The claim is that the
       page has ONE gutter, not that it has two numbers that happen to be 1180 and 56 today — a lock
       spelling them twice goes green the day someone moves the rows and forgets the hero. */
    const rows = ruleFor(".mk-rows");
    const cap = /--mk-rows-cap:\s*(\d+px)/.exec(rows)![1];
    const gutter = /--mk-rows-gutter:\s*(\d+px)/.exec(rows)![1];
    expect(hero, "the hero caps where the rows cap").toContain("max-width: " + cap);
    expect(hero, "and gutters where they gutter").toContain("padding: 0 " + gutter);
    const copy = ruleFor(".mk-herocopy");
    expect(copy, "the container supplies the outer gutter now").toMatch(/padding:\s*0 40px 0 0/);
    /* ⚠️ THE STACKING CONTEXT IS A DESKTOP CONCERN NOW, NOT A STACKED ONE. At 169% the shadow
       grows LEFTWARD from a fixed right edge and reaches back across the copy column; the art is
       the later grid item, so without this it paints a 20% wash over the headline. It moved up out
       of the 900px block rather than being duplicated in both. */
    expect(copy, "the words stay above the shadow at every width").toMatch(/z-index:\s*1/);
    expect(copy).toMatch(/position:\s*relative/);
  });

  it("the art fills its column and the image leaves it", () => {
    expect(ruleFor(".mk-heroart")).toMatch(/height:\s*100%/);
    const img = ruleFor(".mk-heroart img");
    expect(img).toMatch(/position:\s*absolute/);
    /* Inside the container now: it leaves its own column into the gutter, not off the page. */
    expect(img).toMatch(/right:\s*-6%/);
    /* ⚠️ 169% IS DERIVED, NOT PICKED. The shadow is vertically CENTRED, so an overhang past the
       hero's bottom is an equal overhang past its top: height = min-height + 2 x overhang, and
       width = height x 2880/2100. For 520 and ~70px that is 660 tall, 905 wide, 169% of the 534px
       art column. The ratio is the asset's; the only free number is the overhang. */
    expect(img).toMatch(/width:\s*169%/);
    expect(img, "the global image reset would cancel the 169% in silence").toMatch(/max-width:\s*none/);
    /* Centred, and deliberately not moved — growing it is what makes it cross the boundary. */
    expect(img).toMatch(/top:\s*50%/);
    expect(img).toMatch(/translateY\(-50%\)/);
    expect(img).toMatch(/opacity:\s*0?\.20/);
  });

  it("the headline: Special Elite 400, important, at a flat 56px", () => {
    const h1 = ruleFor(".mk-hero .mk-herotitle");
    expect(h1).toMatch(/font-family:\s*"Special Elite", cursive !important/);
    expect(h1).toMatch(/font-weight:\s*400/);
    expect(h1, "flat: there is no unbreakable run left to size against").toMatch(/font-size:\s*56px/);
    expect(h1).toMatch(/line-height:\s*1\.14/);
    expect(h1).toMatch(/letter-spacing:\s*-0\.01em/);
    expect(h1).toMatch(/color:\s*var\(--mk-nearblack\)/);
    /* ⚠️ THE 11ch MEASURE, THE cqw STEP-DOWN AND `.mk-hkeep` WENT TOGETHER, AND THEIR ABSENCE IS THE
       ASSERTION. All three existed for one reason — keeping the held pair "querying campaign" inside
       a column half the hero wide. On "The hunt begins." the same machinery stops being protection
       and becomes the fault: an unbreakable "hunt begins." forces the break in front of it and
       strands "The". Re-adding any one of them is the regression this catches. */
    expect(h1, "no measure for a three-word headline to be stranded against").not.toMatch(/max-width/);
    expect(h1, "and no container-query step-down").not.toMatch(/cqw/);
    expect(marketing, "the held-pair rule went with the span that carried it").not.toMatch(/mk-hkeep/);
  });

  it("the sub and the two actions carry their own family, because the injection sets theirs", () => {
    const sub = ruleFor(".mk-herosub");
    expect(sub).toMatch(/font-family:\s*"Source Serif 4", Georgia, serif/);
    expect(sub).toMatch(/font-size:\s*20px/);
    expect(sub).toMatch(/line-height:\s*1\.7/);
    expect(sub).toMatch(/max-width:\s*480px/);
    expect(sub).toMatch(/color:\s*var\(--mk-nearblack\)/);
    const pill = ruleFor(".mk-heropill");
    expect(pill).toMatch(/font-family:\s*"Source Serif 4"/);
    expect(pill).toMatch(/background:\s*var\(--mk-nearblack\)/);
    expect(pill).toMatch(/border-radius:\s*30px/);
    expect(pill).toMatch(/padding:\s*16px 30px/);
    const link = ruleFor(".mk-herolink");
    expect(link).toMatch(/font-family:\s*"Source Serif 4"/);
    expect(link).toMatch(/text-underline-offset:\s*5px/);
    expect(ruleFor(".mk-heroctas")).toMatch(/gap:\s*22px/);
  });

  it("stacked, the copy comes first and the shadow sits behind it", () => {
    const block = [...marketing.matchAll(/@media \(max-width: 900px\) \{([\s\S]*?)\n\}/g)]
      .find((m) => /\.mk-hero\s*\{/.test(m[1]));
    expect(block, "a 900px block stacks the hero").toBeTruthy();
    expect(block![1]).toMatch(/grid-template-columns:\s*1fr/);
    /* ⚠️ RETARGET: the stacking context MOVED to the base rule (asserted above) rather than being
       deleted. The shadow now reaches across the copy at every width, so a context declared only
       inside this block would have left the desktop hero unprotected — the claim is unchanged and
       its home is one rule further up. Restating it here would be the same decision in two
       places, which is how the two come to disagree. */
    expect(block![1], "stated once, on the base rule").not.toMatch(/\.mk-herocopy\s*\{[^}]*z-index/);
    expect(block![1], "the shadow is behind the copy, not beneath it").toMatch(/\.mk-heroart\s*\{[^}]*position:\s*absolute/);
    /* ⚠️ THE RULE'S BODY, NOT ITS FIRST DECLARATION. This used to read
       `/\.mk-heroart img\s*\{\s*opacity:/` — which pinned `opacity` as the OPENING property and went
       red the moment two more were added in front of it, over a change that made the rule more
       correct rather than less. That is a lock on a spelling; the claim is what the rule does.
       ⚠️ AND THE SQUARING-UP IS PART OF THE CLAIM NOW. Stacked, the art box IS the hero rather than a
       half-width column, so the desktop -6%/112% pushed the shadow 22.5px past the viewport at 375 —
       clipped rather than scrolling, but still art cut off at the page edge. */
    const stackedArt = /\.mk-heroart img\s*\{([^}]*)\}/.exec(block![1]);
    expect(stackedArt, "the stacked block sizes the art").toBeTruthy();
    expect(stackedArt![1], "quiet enough to sit behind the words").toMatch(/opacity:\s*0?\.12/);
    expect(stackedArt![1], "squared up, or it runs past a phone's right edge").toMatch(/right:\s*0/);
    expect(stackedArt![1]).toMatch(/width:\s*100%/);
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
   * A selector appearing here that the list does not name is the thing worth failing on.
   *
   * ⚠️ SWEPT OVER THE WHOLE SHEET, NOT A SLICE OF IT. The first version of this sliced from
   * `.mk-hero {` to `.mk-featband` — and the plate's rule lives eight hundred lines further down,
   * so the slice covered neither of the two it was written about while quietly reporting a third.
   * The hero's rules are not contiguous, and a positional slice over a file that does not group
   * by feature answers a question nobody asked.
   */
  it("…and the whole sheet's negative margins are the six that are meant to be there", () => {
    const owners = new Set<string>();
    for (const m of marketing.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)) {
      if (/margin[^:]*:\s*[^;]*-\d/.test(m[2])) m[1].split(",").forEach((x) => owners.add(x.trim()));
    }
    expect([...owners].sort()).toEqual([
      /* the copy column reaching outward on its own side so a row reads as one centred unit — the
         mirror of the illustration opposite it, on the same alternation (16 Sep). It is what closes
         the middle gap: the image did not move, the copy stopped leaving slack against it. */
      ".mk-frow:nth-child(even) .mk-fcopy",
      /* every feature illustration, bleeding past the rows' gutter into the page margin away from its copy
         — the plate's kind, one margin for each side of the alternation */
      ".mk-frow:nth-child(even) .mk-rowillo",
      ".mk-frow:nth-child(odd) .mk-fcopy",
      ".mk-frow:nth-child(odd) .mk-rowillo",
      /* both sentinels cancel their own height so they occupy no space */
      ".mk-navsentinel--condense",
      ".mk-navsentinel--release",
    ]);
  });

  /**
   * ⚠️ THE AREAS COLLAPSE WITH THE COLUMNS OR THE GRID GROWS SIDEWAYS IN SILENCE. Auto-placement
   * never overlaps: leaving a two-column template on a one-column grid pushes every `"x x"` row
   * into an implicit SECOND column, and nothing errors.
   */
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
  const IN_EM = [".mk-fwhonest .mk-fwlead", ".mk-frow h3"];

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
    /* ⚠️ A FLOOR, NOT A COUNT, AND IT MOVED BECAUSE THE SHEET GOT SMALLER. It exists so a sweep that
       matched nothing cannot pass as a clean result; 300 was set when the ECG band's dozen rules
       were still in the file, and deleting them took the real figure to 297. Lowered to 250 rather
       than re-pinned at 297 — a floor that tracks the exact current number fails on every
       legitimate deletion and teaches the next reader to rebaseline it without looking. */
    expect(sels.size, "base selectors scanned").toBeGreaterThan(250);
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
      .filter((s) => /^\.mk-(hero|illo|fm)/.test(s));
    expect(mine).toEqual([]);
  });
});

/**
 * ⚠️ SOURCE ORDER IS THE MECHANISM, SO SOURCE ORDER IS THE LOCK. Every second feature row flips its
 * grid's direction to put the image on the right, and the 1080px block puts it back when rows stack.
 * Both are the same selector at the same specificity, so the stacked rule wins only by coming later:
 * moved above it, phones would keep the flip. The children's reset is asserted too, because without it
 * an rtl row lays out its own sentences right to left.
 */
describe("the feature rows alternate only while they sit side by side", () => {
  it("flips every second row with direction, and the stacked block puts it back", () => {
    const cols = /grid-template-columns:\s*([\d.]+)fr\s+1fr/.exec(ruleFor(".mk-frow"));
    expect(cols, "the split is an fr pair with the image column first").toBeTruthy();
    expect(parseFloat(cols![1]), "the image column is the wider one").toBeGreaterThan(1);
    expect(ruleFor(".mk-frow:nth-child(even)")).toMatch(/direction:\s*rtl/);
    expect(ruleFor(".mk-frow:nth-child(even) > *")).toMatch(/direction:\s*ltr/);
    const flip = marketing.search(/(?:^|\n)\.mk-frow:nth-child\(even\)\s*\{/);
    expect(flip, "the flip rule exists").toBeGreaterThan(-1);
    const stacking = [...marketing.matchAll(/@media \(max-width: 1080px\) \{([\s\S]*?)\n\}/g)]
      .find((m) => /(?:^|\n)\s*\.mk-frow\s*\{[^}]*grid-template-columns:\s*1fr;/.test(m[1]));
    expect(stacking, "a 1080px block stacks the rows").toBeTruthy();
    expect(stacking![1], "the stacked block undoes the flip").toMatch(/\.mk-frow:nth-child\(even\)\s*\{\s*direction:\s*ltr;?\s*\}/);
    expect(flip).toBeLessThan(stacking!.index!);
  });
});

/**
 * ⚠️ THE FEATURE ROWS SET THEIR OWN TYPE, AND ITS TWO FAMILIES BELONG TO THEM ALONE (15 Sep). The heading
 * is Special Elite and the paragraph Source Serif 4, both at full ink, replacing a heading that followed
 * the section heading's Playfair and a muted paragraph. The values are asserted as written because they
 * are the brief; the families are swept across every stylesheet and component, because "nowhere else on
 * the page" is a claim about the whole source tree, not about these two rules.
 */
describe("the feature rows set their own type, and nothing else uses its families", () => {
  const decl = (body: string, prop: string) => new RegExp("(?:^|[;\\s{])" + prop + ":\\s*([^;]+);").exec(body)?.[1].trim();

  it("the heading is Special Elite 400 at 44px, 1.18, -0.005em, full ink, on a 13ch measure", () => {
    const h3 = ruleFor(".mk-frow h3");
    expect(decl(h3, "font-family"), "important, or the runtime brand rule owns every h3").toBe('"Special Elite", cursive !important');
    expect(decl(h3, "font-weight")).toBe("400");
    expect(decl(h3, "font-size")).toBe("44px");
    expect(decl(h3, "line-height")).toBe("1.18");
    expect(decl(h3, "letter-spacing")).toBe("-0.005em");
    expect(decl(h3, "color")).toBe("var(--mk-nearblack)");
    expect(value(marketing, "--mk-nearblack"), "full ink").toBe("#1c130f");
    expect(decl(h3, "max-width"), "the 13ch measure is deliberate").toBe("13ch");
    const keep = ruleFor(".mk-frow h3 .mk-fkeep");
    expect(keep, "the held last two words").toMatch(/white-space:\s*nowrap/);
    expect(keep, "…in the heading's own family, not the runtime span rule's").toMatch(/font-family:\s*inherit/);
  });

  /**
   * ⚠️ WHY THE HEADING'S FAMILY CARRIES !important. src/lib/brand.tsx injects, at runtime and on every
   * route, a style element whose heading rule sets every bare h2 and h3 in the brand heading font with
   * !important, and a plain rule that sets every span in the body font. A normal declaration cannot beat
   * the first however specific it is, and the held run cannot inherit past the second. Measured: without
   * the flag the feature heading drew in Playfair. If brand.tsx stops reaching bare headings this way, this
   * fails — and the flag on the feature heading can go.
   */
  it("the runtime brand rule that makes the flag necessary still forces bare h3s and spans", () => {
    const brand = decls(readFileSync(resolve(here, "../lib/brand.tsx"), "utf8"));
    expect(brand, "brand.tsx forces every h3's family with !important").toMatch(/[,\s]h3\s*,[^{]*\{\s*font-family:[^;]*!important/);
    expect(brand, "brand.tsx sets every span's family").toMatch(/[,\s]span\s*,[^{]*\{\s*font-family:/);
  });

  it("the paragraph is Source Serif 4 400 at 21px, 1.7, full ink, 520px at most", () => {
    const p = ruleFor(".mk-fcopy p");
    expect(decl(p, "font-family")).toBe('"Source Serif 4", Georgia, serif');
    expect(decl(p, "font-weight")).toBe("400");
    expect(decl(p, "font-size")).toBe("21px");
    expect(decl(p, "line-height")).toBe("1.7");
    expect(decl(p, "color")).toBe("var(--mk-nearblack)");
    expect(decl(p, "max-width")).toBe("520px");
  });

  it("stacked, the heading is 34px capped to the held pair, and the paragraph 18px", () => {
    const stacking = [...marketing.matchAll(/@media \(max-width: 1080px\) \{([\s\S]*?)\n\}/g)]
      .find((m) => /(?:^|\n)\s*\.mk-frow h3\s*\{/.test(m[1]));
    expect(stacking, "a 1080px block resizes the feature type").toBeTruthy();
    const h3 = /(?:^|\n)\s*\.mk-frow h3\s*\{([^}]*)\}/.exec(stacking![1]);
    expect(h3, "the stacked heading rule").toBeTruthy();
    /* ⚠️ BOTH DECLARATIONS, AND THE ORDER IS THE FALLBACK. The held pair is a `nowrap` run that
       cannot break, so a flat 34px overflowed a 320px phone by 8.9px; the cap sizes the heading to
       whatever keeps that run inside the column. The plain value must come FIRST, so a browser
       without container units drops the cap as invalid and keeps a sane size rather than falling
       back to the 44px base. */
    expect(h3![1], "the plain size, for a browser without cqw").toMatch(/font-size:\s*34px\s*;/);
    expect(h3![1], "…then capped so the unbreakable pair fits the column")
      .toMatch(/font-size:\s*min\(34px,\s*calc\(\(100cqw - 52px\) \/ 9\)\)/);
    expect(stacking![1]).toMatch(/(?:^|\n)\s*\.mk-fcopy p\s*\{\s*font-size:\s*18px;?\s*\}/);
  });

  it("no other rule, stylesheet or component names either family", () => {
    const ruleOwners = (family: string) => [...marketing.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)]
      .filter((m) => m[2].includes(family)).map((m) => m[1].trim());
    /* ⚠️ THE HERO NAMES BOTH FAMILIES TOO SINCE 16 SEP, so this is no longer "exactly one rule" —
       it is exactly these rules. Sorted, because the assertion is the SET of owners rather than the
       order they happen to appear in the sheet. */
    /* ⚠️ SIX OWNERS NOW, AND THE GROWTH IS THE TYPEWRITER FACE BECOMING THE SITE'S DISPLAY VOICE
       RATHER THAN THE FEATURE ROWS' ALONE — the status band's heading (16 Sep), then the founding
       banner's, the founders headline and its three perk cards. The claim is still the SET: a
       seventh owner appearing here is a deliberate decision to make, not a diff to wave through.
       ⚠️ AND EVERY ONE OF THEM IS A TWO-CLASS SELECTOR CARRYING `!important`, WHICH IS NOT STYLE.
       brand.tsx injects a runtime rule giving every bare h1/h2/h3 the brand family with
       `!important`; its `h1:not(.wsh-title)` is 0-1-1, so a single-class rule LOSES between two
       important declarations and the heading silently draws in Playfair. `.mk-frow h3` and
       `.mk-stattitle` are the exceptions that prove it — one is an element inside a class, the
       other styles no bare heading at all. */
    expect(ruleOwners("Special Elite").sort()).toEqual([
      ".mk-claimband .mk-claimh2",
      ".mk-frow h3",
      ".mk-fw .mk-fwcard h2",
      ".mk-fw .mk-fwh1",
      ".mk-hero .mk-herotitle",
      ".mk-stattitle",
    ]);
    expect(ruleOwners("Source Serif 4").sort()).toEqual([".mk-fcopy p", ".mk-herolink", ".mk-heropill", ".mk-herosub"]);
    const src = resolve(here, "..");
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(resolve(dir, d.name))
        : /\.(css|tsx?)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [resolve(dir, d.name)] : []);
    const files = walk(src);
    expect(files.length, "the sweep found the source tree").toBeGreaterThan(100);
    const elsewhere = files
      .filter((f) => !f.replace(/\\/g, "/").endsWith("/marketing/marketing.css"))
      .filter((f) => /Special Elite|Source Serif 4/.test(decls(readFileSync(f, "utf8"))));
    expect(elsewhere.map((f) => f.slice(src.length + 1))).toEqual([]);
  });
});

/**
 * ⚠️ EVERY ILLUSTRATION BLEEDS ONLY WHILE ROWS SIT SIDE BY SIDE, ONLY TO THE BAND'S EDGE, ONLY AWAY FROM
 * ITS COPY, AND ONLY WHERE THE UNIT IT MEASURES WITH EXISTS. The stacked block zeroes the bleed and wins
 * only by coming later — without it a phone keeps images wider than its screen — and it zeroes it as 0px,
 * because calc(100% + 0) is invalid and an invalid width is the file's natural 2880px. The @supports guard
 * is there for the same reason. The cap reads 100cqw, which means the band only because the band is the
 * query container. The two margins follow the flip's parity: odd rows keep their image on the left and
 * grow left, even rows are the ones flipped right and grow right. And max-width: none is what lets the
 * growth happen at all, against the global img reset.
 */
describe("every illustration bleeds only side by side, away from its copy, and only to the band's edge", () => {
  it("grows on both sides of the alternation, capped by the band, behind a guard, and zeroed when rows stack", () => {
    expect(ruleFor(".mk-featband")).toMatch(/container-type:\s*inline-size/);
    const guards = [...marketing.matchAll(/@supports \(width: 1cqw\) \{([\s\S]*?)\n\}/g)];
    expect(guards, "one container-unit guard").toHaveLength(1);
    const bleed = /(?:^|\n)\s*\.mk-rowillo\s*\{([^}]*)\}/.exec(guards[0][1]);
    expect(bleed, "the guard holds the bleed").toBeTruthy();
    expect(bleed![1]).toMatch(/--mk-bleed:\s*min\(33%,[^;]*100cqw/);
    expect(bleed![1]).toMatch(/(?:^|[;\s])width:\s*calc\(100% \+ var\(--mk-bleed\)\)/);
    expect(bleed![1]).toMatch(/max-width:\s*none/);
    expect(guards[0][1]).toMatch(/(?:^|\n)\s*\.mk-frow:nth-child\(odd\) \.mk-rowillo\s*\{\s*margin-left:\s*calc\(-1 \* var\(--mk-bleed\)\);?\s*\}/);
    expect(guards[0][1]).toMatch(/(?:^|\n)\s*\.mk-frow:nth-child\(even\) \.mk-rowillo\s*\{\s*margin-right:\s*calc\(-1 \* var\(--mk-bleed\)\);?\s*\}/);
    expect(ruleFor(".mk-frow:nth-child(even)"), "the right-hand margin belongs to the rows flipped to the right").toMatch(/direction:\s*rtl/);
    const stacking = [...marketing.matchAll(/@media \(max-width: 1080px\) \{([\s\S]*?)\n\}/g)]
      .find((m) => /(?:^|\n)\s*\.mk-rowillo\s*\{\s*--mk-bleed:\s*0px;?\s*\}/.test(m[1]));
    expect(stacking, "the stacked block zeroes the bleed, with a unit").toBeTruthy();
    expect(guards[0].index!, "the zero comes after the bleed it overrides").toBeLessThan(stacking!.index!);
  });
});

/**
 * ⚠️ THE WORDMARK'S FACE IS SELF-HOSTED, SCOPED TO THE NAV, AND USED NOWHERE ELSE (16 Sep).
 * Three separate claims, and each fails in its own quiet way. A hotlinked face is a third-party
 * request on a public page and a privacy question nobody asked for. A bare `.mk-wordmark` rule
 * would restyle the SHARED FOOTER's wordmark too, because both mounts carry that class — the
 * brief said the nav only. And a `@font-face` whose `src` disagrees with the preload in index.html
 * by so much as a query string fetches the file TWICE, which looks like a slow page rather than
 * like a mistake.
 */
describe("the nav wordmark's face is self-hosted, nav-scoped, and named nowhere else", () => {
  const face = () => {
    const m = /@font-face\s*\{([^}]*)\}/.exec(marketing);
    expect(m, "marketing.css declares a @font-face").toBeTruthy();
    return m![1];
  };

  it("is declared locally, swaps rather than blocking, and ships its licence", () => {
    const body = face();
    expect(body).toMatch(/font-family:\s*"Archivo Expanded"/);
    expect(body, "swap, so the wordmark never blocks first paint").toMatch(/font-display:\s*swap/);
    /* Local path, not a CDN. The whole point of self-hosting is that no third party sees the reader. */
    const src = /src:\s*url\("([^"]+)"\)/.exec(body);
    expect(src, "the face names a file").toBeTruthy();
    expect(src![1], "served from our own origin, never hotlinked").toMatch(/^\/fonts\//);
    expect(src![1], "…and specifically not from a font aggregator").not.toMatch(/^https?:|gstatic|googleapis|fontstruct/);
    /* The file is really there and is really a woff2 — a src pointing at nothing is a silent
       fallback to the system sans, which on this page looks like a design choice. */
    const file = src![1].split("?")[0];
    const bytes = readFileSync(resolve(here, "../..", "public" + file));
    expect(bytes.subarray(0, 4).toString("latin1"), "a real woff2").toBe("wOF2");
    expect(bytes.length, "the latin subset, well under the 30KB threshold").toBeLessThan(30 * 1024);
    /* Serving a webfont is redistribution under the OFL, so the licence travels with the file. */
    const ofl = readFileSync(resolve(here, "../../public/fonts/OFL.txt"), "utf8");
    expect(ofl).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
  });

  it("the preload names the SAME url, character for character", () => {
    const html = readFileSync(resolve(here, "../../index.html"), "utf8");
    const src = /src:\s*url\("([^"]+)"\)/.exec(face())![1];
    const pre = /<link rel="preload" href="([^"]+)"[^>]*as="font"[^>]*>/.exec(html);
    expect(pre, "index.html preloads the face").toBeTruthy();
    expect(pre![1], "a different spelling is a second fetch, not a cache hit").toBe(src);
    expect(pre![0], "fonts are fetched in CORS mode even same-origin").toMatch(/crossorigin/);
  });

  it("dresses the nav's wordmark and leaves the footer's in Playfair", () => {
    expect(ruleFor(".mk-nav .mk-wordmark"), "the nav's own rule").toMatch(/font-family:\s*"Archivo Expanded"/);
    expect(ruleFor(".mk-wordmark"), "the shared base — the footer reads this").toMatch(/font-family:\s*"Playfair Display"/);
    expect(ruleFor(".mk-wordmark"), "…and must not name the display face").not.toMatch(/Archivo/);
  });

  it("no other rule or file names Archivo", () => {
    /* ⚠️ THE @font-face NAMES IT TOO, AND THAT IS A DECLARATION RATHER THAN A USE. This sweep's
       pattern starts at a newline, so the blank line before `@font-face` lets it capture the
       at-rule as though it were a selector — which made this read "two owners" about a sheet with
       one consumer. Dropping at-rules keeps the assertion about who USES the family, which is the
       claim that matters: a second consumer is the leak, the face that defines it is not. */
    const owners = [...marketing.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)]
      .filter((m) => m[2].includes("Archivo")).map((m) => m[1].trim())
      .filter((sel) => !sel.startsWith("@"));
    expect(owners).toEqual([".mk-nav .mk-wordmark"]);
    const src = resolve(here, "..");
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(resolve(dir, d.name))
        : /\.(css|tsx?)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [resolve(dir, d.name)] : []);
    const elsewhere = walk(src)
      .filter((f) => !f.replace(/\\/g, "/").endsWith("/marketing/marketing.css"))
      .filter((f) => /Archivo/.test(decls(readFileSync(f, "utf8"))));
    expect(elsewhere.map((f) => f.slice(src.length + 1))).toEqual([]);
  });
});

/**
 * ⚠️ THE IMAGE COLUMN DID NOT MOVE, AND THAT IS THE CONSTRAINT THE REBALANCE WAS BUILT UNDER
 * (16 Sep). The rows were rebalanced by widening the COPY outward on its own side; the grid ratio,
 * the gap, the cap and the gutter were all left alone so `--mk-bleed` — which reads the cap and the
 * gutter — resolves exactly as it did and the illustration keeps its width and its overflow past
 * the viewport edge. The 80px gap is part of that: it divides the fr tracks, so changing it shrinks
 * the image. Anyone closing the middle gap by touching these four numbers is shrinking the artwork,
 * which is the thing this pass was told not to do.
 */
describe("the rebalance moved the copy, not the image", () => {
  it("the grid ratio, the gap, the cap and the gutter are all unchanged", () => {
    const row = ruleFor(".mk-frow");
    expect(row, "the image track keeps its share").toMatch(/grid-template-columns:\s*1\.6fr 1fr/);
    expect(row, "the gap divides the fr tracks — changing it shrinks the image").toMatch(/gap:\s*80px/);
    const rows = ruleFor(".mk-rows");
    expect(rows).toMatch(/--mk-rows-cap:\s*1180px/);
    expect(rows).toMatch(/--mk-rows-gutter:\s*56px/);
  });

  it("the copy reaches outward inside the bleed's own guard, capped, with a floor", () => {
    const guards = [...marketing.matchAll(/@supports \(width: 1cqw\) \{([\s\S]*?)\n\}/g)];
    expect(guards, "still one container-unit guard, shared with the bleed").toHaveLength(1);
    const pull = /(?:^|\n)\s*\.mk-fcopy\s*\{([^}]*)\}/.exec(guards[0][1]);
    expect(pull, "the guard holds the pull").toBeTruthy();
    /* 140px is 520 less the 380px track; the 20px is the gutter it may never eat into, so a narrow
       screen gets less pull rather than a scrollbar. */
    expect(pull![1]).toMatch(/--mk-copy-pull:\s*min\(140px,[^;]*100cqw[^;]*20px\)/);
    expect(pull![1]).toMatch(/(?:^|[;\s])width:\s*calc\(100% \+ var\(--mk-copy-pull\)\)/);
    expect(pull![1], "against the global img/box reset, as the bleed does").toMatch(/max-width:\s*none/);
    /* Outward means AWAY from the image, so the side follows the same parity as the flip. */
    expect(guards[0][1]).toMatch(/\.mk-frow:nth-child\(odd\) \.mk-fcopy\s*\{\s*margin-right:\s*calc\(-1 \* var\(--mk-copy-pull\)\);?\s*\}/);
    expect(guards[0][1]).toMatch(/\.mk-frow:nth-child\(even\) \.mk-fcopy\s*\{\s*margin-left:\s*calc\(-1 \* var\(--mk-copy-pull\)\);?\s*\}/);
    const stacking = [...marketing.matchAll(/@media \(max-width: 1080px\) \{([\s\S]*?)\n\}/g)]
      .find((m) => /(?:^|\n)\s*\.mk-fcopy\s*\{\s*--mk-copy-pull:\s*0px;?\s*\}/.test(m[1]));
    expect(stacking, "stacked there is no copy side to reach into, zeroed with a unit").toBeTruthy();
  });
});
