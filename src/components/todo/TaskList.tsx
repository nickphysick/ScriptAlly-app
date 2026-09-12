/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskList — the list view, ported from `design-refs/todo-list-view-contract.html` (list round,
 * Phase 2). That contract supersedes the list in every earlier one; the markup below is its own,
 * element for element, with the app's recorded names where a lock already addresses them (`.row`
 * for the contract's `.r`, `.grp` for its `.gh`, `.lhd` for its `.hd`).
 *
 * ⚠️ FIVE COLUMNS — Task · Agent · Due · Overdue by · ⋯. "Where it stands" and the Actions cell are
 * retired with this contract. The row's date is ONE fact (`taskDue`'s day) shown twice: as the Query
 * Centre's calendar chip, and as how far past it the task now is. Neither is re-derived here.
 *
 * ⚠️ THE ROW HAS ONE JOB: SELECTION. It carries one control, the ⋯, which is the snooze door it has
 * always been; the retired × is not rebuilt, because dismissal is on the `d` key the footer teaches
 * and in the drawer. Completion stays in the drawer — this component has no completion path at all.
 *
 * ⚠️ EVERYTHING RENDERS. There is no slice, no disclosure and no "show N more", so the heads and the
 * rows cannot disagree about a count: there is no second number.
 */
import React from "react";
import { BoardCard } from "../../lib/todoBoard";
import { taskCategory, CATEGORY_TAG, CATEGORY_FAMILY, type Category } from "../../lib/todoCategory";
import { dueChip, overdueCell } from "../../lib/listCells";
import type { DueFact } from "../../lib/taskDue";
import { STATE_TOKEN, stateFor } from "../../lib/queryCardFacts";
import { TaskGroup } from "../../lib/todoGroups";
import { cardBucket } from "../../lib/todoBuckets";
import { listAgencyLine, listAgent, listAvatarInitials, listTaskText, RowInputs } from "../../lib/taskListRow";
import { HEAD_KEYS, HEAD_LABEL, headArrow, type HeadKey, type ListView } from "../../lib/todoListView";
import "./taskList.css";

export interface TaskListProps {
  groups: TaskGroup[];
  selectedKey?: string;
  onOpen: (card: BoardCard) => void;
  /** everything a row needs beyond the card — supplied by the page, never re-derived here */
  rowInputs: (card: BoardCard) => Omit<RowInputs, "card"> & { anchorDate?: string | null };
  /**
   * ⚠️ THE DUE DAY, HANDED DOWN (list round, Phase 2) — `dueFor`, the page's accessor, which reads
   * the card's flag for the writer's hold. A second reading here is how a chip comes to name a
   * different day from the sort that placed its row.
   */
  dueOf: (card: BoardCard) => DueFact;
  /** today, local "YYYY-MM-DD" — the day the Overdue-by figure counts to and the chip's year is read against */
  today: string;
  /** the view's order, so each head can say whether it is the one sorting and which way */
  sort: ListView["sort"];
  direction: ListView["direction"];
  onSortBy: (key: HeadKey) => void;
  /** a slot above the body — the page supplies nothing today; the card owns only where it sits */
  toolbar?: React.ReactNode;
  onExport: () => void;
  /**
   * ⚠️ THE FOCUSED ROW — the keyboard's row. Focus is the PAGE's state (j/k live in the page's key
   * effect, beside Escape's chain), handed down like selection so the list cannot hold a second
   * opinion about which row the keys act on.
   */
  focusedKey?: string;
  onFocusRow: (card: BoardCard) => void;
  /** the ⋯ — the snooze door, through the page's own panel: the same writer the drawer's snooze uses */
  onStripSnooze: (anchor: HTMLElement, card: BoardCard) => void;
  /**
   * ⚠️ COLLAPSE IS THE PAGE'S STATE TOO, for the same reason focus is: j/k must skip the rows a
   * closed section does not render, and only the page can hand the key effect the same visible set
   * the list draws. Session-local — a preference would make a hidden group a stored fact.
   */
  collapsedGroups: string[];
  onToggleGroup: (id: string) => void;
  /**
   * ⚠️ FOLDED IS THE DRAWER'S STATE, NOT THE LIST'S. When a task is open the card narrows and the row
   * keeps the task and its Overdue-by figure — the two things a narrow column can hold. The MARKUP is
   * identical either way; CSS decides what shows, so folding cannot change what a row says.
   */
  folded?: boolean;
  /**
   * ⚠️ THE RECEIPT WINDOW'S ROW (drawer round, Phase 5) — held in the list while the undo toast
   * lives, fading out when it lapses. The page injects the card into `groups` and names it here;
   * this component only DRESSES it (`held`, then `leaving` for the fade).
   */
  leaving?: { key: string; fading: boolean };
  /**
   * ⚠️ THE CHIPS ARE THE ACTIVE FILTER SET, HANDED DOWN AS DATA (drawer round, Phase 6) — derived
   * from the SAME view the panel edits, so a chip and a tick cannot disagree about what is filtering
   * the list. Each carries the facet name in mono and its own ×.
   */
  chips?: { facet: string; label: string; onRemove: () => void }[];
  onClearFilters?: () => void;
  /** what would show with nothing narrowing — see the page */
  totalUnfiltered?: number;
  /**
   * ⚠️ AN ALTERNATIVE BODY — rendered inside this card rather than instead of it. Absent means the
   * rows, which is every live call site: the grid and the board sit on the page ground now.
   */
  body?: React.ReactNode;
}

