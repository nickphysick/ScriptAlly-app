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
import { queryAmbientStatus } from "../../lib/queryAmbient";
import { elapsedPhrase, exactDate } from "../../lib/elapsed";
import { NUDGE_NESTED_TYPE } from "../../lib/logNudge";
import { dropSupersededProvisional } from "../../lib/queryDerivation";
import { chapterise } from "../../lib/timelineChapters";
import { nudgeOutcomeLabel, nudgeTimes, nudgeHistoryLine, closureOffer, chasedBy, pastWindowLine, nextStepOffer, silencePolicyLine, windowAttribution, type ReminderTask } from "../../lib/nudgeState";

/* ⚠️ `fmtNatural` IS DELETED WITH THE GRACE BOX THAT USED IT (§5). It spelled an ordinal date —
   "15th July" — for that one header; the shape it belonged to is folded into "past the window", and
   `exactDate` is the app's one en-GB spelling. A second date formatter with no caller is the next
   surface's temptation to spell a date differently. */

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

/* ⚠️ `BarMilestone` IS DELETED WITH THE BARS THAT CARRIED IT (§5). It marked a point INSIDE a bar —
   the expected date on an overdue track, the original deadline on a grace one — and the wait draws
   one fill with two end labels now, where the expected date IS the end while the window is open and
   the closing date IS the end once it has passed. A component with no caller is the next reader's
   false lead; `deriveEscalation` and `trackingBar` stay in `queryAmbient` with their own tests and
   one live caller each (TimelineComposer reads `deriveEscalation`), so those are reported rather
   than removed.
   ⚠️ ITS TOUCH WIRING IS WORTH REMEMBERING IF A MID-BAR MARKER EVER RETURNS: hover was
   `pointerType`-guarded because hover does not exist on touch, and a click pinned the pop-up. */

// STAGE_RESPONSE_WINDOWS + the waiting/writer derivation moved to lib/queryAmbient.ts (one source
// shared with the command bar). This file consumes it via queryAmbientStatus.

const getTime = (val: any): number => {
  if (!val) return Date.now();
  if (val.toDate) return val.toDate().getTime();
  if (val.seconds) return val.seconds * 1000;
  const t = new Date(val).getTime();
  return isNaN(t) ? Date.now() : t;
};
/**
 * A day AHEAD: "MON 1 SEP" — the weekday leads, because a future date is read as a day of the week
 * before it is read as a number. Deliberately not `fmtShort`: that spells dates that have HAPPENED,
 * where the weekday is noise.
 */
