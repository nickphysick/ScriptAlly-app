/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * corkboard — the pure layer's locks (Corkboard v1). The rendered claims are tests/e2e/corkboardV1.measure.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BOARD_FOOT, BOARD_MIN_H, CORKBOARD_SUBLINE, CORK_TEXTURE, EDGE, NOTE_W, PAD_LABEL, PIN_COLOURS, TASKS_KEY,
  TASKS_CARD_MAX, arrange, chipCounts, clampLeft, clampTop, columnsFor, corkPrefs, corkboardHeaderCopy, fixingFor, idHash, jitterFor,
  ownTaskRows, savedLeft, tiltFor, toPos,
} from "./corkboard";
import { NOTE_COLOURS, sortNotes } from "./noteboard";
import type { UserTask } from "../types";
import { wordsOf } from "../components/shell/PanelHeader";

const ref = readFileSync(resolve(__dirname, "../../design-refs/corkboard-v4/corkboard-v4.html"), "utf8");

describe("the header is a number page: the count, then its words", () => {
  it("the words are the ref's, and one note is singular", () => {
    expect(wordsOf(corkboardHeaderCopy(8).headline)).toBe("notes pinned to your corkboard");
    expect(wordsOf(corkboardHeaderCopy(1).headline)).toBe("note pinned to your corkboard");
    expect(wordsOf(corkboardHeaderCopy(2).headline)).toBe("notes pinned to your corkboard");
    /* the ref breaks the words over two lines with a <br>; the words are the same */
    expect(ref.replace(/<br>/g, " ")).toContain("notes pinned to your corkboard");
    expect(ref).toContain(CORKBOARD_SUBLINE);
    for (const n of [1, 2, 8, 40]) expect(corkboardHeaderCopy(n).subline).toEqual([CORKBOARD_SUBLINE]);
  });

  it("⚠️ every count yields a headline the panel can split — a headline with no number would render as a TITLE", () => {
    for (const n of [1, 2, 3, 10, 99, 100]) expect(wordsOf(corkboardHeaderCopy(n).headline), String(n)).not.toBeNull();
  });
});

describe("the filter row", () => {
  it("chip counts read the list they are given: All is every note, a tag is the notes carrying it", () => {
    const notes = [{ tags: ["a", "b"] }, { tags: ["a"] }, { tags: undefined }, { tags: [] }, { tags: ["b", "b"] }];
    const c = chipCounts(notes);
    expect(c.get(null)).toBe(5);
    expect(c.get("a")).toBe(2);
    expect(c.get("b"), "a note carrying one tag twice is one note").toBe(2);
    expect(c.get("never")).toBeUndefined();
  });

  it("the three paper squares are the composer's three papers, in its order, each named", () => {
    expect(Object.keys(PAD_LABEL)).toEqual([...NOTE_COLOURS]);
    for (const c of NOTE_COLOURS) expect(ref, c).toContain(`aria-label="${PAD_LABEL[c]}"`);
  });
});

describe("⚠️ the review aid is a dev build's alone", () => {
  it("the page calls it behind a statically replaced MODE, so a production build cannot reach the module", () => {
    const page = readFileSync(resolve(__dirname, "../components/todo/TodoNoteboardPage.tsx"), "utf8");
    expect(page).toContain('import.meta.env.MODE === "production" ? storedTasks : onlyForReview(storedTasks)');
    expect([...page.matchAll(/onlyForReview\(/g)].length).toBe(1);
  });
});

/* ── Part C: the board ──────────────────────────────────────────────────────────────────────── */
const ids = (n: number, p = "note") => Array.from({ length: n }, (_, i) => `${p}-${i}-${(i * 7919).toString(36)}`);
const sizeOf = (h: number) => () => ({ w: NOTE_W, h });

describe("the cork is the ref's, byte for byte", () => {
  it("the two noise layers are the ref's `--tex` string", () => {
    const m = /--tex:(url\("data:image\/svg\+xml,[^;]+?"\),url\("data:image\/svg\+xml,[^;]+?"\))\}/.exec(ref);
    expect(m, "the ref's --tex was not found").not.toBeNull();
    expect(CORK_TEXTURE).toBe(m![1]);
    expect(CORK_TEXTURE.split('url("data:').length - 1).toBe(2);
  });
});

