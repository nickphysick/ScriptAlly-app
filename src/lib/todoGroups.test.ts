/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The consolidated page's five groups (tasks-consolidation, Phase 2 foundation).
 *
 * ⚠️ THESE LOCKS EXIST BEFORE THE COMPONENT DOES, deliberately. The grouping is the part that can
 * be wrong in a way nobody sees — a card in two groups, a count that disagrees with the sidebar,
 * an empty panel with a heading — so it is pinned as pure arithmetic first, and the component is
 * built against it rather than the other way round.
 */
import { describe, it, expect } from "vitest";
import {
  taskGroups, taskStats, groupSlice, showMoreLabel,
  TASK_GROUP_ORDER, TASK_GROUP_META, HOUSEKEEPING_VISIBLE,
} from "./todoGroups";
import { TODO_LISTS, TodoListId } from "./todoRoutes";
import { BoardCard } from "./todoBoard";
import { BoardColumns } from "./todoColumns";

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});
const cols = (over: Partial<BoardColumns> = {}): BoardColumns =>
  ({ todo: [], today: [], snoozed: [], done: [], ...over }) as BoardColumns;

/* one of each family, by the rules liveFamily already states */
const urgent = (k: string) => card({ key: k, stream: "do" });
const house = (k: string) => card({ key: k, stream: "hk" });
const mine = (k: string) => card({ key: k, userTaskId: `u${k}` });

describe("⚠️ five groups, derived — never a second derivation", () => {
  it("the order descends from 'someone is waiting' to 'nothing is waiting'", () => {
    expect(TASK_GROUP_ORDER).toEqual(["urgent", "housekeeping", "yours", "snoozed", "done"]);
  });

  it("each card lands in exactly ONE group, and the live groups partition the live cards", () => {
    const c = cols({
      todo: [urgent("a"), house("b"), mine("c")],
      today: [urgent("d")],
      snoozed: [card({ key: "s" })],
      done: [card({ key: "z", done: true })],
    });
    const gs = taskGroups(c);
    const keys = gs.flatMap((g) => g.cards.map((x) => x.key));
    expect(new Set(keys).size).toBe(keys.length); // no card counted twice
    const live = gs.filter((g) => ["urgent", "housekeeping", "yours"].includes(g.id));
    expect(live.flatMap((g) => g.cards).length).toBe(4); // todo + today, flattened
  });

  it("⚠️ THE BOARD'S To-do/Today SPLIT IS RETIRED, not reproduced — both flatten into the kinds", () => {
    /* That split asked the writer to PLACE work. The ranked order is the plan now, so the groups
       answer "what kind of thing is this" rather than "where did you put it". */
    const c = cols({ todo: [urgent("a")], today: [urgent("b")] });
    const g = taskGroups(c).find((x) => x.id === "urgent")!;
    expect(g.cards.map((x) => x.key)).toEqual(["a", "b"]);
    expect(taskGroups(c).map((g) => g.id)).not.toContain("today");
  });

  it("⚠️ AN EMPTY GROUP DOES NOT RENDER — never a heading over nothing", () => {
    /* Five empty panels stack into a page that looks full of nothing, and each states a category
       the writer has no business in today. */
    expect(taskGroups(cols())).toEqual([]);
    const only = taskGroups(cols({ done: [card({ key: "z", done: true })] }));
    expect(only.map((g) => g.id)).toEqual(["done"]);
  });

  it("every rendered group carries a name and a PLAIN description, never a caption", () => {
    const gs = taskGroups(cols({ todo: [urgent("a"), house("b"), mine("c")], snoozed: [card({ key: "s" })], done: [card({ key: "z" })] }));
    expect(gs.map((g) => g.label)).toEqual([
      "Urgent", "Housekeeping", "Your tasks", "Snoozed", "Done today",
    ]);
    for (const g of gs) {
      expect(g.description.length, g.id).toBeGreaterThan(11);
      expect(g.description, g.id).toMatch(/\.$/); // a sentence, not a label
    }
  });

  /**
   * ⚠️ THE TWO VOCABULARIES, ASSERTED AGAINST EACH OTHER (rail + workspace, Phase 1). `TODO_LISTS`
   * shipped "Urgent" while this module shipped "Needs you now" — one set of cards, two names, and
   * nothing anywhere that could notice. The lock reads the LISTS' label back against the group's,
   * rather than pinning both to a literal: a literal on each side goes green the day someone
   * changes both in the same wrong direction, which is the failure it is here to prevent.
   */
  it("⚠️ TODO_LISTS TAKES ITS WORDS FROM HERE — the two lists cannot name one set differently", () => {
    const label = (id: TodoListId) => TODO_LISTS.find((l) => l.id === id)!.label;
    expect(label("urgent")).toBe(TASK_GROUP_META.urgent.label);
    expect(label("housekeeping")).toBe(TASK_GROUP_META.housekeeping.label);
    expect(label("yours")).toBe(TASK_GROUP_META.yours.label);
    expect(label("snoozed")).toBe(TASK_GROUP_META.snoozed.label);
    /* `notes` is the one row with no group behind it — the Noteboard's undated notes are not a
       task group, so it keeps a literal rather than a sixth group being invented to source it. */
    expect(label("notes")).toBe("Notes to self");
  });

  it("⚠️ THE IDS AGREE TOO, so a rename on one side cannot leave the other pointing at nothing", () => {
    for (const id of ["urgent", "housekeeping", "yours", "snoozed"] as const) {
      expect(TASK_GROUP_ORDER, id).toContain(id);
      expect(TODO_LISTS.map((l) => l.id), id).toContain(id);
    }
  });
});

