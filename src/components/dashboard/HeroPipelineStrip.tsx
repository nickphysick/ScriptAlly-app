/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hero pipeline strip — the animated AGGREGATE querying tour in the dashboard hero (the slot the
 * author quote used to occupy). One left-anchored SINGLE ROW of seven statuses (no fork), summing
 * every query across every manuscript. A travelling pulse rides the row left→right along an
 * invisible line, dwelling on populated stages and blooming zero stages in passing. Behaviour /
 * geometry match scriptally-journey-hero-flat.html (motion from scriptally-pipeline-tour-v6).
 *
 * Traits: large ~38px canonical StatusDots; NO connector track (nothing joins the nodes); every
 * stage always-on — populated at full strength, zero-count at 20% opacity blooming to full as the
 * pulse passes (no hidden ghost).
 *
 * Row order: Queried · Rejected · Partial Requested · Partial Sent · Full Requested · Full Sent ·
 * Offer. The mapping is reused verbatim from the old PipelinePanel — the "Rejected" node is the
 * old Closed aggregate, just relabelled and moved to position 2; it still counts Rejected +
 * Withdrawn + No Response + Revise & Resubmit (R&R is NOT a visible stage; the parked
 * R&R-in-Closed behaviour is preserved as-is, not corrected here).
 *
 * Disabled under prefers-reduced-motion (static row; zeros stay faint). Zero-state (0 queries)
 * renders a quiet row with every icon at the faint rest opacity, no tour, no captions.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Query, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { burgundy, FONT_MONO } from "../../lib/designTokens";
import "./heroFork.css";

interface Stage {
  status: QueryStatus; // representative status drawn as the stage's dot
  agg: QueryStatus[]; // statuses this stage counts
  sing: string;
  plur: string;
}

/* Seven nodes, single row. Mapping reused verbatim from the old PipelinePanel; the closed
   aggregate is relabelled "Rejected" and moved to position 2 (it still folds in R&R). */
const STAGES: Stage[] = [
  { status: QueryStatus.QUERIED, agg: [QueryStatus.QUERIED], sing: "queried", plur: "queried" },
  {
    status: QueryStatus.REJECTED, // the closed-states aggregate, relabelled + repositioned
    agg: [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.REVISE_RESUBMIT],
    sing: "rejected",
    plur: "rejected",
  },
  { status: QueryStatus.PARTIAL_REQUESTED, agg: [QueryStatus.PARTIAL_REQUESTED], sing: "partial requested", plur: "partials requested" },
  { status: QueryStatus.PARTIAL_SENT, agg: [QueryStatus.PARTIAL_SENT], sing: "partial sent", plur: "partials sent" },
  { status: QueryStatus.FULL_REQUESTED, agg: [QueryStatus.FULL_REQUESTED], sing: "full requested", plur: "fulls requested" },
  { status: QueryStatus.FULL_SENT, agg: [QueryStatus.FULL_SENT], sing: "full sent", plur: "fulls sent" },
  { status: QueryStatus.OFFER, agg: [QueryStatus.OFFER], sing: "offer", plur: "offers" },
];
const N = STAGES.length; // 7
const LAST = N - 1;

/** "queried"/"rejected" never inflect; the others pluralise the leading noun at count !== 1. */
const caption = (count: number, s: Stage) => `${count} ${count === 1 ? s.sing : s.plur}`;

// Timing — matches the sketch.
const DWELL = 2100;
const GAP = 320;
const REST = 1700;
const GLIDE_PER_COL = 1300; // ms per step (speed = step / 1300)
const PEEK_BEFORE = 650; // begin zero-stage bloom this long before the pulse passes
const PEEK_AFTER = 520; // linger this long after passing, then ease back to rest

// Geometry (proportions of the strip width W, recomputed on resize).
const DOT = 38; // large icon (~2× the usual StatusDot)
const R = DOT / 2;
const CGAP = 10; // dot → caption gap
const PAD_L = 20; // first node centre x (its dot's left edge ≈ hero content-left)
const PAD_R = 24; // last node centre at W − 24
const SPINE_Y = 22; // single-row baseline (dots near the top, captions below)
const H = 66; // single-row block: dot + caption reserve only

const captBase: React.CSSProperties = {
  position: "absolute",
  fontFamily: FONT_MONO,
  fontSize: 8,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};
/** Caption relative to the node box (DOT×DOT), always below: Queried left-aligned (no overhang),
 *  Offer (last) right-aligned, the rest centred. */
