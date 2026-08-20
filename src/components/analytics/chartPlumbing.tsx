/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The two things every chart on this page needs: a real width, and a tooltip.
 *
 * ⚠️ HAND-ROLLED SVG, BY DECISION. No chart library is added for this page — the marks are simple
 * and a dependency would bring its own palette, its own tooltip and its own accessibility story,
 * all of which would then need overriding to match a page that already has all three.
 */
import React from "react";

/* ────────────────────────────────── width ────────────────────────────────── */

/**
 * The element's own width, observed.
 *
 * ⚠️ A `viewBox` ALONE WILL NOT DO. Scaling one to fit would scale the type with it, so an axis
 * label would be a different size on a wide window than a narrow one. The chart is drawn at the
 * real pixel width instead and its text stays where it was set.
 *
 * ⚠️ AND THE FALLBACK IS A REAL NUMBER, NOT ZERO. The first render — and every render under this
 * repo's node-environment specs, which have no layout at all — has nothing measured yet. At zero
 * width every bar computes to zero and a spec would assert against an empty chart while passing.
 * The fallback draws a plausible chart that the first observation immediately corrects.
 */
export function useMeasuredWidth(fallback: number): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const w = el.clientWidth;
      /* written only on a change — a fresh number every observation re-renders the whole chart on
         every frame of a window drag */
      setWidth((prev) => (w > 0 && Math.abs(w - prev) > 0.5 ? w : prev));
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/* ────────────────────────────────── tooltip ────────────────────────────────── */

export interface TipContent {
  /** Mono uppercase kicker — what kind of thing this is. */
  kicker: string;
  /** The figure or name, emphasised. */
  headline: string;
  /** An ordinary sentence beneath it. Optional. */
  detail?: string;
}

interface TipState extends TipContent {
  x: number;
  y: number;
}

/**
 * ⚠️ ONE TOOLTIP FOR THE WHOLE PAGE, POSITIONED `fixed`. A tip per chart would be clipped by its
 * own panel's `overflow: hidden`, and a tip inside the scroller would move with the content while
 * the pointer did not.
 *
 * ⚠️ IT OPENS ON FOCUS AS WELL AS HOVER. Everything these tips describe becomes keyboard-reachable,
 * and a tooltip only a mouse can summon hides the figure from the reader most likely to need it.
 */
export function useChartTip() {
  const [tip, setTip] = React.useState<TipState | null>(null);

  const show = React.useCallback((e: { clientX: number; clientY: number }, content: TipContent) => {
    setTip({ ...content, x: e.clientX, y: e.clientY });
  }, []);

  /** For focus, which carries no pointer position — anchor to the element's own box. */
  const showAt = React.useCallback((el: Element | null, content: TipContent) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTip({ ...content, x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }, []);

  const hide = React.useCallback(() => setTip(null), []);

  /** Everything an interactive mark needs to drive the tip. Spread onto the element. */
  const bind = React.useCallback(
    (content: TipContent) => ({
      onMouseMove: (e: React.MouseEvent) => show(e, content),
      onMouseLeave: hide,
      onFocus: (e: React.FocusEvent) => showAt(e.currentTarget, content),
      onBlur: hide,
      /* ⚠️ THE LABEL IS THE TIP'S TEXT, NOT A SUMMARY OF IT. A screen reader gets the same three
         pieces a sighted reader does, so the tip is decoration rather than the only copy. */
      "aria-label": `${content.kicker}. ${content.headline}${content.detail ? `. ${content.detail}` : ""}`,
    }),
    [show, showAt, hide],
  );

  const node = tip ? <ChartTip {...tip} /> : null;
  return { bind, hide, node };
}

const ChartTip: React.FC<TipState> = ({ kicker, headline, detail, x, y }) => {
  /* kept inside the window: 270px is the tip's own max width plus its offset */
  const left = Math.min(x + 14, (typeof window === "undefined" ? 1440 : window.innerWidth) - 270);
  return (
    <div className="an-tip" style={{ left, top: y + 14 }} role="tooltip" aria-hidden="true">
      <span className="an-tipk">{kicker}</span>
      <b>{headline}</b>
      {detail ? <div className="an-tipd">{detail}</div> : null}
    </div>
  );
};

/* ────────────────────────────────── shared drawing ────────────────────────────────── */

/** Evenly spaced gridlines and their axis figures, top value first. */
export function gridTicks(maxValue: number, lines: number): { value: number; fraction: number }[] {
  const out: { value: number; fraction: number }[] = [];
  for (let i = 0; i <= lines; i++) out.push({ value: Math.round((maxValue * i) / lines), fraction: i / lines });
  return out;
}

/** `12 Aug` — the page's one short-date format, so no two panels spell a date differently. */
export const shortDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/** `12 Aug 2026` — where the year matters, as it does on a window that closes next year. */
export const shortDateYear = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

/** `3 days` / `1 day` — one place, so no panel writes "1 days". */
export const days = (n: number): string => `${n} ${n === 1 ? "day" : "days"}`;
