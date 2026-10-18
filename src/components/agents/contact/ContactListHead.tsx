/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §A/§B — THE LIST'S HEAD: one component in both positions (design-refs/contact-list-v19/).
 *
 *   - PINNED, a navy band (66 tall) sits above the toolbar: the hawk over the card index, "N agents", the three-part
 *     count (Not queried · Querying · Closed), "your move", List health and "+ Add an agent". Every figure is the
 *     page's own (the glance model, the census, Housekeeping's health), never a stored number.
 *   - IN BOTH POSITIONS, the toolbar: the A to Z (ungrouped or grouped by Letter), then Find, Group by, Filters, Pin.
 *     It is the SAME markup pinned and unpinned; only the band is added.
 *
 * ⚠️ THE TOOLBAR NEVER WRAPS: its items do not shrink (Part B adds the give-way order).
 */
import React, { useRef } from "react";
import { LETTERS } from "./ContactLetters";
import { RING, RING_C, gapLine, healthLabel, ringArc, type ListHealth } from "../../../lib/contactHealth";
import { GROUP_OPTIONS, type GroupKey } from "../../../lib/contactList";
import type { GlanceKey, GlanceModel } from "../../../lib/contactGlance";
import { GLANCE_LABEL } from "../../../lib/contactGlance";
import type { PopoverState } from "../../shell/ListPills";
import type { ContactPop } from "./ContactListControls";
import "./contactV19.css";

export const CL19_ART = { src: "/images/contact-list-archivist.webp", version: 1 };

const letterWords = (L: string, n: number): string => (n === 0 ? `${L}, no agents` : `${L}, ${n} ${n === 1 ? "agent" : "agents"}`);

const LIST_ICON = (
  <svg viewBox="0 0 17 17" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <path d="M5 4.5h9M5 8.5h9M5 12.5h9" /><circle cx="2.4" cy="4.5" r=".9" fill="currentColor" stroke="none" />
    <circle cx="2.4" cy="8.5" r=".9" fill="currentColor" stroke="none" /><circle cx="2.4" cy="12.5" r=".9" fill="currentColor" stroke="none" />
  </svg>
);
const CARET = (
  <svg viewBox="0 0 11 11" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2.8 4.3 5.5 7l2.7-2.7" />
  </svg>
);
const FILTER_ICON = (
  <svg viewBox="0 0 15 15" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <path d="M2 4h11M4 7.5h7M6 11h3" />
  </svg>
);
const FIND_ICON = (
  <svg width="13" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
  </svg>
);
const PIN_ICON = (
  <svg className="cl19-pin-ic" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3z" /><path d="M12 14v6" />
  </svg>
);

/** List health on navy: the same arithmetic as the header's ring (`ringArc`), drawn cream over the rust gaps */
const BandRing: React.FC<{ pct: number | null }> = ({ pct }) => {
  const c = RING.box / 2;
  const arc = ringArc(pct ?? 0);
  return (
    <svg className="cl19-ring" viewBox={`0 0 ${RING.box} ${RING.box}`} aria-hidden="true">
      {pct === 100 ? null : <circle cx={c} cy={c} r={RING.r} fill="none" stroke="#e08a64" strokeOpacity={pct === null ? 0.2 : 0.9} strokeWidth={RING.w} />}
      {pct !== null && arc.ink > 0 ? (
        <circle cx={c} cy={c} r={RING.r} fill="none" stroke="#f4eee5" strokeWidth={RING.w} strokeLinecap="round"
          strokeDasharray={`${arc.ink} ${RING_C}`} transform={`rotate(-90 ${c} ${c})`} />
      ) : null}
    </svg>
  );
};

export interface ContactBand {
  total: number;
  model: GlanceModel;
  /** the "At a glance" group the list is narrowed to, or null */
  glance: GlanceKey | null;
  onGlance: (k: GlanceKey) => void;
  /** agents whose live query is waiting on the writer (the census's "your move") */
  yourMove: number;
  health: ListHealth | null;
  onHealth: () => void;
  onAdd: () => void;
}

