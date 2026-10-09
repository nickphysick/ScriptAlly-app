/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v58 — the activity feed: a floating ink tab, and a half-screen drawer from the right.
 *
 * ⚠️ PORTALLED TO `document.body`, AND MOUNTED ONLY WHILE OPEN. `useOverlay` makes `#root` inert
 * and returns focus to whatever opened it; a drawer rendered inside the page would be inert itself.
 * Its palette is declared on `.d58-layer` for the same reason: out here the page's tokens are not
 * ancestors of anything.
 *
 * The wash and the drawer are placed from the main column's measured box, so the sidebar stays
 * clear of both.
 */
import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Activity, Agent, Manuscript, Query } from "../../../types";
import { QueryStatus } from "../../../types";
import { useOverlay } from "../../shell/useOverlay";
import { StatusDot } from "../../StatusDot";
import { feedEntries, type FeedSeg } from "../../../lib/dashFeed";
import {
  FEED_FILTERS, SUMMARY_NOUN, defaultFrom, drawerDays, drawerEvents, drawerSummary, earlierWindow, rangeLabel,
  windowEndLine, type FeedFilter,
} from "../../../lib/dashFeedDrawer";
import { buildQcRows } from "../../../lib/qcSummary";
import type { DrawerMode } from "../../../lib/queryActions/drawerStore";

const ListGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
    <circle cx="4" cy="4" r="1.6" /><circle cx="4" cy="9" r="1.6" /><circle cx="4" cy="14" r="1.6" /><path d="M8 4h7M8 9h7M8 14h5" />
  </svg>
);

/** `today` is the count; −1 holds the pill's place while the page loads. */
export const FeedTab: React.FC<{ open: boolean; today: number; onOpen: () => void }> = ({ open, today, onOpen }) => (
  <button type="button" className="d58-tab" data-d58="tab" aria-haspopup="dialog" aria-expanded={open} onClick={onOpen}>
    <span className="d58-tabic"><ListGlyph /></span>
    <span><b>Activity feed</b><small>LAST 30 DAYS</small></span>
    {today !== 0 && <span className={`d58-tabnew${today < 0 ? " d58-sk" : ""}`} data-d58="tab-today">{today < 0 ? "0 today" : `${today} today`}</span>}
  </button>
);

const Segs: React.FC<{ say: readonly FeedSeg[] }> = ({ say }) => (
  <>{say.map((s, i) => (s.who ? <b key={i}>{s.t}</b> : s.em ? <i key={i}>{s.t}</i> : <React.Fragment key={i}>{s.t}</React.Fragment>))}</>
);

const TONE: Record<string, string> = {
  queried: "var(--state-queried)", agent: "var(--state-agent)", you: "var(--state-you)",
  offer: "var(--state-offer)", closed: "var(--state-closed)",
};

const PlusDot = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true">
    <circle cx="7" cy="7" r="5.3" fill="none" stroke="#1c130f" strokeWidth="1.3" /><path d="M7 4.3v5.4M4.3 7h5.4" stroke="#1c130f" strokeWidth="1.3" />
  </svg>
);

