import { SmartImportResult } from "../../types/smartImport";
import { QueryStatus } from "../../types";

/** Dev-only fixture for #/import-review preview route. Lands on the Agents screen (no duplicates,
 *  all captured → Continue enabled), then Continue → reaches the Queries screen, which exercises the
 *  new typed reasons: a clean ready row, a two-dates row, a status-direction row, a missing-day row,
 *  a serial-outlier row, a no-date row, and a status-wording row. */
export const REVIEW_FIXTURE: SmartImportResult = {
  agents: [
    { ref: "a1", name: "Clara Voss", agency: "Pemberton Literary" },
    { ref: "a2", name: "Jamal Carter", agency: "Carter & Vale" },
    { ref: "a3", name: "Marianne Webb", agency: "The Greenhouse" },
    { ref: "a4", name: "Tomas Vidal", agency: "The Quill Agency" },
    { ref: "a5", name: "Gregory Salt", agency: "Penhallow Literary" },
    { ref: "a6", name: "", agency: "Westbrook Literary" },
    { ref: "a7", name: "Wren & Co", agency: "Wren & Co" },
    // Onboarding v5 part 2 — rows for the states no fixture reached (§0.3):
    // two named agents with no agency (one to save an agency on, one to carry on without),
    { ref: "a8", name: "Owen Hale", agency: "" },
    { ref: "a9", name: "Ines Marlow", agency: "" },
    // a named agent the mapper flagged (the "mapping" reason),
    { ref: "a10", name: "Rhea Solis", agency: "Solis & Finch", issues: ["agency read from a merged cell"] },
    // a row naming nobody (set aside on entry, with the writer's own note as context),
    { ref: "a11", name: "", agency: "" },
    // and the agent behind the two-reason query.
    { ref: "a12", name: "Dana Whitlock", agency: "Whitlock Agency" },
  ],
  queries: [
    // Clean — ready.
    { agentRef: "a1", status: QueryStatus.QUERIED, sentDate: "2025-11-01", sentDateRaw: "01/11/2025" },
    // Two dates — sent + a note event.
    { agentRef: "a2", status: QueryStatus.FULL_REQUESTED, sentDate: "2024-03-14", sentDateRaw: "14/03/2024",
      timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2024-03-20", raw: "20/3" }], reasons: ["two-dates"],
      notes: "requested full ms 20/3" },
    // Status direction — bare "FULL".
    { agentRef: "a3", status: QueryStatus.FULL_REQUESTED, sentDate: "2024-05-15", sentDateRaw: "15/5/24", reasons: ["status-direction"] },
    // Missing day.
    { agentRef: "a4", status: QueryStatus.NO_RESPONSE, sentDate: null, sentDateRaw: "March 2024", reasons: ["missing-day"] },
    // Serial outlier.
    { agentRef: "a5", status: QueryStatus.NO_RESPONSE, sentDate: "2022-03-01", sentDateRaw: "44621", reasons: ["serial-outlier"] },
    // No date.
    { agentRef: "a6", status: QueryStatus.REJECTED, sentDate: null, sentDateRaw: null, reasons: ["no-date"] },
    // Status wording — mapped but worth confirming.
    { agentRef: "a7", status: QueryStatus.QUERIED, sentDate: "2024-04-18", sentDateRaw: "18/04/2024", reasons: ["status-wording"] },
    { agentRef: "a8", status: QueryStatus.PARTIAL_SENT, sentDate: "2025-02-03", sentDateRaw: "03/02/2025" },
    { agentRef: "a9", status: QueryStatus.OFFER, sentDate: "2025-01-12", sentDateRaw: "12/01/2025" },
    { agentRef: "a10", status: QueryStatus.WITHDRAWN, sentDate: "2024-09-09", sentDateRaw: "09/09/2024" },
    { agentRef: "a11", status: QueryStatus.QUERIED, sentDate: "2024-08-01", sentDateRaw: "01/08/2024", notes: "the one from the conference" },
    // Two reasons on one row.
    { agentRef: "a12", status: QueryStatus.PARTIAL_REQUESTED, sentDate: null, sentDateRaw: null, reasons: ["no-date", "status-wording"] },
  ],
};

/** Dev-only fixture for #/import-review-dupes — lands on the DUPLICATES stage (a 3-way cluster at
 *  "Carter & Vale" + a 2-way at "Beth Books"), so the duplicates background, resolve-bar and
 *  auto-advance pop-up can be reviewed (the main fixture has no clusters). The agency-less Priya pair
 *  (d7/d8 — caps + trailing space, no agency) exercises the part-1 fix: it clusters by name alone. */
