/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v23 — EXPORT THE AGENTS SHOWING, as a spreadsheet: exactly the rows given, in that order. Every cell goes
 * through `csvCell` (formula-neutralised, then quoted): an agent's name, agency and email can arrive through Smart Import
 * from a third party's file. A UTF-8 BOM leads, so a spreadsheet reads the accents.
 */
import type { AgentFacts } from "./contactList";
import { STATUS_LABEL } from "./contactList";
import { countryName } from "./territory";
import { csvCell } from "./csvCell";

export const AGENT_CSV_HEADERS = [
  "Name", "Agency", "Email", "Website", "City", "Country", "Genres", "Wishlist", "Replies in (weeks)", "Open to queries", "Query status", "Date added",
] as const;

const door = (x: AgentFacts) => (x.door === "open" ? "Open" : x.door === "closed" ? "Closed" : "Not known");
const day = (iso: string | undefined) => {
  const t = iso ? Date.parse(iso) : NaN;
  if (!Number.isFinite(t)) return "";
  const d = new Date(t);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

export function agentsCsv(rows: readonly AgentFacts[], genreWord: (raw: string) => string = (g) => g): string {
  const lines = [AGENT_CSV_HEADERS.map((h) => csvCell(h)).join(",")];
  for (const x of rows) {
    const a = x.agent;
    const weeks = typeof a.responseTimeWeeks === "number" && a.responseTimeWeeks > 0 ? String(a.responseTimeWeeks) : "";
    lines.push([
      a.name ?? "", a.agency ?? "", a.email ?? "", a.website ?? "", a.city ?? "", countryName(a.country) ?? "",
      (a.genres ?? []).map(genreWord).join(", "), a.mswlNotes ?? "", weeks, door(x), STATUS_LABEL[x.status14], day(a.dateAdded),
    ].map((v) => csvCell(String(v).trim())).join(","));
  }
  return lines.join("\n") + "\n";
}

/** download it: `QueryHawk_Agents_2026-10-22.csv` */
export function downloadAgentsCsv(rows: readonly AgentFacts[], genreWord?: (raw: string) => string): void {
  const blob = new Blob(["﻿" + agentsCsv(rows, genreWord)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.setAttribute("download", `QueryHawk_Agents_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
