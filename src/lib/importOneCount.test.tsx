/**
 * IF1 · C1 — the summary, the review and the skipped-rows line count the same rows.
 * Red on the baseline: the summary counted the row with no agent and no agency as an agent and a
 * query; the review then set it aside; and the skipped-rows notice never mentioned it.
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

const fx = (name: string) => new Uint8Array(readFileSync(resolve(process.cwd(), "tests/fixtures/import", name)));
const num = (html: string, card: string) => Number(new RegExp(`data-im="${card}"[\\s\\S]*?data-im="total">(\\d+)<`).exec(html)?.[1]);

describe("C1 · one count everywhere, for template-mixed.csv", () => {
  it("summary = the review's live rows; summary + notice = the rows in the file", async () => {
    const parsed = await readTemplateBuffer(fx("template-mixed.csv"));
    expect(parsed.rowsRead, "four rows in the file").toBe(4);

    // the review, as it opens
    const model = parseModel(parsed.result);
    const review = seedUnidentifiedSetAside(model.agents, model.queries);
    const liveAgents = review.agents.filter((a) => !a.deleted).length;
    const liveQueries = review.queries.filter((q) => !q.removed).length;
    expect(review.agents.filter((a) => a.deleted).length, "the nameless row is set aside").toBe(1);
    expect([liveAgents, liveQueries]).toEqual([3, 3]);

    // the summary, as rendered
    const html = renderToStaticMarkup(<ImportOverview result={parsed.result} manuscriptTitle="The Salt Road" fileName="template-mixed.csv" rowCount={parsed.rowsRead} onContinue={() => {}} />);
    expect(num(html, "card-agents"), "the summary's agents").toBe(liveAgents);
    expect(num(html, "card-queries"), "the summary's queries").toBe(liveQueries);

    // …and its sums still hold over the new totals (OB2 S1's rule)
    const key = agentKey(review.agents, review.queries);
    expect(key.live + key.closed + key.none).toBe(liveAgents);
    expect(queryCourts(review.queries).reduce((n, c) => n + c.total, 0)).toBe(liveQueries);
    const t = reviewTallies(review.agents, review.queries);
    expect(t.agents.total).toBe(liveAgents);
    expect(t.queries.total).toBe(liveQueries);

    // the notice, for an import made without touching the set-aside row
    const result = modelToResult(parsed.result, review.agents, review.queries);
    const notice = buildImportNotice(validateSmartImport(result).skipped, { errors: [] }, result.agents, autoSetAsideRows(review.agents, review.queries))!;
    expect(notice, "there is a notice").toBeTruthy();
    expect(notice.rows.map((r) => r.reason)).toEqual([NO_NAME_REASON]);
    expect(notice.rows[0].sentDate?.slice(0, 10), "it is the nameless row").toBe("2026-02-10");
    expect(notice.count).toBe(notice.rows.length);
    expect(`${noticeHeadline(notice.count)} ${noticeWhy(notice)}`).toBe("1 row from your file wasn't imported. It had no agent or agency name.");
    expect(liveQueries + notice.rows.length, "summary total + notice rows = rows in the file").toBe(parsed.rowsRead);
  });

  it("a row the writer names is no longer set aside, and one they remove on purpose is not listed", async () => {
    const parsed = await readTemplateBuffer(fx("template-mixed.csv"));
    const model = parseModel(parsed.result);
    const review = seedUnidentifiedSetAside(model.agents, model.queries);
    const named = review.agents.map((a) => (a.setAsideStage === "unidentified" ? { ...a, deleted: false, setAsideStage: undefined, name: "Ines Marlow" } : a));
    expect(autoSetAsideRows(named, review.queries)).toEqual([]);
    const removedOnPurpose = review.agents.map((a) => (a.name === "Owen Hale" ? { ...a, deleted: true, setAsideStage: "agents" as const } : a));
    expect(autoSetAsideRows(removedOnPurpose, review.queries).length, "only the automatic one").toBe(1);
  });
});
