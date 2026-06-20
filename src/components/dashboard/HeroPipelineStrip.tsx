/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hero pipeline strip — the animated AGGREGATE querying tour in the dashboard hero (the slot
 * the author quote used to occupy). One row sums every query across every manuscript, drawn as
 * a left-anchored SPINE of the five active stages (Queried → Full Sent) that FORKS at the end
 * into the two terminal outcomes — Offer (upper branch) and Closed (lower branch). A travelling
 * pulse rides the spine, dwelling on populated stages and blooming empty ones in passing; at the
 * fork it splits into two pulses that travel the branches simultaneously. Behaviour/geometry
 * match scriptally-journey-hero-fork.html (motion from scriptally-pipeline-tour-v6.html).
 *
 * The column → QueryStatus mapping is reused verbatim from the removed PipelinePanel — Closed
 * aggregates Rejected / Withdrawn / No Response / Revise & Resubmit (R&R is NOT a visible stage;
 * the parked R&R-in-Closed behaviour is preserved as-is, not corrected here).
 *
 * One representative dot per stage (canonical StatusDot; muted ghost when empty). Fully disabled
 * under prefers-reduced-motion (static, legible spine+fork). Zero-state (0 queries) renders a
 * quiet static spine+fork of visible ghost stages — no tour, no captions.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Query, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { burgundy, FONT_MONO } from "../../lib/designTokens";
import "./heroFork.css";

interface Stage {
  status: QueryStatus; // representative status drawn as the stage's dot / empty ghost
  agg: QueryStatus[]; // statuses this stage counts
  sing: string;
  plur: string;
}

/* Five spine stages + two terminals. Mapping reused verbatim from the old PipelinePanel —
   Closed aggregates four states (incl. R&R, which is not a visible stage here). */
const STAGES: Stage[] = [
  { status: QueryStatus.QUERIED, agg: [QueryStatus.QUERIED], sing: "queried", plur: "queried" },
  { status: QueryStatus.PARTIAL_REQUESTED, agg: [QueryStatus.PARTIAL_REQUESTED], sing: "partial requested", plur: "partials requested" },
  { status: QueryStatus.PARTIAL_SENT, agg: [QueryStatus.PARTIAL_SENT], sing: "partial sent", plur: "partials sent" },
  { status: QueryStatus.FULL_REQUESTED, agg: [QueryStatus.FULL_REQUESTED], sing: "full requested", plur: "fulls requested" },
  { status: QueryStatus.FULL_SENT, agg: [QueryStatus.FULL_SENT], sing: "full sent", plur: "fulls sent" },
  { status: QueryStatus.OFFER, agg: [QueryStatus.OFFER], sing: "offer", plur: "offers" }, // terminal: upper branch
  {
    status: QueryStatus.REJECTED, // terminal: lower branch
    agg: [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.REVISE_RESUBMIT],
    sing: "closed",
    plur: "closed",
  },
];
const OFFER = 5;
const CLOSED = 6;

/** "queried"/"closed" never inflect; the others pluralise the leading noun at count !== 1. */
const caption = (count: number, s: Stage) => `${count} ${count === 1 ? s.sing : s.plur}`;

// Timing — matches the sketch.
const DWELL = 2100;
const GAP = 320;
const REST = 1700;
const GLIDE_PER_COL = 1300; // ms per spine step (speed = step / 1300)
const PEEK_BEFORE = 650; // begin empty-stage bloom this long before the pulse passes
const PEEK_AFTER = 520; // linger this long after passing, then ease out

// Geometry (proportions of the strip width W, recomputed on resize).
const DOT = 20;
const R = DOT / 2;
const CGAP = 8; // dot → caption gap
const PAD_L = 11; // first spine node centre x (its dot's left edge ≈ hero content-left)
const SPINE_END = 0.58; // last spine node at 0.58·W
const FORK = 0.7; // fork junction at 0.70·W
const TERM = 0.87; // terminals at 0.87·W
const SPLAY = 26; // terminal vertical offset from the spine
const SPINE_Y = 58;
const H = 116; // block height: spine ± splay + caption reserve above Offer / below Closed

