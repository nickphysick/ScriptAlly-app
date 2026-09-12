/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE LIST ROW — list round, Phase 2 (`design-refs/todo-list-view-contract.html`). Supersedes the
 * three-views round's retarget of this suite in place: "Where it stands" and the Actions cell are
 * retired, the row is Task · Agent · Due · Overdue by · ⋯.
 *
 * ⚠️ THREE LINKS, PROVED IN THREE PLACES BECAUSE ONE ARTEFACT CANNOT CARRY THEM ALL.
 *   1 · the RULES     — the date cells' derivations, pure: `listCells.test.ts` (the contract's own
 *                       unit function, run) and `taskDue.test.ts` (the day and its owner).
 *   2 · the WIRING    — the five cells, the four sorting heads, the one control: RENDERED here,
 *                       because "the prop is passed" and "the markup lands" are different claims.
 *   3 · the GEOMETRY  — 62px rows, the heads over their columns, colour against ownership on real
 *                       data: `tests/e2e/listRound.measure.ts`. A stylesheet cannot be asked what a
 *                       browser did with it.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { readFileSync } from "node:fs";
import { TaskList } from "./TaskList";
import { showsManuscriptColumn, listAvatarInitials } from "../../lib/taskListRow";
import { BoardCard } from "../../lib/todoBoard";
import { TaskGroup } from "../../lib/todoGroups";
import type { DueFact } from "../../lib/taskDue";
import type { ListView } from "../../lib/todoListView";
import { sliceBetween } from "../../test/sliceBetween";

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k1", stream: "do", title: "Send your full to Jonathan Marsh", who: "Jonathan Marsh",
  subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "JM",
  record: "Jonathan Marsh · The Marsh Agency", committed: false, done: false,
  taskType: "full_requested", relatedRecordId: "q1", agentId: "a1",
  msTitle: "Murphy’s Day Out", ...over,
});

const groups = (c: BoardCard, id = "urgent", label = "Needs you now"): TaskGroup[] => [
  { id: id as TaskGroup["id"], label, description: "", cards: [c] },
];

const TODAY = "2026-09-11";
const owedOn = (ymd: string | null, owner: DueFact["owner"] = "owed"): DueFact =>
  ({ ymd, owner, source: ymd ? "ask" : "none" });

const render = (c: BoardCard, opts: {
  focusedKey?: string; selectedKey?: string; collapsed?: string[]; due?: DueFact;
  sort?: ListView["sort"]; direction?: ListView["direction"];
  groupId?: string; groupLabel?: string;
} = {}) => renderToStaticMarkup(
  <TaskList
    groups={groups(c, opts.groupId, opts.groupLabel)} onOpen={() => {}} rowInputs={() => ({ agency: "The Marsh Agency" })}
    dueOf={() => opts.due ?? owedOn("2026-04-02")} today={TODAY}
    sort={opts.sort ?? "needs-you"} direction={opts.direction ?? "asc"} onSortBy={() => {}}
    onExport={() => {}}
    focusedKey={opts.focusedKey} selectedKey={opts.selectedKey}
    onFocusRow={() => {}} onStripSnooze={() => {}}
    collapsedGroups={opts.collapsed ?? []} onToggleGroup={() => {}}
  />,
);
/** the one row, bounded on two anchors that cannot nest — its key, and the foot that follows it */
const rowOf = (html: string) => sliceBetween(html, 'data-rowkey="k1"', 'class="l-foot"');

describe("1 · the rule — manuscript grouping is a property of the account", () => {
  it("more than one book to tell apart, and zero falls on the hidden side with one", () => {
    expect(showsManuscriptColumn(0)).toBe(false);
    expect(showsManuscriptColumn(1)).toBe(false);
    expect(showsManuscriptColumn(2)).toBe(true);
    expect(showsManuscriptColumn(4)).toBe(true);
  });
});

