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
import { taskCategory, CATEGORY_TAG, CATEGORY_FAMILY } from "../../lib/todoCategory";
import { dateChip, listStands, listSub, listVerb } from "../../lib/listCells";
import { STATE_TOKEN, stateFor } from "../../lib/queryCardFacts";
import { StatusDot } from "../StatusDot";
import { TaskGroup } from "../../lib/todoGroups";
import { cardBucket } from "../../lib/todoBuckets";
import {
  listAgency, listAgent, listAvatarInitials, listDeed, listFragment,
  RowInputs,
} from "../../lib/taskListRow";
import "./taskList.css";

export interface TaskListProps {
  groups: TaskGroup[];
  selectedKey?: string;
  onOpen: (card: BoardCard) => void;
  /** everything a row needs beyond the card — supplied by the page, never re-derived here */
  /* ⚠️ `anchorDate` IS PART OF THE CONTRACT NOW (three-views round, Phase 2). `listRowInputs`
     has always returned it; this prop's type simply omitted it, so the row could not reach the
     one date the Asked chip and the "where it stands" sentence both state. Widened rather than
     re-derived — a second date derivation is how a chip comes to say a different day from the
     sentence beside it. */
  rowInputs: (card: BoardCard) => Omit<RowInputs, "card"> & { anchorDate?: string | null };
  /* ⚠️ `search`/`onSearch`/`filterActive`/`onFilter`/`filterMenu`/`sortActive`/`onSort`/
     `sortMenu`/`filterCount`/`sortLabel` are RETIRED with the card's own bar (QC-chassis round,
     Phase 1) — the page's toolbar owns all of them. A prop with no render site is a slot a future
     page fills without anyone deciding it should exist, which is why they go rather than linger. */
  /** ⚠️ THE CARD'S OWN TOP CHROME (tightened round, Phase 1) — the one 32px toolbar row: the
   *  workload meter and the three actions. A slot rather than a mount because the actions need
   *  the page's handlers; the card owns only where it sits. Replaces the retired `onAdd` — the
   *  toolbar's Add-a-task is the card's one filled control now. */
  toolbar?: React.ReactNode;
  onExport: () => void;
  /** the filter and sort triggers keep their menus; only their clothing is the contract's */
  /** ⚠️ THE THIRD DOOR — "Set aside & tags". Same shape as filter and sort, because it is the same
   *  kind of thing: a control on the tool row that opens an anchored panel. Its count is the
   *  ledger's, so the row can say there is something waiting without being opened. */
  /* ⚠️ `asideActive`/`asideCount`/`onAside`/`asideMenu` ARE RETIRED (corrections 2.1). The
     set-aside door moved to the PAGE's toolbar row, where it belongs: it is the route to the ledger
     and to tag management, both page-level and true of whatever body is showing. Its old comment
     here promised Phase 3 would rehome it; Phase 3 did not, so it stayed in this card's bar as a
     lone unlabelled icon above the columns. A prop with no render site is a slot a future page
     fills without anyone deciding it should exist, so these go rather than linger. */
  /**
   * ⚠️ THE MANUSCRIPT COLUMN IS RETIRED (tightened round, Phase 2) — the 44px row has no room
   * for a cell most accounts leave blank, and the contract moves the name into the ACTION
   * STRIP's right meta, where it rides the selected row instead of every row. The strip shows
   * it whenever the card carries one; `showsManuscriptColumn`'s one-book rule retired with the
   * column it governed.
   */
  /**
   * ⚠️ THE FOCUSED ROW — the keyboard's row and the strip's host. Focus is the PAGE's state
   * (j/k live in the page's key effect, beside Escape's chain), handed down like selection so
   * the list cannot hold a second opinion about which row the keys act on.
   */
  focusedKey?: string;
  onFocusRow: (card: BoardCard) => void;
  /**
   * ⚠️ THE ACTION STRIP'S VERBS GO THROUGH THE PAGE — the same writers the sheet uses (the
   * snooze panel, the dismiss confirm), never a second path. The strip renders under the
   * focused row (or the selected one while the sheet is open); exactly one exists at a time
   * because focus and selection are each single-valued and selection wins.
   */
  onStripSnooze: (anchor: HTMLElement, card: BoardCard) => void;
  onStripDismiss: (card: BoardCard) => void;
  /** the strip's quiet right meta — the manuscript name, derived by the page's own inputs */
  /**
   * ⚠️ COLLAPSE IS THE PAGE'S STATE TOO, for the same reason focus is: j/k must skip the rows a
   * closed section does not render, and only the page can hand the key effect the same visible
   * set the list draws. Session-local — a preference would make a hidden group a stored fact.
   */
  collapsedGroups: string[];
  onToggleGroup: (id: string) => void;
  /**
   * ⚠️ FOLDED IS THE DRAWER'S STATE, NOT THE LIST'S. When a task is open the card is 520px and
   * the row drops to three columns; the flag comes from the page because the page owns whether
   * anything is open. The row's MARKUP is identical either way — every cell is always rendered
   * and CSS decides what shows — so folding cannot change what a row says, only what fits.
   */
  folded?: boolean;
  /**
   * ⚠️ THE RECEIPT WINDOW'S ROW (drawer round, Phase 5) — held in the list while the undo toast
   * lives, fading out when it lapses. The page injects the card into `groups` and names it here;
   * this component only DRESSES it (`held`, then `leaving` for the 300ms fade). Grepped before
   * naming, per the `.unitrow` lesson: `.leaving` exists only as the compound
   * `.tdb-ffsheet.leaving`, which cannot reach a `.tlc .row`.
   */
  leaving?: { key: string; fading: boolean };
  /**
   * ⚠️ THE CHIPS ARE THE ACTIVE FILTER SET, HANDED DOWN AS DATA (Phase 6). The page derives them
   * from the SAME view the panel edits, so a chip and a tick cannot disagree about what is
   * filtering the list. Each carries the facet name in mono — the contract's rule, so "Jonathan
   * Marsh" cannot be mistaken for a search term — and its own ×; the row renders only when
   * something is active.
   */
  chips?: { facet: string; label: string; onRemove: () => void }[];
  onClearFilters?: () => void;
  /** the filter button's badge — the count of active choices, 0 hides it */
  /** the Group & order trigger's label — the contract's "By agent · Longest waiting" */
  /**
   * ⚠️ THE FOOTER'S SECOND FORM (Phase 6). When anything is hiding rows it reads
   * "Showing n of N" — n is the ONE array's total as ever; N arrives from the page as what would
   * show with nothing narrowing. The two-number form appears EXACTLY when they differ, which is
   * computed here from the numbers rather than from a flag that could go stale.
   */
  totalUnfiltered?: number;
  /**
   * ⚠️ AN ALTERNATIVE BODY — the Grid view's tickets, rendered inside this card rather than
   * instead of it (QC-chassis round, Phase 3). Absent means the rows, which is every existing
   * call site unchanged.
   *
   * It takes the BODY and not the card because the card's foot states a count and teaches four
   * keys, and both are true of whatever the body shows: `total` is derived from `groups`, which
   * the caller has already narrowed. Handing over the whole card would have given the two views
   * two footers, free to state different numbers for one set — which is the fault this page has
   * closed twice.
   */
  body?: React.ReactNode;
}

