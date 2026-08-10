/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The page skeleton (audit pack P1) — what must stay true about it.
 *
 * ⚠️ THE ONE THING WORTH LOCKING IS THAT IT DOES NOT OWN A GRID. Everything else about a skeleton
 * is cosmetic and will be tuned; the property that makes it correct rather than decorative is that
 * its geometry is the PAGE's geometry, reused. A future pass that "tidies" the ghost into its own
 * `grid-template-columns` would look neater, pass every visual glance on the day, and drift
 * silently the first time a column moved — because nothing ever renders both at once to compare.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { describe, expect, it } from "vitest";
import { OneScreenSkeleton } from "./OneScreenSkeleton";

const css = readFileSync(join(__dirname, "oneScreen.css"), "utf8");
const dash = readFileSync(join(__dirname, "OneScreenDashboard.tsx"), "utf8");
const html = renderToStaticMarkup(<OneScreenSkeleton />);

describe("the page skeleton mirrors the page", () => {
  it("renders the REAL layout containers, not a private copy of the grid", () => {
    for (const cls of ["os-content", "os-greet", "os-gl", "os-colM", "os-midrow", "os-colR"]) {
      expect(html).toContain(cls);
    }
  });

  /* ⚠️ THE ANCHOR IS THE RULE, NOT THE NAME. Anchoring on `.os-skelpage` alone matched its FIRST
     mention — a cross-reference inside `.os-root`, 240 lines earlier — so the slice swallowed
     `.os-content`'s own grid and the test failed while the CSS was correct. Both halves are
     asserted before anything is read out of them. */
  it("⚠️ and declares no grid of its own — the columns are the page's, or they will drift", () => {
    const from = css.indexOf(".os-skelpage {");
    const to = css.indexOf("§11 · RESPONSIVE FRAME");
    expect(from).toBeGreaterThan(-1);
    expect(to).toBeGreaterThan(from);
    const sk = css.slice(from, to);
    expect(sk).not.toContain("grid-template-columns");
    expect(sk).not.toContain("column-gap");
  });

  it("stands in for every card on the page — nothing loads unannounced", () => {
    // header counters · author tile · chart · tasks · goal · activity
    expect(html.match(/os-sk-card/g) ?? []).toHaveLength(2);
    for (const cls of ["os-sk-counters", "os-sk-tasks", "os-sk-goal", "os-sk-actv"]) {
      expect(html).toContain(cls);
    }
  });

  it("is hidden from assistive tech — a shape tells a screen reader nothing", () => {
    expect(html).toContain('aria-hidden="true"');
  });
});

describe("the shimmer", () => {
  /* ⚠️ WHOLE-STRING MATCHES, NOT SLICES. The first draft of this test sliced from `indexOf("100%")`
     — which lands inside `translateX(-100%)` on the line ABOVE, because that string contains it.
     The slice then ended before the selector it meant to check and the assertion failed for a
     reason that had nothing to do with the CSS. See CLAUDE.md, "ANCHOR BEFORE YOU SLICE". */
  it("⚠️ keyframe selectors are LITERAL percentages — a var() there drops the block in silence", () => {
    expect(css).toMatch(
      /@keyframes os-sk-sweep \{\s*0% \{ transform: translateX\(-100%\); \}\s*100% \{ transform: translateX\(100%\); \}\s*\}/,
    );
  });

  it("sweeps with transform only — never width, left or background-position", () => {
    const at = css.indexOf(".os-sk::after {");
    expect(at).toBeGreaterThan(-1);
    const decl = css.slice(at, css.indexOf("}", at));
    expect(decl).toContain("transform: translateX(-100%)");
    expect(decl).not.toMatch(/\n\s+(left|width|margin-left|background-position):/);
  });

  it("⚠️ reduced motion kills the animation NAME, not its duration", () => {
    // The sheet's blanket rule forces `animation-duration: .01ms !important` inside `.os-root`,
    // which would leave an infinite sweep strobing rather than stopped.
    expect(css).toContain("animation-name: none !important");
    expect(css).toMatch(/\.os-sk \{ opacity: 0\.\d+; \}/);
  });
});

/**
 * ⚠️ THE PAGE MUST NOT ARRIVE TWICE, AND THE COVER MUST BE THE ONLY SKELETON EVER SEEN.
 *
 * The dashboard has TWO skeleton systems: the per-card `.isload` bars (§8, instant, no timing
 * discipline) and the page cover. The reported blink survived three fixes because all three lived
 * in the cover's reveal — and the cover, behind its then-200ms delay, never mounted on a warm
 * Firestore load. What the user was watching was the OTHER system snapping to content in one
 * frame. The cover is now on from the FIRST PAINT (initialised state, not an effect), so the bars
 * are never seen and every load resolves the same way: hold, then dissolve.
 */
describe("the reveal — one arrival, not two", () => {
  it("⚠️ the entrance stagger is SKIPPED when the cover was shown", () => {
    expect(dash).toContain("if (skeleton.wasShown) return;");
    // …and the guard sits before the class is ever added
    const at = dash.indexOf("if (skeleton.wasShown) return;");
    const add = dash.indexOf('classList.add("enter")');
    expect(at).toBeGreaterThan(-1);
    expect(add).toBeGreaterThan(at);
  });

  it("⚠️ …and NOT deleted — a mount that BEGINS loaded shows no cover, and then it is the arrival", () => {
    expect(dash).toContain('classList.add("enter")');
    expect(dash).toContain('classList.remove("enter")');
  });

  it("⚠️ the cover dissolves rather than vanishing — mounted through its fade", () => {
    expect(dash).toContain('skeleton.phase !== "off" && <OneScreenSkeleton leaving={skeleton.phase === "out"} />');
    const at = css.indexOf(".os-skelpage {");
    expect(at).toBeGreaterThan(-1);
    expect(css.slice(at, css.indexOf("}", at))).toContain("transition: opacity 250ms ease");
    expect(css).toContain(".os-skelpage.out { opacity: 0; pointer-events: none; }");
  });

  /* ⚠️ THE HOOK IS READ ABOVE THE EFFECT THAT USES IT. A `const` referenced before its declaration
     sits in the temporal dead zone and throws on the render that reaches it — the failure this
     repo has already shipped once, on a page carrying a warning against exactly it. */
  it("⚠️ useSkeleton is declared BEFORE the entrance effect reads it", () => {
    const decl = dash.indexOf("const skeleton = useSkeleton(loading)");
    const read = dash.indexOf("if (skeleton.wasShown) return;");
    expect(decl).toBeGreaterThan(-1);
    expect(read).toBeGreaterThan(decl);
  });
});

describe("the timing is the lib's, not the component's", () => {
  it("the dashboard renders the skeleton off useSkeleton — never off `loading` directly", () => {
    expect(dash).toContain("const skeleton = useSkeleton(loading)");
    expect(dash).not.toContain("loading && <OneScreenSkeleton");
  });

  it("the three content-driven heights are declared once, as tokens", () => {
    for (const t of ["--os-sk-counters-h", "--os-sk-goal-h", "--os-sk-tasks-h"]) {
      expect(css).toContain(`${t}:`);
      expect(css).toContain(`var(${t})`);
    }
  });
});
