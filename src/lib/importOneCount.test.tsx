/**
 * IF1 · C1 — the summary, the review and the skipped-rows line count the same rows.
 * Red on the import-fixes baseline: the summary counted the row with no agent and no agency as an
 * agent and a query; the review then set it aside; and the skipped-rows notice never mentioned it.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readTemplateBuffer } from "./templateImport";
import { parseModel, seedUnidentifiedSetAside, modelToResult, autoSetAsideRows, reviewTallies } from "./smartImportReviewModel";
import { agentKey, queryCourts } from "./importSummary";
import { validateSmartImport } from "./smartImport";
import { buildImportNotice, NO_NAME_REASON, noticeHeadline, noticeWhy } from "./importNotice";
import { ImportOverview } from "../components/onboarding/ImportOverview";
import { openAgentQuestions } from "./reviewGate";

const fx = (name: string) => new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/import", name)));
const num = (html: string, card: string) => Number(new RegExp(`data-im="${card}"[\\s\\S]*?data-im="total">(\\d+)<`).exec(html)?.[1]);

/* RE-POINTED (onboarding v9): the row with no agent and no agency is no longer set aside by the
   review. It is asked about, so the summary and the review both count it; it reaches the notice
   only if the writer removes it. The rule C1 holds is unchanged: one count everywhere, and
   written + listed = the rows in the file. */
describe("C1 · one count everywhere, for template-mixed.csv", () => {
  it("summary = the review's live rows, the nameless row among them as a question", async () => {
    const parsed = await readTemplateBuffer(fx("template-mixed.csv"));
    expect(parsed.rowsRead, "four rows in the file").toBe(4);

    // the review, as it opens: nothing is set aside before the writer has been asked
    const review = parseModel(parsed.result);
    const liveAgents = review.agents.filter((a) => !a.deleted).length;
    const liveQueries = review.queries.filter((q) => !q.removed).length;
    expect([liveAgents, liveQueries]).toEqual([4, 4]);
    expect(openAgentQuestions(review.agents).map((q) => q.ask).sort(), "the nameless row and the agent with no agency are asked").toEqual(["nameless", "no-agency"]);

    // the summary, as rendered
    const html = renderToStaticMarkup(<ImportOverview result={parsed.result} manuscriptTitle="The Salt Road" fileName="template-mixed.csv" rowCount={parsed.rowsRead} onContinue={() => {}} />);
    expect(num(html, "card-agents"), "the summary's agents").toBe(liveAgents);
    expect(num(html, "card-queries"), "the summary's queries").toBe(liveQueries);
    expect(html).toContain("4 rows, read and sorted. Nothing is saved yet.");

    // …and its sums still hold over the totals (OB2 S1's rule)
    const key = agentKey(review.agents, review.queries);
    expect(key.live + key.closed + key.none).toBe(liveAgents);
    expect(queryCourts(review.queries).reduce((n, c) => n + c.total, 0)).toBe(liveQueries);
    const t = reviewTallies(review.agents, review.queries);
    expect(t.agents).toMatchObject({ total: 4, sharpen: 2 });
    expect(t.queries.total).toBe(liveQueries);
  });

  it("removed, the row is listed as not imported: written + listed = the rows in the file", async () => {
    const parsed = await readTemplateBuffer(fx("template-mixed.csv"));
    const model = parseModel(parsed.result);
    const nameless = model.agents.find((a) => !a.name && !a.agency)!;
    const review = seedUnidentifiedSetAside(model.agents, model.queries, nameless.id);
    expect(review.agents.filter((a) => a.deleted).map((a) => a.id), "only that row").toEqual([nameless.id]);
    const result = modelToResult(parsed.result, review.agents, review.queries);
    const notice = buildImportNotice(validateSmartImport(result).skipped, { errors: [] }, result.agents, autoSetAsideRows(review.agents, review.queries))!;
    expect(notice, "there is a notice").toBeTruthy();
    expect(notice.rows.map((r) => r.reason)).toEqual([NO_NAME_REASON]);
    expect(notice.rows[0].sentDate?.slice(0, 10), "it is the nameless row").toBe("2026-02-10");
    expect(`${noticeHeadline(notice.count)} ${noticeWhy(notice)}`).toBe("1 row from your file wasn't imported. It had no agent or agency name.");
    expect(result.queries.length + notice.rows.length, "written + listed = the rows in the file").toBe(parsed.rowsRead);
  });

  it("named, the row imports and nothing is listed; a row removed on purpose is not listed either", async () => {
    const parsed = await readTemplateBuffer(fx("template-mixed.csv"));
    const model = parseModel(parsed.result);
    const named = model.agents.map((a) => (!a.name && !a.agency ? { ...a, agency: "Fairground Literary", agencyOnly: true } : a));
    expect(autoSetAsideRows(named, model.queries)).toEqual([]);
    const result = modelToResult(parsed.result, named, model.queries);
    expect(validateSmartImport(result).skipped).toEqual([]);
    expect(result.queries.length).toBe(parsed.rowsRead);
    const removedOnPurpose = model.agents.map((a) => (a.name === "Owen Hale" ? { ...a, deleted: true, setAsideStage: "agents" as const } : a));
    expect(autoSetAsideRows(removedOnPurpose, model.queries), "a row the writer removed from the ready list is their choice, and is not listed").toEqual([]);
  });
});
