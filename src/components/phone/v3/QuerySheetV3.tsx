/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone app v3 — THE QUERY SHEET (ref `oQuery`): a 92% pull-up. The header in the status fill with the glyph, agent,
 * agency, the four-node track and "status · day N · queried date"; then "Your next step" and its actions; then "The
 * story so far" as the v152 message thread; then the links.
 *
 * ⚠️ NOTHING HERE WRITES. Every action opens the app's own journey for that query (`openQueryDrawer`: sent, nudge,
 *    close, offer — the same doors the Query Centre's card opens), whose writers go through `recomputeQuery`.
 * ⚠️ THE STORY IS THE QUERY CENTRE CARD'S OWN: the query's live activity log (`useQueryLog`), read by the card's one
 *    derivation (`buildCardView` → its v152 steps) and laid out by the card's thread builder (`buildThread`).
 */
import React, { useMemo } from "react";
import { useScriptAllyDb } from "../../../lib/db";
import { useQueryLog } from "../../todo/ws/WsPreview";
import { buildCardView } from "../../queries/centre/qcCardView";
import { buildThread } from "../../../lib/qcThread152";
import { packagesUnlocked } from "../../../lib/entitlements";
import { openQueryDrawer } from "../../../lib/queryActions/drawerStore";
import { dayMonth } from "../../../lib/dates";
import { QueryStatus, type Query } from "../../../types";
import type { V3Query } from "../../../lib/phoneV3";
import { V3Glyph, statusFill } from "./V3Parts";
import { V3I } from "./v3Icons";
import { closeV3, openV3, openV3Agent } from "./v3Store";

const STAGES = ["Queried", "Partial", "Full", "Offer"];
/** how far along the four-node track (ref `info().stage`): -1 for a closed query that never signed */
export function trackStage(status: string): number {
  if (status === QueryStatus.SIGNED || status === QueryStatus.OFFER) return 3;
  if ([QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN].includes(status as QueryStatus)) return -1;
  if ([QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.REVISE_RESUBMIT, QueryStatus.RESUBMITTED].includes(status as QueryStatus)) return 2;
  if ([QueryStatus.PARTIAL_REQUESTED, QueryStatus.PARTIAL_SENT].includes(status as QueryStatus)) return 1;
  return 0;
}

const firstOf = (n: string) => (n || "").trim().split(/\s+/)[0] || "the agent";
/** a journey replaces the sheet (one overlay at a time) */
const door = (req: Parameters<typeof openQueryDrawer>[0]) => { closeV3(); openQueryDrawer(req); };