const fmtDay = (ms: number): string => {
  const d = new Date(ms);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).toUpperCase();
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
  /**
   * A row that is NOT a status. Today that is only a nudge; §2 renders every `kind` as a MINOR
   * event — 9px hollow mark, one line, no title — so a note kind arriving later needs no branch.
   *
   * ⚠️ THE OLD NOTE HERE IS SUPERSEDED: a nudge no longer borrows the outgoing QUERIED `StatusDot`
   * "decoratively", which was the thing that let a follow-up claim a request's weight while wearing
   * the mark of a status it does not have. It DOES carry an `activityId` (a mis-logged nudge is
   * deletable), which the old note also denied.
   */
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
  /**
   * §2 (whose-window pack) — SET THE EXPECTED DATE IN PLACE. It used to open the Edit Query
   * overlay: a whole modal, most of it about something else, to answer one question the card had
   * just asked. The card now carries the control and hands back a resolved ISO date.
   *
   * ⚠️ IT WRITES TO THE QUERY, NEVER TO THE AGENT RECORD. What the writer is stating is what THEY
   * expect on THIS query; writing it to the agent would put words in the agency's mouth — which is
   * the exact fault §1 exists to remove, committed to the database instead of to the screen.
   */
  onSetExpectedDate?: (iso: string) => void;
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

  const merged = [...statusRows, ...nudgeRows].sort((a, b) => (a.timeMs ?? 0) - (b.timeMs ?? 0));

  /**
   * §5a — a nudge states its OUTCOME, not the act: "Nudged — no reply" while nothing has come back,
   * and plain "Nudged" once something has, because the event below it says the rest.
   *
   * ⚠️ DERIVED FROM THE ROWS THAT FOLLOW IT, never stored. The presence of an incoming event after
   * a nudge IS whether it worked; a `worked: true` flag would be a second copy of a fact the log
   * already holds, and one that goes stale the moment an entry is corrected.
   */
  return merged.map((row) => (row.kind === "nudge"
    ? { ...row, title: nudgeOutcomeLabel(row.timeMs ?? 0, merged) }
    : row));
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
const TlEvent: React.FC<{ last?: boolean; minor?: boolean; mark: React.ReactNode; children: React.ReactNode }> = ({ last = false, minor = false, mark, children }) => (
  <div className={`tl-ev${last ? " tl-ev--last" : ""}${minor ? " tl-ev--minor" : ""}`}>
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
  /**
   * §1 — group the rows into rounds and head each with its own label.
   *
   * ⚠️ ADDITIVE AND OFF BY DEFAULT, SO TO-DO IS UNTOUCHED. Its focus sheet renders a condensed
   * copy of these rows in a panel a few hundred pixels tall; chapter rules and headings there
   * would be structure for a surface that has no room to read it.
   */
  chaptered?: boolean;
}> = ({ rows, onMenuOpen, continues = false, onEditSendMethod, sentExtra, chaptered = false }) => {
  /* ⚠️ THE GROUPING IS THE PURE `chapterise`, INCLUDING ITS THRESHOLD. Nothing here decides when a
     heading is worth drawing — `labelled` is the derivation's own answer, so a second surface
     cannot apply a different figure. */
  const book = chaptered ? chapterise(rows) : null;
  const render = (row: RowSpec, isLast: boolean) => {
      /* the caller's materials list for this row, if it has one — see the note at its render */
      const showsExtra = !!sentExtra && row.status === QueryStatus.QUERIED && !row.kind;
      /**
       * ⚠️ §2 · A MINOR EVENT IS EVERY ROW THAT IS NOT A STATUS — which is what `kind` already
       * means, so the test is the presence of the field rather than a list of its values. A note
       * kind arriving later is minor without this line changing.
       *
       * ⚠️ AND ITS MARKER IS NOT A `StatusDot`. A nudge borrowed the outgoing QUERIED glyph
       * "decoratively" at the full 27px — which is exactly the fault this section names: at equal
       * weight a follow-up competes with a request, and it did so wearing the mark of a status it
       * does not have. A 9px hollow ring says "part of the record, not a round".
       */
      if (row.kind) {
        return (
          <TlEvent key={row.key} last={isLast} minor mark={<span className="tl-minormark" aria-hidden="true" />}>
            {/* ⚠️ §1 · THE SAME ROW 1 AS EVERY OTHER EVENT. A minor row drew its own arrangement —
                12px Inter, its own flex, its own 9px date — which is the whole fault the grammar
                removes. Its quietness stays where it already was: a 9px hollow ring and muted ink. */}
            <div className="tl-rowbody">
              <div className="tl-r1">
                <span className="tl-ttl tl-ttl--quiet">{row.title}</span>
                <span className="tl-meta">
                  {row.date && <span>{row.date}</span>}
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
              </div>
            </div>
          </TlEvent>
        );
      }
      return (
        <TlEvent key={row.key} last={isLast} mark={<StatusDot status={row.status} overrideSize={TL_MARK} />}>
          <div className="tl-rowbody">
            <div className="tl-r1">
              {/* ⚠️ §1 · THE TITLE IS PLAYFAIR AT `--tl-title`, THE ONE SIZE EVERY EVENT USES. It was
                  Inter 14/600 in a hardcoded near-black here, muted Inter in the projection and 12px
                  Inter in a minor row — three arrangements for one thing. */}
              <span className="tl-ttl">{row.title}</span>
              {/* ⚠️ THE EDITABLE FACT IS THE ROW'S ONE QUALIFIER (§2). "Query sent" and "via email"
                  are one statement about one event; on two lines the second read as a caption, which
                  is why the picker kept being moved somewhere that felt more like a control. It is a
                  sibling of the title now rather than words inside it, because row 1 is a flex line
                  and a nested inline button cannot sit on its baseline. */}
              {row.subEditable && row.sub && onEditSendMethod && (
                <span className="tl-qual">
                  {"· "}
                  <button type="button" className="qp-inplace" onClick={(e) => onEditSendMethod(e.currentTarget)} title="Change how this query was sent">{row.sub}</button>
                </span>
              )}
              <span className="tl-meta">
                {row.date && <span>{row.date}</span>}
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
            </div>
            {/* ⚠️ §1 · ROW 2, AND EVERYTHING BELOW LIVES INSIDE IT. Nothing may render outside the
                two rows, and the gap between the body's parts belongs to this block rather than to
                each part — see `.tl-body` in f12.css. */}
            <div className="tl-body">
            {/* ⚠️ NOT TWICE. A promoted sub is drawn on the title line above; drawing it here as well
                would state the send method twice, three pixels apart. Rows without the flag — and
                the flagged row when no picker was passed — keep the caption they have always had. */}
            {row.sub && !(row.subEditable && onEditSendMethod) && <div style={{ fontFamily: "'Inter',sans-serif", fontSize: 12, color: "#9a8d7e" }}>{row.sub}</div>}
            {/**
              * ⚠️ ONE MATERIALS LIST PER EVENT, AND THE RICHER ONE WINS.
              *
              * Two things read `query.materialsWanted` and both drew it here. These pills are the
              * OLDER of the two: `buildTimelineRows` maps the array through `formatQueryMaterial`
              * onto `row.pills`, and they are plain labels — no sent state, no way to attach. The
              * caller's `sentExtra` is the newer one, and it carries the manuscript name, each
              * material's ticked/unticked state and the `+ Attach` control. So the event stated its
              * materials twice, three lines apart, the first time without any of the information
              * the second one adds.
              *
              * ⚠️ THE PILLS ARE NOT DELETED, BECAUSE THEY ARE STILL RENDERED ELSEWHERE. To-do's
              * focus sheet (`FocusFlow.sheetTimeline`) mounts `<TimelineRows rows={rows} />` with no
              * `sentExtra` — a condensed, read-only view with no attach control and no manuscript
              * name — so `row.pills` is its only materials list. Removing them from the row spec
              * would have taken the materials off that surface to fix a duplicate on this one.
              * Traced to a rendered root before touching it, in both directions.
              *
              * ⚠️ SO IT IS "SUPERSEDED WHERE BOTH EXIST", not "removed": the caller that supplies
              * the richer list is the caller that suppresses the plain one.
              */}
            {row.pills && row.pills.length > 0 && !showsExtra && (
              <div className="tl-pills" style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{row.pills.map((p, pi) => <MatPill key={pi}>{p}</MatPill>)}</div>
            )}
            {/* the send's own materials — rendered by the caller, on the send rung only */}
            {showsExtra && sentExtra}
            </div>
          </div>
        </TlEvent>
      );
  };

  if (!book) return <>{rows.map((row, i) => render(row, i === rows.length - 1 && !continues))}</>;

  return (
    <>
      {book.chapters.map((chapter, ci) => {
        const lastChapter = ci === book.chapters.length - 1;
        return (
          <div className="tl-chap" key={ci}>
            {/* ⚠️ NO HEADING ON A ONE-ROUND QUERY — and when there ARE headings, EVERY chapter has
                one, including the first (§3b). The `&& chapter.label` guard that used to sit here
                was the fault: an imported query with no `Queried` root opened an unnamed leading
                chapter, so the first heading was simply missing while the later ones rendered.
                `chapterise` now names every round it opens, so there is nothing left to guard. */}
            {book.labelled && <div className="tl-chaplab">{chapter.label}</div>}
            {chapter.rows.map((row, ri) => {
              /* ⚠️ THE CONNECTOR ENDS WITH ITS ROUND, not only with the timeline. A line running out
                 of the last event of a chapter would cross the rule that separates the rounds and
                 arrive at the next round's heading, which is the one place it means nothing. */
              const endsChapter = ri === chapter.rows.length - 1;
              return render(row, endsChapter && !(lastChapter && continues));
            })}
          </div>
        );
      })}
    </>
  );
};