describe("⚠️ tilt and fixing are DERIVED from the id — the same on every render, never stored", () => {
  it("the same id always draws the same tilt and the same fixing", () => {
    for (const id of ids(200)) {
      expect(tiltFor(id)).toBe(tiltFor(id));
      expect(fixingFor(id)).toEqual(fixingFor(id));
      expect(jitterFor(id)).toEqual(jitterFor(id));
    }
  });

  it("every tilt is within ±2.6°, in tenths, and they are spread over the range", () => {
    const t = ids(4000).map(tiltFor);
    expect(Math.min(...t)).toBeGreaterThanOrEqual(-2.6);
    expect(Math.max(...t)).toBeLessThanOrEqual(2.6);
    for (const v of t) expect(Math.abs(v * 10 - Math.round(v * 10))).toBeLessThan(1e-9);
    expect(new Set(t).size, "tilts cluster on a few values").toBeGreaterThan(40);
    expect(Math.abs(t.reduce((a, b) => a + b, 0) / t.length)).toBeLessThan(0.15);
  });

  it("⚠️ ids that differ only in their LAST character still spread (the bare-FNV fault)", () => {
    /* seen on the first render: `cbseed-n1` … `cbseed-n8` drew eight navy pins at one tilt, because bare
       FNV-1a barely moves its high bits for a last-character change. The finaliser is what this holds. */
    const near = Array.from({ length: 8 }, (_, i) => `cbseed-n${i + 1}`);
    expect(new Set(near.map(tiltFor)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(near.map((i) => JSON.stringify(fixingFor(i)))).size).toBeGreaterThanOrEqual(3);
    expect(new Set(near.map(idHash)).size).toBe(8);
  });

  it("about three notes in four are pinned, in the three pin colours; the rest are taped, slate or cream", () => {
    const f = ids(4000).map(fixingFor);
    const pins = f.filter((x) => x.kind === "pin");
    expect(pins.length / f.length).toBeGreaterThan(0.71);
    expect(pins.length / f.length).toBeLessThan(0.79);
    expect(new Set(pins.map((p) => (p.kind === "pin" ? p.colour : ""))).size).toBe(3);
    for (const p of pins) expect(PIN_COLOURS as readonly string[]).toContain(p.kind === "pin" ? p.colour : "");
    expect(new Set(f.filter((x) => x.kind === "tape").map((x) => (x.kind === "tape" ? x.tape : ""))).size).toBe(2);
    expect(PIN_COLOURS).toEqual(["#b9683c", "#2d3a50", "#6A89A7"]);
  });
});

describe("⚠️ saved places are a PREFERENCE, never a source", () => {
  it("the reader is total: missing, malformed and absent all read as their defaults", () => {
    expect(corkPrefs(undefined)).toEqual({ layout: {}, view: "free" });
    expect(corkPrefs({})).toEqual({ layout: {}, view: "free" });
    expect(corkPrefs({ todoPrefs: { noteboard: { view: "tidy" } } }).view).toBe("tidy");
    expect(corkPrefs({ todoPrefs: { noteboard: { view: "grid" } } }).view).toBe("free");
    const p = corkPrefs({ todoPrefs: { noteboard: { layout: { a: { x: 0.2, y: 40 }, b: { x: "0.2", y: 1 }, c: null, d: { x: NaN, y: 2 }, e: { y: 3 }, [TASKS_KEY]: { x: 0.5, y: 30 } } } } });
    expect(Object.keys(p.layout).sort()).toEqual([TASKS_KEY, "a"].sort());
    expect(corkPrefs({ todoPrefs: { noteboard: { layout: [1, 2] } } }).layout).toEqual({});
  });

  it("an entry for an id that is not on the board places nothing; a note with no entry is still placed", () => {
    const keys = ids(6);
    const a = arrange(keys, sizeOf(160), { "gone-for-good": { x: 0.5, y: 100 }, [keys[2]]: { x: 0.1, y: 300 } }, 1140, "free");
    expect(Object.keys(a.at).sort()).toEqual([...keys].sort());
    expect(a.at["gone-for-good"]).toBeUndefined();
    expect(a.at[keys[2]]).toEqual({ left: 114, top: 300, saved: true });
    for (const k of keys) if (k !== keys[2]) expect(a.at[k].saved, k).toBe(false);
  });

  it("x is a fraction of the board's width: it scales with the board and is clamped inside it", () => {
    expect(savedLeft({ x: 0.5, y: 0 }, NOTE_W, 1000)).toBe(500);
    expect(savedLeft({ x: 0.5, y: 0 }, NOTE_W, 600)).toBe(300);
    /* saved near the right edge on a wide board, drawn on a narrower one: still wholly inside */
    for (const W of [1400, 1140, 928, 600, 320]) {
      const left = savedLeft({ x: 0.95, y: 0 }, NOTE_W, W);
      expect(left + NOTE_W, String(W)).toBeLessThanOrEqual(W - EDGE.x);
      expect(left).toBeGreaterThanOrEqual(EDGE.x);
    }
    expect(savedLeft({ x: -3, y: 0 }, NOTE_W, 1000)).toBe(EDGE.x);
    /* a board narrower than the note: the left edge wins, never a negative place */
    expect(clampLeft(50, NOTE_W, 150)).toBe(EDGE.x);
  });

  it("a place round-trips: what is saved for a drawn place draws back within a pixel", () => {
    for (const W of [1142, 928, 700]) for (const left of [8, 137, Math.floor((W - NOTE_W) / 2), W - NOTE_W - 8]) {
      const pos = toPos(left, 333, W);
      expect(pos.x).toBeGreaterThanOrEqual(0);
      expect(pos.x).toBeLessThanOrEqual(1);
      expect(Math.abs(savedLeft(pos, NOTE_W, W) - left)).toBeLessThanOrEqual(1);
      expect(pos.y).toBe(333);
    }
  });

  it("a drag cannot leave the board: left and top are clamped to its inside", () => {
    expect(clampLeft(-500, NOTE_W, 1000)).toBe(EDGE.x);
    expect(clampLeft(5000, NOTE_W, 1000)).toBe(1000 - NOTE_W - EDGE.x);
    expect(clampTop(-500, 180, 790)).toBe(EDGE.top);
    expect(clampTop(5000, 180, 790)).toBe(790 - 180 - EDGE.bottom);
  });
});

describe("the default arrangement: the built order, flowed into columns, pinned by hand", () => {
  it("with nothing saved, the first notes in the order head the columns left to right, within the jitter", () => {
    const keys = ids(9);
    const W = 1142, n = columnsFor(W), cw = W / n;
    const a = arrange(keys, sizeOf(170), {}, W, "free");
    expect(n).toBe(3);
    keys.slice(0, n).forEach((k, c) => {
      const base = Math.round(c * cw + (cw - NOTE_W) / 2);
      expect(Math.abs(a.at[k].left - base), k).toBeLessThanOrEqual(14);
      expect(Math.abs(a.at[k].top - 30), k).toBeLessThanOrEqual(14);
    });
    /* the fourth goes under the first column's note, clear of it */
    expect(a.at[keys[3]].top).toBeGreaterThan(a.at[keys[0]].top + 170);
  });

  it("⚠️ no two unsaved notes overlap, and none overlaps a saved one — the first FREE space", () => {
    const over = (p: { left: number; top: number }, q: { left: number; top: number }, h: number) =>
      p.left < q.left + NOTE_W && q.left < p.left + NOTE_W && p.top < q.top + h && q.top < p.top + h;
    let withSaved = 0;
    for (const W of [1400, 1142, 928, 640, 340]) for (const count of [1, 4, 9, 23]) {
      const keys = ids(count, `w${W}`);
      const saved = count > 3 ? { [keys[1]]: { x: 0.02, y: 30 }, [keys[3]]: { x: 0.5, y: 200 } } : {};
      if (count > 3) withSaved++;
      const a = arrange(keys, sizeOf(150), saved, W, "free");
      for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
        if (a.at[keys[i]].saved && a.at[keys[j]].saved) continue; // where the writer put two notes is theirs
        expect(over(a.at[keys[i]], a.at[keys[j]], 150), `${W}/${count}: ${keys[i]} over ${keys[j]}`).toBe(false);
      }
      for (const k of keys) { expect(a.at[k].left).toBeGreaterThanOrEqual(0); expect(a.at[k].left + NOTE_W).toBeLessThanOrEqual(Math.max(W, NOTE_W + EDGE.x)); }
    }
    expect(withSaved, "the saved-note branch was never entered").toBeGreaterThan(5);
  });

  it("a new note takes the first free space near the top, and a saved note does not move for it", () => {
    const keys = ids(5);
    const saved = Object.fromEntries(keys.map((k, i) => [k, { x: 0.05 + i * 0.18, y: 60 }]));
    const before = arrange(keys, sizeOf(160), saved, 1142, "free");
    const after = arrange(["brand-new", ...keys], sizeOf(160), saved, 1142, "free");
    for (const k of keys) expect(after.at[k]).toEqual(before.at[k]);
    expect(after.at["brand-new"].saved).toBe(false);
    expect(after.at["brand-new"].top).toBeLessThan(60 + 160 + 38 + 30);
  });

  it("the board is at least 790 tall inside and grows to the lowest item plus 60", () => {
    expect(arrange(ids(2), sizeOf(120), {}, 1142, "free").height).toBe(BOARD_MIN_H);
    const tall = arrange(ids(30), sizeOf(200), {}, 1142, "free");
    const low = Math.max(...Object.values(tall.at).map((p) => p.top + 200));
    expect(tall.height).toBe(low + BOARD_FOOT);
    expect(tall.height).toBeGreaterThan(BOARD_MIN_H);
    expect(arrange(["a"], sizeOf(100), { a: { x: 0.1, y: 2000 } }, 1142, "free").height).toBe(2000 + 100 + BOARD_FOOT);
  });
});

