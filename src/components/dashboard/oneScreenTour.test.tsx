/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the spotlight tour (spec §12; P7). The spotlight's motion and focus walk are browser
 * checks; what is lockable here is the copy, the visibility derivations (lib), the scrim
 * mechanism and the wiring — asserted at source where a portal cannot render in node.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { TOUR_BREAKPOINT, TOUR_STEPS } from "./OneScreenTour";

const css = readFileSync(resolve(__dirname, "./oneScreenTour.css"), "utf8");
const cssRules = css.replace(/\/\*[\s\S]*?\*\//g, "");
const tsx = readFileSync(resolve(__dirname, "./OneScreenTour.tsx"), "utf8");
const dash = readFileSync(resolve(__dirname, "./OneScreenDashboard.tsx"), "utf8");

describe("§12 · the six steps, copy verbatim from the ref", () => {
  it("chart → tasks → author tile → goals → activity → closing card", () => {
    expect(TOUR_STEPS.map((s) => s.sel)).toEqual([".os-lead", ".os-tasks", ".os-aut", ".os-goal", ".os-actv", null]);
    expect(TOUR_STEPS[0].title).toBe("Your queries, charted");
    expect(TOUR_STEPS[5].title).toBe("That's your desk");
    expect(TOUR_STEPS[5].body).toContain("any time in your first week");
  });

  it("every step has real copy — no placeholders", () => {
    for (const s of TOUR_STEPS) {
      expect(s.title.length).toBeGreaterThan(3);
      expect(s.body.length).toBeGreaterThan(20);
    }
  });
});

describe("§12 · the spotlight mechanism", () => {
  it("⚠️ the scrim IS the hole's 9999px box-shadow — never a separate overlay div", () => {
    expect(cssRules).toContain("box-shadow: 0 0 0 9999px rgba(43, 33, 24, 0.46)");
    const hole = sliceBetween(cssRules, ".os-tourhole {", ".os-tourcard {");
    expect(hole).toContain("pointer-events: none");
    expect(hole).toContain("border-radius: 16px");
    expect(hole).toContain("transition: all 0.45s");
  });

  it("the card is the Form 11 mini: parchment pad, burgundy frame, sage band, dots", () => {
    expect(cssRules).toContain(".os-tourcard .frame2 { border: 1px solid #7c3a2a; border-radius: 9px; overflow: hidden; }");
    expect(cssRules).toContain(".os-tourcard .thdr { background: #d7ddd5;");
    expect(cssRules).toContain(".os-tourcard .dots2 i.on { background: #7c3a2a; }");
  });

  it("reduced motion stills the hole and the card", () => {
    expect(cssRules).toContain("@media (prefers-reduced-motion: reduce)");
  });
});

describe("§12 · controls and visibility (asserted at source — a portal cannot render in node)", () => {
  it("keyboard: ←/→ step, Esc ends; focus moves to Next each step", () => {
    expect(tsx).toContain('e.key === "Escape"');
    expect(tsx).toContain('e.key === "ArrowRight"');
    expect(tsx).toContain('e.key === "ArrowLeft"');
    expect(tsx).toContain("nextRef.current?.focus()");
  });

  it("⚠️ skipping counts as completing — BOTH roads stamp tourCompletedAt", () => {
    expect(dash).toContain("tourCompletedAt: new Date().toISOString(), tourDismissed: true");
    expect(dash).toMatch(/skipped\s*\?\s*\{ tourCompletedAt[\s\S]*?\}\s*:\s*\{ tourCompletedAt/);
  });

  it("the tour collapses the rail before starting, and focus returns to the launcher on end", () => {
    expect(dash).toContain("setRailExpanded(false); setTouring(true);");
    expect(dash).toContain("tourChipRef.current?.focus()");
  });

  it("auto-run is gated on the completion stamp and the breakpoint; the chip on account age", () => {
    expect(dash).toContain("tourAutoRuns(currentUser?.tourCompletedAt, wideEnough())");
    expect(dash).toContain("tourChipShows(createdAt, now, wideEnough())");
    expect(TOUR_BREAKPOINT).toBe(1024);
    expect(cssRules).toContain("@media (max-width: 1024px) { .os-tourchip { display: none; } }");
  });

  it("⚠️ auth is lazy-loaded in an effect — a module-level firebase import breaks the node env", () => {
    expect(dash).toContain('import("../../lib/firebase")');
    expect(dash).not.toMatch(/^import \{ auth \}/m);
  });
});
