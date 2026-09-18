/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OneScreenChart — the active-queries card (v33, 18 Sep; ref design-refs/dashboard-v33.html).
 *
 * A sentence for a title ("18 active queries") on the navy band; one navy line over a fill that runs
 * on past today and breaks up into grain behind the Mentor, who leans on the card's right-hand edge
 * and looks at you while you are on the card; a pin for each dated response; a week axis; and, once
 * there are twelve weeks of record, a minimap.
 *
 * ⚠️ THE DRAWING IS OUT OF THE LAYOUT FLOW, AND THAT IS LOAD-BEARING. An `<svg>` with a viewBox has
 * an aspect ratio of its own; in the flow that ratio set the card's height, so every widening of the
 * window made the whole row taller and it never came back down. `.os-acdraw` is `position: absolute`
 * inside `.os-acplot`, which is a flex child and takes its height from the CARD. The viewBox always
 * equals the measured box, so nothing is stretched and a circle is a circle.
 *
 * ⚠️ THE BOX IS MEASURED BY A CALLBACK REF, never a mount-once effect — an early return above the
 * wrapper once left the chart unmeasured, and blank, for every account.
 *
 * ⚠️ A STATUS IS DRAWN BY `StatusDot` AND NOTHING ELSE — so the pins' glyphs are an HTML LAYER over
 * the plot, positioned from the same coordinates the svg uses, NOT a `foreignObject` (unreliable in
 * Safari on transformed elements, and these scale to 1.25 on hover). The white disc, the stem, the
 * point and the hit areas are svg; the disc and the glyph scale together, by the same factor, on the
 * same 150ms.
 *
 * ⚠️ TWO HOVER LAYERS THAT MUST NOT BLUR INTO EACH OTHER. The WEEK layer is one transparent rect over
 * the whole plot and snaps to the nearest week. The EVENT layer is drawn AFTER it, so it is above it:
 * a circle r14 on the glyph, a 12px strip down the stem, a circle r8 on the point. On a hit area you
 * get the event and only the event; off it, the week.
 *
 * ⚠️ EVERY SVG ID IS `useId`'S. Every workspace page stays mounted, and a hard-coded gradient id is a
 * duplicate the day a second chart exists — `url(#x)` resolves to the FIRST in the document.
 */
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import type { Activity, Agent, Manuscript, Query } from "../../types";
import { QueryStatus } from "../../types";
import { dailyLedger } from "../../lib/oneScreen";
import {
  chartGeometry, fillPath, indexAt, nearestSlot, pointOnLine, SLOT_LABEL_MIN_DAYS, weekSlots,
  type LineMode,
} from "../../lib/dashChart";
import {
  campaignStage, clampWindowEnd, longView, MINIMAP_SEEN_KEY, readWindowBack, sinceLabel, windowAtToday,
  writeWindowBack,
} from "../../lib/dashWindow";
import { indexActivities, stageLabel, UNDATED_LABEL, weekMix } from "../../lib/dashWeekMix";
import { layoutPins, pinCopy, pinDate, pinEvents, PIN_DISC_R, PIN_KIND, type ChartPin, type PlacedEvent } from "../../lib/dashPins";
import { DASH_ART, artUrl } from "../../lib/dashArt";
import { StatusDot } from "../StatusDot";
import { OneScreenChartEmpty } from "./OneScreenChartEmpty";
import { OneScreenMinimap } from "./OneScreenMinimap";
import { OneScreenPanel } from "./OneScreenPanel";
import { useDashPopup } from "./DashPopup";

const NAVY = "#2a3a52";
const INK = "#1c130f";

type Hover = { t: "w"; i: number } | { t: "e"; id: string } | null;

/** "18 active queries" · "1 active query" · "No active queries" */
export const activeTitle = (n: number | null): string =>
  n === null ? "Active queries" : n === 0 ? "No active queries" : `${n.toLocaleString("en-GB")} active ${n === 1 ? "query" : "queries"}`;