const captStyle = (i: number, populated: boolean): React.CSSProperties => {
  const color = populated ? burgundy : "#aaa093";
  if (i === 0) return { ...captBase, color, left: 0, top: DOT + CGAP, textAlign: "left" };
  if (i === LAST) return { ...captBase, color, right: 0, top: DOT + CGAP, textAlign: "right" };
  return { ...captBase, color, left: R, top: DOT + CGAP, transform: "translateX(-50%)", textAlign: "center" };
};

export interface HeroPipelineStripProps {
  queries: Query[];
}

export const HeroPipelineStrip: React.FC<HeroPipelineStripProps> = ({ queries }) => {
  const boxRef = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(0);

  const counts = useMemo(
    () => STAGES.map((s) => queries.filter((q) => s.agg.includes(q.status)).length),
    [queries]
  );
  const isZero = counts.reduce((a, b) => a + b, 0) === 0;
  const countsKey = counts.join(",");

  // Measure the strip width and track resizes (geometry is proportional to it).
  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Node centre x's: seven evenly from PAD_L to W − PAD_R.
  const xs = useMemo(() => {
    if (!W) return null;
    return STAGES.map((_, i) => PAD_L + (W - PAD_R - PAD_L) * (i / LAST));
  }, [W]);

  useEffect(() => {
    if (isZero || !xs) return; // zero-state: quiet faint row, no tour
    const box = boxRef.current;
    if (!box) return;
    const nodes = Array.from(box.querySelectorAll<HTMLElement>(".hf-node"));
    if (nodes.length < N) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Static legible row: show every caption; zeros stay at the 20% rest opacity.
      nodes.forEach((node) => node.classList.add("show"));
      return;
    }

    const pulse = box.querySelector<HTMLElement>(".hf-pulse");
    if (!pulse) return;

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
    io.observe(box);

    // Pulse positioning via transform (centres the 9px dot on x,y).
    const place = (x: number, y: number) => {
      pulse.style.transition = "none";
      pulse.style.transform = `translate(${x - 4.5}px, ${y - 4.5}px)`;
      void pulse.offsetWidth;
      pulse.style.transition = "";
    };
    const move = (x: number, y: number, dur: number) => {
      pulse.style.transition = `transform ${dur}ms linear, opacity 0.4s`;
      pulse.style.transform = `translate(${x - 4.5}px, ${y - 4.5}px)`;
    };

    const speed = (xs[1] - xs[0]) / GLIDE_PER_COL; // px per ms

    // Glide the pulse horizontally, blooming any zero nodes it passes.
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
      move(toX, SPINE_Y, dur);
      await wait(dur);
      for (let i = 0; i < N; i++) if (counts[i] === 0) nodes[i].classList.remove("peek");
    };

    const dwell = async (i: number) => {
      const wrap = nodes[i].querySelector<HTMLElement>(".hf-dotwrap");
      if (wrap) { wrap.classList.remove("pulsing"); void wrap.offsetWidth; wrap.classList.add("pulsing"); }
      nodes[i].classList.add("show");
      await wait(DWELL);
      nodes[i].classList.remove("show");
      await wait(GAP);
    };

    const step = xs[1] - xs[0];
    const startX = xs[0] - step / 2;
    const endX = xs[LAST] + step / 2; // glide off the right edge

    (async () => {
      while (!cancelled) {
        await waitVisible();
        if (cancelled) break;
        if (step <= 0) { await wait(200); continue; }

        pulse.style.opacity = "0";
        place(startX, SPINE_Y);
        await wait(700);
        if (cancelled) break;
        pulse.style.opacity = "1";
        await wait(300);

        // Stop on populated stages (dwell); zeros bloom as the pulse passes.
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
        await glide(cur, endX); // glide off the right, blooming any trailing zero (e.g. Offer)
        pulse.style.opacity = "0";
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
  }, [countsKey, W, isZero]);

  return (
    <div className="hero-fork" style={{ width: "100%", maxWidth: 780, position: "relative", height: H }} ref={boxRef}>
      {xs && (
        <>
          {!isZero && <div className="hf-pulse" />}

          {STAGES.map((s, i) => {
            const x = xs[i];
            const populated = counts[i] > 0;
            return (
              <div key={i} className={`hf-node${populated ? "" : " empty"}`} style={{ position: "absolute", left: x - R, top: SPINE_Y - R, width: DOT, height: DOT, zIndex: 2 }}>
                {populated ? (
                  <span className="hf-dotwrap">
                    <StatusDot status={s.status} size={DOT} />
                  </span>
                ) : (
                  // Always-on at the faint rest state; blooms to full as the pulse passes.
                  <StatusDot status={s.status} size={DOT} ghost className="hf-ghost" />
                )}
                {!isZero && (
                  <span className="hf-capt" style={captStyle(i, populated)}>
                    {caption(counts[i], s)}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
};
