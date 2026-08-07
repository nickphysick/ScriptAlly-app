/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Collapsible columns + reflow-on-fold (board-optimise pack, Phase 6; refs
 * design-refs/board-features.html + design-refs/board-reflow.html).
 */
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { BOARD_COL_CAP, TodoColumnId } from "../../lib/todoColumns";
import {
  readFold, writeFold, toggleFold, reflowPlan, splitLanes, reflowHeadLabel,
  FOLD_RAIL_PX, REFLOW_MS, MAX_LANES, FoldState,
} from "../../lib/todoFold";
import { TodoBoard } from "./TodoBoard";

const here = __dirname;
const css = readFileSync(join(here, "todoBoard.css"), "utf8");
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
const rules = readFileSync(join(here, "..", "..", "..", "firestore.rules"), "utf8");
const types = readFileSync(join(here, "..", "..", "types.ts"), "utf8");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});
const many = (n: number, prefix = "c") =>
  Array.from({ length: n }, (_, i) => card({ key: `${prefix}${i}`, title: `Card ${i}` }));
const ORDER: TodoColumnId[] = ["todo", "today", "snoozed", "done"];
const cols = (over: Partial<Record<TodoColumnId, BoardCard[]>> = {}) =>
  ({ todo: [], today: [], snoozed: [], done: [], ...over }) as Record<TodoColumnId, BoardCard[]>;

/* localStorage does not exist in this repo's node environment — the pages' own harness supplies
   one, so this suite supplies its own too rather than depending on file order. */
beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => store.clear(),
  };
});

describe("⚠️ a column folds to a 44px rail — name rotated, count pilled, ▸ restores", () => {
  it("the rail's measure and anatomy are the ref's", () => {
    expect(FOLD_RAIL_PX).toBe(44);
    expect(css).toContain(".tbd-folded { width: 44px; }");
    const name = css.slice(css.indexOf(".tbd-railname {"), css.indexOf("}", css.indexOf(".tbd-railname {")));
    expect(name).toContain("Playfair Display");
    expect(name).toContain("writing-mode: vertical-rl");
    expect(css).toMatch(/\.tbd-railn\s*\{[^}]*border-radius:\s*99px/); // the count pill
  });

  it("a folded column renders the rail and NOT its cards", () => {
    const html = renderToStaticMarkup(
      <TodoBoard columns={cols({ snoozed: many(3, "s") })} foldOverride={{ snoozed: true }}
        onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );
    expect(html).toContain("tbd-railbtn");
    expect(html).toContain(">3<");            // the count survives the fold
    expect(html).not.toContain("Card 0");      // the cards do not
  });

  it("the rail is a named, expandable button — a keyboard meets a control, not a decoration", () => {
    expect(board).toContain('aria-expanded={false}');
    expect(board).toContain("aria-label={`Fold ${col.label}`}");
    expect(board).toContain("onClick={() => flip(col.id)}");
  });

  it("toggleFold is a pure round trip", () => {
    expect(toggleFold({}, "done")).toEqual({ done: true });
    expect(toggleFold({ done: true }, "done")).toEqual({});
  });
});

describe("⚠️ THE FOLD IS A UI PREFERENCE — persisted, and NEVER board data", () => {
  it("it round-trips through localStorage under the house sa. prefix", () => {
    writeFold({ snoozed: true, done: true });
    expect(readFold()).toEqual({ snoozed: true, done: true });
    expect(localStorage.getItem("sa.todoFolded")).toBeTruthy();
  });

  it("a corrupt or absent value reads as nothing folded — never a board that will not render", () => {
    localStorage.setItem("sa.todoFolded", "not json");
    expect(readFold()).toEqual({});
    localStorage.removeItem("sa.todoFolded");
    expect(readFold()).toEqual({});
    localStorage.setItem("sa.todoFolded", JSON.stringify({ todo: "yes", nonsense: true }));
    expect(readFold()).toEqual({}); // only literal `true` on a known column counts
  });

  it("⚠️ THE SCHEMA DIFF: no fold field reaches Firestore — not the user doc, not a task, not a flag", () => {
    /* FIELD names, not bare words — "folded" appears in unrelated prose, and a substring match on
       a common word is a red waiting to fire on somebody else's comment. */
    for (const field of ["todoFolded", "columnFold", "foldState"]) {
      expect(rules, field).not.toContain(field);
      expect(types, field).not.toContain(field);
    }
    // and the UserTask/TaskFlag/User shapes carry no fold of any name
    expect(types).not.toMatch(/fold\w*\??:/i);
    // and nothing about the fold is written through a db primitive
    const foldLib = readFileSync(join(here, "..", "..", "lib", "todoFold.ts"), "utf8");
    expect(foldLib).not.toContain("updateUserProfile");
    expect(foldLib).not.toContain("updateUserTask");
    expect(foldLib).not.toContain("upsertTaskFlag");
  });
});

