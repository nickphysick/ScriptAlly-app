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
 *              (Revise & Resubmit is its OWN live node here — corrected for this surface).
 *   Outcomes:  Offer → Offer; Rejected + Withdrawn + No Response → Closed (R&R NOT in Closed).
 * Counts are aggregate across all manuscripts.
 *
 * Animation: NO travelling pulse. An invisible playhead steps left→right; each populated stage
 * pulses (scale + halo) with its caption in turn, and zero stages (resting at 20% opacity) bloom
 * to full as the playhead passes. Disabled under prefers-reduced-motion (static row, zeros faint).
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

// Timing — matches the sketch.
const DWELL = 2100;
const GAP = 320;
const REST = 1700;
const GLIDE_PER_COL = 1300; // ms per step (speed = step / 1300)
const PEEK_BEFORE = 650; // begin zero-stage bloom this long before the playhead passes
const PEEK_AFTER = 520; // linger this long after passing, then ease back to rest

// Geometry (proportions of the row width W, recomputed on resize).
const DOT = 38;
const R = DOT / 2;
const CGAP = 10; // dot → caption gap
const CAP_H = 12; // caption line reserve
const PAD_L = 20; // first node centre x (its dot's left edge ≈ body content-left)
const PAD_R = 22; // last node centre at W − 22
const H_STRIP = 96; // body row height; the dot+caption block is centred within it
const SPINE_Y = Math.round(H_STRIP / 2 - (CGAP + CAP_H) / 2); // vertical centre of the row block

const captBase: React.CSSProperties = {
  position: "absolute",
  fontFamily: FONT_MONO,
  fontSize: 8,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};
/** Caption relative to the node box (DOT×DOT), always below: Queried left, R&R (last) right, rest centred. */
const captStyle = (i: number, populated: boolean): React.CSSProperties => {
  const color = populated ? burgundy : "#aaa093";
  if (i === 0) return { ...captBase, color, left: 0, top: DOT + CGAP, textAlign: "left" };
  if (i === LAST) return { ...captBase, color, right: 0, top: DOT + CGAP, textAlign: "right" };
  return { ...captBase, color, left: R, top: DOT + CGAP, transform: "translateX(-50%)", textAlign: "center" };
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
    if (nodes.length < N) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Static legible row: show every caption; zeros stay at the 20% rest opacity.
      nodes.forEach((node) => node.classList.add("show"));
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

    const speed = (xs[1] - xs[0]) / GLIDE_PER_COL; // px per ms (invisible playhead)

    // Advance the invisible playhead, blooming any zero nodes it passes (no visible element moves).
    const glide = async (fromX: number, toX: number) => {
      const dist = toX - fromX;
      if (dist <= 1) return;
      const dur = dist / speed;
      for (let i = 0; i < N; i++) {
        if (counts[i] !== 0) continue;
        const xc = xs[i];
        if (xc > fromX + 1 && xc <= toX + 1) {
          const t = (xc - fromX) / speed;
          const a = setTimeout(() => { timers.delete(a); nodes[i].classList.add("peek"); }, Math.max(0, t - PEEK_BEFORE));
          const b = setTimeout(() => { timers.delete(b); nodes[i].classList.remove("peek"); }, t + PEEK_AFTER);
          timers.add(a); timers.add(b);
        }
      }
      await wait(dur);
      for (let i = 0; i < N; i++) if (counts[i] === 0) nodes[i].classList.remove("peek");
    };

    const dwell = async (i: number) => {
      const wrap = nodes[i].querySelector<HTMLElement>(".wl-dotwrap");
      if (wrap) { wrap.classList.remove("pulsing"); void wrap.offsetWidth; wrap.classList.add("pulsing"); }
      nodes[i].classList.add("show");
      await wait(DWELL);
      nodes[i].classList.remove("show");
      await wait(GAP);
    };

    const step = xs[1] - xs[0];
    const startX = xs[0] - step / 2;
    const endX = xs[LAST] + step / 2;

    (async () => {
      while (!cancelled) {
        await waitVisible();
        if (cancelled) break;
        if (step <= 0) { await wait(200); continue; }

        await wait(700); // settle before each pass
        let cur = startX;
        for (let i = 0; i < N; i++) {
          if (counts[i] === 0) continue;
          await glide(cur, xs[i]);
          cur = xs[i];
          if (cancelled) break;
          await dwell(i);
          if (cancelled) break;
        }
        if (cancelled) break;
        await glide(cur, endX); // pass any trailing zero (e.g. R&R)
        await wait(REST);
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
          {xs &&
            LIVE.map((s, i) => {
              const x = xs[i];
              const populated = counts[i] > 0;
              return (
                <div key={i} className={`wl-node${populated ? "" : " empty"}`} style={{ position: "absolute", left: x - R, top: SPINE_Y - R, width: DOT, height: DOT, zIndex: 2 }}>
                  {populated ? (
                    <span className="wl-dotwrap">
                      <StatusDot status={s.status} size={DOT} />
                    </span>
                  ) : (
                    <StatusDot status={s.status} size={DOT} ghost className="wl-ghost" />
                  )}
                  {!isZeroLive && (
                    <span className="wl-capt" style={captStyle(i, populated)}>
                      {caption(counts[i], s)}
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};
