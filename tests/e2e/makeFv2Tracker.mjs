/**
 * Dashboard first visit v2 — the tracker FV2 F1 imports through the template path (parsed in the browser: no model, no
 * entitlement). `n` agents, each named and with NO agency, so every row asks "no agency" on the agents step.
 *
 *   node tests/e2e/makeFv2Tracker.mjs [n=31]   → tests/e2e/fixtures/fv2-tracker-<n>.xlsx
 */
import * as XLSX from "xlsx";
import { mkdirSync } from "node:fs";
const n = Number(process.argv[2] ?? 31);
const rows = Array.from({ length: n }, (_, i) => ({
  "Agent name": `Fv2 Sample ${String(i + 1).padStart(2, "0")}`,
  "Agency": "",
  "Status": "Queried",
  "Date sent": `2026-03-${String((i % 27) + 1).padStart(2, "0")}`,
}));
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), "Queries");
mkdirSync("tests/e2e/fixtures", { recursive: true });
XLSX.writeFile(book, `tests/e2e/fixtures/fv2-tracker-${n}.xlsx`);
console.log(`wrote tests/e2e/fixtures/fv2-tracker-${n}.xlsx (${n} rows)`);