/**
 * TlProjection — a timeline event for something that has NOT happened yet (fix pack 4 §3).
 *
 * ⚠️ THE SAME GEOMETRY AS A REAL ROW, AND NOW BY SHARING IT RATHER THAN BY MATCHING IT (§6). This
 * note used to say the grid was "restated in one place" — it was restated in two, here and in
 * `TimelineRows`, which is exactly the arrangement where the markers drift a pixel or two apart and
 * the timeline bends where the future starts. Both render `TlEvent`; there is nothing left to match.
 *
 * ⚠️ THE MARKER IS `ghost` — `StatusDot` drained to neutral with no pulse, the "would-be"
 * treatment — EXCEPT ON THE WAIT, which takes a `tone` (§5).
 *
 * ⚠️ AND THAT EXCEPTION REVERSES THIS NOTE'S OWN ARGUMENT, WITH A REASON. It used to say inventing
 * a second hollow marker would give the app two ways to draw "not yet". True of a would-be STATUS —
 * the scheduled nudge still uses it. The WAIT is not a would-be status: it is the state the query
 * is in right now, and §5 asks the rail to carry whether the agency's window is still open. A
 * drained status glyph cannot say that, and the ring is where it is legible without reading a word.
 * `StatusDot` itself is untouched and remains the only thing that draws a status.
 */
