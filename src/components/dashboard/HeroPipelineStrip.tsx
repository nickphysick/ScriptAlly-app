/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hero pipeline strip — the animated AGGREGATE querying tour that lives in the dashboard hero
 * (in the slot the author quote used to occupy). One row sums every query across every
 * manuscript into seven stages; a single travelling pulse dwells on populated stages (pulsing
 * the representative StatusDot and naming the count) and glides through empty stages whose
 * muted ghost dot + greyed caption bloom as it passes. Behaviour/timing match
 * scriptally-journey-hero-v6behaviour.html (derived from scriptally-pipeline-tour-v6.html);
 * animation mechanics are reused from the shared pipeline.css (scoped under .sa-pipeline).
 *
 * The column → QueryStatus mapping is reused verbatim from the removed PipelinePanel — Closed
 * aggregates Rejected / Withdrawn / No Response / Revise & Resubmit (the parked R&R-in-Closed
 * behaviour is preserved as-is, not corrected here).
 *
 * One representative dot per stage (not a per-query cluster). Fully disabled under
 * prefers-reduced-motion (static, legible row with every count shown). Zero-state (0 queries
 * across the account) renders a quiet strip of seven visible ghost stages — no tour, no
 * captions; the hero supplies the "your journey starts here" heading in that case.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { Query, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { burgundy, FONT_MONO } from "../../lib/designTokens";
import "./pipeline.css";

interface Stage {
  status: QueryStatus; // representative status drawn as the stage's dot / empty ghost
  agg: QueryStatus[]; // statuses this stage counts
  sing: string;
  plur: string;
}

/* Reused verbatim from the old PipelinePanel — Closed aggregates four states (incl. R&R). */
const STAGES: Stage[] = [
  { status: QueryStatus.QUERIED, agg: [QueryStatus.QUERIED], sing: "queried", plur: "queried" },
  { status: QueryStatus.PARTIAL_REQUESTED, agg: [QueryStatus.PARTIAL_REQUESTED], sing: "partial requested", plur: "partials requested" },
  { status: QueryStatus.PARTIAL_SENT, agg: [QueryStatus.PARTIAL_SENT], sing: "partial sent", plur: "partials sent" },
  { status: QueryStatus.FULL_REQUESTED, agg: [QueryStatus.FULL_REQUESTED], sing: "full requested", plur: "fulls requested" },
  { status: QueryStatus.FULL_SENT, agg: [QueryStatus.FULL_SENT], sing: "full sent", plur: "fulls sent" },
  { status: QueryStatus.OFFER, agg: [QueryStatus.OFFER], sing: "offer", plur: "offers" },
  {
    status: QueryStatus.REJECTED,
    agg: [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE, QueryStatus.REVISE_RESUBMIT],
    sing: "closed",
    plur: "closed",
  },
];

/** "queried"/"closed" never inflect; the others pluralise the leading noun at count !== 1. */
const caption = (count: number, s: Stage) => `${count} ${count === 1 ? s.sing : s.plur}`;

// Timing — matches the sketch (and the old PipelinePanel).
const DWELL = 2100;
const GAP = 320;
const REST = 1700;
const GLIDE_PER_COL = 1300; // ms per column of travel (speed = columnSpacing / 1300)
const PEEK_BEFORE = 650; // begin empty-stage bloom this long before the pulse arrives
const PEEK_AFTER = 520; // linger this long after passing, then ease out

const DOT = 18; // representative dot size (hero focal element)

const captStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 8,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};

export interface HeroPipelineStripProps {
  queries: Query[];
}

