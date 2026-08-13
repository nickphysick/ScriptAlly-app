/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub v4 · PHASE 4 locks — the route-entry load animation (ref queries-hub-v4.html).
 *
 * ⚠️ jsdom cannot run an animation, measure a 7px rise or time a stagger. These lock the RULES
 * the motion follows; the motion itself needs a browser. Flagged for manual review.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const css = readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8");
const queries = readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");

describe("it runs on ROUTE ENTRY, not on every render", () => {
  it("the page is told when it is the visible route", () => {
    // Amendment 1 (H3) added a sibling route under the same routeKey, so the flag now excludes it.
    expect(app).toContain('routeActive={routeKey === "queries" && !queriesAnalytics}');
    expect(queries).toContain("routeActive");
  });

  it("the entry class is set on the false→true transition only", () => {
    expect(queries).toContain("if (routeActive && !prevRouteActive.current) setEntering(true)");
    expect(queries).toContain('${entering ? " qh-enter" : ""}');
  });
});

describe("the motion itself is CSS — no JS drives a frame", () => {
  it("it ADOPTS the shared `rise` — it does not define a second keyframe of its own", () => {
    const motion = readFileSync(new URL("../styles/motion.css", import.meta.url), "utf8");
    expect(motion, "the shared vocabulary lost `rise`").toContain("@keyframes rise");
    expect(css, "the page consumes the shared keyframe").toContain("animation: rise ");
    // motion.css is explicit: one `rise` app-wide. A local twin under another name is the thing
    // it forbids, and v4's `qhRise` was exactly that.
    expect(css, "a local rise-alike keyframe came back").not.toMatch(/@keyframes\s+qh/i);
  });

  it("fill-mode is BACKWARDS, never both — a finished element must hold no transform", () => {
    const entry = css.match(/^\.qh-enter[^{]*\{[^}]*\}/gm) ?? [];
    expect(entry.length).toBeGreaterThan(5);
    for (const rule of entry) {
      expect(rule, `${rule} lost its backwards fill`).toMatch(/backwards|animation-delay/);
      expect(rule, "a `both` fill would leave a transform behind and trap position:fixed furniture").not.toContain(" both;");
    }
  });

  it("no var() inside a keyframe percentage selector (the recurring silent-failure trap)", () => {
    /**
     * ⚠️ THE SELECTOR, NOT THE WHOLE BLOCK — and this was widened by accident rather than by
     * argument. The documented failure (CLAUDE.md, and this case's own title) is a `var()` in a
     * keyframe PERCENTAGE: the block is dropped and the animation silently does not play.
     * `background: var(--pink-t)` in a `from` DECLARATION is ordinary, supported CSS.
     *
     * ⚠️ AND THE BLANKET FORM WAS ONLY PASSING BECAUSE IT COULD NOT SEE `f12-settle`. That keyframe
     * has used `var()` since it was written and works; written on ONE LINE it had no `\n}` for this
     * regex to reach, and `[^@]*?` cannot cross the next `@keyframes`, so the match failed and the
     * block was never extracted. Reformatting it to the house multi-line form made it visible — so
     * the choice was to narrow a rule that overreached or to rewrite a working animation to satisfy
     * it. `createSaveMotion` already checks the selector form; this now matches it.
     */
    for (const kf of css.match(/@keyframes[^{]*\{[^@]*?\n\}/g) ?? []) {
      for (const line of kf.split("\n")) {
        const sel = line.split("{")[0];
        if (/\d+%|\b(from|to)\b/.test(sel)) {
          expect(sel, `${kf.slice(0, 40)} put a var() in a keyframe SELECTOR — it fails silently`)
            .not.toContain("var(");
        }
      }
    }
  });
});

describe("the order the page settles in", () => {
  const delayOf = (sel: string): number => {
    const i = css.indexOf(sel);
    if (i === -1) return NaN;
    const rule = css.slice(i, css.indexOf("}", i));
    const m = rule.match(/rise [\d.]+s ease-out (?:([\d.]+)s )?backwards/);
    return m ? Number(m[1] ?? 0) : NaN;
  };

  it("masthead → action bar → list card → hero → columns, left to right", () => {
    const mast = delayOf(".qh-enter .f12-hd2");
    const bar = delayOf(".qh-enter .f12-ctl,");
    const list = delayOf(".qh-enter .f12-list");
    const hero = delayOf(".qh-enter .f12-detail .f12-hero");
    const c1 = delayOf(".qh-enter .f12-detail .f12-card:nth-child(1)");
    const c2 = delayOf(".qh-enter .f12-detail .f12-card:nth-child(2)");
    const c3 = delayOf(".qh-enter .f12-detail .f12-card:nth-child(3)");
    for (const v of [mast, bar, list, hero, c1, c2, c3]) expect(Number.isNaN(v)).toBe(false);
    expect(mast).toBeLessThan(bar);
    expect(bar).toBeLessThan(list);
    expect(list).toBeLessThan(hero);
    expect(hero).toBeLessThan(c1);
    expect(c1).toBeLessThan(c2);
    expect(c2).toBeLessThan(c3);
  });

  it("rows stagger 25ms apart and stop at ten", () => {
    expect(css).toContain(".qh-enter .f12-rows .f12-row:nth-child(-n + 10)");
    expect(css).toContain(".qh-enter .f12-rows .f12-row:nth-child(1) { animation-delay: 0.12s; }");
    expect(css).toContain(".qh-enter .f12-rows .f12-row:nth-child(2) { animation-delay: 0.145s; }");
    expect(css).toContain(".qh-enter .f12-rows .f12-row:nth-child(10) { animation-delay: 0.345s; }");
    expect(css, "an 11th row delay means the cap slipped").not.toContain(":nth-child(11) { animation-delay");
  });
});

describe("what must NOT animate", () => {
  it("reduced motion turns every one of them off", () => {
    const rm = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .qh-enter"));
    expect(rm).toContain("animation: none !important");
    for (const sel of [".f12-hd2", ".f12-ctl", ".f12-list", ".f12-hero", ".f12-card", ".f12-row"]) {
      expect(rm.slice(0, rm.indexOf("}")), `${sel} still animates under reduced motion`).toContain(sel);
    }
  });

  it("the app shell is untouched — every rule is scoped under .qh-enter, inside the page", () => {
    const rules = css.match(/^\.qh-enter[^{]*\{/gm) ?? [];
    expect(rules.length).toBeGreaterThan(5);
    for (const sel of ["sv2-", "shell-", "svh-"]) {
      expect(rules.join(" "), `the ${sel} shell chrome was pulled into the page's entry`).not.toContain(sel);
    }
  });
});
