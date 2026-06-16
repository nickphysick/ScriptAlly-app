/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Animated "Query pipeline" panel. Replaces the old sage-band + seven-column-label header
 * with a quiet always-on tour: a soft light drifts left→right across each manuscript's
 * status row, dwelling on populated stages (pulsing their StatusDots + naming the count)
 * and gliding through empty stages whose greyed "would-be" StatusDot + label bloom in
 * passing. Behaviour/timing match scriptally-pipeline-tour-v6.html.
 *
 * Data is read-only: each stage's count comes from the manuscript's queries via the same
 * column→QueryStatus mapping the old panel used (Closed aggregates Rejected / Withdrawn /
 * No Response / Revise & Resubmit). The animation is pure DOM/CSS (no React re-renders per
 * frame); it pauses off-screen and is fully disabled under prefers-reduced-motion.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { Manuscript, Query, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import {
  parchment,
  burgundy,
  headingInk,
  mutedInk,
  FONT_SERIF,
  FONT_MONO,
} from "../../lib/designTokens";
import "./pipeline.css";

/* Column model — order, the representative status for the ghost glyph, the aggregated
   statuses counted in the column, and the caption nouns. Closed aggregates four states. */
interface Stage {
  status: QueryStatus; // representative status drawn as the empty-stage ghost
  agg: QueryStatus[]; // statuses this column counts
  sing: string;
  plur: string;
}
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

const caption = (count: number, s: Stage) => `${count} ${count === 1 ? s.sing : s.plur}`;

// Timing — matches the sketch.
const DWELL = 2100;
const GAP = 320;
const REST = 1700;
const GLIDE_PER_COL = 1300; // ms per column of travel (SPEED = columnSpacing / 1300)
const PEEK_BEFORE = 650; // begin empty-stage bloom this long before the pulse arrives
const PEEK_AFTER = 520; // linger this long after passing, then ease out

const captStyle: React.CSSProperties = {
  fontFamily: FONT_MONO,
  fontSize: 8,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
};

const PipelineRow: React.FC<{ manuscript: Manuscript; queries: Query[] }> = ({ manuscript, queries }) => {
  const psRef = useRef<HTMLDivElement>(null);

  // Per-stage query lists (populated cells render one real StatusDot per query).
  const lists = useMemo(() => {
    const mq = queries.filter((q) => q.manuscriptId === manuscript.id);
    return STAGES.map((s) => mq.filter((q) => s.agg.includes(q.status)));
  }, [queries, manuscript.id]);
  const counts = lists.map((l) => l.length);
  const countsKey = counts.join(",");

  useEffect(() => {
    const ps = psRef.current;
    if (!ps) return;
    const cells = Array.from(ps.querySelectorAll<HTMLElement>(".sa-cell"));
    if (cells.length < 7) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      // Static legible panel: populated captions always visible; empties stay hover-only.
      cells.forEach((cell, i) => {
        if (counts[i] > 0) cell.querySelector(".sa-capt")?.classList.add("show");
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

    // Pause the loop while the row is off-screen; resume on re-entry.
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
  }, [countsKey]);

  return (
    <div className="sa-prow">
      <div className="sa-plabel">
        <div className="truncate" style={{ fontFamily: FONT_SERIF, fontSize: 16, color: headingInk }} title={manuscript.title}>
          {manuscript.title}
        </div>
        <div className="truncate" style={{ fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: "0.07em", textTransform: "uppercase", color: mutedInk, marginTop: 3 }}>
          {manuscript.genre} · {manuscript.wordCount?.toLocaleString() || 0}
        </div>
      </div>

      <div className="sa-pstatus" ref={psRef}>
        <div className="sa-track" />
        <div className="sa-pulse" />
        {STAGES.map((s, i) => {
          const list = lists[i];
          const pop = list.length > 0;
          return (
            <div className={`sa-cell${pop ? "" : " empty"}`} key={i}>
              {pop ? (
                <span className="sa-dotwrap">
                  {list.map((q) => (
                    <StatusDot key={q.id} status={q.status} size={16} />
                  ))}
                </span>
              ) : (
                <StatusDot status={s.status} size={16} ghost className="sa-ghost" />
              )}
              <span
                className="sa-capt"
                style={{ ...captStyle, color: pop ? burgundy : "#aaa093" }}
              >
                {caption(counts[i], s)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface PipelinePanelProps {
  manuscripts: Manuscript[];
  queries: Query[];
}

export const PipelinePanel: React.FC<PipelinePanelProps> = ({ manuscripts, queries }) => (
  <div
    id="query-status-breakdown-card"
    className="sa-pipeline"
    style={{
      position: "relative",
      background: parchment,
      borderRadius: 14,
      boxShadow: "0 1px 3px rgba(40,22,14,.08), 0 6px 20px rgba(40,22,14,.12)",
      overflow: "hidden",
    }}
  >
    {/* signature inset mount frame */}
    <div aria-hidden="true" style={{ position: "absolute", inset: 6, border: "1px solid rgba(124,58,42,0.28)", borderRadius: 10, pointerEvents: "none", zIndex: 3 }} />

    {/* subtle title — short burgundy rule + muted Playfair, no band */}
    <div style={{ position: "relative", zIndex: 2, padding: "16px 22px 0", display: "flex", alignItems: "center", gap: 10 }}>
      <span aria-hidden="true" style={{ width: 2.5, height: 14, background: burgundy, borderRadius: 2, opacity: 0.7, flexShrink: 0 }} />
      <span style={{ fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 500, color: headingInk, opacity: 0.82 }}>Query pipeline</span>
    </div>

    <div style={{ position: "relative", zIndex: 2 }}>
      {manuscripts.map((m) => (
        <PipelineRow key={m.id} manuscript={m} queries={queries} />
      ))}
      {manuscripts.length === 0 && (
        <div className="p-8 text-center text-xs italic" style={{ color: "rgba(58,28,20,0.4)" }}>
          Get started by creating your very first manuscript structure!
        </div>
      )}
    </div>
  </div>
);