interface Geom {
  xs: number[]; // 5 spine node centre x's
  xf: number; // fork x
  offer: { x: number; y: number };
  closed: { x: number; y: number };
  step: number; // spine column spacing
}
const geomFor = (W: number): Geom | null => {
  if (!W) return null;
  const xs = [0, 1, 2, 3, 4].map((i) => PAD_L + (SPINE_END * W - PAD_L) * (i / 4));
  const xf = FORK * W;
  const xt = TERM * W;
  return { xs, xf, offer: { x: xt, y: SPINE_Y - SPLAY }, closed: { x: xt, y: SPINE_Y + SPLAY }, step: xs[1] - xs[0] };
};

/** Node centre (x, y) for each stage index. */
const nodePos = (g: Geom, i: number): { x: number; y: number } =>
  i < 5 ? { x: g.xs[i], y: SPINE_Y } : i === OFFER ? g.offer : g.closed;

const captBase: React.CSSProperties = {
  position: "absolute",
  fontFamily: FONT_MONO,
  fontSize: 8,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  whiteSpace: "nowrap",
};
/** Caption placement is relative to the node box (DOT×DOT): Queried left-aligned under its dot,
 *  spine middles centred, terminals right-aligned (Offer above, Closed below). */
const captStyle = (i: number, populated: boolean): React.CSSProperties => {
  const color = populated ? burgundy : "#aaa093";
  if (i === 0) return { ...captBase, color, left: 0, top: DOT + CGAP, textAlign: "left" };
  if (i < 5) return { ...captBase, color, left: R, top: DOT + CGAP, transform: "translateX(-50%)", textAlign: "center" };
  if (i === OFFER) return { ...captBase, color, right: 0, bottom: DOT + CGAP, textAlign: "right" };
  return { ...captBase, color, right: 0, top: DOT + CGAP, textAlign: "right" }; // Closed
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

  const g = useMemo(() => geomFor(W), [W]);

  useEffect(() => {
    if (isZero || !g) return; // zero-state: quiet ghost spine+fork, no tour
    const box = boxRef.current;
    if (!box) return;
    const nodes = Array.from(box.querySelectorAll<HTMLElement>(".hf-node"));
    if (nodes.length < 7) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Static legible version: every count shown; empty stages reveal ghost + "0 …" caption.
      nodes.forEach((node, i) => {
        if (counts[i] > 0) node.querySelector(".hf-capt")?.classList.add("show");
        else node.classList.add("peek");
      });
      return;
    }

    const spineP = box.querySelector<HTMLElement>(".hf-pulse.spine");
    const offerP = box.querySelector<HTMLElement>(".hf-pulse.offer");
    const closedP = box.querySelector<HTMLElement>(".hf-pulse.closed");
    if (!spineP || !offerP || !closedP) return;

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
    const place = (el: HTMLElement, x: number, y: number) => {
      el.style.transition = "none";
      el.style.transform = `translate(${x - 4.5}px, ${y - 4.5}px)`;
      void el.offsetWidth;
      el.style.transition = "";
    };
    const move = (el: HTMLElement, x: number, y: number, dur: number) => {
      el.style.transition = `transform ${dur}ms linear, opacity 0.4s`;
      el.style.transform = `translate(${x - 4.5}px, ${y - 4.5}px)`;
    };
    const show = (el: HTMLElement) => { el.style.opacity = "1"; };
    const hide = (el: HTMLElement) => { el.style.opacity = "0"; };

    const speed = g.step / GLIDE_PER_COL; // px per ms

    // Glide the spine pulse horizontally, blooming any empty spine nodes it passes.
    const glideSpine = async (fromX: number, toX: number) => {
      const dist = toX - fromX;
      if (dist <= 1) return;
      const dur = dist / speed;
      for (let i = 0; i < 5; i++) {
        if (counts[i] !== 0) continue;
        const xc = g.xs[i];
        if (xc > fromX + 1 && xc <= toX + 1) {
          const t = (xc - fromX) / speed;
          const a = setTimeout(() => { timers.delete(a); nodes[i].classList.add("peek"); }, Math.max(0, t - PEEK_BEFORE));
          const b = setTimeout(() => { timers.delete(b); nodes[i].classList.remove("peek"); }, t + PEEK_AFTER);
          timers.add(a); timers.add(b);
        }
      }
      move(spineP, toX, SPINE_Y, dur);
      await wait(dur);
      for (let i = 0; i < 5; i++) if (counts[i] === 0) nodes[i].classList.remove("peek");
    };

    const dwell = async (i: number) => {
      const wrap = nodes[i].querySelector<HTMLElement>(".hf-dotwrap");
      if (wrap) { wrap.classList.remove("pulsing"); void wrap.offsetWidth; wrap.classList.add("pulsing"); }
      const capt = nodes[i].querySelector(".hf-capt");
      capt?.classList.add("show");
      await wait(DWELL);
      capt?.classList.remove("show");
      await wait(GAP);
    };

    const resolveTerminal = (i: number) => {
      if (counts[i] > 0) {
        const wrap = nodes[i].querySelector<HTMLElement>(".hf-dotwrap");
        if (wrap) { wrap.classList.remove("pulsing"); void wrap.offsetWidth; wrap.classList.add("pulsing"); }
        nodes[i].querySelector(".hf-capt")?.classList.add("show");
      } else {
        nodes[i].classList.add("peek"); // bloom ghost + greyed "0 …" caption
      }
    };
    const clearTerminal = (i: number) => {
      nodes[i].querySelector(".hf-capt")?.classList.remove("show");
      nodes[i].classList.remove("peek");
    };

    const branchLen = Math.hypot(g.offer.x - g.xf, SPLAY);
    const branchDur = branchLen / speed;
    const startX = g.xs[0] - g.step / 2;

    (async () => {
      while (!cancelled) {
        await waitVisible();
        if (cancelled) break;
        if (g.step <= 0) { await wait(200); continue; }

        hide(spineP); hide(offerP); hide(closedP);
        place(spineP, startX, SPINE_Y);
        await wait(700);
        if (cancelled) break;
        show(spineP);
        await wait(300);

        // Spine: stop on populated stages (dwell); empties bloom as the pulse passes.
        let cur = startX;
        for (let i = 0; i < 5; i++) {
          if (counts[i] === 0) continue;
          await glideSpine(cur, g.xs[i]);
          cur = g.xs[i];
          if (cancelled) break;
          await dwell(i);
          if (cancelled) break;
        }
        if (cancelled) break;
        await glideSpine(cur, g.xf); // reach the fork (blooms any trailing empty spine nodes)
        hide(spineP);

        // Fork: split into two pulses travelling both branches at once.
        place(offerP, g.xf, SPINE_Y); place(closedP, g.xf, SPINE_Y);
        show(offerP); show(closedP);
        move(offerP, g.offer.x, g.offer.y, branchDur);
        move(closedP, g.closed.x, g.closed.y, branchDur);
        await wait(branchDur);
        if (cancelled) break;

        resolveTerminal(OFFER); resolveTerminal(CLOSED);
        if (counts[OFFER] === 0) hide(offerP);
        if (counts[CLOSED] === 0) hide(closedP);
        await wait(DWELL);
        clearTerminal(OFFER); clearTerminal(CLOSED);
        hide(offerP); hide(closedP);

        await wait(GAP);
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
      {g && (
        <>
          {/* dashed spine + two branch tracks, with the small fork-junction dot */}
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 1, overflow: "visible" }}>
            <g stroke={burgundy} strokeWidth={1.5} strokeOpacity={0.2} strokeDasharray="4 7" strokeLinecap="round" fill="none">
              <line x1={g.xs[0]} y1={SPINE_Y} x2={g.xf} y2={SPINE_Y} />
              <line x1={g.xf} y1={SPINE_Y} x2={g.offer.x} y2={g.offer.y} />
              <line x1={g.xf} y1={SPINE_Y} x2={g.closed.x} y2={g.closed.y} />
            </g>
            <circle cx={g.xf} cy={SPINE_Y} r={2} fill={burgundy} fillOpacity={0.55} />
          </svg>

          {!isZero && (
            <>
              <div className="hf-pulse spine" />
              <div className="hf-pulse offer" />
              <div className="hf-pulse closed" />
            </>
          )}

          {STAGES.map((s, i) => {
            const { x, y } = nodePos(g, i);
            const populated = counts[i] > 0;
            return (
              <div key={i} className={`hf-node${populated ? "" : " empty"}`} style={{ position: "absolute", left: x - R, top: y - R, width: DOT, height: DOT, zIndex: 3 }}>
                {populated ? (
                  <span className="hf-dotwrap">
                    <StatusDot status={s.status} size={DOT} />
                  </span>
                ) : (
                  // Zero-state shows ghosts quietly (no .hf-ghost hide class); the tour keeps it.
                  <StatusDot status={s.status} size={DOT} ghost className={isZero ? undefined : "hf-ghost"} />
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