describe("⚠️ reflow: the freed width goes to the leftmost OVERFLOWING column, and only that one", () => {
  const overflowing = many(BOARD_COL_CAP + 5, "o");

  it("nothing folded → no reflow", () => {
    expect(reflowPlan(cols({ todo: overflowing }), {}, ORDER).columnId).toBeNull();
  });

  it("folded, and To do overflows → To do claims it", () => {
    const plan = reflowPlan(cols({ todo: overflowing }), { snoozed: true }, ORDER);
    expect(plan.columnId).toBe("todo");
    expect(plan.lanes).toBe(2);
  });

  it("⚠️ a column that FITS gains nothing — the width becomes margin, not a sparser board", () => {
    const plan = reflowPlan(cols({ todo: many(3), today: overflowing }), { snoozed: true, done: true }, ORDER);
    expect(plan.columnId).toBe("today"); // the leftmost that actually overflows, not simply the leftmost
    const noneOverflow = reflowPlan(cols({ todo: many(3), today: many(2) }), { snoozed: true }, ORDER);
    expect(noneOverflow.columnId).toBeNull();
  });

  it("⚠️ AT MOST TWO LANES, ever — a third would outrun the reading eye", () => {
    expect(MAX_LANES).toBe(2);
    const plan = reflowPlan(cols({ todo: many(80) }), { snoozed: true, done: true }, ORDER);
    expect(plan.lanes).toBe(2);
  });

  it("only ONE column reflows even when two overflow", () => {
    const plan = reflowPlan(cols({ todo: overflowing, today: overflowing }), { snoozed: true }, ORDER);
    expect(plan.columnId).toBe("todo");
    const spans = (["todo", "today", "snoozed", "done"] as TodoColumnId[]).filter((id) => plan.columnId === id);
    expect(spans).toHaveLength(1);
  });
});

describe("⚠️ ORDER SURVIVES THE LANES — top-to-bottom, then the next lane", () => {
  it("item 5 sits at the TOP of lane two, never beside item 1", () => {
    const eight = many(8);
    const [a, b] = splitLanes(eight, 2);
    expect(a.map((c) => c.key)).toEqual(["c0", "c1", "c2", "c3"]);
    expect(b.map((c) => c.key)).toEqual(["c4", "c5", "c6", "c7"]);
    // concatenating the lanes reproduces the derived order exactly — the lanes are presentation
    expect([...a, ...b].map((c) => c.key)).toEqual(eight.map((c) => c.key));
  });

  it("an odd count keeps the longer lane first — reading still runs down, then across", () => {
    const [a, b] = splitLanes(many(7), 2);
    expect(a).toHaveLength(4);
    expect(b).toHaveLength(3);
  });

  it("one lane is the identity", () => {
    const five = many(5);
    expect(splitLanes(five, 1)).toEqual([five]);
  });

  it("⚠️ NOTHING IS STORED to make this work — the lanes exist because order is DERIVED", () => {
    const foldLib = readFileSync(join(here, "..", "..", "lib", "todoFold.ts"), "utf8");
    expect(foldLib).toContain("PURE PRESENTATION"); // the law, as the file states it
    // splitLanes is a slice of the array it is handed: no sort, no reorder, no index written
    expect(foldLib).not.toContain(".sort(");
  });
});

describe("⚠️ one head spanning both lanes, with its figures — and the fold survives", () => {
  it('the head states the gain: "SHOWING 8 · WAS 4"', () => {
    expect(reflowHeadLabel({ columnId: "todo", lanes: 2, showing: 8, was: 4 })).toBe("SHOWING 8 · WAS 4");
    expect(reflowHeadLabel({ columnId: null, lanes: 1, showing: 0, was: 0 })).toBeNull();
  });

  it("the spanning column takes two grid tracks, and its head sits OUTSIDE the lane grid", () => {
    expect(board).toContain('gridColumn: "span 2"');
    // the head is a sibling of the lane container, so its ink rule stretches the full span
    expect(board.indexOf("tbd-fh")).toBeLessThan(board.indexOf("tbd-body2"));
    expect(css).toContain(".tbd-body2 { display: grid; grid-template-columns: repeat(2, minmax(0, var(--tbd-col-w)))");
  });

  it("⚠️ '+N MORE' SURVIVES after both lanes fill — lanes halve the scroll, they do not abolish it", () => {
    const html = renderToStaticMarkup(
      <TodoBoard columns={cols({ todo: many(BOARD_COL_CAP * 2 + 3), snoozed: [] })}
        foldOverride={{ snoozed: true, done: true }}
        onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );
    expect(html).toContain("+ 3 MORE ▾");                       // 19 cards, 16 shown across two lanes
    expect((html.match(/<article/g) ?? []).length).toBe(BOARD_COL_CAP * 2);
  });

  it("the collapse rides the shared curve at the shared duration, and stops under reduced motion", () => {
    expect(REFLOW_MS).toBe(220);
    expect(css).toContain("animation: tbdLaneIn 220ms cubic-bezier(.2, .7, .3, 1)");
    const rm = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    expect(rm).toContain(".tbd-body2 > .tbd-lane { animation: none; }");
    // ONE reduced-motion block in the file — two would be two policies
    expect((css.match(/@media \(prefers-reduced-motion: reduce\)/g) ?? []).length).toBe(1);
  });
});
