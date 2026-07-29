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

describe("the draft row grows and collapses (and the growth is what moves the list)", () => {
  it("it animates from a real zero — height, margin and border-width, not opacity alone", () => {
    const base = css.slice(css.indexOf("\n.f12-draft {"), css.indexOf("}", css.indexOf("\n.f12-draft {")));
    expect(base).toContain("height: 0");
    expect(base).toContain("overflow: hidden");
    expect(base).toContain("transition:");
    expect(css).toContain(".f12-draft.f12-draft-in { height: 56px;");
  });

  it("the open state is applied on the frame AFTER mount, or there is nothing to animate from", () => {
    expect(queries).toContain("requestAnimationFrame(() => setDraftIn(true))");
  });

  it("the row is unmounted by its own transitionend — never a timer, and never mid-collapse", () => {
    expect(queries).toContain('if (e.propertyName !== "height" || draftIn) return;');
    expect(queries).toContain("pendingDiscardRef");
  });
});

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

  it("it clears any filled animation before measuring — motion.css's documented trap", () => {
    expect(queries).toContain('el.style.animation = "none"');
    expect(queries).toContain("const last = el.getBoundingClientRect()");
  });

  it("invert → reflow → play, and a travel of under a pixel is skipped", () => {
    expect(queries).toContain("void el.offsetWidth");
    expect(queries).toContain("if (Math.abs(delta) > 1)");
    expect(queries).toContain("transform 0.32s cubic-bezier(0.22, 0.9, 0.3, 1)");
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
  const start = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .f12-draft");
  const rm = css.slice(start, css.indexOf("\n}", start) + 2);
  it("the row's transitions and every create-flow animation are switched off", () => {
    expect(start, "the create flow's reduced-motion block has gone").toBeGreaterThan(-1);
    expect(rm).toContain("transition: none !important");
    expect(rm).toContain("animation: none !important");
    for (const sel of [".f12-draft", ".f12-settle", ".f12-row-leaving", ".f12-pane-enter-create", ".f12-pane-enter-read"]) {
      expect(rm, `${sel} still moves under reduced motion`).toContain(sel);
    }
  });
});
