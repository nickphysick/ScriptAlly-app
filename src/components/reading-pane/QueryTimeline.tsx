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
import { queryAmbientStatus, deriveEscalation, trackingBar, nudgeCount, elapsedLabel } from "../../lib/queryAmbient";
import { NUDGE_NESTED_TYPE } from "../../lib/logNudge";
import { dropSupersededProvisional } from "../../lib/queryDerivation";

/** TWS-revised — natural-language date for the grace header ("15th July"), the header's own font. */
const fmtNatural = (ms: number): string => {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  const day = d.getDate();
  const ord = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  return `${day}${ord} ${d.toLocaleDateString("en-GB", { month: "long" })}`;
};

/**
 * The marker's diameter, in px — the ONE size every event's dot is drawn at.
 *
 * ⚠️ THE GAP IS NO LONGER A CONSTANT HERE, AND THAT IS §6's WHOLE POINT. `TL_EVENT_GAP = 24` was a
 * number this file spent on `paddingBottom` and then spent AGAIN, negated, on the connector's
 * `bottom` — so the rhythm lived in JavaScript while the thing it had to line up with (the next
 * marker) lived in layout. It is `--tl-gap` at `:root` now, and the connector reaches the next
 * marker structurally rather than by arithmetic. This constant stays because `StatusDot` takes a
 * pixel number, not a token; it is kept in step with `--tl-mark` by a measure, not by a comment.
 */
const TL_MARK = 27;
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

/**
 * A bare bar milestone (bar-anchors-hover rule): a hollow-circle marker at `pct` on the bar whose
 * date label appears ONLY on hover (fine pointers) or tap (touch). The pop-up renders ABOVE the bar
 * (the end-anchor labels sit below), and anchors inward near an edge so it can't overflow — overlap
 * is impossible by construction. Touch-wired: hover is pointerType-guarded (hover doesn't exist on
 * touch), and an onClick pin drives it on tap. One pop-up per marker; each bar carries exactly one.
 */
