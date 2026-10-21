/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §A/§B — THE LIST'S HEAD: one component in both positions (design-refs/contact-list-v19/).
 *
 *   - PINNED, a navy band (66 tall) sits above the toolbar: the hawk over the card index, "N agents", the three-part
 *     count (Not queried · Querying · Closed), "your move", List health and "+ Add an agent". Every figure is the
 *     page's own (the glance model, the census, Housekeeping's health), never a stored number.
 *   - IN BOTH POSITIONS, the toolbar: the A to Z (ungrouped or grouped by Letter), then Find, Group by, Filters, and
 *     (v20 §C) the Cards / List switch and Full screen once the title row has scrolled away, and in full screen.
 *     It is the SAME markup pinned and unpinned; only the band is added.
 *
 * ⚠️ THE TOOLBAR NEVER WRAPS. Its items do not shrink; when the row is too narrow it gives way in a fixed order, set
 *    as `data-fit` on the toolbar by one measuring pass (never React state, so a fit change cannot re-render the page):
 *      0 — everything shows;
 *      1 — letters with no agents hide;
 *      2 — the letters tighten from 21 to 18 wide.
 *    At ≤1440px Find folds to a 42px icon button and opens to 240px OVER the letter row (CSS: focus, or a search held).
 *    Group by and Filters never shrink and never lose their labels.
 */
import React, { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ContactGroupMark } from "./ContactGroupMark";
import { LETTERS } from "./ContactLetters";
import { RING, RING_C, gapLine, healthLabel, ringArc, type ListHealth } from "../../../lib/contactHealth";
import { GROUP_OPTIONS, type GroupKey } from "../../../lib/contactList";
import type { GlanceKey, GlanceModel } from "../../../lib/contactGlance";
import { GLANCE_LABEL } from "../../../lib/contactGlance";
import type { PopoverState } from "../../shell/ListPills";
import type { ContactPop } from "./ContactListControls";
import { ContactViewSwitch, FULL_ICON } from "./ContactTitleRow";
import type { ContactView } from "../../../lib/contactListMemory";
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

/** v19 §E — one group's jump: its mark, its name (shown on the current one) and how many rows it holds */
export interface ContactJumpGroup { key: string; label: string; n: number }
export interface ContactJump {
  groups: ContactJumpGroup[];
  /** the group the scroll is in (its band at or above the headings' foot) */
  current: string | null;
  onJump: (key: string) => void;
}

