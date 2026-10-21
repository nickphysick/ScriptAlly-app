/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §F, v20 §E — FILTERING: one Filters chip (in the toolbar, ContactListHead), ONE STRIP and ONE
 * APPLIED-FILTERS ROW (design-refs/contact-list-v20/, screens 07, 08 and 11). v20 retires v19's 640px layout-A menu (its
 * navy header, powder quick-pick band, checkbox lists, genre find field and cream footer) for a compact strip under the
 * toolbar; the model and the counts are unchanged.
 *
 *   - The strip (ContactFilterStrip): see its own note below.
 *   - The applied-filters row: under the toolbar while any filter or search is on — "N of M agents", one removable chip
 *     per filter and per search, "+N more" when they do not fit (it opens the strip), "Clear all".
 *
 * ⚠️ ONE MODEL. Every control reads and writes the page's `ContactFilters` (lib/contactList.ts); a quick pick is a preset
 *    over it (`QUICK_PICKS`), so a pick and the controls it sets cannot disagree.
 * ⚠️ EVERY CHOICE STATES THE COUNT THE LIST WOULD HAVE IF IT WERE CHOSEN (`wouldShow`, under Find and the band's group
 *    too); a chosen one states the current count. A choice that would give zero is disabled unless it is on.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { type PopoverState } from "../../shell/ListPills";
