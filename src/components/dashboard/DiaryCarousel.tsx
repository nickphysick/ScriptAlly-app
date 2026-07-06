/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "What's in the diary?" — floating depth carousel (clean-gaps mode). 15 day cards
 * (last week → today → next week) on a full-bleed strip, no panel shell, centred on a large
 * "Today" card, receding in depth (scale + fade + blur + z-recession) with clean 30px gaps and
 * NO overlap/drift. Replaces the Fortnight panel; the event feed is the same derived model,
 * re-housed unchanged in fortnightEvents.ts (a fortnight window is what it derives).
 *
 * Mockup (single source of truth): scriptally-diary-layout.html, "Clean gaps · focus +15%" mode.
 * Falloff mirrors it: t = |card centre − strip centre| / (stripWidth·0.5), clamped 0→1; then
 * scale 1.15−t·0.55, translateZ −t·190px (wrapper perspective 1000px), opacity 1−t·0.72,
 * blur (t²·2)px, z-index descending, lift shadow at t < 0.10. No horizontal drift — cards keep
 * their gap positions. The same pass toggles the floating Back-to-today pill (shown off-today).
 *
 * Full-bleed: the strip runs wider than the dashboard content column while the focus card stays
 * centred over it. A naive 100vw would scroll the stage (overflow-x coerces to auto), so the wrap
 * is sized to the stage's content box in JS (setBleed).
 *
 * Realised activities render the shared StatusDot (locked); forward-looking reminders draw the
 * local dashed clock ring — reminder states must never be added to StatusDot.
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
  dayKey,
} from "./fortnightEvents";
import "./diaryCarousel.css";

const DOWS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_COUNT = FORTNIGHT_PAST_DAYS + 1 + FORTNIGHT_FUTURE_DAYS;
/** The app scroll container (AppShell STAGE_SCROLL_ID) — the box the full-bleed strip spans. */
const STAGE_ID = "app-stage-scroll";

/* Falloff constants — "Clean gaps · focus +15%" mockup values, one source for the rAF pass. */
const FOCUS_SCALE = 1.15;
const EDGE_DROP = 0.55; // scale 1.15 − t·0.55 → edge cards ~0.6
const FALL_Z_PX = 190;
const FALL_FADE = 0.72;
const FALL_BLUR_PX = 2;
const LIFT_T = 0.1;
const T_SPAN = 0.5; // t normalises over half the strip width

const clockGlyph = (
  <svg viewBox="0 0 10 10" fill="none" strokeWidth={1.4} strokeLinecap="round" aria-hidden="true">
    <circle cx="5" cy="5" r="3.6" />
    <path d="M5 3.2V5l1.3 1" />
  </svg>
);

/** Row marker: reminder ring for due-semantics types; the real StatusDot for realised activities
 *  ("Query sent" draws the Queried dot); themed lucide glyphs for the two entity-added markers,
 *  which carry no query status. */
const rowGlyph = (ev: FEvent) => {
  if (REMINDER_TYPES.has(ev.type)) return <span className="dc-rem">{clockGlyph}</span>;
  if (ev.type === "sent") return <StatusDot status={QueryStatus.QUERIED} overrideSize={13} decorative />;
  if (ev.marker.kind === "status") return <StatusDot status={ev.marker.status} overrideSize={13} decorative />;
  const Icon = ev.marker.icon === "agent" ? UserRound : BookOpen;
  return <Icon className="dc-entity" style={{ width: 13, height: 13 }} strokeWidth={2} aria-hidden="true" />;
};