const BarMilestone: React.FC<{ pct: number; label: string }> = ({ pct, label }) => {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);
  const open = hover || pinned;
  const p = Math.max(0, Math.min(100, pct));
  const edge = p < 22 ? "start" : p > 78 ? "end" : "mid";
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(true); }}
        onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(false); }}
        onClick={() => setPinned((v) => !v)}
        style={{
          position: "absolute", left: `${p}%`, top: "50%", transform: "translate(-50%, -50%)",
          width: 13, height: 13, borderRadius: "50%", background: "var(--panel, #fffdfb)",
          border: "1.5px solid var(--faint, #b3a596)", padding: 0, cursor: "pointer", zIndex: 2,
        }}
      />
      {open && (
        <div
          role="tooltip"
          style={{
            position: "absolute", bottom: "calc(100% + 8px)", zIndex: 3, pointerEvents: "none",
            ...(edge === "end" ? { right: `${100 - p}%` } : { left: `${p}%` }),
            transform: edge === "mid" ? "translateX(-50%)" : "none",
            whiteSpace: "nowrap", fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.04em",
            color: "var(--panel, #fffdfb)", background: "var(--ink, #1e1a16)", borderRadius: 6, padding: "3px 7px",
          }}
        >{label}</div>
      )}
    </>
  );
};

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
  /**
   * §2 — this row's `sub` is a FACT THE WRITER CAN CORRECT IN PLACE (the send method). Set on the
   * Query-sent rung only, and only that rung: every other `sub` is derived from the log and has no
   * single field behind it to edit.
   */
  subEditable?: boolean;
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
  /**
   * §2 — the send-method picker, opened FROM THE EVENT THAT STATES IT. Its third home this session
   * (`sentLine`, then the ⋯, now in place), and the one the three-verb grammar always pointed at:
   * something happened → Record response; a detail is wrong → change it where it is written.
   *
   * ⚠️ ABSENT MEANS THE SUB IS PLAIN TEXT, not a dead control. A caller with no picker to open — the
   * PDF path, a future read-only view — renders the same line without an affordance on it.
   */
  onEditSendMethod?: (anchor: HTMLElement) => void;
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

  /* ⚠️ §7b — SUPERSEDED PROVISIONAL RUNGS GO FIRST, AND THE ORDER IS THE WHOLE POINT HERE. The
     dedupe below keeps the EARLIEST rung of each status, and an import's provisional rung carries
     an ordering-key `createdAt` that is earlier than the real one the writer recorded later — so
     this surface did not draw a duplicate, it drew ONE row and drew the wrong one, labelled
     "(imported — date needed)" over a date the record actually held. Dropping the superseded rung
     before the dedupe leaves the real one as the only candidate.
     ⚠️ ONE PREDICATE, SHARED WITH THE DERIVATION — `dropSupersededProvisional`. A second copy here
     is how a timeline and the fields beneath it come to disagree about which rung is real. */
  const kept = dropSupersededProvisional(events || [], (evt: any) => ({
    status: evt?.resultingStatus ?? evt?.type,
    provisional: evt?.dateProvisional === true,
  }));
  // Dedupe the activity log by status (keep the earliest of each), then order chronologically.
  const raw = kept.filter((evt) => validEnumValues.includes(evt.type as QueryStatus));
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
      subEditable: status === QueryStatus.QUERIED,
      activityId: typeof evt.id === "string" ? evt.id : undefined, // synthesised root has no id
      dateISO: isoDay(getTime(evt.createdAt)),
      note: typeof evt.note === "string" ? evt.note : "",
      timeMs: getTime(evt.createdAt),
    };
  });

  // P2 — the nudge nodes: outgoing writer-side touches, one row per nudge, merged by time. The dot
  // reuses the OUTGOING glyph (QUERIED — burgundy ring, → arrow) decoratively via the locked
  // StatusDot; the node claims no status (kind: "nudge"). TWS P5 — it now carries its activityId so
  // the ⋯ edit/delete menu offers (aligning the row + closing the delete gap); deleting a nudge is
  // non-status, so the delete confirm correctly reads "won't change the query's status".
  const nudgeRows: RowSpec[] = (events || [])
    .filter((evt) => evt.type === NUDGE_NESTED_TYPE)
    .map((evt, i) => ({
      key: `n-${typeof evt.id === "string" ? evt.id : i}`,
      kind: "nudge" as const,
      status: QueryStatus.QUERIED,
      title: "Nudged",
      date: fmtShort(getTime(evt.createdAt)),
      sub: `via ${query.sendMethod || "Email"}`,
      activityId: typeof evt.id === "string" ? evt.id : undefined,
      dateISO: isoDay(getTime(evt.createdAt)),
      note: typeof evt.note === "string" ? evt.note : "",
      timeMs: getTime(evt.createdAt),
    }));

  return [...statusRows, ...nudgeRows].sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));
}

/**
 * TimelineRows — the pipeline row list, extracted (evening run B2) so the To-do sheet can render
 * the HUB'S OWN rows rather than imitating them. A move-without-change: the markup below is the
 * rows.map block verbatim; QueryTimeline consumes it with its behaviour (incl. the ⋯ correction
 * trigger) byte-identical, and the sheet renders it condensed with no menu wiring.
 */
/**
 * TlEvent — the ONE geometry every event on this timeline uses (six fixes §6).
 *
 * ⚠️ IT EXISTS BECAUSE THE GRID WAS WRITTEN TWICE. A real row and a projection each declared
 * `30px 1fr`, `gap: 11`, their own `paddingBottom`, and their own connector at `top: 29 /
 * bottom: -TL_EVENT_GAP` — four numbers restated in two places, which is how the timeline came to
 * bend where the future starts. The geometry is now a class (`.tl-ev` in f12.css) and this is its
 * only renderer; a third kind of event gets it for free rather than by copying it.
 *
 * ⚠️ THE MARKER IS A SLOT, NOT A COMPONENT. Both callers pass a `StatusDot` — the locked glyph,
 * never a recreation — and they differ only in its props (`ghost` for a projection). Taking the
 * dot as a child keeps that difference at the call site where it is legible.
 */