export const REVIEW_FIXTURE_DUPES: SmartImportResult = {
  agents: [
    { ref: "d1", name: "Jamal Carter", agency: "Carter & Vale" },
    { ref: "d2", name: "J. Carter", agency: "Carter & Vale Literary" },
    { ref: "d3", name: "Jamal P. Carter", agency: "Carter & Vale" },
    { ref: "d4", name: "Sarah Beth", agency: "Beth Books" },
    { ref: "d5", name: "S. Beth", agency: "Beth Books" },
    { ref: "d6", name: "Tomas Vidal", agency: "The Quill Agency" },
    { ref: "d7", name: "PRIYA RAMAN", agency: "" },
    { ref: "d8", name: "Priya Raman ", agency: "" },
    // Onboarding v5 part 2 — a pair whose two rows are IDENTICAL, so it keeps the plain dedupe
    // control (remove one / keep both) rather than the reconcile card. Without it no fixture reached
    // "kept both" once the three-way set above had been merged down to a pair.
    { ref: "d9", name: "Nora Finch", agency: "Finch & Rowe" },
    { ref: "d10", name: "N. Finch", agency: "Finch & Rowe" },
  ],
  queries: [
    { agentRef: "d1", status: QueryStatus.QUERIED, sentDate: "2024-02-01", sentDateRaw: "01/02/2024" },
    { agentRef: "d2", status: QueryStatus.FULL_REQUESTED, sentDate: "2024-03-10", sentDateRaw: "10/03/2024" },
    { agentRef: "d3", status: QueryStatus.NO_RESPONSE, sentDate: "2024-01-15", sentDateRaw: "15/01/2024" },
    { agentRef: "d4", status: QueryStatus.QUERIED, sentDate: "2024-04-02", sentDateRaw: "02/04/2024" },
    { agentRef: "d5", status: QueryStatus.PARTIAL_REQUESTED, sentDate: "2024-04-20", sentDateRaw: "20/04/2024" },
    { agentRef: "d6", status: QueryStatus.QUERIED, sentDate: "2024-05-06", sentDateRaw: "06/05/2024" },
    // The two Priya rows DIFFER (Partial Requested "50pp"/no-date + Partial Sent 1 May) → the part-2
    // reconcile card collapses them into one query, deriving Partial Sent + harvesting "asked for 50pp".
    { agentRef: "d7", status: QueryStatus.PARTIAL_REQUESTED, sentDate: null, sentDateRaw: null, notes: "asked for 50pp" },
    { agentRef: "d8", status: QueryStatus.PARTIAL_SENT, sentDate: "2024-05-01", sentDateRaw: "01/05/2024" },
    { agentRef: "d9", status: QueryStatus.QUERIED, sentDate: "2024-06-10", sentDateRaw: "10/06/2024" },
    { agentRef: "d10", status: QueryStatus.QUERIED, sentDate: "2024-06-10", sentDateRaw: "10/06/2024" },
  ],
};

/** Onboarding v5 part 2 — a file with nothing to ask: no duplicate, every agent with an agency, no
 *  reason on any query. The summary's "Bring it in" state, and the third fixture lock S1 sums over. */
export const REVIEW_FIXTURE_CLEAR: SmartImportResult = {
  agents: [
    { ref: "c1", name: "Clara Voss", agency: "Pemberton Literary" },
    { ref: "c2", name: "Tomas Vidal", agency: "The Quill Agency" },
    { ref: "c3", name: "Marianne Webb", agency: "The Greenhouse" },
  ],
  queries: [
    { agentRef: "c1", status: QueryStatus.QUERIED, sentDate: "2025-11-01", sentDateRaw: "01/11/2025" },
    { agentRef: "c2", status: QueryStatus.FULL_SENT, sentDate: "2025-10-02", sentDateRaw: "02/10/2025" },
    { agentRef: "c2", status: QueryStatus.REJECTED, sentDate: "2025-06-02", sentDateRaw: "02/06/2025" },
  ],
};

/**
 * Onboarding v9: the gate's fixture. Sixteen agents, two with no agency; sixteen queries, nine of
 * which ask something: two dates that read two ways, two that could not be read, one blank, and
 * four statuses the sheet worded its own way. Seven are ready. No duplicate sets, so the review
 * opens on the agents step.
 */
