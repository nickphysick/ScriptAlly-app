/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE DENSE ROW — the tightened round's Phase 2, locked where each half can be locked.
 * (Supersedes the drawer round's wide-row suite in place: the manuscript COLUMN this file used
 * to guard is retired — the name rides the ACTION STRIP's meta now — and the two-line meta went
 * with the 44px height. What survives unchanged: the avatar-is-an-agent's law, the
 * always-rendered-cells law, and the one-base-rule stylesheet discipline.)
 *
 * ⚠️ THREE LINKS, PROVED IN THREE PLACES BECAUSE ONE ARTEFACT CANNOT CARRY THEM ALL.
 *   1 · the RULE       — `showsManuscriptColumn(n)`, pure, both branches, here. Its consumer is
 *                        the SORT MENU's manuscript-grouping gate now, not a column.
 *   2 · the WIRING     — the strip under the focused row, the inline agent, the disclosure
 *                        heads: RENDERED here, because "the prop is passed" and "the markup
 *                        lands" are different claims and only the second matters.
 *   3 · the GEOMETRY   — 44px in both states, the strip below the row covering nothing:
 *                        `tests/e2e/tightened.measure.ts` Phase 2. A stylesheet cannot be asked
 *                        what a browser did with it.
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

const render = (c: BoardCard, opts: {
  focusedKey?: string; selectedKey?: string; collapsed?: string[];
} = {}) => renderToStaticMarkup(
  <TaskList
    groups={groups(c)} onOpen={() => {}} rowInputs={() => ({ agency: "The Marsh Agency" })}
    onExport={() => {}}
    focusedKey={opts.focusedKey} selectedKey={opts.selectedKey}
    onFocusRow={() => {}} onStripSnooze={() => {}} onStripDismiss={() => {}}
    collapsedGroups={opts.collapsed ?? []} onToggleGroup={() => {}}
  />,
);

describe("1 · the rule — manuscript grouping is a property of the account", () => {
  it("more than one book to tell apart, and zero falls on the hidden side with one", () => {
    expect(showsManuscriptColumn(0)).toBe(false);
    expect(showsManuscriptColumn(1)).toBe(false);
    expect(showsManuscriptColumn(2)).toBe(true);
    expect(showsManuscriptColumn(4)).toBe(true);
  });
});

