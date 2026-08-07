/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The column measure (board-optimise pack, Phase 1; ref design-refs/board-optimised.html §1).
 *
 * ⚠️ WHY THIS IS A RULE-TEXT SUITE AND NOT A MEASURED ONE: there is no jsdom in this repo
 * (`vitest.config.ts` is `environment: 'node'`), so nothing here can compute a used width. What
 * CAN be asserted with certainty is the grammar that produces it — a capped track function plus
 * a start-justified grid is, by the CSS spec, incapable of stretching a column past its cap or
 * of overflowing when the viewport is narrower than the cap. The arithmetic is stated per case
 * so a reader can check the claim without a browser.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { TodoColumnId } from "../../lib/todoColumns";
import { TodoBoard } from "./TodoBoard";

const css = readFileSync(join(__dirname, "todoBoard.css"), "utf8");
const rule = (sel: string): string => {
  const i = css.indexOf(sel);
  expect(i, `${sel} has no rule`).toBeGreaterThan(-1);
  return css.slice(i, css.indexOf("}", i));
};

describe("⚠️ columns are CAPPED and the board RAGS LEFT — wide screens get margin, not wider cards", () => {
  const base = rule(".tbd {");

  it("the cap is a token, and the track function is minmax(0, cap) — never 1fr", () => {
    expect(base).toContain("--tbd-col-w: 290px");
    expect(base).toContain("grid-template-columns: repeat(4, minmax(0, var(--tbd-col-w)))");
    expect(base).not.toContain("repeat(4, 1fr)");
  });

  it("⚠️ NO STRETCH AT 2560: the surplus becomes margin because the grid justifies to start", () => {
    expect(base).toContain("justify-content: start");
    /* The arithmetic, stated: four 290px tracks + three 20px gaps = 1220px of content. At a
       2560px viewport the remaining ~1340px is distributed by `justify-content`, and `start`
       puts ALL of it after the last column. A `1fr` track (or a stretch/space-between
       justification) would instead grow the tracks — the exact fault this replaces. */
    expect(base).toContain("gap: 20px");
    for (const stretchy of ["justify-content: stretch", "justify-content: space-between", "justify-content: center"]) {
      expect(base, stretchy).not.toContain(stretchy);
    }
  });

  it("⚠️ NO OVERFLOW WHEN NARROW: the min track is 0, so a column shrinks rather than overrunning", () => {
    /* minmax(0, 290px) — the MIN is zero, not min-content. That is what lets four tracks fit a
       900px viewport (they shrink) and what stops a long unbroken title forcing the grid wider
       than its container. The two breakpoints keep the same function with fewer tracks. */
    expect(base).toContain("minmax(0, var(--tbd-col-w))");
    expect(css).toContain("@media (max-width: 1100px) { .tbd { grid-template-columns: repeat(2, minmax(0, var(--tbd-col-w))); } }");
    expect(css).toContain("@media (max-width: 640px) { .tbd { grid-template-columns: minmax(0, var(--tbd-col-w)); } }");
    // and no breakpoint reintroduces a stretching track
    expect(css).not.toMatch(/@media[^{]*\{\s*\.tbd\s*\{[^}]*1fr/);
  });

  it("the cards themselves declare no width — the track is the only measure", () => {
    const card = rule(".tbd-card {\n  background:");
    expect(card).not.toContain("width:");
    expect(card).not.toContain("max-width");
  });
});

/* ── THE CARD GAP ──────────────────────────────────────────────────────────────────────────────
 *
 * ⚠️ ADDED AFTER IT WAS LOST ONCE (7 Aug). P6's reflow wrapped every column's cards in a lane
 * div, which put a node between `.tbd-body` and `.tbd-card` — and the gap is a DIRECT-CHILD
 * rule, so it stopped matching on every column at once. Nothing failed: not tsc, not the build,
 * not a single test. It surfaced as "the cards look cramped", which points at a spacing value
 * rather than at the selector that was no longer applying.
 *
 * So a value-only lock would NOT have caught it — `margin-bottom: 12px` was still sitting in the
 * file, correct and inert, throughout. The structural half is the half that bites: the selector
 * is asserted TOGETHER WITH the DOM shape it depends on, against rendered markup.
 */
describe("⚠️ sibling cards keep their vertical gap — the rule AND the structure it needs", () => {
  const gapCard = (key: string, over: Partial<BoardCard> = {}): BoardCard => ({
    key, stream: "do", title: `Card ${key}`, who: "", subtitle: "", due: "", warn: false,
    snoozes: 0, hk: false, initials: "•", record: "", committed: false, done: false, ...over,
  });
  const columns = (over: Partial<Record<TodoColumnId, BoardCard[]>> = {}) =>
    ({ todo: [], today: [], snoozed: [], done: [], ...over }) as Record<TodoColumnId, BoardCard[]>;
  const render = (over: Partial<Record<TodoColumnId, BoardCard[]>>) =>
    renderToStaticMarkup(
      <TodoBoard columns={columns(over)} onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );

  it("the gap is declared, at its own value, on the body's own children", () => {
    expect(css).toContain(".tbd-body > .tbd-card { margin-bottom: 12px; }");
    // and a sweep pile gets the wider one, for its stacked edges
    expect(css).toContain(".tbd-body > .tbd-card.tbd-sweep { margin-bottom: 21px; }");
  });

  it("⚠️ THE SELECTOR ACTUALLY MATCHES: a card is a DIRECT child of .tbd-body in real markup", () => {
    const html = render({ todo: [gapCard("a"), gapCard("b"), gapCard("c")] });
    /* The anchor first, per the slice law — without it the split below would silently pass on an
       empty string. */
    expect(html).toContain('class="tbd-body"');
    const body = html.slice(html.indexOf('class="tbd-body"'));
    /* Between the body's opening tag and the first card there must be NO other element open.
       This is the assertion P6 would have failed: it rendered `<div class="tbd-body"><div
       class="tbd-lane"><article class="tbd-card"…`, and the gap rule stopped applying. */
    const firstCard = body.indexOf('class="tbd-card');
    expect(firstCard, "no card rendered — the fixture is wrong, not the board").toBeGreaterThan(-1);
    const between = body.slice(body.indexOf(">") + 1, firstCard);
    expect(between, "a wrapper sits between .tbd-body and its cards — the card gap is dead")
      .not.toMatch(/<(div|ul|ol|section)\b/);
  });

  it("⚠️ ALL THREE cards are siblings — so the rule reaches every gap, not just the first", () => {
    const html = render({ todo: [gapCard("a"), gapCard("b"), gapCard("c")] });
    expect(html).toContain('class="tbd-body"');
    const body = html.slice(html.indexOf('class="tbd-body"'));
    /* Three cards, and no wrapper element opens anywhere among them: a per-lane or per-pair
       wrapper would leave the FIRST card a direct child and quietly orphan the rest. */
    expect((body.match(/class="tbd-card/g) ?? []).length).toBe(3);
    expect(body).not.toContain("tbd-lane");
  });

  it("the flex column carries no `gap` of its own — one owner for the spacing, not two", () => {
    /* If .tbd-body ever gains `gap`, the margins and the gap both apply and the real spacing
       becomes their sum — the kind of drift where a later reader "fixes" the value and makes it
       worse. The margin is the owner; the body declares direction only. */
    const bodyRule = rule(".tbd-body {");
    expect(bodyRule).toContain("flex-direction: column");
    expect(bodyRule).not.toMatch(/\bgap:/);
  });
});
