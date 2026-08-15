/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The first-visit tour — polish P5 retarget: hero → search → rail pills → the review chip → a card →
 * Today. Copy snapshot-locked; the auto-run gate unchanged.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { TOUR_STOPS, shouldAutoRunTour } from "./todoTour";

describe("TOUR_STOPS — eight stops (notes-and-tasks adds the note/task step), Done on the last", () => {
  it("is exactly the eight stops in order: rail → hero → add → search → pills → review → a card → Today", () => {
    expect(TOUR_STOPS.map((s) => s.sel)).toEqual([
      ".spine-rail",
      ".tdb-herobegin",
      ".svh-btn-primary", // notes-and-tasks P4: the hero's "Add task or note"
      // ⚠️ BOTH MOVED TO THE RAIL (P4). The search's old selector matched nothing and the step
      // would have vanished silently; the chips' old one still MATCHES — it would have pointed
      // confidently at the page's sort and Add while describing filters. The second is why this
      // census exists: a stop can go wrong without going missing.
      ".tdw-search",
      ".tdw-menuwrap",
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
      "Search your list.",
      "Narrow the list.",
      "Your week, reviewed.",
      "Every card works the same.",
      "Today has its own page.",
    ]);
    expect(TOUR_STOPS[0].p).toContain("from the rail"); // the spine's category rail
    expect(TOUR_STOPS[1].p).toContain("focused session");
    expect(TOUR_STOPS[2].p).toContain("nothing chases you"); // notes-and-tasks: the two natures
    expect(TOUR_STOPS[3].p).toContain("⌘K");
    /* ⚠️ THE CHIP STRIP IS A MENU NOW (corrections, Phase 5), so "All brings everything back" —
       true of a chip you could see — describes a row you have to open a menu to find. What the
       stop must teach instead is that the button FILLS while a narrowing is on, because that is
       the only thing left on the page saying a short list is short on purpose. */
    expect(TOUR_STOPS[4].p).toContain("fills with ink");
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

/**
 * ⚠️ A TOUR STOP CAN GO WRONG WITHOUT GOING MISSING, AND BOTH WAYS ARE SILENT.
 *
 * `TodoTour` locates targets at open and FILTERS OUT stops whose selector matches nothing. That
 * is the right behaviour — a replay on a page missing a feature should not break — but it makes a
 * stale selector invisible: the step simply stops existing and nobody is told.
 *
 * The rail rebuild produced one of each failure in a single commit. `.tdb-bsearch` matched nothing
 * once the search moved, so that stop would have vanished. `.tdb-tools` still MATCHED — it is the
 * page's sort and Add now — so that stop would have pointed confidently at the wrong controls
 * while describing filters correctly. The second is the worse one, and neither is loud.
 *
 * This census cannot prove a stop points at the RIGHT thing. It can prove every stop points at
 * something that still exists in the source, which is the half that was failing.
 */
describe("⚠️ EVERY TOUR TARGET STILL EXISTS — a stop that misses is dropped in silence", () => {
  const root = join(__dirname, "..");
  /**
   * ⚠️ MARKUP ONLY — A CSS RULE IS NOT A RENDERED TARGET, and this is the hole that let a dead
   * stop through. The census used to read `.tsx` AND `.css`, so `.tdw-chips` stayed "live" on the
   * strength of an ORPHANED stylesheet rule for weeks after the markup went. A tour locates its
   * targets in the DOM; only something that renders can be one.
   */
  const sources = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const full = join(dir, e.name);
      if (e.isDirectory()) return sources(full);
      return /\.tsx$/.test(e.name) && !/\.test\./.test(e.name) ? [full] : [];
    });
  const corpus = sources(root).map((f) => readFileSync(f, "utf8")).join("\n");

  /**
   * ⚠️ ONE KNOWN-STALE STOP, NAMED RATHER THAN TOLERATED — AND THIS CENSUS IS HOW IT WAS FOUND.
   *
   * `.spine-rail` was the hardback spine's category rail. That shell was replaced (the claude-il
   * merge brought app-shell-v2 chrome), and the selector appears NOWHERE in `src/` any more —
   * only here and in the stop itself. So the first stop of the tour has been silently dropping
   * for some time and the tour has been showing seven steps, not the eight this file asserts.
   *
   * It is not retargeted here because that is a product decision, not a mechanical one: either it
   * points at the new shell's nav or the step goes. Left standing, named, and reported.
   *
   * ⚠️ THIS LIST MAY ONLY EVER SHRINK. An exemption that grows is a census that has stopped
   * counting.
   */
  const KNOWN_STALE = [
    /* the hardback spine's category rail — that shell was replaced by app-shell-v2 chrome and the
       class appears nowhere in `src/` any more. Stop 1 has been dropping in silence. */
    ".spine-rail",
    /* ⚠️ THIS ONE IS WORSE THAN A DEAD SELECTOR, AND THE CENSUS ONLY FOUND HALF OF IT. The class
       half (`.ws-navrow`) is dead; the attribute half may still match the sidebar's accordion, so
       the stop can still SHOW — carrying copy that says "Today has its own page" about a page
       RETIRED on 9 August (tasks-consolidation P1). A stop that fails to appear teaches nothing;
       this one teaches something untrue. Reported for a decision, not patched here. */
    '[aria-expanded][class*="asec"], .ws-navrow',
  ];

  it("each stop names at least one class the app still renders or styles", () => {
    for (const stop of TOUR_STOPS) {
      if (KNOWN_STALE.includes(stop.sel)) continue;
      /* a stop may list ALTERNATIVES (".tdb-tile, .tdb-gcard, .tdb-lrow") — one surviving target
         is a live stop, so the assertion is over the set rather than every member */
      const classes = [...stop.sel.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]);
      if (classes.length === 0) continue; // attribute-only selectors are not this case's business
      const alive = classes.some((c) => corpus.includes(c));
      expect(alive, `no source mentions any of ${classes.join(", ")} — stop "${stop.h}" is dead`).toBe(true);
    }
  });

  it("⚠️ AND THE TWO THE REBUILD MOVED POINT AT THE RAIL, not at the page's tool row", () => {
    const sels = TOUR_STOPS.map((s) => s.sel);
    expect(sels).toContain(".tdw-search");
    expect(sels).toContain(".tdw-menuwrap");
    /* `.tdb-bsearch` is extinct; `.tdb-tools` still exists but is no longer what this stop meant */
    expect(sels).not.toContain(".tdb-bsearch");
    expect(sels).not.toContain(".tdb-tools");
  });
});
