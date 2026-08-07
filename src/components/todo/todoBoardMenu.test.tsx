/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The ⋯ menu — portal, seat, contents (board fixes II, Phase 1; ref
 * design-refs/todo-board-settled.html, menu M2 + seat option A).
 *
 * ⚠️ WHY A PORTAL IS LOCKED: the menu used to render inside the card's foot, and the card carries
 * `overflow` clipping — so the one place the board's verbs lived drew CLIPPED to the card's box.
 * jsdom does not exist here (node environment), so the lock is structural: the source must mount
 * the menu through createPortal(document.body), the card's own JSX must not contain it, and a
 * rendered board must contain no menu markup at all (closed is the only state static render can
 * produce — which is exactly the point: the menu is never part of a card's subtree).
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BoardCard } from "../../lib/todoBoard";
import { sweepCardFor, boardColumns } from "../../lib/todoColumns";
import { cardMenu, placeMenu, MenuLeaf, MenuEntry } from "../../lib/todoMenu";
import { TodoBoard } from "./TodoBoard";

const here = __dirname;
const board = readFileSync(join(here, "TodoBoard.tsx"), "utf8");
/* tasks-pages P4: the menu SHELL (portal, placement, closers, keyboard) was extracted to
   PortalMenu so the Noteboard wears the same grammar — the shell locks read ITS source, and the
   board is asserted to feed it. One component, two content models. */
const menuShell = readFileSync(join(here, "PortalMenu.tsx"), "utf8");
const css = readFileSync(join(here, "todoBoard.css"), "utf8");
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});

const leaves = (c: BoardCard, col: "todo" | "today" | "snoozed" | "done"): MenuLeaf[] =>
  cardMenu(c, col).flatMap((g) => g.entries.flatMap((e) => (e.kind === "leaf" ? [e] : e.sub)));
const labels = (c: BoardCard, col: "todo" | "today" | "snoozed" | "done") =>
  leaves(c, col).map((l) => l.label);
const entryOf = (c: BoardCard, col: "todo" | "today" | "snoozed" | "done", id: string): MenuEntry | undefined =>
  cardMenu(c, col).flatMap((g) => g.entries).find((e) => e.id === id);

/* ── the portal ────────────────────────────────────────────────────────────────────────────── */

describe("⚠️ the menu is a PORTAL — never a descendant of the card", () => {
  it("mounts through createPortal to document.body — via the SHARED PortalMenu", () => {
    expect(menuShell).toContain("createPortal(");
    expect(menuShell).toContain("document.body,");
    expect(board).toContain("<PortalMenu"); // the board feeds it, never a lookalike
  });

  it("a rendered board contains no menu markup — the card subtree cannot clip what it does not hold", () => {
    const columns = {
      todo: [card({ key: "a", taskType: "full_requested", relatedRecordId: "q1" })],
      today: [card({ key: "b" })],
      snoozed: [],
      done: [],
    };
    const html = renderToStaticMarkup(
      <TodoBoard columns={columns} onPlan={() => {}} onOpen={() => {}} onVerb={() => {}} />,
    );
    expect(html).toContain("tbd-card"); // the render is real
    expect(html).not.toContain("tbd-menu2");
    expect(html).not.toContain("tbd-menu\""); // the old in-card menu class is extinct
  });

  it("positions fixed from the trigger's rect via the pure placeMenu", () => {
    expect(menuShell).toContain("placeMenu(");
    expect(css).toMatch(/\.tbd-menu2\s*\{[^}]*position:\s*fixed/);
  });

  it("closes on outside press, Escape, scroll, resize and history navigation", () => {
    expect(menuShell).toContain('document.addEventListener("pointerdown", onDown)');
    expect(menuShell).toContain('"scroll", onAway, true'); // capture — the stage scrolls, not the window
    expect(menuShell).toContain('"resize", onAway');
    expect(menuShell).toContain('"popstate", onAway');
    expect(menuShell).toContain('e.key === "Escape"');
  });
});

