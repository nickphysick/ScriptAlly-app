/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queryMaterialsGap — which sends never recorded what went with them.
 *
 * ⚠️ THE SUBJECT IS A SEND, NOT AN AGENT — AND THAT IS THE WHOLE DIFFERENCE FROM `dq_materials`.
 * The housekeeping rule already in the board asks whether an AGENT has stated what they want
 * ("16 agents are missing a materials list", `HK_RULES.dq_materials` → `agentDataQualityNeeds`).
 * This asks whether a QUERY recorded what the writer actually posted. One is a fact about the
 * agency's guidelines; the other is a fact about your own history, and knowing the first tells you
 * nothing about the second — an agency can ask for three chapters while what you sent is unknown.
 * Two rules, two subjects, two fixes; they are deliberately not merged.
 *
 * ⚠️ WHERE "WHAT WENT" LIVES, AND WHY THIS READS TWO PLACES. `firestore.rules` settled the model
 * on 17 Aug (`1a0c397`): on an activity, `materials` means what went with THAT event, because a
 * query-level `materialsWanted` "had to carry both 'what the agent asks for' and 'what you sent',
 * which is the ambiguity that stopped a sent-flag being added". The activity is therefore the
 * canonical home.
 *
 * ⚠️ BUT NOTHING WRITES THE ACTIVITY FIELD YET — the rule shipped as groundwork, ahead of any
 * consumer. So a predicate reading ONLY the activity would report every query in the app as a gap
 * on the first render, including every query created through the create pane, which DOES record
 * its materials (`queryDraft.draftMaterialsToQuery` → `Query.materialsWanted`). The honest question
 * is "was this recorded ANYWHERE", so the predicate reads the canonical home first and accepts the
 * legacy field as satisfying it. That is exactly the migration the rules commit anticipated, and it
 * means the task appears where it should — on imported and hand-logged history — rather than on
 * everything.
 */
import { ActivityType, type Activity, type Agent, type Query } from "../types";
import { isTerminalStatus } from "./agentList";

/**
 * ⚠️ THREE, AND IT IS NAMED BECAUSE IT IS A JUDGEMENT. Below it the singles are the better page —
 * three rows of a table to fix two queries is more furniture than work. At or above it one bulk
 * task replaces the singles entirely, so the same gap is never both a row and a member of a group
 * (the double-count `boardColumns` already guards against for sweeps).
 */
export const BULK_MATERIALS_THRESHOLD = 3;

/** The events that ARE a send. A nudge or a status change is not one and can carry no materials. */
const SEND_TYPES: ReadonlySet<string> = new Set<string>([
  ActivityType.QUERY_SENT,
  ActivityType.MATERIALS_SENT,
]);

/** An activity may carry `materials` (rules `1a0c397`); the TS type predates the field. */
type ActivityWithMaterials = Activity & { materials?: unknown };

/** Empty, absent, or an empty container — all of them mean "not recorded". */
export function hasRecordedMaterials(v: unknown): boolean {
  if (Array.isArray(v)) return v.length > 0;
  if (v && typeof v === "object") return Object.keys(v as object).length > 0;
  return false;
}

/**
 * Did this query's send record what went with it?
 *
 * ⚠️ ANY send activity carrying materials answers yes. A writer who recorded a full send but not
 * the original query has still told the app something, and raising a task that says "no materials
 * recorded" against a query that visibly lists some would read as a bug in the app rather than a
 * gap in the data.
 */
export function sendMaterialsRecorded(q: Query, activities: readonly Activity[]): boolean {
  const onSend = activities.some(
    (a) => a.queryId === q.id
      && SEND_TYPES.has(a.activityType)
      && hasRecordedMaterials((a as ActivityWithMaterials).materials),
  );
  // The legacy home — see the header. Read second, so the canonical field wins when both exist.
  return onSend || hasRecordedMaterials(q.materialsWanted);
}

export interface MaterialsGap {
  queryId: string;
  agentId: string;
  /** Display name, resolved by the caller through `agentPrimary` — never raw `name`. */
  agentName: string;
  manuscriptId: string;
  manuscriptTitle: string;
  /** ISO — the send this gap is about. Absent-safe: an unsent query is never a gap. */
  dateSent: string;
  sentMs: number;
}

