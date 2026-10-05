/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list's controls (v13 §5; ref design-refs/contact-list-v13.html `.ctl`): Find, then the
 * shared labelled pills — ⛉ Filters (n) · ☰ Grouped: Letter ⌄ · Sort: Surname ⌄ joined to its
 * direction toggle — and their three popovers. The SAME component renders in the banner and in the
 * sticky bar; the page owns the state and the one popover, so the two can never disagree.
 *
 * ⚠️ THE FILTER PANEL IS SECTIONED, WITH LIVE COUNTS AND LIVE APPLICATION (ruling Q4): every v12 facet
 * kept, "Open to queries" three-way, Offer added to Where you stand, Fit for the book and Profile new.
 * Choices within a section widen the list (OR); across sections they narrow it (AND). The counts are
 * faceted — each option under all the OTHER active narrowing — so a count is what a tick would show.
 * ⚠️ THE PANEL KEEPS ITS SCROLL WHILE YOU TICK: a tick re-renders the options inside the same node.
 */
import React from "react";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { DirToggle, ListPill, PopFoot, PopOption, PopRule, PopSection, Popover, type PopoverState } from "../../shell/ListPills";
import {
  type ContactFilters, type FilterSection, type GroupKey, GROUP_OPTIONS, NOT_RECORDED, OPEN_LABEL, type OpenKey, type RatingKey,
  SORT_OPTIONS, type SortKey, STAND_LABEL, type WhereKey, contactFilterCount, emptyContactFilters,
} from "../../../lib/contactList";

export type ContactPop = "filter" | "group" | "sort";

/** A status option carries the real glyph — a status is drawn only by StatusDot */
const STATUS_GLYPH: Record<string, QueryStatus | null> = {
  "Queried": QueryStatus.QUERIED, "Partial requested": QueryStatus.PARTIAL_REQUESTED, "Partial sent": QueryStatus.PARTIAL_SENT,
  "Full sent": QueryStatus.FULL_SENT, "Offer": QueryStatus.OFFER, "Closed": QueryStatus.REJECTED, "Not queried yet": null,
};
/** Where you stand, in the panel's words (the mock's: "Not queried yet", not the row's "Not yet queried") */
export const WHERE_LABEL: Record<WhereKey, string> = {
  you: STAND_LABEL.you, agent: STAND_LABEL.agent, offer: "Offer", none: "Not queried yet", closed: STAND_LABEL.closed,
};
export const ratingLabel = (v: string) => (v === "0" ? "Not rated" : v === "2" ? "★★ or fewer" : "★".repeat(Number(v)));
/** the filter line's and the panel's word for one value of one section */
export function filterValueLabel(sec: FilterSection, v: string, genreWord: string | null): string {
  switch (sec) {
    case "stand": return WHERE_LABEL[v as WhereKey] ?? v;
    case "fit": return v === "takes" ? `Takes ${genreWord ?? "your genre"}` : `Doesn’t list ${genreWord ?? "your genre"}`;
    case "open": return OPEN_LABEL[v as OpenKey] ?? v;
    case "rating": return ratingLabel(v);
    case "profile": return "Has gaps to fill";
    case "genres": case "locs": return v === NOT_RECORDED ? `${sec === "genres" ? "Genres" : "Location"} not recorded` : v;
    default: return v;
  }
}

export interface ContactListControlsProps {
  /** where this copy sits: "banner" or "sticky" (probes; the sticky bar's copy is narrower) */
  where: "banner" | "sticky";
  find: string;
  onFind: (v: string) => void;
  findRef?: React.Ref<HTMLInputElement>;
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  options: Record<FilterSection, { value: string; n: number }[]>;
  groupKey: GroupKey;
  onGroup: (k: GroupKey) => void;
  sortKey: SortKey;
  reversed: boolean;
  onSort: (k: SortKey) => void;
  onReverse: () => void;
  pop: PopoverState<ContactPop>;
  msTitle: string | null;
  genreWord: string | null;
  /** the "/" key cap on Find (Phase 7's shortcut) */
  findKey?: React.ReactNode;
}