describe("Tidy into columns: the built order, straight, and the saved places untouched", () => {
  it("flows the keys in the order given into the shortest column; the first row heads the columns at 30", () => {
    const keys = ids(7);
    const hs: Record<string, number> = Object.fromEntries(keys.map((k, i) => [k, 100 + i * 37]));
    const a = arrange(keys, (k) => ({ w: NOTE_W, h: hs[k] }), { [keys[0]]: { x: 0.9, y: 700 } }, 1142, "tidy");
    expect(a.columns).toBe(3);
    const lefts = [...new Set(keys.map((k) => a.at[k].left))].sort((p, q) => p - q);
    expect(lefts.length).toBe(3);
    keys.slice(0, 3).forEach((k, c) => expect(a.at[k]).toEqual({ left: lefts[c], top: 30, saved: false }));
    /* the saved place is NOT read in tidy — the note it belongs to is in the flow like every other */
    expect(a.at[keys[0]].top).toBe(30);
    /* the fourth goes under the SHORTEST column, which is the first (100 tall) */
    expect(a.at[keys[3]]).toEqual({ left: lefts[0], top: 30 + 100 + 38, saved: false });
  });

  it("one column when the board is narrow", () => {
    const a = arrange(ids(4), sizeOf(120), {}, 340, "tidy");
    expect(a.columns).toBe(1);
    expect(new Set(Object.values(a.at).map((p) => p.left)).size).toBe(1);
  });

  it("⚠️ switching views never needs the saved places changed: the same map gives both arrangements", () => {
    const keys = ids(6);
    const saved = { [keys[0]]: { x: 0.6, y: 400 }, [keys[4]]: { x: 0.1, y: 90 } };
    const free1 = arrange(keys, sizeOf(150), saved, 1142, "free");
    arrange(keys, sizeOf(150), saved, 1142, "tidy");
    expect(arrange(keys, sizeOf(150), saved, 1142, "free")).toEqual(free1);
  });
});

