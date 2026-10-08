/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QcList — the List view (Query Centre v11): a slim head row, then one 67px row per query.
 *
 * ⚠️ FOUR COLUMNS, EACH WITH A FLOOR AND A CEILING, AND THE TRACKS ARE SIZED BY THOSE RULES ALONE.
 * Every row is its own grid, so a track sized by content would put each row's columns somewhere
 * different. Between floor and ceiling the columns share the width; once all are at their ceilings
 * the spare goes into the GAPS, equally (`justify-content: space-between`), so no column pools it.
 * The chip and the name are ONE column, so a widening gap never separates them. The head row uses
 * the same template. (This took the mockup three attempts; the rule is in qcvList.css, once.)
 *
 * ⚠️ NO ROW BUTTONS. "Record response", "Mark sent" and the rest live in the open card's footer;
 * a row selects, and that is all it does. `display: contents` is never used on a row — it fractures
 * the hover and selection backgrounds.
 */
import { MONTHS_SHORT } from "../../../lib/dates";
import React, { useEffect, useRef } from "react";
import { StatusDot } from "../../StatusDot";
import { Mark } from "../QueryCard";
import { MATERIAL_SLOTS } from "../../../lib/queryCardFacts";
import { MATERIAL_ROW_NAMES } from "../../../lib/agentMaterials";
import { STAGE_NAME, factLine, shortDay, type QcRow } from "../../../lib/qcSummary";
import { elapsedPhrase } from "../../../lib/elapsed";
import { sentRecordOf } from "../../../lib/queryActions/sentRecord";
import type { Bucket } from "../../../lib/todoBuckets";
import { comingTone, type ComingUp } from "../../../lib/qcComingUp";
import type { QcSort } from "../../../lib/qcSummary";
import { QcArtSlot, type SpotName } from "./QcArtSlot";
import "./qcv131.css";
import { QueryStatus } from "../../../types";
import type { ListGroup } from "../../../lib/qcCalView";
import "./qcvPage.css";
import "./qcvList.css";

const MON = MONTHS_SHORT;
const DAY = 86_400_000;

/**
 * §3 · the glyph that rides the disc's bottom-right corner — a ring for a query out, a half for a
 * partial or a request in play, a full for an offer or a full sent.
 *
 * ⚠️ IT IS NOT `StatusDot`, AND THAT IS DELIBERATE. The house law is that a query's STATUS is only
 * ever drawn by `StatusDot`; this is not the status — the status is named in words two columns
 * along, in `Where it stands`. This mark says how much of the manuscript is in play, which is three
 * states rather than ten, and it is 13px on the corner of a disc. `StatusDot` still draws the
 * status everywhere the status is what is being drawn.
 */
export const glyphOf = (s: QueryStatus): "ring" | "half" | "full" =>
  s === QueryStatus.OFFER || s === QueryStatus.FULL_SENT ? "full"
    : s === QueryStatus.PARTIAL_REQUESTED || s === QueryStatus.FULL_REQUESTED || s === QueryStatus.PARTIAL_SENT || s === QueryStatus.REVISE_RESUBMIT ? "half"
      : "ring";

/**
 * The second line of the Queried column: `10 MAY`, or `14 MAR 2024` once the year is not this one.
 *
 * ⚠️ THE YEAR APPEARS ONLY WHEN IT IS NOT THE CURRENT ONE, which is the app's own rule everywhere a
 * date is short. A year on every date is noise in a column 110px wide; a year on none of them makes
 * a three-year-old query look like a recent one.
 */
export const queriedDate = (ms: number, nowMs: number): string => {
  const d = new Date(ms);
  const y = d.getFullYear() === new Date(nowMs).getFullYear() ? "" : ` ${d.getFullYear()}`;
  return `${d.getDate()} ${MON[d.getMonth()].toUpperCase()}${y}`;
};

