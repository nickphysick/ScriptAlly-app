/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CONTEXT PANEL — stage 2's right column.
 * Refs: qc-agent-panel-v2.html (sections + the three data states) · qc-focus.html panel option 2
 * (visual weight; where the two differ on chrome, qc-focus wins).
 *
 * ══ ⚠️ IT REPORTS; THE WRITER JUDGES ══════════════════════════════════════════════════════
 *
 * No fit score, no star rating, no match summary, no "good fit" language. A panel that scored
 * the match would be guessing on the writer's behalf from data that is mostly THEIR OWN TYPING —
 * and a confident number derived from a half-filled record is worse than no number.
 *
 * ══ ⚠️ A MISSING THING OMITS ITSELF, ENTIRELY ══════════════════════════════════════════════
 *
 * Not a dash, not an empty label, not a placeholder. "Location: —" is a gap given a heading, and
 * a panel of them reads as a broken feature rather than a thin record. Every derivation here
 * returns null/[] when its data is absent, and the component renders what survives. The three
 * states this produces — rich, partial, name-only — are the refs' acceptance criteria.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { SubmissionStatus, type Agent, type Query } from "../types";
import { queriesForAgent, isTerminalStatus } from "./agentList";
import { materialRowsFromAgent } from "./agentMaterials";
import { shortDate } from "./createSummary";

/**
 * ⚠️ THE WORD-COUNT LINE IS NOT BUILT, and three specs have now asked for it: "their stated
 * range … with the manuscript's count alongside". THE AGENT MODEL HAS NO RANGE — there is no
 * wordCountMin/Max, and `genres` is a list of names, not band data. Reporting only the
 * manuscript's own count would be a line about the writer's book under a heading that promises
 * the agent's preference, which is worse than an absent one. Seeking renders its chips and
 * stops.
 *
 * WHAT IT NEEDS: two optional numeric fields on Agent, their inputs in the Edit Agent drawer,
 * and the firestore.rules allowlist. Nothing else changes — the section is already built to
 * carry the line.
 */
export const WORD_COUNT_BLOCKED =
  "Agent.wordCountMin/Max do not exist — the Seeking word-count line is omitted, not half-answered";

/**
 * ⚠️ THE IDENTITY BLOCK IS GONE (qc-focus.html, panel option 2 — "quiet reference"). It carried
 * a 46px monogram, the agency in Playfair 18 and the agent's name — all three of which already
 * sit in the agent row on the LEFT at twice the size. Repeating them made the panel a second
 * subject competing with the form, when it is meant to be an aside you glance at. What survives
 * is the one thing the left column does not say: whether their door is open.
 *
 * The LOCATION went with it — that block was its only home, and the structure this ref specifies
 * has no row for it. Flagged rather than smuggled into another section.
 */
export interface PanelHeader { status: { label: string; open: boolean } | null }

export function panelHeader(agent: Agent): PanelHeader {
  /* ⚠️ UNKNOWN reads as open app-wide and is not a stated fact — only an explicit value produces
     a pill, so the panel never invents a door state. */
  const status = agent.submissionStatus === SubmissionStatus.CLOSED
    ? { label: "Closed to submissions", open: false }
    : agent.submissionStatus === SubmissionStatus.OPEN
      ? { label: "Open to submissions", open: true }
      : null;
  return { status };
}

/**
 * ⚠️ THE STRIP CARRIES STATISTICS ONLY — two cells, and their captions are the long, honest
 * ones. "Expected response time" and "Preferred submission method" may wrap to two lines; the
 * cells stay equal width and wrap rather than truncating, because an abbreviated caption on a
 * reference panel is the one thing worse than a long one.
 */
export interface StatCell { key: "reply" | "submit"; value: string; unit?: string; caption: string }

/** One ask, with its quantity when the row carries one ("Opening sample" · "5 chapters"). */
export interface AskRow { name: string; qty: string | null }

export interface AgentHistory { open: number; closed: number; lastSent: string; latestId: string | null }

/** Which of the refs' three states this record produces. */
export type PanelState = "rich" | "partial" | "name-only";

/** Up to two cells. Each omits itself; the component omits the strip when none survive. */
export function statCells(agent: Agent): StatCell[] {
  const cells: StatCell[] = [];
  const weeks = agent.responseTimeWeeks;
  if (typeof weeks === "number" && weeks > 0) {
    cells.push({ key: "reply", value: String(weeks), unit: weeks === 1 ? "week" : "weeks", caption: "Expected response time" });
  }
  if (agent.submissionMethod) {
    cells.push({ key: "submit", value: String(agent.submissionMethod), caption: "Preferred submission method" });
  }
  return cells;
}

/**
 * ⚠️ THE NO-REPLY POLICY IS A SENTENCE, NOT A STATISTIC — and it WAS a third stat cell: a value
 * of "Yes" under a caption of "No reply = pass", which states the shape of a fact without
 * stating the fact. It reads properly only as prose. Absent is "not stated", a different thing
 * from "they always reply", so only a recorded `true` produces the line.
 */