describe("2 · the wiring — RENDERED, so the claims are about the markup and not the props", () => {
  it("the retired cells are gone, bounded: no ms column, no agency column, no action chip", () => {
    const html = render(card(), { focusedKey: "k1" });
    for (const cls of ["r-ms", "r-agc", "actb", "r-meta", "hasms"]) {
      expect(html, `${cls} came back`).not.toMatch(new RegExp('["\\s]' + cls + '["\\s]'));
    }
  });

  it("the agent rides the deed inline and the agent cell is ALWAYS rendered", () => {
    /* ⚠️ hiding the cell when the drawer folds the row is CSS's job, never the tree's — a
       conditionally-mounted cell would rebuild the list on every open and make "folded"
       indistinguishable from "no agent" to anything measuring the row. */
    const html = render(card());
    /* ⚠️ RETARGETED, SAME LAW (three-views round, Phase 2). The claim is that the agent is ALWAYS
       rendered on a row — never conditionally mounted, so folding cannot rebuild the list and a
       measurement can tell "folded" from "no agent". What moved is WHERE: the agent was a muted
       fragment inline in the deed (`.r-who`); the contract gives it a column of its own, name over
       agency, which is what `.lag` is. */
    expect(html).toContain("lag");
    expect(html, "the agent's name").toContain("Jonathan Marsh");
    expect(html, "and the agency beneath it, no longer joined by an interpunct").toContain("The Marsh Agency");
    /* the contract's five cells, by its own names */
    for (const cls of ["ltask", "lag", "lchip", "lstands", "lact"]) {
      expect(html, `${cls} left the row`).toContain(cls);
    }
  });

  /* ⚠️ RETARGETED, AND THE LAW MOVED WITH THE DESIGN (three-views round, Phase 2). The old claim
     was that a strip of three verbs dropped beneath the FOCUSED row and that exactly one existed.
     The contract puts the verbs IN the row, so every row has its own and "exactly one host" is not
     a claim anyone can make about it. What survives — and is the half that mattered — is that all
     three verbs are still reachable from a row: the contextual primary, dismiss and snooze. The
     keys they used to teach are taught by the footer, which is asserted below. */
  it("every row carries its three verbs — the contextual primary, dismiss and snooze", () => {
    const html = render(card());
    expect(html).toContain("lact");
    expect(html, "the primary is the verb for THIS task, not a generic Open").toContain("Mark sent");
    expect(html, "dismiss").toContain("Dismiss ");
    expect(html, "snooze").toContain("Snooze ");
    /* ⚠️ AND THEY ARE ON EVERY ROW, not only a focused one — which is the change. */
    expect(render(card(), { focusedKey: "k1" }).match(/class="lact"/g)).toHaveLength(1);
    expect(html.match(/class="lact"/g), "an unfocused row still offers its verbs").toHaveLength(1);
  });

  /* ⚠️ RETIRED, NOT REBASELINED (three-views round, Phase 2). "Selection wins the strip" was a
     claim about a SINGLE host — one strip on the page, and selection beating focus for it. The
     contract gives every row its own actions cell, so there is no host to win and nothing here to
     weaken into a passing form. The selection's own marks (`.sel`, the tint and the edge) are
     asserted elsewhere in this file and are untouched. */

  it("the head is a disclosure — collapsed keeps the count and renders no rows", () => {
    const open = render(card());
    expect(open).toContain('aria-expanded="true"');
    const closed = render(card(), { collapsed: ["urgent"] });
    expect(closed).toContain('aria-expanded="false"');
    expect(closed, "a closed group hid its size").toContain('g-n">1<');
    expect(closed, "a closed group still drew its rows").not.toContain("data-rowkey");
  });

  it("the footer teaches the four list keys", () => {
    const html = render(card());
    for (const k of ["j", "k", "s", "d"]) expect(html).toContain("<kbd>" + k + "</kbd>");
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
    expect(render(card({ who: "", initials: "•", agentId: undefined })))
      .not.toMatch(/class="av s"/);
  });

  /* ⚠️ RETIRED WITH THE STRIP'S META. The manuscript rode the strip's right-hand end; the
     contract's row has no such slot, and the manuscript is already stated by the grid's ticket and
     by the page's own scope. Nothing was weakened — the surface it asserted is gone. */
});

describe("3 · the stylesheet states both shapes, and the row is 44 in each", () => {
  it("one base rule, the height stated on it, and a track list per state", () => {
    /* ⚠️ ONE BASE RULE FOR THE ROW. A `.folded` copy of the whole rule is how two rows drift; the
       modifier states ONLY the columns, which is what actually differs. */
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const css = require("node:fs").readFileSync(require("node:path").join(__dirname, "taskList.css"), "utf8") as string;
    const bases = css.match(/(?:^|\n)\.tlc \.row \{/g) ?? [];
    expect(bases, "`.tlc .row` is declared more than once — a slice would read the wrong block")
      .toHaveLength(1);
    const row = css.slice(css.indexOf(".tlc .row {"), css.indexOf("}", css.indexOf(".tlc .row {")));
    /* ⚠️ RETARGETED, SAME LAW (three-views round, Phase 2): ONE base rule for the row, and the
       modifier states only what differs. What changed is that the track list is now ON the row
       rather than reached through a `--row-cols` token on the card, and that the row's height is
       its CONTENT's — the contract's row is two lines in three of its five cells, so a fixed 44px
       could not have held it. */
    expect(row, "the row states its own six tracks").toContain("grid-template-columns:6px");
    expect(row, "a fixed height came back — the contract's row is two lines deep").not.toContain("height:44px");
    expect(css, "the folded state does not state a track list").toContain(".tlc.folded .row {");
    /* ⚠️ COMMENTS STRIPPED BEFORE THE COUNT — including when the comment is MINE, explaining the
       retirement. The paragraph written at the deleted rule to say why `--row-cols` went was itself
       a match for `--row-cols`, so the first form of this failed over prose about the fix. This
       repo already records the shape; it re-earned it inside one commit. */
    const decls = css.replace(/\/\*[\s\S]*?\*\//g, "");
    expect(decls, "the `--row-cols` indirection came back").not.toContain("--row-cols");
    expect(css, "the hasms track list survived its column").not.toContain(".tlc.hasms");
  });
});