describe("the board component holds the rules the page cannot see broken", () => {
  const board = readFileSync(resolve(__dirname, "../components/todo/CorkBoard.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(?<!:)\/\/[^\n]*/g, "");
  it("one write per drop: moving sets local state, and only release (or the keys stopping) calls onMove", () => {
    expect([...board.matchAll(/onMove\(/g)].length, "onMove is called from one place").toBe(1);
    const move = board.slice(board.indexOf("const move = "), board.indexOf("const up = "));
    expect(move.length).toBeGreaterThan(100);
    expect(move).not.toContain("commit(");
    expect(move).not.toContain("onMove");
  });
  it("a press on a control drawn on the note is not a drag", () => {
    expect(board).toContain('const NO_DRAG = "button, a, input, textarea, select, label, [data-cb-nodrag]";');
    expect([...board.matchAll(/closest\(NO_DRAG\)/g)].length).toBeGreaterThanOrEqual(2);
  });
  it("the pointer's release is bound twice — up and cancel", () => {
    expect(board).toContain("onPointerUp={up(it)}");
    expect(board).toContain("onPointerCancel={cancel}");
  });
});

/* ── Part D: the Your tasks card ────────────────────────────────────────────────────────────── */
describe("the Your tasks card lists the writer's own dated tasks — and never a note", () => {
  const NOW = Date.parse("2026-10-12T12:00:00Z");
  const t = (id: string, over: Partial<UserTask> = {}): UserTask => ({ id, userId: "u", text: `task ${id}`, done: false, createdAt: "2026-10-01T09:00:00Z", updatedAt: "", ...over });
  const mix: UserTask[] = [
    t("open-late", { dueDate: "2026-10-26" }),
    t("open-soon", { dueDate: "2026-10-15" }),
    t("open-past", { dueDate: "2026-10-01" }),
    t("note", {}),                                                          // dateless: a note
    t("note-done", { done: true, completedAt: "2026-10-11T09:00:00Z" }),    // a finished dateless thing is not a task
    t("note-as-task", { dueDate: "2026-10-16", colour: "sage" }),           // dated WITH a paper: a note on the board
    t("done-yesterday", { dueDate: "2026-10-10", done: true, completedAt: "2026-10-11T09:00:00Z" }),
    t("done-6-days", { dueDate: "2026-10-05", done: true, completedAt: "2026-10-06T13:00:00Z" }),
    t("done-8-days", { dueDate: "2026-10-01", done: true, completedAt: "2026-10-04T09:00:00Z" }),
    t("done-undated-stamp", { dueDate: "2026-10-02", done: true }),         // finished, but nothing says when
  ];

  it("open first by date, then the ones finished in the last 7 days, newest first", () => {
    expect(ownTaskRows(mix, NOW).rows.map((r) => r.id)).toEqual(["open-past", "open-soon", "open-late", "done-yesterday", "done-6-days"]);
    expect(ownTaskRows(mix, NOW).rows.map((r) => r.done)).toEqual([false, false, false, true, true]);
  });

  it("⚠️ one object, drawn once: nothing the board shows as a note is a row, and nothing in a row is on the board", () => {
    const rows = new Set(ownTaskRows(mix, NOW).rows.map((r) => r.id));
    const board = new Set(sortNotes(mix).map((n) => n.id));
    expect(board.has("note-as-task") && board.has("note")).toBe(true);
    for (const id of rows) expect(board.has(id), id).toBe(false);
    expect(rows.has("note-as-task")).toBe(false);
    expect(rows.has("note-done")).toBe(false);
  });

  it("at most six rows; `more` says there are others on the To-do list", () => {
    const many = Array.from({ length: 9 }, (_, i) => t(`m${i}`, { dueDate: `2026-11-${String(10 + i).padStart(2, "0")}` }));
    const r = ownTaskRows(many, NOW);
    expect(r.rows).toHaveLength(TASKS_CARD_MAX);
    expect(r.total).toBe(9);
    expect(r.more).toBe(true);
    expect(ownTaskRows(many.slice(0, 6), NOW).more).toBe(false);
    expect(ownTaskRows([], NOW)).toEqual({ rows: [], total: 0, more: false });
  });

  it("⚠️ the card's tick never writes: the component takes no writer, and the page hands it a navigation", () => {
    const card = readFileSync(resolve(__dirname, "../components/todo/CorkTasksCard.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    for (const w of ["updateUserTask", "useScriptAllyDb", "addUserTask", "done: true"]) expect(card, w).not.toContain(w);
    const page = readFileSync(resolve(__dirname, "../components/todo/TodoNoteboardPage.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const fn = page.slice(page.indexOf("const finishOnTodo = "), page.indexOf("const tasksItem"));
    expect(fn.length).toBeGreaterThan(60);
    expect(fn).toContain("sessionStorage.setItem(TODO_OPEN_TASK_KEY, id)");
    expect(fn).toContain('onNavigatePath("/todo")');
    expect(fn).not.toMatch(/updateUserTask|addUserTask|updateUserPaths/);
    /* and the To-do list consumes the key once, through the ref */
    const todo = readFileSync(resolve(__dirname, "../components/todo/ToDoPage.tsx"), "utf8");
    expect(todo).toContain("sessionStorage.removeItem(TODO_OPEN_TASK_KEY)");
    expect(todo).toContain("openDockRef.current(id);");
  });
});
