/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE FILTER STRIP (Contact list v14 §4; ref design-refs/contact-list-v14.html `.frow .fbar`), on one line, left to
 * right: Status ⌄ (tick several, each with its count, and Clear) · Action required · Open for submissions ⌄ · Queried
 * or not ⌄ · Missing materials · Always responds · + Genre (the token field) · any | all · Clear all.
 *
 * ⚠️ THE ONE-LINE RULE IS MEASURED, NEVER A BREAKPOINT (§4). When the row would wrap, the three on/off chips fold
 * into "More filters ⌄", which counts how many of them are on; they unfold when there is room. The measure is a
 * hidden copy of the UNFOLDED row (inert, invisible, out of flow) compared with the strip's own width, re-read on
 * every resize and every change to what the row holds — so the answer follows the real labels and counts.
 *
 * ⚠️ NOTHING IS FREE-TYPED (§1.11): the genre field offers only the app's genre list (`CANONICAL_GENRES`); a string
 * that is not in it cannot be added. ↑ ↓ move, Enter adds, Backspace on an empty field removes the last token,
 * Escape clears the typing — through the ONE escape stack, so it never reaches past the field.
 */
import React, { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type PopoverState } from "../../shell/ListPills";
import { StatusDot } from "../../StatusDot";
import { QueryStatus } from "../../../types";
import { CANONICAL_GENRES, matchKey } from "../../../lib/genres";
import { genreKey } from "../../../lib/genreMatch";
import { ESC_LEVEL, useEscapeLayer } from "../../../lib/escapeStack";
import {
  type ContactFilters, type facetCounts, OPEN_CHOICES, type OpenChoice, QUERIED_CHOICES, type QueriedChoice,
  STATUS_CHOICES, type StatusKey, contactFilterCount, emptyContactFilters,
} from "../../../lib/contactList";
import type { ContactPop } from "./ContactListControls";

type Counts = ReturnType<typeof facetCounts>;

export interface ContactFilterStripProps {
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  counts: Counts;
  /** "N on your list" per genre key */
  tallies: ReadonlyMap<string, number>;
  pop: PopoverState<ContactPop>;
  /** v16 §B — something beside the chips is filtering the list (the "At a glance" group): "Clear all" shows for it too */
  extraOn?: boolean;
  /** v16 §B — "Clear all" clears the chips AND whatever `extraOn` stands for; without it, the chips alone */
  onClearAll?: () => void;
  /** v17 §B — "Clear all" lives beside "Showing…" on the list sheet; the row then draws none of its own */
  hideClear?: boolean;
  /** v17 §E — the rows the list is showing now: each panel's "Show {n} agents" */
  showing?: number;
  /** v17 §E — the manuscript in scope, for the "Queried for this book?" panel's note */
  msTitle?: string | null;
}

const label = (id: string) => CANONICAL_GENRES.find((g) => g.id === id)?.label ?? id;

/** up to 7 genres from the app's list matching what is typed — label starts first, then contains, then aliases */
export function genreSuggestions(typed: string, chosen: readonly string[], limit = 7): { id: string; label: string }[] {
  const t = matchKey(typed);
  if (!t) return [];
  const free = CANONICAL_GENRES.filter((g) => !chosen.includes(g.id));
  const starts = free.filter((g) => matchKey(g.label).startsWith(t));
  const contains = free.filter((g) => !starts.includes(g) && matchKey(g.label).includes(t));
  const alias = free.filter((g) => !starts.includes(g) && !contains.includes(g) && g.aliases.some((a) => matchKey(a).includes(t)));
  return [...starts, ...contains, ...alias].slice(0, limit).map((g) => ({ id: g.id, label: g.label }));
}

