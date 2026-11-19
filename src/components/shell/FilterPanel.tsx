/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * List filters v1 (design-refs/list-filters-v1/list-filters-v1.html, "v3 · the panel") — THE FILTER PANEL, the one card
 * in the filter column of the Queries list and the Agents list. It replaces shell/ViewsPanel. One white card:
 *
 *   Filter · {n} on · Clear all     a navy head
 *   <sections>                      each a title row (typewriter) over its controls, a 1px rule between them
 *   foot                            one sentence in the typewriter, read out politely as it changes
 *
 * THE PARTS are exported one by one so both pages draw the same ones: `FilterTile` (a number tile, or a wide one),
 * `FilterPills`, `FilterSplit`, `FilterSwitch`, `FilterFold`, and `FilterSection` around them. Stage's bar and labels
 * are shell/StageFilter.
 *
 * ⚠️ PRESENTATION ONLY: every count, every "on" and every write is handed in by the page. The panel holds two pieces of
 *    state, a fold's open and how a count is shown on its way to a new value; neither is a filter.
 * ⚠️ THE CARD KEEPS THE RAIL'S BONES (`qc153-rail`): its column, its width and its stickiness read that class. Its look is
 *    shell/filterPanel.css, scoped to `.fp`.
 * ⚠️ IT ALWAYS PINS (List filters v1.1). The card is a column no taller than the room under the bar (a `max-height` on
 *    `--wpg-port-h` and `--pin-cover`, so it follows the collapsed bar with no script); the head and the foot never
 *    scroll, and the sections scroll inside `.fp-body` when they need more room. `data-fp-more` on the card says there is
 *    more below (the foot's shadow); `--fp-sb` is the body's scrollbar width, taken out of the sections' right padding so
 *    the content never shifts sideways. useTallRail ("too tall: scroll with the page") is retired.
 * ⚠️ THE `data-*` PROBES ARE THE CALLER'S (`hook`: `data-qc156` on Queries, `data-clq` on Agents): every workspace page
 *    stays mounted, so a probe that counts one page's hooks across the document must never count the other's.
 * ⚠️ NO COLOUR HERE MEANS A STAGE. Stage colours live in lib/stageColours and are drawn only by shell/StageFilter.
 */
import React, { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import "./filterPanel.css";

type Hook = `data-${string}`;
const Ctx = createContext<{ hook: Hook; loading: boolean }>({ hook: "data-fp", loading: false });
/** the page's probe attribute with a value, for any part inside the panel */
export function useFilterHook(): { h: (v: string) => Record<string, string>; loading: boolean } {
  const c = useContext(Ctx);
  return { h: (v: string) => ({ [c.hook]: v }), loading: c.loading };
}

/* ── the icons: 18-unit line drawings, stroked in currentColor ──────────────────────────────────────────────────── */
const S = { viewBox: "0 0 18 18", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
export type FilterIcon = "you" | "clock" | "plane" | "seal" | "reply" | "doc";
export const FILTER_ICONS: Record<FilterIcon, React.ReactNode> = {
  you: <svg {...S}><circle cx="9" cy="9" r="6.5" /><path d="M9 5.6v4.1M9 12.2v.1" /></svg>,
  clock: <svg {...S}><circle cx="9" cy="9" r="6.5" /><path d="M9 5.4V9l2.5 1.6" /></svg>,
  plane: <svg {...S}><path d="M15.5 2.5 2.5 8l5 1.8L9.3 15z" /><path d="M15.5 2.5 7.5 9.8" /></svg>,
  /** the Offer status mark (StatusDot's star seal), as a line */
  seal: <svg {...S}><circle cx="9" cy="9" r="6.5" /><path d="m9 5.6 1 2.2 2.4.3-1.8 1.6.5 2.4L9 10.9l-2.1 1.2.5-2.4-1.8-1.6 2.4-.3z" /></svg>,
  reply: <svg {...S}><path d="M3 4.5h12v8H8l-3.2 2.6V12.5H3z" /></svg>,
  doc: <svg {...S}><path d="M4.5 2.5h6l3 3v10h-9z" /><path d="M7 9h4.5M7 12h4.5" /></svg>,
};
export const FILTER_TICK = <svg className="fp-tk" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2.5 6.2 5 8.6l4.6-5" /></svg>;
const CARET = <svg viewBox="0 0 12 12" width="11" height="11" fill="currentColor" aria-hidden="true"><path d="M2 4h8L6 9z" /></svg>;

/** List filters v1 Phase 6 — a count that changes runs to its new value over this long; never on first paint */
export const COUNT_MS = 260;
const reducedMotion = (): boolean => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
/**
 * A count: the number, and its probe value (`data-n`, always the TARGET) on the element that shows it. When the number
 * changes it runs to the new value over COUNT_MS; on first paint, and under reduced motion, it lands at once.
 */
export const Num: React.FC<{ n: number; className?: string }> = ({ n, className }) => {
  const [shown, setShown] = useState(n);
  const from = useRef(n);
  useEffect(() => {
    const start = from.current;
    from.current = n;
    if (start === n) return undefined;
    if (reducedMotion()) { setShown(n); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / COUNT_MS);
      setShown(Math.round(start + (n - start) * k));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); setShown(n); };
  }, [n]);
  return <b className={className} data-n={n}>{shown}</b>;
};

/* ── the card ──────────────────────────────────────────────────────────────────────────────────────────────────── */
export interface FilterPanelProps {
  hook: Hook;
  /** the card's accessible name */
  label: string;
  /** "{n} on" in the head; 0 draws none and disables Clear all */
  on: number;
  onClear: () => void;
  /** the foot's sentence */
  foot: React.ReactNode;
  loading?: boolean;
  children: React.ReactNode;
}
/**
 * The body's two readings, on every scroll and resize: whether there is more below (`data-fp-more` on the card) and the
 * scrollbar's width (`--fp-sb`). Written to the DOM, not React state: a scroll must not re-render the panel.
 */
function useBodyReadings(railRef: React.RefObject<HTMLElement | null>, bodyRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const rail = railRef.current, body = bodyRef.current;
    if (!rail || !body) return undefined;
    let raf = 0;
    const read = () => {
      raf = 0;
      const more = body.scrollHeight - body.clientHeight - body.scrollTop > 1;
      if (rail.hasAttribute("data-fp-more") !== more) rail.toggleAttribute("data-fp-more", more);
      const sb = `${Math.max(0, body.offsetWidth - body.clientWidth)}px`;
      if (rail.style.getPropertyValue("--fp-sb") !== sb) rail.style.setProperty("--fp-sb", sb);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(read); };
    read();
    body.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(on);
    ro?.observe(body);
    for (const c of body.children) ro?.observe(c);
    /* a section added or removed (What you sent, the genres' "+n more") changes the content's height */
    const mo = typeof MutationObserver === "undefined" ? null : new MutationObserver(() => { for (const c of body.children) ro?.observe(c); on(); });
    mo?.observe(body, { childList: true, subtree: true });
    return () => { body.removeEventListener("scroll", on); window.removeEventListener("resize", on); ro?.disconnect(); mo?.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [railRef, bodyRef]);
}

export const FilterPanel: React.FC<FilterPanelProps> = ({ hook, label, on, onClear, foot, loading = false, children }) => {
  const h = (v: string) => ({ [hook]: v });
  const railRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  useBodyReadings(railRef, bodyRef);
  return (
    <Ctx.Provider value={{ hook, loading }}>
      <aside className="qc153-rail fp" aria-label={label} {...h("panel")} aria-busy={loading || undefined} ref={railRef}>
        <div className="fp-hd" {...h("head")}>
          <b className="fp-t" {...h("title")}>Filter</b>
          {on > 0 ? <span className="fp-on" {...h("on")}>{on} on</span> : null}
          <button type="button" className="fp-clr" {...h("clear")} disabled={on === 0 || loading} onClick={onClear}>Clear all</button>
        </div>
        <div className="fp-body" {...h("body")} ref={bodyRef}>{children}</div>
        <p className="fp-ft" aria-live="polite" {...h("foot")}>{loading ? " " : foot}</p>
      </aside>
    </Ctx.Provider>
  );
};

/** a section: its title (typewriter 17) and an optional note or link on the right, over its controls */
export const FilterSection: React.FC<{ probe: string; title: string; aside?: React.ReactNode; children: React.ReactNode }> = ({ probe, title, aside, children }) => {
  const { h } = useFilterHook();
  const id = useId();
  return (
    <section className="fp-sec" {...h(probe)} aria-labelledby={id}>
      <div className="fp-st"><b id={id}>{title}</b>{aside ?? null}</div>
      {children}
    </section>
  );
};

/* ── a number tile ─────────────────────────────────────────────────────────────────────────────────────────────── */
export interface FilterTileProps {
  k: string;
  n: number;
  label: string;
  /** the wide tile's second line */
  line?: string;
  icon: FilterIcon;
  on: boolean;
  title?: string;
  wide?: boolean;
  onPress: () => void;
  /** radio by default (one at a time); a tile that is its own on/off is a checkbox */
  role?: "radio" | "checkbox";
}
export const FilterTile: React.FC<FilterTileProps> = ({ k, n, label, line, icon, on, title, wide = false, onPress, role = "radio" }) => {
  const { h, loading } = useFilterHook();
  const zero = !on && n === 0;
  const cls = `fp-tile${wide ? " fp-tile--wide" : ""}${on ? " is-on" : ""}${zero ? " is-zero" : ""}`;
  return (
    <button type="button" role={role} aria-checked={on} className={cls} {...h("tile")} data-k={k} data-n={n} title={title}
      disabled={loading || zero} onClick={onPress}>
      {wide
        ? <><Num n={n} className="fp-n" /><span className="fp-tx">{label}{line ? <small>{line}</small> : null}</span>{FILTER_ICONS[icon]}</>
        : <><span className="fp-top"><Num n={n} className="fp-n" />{FILTER_ICONS[icon]}</span><span className="fp-tx">{label}</span></>}
    </button>
  );
};
/** the tiles' grid, two across */
export const FilterTiles: React.FC<{ label: string; role?: "radiogroup" | "group"; children: React.ReactNode }> = ({ label, role = "radiogroup", children }) => (
  <div className="fp-tiles" role={role} aria-label={label}>{children}</div>
);

/* ── pills ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
export interface FilterPill { k: string; label: React.ReactNode; n: number; on: boolean; onToggle: () => void; tick?: boolean; title?: string }
export const FilterPills: React.FC<{
  probe: string;
  label: string;
  items: readonly FilterPill[];
  /** the dashed "+{n} more" pill */
  more?: { n: number; onPress: () => void } | null;
}> = ({ probe, label, items, more }) => {
  const { h, loading } = useFilterHook();
  return (
    <div className="fp-pills" role="group" aria-label={label}>
      {items.map((p) => {
        const zero = !p.on && p.n === 0;
        return (
          <button key={p.k} type="button" role="checkbox" aria-checked={p.on} className={`fp-pill${p.on ? " is-on" : ""}${zero ? " is-zero" : ""}`}
            {...h(probe)} data-k={p.k} data-n={p.n} title={p.title} disabled={loading || zero} onClick={p.onToggle}>
            {p.tick ? FILTER_TICK : null}<span className="fp-pl">{p.label}</span><Num n={p.n} className="fp-pn" />
          </button>
        );
      })}
      {more && more.n > 0 ? (
        <button type="button" className="fp-pill fp-pill--more" {...h(`${probe}-more`)} disabled={loading} onClick={more.onPress}>+{more.n} more</button>
      ) : null}
    </div>
  );
};