describe("2 · the wiring — RENDERED, so the claims are about the markup and not the props", () => {
  it("the contract's five cells, by their names — and the retired cells gone, bounded", () => {
    const row = rowOf(render(card()));
    for (const cls of ["ledge", "ltask", "lag", "lchip", "lov", "lmore"]) {
      expect(row, `${cls} left the row`).toMatch(new RegExp('class="' + cls + '[" ]'));
    }
    /* ⚠️ BOUNDED, BOTH SIDES — `lstands` must not be satisfied by some longer class that happens to
       start with it, and the retired verb `go` is a two-letter word that appears inside everything */
    for (const cls of ["lstands", "lact", "stamp", "go", "ic", "actrow"]) {
      expect(row, `${cls} came back`).not.toMatch(new RegExp('["\\s`]' + cls + '["\\s`]'));
    }
  });

  it("the task is the act and its category; the agent is always rendered, the agency on its own line", () => {
    const row = rowOf(render(card()));
    expect(row).toContain('<div class="h">Send your full manuscript</div>');
    expect(row).toContain('<div class="s">Agent request</div>');
    expect(row, "the agent's name, then the agency beneath it").toContain("Jonathan Marsh<small>The Marsh Agency</small>");
    expect(row, "the family glyph, in the family's paper").toContain('class="g now"');
  });

  it("a writer's own item reads You, in the contract's pencil disc", () => {
    const row = rowOf(render(card({ userTaskId: "t1", who: "", initials: "✓", nature: "task",
      title: "Update comp titles list", taskType: undefined, relatedRecordId: undefined, agentId: undefined })));
    expect(row).toContain('class="av yours"');
    expect(row).toContain("You<small>Your own note</small>");
    expect(row).toContain('<div class="h">Update comp titles list</div>');
  });

  it("the row keeps ONE control — the ⋯, the snooze door; the verb and the × are not rebuilt", () => {
    const row = rowOf(render(card()));
    expect(row.match(/<button/g) ?? [], "controls in the row").toHaveLength(1);
    expect(row).toContain('class="lmore" aria-label="Snooze Send your full to Jonathan Marsh"');
    expect(row, "dismiss is the d key and the drawer's, not a row button").not.toContain("Dismiss ");
  });

  it("Due is the calendar chip: month over day, the year only when it is not this year, dashed for none", () => {
    const thisYear = rowOf(render(card(), { due: owedOn("2026-04-02") }));
    expect(thisYear).toContain('<div class="lchip"><div class="m">Apr</div><div class="d">2</div></div>');
    const lastYear = rowOf(render(card(), { due: owedOn("2024-05-21", "theirs") }));
    expect(lastYear).toContain('<div class="m">May</div><div class="d">21</div><div class="y">2024</div>');
    const none = rowOf(render(card(), { due: owedOn(null) }));
    expect(none).toContain('<div class="lchip none"><div class="d">none</div></div>');
  });

  it("Overdue by is a numeral and a unit — burgundy only as a CLASS of ownership, never of size", () => {
    expect(rowOf(render(card(), { due: owedOn("2026-04-02") })))
      .toContain('<div class="lov owed"><b>5</b><span class="u">months</span></div>');
    expect(rowOf(render(card(), { due: owedOn("2024-05-21", "theirs") })))
      .toContain('<div class="lov theirs"><b>2¼</b><span class="u">years</span></div>');
    expect(rowOf(render(card(), { due: owedOn("2026-09-15") })))
      .toContain('<div class="lov ahead"><b>4</b><span class="u">days to go</span></div>');
    expect(rowOf(render(card(), { due: owedOn(TODAY) })))
      .toContain('<div class="lov"><b>Due</b><span class="u">today</span></div>');
    const none = rowOf(render(card(), { due: owedOn(null) }));
    expect(none).toContain('<div class="lov none">no date</div>');
    expect(none, "a dateless row prints no numeral").not.toContain("<b>");
  });

  it("the header: four heads that SORT, in the contract's order — and the active one says so", () => {
    const html = render(card(), { sort: "over" });
    const hd = sliceBetween(html, 'class="lhd"', 'class="l-body"');
    const labels = [...hd.matchAll(/aria-label="Sort by ([^"]+)"/g)].map((m) => m[1]);
    expect(labels).toEqual(["Task", "Agent", "Due", "Overdue by"]);
    expect(hd).toContain('class="h-over on" aria-pressed="true"');
    expect(hd.match(/aria-pressed="true"/g) ?? []).toHaveLength(1);
    expect(hd, "longest overdue first reads ▼").toContain(">▼</span>");
    expect(hd, "a header of controls cannot be hidden from the reader it serves").not.toMatch(/class="lhd"[^>]*aria-hidden/);
  });

  /**
   * ⚠️ THE OVERDUE HEAD IS THE ONE COLOURED HEADING (list round, Phase 3), and it is keyed to the
   * BUCKET rather than to how many rows it holds or how late they are — so it reads the same with one
   * row in it as with twenty. The colour itself is the stylesheet's, asserted below.
   */
  it("the Overdue head wears the contract's colour class; no other head does", () => {
    const over = render(card(), { groupId: "when-over", groupLabel: "Overdue" });
    expect(over).toContain('class="g-lbl over">Overdue<');
    for (const [id, label] of [["when-week", "Due this week"], ["when-later", "Coming up"],
      ["when-none", "No date"], ["urgent", "Needs you now"]]) {
      const html = render(card(), { groupId: id, groupLabel: label });
      expect(html, `${id} took the Overdue head's colour`).toContain('class="g-lbl">');
    }
  });

  it("the head is a disclosure — collapsed keeps the count and renders no rows", () => {
    const open = render(card());
    expect(open).toContain('aria-expanded="true"');
    const closed = render(card(), { collapsed: ["urgent"] });
    expect(closed).toContain('aria-expanded="false"');
    expect(closed, "a closed group hid its size").toContain('g-n">1<');
    expect(closed, "a closed group still drew its rows").not.toContain("data-rowkey");
  });

  it("the footer teaches the list keys", () => {
    const html = render(card());
    for (const k of ["j", "k", "s", "d"]) expect(html).toContain("<kbd>" + k + "</kbd>");
  });
});