/** the contract's three group tints, keyed by its own group ids */
const GRP_CLASS: Record<string, string> = { urgent: "now", housekeeping: "house", yours: "yours" };
/** ⚠️ THE CONTRACT'S LABELS. "Urgent" is retired: the head says what the group ASKS OF YOU. */
const GRP_LABEL: Record<string, string> = {
  urgent: "Needs you now", housekeeping: "Housekeeping", yours: "Your tasks",
};

/** An archive tray — what is put aside, not thrown away. */
const AsideIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8h18v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
    <path d="M2 4h20v4H2z" />
    <path d="M10 12h4" />
  </svg>
);
export const TaskList: React.FC<TaskListProps> = ({
  groups, selectedKey, onOpen, rowInputs, toolbar, onExport,
  folded, leaving,
  focusedKey, onFocusRow, onStripSnooze, onStripDismiss,
  collapsedGroups, onToggleGroup,
  chips, onClearFilters, totalUnfiltered, body,
}) => {
  /**
   * ⚠️ ONE ARRAY, COUNTED ONCE. The rows map over `g.cards`; the head prints `g.cards.length`; the
   * footer prints the sum of those same lengths. Nothing here recomputes a total from a filter or
   * a stored figure, which is the only way the head, the footer and the rows cannot disagree.
   */
  const total = groups.reduce((n, g) => n + g.cards.length, 0);
  const needsYouNow = groups.find((g) => g.id === "urgent")?.cards.length ?? 0;

  /**
   * ⚠️ THE SELECTED ROW IS BROUGHT INTO VIEW, AND `nearest` IS THE WHOLE OF IT (drawer round,
   * Phase 2). The list stays live and scrollable while the drawer is open — walking with ↑ and ↓
   * would otherwise leave the highlight somewhere off screen, which is the one thing that makes a
   * push layout worse than an overlay. `nearest` does NOTHING when the row is already visible, so
   * it cannot fight a reader who has scrolled somewhere deliberately, and it cannot move the list
   * on an open that did not need it.
   *
   * ⚠️ SCOPED TO THIS CARD'S OWN SCROLLER, NOT THE DOCUMENT. Every workspace page stays MOUNTED
   * under this shell, so a bare `document.querySelector(".row.sel")` returns whichever copy comes
   * first in the tree — and three pages render a `.wpg`. The ref is the only address that cannot
   * be somebody else's row.
   */
  const bodyRef = React.useRef<HTMLDivElement>(null);

  /**
   * ⚠️ FOLDING CHANGES EVERY ROW'S HEIGHT, SO A PRESERVED `scrollTop` IS NOT A PRESERVED PLACE —
   * and the difference is invisible in pixels, which is how it nearly shipped. Rows are 57.9px
   * folded (two lines) and 50px open (one), so the same `scrollTop` lands further down the list
   * after unfolding: measured, `scrollTop` moved 140 → 138 while the row at the top of the port
   * went from Ottoline Frayn's to Marcus Reed's. **A two-pixel drift and a whole row of movement,
   * at a shallow scroll** — deeper in the list it is a row per eight pixels of row above you.
   *
   * ⚠️ THE BROWSER'S SCROLL ANCHORING CANNOT DO THIS ONE. It nudges for content arriving or
   * leaving; here every row in the list changes size at once, and it compensated 2px of a ~60px
   * shift. `overflow-anchor: none` is the wrong lever in the other direction and this repo already
   * records why — the fix is to hold the anchor ourselves, over the one state change that causes
   * it, and to leave anchoring alone everywhere else.
   *
   * The anchor is the row at the top of the port and its offset within it, remembered on scroll
   * and restored in a LAYOUT effect — before paint, so nothing is ever drawn in the wrong place.
   * `useLayoutEffect` also runs before the passive effect below, which is the order that matters:
   * on open the place is restored and then the selected row is brought into view (a no-op if it
   * already is); on close there is no selection, so the restore stands alone.
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
    /* ⚠️ BOTH WORDS: `tlc` is the scope every ported rule hangs off, `listcard` is the CONTRACT'S
       own name for this element. The pane port kept the mockup's class names verbatim and put the
       scope on the RULE; the same principle applies here, and the card is the one element where
       the two coincide — so it carries both rather than losing the contract's word. */
    <div className={`tlc listcard${folded ? " folded" : ""}`}>
      {/* ⚠️ THE TOOLBAR IS THE CARD'S FIRST CHILD (tightened round, Phase 1) — the meter and the
          three actions on one 32px row, ABOVE the search row. It is a slot: the page supplies the
          handlers, and the masthead keeps the page's one title element (the header stream's). */}
      {toolbar}
      {/* ⚠️ THE CARD'S SEARCH, FILTER AND SORT ARE RETIRED (QC-chassis round, Phase 1) — the page
        {/* ⚠️ THE CARD'S BAR IS GONE WITH ITS ONE CONTROL (corrections 2.1). It held only the
            set-aside door, now in the page's toolbar row — an empty bar would have kept a strip of
            padding above the body for nothing. */}

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
          than a first row. The contract puts it directly inside `.listv`, above the group heads; the
          empty first span holds the 6px status-edge track open so the five labels land over the five
          cells. It is `aria-hidden` because the row beneath is not a `<table>` — a screen reader
          reading five stray words before every group would be told a structure that is not there. */}
      {!body && <div className="lhd" aria-hidden="true">
        <span /><span>Task</span><span>Agent</span><span>Asked</span>
        <span>Where it stands</span><span className="right">Actions</span>
      </div>}
      <div className="l-body" ref={bodyRef} onScroll={readAnchor}>
        {/* ⚠️ THE GRID AND THE LIST ARE TWO VIEWS OF ONE CARD (QC-chassis round, Phase 3), and this
            one line is why. The first cut swapped the whole card for a grid, which took the card's
            FOOTER with it — so the count "N tasks · M need you now" and the four key hints vanished
            in Grid view, and `.tpl-zone` left the chain. Three locks went red and were right to.

            Only the BODY swaps. The head, the chips, the footer and its count are the card's, and
            `total` is still `groups`, so the number describes whatever the body is showing. Two
            cards would have been two footers free to disagree. */}
        {body ?? groups.map((g) => (
          <React.Fragment key={g.id}>
            {/* ⚠️ AN UNKNOWN GROUP TAKES NO FAMILY CLASS. The fallback was `?? "house"`, which gave the
                Snoozed group a housekeeping dot AND made it indistinguishable from housekeeping to
                anything selecting on `.grp.house` — the command bar's meter compares itself against
                the three families, and a fourth head wearing one of their classes made the two
                disagree. A group the map does not know renders a head with no tint. */}
            {/* ⚠️ THE HEAD IS A DISCLOSURE NOW (tightened round, Phase 2) — click collapses the
                section, the chevron says which way, the COUNT STAYS so a closed group still
                states its size. aria-expanded carries the state for the same reader the
                role does. */}
            <div
              className={`${GRP_CLASS[g.id] ? `grp ${GRP_CLASS[g.id]}` : "grp"}${collapsedGroups.includes(g.id) ? " closed" : ""}`}
              role="button"
              tabIndex={0}
              aria-expanded={!collapsedGroups.includes(g.id)}
              onClick={() => onToggleGroup(g.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggleGroup(g.id); } }}
            >
              {/* ⚠️ THE ICON DISC IS GONE (three-views round, Phase 2). The contract's group head
                  is three things — the name, a bordered count, and one hairline to the right edge —
                  on white, with no band, no disc, no subtitle and no mono caps. The family classes
                  stay on the HEAD because other surfaces select on them; what left is the dot. */}
              <span className="g-lbl">{GRP_LABEL[g.id] ?? g.label}</span>
              <span className="g-n">{g.cards.length}</span>
              <span className="g-cv" aria-hidden="true">⌄</span>
            </div>
            {!collapsedGroups.includes(g.id) && g.cards.map((c) => {
              const ri = rowInputs(c);
              const inputs: RowInputs = { card: c, ...ri };
              const bucket = cardBucket(c);
              const frag = listFragment(inputs);
              const avatarInitials = listAvatarInitials(c);
              const agent = listAgent(inputs);
              const agency = listAgency(inputs);
              /* the row's CLICK GRAMMAR: first activation focuses, the second opens */
              const cat = taskCategory(c);
              const anchorDate = ri.anchorDate ?? null;
              const chip = dateChip(anchorDate);
              const stands = listStands(inputs, anchorDate);
              const sub = listSub(inputs, anchorDate);
              const verb = listVerb(inputs);
              /* ⚠️ THE EDGE IS THE QUERY'S STAGE, DERIVED — the same ladder the ticket's edge and
                 the Query Centre's own cards read, never a colour stored on the card. */
              const edgeTint = c.status ? STATE_TOKEN[stateFor(c.status)] : STATE_TOKEN.closed;
              const stripOn = c.key === selectedKey || c.key === focusedKey;
              return (
                <React.Fragment key={c.key}>
                {/* ⚠️ THE ROW IS THE CONTROL — a div with an onClick and the page's key
                    equivalents; nothing interactive inside it. First activation FOCUSES (the
                    strip drops beneath); the second — or a double-click, or the row while the
                    sheet is already open — OPENS. The contract's own click grammar. */}
                <div
                  /* ⚠️ THE KEY IS ON THE ELEMENT because the completion hold's placement has to
                     find this exact row again; matching on text would break on a copy change. */
                  data-rowkey={c.key}
                  className={`row${c.key === selectedKey ? " sel" : ""}${c.key === focusedKey ? " focus" : ""}${leaving?.key === c.key ? (leaving.fading ? " held leaving" : " held") : ""}`}
                  role="button"
                  tabIndex={-1}
                  aria-current={c.key === selectedKey}
                  onClick={() => { if (folded || stripOn) onOpen(c); else onFocusRow(c); }}
                  onDoubleClick={() => onOpen(c)}
                >
                  {/* ⚠️ THE STATUS EDGE IS ABSOLUTE AND THE 6px TRACK IS EMPTY — the contract's
                      own shape. The edge is out of flow so it can run the row's full height
                      whatever the tallest cell turns out to be; the empty span holds the track
                      open so the five real cells land in columns two to six. */}
                  <span className="ledge" style={{ background: edgeTint }} aria-hidden="true" />
                  <span aria-hidden="true" />
                  <div className="ltask">
                    <div className="t">{bucket === "note" ? c.title : listDeed(inputs)}</div>
                    <div className={`k ${CATEGORY_FAMILY[cat]}`}>
                      {c.status && <StatusDot status={c.status} overrideSize={12} />}
                      {CATEGORY_TAG[cat]}
                    </div>
                  </div>
                  {/* ⚠️ THE AGENT CELL RENDERS ALWAYS AND HIDES IN CSS when the drawer folds the
                      row — never conditionally mounted, so folding cannot rebuild the list and a
                      measurement can tell "folded" from "no agent". */}
                  <div className="lag">
                    <span className="av" aria-hidden="true">{avatarInitials ?? "\u270d"}</span>
                    <div className="lagtx">
                      <div className="n">{agent || "You"}</div>
                      <div className="a">{agency || (agent ? "" : "Your own note")}</div>
                    </div>
                  </div>
                  <div className="lchip">
                    <div className="m">{chip.mon}</div>
                    <div className="d">{chip.day}</div>
                  </div>
                  <div className="lstands">
                    <span className="stamp">
                      {frag.absent || !frag.figure
                        ? <>no<br />date</>
                        : <><b className={frag.hot ? "late" : ""}>{frag.figure}</b>{frag.tail}</>}
                    </span>
                    <div className="txt">
                      <div className="l1">{stands.before}<b>{stands.strong}</b>{stands.after}</div>
                      <div className="l2">{sub}</div>
                    </div>
                  </div>
                  {/* ⚠️ THE ROW'S OWN VERBS (three-views round, Phase 2), which is where the
                      contract puts them — this replaces the action STRIP that used to drop beneath
                      the focused row. All three of the strip's verbs survive: the contextual
                      primary opens the task, `×` dismisses, and `⋯` is the snooze door. The strip's
                      key hints move to the footer, which already teaches them.
                      ⚠️ AND EACH CARRIES A REAL ACCESSIBLE NAME: the two glyphs are the contract's
                      drawing, and a reader who cannot see them is owed the word. */}
                  <div className="lact">
                    <button type="button" className="go"
                      onClick={(e) => { e.stopPropagation(); onOpen(c); }}>{verb}</button>
                    <button type="button" className="ic" aria-label={`Dismiss ${c.title}`}
                      onClick={(e) => { e.stopPropagation(); onStripDismiss(c); }}>&#215;</button>
                    <button type="button" className="ic" aria-label={`Snooze ${c.title}`}
                      onClick={(e) => { e.stopPropagation(); onStripSnooze(e.currentTarget, c); }}>&#8943;</button>
                  </div>
                </div>
                {/* ⚠️ THE ACTION STRIP — a SIBLING beneath the row, never an overlay: nothing may
                    cover the row's content, and the strip staying under the selected row while
                    the sheet is open is what anchors the sheet to its row. Its verbs go through
                    the page's own doors (the snooze panel, the dismiss confirm) — the same
                    writers as the sheet's, so there is no second path to a write. */}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </div>

      {/* ⚠️ THE FOOTER STATES ONLY THE KEYS NOW (corrections 2.1). Its count and its Export both
          left the content area: the count is already beside the tiles — "All tasks 28" is the same
          figure told once rather than twice — and Export is a page-level act on whatever body is
          showing, so it sits in the toolbar row. What remains is the one thing that IS the list's:
          the five keys, which act on a focused ROW and so print only where rows exist. */}
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