const CROSS = (
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
    <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

/** "+N more ⌄"'s menu: the hidden groups with their marks and counts (the mock's `.jr-pop`), 6 under the button */
const JumpMore: React.FC<{
  anchor: HTMLElement; groupKey: GroupKey; groups: ContactJumpGroup[]; current: string | null; onPick: (k: string) => void; onClose: () => void;
}> = ({ anchor, groupKey, groups, current, onPick, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const w = ref.current?.offsetWidth ?? 240;
    setPos({ top: r.bottom + 6, left: Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) });
  }, [anchor]);
  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>("button")?.focus({ preventScroll: true });
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || anchor.contains(t)) return;
      onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); onClose(); anchor.focus({ preventScroll: true }); } };
    document.addEventListener("pointerdown", down, true);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", down, true); document.removeEventListener("keydown", key, true); };
  }, [anchor, onClose]);
  return createPortal(
    <div className="cl19-jpop" data-cl19="jump-menu" role="menu" aria-label="More groups" ref={ref}
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}>
      {groups.map((g) => (
        <button key={g.key} type="button" role="menuitem" data-cl19="jump-menu-item" data-gkey={g.key} aria-current={current === g.key ? "true" : undefined}
          onClick={() => { onClose(); onPick(g.key); }}>
          <ContactGroupMark groupKey={groupKey} gkey={g.key} label={g.label} size={16} />
          <span>{g.label}</span><i>{g.n}</i>
        </button>
      ))}
    </div>,
    document.body,
  );
};

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
  /** v19 §E — the chip's ✕: back to ungrouped, the sort left as it is */
  onStopGroup: () => void;
  /** v19 §E — the jump row, when grouped by anything but Letter */
  jump: ContactJump | null;
  filterCount: number;
  /** v19 §F — the Filters chip's ✕: every filter and the search cleared */
  onClearFilters: () => void;
  /** v19 §F — the Filters chip's button, so "+N more" can open the menu from it */
  filtersRef?: React.MutableRefObject<HTMLButtonElement | null>;
  pop: PopoverState<ContactPop>;
  /** v20 §C — full screen on and off (the shared pin hook, through the page's toggle) */
  onPin: () => void;
  /** v20 §C — the Cards / List view: one state with the title row's pill */
  view: ContactView;
  onView: (v: ContactView) => void;
  /** v20 §C — the switch and Full screen show in the toolbar only once the title row has scrolled away, and always in
   *  full screen (the page decides; the toolbar draws what it is told) */
  showViewTools: boolean;
  /** v20 §E — the filter strip, drawn inside the head under the toolbar (it sticks with it and sits over the rows) */
  filterStrip?: React.ReactNode;
}> = ({ pinned, loading = false, band, headRef, counts, current, onPick, search, onSearch, groupKey, onStopGroup, jump, filterCount, onClearFilters, filtersRef, pop, onPin, view, onView, showViewTools, filterStrip }) => {
  const tbRef = useRef<HTMLDivElement>(null);
  const showLetters = groupKey === "none" || groupKey === "letter";
  const groupName = groupKey === "none" ? null : GROUP_OPTIONS.find((g) => g.key === groupKey)?.label ?? null;

  const grpRef = useRef<HTMLButtonElement>(null);
  const ownFilRef = useRef<HTMLButtonElement | null>(null);
  const filRef = filtersRef ?? ownFilRef;
  const jumpRef = useRef<HTMLElement>(null);
  /* v19 §E — "+N more": the index from which the jump row's groups go into the menu (null: all fit) */
  const [cut, setCut] = useState<number | null>(null);
  const [moreAt, setMoreAt] = useState<HTMLElement | null>(null);
  const jumpGroups = jump?.groups ?? [];
  const jumpSig = jumpGroups.map((g) => `${g.key}:${g.n}`).join(",") + "|" + (jump?.current ?? "");

  /* ── the give-way pass: the smallest `data-fit` at which nothing in the row is clipped ──
     Letters: 1 hides the letters with no agents, 2 tightens them. The jump row (v19 §E): 1 hides the current group's
     label, 2 then puts the groups that do not fit WHOLE into "+N more" — set on each button as `data-over` (never
     React state, so it cannot re-render the page), with the count handed to the one "+N more" button. */
  const sig = LETTERS.map((L) => (loading ? 0 : counts.get(L) ?? 0) > 0 ? "1" : "0").join("") + (showLetters ? "L" : "") + groupKey + filterCount + (pinned ? "p" : "") + (showViewTools ? "v" : "") + jumpSig;
  useLayoutEffect(() => {
    const tb = tbRef.current;
    if (!tb) return undefined;
    const fit = () => {
      if (tb.clientWidth === 0) return;
      const nav = jumpRef.current;
      const btns = nav ? Array.from(nav.querySelectorAll<HTMLElement>("button[data-cl19='jump-group']")) : [];
      btns.forEach((b) => b.removeAttribute("data-over"));
      nav?.removeAttribute("data-cut");
      for (let lv = 0; lv <= 2; lv += 1) {
        tb.setAttribute("data-fit", String(lv));
        if (lv === 2 && nav && btns.length) {
          /* the room the jump row has: what the toolbar leaves once everything else has its width */
          const over = tb.scrollWidth - tb.clientWidth;
          const room = nav.offsetWidth - Math.max(0, over);
          const gap = parseFloat(getComputedStyle(nav).columnGap) || 0;
          const more = nav.querySelector<HTMLElement>("[data-cl19='jump-more']");
          const mw = (more?.offsetWidth || 104) + gap;
          let used = 0;
          let c = btns.length;
          for (let i = 0; i < btns.length; i += 1) {
            used += btns[i].offsetWidth + (i ? gap : 0);
            const rest = btns.length - i - 1;
            if (used + (rest ? mw : 0) > room + 0.5) { c = i; break; }
          }
          if (c < btns.length) {
            btns.slice(c).forEach((b) => b.setAttribute("data-over", ""));
            nav.setAttribute("data-cut", "");
          }
          setCut(c < btns.length ? c : null);
          return;
        }
        if (tb.scrollWidth <= tb.clientWidth + 0.5) { if (lv < 2) setCut(null); return; }
      }
    };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    let w = tb.clientWidth;
    const ro = new ResizeObserver(() => { if (tb.clientWidth !== w) { w = tb.clientWidth; fit(); } });
    ro.observe(tb);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [sig]);
  /* the "+N more" button's own width can differ from the estimate: once it renders, never leave a group cut off */
  useLayoutEffect(() => {
    const tb = tbRef.current;
    const nav = jumpRef.current;
    if (!tb || !nav || cut === null) return;
    if (tb.scrollWidth <= tb.clientWidth + 0.5 || cut <= 0) return;
    const btns = Array.from(nav.querySelectorAll<HTMLElement>("button[data-cl19='jump-group']"));
    btns[cut - 1]?.setAttribute("data-over", "");
    setCut(cut - 1);
  }, [cut]);
  const hidden = cut === null ? [] : jumpGroups.slice(cut);

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
      <div className="cl19-tb" ref={tbRef} data-cl19="toolbar" data-cl18="list-header" data-fit="0">
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
          /* v19 §E — the jump row: one button per group (its mark and count; the current one also its name) */
          <nav className="cl19-jump" ref={jumpRef} data-cl19="jump" aria-label="Jump to a group">
            {jumpGroups.map((g) => {
              const on = jump?.current === g.key;
              return (
                <button key={g.key} type="button" data-cl19="jump-group" data-gkey={g.key} aria-current={on ? "true" : undefined}
                  aria-label={`${g.label}, ${g.n} ${g.n === 1 ? "agent" : "agents"}`} title={g.label} disabled={loading}
                  onClick={() => jump?.onJump(g.key)}>
                  <ContactGroupMark groupKey={groupKey} gkey={g.key} label={g.label} size={16} />
                  <span className="cl19-jl">{g.label}</span><i>{g.n}</i>
                </button>
              );
            })}
            <button type="button" className="cl19-jmore" data-cl19="jump-more" aria-haspopup="menu" aria-expanded={!!moreAt}
              hidden={!hidden.length} onClick={(e) => setMoreAt((cur) => (cur ? null : e.currentTarget))}>
              +{hidden.length} more {CARET}
            </button>
            {moreAt && hidden.length ? (
              <JumpMore anchor={moreAt} groupKey={groupKey} groups={hidden} current={jump?.current ?? null}
                onPick={(k) => jump?.onJump(k)} onClose={() => setMoreAt(null)} />
            ) : null}
          </nav>
        )}
        <span className="cl19-sp" aria-hidden="true" />
        <div className="cl19-tools" data-cl19="tools">
          <span className="cl19-findw" data-cl19="find-wrap" data-has={search.trim() ? "" : undefined}>
            <label className="cl19-find" data-cl19="find" data-cl17="find" data-clv="find" data-cl13-find="banner">
              {FIND_ICON}
              <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Find an agent" aria-label="Find an agent" disabled={loading} />
            </label>
          </span>
          {/* v19 §E — Group by, the applied-chip pattern: grouped, the chip turns powder with a navy ring and carries a
              separate ✕ (Stop grouping) that never opens the menu */}
          <span className="cl19-grpw" data-cl19="group-chip" data-on={groupName ? "" : undefined}>
            <button type="button" ref={grpRef} className="cl19-ctl cl19-grp" data-cl19="group" data-cl18="group" aria-haspopup="dialog" aria-expanded={pop.open === "group"}
              aria-label={groupName ? `Grouped by ${groupName}. Change grouping` : "Group the list"} disabled={loading}
              onClick={(e) => pop.toggle("group", e.currentTarget)}>
              <span className="cl19-ic">{LIST_ICON}</span>
              {groupName ? <span className="cl19-l cl19-l--on"><span className="cl19-gby">Grouped by</span><b data-ltb="group-name">{groupName}</b></span> : <span className="cl19-l">Group by</span>}
              <span className="cl19-caret">{CARET}</span>
            </button>
            {groupName ? (
              <button type="button" className="cl19-grpx" data-cl19="group-stop" aria-label="Stop grouping" title="Stop grouping" disabled={loading}
                onClick={() => { if (pop.open === "group") pop.close(); onStopGroup(); grpRef.current?.focus({ preventScroll: true }); }}>{CROSS}</button>
            ) : null}
          </span>
          {/* v19 §F — Filters, the same applied-chip pattern: filtered, the chip reads "Filtered", carries a navy count (search
              is not counted) and a separate ✕ that clears every filter and the search, and never opens the menu */}
          <span className="cl19-filw" data-cl19="filters-chip" data-on={filterCount ? "" : undefined}>
            <button type="button" ref={filRef} className="cl19-ctl cl19-fil" data-cl19="filters" data-cl18="filters" data-n={filterCount} aria-haspopup="dialog"
              aria-expanded={pop.open === "filters"} aria-label={filterCount ? `Filters: ${filterCount} applied` : "Filters"} disabled={loading}
              onClick={(e) => pop.toggle("filters", e.currentTarget)}>
              <span className="cl19-ic">{FILTER_ICON}</span><span className="cl19-l">{filterCount ? "Filtered" : "Filters"}</span>
              {filterCount ? <em data-cl19="filters-n" data-cl18="filters-n">{filterCount}</em> : null}
            </button>
            {filterCount ? (
              <button type="button" className="cl19-grpx cl19-filx" data-cl19="filters-clear" aria-label="Clear all filters" title="Clear all filters" disabled={loading}
                onClick={() => { if (pop.open === "filters") pop.close(); onClearFilters(); filRef.current?.focus({ preventScroll: true }); }}>{CROSS}</button>
            ) : null}
          </span>
          {/* v20 §C — after Filters: the Cards / List switch, then Full screen (Exit full screen in full screen). While the
              title row is on screen it carries both, so the toolbar carries neither. */}
          {showViewTools ? (
            <>
              <ContactViewSwitch view={view} onView={onView} variant="icons" labels={false} disabled={loading} probe="view-tb" />
              <button type="button" className="cl19-pin cl20-tfs" data-cl19="pin" data-cl20="full-tb" data-cl16="full" data-pin-list="" aria-pressed={pinned} aria-keyshortcuts="F"
                aria-label={pinned ? "Exit full screen" : "Full screen"} disabled={loading} onClick={onPin}>
                {FULL_ICON}<span className="cl19-pin-l">{pinned ? "Exit full screen" : "Full screen"}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>
      </div>
      {filterStrip}
    </div>
  );
};
