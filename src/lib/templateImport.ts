/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The ScriptAlly template's parser — deterministic, client-side, and it makes NO network call.
 *
 * ⚠️ NO CLOUD FUNCTION, NO ANTHROPIC CALL, NO TASTER SPENT. That is the whole reason this path
 * exists beside Smart Import: the template's columns are set, so reading it needs no model, and a
 * writer who was willing to fill a sheet in should not have to spend a one-shot entitlement to
 * upload it. The fork says so in as many words, and `templateImport.test.ts` asserts the promise by
 * failing if this module ever imports `firebase/functions`.
 *
 * ⚠️ IT PRODUCES A `SmartImportResult`, AND THAT IS DELIBERATE REUSE, NOT A COINCIDENCE. Everything
 * downstream — duplicate reconciliation, `validateSmartImport`, the review screen, and
 * `commitSmartImport` — already speaks that shape. Forking it would mean two commit paths writing
 * agents and queries, which is exactly the sort of pair that drifts. The adaptation happens here,
 * at the boundary, and nothing after this module knows which path a record arrived by.
 *
 * ⚠️ NOTHING IS GUESSED. An unknown status, an ambiguous date and a missing agent name are FLAGGED
 * for the writer to fix in place — never mapped by resemblance, never silently dropped. A row that
 * is flagged is still a row: it carries what could be read, so correcting one cell is all it takes.
 */

import { QueryStatus } from "../types";
import { SmartImportResult, ParsedAgent, ParsedQuery } from "../types/smartImport";
import {
  TEMPLATE_HEADER_LOOKUP, TEMPLATE_COMMENT_PREFIX, TEMPLATE_STATUS_VALUES,
  isExampleRow, normaliseHeader,
} from "./templateColumns";

/** A cell the writer must correct before the row can be written. */
export interface TemplateFlag {
  /** 1-based row number as the writer sees it in their sheet, header row included. */
  row: number;
  column: string;
  /** What was in the cell — quoted back, never paraphrased. */
  value: string;
  reason: "unknown-status" | "ambiguous-date" | "unreadable-date" | "missing-agent-name" | "bad-number";
  /** One sentence the review screen shows beside the cell. */
  message: string;
}

export interface TemplateParse {
  result: SmartImportResult;
  flags: TemplateFlag[];
  /** Rows read, excluding the header, comment rows and the shipped example. */
  rowsRead: number;
  /** Headings in the sheet that the contract does not know. Ignored, never fatal. */
  ignoredColumns: string[];
}

const VALID_STATUSES = new Set<string>(TEMPLATE_STATUS_VALUES);

const cell = (row: Record<string, unknown>, header: string): string => {
  const v = row[header];
  return v === null || v === undefined ? "" : String(v).trim();
};

/**
 * ⚠️ ISO AND DD/MM/YYYY ONLY, AND AN AMBIGUOUS DATE IS FLAGGED RATHER THAN CHOSEN.
 * `03/04/2026` is the third of April to the writer this app is built for and the fourth of March to
 * an American spreadsheet, and nothing in the cell says which. Picking one silently moves a real
 * date in a real querying history by up to eleven months; asking costs one click.
 *
 * Returns the ISO date, `"ambiguous"` when both readings are possible, or null when unreadable.
 * A blank is not a fault — it returns null with no flag, decided by the caller.
 */
export function parseTemplateDate(raw: string): { iso: string } | "ambiguous" | null {
  const value = raw.trim();
  if (!value) return null;

  // ISO first — unambiguous by construction, which is why the template asks for it.
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (date.getUTCMonth() !== Number(m) - 1 || date.getUTCDate() !== Number(d)) return null;
    return { iso: date.toISOString() };
  }

  const slashed = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value);
  if (slashed) {
    const [, a, b, y] = slashed;
    const first = Number(a);
    const second = Number(b);
    /* Both readable as a month → genuinely ambiguous. Only when the first number cannot be a
       month is the reading forced, and then it is DD/MM by the template's own instruction. */
    if (first <= 12 && second <= 12 && first !== second) return "ambiguous";
    if (first > 31 || second > 12) return null;
    const date = new Date(Date.UTC(Number(y), second - 1, first));
    if (date.getUTCMonth() !== second - 1 || date.getUTCDate() !== first) return null;
    return { iso: date.toISOString() };
  }

  return null;
}

/**
 * Parse the rows of a filled-in template.
 *
 * `rows` are objects keyed by the sheet's own headings — whatever the reader produced. Matching is
 * done here so a heading with stray case or spacing still lands.
 */