const GATE_NAMES: [string, string][] = [
  ["Cordelia Vane", "Vane & Hart Lit"], ["Nadia Okafor", "Okafor Literary"], ["Imogen Price", "Price & Partners"],
  ["Leo Marchetti", "Marchetti Lit"], ["Sophie Lindqvist", "Lindqvist Agency"], ["Daniel Achebe", "Achebe & Rowe"],
  ["Kirsten Vale", "The Vale Agency"],
  ["Meredith Quaye", "Quaye Literary"], ["Ruth Castellano", "Castellano Agency"], ["Sean O'Brien", "The Liffey Agency"],
  ["Priyanka", ""], ["Aoife Brennan", "Brennan & Daughters"], ["Rhys Hale", "Hale Agency"], ["", "Harbour & Vale"],
  ["Tom Rafferty", ""], ["Hattie Lowe", "Lowe Literary"],
];
export const REVIEW_FIXTURE_GATE: SmartImportResult = {
  agents: GATE_NAMES.map(([name, agency], i) => ({ ref: `g${i + 1}`, name, agency })),
  queries: [
    { agentRef: "g1", status: QueryStatus.QUERIED, sentDate: "2026-08-12", sentDateRaw: "12/08/2026" },
    { agentRef: "g2", status: QueryStatus.PARTIAL_REQUESTED, sentDate: "2026-09-03", sentDateRaw: "03/09/2026" },
    { agentRef: "g3", status: QueryStatus.QUERIED, sentDate: "2026-08-19", sentDateRaw: "19/08/2026" },
    { agentRef: "g4", status: QueryStatus.PARTIAL_SENT, sentDate: "2026-09-11", sentDateRaw: "11/09/2026" },
    { agentRef: "g5", status: QueryStatus.REJECTED, sentDate: "2026-07-02", sentDateRaw: "02/07/2026" },
    { agentRef: "g6", status: QueryStatus.QUERIED, sentDate: "2026-08-27", sentDateRaw: "27/08/2026" },
    { agentRef: "g7", status: QueryStatus.FULL_REQUESTED, sentDate: "2026-09-15", sentDateRaw: "15/09/2026" },
    // two dates that read two ways
    { agentRef: "g8", status: QueryStatus.QUERIED, sentDate: null, sentDateRaw: "03/05/2026", reasons: ["ambiguous-date"] },
    { agentRef: "g9", status: QueryStatus.QUERIED, sentDate: null, sentDateRaw: "06/08/2026", reasons: ["ambiguous-date"] },
    // two that could not be read
    { agentRef: "g10", status: QueryStatus.QUERIED, sentDate: null, sentDateRaw: "sometime in May", reasons: ["unreadable-date"] },
    { agentRef: "g12", status: QueryStatus.QUERIED, sentDate: null, sentDateRaw: "spring", reasons: ["unreadable-date"] },
    // one blank cell: the parser passed it in silence; the review now asks
    { agentRef: "g11", status: QueryStatus.QUERIED, sentDate: null, sentDateRaw: null },
    // four statuses the sheet worded its own way
    { agentRef: "g13", status: null, statusRaw: "waiting", sentDate: "2026-08-08", sentDateRaw: "08/08/2026", reasons: ["status-wording"] },
    { agentRef: "g14", status: null, statusRaw: "sent partial?", sentDate: "2026-08-21", sentDateRaw: "21/08/2026", reasons: ["status-wording"] },
    { agentRef: "g15", status: null, statusRaw: "no", sentDate: "2026-07-14", sentDateRaw: "14/07/2026", reasons: ["status-wording"] },
    { agentRef: "g16", status: null, statusRaw: "they want more", sentDate: "2026-09-22", sentDateRaw: "22/09/2026", reasons: ["status-wording"] },
  ],
};

/** Onboarding v9: one row with neither an agent nor an agency, beside two ordinary ones. */
export const REVIEW_FIXTURE_NAMELESS: SmartImportResult = {
  agents: [
    { ref: "n1", name: "Clara Voss", agency: "Pemberton Literary" },
    { ref: "n2", name: "", agency: "" },
    { ref: "n3", name: "Jamal Carter", agency: "Carter & Vale" },
  ],
  queries: [
    { agentRef: "n1", status: QueryStatus.QUERIED, sentDate: "2026-03-14", sentDateRaw: "2026-03-14" },
    { agentRef: "n2", status: QueryStatus.QUERIED, sentDate: "2026-02-10", sentDateRaw: "2026-02-10", notes: "met at the spring fair" },
    { agentRef: "n3", status: QueryStatus.FULL_REQUESTED, sentDate: "2026-04-01", sentDateRaw: "2026-04-01" },
  ],
};
