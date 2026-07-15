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
import React, { useState } from "react";
import { StatusDot } from "../StatusDot";
import { Query, QueryStatus, Agent, QueryMaterial } from "../../types";
import { formatQueryMaterial } from "../../lib/materials";
import { queryAmbientStatus, deriveEscalation, trackingBar, nudgeCount } from "../../lib/queryAmbient";
import { NUDGE_NESTED_TYPE } from "../../lib/logNudge";

/** P5 — inter-event vertical spacing (px). One constant so reuse of the timeline stays consistent;
 *  the connector hairline's length is derived from it, never a per-instance number. */
const TL_EVENT_GAP = 24;
import { F12Menu } from "../shell/F12Shell";

/** A correctable timeline entry (5b) — passed to the ⋯ Edit / Delete handlers. */
export interface TimelineEntryRef { activityId: string; status: QueryStatus; label: string; dateISO: string; note: string; }

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

export interface RowSpec {
  key: string;
  /** "nudge" = a non-status outgoing touch (P2): the dot reuses the outgoing QUERIED glyph
   *  decoratively, and the row never carries an activityId (corrections are for status entries). */
  kind?: "nudge";
  status: QueryStatus;
  title: string;
  date?: string;
  sub?: string;
  pills?: string[];
  /** Present only on rows backed by a real activity (the synthesised "Query sent" root has none). */
  activityId?: string;
  dateISO?: string;
  note?: string;
  /** Event time for the merged chronological sort. */
  timeMs?: number;
}

const isoDay = (ms: number): string => {
  const d = new Date(ms);
  return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
};

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
  /** 5b — correction handlers for the hover ⋯ on activity-backed rows. */
  onEditEntry?: (entry: TimelineEntryRef) => void;
  onDeleteEntry?: (entry: TimelineEntryRef) => void;
  /** Open the Nudge flow (now the fork's nudge chip; kept for the fork wiring). */
  onNudge?: () => void;
  /** TWS P4 — open the "set an expected date" flow (writes responseDeadline) when none is derivable. */
  onSetExpectedDate?: () => void;
}

/**
 * Build the timeline rows from the AUTHORITATIVE per-query activity docs. Pure + exported so the
 * nudge-node behaviour is unit-testable (the repo's lib-level vitest pattern).
 *
 * Two row families:
 *  - STATUS rows — enum-typed events, deduped by status (keep the earliest of each). Unknown
 *    non-enum types are deliberately excluded here (the guard against garbage), with ONE explicit
 *    exception below.
 *  - NUDGE rows (P2) — `type === NUDGE_NESTED_TYPE`. Every nudge renders (repeat nudges are
 *    distinct outgoing touches — never deduped). A nudge is non-status: it carries no correction ⋯
 *    (corrections operate on status entries) and never enters the status dedupe.
 * Both merge chronologically.
 */
export function buildTimelineRows(events: any[], query: Query, agent: Agent | null): RowSpec[] {
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

  const statusRows: RowSpec[] = statusEvents.map((evt, i) => {
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
      activityId: typeof evt.id === "string" ? evt.id : undefined, // synthesised root has no id
      dateISO: isoDay(getTime(evt.createdAt)),
      note: typeof evt.note === "string" ? evt.note : "",
      timeMs: getTime(evt.createdAt),
    };
  });

  // P2 — the nudge nodes: outgoing writer-side touches, one row per nudge, merged by time. The dot
  // reuses the OUTGOING glyph (QUERIED — burgundy ring, → arrow) decoratively via the locked
  // StatusDot; the node claims no status (kind: "nudge", no activityId → no correction ⋯).
  const nudgeRows: RowSpec[] = (events || [])
    .filter((evt) => evt.type === NUDGE_NESTED_TYPE)
    .map((evt, i) => ({
      key: `n-${typeof evt.id === "string" ? evt.id : i}`,
      kind: "nudge" as const,
      status: QueryStatus.QUERIED,
      title: "Nudged",
      date: fmtShort(getTime(evt.createdAt)),
      sub: `via ${query.sendMethod || "Email"}`,
      dateISO: isoDay(getTime(evt.createdAt)),
      note: typeof evt.note === "string" ? evt.note : "",
      timeMs: getTime(evt.createdAt),
    }));

  return [...statusRows, ...nudgeRows].sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));
}

