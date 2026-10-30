/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone round two v1 (2A, ref design-refs/phone-round-two-v1/src/boot2.js `f1`, `PAGES.activity`) — ACTIVITY ON HOME,
 * AND ITS PAGE.
 *
 * ⚠️ IT DERIVES NOTHING. The entries are the desktop feed's own (`feedEntries`, one resolver for every surface that
 * narrates an event), arranged by the desktop drawer's own model: `drawerEvents` (the sentence, the agent / you filter),
 * `drawerSummary` (the three figures) and `SUMMARY_NOUN` / `SUMMARY_NONE` (their words). A request or an offer the query
 * still stands at carries its action, exactly where the desktop drawer offers one (`entry.need` and a query), and opens
 * the same flow (`actModeFor`). The phone only lays the rows out, so it cannot disagree with the desktop's numbers.
 *
 *  - Home: "Activity", "See all", the All · From agents · By you chips (they filter in place), then at most five events,
 *    newest first, under day headings — and "See all activity".
 *  - The page: a navy band ("Activity", "Everything that's happened on {book}, last 30 days"), the three figures, the
 *    chips, and every event by day. It is `/dashboard?activity=1`, so the back gesture closes it.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ActivityType } from "../../../types";
import { FEED_DAYS, type FeedEntry } from "../../../lib/dashFeed";
import { FEED_FILTERS, SUMMARY_NONE, SUMMARY_NOUN, drawerEvents, drawerSummary, type DrawerEvent, type FeedFilter } from "../../../lib/dashFeedDrawer";
import type { QcRow } from "../../../lib/qcSummary";
import { actModeFor } from "../v58/feedFamily";
import { PhoneDisc } from "../../phone/PhoneDisc";
import { PI } from "../../phone/phoneIcons";
import "./phoneActivity.css";

/** At most this many events on Home (ref `feedDays(5)`). */
export const HOME_ACTIVITY_MAX = 5;

type Act = (queryId: string, mode: "offer" | "sent") => void;

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const midnight = (ms: number) => { const d = new Date(ms); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };
/** "Today", "Yesterday", or "Tuesday 27 October" */
export function dayHeading(at: number, nowMs: number): string {
  const k = midnight(at);
  const t = midnight(nowMs);
  if (k === t) return "Today";
  if (k === midnight(t - 12 * 3_600_000)) return "Yesterday";
  const d = new Date(k);
  return `${WEEKDAY[d.getDay()]} ${d.getDate()} ${MONTH[d.getMonth()]}`;
}
/** events grouped by day, in the order they come (newest first) */
export function byDay(events: readonly DrawerEvent[], nowMs: number): { key: number; heading: string; events: DrawerEvent[] }[] {
  const out: { key: number; heading: string; events: DrawerEvent[] }[] = [];
  for (const ev of events) {
    const key = midnight(ev.entry.at);
    let d = out[out.length - 1];
    if (!d || d.key !== key) { d = { key, heading: dayHeading(ev.entry.at, nowMs), events: [] }; out.push(d); }
    d.events.push(ev);
  }
  return out;
}

/** the icon a by-you line leads with when it is not about a query's status */
const mineIcon = (e: FeedEntry): React.ReactNode =>
  e.activityType === ActivityType.AGENT_ADDED || e.activityType === ActivityType.AGENT_UPDATED || e.activityType === ActivityType.AGENT_DELETED ? PI.person
    : e.activityType.startsWith("Manuscript") ? PI.book : PI.bell;

/** One event (ref `feedRow`): from an agent, a white card with the status disc; a request or an offer the query still
 *  stands at, tinted, with its action; by you, a quiet line. */
export const ActivityRow: React.FC<{ ev: DrawerEvent; onAct: Act }> = ({ ev, onAct }) => {
  const e = ev.entry;
  const say = ev.say.map((s, i) => (s.who ? <b key={i}>{s.t}</b> : s.em ? <em key={i}>{s.t}</em> : <React.Fragment key={i}>{s.t}</React.Fragment>));
  const meta = [ev.meta, e.time].filter(Boolean).join(" · ");
  if (e.dir === "out" || e.app) {
    return (
      <div className="pa-fit mine" data-pa="act-row" data-dir="out" data-id={e.id}>
        {e.status && !e.app ? <PhoneDisc status={e.status} size={30} /> : <span className="pa-fitico" aria-hidden="true">{mineIcon(e)}</span>}
        <div className="tx">{say}{meta ? <span className="meta">{meta}</span> : null}</div>
      </div>
    );
  }
  const need = e.need && e.queryId ? e.need : null;
  return (
    <div className={`pa-fit${need ? " req" : ""}`} data-pa="act-row" data-dir="in" data-need={need ? "1" : "0"} data-id={e.id}>
      {e.status ? <PhoneDisc status={e.status} size={36} /> : <span className="pa-fitico" aria-hidden="true">{PI.inbox}</span>}
      <div className="tx">
        {say}{meta ? <span className="meta">{meta}</span> : null}
        {need ? <button type="button" className="pa-btn pri sm pa-fitact" data-pa="act-action" onClick={() => onAct(e.queryId as string, actModeFor(e.status))}>{need.label}</button> : null}
      </div>
    </div>
  );
};

