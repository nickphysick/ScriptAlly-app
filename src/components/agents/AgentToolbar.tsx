/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Agent list — THE TOOLBAR (rebuild v2, decisions 3 + 4).
 *
 * One row replaces five stacked bands (chips, two full-width selects, search, colour legend,
 * count line). Left: the search field, then three controls — Filters · Group · Sort — visually
 * IDENTICAL at rest, so the row reads as one instrument rather than three competing ones. Right:
 * the result count in mono.
 *
 * The shared active state is the whole point: a control set away from its default takes the pink
 * treatment and its label swaps to the chosen value ("Star rating", "Whose turn"), so the row
 * states what it is doing without being opened. Filters can't do that — it holds many values at
 * once — so it shows a count badge and spells the actual values out as removable tags beneath the
 * toolbar. Closing the popover must never hide what is filtering the list.
 *
 * The colour legend is DELETED: it taught the same vocabulary the filter list already carries, in
 * a second grammar.
 */
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown, Filter, Plus, Rows3, Search, SlidersHorizontal } from "lucide-react";
import { PageTally } from "../shell/WorkspacePageGrid";
import {
  AgentDoor,
  AgentFilterSet,
  AgentStanding,
  AgentTurn,
  DOOR_LABEL,
  DOOR_ORDER,
  STANDING_LABEL,
  STANDING_ORDER,
  TURN_LABEL,
  TURN_ORDER,
  AgentAxisCounts,
  emptyFilterSet,
  filterCount,
} from "../../lib/agentList";
import { PopoverAlign, popoverAlign } from "../../lib/popoverAlign";
import { countryName } from "../../lib/territory";
import { MobileSheet } from "../shell/MobileSheet";
import { useIsMobile } from "../shell/mobileChrome";

/* ── the popover shell: click-away, Escape, one open at a time ─────────────── */

interface PopProps {
  id: string;
  label: string;
  icon: React.ReactNode;
  /** Set away from its default → the shared pink treatment. */
  active: boolean;
  /** Filters shows a count instead of swapping its label. */
  badge?: number;
  width?: number;
  open: boolean;
  onOpen: (id: string | null) => void;
  children: React.ReactNode;
}

const Pop: React.FC<PopProps> = ({ id, label, icon, active, badge, width = 288, open, onOpen, children }) => {
  const wrapRef = useRef<HTMLSpanElement>(null);
  const [align, setAlign] = useState<PopoverAlign>("left");
  // Mobile Pass 1: below md the SAME panel children present in the MobileSheet chassis instead
  // of the anchored popover — the sheet owns dismissal there (scrim + Escape), so the anchored
  // popover's outside-click/align machinery stands down.
  const isMobile = useIsMobile();

  // COLLISION: left-anchored is the default because it reads as belonging to its control, but the
  // rightmost control's panel is wider than the space beside it and would run off the container.
  // Measured against the CONTENT COLUMN rather than the window, because the column is what the
  // reader perceives as the page's edge. Measured in a layout effect so the flip happens before
  // paint — deciding after would show one frame in the wrong place.
  useLayoutEffect(() => {
    if (!open || isMobile) return;
    const btn = wrapRef.current?.firstElementChild as HTMLElement | undefined;
    const container = wrapRef.current?.closest(".agl-inner") as HTMLElement | null;
    if (!btn || !container) return;
    const b = btn.getBoundingClientRect();
    const c = container.getBoundingClientRect();
    setAlign(
      popoverAlign({
        anchorLeft: b.left,
        anchorRight: b.right,
        popWidth: width,
        containerLeft: c.left,
        containerRight: c.right,
      }),
    );
  }, [open, width, isMobile]);

  useEffect(() => {
    if (!open || isMobile) return;
    const onDocDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpen(null);
    };
    // Escape closes the popover and goes no further — a dropdown dismissal must never reach the
    // page handler that discards an open card's draft. (The sheet's own capture-phase Escape
    // gives the mobile presentation the same guarantee.)
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      e.preventDefault();
      onOpen(null);
    };
    document.addEventListener("mousedown", onDocDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDocDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onOpen, isMobile]);

  return (
    <span className="agl-pw" ref={wrapRef}>
      <button
        type="button"
        className={`agl-ctl${active ? " act" : ""}`}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => onOpen(open ? null : id)}
      >
        {icon}
        {label}
        {badge ? <span className="agl-badge">{badge}</span> : null}
        <ChevronDown className="cv" width={12} height={12} aria-hidden="true" />
      </button>
      {open && !isMobile && (
        <div className={`agl-pop${align === "right" ? " right" : ""}`} style={{ width }} role="dialog" aria-label={label}>
          {children}
        </div>
      )}
      {isMobile && (
        <MobileSheet open={open} onClose={() => onOpen(null)} ariaLabel={label}>
          {/* The sheet portals to body; the .aglist wrapper re-establishes the page's token
              scope + descendant selectors (every option row is `.aglist .agl-*`-scoped). */}
          <div className="aglist agl-inpop">{children}</div>
        </MobileSheet>
      )}
    </span>
  );
};

