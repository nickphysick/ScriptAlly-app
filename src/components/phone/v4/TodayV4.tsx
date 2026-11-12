/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — TODAY (design-refs/phone-app-v4/phone-app-v4-today.html, four states). The Mentor leans on the header's
 * right edge; the journey track counts the Analytics page's own four rungs; the first card is the To-do workspace's
 * own first task (v3's `ordered`, the same order and count as the desktop board).
 *
 * The four states are read from data alone (PA4-4):
 *   - everyday: there are tasks;
 *   - straight after a task: the task screen handed back what was done (`onDid`);
 *   - a quiet day: queries, and no task;
 *   - day one: no queries at all.
 * ⚠️ List health hides at 100%. The founding card shows to founding writers only (a waitlist place on file).
 */
import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useV3Data } from "../v3/V3Provider";
import { V3Glyph } from "../v3/V3Parts";
import { openV3, openV3Query } from "../v3/v3Store";
import { PhoneTaskScreen } from "../../todo/phone/PhoneTaskScreen";
import { taskLine, type V3Query } from "../../../lib/phoneV3";
import { buildRows } from "../../../lib/analytics";
import { closestOpen, dayN, firstSentMs, nextReply, repliesAhead, streakLine, bestFit, type Closeness } from "../../../lib/phoneV4";
import { activeSeries, weekChange } from "../../../lib/phoneV41";
import { TodayHeaderV41 } from "./TodayHeaderV41";
import { feedEntries } from "../../../lib/dashFeed";
import { dayMonth } from "../../../lib/dates";
import { houseModel } from "../../../lib/dashList";
import { listHealth } from "../../../lib/contactHealth";
import { resolveScopedManuscript } from "../../../lib/shellSidebar";
import { cardTier, useFoundingStats } from "../../../lib/foundingStats";
import { roadFill } from "../../../lib/foundingBand";
import { COMPOSE, RANK_NAMES, nextStep, type ComposeKey } from "../../../lib/foundingCard";
import { feedbackDraft, openFeedback, setFeedbackDraft } from "../../../lib/feedbackStore";
import { QueryStatus, type Activity } from "../../../types";
import type { WsTask } from "../../../lib/todoWs";
import { CAST, Chev, Cta, I4, LapCard as LapCard0, Link4, RANK_HEADS, Ring, Stamp } from "./V4Parts";

/* v4.1: Today's first card sits below the header — nothing overlaps the chart's months (PA41-4) */
const LapCard: React.FC<React.ComponentProps<typeof LapCard0>> = ({ style, ...p }) => <LapCard0 {...p} style={{ marginTop: 16, ...style }} />;
import { BirdBar } from "./BirdsV4";
import { todayState } from "./todayState";
import "./phoneV4.css";

const firstOf = (n: string) => (n || "").trim().split(/\s+/)[0] || "the agent";
const sentence = (s: string) => { const t = s.trim(); return /[.!?]$/.test(t) ? t : `${t}.`; };

interface Did { head: string; next: string | null; queryId: string | null; done: number }