/**
 * The second line of `Where it stands`: the date it reached this stage, or what there is to say
 * instead.
 *
 * ⚠️ "NO REPLY" IS ONLY SAID OF THE AGENT'S COURT. A query waiting on the WRITER has had its reply;
 * what is undated there is the request, and saying "no reply yet" about it would be false.
 */
export const standSince = (r: QcRow, nowMs: number): string => {
  /**
   * ⚠️ THE AGENT'S COURT TALKS ABOUT THE REPLY, NOT ABOUT THE STAGE DATE — and that is a repair the
   * page found rather than a preference. A `Queried` query's stage date IS its send date, so the
   * cell printed `23 SEP` under `Queried` beside a Queried column already printing `23 SEP`: the
   * same date twice in one row, three columns apart, saying nothing the second time.
   *
   * ⚠️ AND "YET" VERSUS THE SPAN IS `pastExpected`, NOT A NUMBER OF DAYS. Inside the agency's own
   * stated window nothing is late, so "no reply yet" is the whole truth; past it the span is the
   * fact worth stating. The reference's own two examples fall either side of exactly that line —
   * three days in and two and a half years out — and a day threshold would be a second clock beside
   * the one the desk, the rail and the expanded view all read.
   */
  if (r.court === "agent") {
    if (!r.pastExpected) return "NO REPLY YET";
    const since = r.sentMs != null ? elapsedPhrase(Math.max(0, Math.round((nowMs - r.sentMs) / DAY))) : null;
    return since ? `NO REPLY · ${since}` : "NO REPLY YET";
  }
  if (r.stageStartMs != null) return shortDay(r.stageStartMs).toUpperCase();
  return "NOT DATED";
};

/**
 * §3 · What you sent — a sand chip for a package, the four icons for individual pieces with the
 * unsent ones ghosted, and `Add` where nothing was recorded.
 *
 * ⚠️ THE THREE TREATMENTS ARE `sentRecordOf`'s THREE ANSWERS and nothing else. `how` distinguishes
 * "we do not know what you sent" from "you sent these pieces" — `materialsWanted` alone cannot,
 * because an empty array is both. "Sent nothing" is not a state the model has: a query has a send
 * date, so the honest third reading is that nobody recorded it, which is what `Add` says.
 */
