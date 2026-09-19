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
/* The dashboard's own sheet — read for one token, so the navy copy below can be checked
   against its source rather than against a literal typed on both sides. */
const dash = decls(css("../components/dashboard/oneScreen.css"));

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

/**
 * ⚠️ NAVY IS A DOCUMENTED COPY OF THE DASHBOARD'S, ON EXACTLY THE TERMS `--mk-hero-ground` IS ONE.
 * The marketing tier renders outside the theme classes and carries its own palette deliberately —
 * one cross-tier `var()` is what an app refactor deletes without knowing marketing depended on it,
 * and this surface is the one nobody is signed in to notice breaking. The copy keeps the tiers
 * independent; this assertion is what stops the copy going stale in silence.
 *
 * ⚠️ AND IT ASSERTS AGAINST THE DASHBOARD'S FILE, NOT A LITERAL ON BOTH SIDES — the same reason the
 * ground's lock does. A hand-written hex here goes green the day someone changes the app and the
 * test and leaves marketing behind.
 */
describe("the tier's navy is a documented copy of the dashboard's, not a reference to it", () => {
  it("--mk-navy equals --dash-navy", () => {
    const d = value(dash, "--dash-navy");
    expect(d, "the dashboard declares the navy this copies").toBeTruthy();
    expect(value(marketing, "--mk-navy")).toBe(d);
  });

  /**
   * ⚠️ RUST IS NOT COPIED — IT WAS ALREADY HERE, under a surface's private name. `--mk-claim-accent`
   * was the founding banner's accent; it is an alias now, so the banner's value cannot move without
   * the new readers moving with it, and nobody has to know a band's token to name a colour.
   */
  it("--mk-claim-accent is an alias for --mk-rust, so the two cannot diverge", () => {
    expect(value(marketing, "--mk-claim-accent")).toBe("var(--mk-rust)");
    expect(value(marketing, "--mk-rust")).toBe("#8a4a3c");
    /* ⚠️ STILL NOT `--mk-burg` (#7c3a2a). Fourteen points apart, two reds on one page — a flag that
       has been raised and not resolved, and asserting the DIFFERENCE is what stops it being closed
       by accident rather than by decision. */
    expect(value(marketing, "--mk-rust")).not.toBe(value(marketing, "--mk-burg"));
  });

  /**
   * ⚠️ ONE PRIMARY FILL ACROSS THE TIER, AND `.mk-btn--ink` IS GONE RATHER THAN RETINTED. A class
   * called `--ink` painting navy is a comment outliving the thing it described, at the API; the
   * rename is what makes a stray `.mk-btn--ink` in a future diff match nothing instead of quietly
   * drawing a fill nobody chose.
   */
  it("nothing still wears the retired ink modifier", () => {
    expect(marketing, "the rule is deleted").not.toMatch(/(?:^|\n)\s*\.mk-btn--ink[\s{:,]/);
    for (const [file, src] of SOURCES) {
      expect(src, `${file} still renders mk-btn--ink`).not.toMatch(/["\s`]mk-btn--ink["\s`]/);
    }
  });

  /**
   * ⚠️ EACH MODIFIER IS DECLARED AFTER `.mk-btn`, AND THE ORDERING IS THE WHOLE RULE — a modifier and
   * the base are single-class selectors at equal specificity, so the last one in the file wins.
   * Above the base, the nav's CTA silently reverts to white while the source still reads as navy.
   * The ref this tier was first drawn from shipped with exactly that bug.
   *
   * ⚠️ AND THE PAIR'S ORDER RELATIVE TO *EACH OTHER* IS NOT ASSERTED, BECAUSE IT CANNOT MATTER —
   * which is the correction this lock produced on its first run. `.mk-btn--ink`'s comment claimed it
   * was declared "after `.mk-btn` and `.mk-btn--cta`" and it was declared BEFORE the pink one, from
   * the day it was written. Nothing was wrong: no element ever carries both modifiers, so they never
   * compete. The comment described a contest that does not exist and the stylesheet has been fixed
   * to say what it means. A lock asserting the stale half would have been a lock on a spelling.
   */
  it("each modifier is declared after the base it overrides", () => {
    const base = marketing.indexOf(".mk-btn {");
    expect(base, "the base button is declared").toBeGreaterThan(-1);
    for (const mod of [".mk-btn--navy {", ".mk-btn--cta {"]) {
      expect(marketing.indexOf(mod), `${mod} after the base`).toBeGreaterThan(base);
    }
    /* The two modifiers never land on one element — proved from the components, not assumed. */
    for (const [file, src] of SOURCES) {
      expect(src, `${file} puts both modifiers on one button`).not.toMatch(/mk-btn--navy[^"`]*mk-btn--cta|mk-btn--cta[^"`]*mk-btn--navy/);
    }
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
/* ⚠️ THE STATUS CAROUSEL'S WHOLE DESCRIBE IS DELETED (18 Sep) — four cases over a component that no
   longer exists: the glyph buttons and their transitions, the copy's reserved height and its fade,
   the reduced-motion gate on the timer, and the dwell/in-view derivation. `StatusBand` is an eyebrow
   and a heading now; there is no timer to gate, no `mkCarIn` to restart and no tablist to operate.
   ⚠️ THE ONE CLAIM WORTH CARRYING FORWARD IS THE ABSENCE, and it is asserted below with the rest of
   the band rather than left as a described-but-empty block: a describe with its cases removed reads
   as coverage that is merely quiet. */
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
 * ⚠️ THREE BANDS INSIDE `.mk-lower` PAINT THEIR OWN GROUND, AND EACH IS A DECISION RATHER THAN A
 * DRIFT. The two-surface rule exists because the retired parchment band repainted by accident, over
 * its whole height, flattening the cards on it. A bounded band whose edge is declared is a section;
 * an unbounded repaint is a seam. The founding banner was the only one until 17 Sep, when the footer
 * became a band of its own — this asserts the SET, so a fourth has to be argued for, not added.
 *
 * ⚠️ AND THE THIRD WAS ARGUED FOR ON 18 SEP. The vision band qualifies on the banner's own terms and
 * then some: it states BOTH edges with hairlines rather than one, so a reader can see where it
 * starts and where it stops. Its value is the argument too — true white is the one colour on this
 * page that reads as a different sheet of paper rather than as another tint of the same one, which
 * is exactly what a band saying "here is why this exists" is for. The parchment band that started
 * this rule failed on both counts: unbounded, and the same family of warm tint as everything it sat
 * on, so it read as a smudge rather than as a section.
 */
/**
 * ⚠️ THE WHITE BAND: A HEADING, THREE POINTS, ONE WAY OUT (18 Sep, ref design-refs/landing-v6.html).
 * These are the claims the stylesheet can carry. Where the three pictures actually LAND — that they
 * share a baseline, that the headings hold one line, that nothing overlaps — is a rendered-page
 * claim and lives in `visionBand.measure.ts`.
 */
describe("the vision band's own type and geometry", () => {
  it("the heading and the points are the ref's, in the page's own container", () => {
    const h2 = ruleFor(".mk-visionh2");
    expect(h2).toMatch(/font-family:\s*"Special Elite", cursive !important/);
    expect(h2).toMatch(/font-size:\s*60px/);
    expect(h2).toMatch(/line-height:\s*1\.1/);
    expect(h2).toMatch(/letter-spacing:\s*-0\.015em/);
    const pts = ruleFor(".mk-visionpoints");
    expect(pts).toMatch(/grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    expect(pts).toMatch(/gap:\s*56px/);
    expect(pts).toMatch(/margin-top:\s*64px/);
    const h3 = ruleFor(".mk-vh3");
    expect(h3).toMatch(/font-size:\s*27px/);
    expect(h3, "held on one line at desktop").toMatch(/white-space:\s*nowrap/);
    const body = ruleFor(".mk-vbody");
    expect(body).toMatch(/font-size:\s*17px/);
    expect(body).toMatch(/line-height:\s*1\.7/);
    expect(body).toMatch(/max-width:\s*330px/);
    expect(body).toMatch(/color:\s*var\(--mk-vision-body\)/);
    expect(body, "balanced, so a paragraph never ends on one word").toMatch(/text-wrap:\s*balance/);
  });

  /**
   * ⚠️ THE FIGURE'S FIXED HEIGHT AND ITS `flex-end` ARE ONE MECHANISM AND FAIL TOGETHER. The three
   * plates share a baseline because each is trimmed to its own ink and exported at a common height,
   * so all three fill this box and stand on its floor. Take the height away and they size to their
   * own art; take `flex-end` away and they centre; either way the row stops being a row, with every
   * rule still reading correctly.
   */
  it("the three pictures stand on one line by construction", () => {
    const fig = ruleFor(".mk-vfig");
    expect(fig).toMatch(/height:\s*220px/);
    expect(fig).toMatch(/display:\s*flex/);
    expect(fig, "bottom-aligned, or they float at their own heights").toMatch(/align-items:\s*flex-end/);
    expect(fig).toMatch(/justify-content:\s*center/);
    /* ⚠️ A DEFINITE HEIGHT, NOT A MAXIMUM, AND THE REASON IS A PLATE THAT NEVER LOADED. Sized
       `width: auto; height: auto` under a `max-height`, a replaced element that has not loaded has
       no used size — so each picture measured 0x0 inside its 220px figure and `loading="lazy"`
       never fired, because a lazy image starts when its own box comes into view and a zero box
       never does. Measured: three plates PENDING with `naturalWidth: 0` after two full-page
       scrolls. The claim is that the box is known BEFORE the file arrives. */
    const img = ruleFor(".mk-vfig img");
    expect(img, "a definite height, or an unloaded plate has no box at all").toMatch(/height:\s*100%/);
    expect(img, "the width follows the ratio the attributes carry").toMatch(/width:\s*auto/);
    expect(img, "never taller-than-wide out of its column").toMatch(/max-width:\s*100%/);
    expect(img, "the box is stated now, so the ratio needs its own guard").toMatch(/object-fit:\s*contain/);
  });

  /**
   * ⚠️ A BUTTON WEARING A LINK, so it has to un-declare everything a button brings — and its family
   * explicitly, because brand.tsx names bare `button` and it would not be Source Serif by
   * inheritance. The underline is the band's rule colour, a step stronger than the band's own edges:
   * an edge should be felt and a link should be seen.
   */
  it("the way out is a link's treatment on a real button", () => {
    const more = ruleFor(".mk-visionmore");
    expect(more).toMatch(/font-family:\s*"Source Serif 4"/);
    expect(more).toMatch(/background:\s*none/);
    expect(more).toMatch(/border:\s*0/);
    expect(more).toMatch(/text-decoration:\s*underline/);
    expect(more).toMatch(/text-underline-offset:\s*5px/);
    expect(more).toMatch(/text-decoration-color:\s*var\(--mk-vision-rule\)/);
    expect(more).toMatch(/margin-top:\s*60px/);
    /* The rule is stronger than the edge — asserted as an ORDER, so both survive a retune. */
    const alpha = (t: string) => Number(/,\s*\.?(\d*\.?\d+)\s*\)/.exec(value(marketing, t)!)![1]);
    expect(alpha("--mk-vision-rule"), "the link reads stronger than the band's edges")
      .toBeGreaterThan(alpha("--mk-vision-edge"));
  });

  /**
   * ⚠️ THE HEADINGS RELEASE ABOVE THE BREAKPOINT THE COLUMNS STACK AT, AND THE GAP IS DELIBERATE.
   * Three columns still stand between 1080 and ~1138 while the longest heading no longer fits one —
   * and a `nowrap` fails by SPILLING into the gap between columns, not by wrapping, so no scrollbar
   * ever reports it. Asserted as the RELATION, so both boundaries can move as long as the release
   * stays above the stack.
   */
  it("the headings release before the columns stack, not with them", () => {
    const at = (px: string, sel: string) => {
      const m = new RegExp("@media \\(max-width: " + px + "\\) \\{([\\s\\S]*?)\\n\\}", "g");
      return [...marketing.matchAll(m)].some((b) => new RegExp("\\" + sel + "\\s*\\{").test(b[1]));
    };
    const release = /@media \(max-width: ([\d.]+)px\) \{[^}]*\.mk-vh3\s*\{[^}]*white-space:\s*normal/.exec(marketing);
    expect(release, "the headings release somewhere").toBeTruthy();
    const stack = /@media \(max-width: ([\d.]+)px\) \{[^{]*\{[\s\S]*?\.mk-visionpoints\s*\{[^}]*grid-template-columns:\s*1fr/.exec(marketing);
    expect(stack, "the columns stack somewhere").toBeTruthy();
    expect(Number(release![1]), "the release is wider than the stack, or a held heading spills between columns")
      .toBeGreaterThan(Number(stack![1]));
    expect(at("1080px", ".mk-visionpoints"), "and the stack is the feature rows' own breakpoint").toBe(true);
  });
});

describe("the lower surface's repaints are the banner, the vision band and the footer, and no others", () => {
  /**
   * ⚠️ COLOUR ONLY, AND NEVER THE SHORTHAND. The banner's picture is an `<img>` in its grid now, so
   * the band paints nothing but its ground — and the shorthand, which resets every longhand, would
   * take the ground with it the day someone added an image here.
   */
  it("the banner declares its own ground and nothing else", () => {
    const decls = ruleFor(".mk-claimband");
    expect(decls).toMatch(/background-color:\s*var\(--mk-claim-ground\)/);
    expect(decls, "the drawing is an element in the grid, not a background").not.toMatch(/background-image/);
    expect(decls, "separate longhands, never the shorthand").not.toMatch(/background:\s/);
  });

  /**
   * ⚠️ THE FOOTER QUALIFIES ON THE BANNER'S OWN TERMS: bounded, with a hairline stating its top edge.
   * Its ground is a token three points below `--mk-lower`, so the hairline carries the edge and the
   * fill only confirms it.
   */
  it("the footer is the second, and a hairline states where it starts", () => {
    const foot = ruleFor(".mk-foot");
    expect(foot).toMatch(/background-color:\s*var\(--mk-foot-ground\)/);
    expect(foot, "its top edge is declared").toMatch(/border-top:\s*1px solid var\(--mk-hair\)/);
    expect(foot).not.toMatch(/background:\s/);
    expect(value(marketing, "--mk-foot-ground")).toBe("#efeae3");
  });

  /**
   * ⚠️ THE THIRD, AND BOTH EDGES ARE PART OF THE CLAIM. The banner states no edge and gets away with
   * it because its fill is four points off the surface around it; this one is true white against a
   * warm ground, which is a step big enough that an undeclared edge would read as the page having
   * come apart. Stating both is what makes it a sheet rather than a hole.
   */
  it("the vision band is the third, and it states both of its edges", () => {
    const band = ruleFor(".mk-vision");
    expect(band).toMatch(/background-color:\s*var\(--mk-vision-ground\)/);
    expect(band, "its top edge is declared").toMatch(/border-top:\s*1px solid var\(--mk-vision-edge\)/);
    expect(band, "and so is its bottom — it is a sheet, not a seam")
      .toMatch(/border-bottom:\s*1px solid var\(--mk-vision-edge\)/);
    expect(band, "separate longhands, never the shorthand").not.toMatch(/background:\s/);
    expect(band, "the drawing sits in the grid, not behind it").not.toMatch(/background-image/);
    /* ⚠️ TRUE WHITE, AND DELIBERATELY NOT `--mk-card` (#fffefb). The card colour is a warm near-white
       meant to sit ON this paper; three points of warmth is the difference between a page turn and
       a smudge, and snapping to the neighbour to save a token would be a colour decision made by
       convenience. Asserted as a DIFFERENCE, so it survives either value being retuned. */
    expect(value(marketing, "--mk-vision-ground")).toBe("#ffffff");
    expect(value(marketing, "--mk-vision-ground"), "the band's sheet is not the card's warm white")
      .not.toBe(value(marketing, "--mk-card"));
  });

  it("and nothing else under the wrapper repaints the ground", () => {
    /* Sections that sit inside `.mk-lower`, by the classes `Landing` renders there. */
    const INSIDE = [".mk-statband", ".mk-featband", ".mk-vision", ".mk-claimband", ".mk-foot"];
    const painted = INSIDE.filter((sel) => /background(?:-color)?\s*:/.test(ruleFor(sel)));
    expect(painted).toEqual([".mk-vision", ".mk-claimband", ".mk-foot"]);
  });

  /**
   * ⚠️ WHOLE, CAPPED AND CENTRED — "nothing crops" is a property of the rule, so the rule is what is
   * asserted: a width with `height: auto` keeps the drawing's own ratio, and there is no
   * `object-fit` or fixed height that could cut it. The file and its version are the smoke test's.
   */
  it("the banner's drawing is capped at 430px and never cropped", () => {
    const art = ruleFor(".mk-claimart");
    expect(art).toMatch(/max-width:\s*430px/);
    expect(art).toMatch(/width:\s*100%/);
    expect(art).toMatch(/height:\s*auto/);
    expect(art, "nothing that could crop it").not.toMatch(/object-fit|aspect-ratio|overflow/);
    expect(art, "centred in its own column").toMatch(/justify-self:\s*center/);
    expect(art, "with room above and below").toMatch(/margin:\s*24px 0/);
    expect(ruleFor(".mk-claimgrid"), "a column wide enough for the cap to bind")
      .toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1\.3fr\)/);
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
    /* ⚠️ THE CLIP MOVED UP TO `html`/`body`, AND THE HERO NOW DECLARES NO `overflow` AT ALL. The
       shadow is meant to spill off the right edge of the PAGE rather than out of its own column,
       and any overflow value here makes the hero the box that clips it. `clip` rather than
       `hidden` one level up, because `hidden` would make the document a scroll container — which
       traps the sticky nav and breaks every in-page anchor. Scoped with `:has(.mk-scope)` so it
       cannot follow a reader into the workspace, where the rail's peek panel and the timeline
       drawer both escape their boxes on purpose. */
    expect(hero, "the hero clips nothing — the page does").not.toMatch(/overflow/);
    const clip = /html:has\(\.mk-scope\), body:has\(\.mk-scope\)\s*\{([^}]*)\}/.exec(marketing);
    expect(clip, "html and body clip the x axis while a marketing page is mounted").toBeTruthy();
    expect(clip![1]).toMatch(/overflow-x:\s*clip/);
    expect(clip![1], "`hidden` would make the document a scroll container").not.toMatch(/hidden/);
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
    /* ⚠️ THE HERO HOLDS ITS OWN TWO AS TOKENS NOW (18 Sep), because the shadow's arithmetic reads
       them — so the claim is no longer "the hero spells the same literal" but "the hero's cap IS the
       rows' cap". Two derivations against each other; a lock spelling 1180 and 56 on both sides
       goes green the day someone moves the rows and forgets the hero, which is the fault the
       original note here was written about. */
    const heroCap = /--mk-hero-cap:\s*(\d+px)/.exec(hero);
    const heroPad = /--mk-hero-pad:\s*(\d+px)/.exec(hero);
    expect(heroCap, "the hero declares its cap").toBeTruthy();
    expect(heroPad, "the hero declares its gutter").toBeTruthy();
    expect(heroCap![1], "the hero caps where the rows cap").toBe(cap);
    expect(heroPad![1], "and gutters where they gutter").toBe(gutter);
    /* ⚠️ AND THE WHITE BAND JOINS THEM. Three bands, one gutter — the vision section was drawn at
       1440/120 in its ref and is built at the page's own container, so this is where that decision
       is held. */
    const vision = ruleFor(".mk-visionin");
    expect(vision, "the vision band caps where the rows cap").toContain("max-width: " + cap);
    expect(vision, "and gutters where they gutter").toMatch(
      new RegExp("padding:\\s*\\d+px " + gutter + " \\d+px"),
    );
    const copy = ruleFor(".mk-herocopy");
    expect(copy, "the container supplies the outer gutter now").toMatch(/padding:\s*0 40px 0 0/);
    /* ⚠️ THE STACKING CONTEXT IS A DESKTOP CONCERN NOW, NOT A STACKED ONE. At 169% the shadow
       grows LEFTWARD from a fixed right edge and reaches back across the copy column; the art is
       the later grid item, so without this it paints a 20% wash over the headline. It moved up out
       of the 900px block rather than being duplicated in both. */
    expect(copy, "the words stay above the shadow at every width").toMatch(/z-index:\s*1/);
    expect(copy).toMatch(/position:\s*relative/);
  });

  /**
   * ⚠️ RETARGET, AND THE LOCK CHANGED KIND (18 Sep). It used to pin three drawn numbers — `left: 54%`,
   * `width: 72%`, `translateY(-46%)` — each tuned by eye to one viewport. The shadow is positioned by
   * a RULE now: never within a stated clearance of the headline's ink, never within a stated margin
   * of the viewport's edge, and it shrinks rather than crossing either. So this asserts the rule's
   * TERMS are all present and derived from one another; the rule's OUTCOME — the clearance in
   * pixels, at four widths — is a rendered-page claim and lives in `heroShadow.measure.ts`, which is
   * the only artefact that can see it.
   */
  it("the art fills its column and the shadow is placed by rule, not by a drawn number", () => {
    expect(ruleFor(".mk-heroart")).toMatch(/height:\s*100%/);
    const hero = ruleFor(".mk-hero");
    /* Every term the rule reads is declared on the hero, which owns all of them. */
    for (const t of ["--mk-hero-cap", "--mk-hero-pad", "--mk-hero-ink", "--mk-hero-clear", "--mk-hero-edge"]) {
      expect(hero, `${t} is the hero's to declare`).toMatch(new RegExp(t.replace(/-/g, "\\-") + ":"));
    }
    /* ⚠️ THE CAP AND THE GUTTER ARE READ, NOT RESTATED. `max-width` and `padding` must consume the
       same tokens the shadow's arithmetic does, or the two can disagree by a number nobody sees. */
    expect(hero, "the cap is the token, not a literal beside it").toMatch(/max-width:\s*var\(--mk-hero-cap\)/);
    expect(hero, "and so is the gutter").toMatch(/padding:\s*0 var\(--mk-hero-pad\)/);
    const x = /--mk-hero-shadow-x:([\s\S]*?);/.exec(hero);
    expect(x, "the shadow's left edge is derived once, on the hero").toBeTruthy();
    for (const t of ["--mk-hero-cap", "--mk-hero-pad", "--mk-hero-ink", "--mk-hero-clear"]) {
      expect(x![1], `the derivation reads ${t}`).toContain(t);
    }
    /* ⚠️ `cqw`, NOT `vw`, AND IT IS THE REASON THE WRAPPER EXISTS. `100vw` counts a classic
       scrollbar; the shadow's right-hand margin is stated against what the reader can SEE. */
    expect(x![1], "measured against the container, so a scrollbar is not counted as room").toContain("100cqw");
    expect(x![1], "never vw — see .mk-herowrap").not.toContain("vw");
    expect(ruleFor(".mk-herowrap"), "and something has to BE the container")
      .toMatch(/container-type:\s*inline-size/);

    const img = ruleFor(".mk-heroart img");
    expect(img).toMatch(/position:\s*absolute/);
    /* Left = the headline's ink plus the clearance, from the art column's own edge. */
    expect(img, "placed off the headline's ink, not off a percentage")
      .toMatch(/left:\s*calc\(var\(--mk-hero-ink\) \+ var\(--mk-hero-clear\) - 100%\)/);
    expect(img, "anchored from one side only, or the two fight").not.toMatch(/right:/);
    /* ⚠️ THE SHRINK IS THE HALF THAT MATTERS. `min()` is what makes the picture give way when the
       two margins cannot both hold — without it the rule silently becomes "overlap the headline".
       `max(0px, …)` keeps it a valid length at widths where nothing fits. */
    const w = /width:([^;]*);/.exec(img);
    expect(w, "the image states a width").toBeTruthy();
    expect(w![1], "the ref's size is the ceiling").toContain("104%");
    expect(w![1], "and the room left before the viewport's margin is the cap").toContain("min(");
    expect(w![1], "…so it shrinks rather than overlapping").toContain("--mk-hero-shadow-x");
    expect(w![1], "and never resolves to a negative length").toContain("max(0px");
    expect(img, "the global image reset would cancel the width in silence").toMatch(/max-width:\s*none/);
    /* Vertically centred, and `-50%` rather than the old optical `-46%`: the ref centres it. */
    expect(img).toMatch(/top:\s*50%/);
    expect(img).toMatch(/translateY\(-50%\)/);
    expect(img).toMatch(/opacity:\s*0?\.18/);
    /* ⚠️ IT REACHES ACROSS THE COPY COLUMN AT NARROW WIDTHS, so a 0.18 wash that ate a click on the
       headline would be a bug nobody could see. */
    expect(img).toMatch(/pointer-events:\s*none/);
  });

  it("the headline: Special Elite 400, important, at a flat 56px", () => {
    const h1 = ruleFor(".mk-hero .mk-herotitle");
    expect(h1).toMatch(/font-family:\s*"Special Elite", cursive !important/);
    expect(h1).toMatch(/font-weight:\s*400/);
    /* ⚠️ 74px AND `nowrap`, AND THE OVERFLOW IS THE DESIGN. Held on one line the headline is wider
       than its 560px column, so it runs across the shadow beside it — intended, and the reason the
       hero stopped clipping. The page cannot scroll sideways because `html`/`body` clip that axis.
       It releases at 560px rather than spilling past a phone's viewport, where the clip would
       simply eat it. */
    expect(h1).toMatch(/font-size:\s*74px/);
    expect(h1, "one line, across the shadow").toMatch(/white-space:\s*nowrap/);
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
    expect(sub).toMatch(/font-size:\s*21px/);
    expect(sub).toMatch(/line-height:\s*1\.65/);
    /* ⚠️ THE MEASURE BELONGS TO THE COLUMN NOW, NOT THE PARAGRAPH. Two caps on one block is how
       they come to disagree; `.mk-herocopy` carries the 560px and the sub simply fills it. */
    expect(sub, "the column carries the measure").not.toMatch(/max-width/);
    expect(ruleFor(".mk-herocopy")).toMatch(/max-width:\s*560px/);
    expect(sub).toMatch(/color:\s*var\(--mk-nearblack\)/);
    /* ⚠️ THE PAGE'S ONE DOMINANT ACTION, AND THE WEIGHT IS THE RANKING (18 Sep). `.mk-btn--navy` —
       the nav, /pricing, the sign-up — keeps 1rem regular; this pill alone is 18px/600, so the ask
       outranks the ways in. Asserted against the shared modifier rather than in isolation, because
       "heavier than the others" is a relationship and a lock on one side of it cannot see the day
       somebody levels them up. */
    const pill = ruleFor(".mk-heropill");
    expect(pill).toMatch(/font-family:\s*"Source Serif 4"/);
    expect(pill).toMatch(/background:\s*var\(--mk-navy\)/);
    expect(pill).toMatch(/color:\s*#ffffff/);
    expect(pill).toMatch(/font-size:\s*18px/);
    expect(pill).toMatch(/font-weight:\s*600/);
    expect(pill).toMatch(/border-radius:\s*30px/);
    expect(pill).toMatch(/padding:\s*17px 32px/);
    const navy = ruleFor(".mk-btn--navy");
    expect(navy, "the chrome's navy is the same fill").toMatch(/background:\s*var\(--mk-navy\)/);
    expect(navy, "…and deliberately lighter than the hero's").toMatch(/font-size:\s*1rem/);
    expect(navy, "no weight of its own, so it inherits the base button's").not.toMatch(/font-weight/);
    /* ⚠️ RUST, NOT INK. Beside a navy pill an ink link reads as a second, quieter button; rust reads
       as a different kind of thing. The two fills are the tier's grammar and must stay separable. */
    const link = ruleFor(".mk-herolink");
    expect(link).toMatch(/font-family:\s*"Source Serif 4"/);
    expect(link).toMatch(/color:\s*var\(--mk-rust\)/);
    expect(link).toMatch(/text-underline-offset:\s*5px/);
    expect(link, "the underline is the hairline weight, so it never competes")
      .toMatch(/text-decoration-color:\s*rgba\(138, 74, 60, \.35\)/);
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
    /* ⚠️ RETARGETED TO THE CLAIM, NOT THE SPELLING. This asserted `right: 0`, which was how the art
       was squared up while the base rule anchored from the RIGHT. The base anchors from the LEFT
       now (`left: 54%`), so `right: 0` alone would over-constrain the box — the browser keeps
       `left` and the width, and the shadow lands 203px past a 375px viewport. Squaring it up is
       therefore `left: 0; right: auto`, which is the same claim spelled the only way that works
       against the new base. Measured at 375: the art's right edge is exactly 375.
       A lock that fails over a change making its own claim MORE true is a lock on a spelling. */
    expect(stackedArt![1], "anchored from one side only, or the two fight").toMatch(/left:\s*0/);
    expect(stackedArt![1], "…and the other side released, or the width is over-constrained").toMatch(/right:\s*auto/);
    expect(stackedArt![1], "full width, so it cannot run past a phone's right edge").toMatch(/width:\s*100%/);
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
  it("…and the whole sheet's negative margins are the seven that are meant to be there", () => {
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
      /* the founding tier's lift (17 Sep): the 12px of extra top padding its flag needs, given back
         as a negative top margin, so the card grows upward and its feature list starts on exactly
         the line its neighbours' do. The transform it replaced moved the content with the card. */
      ".mk-tier--founding",
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
  /* ⚠️ `.mk-frow h3` LEFT THIS LIST ON 17 SEP BECAUSE IT HAS NO MEASURE AT ALL — it wraps with
     `text-wrap: balance`, asserted with the feature rows' type. The contact lede and the footer's
     strapline joined it: both are `ch` measures, and both set the size they count. */
  const IN_EM = [".mk-fwhonest .mk-fwlead", ".mk-clede", ".mk-foottag"];

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

  it("the heading is Special Elite 400 at 44px, 1.18, -0.005em, full ink, balanced rather than measured", () => {
    const h3 = ruleFor(".mk-frow h3");
    expect(decl(h3, "font-family"), "important, or the runtime brand rule owns every h3").toBe('"Special Elite", cursive !important');
    expect(decl(h3, "font-weight")).toBe("400");
    expect(decl(h3, "font-size")).toBe("44px");
    expect(decl(h3, "line-height")).toBe("1.18");
    expect(decl(h3, "letter-spacing")).toBe("-0.005em");
    expect(decl(h3, "color")).toBe("var(--mk-nearblack)");
    expect(value(marketing, "--mk-nearblack"), "full ink").toBe("#1c130f");
    /* ⚠️ THE 13ch MEASURE IS GONE (17 Sep). It broke every heading early and left most of the copy
       column unused; `balance` sets the same words in even lines across the whole column. */
    expect(decl(h3, "max-width"), "no measure narrows the heading").toBeUndefined();
    expect(decl(h3, "text-wrap"), "the lines are balanced instead").toBe("balance");
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
    /* 11 since 17 Sep: the widest held pair is "Submission Packages" at 10.54em. That width is a
       fact about the FONT, so the rendered check (no row wider than a phone's column) is what
       proves the divisor; this only pins the construction. */
    expect(h3![1], "…then capped so the unbreakable pair fits the column")
      .toMatch(/font-size:\s*min\(34px,\s*calc\(\(100cqw - 52px\) \/ 11\)\)/);
    expect(stacking![1]).toMatch(/(?:^|\n)\s*\.mk-fcopy p\s*\{\s*font-size:\s*18px;?\s*\}/);
  });

  it("no other rule, stylesheet or component names either family", () => {
    /* ⚠️ COMMENTS ARE STRIPPED BEFORE THIS COUNTS, AND THAT IS A REAL FAULT BEING CLOSED RATHER
       THAN A TIDY-UP. The pattern starts at a newline and a CSS comment contains no braces, so a
       rule with a docblock directly above it captures the entire comment as part of its SELECTOR.
       Measured: this returned eleven owners, five of them multi-line prose rather than a selector,
       because the pass that added those rules put a comment immediately above each one. It is the
       house rule this repo states in several places and had not applied here — a source slicer
       strips comments before it counts. */
    const ruleOwners = (family: string) => [...decls(marketing).matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)]
      .filter((m) => m[2].includes(family)).map((m) => m[1].trim())
      .filter((sel) => !sel.startsWith("@"));
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
    /* ⚠️ FOUR MORE ON 17 SEP: the contact page's headline, its three reasons and its form heading,
       and the footer's column heads. The footer's is the one owner without `!important`, and
       correctly — it styles h4s, which brand.tsx does not force. */
    /* ⚠️ THE SET MOVED TWICE ON 18 SEP. `.mk-cartitle` LEFT with the status carousel; `.mk-vh3` and
       `.mk-visionh2` ARRIVED with the white vision band. Both are single-class + `!important`,
       which is enough on an h2/h3 (brand.tsx's rule is 0-0-1 there) and would NOT be enough on an
       h1, whose injected selector is `h1:not(.wsh-title)` at 0-1-1. */
    expect(ruleOwners("Special Elite").sort()).toEqual([
      ".mk-claimband .mk-claimh2",
      ".mk-contact .mk-ch1",
      ".mk-footcol h4",
      ".mk-formcard .mk-formh2",
      ".mk-frow h3",
      ".mk-fw .mk-fwcard h2",
      ".mk-fw .mk-fwh1",
      ".mk-hero .mk-herotitle",
      ".mk-mission .mk-mission-main",
      ".mk-missionturn",
      ".mk-sechead h2",
      ".mk-stateyebrow",
      ".mk-stattitle",
      ".mk-vh3",
      ".mk-visionh2",
      ".mk-way .mk-wayh",
    ]);
    expect(ruleOwners("Source Serif 4").sort())
      .toEqual([".mk-fcopy p", ".mk-herolink", ".mk-heropill", ".mk-herosub", ".mk-vbody", ".mk-visionmore"]);
    const src = resolve(here, "..");
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(resolve(dir, d.name))
        : /\.(css|tsx?)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [resolve(dir, d.name)] : []);
    const files = walk(src);
    expect(files.length, "the sweep found the source tree").toBeGreaterThan(100);
    const elsewhere = files
      .filter((f) => !f.replace(/\\/g, "/").endsWith("/marketing/marketing.css"))
      .filter((f) => /Special Elite|Source Serif 4/.test(decls(readFileSync(f, "utf8"))));
    /* ⚠️ ONE SIGNED-IN OWNER, AND IT IS NAMED RATHER THAN WAVED THROUGH (dashboard header, stage 1,
       17 Sep). The dashboard's greeting is set in Special Elite by Nick's brief — the deliberate
       decision this lock exists to surface. It is the only file outside the marketing sheet allowed
       to name either family; it names only the typewriter face, and only in the greeting's own rule.
       A second signed-in surface adopting the face is still a decision this fails on. */
    /* ⚠️ A SECOND SIGNED-IN OWNER SINCE THE v34 MOCKUP (19 Sep), AND IT IS NAMED, NOT WAVED THROUGH. Nick's
       brief sets the top bar's shared controls — the search placeholder, Give feedback, Help's "?", and
       + New — in Special Elite, on every workspace page. The bar renders under two shells and neither
       is a descendant of `.os-root`, so the dashboard's `--os-type` cannot reach it (a token that
       resolves to nothing falls back in silence): `shell/primitives.css` declares `--sp-type` at
       `:root`. That is the whole of it — ONE declaration, the token — and a third file naming the
       face is still a decision this fails on. */
    expect(elsewhere.map((f) => f.slice(src.length + 1).replace(/\\/g, "/")).sort())
      .toEqual(["components/dashboard/oneScreen.css", "components/shell/primitives.css"]);
    const prim = decls(readFileSync(resolve(src, "components/shell/primitives.css"), "utf8"));
    const primOwners = [...prim.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)]
      .filter((m) => /Special Elite|Source Serif 4/.test(m[2])).map((m) => m[1].trim());
    expect(primOwners, "the shell names the face once, as a token, and every control reads it").toEqual([":root"]);
    expect(prim).not.toContain("Source Serif 4");
    const dash = decls(readFileSync(resolve(src, "components/dashboard/oneScreen.css"), "utf8"));
    const dashOwners = [...dash.matchAll(/(?:^|\n)([^@{}][^{}]*?)\{([^{}]*)\}/g)]
      .filter((m) => /Special Elite|Source Serif 4/.test(m[2])).map((m) => m[1].trim());
    /* ⚠️ ONE DECLARATION IN THAT SHEET SINCE v16 (18 Sep), AND IT IS THE TOKEN. `.os-root` declares
       `--os-type`; the greeting, the card headings, the quick-action labels and the manuscript runs in
       the feed all READ it, so the family is named once on the signed-in side of the app. A second
       rule naming the face here is still a decision this fails on. */
    expect(dashOwners).toEqual([".os-root"]);
    expect(dash).not.toContain("Source Serif 4");
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
describe("the nav wordmark is artwork, and the display face it replaced is gone", () => {
  /**
   * ⚠️ FOUR CASES RETIRED WITH THEIR SUBJECT, NOT WEAKENED. They asserted that Archivo Expanded was
   * self-hosted, that its `@font-face` and index.html's preload named the SAME url character for
   * character, that it dressed the nav and left the footer in Playfair, and that nothing else named
   * it. Every one of those claims is about a webfont that no longer exists — the nav renders drawn
   * letterforms, so the face, its 14.5KB woff2, its OFL licence and its preload are all deleted. A
   * lock kept alive over a deleted subject is the vacuous kind this repo keeps finding: it passes
   * because the probe has nothing left to object to.
   */
  it("no rule, file or preload names the retired display face", () => {
    expect(marketing, "the @font-face went with the wordmark").not.toMatch(/@font-face/);
    expect(marketing).not.toMatch(/Archivo/);
    const html = readFileSync(resolve(here, "../../index.html"), "utf8");
    expect(html, "the preload pointed at a file that is gone").not.toMatch(/archivo/i);
    expect(html).not.toMatch(/fonts\/[^"]*\.woff2/);
    const src = resolve(here, "..");
    const walk = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? walk(resolve(dir, d.name))
        : /\.(css|tsx?)$/.test(d.name) && !/\.test\.tsx?$/.test(d.name) ? [resolve(dir, d.name)] : []);
    expect(walk(src).filter((f) => /Archivo/.test(decls(readFileSync(f, "utf8"))))).toEqual([]);
  });

  /**
   * ⚠️ THE NAV AND THE FOOTER MUST NOT CONVERGE, AND THAT IS WHY THERE ARE TWO CLASSES. `.mk-wordmark`
   * is SHARED — the footer renders it in Playfair — so restyling the bare class, which is the obvious
   * way to do this, would have put the artwork in both places. The nav has its own element instead.
   */
  it("the nav wears the picture and the footer keeps its type", () => {
    const art = ruleFor(".mk-wordmarkart");
    expect(art, "a fixed height with `width: auto` — the file is 500x100").toMatch(/height:\s*34px/);
    expect(art).toMatch(/width:\s*auto/);
    expect(ruleFor(".mk-wordmark"), "the footer's, untouched").toMatch(/font-family:\s*"Playfair Display"/);
    expect(marketing, "the nav no longer restyles the shared class").not.toMatch(/\.mk-nav \.mk-wordmark\s*\{/);
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
