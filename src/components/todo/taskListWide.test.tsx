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
    stripMeta={(x) => listManuscript({ card: x })}
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
    expect(html).toContain("r-who");
    expect(html).toContain("Jonathan Marsh · The Marsh Agency");
    for (const cls of ["r-ag", "r-fig", "r-deed"]) {
      expect(html, `${cls} left the row`).toContain(cls);
    }
  });

  it("the strip renders under the FOCUSED row — three verbs, each teaching its key, the ms on the right", () => {
    const html = render(card(), { focusedKey: "k1" });
    expect(html).toContain("actrow show");
    for (const verb of ["Open", "Snooze", "Dismiss"]) expect(html).toContain(verb);
    for (const k of ["↵", "s", "d"]) expect(html).toContain("<kbd>" + k + "</kbd>");
    expect(html, "the manuscript left the strip's meta").toContain("Murphy’s Day Out");
    /* and with nothing focused there is NO strip at all */
    expect(render(card()), "a strip with no host").not.toContain("actrow");
  });

  it("selection wins the strip — sel hosts it even when focus is elsewhere", () => {
    /* one strip, structurally: selection and focus are each single-valued and selection wins. */
    const two = renderToStaticMarkup(
      <TaskList
        groups={[{ id: "urgent", label: "Needs you now", description: "", cards: [card(), card({ key: "k2", who: "Aisha Kapoor", initials: "AK" })] }]}
        onOpen={() => {}} rowInputs={() => ({ agency: "A" })}
        onExport={() => {}}
        focusedKey="k2" selectedKey="k1"
        onFocusRow={() => {}} onStripSnooze={() => {}} onStripDismiss={() => {}}
        stripMeta={() => null}
        collapsedGroups={[]} onToggleGroup={() => {}}
      />,
    );
    expect(two.match(/actrow show/g), "two strips at once").toHaveLength(1);
    expect(two).toContain("actrow show onsel");
  });

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

  it("a row with no manuscript prints nothing in the strip, never a placeholder", () => {
    expect(listManuscript({ card: card({ msTitle: undefined }) })).toBeNull();
    expect(listManuscript({ card: card({ msTitle: "  " }) })).toBeNull();
    const html = render(card({ msTitle: undefined }), { focusedKey: "k1" });
    expect(html).toContain("actrow show");
    expect(html, "an empty meta rendered anyway").not.toContain('class="meta"');
  });
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
    expect(row).toContain("grid-template-columns:var(--row-cols)");
    expect(row, "the 44px height left the base rule").toContain("height:44px");
    for (const sel of [".tlc            {", ".tlc.folded     {"]) {
      expect(css, `${sel} does not state a track list`).toContain(sel);
    }
    expect(css, "the hasms track list survived its column").not.toContain(".tlc.hasms");
  });
});