export function noReplyPolicy(agent: Agent): string | null {
  if (agent.noResponseMeansNo !== true) return null;
  const weeks = agent.responseTimeWeeks;
  return typeof weeks === "number" && weeks > 0
    ? `No reply after ${weeks} ${weeks === 1 ? "week" : "weeks"} means a pass.`
    : "No reply means a pass.";
}

/** Open/closed queries on file with this agent, and the most recent send. */
export function agentHistory(agentId: string, queries: Query[], now: number = Date.now()): AgentHistory | null {
  const mine = queriesForAgent(agentId, queries);
  if (mine.length === 0) return null;
  const open = mine.filter((q) => !isTerminalStatus(q.status as never)).length;
  const dated = mine.filter((q) => q.dateSent);
  const latest = dated.length ? dated[dated.length - 1] : mine[mine.length - 1];
  return {
    open, closed: mine.length - open,
    lastSent: shortDate(String(latest?.dateSent ?? ""), now),
    latestId: latest?.id ?? null,
  };
}

/** "1 open · 1 closed · last sent 9 Aug", or the first-time line. */
export function historyLine(h: AgentHistory | null): string {
  if (!h) return "No queries yet · this is your first";
  const parts: string[] = [];
  if (h.open) parts.push(`${h.open} open`);
  if (h.closed) parts.push(`${h.closed} closed`);
  const counts = parts.join(" · ") || "none on file";
  return h.lastSent ? `${counts} · last sent ${h.lastSent}` : counts;
}

/** Genre chips — plain, and deliberately not cross-referenced against the manuscript. */
export function seekingChips(agent: Agent): string[] {
  return (agent.genres ?? []).map((g) => (g ?? "").trim()).filter(Boolean);
}

/**
 * What they ask for.
 *
 * ⚠️ THE SAME DERIVATION STEP 2'S CHECKLIST USES (`materialRowsFromAgent`), not a second read of
 * `materialsWanted`. The panel and the checklist state the same fact one column apart, so a
 * writer who saw "Synopsis" here and found it unticked there would have no way to tell which was
 * lying.
 */
export function agentAsks(agent: Agent): AskRow[] {
  return materialRowsFromAgent(agent.materialsWanted ?? [])
    .filter((r) => r.on)
    .map((r) => {
      if (r.key === "sample") {
        const amount = String(r.amount ?? "").trim();
        return { name: r.name, qty: amount ? `${amount} ${String(r.unit).toLowerCase()}` : null };
      }
      if (r.key === "synopsis") {
        const pages = String(r.pages ?? "").trim();
        return { name: r.name, qty: pages ? `${pages} pages` : null };
      }
      return { name: r.name, qty: null };
    });
}

/**
 * ⚠️ THE FRESHNESS STAMP IS MANDATORY WHENEVER WISH-LIST OR GENRE DATA SHOWS. Both go stale
 * silently — an agent closes, a wish list is rewritten — and a writer acting on a two-year-old
 * MSWL because the panel presented it undated is the failure this prevents. `lastCheckedDate` is
 * "when the writer last VERIFIED this", not when they last edited it, which is exactly the
 * question a stamp should answer.
 */
export function freshnessStamp(agent: Agent, now: number = Date.now()): string | null {
  const shown = !!(agent.mswlNotes ?? "").trim() || seekingChips(agent).length > 0;
  if (!shown) return null;
  const d = shortDate(String(agent.lastCheckedDate ?? ""), now);
  return d ? `Updated ${d}` : "Never checked";
}

/**
 * Which of the refs' three states this record produces.
 *
 * ⚠️ COUNT WHAT WAS RECORDED, NOT WHAT RENDERS. `submissionStatus` and `submissionMethod` are
 * required fields with defaults, so EVERY agent — including one created a second ago with just a
 * name — already yields a status pill and a Submit-by cell. Judging by "does anything render"
 * would call every record rich and the name-only state would never appear.
 */
export function panelState(agent: Agent, queries: Query[]): PanelState {
  const recorded = [
    seekingChips(agent).length > 0,
    agentAsks(agent).length > 0,
    !!(agent.mswlNotes ?? "").trim(),
    typeof agent.responseTimeWeeks === "number" && agent.responseTimeWeeks > 0,
    !!noReplyPolicy(agent),
    !!agentHistory(agent.id, queries),
  ].filter(Boolean).length;

  if (recorded === 0) return "name-only";
  return recorded >= 4 ? "rich" : "partial";
}

/** The partial state's closing line — said once, at the foot of what did survive. */
export const PARTIAL_TAIL = "Nothing else recorded for this agent yet.";

/** The name-only state's explanation. It offers the next step rather than reporting a lack. */
export const NAME_ONLY_NOTE =
  "We don't have submission details for this agent yet. You can still log the query — add what they ask for on their contact card any time.";
