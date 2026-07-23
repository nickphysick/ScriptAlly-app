/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The first-visit tour — polish P5 retarget: hero → search → rail pills → the review card → a card →
 * Today. Copy snapshot-locked; the auto-run gate unchanged.
 */
import { describe, it, expect } from "vitest";
import { TOUR_STOPS, shouldAutoRunTour } from "./todoTour";

describe("TOUR_STOPS — six stops (Final Shape rewire), Done on the last", () => {
  it("is exactly the six stops in order: hero → search → pills → review card → a card → Today", () => {
    expect(TOUR_STOPS.map((s) => s.sel)).toEqual([
      ".tdb-fsb2",
      ".tdb-bigsearch",
      ".tdb-fpill, .tdb-fpillbtn",
      ".tdb-rvbox",
      ".tdb-tile, .tdb-gcard, .tdb-lrow",
      ".tdb-today2, .tdb-todaychip",
    ]);
    expect(TOUR_STOPS.slice(0, -1).every((s) => s.cta === "Next →")).toBe(true);
    expect(TOUR_STOPS[TOUR_STOPS.length - 1].cta).toBe("Done");
  });
  it("copy snapshot", () => {
    expect(TOUR_STOPS.map((s) => s.h)).toEqual([
      "Say go, any time.",
      "Search floats above it all.",
      "Narrow the desk.",
      "Your week, reviewed.",
      "Every card works the same.",
      "Today lives beside your work.",
    ]);
    expect(TOUR_STOPS[0].p).toContain("focused session");
    expect(TOUR_STOPS[1].p).toContain("⌘K");
    expect(TOUR_STOPS[2].p).toContain("RESET brings everything back");
    expect(TOUR_STOPS[3].p).toContain("turns the dial in your favour");
    expect(TOUR_STOPS[4].p).toContain("Hover for the quick verbs");
    expect(TOUR_STOPS[5].p).toContain("struck through as you go");
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
