/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The first-visit tour — polish P5 retarget: hero → search → rail pills → the review chip → a card →
 * Today. Copy snapshot-locked; the auto-run gate unchanged.
 */
import { describe, it, expect } from "vitest";
import { TOUR_STOPS, shouldAutoRunTour } from "./todoTour";

describe("TOUR_STOPS — eight stops (notes-and-tasks adds the note/task step), Done on the last", () => {
  it("is exactly the eight stops in order: rail → hero → add → search → pills → review → a card → Today", () => {
    expect(TOUR_STOPS.map((s) => s.sel)).toEqual([
      ".spine-rail",
      ".tdb-herobegin",
      ".svh-btn-primary", // notes-and-tasks P4: the hero's "Add task or note"
      ".tdb-bsearch",
      ".tdb-tools", // board+dock P1: the control bar became the header tool row
      ".tdb-revlink",
      ".tdb-tile, .tdb-gcard, .tdb-lrow",
      // workspace P3: Today's stop left the retired corner for the sidebar group that reaches it.
      '[aria-expanded][class*="asec"], .ws-navrow',
    ]);
    expect(TOUR_STOPS.slice(0, -1).every((s) => s.cta === "Next →")).toBe(true);
    expect(TOUR_STOPS[TOUR_STOPS.length - 1].cta).toBe("Done");
  });
  it("copy snapshot", () => {
    expect(TOUR_STOPS.map((s) => s.h)).toEqual([
      "Your whole workspace, spined.",
      "Say go, any time.",
      "A note, or a task.",
      "Search from the bar.",
      "Narrow the desk.",
      "Your week, reviewed.",
      "Every card works the same.",
      "Today has its own page.",
    ]);
    expect(TOUR_STOPS[0].p).toContain("from the rail"); // the spine's category rail
    expect(TOUR_STOPS[1].p).toContain("focused session");
    expect(TOUR_STOPS[2].p).toContain("nothing chases you"); // notes-and-tasks: the two natures
    expect(TOUR_STOPS[3].p).toContain("⌘K");
    expect(TOUR_STOPS[4].p).toContain("All brings everything back"); // todo rebuild P1: the reset chip is "All"
    expect(TOUR_STOPS[5].p).toContain("turns the dial in your favour");
    expect(TOUR_STOPS[6].p).toContain("Hover for the actions");
    expect(TOUR_STOPS[6].p).toContain("Batches expand in place");
    expect(TOUR_STOPS[7].p).toContain("under To-do in the sidebar");
  });
});

describe("shouldAutoRunTour — the once gate (unchanged by the rewire)", () => {
  it("runs when the flag is absent and the desk is not new", () => {
    expect(shouldAutoRunTour(undefined, "normal" as never)).toBe(true);
    expect(shouldAutoRunTour(null, "desk-cleared" as never)).toBe(true);
  });
  it("never on a new desk; never once stamped", () => {
    expect(shouldAutoRunTour(undefined, "new-desk" as never)).toBe(false);
    expect(shouldAutoRunTour("2026-07-16T09:00:00Z", "normal" as never)).toBe(false);
  });
});
