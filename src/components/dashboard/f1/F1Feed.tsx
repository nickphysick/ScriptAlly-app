/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD FEED v1 — the activity feed in the page's middle column (Part D; ref design-refs/dashboard-feed-v1/).
 *
 * At the top, three equal pills: All activity · Agents · You. Below them the feed scrolls inside the column, under day
 * headings: BIG cards for requests, offers and your materials going out (who, what happened, two figures, the query's
 * journey, "Sent with" and Open query), one-line MINI rows for everything else. Seven days at a time; "Show earlier"
 * loads the next seven in place.
 *
 * ⚠️ IT WRITES NOTHING. "Open query" goes to the query in the Query Centre. The words and figures are
 * `lib/dashF1Feed`'s, over `feedEntries` (the one resolver every feed surface narrates from).
 */
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Activity, Agent, Manuscript, Query } from "../../../types";
import type { FeedSeg } from "../../../lib/dashFeed";
import { feedEntries } from "../../../lib/dashFeed";
import { drawerEvents, type FeedFilter } from "../../../lib/dashFeedDrawer";
import { buildQcRows } from "../../../lib/qcSummary";
import { F1_EARLIER, F1_END, F1_NOTHING, F1_WINDOW_DAYS, f1Days, f1From, type F1Big, type F1Mini } from "../../../lib/dashF1Feed";
import { StatusDot } from "../../StatusDot";
import { BellGlyph, GearGlyph } from "../v58/Dash58Feed";

export const F1_SWITCH: readonly { key: FeedFilter; label: string }[] = [
  { key: "all", label: "All activity" },
  { key: "in", label: "Agents" },
  { key: "out", label: "You" },
];


const Segs: React.FC<{ say: readonly FeedSeg[] }> = ({ say }) => (
  <>{say.map((s, i) => (s.who ? <b key={i}>{s.t}</b> : s.em ? <i key={i}>{s.t}</i> : <React.Fragment key={i}>{s.t}</React.Fragment>))}</>
);

const ImportGlyph = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="M12 17v-6M9.5 13.5L12 11l2.5 2.5" />
  </svg>
);

const Big: React.FC<{ c: F1Big; onOpen: (queryId: string) => void }> = ({ c, onOpen }) => (
  <article className="df1-entry" data-df1="big" data-kind={c.kind} data-dir={c.dir} data-status={c.status} data-query={c.queryId}>
    <div className="df1-eh">
      <span className={`df1-disc${c.dir === "out" ? " is-me" : ""}`} aria-hidden="true">{c.initials}</span>
      <div className="df1-ehw"><b>{c.name}</b><small data-df1="big-meta">{c.meta}</small></div>
    </div>
    <div className="df1-et">
      <span className="df1-eico"><StatusDot status={c.status} overrideSize={22} decorative /></span>
      <h3 className="df1-eh3" data-df1="big-headline">{c.headline}</h3>
    </div>
    {c.figs.length > 0 && (
      <div className="df1-figs" data-df1="figs">
        {c.figs.map((f) => <div key={f.label}><small>{f.label}</small><b>{f.value}</b></div>)}
      </div>
    )}
    <div className="df1-journey" data-df1="journey">
      {c.stops.length > 0 && (
        <ol className="df1-trk">
          {c.stops.map((s, i) => {
            const last = i === c.stops.length - 1;
            const toNext = !last && c.stops[i + 1].next;
            return (
              <li key={`${s.status}-${i}`} className={[last ? "is-last" : "", toNext ? "is-to" : "", s.next ? "is-next" : ""].filter(Boolean).join(" ") || undefined} data-df1="stop" data-next={s.next ? "1" : undefined}>
                <span className="df1-sd"><StatusDot status={s.status} overrideSize={18} decorative /></span>
                {!last && <span className="df1-ln" aria-hidden="true" />}
                <b>{s.label}</b>
                <small>{s.date || " "}</small>
              </li>
            );
          })}
        </ol>
      )}
      <div className="df1-jf">
        <span>{c.pkg ? <>Sent with <span className="df1-chip" data-df1="pkg">{c.pkg}</span></> : null}</span>
        <button type="button" className="df1-btn" data-df1="open-query" onClick={() => onOpen(c.queryId)}>Open query</button>
      </div>
    </div>
    {c.mats && (
      <div className="df1-mats" data-df1="mats">
        {c.mats.map((m, i) => (
          <div key={i} className="df1-mat" data-df1="mat">
            <div className="df1-matl" aria-hidden="true"><i /><i /><i /></div>
            <div><b>{m.name}</b>{m.version && <small>{m.version}</small>}</div>
          </div>
        ))}
      </div>
    )}
  </article>
);

