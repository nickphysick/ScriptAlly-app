/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §F — FILTERING: one Filters chip (in the toolbar, ContactListHead), ONE MENU and ONE APPLIED-FILTERS
 * ROW (design-refs/contact-list-v19/, layout A with the navy header; screens 09–11). The v14–v18 strip, its pills and
 * their panels, and the v18 Filters panel are retired with it.
 *
 *   - The menu: a navy header ("Filter agents", "N of M showing", ✕), "Most used" (four quick picks on a powder band),
 *     two columns ("Where your query stands" and "Submissions"), Genre, and a cream footer (Clear all · Show N agents).
 *   - The applied-filters row: under the toolbar while any filter or search is on — "N of M agents", one removable chip
 *     per filter and per search, "+N more" when they do not fit (it opens the menu), "Clear all".
 *
 * ⚠️ ONE MODEL. Every control reads and writes the page's `ContactFilters` (lib/contactList.ts); a quick pick is a preset
 *    over it (`QUICK_PICKS`), so a pick and the controls it sets cannot disagree.
 * ⚠️ EVERY CHOICE STATES THE COUNT THE LIST WOULD HAVE IF IT WERE CHOSEN (`wouldShow`, under Find and the band's group
 *    too); a chosen one states the current count. A choice that would give zero is disabled unless it is on.
 * ⚠️ THE MENU IS LIVE: a change applies to the list behind it at once, and the menu re-renders in place, so its scroll
 *    position and the focused control survive (no element in it is keyed on the filter state).
 * ⚠️ THE PANEL KEEPS THE `.lpop` CLASS: `usePopover`'s outside-press and scroll rules know a panel by it; Escape closes it
 *    through the same popover state (the one escape stack).
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { type PopoverState } from "../../shell/ListPills";
import { CANONICAL_GENRES, matchKey } from "../../../lib/genres";
import {
  type AgentFacts, type ContactFilters, QUICK_PICKS, type QuickPickKey, STATUS_LABEL, type StatusKey, SUBMISSION_CHOICES,
  emptyContactFilters, genreList, standsRows, wouldShow,
} from "../../../lib/contactList";
import { ContactGroupMark } from "./ContactGroupMark";
import type { ContactPop } from "./ContactListControls";

/** a genre key's words: the app's own label for a canonical genre, else what the agent's record says */
export const genreWords = (k: string, raw?: string): string => CANONICAL_GENRES.find((g) => g.id === k)?.label ?? raw ?? k;

const CROSS = (
  <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true">
    <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);
