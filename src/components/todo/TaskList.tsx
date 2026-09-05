/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TaskList — THE PORT of `design-refs/todo-tasklist-contract.html`.
 *
 * ⚠️ THE MARKUP IS THE CONTRACT'S, ELEMENT FOR ELEMENT. `.tlc` (its `.listcard`) → `.l-bar` /
 * `.l-body` / `.l-foot`, and inside the body `.grp` heads and `.row` grids. Class names are the
 * contract's words; nothing from the retired list survives — no `tdg-` class, no tick, no hover
 * cluster, no show-more.
 *
 * ⚠️ THE ROW HAS ONE JOB: SELECTION. The tick, the ⋯ menu, Snooze and Dismiss are gone from here
 * because they belong to the pane, and a row that carried them made the list a second place to
 * finish work. Their code went with them — this component has no completion path at all.
 *
 * ⚠️ EVERYTHING RENDERS. There is no slice, no disclosure and no "show N more": `groupSlice` and
 * `showMoreLabel` are not imported, and the count in the footer is the LENGTH of the same array
 * the rows map over. That is what makes "showing 13 of 12" structurally impossible rather than
 * fixed — there is no second number to disagree.
 */
import React from "react";
import { BoardCard } from "../../lib/todoBoard";
import { TaskGroup } from "../../lib/todoGroups";
import { BUCKET_LABEL, cardBucket } from "../../lib/todoBuckets";
import {
  listAgency, listAgent, listAvatarInitials, listDeed, listFragment, listManuscript,
  listMeta, RowInputs,
} from "../../lib/taskListRow";
import "./taskList.css";

export interface TaskListProps {
  groups: TaskGroup[];
  selectedKey?: string;
  onOpen: (card: BoardCard) => void;
  /** everything a row needs beyond the card — supplied by the page, never re-derived here */
  rowInputs: (card: BoardCard) => Omit<RowInputs, "card">;
  search: string;
  onSearch: (v: string) => void;
  onAdd: () => void;
  onExport: () => void;
  /** the filter and sort triggers keep their menus; only their clothing is the contract's */
  filterActive?: boolean;
  onFilter: (anchor: HTMLElement) => void;
  filterMenu?: React.ReactNode;
  sortActive?: boolean;
  onSort: (anchor: HTMLElement) => void;
  sortMenu?: React.ReactNode;
  /** ⚠️ THE THIRD DOOR — "Set aside & tags". Same shape as filter and sort, because it is the same
   *  kind of thing: a control on the tool row that opens an anchored panel. Its count is the
   *  ledger's, so the row can say there is something waiting without being opened. */
  asideActive?: boolean;
  asideCount?: number;
  onAside: (anchor: HTMLElement) => void;
  asideMenu?: React.ReactNode;
  /**
   * ⚠️ THE MANUSCRIPT COLUMN IS THE ACCOUNT'S DECISION, PASSED IN — the rule lives in
   * `showsManuscriptColumn` and the page reads the manuscripts. The list is handed the answer
   * rather than the collection, so it has no second way to reach a different one.
   */
  showManuscript?: boolean;
  /**
   * ⚠️ FOLDED IS THE DRAWER'S STATE, NOT THE LIST'S. When a task is open the card is 520px and
   * the row drops to three columns; the flag comes from the page because the page owns whether
   * anything is open. The row's MARKUP is identical either way — every cell is always rendered
   * and CSS decides what shows — so folding cannot change what a row says, only what fits.
   */
  folded?: boolean;
}

/** the contract's three group tints, keyed by its own group ids */
const GRP_CLASS: Record<string, string> = { urgent: "now", housekeeping: "house", yours: "yours" };
/** ⚠️ THE CONTRACT'S LABELS. "Urgent" is retired: the head says what the group ASKS OF YOU. */
const GRP_LABEL: Record<string, string> = {
  urgent: "Needs you now", housekeeping: "Housekeeping", yours: "Your tasks",
};

const SearchIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
);
const FilterIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <polygon points="22 3 2 3 10 12.5 10 19 14 21 14 12.5 22 3" />
  </svg>
);
/** An archive tray — what is put aside, not thrown away. */
const AsideIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M2 4h20v4H2z" />
    <path d="M10 12h4" />
  </svg>
);
const SortIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M11 5h10M11 9h7M11 13h4M3 17V3M3 3L1 5.5M3 3l2 2.5M7 7v14M7 21l-2-2.5M7 21l2-2.5"
      transform="scale(0.9) translate(1,1)" />
  </svg>
);
const PlusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden>
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const TaskList: React.FC<TaskListProps> = ({
  groups, selectedKey, onOpen, rowInputs, search, onSearch, onAdd, onExport,
  filterActive, onFilter, filterMenu, sortActive, onSort, sortMenu,
  asideActive, asideCount, onAside, asideMenu, showManuscript, folded,
}) => {
  /**
   * ⚠️ ONE ARRAY, COUNTED ONCE. The rows map over `g.cards`; the head prints `g.cards.length`; the
   * footer prints the sum of those same lengths. Nothing here recomputes a total from a filter or
   * a stored figure, which is the only way the head, the footer and the rows cannot disagree.
   */
  const total = groups.reduce((n, g) => n + g.cards.length, 0);
  const needsYouNow = groups.find((g) => g.id === "urgent")?.cards.length ?? 0;

  return (
    /* ⚠️ BOTH WORDS: `tlc` is the scope every ported rule hangs off, `listcard` is the CONTRACT'S
       own name for this element. The pane port kept the mockup's class names verbatim and put the
       scope on the RULE; the same principle applies here, and the card is the one element where
       the two coincide — so it carries both rather than losing the contract's word. */
    <div className={`tlc listcard${folded ? " folded" : ""}${showManuscript ? " hasms" : ""}`}>
      <div className="l-bar">
        <label className="l-search">
          <SearchIcon />
          <input value={search} onChange={(e) => onSearch(e.target.value)}
            placeholder="Search your tasks…" aria-label="Search your tasks" />
        </label>
        <span className="l-menuwrap" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" title="Filter" aria-label="Filter"
            aria-haspopup="menu" aria-expanded={!!filterActive}
            className={filterActive ? "l-icon active" : "l-icon"}
            onClick={(e) => onFilter(e.currentTarget)}>
            <FilterIcon />
          </button>
          {filterMenu}
        </span>
        <span className="l-menuwrap" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" title="Sort" aria-label="Sort"
            aria-haspopup="menu" aria-expanded={!!sortActive}
            className={sortActive ? "l-icon active" : "l-icon"}
            onClick={(e) => onSort(e.currentTarget)}>
            <SortIcon />
          </button>
          {sortMenu}
        </span>
        <span className="l-menuwrap" onPointerDown={(e) => e.stopPropagation()}>
          <button type="button" title="Set aside & tags" aria-label="Set aside and tags"
            aria-haspopup="dialog" aria-expanded={!!asideActive}
            className={asideActive ? "l-icon active" : "l-icon"}
            onClick={(e) => onAside(e.currentTarget)}>
            <AsideIcon />
            {!!asideCount && <span className="l-icondot" aria-hidden="true" />}
          </button>
          {asideMenu}
        </span>
        {/* ⚠️ THE ONLY FILLED CONTROL IN THE LIST — the command-bar rule: one primary per surface */}
        <button type="button" className="l-add" title="Add a task" aria-label="Add a task" onClick={onAdd}>
          <PlusIcon />
        </button>
      </div>

      <div className="l-body">
        {groups.map((g) => (
          <React.Fragment key={g.id}>
            {/* ⚠️ AN UNKNOWN GROUP TAKES NO FAMILY CLASS. The fallback was `?? "house"`, which gave the
                Snoozed group a housekeeping dot AND made it indistinguishable from housekeeping to
                anything selecting on `.grp.house` — the command bar's meter compares itself against
                the three families, and a fourth head wearing one of their classes made the two
                disagree. A group the map does not know renders a head with no tint. */}
            <div className={GRP_CLASS[g.id] ? `grp ${GRP_CLASS[g.id]}` : "grp"}>
              <span className="g-dot" />
              <span className="g-lbl">{GRP_LABEL[g.id] ?? g.label}</span>
              <span className="g-n">{g.cards.length}</span>
            </div>
            {g.cards.map((c) => {
              const inputs: RowInputs = { card: c, ...rowInputs(c) };
              const bucket = cardBucket(c);
              const frag = listFragment(inputs);
              const meta = listMeta(inputs);
              const avatarInitials = listAvatarInitials(c);
              return (
                /* ⚠️ THE ROW IS THE CONTROL. A div with an onClick and a keyboard equivalent —
                   there is nothing interactive inside it, at rest or on hover. */
                <div
                  key={c.key}
                  className={`row${c.key === selectedKey ? " sel" : ""}`}
                  role="button"
                  tabIndex={-1}
                  aria-current={c.key === selectedKey}
                  onClick={() => onOpen(c)}
                >
                  <span className={`pill ${bucket}`}>{BUCKET_LABEL[bucket]}</span>
                  <div className="r-said">
                    {bucket === "note"
                      ? <div className="r-note">{c.title}</div>
                      : <>
                          <div className="r-deed">{listDeed(inputs)}</div>
                          {meta.length > 0 && (
                            <div className="r-meta">
                              {meta.map((part, n) => (
                                <React.Fragment key={n}>
                                  {n > 0 && <span className="dot"> · </span>}
                                  {part}
                                </React.Fragment>
                              ))}
                            </div>
                          )}
                        </>}
                  </div>
                  {/* ⚠️ THE THREE WIDE CELLS RENDER ALWAYS AND HIDE IN CSS — never conditionally
                      mounted on `folded`. Unmounting them would make folding a DOM change, so
                      every open and close would rebuild a third of the list; and a measurement
                      could not then tell "the drawer is open" from "this row has no agency". */}
                  <div className="cell r-ag">
                    {avatarInitials && (
                      <span className="av s" aria-hidden="true">{avatarInitials}</span>
                    )}
                    <span className="r-agname">{listAgent(inputs)}</span>
                  </div>
                  <div className="cell r-agc">{listAgency(inputs)}</div>
                  <div className="cell r-ms">{listManuscript(inputs) ?? ""}</div>
                  <div className={`cell keep r-fig${frag.hot ? " hot" : ""}${frag.absent ? " absent" : ""}`}>
                    {frag.absent
                      ? frag.lead
                      : <>{frag.lead}{frag.lead && <br />}<b>{frag.figure}</b> {frag.tail}</>}
                  </div>
                  {/* ⚠️ A SPAN, NOT THE CONTRACT'S `<button>` — and this is the one place the port
                      diverges from the markup on purpose. The ROW is `role="button"`, and the
                      mockup's `.actb` carries no handler of its own: its click works because the
                      row's does. A real button inside a button is invalid, unreachable to a
                      screen reader as anything separate, and would put a second tab stop on
                      every row for a control that does exactly what the row already does. The
                      treatment is the contract's to the pixel; only the element is honest. */}
                  <span className="actb" aria-hidden="true"><span className="w">Action </span>›</span>
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      <div className="l-foot">
        {/* ⚠️ ONE COUNT, FROM THE ARRAY THE ROWS RENDER FROM. No "showing X of Y" — there is no
            second number, so the two cannot disagree. */}
        <span className="c"><b>{total}</b> tasks · {needsYouNow} need you now</span>
        <a href="#" onClick={(e) => { e.preventDefault(); onExport(); }}>Export CSV</a>
      </div>
    </div>
  );
};
