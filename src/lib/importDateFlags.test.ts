/**
 * IF1 · D3 — a date that can't be read is asked about.
 * Red on the baseline: the parser's flags were returned to the caller and never rendered, so these
 * rows reached the review with no reason on them and counted as ready.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { readTemplateBuffer } from "./templateImport";
import { parseModel, queryStatusOf, reviewTallies, seedUnidentifiedSetAside, fmtDate, dayOf, queryReasonText } from "./smartImportReviewModel";
import { ambiguousReadings } from "./templateImport";

const fx = (name: string) => new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/import", name)));
const DATE_CODES = ["unreadable-date", "ambiguous-date", "unreadable-response-date", "ambiguous-response-date"];

async function review(file: string) {
  const parsed = await readTemplateBuffer(fx(file));
  const model = parseModel(parsed.result);
  const seeded = seedUnidentifiedSetAside(model.agents, model.queries);
  const dateFlags = parsed.flags.filter((f) => f.reason === "unreadable-date" || f.reason === "ambiguous-date");
  return { parsed, ...seeded, dateFlags };
}
const openDate = (q: { reasons: { code: string; resolved: boolean }[] }) => q.reasons.filter((r) => DATE_CODES.includes(r.code) && !r.resolved);

describe("D3 · every date flag reaches the review as an open reason on its row", () => {
  it("template-mixed.csv: the unreadable date is asked about; the blank date is not", async () => {
    const r = await review("template-mixed.csv");
    expect(r.dateFlags.map((f) => f.value), "the parser flagged one date").toEqual(["sometime in May"]);
    const asked = r.queries.filter((q) => openDate(q).length > 0);
    expect(asked.length, "one open date reason per flag").toBe(r.dateFlags.length);
    expect(asked[0].sentDateRaw).toBe("sometime in May");
    expect(openDate(asked[0]).map((x) => x.code)).toEqual(["unreadable-date"]);
    expect(queryStatusOf(asked[0]), "the row is not Ready").toBe("needs-check");
    const blank = r.queries.find((q) => q.sentDateRaw === null && !q.removed)!;
    expect(blank, "the blank-date row is there").toBeTruthy();
    expect(openDate(blank), "a blank date is not a fault").toEqual([]);
    expect(reviewTallies(r.agents, r.queries).queries.sharpen, "the head chip counts it").toBe(1);
  });

  it("template-dmy.csv: 03/05/2026 is asked about; 23/04/2026 reads without a question", async () => {
    const r = await review("template-dmy.csv");
    expect(r.dateFlags.map((f) => f.value)).toEqual(["03/05/2026"]);
    const byRaw = (raw: string) => r.queries.find((q) => q.sentDateRaw === raw)!;
    expect(openDate(byRaw("03/05/2026")).map((x) => x.code)).toEqual(["ambiguous-date"]);
    expect(queryStatusOf(byRaw("03/05/2026"))).toBe("needs-check");
    expect(byRaw("03/05/2026").sentDate, "neither reading is chosen for the writer").toBeNull();
    expect(byRaw("23/04/2026").sentDate?.slice(0, 10)).toBe("2026-04-23");
    expect(openDate(byRaw("23/04/2026"))).toEqual([]);
    expect(queryStatusOf(byRaw("23/04/2026"))).toBe("captured");
    expect(reviewTallies(r.agents, r.queries).queries.sharpen).toBe(1);
    expect(r.queries.filter((q) => q.sentDate).length, "the other four dates were read").toBe(4);
  });
});

describe("D3 · the review shows a template date as a date, and asks in the cell's own words", () => {
  it("a date read from the template prints as a day, not a raw timestamp", async () => {
    const r = await review("template-mixed.csv");
    const owen = r.queries.find((q) => q.sentDate && !q.removed)!;
    expect(owen.sentDate, "the parser gives a full timestamp").toMatch(/T00:00:00/);
    expect(fmtDate(owen.sentDate)).toBe("14 Mar 2026");
    expect(dayOf(owen.sentDate), "a date field can show it").toBe("2026-03-14");
    expect(fmtDate("2026-03-14")).toBe("14 Mar 2026");
  });
  it("the two questions quote the cell, and the ambiguous one offers both readings", async () => {
    const mixed = await review("template-mixed.csv");
    const dmy = await review("template-dmy.csv");
    expect(queryReasonText("unreadable-date", mixed.queries[0])).toBe(`We couldn't read "sometime in May" as a date. When did you send the query?`);
    const amb = dmy.queries.find((q) => q.sentDateRaw === "03/05/2026")!;
    expect(queryReasonText("ambiguous-date", amb)).toBe(`"03/05/2026" could be two different dates. Which did you mean?`);
    expect(ambiguousReadings("03/05/2026").map(fmtDate)).toEqual(["3 May 2026", "5 Mar 2026"]);
    expect(ambiguousReadings("23/04/2026")).toEqual([]);
  });
});
