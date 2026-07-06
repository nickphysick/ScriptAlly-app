/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fortnight in focus — floating depth carousel. 15 day cards (last week → today → next week)
 * sitting directly on the page background, centred on Today, receding in depth (scale + drift +
 * blur + fade) either side. Replaces the FortnightInFocus panel; the event feed is the same
 * derived model, re-housed unchanged in fortnightEvents.ts.
 *
 * Mockup (single source of truth for visual values): scriptally-fortnight-depth-themes.html.
 * All falloff maths mirror it: t = normalised distance of card centre from strip centre, then
 * scale 1−t·0.34, drift −sign·t·46px, translateZ −t·220px (wrapper perspective 900px),
 * opacity 1−t·0.70, blur (t²·2.2)px, z-index descending, lift shadow at t < 0.10.
 *
 * Realised activities render the shared StatusDot (locked component); forward-looking reminders
 * (nudge due / materials due / response window closes) render the local dashed clock ring —
 * reminder states must never be added to StatusDot.
 */
import React, { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback } from "react";
import { QueryStatus, Query, Agent, Manuscript, Activity } from "../../types";
import { StatusDot } from "../StatusDot";
import { UserRound, BookOpen } from "lucide-react";
import {
  FEvent,
  REMINDER_TYPES,
  FORTNIGHT_PAST_DAYS,
  FORTNIGHT_FUTURE_DAYS,
  FORTNIGHT_TODAY_IDX,
  MONTHS,
  deriveFortnightEvents,
  groupFortnightEvents,
  startOfDay,
  dayDiff,
  dayKey,
  fmtDayMonth,
} from "./fortnightEvents";
import "./fortnightCarousel.css";

const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_COUNT = FORTNIGHT_PAST_DAYS + 1 + FORTNIGHT_FUTURE_DAYS;

/* Falloff constants — mockup values, one source for the rAF pass below. */
const FALL_SCALE = 0.34;
const FALL_DRIFT_PX = 46;
const FALL_Z_PX = 220;
const FALL_FADE = 0.7;
const FALL_BLUR_PX = 2.2;
const LIFT_T = 0.1;

const clockGlyph = (
  <svg viewBox="0 0 10 10" fill="none" strokeWidth={1.4} strokeLinecap="round" aria-hidden="true">
    <circle cx="5" cy="5" r="3.6" />
    <path d="M5 3.2V5l1.3 1" />
  </svg>
);

/** Row marker: reminder ring for due-semantics types; the real StatusDot for realised activities
 *  ("Query sent" draws the Queried dot — the mockup's out-arrow is a stand-in for it); themed
 *  lucide glyphs for the two entity-added markers, which carry no query status. */
const rowGlyph = (ev: FEvent) => {
  if (REMINDER_TYPES.has(ev.type)) return <span className="fcar-rem">{clockGlyph}</span>;
  if (ev.type === "sent") return <StatusDot status={QueryStatus.QUERIED} overrideSize={13} decorative />;
  if (ev.marker.kind === "status") return <StatusDot status={ev.marker.status} overrideSize={13} decorative />;
  const Icon = ev.marker.icon === "agent" ? UserRound : BookOpen;
  return <Icon className="fcar-entity" style={{ width: 13, height: 13 }} strokeWidth={2} aria-hidden="true" />;
};

const EventRow: React.FC<{ ev: FEvent }> = ({ ev }) => (
  <div className="fcar-evrow">
    {rowGlyph(ev)}
    <div className="fcar-tx">
      <div className="fcar-l1">{ev.line}</div>
      <div className="fcar-l2">
        {ev.title}
        {ev.agency ? ` · ${ev.agency}` : ""}
      </div>
    </div>
  </div>
);

const usePrefersReducedMotion = () => {
  const [reduce, setReduce] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    const f = () => setReduce(m.matches);
    m.addEventListener("change", f);
    return () => m.removeEventListener("change", f);
  }, []);
  return reduce;
};

export interface FortnightCarouselProps {
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  activities: Activity[];
}

