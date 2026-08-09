/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Queries Hub v5 · PHASE 2 locks — the create-flow choreography (ref qdb-create-motion.html).
 *
 * ⚠️ jsdom runs no animation, measures no rect and fires no transitionend, so NOTHING here proves
 * the motion looks right — that needs a browser (see the manual checklist in the run report).
 * What these lock are the things that go quietly wrong instead: a second keyframe vocabulary, a
 * FLIP measured against a copy of the comparator, a filter test that drifts from the real
 * predicate, motion that ignores reduced-motion, and a discard that loses your place.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const css = readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8");
const queries = readFileSync(new URL("../components/Queries.tsx", import.meta.url), "utf8");
const motion = readFileSync(new URL("../styles/motion.css", import.meta.url), "utf8");

describe("one motion language", () => {
  it("the create flow reuses the SHARED rise — no local twin of it anywhere", () => {
    expect(motion).toContain("@keyframes rise");
    expect(css).toContain("animation: rise ");
    expect(css, "a page-local rise-alike keyframe came back").not.toMatch(/@keyframes\s+qh/i);
  });

  it("its own keyframes are the ones `rise` can't express — a settle and a collapse", () => {
    expect(css).toContain("@keyframes f12-settle");
    expect(css).toContain("@keyframes f12-collapse");
  });

  it("no var() inside any keyframe (it fails silently)", () => {
    for (const kf of css.match(/@keyframes[^{]*\{[^@]*?\n\}/g) ?? []) {
      expect(kf, `${kf.slice(0, 36)}… put a var() in a keyframe`).not.toContain("var(");
    }
  });
});

/* ⚠️ RETIRED WITH THE DRAFT ROW (create mode v3). Three assertions about a row that grew from a
   real zero (height + margin + border-width, never opacity alone), had its open state applied on
   the frame AFTER mount so the transition had something to animate from, and was unmounted by
   its OWN transitionend rather than a timer. All three described good work on a row that no
   longer exists — the list is hidden while creating.

   ⚠️ ONE OF THEM LEFT A LIVE HAZARD BEHIND, which is why this note is not just an epitaph: the
   unmount-by-transitionend meant `closeCreate` parked its discard closure in a ref for the row's
   collapse to fire. Delete the row and that closure is never called — Cancel silently does
   NOTHING. The discard now runs directly in `shut()`; see the ⚠️ on it in Queries.tsx. */

describe("the FLIP travels to where the LIST actually wants the row", () => {
  it("the sort comparator is extracted and shared — the list and the travel use one function", () => {
    expect(queries).toContain("const compareQueries = (a: Query, b: Query): number =>");
    expect(queries, "the list stopped using the extracted comparator").toContain("sortedList = [...filteredList].sort(compareQueries)");
  });

  it("the filter predicate is extracted and shared — the hidden-by-filter test uses the real one", () => {
    expect(queries).toContain("const matchesFilters = (q: Query): boolean =>");
    expect(queries, "the list stopped using the extracted predicate").toContain("queries.filter(matchesFilters)");
    expect(queries, "the save asks the real predicate, not a copy").toContain("if (!matchesFilters(saved))");
  });

  /* ⚠️ THE FLIP ITSELF IS GONE (v3) — it inverted the saved row from the draft row's last
     position. With the list hidden while creating there is nothing to fly from: a hidden
     element's rect is all zeros, so the "from" would have been the top of the WINDOW and every
     save would have flown the new row up the page. The settle is the whole beat now.
     The two assertions above survive because they are about the COMPARATOR and the PREDICATE
     being shared — the save asking the real functions rather than copies. That was always the
     load-bearing half; it just happened to be discovered while building the travel. */
  it("the travel is gone, and what replaced it is the list's own settle", () => {
    expect(queries, "the FLIP came back without a row to fly from").not.toContain("Math.abs(delta)");
    expect(queries, "a save must still pulse the arriving row").toContain("setSettleId(pendingSave.id)");
  });
});

describe("a save is never silent", () => {
  it("a row the filters would hide still appears, settles, then collapses out", () => {
    expect(queries).toContain("setGraceRow(");
    expect(css).toContain(".f12-row.f12-row-leaving");
    // The wait before it leaves is a CSS delay, not a scheduled callback.
    expect(css).toMatch(/f12-collapse 0\.3s cubic-bezier\([^)]*\) 0\.7s both/);
  });

  it("the settle and the collapse COMPOSE — separate rules would cancel one another", () => {
    expect(
      css,
      "without a combined rule the later `animation` wins outright and the settle never plays",
    ).toContain(".f12-row.f12-settle.f12-row-leaving { animation: f12-settle");
  });

  it("the toast reuses the app's toast, offers 'Show it', and never clears filters silently", () => {
    expect(queries).toContain("Query saved — it's hidden by your current filter");
    expect(queries).toContain('undoLabel: "Show it"');
    expect(queries, "the toast fires from the collapse's own end, not a timer").toContain('e.animationName === "f12-collapse"');
  });
});

describe("create mode remembers where you were", () => {
  it("entry stashes the open query and clears the selected state", () => {
    expect(queries).toContain("setStashedSelection(selectedQueryId)");
    expect(queries).toContain("setSelectedQueryId(null)");
  });

  it("discard restores it — falling back to the first row when that query is gone", () => {
    expect(queries).toContain("stashedSelection && queries.some((q) => q.id === stashedSelection)");
    expect(queries).toContain("sortedListRef.current[0]?.id ?? null");
  });

  it("a save clears the stash instead of restoring it — the new query is what you're looking at", () => {
    expect(queries).toContain("setSelectedQueryId(pendingSave.id)");
  });
});

describe("reduced motion collapses all of it to instant state changes", () => {
  // the WHOLE media block — its inner rules span several lines, so stopping at the first brace
  // would silently only check the first of them.
  const start = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .f12-row.f12-settle");
  const rm = css.slice(start, css.indexOf("\n}", start) + 2);
  it("every surviving create-flow animation is switched off", () => {
    expect(start, "the create flow's reduced-motion block has gone").toBeGreaterThan(-1);
    expect(rm).toContain("animation: none !important");
    // .f12-draft dropped with the row; its transition rule went with it rather than being left
    // to suppress motion on an element that never renders.
    for (const sel of [".f12-settle", ".f12-row-leaving", ".f12-pane-enter-create", ".f12-pane-enter-read"]) {
      expect(rm, `${sel} still moves under reduced motion`).toContain(sel);
    }
    expect(rm, "a rule for the deleted draft row survives here").not.toContain("draft");
  });
});
