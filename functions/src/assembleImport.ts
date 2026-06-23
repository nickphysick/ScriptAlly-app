/**
 * Structured-shape assembly for Smart Import.
 *
 * The model returns MEANING (status, sentDateRaw verbatim, conservative timeline events, its two
 * semantic reason codes). This module turns that proposal into the final per-query shape by running
 * the deterministic parser (parseImportDate) over every raw date and appending the MECHANICAL reason
 * codes the parser owns. A query's reasons are the UNION of the model's semantic codes and the
 * parser's mechanical codes. NO human-readable copy here — copy lives entirely in the client, keyed
 * off the reason code, so wording stays consistent run-to-run and the function output stays tiny.
 *
 * Kept standalone (imports only parseImportDate) so the assembly is unit-testable without pulling in
 * firebase-functions / the Anthropic SDK.
 */
import { parseImportDate } from "./parseImportDate";

/** Reason codes the model is allowed to emit (anything else it invents is dropped). */
const MODEL_REASONS = new Set(["status-direction", "status-wording"]);

export interface TimelineOut { type: string; date: string | null; raw: string | null; }
export interface QueryOut {
  agentRef: string;
  status: unknown;
  sentDate: string | null;
  sentDateRaw: string | null;
  timeline: TimelineOut[];
  reasons: string[];
  notes?: string;
}

const trimOrNull = (v: unknown): string | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
};

/** A bare integer in the Excel-serial band — excluded when building the file's date span so a stray
 *  serial can't widen the range it is itself judged against. */
const isBareSerial = (raw: string | null): boolean => {
  if (!raw || !/^\d+$/.test(raw)) return false;
  const n = Number(raw);
  return n >= 40_000 && n <= 50_000;
};

/**
 * Turn the model's proposal into the final structured shape. Defensive: if `raw` isn't the expected
 * object, it's returned untouched (the client re-validates everything anyway).
 */
export function assembleResult(raw: any): any {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.queries)) return raw;

  // Pass 1 — resolve every non-serial sent date to build the file's date span (the serial-outlier
  // oracle). Serials are excluded so one weird serial can't stretch the span it's measured against.
  const fileDates: string[] = [];
  for (const q of raw.queries) {
    const sr = trimOrNull(q?.sentDateRaw);
    if (sr && !isBareSerial(sr)) {
      const r = parseImportDate(sr);
      if (r.date) fileDates.push(r.date);
    }
  }

  // Pass 2 — assemble each query.
  const queries: QueryOut[] = raw.queries.map((q: any) => {
    const sentDateRaw = trimOrNull(q?.sentDateRaw);
    const sent = parseImportDate(sentDateRaw, fileDates);

    const reasons = new Set<string>();
    // Model's semantic codes (filtered to the allow-list).
    for (const c of Array.isArray(q?.reasons) ? q.reasons : []) {
      if (typeof c === "string" && MODEL_REASONS.has(c)) reasons.add(c);
    }
    // Parser's mechanical code for the sent date (missing-day / serial-outlier / no-date).
    if (sent.reason) reasons.add(sent.reason);

    // Timeline events — parse each note-derived rawDate the same deterministic way, anchored to the
    // query's sent year so a year-less event ("20/3") belongs to the year of the query it follows.
    const timeline: TimelineOut[] = (Array.isArray(q?.timeline) ? q.timeline : [])
      .filter((t: any) => t && typeof t.type === "string" && t.type.trim())
      .map((t: any): TimelineOut => {
        const r = trimOrNull(t.rawDate);
        return { type: String(t.type).trim(), date: r ? parseImportDate(r, fileDates, { anchor: sent.date }).date : null, raw: r };
      });

    // A note-derived event sitting alongside a real sent date is the two-dates case (e.g. Jamal:
    // sent 14 Mar + "requested full 20/3") — the user confirms which is which.
    if (timeline.length && sent.date) reasons.add("two-dates");

    const out: QueryOut = {
      agentRef: q?.agentRef,
      status: q?.status,
      sentDate: sent.date,
      sentDateRaw,
      timeline,
      reasons: Array.from(reasons),
    };
    const notes = trimOrNull(q?.notes);
    if (notes) out.notes = notes;
    return out;
  });

  return { ...raw, queries };
}
