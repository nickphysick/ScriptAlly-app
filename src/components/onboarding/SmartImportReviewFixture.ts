import { SmartImportResult } from "../../types/smartImport";
import { QueryStatus } from "../../types";

/** Dev-only fixture for #/import-review preview route. Lands on the Agents screen (no duplicates,
 *  all captured → Continue enabled), then Continue → reaches the Queries screen, which shows: a
 *  ready row, a beyond-Queried ready row, an "Agency only" row, a low-confidence status-mapping
 *  flag, and a missing-date flag (Full sent with no full-sent date). */
export const REVIEW_FIXTURE: SmartImportResult = {
  columnMapping: {},
  statusTranslations: [],
  warnings: [],
  agents: [
    { ref: "a1", name: "Clara Voss", agency: "Pemberton Literary", confidence: "high" },
    { ref: "a2", name: "Marcus Webb", agency: "Aldous Literary", confidence: "high" },
    { ref: "a3", name: "Sophie Huang", agency: "Quill & Co", confidence: "high" },
    { ref: "a4", name: "James Pryce", agency: "Harlow & Finch", confidence: "high" },
    { ref: "a5", name: "", agency: "Westbrook Literary", confidence: "high" },
    { ref: "a6", name: "Orla Brennan", agency: "Vellum & Vane", confidence: "high" },
  ],
  queries: [
    { agentRef: "a1", dateQueried: "2025-11-01", status: QueryStatus.QUERIED, confidence: "high" },
    { agentRef: "a2", dateQueried: "2025-10-15", partialRequestedDate: "2025-11-20", status: QueryStatus.PARTIAL_REQUESTED, confidence: "high" },
    { agentRef: "a3", dateQueried: "2025-12-01", status: QueryStatus.QUERIED, confidence: "low" },
    { agentRef: "a4", dateQueried: "2025-09-20", status: QueryStatus.FULL_SENT, confidence: "high" },
    { agentRef: "a5", dateQueried: "2025-08-10", closedDate: "2025-09-15", status: QueryStatus.REJECTED, confidence: "high" },
    { agentRef: "a6", dateQueried: "2025-10-30", closedDate: "2025-11-12", status: QueryStatus.REJECTED, confidence: "high" },
  ],
};