/** the contract's three group tints, keyed by the urgency ids that still carry a family */
const GRP_CLASS: Record<string, string> = { urgent: "now", housekeeping: "house", yours: "yours" };
/** ⚠️ THE CONTRACT'S LABELS. "Urgent" is retired: the head says what the group ASKS OF YOU. */
const GRP_LABEL: Record<string, string> = {
  urgent: "Needs you now", housekeeping: "Housekeeping", yours: "Your tasks",
};

/**
 * The task glyph per category — the contract's own marks (`←` a request, `↻` a nudge, `…` a silence,
 * `⚙` housekeeping, `✎` your own), drawn in the family's paper.
 *
 * ⚠️ `✎`, NOT THE BOARD'S `✍`. The board's column head draws a writing hand from its own contract;
 * this list's contract draws a pencil. Two drawings of two surfaces — recorded rather than unified,
 * because unifying them in either file would be translating one contract into the other's words.
 */
const GLYPH: Record<Category, string> = {
  req: "←", nudge: "↻", quiet: "…", house: "⚙", yours: "✎",
};

export const TaskList: React.FC<TaskListProps> = ({
  groups, selectedKey, onOpen, rowInputs, dueOf, today, sort, direction, onSortBy, toolbar,
  folded, leaving, focusedKey, onFocusRow, onStripSnooze, collapsedGroups, onToggleGroup,
  chips, onClearFilters, body,
}) => {
  /**
   * ⚠️ THE SELECTED ROW IS BROUGHT INTO VIEW, AND `nearest` IS THE WHOLE OF IT (drawer round,
   * Phase 2). `nearest` does nothing when the row is already visible, so it cannot fight a reader
   * who has scrolled somewhere deliberately. Scoped to this card's own scroller: every workspace
   * page stays MOUNTED, so a bare `document.querySelector(".row.sel")` could be somebody else's row.
   */
  const bodyRef = React.useRef<HTMLDivElement>(null);

  /**
   * ⚠️ FOLDING CHANGES WHICH CELLS A ROW SHOWS, SO A PRESERVED `scrollTop` IS NOT A PRESERVED PLACE.
   * The anchor is the row at the top of the port and its offset within it, remembered on scroll and
   * restored in a LAYOUT effect across the one state change that causes the shift — the browser's
   * scroll anchoring cannot do it when every row changes at once, and `overflow-anchor: none` is the
   * wrong lever in the other direction.
   */
  const anchor = React.useRef<{ key: string; delta: number } | null>(null);
  const readAnchor = React.useCallback(() => {
    const b = bodyRef.current;
    if (!b) return;
    if (b.scrollTop <= 0) { anchor.current = null; return; }
    const top = b.getBoundingClientRect().top;
    for (const r of Array.from(b.querySelectorAll<HTMLElement>(".row"))) {
      const box = r.getBoundingClientRect();
      if (box.bottom > top + 1) {
        anchor.current = { key: r.dataset.rowkey ?? "", delta: box.top - top };
        return;
      }
    }
    anchor.current = null;
  }, []);

  const foldedAt = React.useRef(folded);
  React.useLayoutEffect(() => {
    const was = foldedAt.current;
    foldedAt.current = folded;
    if (was === folded) return;                       // only the fold moves every row at once
    const b = bodyRef.current;
    const a = anchor.current;
    if (!b || !a || !a.key) return;
    const el = b.querySelector<HTMLElement>('[data-rowkey="' + CSS.escape(a.key) + '"]');
    if (!el) return;
    b.scrollTop += el.getBoundingClientRect().top - b.getBoundingClientRect().top - a.delta;
  }, [folded]);

  React.useEffect(() => {
    if (!selectedKey) return;
    const el = bodyRef.current?.querySelector(".row.sel");
    if (el) (el as HTMLElement).scrollIntoView({ block: "nearest" });
  }, [selectedKey]);

  return (
    /* ⚠️ BOTH WORDS: `tlc` is the scope every ported rule hangs off, `listcard` is the card's own
       name in the list contracts that drew it — kept rather than losing the word. */
    <div className={`tlc listcard${folded ? " folded" : ""}`}>
      {toolbar}

      {chips && chips.length > 0 && (
        <div className="l-chips">
          {chips.map((c, i) => (
            <span className="fchip" key={`${c.facet}-${c.label}-${i}`}>
              <span className="k">{c.facet}</span>{c.label}
              <button type="button" className="x" aria-label={`Remove the ${c.facet} filter ${c.label}`}
                onClick={c.onRemove}>×</button>
            </span>
          ))}
          {onClearFilters && (
            <button type="button" className="l-clear" onClick={onClearFilters}>Clear all</button>
          )}
        </div>
      )}
      {/* ⚠️ THE COLUMN HEADER IS OUTSIDE THE SCROLLER, which is what makes it a table header rather
          than a first row — and its four heads SORT now (the contract's `sortBy`), so it is no longer
          `aria-hidden`: a control cannot be hidden from the reader it serves. The empty first span
          holds the 5px edge track open and the last holds the ⋯ track, so each head lands over its
          own column. */}
      {!body && (
        <div className="lhd">
          <span aria-hidden="true" />
          {HEAD_KEYS.map((k) => {
            const on = sort === k;
            return (
              <button key={k} type="button" className={`h-${k}${on ? " on" : ""}`} aria-pressed={on}
                aria-label={`Sort by ${HEAD_LABEL[k]}`} onClick={() => onSortBy(k)}>
                {HEAD_LABEL[k]} <span className="arr" aria-hidden="true">{headArrow(sort, direction, k)}</span>
              </button>
            );
          })}
          <span className="lhd-more" aria-hidden="true" />
        </div>
      )}
      <div className="l-body" ref={bodyRef} onScroll={readAnchor}>
        {body ?? groups.map((g) => (
          <React.Fragment key={g.id}>
            {/* ⚠️ AN UNKNOWN GROUP TAKES NO FAMILY CLASS — a generated head wearing a family's class
                would be counted as that family by anything selecting on it. */}
            {/* ⚠️ THE HEAD IS A DISCLOSURE (tightened round, Phase 2) — click collapses the section,
                the chevron says which way, the COUNT STAYS so a closed group still states its size.
                The contract's head is the name, a plain count pill and a hairline to the edge; the
                chevron is this app's recorded fourth child. */}
            <div
              className={`${GRP_CLASS[g.id] ? `grp ${GRP_CLASS[g.id]}` : "grp"}${collapsedGroups.includes(g.id) ? " closed" : ""}`}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsedGroups.includes(g.id)}
              onClick={() => onToggleGroup(g.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleGroup(g.id); } }}
            >
              <span className="g-lbl">{GRP_LABEL[g.id] ?? g.label}</span>
              <span className="g-n">{g.cards.length}</span>
              <span className="g-cv" aria-hidden="true">⌄</span>
            </div>
            {!collapsedGroups.includes(g.id) && g.cards.map((c) => {
              const inputs: RowInputs = { card: c, ...rowInputs(c) };
              const cat = taskCategory(c);
              const own = cardBucket(c) === "note";
              const initials = listAvatarInitials(c);
              const due = dueOf(c);
              const chip = dueChip(due.ymd, today);
              const cell = overdueCell(due, today);
              /* ⚠️ THE EDGE IS THE QUERY'S STAGE, DERIVED — the same ladder the ticket's edge and the
                 Query Centre's own cards read, never a colour stored on the card. */
              const edgeTint = c.status ? STATE_TOKEN[stateFor(c.status)] : STATE_TOKEN.closed;
              const stripOn = c.key === selectedKey || c.key === focusedKey;
              return (
                /* ⚠️ THE ROW IS THE CONTROL — first activation FOCUSES, the second (or a double-click,
                   or any click while the drawer is open) OPENS. The ⋯ stops its own click. */
                <div
                  key={c.key}
                  data-rowkey={c.key}
                  className={`row${c.key === selectedKey ? " sel" : ""}${c.key === focusedKey ? " focus" : ""}${leaving?.key === c.key ? (leaving.fading ? " held leaving" : " held") : ""}`}
                  role="button"
                  tabIndex={-1}
                  aria-current={c.key === selectedKey}
                  onClick={() => { if (folded || stripOn) onOpen(c); else onFocusRow(c); }}
                  onDoubleClick={() => onOpen(c)}
                >
                  {/* ⚠️ THE EDGE IS THE FIRST GRID CELL, IN FLOW — the contract's own shape. It
                      stretches to the row's full 62px, so no absolute positioning and no empty
                      spacer track are needed to hold it. */}
                  <span className="ledge" style={{ background: edgeTint }} aria-hidden="true" />
                  <div className="ltask">
                    <span className={`g ${CATEGORY_FAMILY[cat]}`} aria-hidden="true">{GLYPH[cat]}</span>
                    <div className="tx">
                      <div className="h">{listTaskText(inputs)}</div>
                      <div className="s">{CATEGORY_TAG[cat]}</div>
                    </div>
                  </div>
                  {/* ⚠️ THE AGENT CELL RENDERS ALWAYS AND HIDES IN CSS when the drawer folds the row —
                      never conditionally mounted, so a measurement can tell "folded" from "no agent".
                      A writer's own item says "You" in the contract's pencil disc; an agentless card
                      draws no person-shaped disc at all, because a blank one is a person the app
                      failed to name. */}
                  <div className="lag">
                    {own ? (
                      <>
                        <span className="av yours" aria-hidden="true">{"✎"}</span>
                        <span className="n">You<small>Your own note</small></span>
                      </>
                    ) : (
                      <>
                        {initials && <span className="av" aria-hidden="true">{initials}</span>}
                        <span className="n">{listAgent(inputs)}<small>{listAgencyLine(inputs)}</small></span>
                      </>
                    )}
                  </div>
                  {chip.kind === "none" ? (
                    <div className="lchip none"><div className="d">none</div></div>
                  ) : (
                    <div className="lchip">
                      <div className="m">{chip.mon}</div>
                      <div className="d">{chip.day}</div>
                      {chip.year && <div className="y">{chip.year}</div>}
                    </div>
                  )}
                  {cell.kind === "none" ? (
                    <div className="lov none">no date</div>
                  ) : cell.kind === "today" ? (
                    <div className="lov"><b>Due</b><span className="u">today</span></div>
                  ) : cell.kind === "ahead" ? (
                    <div className="lov ahead"><b>{cell.figure}</b><span className="u">{cell.unit}</span></div>
                  ) : (
                    <div className={`lov ${cell.owner}`}><b>{cell.figure}</b><span className="u">{cell.unit}</span></div>
                  )}
                  <button type="button" className="lmore" aria-label={`Snooze ${c.title}`}
                    onClick={(e) => { e.stopPropagation(); onStripSnooze(e.currentTarget, c); }}>{"⋯"}</button>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* ⚠️ THE FOOTER STATES ONLY THE KEYS (corrections 2.1) — they act on a focused ROW and so print
          only where rows exist. The count lives beside the tiles, Export in the toolbar. */}
      {!body && (
        <div className="l-foot">
          <span className="keys" aria-hidden="true">
            <kbd>j</kbd><kbd>k</kbd> move <kbd>↵</kbd> open <kbd>s</kbd> snooze <kbd>d</kbd> dismiss
          </span>
        </div>
      )}
    </div>
  );
};
