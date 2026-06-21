/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "What's live right now?" — a standalone Form-11 dashboard panel (parchment surface, inset
 * burgundy frame, sage gradient header band) matching Fortnight in focus / The story so far.
 * It shows only the LIVE stages of the journey as a single centred row of canonical StatusDots;
 * the settled outcomes (Offer, Closed) appear as minimal text in the header.
 *
 * Explicit status → bucket mapping (defined here for this surface; NOT inherited from any old
 * panel): each query maps to exactly one bucket by its current QueryStatus.
 *   Live row:  Queried · Partial Requested · Partial Sent · Full Requested · Full Sent · R&R
 *              (Revise & Resubmit is its OWN live node here.)
 *   Outcomes:  Offer → Offer; Rejected + Withdrawn + No Response → Closed (R&R NOT in Closed).
 * Counts are aggregate across all manuscripts.
 *
 * Animation: after Queried plays, a dotted connector line is drawn dot-by-dot along the row —
 * pausing on each POPULATED stage while its icon pulses (50% larger) and its caption fades in,
 * and passing straight over the inactive (zero) stages. Captions stay visible once shown and all
 * reset when the line finishes and the cycle restarts. Disabled under prefers-reduced-motion
 * (static row + fully-drawn line). Zero-state (no live queries) is a quiet faint row.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Query, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import {
  parchment,
  PAPER_TEXTURE,
  mountShadow,
  insetBorder,
  sageBandGradient,
  sageBandRule,
  headingInk,
  burgundy,
  mutedInk,
  FONT_SERIF,
  FONT_MONO,
} from "../../lib/designTokens";
import "./whatsLive.css";

interface Stage {
  status: QueryStatus; // representative status drawn as the stage's dot
  agg: QueryStatus[];
  sing: string;
  plur: string;
}

/* Six live stages, journey order. R&R is its own live node (renders the sage pencil mark). */
const LIVE: Stage[] = [
  { status: QueryStatus.QUERIED, agg: [QueryStatus.QUERIED], sing: "queried", plur: "queried" },
  { status: QueryStatus.PARTIAL_REQUESTED, agg: [QueryStatus.PARTIAL_REQUESTED], sing: "partial requested", plur: "partials requested" },
  { status: QueryStatus.PARTIAL_SENT, agg: [QueryStatus.PARTIAL_SENT], sing: "partial sent", plur: "partials sent" },
  { status: QueryStatus.FULL_REQUESTED, agg: [QueryStatus.FULL_REQUESTED], sing: "full requested", plur: "fulls requested" },
  { status: QueryStatus.FULL_SENT, agg: [QueryStatus.FULL_SENT], sing: "full sent", plur: "fulls sent" },
  { status: QueryStatus.REVISE_RESUBMIT, agg: [QueryStatus.REVISE_RESUBMIT], sing: "in revision", plur: "in revision" },
];
const N = LIVE.length; // 6
const LAST = N - 1;

/** Outcomes (header text). Offer on its own; Closed = rejected + withdrawn + no-response (NOT R&R). */
const CLOSED_OUTCOME: QueryStatus[] = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE];

const caption = (count: number, s: Stage) => `${count} ${count === 1 ? s.sing : s.plur}`;

// Timing.
const DWELL = 2100; // pause at an active stage while its pulse + caption play
const REST = 1700; // hold at the end before the cycle resets
const LINE_PER_COL = 700; // ms to draw the dotted line across one inter-stage gap

// Geometry (proportions of the row width W, recomputed on resize).
const DOT = 50; // resting icon (25% larger than the prior 40)
const R = DOT / 2;
const CGAP = 10; // dot → caption gap (caption sits directly beneath)
const PAD_L = 70; // first node centre x — room for the leftmost centred caption + a gap
const PAD_R = 70; // last node centre at W − 70 — room for the rightmost centred caption
const H_STRIP = 104; // body row height (fits the larger icon, its 1.5× pulse, and the caption)
const SPINE_Y = 48; // icon row baseline (icons sit visually centred; captions fade in below)

