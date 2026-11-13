/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * FolderTab — the bar's left: the current page as a paper tab growing out of the sheet, and the
 * page's group siblings as recessed tabs beside it (ink shell v1, 6 Oct; ref
 * design-refs/shell/ink-shell-v1.html, "Folder tab rules (normative)").
 *
 * ⚠️ THE TAB IS PAPER, SO IT READS THE SHEET'S TOKEN AND NOTHING ELSE. The tab body, the one fillet
 * and the sheet all paint `--ink-sheet`; a literal here would be a second paper that agrees with the
 * sheet until a route retones its ground (INK2).
 *
 * ⚠️ THE FILLET IS ONE SVG, NEVER A PSEUDO-ELEMENT OR A RADIAL GRADIENT. A gradient corner is
 * anti-aliased differently from the tab's own border-radius and shows a seam at 3× (INK4). The path
 * is the reference's (see the element), overlapping the tab body by 1px so no ink can show between them.
 *
 * ⚠️ THE FIT RULES, IN ORDER — full names, then icons, then "+N" — and three things that never move:
 * the current page is never hidden (it IS the paper tab), the order is always the sidebar's, and the
 * limit is 24px short of the search field. Re-fitting is measured, synchronous and unanimated, so
 * the tabs settle in one frame on a route change, a collapse or a resize.
 */
import { moveInMenu } from "../../lib/menuKeys";
import "./shellMenus.css";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export interface TabSibling { id: string; label: string; path: string; icon: React.ReactNode }

export interface FolderTabProps {
  /** The group the page sits under (the sidebar's group label), or null for a page in none. */
  group: string | null;
  /** The current page's name. */
  name: string;
  /** The group's OTHER pages, in the sidebar's order. */
  siblings: TabSibling[];
  onGo: (path: string) => void;
  /** The search field — the fit limit is 24px short of its left edge. */
  limitRef: React.RefObject<HTMLElement | null>;
}

/** The gap between the paper tab's box and the first recessed tab (the ref's `+16`, measured from
 *  the tab body's right edge; the fillet takes 12 of it). */
const FIRST_GAP = 16;
/** Between recessed tabs. */
const SIB_GAP = 6;
/** Short of the search field. */
const LIMIT_GAP = 24;
/** Room held back for a "+N" while icons are still being placed (the ref's reserve). */
const MORE_RESERVE = 58;

export type FitMode = "full" | "ic";
export interface FitPlan { modes: FitMode[]; overflowFrom: number | null }

/**
 * The fit, as a pure function of measured widths — so it can be unit-tested without a browser.
 * `full[i]` / `icon` are the widths a sibling takes named and icon-only; `start` is where the first
 * sibling begins and `limit` where the last must end, both in the bar's own coordinates.
 */
export function planTabs(full: number[], icon: number, start: number, limit: number): FitPlan {
  const modes: FitMode[] = [];
  let x = start;
  let mode: FitMode = "full";
  for (let i = 0; i < full.length; i++) {
    let w = mode === "full" ? full[i] : icon;
    if (mode === "full" && x + w > limit) { mode = "ic"; w = icon; }
    const rest = full.length - i - 1;
    const reserve = rest > 0 ? MORE_RESERVE : 0;
    if (mode === "ic" && x + w + reserve > limit) return { modes, overflowFrom: i };
    modes.push(mode);
    x += w + SIB_GAP;
  }
  return { modes, overflowFrom: null };
}

const reduceMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export const FolderTab: React.FC<FolderTabProps> = ({ group, name, siblings, onGo, limitRef }) => {
  const tabRef = useRef<HTMLSpanElement>(null);
  const sibsRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [plan, setPlan] = useState<FitPlan>({ modes: siblings.map(() => "full"), overflowFrom: null });
  const [start, setStart] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLSpanElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLSpanElement>(null);

  /* ── the name swap: the old name drops out, the new one rises in, 180ms in all ── */
  const [shown, setShown] = useState({ group, name });
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    if (shown.name === name && shown.group === group) return undefined;
    if (reduceMotion()) { setShown({ group, name }); setLeaving(false); return undefined; }
    setLeaving(true);
    const t = window.setTimeout(() => { setShown({ group, name }); setLeaving(false); }, 90);
    return () => window.clearTimeout(t);
  }, [group, name]); // eslint-disable-line react-hooks/exhaustive-deps

  const sibKey = siblings.map((s) => s.id).join("|");

  const fit = useCallback(() => {
    const tab = tabRef.current;
    const bar = tab?.parentElement;
    const lim = limitRef.current;
    const meas = measureRef.current;
    if (!tab || !bar || !meas) return;
    const b = bar.getBoundingClientRect();
    if (b.width <= 0) return;
    const s = tab.getBoundingClientRect().right - b.left + FIRST_GAP;
    const limR = lim && lim.getBoundingClientRect().width > 0 ? lim.getBoundingClientRect().left - b.left : b.width;
    const kids = [...meas.querySelectorAll<HTMLElement>("[data-ftm]")];
    const full = siblings.map((sb) => kids.find((k) => k.dataset.ftm === sb.id)?.getBoundingClientRect().width ?? 0);
    const icon = kids.find((k) => k.dataset.ftm === "__icon")?.getBoundingClientRect().width ?? 37;
    const next = planTabs(full, icon, s, limR - LIMIT_GAP);
    setStart((cur) => (Math.abs(cur - s) < 0.5 ? cur : s));
    setPlan((cur) =>
      cur.overflowFrom === next.overflowFrom && cur.modes.join() === next.modes.join() ? cur : next,
    );
  }, [siblings, limitRef]); // eslint-disable-line react-hooks/exhaustive-deps

  /* measured before paint, on every change that moves either edge */
  useLayoutEffect(() => { fit(); }, [fit, sibKey, shown.name, shown.group]);
  useEffect(() => {
    const bar = tabRef.current?.parentElement;
    if (!bar || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => fit());
    ro.observe(bar);
    if (limitRef.current) ro.observe(limitRef.current);
    if (tabRef.current) ro.observe(tabRef.current);
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(() => fit()).catch(() => {});
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [fit, limitRef]);

  /* the "+N" menu: the house dismissal idiom — pointerdown outside, Escape; any navigation closes it */
  useEffect(() => { setMenuOpen(false); }, [name]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const away = (e: PointerEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenuOpen(false); moreBtnRef.current?.focus(); } };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key); };
  }, [menuOpen]);

  const placed = plan.overflowFrom === null ? siblings : siblings.slice(0, plan.overflowFrom);
  const rest = plan.overflowFrom === null ? [] : siblings.slice(plan.overflowFrom);

  return (
    <>
      <span className="ws-ftab" ref={tabRef} data-shell="tab">
        <span className={`ws-ftnm${leaving ? " is-out" : ""}`}>
          {shown.group && <small className="ws-ftg">{shown.group}</small>}
          <b className="ws-ftn" data-page-name="">{shown.name}</b>
        </span>
        {/* ⚠️ THE ONE FILLET — THE REFERENCE'S PATH, VERBATIM: a 12-unit viewBox stretched to 13px wide
            (`preserveAspectRatio="none"`), overlapping the tab body by 1px. The brief quoted a different
            path (`M0 0V12H13V12A12 12 0 0 1 1 0Z` in a true 13×12 box) while also saying "copy it from the
            reference verbatim"; measured at 3× against the normative golden, the reference's path is 38
            pixels off in the fillet's region and the quoted one 76. The golden decides. */}
        <svg className="ws-ftfl" viewBox="0 0 12 12" preserveAspectRatio="none" width="13" height="12" aria-hidden="true" focusable="false">
          <path d="M0 0V12H12A12 12 0 0 1 0 0Z" />
        </svg>
      </span>
      {siblings.length > 0 && (
        <span className="ws-ftsibs" ref={sibsRef} style={{ left: start }} data-shell="tab-siblings">
          {placed.map((sb, i) => {
            const ic = plan.modes[i] === "ic";
            return (
              <button
                type="button"
                key={sb.id}
                className={`ws-ftsib${ic ? " ws-ftsib--ic" : ""}`}
                data-sib={sb.id}
                data-mode={ic ? "ic" : "full"}
                title={ic ? sb.label : undefined}
                aria-label={sb.label}
                onClick={() => onGo(sb.path)}
              >
                {ic ? sb.icon : sb.label}
              </button>
            );
          })}
          {rest.length > 0 && (
            <span className="ws-ftmore-wrap" ref={moreRef}>
              <button
                ref={moreBtnRef}
                type="button"
                className="ws-ftsib ws-ftmore"
                data-sib="more"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`${rest.length} more pages`}
                onClick={(e) => {
                  const viaKeys = e.detail === 0;
                  setMenuOpen((o) => !o);
                  if (viaKeys) requestAnimationFrame(() => moreMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
                }}
              >
                +{rest.length}
              </button>
              {menuOpen && (
                <span
                  ref={moreMenuRef}
                  className="ws-ftmenu sa-pop" role="menu" aria-label="More pages" data-shell="tab-more-menu"
                  onKeyDown={(e) => { moveInMenu(e, moreMenuRef.current); }}
                >
                  {rest.map((sb) => (
                    <button type="button" role="menuitem" className="sa-mi" key={sb.id} data-sib={sb.id}
                      onClick={() => { setMenuOpen(false); onGo(sb.path); }}>
                      {sb.icon}<span>{sb.label}</span>
                    </button>
                  ))}
                </span>
              )}
            </span>
          )}
        </span>
      )}
      {/* the measurer: every sibling named, and one icon tab, laid out where nothing sees them */}
      <span className="ws-ftsibs ws-ftmeasure" ref={measureRef} aria-hidden="true">
        {siblings.map((sb) => <span key={sb.id} className="ws-ftsib" data-ftm={sb.id}>{sb.label}</span>)}
        <span className="ws-ftsib ws-ftsib--ic" data-ftm="__icon">{siblings[0]?.icon}</span>
      </span>
    </>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   SHELL NAV v3 (13 Nov; ref design-refs/shell-nav-v3.html, `.tabs` `.tab` `.tab.cur` `.fil`) — THE TAB STRIP.
   The workspace bar's tabs: every page of the current section, in nav order, which NEVER changes. The current page's
   tab rises where it stands (paper, 41px, 19px) with a 10px lane either side (none on the left when it is first);
   the others rest (34px, cream 14%, 16px). The fillet is FolderTab's path verbatim: on the right always, mirrored on
   the left when the current tab is not first. No group label.

   ⚠️ THE FIT KEEPS FolderTab's ORDER OF RETREAT — full names, then icons, then "+N" — with two rules of its own: the
   current tab is never icon-only and never in "+N", and resting tabs give way first FROM THE RIGHT. Re-fitting is
   measured before paint and unanimated.

   ⚠️ TABS ARE BUTTONS THAT NAVIGATE, SO THEY ARE NOT ARIA TABS: a nav landmark, no `role="tablist"`, and
   `aria-current="page"` on the current one. `FolderTab` above is the onboarding frame's own tab (SetupFrame) and is
   left as it was; the workspace bar renders only this.
   ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */

export interface StripTab {
  id: string;
  /** The page's full name — the aria-label and the "+N" menu. */
  label: string;
  /** The name the tab prints (`tabLabel ?? label`). */
  short: string;
  path: string;
  icon: React.ReactNode;
  /** A Pro page this account is not entitled to: the tab carries the small PRO tag after its name. */
  locked?: boolean;
}

export type StripMode = "cur" | "full" | "ic" | "hid";

/** Between tabs (the ref's `.tabs` gap). */
const STRIP_GAP = 6;

/**
 * The fit, as a pure function of measured widths. `rest[i]` / `icon[i]` are tab i's resting widths named and
 * icon-only; `cur` is the current tab's risen width INCLUDING its lanes; `more` the "+N" tab's width; `limit` the room
 * from the strip's left edge. Resting tabs turn to icons from the right, then leave for "+N" from the right.
 */
export function planStrip(rest: number[], icon: number[], current: number, cur: number, more: number, limit: number): StripMode[] {
  const modes: StripMode[] = rest.map((_, i) => (i === current ? "cur" : "full"));
  const width = () => {
    const shown = modes.map((m, i) => (m === "cur" ? cur : m === "full" ? rest[i] : m === "ic" ? icon[i] : -1)).filter((w) => w >= 0);
    const hidden = modes.some((m) => m === "hid");
    const n = shown.length + (hidden ? 1 : 0);
    return shown.reduce((a, b) => a + b, 0) + (hidden ? more : 0) + Math.max(0, n - 1) * STRIP_GAP;
  };
  const fromRight = rest.map((_, i) => rest.length - 1 - i).filter((i) => i !== current);
  for (const i of fromRight) { if (width() <= limit) return modes; modes[i] = "ic"; }
  for (const i of fromRight) { if (width() <= limit) return modes; modes[i] = "hid"; }
  return modes;
}

export interface TabStripProps {
  /** The section's pages, in nav order (one tab for a one-page section or an off-nav page). */
  tabs: StripTab[];
  /** The current page's id. */
  current: string;
  onGo: (path: string) => void;
  /** The search field — the fit limit is 24px short of its left edge. */
  limitRef: React.RefObject<HTMLElement | null>;
}

const PRO_TAG = <span className="ws-qpro ws-ftpro" data-shell="pro" aria-label="Pro">PRO</span>;

/** The current tab's fillet, verbatim from FolderTab: right always; mirrored on the left when not first. */
const fillet = (side: "r" | "l") => (
  <svg className={side === "r" ? "ws-ftfl" : "ws-ftfl-l"} viewBox="0 0 12 12" preserveAspectRatio="none" width="13" height="12" aria-hidden="true" focusable="false">
    <path d="M0 0V12H12A12 12 0 0 1 0 0Z" />
  </svg>
);

export const TabStrip: React.FC<TabStripProps> = ({ tabs, current, onGo, limitRef }) => {
  const stripRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const curIdx = Math.max(0, tabs.findIndex((t) => t.id === current));
  const key = tabs.map((t) => t.id).join("|");
  const [modes, setModes] = useState<StripMode[]>(() => tabs.map((_, i) => (i === curIdx ? "cur" : "full")));
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLSpanElement>(null);
  const moreBtnRef = useRef<HTMLButtonElement>(null);
  const moreMenuRef = useRef<HTMLSpanElement>(null);

  const fit = useCallback(() => {
    const strip = stripRef.current;
    const bar = strip?.parentElement;
    const meas = measureRef.current;
    if (!strip || !bar || !meas) return;
    const b = bar.getBoundingClientRect();
    if (b.width <= 0) return;
    const lim = limitRef.current;
    const limR = lim && lim.getBoundingClientRect().width > 0 ? lim.getBoundingClientRect().left - b.left : b.width;
    const left = strip.getBoundingClientRect().left - b.left;
    const w = (sel: string) => meas.querySelector<HTMLElement>(sel)?.getBoundingClientRect().width ?? 0;
    const rest = tabs.map((t) => w(`[data-ftm="${t.id}"]`));
    const icon = tabs.map((t) => w(`[data-ftm-ic="${t.id}"]`) || 37);
    /* the risen tab with its lanes: 10 either side, none on the left when it is first */
    const cur = w(`[data-ftm-cur="${tabs[curIdx]?.id}"]`) + (curIdx === 0 ? 10 : 20);
    const next = planStrip(rest, icon, curIdx, cur, w("[data-ftm-more]") || 58, limR - LIMIT_GAP - left);
    setModes((m) => (m.join() === next.join() ? m : next));
  }, [key, curIdx, limitRef]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => { fit(); }, [fit]);
  useEffect(() => {
    const bar = stripRef.current?.parentElement;
    if (!bar || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => fit());
    ro.observe(bar);
    if (limitRef.current) ro.observe(limitRef.current);
    /* ⚠️ THE SEARCH FIELD MOVES WITHOUT RESIZING when a page's guide pill (or any page-slot control) arrives late: the
       bar's right group grows, so it is observed too — the field's own size never changes */
    const right = limitRef.current?.closest<HTMLElement>(".ws-bright");
    if (right) ro.observe(right);
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(() => fit()).catch(() => {});
    return () => { ro.disconnect(); window.removeEventListener("resize", fit); };
  }, [fit, limitRef]);

  /* the "+N" menu: the house dismissal idiom — pointerdown outside, Escape; any navigation closes it */
  useEffect(() => { setMenuOpen(false); }, [current]);
  useEffect(() => {
    if (!menuOpen) return undefined;
    const away = (e: PointerEvent) => { if (!moreRef.current?.contains(e.target as Node)) setMenuOpen(false); };
    const keyDown = (e: KeyboardEvent) => { if (e.key === "Escape") { setMenuOpen(false); moreBtnRef.current?.focus(); } };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", keyDown);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", keyDown); };
  }, [menuOpen]);

  /* a stale plan (the tab list changed and the layout effect has not run yet) reads every tab as named */
  const modeOf = (i: number): StripMode => (i === curIdx ? "cur" : modes.length === tabs.length && modes[i] !== "cur" ? modes[i] : "full");
  const hidden = tabs.filter((_, i) => modeOf(i) === "hid");

  return (
    <>
      <nav className="ws-fttabs" ref={stripRef} aria-label="Pages" data-shell="tabs">
        {tabs.map((t, i) => {
          const m = modeOf(i);
          if (m === "hid") return null;
          if (m === "cur") {
            return (
              <button
                type="button" key={t.id}
                className={`ws-ftab ws-fttab is-cur${i === 0 ? " is-first" : ""}`}
                data-shell="tab" data-tab={t.id} aria-current="page" aria-label={t.label}
              >
                <b className="ws-ftn" data-page-name="">{t.short}</b>
                {t.locked && PRO_TAG}
                {fillet("r")}
                {i > 0 && fillet("l")}
              </button>
            );
          }
          const ic = m === "ic";
          return (
            <button
              type="button" key={t.id}
              className={`ws-fttab${ic ? " ws-fttab--ic" : ""}`}
              data-tab={t.id} data-sib={t.id} data-mode={ic ? "ic" : "full"}
              title={ic ? t.label : undefined} aria-label={t.label}
              onClick={() => onGo(t.path)}
            >
              {ic ? t.icon : <span className="ws-fttl">{t.short}</span>}
              {!ic && t.locked && PRO_TAG}
            </button>
          );
        })}
        {hidden.length > 0 && (
          <span className="ws-ftmore-wrap" ref={moreRef}>
            <button
              ref={moreBtnRef}
              type="button"
              className="ws-fttab ws-ftmore"
              data-sib="more"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`${hidden.length} more pages`}
              onClick={(e) => {
                const viaKeys = e.detail === 0;
                setMenuOpen((o) => !o);
                if (viaKeys) requestAnimationFrame(() => moreMenuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus());
              }}
            >
              +{hidden.length}
            </button>
            {menuOpen && (
              <span
                ref={moreMenuRef}
                className="ws-ftmenu sa-pop" role="menu" aria-label="More pages" data-shell="tab-more-menu"
                onKeyDown={(e) => { moveInMenu(e, moreMenuRef.current); }}
              >
                {hidden.map((t) => (
                  <button type="button" role="menuitem" className="sa-mi" key={t.id} data-sib={t.id}
                    onClick={() => { setMenuOpen(false); onGo(t.path); }}>
                    {t.icon}<span>{t.label}</span>{t.locked && PRO_TAG}
                  </button>
                ))}
              </span>
            )}
          </span>
        )}
      </nav>
      {/* the measurer: every tab resting (named and icon-only), the current one risen, and a "+N" — seen by nothing.
          ⚠️ IT CARRIES NONE OF THE LIVE TAB'S HOOKS (`.ws-ftab`, `.ws-ftn`, `data-tab`): its boxes are real, so a probe
          that lists every sized `.ws-ftn` read the current page's name twice. */}
      <span className="ws-fttabs ws-ftmeasure" ref={measureRef} aria-hidden="true">
        {tabs.map((t) => (
          <React.Fragment key={t.id}>
            <span className="ws-fttab" data-ftm={t.id}><span className="ws-fttl">{t.short}</span>{t.locked && PRO_TAG}</span>
            <span className="ws-fttab ws-fttab--ic" data-ftm-ic={t.id}>{t.icon}</span>
          </React.Fragment>
        ))}
        {tabs[curIdx] && (
          <span className="ws-fttab is-cur" data-ftm-cur={tabs[curIdx].id}>
            <span className="ws-fttl">{tabs[curIdx].short}</span>{tabs[curIdx].locked && PRO_TAG}
          </span>
        )}
        <span className="ws-fttab ws-ftmore" data-ftm-more="">+9</span>
      </span>
    </>
  );
};
