/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * "What's live right now?" — the coverflow feature (no card surface; sits on the dashboard
 * ground with a single hairline divider). Two columns, 2fr / 1fr:
 *   · Left: a focus-and-peek pipeline carousel of the six live stages over the focused stage's
 *     query list.
 *   · Right: a text billboard (large Playfair heading + subtitle), vertically centred.
 *
 * In-flight only — the six live stages in journey order (Queried · Partial Requested ·
 * Partial Sent · Full Requested · Full Sent · R&R). Queries in a terminal outcome (Offer /
 * Rejected / Withdrawn / No Response) are excluded entirely; there is no settled summary.
 *
 * Motion (behaviour source: scriptally-whats-live-glide-slow.html): auto-advance rests ~4.6s on
 * each populated stage then glides to the next populated one; the glide duration scales with the
 * distance travelled so it eases slowly across empty stages (which always appear, ghosted with a
 * "0" badge). Hover pauses auto-advance + list auto-scroll; hovering a tile jumps focus to it
 * (an empty tile shows a per-stage empty message). The strip is a seamless infinite loop (the
 * tile set is duplicated and position resets with no transition at the loop point). Disabled
 * under prefers-reduced-motion (statically focused on the first populated stage).
 *
 * StatusDot is locked to 30px app-wide (no size prop); the tile (50px), row (34px) and empty
 * (44px) sizes are forced via scoped overrides in whatsLive.css — the shared component is left
 * untouched.
 */
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Query, Agent, Manuscript, QueryStatus } from "../../types";
import { StatusDot } from "../StatusDot";
import { burgundy, headingInk, mutedInk, labelColor, FONT_SERIF, FONT_SANS, FONT_MONO, buttonPinkBg, buttonPinkBorder } from "../../lib/designTokens";
import "./diaryCarousel.css"; // reuse the shared card tokens/treatment (.dc / .dc-panel, --dc-*)
import "./whatsLive.css";

interface StageDef {
  status: QueryStatus; // the stage's canonical status (drives the StatusDot glyph)
  name: string; // tile label (capitalised via CSS)
  stamp: string; // the row stamp verb, e.g. "partial sent 1 Jul"
}

/* Six live stages, journey order. R&R is its own live stage (never folded into any closed bucket). */
const STAGES: StageDef[] = [
  { status: QueryStatus.QUERIED, name: "queried", stamp: "queried" },
  { status: QueryStatus.PARTIAL_REQUESTED, name: "partial requested", stamp: "partial requested" },
  { status: QueryStatus.PARTIAL_SENT, name: "partial sent", stamp: "partial sent" },
  { status: QueryStatus.FULL_REQUESTED, name: "full requested", stamp: "full requested" },
  { status: QueryStatus.FULL_SENT, name: "full sent", stamp: "full sent" },
  { status: QueryStatus.REVISE_RESUBMIT, name: "in revision", stamp: "R&R" },
];
const RL = STAGES.length; // 6
const TILE_W = 190;
const REST_MS = 5000; // dwell on each populated stage

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const coerceMs = (v: any): number | null => {
  if (!v) return null;
  if (typeof v === "string") { const t = Date.parse(v); return isNaN(t) ? null : t; }
  if (typeof v === "number") return v;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v.getTime();
  if (typeof v.seconds === "number") return v.seconds * 1000;
  if (typeof v.toDate === "function") { try { return v.toDate().getTime(); } catch { return null; } }
  return null;
};
/** Date a query entered its current (live) status — the per-stage field, R&R falling back to the
 *  response/last-change timestamp (no dedicated R&R date field exists — flagged in the report). */