const TlProjection: React.FC<{
  status: QueryStatus | string;
  title: string;
  date?: string;
  /** §1 (whose-window pack) — row 1's one qualifier: who stated this window, and what they said. */
  qual?: React.ReactNode;
  last?: boolean;
  /** §5 — sage while the stated window is open, oat once it has passed or was never stated. */
  tone?: "sage" | "oat";
  children?: React.ReactNode;
}> = ({ status, title, date, qual, last = false, tone, children }) => (
  <TlEvent last={last} mark={tone
    ? <span className={`tl-waitmark tl-waitmark--${tone}`} aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M5 22h14M5 2h14M17 22v-4.2a2 2 0 0 0-.6-1.4L12 12l-4.4 4.4a2 2 0 0 0-.6 1.4V22M7 2v4.2a2 2 0 0 0 .6 1.4L12 12l4.4-4.4A2 2 0 0 0 17 6.2V2" /></svg>
      </span>
    : <StatusDot status={status} overrideSize={TL_MARK} ghost decorative />}>
    {/* ⚠️ §1 · THE SAME TWO ROWS AS A REAL EVENT. The projection had the row-1 SHAPE but its own
        type — muted Inter 14/600 against the status rows' near-black Inter — and its children fell
        straight into the body with each part carrying its own margin. */}
    <div className="tl-rowbody">
      <div className="tl-r1">
        <span className="tl-ttl tl-ttl--quiet">{title}</span>
        {qual}
        {date && <span className="tl-meta">{date}</span>}
      </div>
      <div className="tl-body">{children}</div>
    </div>
  </TlEvent>
);

/**
 * ══ §2 (whose-window pack) · SETTING THE DATE, IN PLACE ═══════════════════════════════════════
 *
 * ⚠️ THE OFFER USED TO OPEN THE EDIT QUERY OVERLAY — a whole modal, most of it about something
 * else, to answer the one question the card had just asked. The control is here now: the offer's
 * own line, and the editor in its place when you take it.
 *
 * ⚠️ IT IS BUILT HERE RATHER THAN REUSING `WeekSlider`, and the reason is a hazard this repo has
 * already paid for once. `WeekSlider` hardcodes `id="sa-wk"` on its input and its label's `htmlFor`
 * — exactly the `ScriptAllyLogo` fault — so mounting it beside the Add-Agent and Edit-Agent forms
 * that already use it would put two elements with one id in the document and point a label at
 * whichever came first. It is also Form 11 (`sa-fld`, `sa-label`) inside an F12 card. The SCALE is
 * the shared one — whole weeks from 1 — and that is the part that had to agree.
 *
 * ⚠️ ENTER SAVES AND ESC CANCELS, stated on the control rather than assumed. A range input answers
 * arrow keys for free; without the hint nothing says the value is not already committed.
 *
 * ⚠️ THE EYEBROW SAYS `YOUR`. The same word that keeps the estimate the writer's in the display
 * belongs on the control that sets it — a control labelled "Expected response time" would read as
 * though it were recording something the agency had said.
 */
const SET_WINDOW_MAX = 16;
const SetWindow: React.FC<{ anchorMs: number; onSave: (iso: string) => void }> = ({ anchorMs, onSave }) => {
  const [open, setOpen] = useState(false);
  const [weeks, setWeeks] = useState(6);
  const resolved = anchorMs + weeks * 7 * 86400000;

  if (!open) {
    return (
      <div className="tl-ask">
        <span>Enter an expected response date for more accurate tracking</span>
        <button type="button" className="tl-ask-a" onClick={() => setOpen(true)}>Set a date</button>
      </div>
    );
  }
  return (
    <div
      className="tl-setwin"
      onKeyDown={(e) => {
        if (e.key === "Enter") { e.preventDefault(); onSave(new Date(resolved).toISOString()); setOpen(false); }
        if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); setOpen(false); }
      }}
    >
      <div className="tl-setwin-eb">Your expected response time</div>
      <input
        type="range" className="tl-setwin-rg" min={1} max={SET_WINDOW_MAX} step={1} value={weeks} autoFocus
        aria-label="Your expected response time, in weeks"
        onChange={(e) => setWeeks(Number(e.target.value))}
        style={{ ["--pct" as string]: `${((weeks - 1) / (SET_WINDOW_MAX - 1)) * 100}%` }}
      />
      <div className="tl-setwin-tk"><span>1 wk</span><span>4</span><span>8</span><span>12</span><span>{SET_WINDOW_MAX}+</span></div>
      <div className="tl-setwin-val"><b>{weeks}</b><span>week{weeks === 1 ? "" : "s"} · around {exactDate(resolved).replace(/ \d{4}$/, "")}</span></div>
      <div className="tl-setwin-k">Enter to save · Esc to cancel</div>
    </div>
  );
};

