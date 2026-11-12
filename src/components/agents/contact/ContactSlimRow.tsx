/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list header v2 (design-refs/contact-list-header-v2.html, frame 2) — THE SLIM PINNED ROW. Once the header has
 * scrolled away, a 48px row pins at the top of the page's scroller, above the pinned list toolbar: the headline at 19px
 * with the subheader beside it on its baseline (still the rust button while some are not yet queried), then one button
 * of a 24px ring and "{pct}% list health" (Housekeeping), then + Add an agent. Desktop only (768px and up); it does not
 * render on day one, on the empty page or while loading (AgentList's call site).
 *
 * ⚠️ IT TAKES NO SPACE: a grid item spanning both of the group's rows (header and list), 48px tall with its own height
 *    taken back in a negative bottom margin, so the header and the list sit exactly where they did. Spanning both rows is
 *    what lets it stay sticky for the whole page: a sticky item is held inside its grid area.
 * ⚠️ THE OFFSET IS THE EXISTING VARIABLE. While the row shows it writes `--pin-cover` on the list column (`.clv-main`)
 *    as its own measured bottom (its sticky top + its height); the toolbar (`.cl26-pin`), the margin labels and the
 *    filter rail all sit under `--pin-cover`, so they move below it, and the property is removed the moment it hides, so
 *    they return to the value they inherit. Written on `.clv-main`, never on the group: the row's own `top` reads
 *    `--pin-cover`, and writing it where the row reads it would feed back.
 * ⚠️ HIDDEN IS INERT: `inert` and `aria-hidden` while it is not shown, so none of its controls are in the Tab order.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { HeaderFigures } from "../../../lib/contactV26";
import { clHeadline } from "../../../lib/contactPrinciples";
import { healthColours } from "./ContactHealth26";

/** the 24px ring's geometry: the ref's (viewBox 46, r 19, stroke 7) */
const SLIM_R = 19;
const SLIM_C = 2 * Math.PI * SLIM_R;

/** is the viewport 768px or wider (the row's whole existence; below it, it never renders) */
function useDesktop(): boolean {
  const q = "(min-width: 768px)";
  const [on, setOn] = useState(() => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(q).matches);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const m = window.matchMedia(q);
    const put = () => setOn(m.matches);
    put();
    m.addEventListener("change", put);
    return () => m.removeEventListener("change", put);
  }, []);
  return on;
}

export const ContactSlimRow: React.FC<{
  figures: HeaderFigures;
  /** Housekeeping's score and gap count */
  health: { pct: number; gaps: number };
  onNotQueried: () => void;
  onOpenHealth: () => void;
  onAdd: () => void;
}> = (p) => (useDesktop() ? <SlimRow {...p} /> : null);

const SlimRow: React.FC<React.ComponentProps<typeof ContactSlimRow>> = ({ figures, health, onNotQueried, onOpenHealth, onAdd }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const h = clHeadline(figures);
  const c = healthColours(health.pct, "light");

  /* ONE READER: has the header gone under the row's line (the row's sticky top plus its height) */
  const read = useCallback(() => {
    const row = ref.current;
    const sc = row?.closest<HTMLElement>(".wpg-scroll");
    const hd = row?.parentElement?.querySelector<HTMLElement>("[data-cl27='header']");
    if (!row || !sc || !hd || hd.offsetHeight === 0) return;
    const line = sc.getBoundingClientRect().top + (parseFloat(getComputedStyle(row).top) || 0) + row.offsetHeight;
    setShown(hd.getBoundingClientRect().bottom <= line);
  }, []);
  useEffect(() => {
    const row = ref.current;
    const sc = row?.closest<HTMLElement>(".wpg-scroll");
    if (!sc) return undefined;
    let raf = 0;
    const on = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(read); };
    read();
    sc.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(on);
    ro?.observe(sc);
    return () => { cancelAnimationFrame(raf); sc.removeEventListener("scroll", on); window.removeEventListener("resize", on); ro?.disconnect(); };
  }, [read]);

  /* the offset the toolbar, the margin labels and the rail sit under, while the row shows */
  useLayoutEffect(() => {
    const row = ref.current;
    const main = row?.parentElement?.querySelector<HTMLElement>(":scope > .clv-main");
    if (!row || !main) return undefined;
    if (shown) main.style.setProperty("--pin-cover", `${(parseFloat(getComputedStyle(row).top) || 0) + row.offsetHeight}px`);
    else main.style.removeProperty("--pin-cover");
    return () => { main.style.removeProperty("--pin-cover"); };
  }, [shown]);

  return (
    <div ref={ref} className="clh2-slim" data-clh2="slim" data-shown={shown ? "" : undefined}
      inert={!shown || undefined} aria-hidden={!shown || undefined}>
      <p className="clh2-st" data-clh2="slim-title">
        <b className="clh2-stt">{h.title}</b>
        {h.sub ? (
          <i className="clh2-sts" data-clh2="slim-sub">
            {h.subLink ? <button type="button" className="clh2-nq" data-clh2="slim-notq" onClick={onNotQueried}>{h.sub}</button> : h.sub}
          </i>
        ) : null}
      </p>
      <div className="clh2-sa">
        <button type="button" className="clh2-sh" data-clh2="slim-health" onClick={onOpenHealth} aria-label={`List health ${health.pct}%. Open Housekeeping`}>
          <svg viewBox="0 0 46 46" width={24} height={24} aria-hidden="true">
            <circle cx={23} cy={23} r={SLIM_R} fill="none" style={{ stroke: c.track }} strokeWidth={7} />
            <circle cx={23} cy={23} r={SLIM_R} fill="none" style={{ stroke: c.arc }} strokeWidth={7} strokeLinecap="round"
              strokeDasharray={`${(Math.max(0, Math.min(100, health.pct)) / 100) * SLIM_C} ${SLIM_C}`} transform="rotate(-90 23 23)" />
          </svg>
          <b className="clh2-shp">{health.pct}%</b><i className="clh2-shw">list health</i>
        </button>
        <button type="button" className="clh2-sadd" data-clh2="slim-add" onClick={onAdd}>+ Add an agent</button>
      </div>
    </div>
  );
};