/** the typed part in bold, inside the genre's label */
const Bolded: React.FC<{ text: string; typed: string }> = ({ text, typed }) => {
  const i = text.toLowerCase().indexOf(typed.trim().toLowerCase());
  if (!typed.trim() || i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<b>{text.slice(i, i + typed.trim().length)}</b>{text.slice(i + typed.trim().length)}</>;
};

const GenreField: React.FC<{ filters: ContactFilters; onFilters: (f: ContactFilters) => void; tallies: ReadonlyMap<string, number>; inert?: boolean }> = ({ filters, onFilters, tallies, inert }) => {
  const [typed, setTyped] = useState("");
  const [hi, setHi] = useState(0);
  const sugg = useMemo(() => genreSuggestions(typed, filters.genres), [typed, filters.genres]);
  /* the list shows whenever something is typed — with the matches, or saying there are none */
  const open = !inert && typed.trim().length > 0;
  /* Escape clears the typing first — the one escape stack, at a page popover's level */
  useEscapeLayer(open, () => setTyped(""), ESC_LEVEL.page);
  const add = (id: string) => { onFilters({ ...filters, genres: [...filters.genres, genreKey(id)] }); setTyped(""); setHi(0); };
  const remove = (id: string) => onFilters({ ...filters, genres: filters.genres.filter((g) => g !== id) });
  return (
    <span className={`cl14-gtok${filters.genres.length ? " has" : ""}`} data-cl14="genres">
      {filters.genres.map((g) => (
        <span key={g} className="cl14-tk" data-cl14-tok={g}>
          {label(g)}<button type="button" aria-label={`Remove ${label(g)}`} tabIndex={inert ? -1 : 0} onClick={() => remove(g)}>{"✕"}</button>
        </span>
      ))}
      <input
        value={typed} placeholder={filters.genres.length ? "Add a genre" : "Genre"} aria-label="Filter by genre" tabIndex={inert ? -1 : 0}
        role="combobox" aria-expanded={open} aria-autocomplete="list"
        onChange={(e) => { setTyped(e.target.value); setHi(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && open) { e.preventDefault(); setHi((h) => Math.min(sugg.length - 1, h + 1)); }
          else if (e.key === "ArrowUp" && open) { e.preventDefault(); setHi((h) => Math.max(0, h - 1)); }
          else if (e.key === "Enter") { e.preventDefault(); if (open && sugg[hi]) add(sugg[hi].id); }
          else if (e.key === "Backspace" && !typed && filters.genres.length) { e.preventDefault(); remove(filters.genres[filters.genres.length - 1]); }
        }}
      />
      {filters.genres.length >= 2 && (
        <span className="cl14-gm" role="group" aria-label="Match any or all genres" data-cl14="genre-mode">
          {(["any", "all"] as const).map((m) => (
            <button key={m} type="button" className={filters.genreMode === m ? "on" : ""} aria-pressed={filters.genreMode === m}
              tabIndex={inert ? -1 : 0} onClick={() => onFilters({ ...filters, genreMode: m })}>{m}</button>
          ))}
        </span>
      )}
      {open && (
        <div className="cl14-gs" role="listbox" data-cl14="genre-list">
          {sugg.length ? sugg.map((g, i) => (
            <button key={g.id} type="button" role="option" aria-selected={i === hi} className={`cl14-gso${i === hi ? " on" : ""}`} data-cl14-sugg={g.id}
              onMouseDown={(e) => { e.preventDefault(); add(g.id); }} onMouseEnter={() => setHi(i)}>
              <span><Bolded text={g.label} typed={typed} /></span>
              <small>{tallies.get(g.id) ?? 0} on your list</small>
            </button>
          )) : <div className="cl14-gse" data-cl14="genre-none">No genre matches {"\u201c"}{typed.trim()}{"\u201d"}</div>}
        </div>
      )}
    </span>
  );
};

/* ── v17 §E · THE PILLS AND THEIR PANELS ─────────────────────────────────────────────────────────────────────
 * ⚠️ EVERY CONTROL READS THE FILTER'S REAL STATE (`filters`), never a copy of another control: the More filters
 *    switches are drawn from `f.action` / `f.mats` / `f.always`, and there is exactly one More filters control.
 * ⚠️ THE PANEL KEEPS THE `.lpop` CLASS: `usePopover`'s outside-press and scroll rules know a panel by it. */

/** the status a filter option stands for, for its StatusDot (Not queried has none) */
const STATUS_DOT: Partial<Record<StatusKey, QueryStatus>> = {
  queried: QueryStatus.QUERIED, pr: QueryStatus.PARTIAL_REQUESTED, ps: QueryStatus.PARTIAL_SENT, fr: QueryStatus.FULL_REQUESTED,
  fs: QueryStatus.FULL_SENT, rr: QueryStatus.REVISE_RESUBMIT, resub: QueryStatus.RESUBMITTED, offer: QueryStatus.OFFER,
  signed: QueryStatus.SIGNED, closed: QueryStatus.REJECTED,
};
/** the Status panel's three groups (the summary card's own three) */
const STATUS_GROUPS: { title: string; keys: StatusKey[] }[] = [
  { title: "Not queried", keys: ["none"] },
  { title: "Querying", keys: ["queried", "pr", "ps", "fr", "fs", "rr", "resub", "offer", "signed"] },
  { title: "Closed", keys: ["closed"] },
];
const OPEN_LINE: Record<OpenChoice, string> = {
  either: "Everyone on file", open: "Open to new queries now", closed: "Closed, or reopening later", unknown: "Their profile doesn’t say",
};
const QUERIED_LINE: Record<QueriedChoice, string> = {
  either: "Everyone on file", yes: "At least one query sent", no: "Never queried with this book",
};
export const MORE_ROWS: { key: "action" | "mats" | "always"; label: string; line: string }[] = [
  { key: "action", label: "Action required", line: "Something to send, answer or chase" },
  { key: "mats", label: "Missing materials", line: "What to send isn’t recorded" },
  { key: "always", label: "Always responds", line: "Agents who reply even when it’s a no" },
];

const Chevron: React.FC = () => (
  <svg className="cl17-chev" width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" /></svg>
);

/** the drop-down: 10 under its pill (its left edge, or its right for More filters), scrolling inside */
const Panel: React.FC<{
  k: ContactPop; anchor: HTMLElement | null; id: string; title: string; note: string; align?: "left" | "right";
  showing?: number; onClear?: () => void; onClose: () => void; children: React.ReactNode;
}> = ({ k, anchor, id, title, note, align = "left", showing, onClear, onClose, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    setPos(align === "right"
      ? { top: r.bottom + 10, right: Math.max(16, window.innerWidth - r.right) }
      : { top: r.bottom + 10, left: Math.max(16, Math.min(r.left, window.innerWidth - 300 - 16)) });
  }, [anchor, align]);
  /* focus goes to the first option on open, and back to the pill when the panel goes while holding it */
  useEffect(() => {
    if (!pos) return undefined;
    const el = ref.current;
    el?.querySelector<HTMLElement>("[data-opt]")?.focus({ preventScroll: true });
    /* ⚠️ by the time this cleanup runs the panel has left the document and focus is already on <body>, so "was
       focus inside?" is remembered while it is true (`held`), never asked afterwards */
    return () => { if (held.current && anchor?.isConnected) anchor.focus({ preventScroll: true }); };
  }, [pos, anchor]);
  if (!anchor || !pos) return null;
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const opts = [...(ref.current?.querySelectorAll<HTMLElement>("[data-opt]") ?? [])];
    if (!opts.length) return;
    e.preventDefault();
    const i = opts.indexOf(document.activeElement as HTMLElement);
    opts[(i + (e.key === "ArrowDown" ? 1 : opts.length - 1) + (i < 0 && e.key === "ArrowUp" ? 1 : 0)) % opts.length].focus();
  };
  return createPortal(
    <div className="lpop cl17-pop" data-lpop={k} data-cl17="panel" id={id} role="dialog" aria-label={title} ref={ref} onKeyDown={onKey}
      onFocusCapture={() => { held.current = true; }}
      onBlurCapture={(e) => { if (!(e.relatedTarget instanceof Node) || !e.currentTarget.contains(e.relatedTarget)) held.current = e.relatedTarget === null ? held.current : false; }}
      /* the pack's max height, and never past the window's foot: the header sits lower in the app than in the mock, so
         at a 900px window the stated `100vh − 220px` put the footer and its button 75px below the fold (measured, lock E2) */
      style={{ top: pos.top, left: pos.left, right: pos.right, maxHeight: `min(560px, calc(100vh - 220px), calc(100vh - ${Math.round(pos.top) + 16}px))` }}>
      <div className="cl17-pop-h" data-cl17="panel-head"><b>{title}</b><span>{note}</span></div>
      <div className="cl17-pop-b">{children}</div>
      <div className="cl17-pop-f" data-cl17="panel-foot">
        {onClear ? <button type="button" className="cl17-pop-clear" data-cl17="panel-clear" onClick={onClear}>Clear</button> : <span />}
        <button type="button" className="cl17-pop-show" data-cl17="panel-show" onClick={() => { anchor.focus({ preventScroll: true }); onClose(); }}>
          Show {showing ?? 0} {showing === 1 ? "agent" : "agents"}
        </button>
      </div>
    </div>,
    document.body,
  );
};