export const Dash58Feed: React.FC<{
  title: string;
  activities: Activity[];
  queries: Query[];
  scopedQueries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  now: Date;
  onClose: () => void;
  onAct: (queryId: string, mode: DrawerMode) => void;
}> = ({ title, activities, queries, scopedQueries, agents, manuscripts, now, onClose, onAct }) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const { trapTab, scrimClick } = useOverlay(rootRef, { onEscape: onClose, captureEscape: true, scrimClasses: ["d58-wash"], onScrimClick: onClose });
  const [filter, setFilter] = useState<FeedFilter>("all");
  const [from, setFrom] = useState(() => defaultFrom(now));
  const [shown, setShown] = useState(false);
  const [main, setMain] = useState<{ l: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const read = () => {
      const r = document.querySelector(".ws-main")?.getBoundingClientRect();
      setMain(r && r.width > 0 ? { l: Math.round(r.left), w: Math.round(r.width) } : { l: 0, w: window.innerWidth });
    };
    read();
    window.addEventListener("resize", read);
    const id = window.requestAnimationFrame(() => setShown(true));
    return () => { window.removeEventListener("resize", read); window.cancelAnimationFrame(id); };
  }, []);

  const entries = useMemo(
    () => feedEntries({ activities, queries, agents, manuscripts, now, seenAt: null, from }),
    [activities, queries, agents, manuscripts, now, from],
  );
  const qcRows = useMemo(() => buildQcRows(scopedQueries, agents, activities, now.getTime()), [scopedQueries, agents, activities, now]);
  const days = useMemo(() => drawerDays(drawerEvents(entries, qcRows, filter), now), [entries, qcRows, filter, now]);
  const sum = drawerSummary(entries);
  const earlier = earlierWindow(from);
  const hasEarlier = useMemo(() => activities.some((a) => { const t = new Date(a.date).getTime(); return Number.isFinite(t) && t < from; }), [activities, from]);

  return createPortal(
    <div
      className={`d58-layer${shown ? " is-in" : ""}`}
      style={{ ["--d58-main-l" as string]: `${main?.l ?? 0}px`, ["--d58-main-w" as string]: `${main?.w ?? 0}px` } as React.CSSProperties}
    >
      <div className="d58-wash" data-d58="wash" onClick={scrimClick} />
      <aside
        className="d58-drawer" data-d58="drawer" ref={rootRef} tabIndex={-1}
        role="dialog" aria-modal="true" aria-label="Activity feed" onKeyDown={trapTab}
      >
        <header className="d58-dhead" data-d58="drawer-head">
          <div className="d58-drow">
            <span className="d58-dart" aria-hidden="true" />
            <div style={{ minWidth: 0 }}>
              <h2 className="d58-dtitle">Activity feed</h2>
              <small className="d58-dsub" data-d58="drawer-sub">Everything that's happened on <i>{title || "your manuscript"}</i></small>
            </div>
            <button type="button" className="d58-dx" aria-label="Close" data-d58="drawer-close" onClick={onClose}>✕</button>
          </div>
          <div className="d58-dctrl">
            <div className="d58-seg" role="group" aria-label="Show">
              {FEED_FILTERS.map((f) => (
                <button key={f.key} type="button" data-d58-seg={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
              ))}
            </div>
            <select
              className="d58-range" aria-label="Date range" data-d58="drawer-range"
              value={from === defaultFrom(now) ? "30" : "more"}
              onChange={(e) => setFrom(e.target.value === "30" ? defaultFrom(now) : e.target.value === "90" ? now.getTime() - 90 * 86_400_000 : 0)}
            >
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">Everything</option>
              {from !== defaultFrom(now) && <option value="more">{rangeLabel(from, now)}</option>}
            </select>
          </div>
        </header>
        <div className="d58-sum">
          <div data-d58="sum"><b>{sum.replies}</b><span>{SUMMARY_NOUN.replies(sum.replies)}</span></div>
          <div data-d58="sum"><b>{sum.did}</b><span>{SUMMARY_NOUN.did(sum.did)}</span></div>
          <div data-d58="sum" className="is-you"><b>{sum.need}</b><span>{SUMMARY_NOUN.need(sum.need)}</span></div>
        </div>
        <div className="d58-dbody" data-d58="drawer-body">
          {days.length === 0 && <p className="d58-dempty">Nothing here in this window.</p>}
          {days.map((d) => (
            <React.Fragment key={d.key}>
              <div className="d58-day" data-d58="day"><span>{d.heading}</span><b>{d.count}</b></div>
              {d.events.map(({ entry: e, say, tag, meta }) => (
                <div className="d58-ev" key={e.id} data-d58="ev" data-dir={e.dir} data-need={e.need ? "1" : "0"} data-met={e.met ? "1" : "0"}>
                  {e.dir === "in" ? (
                    <>
                      <span className="d58-evdot" style={{ ["--d58-tone" as string]: TONE[e.state ?? "closed"] ?? TONE.closed } as React.CSSProperties}>
                        {e.status ? <StatusDot status={e.status} overrideSize={15} decorative /> : null}
                      </span>
                      <div className="d58-evcard">
                        <div className="d58-evtop"><span className="d58-evtag">{tag}</span><time>{e.time}</time></div>
                        <p><Segs say={say} /></p>
                        {meta && <span className="d58-evmeta">{meta}</span>}
                        {e.need && e.queryId ? (
                          <button type="button" className="d58-evact" data-d58="ev-act" onClick={() => onAct(e.queryId as string, e.status === QueryStatus.OFFER ? "offer" : "sent")}>{e.need.label} →</button>
                        ) : e.met ? <span className="d58-evdone" data-d58="ev-done">✓ Sent on {e.met}</span> : null}
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="d58-evdot is-sm">{e.status ? <StatusDot status={e.status} overrideSize={13} decorative /> : <PlusDot />}</span>
                      <div className="d58-evline">
                        <p><Segs say={say} /></p>
                        <time>{e.time}</time>
                        {meta && <span className="d58-evmeta">{meta}</span>}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </React.Fragment>
          ))}
          <div className="d58-dend" data-d58="drawer-end">
            {windowEndLine(from, now)}{" "}
            {hasEarlier && <button type="button" className="d58-link" data-d58="drawer-earlier" onClick={() => setFrom(earlier.from)}>Show {earlier.label} →</button>}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  );
};