describe("placeMenu — the edge flip, as arithmetic", () => {
  const menu = { w: 228, h: 300 };
  const vp = { w: 1440, h: 900 };

  it("opens downward when the menu fits below the trigger", () => {
    const p = placeMenu({ left: 600, right: 640, top: 200, bottom: 224 }, menu, vp);
    expect(p.up).toBe(false);
    expect(p.top).toBe(230); // bottom + 6 gap
    expect(p.left).toBe(640 - 228); // right-aligned to the trigger
  });

  it("flips UP when the bottom edge would cross the viewport", () => {
    const p = placeMenu({ left: 600, right: 640, top: 800, bottom: 824 }, menu, vp);
    expect(p.up).toBe(true);
    expect(p.top).toBe(800 - 6 - 300);
  });

  it("clamps to the 8px inset on both axes — never drawn off-screen", () => {
    const right = placeMenu({ left: 1420, right: 1436, top: 200, bottom: 224 }, menu, vp);
    expect(right.left).toBe(1440 - 228 - 8);
    const cramped = placeMenu({ left: 20, right: 60, top: 100, bottom: 124 }, { w: 228, h: 880 }, vp);
    expect(cramped.up).toBe(true);
    expect(cramped.top).toBe(8);
    const narrow = placeMenu({ left: 10, right: 40, top: 200, bottom: 224 }, menu, vp);
    expect(narrow.left).toBe(8);
  });
});

/* ── the seat ──────────────────────────────────────────────────────────────────────────────── */