/* v18 §B — EACH MENU'S CONTENTS ARE ONE COMPONENT, drawn by its pill's panel AND by the one Filters panel: the
   options, their counts and their state are the same objects in both places, never a copy. */
type OptProps = { f: ContactFilters; set: (patch: Partial<ContactFilters>) => void; counts: Counts };
const StatusOptions: React.FC<OptProps> = ({ f, set, counts }) => {
  const toggleStatus = (k: StatusKey) => set({ status: f.status.includes(k) ? f.status.filter((x) => x !== k) : [...f.status, k] as StatusKey[] });
  return (
    <>
          {STATUS_GROUPS.map((g) => (
            <div className="cl17-pop-g" key={g.title} data-cl17="panel-group" data-lpop-sec={g.title}>
              <h6>{g.title}</h6>
              {g.keys.map((k) => {
                const c = STATUS_CHOICES.find((x) => x.key === k);
                if (!c) return null;
                const on = f.status.includes(k), dot = STATUS_DOT[k];
                return (
                  <button key={k} type="button" className={`cl17-opt${on ? " on" : ""}${counts.status[k] === 0 ? " zero" : ""}`} data-opt={`status:${k}`}
                    role="menuitemcheckbox" aria-checked={on} onClick={() => toggleStatus(k)}>
                    <span className="cl17-bx" aria-hidden="true">{on ? "✓" : ""}</span>
                    <span className="cl17-dot" aria-hidden="true">{dot ? <StatusDot status={dot} overrideSize={12} /> : <i className="cl17-dot-none" />}</span>
                    <span className="cl17-ol">{c.label}</span>
                    <small data-cl17="opt-count">{counts.status[k]}</small>
                  </button>
                );
              })}
            </div>
          ))}
    </>
  );
};

