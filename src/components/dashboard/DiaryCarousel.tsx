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

/* Falloff constants — mockup scriptally-diary-lightpanel-themes.html. */
const FOCUS_SCALE = 1.16;
const EDGE_DROP = 0.56; // scale 1.16 − t·0.56 → edge cards ~0.6 (focus +16%)
const FALL_Z_PX = 180;
const FALL_FADE = 0.6; // less fade so the set reads as a set
const FALL_BLUR_PX = 1;
const LIFT_T = 0.1;
const T_SPAN = 0.5; // t normalises over half the strip width
/* Constant-gap spacing: pull each receding card inward by exactly the empty space its shrink
   created, so every rendered gap equals TARGET_GAP (replaces the uniform-gap model, whose fixed
   layout gap + centre scaling gave tight gaps mid-strip and wide gaps at the edges). */
const CARD_W = 248;
const LAYOUT_GAP = 26; // the CSS flex gap between cards
const HALF = CARD_W / 2; // 124
const TARGET_GAP = 12; // the constant rendered gap between card edges

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

  const stripRef = useRef<HTMLDivElement>(null);
  const todayBtnRef = useRef<HTMLButtonElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const rafRef = useRef(0);
  const centredIdx = useRef(FORTNIGHT_TODAY_IDX);

  // ── Depth falloff (mockup maths; nearest index drives the back-to-today button) ──────────────
  const falloff = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const rect = strip.getBoundingClientRect();
    if (rect.width <= 0) return; // unlaid-out (hidden slot / background tab) → avoid NaN transforms
    const mid = rect.left + rect.width / 2;
    const cards = cardRefs.current;
    const n = cards.length;

    // 1) scale + t per card from continuous distance; find the nearest-to-centre anchor.
    const scale = new Array<number>(n).fill(1);
    const tArr = new Array<number>(n).fill(0);
    let anchor = 0, nearestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const c = cards[i];
      if (!c) continue;
      const r = c.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const dist = Math.abs(cx - mid);
      if (dist < nearestDist) { nearestDist = dist; anchor = i; }
      const t = Math.min(dist / (rect.width * T_SPAN), 1);
      tArr[i] = t;
      scale[i] = FOCUS_SCALE - t * EDGE_DROP;
    }

    // 2) constant-gap compensation: cumulatively pull each receding card toward the anchor by the
    //    empty space its shrink created, so every rendered gap becomes TARGET_GAP. No extra drift.
    const tx = new Array<number>(n).fill(0);
    let cum = 0;
    for (let i = anchor + 1; i < n; i++) {
      const renderedGap = LAYOUT_GAP + HALF * (1 - scale[i - 1]) + HALF * (1 - scale[i]);
      cum += renderedGap - TARGET_GAP;
      tx[i] = -cum;
    }
    cum = 0;
    for (let i = anchor - 1; i >= 0; i--) {
      const renderedGap = LAYOUT_GAP + HALF * (1 - scale[i + 1]) + HALF * (1 - scale[i]);
      cum += renderedGap - TARGET_GAP;
      tx[i] = cum;
    }

    // 3) apply.
    for (let i = 0; i < n; i++) {
      const c = cards[i];
      if (!c) continue;
      const t = tArr[i];
      c.style.transform = `translateX(${tx[i].toFixed(1)}px) translateZ(${(-t * FALL_Z_PX).toFixed(0)}px) scale(${scale[i].toFixed(3)})`;
      c.style.opacity = (1 - t * FALL_FADE).toFixed(3);
      c.style.filter = reduce ? "" : `blur(${(t * t * FALL_BLUR_PX).toFixed(2)}px)`;
      c.style.boxShadow = t < LIFT_T ? "var(--dc-shadow-lift)" : "var(--dc-shadow-float)";
      c.style.zIndex = String(100 - Math.round(t * 90));
    }
    centredIdx.current = anchor;
    // back-to-today button (under the feature column): shown only when the focus isn't today
    todayBtnRef.current?.classList.toggle("show", anchor !== FORTNIGHT_TODAY_IDX);
  }, [reduce]);

  const scheduleFalloff = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      falloff();
    });
  }, [falloff]);

  /** Centre a card by measuring its TRUE rendered centre against the strip centre (Change 7):
   *  offsetLeft ignores the constant-gap tx transforms, which landed the focus card slightly off
   *  and made the reveal lopsided. Measuring getBoundingClientRect aligns the real midpoints, so
   *  the reveal is symmetric on both sides; scroll-snap then holds it. On a non-smooth call, run
   *  falloff() in the same frame so the new anchor's transforms are applied immediately. */
  const centreCard = useCallback((idx: number, smooth: boolean) => {
    const clamped = Math.max(0, Math.min(DAY_COUNT - 1, idx));
    const strip = stripRef.current;
    const card = cardRefs.current[clamped];
    if (!strip || !card) return;
    const sr = strip.getBoundingClientRect();
    if (sr.width <= 0) return; // unlaid-out (hidden slot) → skip; the ResizeObserver retries
    const cr = card.getBoundingClientRect();
    const target = strip.scrollLeft + (cr.left + cr.width / 2) - (sr.left + sr.width / 2);
    strip.scrollTo({ left: target, behavior: smooth && !reduce ? "smooth" : "auto" });
    if (!smooth) falloff();
  }, [reduce, falloff]);

  // Mount: centre today (the measure-adjust runs falloff), once more after a short delay to settle
  // a not-yet-laid-out strip (hidden StagePage slot / background tab → zero width, skipped until the
  // ResizeObserver fires with real geometry).
  useLayoutEffect(() => {
    centreCard(FORTNIGHT_TODAY_IDX, false);
    const t = window.setTimeout(() => centreCard(FORTNIGHT_TODAY_IDX, false), 80);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-centre today on any strip resize (window, rail pin, drawer, hidden slot becoming visible),
  // per Change 7 — the feature column's width drives the centring; drop any pending frame on unmount.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const onResize = () => centreCard(FORTNIGHT_TODAY_IDX, false);
    const ro = new ResizeObserver(onResize);
    ro.observe(strip);
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [centreCard]);

  const onStripKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); centreCard(centredIdx.current - 1, true); }
    else if (e.key === "ArrowRight") { e.preventDefault(); centreCard(centredIdx.current + 1, true); }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <section className="dc" aria-labelledby="dc-heading">
      {/* Light panel: the whole feature (heading + carousel) sits on one raised per-theme surface. */}
      <div className="dc-panel">
        <div className="dc-row">
          {/* Masthead heading column (1/3), left-aligned */}
          <div className="dc-headcol">
            <h2 className="dc-title" id="dc-heading">What’s going on?</h2>
            <div className="dc-rule" aria-hidden="true" />
            <p className="dc-sub">The week just gone and the week that’s coming — your fortnight in focus.</p>
          </div>

          {/* Feature column (2/3): the carousel + its back-to-today footer */}
          <div className="dc-featcol">
            <div className="dc-wrap">
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
                      <div className="dc-band">
                        <div className="dc-cband-row">
                          <span className="dc-dow">{isToday ? "Today" : DOWS[d.getDay()]}</span>
                          <span className="dc-dnum">{d.getDate()} {MONTHS[d.getMonth()]}</span>
                        </div>
                      </div>
                      <div className="dc-body">
                        {evs.length > 0 ? (
                          <div className="dc-evs">
                            {evs.map((ev) => <EventRow key={ev.id} ev={ev} />)}
                          </div>
                        ) : isToday ? (
                          <div className="dc-qwrap">
                            <div>
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
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
            {/* Reserved footer row → no jump/overlap whether or not the button shows */}
            <div className="dc-featfoot">
              <button type="button" ref={todayBtnRef} className="dc-todaybtn" onClick={() => centreCard(FORTNIGHT_TODAY_IDX, true)}>
                ↺ Back to today
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