import { CANONICAL_GENRES } from "../../../lib/genres";
import {
  type AgentFacts, type ContactFilters, QUICK_PICKS, STATUS_LABEL, type StatusKey, SUBMISSION_CHOICES,
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
const plural = (n: number) => (n === 1 ? "agent" : "agents");

export interface ContactFilterStripProps {
  filters: ContactFilters;
  onFilters: (f: ContactFilters) => void;
  /** every agent on file (the counts are over these, under `pool`) */
  facts: readonly AgentFacts[];
  /** Find and the band's group: what the list is narrowed to before the filters */
  pool: (x: AgentFacts) => boolean;
  showing: number;
  total: number;
  pop: PopoverState<ContactPop>;
  /** full screen: the strip is inset to the toolbar's controls rather than the card's width */
  pinned: boolean;
}

/**
 * v20 §E — THE FILTER STRIP: the Filters chip opens it under the toolbar, inside the list's head (so it sticks with the
 * toolbar and sits over the rows without pushing them). Unpinned it is the card's width; in full screen it is inset from
 * the toolbar's first visible control to its last. A header ("Filter", the live "v of N agents", Clear all, ✕) over four
 * columns — Most used · Where your query stands · Submissions · Genre — each scrolling inside itself if it must.
 *
 * ⚠️ THE MODEL, THE LOGIC AND THE COUNTS ARE v19 §F's, UNCHANGED: every choice writes the page's `ContactFilters`; a
 *    quick pick is a preset over it; every choice states the count the list would have (`wouldShow`), a chosen one the
 *    current count; a choice that would give zero is disabled unless it is on. Only the presentation is new.
 * ⚠️ IT IS LIVE: a choice applies at once and the strip re-renders in place (nothing in it is keyed on the filters), so
 *    its scroll positions and the focused control survive. It keeps the `.lpop` class: `usePopover` knows a panel by it
 *    (a press outside closes it; Escape closes it through the one escape stack, and focus goes back to the chip).
 */
export const ContactFilterStrip: React.FC<ContactFilterStripProps> = ({ filters: f, onFilters, facts, pool, showing, total, pop, pinned }) => {
  const anchor = pop.open === "filters" ? pop.anchor : null;
  const ref = useRef<HTMLDivElement>(null);
  const held = useRef(false);
  const [gOpen, setGOpen] = useState(false);
  const [inset, setInset] = useState<{ l: number; r: number } | null>(null);

  /* full screen: from the toolbar's first visible control (clear of the hawk) to its last, measured against the head */
  useLayoutEffect(() => {
    if (!anchor || !pinned) { setInset(null); return undefined; }
    const place = () => {
      const head = ref.current?.closest<HTMLElement>('[data-cl19="head"]');
      const tb = head?.querySelector<HTMLElement>('[data-cl19="toolbar"]');
      if (!head || !tb) return;
      const vis = (sel: string) => Array.from(tb.querySelectorAll<HTMLElement>(sel)).filter((e) => e.offsetWidth > 0 && e.getClientRects().length > 0);
      const first = vis('[data-cl19="letter"], [data-cl19="jump-group"], [data-cl19="jump-more"]')[0];
      const tools = vis('[data-cl19="tools"] > *');
      const last = tools[tools.length - 1];
      if (!first || !last) return;
      const h = head.getBoundingClientRect();
      setInset({ l: first.getBoundingClientRect().left - h.left, r: h.right - last.getBoundingClientRect().right });
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [anchor, pinned]);
  /* focus the first choice on open; give focus back to the chip when the strip goes while holding it */
  const isOpen = !!anchor;
  useEffect(() => {
    if (!isOpen) return undefined;
    ref.current?.querySelector<HTMLElement>("[data-opt]:not(:disabled)")?.focus({ preventScroll: true });
    return () => { if (held.current && anchor?.isConnected) anchor.focus({ preventScroll: true }); held.current = false; };
  }, [isOpen, anchor]);
  useEffect(() => { if (!anchor) setGOpen(false); }, [anchor]);

  const allGenres = useMemo(() => genreList(facts, (k, raw) => genreWords(k, raw)), [facts]);
  const present = useMemo(() => { const s = new Set<StatusKey>(); for (const x of facts) s.add(x.status14); return s; }, [facts]);

  if (!anchor) return null;

  const would = (g: ContactFilters) => wouldShow(facts, g, pool);
  const set = (g: ContactFilters) => onFilters(g);
  const close = () => { anchor.focus({ preventScroll: true }); pop.close(); };
  const anyOn = JSON.stringify(f) !== JSON.stringify(emptyContactFilters());

  const rows = standsRows((k) => present.has(k), f);
  const genreShown = gOpen ? allGenres : allGenres.slice(0, 10);
  /* a genre picked but not among the ten shown keeps its chip, so it can be taken off here */
  const pickedHidden = !gOpen ? f.genres.filter((k) => !genreShown.some((g) => g.key === k)) : [];
  const genreChips = [...genreShown, ...pickedHidden.map((k) => allGenres.find((g) => g.key === k) ?? { key: k, label: genreWords(k), n: 0 })];
  const style = inset ? ({ left: inset.l, right: inset.r } as React.CSSProperties) : undefined;

  return (
    <div className="lpop cl20-fs-strip" data-lpop="filters" data-cl19="filter-menu" data-cl20="filter-strip" data-inset={inset ? "" : undefined}
      role="dialog" aria-label="Filter agents" ref={ref} style={style} onFocusCapture={() => { held.current = true; }}>
      <header className="cl20-fsh" data-cl19="filter-head">
        <b>Filter</b>
        <span data-cl19="filter-showing" data-cl20="filter-count">{showing} of {total} {plural(total)}</span>
        <button type="button" className="cl20-fsc" data-cl19="filter-clear" disabled={!anyOn} onClick={() => set(emptyContactFilters())}>Clear all</button>
        <button type="button" className="cl20-fsx" data-cl19="filter-close" aria-label="Close" onClick={close}>{CROSS}</button>
      </header>
      <div className="cl20-fsb" data-cl19="filter-body">
        <section className="cl20-fcol" data-cl19="filter-quick" aria-label="Most used">
          <h4>Most used</h4>
          <div className="cl20-fchips">
            {QUICK_PICKS.map((p) => {
              const on = p.on(f);
              const n = on ? showing : would(p.set(f, true));
              return (
                <button key={p.key} type="button" className={`cl20-chip${on ? " on" : ""}${p.key === "you" ? " cl20-chip--you" : ""}`} data-cl19="quick" data-qp={p.key}
                  data-opt={`qp:${p.key}`} data-n={n} aria-pressed={on} disabled={!on && n === 0} onClick={() => set(p.set(f, !on))}>
                  {p.title}<i>{n}</i>
                </button>
              );
            })}
          </div>
        </section>
        <section className="cl20-fcol" data-cl19="filter-stands" aria-label="Where your query stands">
          <h4>Where your query stands</h4>
          <div className="cl20-fchips">
            {rows.map((k) => {
              const on = f.status.includes(k);
              const n = on ? showing : would({ ...f, status: [...f.status, k] });
              return (
                <button key={k} type="button" className={`cl20-chip${on ? " on" : ""}`} data-cl19="stand" data-k={k} data-opt={`status:${k}`} data-n={n}
                  aria-pressed={on} disabled={!on && n === 0}
                  onClick={() => set({ ...f, status: on ? f.status.filter((x) => x !== k) : [...f.status, k] })}>
                  <ContactGroupMark groupKey="status" gkey={k} label={STATUS_LABEL[k]} size={14} />
                  {STATUS_LABEL[k]}<i>{n}</i>
                </button>
              );
            })}
          </div>
        </section>
        <section className="cl20-fcol" data-cl19="filter-subs" aria-label="Submissions">
          <h4>Submissions</h4>
          <div className="cl20-seg" role="radiogroup" aria-label="Submissions" data-cl19="filter-seg">
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
          <div className="cl20-fchips">
            {([["always", "Always replies"], ["mats", "Missing materials"]] as const).map(([k, label]) => {
              const on = f[k];
              const n = on ? showing : would({ ...f, [k]: true });
              return (
                <button key={k} type="button" className={`cl20-chip${on ? " on" : ""}`} data-cl19="toggle" data-k={k} data-opt={`more:${k}`} data-n={n}
                  aria-pressed={on} disabled={!on && n === 0} onClick={() => set({ ...f, [k]: !on })}>
                  {label}<i>{n}</i>
                </button>
              );
            })}
          </div>
        </section>
        <section className="cl20-fcol" data-cl19="filter-genre" aria-label="Genre">
          <h4>Genre</h4>
          {f.genres.length >= 2 ? (
            <div className="cl20-seg cl20-seg--s" role="radiogroup" aria-label="Match" data-cl19="genre-mode">
              {(["any", "all"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={f.genreMode === m} className={f.genreMode === m ? "on" : ""} data-opt={`gm:${m}`}
                  onClick={() => set({ ...f, genreMode: m })}>{m === "any" ? "Any of these" : "All of these"}</button>
              ))}
            </div>
          ) : null}
          <div className="cl20-fchips" data-cl19="genre-chips">
            {genreChips.map((g) => {
              const on = f.genres.includes(g.key);
              const n = on ? showing : would({ ...f, genres: [...f.genres, g.key] });
              return (
                <button key={g.key} type="button" className={`cl20-chip${on ? " on" : ""}`} data-cl19="genre" data-k={g.key} data-opt={`g:${g.key}`} data-n={n}
                  aria-pressed={on} disabled={!on && n === 0}
                  onClick={() => set({ ...f, genres: on ? f.genres.filter((x) => x !== g.key) : [...f.genres, g.key] })}>
                  {g.label}<i>{n}</i>
                </button>
              );
            })}
            {allGenres.length > 10 ? (
              <button type="button" className="cl20-fmore" data-cl19="genre-more" data-opt="gmore" aria-expanded={gOpen} onClick={() => setGOpen((v) => !v)}>
                {gOpen ? "Fewer genres" : "All genres"}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
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