const statusDateMs = (q: Query, status: QueryStatus): number | null => {
  switch (status) {
    case QueryStatus.QUERIED: return coerceMs(q.dateSent);
    case QueryStatus.PARTIAL_REQUESTED: return coerceMs(q.partialRequestedDate);
    case QueryStatus.PARTIAL_SENT: return coerceMs(q.partialSentDate);
    case QueryStatus.FULL_REQUESTED: return coerceMs(q.fullRequestedDate);
    case QueryStatus.FULL_SENT: return coerceMs(q.fullSentDate);
    case QueryStatus.REVISE_RESUBMIT: return coerceMs(q.responseReceivedAt) ?? coerceMs(q.lastStatusChange) ?? coerceMs(q.dateSent);
    default: return null;
  }
};
const fmtDate = (ms: number | null): string => {
  if (ms == null) return "";
  const d = new Date(ms);
  const now = new Date();
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== now.getFullYear() ? ` ${d.getFullYear()}` : ""}`;
};

interface Row { id: string; status: QueryStatus; name: string; agency: string; manuscript: string; dateMs: number | null; dateLabel: string; }
interface StageData extends StageDef { rows: Row[]; count: number; }

// Reuses the fortnight heading-block classes (.dc-title/.dc-rule/.dc-sub) so the two section
// headings stay typographically identical and theme-synced (the coverflow is wrapped in .dc).
const rightBillboard = (
  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", padding: "8px 0" }}>
    <h2 className="dc-title">Live pipeline</h2>
    <div className="dc-rule" aria-hidden="true" />
    <p className="dc-sub">Maintaining a healthy pipeline is key. Here&rsquo;s a snapshot of all your in-flight queries.</p>
  </div>
);

export interface WhatsLivePanelProps {
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  onSendQuery: () => void;
}

export const WhatsLivePanel: React.FC<WhatsLivePanelProps> = ({ queries, agents, manuscripts, onSendQuery }) => {
  // Derived per-stage data (in-flight only), most-recent-first.
  const stages: StageData[] = useMemo(() => {
    const agentById = new Map(agents.map((a) => [a.id, a]));
    const msById = new Map(manuscripts.map((m) => [m.id, m]));
    return STAGES.map((s) => {
      const rows: Row[] = queries
        .filter((q) => q.status === s.status)
        .map((q) => {
          const agent = agentById.get(q.agentId);
          const ms = msById.get(q.manuscriptId);
          const dateMs = statusDateMs(q, s.status);
          return {
            id: q.id,
            status: s.status,
            name: agent?.name || "Unknown agent",
            agency: agent?.agency || "Independent",
            manuscript: ms?.title || "Untitled manuscript",
            dateMs,
            dateLabel: fmtDate(dateMs),
          };
        })
        .sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0));
      return { ...s, rows, count: rows.length };
    });
  }, [queries, agents, manuscripts]);

  const populated = useMemo(() => stages.map((_, i) => i).filter((i) => stages[i].count > 0), [stages]);
  const isEmpty = populated.length === 0;
  const countsKey = stages.map((s) => s.count).join(",");
  const firstPop = populated[0] ?? 0;

  const carwinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const listElRef = useRef<HTMLDivElement | null>(null);
  const focusRef = useRef<number>(firstPop);
  const pausedRef = useRef(false);
  const accRef = useRef(0);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [W, setW] = useState(0);
  const [listStage, setListStage] = useState<number>(firstPop);
  const [swapping, setSwapping] = useState(false);

  // keep focus/list valid if the populated set changes (data update)
  useEffect(() => { focusRef.current = firstPop; setListStage(firstPop); }, [firstPop]);

  // measure the carousel width (resize → re-centre via the main effect's W dep)
  useLayoutEffect(() => {
    const el = carwinRef.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isEmpty]);

  // list overflow → auto-scroll (top-aligned) vs. short → vertically centred; reset the drift
  useLayoutEffect(() => {
    const el = listElRef.current;
    accRef.current = 0; // each stage starts at the top for its single pass
    if (el) {
      el.scrollTop = 0;
      el.style.justifyContent = el.scrollHeight > el.clientHeight + 2 ? "flex-start" : "center";
    }
  }, [listStage, swapping, W]);

  // main coverflow engine (imperative — transforms/opacity per frame, list crossfade via state)
  useEffect(() => {
    if (isEmpty) return;
    const carwin = carwinRef.current, track = trackRef.current;
    if (!carwin || !track) return;
    const tiles = Array.from(track.querySelectorAll<HTMLElement>(".wl-cf-tile"));
    if (tiles.length < RL * 2) return;
    const root = (track.closest(".wl-cf") as HTMLElement) || carwin;
    const popSet = new Set(populated);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const centre = (anim: boolean, dur: number) => {
      track.style.transition = anim ? `transform ${dur}s cubic-bezier(.4,0,.2,1)` : "none";
      const vp = carwin.clientWidth;
      track.style.transform = `translateX(${vp / 2 - (focusRef.current * TILE_W + TILE_W / 2)}px)`;
      tiles.forEach((t, ti) => {
        const foc = ti === focusRef.current;
        t.style.opacity = foc ? "1" : "0.34";
        t.style.transform = `scale(${foc ? 1 : 0.78})`;
        t.classList.toggle("foc", foc);
      });
    };
    const nextPop = (from: number) => { let j = from + 1; while (j < tiles.length) { if (popSet.has(j % RL)) return j; j++; } return from; };
    const durFor = (dist: number) => Math.min(2.7, 1.15 + 0.85 * (dist - 1)); // slower single step; scales across empties
    const setListFocus = (stageIdx: number) => {
      setSwapping(true);
      clearTimeout(swapTimerRef.current);
      swapTimerRef.current = setTimeout(() => { setListStage(stageIdx); setSwapping(false); }, 250);
    };

    centre(false, 0); // initial / post-resize position

    if (reduce) return; // static — no auto-advance, no auto-scroll

    let timer: ReturnType<typeof setInterval>;
    const step = () => {
      const j = nextPop(focusRef.current);
      if (j <= focusRef.current) { focusRef.current = firstPop; centre(false, 0); return; } // safety wrap
      const dur = durFor(j - focusRef.current);
      focusRef.current = j;
      centre(true, dur);
      setListFocus(j % RL);
      if (j >= RL) setTimeout(() => { focusRef.current -= RL; centre(false, 0); }, dur * 1000 + 40);
    };
    const start = () => { clearInterval(timer); timer = setInterval(step, REST_MS); };

    const tileEnter = tiles.map((t, ti) => {
      const h = () => {
        pausedRef.current = true; clearInterval(timer);
        if (ti !== focusRef.current) {
          const dist = Math.abs(ti - focusRef.current);
          focusRef.current = ti; centre(true, durFor(Math.max(1, dist))); setListFocus(ti % RL);
        }
      };
      t.addEventListener("mouseenter", h);
      return h;
    });
    const onRootEnter = () => { pausedRef.current = true; clearInterval(timer); };
    const onRootLeave = () => { pausedRef.current = false; start(); };
    root.addEventListener("mouseenter", onRootEnter);
    root.addEventListener("mouseleave", onRootLeave);

    let raf = 0;
    const tick = () => {
      const el = listElRef.current;
      if (!pausedRef.current && el) {
        const max = el.scrollHeight - el.clientHeight;
        if (max > 2 && accRef.current < max) {
          // single pass: drift down once, timed to reach the bottom ~1s before the carousel
          // advances (dwell REST_MS), then rest at the bottom — no reset, no repeat this stage.
          const perFrame = max / Math.max(1, (REST_MS - 1000) / 16.67);
          accRef.current = Math.min(max, accRef.current + perFrame);
          el.scrollTop = accRef.current;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    start();

    return () => {
      clearInterval(timer);
      clearTimeout(swapTimerRef.current);
      cancelAnimationFrame(raf);
      tiles.forEach((t, ti) => t.removeEventListener("mouseenter", tileEnter[ti]));
      root.removeEventListener("mouseenter", onRootEnter);
      root.removeEventListener("mouseleave", onRootLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countsKey, W, isEmpty]);

  // ── render ──────────────────────────────────────────────────────────────────
  const badgeBase: React.CSSProperties = {
    position: "absolute", top: -6, right: -9, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 9,
    border: "1.5px solid var(--dc-panel-bg)", fontFamily: FONT_MONO, fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1,
  };

  const renderList = (s: StageData) => {
    if (s.count === 0) {
      return (
        <div className="wl-cf-splist" key={`e-${s.status}`} style={{ justifyContent: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 11, textAlign: "center" }}>
            <StatusDot status={s.status} ghost className="wl-cf-emptydot" />
            <div style={{ fontFamily: FONT_SERIF, fontStyle: "italic", fontSize: 15, color: mutedInk }}>Nothing at this stage right now.</div>
          </div>
        </div>
      );
    }
    return (
      <div className="wl-cf-splist" key={`l-${s.status}`} ref={listElRef}>
        {s.rows.map((r) => (
          <div className="wl-cf-qrow" key={r.id}>
            <StatusDot status={r.status} className="wl-cf-rowdot" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT_SERIF, fontSize: 14.5, color: headingInk }}>{r.name}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 7.5, letterSpacing: "0.05em", textTransform: "uppercase", color: labelColor, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.agency} · {r.manuscript}
              </div>
            </div>
            <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, color: mutedInk, whiteSpace: "nowrap", flexShrink: 0 }}>{s.stamp} {r.dateLabel}</span>
          </div>
        ))}
      </div>
    );
  };

  const tilesData = [...stages, ...stages]; // duplicated for the seamless loop

  return (
    <div style={{ margin: "36px 0" }}>
    <div className="dc dc-panel">
    <div className="wl-cf" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 40, width: "100%", alignItems: "center" }}>
      {/* Left 2fr */}
      <div style={{ minWidth: 0 }}>
        {isEmpty ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, minHeight: 282, textAlign: "center" }}>
            <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
              {STAGES.map((s) => <StatusDot key={s.status} status={s.status} ghost className="wl-cf-emptydot" />)}
            </div>
            <div style={{ fontFamily: FONT_SERIF, fontSize: 21, fontWeight: 500, color: headingInk }}>Nothing in flight right now.</div>
            <div style={{ fontFamily: FONT_SANS, fontSize: 13, lineHeight: 1.55, color: mutedInk, maxWidth: 400 }}>
              When you send a query, it&rsquo;ll appear here and move through these stages as agents reply.
            </div>
            <button
              onClick={onSendQuery}
              style={{ marginTop: 4, cursor: "pointer", fontFamily: FONT_MONO, fontSize: 10.5, fontWeight: 500, letterSpacing: "0.07em", color: burgundy, background: buttonPinkBg, border: `0.5px solid ${buttonPinkBorder}`, borderRadius: 10, padding: "10px 18px" }}
            >
              Send your first query
            </button>
          </div>
        ) : (
          <>
            <div className="wl-cf-carwin" ref={carwinRef}>
              <div className="wl-cf-track" ref={trackRef}>
                {tilesData.map((s, ti) => {
                  const zero = s.count === 0;
                  return (
                    <div className="wl-cf-tile" key={ti}>
                      <span className={`wl-cf-dotwrap${zero ? "" : " pop"}`}>
                        <StatusDot status={s.status} ghost={zero} className="wl-cf-tiledot" />
                        <span className="wl-cf-badge" style={{ ...badgeBase, background: zero ? "#c2b8ab" : burgundy, color: zero ? "#f6ede3" : "#f6ede3" }}>{s.count}</span>
                      </span>
                      <span style={{ fontFamily: FONT_SERIF, fontSize: 16, color: headingInk, textTransform: "capitalize", whiteSpace: "nowrap" }}>{s.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* list in its own inner card — reuse the day-card token (var --dc-body / --dc-card-*) */}
            <div className="wl-cf-listcard" style={{ marginTop: 16, background: "var(--dc-body)", border: "var(--dc-card-bd)", borderRadius: "var(--dc-card-rad)", padding: "12px 16px" }}>
              <div className="wl-cf-spot" style={{ opacity: swapping ? 0 : 1, transform: swapping ? "translateY(-10px)" : "none", transition: "opacity 0.25s ease, transform 0.25s ease" }}>
                {renderList(stages[listStage] ?? stages[firstPop])}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right 1fr billboard */}
      {rightBillboard}
    </div>
    </div>
    </div>
  );
};
