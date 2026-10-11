/**
 * IF1 · D1, D2, D4 — dates are read as written.
 * Built from the real files in tests/fixtures/import. Each case was red on the baseline: the
 * default CSV read turned `2026-08-02` into `8/2/26`, and a date cell was read from its display text.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readTemplateBuffer } from "./templateImport";
import { bufferToCsv, sampleRawFromBuffer } from "./smartImport";

const fx = (name: string) => new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/import", name)));
const day = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : iso);

const SENT = ["2026-08-02", "2026-03-14", "2026-01-23", "2025-11-05", "2026-05-03"];
const RESPONSE = ["2026-04-02", "2026-02-11", "2025-12-19"];

describe("D1 · the template's ISO dates come out as written", () => {
  for (const file of ["template-iso.csv", "template-iso.xlsx"]) {
    it(file, async () => {
      const parsed = await readTemplateBuffer(fx(file));
      expect(parsed.rowsRead, "five rows were read").toBe(5);
      expect(parsed.result.queries.map((q) => day(q.sentDate))).toEqual(SENT);
      expect(parsed.result.queries.map((q) => q.sentDateRaw)).toEqual(SENT);
      expect(parsed.result.queries.flatMap((q) => (q.timeline ?? []).map((t) => day(t.date)))).toEqual(RESPONSE);
      expect(parsed.flags.filter((f) => f.reason === "unreadable-date" || f.reason === "ambiguous-date")).toEqual([]);
    });
  }
});

describe("D1 · a text date reaches the parser exactly as typed", () => {
  it("template-dmy.csv's cells are the writer's own characters", async () => {
    /* ISO text survives a parsing read by a second route (it becomes a date cell, then ISO again).
       Day-first text does not: the default read takes 03/05/2026 as 5 March. This is the case
       that needs the raw read. */
    const parsed = await readTemplateBuffer(fx("template-dmy.csv"));
    expect(parsed.result.queries.map((q) => q.sentDateRaw)).toEqual(["23/04/2026", "03/05/2026", "14/03/2026", "25/11/2025", "23/01/2026"]);
    expect(day(parsed.result.queries[0].sentDate)).toBe("2026-04-23");
    expect(day(parsed.result.queries[2].sentDate)).toBe("2026-03-14");
  });
});

describe("D2 · a real Excel date cell for 2 August 2026 reads as 2026-08-02", () => {
  it("on the template path", async () => {
    const parsed = await readTemplateBuffer(fx("template-iso.xlsx"));
    expect(day(parsed.result.queries[0].sentDate)).toBe("2026-08-02");
    expect(day(parsed.result.queries[0].sentDate)).not.toBe("2026-02-08");
  });
  it("on the Smart Import path", () => {
    const csv = bufferToCsv(fx("smart-messy.xlsx"));
    const clara = csv.split("\n").find((l) => l.startsWith("Clara Voss"))!;
    expect(clara, "the row was found").toBeTruthy();
    expect(clara).toContain("2026-08-02");
    expect(clara).not.toContain("8/2/26");
    expect(clara).not.toContain("2026-02-08");
  });
});

describe("D4 · Smart Import is sent real date cells as ISO and text dates as typed", () => {
  it("fileToCsv's text", () => {
    const lines = bufferToCsv(fx("smart-messy.xlsx")).split("\n");
    const cell = (who: string) => lines.find((l) => l.startsWith(who))!.split(",")[2];
    expect(lines.length, "six rows and a header").toBeGreaterThanOrEqual(7);
    expect(cell("Clara Voss")).toBe("2026-08-02");
    expect(cell("Jamal Carter")).toBe("2026-03-14");
    expect(cell("Marianne Webb")).toBe("14 March 2026");
    expect(cell("Tomas Vidal")).toBe("Aug 2026");
    expect(cell("Gregory Salt")).toBe("2/8/26");
    expect(cell("Owen Hale"), "a bare number stays the number the writer typed").toBe("46236");
  });
  it("a .csv's text dates reach Smart Import unchanged", () => {
    const lines = bufferToCsv(fx("template-iso.csv")).split("\n");
    expect(lines[1].split(",")[6]).toBe("2026-08-02");
    expect(bufferToCsv(fx("template-dmy.csv")).split("\n")[2].split(",")[6]).toBe("03/05/2026");
  });
  it("the loader's sample shows the same cells", () => {
    const sample = sampleRawFromBuffer(fx("smart-messy.xlsx"));
    expect(sample.length).toBe(6);
    expect(sample[0].messy).toContain("2026-08-02");
    expect(sample[4].messy).toContain("2/8/26");
  });
});