const TlEvent: React.FC<{ last?: boolean; mark: React.ReactNode; children: React.ReactNode }> = ({ last = false, mark, children }) => (
  <div className={`tl-ev${last ? " tl-ev--last" : ""}`}>
    <div className="tl-evmark">{mark}</div>
    {/* the connector, drawn by the CONTAINER behind the locked StatusDot — never by editing it.
        It runs marker-bottom to next-marker-top, and `.tl-ev--last` hides it, so a single-event
        query gets no orphan line. */}
    <div className="tl-evline" aria-hidden="true" />
    {children}
  </div>
);

export const TimelineRows: React.FC<{
  rows: RowSpec[];
  onMenuOpen?: (entry: TimelineEntryRef, style: React.CSSProperties) => void;
  /**
   * ⚠️ ADDITIVE, AND DEFAULTED SO TO-DO IS UNTOUCHED (fix pack 4 §3). The waiting stage is now an
   * event BELOW these rows, so the last real row has to grow a connector into it or the timeline
   * visibly stops and then starts again. To-do renders `<TimelineRows rows={rows} />` with nothing
   * else and has no projected events beneath, so it keeps the terminal behaviour by default —
   * which is why this is a flag the caller opts into rather than a change to the row itself.
   */
  continues?: boolean;
  onEditSendMethod?: (anchor: HTMLElement) => void;
  /**
   * ⚠️ ADDITIVE, AND DEFAULTED SO TO-DO IS UNTOUCHED. The Query Centre hangs the send's materials
   * under its `Query sent` rung — each send carries what went with it, which is the only way a
   * resubmission can be described at all. To-do renders `<TimelineRows rows={rows} />` and passes
   * nothing, so it keeps the rung it has always had.
   */
  sentExtra?: React.ReactNode;
}> = ({ rows, onMenuOpen, continues = false, onEditSendMethod, sentExtra }) => (
  <>
    {rows.map((row, i) => {
      const isLast = i === rows.length - 1 && !continues;
      return (
        <TlEvent key={row.key} last={isLast} mark={<StatusDot status={row.status} overrideSize={TL_MARK} decorative={row.kind === "nudge"} />}>
          <div className="tl-rowbody">
            <div className="tl-evtitle"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
              {/* ⚠️ THE EDITABLE FACT SITS ON THE TITLE LINE, NOT UNDER IT (§2). "Query sent" and
                  "via email" are one statement about one event; on two lines the second read as a
                  caption, which is why the picker kept being moved somewhere that felt more like a
                  control. Here it IS the words, with a dashed rule saying so. */}
              <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: "#3a1c14" }}>
                {row.title}
                {row.subEditable && row.sub && onEditSendMethod && (
                  <>
                    {" · "}
                    <button type="button" className="qp-inplace" onClick={(e) => onEditSendMethod(e.currentTarget)} title="Change how this query was sent">{row.sub}</button>
                  </>
                )}
              </span>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
                {row.date && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#a89a8a" }}>{row.date}</span>}
                {row.activityId && onMenuOpen && (
                  <span className="f12-popwrap" style={{ display: "inline-flex" }}>
                    <button
                      type="button"
                      className="tl-more"
                      aria-label="Correct this entry"
                      title="Correct this entry"
                      onClick={(e) => {
                        const r = e.currentTarget.getBoundingClientRect();
                        onMenuOpen(
                          { activityId: row.activityId!, status: row.status, label: row.title, dateISO: row.dateISO || "", note: row.note || "" },
                          { position: "fixed", top: r.bottom + 4, left: Math.max(8, r.right - 184) },
                        );
                      }}
                    >⋯</button>
                  </span>
                )}
              </span>
            </div></div>
            {/* ⚠️ NOT TWICE. A promoted sub is drawn on the title line above; drawing it here as well
                would state the send method twice, three pixels apart. Rows without the flag — and
                the flagged row when no picker was passed — keep the caption they have always had. */}
            {row.sub && !(row.subEditable && onEditSendMethod) && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#9a8d7e", marginTop: 2 }}>{row.sub}</div>}
            {/* ⚠️ A CLASS, SO A SHORT VIEWPORT CAN DROP THESE (fix pack §5). They are the ONE thing on
                this card repeated verbatim one column over — "What you sent" lists the same
                materials — so when the card must give something up, this costs the writer nothing.
                See the `max-height` rule in f12.css for why these rather than the nudge event. */}
            {row.pills && row.pills.length > 0 && (
              <div className="tl-pills" style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 8 }}>{row.pills.map((p, pi) => <MatPill key={pi}>{p}</MatPill>)}</div>
            )}
            {/* the send's own materials — rendered by the caller, on the send rung only */}
            {sentExtra && row.status === QueryStatus.QUERIED && sentExtra}
          </div>
        </TlEvent>
      );
    })}
  </>
);