const Mini: React.FC<{ m: F1Mini }> = ({ m }) => (
  <div className="df1-mini" data-df1="mini" data-dir={m.dir} data-status={m.status ?? ""} data-glyph={m.glyph}>
    <span className={`df1-mg df1-mg--${m.glyph}`} aria-hidden="true">
      {m.glyph === "status" && m.status ? <StatusDot status={m.status} overrideSize={20} decorative />
        : m.glyph === "house" ? <GearGlyph /> : m.glyph === "import" ? <ImportGlyph /> : <BellGlyph />}
    </span>
    <span className="df1-mtx" data-df1="mini-say"><Segs say={m.say} /></span>
    <time>{m.time}</time>
  </div>
);

export const F1Feed: React.FC<{
  loading: boolean;
  activities: Activity[];
  queries: Query[];
  agents: Agent[];
  manuscripts: Manuscript[];
  userName: string;
  now: Date;
  /** First visit v2 (Part G): drawn under the newest row about `queryId`, or at the top when no such row is showing */
  under?: { queryId: string; node: React.ReactNode } | null;
}> = ({ loading, activities, queries, agents, manuscripts, userName, now, under }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FeedFilter>("all");
  /* how many seven-day windows are showing: 1, then 2 after one "Show earlier", … */
  const [windows, setWindows] = useState(1);
  const from = f1From(now, windows);
  const entries = useMemo(
    () => (loading ? [] : feedEntries({ activities, queries, agents, manuscripts, now, seenAt: null, from, honestDates: true })),
    [loading, activities, queries, agents, manuscripts, now, from],
  );
  const qcRows = useMemo(() => buildQcRows(queries, agents, activities, now.getTime()), [queries, agents, activities, now]);
  const events = useMemo(() => drawerEvents(entries, qcRows), [entries, qcRows]);
  const days = useMemo(
    () => f1Days(events, filter, { queries, agents, manuscripts, qcRows, userName, now }),
    [events, filter, queries, agents, manuscripts, qcRows, userName, now],
  );
  const hasEarlier = useMemo(() => activities.some((a) => { const t = new Date(a.date).getTime(); return Number.isFinite(t) && t < from; }), [activities, from]);
  const open = (id: string) => navigate(`/queries?q=${encodeURIComponent(id)}`);
  /* the newest row about the query the ask belongs under (Part G); the days run newest first */
  const underAt = useMemo(() => {
    if (!under) return null;
    for (const d of days) for (const it of d.items) if (it.queryId === under.queryId) return it.id;
    return null;
  }, [days, under]);

  return (
    <section className="df1-feedcol" aria-label="Activity feed" data-df1="feedcol" data-filter={filter}>
      <div className="df1-sw" role="group" aria-label="Show">
        {F1_SWITCH.map((f) => (
          <button key={f.key} type="button" data-df1-sw={f.key} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
        ))}
      </div>
      <div className="df1-fscroll" data-df1="fscroll" data-loading={loading ? "1" : "0"}>
        {!loading && under && !underAt && under.node}
        {!loading && days.map((d) => (
          <React.Fragment key={d.key}>
            <div className="df1-day" data-df1="day"><b>{d.first}</b><span>{d.rest}</span></div>
            {d.items.map((it) => (
              <React.Fragment key={it.id}>
                {it.type === "big" ? <Big c={it} onOpen={open} /> : <Mini m={it} />}
                {under && it.id === underAt && under.node}
              </React.Fragment>
            ))}
          </React.Fragment>
        ))}
        {!loading && (
          <div className="df1-fend" data-df1="feed-end">
            {days.length === 0 ? F1_NOTHING : F1_END(windows * F1_WINDOW_DAYS)}
            {hasEarlier && <> <button type="button" className="df1-earlier" data-df1="earlier" onClick={() => setWindows((w) => w + 1)}>{F1_EARLIER} →</button></>}
          </div>
        )}
      </div>
    </section>
  );
};