const OpenOptions: React.FC<OptProps> = ({ f, set, counts }) => {
  return (
    <>
          {OPEN_CHOICES.map((c) => (
            <button key={c.key} type="button" className={`cl17-opt cl17-opt--2${f.open === c.key ? " on" : ""}`} data-opt={`open:${c.key}`}
              role="menuitemradio" aria-checked={f.open === c.key} onClick={() => set({ open: c.key })}>
              <span className="cl17-rd" aria-hidden="true" />
              <span className="cl17-ol">{c.label}<i>{OPEN_LINE[c.key]}</i></span>
              {c.key === "either" ? null : <small data-cl17="opt-count">{counts.open[c.key as Exclude<OpenChoice, "either">]}</small>}
            </button>
          ))}
    </>
  );
};

const QueriedOptions: React.FC<OptProps> = ({ f, set, counts }) => {
  return (
    <>
          {QUERIED_CHOICES.map((c) => (
            <button key={c.key} type="button" className={`cl17-opt cl17-opt--2${f.queried === c.key ? " on" : ""}`} data-opt={`queried:${c.key}`}
              role="menuitemradio" aria-checked={f.queried === c.key} onClick={() => set({ queried: c.key })}>
              <span className="cl17-rd" aria-hidden="true" />
              <span className="cl17-ol">{c.label}<i>{QUERIED_LINE[c.key]}</i></span>
              {c.key === "either" ? null : <small data-cl17="opt-count">{counts.queried[c.key as Exclude<QueriedChoice, "either">]}</small>}
            </button>
          ))}
    </>
  );
};

const MoreOptions: React.FC<OptProps> = ({ f, set, counts }) => {
  return (
    <>
          {MORE_ROWS.map((r) => (
            <button key={r.key} type="button" className={`cl17-opt cl17-opt--2 cl17-opt--sw${f[r.key] ? " on" : ""}`} data-opt={`more:${r.key}`} data-cl14-chip={r.key}
              role="switch" aria-checked={f[r.key]} onClick={() => set({ [r.key]: !f[r.key] } as Partial<ContactFilters>)}>
              <span className="cl17-ol">{r.label}<i>{r.line}</i></span>
              <small data-cl17="opt-count">{counts[r.key]}</small>
              <span className="cl17-sw" data-cl17="switch" data-on={f[r.key] ? "" : undefined} aria-hidden="true"><i /></span>
            </button>
          ))}
    </>
  );
};

