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
 * is the brief's — 13×12, overlapping the tab body by 1px so no hairline of ink can show between them.
 *
 * ⚠️ THE FIT RULES, IN ORDER — full names, then icons, then "+N" — and three things that never move:
 * the current page is never hidden (it IS the paper tab), the order is always the sidebar's, and the
 * limit is 24px short of the search field. Re-fitting is measured, synchronous and unanimated, so
 * the tabs settle in one frame on a route change, a collapse or a resize.
 */
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
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
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
        {/* the one fillet — 13×12, the brief's path, overlapping the tab body by 1px */}
        <svg className="ws-ftfl" viewBox="0 0 13 12" width="13" height="12" aria-hidden="true" focusable="false">
          <path d="M0 0V12H13V12A12 12 0 0 1 1 0Z" />
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
                type="button"
                className="ws-ftsib ws-ftmore"
                data-sib="more"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label={`${rest.length} more pages`}
                onClick={() => setMenuOpen((o) => !o)}
              >
                +{rest.length}
              </button>
              {menuOpen && (
                <span className="ws-ftmenu" role="menu" aria-label="More pages" data-shell="tab-more-menu">
                  {rest.map((sb) => (
                    <button type="button" role="menuitem" key={sb.id} data-sib={sb.id}
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