export const HeroPipelineStrip: React.FC<HeroPipelineStripProps> = ({ queries }) => {
  const psRef = useRef<HTMLDivElement>(null);

  // Aggregate counts across the whole account (each query falls in exactly one stage).
  const counts = useMemo(
    () => STAGES.map((s) => queries.filter((q) => s.agg.includes(q.status)).length),
    [queries]
  );
  const isZero = counts.reduce((a, b) => a + b, 0) === 0;
  const countsKey = counts.join(",");

  useEffect(() => {
    if (isZero) return; // zero-state: quiet ghost strip, no tour
    const ps = psRef.current;
    if (!ps) return;
    const cells = Array.from(ps.querySelectorAll<HTMLElement>(".sa-cell"));
    if (cells.length < 7) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Static legible row: every count shown; empty stages reveal their ghost + "0 …" caption.
      cells.forEach((cell, i) => {
        if (counts[i] > 0) cell.querySelector(".sa-capt")?.classList.add("show");
        else cell.classList.add("peek");
      });
      return;
    }

    const pulse = ps.querySelector<HTMLElement>(".sa-pulse");
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
    const waitVisible = () =>
      visible ? Promise.resolve() : new Promise<void>((res) => resumeWaiters.push(res));

    // Pause the loop while the hero is off-screen; resume on re-entry.
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
    io.observe(ps);

    const cx = (i: number) => cells[i].offsetLeft + cells[i].offsetWidth / 2;
    const pop = counts.map((_, i) => i).filter((i) => counts[i] > 0);

    const glide = async (fromX: number, toX: number, speed: number) => {
      const dist = toX - fromX;
      if (dist <= 1) return;
      const dur = dist / speed;
      // Bloom each empty stage the pulse will pass: peek in ~650ms before, out ~520ms after.
      counts.forEach((c, i) => {
        if (c !== 0) return;
        const xc = cx(i);
        if (xc > fromX + 1 && xc <= toX + 1) {
          const t = (xc - fromX) / speed;
          const a = setTimeout(() => { timers.delete(a); cells[i].classList.add("peek"); }, Math.max(0, t - PEEK_BEFORE));
          const b = setTimeout(() => { timers.delete(b); cells[i].classList.remove("peek"); }, t + PEEK_AFTER);
          timers.add(a); timers.add(b);
        }
      });
      pulse.style.transition = `left ${dur}ms linear, opacity .6s`;
      pulse.style.left = `${toX}px`;
      await wait(dur);
      cells.forEach((cell, i) => { if (counts[i] === 0) cell.classList.remove("peek"); });
    };

    const dwell = async (i: number) => {
      const wrap = cells[i].querySelector<HTMLElement>(".sa-dotwrap");
      if (wrap) { wrap.classList.remove("pulsing"); void wrap.offsetWidth; wrap.classList.add("pulsing"); }
      const capt = cells[i].querySelector(".sa-capt");
      capt?.classList.add("show");
      await wait(DWELL);
      capt?.classList.remove("show");
      await wait(GAP);
    };

    (async () => {
      while (!cancelled) {
        await waitVisible();
        if (cancelled) break;

        const span = cx(1) - cx(0);
        if (!span || span <= 0) { await wait(200); continue; } // not laid out yet / hidden

        const speed = span / GLIDE_PER_COL;
        const startX = cx(0) - span / 2;
        const endX = cx(6) + span / 2;

        pulse.style.opacity = "0";
        await wait(700);
        if (cancelled) break;
        pulse.style.transition = "none";
        pulse.style.left = `${startX}px`;
        void pulse.offsetWidth;
        pulse.style.transition = "";
        pulse.style.opacity = "1";
        await wait(300);

        let cur = startX;
        for (const p of pop) {
          if (cancelled) break;
          await glide(cur, cx(p), speed);
          cur = cx(p);
          await dwell(p);
        }
        if (cancelled) break;
        await glide(cur, endX, speed);
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
  }, [countsKey, isZero]);

  return (
    <div className="sa-pipeline" style={{ width: "100%", maxWidth: 780 }}>
      {/* caption drop-zone reserved beneath the dots so fades never shift layout */}
      <div style={{ paddingBottom: 30 }}>
        <div ref={psRef} className="sa-pstatus" style={{ flex: "none" }}>
          <div className="sa-track" />
          {!isZero && <div className="sa-pulse" />}
          {STAGES.map((s, i) => {
            const c = counts[i];
            const populated = c > 0;
            return (
              <div className={`sa-cell${populated ? "" : " empty"}`} key={i}>
                {populated ? (
                  <span className="sa-dotwrap">
                    <StatusDot status={s.status} size={DOT} />
                  </span>
                ) : (
                  // Zero-state shows the ghosts quietly (no .sa-ghost hide class); the tour
                  // hides them until they bloom, so it keeps the class.
                  <StatusDot status={s.status} size={DOT} ghost className={isZero ? undefined : "sa-ghost"} />
                )}
                {!isZero && (
                  <span className="sa-capt" style={{ ...captStyle, color: populated ? burgundy : "#aaa093" }}>
                    {caption(c, s)}
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
