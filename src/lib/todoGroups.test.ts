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
  railChips, chipGroups, chipMatchesCard,
} from "./todoGroups";
import { TODO_LISTS, TodoListId } from "./todoRoutes";
import { BoardCard } from "./todoBoard";
import { BoardColumns } from "./todoColumns";

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "•", record: "", committed: false, done: false, ...over,
});
/**
 * ⚠️ THE CAST IS WHY A MISSING COLUMN WAS SILENT (pane round, Phase 7). `as BoardColumns` over an
 * object literal tells `tsc` to stop asking, so when the interface gained `dismissed` this helper
 * kept compiling and thirteen cases failed at RUNTIME reading `.length` of undefined. The cast is
 * gone: the literal now has to satisfy the interface, which is the whole point of having one.
 */
const cols = (over: Partial<BoardColumns> = {}): BoardColumns =>
  ({ todo: [], today: [], snoozed: [], dismissed: [], done: [], ...over });

/* one of each family, by the rules liveFamily already states */
const urgent = (k: string) => card({ key: k, stream: "do" });
const house = (k: string) => card({ key: k, stream: "hk" });
const mine = (k: string) => card({ key: k, userTaskId: `u${k}` });

describe("⚠️ six groups, derived — never a second derivation", () => {
  it("the order descends from 'someone is waiting' to 'nothing is waiting'", () => {
    /* ⚠️ DISMISSED SITS BETWEEN SNOOZED AND DONE (pane round, Phase 7), and the order still reads
       as the sentence this case names: urgent someone is waiting · housekeeping · yours · snoozed
       (waiting, on a date) · dismissed (nobody is waiting, by your decision) · done (nobody is
       waiting, because it is finished). It is not last: done is the day's own log and closes the
       list, and a group of things you set aside is not a record of what you achieved. */
    expect(TASK_GROUP_ORDER).toEqual(["urgent", "housekeeping", "yours", "snoozed", "dismissed", "done"]);
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

/* ── the rail's chips (rail + workspace, Phase 4) ────────────────────────────────────────────── */

describe("⚠️ THE CHIPS ARE THE GROUPS PLUS 'ALL' — never a second facet vocabulary", () => {
  const live = (over: Partial<BoardColumns> = {}) => cols(over);

  it("the order, and the words, come from the group meta rather than from literals", () => {
    const cs = railChips(live({ todo: [urgent("a"), house("b"), mine("c")] }));
    expect(cs.map((c) => c.id)).toEqual(["all", "urgent", "housekeeping", "yours"]);
    expect(cs.find((c) => c.id === "urgent")!.label).toBe(TASK_GROUP_META.urgent.label);
    expect(cs.find((c) => c.id === "housekeeping")!.label).toBe(TASK_GROUP_META.housekeeping.label);
    expect(cs.find((c) => c.id === "yours")!.label).toBe(TASK_GROUP_META.yours.label);
  });

  /**
   * ⚠️ EVERY COUNT IS THE GROUP'S OWN, so a chip and the panel it names cannot state different
   * figures. Asserted against `taskGroups` rather than against numbers — a literal on each side
   * goes green the day someone changes both in the same wrong direction.
   */
  it("each chip's count IS its group's card count", () => {
    const c = live({
      todo: [urgent("a"), urgent("b"), house("c")],
      today: [mine("d")],
      snoozed: [card({ key: "s" })],
      done: [card({ key: "z", done: true })],
    });
    const gs = taskGroups(c);
    const n = (id: string) => gs.find((g) => g.id === id)!.cards.length;
    const chips = railChips(c);
    for (const id of ["urgent", "housekeeping", "yours", "snoozed"]) {
      expect(chips.find((x) => x.id === id)!.count, id).toBe(n(id));
    }
  });

  it("⚠️ 'ALL' IS WHAT IS OUTSTANDING — the three live kinds, not the sum of every group", () => {
    /* Snoozed is live work merely asleep and Done is not outstanding at all; adding the panels up
       would make the headline figure mean something no writer intends. It is the same figure the
       "Outstanding" stat chip states, which is why they are asserted against each other. */
    const c = live({
      todo: [urgent("a"), house("b")], today: [mine("d")],
      snoozed: [card({ key: "s" })], done: [card({ key: "z", done: true })],
    });
    const all = railChips(c).find((x) => x.id === "all")!;
    expect(all.count).toBe(3);
    expect(String(all.count)).toBe(taskStats(c, 0).find((s) => s.label === "Outstanding")!.value);
  });

  /**
   * ⚠️ THE SNOOZED CHIP IS ABSENT AT ZERO, AND ONLY THAT ONE. The three kinds are the page's
   * permanent vocabulary and a `0` beside one of them is information — nothing needs you in that
   * pile today. Snoozed is a state you may never have used, and a chip for it would teach a
   * feature rather than report a fact.
   */
  it("the Snoozed chip renders only when something is asleep; the kinds render at zero", () => {
    expect(railChips(live({ todo: [urgent("a")] })).map((c) => c.id)).not.toContain("snoozed");
    const withSnz = railChips(live({ todo: [urgent("a")], snoozed: [card({ key: "s" })] }));
    expect(withSnz.map((c) => c.id)).toContain("snoozed");
    /* an empty kind keeps its chip, reading 0 */
    const bare = railChips(live({ todo: [urgent("a")] }));
    expect(bare.find((c) => c.id === "yours")).toEqual({ id: "yours", label: "Your tasks", count: 0 });
  });

  it("⚠️ DONE IS NOT A CHIP — you do not look FOR finished work, and All is where it is", () => {
    const c = live({ todo: [urgent("a")], done: [card({ key: "z", done: true })] });
    expect(railChips(c).map((x) => x.id)).not.toContain("done");
    /* …and it still renders, under All */
    expect(chipGroups(taskGroups(c), "all").map((g) => g.id)).toContain("done");
  });

  it("a chip shows its own group and nothing else; All shows everything", () => {
    const c = live({ todo: [urgent("a"), house("b"), mine("d")], snoozed: [card({ key: "s" })] });
    const gs = taskGroups(c);
    expect(chipGroups(gs, "housekeeping").map((g) => g.id)).toEqual(["housekeeping"]);
    expect(chipGroups(gs, "all")).toEqual(gs);
  });

  /**
   * ⚠️ THE CARD PREDICATE IS THE SAME NARROWING, ASKED OF ONE CARD — it is what the workspace
   * pane's queue reads, so the pane walks exactly the set the rail is showing.
   */
  it("the card predicate agrees with the group filter, kind for kind", () => {
    expect(chipMatchesCard("all", urgent("a"))).toBe(true);
    expect(chipMatchesCard("urgent", urgent("a"))).toBe(true);
    expect(chipMatchesCard("urgent", house("b"))).toBe(false);
    expect(chipMatchesCard("housekeeping", house("b"))).toBe(true);
    expect(chipMatchesCard("yours", mine("c"))).toBe(true);
  });

  it("⚠️ A SNOOZED CHIP MATCHES NO LIVE CARD — which is what empties the pane's queue, on purpose", () => {
    /* The pane's list is the three live kinds; a sleeping card is not in it. Narrowing to Snoozed
       therefore leaves the pane with nothing to walk — the case it HOLDS its selection for rather
       than clearing itself because a filter moved. */
    for (const c of [urgent("a"), house("b"), mine("c")]) {
      expect(chipMatchesCard("snoozed", c)).toBe(false);
    }
  });
});

/**
 * ⚠️ THE RETURN BOUNDARY — A CARD DUE BACK TODAY IS AWAKE, AND IT IS IN EXACTLY ONE PLACE.
 *
 * This is the fixture the grouping most needs and least obviously has: a snoozed flag whose
 * return date is TODAY. Off by one in either direction and the card is either asleep on the
 * morning it was meant to come back — the writer never sees it — or in both the Snoozed group and
 * a live one at once, which makes every count on the page disagree with the panels beneath it.
 *
 * `snoozedCards` is where the boundary is choked (tasks-audit P1); this asserts the GROUPS honour
 * it, since a partition that double-counts is a different failure from a filter that does.
 */
describe("⚠️ THE SNOOZED PARTITION AT THE BOUNDARY DATE", () => {
  it("a card returning today is live, and appears in exactly one group", () => {
    /* the columns are the input: a returned card has already left `cols.snoozed` by the time the
       groups see it, so the partition's job is not to put it back */
    const returning = card({ key: "back-today", stream: "hk" });
    const c = cols({ todo: [returning], snoozed: [] });
    const gs = taskGroups(c);
    const homes = gs.filter((g) => g.cards.some((x) => x.key === "back-today"));
    expect(homes.map((g) => g.id)).toEqual(["housekeeping"]);
    expect(gs.map((g) => g.id)).not.toContain("snoozed");
  });

  it("a card still asleep is in Snoozed and NOWHERE else", () => {
    const asleep = card({ key: "still-asleep", stream: "hk", snoozes: 1 });
    const gs = taskGroups(cols({ snoozed: [asleep] }));
    const homes = gs.filter((g) => g.cards.some((x) => x.key === "still-asleep"));
    expect(homes.map((g) => g.id)).toEqual(["snoozed"]);
  });

  /**
   * ⚠️ AND THE COUNTS FOLLOW, which is the half that would go unnoticed. A card in two groups
   * still renders once per panel and looks correct; the chips are where the double shows.
   */
  it("no card is counted twice — the chips and the panels agree at the boundary", () => {
    const c = cols({
      todo: [card({ key: "back-today", stream: "hk" })],
      snoozed: [card({ key: "still-asleep", stream: "hk", snoozes: 1 })],
    });
    const gs = taskGroups(c);
    const keys = gs.flatMap((g) => g.cards.map((x) => x.key));
    expect(new Set(keys).size).toBe(keys.length);
    const chips = railChips(c);
    expect(chips.find((x) => x.id === "all")!.count).toBe(1);          // the returned one only
    expect(chips.find((x) => x.id === "snoozed")!.count).toBe(1);      // the sleeping one only
    expect(chips.find((x) => x.id === "housekeeping")!.count).toBe(1);
  });
});
