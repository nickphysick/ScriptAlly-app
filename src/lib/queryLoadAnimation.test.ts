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
    expect(app).toContain('routeActive={routeKey === "queries"}');
    expect(queries).toContain("routeActive");
  });

  it("the entry class is set on the false→true transition only", () => {
    expect(queries).toContain("if (routeActive && !prevRouteActive.current) setEntering(true)");
    expect(queries).toContain('${entering ? " qh-enter" : ""}');
  });
});

describe("the motion itself is CSS — no JS drives a frame", () => {
  it("one keyframe pair: a 7px rise from transparent", () => {
    expect(css).toContain("@keyframes qhRise { from { opacity: 0; transform: translateY(7px); }");
  });

  it("fill-mode is BACKWARDS, never both — a finished element must hold no transform", () => {
    const block = css.slice(css.indexOf("@keyframes qhRise"), css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .qh-enter"));
    expect(block).toContain("backwards");
    expect(block, "a `both` fill would leave a transform behind and trap position:fixed furniture").not.toContain(" both;");
  });

  it("no var() inside a keyframe percentage selector (the recurring silent-failure trap)", () => {
    const kf = css.slice(css.indexOf("@keyframes qhRise"), css.indexOf("}", css.indexOf("@keyframes qhRise") + 40) + 1);
    expect(kf).not.toContain("var(");
  });
});

describe("the order the page settles in", () => {
  const delayOf = (sel: string): number => {
    const i = css.indexOf(sel);
    if (i === -1) return NaN;
    const rule = css.slice(i, css.indexOf("}", i));
    const m = rule.match(/qhRise [\d.]+s ease-out (?:([\d.]+)s )?backwards/);
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