const Row: React.FC<ContactFilterStripProps> = ({ filters, onFilters, counts, tallies, pop, extraOn = false, onClearAll, hideClear = false, showing, msTitle }) => {
  const f = filters;
  const uid = useId();
  const set = (patch: Partial<ContactFilters>) => onFilters({ ...f, ...patch });
  const mine = (k: ContactPop) => pop.open === k && pop.anchor?.closest('[data-cl14="fbar"]') != null;
  const pid = (k: ContactPop) => `${uid}-${k}`;
  /** a pill: navy with its choice as the label and a clear × once set */
  const pill = (k: ContactPop, text: React.ReactNode, on: boolean, clear: () => void, chip?: React.ReactNode) => (
    <span className={`cl17-fpw${on ? " on" : ""}`} data-cl17="pill" data-k={k} data-on={on ? "" : undefined}>
      <button type="button" className={`cl14-fp cl14-fp--dd cl17-fp${on ? " on" : ""}`} data-cl14-dd={k} aria-haspopup="dialog" aria-expanded={mine(k)}
        aria-controls={mine(k) ? pid(k) : undefined} onClick={(e) => pop.toggle(k, e.currentTarget)}>
        <span className="cl17-fpl" data-cl17="pill-label">{text}</span>{chip}<Chevron />
      </button>
      {on ? (
        <button type="button" className="cl17-fpx" data-cl17="pill-clear" aria-label={`Clear ${k === "more" ? "more filters" : String(k)}`} onClick={clear}>
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M2 2l6 6M8 2 2 8" /></svg>
        </button>
      ) : null}
    </span>
  );
  const onMore = (f.action ? 1 : 0) + (f.mats ? 1 : 0) + (f.always ? 1 : 0);
  const statusLabel = f.status.length === 0 ? "Status" : f.status.length === 1 ? (STATUS_CHOICES.find((c) => c.key === f.status[0])?.label ?? "Status") : `${f.status.length} statuses`;
  const openLabel = OPEN_CHOICES.find((c) => c.key === f.open)?.label ?? "Either";
  const queriedLabel = QUERIED_CHOICES.find((c) => c.key === f.queried)?.label ?? "Either";
  return (
    <>
      {pill("status", statusLabel, f.status.length > 0, () => set({ status: [] }))}
      {pill("open", f.open === "either" ? "Open for submissions" : openLabel, f.open !== "either", () => set({ open: "either" }))}
      {pill("queried", f.queried === "either" ? "Queried or not" : queriedLabel, f.queried !== "either", () => set({ queried: "either" }))}
      {pill("more", "More filters", onMore > 0, () => set({ action: false, mats: false, always: false }),
        <em className="cl17-fpn" data-cl17="more-count">{onMore ? `${onMore} on` : MORE_ROWS.length}</em>)}
      <GenreField filters={f} onFilters={onFilters} tallies={tallies} />
      {!hideClear && (contactFilterCount(f) > 0 || extraOn) && (
        <button type="button" className="cl14-fclear" data-cl14="clear-all" onClick={() => (onClearAll ? onClearAll() : onFilters(emptyContactFilters()))}>Clear all</button>
      )}

      {mine("status") && (
        <Panel k="status" id={pid("status")} anchor={pop.anchor} title="Where they stand" note="Pick any number" showing={showing}
          onClear={() => set({ status: [] })} onClose={pop.close}>
          <StatusOptions f={f} set={set} counts={counts} />
        </Panel>
      )}
      {mine("open") && (
        <Panel k="open" id={pid("open")} anchor={pop.anchor} title="Taking queries?" note="From their profile" showing={showing} onClose={pop.close}>
          <OpenOptions f={f} set={set} counts={counts} />
        </Panel>
      )}
      {mine("queried") && (
        <Panel k="queried" id={pid("queried")} anchor={pop.anchor} title="Queried for this book?" note={msTitle?.trim() || "Your book"} showing={showing} onClose={pop.close}>
          <QueriedOptions f={f} set={set} counts={counts} />
        </Panel>
      )}
      {mine("more") && (
        <Panel k="more" id={pid("more")} anchor={pop.anchor} align="right" title="More filters" note="Switch on any you need" showing={showing}
          onClear={onMore ? () => set({ action: false, mats: false, always: false }) : undefined} onClose={pop.close}>
          <MoreOptions f={f} set={set} counts={counts} />
        </Panel>
      )}
    </>
  );
};

/** v17 §E: the three chips live in ONE More filters menu at every width, so nothing folds and nothing is measured */
export const ContactFilterStrip: React.FC<ContactFilterStripProps> = (props) => (
  <div className="cl14-fwrap">
    <div className="cl14-fbar cl17-fbar" data-cl14="fbar" data-folded="">
      <Row {...props} />
    </div>
  </div>
);

