/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v4 — ONE QUERY (design-refs/phone-app-v4/phone-app-v4-pages.html, "Your move" · "Waiting" · "Straight after
 * logging"): a full-screen page with a back arrow, from every door. It replaces v3's 92% sheet.
 *   - the top bar: back, the seal, the agent, "agency · day N", and a person icon that opens the agent's card;
 *   - the status band in the status fill: the glyph, the status, how long ago, the four-node track;
 *   - the thread: v3's (`buildThread` over the card view), the writer's bubbles right, the agent's left in the status fill;
 *   - with the agent: "Reply expected by {date}", how far through, the nudge reminder's date;
 *   - the action bar pinned at the foot: the one filled button is the next step (lib/phoneV3 `nextActs`, PA4-6), the
 *     link beneath it the second action. Both open the app's existing journeys.
 * ⚠️ NO ART ON THIS PAGE (baked decision 4). "Edit query" and "Close this query" stay reachable at the foot of the thread.
 */
import React, { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useScriptAllyDb } from "../../../lib/db";
import { useQueryLog } from "../../todo/ws/WsPreview";
import { buildCardView } from "../../queries/centre/qcCardView";
import { buildThread } from "../../../lib/qcThread152";
import { packagesUnlocked } from "../../../lib/entitlements";
import { anyToMs } from "../../../lib/qcStages";
import { dayMonth } from "../../../lib/dates";
import { ago, nextActs, type V3Query } from "../../../lib/phoneV3";
import { QueryStatus, type Query } from "../../../types";
import { V3Glyph, statusFill } from "../v3/V3Parts";
import { closeV3, openV3Agent } from "../v3/v3Store";
import { Cta, I4, IconBtn, Link4, Seal } from "./V4Parts";
import { clearPending, isFresh, querySig, runAct } from "./acts";
import "./phoneV4.css";

const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** the four-node track: queried, partial, full, offer (−1 for a query closed short of an offer) */
export function trackStage(status: string): number {
  if (status === QueryStatus.SIGNED || status === QueryStatus.OFFER) return 3;
  if ([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN].includes(status as QueryStatus)) return -1;
  if ([QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED].includes(status as QueryStatus)) return 2;
  if ([QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT].includes(status as QueryStatus)) return 1;
  return 0;
}

export const QueryPageV4: React.FC<{ v: V3Query; nowMs: number; quietWeeks: number }> = ({ v, nowMs, quietWeeks }) => {
  const navigate = useNavigate();
  const db = useScriptAllyDb();
  const { currentUser, agents, manuscripts, packages, queries } = db;
  const q = v.row.query as Query;
  const ag = agents.find((a) => a.id === q.agentId) ?? null;
  const ms = manuscripts.find((m) => m.id === q.manuscriptId) ?? null;
  const log = useQueryLog(currentUser?.id ?? null, v.id);
  const thread = useMemo(() => {
    const view = buildCardView({ row: v.row, q, ag, ms, events: log, packages: packages ?? [], queries, manuscripts, nowMs, quietWeeks, desk: true, free: !packagesUnlocked(currentUser) });
    const d = view.v152;
    if (!d) return [];
    return buildThread(d.steps, { first: view.first, nowMs, state: d.state, replyMs: d.replyMs, agentWeeks: d.agentWeeks });
  }, [v.row, q, ag, ms, log, packages, queries, manuscripts, nowMs, quietWeeks, currentUser]);
  const msgs = thread.filter((t) => t.t === "msg").length;
  const sig = querySig(String(v.row.status), v.row.lastMs, msgs);
  const fresh = isFresh(v.id, sig);
  /* leaving the page forgets the step it started */
  useEffect(() => () => clearPending(v.id), [v.id]);

  const agency = v.row.agency && v.row.agency !== "No agency" ? v.row.agency : "";
  const closed = v.court === "closed";
  const stage = trackStage(String(v.row.status));
  const since = v.row.stageStartMs ?? v.row.sentMs;
  const acts = nextActs(v);
  const lastMsg = [...thread].reverse().find((t) => t.t === "msg");
  const nudgeMs = anyToMs(q.nudgeDate);
  const start = v.row.stageStartMs ?? v.row.sentMs;
  const waiting = v.court === "agent" && v.replyMs != null && start != null;
  const weeksAll = waiting ? Math.max(1, Math.round(((v.replyMs as number) - (start as number)) / WEEK)) : 0;
  const weekNow = waiting ? Math.max(1, Math.min(weeksAll, Math.ceil((nowMs - (start as number)) / WEEK))) : 0;

  return (
    <div className="pa4-page pa4" role="dialog" aria-modal="true" aria-label={v.row.agentName} data-pa4="qpage" data-pa3="qsheet" data-id={v.id} data-court={v.court} data-state={v.state} data-fresh={fresh ? "1" : "0"}>
      <div className="pa4-topbar" data-pa4="qtop">
        <IconBtn label="Back" n="back" pa4="back" onClick={closeV3} />
        <Seal name={v.row.agentName} size={40} />
        <div className="who"><b>{v.row.agentName}</b><span className="pa4-s">{[agency, v.day != null ? `day ${v.day}` : null].filter(Boolean).join(" · ")}</span></div>
        {ag ? <IconBtn label={`About ${v.row.agentName}`} n="user" pa4="about" onClick={() => openV3Agent(ag.id)} /> : null}
      </div>
      <div className="pa4-scroll">
        <div className="pa4-band" style={{ background: statusFill(String(v.row.status)) }} data-pa4="band" data-status={v.row.status}>
          <div className="row">
            <V3Glyph status={String(v.row.status)} size={40} bg="rgba(255,255,255,.7)" />
            <div style={{ flex: "none", maxWidth: "50%" }}><h2 className="pa4-h" data-pa4="status">{v.status}</h2><div className="pa4-s">{since != null ? ago(since, nowMs) : closed ? dayMonth(v.row.lastMs) : "Not dated"}</div></div>
            {stage >= 0 ? (
              <div className="pa4-tr4" aria-label={`Stage ${stage + 1} of 4`} data-pa4="track4" data-stage={stage}>
                {[0, 1, 2, 3].map((k) => <React.Fragment key={k}>{k ? <u className={k <= stage ? "on" : ""} /> : null}<i className={k <= stage ? "on" : ""} /></React.Fragment>)}
              </div>
            ) : null}
          </div>
        </div>
        {waiting ? (
          <div style={{ padding: "16px 16px 0" }}>
            <div className="pa4-card" style={{ padding: "16px 24px", boxShadow: "none" }} data-pa4="reply-card">
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <span style={{ color: "var(--pa-navy)" }}><I4 n="clock" style={{ width: 20, height: 20 }} /></span>
                <span className="pa4-b" style={{ flex: 1, fontWeight: 600 }}>Reply expected by {dayMonth(v.replyMs as number)}</span>
              </div>
              <span className="pa4-prog" style={{ height: 8, borderRadius: 4, margin: 0 }} aria-hidden="true"><i style={{ width: `${Math.max(3, Math.min(100, (v.gone ?? 0) * 100))}%` }} /></span>
              <div className="pa4-s" style={{ marginTop: 12 }}>Week {weekNow} of about {weeksAll}.{nudgeMs != null ? ` Nudge reminder set for ${dayMonth(nudgeMs)}.` : ""}</div>
            </div>
          </div>
        ) : null}
        <div className="pa4-th" data-pa4="thread" data-msgs={msgs}>
          {thread.map((t) => t.t === "wait" ? (
            <div key={t.key} className={`pa4-gap pa4-s${t.side === "me" ? " r" : ""}`} data-pa4="wait">{t.label}</div>
          ) : (
            <div key={t.key} className={`pa4-bub${t.side === "them" ? " t" : ""}${fresh && t === lastMsg ? " new" : ""}`} data-pa4="bubble" data-side={t.side}
              style={t.side === "them" ? { background: statusFill(t.status) } : undefined}>
              <span className="pa4-b">{t.title}</span>
              {t.chips.length ? <span className="pa4-s">{t.chips.map((c) => c.label).join(", ")}</span> : t.sub ? <span className="pa4-s">{t.sub}</span> : null}
              {t.quote ? <span className="pa4-s">“{t.quote}”</span> : null}
              <time className="pa4-s pa4-T">{t.date}</time>
            </div>
          ))}
        </div>
        <div className="pa4-inset" style={{ paddingBottom: 24 }} data-pa4="qfoot">
          <Link4 pa4="edit" onClick={() => { closeV3(); window.dispatchEvent(new CustomEvent("pa3:edit-query", { detail: v.id })); }}>Edit query</Link4>
          {!closed && acts?.primary.kind !== "close" && acts?.second?.kind !== "close" ? <Link4 pa4="close-query" onClick={() => runAct("close", v.id, sig)}>Close this query</Link4> : null}
        </div>
      </div>
      {acts || fresh ? (
        <div className="pa4-act" data-pa4="act">
          {v.state === "materials" && v.step && !fresh ? <div className="pa4-s" style={{ textAlign: "center", marginBottom: 12 }}>{v.step.sub}</div> : null}
          {fresh
            ? <Cta pa4="back-today" onClick={() => { clearPending(v.id); closeV3(); navigate("/dashboard"); }}>Back to Today</Cta>
            : <Cta pa4="qact" data-label={acts!.primary.label} onClick={() => runAct(acts!.primary.kind, v.id, sig)}>{acts!.primary.label}</Cta>}
          {fresh && acts ? <Link4 pa4="qact2" onClick={() => runAct(acts.primary.kind, v.id, sig)}>{acts.primary.label}</Link4>
            : acts?.second ? <Link4 pa4="qact2" onClick={() => runAct(acts.second!.kind, v.id, sig)}>{acts.second.label}</Link4> : null}
        </div>
      ) : null}
    </div>
  );
};
