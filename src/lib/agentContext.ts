/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE AGENT CONTEXT PANEL — what is on file about the agent you are querying.
 * (ref design-refs/qc-create-fullscreen.html)
 *
 * ══ ⚠️ IT REPORTS; THE WRITER JUDGES ══════════════════════════════════════════════════════
 *
 * No fit score, no star rating, no match summary, no "good fit" language, and the word-count row
 * states both numbers without an opinion about them. A panel that scored the match would be
 * guessing on the writer's behalf from data that is mostly THEIR OWN TYPING — and a confident
 * number derived from a half-filled record is worse than no number.
 *
 * ══ ⚠️ A MISSING ROW IS OMITTED, NEVER RENDERED EMPTY ══════════════════════════════════════
 *
 * "Location: —" is not information; it is a gap given a label, and a panel of them reads as a
 * broken feature rather than a thin record. Every row here returns null when its data is absent,
 * and the component renders what it is given.
 * ═══════════════════════════════════════════════════════════════════════════════════════════
 */
import { SubmissionStatus, type Agent, type Manuscript, type Query } from "../types";
import { countryName } from "./territory";
import { queriesForAgent, isTerminalStatus } from "./agentList";
import { materialRowsFromAgent } from "./agentMaterials";
import { shortDate } from "./createSummary";

export interface ContextRow {
  key: string;
  label: string;
  value: string;
  /** Only Status carries one — open (sage) or closed (burgundy). */
  dot?: "open" | "closed";
}

/**
 * ⚠️ THE WORD-COUNT ROW IS NOT BUILT, and this is why rather than an oversight: the spec asks for
 * "their stated range … with the manuscript's count alongside", but THE AGENT MODEL HAS NO
 * WORD-COUNT RANGE. There is no wordCountMin/Max, and nothing to derive one from — `genres` is a
 * list of names, not band data. Reporting only the manuscript's own count would be a row about
 * the writer's book filed under a heading that promises the agent's preference, which is worse
 * than an absent row. It arrives free the day the field does; see `agentContextRows`.
 */
export const WORD_COUNT_ROW_BLOCKED =
  "Agent.wordCountMin/Max do not exist — the row is omitted rather than half-answered";

/** How the agent takes submissions. There is no dedicated form-URL field; `website` is the agency page. */
function submitBy(a: Agent): string | null {
  return a.submissionMethod ? String(a.submissionMethod) : null;
}

/** Open/closed queries on file with this agent, and when you last sent one. */
export interface AgentHistory { open: number; closed: number; lastSent: string }

export function agentHistory(agentId: string, queries: Query[], now: number = Date.now()): AgentHistory | null {
  const mine = queriesForAgent(agentId, queries);
  if (mine.length === 0) return null;
  const open = mine.filter((q) => !isTerminalStatus(q.status as never)).length;
  const withDates = mine.filter((q) => q.dateSent);
  const last = withDates.length ? withDates[withDates.length - 1].dateSent : "";
  return { open, closed: mine.length - open, lastSent: shortDate(String(last ?? ""), now) };
}

function historyLine(h: AgentHistory): string {
  const parts: string[] = [];
  if (h.open) parts.push(`${h.open} open`);
  if (h.closed) parts.push(`${h.closed} closed`);
  const counts = parts.join(" · ") || "none on file";
  return h.lastSent ? `${counts} · last sent ${h.lastSent}` : counts;
}

/**
 * The rows, in the ref's order, with every absent one dropped.
 *
 * `manuscript` is accepted so the word-count row can arrive without a signature change the day
 * the agent gains a stated range — see WORD_COUNT_ROW_BLOCKED.
 */
