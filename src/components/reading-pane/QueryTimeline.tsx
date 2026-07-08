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
import { queryAmbientStatus } from "../../lib/queryAmbient";

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
const FONT_SERIF = "'Playfair Display', serif";

// STAGE_RESPONSE_WINDOWS + the waiting/writer derivation moved to lib/queryAmbient.ts (one source
// shared with the command bar). This file consumes it via queryAmbientStatus.

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
  status: QueryStatus;
  title: string;
  date?: string;
  sub?: string;
  pills?: string[];
}

/** Mirrors the relevant fields of getPrimaryAction(status) in Queries.tsx — passed in so the
 *  trailing open-state block reads the same agent's-turn/writer's-turn fact as the control bar. */
export interface QueryTimelinePrimaryAction {
  ballHolder: "agent" | "writer" | null;
  markKind?: "partial" | "full" | "resubmit";
}

export interface QueryTimelineProps {
  query: Query;
  agent: Agent | null;
  events: any[];
  /** The open-state switch — from getPrimaryAction(query.status). Undefined ⇒ no trailing block. */
  primaryAction?: QueryTimelinePrimaryAction;
}

export const QueryTimeline: React.FC<QueryTimelineProps> = ({ query, agent, events, primaryAction }) => {
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
      status,
      title,
      date: fmtShort(getTime(evt.createdAt)),
      sub,
      pills: status === QueryStatus.QUERIED && queryMaterials.length ? queryMaterials : undefined,
    };
  });

  // ── trailing open-state block — one shared derivation (lib/queryAmbient), the same numbers the
  // command bar shows, so the two can't disagree. Ball-holder still comes from getPrimaryAction. ──
  const ballHolder = primaryAction?.ballHolder ?? null;
  const ambient = queryAmbientStatus(query, ballHolder, primaryAction?.markKind);
  const waiting = ambient.mode === "waiting" ? ambient : null;
  const sendWhat = ambient.sendWhat;

  const sage = waiting ? !waiting.overdue : true; // sage within window, calm grey once past it
  const wcol = sage
    ? { pillBg: "#eef2ec", pillBd: "#cdd9c8", pillTx: "#3f5340", dim: "#5a6e58", barBg: "#e6ece4", barFill: "linear-gradient(90deg,#a9c0a4,#8aa886)" }
    : { pillBg: "#eee9e2", pillBd: "#ddd4c6", pillTx: "#6a5f52", dim: "#8a7d6c", barBg: "#e7e0d6", barFill: "linear-gradient(90deg,#bdb3a4,#a89c8a)" };

  return (
    <div>
      {/* timeline history — oldest at the top, newest at the bottom */}
      {rows.map((row, i) => {
        const isLast = i === rows.length - 1;
        return (
          <div key={row.key} style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: 11, position: "relative", paddingBottom: isLast ? 0 : 24 }}>
            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <StatusDot status={row.status} overrideSize={28} />
              {!isLast && (
                <div style={{ position: "absolute", top: 29, bottom: -24, left: "50%", transform: "translateX(-50%)", width: 1.6, background: "#e8dcd0" }} />
              )}
            </div>
            <div style={{ paddingTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, fontWeight: 600, color: "#3a1c14" }}>{row.title}</span>
                {row.date && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#a89a8a", whiteSpace: "nowrap" }}>{row.date}</span>}
              </div>
              {row.sub && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 11, color: "#9a8d7e", marginTop: 2 }}>{row.sub}</div>}
              {row.pills && row.pills.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>{row.pills.map((p, pi) => <MatPill key={pi}>{p}</MatPill>)}</div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── trailing open-state block — only marginally inset so the pill keeps width on one line ── */}
      {ballHolder === "agent" && waiting && (
        <div style={{ marginLeft: 4, marginTop: 16 }}>
          {/* strip-back: plain text, no pill chrome, not bold */}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 400, fontSize: 13, color: "#3a1c14" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2" /></svg>
            Waiting to hear back
            {waiting.sentMs != null && <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 12, color: wcol.dim }}>· {waiting.nDays} days</span>}
          </span>
          {/* bar + caption only when a send date is on record */}
          {waiting.sentMs != null && waiting.expMs != null && (
            <>
              <div style={{ height: 6, borderRadius: 6, marginTop: 11, overflow: "hidden", background: wcol.barBg }}>
                <div style={{ height: "100%", borderRadius: 6, width: `${waiting.widthPct}%`, background: wcol.barFill }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.04em", color: "#7d7268", marginTop: 7 }}>
                <span>SENT {fmtShort(waiting.sentMs)}</span>
                <span>EXPECTED BY ~{fmtShort(waiting.expMs)}</span>
              </div>
            </>
          )}
          {/* nudge mount seam — the nudge line mounts here in a later phase; nothing else here now. */}
        </div>
      )}

      {ballHolder === "writer" && (
        /* Narrative only — the ACTION lives in the command bar now (one home for actions). The
           yellow band keeps its "your move" prose; its old send-materials button was removed. */
        <div style={{ marginLeft: 4, marginTop: 16 }}>
          <div style={{ background: "#f6edd6", border: "1px solid #e3d3a6", borderRadius: 11, padding: "12px 14px" }}>
            <span style={{ fontWeight: 600, fontSize: 12.5, color: "#7a5e1f" }}>Your move — send the {sendWhat}</span>
            {ambient.writerDaysAgo != null && (
              <small style={{ display: "block", fontWeight: 300, fontSize: 11, color: "#8a7a40", marginTop: 3 }}>
                {agent?.name?.split(" ")[0] || "The agent"} asked for it {ambient.writerDaysAgo} {ambient.writerDaysAgo === 1 ? "day" : "days"} ago
              </small>
            )}
          </div>
          {/* nudge mount seam */}
        </div>
      )}
      {/* ballHolder === null (closed / Offer): no trailing block — history only. */}
    </div>
  );
};
