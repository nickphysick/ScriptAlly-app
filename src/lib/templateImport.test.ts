/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The template parser — local, deterministic, and it must stay that way.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { parseTemplateRows, parseTemplateDate } from "./templateImport";
import { TEMPLATE_HEADERS, TEMPLATE_EXAMPLE_ROW, TEMPLATE_STATUS_VALUES } from "./templateColumns";
import { QueryStatus } from "../types";

/** ⚠️ ROWS ARE KEYED BY THE CONTRACT'S OWN HEADERS, never by hand-typed strings — a literal here
 *  would keep passing the day a heading is renamed, which is the one thing this pair must catch. */
const row = (over: Record<string, string> = {}): Record<string, string> => {
  const base: Record<string, string> = {};
  for (const header of TEMPLATE_HEADERS) base[header] = "";
  return { ...base, ...over };
};

const H = {
  name: TEMPLATE_HEADERS[0],
  agency: TEMPLATE_HEADERS[1],
  status: TEMPLATE_HEADERS[5],
  sent: TEMPLATE_HEADERS[6],
};

describe("the acceptance case: one clean row, three faults, nothing invented", () => {
  const parsed = parseTemplateRows([
    row({ [H.name]: "Margaret Holloway", [H.agency]: "Holloway & Finch", [H.status]: QueryStatus.QUERIED, [H.sent]: "2026-03-14" }),
    row({ [H.name]: "James Okafor", [H.status]: "waiting on him", [H.sent]: "2026-01-09" }),
    row({ [H.name]: "Priya Raman", [H.status]: QueryStatus.QUERIED, [H.sent]: "03/04/2026" }),
    row({ [H.agency]: "Nameless & Co", [H.status]: QueryStatus.QUERIED, [H.sent]: "2026-02-02" }),
  ]);

  it("raises exactly three flags", () => {
    expect(parsed.flags.map((f) => f.reason).sort()).toEqual(
      ["ambiguous-date", "missing-agent-name", "unknown-status"],
    );
  });

  it("reads all four rows rather than dropping the flagged ones", () => {
    expect(parsed.rowsRead).toBe(4);
    expect(parsed.result.queries).toHaveLength(4);
  });

  it("leaves one row clean", () => {
    const clean = parsed.result.queries.filter((q) =>
      !parsed.flags.some((f) => f.row === Number(q.agentRef.slice(1))));
    expect(clean).toHaveLength(1);
    expect(clean[0].status).toBe(QueryStatus.QUERIED);
    expect(clean[0].sentDate).toContain("2026-03-14");
  });

  /**
   * ⚠️ A FLAGGED CELL IS EMPTY, NOT GUESSED. The unknown status must not be mapped by resemblance
   * and the ambiguous date must not be resolved by picking a convention — both are the writer's to
   * settle, and a plausible wrong value is worse than a visible gap.
   */
  it("writes nothing into the cells it flagged", () => {
    const badStatus = parsed.result.queries.find((q) => q.agentRef === "t3");
    expect(badStatus?.status).toBeNull();
    const ambiguous = parsed.result.queries.find((q) => q.agentRef === "t4");
    expect(ambiguous?.sentDate).toBeNull();
  });

  /** The verbatim cell survives, so the review can quote what the writer actually typed. */
  it("keeps the raw cell beside the unparsed date", () => {
    expect(parsed.result.queries.find((q) => q.agentRef === "t4")?.sentDateRaw).toBe("03/04/2026");
  });
});

describe("dates", () => {
  it("reads ISO", () => {
    expect(parseTemplateDate("2026-03-14")).toEqual({ iso: new Date(Date.UTC(2026, 2, 14)).toISOString() });
  });

  /**
   * ⚠️ 03/04/2026 IS NOT DECIDED HERE. Third of April or fourth of March — the cell does not say,
   * and choosing silently moves a real date in a real querying history.
   */
  it("flags a slashed date both readings fit", () => {
    expect(parseTemplateDate("03/04/2026")).toBe("ambiguous");
  });

  it("reads a slashed date only one reading fits, as DD/MM", () => {
    expect(parseTemplateDate("14/03/2026")).toEqual({ iso: new Date(Date.UTC(2026, 2, 14)).toISOString() });
  });

  /** Same number both sides — one date whichever way you read it, so there is nothing to ask. */
  it("does not flag 05/05/2026, which is one date either way", () => {
    expect(parseTemplateDate("05/05/2026")).toEqual({ iso: new Date(Date.UTC(2026, 4, 5)).toISOString() });
  });

  it("refuses a date that is not one", () => {
    expect(parseTemplateDate("last spring")).toBeNull();
    expect(parseTemplateDate("2026-02-30")).toBeNull();
  });

  it("treats a blank as an absence, not a fault", () => {
    expect(parseTemplateDate("   ")).toBeNull();
  });
});

describe("the sheet's own furniture never becomes data", () => {
  it("skips the shipped example row", () => {
    const parsed = parseTemplateRows([TEMPLATE_EXAMPLE_ROW]);
    expect(parsed.rowsRead).toBe(0);
    expect(parsed.result.agents).toEqual([]);
  });

  it("skips a comment row", () => {
    const parsed = parseTemplateRows([row({ [H.name]: "# Status must be one of: …" })]);
    expect(parsed.rowsRead).toBe(0);
  });

  it("skips a wholly empty row", () => {
    expect(parseTemplateRows([row()]).rowsRead).toBe(0);
  });
});

describe("the writer's own sheet is met where it is", () => {
  it("matches a heading with stray case and spacing", () => {
    const parsed = parseTemplateRows([{ "  agent  NAME ": "Margaret Holloway" }]);
    expect(parsed.result.agents[0]?.name).toBe("Margaret Holloway");
  });

  /** An extra column of their own is not an error — it is reported and ignored. */
  it("ignores a column the contract does not know, and says so", () => {
    const parsed = parseTemplateRows([{ [H.name]: "Margaret Holloway", "My own column": "x" }]);
    expect(parsed.ignoredColumns).toEqual(["My own column"]);
    expect(parsed.result.warnings?.[0]).toContain("My own column");
    expect(parsed.result.agents).toHaveLength(1);
  });
});

describe("the status column accepts the app's own labels", () => {
  /** ⚠️ DERIVED FROM THE ENUM, never a hand-written list — the two cannot drift apart. */
  it("accepts every QueryStatus the app defines", () => {
    for (const status of TEMPLATE_STATUS_VALUES) {
      const parsed = parseTemplateRows([row({ [H.name]: "A", [H.status]: status })]);
      expect(parsed.flags).toEqual([]);
      expect(parsed.result.queries[0].status).toBe(status);
    }
  });
});

describe("⚠️ THE PROMISE ON THE PAGE: no API call, no taster spent", () => {
  /**
   * The fork tells the writer in as many words that the template does not use their Smart Import
   * taster. This is that sentence, asserted: the parser cannot reach a Cloud Function, so it cannot
   * spend one. Comments are stripped first — this module's docblock necessarily names the thing it
   * is promising not to do.
   */
  const source = readFileSync(resolve(__dirname, "templateImport.ts"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");

  for (const forbidden of ["firebase/functions", "httpsCallable", "getFunctions", "smartImportMap", "runSmartImport"]) {
    it(`never reaches for ${forbidden}`, () => {
      expect(source).not.toContain(forbidden);
    });
  }

  it("makes no fetch of its own either", () => {
    expect(source).not.toContain("fetch(");
  });
});