export const ContactListHead: React.FC<{
  pinned: boolean;
  loading?: boolean;
  /** the band's figures; drawn only while pinned */
  band: ContactBand | null;
  /** the measured box the sticky stack reads (`--stk-head-h`) */
  headRef?: React.Ref<HTMLDivElement>;
  /* the A to Z */
  counts: ReadonlyMap<string, number>;
  current: string | null;
  onPick: (letter: string) => void;
  /* the controls */
  search: string;
  onSearch: (v: string) => void;
  groupKey: GroupKey;
  filterCount: number;
  pop: PopoverState<ContactPop>;
  onPin: () => void;
}> = ({ pinned, loading = false, band, headRef, counts, current, onPick, search, onSearch, groupKey, filterCount, pop, onPin }) => {
  const tbRef = useRef<HTMLDivElement>(null);
  const showLetters = groupKey === "none" || groupKey === "letter";
  const groupName = groupKey === "none" ? null : GROUP_OPTIONS.find((g) => g.key === groupKey)?.label ?? null;

  return (
    <div className="cl19-head" ref={headRef} data-cl19="head" data-pinned={pinned ? "" : undefined}>
      {pinned && band && (
        <div className="cl19-band" data-cl19="band">
          <img className="cl19-art" data-cl19="band-art" src={`${CL19_ART.src}?v=${CL19_ART.version}`} alt="" aria-hidden="true" draggable={false} />
          <p className="cl19-n" data-cl19="band-total">
            <b data-cl19="band-figure">{band.total}</b> <span>{band.total === 1 ? "agent" : "agents"}</span>
          </p>
          <span className="cl19-seg" role="group" aria-label="Narrow the list" data-cl19="band-groups">
            {band.model.cells.map((c) => (
              <button key={c.key} type="button" data-cl19-glance={c.key} aria-pressed={band.glance === c.key} disabled={loading}
                onClick={() => band.onGlance(c.key)}>
                <b>{c.n}</b><span>{GLANCE_LABEL[c.key]}</span>
              </button>
            ))}
          </span>
          <span className="cl19-ym" data-cl19="band-move" data-n={band.yourMove}>
            <b aria-hidden="true">{band.yourMove}</b><span><span className="cl19-sr">{band.yourMove} </span>your move</span>
          </span>
          <span className="cl19-bsp" aria-hidden="true" />
          <button type="button" className="cl19-hl" data-cl19="band-health" data-cl183="fill" disabled={!band.health}
            onClick={band.onHealth} aria-label={band.health ? healthLabel(band.health) : "List health"}>
            <BandRing pct={band.health ? band.health.pct : null} />
            <span className="cl19-hlt">
              <b>{band.health ? `${band.health.pct}%` : ""} list health</b>
              <small data-cl19="band-gaps">{band.health ? (band.health.gaps > 0 || band.health.pct === 100 ? gapLine(band.health.gaps) : "Some put off for later") : ""}</small>
            </span>
          </button>
          <button type="button" className="cl19-add" data-cl19="band-add" data-cl17="add" onClick={band.onAdd}>
            <span aria-hidden="true">+</span> Add an agent
          </button>
        </div>
      )}
      {/* data-cl18="list-header" stays: the group menu anchors on it, and so do the page's older readers */}
      {/* the wrapper carries the card's 18px top corners unpinned, so the toolbar itself is the same box in both
          positions (radius included) */}
      <div className="cl19-tbw">
      <div className="cl19-tb" ref={tbRef} data-cl19="toolbar" data-cl18="list-header">
        {showLetters ? (
          <nav className="cl19-az" data-cl19="az" aria-label="Jump to a letter">
            {LETTERS.map((L) => {
              const n = loading ? 0 : counts.get(L) ?? 0;
              const on = !loading && current === L;
              return (
                <button key={L} type="button" data-cl19="letter" data-l={L} data-n={n} aria-current={on ? "true" : undefined}
                  aria-label={loading ? L : letterWords(L, n)} disabled={loading || n === 0} onClick={() => onPick(L)}>{L}</button>
              );
            })}
          </nav>
        ) : (
          /* Part E's jump row takes this place when the list is grouped by anything but Letter */
          <nav className="cl19-jump" data-cl19="jump" aria-label="Jump to a group" />
        )}
        <span className="cl19-sp" aria-hidden="true" />
        <div className="cl19-tools" data-cl19="tools">
          <span className="cl19-findw" data-cl19="find-wrap" data-has={search.trim() ? "" : undefined}>
            <label className="cl19-find" data-cl19="find" data-cl17="find" data-clv="find" data-cl13-find="banner">
              {FIND_ICON}
              <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" disabled={loading} />
            </label>
          </span>
          <button type="button" className="cl19-ctl cl19-grp" data-cl19="group" data-cl18="group" aria-haspopup="dialog" aria-expanded={pop.open === "group"}
            aria-label={groupName ? `Grouped by ${groupName}. Change grouping` : "Group the list"} disabled={loading}
            onClick={(e) => pop.toggle("group", e.currentTarget)}>
            <span className="cl19-ic">{LIST_ICON}</span>
            {groupName ? <span className="cl19-l">Grouped by <b data-ltb="group-name">{groupName}</b></span> : <span className="cl19-l">Group by</span>}
            <span className="cl19-caret">{CARET}</span>
          </button>
          <button type="button" className="cl19-ctl cl19-fil" data-cl19="filters" data-cl18="filters" data-n={filterCount} aria-haspopup="dialog"
            aria-expanded={pop.open === "filters"} disabled={loading} onClick={(e) => pop.toggle("filters", e.currentTarget)}>
            <span className="cl19-ic">{FILTER_ICON}</span><span className="cl19-l">Filters</span>
            {filterCount ? <em data-cl18="filters-n">{filterCount}</em> : null}
          </button>
          <button type="button" className="cl19-pin" data-cl19="pin" data-cl16="full" data-pin-list="" aria-pressed={pinned} aria-keyshortcuts="F"
            aria-label={pinned ? "Unpin" : "Pin list"} disabled={loading} onClick={onPin}>
            {PIN_ICON}<span className="cl19-pin-l">{pinned ? "Unpin" : "Pin list"}</span>
          </button>
        </div>
      </div>
      </div>
    </div>
  );
};
