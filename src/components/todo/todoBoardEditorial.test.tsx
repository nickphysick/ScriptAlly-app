/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The editorial board + finishing touches (board fixes II, Phase 6; ref
 * design-refs/todo-board-settled.html — normative for the board's appearance).
 *
 * Half markup (renderToStaticMarkup — the heads, the cap, the sweep figure, the empty voices),
 * half rule-text (the stylesheet carries the editorial values; no jsdom exists to compute them).
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { sweepCardFor, wipLine, columnSlice, BOARD_COL_CAP } from "../../lib/todoColumns";
import { TodoBoard } from "./TodoBoard";

const here = __dirname;
const css = readFileSync(join(here, "todoBoard.css"), "utf8");
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
const pageCss = readFileSync(join(here, "todo.css"), "utf8");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

const render = (columns: Partial<Record<"todo" | "today" | "snoozed" | "done", BoardCard[]>>) =>
  renderToStaticMarkup(
    <TodoBoard
      columns={{ todo: [], today: [], snoozed: [], done: [], ...columns }}
      onPlan={() => {}} onOpen={() => {}} onVerb={() => {}}
    />,
  );

/* ── the heads ─────────────────────────────────────────────────────────────────────────────── */

describe("⚠️ the editorial column heads — Playfair over a 2px ink rule, sticky, sage on Done", () => {
  it("the head rule: serif face, 2px ink underline, sticky with the short ground gradient", () => {
    const i = css.indexOf(".tbd-fh {");
    const rule = css.slice(i, css.indexOf("}", i));
    expect(rule).toContain("Playfair Display");
    expect(rule).toContain("border-bottom: 2px solid #2a1a13");
    expect(rule).toContain("position: sticky");
    expect(rule).toContain("top: 0");
    expect(rule).toContain("linear-gradient(var(--tbd-ground) 74%");
    expect(css).toContain(".tbd-fh.done { border-bottom-color: #b9c9b4; }");
  });

  it("⚠️ the tinted column WELLS are gone — the rule is the column", () => {
    const i = css.indexOf(".tbd-col {");
    const rule = css.slice(i, css.indexOf("}", i));
    expect(rule).not.toContain("background");
    expect(rule).not.toContain("border:");
    expect(css).not.toContain(".tbd-col.over"); // the well's tint state went with it
  });

  it("Done's count speaks the day: 'N TODAY'", () => {
    const html = render({ done: [card({ key: "d", done: true })] });
    expect(html).toContain("1 TODAY");
  });
});

describe("⚠️ the WIP line on Today's head — advice, never a block", () => {
  it("wipLine: silent at zero, gentle to five, honest past it", () => {
    expect(wipLine(0)).toBeNull();
    expect(wipLine(1)).toBe("A GOOD DAY IS 3–5");
    expect(wipLine(5)).toBe("A GOOD DAY IS 3–5");
    expect(wipLine(6)).toBe("THAT'S A FULL DAY");
  });

  it("renders on Today's head only, and blocks nothing (no disabled, no guard)", () => {
    const six = Array.from({ length: 6 }, (_, i) => card({ key: `c${i}` }));
    const html = render({ today: six });
    expect(html).toContain("THAT&#x27;S A FULL DAY");
    const todoOnly = render({ todo: six });
    expect(todoOnly).not.toContain("FULL DAY");
    expect(todoOnly).not.toContain("GOOD DAY");
  });
});

/* ── the sweep stack + the ghost + the hem ─────────────────────────────────────────────────── */

describe("⚠️ the sweep card is a STACK with a progress rail", () => {
  it("two paper edges behind the card — outside the box, which is why the card must not clip", () => {
    expect(css).toContain(".tbd-sweep::before, .tbd-sweep::after");
    expect(css).toContain("bottom: -5px");
    expect(css).toContain("bottom: -9px");
    const i = css.indexOf(".tbd-card {\n  background:");
    const rule = css.slice(i, css.indexOf("}", i));
    expect(rule).not.toContain("overflow"); // clipping would shear the stack (and once ate the menu)
  });

  it("the rail renders inside a sweep card, and the band carries its figure", () => {
    const sweep = sweepCardFor("dq_materials", "Materials", 16, []).card;
    const html = render({ todo: [sweep] });
    expect(html).toContain("tbd-sweep");
    expect(html).toContain("tbd-prog");
    expect(html).toContain("16 TO FIX"); // no progress yet this session — an honest pile, not 0%
  });
});

describe("the ghost drop slot + the fade hem", () => {
  it("the ghost is a card-shaped hatched target that still LABELS THE ACT", () => {
    const i = css.indexOf(".tbd-ghost {");
    const rule = css.slice(i, css.indexOf("}", i));
    expect(rule).toContain("dashed");
    expect(rule).toContain("repeating-linear-gradient(135deg");
    expect(rule).toContain("height: 78px");
    expect(board).toContain('<div className="tbd-ghost">{col.dropLabel}</div>');
    expect(css).not.toContain(".tbd-drop"); // the dashed strip is extinct
  });

  it("⚠️ the hem fades into the ground above '+ N MORE', and the cap arithmetic is pure", () => {
    expect(css).toMatch(/\.tbd-fade\s*\{[^}]*margin-top:\s*-30px/);
    expect(css).toMatch(/\.tbd-fade\s*\{[^}]*linear-gradient\(rgba\(255,\s*255,\s*255,\s*0\),\s*var\(--tbd-ground\)\)/);
    expect(BOARD_COL_CAP).toBe(8);
    const ten = Array.from({ length: 10 }, (_, i) => card({ key: `c${i}` }));
    expect(columnSlice(ten, false)).toMatchObject({ more: 2 });
    expect(columnSlice(ten, false).visible).toHaveLength(8);
    expect(columnSlice(ten, true).more).toBe(0);
    const html = render({ todo: ten });
    expect((html.match(/<article/g) ?? []).length).toBe(8);
    expect(html).toContain("+ 2 MORE ▾");
  });
});

/* ── the ring, the voices, the numerals, the motion ────────────────────────────────────────── */

describe("the completion ring settles into Done", () => {
  it("sage keyline + 3px halo, ~600ms, never on first mount", () => {
    expect(css).toContain("border: 1.5px solid #8a9e88");
    expect(css).toContain("0 0 0 3px rgba(138, 158, 136, 0.16)");
    expect(css).toContain("animation: tbdRing 600ms var(--tbd-ease) forwards");
    // the guard: a null previous set (first mount) rings nothing
    expect(board).toContain("if (!before || reducedMotion()) return;");
  });
});

describe("⚠️ speaking empty states — a sentence in the column's voice", () => {
  it("each column speaks; Snoozed's line is the ref's verbatim", () => {
    const html = render({});
    expect(html).toContain("Nothing waiting on you here.");
    expect(html).toContain("Nothing committed to today.");
    expect(html).toContain("Snoozed work waits here until its day.");
    expect(html).toContain("Nothing cleared yet today.");
    expect(html).toContain("lift something from the bench"); // Today's pointer survives
  });
});

describe("⚠️ tabular numerals, page-wide", () => {
  it("the page root inherits them; the board and the portal menu opt in themselves", () => {
    expect(pageCss).toMatch(/\.tdb-wrap\s*\{\s*font-variant-numeric:\s*tabular-nums;\s*\}/);
    expect(css).toMatch(/\.tbd\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
    expect(css).toMatch(/\.tbd-menu2\s*\{[^}]*font-variant-numeric:\s*tabular-nums/);
  });
});

describe("⚠️ ONE easing — and everything stops under reduced motion", () => {
  it("the curve is named once and every transition rides it", () => {
    expect(css).toContain("--tbd-ease: cubic-bezier(.2, .7, .3, 1)");
    expect((css.match(/140ms var\(--tbd-ease\)/g) ?? []).length).toBeGreaterThanOrEqual(3);
    // the WAAPI travel restates the same curve at the pack's 220ms
    expect(board).toContain('const EASE = "cubic-bezier(.2,.7,.3,1)"');
    expect(board).toContain("{ duration: 220, easing: EASE }");
  });

  it("⚠️ cross-column moves ANIMATE (FLIP over WAAPI, no fill — the house motion trap)", () => {
    expect(board).toContain("el.animate" .replace("el", "")); // .animate( is called
    expect(board).toContain('from === nextCols.get(key)'); // same-column reshuffles do not travel
    expect(board).not.toMatch(/fill:\s*["']both["']/); // fill-mode both is the trap, never used
  });

  it("reduced motion: the lift becomes border darkening; the ring and travel go", () => {
    const i = css.indexOf("@media (prefers-reduced-motion: reduce)");
    expect(i).toBeGreaterThan(-1);
    const block = css.slice(i, css.indexOf("}\n}", i));
    expect(block).toContain("transition: none");
    expect(block).toContain("transform: none");
    expect(block).toContain("border-color: #c9bba9");
    expect(block).toContain("animation: none");
    expect(board).toContain("if (!reducedMotion()) {"); // the travel is gated in the component too
  });
});