export const TodayV4: React.FC<{ loading?: boolean }> = ({ loading = false }) => {
  const navigate = useNavigate();
  const v = useV3Data();
  const now = v.now;
  const { queries, agents, activities, manuscripts, currentUser, userTasks } = v.core.db;
  const [open, setOpen] = useState<string | null>(null);
  const [did, setDid] = useState<Did | null>(null);

  const rows = useMemo(() => buildRows(queries, activities as Activity[], agents, now), [queries, activities, agents, now]);
  const first = useMemo(() => firstSentMs(rows), [rows]);
  const streak = useMemo(() => streakLine(rows, currentUser?.queryingGoals, now), [rows, currentUser?.queryingGoals, now]);
  const c = v.counts;
  /* a DEV-ONLY review aid (PA4-4): `window.__SA_PA4_TODAY = { tasks: 0 | queries: 0 | healthPct | did }` feeds the same
     derivations emptied inputs, so the measurement can render each of Today's states. The MODE test is at the call site,
     so a production build folds it away. */
  const aid: { tasks?: number; queries?: number; healthPct?: number; did?: boolean } | null = import.meta.env.MODE !== "production" && typeof window !== "undefined"
    ? ((window as unknown as { __SA_PA4_TODAY?: { tasks?: number; queries?: number; healthPct?: number; did?: boolean } }).__SA_PA4_TODAY ?? null) : null;
  const tasks = aid?.tasks === 0 ? [] : v.ordered;
  const shownDid: Did | null = did ?? (aid?.did && v.ordered[0] ? { head: "Done", next: v.ordered[1]?.key ?? null, queryId: v.ordered[0].query?.id ?? null, done: 1 } : null);
  const state = todayState(aid?.queries === 0 ? 0 : v.qs.length, tasks.length, !!shownDid);


  const ms = useMemo(() => {
    let stored: string | null = null;
    try { stored = window.localStorage.getItem("scriptally_active_manuscript_id"); } catch { /* storage refused */ }
    return resolveScopedManuscript(manuscripts, stored) ?? null;
  }, [manuscripts]);
  const health = useMemo(() => (agents.length ? listHealth(agents, houseModel({
    agents, queries, qcRowsAll: v.qs.map((q) => q.row), userTasks, manuscript: ms, user: currentUser ?? null, now: new Date(now),
  })) : null), [agents, queries, v.qs, userTasks, ms, currentUser, now]);

  const feed = useMemo(() => (loading ? [] : feedEntries({ activities, queries, agents, manuscripts, now: new Date(now), seenAt: null, honestDates: true })
    .filter((e) => !e.app).slice(0, 4)), [loading, activities, queries, agents, manuscripts, now]);
  const closest = useMemo(() => closestOpen(v.qs, now, 3), [v.qs, now]);
  const live = useMemo(() => v.qs.filter((q) => q.court !== "closed"), [v.qs]);
  const nr = useMemo(() => nextReply(v.qs, now), [v.qs, now]);
  const toQuery = useMemo(() => bestFit(agents, queries).length, [agents, queries]);

  const onDid = (d: { head: string; task: WsTask; next: string | null }) => {
    setOpen(null);
    setDid((p) => ({ head: d.head, next: d.next, queryId: d.task.query?.id ?? null, done: (p?.done ?? 0) + 1 }));
  };

  /* Phone app v4.1: the header holds four things (baked decision 2): the day line with streak and search, the active
     figure with its change on last week, the need pill, the chart */
  const series = useMemo(() => activeSeries(queries, now), [queries, now]);
  const upRef = useRef<HTMLDivElement>(null);
  const toUpNext = () => upRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  const hero = (
    <TodayHeaderV41 day={first != null ? `Day ${dayN(first, now)} of querying` : "Getting started"} streakWeeks={streak.weeks}
      active={c.active} change={weekChange(series)} need={tasks.length} series={series} dayOne={state === "dayone"} onNeed={toUpNext} />
  );

  /* ── the first card, by state ── */
  let lead: React.ReactNode = null;
  if (state === "everyday") {
    const t = tasks[0];
    const q = t.query ? v.byId.get(t.query.id) ?? null : null;
    const body = q?.step ? `${q.step.title} ${q.step.sub}` : taskLine(t, q);
    lead = (
      <LapCard pa4="up-next">
        <div className="pa4-s" style={{ marginBottom: 16 }} data-pa4="up-pos">Up next · 1 of {tasks.length}</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
          <V3Glyph status={t.query?.status ?? null} size={48} />
          <h2 className="pa4-h" data-pa4="up-title">{t.title}</h2>
        </div>
        {body ? <p className="pa4-b pa4-body" style={{ marginBottom: 24 }}>{body}</p> : <div style={{ height: 16 }} />}
        <Cta pa4="up-verb" onClick={() => setOpen(t.key)}>{t.type ?? "Open"}</Cta>
        {tasks.length > 1 ? (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--pa-rule)" }}>
            {tasks.slice(1, 3).map((x) => (
              <button key={x.key} type="button" className="pa4-tap" data-pa4="up-row" onClick={() => setOpen(x.key)}>
                <V3Glyph status={x.query?.status ?? null} size={40} label={false} />
                <span className="pa4-x pa4-b">{x.title}</span><Chev />
              </button>
            ))}
          </div>
        ) : null}
        <Link4 rule pa4="see-all" onClick={() => openV3({ type: "tasks" })}>See all {tasks.length}</Link4>
      </LapCard>
    );
  } else if (state === "after" && shownDid) {
    const did = shownDid;
    const nextT = did.next ? tasks.find((t) => t.key === did.next) ?? null : tasks[0] ?? null;
    const total = did.done + tasks.length;
    const q = did.queryId ? v.byId.get(did.queryId) ?? null : null;
    lead = (
      <LapCard pa4="after">
        <Stamp word="Done" date={dayMonth(now)} />
        <div className="pa4-pips" style={{ marginRight: 96 }} data-pa4="pips" aria-label={`${did.done} of ${total} done`}>
          {Array.from({ length: Math.min(total, 12) }, (_, k) => <i key={k} className={k < did.done ? "on" : ""} />)}
        </div>
        <h2 className="pa4-h" style={{ marginBottom: 8, maxWidth: 200 }} data-pa4="did">{sentence(did.head)}</h2>
        <p className="pa4-b pa4-body" style={{ marginBottom: 24 }}>{nextT ? `Next: ${sentence(nextT.title)}` : "That was the last one for now."}</p>
        {nextT
          ? <Cta pa4="continue" onClick={() => { setDid(null); setOpen(nextT.key); }}>Continue</Cta>
          : <Cta pa4="continue" onClick={() => setDid(null)}>Back to Today</Cta>}
        {q ? <Link4 pa4="review" style={{ minHeight: 56 }} onClick={() => openV3Query(q.id)}>Review {firstOf(q.row.agentName)}’s thread</Link4> : <div style={{ height: 16 }} />}
      </LapCard>
    );
  } else if (state === "quiet") {
    const ahead = repliesAhead(v.qs, now);
    lead = (
      <LapCard pa4="quiet">
        <div className="pa4-s" style={{ marginBottom: 16 }}>Coming up</div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
          <V3Glyph status={nr?.row.status ?? QueryStatus.QUERIED} size={48} />
          <h2 className="pa4-h" data-pa4="quiet-title">{nr ? `${nr.row.agentName} should reply by ${dayMonth(nr.replyMs as number)}` : "Nothing needs you today."}</h2>
        </div>
        <p className="pa4-b pa4-body" style={{ marginBottom: 24 }}>
          {nr ? "That’s the next date on your list." : "No reply date is due yet."}
          {toQuery ? ` ${toQuery} ${toQuery === 1 ? "agent on your list hasn’t" : "agents on your list haven’t"} been queried yet.` : ""}
        </p>
        <Cta pa4="whos-next" onClick={() => navigate("/agents")}>See who’s next to query</Cta>
        {ahead.length > 1 ? (
          <div style={{ marginTop: 16, borderTop: "1px solid var(--pa-rule)" }}>
            {ahead.slice(1, 3).map((q) => (
              <button key={q.id} type="button" className="pa4-tap" style={{ minHeight: 72 }} data-pa4="ahead-row" onClick={() => openV3Query(q.id)}>
                <V3Glyph status={q.row.status} size={40} label={false} />
                <span className="pa4-x"><b>{q.row.agentName}</b><span className="pa4-s">Reply expected</span></span>
                <span className="pa4-s pa4-T">{dayMonth(q.replyMs as number)}</span>
              </button>
            ))}
          </div>
        ) : <div style={{ height: 16 }} />}
      </LapCard>
    );
  } else {
    lead = (
      <LapCard pa4="dayone">
        <div className="pa4-s" style={{ marginBottom: 16 }}>Start here</div>
        <h2 className="pa4-h" style={{ marginBottom: 8 }}>Who have you queried so far?</h2>
        <p className="pa4-b pa4-body" style={{ marginBottom: 24 }}>Log one now and this page starts keeping track.</p>
        <Cta pa4="log-first" onClick={() => openV3({ type: "plus" })}>Log your first query</Cta>
        <div style={{ marginTop: 16, borderTop: "1px solid var(--pa-rule)" }}>
          <button type="button" className="pa4-tap" data-pa4="import" onClick={() => navigate("/import")}>
            <V3Glyph status={QueryStatus.QUERIED} size={40} label={false} /><span className="pa4-x pa4-b">Bring your spreadsheet across</span><Chev />
          </button>
          <button type="button" className="pa4-tap" data-pa4="add-agents" onClick={() => openV3({ type: "add" })}>
            <V3Glyph status={QueryStatus.QUERIED} size={40} label={false} /><span className="pa4-x pa4-b">Add agents you plan to query</span><Chev />
          </button>
        </div>
      </LapCard>
    );
  }

  return (
    <div className="pa4 pa4-today" data-pa4="today" data-state={state} data-tasks={tasks.length} data-loading={loading ? "1" : "0"}>
      {hero}
      {loading ? null : <div ref={upRef} data-pa41="lead" style={{ scrollMarginTop: 72 }}>{lead}</div>}
      {loading || state === "dayone" ? null : (
        <div className="pa4-inset">
          <RingCard qs={v.qs} c={c} next={nr} onCourt={(k) => navigate(`/queries?court=${k}`)} />
          {closest.length ? <ClosestCard rows={closest} total={live.length} now={now} onAll={() => navigate("/queries?view=birds")} /> : null}
          {health && (aid?.healthPct ?? health.pct) < 100 ? (
            <div className="pa4-card" style={{ marginTop: 16, padding: "24px 24px 8px" }} data-pa4="health" data-pct={health.pct}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <img src={CAST.archivist} alt="" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", background: "var(--pa-fill)" }} />
                <div style={{ flex: 1, minWidth: 0 }}><h2 className="pa4-h">List health</h2><div className="pa4-s">{agents.length} {agents.length === 1 ? "agent" : "agents"} on file</div></div>
                <span className="pa4-d" data-pa4="health-pct">{health.pct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 4, background: "var(--pa-fill)", overflow: "hidden" }} aria-hidden="true"><i style={{ display: "block", width: `${health.pct}%`, height: "100%", borderRadius: 4, background: "var(--pa-navy)" }} /></div>
              <p className="pa4-b pa4-body" style={{ margin: "16px 0 8px" }}>{health.gaps > 0 ? `${health.gaps} ${health.gaps === 1 ? "detail is" : "details are"} missing from your list.` : "Some details are put off for later."} Filling them in keeps your reply dates and nudges accurate.</p>
              <Link4 sb pa4="fill-gaps" onClick={() => navigate("/agents")}>Fill in the gaps</Link4>
            </div>
          ) : null}
          <FoundingCard uid={currentUser?.id ?? null} />
          <div className="pa4-sec" style={{ margin: "32px 8px 8px" }}><h2 className="pa4-h">Lately</h2></div>
          <div style={{ padding: "0 8px" }} data-pa4="lately">
            {feed.length ? feed.map((e) => {
              const name = e.say.find((x) => x.who)?.t;
              return (
                <button key={e.id} type="button" className="pa4-tap" style={{ minHeight: 72 }} data-pa4="feed-row" onClick={() => { if (e.queryId) openV3Query(e.queryId); }}>
                  <V3Glyph status={e.status} size={40} label={false} />
                  <span className="pa4-x"><b>{name ?? e.say.map((x) => x.t).join("")}</b><span className="pa4-s">{name ? e.say.map((x) => x.t).join("") : e.provenance}</span></span>
                  <span className="pa4-s pa4-T">{dayMonth(e.at)}</span>
                </button>
              );
            }) : <p className="pa4-b pa4-empty">Nothing logged yet.</p>}
            <Link4 rule pa4="all-replies" onClick={() => navigate("/queries/responses")}>See all replies</Link4>
            <div style={{ height: 24 }} />
          </div>
        </div>
      )}
      {open ? <PhoneTaskScreen core={v.core} tasks={tasks} startKey={open} now={now} onClose={() => setOpen(null)} onDid={onDid} /> : null}
    </div>
  );
};

