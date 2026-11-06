/**
 * Smart Import v1.2.1, decision 4: a duplicate set's headline names the fuller name from the start —
 * "Two rows for Jonah Petrakis", never "Two rows for Jonah P." — in either row order. Lock FN-6 (the
 * review rendered whole, on its Duplicates step). The page after merging is held by
 * tests/e2e/importFullerName.measure.ts.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { SmartImportResult } from "../../types/smartImport";
import { SmartImportReview } from "./SmartImportReview";
import { REVIEW_FIXTURE_V12 } from "./SmartImportReviewFixture";

const text = (r: SmartImportResult) =>
  renderToStaticMarkup(<SmartImportReview result={r} manuscriptTitle="Book" onBack={() => {}} />)
    .replace(/<!-- -->/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

describe("FN-6 the headline is the fuller name", () => {
  it("short row first (the fixture's own order)", () => {
    const t = text(REVIEW_FIXTURE_V12);
    expect(t).toContain("Two rows for Jonah Petrakis");
    expect(t).not.toContain("Two rows for Jonah P. ");
  });
  it("full row first", () => {
    const agents = [...REVIEW_FIXTURE_V12.agents];
    [agents[0], agents[1]] = [agents[1], agents[0]];
    expect(text({ ...REVIEW_FIXTURE_V12, agents })).toContain("Two rows for Jonah Petrakis");
  });
});
