/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * journeyMaterials — what actually goes at each stage (journeys pack, Phase 3;
 * ref design-refs/todo-workspace-v14.html).
 *
 * ⚠️ A PARTIAL OR A FULL IS PAGES AND NOTHING ELSE. The build this replaces offered
 * `["First pages", "Synopsis", "Covering email"]` on every send — so the writer was invited to
 * re-send a synopsis the agent has held since the original submission. Offering to send what
 * someone already has is not a neutral default: it is the app suggesting work that should not
 * happen, on the surface whose whole job is recording what did.
 *
 * ⚠️ THE SYNOPSIS ROW IS CONDITIONAL AND MUST JUSTIFY ITSELF ON SCREEN. It appears only where the
 * record shows the ORIGINAL SUBMISSION carried none — a portal or pitch route that took no
 * synopsis — and when it appears it states why, inline. When it is absent the step says so once,
 * quietly, so the omission reads as a decision rather than as a missing row.
 *
 * ⚠️ AND THE CONDITION IS STRUCTURAL, NEVER PARSED. `SubmissionPackage.synopsisVersionId` holds
 * `UNFILLED_SLOT` when no synopsis went; `isSlotFilled` is the existing predicate. The alternative
 * — scanning an activity's free-text `details` for the word — is deriving state by reading a
 * display string, which is the fault the record is built to avoid.
 */
import { Bucket } from "./todoBuckets";

/**
 * What the record can say about the original submission's synopsis. ⚠️ THREE STATES, NOT TWO:
 * "we know there was none" and "we cannot tell" are different answers, and only the first earns a
 * row. A query with no package linked is genuinely unknown, and there the row hides.
 */
export type SynopsisState = "held" | "none" | "unknown";

export interface JourneyRow {
  id: string;
  label: string;
  /** The quiet second line — what this is, or why it is being offered. */
  sub?: string;
  /** Pre-ticked where the record already knows it is what goes. */
  on: boolean;
}

export interface JourneyMaterials {
  rows: JourneyRow[];
  /**
   * ⚠️ THE ONE-LINE ACCOUNT OF WHAT IS **NOT** LISTED, and it is absent where nothing needs
   * accounting for. A step that silently omits the query letter and synopsis looks like a step
   * that forgot them.
   */
  note: string | null;
}

/**
 * ⚠️ THE SAMPLE'S NAME COMES FROM THE AGENT'S OWN ASK WHERE THEY MADE ONE. "First fifty pages" is
 * what they wrote; "Partial" is the honest fallback when the record does not carry their words.
 * Never an invented specific — a row reading "First 50 pages" over a request that said three
 * chapters is the app putting words in an agency's mouth.
 */
function sampleLabel(agentMaterials: string[] | undefined): string {
  const asked = (agentMaterials ?? []).find((m) => /page|sample|partial|chapter|word/i.test(m));
  return asked ?? "The partial";
}

const SYNOPSIS_REASON = "queried through a route that took no synopsis, so it has not been seen.";

/**
 * ⚠️ ONE TABLE, READ AT A GLANCE. A new stage is a branch here rather than a fifth condition
 * inside a component, and the shape of every stage is legible together — which is what makes it
 * possible to see that the synopsis was on all of them.
 */