/* ── Where your queries are ── */
const RingCard: React.FC<{ qs: readonly V3Query[]; c: ReturnType<typeof useV3Data>["counts"]; next: V3Query | null; onCourt: (k: "you" | "agent" | "quiet") => void }> = ({ c, next, onCourt }) => {
  const parts = [
    { k: "you" as const, n: c.you, colour: "var(--pa-blush)", l: "with you" },
    { k: "agent" as const, n: c.agent, colour: "var(--pa-ring-agent)", l: "with the agent" },
    { k: "quiet" as const, n: c.quiet, colour: "var(--pa-ring-quiet)", l: "gone quiet" },
  ];
  return (
    <div className="pa4-ring" data-pa4="ring-card">
      <h2 className="pa4-h" style={{ marginBottom: 16 }}>Where your queries are</h2>
      <div className="pa4-rw">
        <Ring parts={parts} total={c.active} label={parts.map((p) => `${p.n} ${p.l}`).join(", ")} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {parts.map((p) => (
            <button key={p.k} type="button" className="rr" data-pa4="court" data-k={p.k} data-count={p.n} onClick={() => onCourt(p.k)}>
              <i style={{ background: p.colour }} /><b className="pa4-n" style={{ width: 28, textAlign: "left" }}>{p.n}</b><span className="pa4-s" style={{ textAlign: "left" }}>{p.l}</span>
            </button>
          ))}
        </div>
      </div>
      {next ? (
        <div className="nx" data-pa4="next-reply"><I4 n="clock" style={{ width: 20, height: 20, color: "var(--pa-blush)" }} /><span className="pa4-s">Next reply expected: <b>{next.row.agentName}, by {dayMonth(next.replyMs as number)}</b></span></div>
      ) : null}
    </div>
  );
};