const Chips: React.FC<{ filter: FeedFilter; onFilter: (f: FeedFilter) => void }> = ({ filter, onFilter }) => (
  <div className="pa-actchips" role="group" aria-label="Show">
    {FEED_FILTERS.map((f) => (
      <button key={f.key} type="button" className="pa-chip" aria-pressed={filter === f.key} data-pa="act-chip" data-key={f.key} onClick={() => onFilter(f.key)}>{f.label}</button>
    ))}
  </div>
);

const Days: React.FC<{ events: readonly DrawerEvent[]; nowMs: number; onAct: Act }> = ({ events, nowMs, onAct }) => (
  <>
    {byDay(events, nowMs).map((d) => (
      <section key={d.key} data-pa="act-day">
        <div className="pa-fdh">{d.heading}<small>· {d.events.length}</small></div>
        {d.events.map((ev) => <ActivityRow key={ev.entry.id} ev={ev} onAct={onAct} />)}
      </section>
    ))}
  </>
);

/** Home's Activity: replaces "Latest"; sits after Up next and the To-do card, above the founding card. */
export const HomeActivity: React.FC<{ entries: readonly FeedEntry[]; qcRows: readonly QcRow[]; nowMs: number; onAct: Act; onSeeAll: () => void }> = ({ entries, qcRows, nowMs, onAct, onSeeAll }) => {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const events = useMemo(() => drawerEvents(entries, qcRows, filter).slice(0, HOME_ACTIVITY_MAX), [entries, qcRows, filter]);
  return (
    <section data-pa="home-activity" data-filter={filter}>
      <div className="pa-shd"><h2 className="pa-h2">Activity</h2><button type="button" className="pa-link" data-pa="act-see-all" onClick={onSeeAll}>See all</button></div>
      <Chips filter={filter} onFilter={setFilter} />
      {events.length ? <Days events={events} nowMs={nowMs} onAct={onAct} />
        : <p className="pa-sub pa-actnone" data-pa="act-none">{filter === "in" ? "No replies from agents in the last thirty days." : filter === "out" ? "Nothing logged in the last thirty days." : "Nothing in the last thirty days."}</p>}
      <button type="button" className="pa-btn sec blk pa-actall" data-pa="act-see-all-btn" onClick={onSeeAll}>See all activity</button>
    </section>
  );
};

/** The full-screen Activity page (ref `PAGES.activity`). Portalled into a token-carrying `.pa-layer`. */
export const ActivityPage: React.FC<{
  open: boolean; book: string; entries: readonly FeedEntry[]; qcRows: readonly QcRow[]; nowMs: number;
  onAct: Act; onBack: () => void;
}> = ({ open, book, entries, qcRows, nowMs, onAct, onBack }) => {
  const [filter, setFilter] = useState<FeedFilter>("all");
  const events = useMemo(() => drawerEvents(entries, qcRows, filter), [entries, qcRows, filter]);
  const sum = useMemo(() => drawerSummary(entries), [entries]);
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    requestAnimationFrame(() => back.current?.focus({ preventScroll: true }));
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); onBack(); } };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [open, onBack]);
  if (!open) return null;
  const fig = (n: number, noun: (n: number) => string, none: string, k: string) => (
    <div data-pa="act-sum" data-k={k} data-n={n}>{n ? <><b>{n}</b><span>{noun(n)}</span></> : <span className="none">{none}</span>}</div>
  );
  return createPortal(
    <div className="pa-layer pa-actpage" role="dialog" aria-modal="true" aria-label="Activity" data-pa="activity-page">
      <header className="pa-band pa-band--page" data-pa="act-band">
        <div className="pa-bandrow">
          <button ref={back} type="button" className="pa-ring" aria-label="Back" data-pa="act-back" onClick={onBack}>{PI.back}</button>
          <span className="pa-grow" />
        </div>
        <h1 className="pa-bt pa-bt--page">Activity</h1>
        <div className="pa-actsub">Everything that’s happened on {book || "your manuscript"}, last {FEED_DAYS} days</div>
      </header>
      <div className="pa-actbody">
        <div className="pa-fsum">
          {fig(sum.replies, SUMMARY_NOUN.replies, SUMMARY_NONE.replies, "replies")}
          {fig(sum.did, SUMMARY_NOUN.did, SUMMARY_NONE.did, "did")}
          {fig(sum.need, SUMMARY_NOUN.need, SUMMARY_NONE.need, "need")}
        </div>
        <Chips filter={filter} onFilter={setFilter} />
        {events.length ? <Days events={events} nowMs={nowMs} onAct={onAct} /> : <p className="pa-sub pa-actnone">Nothing here in the last {FEED_DAYS} days.</p>}
      </div>
    </div>,
    document.body,
  );
};
