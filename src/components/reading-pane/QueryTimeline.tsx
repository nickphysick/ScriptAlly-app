/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QueryTimeline — the reading pane's "Tracking" pipeline timeline (query reading-pane redesign,
 * Phase 2). A READER of derived data: it renders the per-query activity log as a vertical pipeline
 * (real StatusDot nodes + connectors), then the forward-looking projections — a ghost "waiting"
 * node with the sage response-window bar, and a scheduled nudge node. It writes nothing.
 *
 * Factored as its own component so the reading pane and (later) any other pipeline surface share one
 * timeline style rather than diverging. The dashboard "Story so far" is a separate global card-feed,
 * intentionally not this pipeline presentation.
 */
import React from "react";
import { StatusDot } from "../StatusDot";
import { Query, QueryStatus, Agent, QueryMaterial } from "../../types";
import { formatQueryMaterial } from "../../lib/materials";

const FONT_MONO = "'JetBrains Mono', monospace";

const TL_TITLES: Record<QueryStatus, string> = {
  [QueryStatus.QUERIED]: "Query sent",
  [QueryStatus.PARTIAL_REQUESTED]: "Partial requested",
  [QueryStatus.PARTIAL_SENT]: "Partial sent",
  [QueryStatus.FULL_REQUESTED]: "Full requested",
  [QueryStatus.FULL_SENT]: "Full sent",
  [QueryStatus.REVISE_RESUBMIT]: "Revise & resubmit requested",
  [QueryStatus.OFFER]: "Offer of representation",
  [QueryStatus.REJECTED]: "Query rejected",
  [QueryStatus.WITHDRAWN]: "Query withdrawn",
  [QueryStatus.NO_RESPONSE]: "Closed — no response",
};
const SENT_STATUSES = new Set<QueryStatus>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);
const WAITING_STATUSES = new Set<QueryStatus>([QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]);
const DAY = 86400000;

const getTime = (val: any): number => {
  if (!val) return Date.now();
  if (val.toDate) return val.toDate().getTime();
  if (val.seconds) return val.seconds * 1000;
  const t = new Date(val).getTime();
  return isNaN(t) ? Date.now() : t;
};
/** Mockup timeline dates: "1 MAY" — day + short month, uppercased, no year. */
const fmtShort = (ms: number): string => {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase();
};

// ── the outline materials pill (mockup .pill) ─────────────────────────────────────
const MatPill: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ display: "inline-flex", alignItems: "center", fontFamily: "'Inter',sans-serif", fontSize: 11, fontWeight: 500, color: "#6a5b4c", background: "#fdfaf5", border: "1px solid #ddcdbb", borderRadius: 999, padding: "4px 11px" }}>{children}</span>
);

interface RowSpec {
  key: string;
  kind: "status" | "ghost" | "nudge";
  status?: QueryStatus;
  title: string;
  date?: string;
  sub?: string;
  pills?: string[];
  resp?: { width: number; dayCap: string; expCap: string; overdue: boolean } | null;
}

export interface QueryTimelineProps {
  query: Query;
  agent: Agent | null;
  events: any[];
}