export const QuerySheetV3: React.FC<{ v: V3Query; nowMs: number; quietWeeks: number }> = ({ v, nowMs, quietWeeks }) => {
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

  const first = firstOf(v.row.agentName);
  const closed = v.court === "closed";
  const stage = trackStage(v.row.status);
  const reply = () => openV3({ type: "reply", queryId: v.id });
  let acts: React.ReactNode = null;
  switch (v.state) {
    case "materials": acts = <button type="button" className="pa3-pill" data-pa3="act" onClick={() => door({ mode: "sent", queryId: v.id })}>Mark sent</button>; break;
    case "nudge": acts = (<>
      <button type="button" className="pa3-pill" data-pa3="act" onClick={() => door({ mode: "nudge", queryId: v.id })}>I’ve nudged</button>
      <button type="button" className="pa3-pill q" data-pa3="act" onClick={() => door({ mode: "close", queryId: v.id })}>Close it</button>
    </>); break;
    case "quiet": acts = (<>
      <button type="button" className="pa3-pill" data-pa3="act" onClick={() => door({ mode: "close", queryId: v.id })}>Close it</button>
      <button type="button" className="pa3-pill q" data-pa3="act" onClick={() => door({ mode: "nudge", queryId: v.id })}>Nudge</button>
    </>); break;
    case "offer": acts = <button type="button" className="pa3-pill b" data-pa3="act" onClick={() => door({ mode: "offer", queryId: v.id, preset: { step: 1 } } as never)}>Record your answer</button>; break;
    case "agent": acts = <button type="button" className="pa3-pill q" data-pa3="act" onClick={reply}>{first} replied</button>; break;
    case "closed": acts = null; break;
    default: { const unhandled: never = v.state; acts = unhandled; }
  }
  const agency = v.row.agency && v.row.agency !== "No agency" ? v.row.agency : "";

  return (
    <div className="pa3-sheet" style={{ height: "92%" }} role="dialog" aria-modal="true" aria-label={v.row.agentName} data-pa3="qsheet" data-id={v.id} data-court={v.court}>
      <div className="pa3-grab" />
      <div className="pa3-qh" style={{ background: statusFill(v.row.status) }}>
        <div className="pa3-who">
          <V3Glyph status={v.row.status} bg="rgba(255,255,255,.6)" />
          <div><b>{v.row.agentName}</b>{agency ? <span>{agency}</span> : null}</div>
          <button type="button" className="pa3-ib pa3-x" aria-label="Close" data-pa3="close" onClick={closeV3}><V3I n="x" /></button>
        </div>
        {closed && v.row.status !== QueryStatus.SIGNED ? null : (
          <div className="pa3-trk" data-pa3="track" data-stage={stage}>
            {STAGES.map((s, k) => (
              <React.Fragment key={s}>
                {k ? <span className={`pa3-ln${k <= stage ? " on" : ""}`} /> : null}
                <span className={`pa3-nd${k <= stage ? " on" : ""}`}><i>{k <= stage ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : null}</i>{s}</span>
              </React.Fragment>
            ))}
          </div>
        )}
        <div className="pa3-stline" data-pa3="stline"><b>{v.status}</b> · {closed
          ? dayMonth(v.row.lastMs)
          : `${v.day != null ? `day ${v.day}` : "not dated"}${v.queriedMs != null ? ` · queried ${dayMonth(v.queriedMs)}` : ""}`}</div>
      </div>
      <div className="pa3-pad">
        {v.step ? (
          <div className="pa3-next" data-pa3="next">
            <small>Your next step</small>
            <b>{v.step.title}</b>
            <p>{v.step.sub}</p>
            {acts ? <div className="pa3-acts">{acts}</div> : null}
          </div>
        ) : null}
        <div className="pa3-sec"><h2 className="pa3-h2">The story so far</h2></div>
        <div className="pa3-th" data-pa3="thread" data-msgs={thread.filter((t) => t.t === "msg").length}>
          {thread.map((t) => t.t === "wait" ? (
            <div key={t.key} className={`pa3-gap${t.side === "me" ? " r" : ""}`} data-pa3="wait">{t.label}</div>
          ) : (
            <div key={t.key} className={`pa3-bub${t.side === "them" ? " them" : ""}`} data-pa3="bubble" data-side={t.side}
              style={t.side === "them" ? { background: statusFill(t.status) } : undefined}>
              {t.title}
              {t.chips.length ? <small>{t.chips.map((c) => c.label).join(", ")}</small> : t.sub ? <small>{t.sub}</small> : null}
              {t.quote ? <small>“{t.quote}”</small> : null}
              <time>{t.date}</time>
            </div>
          ))}
        </div>
        <div className="pa3-links" data-pa3="links">
          {closed ? null : <button type="button" data-pa3="log-reply" onClick={reply}>Log a reply</button>}
          {ag ? <button type="button" data-pa3="about" onClick={() => openV3Agent(ag.id)}>About {first}</button> : null}
          <button type="button" data-pa3="edit" onClick={() => { closeV3(); window.dispatchEvent(new CustomEvent("pa3:edit-query", { detail: v.id })); }}>Edit</button>
          {!closed && !v.task ? <button type="button" className="dz" data-pa3="close-query" onClick={() => door({ mode: "close", queryId: v.id })}>Close query</button> : null}
        </div>
      </div>
    </div>
  );
};