export const FortnightCarousel: React.FC<FortnightCarouselProps> = ({ queries, agents, manuscripts, activities }) => {
  const reduce = usePrefersReducedMotion();
  const today = useMemo(() => startOfDay(new Date()), []);

  const days = useMemo(() => {
    const arr: Date[] = [];
    for (let i = -FORTNIGHT_PAST_DAYS; i <= FORTNIGHT_FUTURE_DAYS; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [today]);

  const events = useMemo(
    () => deriveFortnightEvents(queries, agents, manuscripts, activities, today),
    [queries, agents, manuscripts, activities, today]
  );
  const { byDay, lastWeekCount, comingUpCount } = useMemo(() => groupFortnightEvents(events, today), [events, today]);
  const eventsOn = useCallback((d: Date) => byDay.get(dayKey(d)) ?? [], [byDay]);

  // Compact within-month range ("9–23 Jun"); long form across a month boundary.
  const rangeLabel = days[0].getMonth() === days[DAY_COUNT - 1].getMonth()
    ? `${days[0].getDate()}–${days[DAY_COUNT - 1].getDate()} ${MONTHS[days[DAY_COUNT - 1].getMonth()]}`
    : `${fmtDayMonth(days[0])} – ${fmtDayMonth(days[DAY_COUNT - 1])}`;

  // ── Depth falloff + centring ─────────────────────────────────────────────────
  const stripRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const rafRef = useRef(0);
  const centredIdx = useRef(FORTNIGHT_TODAY_IDX);

  const falloff = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    let nearest = 0, nearestDist = Infinity;
    cardRefs.current.forEach((c, i) => {
      if (!c) return;
      const r = c.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const dist = Math.abs(cx - mid);
      if (dist < nearestDist) { nearestDist = dist; nearest = i; }
      const t = Math.min(dist / (rect.width * 0.55), 1);
      const sign = Math.sign(cx - mid) || 1;
      const scale = 1 - t * FALL_SCALE;
      const pull = -sign * t * FALL_DRIFT_PX;
      const z = -t * FALL_Z_PX;
      c.style.transform = `translateX(${pull}px) translateZ(${z}px) scale(${scale})`;
      c.style.opacity = String(1 - t * FALL_FADE);
      c.style.filter = reduce ? "" : `blur(${(t * t * FALL_BLUR_PX).toFixed(2)}px)`;
      c.style.boxShadow = t < LIFT_T ? "var(--fc-shadow-lift)" : "var(--fc-shadow-float)";
      c.style.zIndex = String(100 - Math.round(t * 90));
    });
    centredIdx.current = nearest;
  }, [reduce]);

  const scheduleFalloff = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      falloff();
    });
  }, [falloff]);

  /** Centre a card by scrollLeft arithmetic, not scrollIntoView — the stage is the app's scroll
   *  container and scrollIntoView could scroll it vertically; offsetLeft also ignores the falloff
   *  transforms, so centring stays exact on already-drifted cards. */
  const centreCard = useCallback((idx: number, smooth: boolean) => {
    const clamped = Math.max(0, Math.min(DAY_COUNT - 1, idx));
    const strip = stripRef.current;
    const card = cardRefs.current[clamped];
    if (!strip || !card) return;
    const left = card.offsetLeft + card.offsetWidth / 2 - strip.clientWidth / 2;
    strip.scrollTo({ left, behavior: smooth && !reduce ? "smooth" : "auto" });
  }, [reduce]);

  // Mount: today centred instantly, falloff applied (second pass once layout fully settles).
  useLayoutEffect(() => {
    centreCard(FORTNIGHT_TODAY_IDX, false);
    falloff();
    const t = window.setTimeout(falloff, 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute on any strip resize (window, rail pin/peek, column changes) + drop any pending frame.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const ro = new ResizeObserver(scheduleFalloff);
    ro.observe(strip);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [scheduleFalloff]);

  const onStripKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); centreCard(centredIdx.current - 1, true); }
    else if (e.key === "ArrowRight") { e.preventDefault(); centreCard(centredIdx.current + 1, true); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section className="fcar" aria-label="Fortnight in focus">
      <div className="fcar-head">
        <div className="fcar-head-left">
          <span className="fcar-bar" aria-hidden="true" />
          <h2 className="fcar-title">Fortnight in focus</h2>
        </div>
        <div className="fcar-meta">
          <span><b>{lastWeekCount}</b> event{lastWeekCount === 1 ? "" : "s"} last week</span>
          <span aria-hidden="true">·</span>
          <span><b>{comingUpCount}</b> coming up</span>
          <span aria-hidden="true">·</span>
          <span>{rangeLabel}</span>
        </div>
      </div>

      <div className="fcar-wrap">
        <div
          ref={stripRef}
          className="fcar-strip"
          role="region"
          aria-roledescription="carousel"
          aria-label="Fortnight day carousel — use the left and right arrow keys to move by a day"
          tabIndex={0}
          onScroll={scheduleFalloff}
          onKeyDown={onStripKeyDown}
        >
          {days.map((d, i) => {
            const evs = eventsOn(d);
            const isToday = i === FORTNIGHT_TODAY_IDX;
            const aria = `${d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}${isToday ? ", today" : ""} — ${evs.length === 0 ? "no events" : `${evs.length} event${evs.length === 1 ? "" : "s"}`}`;
            return (
              <article
                key={dayKey(d)}
                ref={(el) => { cardRefs.current[i] = el; }}
                className={`fcar-card${isToday ? " is-today" : ""}`}
                aria-label={aria}
                aria-current={isToday ? "date" : undefined}
                onClick={() => centreCard(i, true)}
              >
                <div className="fcar-dh">
                  <span className="fcar-dow">{isToday ? "Today" : DOWS[d.getDay()]}</span>
                  <span className="fcar-dnum">{d.getDate()} {MONTHS[d.getMonth()]}</span>
                </div>
                {evs.length > 0 ? (
                  <div className="fcar-evs">
                    {evs.map((ev) => <EventRow key={ev.id} ev={ev} />)}
                  </div>
                ) : isToday ? (
                  <div className="fcar-qwrap">
                    <div style={{ textAlign: "center" }}>
                      <div className="fcar-quiet">Nothing due today.</div>
                      {comingUpCount > 0 && (
                        <div className="fcar-hint" style={{ marginTop: 10 }}>
                          {comingUpCount} event{comingUpCount === 1 ? "" : "s"} this week →
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="fcar-qwrap">
                    <div className="fcar-quiet">A quiet day.</div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>

      <div className="fcar-foot">
        <button type="button" className="fcar-todaybtn" onClick={() => centreCard(FORTNIGHT_TODAY_IDX, true)}>
          ↺ Back to today
        </button>
      </div>
    </section>
  );
};
