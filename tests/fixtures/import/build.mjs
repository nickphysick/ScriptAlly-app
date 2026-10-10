// Builds the import fixtures. Run from the repo root: node tests/fixtures/import/build.mjs
// The .xlsx files hold their dates as REAL Excel date cells (a serial number with a date format),
// in Excel's default short format (m/d/yy), which is what displays 2 August 2026 as "8/2/26".
import * as XLSX from "xlsx";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const HEAD = ["Agent name", "Agency", "Agent email", "Agency website", "Manuscript", "Status", "Date sent", "Date of last response", "Materials sent", "Response window (weeks)", "Notes"];
const row = (name, agency, status, sent, response = "", notes = "") => [name, agency, "", "", "The Salt Road", status, sent, response, "", "", notes];
const csv = (rows) => rows.map((r) => r.map((v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v))).join(",")).join("\n") + "\n";
const serial = (iso) => { const [y, m, d] = iso.split("-").map(Number); return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000); };
const dateCell = (iso) => ({ t: "n", v: serial(iso), z: "m/d/yy" });

// ── template-iso: five queries, ISO dates ──────────────────────────────────────────────────────
const ISO = [
  row("Clara Voss", "Pemberton Literary", "Queried", "2026-08-02"),
  row("Jamal Carter", "Carter & Vale", "Partial Requested", "2026-03-14", "2026-04-02"),
  row("Marianne Webb", "The Greenhouse", "Full Sent", "2026-01-23", "2026-02-11"),
  row("Tomas Vidal", "The Quill Agency", "Rejected", "2025-11-05", "2025-12-19"),
  row("Gregory Salt", "Penfallow Literary", "Queried", "2026-05-03"),
];
writeFileSync(resolve(here, "template-iso.csv"), csv([HEAD, ...ISO]));

const isoSheet = XLSX.utils.aoa_to_sheet([HEAD, ...ISO]);
ISO.forEach((r, i) => {
  for (const c of [6, 7]) if (r[c]) isoSheet[XLSX.utils.encode_cell({ r: i + 1, c })] = dateCell(r[c]);
});
const isoBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(isoBook, isoSheet, "Your list");
writeFileSync(resolve(here, "template-iso.xlsx"), XLSX.write(isoBook, { type: "buffer", bookType: "xlsx" }));

// ── template-dmy: DD/MM/YYYY; one forced reading, one ambiguous ────────────────────────────────
writeFileSync(resolve(here, "template-dmy.csv"), csv([HEAD,
  row("Clara Voss", "Pemberton Literary", "Queried", "23/04/2026"),
  row("Jamal Carter", "Carter & Vale", "Partial Requested", "03/05/2026", "21/05/2026"),
  row("Marianne Webb", "The Greenhouse", "Full Sent", "14/03/2026", "30/03/2026"),
  row("Tomas Vidal", "The Quill Agency", "Rejected", "25/11/2025", "19/12/2025"),
  row("Gregory Salt", "Penfallow Literary", "Queried", "23/01/2026"),
]));

// ── template-mixed: an unreadable date, a blank date, a nameless row, a named agent with no agency ─
writeFileSync(resolve(here, "template-mixed.csv"), csv([HEAD,
  row("Clara Voss", "Pemberton Literary", "Partial Requested", "sometime in May"),
  row("Jamal Carter", "Carter & Vale", "Full Requested", ""),
  row("", "", "Queried", "2026-02-10", "", "met at the spring fair"),
  row("Owen Hale", "", "Queried", "2026-03-14"),
]));

// ── smart-messy: a writer's own sheet — real date cells, text dates, one bare serial number ────
const MESSY_HEAD = ["Agent", "Agency", "Sent", "Where it's at", "Notes"];
const messy = XLSX.utils.aoa_to_sheet([MESSY_HEAD,
  ["Clara Voss", "Pemberton Literary", "", "queried", ""],
  ["Jamal Carter", "Carter & Vale", "", "partial req", "asked for 50pp"],
  ["Marianne Webb", "The Greenhouse", "14 March 2026", "full sent", ""],
  ["Tomas Vidal", "The Quill Agency", "Aug 2026", "pass", ""],
  ["Gregory Salt", "Penfallow Literary", "2/8/26", "queried", ""],
  ["Owen Hale", "", 46236, "queried", "pasted from an old sheet"],
]);
messy["C2"] = dateCell("2026-08-02");
messy["C3"] = dateCell("2026-03-14");
const messyBook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(messyBook, messy, "Queries");
writeFileSync(resolve(here, "smart-messy.xlsx"), XLSX.write(messyBook, { type: "buffer", bookType: "xlsx" }));
console.log("fixtures written");
