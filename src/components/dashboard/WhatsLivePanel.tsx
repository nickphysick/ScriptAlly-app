/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "What's live right now?" — a standalone Form-11 dashboard panel (parchment surface, inset
 * burgundy frame, sage gradient header band) matching Fortnight in focus / The story so far.
 * It shows only the LIVE stages of the journey as a single centred row of canonical StatusDots;
 * the settled outcomes appear as minimal "Not shown here:" text in the header.
 *
 * Live row (each query maps by its current QueryStatus):
 *   Queried · Partial Requested · Partial Sent · Full Requested · Full Sent · R&R
 * Header "Not shown here:" buckets the settled (inactive) queries:
 *   offers → Offer; rejections → Rejected; closed → Withdrawn + No Response.
 * Counts are aggregate across all manuscripts.
 *
 * Animation: after Queried plays, a dotted connector line is drawn dot-by-dot along the row.
 * Every stage pulses (50% larger) with its caption as the line reaches it — the line PAUSES on
 * populated stages and passes straight over the zero-count ones (which still pulse + show a grey
 * "no …" caption in passing, sitting in front of the line). Captions stay visible once shown and
 * all reset when the line finishes and the cycle restarts. Disabled under prefers-reduced-motion.
 *
 * StatusDot is locked to 30px app-wide on this branch (no size prop); the panel's larger 50px
 * icons are sized by the scoped `.wl-dot` override in whatsLive.css (the shared component is
 * left untouched).
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
  sing: string; // count === 1
  plur: string; // count > 1
  zero: string; // count === 0 (grammatically sound "no …" phrase)
}

/* Six live stages, journey order. R&R is its own live node (renders the sage pencil mark). */
const LIVE: Stage[] = [
  { status: QueryStatus.QUERIED, agg: [QueryStatus.QUERIED], sing: "queried", plur: "queried", zero: "no queries" },
  { status: QueryStatus.PARTIAL_REQUESTED, agg: [QueryStatus.PARTIAL_REQUESTED], sing: "partial requested", plur: "partials requested", zero: "no partials requested" },
  { status: QueryStatus.PARTIAL_SENT, agg: [QueryStatus.PARTIAL_SENT], sing: "partial sent", plur: "partials sent", zero: "no partials sent" },
  { status: QueryStatus.FULL_REQUESTED, agg: [QueryStatus.FULL_REQUESTED], sing: "full requested", plur: "fulls requested", zero: "no fulls requested" },
  { status: QueryStatus.FULL_SENT, agg: [QueryStatus.FULL_SENT], sing: "full sent", plur: "fulls sent", zero: "no fulls sent" },
  { status: QueryStatus.REVISE_RESUBMIT, agg: [QueryStatus.REVISE_RESUBMIT], sing: "in revision", plur: "in revision", zero: "none in revision" },
];
const N = LIVE.length; // 6
const LAST = N - 1;

const caption = (count: number, s: Stage) => (count === 0 ? s.zero : `${count} ${count === 1 ? s.sing : s.plur}`);

// Timing.
const DWELL = 700; // brief pause of the line at an active stage while its pulse plays
const LINE_PER_COL = 1400; // ms to draw the dotted line across one inter-stage gap (deliberately slow)
const QUERIED_BEAT = 400; // brief beat after Queried shows before the line starts

// Geometry (proportions of the row width W, recomputed on resize).
const DOT = 50; // resting icon size (matches the .wl-dot CSS override)
const R = DOT / 2;
const CGAP = 8; // dot → caption gap (caption sits directly beneath)
const CAP_H = 16; // caption line reserve (smaller serif) — used to vertically centre the block
const PAD_L = 70; // first node centre x — room for the leftmost centred caption + a gap
const PAD_R = 70; // last node centre at W − 70 — room for the rightmost centred caption
const H_STRIP = 83; // body row height (~20% shorter); fits the icon, its pulse, and the caption
const SPINE_Y = Math.round((H_STRIP - (DOT + CGAP + CAP_H)) / 2 + R); // centre the icon+caption block

const INACTIVE_INK = "#9a948a"; // grey for the zero-count "no …" captions (matches the faded icons)

/** Caption: serif (as the "More room for the journey" line), but smaller; centred beneath. */
const captStyle = (populated: boolean): React.CSSProperties => ({
  position: "absolute",
  left: R,
  top: DOT + CGAP,
  transform: "translateX(-50%)",
  textAlign: "center",
  fontFamily: FONT_SERIF,
  fontSize: 13,
  fontWeight: 500,
  color: populated ? headingInk : INACTIVE_INK,
  whiteSpace: "nowrap",
  pointerEvents: "none",
});