/**
 * TlProjection — a timeline event for something that has NOT happened yet (fix pack 4 §3).
 *
 * ⚠️ THE SAME GEOMETRY AS A REAL ROW, AND NOW BY SHARING IT RATHER THAN BY MATCHING IT (§6). This
 * note used to say the grid was "restated in one place" — it was restated in two, here and in
 * `TimelineRows`, which is exactly the arrangement where the markers drift a pixel or two apart and
 * the timeline bends where the future starts. Both render `TlEvent`; there is nothing left to match.
 *
 * ⚠️ AND THE MARKER IS `ghost`, WHICH ALREADY MEANS THIS. `StatusDot`'s ghost is the same dot
 * drained to neutral grey with no pulse — the "would-be" treatment. Inventing a second hollow
 * marker would have given the app two ways to draw "not yet".
 */
const TlProjection: React.FC<{
  status: QueryStatus | string;
  title: string;
  date?: string;
  last?: boolean;
  children?: React.ReactNode;
}> = ({ status, title, date, last = false, children }) => (
  <TlEvent last={last} mark={<StatusDot status={status} overrideSize={TL_MARK} ghost decorative />}>
    <div className="tl-rowbody">
      <div className="tl-evtitle"><div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontFamily: "'Inter',sans-serif", fontSize: 14, fontWeight: 600, color: "var(--muted, #7d7469)" }}>{title}</span>
        {date && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: "#a89a8a", whiteSpace: "nowrap" }}>{date}</span>}
      </div></div>
      {children}
    </div>
  </TlEvent>
);