export const QueryTimeline: React.FC<QueryTimelineProps> = ({ query, agent, events, primaryAction, onEditEntry, onDeleteEntry, onNudge, onSetExpectedDate }) => {
  const [menu, setMenu] = useState<{ entry: TimelineEntryRef; style: React.CSSProperties } | null>(null);

  const rows = buildTimelineRows(events, query, agent);

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
          <div key={row.key} style={{ display: "grid", gridTemplateColumns: "30px 1fr", gap: 11, position: "relative", paddingBottom: isLast ? 0 : TL_EVENT_GAP }}>
            <div style={{ position: "relative", display: "flex", justifyContent: "center" }}>
              <StatusDot status={row.status} overrideSize={28} decorative={row.kind === "nudge"} />
              {/* P5 — the connector hairline: drawn by the CONTAINER behind the locked StatusDot (never
                  by editing it), on event nodes only, joining consecutive events and stopping at the
                  last (so it draws only with 2+ events; a single-event query gets no orphan line).
                  Colour = the theme --hairline token; length derived from TL_EVENT_GAP. */}
              {!isLast && (
                <div style={{ position: "absolute", top: 29, bottom: -TL_EVENT_GAP, left: "50%", transform: "translateX(-50%)", width: 1.6, background: "var(--hairline, #e8dcd0)" }} />
              )}
            </div>
            <div className="tl-rowbody" style={{ paddingTop: 4 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: "#3a1c14" }}>{row.title}</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                  {row.date && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#a89a8a" }}>{row.date}</span>}
                  {row.activityId && (onEditEntry || onDeleteEntry) && (
                    <span className="f12-popwrap" style={{ display: "inline-flex" }}>
                      <button
                        type="button"
                        className="tl-more"
                        aria-label="Correct this entry"
                        title="Correct this entry"
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setMenu({
                            entry: { activityId: row.activityId!, status: row.status, label: row.title, dateISO: row.dateISO || "", note: row.note || "" },
                            style: { position: "fixed", top: r.bottom + 4, left: Math.max(8, r.right - 184) },
                          });
                        }}
                      >⋯</button>
                    </span>
                  )}
                </span>
              </div>
              {row.sub && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#9a8d7e", marginTop: 2 }}>{row.sub}</div>}
              {row.pills && row.pills.length > 0 && (
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>{row.pills.map((p, pi) => <MatPill key={pi}>{p}</MatPill>)}</div>
              )}
            </div>
          </div>
        );
      })}

      {/* ── trailing open-state block — calm within window, ESCALATED to needs-you once overdue.
          The escalation is the pane's ONLY needs-you signal (the fork below stays neutral). ── */}
      {ballHolder === "agent" && waiting && (() => {
        // P1/P2 — the escalation state (within/overdue/grace), derived from the overdue clock + the
        // latest nudge's reminder (Query.nudgeDate) + when it fired (Query.lastNudgeSentDate).
        const reminderMs = query.nudgeDate ? getTime(query.nudgeDate) : null;
        const lastNudgeMs = query.lastNudgeSentDate ? getTime(query.lastNudgeSentDate) : null;
        const escal = deriveEscalation(waiting, { reminderMs, lastNudgeMs, now: Date.now() });
        const nudges = nudgeCount(events, NUDGE_NESTED_TYPE); // P3 — re-escalation "nudged N×" copy
        const dated = waiting.sentMs != null && waiting.expMs != null; // both present → a progress bar
        const hasExpected = waiting.expMs != null;                     // P4 — derived OR overridden
        // P4 — derived bar geometry (no magic percentages): within ends at expected (no marker);
        // overdue spans sent→now with the expected marker + hatch; grace spans sent→reminder with a
        // faded original-expected tick.
        const geo = trackingBar(escal, waiting, reminderMs, Date.now());
        const baseFillPct = geo.overdueZone && geo.markerPct != null ? geo.markerPct : geo.fillPct;

        const clockIcon = (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2" /></svg>
        );
        // Calm-only readout line (P3 dropped it from the overdue branch — the badge is the single
        // headline there; two counters off the same send date were pure redundancy).
        const waitingLine = (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontWeight: 400, fontSize: 13, color: "#3a1c14" }}>
            {clockIcon}
            Waiting to hear back
            {waiting.sentMs != null && <span style={{ fontFamily: FONT_MONO, fontWeight: 600, fontSize: 12, color: wcol.dim }}>· {waiting.nDays} days</span>}
          </span>
        );
        const bar = dated ? (
          <>
            <div style={{ position: "relative", height: 6, borderRadius: 6, marginTop: 11, overflow: "hidden", background: wcol.barBg }}>
              {/* base fill — warm in grace, sage otherwise; stops at the marker when there's a hatch */}
              <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${baseFillPct}%`, background: escal === "grace" ? "linear-gradient(90deg,#d9c3ac,#c9a988)" : wcol.barFill }} />
              {/* overdue hatch zone beyond the expected marker */}
              {geo.overdueZone && geo.markerPct != null && (
                <div style={{ position: "absolute", left: `${geo.markerPct}%`, top: 0, bottom: 0, width: `${Math.max(0, geo.fillPct - geo.markerPct)}%`, background: "linear-gradient(90deg, var(--pink-b), var(--pink-i))" }} />
              )}
              {/* EXPECTED marker (overdue only — within-window the bar END is expected, no marker) */}
              {geo.markerPct != null && (
                <div style={{ position: "absolute", left: `${geo.markerPct}%`, top: 0, bottom: 0, width: 2, transform: "translateX(-1px)", background: "var(--pink-i)" }} />
              )}
              {/* grace — faded tick where the ORIGINAL expected lapsed (bar end is the reminder horizon) */}
              {geo.graceTickPct != null && (
                <div style={{ position: "absolute", left: `${geo.graceTickPct}%`, top: 0, bottom: 0, width: 2, transform: "translateX(-1px)", background: "#b7a48f", opacity: 0.6 }} />
              )}
            </div>
            {/* This shared bar serves within-window + overdue only (grace has its own pulse bar). No
                strikethrough: the expectation LAPSED, it wasn't withdrawn — burgundy tone + marker say so. */}
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.04em", color: "#7d7268", marginTop: 7 }}>
              <span>SENT {fmtShort(waiting.sentMs!)}</span>
              <span style={{ color: escal === "overdue" ? "var(--pink-i)" : "#7d7268" }}>EXPECTED BY ~{fmtShort(waiting.expMs!)}</span>
            </div>
          </>
        ) : null;

        return (
          <div style={{ marginLeft: 4, marginTop: 16 }}>
            {!hasExpected ? (
              /* NO EXPECTED DATE (P2/P4) — nothing derivable AND no responseDeadline override. Dashed
                 section + a burgundy "Set an expected date" link (opens the Edit drawer, P4). */
              <div style={{ border: "1px dashed var(--line, #e6dccd)", borderRadius: 11, padding: "12px 14px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13, color: "var(--muted, #8a7d6c)" }}>
                  {clockIcon}
                  Awaiting response — no expected date set
                </span>
                {onSetExpectedDate && (
                  <button type="button" onClick={onSetExpectedDate} style={{ display: "block", marginTop: 9, background: "none", border: "none", padding: 0, fontFamily: "'Inter',sans-serif", fontSize: 12.5, fontWeight: 600, color: "var(--burg, #7c3a2a)", cursor: "pointer" }}>
                    Set an expected date →
                  </button>
                )}
              </div>
            ) : escal === "grace" ? (
              /* GRACE (P2) — DASHED, no fill; a sage bar that pulses left→right (CSS-only sweep). No
                 badge, no nudge CTA (nudge is a fork chip now). The overdue clock keeps counting. */
              <div style={{ border: "1px dashed var(--sage, #8a9e88)", borderRadius: 11, padding: "11px 13px" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 9, fontSize: 13, fontWeight: 500, color: "var(--sageD, #5a6e58)" }}>
                  {clockIcon}
                  Awaiting response
                </span>
                <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: ".04em", color: "var(--sageD, #5a6e58)", opacity: 0.85, marginTop: 8 }}>
                  {lastNudgeMs != null && <>FOLLOWED UP {fmtShort(lastNudgeMs)} · </>}REMINDER {reminderMs != null ? fmtShort(reminderMs) : "—"}
                </div>
                <div className="tl-gracebar" style={{ position: "relative", height: 6, borderRadius: 6, marginTop: 11, overflow: "hidden", background: "var(--sageC, #e9ede6)" }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${geo.fillPct}%`, background: "var(--sage, #8a9e88)", opacity: 0.55 }} />
                  <div className="tl-sweep" aria-hidden="true" />
                  {geo.graceTickPct != null && <div style={{ position: "absolute", left: `${geo.graceTickPct}%`, top: 0, bottom: 0, width: 2, transform: "translateX(-1px)", background: "#b7a48f", opacity: 0.6 }} />}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.04em", color: "#7d7268", marginTop: 7 }}>
                  <span>SENT {fmtShort(waiting.sentMs!)}</span>
                  <span style={{ color: "var(--sageD, #5a6e58)" }}>REMINDER {reminderMs != null ? fmtShort(reminderMs) : "—"}</span>
                </div>
              </div>
            ) : escal === "overdue" ? (
              /* OVERDUE (P2) — pink-tint card + badge. NO nudge CTA (nudge is a fork chip now, P3);
                 re-escalation badge acknowledges the prior chase ("nudged N× · no reply"). */
              <div style={{ background: "var(--pink-t)", border: "1px solid var(--pink-b)", borderRadius: 11, padding: "11px 13px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", color: "var(--pink-i)" }}>
                  {clockIcon}
                  <span style={{ fontFamily: FONT_MONO, fontSize: 8.5, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "#fff", background: "var(--pink-i)", borderRadius: 6, padding: "3px 8px", whiteSpace: "nowrap" }}>
                    {nudges > 0
                      ? `Overdue · ${nudges === 1 ? "nudged once" : `nudged ${nudges}×`} · no reply`
                      : `Overdue · ${waiting.daysOverdue} ${waiting.daysOverdue === 1 ? "day" : "days"} past expected`}
                  </span>
                </div>
                {bar}
              </div>
            ) : (
              /* WITHIN-WINDOW (P2) — soft-neutral card + hairline; lead text, mono data (the bar). */
              <div style={{ background: "var(--paper, #faf7f2)", border: "1px solid var(--hairline, #f0eae1)", borderRadius: 11, padding: "11px 13px" }}>
                {waitingLine}
                {bar}
              </div>
            )}
          </div>
        );
      })()}

      {ballHolder === "writer" && (
        /* YOUR MOVE (P2) — soft-pink fill + ink border, no divider beneath; Playfair title + burgundy
           sub. The ACTION lives in the fork/command bar (one home for actions). */
        <div style={{ marginLeft: 4, marginTop: 16 }}>
          <div style={{ background: "var(--pink, #f5e2da)", border: "1px solid var(--ink, #1e1a16)", borderRadius: 11, padding: "12px 14px" }}>
            <span style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 15, color: "var(--ink, #1e1a16)" }}>Your move — send the {sendWhat}</span>
            {ambient.writerDaysAgo != null && (
              <small style={{ display: "block", fontWeight: 500, fontSize: 11.5, color: "var(--burg, #7c3a2a)", marginTop: 3 }}>
                {agent?.name?.split(" ")[0] || "The agent"} asked for it {ambient.writerDaysAgo} {ambient.writerDaysAgo === 1 ? "day" : "days"} ago
              </small>
            )}
          </div>
        </div>
      )}
      {/* ballHolder === null (closed / Offer): no trailing block — history only. */}

      {/* 5b — the correction menu for the hovered entry (portalled; not clipped by the card scroll) */}
      {menu && (
        <F12Menu
          open
          onClose={() => setMenu(null)}
          style={menu.style}
          ariaLabel="Correct entry"
          items={[
            { label: "Edit", icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>, onClick: () => onEditEntry?.(menu.entry) },
            { label: "Delete…", danger: true, icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>, onClick: () => onDeleteEntry?.(menu.entry) },
          ]}
        />
      )}
    </div>
  );
};