/** Caption matches the "More room for the journey" line: Playfair 17/500, head ink, centred. */
const captStyle: React.CSSProperties = {
  position: "absolute",
  left: R,
  top: DOT + CGAP,
  transform: "translateX(-50%)",
  textAlign: "center",
  fontFamily: FONT_SERIF,
  fontSize: 17,
  fontWeight: 500,
  color: headingInk,
  whiteSpace: "nowrap",
  pointerEvents: "none",
};

const LINE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: SPINE_Y,
  transform: "translateY(-50%)",
  height: 2,
  width: 0,
  zIndex: 1,
  pointerEvents: "none",
  background: "radial-gradient(circle, rgba(124,58,42,0.5) 1.3px, transparent 1.7px)",
  backgroundSize: "10px 2px",
  backgroundRepeat: "repeat-x",
  backgroundPosition: "left center",
};

export interface WhatsLivePanelProps {
  queries: Query[];
}

export const WhatsLivePanel: React.FC<WhatsLivePanelProps> = ({ queries }) => {
  const rowRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);

  const counts = useMemo(
    () => LIVE.map((s) => queries.filter((q) => s.agg.includes(q.status)).length),
    [queries]
  );
  const offerCount = useMemo(() => queries.filter((q) => q.status === QueryStatus.OFFER).length, [queries]);
  const closedCount = useMemo(() => queries.filter((q) => CLOSED_OUTCOME.includes(q.status)).length, [queries]);
  const isZeroLive = counts.reduce((a, b) => a + b, 0) === 0;
  const countsKey = counts.join(",");

  // Measure the row width and track resizes (geometry is proportional to it).
  useLayoutEffect(() => {
    const el = rowRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Node centre x's: six evenly from PAD_L to W − PAD_R.
  const xs = useMemo(() => {
    if (!W) return null;
    return LIVE.map((_, i) => PAD_L + (W - PAD_R - PAD_L) * (i / LAST));
  }, [W]);

  useEffect(() => {
    if (isZeroLive || !xs) return; // zero-state: quiet faint row, no sequence
    const row = rowRef.current;
    if (!row) return;
    const nodes = Array.from(row.querySelectorAll<HTMLElement>(".wl-node"));
    const line = row.querySelector<HTMLElement>(".wl-line");
    if (nodes.length < N || !line) return;

    const full = xs[LAST] - xs[0];

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Static: show every populated caption, draw the line fully, no pulses.
      nodes.forEach((node, i) => { if (counts[i] > 0) node.classList.add("show"); });
      line.style.transition = "none";
      line.style.width = `${full}px`;
      return;
    }

    let cancelled = false;
    let visible = true;
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const wait = (ms: number) =>
      new Promise<void>((res) => {
        const id = setTimeout(() => { timers.delete(id); res(); }, ms);
        timers.add(id);
      });
    let resumeWaiters: Array<() => void> = [];
    const waitVisible = () => (visible ? Promise.resolve() : new Promise<void>((res) => resumeWaiters.push(res)));

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          visible = e.isIntersecting;
          if (visible && resumeWaiters.length) {
            const w = resumeWaiters;
            resumeWaiters = [];
            w.forEach((r) => r());
          }
        }
      },
      { threshold: 0 }
    );
    io.observe(row);

    const speed = (xs[1] - xs[0]) / LINE_PER_COL; // px per ms

    let curX = xs[0];
    // Draw the dotted line up to target x (dots appear as the revealed width crosses them).
    const drawTo = async (tx: number) => {
      if (tx <= curX + 0.5) return;
      const dur = (tx - curX) / speed;
      line.style.transition = `width ${dur}ms linear`;
      line.style.width = `${tx - xs[0]}px`;
      curX = tx;
      await wait(dur);
    };

    // Pause on an active stage: pulse the icon (50% larger) + fade its caption in (it stays).
    const dwell = async (i: number) => {
      const wrap = nodes[i].querySelector<HTMLElement>(".wl-dotwrap");
      if (wrap) { wrap.classList.remove("pulsing"); void wrap.offsetWidth; wrap.classList.add("pulsing"); }
      nodes[i].classList.add("show");
      await wait(DWELL);
    };

    const reset = async () => {
      nodes.forEach((n) => n.classList.remove("show", "peek"));
      line.style.transition = "opacity 0.6s";
      line.style.opacity = "0";
      await wait(1000); // let captions + line fade out
      line.style.transition = "none";
      line.style.width = "0px";
      line.style.opacity = "1";
      curX = xs[0];
      void line.offsetWidth;
    };

    (async () => {
      while (!cancelled) {
        await waitVisible();
        if (cancelled) break;
        if (full <= 0) { await wait(200); continue; }

        await wait(500); // settle
        // Queried plays first (if populated), then the line begins to draw.
        if (counts[0] > 0) { await dwell(0); if (cancelled) break; }
        for (let i = 1; i <= LAST; i++) {
          if (counts[i] === 0) continue; // line passes straight over inactive stages
          await drawTo(xs[i]);
          if (cancelled) break;
          await dwell(i);
          if (cancelled) break;
        }
        if (cancelled) break;
        await drawTo(xs[LAST]); // finish the journey to the last icon
        await wait(REST);
        if (cancelled) break;
        await reset();
      }
    })();

    return () => {
      cancelled = true;
      timers.forEach((id) => clearTimeout(id));
      io.disconnect();
      resumeWaiters = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey, W, isZeroLive]);

  return (
    <div
      id="whats-live-container"
      className="flex flex-col w-full relative"
      style={{ background: parchment, backgroundImage: PAPER_TEXTURE, borderRadius: 14, boxShadow: mountShadow }}
    >
      {/* signature inset mount frame */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 6, border: insetBorder, borderRadius: 10, pointerEvents: "none", zIndex: 3 }} />

      {/* sage header band: keyline + title (left) · minimal outcomes text (right) */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ position: "relative", zIndex: 2, margin: "6px 6px 0", borderRadius: "8px 8px 0 0", padding: "12px 18px 10px", background: sageBandGradient, borderBottom: `1px solid ${sageBandRule}`, gap: 10 }}
      >
        <span className="flex items-center">
          <span aria-hidden="true" style={{ width: 3, height: 18, borderRadius: 2, background: burgundy, marginRight: 12, flexShrink: 0, display: "inline-block" }} />
          <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 500, color: headingInk, lineHeight: 1.1 }}>What&rsquo;s live right now?</span>
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.04em", color: mutedInk, whiteSpace: "nowrap" }}>
          <span style={{ color: burgundy, fontWeight: 500 }}>{offerCount}</span> offer{offerCount === 1 ? "" : "s"}
          <span aria-hidden="true" style={{ color: burgundy, opacity: 0.4, margin: "0 7px" }}>·</span>
          <span style={{ color: burgundy, fontWeight: 500 }}>{closedCount}</span> closed
        </span>
      </div>

      {/* body: the single centred live row */}
      <div style={{ position: "relative", zIndex: 2, margin: "0 6px 6px", padding: "14px 16px" }}>
        <div ref={rowRef} className="wl-row" style={{ position: "relative", width: "100%", height: H_STRIP }}>
          {xs && (
            <>
              {/* dotted connector line (drawn dot-by-dot in JS); behind the icons */}
              <div className="wl-line" style={{ ...LINE_STYLE, left: xs[0] }} />

              {LIVE.map((s, i) => {
                const x = xs[i];
                const populated = counts[i] > 0;
                return (
                  <div key={i} className={`wl-node${populated ? "" : " empty"}`} style={{ position: "absolute", left: x - R, top: SPINE_Y - R, width: DOT, height: DOT, zIndex: 2 }}>
                    {populated ? (
                      <span className="wl-dotwrap">
                        <StatusDot status={s.status} overrideSize={DOT} />
                      </span>
                    ) : (
                      <StatusDot status={s.status} overrideSize={DOT} ghost className="wl-ghost" />
                    )}
                    {!isZeroLive && (
                      <span className="wl-capt" style={captStyle}>
                        {caption(counts[i], s)}
                      </span>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
