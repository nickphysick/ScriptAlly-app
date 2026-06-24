/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smart Import — client side of the AI-assisted pipeline import.
 * Parse the uploaded spreadsheet to CSV text (SheetJS handles .xlsx/.csv alike), send it to the
 * smartImportMap Cloud Function (europe-west2; the API key lives only there), and re-validate
 * the proposed mapping before anything is shown for confirmation. Nothing here writes.
 */
import * as XLSX from "xlsx";
import { getFunctions, httpsCallable } from "firebase/functions";
import { QueryStatus } from "../types";
import { SmartImportResult, ParsedQuery } from "../types/smartImport";

/** Caps mirrored from the function so oversize files fail fast, before the network. */
export const MAX_SHEET_CHARS = 200_000;
export const MAX_SHEET_ROWS = 600;

export async function fileToCsv(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_csv(ws); // also handles .csv
}

/** One raw record sampled straight from the uploaded sheet — DISPLAY-ONLY, for the scatter-settle
 *  loader so the writer sees their actual cells the instant they upload, while the real (cloud)
 *  extraction runs. This NEVER feeds runSmartImport / the real mapping; it just reads a few rows.
 *  `messy` is the row's own cells joined as the writer typed them (serial dates, slashed dates,
 *  status scribbles) so the "messy → clean" crystallise lands on something true to the file. */
export interface RawRecordSample { messy: string }
export async function sampleRawRecords(file: File, max = 8): Promise<RawRecordSample[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false, defval: "" });
  if (rows.length < 2) return [];
  return rows.slice(1, 1 + max).map((cells) => {
    const ne = (cells as unknown[]).map((c) => String(c ?? "").trim()).filter(Boolean);
    const joined = ne.slice(0, 5).join("  ·  ");
    return { messy: (joined.length > 74 ? joined.slice(0, 73) + "…" : joined) || "(blank row)" };
  });
}

export async function runSmartImport(file: File): Promise<SmartImportResult> {
  // Dev-only escape hatch: lets the review screen be exercised without a deployed function.
  // Set window.__SA_SMART_IMPORT_MOCK to a SmartImportResult in the console; never set in code.
  const mock = (window as any).__SA_SMART_IMPORT_MOCK as SmartImportResult | undefined;
  if (mock) return mock;

  const sheetText = await fileToCsv(file);
  if (sheetText.length > MAX_SHEET_CHARS || sheetText.split("\n").length > MAX_SHEET_ROWS) {
    throw new Error("too-large");
  }
  const fn = httpsCallable(getFunctions(undefined, "europe-west2"), "smartImportMap");
  const res = await fn({ sheetText });
  return res.data as SmartImportResult;
}

const VALID_STATUSES = new Set<string>(Object.values(QueryStatus));

export interface ValidatedImport {
  result: SmartImportResult;
  /** Queries that will actually be written. */
  importable: ParsedQuery[];
  /** Queries dropped before commit (null/bad status, unknown agentRef, or an unwritable no-name
   *  agent). A missing date never drops a row — it imports provisionally. */
  skipped: { query: ParsedQuery; reason: string }[];
  /** Date-order violations, flagged for the user — never auto-fixed. */
  dateWarnings: string[];
}

/**
 * Client-side validation checklist (defends against a stray model value):
 * drop-and-report rather than silently write.
 */
export function validateSmartImport(result: SmartImportResult): ValidatedImport {
  const agentByRef = new Map((result.agents || []).map((a) => [a.ref, a]));
  const importable: ParsedQuery[] = [];
  const skipped: { query: ParsedQuery; reason: string }[] = [];
  const dateWarnings: string[] = [];

  for (const q of result.queries || []) {
    if (!q.status) {
      skipped.push({ query: q, reason: "No readable status" });
      continue;
    }
    if (!VALID_STATUSES.has(q.status)) {
      skipped.push({ query: q, reason: `Unrecognised status "${q.status}"` });
      continue;
    }
    // A missing query date NEVER drops the row — the query imports with a provisional (date-needed)
    // queried rung, and the user can fill the date later. Status/responses derive from rung type,
    // not dates, so the row reports correctly even undated.
    const agent = agentByRef.get(q.agentRef);
    if (!agent) {
      skipped.push({ query: q, reason: "Row didn't match an agent" });
      continue;
    }
    // Agency is the identity: an agency-only (no-name) agent is writable. Only a row with NEITHER
    // a name nor an agency is unidentifiable — skip it up-front with an honest reason.
    if (!agent.name?.trim() && !agent.agency?.trim()) {
      skipped.push({ query: q, reason: "Row has no agent name or agency to identify it" });
      continue;
    }

    // Date order where present: the sent date (the spine) then each later timeline event, in order.
    const seq = [q.sentDate, ...(q.timeline ?? []).map((t) => t.date)]
      .filter((d): d is string => !!d);
    for (let i = 1; i < seq.length; i++) {
      if (seq[i] < seq[i - 1]) {
        const who = result.agents.find((a) => a.ref === q.agentRef)?.name || q.agentRef;
        dateWarnings.push(`${who}: dates run out of order (${seq[i - 1]} → ${seq[i]}) — kept as given.`);
        break;
      }
    }
    importable.push(q);
  }

  return { result, importable, skipped, dateWarnings };
}
