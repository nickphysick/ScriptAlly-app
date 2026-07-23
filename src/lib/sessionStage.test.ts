/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The final session's stage maths + timing spines (the in-place gather). Real unit tests —
 * the lib is pure. (The dark-room opening's nearest-edge/spotlight maths left with it.)
 */
import { describe, it, expect } from "vitest";
import { gatherTransform, staggerFor, restTop, GATHER, DEAL, RITUAL_LINES, EXIT_LEFT, EXIT_RIGHT, EXIT_FADE, EXIT_BAR, DISSOLVE, GATHER_SELECTOR } from "./sessionStage";

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
    expect(EXIT_LEFT).toBe(".tdb-fside");
    expect(EXIT_RIGHT).toBe(".tdb-railr");
    expect(EXIT_FADE).not.toContain(".tdb-bigsearch"); // v7: the HERO owns the search/pair crossfade
    expect(EXIT_FADE).toContain(".tdb-lh2");
    expect(EXIT_BAR).toBe(".tdb-dochead");
    expect(DISSOLVE).toBe(".tdb-mainc, .tdb-lsec");
    // the gatherables are the items, never their dissolving containers
    for (const shell of [".tdb-mainc", ".tdb-lsec", ".tdb-fside", ".tdb-railr", ".tdb-wrap"]) {
      expect(GATHER_SELECTOR.split(", ")).not.toContain(shell);
    }
    expect(GATHER_SELECTOR).toContain(".tdb-cell");
    expect(GATHER_SELECTOR).toContain(".tdb-lrow");
  });
});

describe("THE DEAL's spine (option A at the rest line)", () => {
  it("stamp pop 350 · hold 520 · sweep 500 · the rise 450 at +180 · skip 450; the deck caps at two", () => {
    expect(DEAL.stampPopMs).toBe(350);
    expect(DEAL.stampHoldMs).toBe(520);
    expect(DEAL.sweepMs).toBe(500);
    expect(DEAL.riseDelayMs).toBe(180);
    expect(DEAL.riseMs).toBe(450); // the final pack's figure
    expect(DEAL.skipMs).toBe(450);
    expect(DEAL.deckMax).toBe(2);
  });
});