export const QueryTimeline: React.FC<QueryTimelineProps> = ({ query, agent, events }) => {
  const validEnumValues = Object.values(QueryStatus);

  // Dedupe the activity log by status (keep the earliest of each), then order chronologically.
  const raw = (events || []).filter((evt) => validEnumValues.includes(evt.type as QueryStatus));
  const byType: Record<string, any> = {};
  raw.forEach((evt) => {
    const t = evt.type as string;
    if (!byType[t] || getTime(evt.createdAt) < getTime(byType[t].createdAt)) byType[t] = evt;
  });
  const statusEvents = Object.values(byType).sort((a, b) => getTime(a.createdAt) - getTime(b.createdAt));
  // Synthesise the "Query sent" root from dateSent when no Queried rung exists.
  if (!statusEvents.some((e) => e.type === QueryStatus.QUERIED) && query.dateSent) {
    statusEvents.unshift({ type: QueryStatus.QUERIED, createdAt: query.dateSent });
  }

  // Materials that accompanied a send. Only the query-level list is recorded (under the Query sent
  // event); per-send materials for Partial/Full sent are not stored.
  // TODO(per-send-materials): the activity log records no per-event materials, so Partial/Full sent
  // show no pills. Wire these once each *sent* activity carries the materials it shipped with.
  const queryMaterials: string[] = Array.isArray(query.materialsWanted)
    ? (query.materialsWanted as (string | QueryMaterial)[]).map(formatQueryMaterial).filter(Boolean)
    : [];

  const rows: RowSpec[] = statusEvents.map((evt, i) => {
    const status = evt.type as QueryStatus;
    const baseTitle = TL_TITLES[status] || status;
    const title = status === QueryStatus.FULL_SENT && (query.revisionRound ?? 1) >= 2 ? `${baseTitle} (v${query.revisionRound})` : baseTitle;
    let sub: string | undefined;
    if (status === QueryStatus.QUERIED) sub = `via ${query.sendMethod || "Email"}`;
    else if (status === QueryStatus.PARTIAL_REQUESTED || status === QueryStatus.FULL_REQUESTED) sub = `${agent?.name?.split(" ")[0] || "The agent"} asked for ${status === QueryStatus.PARTIAL_REQUESTED ? "a partial" : "the full"}`;
    return {
      key: `s-${status}-${i}`,
      kind: "status",
      status,
      title,
      date: fmtShort(getTime(evt.createdAt)),
      sub,
      pills: status === QueryStatus.QUERIED && queryMaterials.length ? queryMaterials : undefined,
    };
  });

  // ── forward projections ──────────────────────────────────────────────────────
  const now = Date.now();
  const awaiting = WAITING_STATUSES.has(query.status as QueryStatus);
  if (awaiting) {
    // Response-window bar — only when the agent has a turnaround on record.
    let resp: RowSpec["resp"] = null;
    const weeks = typeof agent?.responseTimeWeeks === "number" ? agent.responseTimeWeeks : 0;
    if (weeks > 0) {
      // Count from the latest send event (what we're waiting on a reply to).
      const lastSendMs = statusEvents
        .filter((e) => SENT_STATUSES.has(e.type as QueryStatus))
        .reduce((mx, e) => Math.max(mx, getTime(e.createdAt)), 0) || (query.dateSent ? getTime(query.dateSent) : now);
      const mDays = weeks * 7;
      const nDays = Math.max(0, Math.floor((now - lastSendMs) / DAY));
      const expMs = query.responseDeadline ? getTime(query.responseDeadline) : lastSendMs + mDays * DAY;
      const overdue = nDays > mDays;
      resp = {
        // Fill is capped at 100% (an overdue query can't read as "more than full").
        width: Math.max(0, Math.min(1, nDays / mDays)) * 100,
        // Past the window, "DAY 816 OF ~42" reads broken — switch to a plain overdue caption.
        dayCap: overdue ? "NO REPLY YET" : `DAY ${nDays} OF ~${mDays}`,
        expCap: `${overdue ? "DUE" : "EXP."} ~${fmtShort(expMs)}`,
        overdue,
      };
    }
    rows.push({ key: "ghost", kind: "ghost", title: "Waiting to hear back", resp });
  }
  // Scheduled nudge — the next upcoming reminder, when one is set in the future.
  const nudgeMs = query.nudgeDate ? getTime(query.nudgeDate) : 0;
  if (nudgeMs > now) {
    rows.push({
      key: "nudge",
      kind: "nudge",
      title: "Nudge reminder",
      date: fmtShort(nudgeMs),
      sub: "We'll remind you to follow up if you still haven't heard back.",
    });
  }

  return (
    <div>
      {rows.map((row, i) => {
        const isLast = i === rows.length - 1;
        const dashedConnector = row.kind === "ghost" || row.kind === "nudge";
        return (
          <div key={row.key} style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: 11, position: "relative", paddingBottom: isLast ? 0 : 24 }}>
            {/* dot column + connector */}
            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              {row.kind === "status" && <StatusDot status={row.status as QueryStatus} overrideSize={28} />}
              {row.kind === "ghost" && (
                <svg width={28} height={28} viewBox="0 0 28 28"><circle cx="14" cy="14" r="11.5" fill="none" stroke="#cfc6bb" strokeWidth={1.4} strokeDasharray="3 3" /></svg>
              )}
              {row.kind === "nudge" && (
                <svg width={28} height={28} viewBox="0 0 28 28"><circle cx="14" cy="14" r="11.5" fill="#fbf3e3" stroke="#d8b87a" strokeWidth={1.4} strokeDasharray="3 3" /><path d="M14 8.5a3 3 0 0 0-3 3c0 3-1.1 3.6-1.1 3.6h8.2S17 14.5 17 11.5a3 3 0 0 0-3-3z M12.8 17.2a1.3 1.3 0 0 0 2.4 0" fill="none" stroke="#b98a4e" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
              {!isLast && (
                <div style={{
                  position: "absolute", top: 29, bottom: -24, left: "50%", transform: "translateX(-50%)", width: 1.6,
                  ...(dashedConnector
                    ? { background: "repeating-linear-gradient(#ddd0c0 0 3px, transparent 3px 6px)" }
                    : { background: "#e8dcd0" }),
                }} />
              )}
            </div>
            {/* content */}
            <div style={{ paddingTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{
                  fontFamily: "'Inter',sans-serif", fontSize: 13,
                  fontWeight: row.kind === "status" ? 600 : row.kind === "nudge" ? 600 : 500,
                  fontStyle: row.kind === "ghost" ? "italic" : "normal",
                  color: row.kind === "ghost" ? "#a89a8a" : row.kind === "nudge" ? "#8a6a3e" : "#3a1c14",
                }}>{row.title}</span>
                {row.date && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#a89a8a", whiteSpace: "nowrap" }}>{row.date}</span>}
              </div>
              {row.sub && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: row.kind === "nudge" ? "#a8946e" : "#9a8d7e", marginTop: 2 }}>{row.sub}</div>}
              {row.pills && row.pills.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>{row.pills.map((p, pi) => <MatPill key={pi}>{p}</MatPill>)}</div>
              )}
              {row.kind === "ghost" && row.resp && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ position: "relative", height: 5, borderRadius: 5, background: "#f4e4dc", overflow: "hidden" }}>
                    <i style={{ position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: 5, background: "linear-gradient(90deg,#e9bdac,#d99e86)", width: `${row.resp.width}%` }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginTop: 5 }}>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.05em", color: "#b59384", whiteSpace: "nowrap" }}>{row.resp.dayCap}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 8, letterSpacing: "0.05em", color: "#b59384", whiteSpace: "nowrap" }}>{row.resp.expCap}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
