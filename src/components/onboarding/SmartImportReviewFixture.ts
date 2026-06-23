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