/** A checkbox row with its count. Zero-count rows stay VISIBLE but inert — their absence is
 *  information ("nobody is closed" is a fact worth reading), and hiding them makes the list
 *  jump as data changes. */
const Row: React.FC<{ label: React.ReactNode; count: number; on: boolean; onToggle: () => void }> = ({
  label, count, on, onToggle,
}) => (
  <button
    type="button"
    className={`agl-orow${on ? " sel" : ""}${count === 0 ? " off" : ""}`}
    disabled={count === 0}
    aria-pressed={on}
    onClick={onToggle}
  >
    <span className="box">{on && <Check width={9} height={9} strokeWidth={3.4} aria-hidden="true" />}</span>
    <span className="lb">{label}</span>
    <span className="ct">{count}</span>
  </button>
);

/** A single-choice row (Group / Sort), ticked rather than boxed. */
const Choice: React.FC<{ label: string; on: boolean; onPick: () => void }> = ({ label, on, onPick }) => (
  <button type="button" className={`agl-orow${on ? " sel" : ""}`} role="menuitemradio" aria-checked={on} onClick={onPick}>
    <span className="lb">{label}</span>
    {on && <Check className="tick" width={14} height={14} strokeWidth={3} aria-hidden="true" />}
  </button>
);

const Stars: React.FC<{ n: number }> = ({ n }) => (
  <span className="agl-fstars" aria-hidden="true">{"★".repeat(n)}</span>
);

/* ── the toolbar ───────────────────────────────────────────────────────────── */

export interface AgentToolbarProps {
  search: string;
  onSearch: (v: string) => void;
  filters: AgentFilterSet;
  onFilters: (f: AgentFilterSet) => void;
  counts: AgentAxisCounts;
  starCounts: { min: number; n: number }[];
  locCounts: { code: string; n: number }[];
  /** How many agents the current filter set yields — the popover footer states it live. */
  resultCount: number;
  total: number;
  /** ⚠️ THE PAGE'S CREATION ACTION, WHICH USED TO SIT IN THE MASTHEAD (in-flow masthead, step 1).
   *  The masthead holds no actions, so every button that was in one moved to its page's control
   *  row — this row. It is the rightmost thing here by the row's own grammar: tally left, verbs
   *  right, primary last. */
  onAddAgent: () => void;
  /** Group + Sort are single-choice controls; their option lists are owned by the caller. */
  group: string;
  groupOptions: readonly { key: string; label: string }[];
  onGroup: (k: string) => void;
  sort: string;
  sortOptions: readonly { key: string; label: string }[];
  defaultSort: string;
  onSort: (k: string) => void;
  searchRef?: React.RefObject<HTMLInputElement>;
}