const TICK = (
  <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
    <path d="M2.5 6.2 5 8.6l4.6-5" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
const FIND = (
  <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
    <circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.6" /><path d="M10.5 10.5 14 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);
/* the quick picks' marks (the mock's): your move, the paper plane, the hourglass, the open door */
const PICK_MARK: Record<QuickPickKey, React.ReactNode> = {
  you: <><circle cx="12" cy="12" r="10" /><path d="M7.5 12h8.5M12.6 8.4 16.2 12l-3.6 3.6" strokeLinecap="round" strokeLinejoin="round" /></>,
  ready: <><path d="M3.5 11.2 20.5 4l-6.6 16.5-2.9-6.6z" strokeLinejoin="round" /><path d="M11 13.9 20.5 4" strokeLinecap="round" /></>,
  wait: <><path d="M7 3.5h10M7 20.5h10" strokeLinecap="round" /><path d="M8.2 3.5c0 4.4 7.6 4.6 7.6 8.5s-7.6 4.1-7.6 8.5M15.8 3.5c0 4.4-7.6 4.6-7.6 8.5s7.6 4.1 7.6 8.5" strokeLinejoin="round" /></>,
  open: <><path d="M4 21V5a1 1 0 0 1 1-1h9l5 4v13" /><path d="M14 4v4h5" /><path d="M3 21h18" /></>,
};

const plural = (n: number) => (n === 1 ? "agent" : "agents");
const box = (on: boolean) => <span className={`cl19-fbox${on ? " on" : ""}`} aria-hidden="true">{on ? TICK : null}</span>;

export interface ContactFilterMenuProps {
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  /** every agent on file (the counts are over these, under `pool`) */
  facts: readonly AgentFacts[];
  /** Find and the band's group: what the list is narrowed to before the filters */
  pool: (x: AgentFacts) => boolean;
  showing: number;
  total: number;
  pop: PopoverState<ContactPop>;
}

export const ContactFilterMenu: React.FC<ContactFilterMenuProps> = ({ filters: f, onFilters, facts, pool, showing, total, pop }) => {
  const anchor = pop.open === "filters" ? pop.anchor : null;
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const [gq, setGq] = useState("");
  const [gOpen, setGOpen] = useState(false);

  /* 10 under the chip, right edges aligned, kept on screen (16 from either edge) */
  useLayoutEffect(() => {
    if (!anchor) { setPos(null); return undefined; }
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const width = Math.min(640, window.innerWidth - 32);
      setPos({ top: r.bottom + 10, left: Math.max(16, Math.min(r.right - width, window.innerWidth - width - 16)), width });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor]);
  /* focus the first choice on open; give focus back to the chip when the menu goes while holding it */
  const isOpen = pos !== null;
  useEffect(() => {
    if (!isOpen) return undefined;
    ref.current?.querySelector<HTMLElement>("[data-opt]:not(:disabled)")?.focus({ preventScroll: true });
    return () => { if (held.current && anchor?.isConnected) anchor.focus({ preventScroll: true }); held.current = false; };
  }, [isOpen, anchor]);
  useEffect(() => { if (!anchor) { setGq(""); setGOpen(false); } }, [anchor]);

  const allGenres = useMemo(() => genreList(facts, (k, raw) => genreWords(k, raw)), [facts]);
  const present = useMemo(() => { const s = new Set<StatusKey>(); for (const x of facts) s.add(x.status14); return s; }, [facts]);

  if (!anchor || !pos) return null;

  const would = (g: ContactFilters) => wouldShow(facts, g, pool);
  const set = (g: ContactFilters) => onFilters(g);
  const close = () => { anchor.focus({ preventScroll: true }); pop.close(); };
  const anyOn = JSON.stringify(f) !== JSON.stringify(emptyContactFilters());

  /* ↑ ↓ move through the choices (the genre field keeps its own keys) */
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if (document.activeElement instanceof HTMLInputElement) return;
    const items = [...(ref.current?.querySelectorAll<HTMLElement>("[data-opt]:not(:disabled), input[data-cl19='genre-find']") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    if (i < 0 || !items.length) return;
    e.preventDefault();
    items[(i + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length].focus();
  };

  const rows = standsRows((k) => present.has(k), f);
  const q = matchKey(gq);
  const genreShown = q ? allGenres.filter((g) => matchKey(g.label).includes(q)) : gOpen ? allGenres : allGenres.slice(0, 10);
  /* a genre picked but not among the ten shown keeps its chip, so it can be taken off here */
  const pickedHidden = !q && !gOpen ? f.genres.filter((k) => !genreShown.some((g) => g.key === k)) : [];
  const genreChips = [...genreShown, ...pickedHidden.map((k) => allGenres.find((g) => g.key === k) ?? { key: k, label: genreWords(k), n: 0 })];

  return createPortal(
    <div className="lpop cl19-fm" data-lpop="filters" data-cl19="filter-menu" role="dialog" aria-label="Filter agents" ref={ref} onKeyDown={onKey}
      onFocusCapture={() => { held.current = true; }}
      style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: `calc(100vh - ${Math.round(pos.top) + 20}px)` }}>
      <header className="cl19-fm-h" data-cl19="filter-head">
        <div>
          <b>Filter agents</b>
          <span data-cl19="filter-showing"><em>{showing}</em> of {total} showing</span>
        </div>
        <button type="button" className="cl19-fm-x" data-cl19="filter-close" aria-label="Close" onClick={close}>{CROSS}</button>
      </header>
      <div className="cl19-fm-b" data-cl19="filter-body">
        <section className="cl19-fm-s cl19-fm-q" data-cl19="filter-quick">
          <h4>Most used</h4>
          <div className="cl19-fm-qg">
            {QUICK_PICKS.map((p) => {
              const on = p.on(f);
              const n = on ? showing : would(p.set(f, true));
              return (
                <button key={p.key} type="button" className={`cl19-qp${on ? " on" : ""}`} data-cl19="quick" data-qp={p.key} data-opt={`qp:${p.key}`} data-n={n}
                  aria-pressed={on} disabled={!on && n === 0} onClick={() => set(p.set(f, !on))}>
                  <span className="cl19-qic"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">{PICK_MARK[p.key]}</svg></span>
                  <span className="cl19-qt"><b>{p.title}</b><small>{p.line}</small></span>
                  <i>{n}</i>
                </button>
              );
            })}
          </div>
        </section>
        <div className="cl19-fm-cols">
          <section className="cl19-fm-s" data-cl19="filter-stands">
            <h4>Where your query stands</h4>
            <div className="cl19-fm-list">
              {rows.map((k) => {
                const on = f.status.includes(k);
                const n = on ? showing : would({ ...f, status: [...f.status, k] });
                return (
                  <button key={k} type="button" className={`cl19-fr${on ? " on" : ""}`} data-cl19="stand" data-k={k} data-opt={`status:${k}`} data-n={n}
                    role="menuitemcheckbox" aria-checked={on} disabled={!on && n === 0}
                    onClick={() => set({ ...f, status: on ? f.status.filter((x) => x !== k) : [...f.status, k] })}>
                    {box(on)}
                    <span className="cl19-fic"><ContactGroupMark groupKey="status" gkey={k} label={STATUS_LABEL[k]} size={17} /></span>
                    <span className="cl19-flab">{STATUS_LABEL[k]}</span>
                    <i>{n}</i>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="cl19-fm-s" data-cl19="filter-subs">
            <h4>Submissions</h4>
            <div className="cl19-seg2" role="radiogroup" aria-label="Submissions" data-cl19="filter-seg">
              {SUBMISSION_CHOICES.map((c) => {
                const on = f.open === c.key;
                const n = c.key === "either" ? null : on ? showing : would({ ...f, open: c.key });
                return (
                  <button key={c.key} type="button" role="radio" aria-checked={on} className={on ? "on" : ""} data-opt={`open:${c.key}`} data-k={c.key}
                    data-n={n ?? undefined} disabled={!on && n === 0} onClick={() => set({ ...f, open: c.key })}>
                    {c.label}{n === null ? null : <i>{n}</i>}
                  </button>
                );
              })}
            </div>
            <div className="cl19-fm-list cl19-fm-list--t">
              {([
                ["always", "Always replies", "Agents who reply even to say no"],
                ["mats", "Missing materials", "No submission materials recorded"],
              ] as const).map(([k, label, line]) => {
                const on = f[k];
                const n = on ? showing : would({ ...f, [k]: true });
                return (
                  <button key={k} type="button" className={`cl19-fr${on ? " on" : ""}`} data-cl19="toggle" data-k={k} data-opt={`more:${k}`} data-n={n}
                    role="menuitemcheckbox" aria-checked={on} disabled={!on && n === 0} onClick={() => set({ ...f, [k]: !on })}>
                    {box(on)}
                    <span className="cl19-flab">{label}<small>{line}</small></span>
                    <i>{n}</i>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
        <section className="cl19-fm-s cl19-fm-g" data-cl19="filter-genre">
          <h4>Genre</h4>
          <div className="cl19-fm-gtop">
            <label className="cl19-fm-find">
              {FIND}
              <input type="text" value={gq} placeholder="Find a genre" aria-label="Find a genre" data-cl19="genre-find" onChange={(e) => setGq(e.target.value)} />
            </label>
            {f.genres.length >= 2 ? (
              <div className="cl19-seg2 cl19-seg2--s" role="radiogroup" aria-label="Match" data-cl19="genre-mode">
                {(["any", "all"] as const).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={f.genreMode === m} className={f.genreMode === m ? "on" : ""} data-opt={`gm:${m}`}
                    onClick={() => set({ ...f, genreMode: m })}>{m === "any" ? "Any of these" : "All of these"}</button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="cl19-fm-chips" data-cl19="genre-chips">
            {genreChips.length ? genreChips.map((g) => {
              const on = f.genres.includes(g.key);
              const n = on ? showing : would({ ...f, genres: [...f.genres, g.key] });
              return (
                <button key={g.key} type="button" className={`cl19-gc${on ? " on" : ""}`} data-cl19="genre" data-k={g.key} data-opt={`g:${g.key}`} data-n={n}
                  aria-pressed={on} disabled={!on && n === 0}
                  onClick={() => set({ ...f, genres: on ? f.genres.filter((x) => x !== g.key) : [...f.genres, g.key] })}>
                  {g.label}<i>{n}</i>
                </button>
              );
            }) : <p className="cl19-fm-none">No genre matches {"“"}{gq.trim()}{"”"}.</p>}
          </div>
          {!q && allGenres.length > 10 ? (
            <button type="button" className="cl19-fm-more" data-cl19="genre-more" data-opt="gmore" onClick={() => setGOpen((v) => !v)}>
              {gOpen ? "Show fewer" : `Show all ${allGenres.length} genres`}
            </button>
          ) : null}
        </section>
      </div>
      <footer className="cl19-fm-f" data-cl19="filter-foot">
        <button type="button" className="cl19-fm-clear" data-cl19="filter-clear" disabled={!anyOn} onClick={() => set(emptyContactFilters())}>Clear all</button>
        <button type="button" className="cl19-fm-show" data-cl19="filter-show" onClick={close}>Show {showing} {plural(showing)}</button>
      </footer>
    </div>,
    document.body,
  );
};

/* ── the applied-filters row ─────────────────────────────────────────────────────────────────────────────────── */

export interface AppliedChip { key: string; label: string; off: () => void }

/**
 * Under the toolbar while anything narrows the list. The chips that do not fit WHOLE go into "+N more" (which opens the
 * menu): one measuring pass hides chips from the end until the rest fit beside "+N more". The row's measured height is
 * published as `--cl19-af-h` by the page, so the headings and the group bands stick under it.
 */
export const ContactAppliedRow: React.FC<{
  chips: AppliedChip[]; showing: number; total: number; pinned: boolean; onClearAll: () => void; onMore: () => void;
  rowRef?: React.Ref<HTMLDivElement>;
}> = ({ chips, showing, total, pinned, onClearAll, onMore, rowRef }) => {
  const boxRef = useRef<HTMLSpanElement>(null);
  /* how many chips (from the end) sit under "+N more" */
  const [cut, setCut] = useState(0);
  const sig = chips.map((c) => c.label).join("|");
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return undefined;
    const fit = () => {
      if (el.clientWidth === 0) return;
      const cs = Array.from(el.querySelectorAll<HTMLElement>("[data-cl19='applied-chip']"));
      const more = el.querySelector<HTMLElement>("[data-cl19='applied-more']");
      cs.forEach((c) => { c.style.display = ""; });
      if (more) more.style.display = "none";
      let n = 0;
      for (let i = cs.length - 1; i > 0 && el.scrollWidth > el.clientWidth + 1; i -= 1) {
        cs[i].style.display = "none"; n += 1;
        if (more) more.style.display = "";
      }
      setCut(n);
    };
    fit();
    if (typeof ResizeObserver === "undefined") return undefined;
    let w = el.clientWidth;
    const ro = new ResizeObserver(() => { if (el.clientWidth !== w) { w = el.clientWidth; fit(); } });
    ro.observe(el);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [sig]);
  /* "+N more"'s own width can grow with N: never leave a chip cut off */
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el || cut === 0 || el.scrollWidth <= el.clientWidth + 1) return;
    const cs = Array.from(el.querySelectorAll<HTMLElement>("[data-cl19='applied-chip']")).filter((c) => c.style.display !== "none");
    if (cs.length > 1) { cs[cs.length - 1].style.display = "none"; setCut(cut + 1); }
  }, [cut]);
  return (
    <div className="cl19-af" ref={rowRef} data-cl19="applied" data-pinned={pinned ? "" : undefined} aria-live="polite">
      <span className="cl19-af-n" data-cl19="applied-count"><b>{showing}</b> of {total} {plural(total)}</span>
      <span className="cl19-af-chips" ref={boxRef}>
        {chips.map((c) => (
          <button key={c.key} type="button" className="cl19-af-c" data-cl19="applied-chip" data-k={c.key} aria-label={`Remove ${c.label}`} onClick={c.off}>
            <span>{c.label}</span>{CROSS}
          </button>
        ))}
        <button type="button" className="cl19-af-c cl19-af-more" data-cl19="applied-more" data-n={cut} aria-haspopup="dialog"
          style={{ display: cut ? undefined : "none" }} onClick={onMore}>+{cut} more</button>
      </span>
      <button type="button" className="cl19-af-clear" data-cl19="applied-clear" onClick={onClearAll}>Clear all</button>
    </div>
  );
};