describe("2b · the avatar is an agent's, so a row without one has none", () => {
  it("an agent card wears the disc; a user task and an agentless card do not", () => {
    expect(listAvatarInitials(card())).toBe("JM");
    /* ⚠️ `✎` AND `•` ARE GLYPHS, NOT INITIALS — a person-shaped disc around either claims the row is
       about somebody it is not. The user task's pencil is the contract's `yours` disc, asserted above. */
    expect(listAvatarInitials(card({ userTaskId: "t1", initials: "✎", who: "" }))).toBeNull();
    expect(listAvatarInitials(card({ who: "", initials: "•" }))).toBeNull();
    expect(rowOf(render(card({ who: "", initials: "•", agentId: undefined }))))
      .not.toMatch(/class="av"/);
  });
});

describe("3 · the stylesheet states the contract's row, once", () => {
  const css = readFileSync("src/components/todo/taskList.css", "utf8");
  /* ⚠️ COMMENTS STRIPPED BEFORE ANYTHING IS COUNTED — this file's prose names the retired cells */
  const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rule = (sel: string) => {
    const hits = decls.match(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{", "g")) ?? [];
    expect(hits, `\`${sel}\` must be declared exactly once — a slice would read the wrong block`).toHaveLength(1);
    const at = decls.search(new RegExp("(?:^|\\n)" + sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{"));
    return decls.slice(at, decls.indexOf("}", at));
  };

  it("one base rule for the row: the contract's six tracks and its 62px, and the header on the same list", () => {
    const TRACKS = "grid-template-columns:5px minmax(0,1.5fr) 220px 92px 170px 40px";
    expect(rule(".tlc .row")).toContain(TRACKS);
    expect(rule(".tlc .row")).toContain("height:62px");
    expect(rule(".tlc .row"), "the box model the height depends on is stated, not inherited").toContain("box-sizing:border-box");
    expect(rule(".tlc .lhd"), "the heads sit over the columns because it is the same list").toContain(TRACKS);
    expect(rule(".tlc.folded .row"), "the folded modifier states only its tracks").not.toContain("height");
  });

  it("burgundy is ownership: `.owed` is the only coloured state, and nothing is keyed to magnitude", () => {
    expect(rule(".tlc .lov.owed b")).toContain("color:var(--burg)");
    for (const sel of [".tlc .lov b", ".tlc .lov.ahead b"]) expect(rule(sel)).not.toContain("--burg");
    expect(decls, "a theirs rule would be a second colour meaning the same thing").not.toMatch(/\.lov\.theirs/);
  });

  it("the Overdue head's colour is burgundy, and it is the only head colour stated", () => {
    expect(rule(".tlc .grp .g-lbl.over")).toContain("color:var(--burg)");
    expect(rule(".tlc .grp .g-lbl"), "the base head takes the ink, not the accent").toContain("color:var(--ink2)");
  });

  it("the retired cells' rules went with them", () => {
    for (const cls of ["lstands", "lact", "stamp", "r-deed", "r-fig", "r-ag"]) {
      expect(decls, `.${cls} survived its cell`).not.toMatch(new RegExp("\\." + cls + "[\\s{.:,]"));
    }
  });
});
