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
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const css = (f: string) => readFileSync(resolve(here, f), "utf8");
/** ⚠️ Comments first — this file's prose names every value it retires. */
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const marketing = decls(css("marketing.css"));
const app = decls(css("../index.css"));

const value = (src: string, token: string) => {
  const m = new RegExp("\\" + token + "\\s*:\\s*([^;]+);").exec(src);
  return m ? m[1].trim() : null;
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
    const rule = new RegExp("\\" + selector + "\\s*\\{([^}]*)\\}").exec(marketing);
    expect(rule, `${selector} has a rule`).toBeTruthy();
    const m = /max-width\s*:\s*([\d.]+)px/.exec(rule![1]);
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
