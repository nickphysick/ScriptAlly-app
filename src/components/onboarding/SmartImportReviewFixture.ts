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
  ],
};
