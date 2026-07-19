/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { TOUR_STOPS, shouldAutoRunTour } from "./todoTour";

describe("shouldAutoRunTour — flag absent ∧ not new-desk", () => {
  it("runs when never seen and the board has data", () => {
    expect(shouldAutoRunTour(undefined, null)).toBe(true);
    expect(shouldAutoRunTour(null, "desk-cleared")).toBe(true);
  });
  it("never runs on a new desk (no targets, the welcome card is the doorway)", () => {
    expect(shouldAutoRunTour(undefined, "new-desk")).toBe(false);
  });
  it("never auto-runs once seen (complete OR skip both set the flag)", () => {
    expect(shouldAutoRunTour("2026-07-16T10:00:00.000Z", null)).toBe(false);
    expect(shouldAutoRunTour("2026-07-16T10:00:00.000Z", "desk-cleared")).toBe(false);
  });
});

describe("TOUR_STOPS — five stops (workbench retargets), Done on the last", () => {
  it("is exactly the five stops in order — 4 and 5 retargeted to the drawer (FAB + masthead walk retired)", () => {
    expect(TOUR_STOPS.map((s) => s.sel)).toEqual([
      ".tdb-postits",
      "#tdb-lane-do",
      "#tdb-lane-do .tdb-pill",
      ".tdb-today2, .tdb-todaychip",
      ".tdb-focus",
    ]);
  });
  it("copy snapshot (stop 4 re-worded for the drawer — the ring sentence went with the FAB)", () => {
    expect(TOUR_STOPS.map((s) => [s.h, s.p])).toEqual([
      ["Your desk, counted.", "Three post-its, three kinds of work: pressing things, tidy-up jobs, and your own notes. Tap one to jump to its pile."],
      ["Urgent — where your move matters.", "Requests, deadlines and offers land here, most pressing first. Click any card to work through it, one question at a time."],
      ["Build a list you’ll finish.", "Commit up to five things to today. Small on purpose — a finished list beats a long one."],
      ["Today lives beside your work.", "Your committed list and everything you’ve done today, struck through as you go."],
      ["Or just say go.", "This is Focus mode — it walks your urgent pile for you, one sheet at a time; nothing saved until you approve the lot."],
    ]);
  });
  it("the last stop ends with Done (Act 2 is dropped); the rest advance", () => {
    expect(TOUR_STOPS[TOUR_STOPS.length - 1].cta).toBe("Done");
    expect(TOUR_STOPS.slice(0, -1).every((s) => s.cta === "Next →")).toBe(true);
  });
});
