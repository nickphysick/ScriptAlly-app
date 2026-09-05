/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE WIDE ROW — the drawer round's Phase 1, locked where each half can be locked.
 *
 * ⚠️ THREE LINKS, AND THEY ARE PROVED IN THREE PLACES BECAUSE ONE ARTEFACT CANNOT CARRY THEM ALL.
 *   1 · the RULE       — `showsManuscriptColumn(n)`, pure, both branches, here.
 *   2 · the WIRING     — the flag reaching the card's class and the cell's markup: RENDERED here,
 *                        not read out of the source, because "the prop is passed" and "the class
 *                        lands" are different claims and only the second is the one that matters.
 *   3 · the GEOMETRY   — the track's width and the cell's visibility on a real page:
 *                        `tests/e2e/listWide.measure.ts`. A stylesheet cannot be asked what a
 *                        browser did with it.
 *
 * ⚠️ AND THE ONE-MANUSCRIPT ACCOUNT IS NOT MEASURABLE ON THE HARNESS ACCOUNT, WHICH HAS FOUR. The
 * brief asks for "absent on one, present on two"; the fixture that carries the board's two shapes
 * is about materials gaps, and a one-manuscript variant would mean deleting three manuscripts —
 * which cascades their queries. So the ABSENT half is proved at links 1 and 2 (the rule says
 * false; the card renders without `hasms` and the cell without its text) and at link 3 by the
 * class, not by a second account. Stated rather than skipped: this is what the check has.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { TaskList } from "./TaskList";
import { showsManuscriptColumn, listAvatarInitials, listManuscript } from "../../lib/taskListRow";
import { BoardCard } from "../../lib/todoBoard";
import { TaskGroup } from "../../lib/todoGroups";

const card = (over: Partial<BoardCard> = {}): BoardCard => ({
  key: "k1", stream: "do", title: "Send your full manuscript", who: "Jonathan Marsh",
  subtitle: "", due: "", warn: false, snoozes: 0, hk: false, initials: "JM",
  record: "Jonathan Marsh · The Marsh Agency", committed: false, done: false,
  taskType: "full_requested", relatedRecordId: "q1", agentId: "a1",
  msTitle: "Murphy’s Day Out", ...over,
});

const groups = (c: BoardCard): TaskGroup[] => [
  { id: "urgent", label: "Needs you now", description: "", cards: [c] },
];

const render = (c: BoardCard, showManuscript: boolean) => renderToStaticMarkup(
  <TaskList
    groups={groups(c)} onOpen={() => {}} rowInputs={() => ({ agency: "The Marsh Agency" })}
    search="" onSearch={() => {}} onAdd={() => {}} onExport={() => {}}
    onFilter={() => {}} onSort={() => {}} onAside={() => {}}
    showManuscript={showManuscript}
  />,
);

describe("1 · the rule — the manuscript column is a property of the account", () => {
  it("more than one book to tell apart, and zero falls on the hidden side with one", () => {
    expect(showsManuscriptColumn(0)).toBe(false);
    expect(showsManuscriptColumn(1)).toBe(false);
    expect(showsManuscriptColumn(2)).toBe(true);
    expect(showsManuscriptColumn(4)).toBe(true);
  });
});

describe("2 · the wiring — RENDERED, so the claim is about the class and not the prop", () => {
  it("the flag reaches the card's class in both positions", () => {
    expect(render(card(), true), "the column is on and the card does not say so").toContain("hasms");
    /* ⚠️ BOUNDED. `hasms` is a whole class name and the card's class list is built by template, so
       the token is delimited by a space or a quote on both sides — the house rule about a
       forbidden token being a PREFIX of a live one, applied before it can bite. */
    expect(render(card(), false)).not.toMatch(/["\s]hasms["\s]/);
  });

  it("the cell is ALWAYS rendered — hiding it is CSS's job, never the tree's", () => {
    /* ⚠️ THE CLAIM IS THAT FOLDING AND HIDING COST NO DOM. A conditionally-mounted cell would make
       every open and close rebuild a third of the list, and would make "the drawer is open"
       indistinguishable from "this row has no agency" to anything measuring the row. */
    for (const on of [true, false]) {
      const html = render(card(), on);
      for (const cls of ["r-ag", "r-agc", "r-ms", "r-fig", "actb"]) {
        expect(html, `${cls} is not in the row at showManuscript=${on}`).toContain(cls);
      }
    }
  });

  it("the manuscript's own words are in the cell when the account has more than one book", () => {
    expect(render(card(), true)).toContain("Murphy’s Day Out");
  });

  it("the action control is not a second tab stop", () => {
    /* ⚠️ THE ROW IS THE CONTROL. The contract draws `.actb` as a `<button>` and gives it no
       handler of its own; a real button inside a `role="button"` row is invalid, and it would put
       a tab stop on every row for something the row already does. The treatment is the contract's;
       the element is honest. */
    const html = render(card(), true);
    const at = html.indexOf("actb");
    const el = html.lastIndexOf("<", at);
    expect(html.slice(el, at), "the action control became a real button again").toContain("<span");
    expect(html).toContain('aria-hidden="true"><span class="w">Action </span>');
  });
});

describe("2b · the avatar is an agent's, so a row without one has none", () => {
  it("an agent card wears the disc; a user task and an agentless card do not", () => {
    expect(listAvatarInitials(card())).toBe("JM");
    /* ⚠️ `✎` AND `•` ARE GLYPHS, NOT INITIALS. Both are meaningful in the board's own chip and
       neither is a person's; a person-shaped disc around either claims the row is about somebody
       it is not. */
    expect(listAvatarInitials(card({ userTaskId: "t1", initials: "✎", who: "" }))).toBeNull();
    expect(listAvatarInitials(card({ who: "", initials: "•" }))).toBeNull();
    expect(render(card({ who: "", initials: "•", agentId: undefined }), true))
      .not.toMatch(/class="av s"/);
  });

  it("a row with no manuscript prints nothing, never a placeholder", () => {
    /* An empty cell in a column that only exists on a multi-book account reads correctly; a dash
       is a statement about nothing. */
    expect(listManuscript({ card: card({ msTitle: undefined }) })).toBeNull();
    expect(listManuscript({ card: card({ msTitle: "  " }) })).toBeNull();
  });
});

describe("3 · the stylesheet states both shapes, and neither is sized by its content", () => {
  it("the row's track list is a token with three values and the row reads only the token", () => {
    /* ⚠️ ONE BASE RULE FOR THE ROW. A `.folded` copy of the whole rule is how two rows drift; the
       modifier states ONLY the columns, which is what actually differs. */
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const css = require("node:fs").readFileSync(require("node:path").join(__dirname, "taskList.css"), "utf8") as string;
    const bases = css.match(/(?:^|\n)\.tlc \.row \{/g) ?? [];
    expect(bases, "`.tlc .row` is declared more than once — a slice would read the wrong block")
      .toHaveLength(1);
    const row = css.slice(css.indexOf(".tlc .row {"), css.indexOf("}", css.indexOf(".tlc .row {")));
    expect(row).toContain("grid-template-columns:var(--row-cols)");
    for (const sel of [".tlc            {", ".tlc.hasms      {", ".tlc.folded     {"]) {
      expect(css, `${sel} does not state a track list`).toContain(sel);
    }
  });
});