/* ── Closest to their date (the Birds-eye preview) ── */
const ClosestCard: React.FC<{ rows: Closeness[]; total: number; now: number; onAll: () => void }> = ({ rows, total, now, onAll }) => (
  <div className="pa4-card" style={{ marginTop: 16, padding: "24px 24px 8px" }} data-pa4="closest">
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
      <div style={{ flex: 1 }}><h2 className="pa4-h">Closest to their date</h2><div className="pa4-s">From your Birds-eye view</div></div>
      <img src={CAST.beHead} alt="" style={{ width: 56, margin: "-8px -4px 0 0" }} />
    </div>
    <div style={{ paddingTop: 8 }}>{rows.map((r) => <BirdBar key={r.q.id} c={r} now={now} onTap={() => openV3Query(r.q.id)} />)}</div>
    <Link4 sb pa4="closest-all" onClick={onAll}>See all {total} in the Birds-eye view</Link4>
  </div>
);

/* ── Founding writer ── */
const FoundingCard: React.FC<{ uid: string | null }> = ({ uid }) => {
  const { loading, stats } = useFoundingStats(uid);
  if (loading || stats.foundingNo == null) return null;
  const tier = cardTier(stats);
  const fill = roadFill(tier, stats.contributions);
  const open = (k: ComposeKey) => {
    const spec = COMPOSE.find((x) => x.key === k)!;
    setFeedbackDraft({ ...feedbackDraft(), kind: spec.kind });
    openFeedback();
  };
  return (
    <div className="pa4-found" data-pa4="founding" data-tier={tier}>
      <div className="pa4-s" style={{ color: "var(--pa-body)", marginBottom: 8 }}>Founding writer</div>
      <h2 className="pa4-h" style={{ marginBottom: 24 }}>Your feedback shapes QueryHawk</h2>
      <div className="pa4-road" aria-label={`You’re at ${RANK_NAMES[tier]}`}>
        <i />
        {fill != null ? <i className="f" style={{ width: `calc((100% - 48px) * ${fill / 4})` }} /> : null}
        {RANK_HEADS.map((src, k) => (
          <div key={src} className={k + 1 === tier ? "on" : k + 1 < tier ? "got" : ""}>
            <img src={src} alt="" />
            <div className="pa4-s" style={{ marginTop: 8, whiteSpace: "nowrap", ...(k + 1 === tier ? { color: "var(--pa-ink)", fontWeight: 600 } : {}) }}>{k + 1 === tier || (tier < 1 && k === 0) ? RANK_NAMES[k + 1] : ""}</div>
          </div>
        ))}
      </div>
      <p className="pa4-b pa4-body" style={{ marginBottom: 16 }}>{nextStep(stats)}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {COMPOSE.map((x) => <button key={x.key} type="button" className="pa4-fb" data-pa4="fb" data-k={x.key} onClick={() => open(x.key)}>{x.label}</button>)}
      </div>
    </div>
  );
};