describe("⚠️ the seat (ref option A) — one ⋯, reserved lane, nothing hover-summoned", () => {
  it("the ⋯ sits absolute in the card's bottom-right corner", () => {
    const more = css.slice(css.indexOf(".tbd-more {"), css.indexOf("}", css.indexOf(".tbd-more {")));
    expect(more).toContain("position: absolute");
    expect(more).toContain("right: 8px");
    expect(more).toContain("bottom: 8px");
  });

  it("⚠️ the card's text PERMANENTLY reserves the corner — 42px right padding on title and meta", () => {
    expect(css).toMatch(/\.tbd-t\s*\{[^}]*padding:\s*9px 42px 0 9px/);
    expect(css).toMatch(/\.tbd-meta\s*\{[^}]*padding:\s*3px 42px 0 9px/);
  });

  it("hover darkens and chips the SAME element — nothing appears or disappears", () => {
    expect(css).toContain(".tbd-card:hover .tbd-more");
    const rest = css.slice(css.indexOf(".tbd-more {"), css.indexOf("}", css.indexOf(".tbd-more {")));
    const hover = css.slice(css.indexOf(".tbd-card:hover .tbd-more"), css.indexOf("}", css.indexOf(".tbd-card:hover .tbd-more")));
    // the resting rule paints it faint and present; the hover rule recolours — neither toggles display
    expect(rest).toContain("color: #c4b6a6");
    expect(hover).toContain("#6b5a4e");
    expect(rest).not.toContain("display: none");
    expect(hover).not.toContain("display");
    expect(css).not.toMatch(/\.tbd-more[^{]*\{[^}]*opacity:\s*0/);
  });

  it("⚠️ the three-icon hover cluster is EXTINCT — the seat is the card's one control", () => {
    // the old foot row (the cluster's home) is gone from source and stylesheet alike
    expect(board).not.toContain("tbd-foot\"");
    expect(css).not.toContain(".tbd-foot {");
    expect(css).toContain(".tbd-foot-note"); // the Done column's midnight note survives
    // exactly one action control inside the card's JSX: the seat
    const article = board.slice(board.indexOf("<article"), board.indexOf("</article>"));
    expect(article.match(/className="tbd-more"/g)?.length).toBe(1);
  });

  it("the trigger stops propagation — opening the menu never opens the card", () => {
    const article = board.slice(board.indexOf("<article"), board.indexOf("</article>"));
    const seat = article.slice(article.indexOf('className="tbd-more"'));
    expect(seat).toContain("e.stopPropagation()");
  });
});

/* ── the contents, per kind and per column ─────────────────────────────────────────────────── */

describe("⚠️ cardMenu — the three intent groups", () => {
  it("a derived query card gets DO IT · PUT IT OFF · GO ELSEWHERE, in that order", () => {
    const heads = cardMenu(card({ taskType: "full_requested", relatedRecordId: "q1", agentId: "a1" }), "todo")
      .map((g) => g.head);
    expect(heads).toEqual(["DO IT", "PUT IT OFF", "GO ELSEWHERE"]);
  });

  it("Action now is the weighted first line and says it goes somewhere", () => {
    const a = entryOf(card({ taskType: "full_requested" }), "todo", "action") as MenuLeaf;
    expect(a.label).toBe("Action now");
    expect(a.weight).toBe(true);
    expect(a.goes).toBe(true);
  });

  it("⚠️ every item that opens something says so — ▸ for goers and parents, … in dialogue labels", () => {
    const groups = cardMenu(card({ taskType: "full_requested", relatedRecordId: "q1", agentId: "a1", userTaskId: undefined }), "todo");
    for (const g of groups) {
      for (const e of g.entries) {
        if (e.kind === "sub") expect(e.label.endsWith("…")).toBe(true);
        else if (e.id === "open-query" || e.id === "view-agent" || e.id === "action") expect(e.goes).toBe(true);
      }
    }
    const ut = cardMenu(card({ userTaskId: "u1", nature: "task", dueYmd: "2026-08-10" }), "todo").flatMap((g) => g.entries);
    expect((ut.find((e) => e.id === "edit-task") as MenuLeaf).label).toContain("…");
    expect((ut.find((e) => e.id === "delete-task") as MenuLeaf).label).toContain("…");
  });
});

describe("⚠️ per kind — offers, sweeps, user tasks", () => {
  it("an offer: Dismiss renders disabled with its reason, and snooze is capped at tomorrow", () => {
    const offer = card({ taskType: "offer_received" });
    const d = leaves(offer, "todo").find((l) => l.label.startsWith("Dismiss"))!;
    expect(d.disabled).toBe(true);
    expect(d.why).toContain("reply-by");
    const snooze = entryOf(offer, "todo", "snooze");
    expect(snooze?.kind).toBe("sub");
    expect((snooze as Extract<MenuEntry, { kind: "sub" }>).sub.map((s) => s.id)).toEqual(["snooze-1"]);
  });

  it("a sweep card: 'Start the sweep', no ＋Today, three dismiss tiers, no GO ELSEWHERE", () => {
    const sweep = sweepCardFor("dq_materials", "Materials", 16, ["m1"]).card;
    const groups = cardMenu(sweep, "todo");
    expect(groups.map((g) => g.head)).toEqual(["DO IT", "PUT IT OFF"]);
    expect((entryOf(sweep, "todo", "action") as MenuLeaf).label).toBe("Start the sweep");
    expect(labels(sweep, "todo")).not.toContain("＋ Add to today");
    const dis = entryOf(sweep, "todo", "dismiss") as Extract<MenuEntry, { kind: "sub" }>;
    expect(dis.sub.map((s) => s.id)).toEqual(["dismiss-week", "dismiss-never", "dismiss-rule"]);
    expect(dis.sub.map((s) => s.label)).toEqual([
      "Not now — back in a week",
      "Never — just these agents",
      "Never — any agent missing this",
    ]);
  });

  it("a user task gains Edit and Delete and loses Dismiss — its removal is Delete, not a stance", () => {
    const ut = card({ userTaskId: "u1", nature: "task", dueYmd: "2026-08-10" });
    const ls = labels(ut, "todo");
    expect(ls).toContain("Edit the task…");
    expect(ls).toContain("Delete the task…");
    expect(ls.some((l) => l.startsWith("Dismiss"))).toBe(false);
    const del = leaves(ut, "todo").find((l) => l.id === "delete-task")!;
    expect(del.danger).toBe(true);
  });

  it("a derived non-sweep card's dismiss tiers are the fork's own two", () => {
    const dis = entryOf(card({ taskType: "no_response_close", relatedRecordId: "q1" }), "todo", "dismiss") as Extract<MenuEntry, { kind: "sub" }>;
    expect(dis.sub.map((s) => s.label)).toEqual(["Not now — back in a week", "Never — just this query"]);
  });
});

describe("⚠️ per column — Today, Snoozed, Done", () => {
  it("in Today the add line reverses: '− Remove from today'", () => {
    expect(labels(card({}), "today")).toContain("− Remove from today");
    expect(labels(card({}), "todo")).toContain("＋ Add to today");
  });

  it("in Snoozed the snooze line becomes 'Return it now' / 'Change the date…'", () => {
    const c = card({ taskType: "no_response_close", relatedRecordId: "q1" });
    expect(labels(c, "snoozed")).toContain("Return it now");
    const re = entryOf(c, "snoozed", "resnooze");
    expect(re?.kind).toBe("sub");
    expect((re as Extract<MenuEntry, { kind: "sub" }>).label).toBe("Change the date…");
    expect(entryOf(c, "snoozed", "snooze")).toBeUndefined(); // never a second "Snooze…"
  });

  it("⚠️ Done COLLAPSES — a user task offers Undo, a derived card its record, nothing else", () => {
    const utGroups = cardMenu(card({ userTaskId: "u1", done: true }), "done");
    expect(utGroups).toHaveLength(1);
    expect(utGroups[0].head).toBeNull();
    expect(utGroups[0].entries.map((e) => e.id)).toEqual(["undo-done"]);
    const dvGroups = cardMenu(card({ relatedRecordId: "q1", done: true }), "done");
    expect(dvGroups[0].entries.map((e) => e.id)).toEqual(["open-query"]);
  });
});

/* ── the wiring — every leaf routes to an EXISTING primitive ───────────────────────────────── */

describe("⚠️ performCardVerb routes each leaf to the verb that already owns it", () => {
  const fn = page.slice(page.indexOf("function performCardVerb"), page.indexOf("/** ⚠️ THE ONE ENTRANCE FUNCTION"));

  it("anchors exist", () => {
    expect(page).toContain("function performCardVerb");
    expect(page).toContain("/** ⚠️ THE ONE ENTRANCE FUNCTION");
  });

  it("sweeps act on their RULE GROUP through the batch sheet and the group fork", () => {
    expect(fn).toContain("hkGroups.find((g) => g.rule === card.sweepRule)");
    expect(fn).toContain('{ kind: "group", group }');
    expect(fn).toContain("forkNotNowGroup(group)");
    expect(fn).toContain("forkNeverThese(group)");
    expect(fn).toContain("forkNeverRule(group)");
  });

  it("the date tiers write through the existing snooze primitives — never a menu-local date", () => {
    expect(fn).toContain('snoozeCard(card, 1, "tomorrow")');
    expect(fn).toContain('snoozeCard(card, 7, "in a week")');
    expect(fn).toContain("snoozeGroup(group, 1");
  });

  it("dismiss tiers are forkStale's own arms", () => {
    expect(fn).toContain('forkStale(card, "notNow")');
    expect(fn).toContain('forkStale(card, "neverThis")');
  });

  it("Edit opens the ONE composer; Delete rides the styled confirm", () => {
    expect(fn).toContain("openComposerEdit(card)");
    expect(fn).toContain("deleteUserNote(card)");
    expect(page).toContain("const openComposerEdit = (c: BoardCard)");
    // the edit save routes to updateUserTask, and clears are explicit nulls
    expect(page).toContain("await updateUserTask(composerEdit,");
  });

  it("View the agent hands over via the ONE-SHOT reveal key, and the agent list consumes it once", () => {
    expect(fn).toContain('sessionStorage.setItem("sa.agentReveal"');
    const agentList = readFileSync(join(here, "..", "agents", "AgentList.tsx"), "utf8");
    expect(agentList).toContain('sessionStorage.getItem("sa.agentReveal")');
    expect(agentList).toContain('sessionStorage.removeItem("sa.agentReveal")');
    expect(agentList).toContain("scrollIntoView");
  });

  it("⚠️ the drag-to-Snoozed drop opens the menu AT its date tiers — the zone's promise, kept", () => {
    expect(board).toContain('plan.kind === "snooze-popover"');
    expect(board).toContain('openSub: "snooze"');
  });
});

/* ── the keyboard — focus in, walk, Escape back out ────────────────────────────────────────── */

describe("⚠️ the focus round trip (source-locked; no DOM here to run it)", () => {
  it("opening focuses the first enabled item", () => {
    expect(menuShell).toContain('querySelector<HTMLButtonElement>("button.tbd-mi:not(:disabled)")');
    expect(menuShell).toContain("first?.focus()");
  });

  it("↑↓ walk the enabled items, wrapping", () => {
    expect(menuShell).toContain('e.key !== "ArrowDown" && e.key !== "ArrowUp"');
    expect(menuShell).toContain("(i + 1 + items.length) % items.length");
  });

  it("Escape returns focus to the trigger", () => {
    expect(menuShell).toContain("onClose(true)");
    expect(board).toContain("m.anchor.focus()"); // the board still returns focus to ITS trigger
  });

  it("submenus open with ArrowRight and close with ArrowLeft", () => {
    expect(menuShell).toContain('e.key === "ArrowRight"');
    expect(menuShell).toContain('e.key === "ArrowLeft"');
  });
});

/* ── the composer's edit mode (the menu's Edit needs a receiving end) ──────────────────────── */

describe("the composer edits in place — one surface, two verbs", () => {
  it("edit seeds from the card and the save button says so", () => {
    expect(page).toContain("setComposerEdit(c.userTaskId)");
    expect(page).toContain('{composerEdit ? "Save changes" : isTask ? "Add the task" : "Pin the note"}');
  });

  it("clearing the date on save DOWNGRADES a task to a note — explicit nulls through updateUserTask", () => {
    expect(page).toContain("dueDate: isTask && composerDate ? composerDate : null");
    const db = readFileSync(join(here, "..", "..", "lib", "db.tsx"), "utf8");
    expect(db).toContain("patch.dueDate = dueDate === null ? deleteField() : dueDate");
    expect(db).toContain("patch.detail = detail === null ? deleteField() : detail");
    expect(db).toContain("patch.surfaceOffset = surfaceOffset === null ? deleteField() : surfaceOffset");
  });
});

/* ── P3 — the Add is wired, and a created item lands in the right column ───────────────────── */

describe("⚠️ ＋ Add task or note reaches a MOUNTED composer (P3)", () => {
  it("the composer renders in the board body — the button used to set state nothing read", () => {
    expect(page).toContain("{composerAt && renderComposer()}");
    // exactly one mount: definition + this invocation, nothing else
    expect(page.match(/renderComposer\(\)/g)?.length).toBe(2);
  });

  it("the tool-row Add opens task mode; the session launcher beside it is gone", () => {
    // tasks-pages P1: the tools live in renderTools (TasksPageLayout's tool row)
    const hero = page.slice(page.indexOf("function renderTools"), page.indexOf("function renderHero"));
    expect(hero).toContain('onClick={() => openComposer("task")}');
    expect(hero).not.toContain("tdb-ghb");
  });

  it("a fresh task lands in To do — and a surfaced one in Today — without any reload logic", () => {
    const fresh = card({ key: "nt1", stream: "nt", userTaskId: "u1", nature: "task", hk: false });
    const surfaced = card({ key: "nt2", stream: "nt", userTaskId: "u2", nature: "task", surfaced: true });
    const cols = boardColumns({
      board: { do: [], hk: [], nt: [fresh, surfaced], cleared: [] },
      flags: [], queries: [], agents: [], sweeps: [],
      today: "2026-08-06", nowMs: Date.parse("2026-08-06T12:00:00Z"),
    });
    expect(cols.todo.map((c) => c.key)).toEqual(["nt1"]);
    expect(cols.today.map((c) => c.key)).toEqual(["nt2"]);
  });
});