export const QueryTimeline: React.FC<QueryTimelineProps & {
  sentExtra?: React.ReactNode;
  onMarkClosed?: () => void;
  /** §5d — "Keep tracking". Absent ⇒ the offer renders no dismissal, never a dead button. */
  onKeepTracking?: () => void;
  /** §6b — the scheduled reminder this query is waiting on, derived by the caller. */
  reminder?: ReminderTask | null;
  /** §6b — open the to-do surface at that reminder. */
  onOpenReminder?: () => void;
  /** §6c — create the reminder task through the existing task-creation path. */
  onRemindLater?: () => void;
}> = ({ query, agent, events, primaryAction, onEditEntry, onDeleteEntry, onNudge, onSetExpectedDate, onEditSendMethod, sentExtra, onMarkClosed, onKeepTracking, reminder = null, onOpenReminder, onRemindLater }) => {
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

  /**
   * §5b/§5c — every nudge on this query, once, read by the history line and the closure offer.
   *
   * ⚠️ THE WINDOW'S CLOSE IS `waiting.expMs`, THE SAME FIGURE THE BAR DRAWS. The offer's "since the
   * window expired" and the bar's expected marker cannot name two different days.
   */
  const nudges = nudgeTimes(events, NUDGE_NESTED_TYPE, (v) => getTime(v));
  const offer = closureOffer({
    times: nudges,
    /* ⚠️ §3 · THE THIRD DISPLAY PATH THAT WAS READING THE HOUSE ASSUMPTION. The offer states "N
       since the window expired" — a sentence with no meaning when no window was ever stated, and one
       that would have quoted the app's own 8/12/12-week guess back as the agency's deadline. */
    windowExpiredMs: waiting?.windowStated ? waiting.expMs ?? null : null,
    now: Date.now(),
    dismissed: (query as { closureOfferDismissed?: boolean }).closureOfferDismissed === true,
    /* §1 (policy pack) — the agency's own position, which is a second route in. Absent and `false`
       both mean "they have not said silence is a no", and both leave the nudge route to decide. */
    policy: agent?.noResponseMeansNo,
    /* §3 — and a chase the writer has already booked supersedes both routes. Same `reminder` the
       ghost rung draws, so the offer and the rung cannot contradict each other on one card. */
    reminderScheduled: !!reminder,
  });

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
        chaptered
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
      {/**
        * ══ §5 · THE WAITING STATE — THREE SITUATIONS, ONE SHAPE ══════════════════════════════
        *
        * Title, what the agency said, then the measurement — differing only in what is true:
        *   inside the stated window — "Waiting to hear back", sage ring, chip, sage bar
        *   past it                  — "No reply", oat ring, chip + closing date, spent hatch,
        *                              and the convention line
        *   no window stated         — "Waiting to hear back", oat ring, NO bar and no end labels,
        *                              the fact, and the one offer that would change it
        *
        * ⚠️ ALL THREE READ `windowStated`, NEVER `expMs`. `queryAmbientStatus` derives an expected
        * date from the house 8/12/12-week assumption when nobody has stated one, so anything keyed
        * on `expMs` presents the app's guess as the agency's word.
        *
        * ⚠️ WHAT THE AGENCY SAID IS A CHIP, NOT BODY TEXT. It is their claim, and its own surface
        * is what distinguishes it from the app's sentences around it. It renders only when the
        * AGENCY stated weeks: a window the writer set themselves through "Set an expected date" is
        * a real window and gets a bar, but quoting it back as the agency's would misattribute it.
        *
        * ⚠️ AND THE GRACE STATE IS FOLDED INTO "PAST THE WINDOW". It was a fourth shape — a dashed
        * box counting to a scheduled follow-up — and this section's whole claim is one shape. None
        * of its information is lost: the scheduled nudge has its own projection event below, and
        * the nudge history line beneath the bar lists every nudge with its date. `deriveEscalation`
        * and `trackingBar` keep their tests and lose this caller; reported, not deleted.
        */}
      {ballHolder === "agent" && waiting && (() => {
        const now = Date.now();
        const who = chasedBy(agent);
        /* the scheduled follow-up, if one is still ahead — it has its own event below, and this
           only decides whether the wait is the timeline's last node */
        /* ⚠️ §2 (policy pack) · `reminderMs` IS DELETED AND THIS ROW NOW ASKS THE GHOST'S OWN
           SOURCE. It read `query.nudgeDate` — the retired projection this file's own §6b note says
           was replaced by the task store — while the ghost beneath renders from `reminder`. So a
           reminder set on the to-do list left `nudgeDate` untouched, this row came out `last`, and
           `.tl-ev--last { padding-bottom: 0 }` fused the ghost to the sentence above it. Two
           derivations of one fact, disagreeing exactly where it showed. */
        /* the AGENCY's own figure — not the house window, and not the writer's override */
        const statedWeeks = typeof agent?.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0
          ? agent.responseTimeWeeks : null;
        const stated = waiting.windowStated;
        const past = stated && waiting.overdue;
        /* a bar needs a window AND both of its ends */
        const dated = stated && waiting.sentMs != null && waiting.expMs != null;
        const pct = dated ? Math.max(0, Math.min(100, ((now - waiting.sentMs!) / (waiting.expMs! - waiting.sentMs!)) * 100)) : 0;

        return (
          <TlProjection
            status={query.status}
            title={past ? "No reply" : "Waiting to hear back"}
            date={waiting.sentMs != null ? elapsedPhrase(waiting.nDays).toUpperCase() : undefined}
            tone={stated && !past ? "sage" : "oat"}
            last={!reminder}
            /**
             * ⚠️ THE CHIP IS GONE, AND THE ATTRIBUTION TOOK ITS PLACE IN ROW 1. `Priya says 6 weeks`
             * sat on its own surface so a claim could not be read as one of the app's own sentences
             * — the right instinct, the wrong device. It cost a body part to say four words and it
             * could only ever carry the AGENCY's version; the qualifier carries whoever actually
             * said it, and the writer's own estimate finally has a voice.
             *
             * ⚠️ AND THE EXPIRY DATE IS NOT RESTATED HERE. The chip appended "· window expired 23
             * July" beside the bar's own "WINDOW EXPIRED 23 JUL"; one fact, one surface.
             */
            qual={(() => {
              const a = windowAttribution({
                source: waiting.windowSource, who, weeks: statedWeeks, expMs: waiting.expMs, past: !!past, formatDate: exactDate,
              });
              return a ? <span className="tl-qual">— {a.lead}<b>{a.strong}</b></span> : undefined;
            })()}
          >

            {/**
              * ⚠️ §3 · THE BODY LINE ASKS WHETHER A WINDOW WAS STATED, NOT WHETHER A BAR CAN BE
              * DRAWN — and conflating the two is what made the card contradict itself. It read
              * `dated ? bar : body`, and `dated` also requires both ENDS: so a query with a stated
              * window and no recorded send date fell to the else branch and printed "…do not state
              * a response time" directly beneath a chip quoting the weeks they stated.
              *
              * ⚠️ THREE OUTCOMES, NOT TWO. No window → the fact and the offer. A window with both
              * ends → the bar. A window with no send date → the chip alone: there is a window and
              * nothing to measure it from, and neither of the other two says that honestly.
              */}
            {!stated ? (
              /**
               * ⚠️ NO BAR AND NO END LABELS — there is nothing to measure against, and a track for a
               * window that does not exist would invent the fact the sentence beneath it is
               * admitting the record does not hold. Same rule as the nudge confirm's bar.
               *
               * ⚠️ AND THE COPY IS THE AGENCY'S ABSENCE, NOT THE WRITER'S OVERSIGHT. It read
               * "Awaiting response — no expected date set", which quietly made a missing agency
               * figure sound like something the writer had failed to fill in.
               */
              <>
                <div className="tl-wbody">{who.name} {who.plural ? "do" : "does"} not state a response time.</div>
                {onSetExpectedDate && (
                  <SetWindow anchorMs={waiting.sentMs ?? now} onSave={onSetExpectedDate} />
                )}
              </>
            ) : dated ? (
              /* ⚠️ §1 · THE BAR AND ITS END LABELS ARE ONE BODY PART, not two. As siblings they took
                 the block's gap between them and the footer drifted away from the track it labels;
                 a label belongs to its bar the way a caption belongs to a figure. */
              <div>
                <div className={`tl-wbar${past ? " tl-wbar--past" : ""}`}><i style={{ width: `${past ? 100 : pct}%` }} /></div>
                <div className="tl-wbarf">
                  <span>Sent {fmtShort(waiting.sentMs!)}</span>
                  {/* ⚠️ THE END LABEL NAMES ITS OWNER TOO, so the bar cannot be misread once the
                      line above it has been. A window the WRITER set never "expires" — nothing was
                      promised — so its label states whose figure it is in both states, where an
                      agency's window expires on the day they named. */}
                  <span>{waiting.windowSource === "writer"
                    ? `Your estimate · ${fmtShort(waiting.expMs!)}`
                    : past ? `Window expired ${fmtShort(waiting.expMs!)}` : `Expected by ~${fmtShort(waiting.expMs!)}`}</span>
                </div>
              </div>
            ) : (
              /* ⚠️ A STATED WINDOW WITH NO SEND DATE: the chip above says what they said, and there
                 is nothing to measure it from. No bar, and no sentence claiming they stated nothing
                 — which is what this branch used to print. */
              <div className="tl-wbody">No send date recorded, so that window has no closing date.</div>
            )}

            {/**
              * §6a — THE SILENCE GETS A FIGURE, in Playfair, so the card has one finding rather than
              * a bar and a chip to compare. It measures from the STATED close and renders only when
              * a window was stated: `pastWindowLine` returns null otherwise, because the house
              * assumption is the app's own arithmetic and a figure counted from it would be
              * attributed to the agency.
              */}
            {(() => {
              const line = pastWindowLine(waiting.expMs, now, stated);
              return line ? <div className="tl-pastfig"><b>{line.figure}</b> {line.tail}</div> : null;
            })()}

            {/**
              * §1 (policy pack) — THE AGENCY'S OWN POLICY, OR NOTHING. This read "Many agencies
              * treat silence as a pass." on every past-window state: a true observation about the
              * trade, printed on one specific query's tracker where it was attributable to nobody.
              * `silencePolicyLine` returns a sentence only where the agency has actually stated that
              * silence means no, and null everywhere else — no generic fallback and no house
              * assumption, the same rule the window bar already follows.
              */}
            {(() => {
              const policy = silencePolicyLine({
                /* ⚠️ `exactDate`, NOT `fmtShort` — this is PROSE, and the timeline's meta format is a
                   bare uppercase day and month. "their window expired 23 JUL" mid-sentence reads as a
                   system tag; `elapsed.ts` is where this app spells a date in full, and the note at
                   the head of this file says exactly why a second formatter is not written here. */
                policy: agent?.noResponseMeansNo, who, windowExpiredMs: waiting.expMs ?? null, now, formatDate: exactDate,
              });
              return policy ? <div className="tl-conv">{policy}</div> : null;
            })()}

            {/**
              * §5b (nudge pack) — the nudge history, beneath whatever state the wait is in. It is
              * the most useful fact in a long silence and it exists nowhere else on the card.
              */}
            {nudges.length > 0 && <div className="tl-nhist">{nudgeHistoryLine(nudges, (ms) => fmtShort(ms).toUpperCase())}</div>}

            {/**
              * §5c (nudge pack) — closure offered once, on facts: at least one unanswered nudge AND
              * a window expired more than six months ago. Both answers, equal standing.
              */}
            {offer.show && (
              <div className="tl-offer">
                <div className="tl-offer-f">{offer.facts}</div>
                <div className="tl-offer-a">
                  {onMarkClosed && <button type="button" className="tl-offer-go" onClick={onMarkClosed}>Mark closed</button>}
                  {onKeepTracking && <button type="button" className="tl-offer-keep" onClick={onKeepTracking}>Keep tracking</button>}
                </div>
              </div>
            )}

            {/**
              * §6c — WHEN NOTHING IS PENDING, THE OFFER CARRIES THE NEXT STEP. Three actions of
              * equal standing: nudge now, set a reminder, or close it.
              *
              * ⚠️ IT NEVER SHOWS BESIDE THE CLOSURE OFFER, and not by a guard — the two triggers are
              * opposites. The closure offer needs an unanswered nudge; this one needs nothing
              * pending, which a recent nudge is.
              *
              * ⚠️ AND IT NEEDS NO DISMISSAL FLAG OF ITS OWN: each of its three actions makes its own
              * trigger false, so it self-dismisses by construction. It honours the closure offer's
              * flag all the same, because a writer who said "keep tracking" has answered the card's
              * offer as such.
              */}
            {past && !offer.show && (() => {
              const next = nextStepOffer({
                times: nudges, reminder, now,
                dismissed: (query as { closureOfferDismissed?: boolean }).closureOfferDismissed === true,
              });
              if (!next.show) return null;
              return (
                <div className="tl-offer">
                  <div className="tl-offer-f">{next.facts}</div>
                  <div className="tl-offer-a">
                    {onNudge && <button type="button" className="tl-offer-go" onClick={onNudge}>Nudge now</button>}
                    {onRemindLater && <button type="button" className="tl-offer-keep" onClick={onRemindLater}>Remind me later</button>}
                    {onMarkClosed && <button type="button" className="tl-offer-keep" onClick={onMarkClosed}>Mark closed</button>}
                  </div>
                </div>
              );
            })()}
          </TlProjection>
        );
      })()}

      {/**
        * ══ §6b · THE FUTURE GETS A GHOST RUNG ════════════════════════════════════════════════
        *
        * ⚠️ SOLID IS WHAT HAPPENED; HOLLOW IS WHAT HAS NOT. The ring is dashed with no fill, the
        * connector into it is dashed, the ink is faint and the date is ahead — so the rung is
        * unmistakably not-yet without a word saying so.
        *
        * ⚠️ IT RENDERS THE WRITER'S OWN REMINDER, NOT THE APP'S NOTICING. The caller derives it
        * from the stored `UserTask` store (undone, scoped to this query, dated ahead) rather than
        * from the derived task feed — see `scheduledReminder`. A ghost drawn from a suggestion
        * would show a future nobody scheduled.
        *
        * ⚠️ AND IT GOES WHEN THE TASK DOES, because it IS the task: completing or deleting the
        * reminder removes it from the store the caller reads, and nothing here is cached.
        *
        * ⚠️ THE OLD `nudgeDate` PROJECTION IS RETIRED WITH IT. That drew a rung from a field on the
        * QUERY — a second record of a reminder whose real home is the to-do list — so a completed
        * task left a phantom future on the timeline.
        */}
      {ballHolder === "agent" && waiting && reminder && (
        <div className="tl-ev tl-ev--ghost tl-ev--last">
          <div className="tl-evmark"><span className="tl-ghostmark" aria-hidden="true">🔔</span></div>
          {/**
            * ⚠️ §3 · A PENDING OBJECT, NOT AN EVENT — option C. §1 gave every event two rows, and
            * this one kept failing to fit them because it is not an event: nothing happened. So it
            * stops being written in the event grammar and becomes a dashed panel hanging off the
            * rail below the record.
            *
            * ⚠️ THE PANEL IS THE LINK, which is what removes the fragment. The sentence used to
            * carry a link in its middle — "Nudge reminder set · from your to-do list · SCHEDULED
            * FOR MON 1 SEP" — three things competing on one line, one of them a prefix explaining a
            * slot. The whole panel is the target now, so the words are just the two facts: what is
            * set, and when.
            *
            * ⚠️ SOLID IS WHAT HAPPENED; DASHED IS WHAT HAS NOT. No fill, no shadow, faint ink
            * throughout, on the page ground rather than a surface of its own.
            *
            * ⚠️ AND IT IS THE ONLY OBJECT ON THIS TIMELINE ALLOWED OUTSIDE THE TWO-ROW GRAMMAR,
            * precisely because it is not an event. Nothing else may take this shape — a second
            * dashed panel would make "not yet" a decoration rather than a statement.
            */}
          <div className="tl-rowbody">
            {onOpenReminder ? (
              <button type="button" className="tl-ghostpanel" onClick={onOpenReminder} title="Open this reminder on your to-do list">
                <span className="tl-ghostwho">Nudge reminder set</span>
                <span className="tl-ghostwhen">{reminder.dueDate ? fmtDay(new Date(`${reminder.dueDate}T12:00:00`).getTime()) : ""}</span>
              </button>
            ) : (
              <div className="tl-ghostpanel">
                <span className="tl-ghostwho">Nudge reminder set</span>
                <span className="tl-ghostwhen">{reminder.dueDate ? fmtDay(new Date(`${reminder.dueDate}T12:00:00`).getTime()) : ""}</span>
              </div>
            )}
          </div>
        </div>
      )}

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
                {agent?.name?.split(" ")[0] || "The agent"} asked for it {elapsedPhrase(ambient.writerDaysAgo)} ago
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
