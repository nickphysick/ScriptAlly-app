/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The model a fanned card is drawn from (v21 §5) — built from a `QcRow` the page already has.
 *
 * ⚠️ IT IS BUILT FROM THE ROW, NOT READ FROM FIRESTORE, AND THAT IS THE POINT. `QueryCardLive`
 * subscribes to a query's activity subcollection to build the same model for ONE card; a hand of
 * sixteen would be sixteen live subscriptions opened by a glance and thrown away by the next
 * click. Every fact §5 asks for is already on the row — the court, the day, the agent, the status,
 * the manuscript, the dated history — so the fan derives rather than fetches.
 *
 * ⚠️ AND IT SHOWS THE LAST TWO STEPS, NOT THE WHOLE STORY (§5). A dealt card is a glance at a 260px
 * strip; the full history is what opening the query is for. Two is the brief's number and it is
 * also all that fits.
 */
import { QueryStatus } from "../types";
import type { QueryCardModel } from "../components/dashboard/QueryCard";
import type { TaskPaneEvent } from "../components/todo/TaskPane";
import { STAGE_NAME, primaryActionLabel, standLine, type QcRow } from "./qcSummary";

/** The three terminal states, named so a tenth status lands on the live side and is visible. */
const CLOSED = [QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE];

const shortDate = (ms: number): string =>
  new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

/**
 * The card's band.
 *
 * ⚠️ DERIVED FROM THE STATUS, NEVER FROM A BALL-HOLDER THAT RETURNS `null` FOR AN OFFER. That is
 * the fault `QueryCardLive` already records in its own words: read as "closed" it put a stone
 * CLOSED band over a live offer at Day 110. An offer is the most alive a query gets.
 */
function courtOfRow(row: QcRow): QueryCardModel["court"] {
  if (row.status === QueryStatus.OFFER) return { label: "An offer", band: "rose" };
  if (CLOSED.includes(row.status)) return { label: "Closed", band: "stone" };
  return row.withYou ? { label: "With you", band: "rose" } : { label: "With the agency", band: "sand" };
}

/**
 * The last two dated steps of the query's history, newest last.
 *
 * ⚠️ AN UNDATED STAGE IS REPORTED UNDATED RATHER THAN PLACED. `stageHistory` already refuses to
 * guess — `spans` holds only what the query document dates — so a card whose current stage has no
 * date simply shows fewer rungs. That is the page's standing rule and the card inherits it rather
 * than inventing a date to fill the row.
 */
function lastTwo(row: QcRow): TaskPaneEvent[] {
  return row.history.spans.slice(-2).map((s): TaskPaneEvent => ({
    kind: "status",
    key: `${row.id}-${s.status}-${s.startMs}`,
    status: s.status,
    t: STAGE_NAME[s.status],
    d: shortDate(s.startMs),
  }));
}

export function fanCardModel(
  row: QcRow,
  manuscriptTitle: string | null,
  onOpenQuery: () => void,
): QueryCardModel {
  return {
    court: courtOfRow(row),
    day: row.dayN != null ? `Day ${row.dayN}` : null,
    agent: { name: row.agentName, agency: row.agency, initials: row.initials },
    status: row.status,
    statusWord: STAGE_NAME[row.status],
    ms: manuscriptTitle ? { title: manuscriptTitle, tags: [] } : null,
    events: lastTwo(row),
    /* the fan draws no tab row, so neither panel is reachable — and an empty array is the honest
       statement of that rather than facts nobody can open */
    agentFacts: [],
    materials: [],
    /* §5's "standing line at the left": the same sentence the Ledger's rows carry */
    window: standLine(row),
    /**
     * ⚠️ DISPLAY-ONLY IN THIS PASS (§5) — the label states what this query's next act WOULD be, and
     * `qcFan.css` makes the button unpressable. It must never change a status in one click; when
     * the centred task flow exists, this is what opens it.
     */
    actionLabel: primaryActionLabel(row.status),
    onOpenQuery,
  };
}
