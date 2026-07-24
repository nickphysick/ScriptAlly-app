/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The final session's stage maths + timing spines (the in-place gather). Real unit tests —
 * the lib is pure. (The dark-room opening's nearest-edge/spotlight maths left with it.)
 */
import { describe, it, expect } from "vitest";
import { gatherTransform, staggerFor, restTop, sessionRegion, progressPct, FRAME, GATHER, CARRIAGE, RITUAL_LINES, EXIT_LEFT, EXIT_RIGHT, EXIT_FADE, EXIT_BAR, DISSOLVE, GATHER_SELECTOR } from "./sessionStage";

describe("gatherTransform — the gather law", () => {
  it("centre-aligns onto the first rect and scales to its footprint", () => {
    const f = gatherTransform({ left: 500, top: 400, width: 250, height: 120 }, { left: 100, top: 100, width: 190, height: 96 }, 1);
    expect(f.dx).toBe(100 - 500 + (190 - 250) / 2);
    expect(f.dy).toBe(100 - 400 + (96 - 120) / 2);
    expect(f.scale).toBeCloseTo(190 / 250);
  });
  it("the rotation ALTERNATES sign by index and grows, capped at ±6°", () => {
    expect(gatherTransform({ left: 0, top: 0, width: 100, height: 50 }, { left: 0, top: 0, width: 100, height: 50 }, 1).rot).toBeCloseTo(2.3);
    expect(gatherTransform({ left: 0, top: 0, width: 100, height: 50 }, { left: 0, top: 0, width: 100, height: 50 }, 2).rot).toBeCloseTo(-3.1);
    expect(Math.abs(gatherTransform({ left: 0, top: 0, width: 100, height: 50 }, { left: 0, top: 0, width: 100, height: 50 }, 40).rot)).toBe(6); // the cap
    // the band the pack names: ±1.5–6
    for (let i = 1; i < 50; i++) {
      const r = Math.abs(gatherTransform({ left: 0, top: 0, width: 100, height: 50 }, { left: 0, top: 0, width: 100, height: 50 }, i).rot);
      expect(r).toBeGreaterThanOrEqual(1.5);
      expect(r).toBeLessThanOrEqual(6);
    }
  });
  it("a zero-width item cannot divide by zero", () => {
    expect(gatherTransform({ left: 0, top: 0, width: 0, height: 0 }, { left: 0, top: 0, width: 190, height: 96 }, 1).scale).toBe(1);
  });
});

describe("staggerFor — the crowded-board cap", () => {
  it("small boards keep the full 95ms; crowded boards compress into the budget", () => {
    expect(staggerFor(0)).toBe(0);
    expect(staggerFor(1)).toBe(0);
    expect(staggerFor(5)).toBe(90); // 600/4 = 150 → capped at 90
    expect(staggerFor(44)).toBe(Math.floor(600 / 43)); // 13 — the whole stagger stays ≤ the budget
    expect(staggerFor(44) * 43).toBeLessThanOrEqual(GATHER.staggerBudgetMs);
  });
});

describe("restTop — the centred rest position", () => {
  it("centres the card in the region below the hero, never above the 20px clearance", () => {
    expect(restTop(600, 240)).toBe((600 - 240) / 2 - 10); // v7 lift
    expect(restTop(200, 400)).toBe(GATHER.restMinTopPx); // a tall card clamps to the top clearance
  });
});

describe("the gather's spine", () => {
  it("the ritual lines are the three, verbatim, in order — 'Stacking the deck' is the middle line now", () => {
    expect(RITUAL_LINES).toEqual(["Gathering your tasks…", "Stacking the deck…", "Choosing where to start…"]);
  });
  it("the timings hold the ≤3.5s budget at full length (the stagger capped)", () => {
    const gatherEnd = GATHER.gatherStartMs + GATHER.staggerBudgetMs + GATHER.flyMs;
    const settled = gatherEnd + GATHER.morphMs + 100;
    expect(settled).toBeLessThanOrEqual(GATHER.totalBudgetMs);
    expect(GATHER.exitSlidePct).toBe(150); // v7
    expect(GATHER.lineMs).toBe(780);
    expect(GATHER.gatherOpacity).toBe(0.85);
    expect(GATHER.staggerMs).toBe(90); // v7
    expect(GATHER.reverseMs).toBe(700);
    expect(GATHER.sessionCardW).toBe(500);
  });
  it("the exit selectors: sidebars slide, chrome fades, the bar exits up, the sheet dissolves; nothing nests", () => {
    // the workspace shell (todo-fix48): the sidebar exits via the shell's `.tsh-clearing` class
    // (it names the sidebar for intent); the Today corner + the hero pair/subtitle exit in-wrap
    expect(EXIT_LEFT).toBe(".tsh-nav");
    expect(EXIT_RIGHT).toBe(".tdb-tdpop, .tdb-tdpill"); // the Today corner leaves
    expect(EXIT_FADE).not.toContain(".tdb-bigsearch"); // the search moved to the bar
    expect(EXIT_FADE).toContain(".tdb-heroright"); // the CTA pair fades
    expect(EXIT_FADE).toContain(".tdb-herosub"); // the subtitle fades (the progress row takes its slot)
    expect(EXIT_FADE).toContain(".tdb-lh2");
    expect(EXIT_BAR).toBe(".tdb-dochead"); // the panel's items row
    expect(DISSOLVE).toBe(".tdb-mainc, .tdb-lsec"); // the panel dissolves
    // the gatherables are the items, never their dissolving containers
    for (const shell of [".tdb-mainc", ".tdb-lsec", ".tsh-nav", ".tdb-tdpop", ".tdb-wrap"]) {
      expect(GATHER_SELECTOR.split(", ")).not.toContain(shell);
    }
    expect(GATHER_SELECTOR).toContain(".tdb-cell");
    expect(GATHER_SELECTOR).toContain(".tdb-lrow");
  });
});

describe("THE CARRIAGE's spine (v7 transition A — the straight carriage)", () => {
  it("stamp pop 350 · hold 440 · slide out 500 · slide in 500 · overlap 170", () => {
    expect(CARRIAGE.stampPopMs).toBe(350);
    expect(CARRIAGE.stampHoldMs).toBe(440);
    expect(CARRIAGE.slideOutMs).toBe(500);
    expect(CARRIAGE.slideInMs).toBe(500);
    expect(CARRIAGE.overlapMs).toBe(170);
  });
});

describe("v9 — THE SPACING LAW (sessionRegion): the 48px band, the foot, the centring", () => {
  it("the region begins a MINIMUM 48px clear band below the progress row", () => {
    expect(FRAME.bandPx).toBe(48);
    expect(sessionRegion(300, 900).top).toBe(348);
    expect(sessionRegion(300, 900).top - 300).toBeGreaterThanOrEqual(48);
  });
  it("it ends at the stage foot — the quiet exit line's strip is never overrun", () => {
    const r = sessionRegion(300, 900);
    expect(r.top + r.height).toBe(900 - FRAME.footPx);
    expect(FRAME.footPx).toBeGreaterThanOrEqual(28); // the line sits ≥28px above the bottom
  });
  it("it re-derives on resize — a shorter viewport shrinks the region, never the band", () => {
    const tall = sessionRegion(300, 1000);
    const short = sessionRegion(300, 700);
    expect(short.top).toBe(tall.top); // the band is fixed to the hero
    expect(short.height).toBeLessThan(tall.height);
    expect(sessionRegion(300, 200).height).toBe(FRAME.regionMinPx); // never collapses
  });
  it("the page centres INSIDE the region (restTop over the region's height)", () => {
    const r = sessionRegion(280, 900);
    expect(restTop(r.height, 300)).toBe((r.height - 300) / 2 - 10);
  });
});

describe("v9 — the progress treatment (header V2)", () => {
  it("the fraction's fill advances per task and is bounded", () => {
    expect(progressPct(1, 29)).toBe(3);
    expect(progressPct(2, 29)).toBe(7);
    expect(progressPct(29, 29)).toBe(100);
    expect(progressPct(40, 29)).toBe(100);
    expect(progressPct(0, 0)).toBe(0); // an empty queue cannot divide by zero
  });
  it("the bar is the ref's: 340px, a 4px track", () => {
    expect(FRAME.progWidthPx).toBe(340);
    expect(FRAME.progTrackPx).toBe(4);
  });
});