export const ContactListControls: React.FC<ContactListControlsProps> = ({
  where, find, onFind, findRef, filters, onFilters, options, groupKey, onGroup, sortKey, reversed, onSort, onReverse,
  pop, msTitle, genreWord, findKey,
}) => {
  const n = contactFilterCount(filters);
  const group = GROUP_OPTIONS.find((g) => g.key === groupKey)!;
  const sort = SORT_OPTIONS.find((s) => s.key === sortKey)!;
  const mine = (k: ContactPop) => pop.open === k && pop.anchor?.closest(`[data-cl13-ctl="${where}"]`) != null;
  const toggle = <K extends FilterSection>(sec: K, v: ContactFilters[K][number]) => {
    const cur = filters[sec] as unknown[];
    onFilters({ ...filters, [sec]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] });
  };
  const opt = (sec: FilterSection, v: string, label: React.ReactNode, count: number, on: boolean, cast: (s: string) => unknown = (s) => s) => (
    <PopOption key={`${sec}-${v}`} k={`${sec}:${v}`} kind="check" on={on} label={label} count={count}
      onPick={() => toggle(sec, cast(v) as never)} />
  );
  return (
    <div className="cl13-ctl" data-cl13-ctl={where}>
      <label className="cl13-find" data-clv={where === "banner" ? "find" : undefined} data-cl13-find={where}>
        <svg width="12" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
        </svg>
        <input ref={findRef} value={find} onChange={(e) => onFind(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" />
        {findKey}
      </label>
      <ListPill k="filter" icon={"⛉"} value="Filters" count={n} set={n > 0} open={mine("filter")} onPress={(a) => pop.toggle("filter", a)} />
      <ListPill k="group" icon={"☰"} prefix="Grouped:" value={group.label} caret set={groupKey !== "letter"} open={mine("group")} onPress={(a) => pop.toggle("group", a)} />
      <span className="lp-join">
        <ListPill k="sort" prefix="Sort:" value={sort.label} caret joined set={sortKey !== "surname"} open={mine("sort")} onPress={(a) => pop.toggle("sort", a)} />
        <DirToggle reversed={reversed} label={sort.dir[reversed ? 1 : 0]} onToggle={onReverse} />
      </span>

      {mine("filter") && (
        <Popover k="filter" anchor={pop.anchor} width={320} label="Filters">
          <PopSection title="Where you stand">
            {options.stand.map((o) => opt("stand", o.value, WHERE_LABEL[o.value as WhereKey], o.n, (filters.stand as string[]).includes(o.value)))}
          </PopSection>
          {genreWord && (
            <PopSection title={msTitle ? `Fit for ${msTitle}` : "Fit for your book"}>
              {options.fit.map((o) => opt("fit", o.value, filterValueLabel("fit", o.value, genreWord), o.n, (filters.fit as string[]).includes(o.value)))}
            </PopSection>
          )}
          <PopSection title="Open to queries">
            {options.open.map((o) => opt("open", o.value, OPEN_LABEL[o.value as OpenKey], o.n, (filters.open as string[]).includes(o.value)))}
          </PopSection>
          <PopSection title="Query status">
            {options.status.map((o) => opt("status", o.value, (
              <span className="cl13-st">{STATUS_GLYPH[o.value] ? <StatusDot status={STATUS_GLYPH[o.value]!} overrideSize={13} /> : <span className="cl13-st0" />}{o.value}</span>
            ), o.n, filters.status.includes(o.value)))}
          </PopSection>
          <PopSection title="Genres">
            {options.genres.map((o) => opt("genres", o.value, filterValueLabel("genres", o.value, genreWord), o.n, filters.genres.includes(o.value)))}
          </PopSection>
          <PopSection title="Location">
            {options.locs.map((o) => opt("locs", o.value, filterValueLabel("locs", o.value, genreWord), o.n, filters.locs.includes(o.value)))}
          </PopSection>
          <PopSection title="Your rating">
            {options.rating.map((o) => opt("rating", o.value, ratingLabel(o.value), o.n, filters.rating.includes(Number(o.value) as RatingKey), Number))}
          </PopSection>
          <PopSection title="Profile">
            {options.profile.map((o) => opt("profile", o.value, "Has gaps to fill", o.n, filters.profile.length > 0))}
          </PopSection>
          <PopFoot onClear={() => onFilters(emptyContactFilters())} onDone={pop.close} />
        </Popover>
      )}
      {mine("group") && (
        <Popover k="group" anchor={pop.anchor} width={280} label="Group the list">
          <PopSection title="Group the list by">
            {GROUP_OPTIONS.map((g) => (
              <React.Fragment key={g.key}>
                {g.key === "none" ? <PopRule /> : null}
                <PopOption k={`group:${g.key}`} kind="radio" on={groupKey === g.key} label={g.label} line={g.line}
                  onPick={() => { onGroup(g.key); pop.close(); }} />
              </React.Fragment>
            ))}
          </PopSection>
        </Popover>
      )}
      {mine("sort") && (
        <Popover k="sort" anchor={pop.anchor} width={290} label="Sort the list">
          <PopSection title="Sort within each group">
            {SORT_OPTIONS.map((s) => (
              <PopOption key={s.key} k={`sort:${s.key}`} kind="radio" on={sortKey === s.key} label={s.label} line={s.line}
                onPick={() => { onSort(s.key); pop.close(); }} />
            ))}
          </PopSection>
        </Popover>
      )}
    </div>
  );
};