export const SentCell: React.FC<{ row: QcRow; packageName?: (id: string) => string | null }> = ({ row, packageName }) => {
  const rec = sentRecordOf(row.query);
  if (rec.how === "package") {
    const name = rec.packageName ?? (rec.packageId ? packageName?.(rec.packageId) ?? null : null);
    return (
      <span className="qcv-pk" data-qcv="row-pkg" title={`${name ?? "Package"}${rec.edition ? ` · edition ${rec.edition}` : ""}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8l9-4 9 4-9 4z" /><path d="M3 8v8l9 4 9-4V8" /><path d="M12 12v8" /></svg>
        <span className="qcv-pk-n">{name ?? "Package"}</span>
        {rec.edition != null && rec.edition > 1 && <em>{rec.edition}ND ED.</em>}
      </span>
    );
  }
  if (rec.how === "unrecorded" && !row.materialsRecorded) {
    return <span className="qcv-nr" data-qcv="row-add"><u>Add</u></span>;
  }
  return (
    <span className="qcv-mi" data-qcv="row-mats">
      {MATERIAL_SLOTS.map((k) => {
        const name = MATERIAL_ROW_NAMES[k];
        const sent = row.materials[k] != null;
        /* ⚠️ "NOT SENT" IS ONLY SAID WHERE SOMETHING WAS RECORDED. A query with no materials
           recorded at all is not a query that sent nothing — the icons are all quiet and the title
           says which. */
        const say = sent ? `${name} sent` : row.materialsRecorded ? `${name} not sent` : `${name} not recorded`;
        return <i key={k} className={sent ? "qcv-mi-i" : "qcv-mi-i qcv-mi-i--off"} title={say} role="img" aria-label={say}><Mark kind={k} /></i>;
      })}
    </span>
  );
};

export const QcList: React.FC<{
  /**
   * §2 (v95) — THE ROWS ARRIVE GROUPED, always, and `No grouping` is one group with no label. A
   * `rows` prop beside a `groups` prop would be two shapes for one list and a branch in every
   * consumer; one shape means the ungrouped case is not a special case.
   */
  groups: readonly ListGroup[];
  selectedId: string | null;
  onOpen: (id: string) => void;
  nowMs: number;
  /** §3 · what is next on each query, by query id — built once by the page from the To-do board. */
  coming?: ReadonlyMap<string, ComingUp>;
  packageName?: (id: string) => string | null;
  /** the tray's three. Absent where the page has not wired one yet; the control is then not drawn. */
  onAct?: (id: string, bucket: Exclude<Bucket, "note">) => void;
  onEdit?: (id: string) => void;
  onClose?: (id: string) => void;
  /** v131 (desktop): group headers with spot art, a sticky label row per group, the five-column grid. */
  v131?: boolean;
  /** v131 §4 — the label row sorts through the page's existing Sort state. */
  sort?: QcSort;
  onSort?: (s: QcSort) => void;
}> = ({ groups, selectedId, onOpen, nowMs, coming, packageName, onAct, onEdit, onClose, v131 = false, sort, onSort }) => {
  const rows = groups.flatMap((g) => g.rows);
  const boxRef = useRef<HTMLDivElement>(null);
  /* selection follows the keyboard: when the open query changes while focus is IN the rows, focus
     goes with it (one tab stop, roving). Never steals focus from anywhere else. */
  useEffect(() => {
    const box = boxRef.current;
    if (!box || !selectedId || !box.contains(document.activeElement)) return;
    const el = box.querySelector<HTMLElement>(`[data-id="${CSS.escape(selectedId)}"]`);
    if (el && el !== document.activeElement) { el.focus({ preventScroll: true }); el.scrollIntoView({ block: "nearest" }); }
  }, [selectedId]);
  /**
   * ⚠️ DECLARED ABOVE THE RETURN, which is the house law rather than a preference: a `const` the
   * render reads, declared BELOW it, is a temporal-dead-zone throw that `tsc` cannot see through a
   * helper and that this page has fallen into its error boundary over once already.
   */
  const renderRow = (r: QcRow) => {
    const on = r.id === selectedId;
    const next = coming?.get(r.id) ?? null;
    const sentMs = r.sentMs;
    const ago = sentMs != null ? `${elapsedPhrase(Math.max(0, Math.round((nowMs - sentMs) / DAY)))} ago` : null;
    return (
      <div key={r.id} id={`query-row-${r.id}`} className={`qcv-row${r.withYou ? " qcv-row--you" : ""}`}
        data-qcv="row" data-id={r.id} data-qid={r.id} data-last={r.lastMs} data-status={r.status} data-you={r.withYou ? "true" : "false"}
        role="option" aria-selected={on} tabIndex={on || (!selectedId && r === rows[0]) ? 0 : -1}
        style={{ ["--qcv-state" as string]: `var(--state-${r.state})` }}
        onClick={() => onOpen(r.id)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r.id); } }}>

        {/* the disc, with the status glyph on its bottom-right corner */}
        <span className="qcv-av" data-qcv="row-chip" aria-hidden="true">
          {r.initials}
          <i className={`qcv-av-g qcv-av-g--${glyphOf(r.status)}`} />
        </span>

        <div className="qcv-c qcv-ag" data-qcv="row-agent">
          <b className="qcv-t1" title={r.agentName}>{r.agentName}</b>
          {/* ⚠️ THE "AGO" RIDES HERE AND IS HIDDEN UNTIL THE QUERIED COLUMN FOLDS AWAY (§3). It is
              rendered always and shown by the container query, so the fold moves nothing but a
              `display` — a version that mounted it conditionally would reflow the row at the
              threshold and change its height mid-scroll. */}
          {/* ⚠️ A TITLE ON EVERY WRITER-CHOSEN STRING. An agency is whatever the writer typed, so it
              ellipsises — and `text-overflow` cuts the END, which is the right thing to lose here:
              the agency identifies the row and the "ago" is the Queried column's content carried
              over by the fold. The whole line is in the title either way. */}
          <i className="qcv-t2 qcv-ag-2" title={ago ? `${r.agency} · ${ago}` : r.agency}>{r.agency}{ago && <u className="qcv-ag-ago"> · {ago}</u>}</i>
        </div>

        <div className="qcv-c qcv-qd" data-qcv="row-queried">
          <b className="qcv-t1">{ago ?? "Not dated"}</b>
          <i className="qcv-t2">{sentMs != null ? queriedDate(sentMs, nowMs) : "SEND DATE NOT RECORDED"}</i>
        </div>

        <div className="qcv-c qcv-ws" data-qcv="row-sent"><SentCell row={r} packageName={packageName} /></div>

        <div className="qcv-c qcv-st" data-qcv="row-stand">
          <b className="qcv-t1">{STAGE_NAME[r.status]}</b>
          <i className="qcv-t2" title={factLine(r, nowMs)}>
            {r.withYou && <em className="qcv-ym">YOUR MOVE</em>}
            {standSince(r, nowMs)}
          </i>
        </div>

        {/* ⚠️ THE TRAY IS A SIBLING OF THE COLUMN, ABSOLUTELY PLACED, so showing it changes no
            height and no other column's box — which is QC6's claim made structural rather than
            measured. A tray inside the column would widen it and move every row's grid. */}
        <div className={`qcv-c qcv-nx${next?.over ? " qcv-nx--over" : ""}`} data-qcv="row-next">
          {next && (
            <b className="qcv-t1" data-qcv="row-verb" title={`${next.verb}${next.tail ? ` ${next.tail.lead ? `${next.tail.lead} ` : ""}${next.tail.figure}` : ""}`}>
              {next.verb}
              {next.tail && <>{next.tail.lead ? ` ${next.tail.lead} ` : " "}<em>{next.tail.figure}</em></>}
            </b>
          )}
        </div>
        {/**
          * ⚠️ §3 · THE TRAY IS THE ACTION, EDIT AND CLOSE — AND IT RENDERS ON EVERY ROW. v95 drew
          * the relevant action, Snooze and a ⋯, and only on rows that had something coming up; a
          * row with nothing to do had no tray at all, so a query you simply wanted to correct had
          * to be opened first. Snooze and the ⋯ are gone: §6 says so, and the reference's rendered
          * tray reads `Decide on the offer · Edit · Close`. (Its own annotation prose still
          * describes Snooze and a ⋯ — my harness text, stale; ruled by Nick, 2 Oct.)
          *
          * ⚠️ AND NOTHING HERE IS DESTRUCTIVE IN ONE CLICK. `Close` opens the close journey, which
          * asks; it does not close the query.
          */}
        <span className="qcv-qa" data-qcv="row-tray">
          {next && (
            <button type="button" className="qcv-qa-b qcv-qa-b1" data-qcv="row-act"
              onClick={(e) => { e.stopPropagation(); onAct?.(r.id, next.bucket); }}>{next.action}</button>
          )}
          <button type="button" className="qcv-qa-b qcv-qa-q" data-qcv="row-edit"
            onClick={(e) => { e.stopPropagation(); onEdit?.(r.id); }}
            aria-label={`Edit the query to ${r.agentName}`}>Edit</button>
          <button type="button" className="qcv-qa-b qcv-qa-q" data-qcv="row-close"
            onClick={(e) => { e.stopPropagation(); onClose?.(r.id); }}
            aria-label={`Close the query to ${r.agentName}`}>Close</button>
        </span>
      </div>
    );
  };

  if (v131) {
    const renderRow131 = (r: QcRow, inYourMove: boolean) => {
      const on = r.id === selectedId;
      const next = coming?.get(r.id) ?? null;
      const tone = comingTone(next, r, nowMs);
      const sentMs = r.sentMs;
      const ago = sentMs != null ? `${elapsedPhrase(Math.max(0, Math.round((nowMs - sentMs) / DAY)))} ago` : null;
      const verb = next ? `${next.verb}${next.tail ? `${next.tail.lead ? ` ${next.tail.lead} ` : " "}${next.tail.figure}` : ""}` : "";
      return (
        <div key={r.id} id={`query-row-${r.id}`} className={`qcv-row qc13-rw${r.withYou ? " qcv-row--you" : ""}`}
          data-qcv="row" data-id={r.id} data-qid={r.id} data-last={r.lastMs} data-status={r.status} data-you={r.withYou ? "true" : "false"} data-name={r.agentName}
          role="option" aria-selected={on} tabIndex={on || (!selectedId && r === rows[0]) ? 0 : -1}
          style={{ ["--qcv-state" as string]: `var(--state-${r.state})` }}
          onClick={() => onOpen(r.id)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(r.id); } }}>
          <div className="qc13-c qc13-ag" data-qcv="row-agent">
            <span className="qc13-av" data-qcv="row-chip" aria-hidden="true">{r.initials}</span>
            <span className="qc13-agt">
              <b className="qc13-t1" data-qcv="row-name" title={r.agentName}>{r.agentName}</b>
              <i className="qc13-t2a" title={r.agency}>{r.agency}</i>
            </span>
          </div>
          <div className="qc13-c qc13-qd" data-qcv="row-queried">
            <b className="qc13-t1" data-qcv="row-main">{ago ?? "Not dated"}</b>
            <i className="qc13-dt">{sentMs != null ? queriedDate(sentMs, nowMs) : "SEND DATE NOT RECORDED"}</i>
          </div>
          <div className="qc13-c qc13-ws" data-qcv="row-sent"><span data-qcv="row-main"><SentCell row={r} packageName={packageName} /></span></div>
          <div className="qc13-c qc13-st" data-qcv="row-stand">
            <b className="qc13-st1" data-qcv="row-main">{STAGE_NAME[r.status]}</b>
            <i className="qc13-dt" title={factLine(r, nowMs)}>
              {r.withYou && !inYourMove && <em className="qcv-ym" data-qcv="your-move-tag">YOUR MOVE</em>}
              {standSince(r, nowMs)}
            </i>
          </div>
          <div className="qc13-c qc13-nx" data-qcv="row-next">
            {next && (
              <span className={`qc13-cu qc13-cu--${tone}`} data-qcv="row-verb" data-tone={tone ?? undefined} title={verb}>{verb}</span>
            )}
          </div>
          <span className="qcv-qa" data-qcv="row-tray">
            {next && (
              <button type="button" className="qcv-qa-b qcv-qa-b1" data-qcv="row-act"
                onClick={(e) => { e.stopPropagation(); onAct?.(r.id, next.bucket); }}>{next.action}</button>
            )}
            <button type="button" className="qcv-qa-b qcv-qa-q" data-qcv="row-edit"
              onClick={(e) => { e.stopPropagation(); onEdit?.(r.id); }}
              aria-label={`Edit the query to ${r.agentName}`}>Edit</button>
            <button type="button" className="qcv-qa-b qcv-qa-q" data-qcv="row-close"
              onClick={(e) => { e.stopPropagation(); onClose?.(r.id); }}
              aria-label={`Close the query to ${r.agentName}`}>Close</button>
          </span>
        </div>
      );
    };
    /* the label row's sorting: a column, the existing Sort it drives, and its label (Sent has none) */
    const COLS: { key: string; label: string; sort: QcSort | null }[] = [
      { key: "agent", label: "Agent", sort: "agent" },
      { key: "queried", label: "Queried", sort: "newest" },
      { key: "sent", label: "Sent", sort: null },
      { key: "stand", label: "Where it stands", sort: "activity" },
      { key: "next", label: "Coming up", sort: "reply" },
    ];
    const art = (g: ListGroup): { spot: SpotName; tone: "you" | "agent" | "closed" | "other" } =>
      g.label === "Your move" ? { spot: "group-your-move", tone: "you" }
        : g.label === "Closed" ? { spot: "group-closed", tone: "closed" }
          : g.key === "waiting" || g.key === "quiet" || g.label === "With the agent" ? { spot: "group-with-agent", tone: "agent" }
            : { spot: "group-other", tone: "other" };
    return (
      <div className="qcv-list qc13-list" data-qcv="list" data-v="131" ref={boxRef}>
        {groups.map((g) => {
          const label = g.label || "All queries";
          const a = art(g);
          const yours = label === "Your move";
          return (
            <div key={g.key} className={`qc13-grp qc13-grp--${a.tone}`} data-qcv="grp" data-group={g.key}>
              <div className="qc13-gh" data-qcv="gband" data-group={g.key}>
                <QcArtSlot name={a.spot} size="group" tone={a.tone} />
                <b className="qc13-gh-t">{label}</b>
                <em className="qc13-gh-n" data-qcv="gband-n">{g.rows.length}</em>
              </div>
              <div className="qc13-body" data-qcv="gbody">
                <div className="qc13-colh" data-qcv="colh">
                  {COLS.map((c) => {
                    const on = c.sort != null && sort === c.sort;
                    return c.sort && onSort ? (
                      <button key={c.key} type="button" className={`qc13-cl qc13-cl--${c.key}${on ? " is-on" : ""}`} data-qcv="colh-label" data-col={c.key}
                        aria-pressed={on} onClick={() => onSort(c.sort!)}>
                        {c.label}{on && <i aria-hidden="true"> ↓</i>}
                      </button>
                    ) : (
                      <span key={c.key} className={`qc13-cl qc13-cl--${c.key}`} data-qcv="colh-label" data-col={c.key}>{c.label}</span>
                    );
                  })}
                </div>
                <div role="listbox" aria-label={`${label}: ${g.rows.length} ${g.rows.length === 1 ? "query" : "queries"}`} className="qcv-rows qc13-rows">
                  {g.rows.map((r) => renderRow131(r, yours))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
  <div className="qcv-list" data-qcv="list">
    
    <div ref={boxRef} role="listbox" aria-label="Queries" className="qcv-rows">
      {groups.map((g) => (
        /**
         * ⚠️ A HEADING IS NOT AN OPTION, so it cannot be a bare child of the listbox — a listbox's
         * children are its options, and a div between them is invalid ARIA that silently changes
         * what a screen reader counts. The group is `role="group"` carrying the heading's own words
         * as its accessible name, and the drawn heading is hidden from the tree so it is not read
         * twice.
         *
         * ⚠️ AND AN UNGROUPED LIST GETS NO WRAPPER AT ALL — a group of one, named "", would
         * announce an unnamed grouping around every query on the page.
         */
        g.label ? (
          <div key={g.key} role="group" className="qcv-sect"
            aria-label={`${g.label}: ${g.rows.length} ${g.rows.length === 1 ? "query" : "queries"}${g.hint ? `, ${g.hint}` : ""}`}>
            <div className="qcv-grp" data-qcv="gband" data-group={g.key} aria-hidden="true">
              {g.label}
              <em className="qcv-grp-n" data-qcv="gband-n">{g.rows.length}</em>
              {g.hint && <small className="qcv-grp-h">{g.hint}</small>}
            </div>
            {g.rows.map(renderRow)}
          </div>
        ) : (
          <React.Fragment key={g.key}>{g.rows.map(renderRow)}</React.Fragment>
        )
      ))}
    </div>
  </div>
  );
};

/**
 * Eight placeholder rows at the REAL row height.
 *
 * ⚠️ IT RENDERS THE ROW'S OWN MARKUP, so the ghost's grid IS the loaded grid at every width and at
 * both folds — a hand-built placeholder with its own template agrees with the page at exactly the
 * width it was tuned at, and this list's columns move twice.
 */
/**
 * v131 (desktop) — THE SAME FRAMES AS THE LOADED LIST: one group in the real classes (a 54px header,
 * the 32px label row with its real words, 64px rows on the five-column grid), so nothing moves when
 * the data lands. Every height here is stated by the list's own rules; the bars inside only pulse.
 */
const SK_LABEL = { agent: "Agent", queried: "Queried", sent: "Sent", stand: "Where it stands", next: "Coming up" } as const;
const QcListSkeleton131: React.FC = () => (
  <div className="qcv-list qc13-list" data-qcv="list" data-v="131" aria-hidden="true">
    <div className="qc13-grp qc13-grp--other" data-qcv="sk-grp">
      <div className="qc13-gh" data-qcv="sk-gband">
        <span className="qcv-sk qcv-sk--r" style={{ width: 32, height: 32 }} />
        <span className="qcv-sk qcv-skw" style={{ width: 120, height: 14 }} />
      </div>
      <div className="qc13-body">
        <div className="qc13-colh" data-qcv="sk-colh">
          {(["agent", "queried", "sent", "stand", "next"] as const).map((k) => (
            <span key={k} className={`qc13-cl qc13-cl--${k}`}>{SK_LABEL[k]}</span>
          ))}
        </div>
        <div className="qcv-rows qc13-rows qcv-skw">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="qcv-row qc13-rw qcv-row--sk" data-qcv="sk-row">
              <div className="qc13-c qc13-ag">
                <span className="qcv-sk qcv-sk--r" style={{ width: 32, height: 32 }} />
                <span className="qc13-agt" style={{ flex: 1 }}><span className="qcv-sk" style={{ width: "62%", height: 12 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "44%", height: 10 }} /></span>
              </div>
              <div className="qc13-c qc13-qd"><span className="qcv-sk" style={{ width: "78%", height: 12 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "48%", height: 9 }} /></div>
              <div className="qc13-c qc13-ws"><span className="qcv-sk" style={{ width: 72, height: 20 }} /></div>
              <div className="qc13-c qc13-st"><span className="qcv-sk" style={{ width: "54%", height: 12 }} /><span className="qcv-sk qcv-sk--t" style={{ width: "70%", height: 9 }} /></div>
              <div className="qc13-c qc13-nx">{i % 3 !== 2 && <span className="qcv-sk qcv-sk--p" style={{ width: "58%", height: 20 }} />}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export const QcListSkeleton: React.FC<{ v131?: boolean }> = ({ v131 = false }) => v131 ? <QcListSkeleton131 /> : (
  <div className="qcv-list" aria-hidden="true">
    <div className="qcv-rows qcv-skw">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="qcv-row qcv-row--sk" data-qcv="sk-row">
          <span className="qcv-sk qcv-sk--q" style={{ width: 34, height: 34, borderRadius: "50%" }} />
          <div className="qcv-c qcv-ag"><span className="qcv-sk qcv-t1" style={{ width: "66%" }} /><span className="qcv-sk qcv-sk--t qcv-t2" style={{ width: "46%" }} /></div>
          <div className="qcv-c qcv-qd"><span className="qcv-sk qcv-t1" style={{ width: "80%" }} /><span className="qcv-sk qcv-sk--t qcv-t2" style={{ width: "60%" }} /></div>
          <div className="qcv-c qcv-ws"><span className="qcv-sk" style={{ width: 92, height: 22 }} /></div>
          <div className="qcv-c qcv-st"><span className="qcv-sk qcv-t1" style={{ width: "62%" }} /><span className="qcv-sk qcv-sk--t qcv-t2" style={{ width: "84%" }} /></div>
          <div className="qcv-c qcv-nx"><span className="qcv-sk qcv-t1" style={{ width: "76%" }} /></div>
        </div>
      ))}
    </div>
  </div>
);