/* ── v18 §B · THE FILTERS BUTTON AND THE ONE FILTERS PANEL ─────────────────────────────────────────────────────── */

const FUNNEL = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M2 3h12L9.5 8.5V13l-3 1.5v-6L2 3z" />
  </svg>
);

/** The list header's one Filters button: cream-ringed at rest, cream-filled with a count chip once a filter is set. */
export const ContactFiltersButton: React.FC<{ filters: ContactFilters; pop: PopoverState<ContactPop>; disabled?: boolean }> = ({ filters, pop, disabled }) => {
  const n = contactFilterCount(filters);
  const open = pop.open === "filters";
  return (
    <button type="button" className={`cl18-fb${n ? " on" : ""}`} data-cl18="filters" data-n={n} aria-haspopup="dialog" aria-expanded={open}
      disabled={disabled} onClick={(e) => pop.toggle("filters", e.currentTarget)}>
      {FUNNEL}<span>Filters</span>{n ? <em data-cl18="filters-n">{n}</em> : null}
    </button>
  );
};

/**
 * The one Filters panel, over the same filter state as v17's pills: five sections whose contents are the pills'
 * own option components. Anchored to the button's right edge, 10 under it; Escape and a click outside close it
 * through the shared popover state, and focus returns to the button.
 */
export const ContactFiltersPanel: React.FC<{
  filters: ContactFilters; onFilters: (f: ContactFilters) => void; counts: Counts; tallies: ReadonlyMap<string, number>;
  pop: PopoverState<ContactPop>; showing: number; msTitle?: string | null;
}> = ({ filters, onFilters, counts, tallies, pop, showing, msTitle }) => {
  const anchor = pop.open === "filters" ? pop.anchor : null;
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  useLayoutEffect(() => {
    if (!anchor) { setPos(null); return; }
    const r = anchor.getBoundingClientRect();
    setPos({ top: r.bottom + 10, right: Math.max(16, window.innerWidth - r.right) });
  }, [anchor]);
  useEffect(() => {
    if (!pos) return undefined;
    ref.current?.querySelector<HTMLElement>("[data-opt]")?.focus({ preventScroll: true });
    return () => { if (held.current && anchor?.isConnected) anchor.focus({ preventScroll: true }); };
  }, [pos, anchor]);
  if (!anchor || !pos) return null;
  const f = filters;
  const set = (patch: Partial<ContactFilters>) => onFilters({ ...f, ...patch });
  const sec = (k: string, title: string, body: React.ReactNode) => (
    <section className="cl18-fs" data-cl18="filters-sec" data-k={k}><h6>{title}</h6>{body}</section>
  );
  return createPortal(
    <div className="lpop cl17-pop cl18-fp" data-lpop="filters" data-cl18="filters-panel" role="dialog" aria-label="Filter the list" ref={ref}
      onFocusCapture={() => { held.current = true; }}
      style={{ top: pos.top, right: pos.right, maxHeight: `calc(100vh - ${Math.round(pos.top) + 16}px)` }}>
      <div className="cl18-fp-h"><b>Filter the list</b></div>
      <div className="cl18-fp-b">
        {sec("status", "Where they stand", <StatusOptions f={f} set={set} counts={counts} />)}
        {sec("open", "Taking queries?", <OpenOptions f={f} set={set} counts={counts} />)}
        {sec("queried", `Queried for ${msTitle?.trim() ? msTitle.trim() : "this book"}?`, <QueriedOptions f={f} set={set} counts={counts} />)}
        {sec("genre", "Genre", <GenreField filters={f} onFilters={onFilters} tallies={tallies} />)}
        {sec("more", "More", <MoreOptions f={f} set={set} counts={counts} />)}
      </div>
      <div className="cl17-pop-f cl18-fp-f" data-cl18="filters-foot">
        <button type="button" className="cl17-pop-clear" data-cl18="filters-clear" onClick={() => onFilters(emptyContactFilters())}>Clear all</button>
        <button type="button" className="cl17-pop-show" data-cl18="filters-show" onClick={() => { anchor.focus({ preventScroll: true }); pop.close(); }}>
          Show {showing} {showing === 1 ? "agent" : "agents"}
        </button>
      </div>
    </div>,
    document.body,
  );
};