export const AgentToolbar: React.FC<AgentToolbarProps> = ({
  search, onSearch, filters, onFilters, counts, starCounts, locCounts,
  resultCount, total, group, groupOptions, onGroup, sort, sortOptions, defaultSort, onSort, searchRef,
  onAddAgent,
}) => {
  const [openPop, setOpenPop] = useState<string | null>(null);
  const nFilters = filterCount(filters);

  const toggle = <K extends keyof AgentFilterSet>(facet: K, value: AgentFilterSet[K][number]) => {
    const list = filters[facet] as (typeof value)[];
    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    onFilters({ ...filters, [facet]: next } as AgentFilterSet);
  };

  const groupLabel = groupOptions.find((o) => o.key === group)?.label ?? "Group";
  const sortLabel = sortOptions.find((o) => o.key === sort)?.label ?? "Sort";

  return (
    <div className="agl-toolbar">
      {/* ⚠️ THE TALLY LEADS THE ROW (in-flow masthead, step 1). It used to close it, on the right,
          which was fine while the row was a strip under a header that named the page. Now that the
          masthead scrolls away this row is what remains, and what remains should lead with the fact
          rather than end with it. `PageTally` carries its own `margin-right: auto`, so it is also
          what pushes everything below to the right — there is no spacer element.
          ⚠️ AND THE FIGURES ARE UNCHANGED: `{resultCount} of {total}`, the page's own existing
          string, moved rather than restated. */}
      <PageTally value={`${resultCount} of ${total}`} />
      <div className="agl-search">
        <Search width={14} height={14} aria-hidden="true" />
        <input
          ref={searchRef}
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search agents or agencies…"
          aria-label="Search agents or agencies"
        />
      </div>

      <Pop
        id="filters"
        label="Filters"
        icon={<Filter width={15} height={15} aria-hidden="true" />}
        active={nFilters > 0}
        badge={nFilters}
        open={openPop === "filters"}
        onOpen={setOpenPop}
      >
        <div className="agl-pk">
          Where things stand
          <span className="hint">One of these applies to each agent</span>
        </div>
        {STANDING_ORDER.map((k: AgentStanding) => (
          <Row
            key={k}
            label={STANDING_LABEL[k]}
            count={counts.standing[k]}
            on={filters.standing.includes(k)}
            onToggle={() => toggle("standing", k)}
          />
        ))}

        <div className="agl-pdiv" />
        <div className="agl-pk">
          Whose turn
          <span className="hint">Applies within active queries</span>
        </div>
        {TURN_ORDER.map((k: Exclude<AgentTurn, null>) => (
          <Row
            key={k}
            label={TURN_LABEL[k]}
            count={counts.turn[k]}
            on={filters.turn.includes(k)}
            onToggle={() => toggle("turn", k)}
          />
        ))}

        <div className="agl-pdiv" />
        {/* THEIR DOOR — its own axis, not a value of "where things stand". Their submission
            status and your query history are facts about different systems: an agency can shut
            its doors while still holding your full, and both facts stay true. */}
        <div className="agl-pk">
          Their door
          <span className="hint">Independent of your history with them</span>
        </div>
        {DOOR_ORDER.map((k: AgentDoor) => (
          <Row
            key={k}
            label={DOOR_LABEL[k]}
            count={counts.door[k]}
            on={filters.door.includes(k)}
            onToggle={() => toggle("door", k)}
          />
        ))}

        <div className="agl-pdiv" />
        <div className="agl-pk">Star rating</div>
        {starCounts.map(({ min, n }) => (
          <Row
            key={min}
            label={<><Stars n={min} /> and up</>}
            count={n}
            on={filters.stars.includes(min)}
            onToggle={() => toggle("stars", min)}
          />
        ))}

        {locCounts.length > 0 && (
          <>
            <div className="agl-pdiv" />
            <div className="agl-pk">Location</div>
            {locCounts.map(({ code, n }) => (
              <Row
                key={code}
                label={countryName(code) || code}
                count={n}
                on={filters.loc.includes(code)}
                onToggle={() => toggle("loc", code)}
              />
            ))}
          </>
        )}

        <div className="agl-pfoot">
          {/* emptyFilterSet(), never a literal — a hand-written list silently misses a new facet
              the day one is added (which is exactly what happened when the door axis arrived). */}
          <button type="button" className="lnk" onClick={() => onFilters(emptyFilterSet())}>
            Clear all
          </button>
          {/* The primary states the live result, so ticking a box answers "how many?" before
              you close the popover — the count updates as you go, it is not an Apply gate. */}
          <button type="button" className="go" onClick={() => setOpenPop(null)}>
            Show {resultCount} {resultCount === 1 ? "agent" : "agents"}
          </button>
        </div>
      </Pop>

      <Pop
        id="group"
        label={group === "none" ? "Group" : groupLabel}
        icon={<Rows3 width={15} height={15} aria-hidden="true" />}
        active={group !== "none"}
        width={212}
        open={openPop === "group"}
        onOpen={setOpenPop}
      >
        <div className="agl-pk">Group by</div>
        {groupOptions.map((o) => (
          <Choice key={o.key} label={o.label} on={group === o.key} onPick={() => { onGroup(o.key); setOpenPop(null); }} />
        ))}
      </Pop>

      <Pop
        id="sort"
        label={sort === defaultSort ? "Sort" : sortLabel}
        icon={<SlidersHorizontal width={15} height={15} aria-hidden="true" />}
        active={sort !== defaultSort}
        width={212}
        open={openPop === "sort"}
        onOpen={setOpenPop}
      >
        <div className="agl-pk">Sort by</div>
        {sortOptions.map((o) => (
          <Choice key={o.key} label={o.label} on={sort === o.key} onPick={() => { onSort(o.key); setOpenPop(null); }} />
        ))}
      </Pop>

      {/* ⚠️ `Add new agent` LANDS HERE FROM THE MASTHEAD — one home, and it is the row that stays
          on screen while you work through the list you are adding to. */}
      <button type="button" className="agl-tbadd" onClick={onAddAgent}>
        <Plus width={15} height={15} aria-hidden="true" />
        Add new agent
      </button>
    </div>
  );
};

/* ── applied filters: the tags that keep the popover honest ────────────────── */

export interface AppliedTag {
  label: string;
  onRemove: () => void;
}

export const AgentAppliedTags: React.FC<{ tags: AppliedTag[]; onClear: () => void }> = ({ tags, onClear }) => {
  if (!tags.length) return null;
  return (
    <div className="agl-applied">
      {tags.map((t) => (
        <button type="button" key={t.label} className="agl-atag" onClick={t.onRemove} title={`Remove ${t.label}`}>
          {t.label} <span className="x" aria-hidden="true">✕</span>
        </button>
      ))}
      <button type="button" className="agl-clr" onClick={onClear}>Clear all</button>
    </div>
  );
};