export const OneScreenChart: React.FC<{
  loading: boolean;
  /** the manuscript-scoped queries */
  queries: Query[];
  /** the manuscript-scoped activity log — pins and the week breakdown come from here */
  activities: Activity[];
  /** lookup sets for the pins' popups — unscoped, like every lookup on this page */
  agents?: Agent[];
  manuscripts?: Manuscript[];
  /** the live count, the header's own figure; null while loading */
  activeCount: number | null;
  now: Date;
  /** the page's zero-query branch — the card keeps its box and shows the first-run panel */
  empty?: boolean;
  onSendFirst?: () => void;
  onOpenQuery?: (queryId: string) => void;
}> = ({ loading, queries, activities, agents = [], manuscripts = [], activeCount, now, empty = false, onSendFirst, onOpenQuery }) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const popup = useDashPopup();
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number; carry: number } | null>(null);
  const [hover, setHover] = useState<Hover>(null);

  /* ── the record, its stage, its window ── */
  const daily = useMemo(() => dailyLedger(queries, now), [queries, now]);
  const stage = campaignStage(daily);
  const mode: LineMode = stage === "long" ? "smooth" : "stepped";
  const [endIdx, setEndIdx] = useState<number | null>(null);
  /* the remembered window is days BACK from today, read once the record's length is known */
  const end = clampWindowEnd(endIdx ?? daily.length - 1 - readWindowBack(), daily.length);
  const atToday = stage !== "long" || windowAtToday(end, daily.length);
  const view = useMemo(() => (stage === "long" ? longView(daily, end) : daily), [stage, daily, end]);
  const values = useMemo(() => view.map((p) => p.active), [view]);
  const slots = useMemo(() => weekSlots(view, mode), [view, mode]);

  const moveWindow = useCallback((next: number) => {
    setEndIdx(next);
    writeWindowBack(daily.length - 1 - next);
    setHover(null);
    popup.release();
  }, [daily.length, popup]);

  /* the minimap slides in ONCE per device — the day the campaign first has a past */
  const [arriving] = useState(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem(MINIMAP_SEEN_KEY) !== "1"; } catch { return false; }
  });
  useEffect(() => {
    if (stage !== "long" || !arriving) return;
    try { window.localStorage.setItem(MINIMAP_SEEN_KEY, "1"); } catch { /* it slides in again next time */ }
  }, [stage, arriving]);

  /* ── the drawing box ── */
  const drawRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return undefined;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      /* the inside of the frame's right edge, in the drawing's own coordinates — where the fill's
         carried-on end stops (the frame's border is 1px) */
      const frame = el.closest(".os-frame");
      const carry = frame ? frame.getBoundingClientRect().right - r.left - 1 : r.width;
      setSize((was) => {
        const next = { w: Math.round(r.width), h: Math.round(r.height), carry: Math.round(carry) };
        return was && was.w === next.w && was.h === next.h && was.carry === next.carry ? was : next;
      });
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const frame = el.closest(".os-frame");
    if (frame) ro.observe(frame);
    return () => ro.disconnect();
  }, []);

  const W = size?.w ?? 0, H = size?.h ?? 0;
  const sparse = view.length < 2;
  const geo = useMemo(() => (W > 0 && H > 0 && !sparse ? chartGeometry(values, W, H, mode) : null), [values, W, H, sparse, mode]);

  /* ── pins ── */
  const events = useMemo(() => pinEvents(queries, activities), [queries, activities]);
  const pins = useMemo<ChartPin[]>(() => {
    if (!geo) return [];
    const placed: PlacedEvent[] = [];
    for (const e of events) {
      const u = indexAt(view, e.timeMs, mode);
      if (u === null) continue;
      const [x, y] = pointOnLine(values, u, W, H, geo.top, mode);
      placed.push({ ...e, x, y });
    }
    return layoutPins(placed, H);
  }, [geo, events, view, values, W, H, mode]);
  /* the weeks a request came in — the axis marks them rose. Read off the pins DRAWN, never the log a
     second time, so the bar under a week and the pin above it are one fact. */
  const hot = useMemo(() => {
    const out = new Set<number>();
    for (const p of pins) for (const m of p.members) {
      if (m.status !== QueryStatus.PARTIAL_REQUESTED && m.status !== QueryStatus.FULL_REQUESTED) continue;
      /* a slot's week runs up to its own close, so the first slot that closes on or after the
         event is the week it fell in */
      const i = slots.findIndex((s) => m.timeMs <= s.atMs);
      if (i >= 0) out.add(i);
    }
    return out;
  }, [pins, slots]);

  /* ── the week's figures ── */
  const index = useMemo(() => indexActivities(activities), [activities]);

  const weekContent = (i: number): React.ReactNode => {
    const slot = slots[i];
    const mix = weekMix(queries, index, slot.atMs, now);
    return (
      <>
        <p className="os-tip-ey">Week of {slot.label}</p>
        <p className="os-tip-big">{mix.total.toLocaleString("en-GB")} active {mix.total === 1 ? "query" : "queries"}</p>
        {(mix.rows.length > 0 || mix.undated > 0) && (
          <ul className="os-tip-list">
            {mix.rows.map((r) => (
              <li className="os-tip-st" key={r.status}>
                <StatusDot status={r.status} overrideSize={16} decorative />
                <span>{stageLabel(r.status)}</span>
                <b>{r.count.toLocaleString("en-GB")}</b>
              </li>
            ))}
            {mix.undated > 0 && (
              <li className="os-tip-st os-tip-st--undated" key="undated">
                <i aria-hidden="true" />
                <span>{UNDATED_LABEL}</span>
                <b>{mix.undated.toLocaleString("en-GB")}</b>
              </li>
            )}
          </ul>
        )}
      </>
    );
  };

  const open = (queryId: string) => { popup.release(); onOpenQuery?.(queryId); };

  const eventContent = (pin: ChartPin): React.ReactNode => {
    if (pin.members.length === 1) {
      const e = pin.members[0];
      const c = pinCopy(e, queries, agents, manuscripts);
      return (
        <>
          <p className="os-tip-ey">{c.eyebrow}</p>
          <p className="os-tip-big os-tip-name">{c.who}</p>
          <p className="os-tip-sub">{c.say.before}<i>{c.say.title}</i>{c.say.after}</p>
          <ul className="os-tip-list">
            <li><StatusDot status={e.status} overrideSize={16} decorative /><span><em>{c.where || PIN_KIND[e.status]}</em></span></li>
          </ul>
          <button type="button" className="os-tip-link" onClick={() => open(e.queryId)}>Open this query →</button>
        </>
      );
    }
    /* a merged pin: the same event rows a single pin carries, one per member, each opening its query */
    const first = pin.members[0], last = pin.members[pin.members.length - 1];
    const span = pinDate(first.timeMs) === pinDate(last.timeMs) ? pinDate(first.timeMs) : `${pinDate(first.timeMs)} – ${pinDate(last.timeMs)}`;
    return (
      <>
        <p className="os-tip-ey">{span}</p>
        <p className="os-tip-big">{pin.members.length} responses</p>
        <ul className="os-tip-list">
          {pin.members.map((e) => {
            const c = pinCopy(e, queries, agents, manuscripts);
            return (
              <li key={e.id}>
                <StatusDot status={e.status} overrideSize={16} decorative />
                <span>
                  <button type="button" className="os-tip-rowlink" onClick={() => open(e.queryId)}><b>{c.who}</b></button>
                  <em>{c.eyebrow}</em>
                </span>
              </li>
            );
          })}
        </ul>
      </>
    );
  };

  /* ── hover and pin ── */
  const hitAt = (ev: { target: EventTarget; clientX: number; currentTarget: Element }): Hover => {
    const id = (ev.target as Element).getAttribute?.("data-ev");
    if (id) return { t: "e", id };
    if (!slots.length) return null;
    const x = ev.clientX - ev.currentTarget.getBoundingClientRect().left;
    return { t: "w", i: nearestSlot(slots, x, W, values.length) };
  };
  const contentFor = (h: Hover): React.ReactNode => {
    if (!h) return null;
    if (h.t === "w") return weekContent(h.i);
    const pin = pins.find((p) => p.id === h.id);
    return pin ? eventContent(pin) : null;
  };
  const same = (a: Hover, b: Hover) => (!a || !b ? a === b : a.t === b.t && (a.t === "w" ? a.i === (b as { i: number }).i : a.id === (b as { id: string }).id));

  const onMove = (ev: React.MouseEvent<SVGSVGElement>) => {
    if (popup.locked()) return;
    const h = hitAt(ev);
    if (!same(h, hover)) setHover(h);
    if (h) popup.show("chart", contentFor(h), ev.clientX, ev.clientY, cardRef.current);
  };
  const onLeave = () => { if (popup.locked()) return; setHover(null); popup.hide("chart"); };
  const onClick = (ev: React.MouseEvent<SVGSVGElement>) => {
    const h = hitAt(ev);
    if (!h) return;
    setHover(h);
    popup.pin("chart", contentFor(h), ev.clientX, ev.clientY, cardRef.current);
  };
  useEffect(() => popup.onRelease("chart", () => setHover(null)), [popup]);

  /* the keyboard reaches each pin; focus shows what hover shows, Enter pins it */
  const focusPin = (pin: ChartPin, el: Element, pinIt: boolean) => {
    const r = el.getBoundingClientRect();
    const h: Hover = { t: "e", id: pin.id };
    if (pinIt) { setHover(h); popup.pin("chart", eventContent(pin), r.left + r.width / 2, r.top + r.height / 2, cardRef.current); return; }
    if (popup.locked()) return;
    setHover(h);
    popup.show("chart", eventContent(pin), r.left + r.width / 2, r.top + r.height / 2, cardRef.current);
  };

  const title = (
    <div className="os-bandrow">
      <h3 className="os-cardttl" data-probe-text="chart-title">{loading ? "Active queries" : activeTitle(empty ? 0 : activeCount)}</h3>
      {!loading && !empty && stage === "short" && <span className="os-since" data-probe-text="chart-since">{sinceLabel(daily)}</span>}
    </div>
  );

  if (empty) {
    return (
      <OneScreenPanel variant="os-lead" tone="navy" probe="chart-card" loading={loading} skel={["h", "grow", ""]} lift={false} band={title} innerRef={cardRef}>
        <OneScreenChartEmpty onLogFirst={onSendFirst} />
      </OneScreenPanel>
    );
  }

  const lastIdx = view.length - 1;
  const last = geo?.points[lastIdx];
  const summary = view.length >= 2
    ? `Active queries from ${view[0].label} to ${view[lastIdx].label}: ${values[0]} to ${values[lastIdx]}.`
    : "Active queries over time.";
  const hoverSlot = hover?.t === "w" ? slots[hover.i] : null;
  const hoverPin = hover?.t === "e" ? pins.find((p) => p.id === hover.id) ?? null : null;
  const focusPt: [number, number] | null = geo
    ? hoverSlot ? geo.points[hoverSlot.idx] ?? null : hoverPin ? [hoverPin.x, hoverPin.y] : null
    : null;
  const carryTo = atToday && size ? Math.max(size.carry, last ? last[0] : 0) : null;

  return (
    <OneScreenPanel variant="os-lead" tone="navy" probe="chart-card" loading={loading} skel={["h", "grow", ""]} lift={false} band={title} innerRef={cardRef}>
      <div className="os-acplot" data-probe="plot-box">
        <div className="os-acground" aria-hidden="true" />
        {/* ⚠️ THE MENTOR: TWO DRAWINGS IN ONE ISOLATED WRAPPER, CROSS-DISSOLVED ADDITIVELY. His head
            changes shape between them, so the first must fade OUT as the second fades IN; two plain
            opacity fades dip to ~75% solid halfway and the white card flashes through the whole
            bird. `plus-lighter` makes the pair always sum to 100%. Both are decoded up front so the
            first hover does not stutter. */}
        <div className="os-mentor" aria-hidden="true" data-probe="mentor">
          <img className="os-mentor-a" src={artUrl(DASH_ART.mentor)} width={DASH_ART.mentor.width} height={DASH_ART.mentor.height} alt="" decoding="sync" />
          <img className="os-mentor-b" src={artUrl(DASH_ART.mentorLooking)} width={DASH_ART.mentorLooking.width} height={DASH_ART.mentorLooking.height} alt="" decoding="sync" />
        </div>
        <div className="os-acdraw" ref={drawRef}>
          {sparse ? (
            <div className="os-sparse on"><span>The line begins once there are two days on the record.</span></div>
          ) : (
            <>
              <svg
                data-probe="plot"
                /* ⚠️ INSTRUMENTATION, NOT AN API — the harness reads what was drawn from here. */
                data-series={JSON.stringify({ v: values, lab: slots.map((s) => s.label), mode, pins: pins.map((p) => ({ n: p.members.length, below: p.below, stem: p.stem })) })}
                width={W || undefined}
                height={H || undefined}
                viewBox={W && H ? `0 0 ${W} ${H}` : undefined}
                role="img"
                aria-label={summary}
                onMouseMove={onMove}
                onMouseLeave={onLeave}
                onClick={onClick}
              >
                {geo && (
                  <>
                    <defs>
                      <linearGradient id={`${uid}v`} gradientUnits="userSpaceOnUse" x1={0} y1={geo.peakY} x2={0} y2={geo.baseY}>
                        <stop offset="0" stopColor={NAVY} stopOpacity={0.3} />
                        <stop offset="1" stopColor={NAVY} stopOpacity={0} />
                      </linearGradient>
                      {carryTo !== null && last && (
                        <>
                          <linearGradient id={`${uid}h`} gradientUnits="userSpaceOnUse" x1={last[0] - 10} y1={0} x2={carryTo - 4} y2={0}>
                            <stop offset="0" stopColor="#fff" stopOpacity={1} />
                            <stop offset="0.55" stopColor="#fff" stopOpacity={0.42} />
                            <stop offset="1" stopColor="#fff" stopOpacity={0} />
                          </linearGradient>
                          {/* the grain: the far end BREAKS UP rather than fading smoothly */}
                          <filter id={`${uid}n`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                            <feTurbulence type="fractalNoise" baseFrequency={0.75} numOctaves={2} seed={7} result="t" />
                            <feColorMatrix in="t" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 1 0 0 0 0" result="n" />
                            <feComposite in="SourceGraphic" in2="n" operator="arithmetic" k1={0} k2={1.25} k3={-1} k4={0.42} />
                            <feComponentTransfer><feFuncA type="linear" slope={9} intercept={-3.6} /></feComponentTransfer>
                          </filter>
                          <mask id={`${uid}m`} maskUnits="userSpaceOnUse" x={0} y={0} width={carryTo + 2} height={H} style={{ maskType: "alpha" }}>
                            <rect x={0} y={0} width={carryTo + 2} height={H} fill={`url(#${uid}h)`} filter={`url(#${uid}n)`} />
                          </mask>
                        </>
                      )}
                    </defs>
                    <g mask={carryTo !== null ? `url(#${uid}m)` : undefined} pointerEvents="none" data-probe="chart-fill">
                      <path d={fillPath(geo, carryTo)} fill={`url(#${uid}v)`} />
                    </g>
                    <path className="os-acline" d={geo.line} fill="none" stroke={NAVY} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" />

                    {/* the hover furniture — under the hit layers, so it never takes the pointer */}
                    {focusPt && (
                      <g pointerEvents="none" data-probe="chart-focus">
                        {hoverSlot && (
                          <line x1={focusPt[0]} x2={focusPt[0]} y1={Math.min(geo.baseY, focusPt[1] + 7)} y2={geo.baseY} stroke={INK} strokeWidth={1} strokeDasharray="2 3" opacity={0.55} />
                        )}
                        <circle cx={focusPt[0]} cy={focusPt[1]} r={5.5} fill={NAVY} stroke="#fff" strokeWidth={2.5} />
                      </g>
                    )}

                    {/* the WEEK layer: anywhere on the chart */}
                    <rect x={0} y={0} width={W} height={H} fill="transparent" className="os-acweeks" />

                    {pins.map((p) => (
                      <g key={p.id} data-probe="chart-pin" data-n={p.members.length}>
                        <line x1={p.x} y1={p.y} x2={p.x} y2={p.gy} stroke={INK} strokeWidth={1.2} pointerEvents="none" />
                        <circle cx={p.x} cy={p.y} r={2.4} fill={INK} pointerEvents="none" />
                        <g className="os-acdisc" pointerEvents="none" style={{ transform: `translate(${p.x}px, ${p.gy}px) scale(${hoverPin?.id === p.id ? 1.25 : 1})` }}>
                          <circle r={PIN_DISC_R} fill="#fff" />
                          {/* ⚠️ A MERGED PIN DRAWS ITS OWN RING. A single pin's outline is its StatusDot's
                              ring; a count has none, and a white disc on a white card is no disc at
                              all — measured at 1280, where a bare "6" floated above the line. */}
                          {p.members.length > 1 && <circle r={7} fill="none" stroke={INK} strokeWidth={1.6} />}
                        </g>
                        {/* the EVENT layer — after the week rect, so above it */}
                        <circle cx={p.x} cy={p.gy} r={14} fill="transparent" data-ev={p.id} className="os-achit" />
                        <line x1={p.x} y1={p.y} x2={p.x} y2={p.gy} stroke="transparent" strokeWidth={12} data-ev={p.id} className="os-achit" />
                        <circle cx={p.x} cy={p.y} r={8} fill="transparent" data-ev={p.id} className="os-achit" />
                      </g>
                    ))}
                    {last && <circle className="os-aclast" cx={last[0]} cy={last[1]} r={4.5} fill={NAVY} pointerEvents="none" />}
                  </>
                )}
              </svg>
              {/* ⚠️ THE GLYPH LAYER — HTML over the plot, sized to it, inert. Each glyph is centred on
                  its white disc from the svg's own coordinates and scales with it. The focusable
                  element is here too (an svg shape cannot take a useful focus ring in Safari). */}
              <div className="os-acglyphs" data-probe="chart-glyphs">
                {pins.map((p) => {
                  const one = p.members.length === 1 ? p.members[0] : null;
                  const label = one
                    ? `${pinCopy(one, queries, agents, manuscripts).eyebrow}, ${pinCopy(one, queries, agents, manuscripts).who}`
                    : `${p.members.length} responses`;
                  return (
                    <span
                      key={p.id}
                      className={`os-acglyph${hoverPin?.id === p.id ? " at" : ""}`}
                      style={{ left: p.x, top: p.gy }}
                      role="button"
                      tabIndex={0}
                      aria-label={label}
                      onFocus={(ev) => focusPin(p, ev.currentTarget, false)}
                      onBlur={onLeave}
                      onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); focusPin(p, ev.currentTarget, true); } }}
                    >
                      {one
                        ? <StatusDot status={one.status} overrideSize={16} decorative />
                        : <b className={`os-acglyphn${p.members.length > 9 ? " os-acglyphn--wide" : ""}`}>{p.members.length}</b>}
                    </span>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
      {/* ⚠️ ONE SLOT PER WEEK, UNDER THE DRAWING AND NOT UNDER THE MENTOR. The bar is the slot's own
          `::before`, so it cannot drift from the label it belongs to; a slot's flex weight is the
          number of points in its week, so a stepped chart's part-weeks stay under their days. */}
      <div className="os-acx" aria-hidden="true" data-probe="chart-axis">
        {slots.map((s, i) => (
          <span
            key={`${s.label}-${i}`}
            style={s.weight !== 1 ? { flexGrow: s.weight } : undefined}
            className={[hot.has(i) ? "hot" : "", hoverSlot === s ? "at" : ""].filter(Boolean).join(" ") || undefined}
          >
            {mode === "stepped" && s.weight < SLOT_LABEL_MIN_DAYS ? "" : s.label}
          </span>
        ))}
      </div>
      {stage === "long" && (
        <OneScreenMinimap daily={daily} endIdx={end} onChange={moveWindow} arriving={arriving} />
      )}
    </OneScreenPanel>
  );
};