export function parseTemplateRows(rows: Record<string, unknown>[]): TemplateParse {
  const flags: TemplateFlag[] = [];
  const agents: ParsedAgent[] = [];
  const queries: ParsedQuery[] = [];
  const ignoredColumns: string[] = [];

  /* Map each sheet heading onto its canonical name once, so every row lookup is by contract name
     and an unknown column is reported exactly once rather than per row. */
  const seenHeadings = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) seenHeadings.add(key);
  }
  const canonical = new Map<string, string>();
  for (const heading of seenHeadings) {
    const match = TEMPLATE_HEADER_LOOKUP.get(normaliseHeader(heading));
    if (match) canonical.set(heading, match);
    else ignoredColumns.push(heading);
  }

  const byContract = (row: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [heading, name] of canonical) out[name] = row[heading];
    return out;
  };

  let rowsRead = 0;

  rows.forEach((raw, i) => {
    // +2: the writer's sheet is 1-based and row 1 is the header.
    const sheetRow = i + 2;
    const row = byContract(raw);

    const name = cell(row, "Agent name");

    // Comment rows and the shipped example are skipped in silence — neither is the writer's data.
    if (name.startsWith(TEMPLATE_COMMENT_PREFIX)) return;
    if (name && isExampleRow(name)) return;

    // A row with nothing in it at all is spacing, not an omission.
    const anything = Object.values(row).some((v) => String(v ?? "").trim().length > 0);
    if (!anything) return;

    rowsRead += 1;

    if (!name) {
      flags.push({
        row: sheetRow, column: "Agent name", value: "", reason: "missing-agent-name",
        message: "This row has no agent name, so there's nothing to file it under.",
      });
    }

    const ref = `t${sheetRow}`;

    const weeksRaw = cell(row, "Response window (weeks)");
    let responseTimeWeeks: number | null = null;
    if (weeksRaw) {
      const n = Number(weeksRaw);
      if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
        flags.push({
          row: sheetRow, column: "Response window (weeks)", value: weeksRaw, reason: "bad-number",
          message: "We need a whole number of weeks here, or nothing at all.",
        });
      } else {
        responseTimeWeeks = n;
      }
    }

    agents.push({
      ref,
      name,
      ...(cell(row, "Agency") ? { agency: cell(row, "Agency") } : {}),
      ...(cell(row, "Agent email") ? { email: cell(row, "Agent email") } : {}),
      ...(cell(row, "Agency website") ? { website: cell(row, "Agency website") } : {}),
      ...(responseTimeWeeks !== null ? { responseTimeWeeks } : {}),
    });

    const statusRaw = cell(row, "Status");
    let status: QueryStatus | null = null;
    if (statusRaw) {
      if (VALID_STATUSES.has(statusRaw)) {
        status = statusRaw as QueryStatus;
      } else {
        flags.push({
          row: sheetRow, column: "Status", value: statusRaw, reason: "unknown-status",
          message: `"${statusRaw}" isn't one of the statuses we track — pick the closest one.`,
        });
      }
    }

    const sentRaw = cell(row, "Date sent");
    const sent = parseTemplateDate(sentRaw);
    let sentDate: string | null = null;
    if (sent === "ambiguous") {
      flags.push({
        row: sheetRow, column: "Date sent", value: sentRaw, reason: "ambiguous-date",
        message: `"${sentRaw}" could be two different dates. Which did you mean?`,
      });
    } else if (sent === null && sentRaw) {
      flags.push({
        row: sheetRow, column: "Date sent", value: sentRaw, reason: "unreadable-date",
        message: `We couldn't read "${sentRaw}" as a date. Try YYYY-MM-DD.`,
      });
    } else if (sent) {
      sentDate = sent.iso;
    }

    /* The response date rides as a timeline event on the query's own status, so the review screen
       and the commit path treat it exactly as they treat a Smart Import one. A response date with
       no status has no event to attach to and is left for the writer rather than invented. */
    const responseRaw = cell(row, "Date of last response");
    const response = parseTemplateDate(responseRaw);
    const timeline: ParsedQuery["timeline"] = [];
    if (response === "ambiguous") {
      flags.push({
        row: sheetRow, column: "Date of last response", value: responseRaw, reason: "ambiguous-date",
        message: `"${responseRaw}" could be two different dates. Which did you mean?`,
      });
    } else if (response === null && responseRaw) {
      flags.push({
        row: sheetRow, column: "Date of last response", value: responseRaw, reason: "unreadable-date",
        message: `We couldn't read "${responseRaw}" as a date. Try YYYY-MM-DD.`,
      });
    } else if (response && status) {
      timeline.push({ type: status, date: response.iso, raw: responseRaw });
    }

    const materials = cell(row, "Materials sent");
    const written = cell(row, "Notes");
    const notes = [materials && `Materials sent: ${materials}`, written].filter(Boolean).join(" — ");

    queries.push({
      agentRef: ref,
      status,
      sentDate,
      sentDateRaw: sentRaw || null,
      ...(timeline.length ? { timeline } : {}),
      ...(notes ? { notes } : {}),
    });
  });

  return {
    result: {
      agents,
      queries,
      ...(ignoredColumns.length
        ? { warnings: [`Ignored ${ignoredColumns.length} column(s) we don't use: ${ignoredColumns.join(", ")}.`] }
        : {}),
    },
    flags,
    rowsRead,
    ignoredColumns,
  };
}

/**
 * Read a filled-in template file. `xlsx` handles both .xlsx and .csv, and it is already a
 * dependency — the same reader `smartImport.ts` uses to turn a sheet into text.
 *
 * ⚠️ THE FIRST SHEET, ALWAYS. The template is one flat list, so a workbook with several tabs is a
 * writer's own file rather than ours; reading whichever tab happened to be active would make the
 * import depend on where they left the cursor.
 */
export async function readTemplateFile(file: File): Promise<TemplateParse> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const book = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
  const first = book.SheetNames[0];
  if (!first) return { result: { agents: [], queries: [] }, flags: [], rowsRead: 0, ignoredColumns: [] };
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[first], {
    // Strings throughout: a date read as a serial number would bypass the ambiguity check that is
    // the entire point of parseTemplateDate.
    raw: false,
    defval: "",
    blankrows: false,
  });
  return parseTemplateRows(rows);
}