export interface GapInput {
  queries: readonly Query[];
  activities: readonly Activity[];
  agents: readonly Agent[];
  manuscripts: readonly { id: string; title: string }[];
  /** `agentPrimary` — passed in so this stays pure and cannot disagree with the rest of the app. */
  displayName: (a: Agent) => string;
}

/**
 * Every send with nothing recorded, OLDEST FIRST.
 *
 * ⚠️ OLDEST FIRST IS THE ORDER THE WORK WANTS, not newest. The oldest send is the one whose details
 * are furthest out of reach, so it is the one worth asking about while any chance of remembering
 * remains — and it is also the one a writer is most likely to abandon, which is information the
 * order should not hide at the bottom of a table.
 *
 * ⚠️ AN UNSENT QUERY IS NOT A GAP. There is nothing to have recorded, so a task asking what went
 * would be asking about an event that has not happened.
 */
export function queriesMissingMaterials(input: GapInput): MaterialsGap[] {
  const { queries, activities, agents, manuscripts, displayName } = input;
  const out: MaterialsGap[] = [];

  for (const q of queries) {
    if (!q.dateSent) continue;
    /* ⚠️ A CLOSED QUERY NEEDS NOTHING DONE TO IT, so it is not a task. Nineteen chores on a page
       whose premise is "what needs you" is the feature introducing itself as a nag, and the oldest
       of them are the least answerable — a rejection from eight months ago is precisely the send
       whose materials nobody remembers.

       ⚠️ RECOVERABILITY IS PRESERVED ELSEWHERE, NOT BY ASKING. The same recording affordance sits
       on the query's own reading pane, so a writer who wants that history can reach it without
       having been prompted. Widening this later stays clean because nobody will have dismissed
       anything in the meantime.

       ⚠️ `isTerminalStatus`, NOT `queryBucket`. The two disagree about an OFFER: `queryBucket` files
       it under "closed" because no action is owed, which is right for a filter pill and wrong here —
       an offer is a live query, and `TERMINAL_STATUSES` says so in as many words. Reusing the
       nearest-looking derivation instead of the one that answers this question would have quietly
       dropped every offer. */
    if (isTerminalStatus(q.status)) continue;
    const sentMs = new Date(q.dateSent as unknown as string).getTime();
    if (Number.isNaN(sentMs)) continue;
    if (sendMaterialsRecorded(q, activities)) continue;

    const agent = agents.find((a) => a.id === q.agentId);
    const ms = manuscripts.find((m) => m.id === q.manuscriptId);
    if (!agent || !ms) continue; // the engine's own rule: no orphan cards

    out.push({
      queryId: q.id,
      agentId: agent.id,
      agentName: displayName(agent),
      manuscriptId: ms.id,
      manuscriptTitle: ms.title,
      dateSent: String(q.dateSent),
      sentMs,
    });
  }

  return out.sort((a, b) => a.sentMs - b.sentMs);
}

/**
 * The bulk task's `relatedRecordId`. It is not a record — the task stands for a set — but the flag
 * machinery keys suppression on `{taskType, relatedRecordId}`, so it needs a stable one.
 *
 * ⚠️ IT MUST SATISFY `isValidId` (`^[a-zA-Z0-9_-]+$`). A dismissal composes a TaskFlag doc id from
 * this string; the R&R backfill was denied permanently and silently because an id built from
 * display text contained an ampersand. Hyphens only, and nothing derived from a title.
 */
export const MATERIALS_BULK_RECORD_ID = "materials-unrecorded-all";

/** At or above the threshold the singles are replaced by one bulk task. */
export const isBulkMaterialsGap = (n: number): boolean => n >= BULK_MATERIALS_THRESHOLD;

/**
 * ⚠️ THE CAVEAT IS NOT DECORATION — it is the one sentence that stops the fill button lying.
 * "Start from what each agent asks for" fills a row from the AGENCY'S GUIDELINES, which is a
 * statement about what they wanted, never evidence of what was posted. A writer who presses it and
 * saves without reading has recorded a guess as a fact, and nothing downstream can tell the two
 * apart afterwards.
 */
export const MATERIALS_GAP_CAVEAT =
  "These are what each agency asks for — not a record of what you actually sent. Check each row before recording.";

/** The escape hatch's promise, stated once so the button and the task agree about what it does. */
export const MATERIALS_GAP_ESCAPE =
  "Can't remember what went? Leave it unrecorded — the query stays as it is and this task won't come back.";