const LINE_STYLE: React.CSSProperties = {
  position: "absolute",
  top: SPINE_Y,
  transform: "translateY(-50%)",
  height: 2,
  width: 0,
  zIndex: 1, // behind the icons (which carry an opaque disc, §"in front of the line")
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
  const playedRef = useRef(false); // the tour plays once per mount — no replay until refresh / nav back

  const counts = useMemo(
    () => LIVE.map((s) => queries.filter((q) => s.agg.includes(q.status)).length),
    [queries]
  );
  const isZeroLive = counts.reduce((a, b) => a + b, 0) === 0;
  const countsKey = counts.join(",");

  // Settled (inactive) buckets for the header "Not shown here:" line.
  const offers = useMemo(() => queries.filter((q) => q.status === QueryStatus.OFFER).length, [queries]);
  const rejections = useMemo(() => queries.filter((q) => q.status === QueryStatus.REJECTED).length, [queries]);
  const closed = useMemo(() => queries.filter((q) => q.status === QueryStatus.WITHDRAWN || q.status === QueryStatus.NO_RESPONSE).length, [queries]);
  const inactiveParts: string[] = [];
  if (offers) inactiveParts.push(`${offers} offer${offers === 1 ? "" : "s"}`);
  if (rejections) inactiveParts.push(`${rejections} rejection${rejections === 1 ? "" : "s"}`);
  if (closed) inactiveParts.push(`${closed} closed`);

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

    // End-state: line fully drawn, every caption shown (zeros stay faint, no pulses).
    const showStatic = () => {
      nodes.forEach((node) => node.classList.add("show"));
      line.style.transition = "none";
      line.style.width = `${full}px`;
    };
    // Reduced-motion, or a re-render after the tour already ran this mount (e.g. a resize) →
    // jump straight to the end-state. The tour itself never replays until the panel re-mounts.
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || playedRef.current) { showStatic(); return; }

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

    // The line reaches a stage → its caption appears (and stays) and the icon pulses: active
    // stages pulse 50% larger; zero-count stages pulse only very slightly (no opacity change).
    const pulseLabel = (i: number) => {
      nodes[i].classList.add("show");
      const wrap = nodes[i].querySelector<HTMLElement>(".wl-dotwrap");
      if (wrap) {
        const cls = counts[i] > 0 ? "pulsing" : "pulsing-faint";
        wrap.classList.remove("pulsing", "pulsing-faint");
        void wrap.offsetWidth;
        wrap.classList.add(cls);
      }
    };

    (async () => {
      await waitVisible();
      if (cancelled || full <= 0) return;
      playedRef.current = true; // it begins playing now — re-renders this mount won't replay it

      await wait(500); // settle
      // Queried plays first; then the line draws ONCE, pausing briefly on active stages and
      // passing straight over the inactive ones, and stops at the end (no replay this mount).
      pulseLabel(0);
      await wait(counts[0] > 0 ? DWELL : QUERIED_BEAT);
      if (cancelled) return;
      for (let i = 1; i <= LAST; i++) {
        await drawTo(xs[i]);
        if (cancelled) return;
        pulseLabel(i);
        if (counts[i] > 0) { await wait(DWELL); if (cancelled) return; } // brief pause on active
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

      {/* sage header band: keyline + title (left) · "Not shown here:" outcomes (right) */}
      <div
        className="flex items-center justify-between flex-wrap"
        style={{ position: "relative", zIndex: 2, margin: "6px 6px 0", borderRadius: "8px 8px 0 0", padding: "12px 18px 10px", background: sageBandGradient, borderBottom: `1px solid ${sageBandRule}`, gap: 10 }}
      >
        <span className="flex items-center">
          <span aria-hidden="true" style={{ width: 3, height: 18, borderRadius: 2, background: burgundy, marginRight: 12, flexShrink: 0, display: "inline-block" }} />
          <span style={{ fontFamily: FONT_SERIF, fontSize: 19, fontWeight: 500, color: headingInk, lineHeight: 1.1 }}>What&rsquo;s live right now?</span>
        </span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, letterSpacing: "0.04em", color: mutedInk, whiteSpace: "nowrap" }}>
          {inactiveParts.length > 0 ? (
            <>
              Not shown here: <span style={{ color: burgundy, fontWeight: 500 }}>{inactiveParts.join(", ")}</span>
            </>
          ) : (
            <>You have no inactive queries. Everything is shown below.</>
          )}
        </span>
      </div>

      {/* body: the single centred live row */}
      <div style={{ position: "relative", zIndex: 2, margin: "0 6px 6px", padding: "14px 16px" }}>
        <div ref={rowRef} className="wl-row" style={{ position: "relative", width: "100%", height: H_STRIP }}>
          {xs && (
            <>
              {/* dotted connector line (drawn dot-by-dot in JS); behind the icons' discs */}
              <div className="wl-line" style={{ ...LINE_STYLE, left: xs[0] }} />

              {LIVE.map((s, i) => {
                const x = xs[i];
                const populated = counts[i] > 0;
                return (
                  <div
                    key={i}
                    className={`wl-node${populated ? "" : " empty"}`}
                    // opaque parchment disc so the dotted line never shows through (icon in front)
                    style={{ position: "absolute", left: x - R, top: SPINE_Y - R, width: DOT, height: DOT, zIndex: 2, background: parchment, borderRadius: "50%" }}
                  >
                    <span className="wl-dotwrap">
                      {/* StatusDot is locked to 30px app-wide (no size prop); .wl-dot forces 50px here. */}
                      <StatusDot status={s.status} ghost={!populated} className={`wl-dot${populated ? "" : " wl-ghost"}`} />
                    </span>
                    {!isZeroLive && (
                      <span className="wl-capt" style={captStyle(populated)}>
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