const EventRow: React.FC<{ ev: FEvent }> = ({ ev }) => (
  <div className="dc-evrow">
    {rowGlyph(ev)}
    <div className="dc-tx">
      <div className="dc-l1">{ev.line}</div>
      <div className="dc-l2">
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

export interface DiaryCarouselProps {
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  activities: Activity[];
}

export const DiaryCarousel: React.FC<DiaryCarouselProps> = ({ queries, agents, manuscripts, activities }) => {
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
  // comingUpCount feeds the quiet-Today "N events this week →" hint (the heading carries no counts).
  const { byDay, comingUpCount } = useMemo(() => groupFortnightEvents(events, today), [events, today]);
  const eventsOn = useCallback((d: Date) => byDay.get(dayKey(d)) ?? [], [byDay]);

  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const rafRef = useRef(0);
  const centredIdx = useRef(FORTNIGHT_TODAY_IDX);

  // ── Full-bleed: size the wrap to the stage's content box, centred (= centred on the column) ──
  const setBleed = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const parent = wrap.parentElement;
    const stage = document.getElementById(STAGE_ID);
    if (!parent || !stage) { wrap.style.width = ""; wrap.style.marginLeft = ""; return; }
    const s = stage.getBoundingClientRect();
    const cs = getComputedStyle(stage);
    const padL = parseFloat(cs.paddingLeft || "0");
    const padR = parseFloat(cs.paddingRight || "0"); // grows when the timeline drawer opens
    const borderL = parseFloat(cs.borderLeftWidth || "0");
    // clientWidth (not rect.width) excludes the vertical scrollbar gutter — sizing to rect.width
    // overshoots by the scrollbar and re-introduces a horizontal scrollbar.
    const targetWidth = stage.clientWidth - padL - padR;
    const contentLeft = s.left + borderL + padL;
    const p = parent.getBoundingClientRect();
    if (targetWidth <= 0) return;
    // The wrap spans exactly the stage's content box, centred = the column centre; never wider than
    // the content box, so no horizontal scrollbar.
    wrap.style.width = `${targetWidth}px`;
    wrap.style.marginLeft = `${contentLeft - p.left}px`;
  }, []);

  // ── Depth falloff (mockup maths; nearest index drives the pill) ──────────────
  const falloff = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    if (rect.width <= 0) return; // unlaid-out (hidden slot / background tab) → avoid NaN transforms
    const mid = rect.left + rect.width / 2;
    let nearest = 0, nearestDist = Infinity;
    cardRefs.current.forEach((c, i) => {
      if (!c) return;
      const r = c.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const dist = Math.abs(cx - mid);
      if (dist < nearestDist) { nearestDist = dist; nearest = i; }
      const t = Math.min(dist / (rect.width * T_SPAN), 1);
      const scale = FOCUS_SCALE - t * EDGE_DROP;
      const z = -t * FALL_Z_PX;
      c.style.transform = `translateZ(${z}px) scale(${scale})`; // no horizontal drift
      c.style.opacity = String(1 - t * FALL_FADE);
      c.style.filter = reduce ? "" : `blur(${(t * t * FALL_BLUR_PX).toFixed(2)}px)`;
      c.style.boxShadow = t < LIFT_T ? "var(--dc-shadow-lift)" : "var(--dc-shadow-float)";
      c.style.zIndex = String(100 - Math.round(t * 90));
    });
    centredIdx.current = nearest;
    backBtnRef.current?.classList.toggle("show", nearest !== FORTNIGHT_TODAY_IDX);
  }, [reduce]);

  const scheduleFalloff = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      falloff();
    });
  }, [falloff]);

  /** Centre a card via scrollLeft arithmetic (not scrollIntoView — that could scroll the stage
   *  vertically; offsetLeft also ignores the falloff transforms, so centring stays exact). */
  const centreCard = useCallback((idx: number, smooth: boolean) => {
    const clamped = Math.max(0, Math.min(DAY_COUNT - 1, idx));
    const strip = stripRef.current;
    const card = cardRefs.current[clamped];
    if (!strip || !card) return;
    const left = card.offsetLeft + card.offsetWidth / 2 - strip.clientWidth / 2;
    strip.scrollTo({ left, behavior: smooth && !reduce ? "smooth" : "auto" });
  }, [reduce]);

  // Mount: bleed, then centre today instantly + falloff (retry once layout settles). A zero-width
  // strip (hidden slot / background tab) can't centre yet — the ResizeObserver below retries.
  const centredOnMount = useRef(false);
  const initIfPossible = useCallback(() => {
    setBleed();
    if (centredOnMount.current) return;
    const strip = stripRef.current;
    if (!strip || strip.clientWidth <= 0) return;
    centredOnMount.current = true;
    centreCard(FORTNIGHT_TODAY_IDX, false);
  }, [setBleed, centreCard]);

  useLayoutEffect(() => {
    initIfPossible();
    falloff();
    const t = window.setTimeout(() => { initIfPossible(); falloff(); }, 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute bleed + falloff on any strip OR stage resize (window, rail pin/peek, drawer padding,
  // hidden slot becoming visible) + drop any pending frame on unmount.
  useEffect(() => {
    const strip = stripRef.current;
    const stage = document.getElementById(STAGE_ID);
    if (!strip) return;
    const onResize = () => { initIfPossible(); scheduleFalloff(); };
    const ro = new ResizeObserver(onResize);
    ro.observe(strip);
    if (stage) ro.observe(stage);
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [initIfPossible, scheduleFalloff]);

  const onStripKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); centreCard(centredIdx.current - 1, true); }
    else if (e.key === "ArrowRight") { e.preventDefault(); centreCard(centredIdx.current + 1, true); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section className="dc" aria-labelledby="dc-heading">
      <div className="dc-head">
        <h2 className="dc-title" id="dc-heading">What’s in the diary?</h2>
        <div className="dc-rule" aria-hidden="true" />
      </div>

      <div className="dc-diary">
        <button type="button" ref={backBtnRef} className="dc-backbtn" onClick={() => centreCard(FORTNIGHT_TODAY_IDX, true)}>
          ↺ Back to today
        </button>
        <div className="dc-wrap" ref={wrapRef}>
          <div
            ref={stripRef}
            className="dc-strip"
            role="region"
            aria-roledescription="carousel"
            aria-label="Diary day carousel — use the left and right arrow keys to move by a day"
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
                  className={`dc-card${isToday ? " is-today" : ""}`}
                  aria-label={aria}
                  aria-current={isToday ? "date" : undefined}
                  onClick={() => centreCard(i, true)}
                >
                  <div className="dc-dh">
                    <span className="dc-dow">{isToday ? "Today" : DOWS[d.getDay()]}</span>
                    <span className="dc-dnum">{d.getDate()} {MONTHS[d.getMonth()]}</span>
                  </div>
                  {evs.length > 0 ? (
                    <div className="dc-evs">
                      {evs.map((ev) => <EventRow key={ev.id} ev={ev} />)}
                    </div>
                  ) : isToday ? (
                    <div className="dc-qwrap">
                      <div style={{ textAlign: "center" }}>
                        <div className="dc-quiet">Nothing due today.</div>
                        {comingUpCount > 0 && (
                          <div className="dc-hint" style={{ marginTop: 10 }}>
                            {comingUpCount} event{comingUpCount === 1 ? "" : "s"} this week →
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="dc-qwrap">
                      <div className="dc-quiet">A quiet day.</div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