export function journeyMaterials(
  bucket: Bucket,
  taskType: string | undefined,
  synopsis: SynopsisState,
  who: string,
  agentMaterials?: string[],
): JourneyMaterials {
  /* a chase and a close carry no materials at all — nothing is being sent */
  if (bucket === "chase" || bucket === "close" || bucket === "fix" || bucket === "note" || bucket === "decide") {
    return { rows: [], note: null };
  }

  const rows: JourneyRow[] = [];
  if (taskType === "revise_resubmit") {
    /* both pre-ticked: an R&R goes back with the work AND an account of what changed, and a
       resubmission with no note is the one shape an agent asked not to receive */
    rows.push({ id: "revised", label: "The revised manuscript", sub: `what ${who} asked to see again`, on: true });
    rows.push({ id: "changes", label: "A note on what changed", sub: "what you did with their notes", on: true });
  } else if (taskType === "partial_requested") {
    rows.push({ id: "pages", label: sampleLabel(agentMaterials), sub: `what ${who} asked for`, on: true });
  } else {
    rows.push({ id: "full", label: "The manuscript", sub: `what ${who} asked for`, on: true });
  }

  /**
   * ⚠️ THE SYNOPSIS ROW APPEARS ONLY ON A KNOWN ABSENCE, and it is NOT pre-ticked. The record can
   * say the agent has never seen one; it cannot say the writer means to send one now. A ticked row
   * would be the app deciding.
   */
  if (synopsis === "none") {
    rows.push({ id: "synopsis", label: "The synopsis", sub: `${who} ${SYNOPSIS_REASON}`, on: false });
    return { rows, note: null };
  }

  /* held, or unknown — either way it is not offered, and the step says so once */
  return {
    rows,
    note: synopsis === "held"
      ? `${who} already holds your query letter and synopsis from the original submission, so they are not listed.`
      : null,
  };
}

/**
 * The package's own answer, read structurally. ⚠️ NO PACKAGE MEANS UNKNOWN, NOT "none" — a query
 * logged before packages existed has not told us that no synopsis went, only that nothing linked
 * it. Treating silence as an absence would put a synopsis row, and a claim about the agency's
 * submission route, on most historical queries.
 */
export function synopsisStateFor(
  packageId: string | undefined,
  findPackage: (id: string) => { synopsisVersionId?: string } | undefined,
  isFilled: (id: string | null | undefined) => boolean,
): SynopsisState {
  if (!packageId) return "unknown";
  const pkg = findPackage(packageId);
  if (!pkg) return "unknown";
  return isFilled(pkg.synopsisVersionId) ? "held" : "none";
}

/* ── the live summary strip ──────────────────────────────────────────────────────────────────── */

export interface SummaryInput {
  /** The ticked rows' labels, in the order they appear. */
  materials: string[];
  /** The chosen channel, where the journey asks for one. */
  channel?: string;
  /** The chosen date, already formatted ("today", "12 Aug"). */
  when?: string;
  /** The free-text note, trimmed. */
  also?: string;
}

/**
 * ⚠️ IT READS THE LIVE FORM STATE, NEVER THE STRING IT IS ABOUT TO COMPOSE. Assembling the summary
 * from the `details` text would mean the account and the record could disagree the moment the
 * composer changed — and it would be the same parse-a-display-string fault, pointed inward.
 *
 * ⚠️ THE COMMIT BUTTON MUST NEVER BE THE FIRST TIME THE WRITER SEES WHAT IS ABOUT TO BE WRITTEN,
 * which is why this is mandatory rather than a flourish, and why a cleared form says so plainly
 * rather than rendering an empty sentence.
 */
export function journeySummary(input: SummaryInput): string {
  const parts: string[] = [];
  /* ⚠️ EVERY MATERIAL IS LOWERCASED, NOT JUST THE FIRST. Each is a clause in one sentence, so
     "the revised manuscript and A note on what changed" is the shape to avoid — lowercasing only
     the joined string's first character leaves every later item shouting. */
  if (input.materials.length) parts.push(listWords(input.materials.map(lowerFirst)));
  if (input.channel) parts.push(input.channel.toLowerCase());
  /* ⚠️ THE DATE KEEPS ITS CASE. "12 aug" is a date the app has damaged; a month is a proper noun
     and lowercasing the whole sentence uniformly is what damaged it. */
  if (input.when) parts.push(input.when);
  if (!parts.length && !input.also?.trim()) return "Nothing selected yet.";
  if (!parts.length) return "Going on the record: your note.";
  return `Going on the record: ${parts.join(", ")}.`;
}

/** "a, b and c" — an Oxford-less list, because this is a sentence rather than a table. */
function listWords(xs: string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

const lowerFirst = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);