export const QueryTimeline: React.FC<QueryTimelineProps & { sentExtra?: React.ReactNode }> = ({ query, agent, events, primaryAction, onEditEntry, onDeleteEntry, onNudge, onSetExpectedDate, onEditSendMethod, sentExtra }) => {
  const [menu, setMenu] = useState<{ entry: TimelineEntryRef; style: React.CSSProperties } | null>(null);

  const rows = buildTimelineRows(events, query, agent);

  // ── trailing open-state block — one shared derivation (lib/queryAmbient), the same numbers the
  // command bar shows, so the two can't disagree. Ball-holder still comes from getPrimaryAction. ──
  const ballHolder = primaryAction?.ballHolder ?? null;
  /* ⚠️ THE AGENT'S STATED WINDOW WINS OVER THE HOUSE ONE (§7). Without it this pane counted to the
     8/12/12-week house assumption while the list beside it counted to what the agency actually
     says — one screen, one query, two deadlines. Falls back to the house window when the record
     states none, which is the only case the assumption was ever for. */
  const ambient = queryAmbientStatus(query, ballHolder, primaryAction?.markKind, Date.now(), agent?.responseTimeWeeks);
  const waiting = ambient.mode === "waiting" ? ambient : null;
  const sendWhat = ambient.sendWhat;

  const sage = waiting ? !waiting.overdue : true; // sage within window, calm grey once past it
  const wcol = sage
    ? { pillBg: "#eef2ec", pillBd: "#cdd9c8", pillTx: "#3f5340", dim: "#5a6e58", barBg: "#e6ece4", barFill: "linear-gradient(90deg,#a9c0a4,#8aa886)" }
    : { pillBg: "#eee9e2", pillBd: "#ddd4c6", pillTx: "#6a5f52", dim: "#8a7d6c", barBg: "#e7e0d6", barFill: "linear-gradient(90deg,#bdb3a4,#a89c8a)" };

  return (
    <div>
      {/* timeline history — oldest at the top, newest at the bottom (rows extracted to
          TimelineRows — the sheet shares them; the ⋯ wiring here is unchanged) */}
      {/* ⚠️ `continues` ONLY WHEN A PROJECTION ACTUALLY FOLLOWS (fix pack 4 §3). Passing it
          unconditionally would leave a connector running off the end of a closed query's history
          into nothing. */}
      <TimelineRows
        rows={rows}
        onEditSendMethod={onEditSendMethod}
        onMenuOpen={onEditEntry || onDeleteEntry ? (entry, style) => setMenu({ entry, style }) : undefined}
        continues={ballHolder === "agent" && !!waiting}
        sentExtra={sentExtra}
      />

      {/**
        * ⚠️ THE TODAY MARKER IS REMOVED (§2), AND ITS OWN ARGUMENT IS WHAT REMOVES IT. §7 built it
        * as "a solid burgundy dot among hollow ones — the only point on the line that is true right
        * now", and gave it a position: "Day 5 of ~28". Both halves turned out to be the problem.
        *
        * The position is stated twice: `Waiting to hear back` carries the elapsed figure as its own
        * date, and the stats strip above states the same count against its expected date. So the
        * marker's words were a third reading of one number.
        *
        * And it is a MARK WITH NO EVENT BEHIND IT — the one node on the timeline that records
        * nothing having happened. It appeared only on waiting-and-dated queries, which is most of
        * what made two Tracking cards look differently spaced: a line of events interrupted by a
        * smaller dot on some queries and not others.
        *
        * ⚠️ ITS RHYTHM WORK IS NOT LOST WITH IT. The previous pack brought this element onto the
        * events' own inset and gap; those numbers were the events', not its own, so the rhythm is
        * unchanged by its going. Deleted rather than hidden, and its CSS with it.
        */}
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

        /**
         * ⚠️ WAITING IS A STAGE ON THE TIMELINE, NOT A BOX AFTER IT (fix pack 4 §3, reversing fix
         * pack 3's "kept as built"). It used to trail the history as a separate card, which said
         * the wait was a note ABOUT the query rather than the part of it you are currently in.
         *
         * ⚠️ THE BAR MOVED; IT WAS NOT REBUILT. Every state below is the code that was already
         * here — the derived geometry from `trackingBar`, the overdue hatch and marker, the grace
         * two-tone against the nudge horizon, the milestone pop-ups. The ref draws a simpler fill
         * and it is deliberately not adopted: three states carrying real derivations are worth more
         * than a mockup's single one.
         *
         * ⚠️ ONLY THE WITHIN-WINDOW STATE GIVES UP ITS BOX. That box was the thing this section is
         * removing. Overdue and grace keep theirs because there the frame is an ESCALATION, not a
         * container — a pink card and a dashed sage card say something the event row cannot.
         */
        const nudgeAhead = reminderMs != null && reminderMs > Date.now();
        /* the agent's stated window, from the agent — falling back to nothing rather than to an
           invented number when they have not stated one */
        const statedWeeks = (agent as any)?.responseTimeWeeks;
        const windowLine = typeof statedWeeks === "number" && statedWeeks > 0
          ? `${agent?.name?.split(" ")[0] || "They"} states ${statedWeeks} week${statedWeeks === 1 ? "" : "s"}`
          : waiting.expMs != null ? `Expected by ~${fmtShort(waiting.expMs)}` : null;

        return (
          <TlProjection
            status={query.status}
            title="Waiting to hear back"
            date={waiting.sentMs != null ? elapsedLabel(waiting.nDays).toUpperCase() : undefined}
            last={!nudgeAhead}
          >
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
              /* GRACE (P2, revised) — DASHED box, no fill. Natural-language header in the header font,
                 single ink (no burgundy split). Two-tone bar (sage sent→deadline, red deadline→today),
                 the fill ends at TODAY; deadline marker only; the shimmer sweeps within the fill. */
              (() => {
                const now = Date.now();
                const graceDated = dated && reminderMs != null && reminderMs > waiting.sentMs!;
                const span = graceDated ? reminderMs! - waiting.sentMs! : 0;
                const pct = (n: number) => Math.max(0, Math.min(100, (n / span) * 100));
                const deadlinePct = graceDated ? pct(waiting.expMs! - waiting.sentMs!) : 0;
                const todayPct = graceDated ? pct(now - waiting.sentMs!) : 0;
                const sageEnd = Math.min(deadlinePct, todayPct);
                return (
                  <div style={{ border: "1px dashed var(--sage, #8a9e88)", borderRadius: 11, padding: "11px 13px" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 500, color: "var(--ink, #1e1a16)" }}>
                      Response {elapsedLabel(waiting.daysOverdue)} overdue — nudge sent {lastNudgeMs != null ? fmtNatural(lastNudgeMs) : "recently"}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted, #7d7469)", marginTop: 4 }}>
                      Scheduled follow-up set for {reminderMs != null ? fmtNatural(reminderMs) : "—"}
                    </div>
                    {graceDated && (
                      <>
                        {/* outer wrapper = the positioned context for the milestone + its pop-up, kept
                            OUTSIDE the overflow:hidden fill layer so the pop-up can escape above the bar */}
                        <div style={{ position: "relative", marginTop: 11 }}>
                          <div className="tl-gracebar" style={{ position: "relative", height: 6, borderRadius: 6, overflow: "hidden", background: "var(--sageC, #e9ede6)" }}>
                            {/* sage: sent → deadline (capped at today) */}
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${sageEnd}%`, background: "var(--sage, #8a9e88)" }} />
                            {/* overdue red: deadline → today */}
                            {todayPct > deadlinePct && (
                              <div style={{ position: "absolute", left: `${deadlinePct}%`, top: 0, bottom: 0, width: `${todayPct - deadlinePct}%`, background: "linear-gradient(90deg, var(--pink-b), var(--pink-i))" }} />
                            )}
                            {/* shimmer confined to the fill (0 → today) */}
                            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${todayPct}%`, overflow: "hidden" }}><div className="tl-sweep" aria-hidden="true" /></div>
                          </div>
                          {/* original-deadline milestone — bare hollow circle; its date shows on hover/tap */}
                          <BarMilestone pct={deadlinePct} label={`DEADLINE ${fmtShort(waiting.expMs!)}`} />
                        </div>
                        {/* end-anchor labels only */}
                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.04em", color: "#7d7268", marginTop: 7 }}>
                          <span>SENT {fmtShort(waiting.sentMs!)}</span>
                          <span style={{ color: "var(--sageD, #5a6e58)" }}>FOLLOW-UP {fmtShort(reminderMs!)}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()
            ) : escal === "overdue" ? (
              /* OVERDUE (revised) — pink card. Plain ink Playfair "Response overdue by {elapsed}[ · nudged
                 N×]" text (no pill) + ink hourglass, no nudge CTA. Bar fully filled sent→today
                 (rose→burgundy) to the full end of the track — no warning glyph (redundant with the
                 headline). Axis = SENT only; the "response expected" date rides a hollow-circle
                 milestone (hover/tap pop-up). */
              (() => {
                const now = Date.now();
                const expectedPct = dated ? Math.max(0, Math.min(100, ((waiting.expMs! - waiting.sentMs!) / Math.max(1, now - waiting.sentMs!)) * 100)) : 0;
                return (
                  <div style={{ background: "var(--pink-t)", border: "1px solid var(--pink-b)", borderRadius: 11, padding: "11px 13px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap", color: "var(--ink, #1e1a16)" }}>
                      {clockIcon}
                      <span style={{ fontFamily: FONT_SERIF, fontSize: 14, fontWeight: 600, color: "var(--ink, #1e1a16)" }}>
                        Response overdue by {elapsedLabel(waiting.daysOverdue)}{nudges > 0 ? ` · nudged ${nudges === 1 ? "once" : `${nudges}×`}` : ""}
                      </span>
                    </div>
                    {dated && (
                      <>
                        {/* the fill runs to the full end of the track — no warning glyph (redundant with
                            the headline), so no gap where it sat */}
                        <div style={{ position: "relative", height: 6, borderRadius: 6, marginTop: 11, background: "var(--pink-b)" }}>
                          <div style={{ position: "absolute", inset: 0, borderRadius: 6, background: "linear-gradient(90deg, #e6a99b, var(--pink-i))" }} />
                          {/* response-expected milestone — bare hollow circle; its date shows on hover/tap */}
                          <BarMilestone pct={expectedPct} label={`RESPONSE EXPECTED ${fmtShort(waiting.expMs!)}`} />
                        </div>
                        {/* end-anchor label only — SENT at the start (no end label; the fill IS the end) */}
                        <div style={{ fontFamily: FONT_MONO, fontSize: 9.5, letterSpacing: "0.04em", color: "#7d7268", marginTop: 7 }}>
                          <span>SENT {fmtShort(waiting.sentMs!)}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()
            ) : (
              /* ⚠️ WITHIN-WINDOW — NO BOX. The event's own title carries "Waiting to hear back", so
                 the old readout line would have stated it twice and has gone with the box; what is
                 left is the window and the bar, which is exactly what the event is for. */
              <>
                {windowLine && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#9a8d7e", marginTop: 2 }}>{windowLine}</div>}
                {bar}
              </>
            )}
          </TlProjection>
        );
      })()}

      {/* ⚠️ THE SCHEDULED NUDGE IS AN EVENT TOO, AND IT RENDERS ONLY WHEN ONE IS ACTUALLY SCHEDULED.
          The ref draws it unconditionally; there is no date to put on it unless `nudgeDate` is set
          and still ahead, and an undated future event would be chrome pretending to be a fact. */}
      {ballHolder === "agent" && waiting && (() => {
        const reminderMs = query.nudgeDate ? getTime(query.nudgeDate) : null;
        if (reminderMs == null || reminderMs <= Date.now()) return null;
        return (
          <TlProjection status={QueryStatus.QUERIED} title="Nudge" date={fmtShort(reminderMs).toUpperCase()} last>
            <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#9a8d7e", marginTop: 2 }}>
              A task will appear on your to-do list
            </div>
          </TlProjection>
        );
      })()}

      {ballHolder === "writer" && (
        /* YOUR MOVE (P2) — soft-pink fill + ink border, no divider beneath; Playfair title + burgundy
           sub. The ACTION lives in the fork/command bar (one home for actions). */
        /* ⚠️ THE EVENTS' GAP, NOT A NUMBER OF ITS OWN (§6). This block follows the last history
           row, so its `marginTop: 16` was a fifth spacing sitting where the eye had just learned
           to expect 22 (browser-measured). It is not an event — no marker, no connector — but the distance
           between it and what precedes it is the same distance as everywhere else. */
        <div style={{ marginLeft: 4, marginTop: "var(--tl-gap)" }}>
          <div style={{ background: "var(--pink, #f5e2da)", border: "1px solid var(--ink, #1e1a16)", borderRadius: 11, padding: "12px 14px" }}>
            <span style={{ fontFamily: FONT_SERIF, fontWeight: 600, fontSize: 15, color: "var(--ink, #1e1a16)" }}>Your move — send the {sendWhat}</span>
            {ambient.writerDaysAgo != null && (
              <small style={{ display: "block", fontWeight: 500, fontSize: 11.5, color: "var(--burg, #7c3a2a)", marginTop: 3 }}>
                {agent?.name?.split(" ")[0] || "The agent"} asked for it {elapsedLabel(ambient.writerDaysAgo)} ago
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
          /* ⚠️ EDIT RENDERS ONLY WHEN IT HAS SOMEWHERE TO GO. It used to render unconditionally and
             call `onEditEntry?.()`, which is silent when the handler is absent — and it became
             absent the moment the inline composer that hosted the correction editor was removed
             (record-response §1). An always-present menu item backed by an optional handler is a
             button that does nothing, and nothing says so. Correcting an entry is its own work;
             until it lands, the item is absent rather than dead. */
          items={[
            ...(onEditEntry ? [{ label: "Edit", icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>, onClick: () => onEditEntry(menu.entry) }] : []),
            { label: "Delete…", danger: true, icon: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></svg>, onClick: () => onDeleteEntry?.(menu.entry) },
          ]}
        />
      )}
    </div>
  );
};
