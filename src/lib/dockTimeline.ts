/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * dockTimeline — "the story so far", built once from a query's own activity subcollection.
 *
 * ⚠️ EXTRACTED FROM `useTaskPaneSession`, UNCHANGED, BECAUSE A SECOND SURFACE NOW DRAWS IT. The task
 * pane's reference rail has always shown this list; the dashboard's query peek shows the same list
 * beside a feed entry. Two derivations of one history is how two surfaces come to disagree about
 * what happened to a query — and the disagreement would be invisible, because each would be
 * internally consistent.
 *
 * ⚠️ IT IS PURE AND IT TAKES THE ROWS. Reading the subcollection is the caller's job (`useDockActivity`);
 * what this does is decide which rows are real, which are duplicates, what each one is called and
 * how it is dated. Those four decisions are the ones that must not be made twice.
 */
import { dropSupersededProvisional } from "./queryDerivation";
import { activityEventLabel } from "./activityEvent";
import { collapseTimelineDuplicates } from "./todoDock";
import type { DockTimelineEvent } from "../components/todo/timelineEvent";

/**
 * ⚠️ `createdAt` IS A FIRESTORE TIMESTAMP ON THESE ROWS, not the ISO string the global feed carries —
 * reading it as a string yields "Invalid Date" rather than an error, which is a date nobody can trace
 * back to its cause.
 */
const msOf = (raw: any): number =>
  raw?.toMillis ? raw.toMillis() : raw?.seconds ? raw.seconds * 1000 : Date.parse(String(raw ?? ""));

const dayKeyOf = (raw: any): string => {
  const ms = msOf(raw);
  return Number.isFinite(ms) ? new Date(ms).toISOString().slice(0, 10) : "";
};

export interface DockTimelineOpts {
  /**
   * The query's own send method, used only where a row does not state its channel.
   *
   * ⚠️ A FALLBACK, NEVER AN INFERENCE ABOUT THE ROW. The query says how it went out; a row that says
   * nothing is shown the query's channel rather than left bare, and a row that says something keeps
   * its own word.
   */
  sendMethod?: string;
}

export function dockTimeline(
  rows: readonly any[],
  opts: DockTimelineOpts = {},
): DockTimelineEvent[] {
  /* ⚠️ THE SUPERSEDED PROVISIONAL RUNG IS DROPPED BEFORE ANYTHING ELSE. This surface is where the
     duplicate was SEEN: without it an import's `OFFER` rung and the writer's later real one both
     drew, one above the other, the first reading "(imported — date needed)". Same predicate as the
     derivation and the Query Centre, so the three cannot come to differ about which rung is real. */
  const live = dropSupersededProvisional(rows as any[], (r: any) => ({
    status: r.resultingStatus ?? r.type,
    provisional: r.dateProvisional === true,
  }));
  /* ⚠️ AND THEN THE SAME-DAY PAIR. The step above handles an import rung superseded by a RECORDED
     one; it leaves a pair that is both provisional (or both real) exactly as it found it, which is
     the `Partial requested · via email` twice on one date. Keyed on (status, DAY), so a re-request
     on a different day survives — that is a real thing an agency does. Display only: both documents
     are still in Firestore. */
  const once = collapseTimelineDuplicates(live as any[], (r: any) => ({
    status: r.resultingStatus ?? r.type,
    day: dayKeyOf(r.createdAt ?? r.date),
    provisional: r.dateProvisional === true,
  }));
  return once
    /* ⚠️ `includeSend` — NEITHER OF THESE SURFACES DRAWS A HERO ROW ABOVE THE LIST. The Query Centre
       suppresses the send because it does; without this the query going out was dropped and a
       full-requested card showed a single rung with no beginning. */
    .map((r: any, i: number) => ({
      r, i,
      label: activityEventLabel(r as { activityType?: unknown; resultingStatus?: unknown }, { includeSend: true }),
    }))
    .filter((x) => x.label !== null)
    .map((x) => {
      const ms = msOf(x.r.createdAt ?? x.r.date);
      return {
        key: x.r.id ?? `ev-${x.i}`,
        label: x.label as string,
        when: Number.isFinite(ms) ? new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "",
        /* absent where the record is silent — never inferred */
        ...(x.r.via
          ? { via: String(x.r.via) }
          : opts.sendMethod ? { via: `via ${String(opts.sendMethod).toLowerCase()}` } : {}),
        /* ⚠️ A PROVISIONAL RUNG SHOWS THE EVENT AND NOTHING ELSE. The import writes its own
           bookkeeping into `note` — "Full Requested (imported — date needed)" — and the card
           rendered it as the agent's words. It is a message from the importer to itself.
           ⚠️ KEYED ON THE STORED FLAG, NEVER ON THE STRING. Matching "(imported" would be deriving
           state by reading a display string, which is the fault the whole record is built to avoid;
           `dateProvisional` is a real field and says exactly this.
           ⚠️ AND IT SUPPRESSES THE WHOLE SUB-LINE, not just the parenthetical — a provisional rung's
           note is import-written by construction, and trimming the brackets off would leave "Full
           Requested" restating the label above it. */
        ...(x.r.note && x.r.dateProvisional !== true ? { note: String(x.r.note) } : {}),
        /* ⚠️ THE STATUS ITSELF, HANDED TO THE REAL `StatusDot`. `StatusDot` is the app's one drawing
           of a query status and is never recreated locally; anything less than the status itself
           throws away what the glyph is for. `resultingStatus ?? type` is the same pair
           `subcollectionDocToDerivable` reads, so the dot and the derivation agree about which field
           carries the status.
           ⚠️ A NUDGE HAS NO STATUS AND TAKES NO DOT — `NUDGE_SENT` is not a status change. */
        ...((st: unknown) => (st ? { status: String(st) } : {}))(x.r.resultingStatus ?? x.r.type),
      } as DockTimelineEvent;
    });
  /* ⚠️ EVERY ENTRY, OLDEST FIRST — there is no cap. It was `.slice(-6)`, which silently dropped the
     OLDEST rungs, so a long history lost its beginning: precisely the end a reader is looking for
     when they open the record. Both readers scroll. */
}