describe("⚠️ only Housekeeping folds — and never what needs you now", () => {
  it("housekeeping opens at a readable length and says what it holds back", () => {
    const many = Array.from({ length: 11 }, (_, i) => house(`h${i}`));
    const g = taskGroups(cols({ todo: many })).find((x) => x.id === "housekeeping")!;
    const { visible, more } = groupSlice(g, false);
    expect(visible).toHaveLength(HOUSEKEEPING_VISIBLE);
    expect(more).toBe(11 - HOUSEKEEPING_VISIBLE);
    expect(showMoreLabel(more)).toBe("SHOW 7 MORE");
    expect(groupSlice(g, true).more).toBe(0); // expanded shows everything
  });

  it("⚠️ THE URGENT GROUP IS NEVER FOLDED — hiding what needs you now is the one thing forbidden", () => {
    const many = Array.from({ length: 20 }, (_, i) => urgent(`u${i}`));
    const g = taskGroups(cols({ todo: many })).find((x) => x.id === "urgent")!;
    const { visible, more } = groupSlice(g, false);
    expect(visible).toHaveLength(20);
    expect(more).toBe(0);
  });

  it("a short housekeeping group offers no fold at all", () => {
    const g = taskGroups(cols({ todo: [house("a"), house("b")] })).find((x) => x.id === "housekeeping")!;
    expect(groupSlice(g, false).more).toBe(0);
  });
});

describe("⚠️ the stat chips — one derivation, cards as the unit", () => {
  it("the four figures read the same columns the groups do", () => {
    const c = cols({
      todo: [urgent("a"), house("b")], today: [urgent("d"), mine("c")],
      snoozed: [card({ key: "s" })], done: [card({ key: "z" }), card({ key: "y" })],
    });
    expect(taskStats(c, 0)).toEqual([
      { label: "Outstanding", value: "4" },
      { label: "Urgent", value: "2" },
      { label: "Done today", value: "2" },
      { label: "Snoozed", value: "1" },
    ]);
  });

  it("⚠️ 'Outstanding' IS NOT the sum of the visible groups, and that is deliberate", () => {
    /* Snoozed is live work that is merely asleep; Done is not outstanding at all. Adding the
       panels up would make the headline figure mean something no writer intends. */
    const c = cols({ todo: [urgent("a")], snoozed: [card({ key: "s" })], done: [card({ key: "z" })] });
    const stats = taskStats(c, 0);
    expect(stats.find((s) => s.label === "Outstanding")!.value).toBe("1");
    const panels = taskGroups(c).reduce((n, g) => n + g.cards.length, 0);
    expect(panels).toBe(3); // the panels hold three; outstanding is one
  });

  it("⚠️ THE ESTIMATE CHIP IS ABSENT WHEN NOTHING CARRIES ONE — 0 min is an absence, not a figure", () => {
    const c = cols({ todo: [urgent("a")] });
    expect(taskStats(c, 0)).toHaveLength(4);
    expect(taskStats(c, 0).some((s) => s.label === "Estimated")).toBe(false);
    expect(taskStats(c, 25)).toHaveLength(5);
    expect(taskStats(c, 25).at(-1)).toEqual({ label: "Estimated", value: "25 min" });
  });

  it("a sweep counts ONCE — the settled card-unit law, restated where the chips read it", () => {
    /* A chip that summed sweep members would put 24 beside a page showing 16. */
    const sweep = card({ key: "sweep", stream: "hk", members: [card(), card(), card()] } as Partial<BoardCard>);
    const c = cols({ todo: [sweep] });
    expect(taskStats(c, 0).find((s) => s.label === "Outstanding")!.value).toBe("1");
  });
});

describe("⚠️ nothing about a group is stored", () => {
  it("the module writes nothing and touches no db primitive", () => {
    const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "todoGroups.ts"), "utf8");
    for (const w of ["updateUserTask", "upsertTaskFlag", "dismissTask", "localStorage", "setDoc", "updateDoc"]) {
      expect(src, w).not.toContain(w);
    }
    /* and the law is stated in the file, so the next reader inherits the reasoning rather than
       the habit */
    expect(src).toContain("NO STORED ORDERING OR PLACEMENT");
  });
});