export function agentContextRows(
  agent: Agent,
  queries: Query[],
  _manuscript: Manuscript | null,
  now: number = Date.now(),
): ContextRow[] {
  const rows: ContextRow[] = [];

  /* 1 · Who. An agency record with no named agent is a REAL state (a general submissions
     address), and saying so beats an empty name or the agency's name twice. */
  const name = (agent.name ?? "").trim();
  if (name) rows.push({ key: "agent", label: "Agent", value: name });
  else if ((agent.agency ?? "").trim()) rows.push({ key: "agent", label: "Agent", value: "No named agent — general submissions" });

  const place = [(agent.city ?? "").trim(), (agent.country ? countryName(agent.country) : "") ?? ""].filter(Boolean).join(", ");
  if (place) rows.push({ key: "location", label: "Location", value: place });

  /* ⚠️ UNKNOWN READS AS OPEN, and is not stated as a fact — the app-wide rule (SubmissionStatus
     .UNKNOWN is retired at the UI layer). Only an explicit CLOSED is reported as closed. */
  if (agent.submissionStatus === SubmissionStatus.CLOSED) {
    rows.push({ key: "status", label: "Status", value: "Closed to submissions", dot: "closed" });
  } else if (agent.submissionStatus === SubmissionStatus.OPEN) {
    rows.push({ key: "status", label: "Status", value: "Open to submissions", dot: "open" });
  }

  const genres = (agent.genres ?? []).filter((g) => g && g.trim());
  if (genres.length) rows.push({ key: "seeking", label: "Seeking", value: genres.join(" · ") });

  // 5 · Word count — see WORD_COUNT_ROW_BLOCKED.

  const weeks = agent.responseTimeWeeks;
  if (typeof weeks === "number" && weeks > 0) {
    rows.push({ key: "reply", label: "Typical reply", value: `~${weeks} ${weeks === 1 ? "week" : "weeks"}` });
  }

  /* Absent === not stated, which is a different fact from "they always reply" — so only a
     recorded `true` produces the row that matters (silence is a pass). */
  if (agent.noResponseMeansNo === true) {
    rows.push({
      key: "noreply", label: "No reply means",
      value: typeof weeks === "number" && weeks > 0 ? `a pass after ${weeks} weeks` : "a pass",
    });
  }

  const h = agentHistory(agent.id, queries, now);
  if (h) rows.push({ key: "history", label: "Your history", value: historyLine(h) });

  const how = submitBy(agent);
  if (how) rows.push({ key: "submit", label: "Submit by", value: how });

  return rows;
}

/**
 * What they ask for.
 *
 * ⚠️ THE SAME DERIVATION STEP 2'S CHECKLIST USES (`materialRowsFromAgent`), not a second read of
 * `materialsWanted`. The panel and the checklist state the same fact one column apart, so a
 * writer who saw "Query letter · Synopsis" here and found the synopsis unticked there would have
 * no way to tell which was lying.
 */
export function agentAsks(agent: Agent): string[] {
  return materialRowsFromAgent(agent.materialsWanted ?? [])
    .filter((r) => r.on)
    .map((r) => r.name);
}

/**
 * ⚠️ THE FRESHNESS STAMP IS MANDATORY WHENEVER WISH-LIST OR GENRE DATA SHOWS. Both go stale
 * silently — an agent closes, a wish list is rewritten — and a writer acting on a two-year-old
 * MSWL because the panel presented it without a date is the failure this prevents.
 * `lastCheckedDate` is "when the writer last VERIFIED this", not when they last edited it, which
 * is exactly the question a stamp should answer.
 */
export function freshnessStamp(agent: Agent, now: number = Date.now()): string | null {
  const shown = !!(agent.mswlNotes ?? "").trim() || (agent.genres ?? []).some((g) => g && g.trim());
  if (!shown) return null;
  const d = shortDate(String(agent.lastCheckedDate ?? ""), now);
  return d ? `Updated ${d}` : "Never checked";
}

/**
 * Is there enough on file to be worth a panel? Below this the right column shows an ArtSlot
 * instead — a panel whose every row was omitted is a frame around nothing.
 */
export function hasContext(agent: Agent, queries: Query[]): boolean {
  /* ⚠️ COUNT THE INFORMATIVE ROWS, NOT ALL OF THEM. `submissionStatus` and `submissionMethod`
     are required fields with defaults, so EVERY agent — including one created a second ago with
     just a name — already yields Agent + Status + Submit. A row count would therefore call every
     record "has context" and the ArtSlot would never appear. What matters is whether anything
     was actually recorded ABOUT them. */
  const INFORMATIVE = ["location", "seeking", "reply", "noreply", "history"];
  return agentContextRows(agent, queries, null).some((r) => INFORMATIVE.includes(r.key))
    || !!(agent.mswlNotes ?? "").trim()
    || agentAsks(agent).length > 0;
}