/* ── a two-way split ───────────────────────────────────────────────────────────────────────────────────────────── */
export interface FilterSplitSide { k: string; n: number; words: string; on: boolean; onPress: () => void }
/** two sides in one bar, each as wide as its count; pressing the side that is on clears it (the page's write says so) */
export const FilterSplit: React.FC<{ probe: string; label: string; sides: readonly [FilterSplitSide, FilterSplitSide] }> = ({ probe, label, sides }) => {
  const { h, loading } = useFilterHook();
  return (
    <div className="fp-split" role="radiogroup" aria-label={label} {...h(probe)}>
      {sides.map((s, i) => {
        const zero = !s.on && s.n === 0;
        return (
          <button key={s.k} type="button" role="radio" aria-checked={s.on} className={`fp-sg fp-sg--${i ? "b" : "a"}${s.on ? " is-on" : ""}${zero ? " is-zero" : ""}`}
            {...h("side")} data-k={s.k} data-n={s.n} style={{ flexGrow: s.n }} disabled={loading || zero} onClick={s.onPress}>
            <Num n={s.n} className="fp-n" /><span>{s.words}</span>
          </button>
        );
      })}
    </div>
  );
};

/* ── a switch row ──────────────────────────────────────────────────────────────────────────────────────────────── */
export const FilterSwitch: React.FC<{ k: string; label: string; n: number; on: boolean; onToggle: () => void }> = ({ k, label, n, on, onToggle }) => {
  const { h, loading } = useFilterHook();
  const zero = !on && n === 0;
  return (
    <button type="button" role="switch" aria-checked={on} className={`fp-sw${on ? " is-on" : ""}${zero ? " is-zero" : ""}`} {...h("switch")} data-k={k} data-n={n}
      disabled={loading || zero} onClick={onToggle}>
      <span className="fp-swl">{label}</span><Num n={n} className="fp-swn" /><i className="fp-tog" aria-hidden="true" />
    </button>
  );
};

/* ── a fold ────────────────────────────────────────────────────────────────────────────────────────────────────── */
/** closed by default; open while any filter inside is set (on arrival, from a link); folding never clears a filter */
export const FilterFold: React.FC<{ probe: string; title: string; on: number; children: React.ReactNode }> = ({ probe, title, on, children }) => {
  const { h } = useFilterHook();
  const [open, setOpen] = useState(on > 0);
  useEffect(() => { if (on > 0) setOpen(true); }, [on]);
  const id = useId();
  return (
    <>
      <button type="button" className="fp-fold" {...h(probe)} aria-expanded={open} aria-controls={id} onClick={() => setOpen((x) => !x)}>
        <span><b>{title}</b>{on > 0 ? <small {...h(`${probe}-on`)}>{on} on</small> : null}</span><i aria-hidden="true">{CARET}</i>
      </button>
      <div id={id} className="fp-sec fp-fb" {...h(`${probe}-body`)} hidden={!open || undefined}>{children}</div>
    </>
  );
};
