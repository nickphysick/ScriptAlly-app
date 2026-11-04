/**
 * Smart Import from photos v1.1 — one date never shown as two, and a ✗ kept out of the crossed-out
 * answer-all. (Its two-dates card, and that card's "Neither is when I sent it", were retired by the
 * timeline strip: src/components/onboarding/v9/timelineStrip.test.tsx.)
 *
 * Locks: a read whose sent date is also an event's date reaches the review with that date once and
 * the no-date question; the apply-to-all lists only queries whose own code is crossed-out.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../types";
import type { SmartImportResult } from "../../types/smartImport";
import { parseModel, openCrossedOthers, type ReviewQuery } from "../../lib/smartImportReviewModel";
import { QueryQuestion } from "./v9/DeckQuestions";

const noop = () => {};
const html = (n: React.ReactElement) => renderToStaticMarkup(n).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const card = (q: ReviewQuery, extra: Record<string, unknown> = {}) => {
  const code = q.reasons.find((r) => !r.resolved)!.code;
  return html(<QueryQuestion query={q} code={code} onPatch={noop} onResolveReason={noop} {...extra} />);
};
const result = (queries: SmartImportResult["queries"]): SmartImportResult =>
  ({ agents: [{ ref: "a1", name: "Kirsten Vale", agency: "Vale Agency" }, { ref: "a2", name: "Leo Marchetti", agency: "" }, { ref: "a3", name: "Rhys Hale", agency: "Hale Agency" }], queries } as SmartImportResult);
describe("one date is never shown as two events", () => {
  const repeated = parseModel(result([{ agentRef: "a1", status: QueryStatus.FULL_SENT, sentDate: "2026-09-15", sentDateRaw: "15/9",
    timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: "15/9" }, { type: QueryStatus.FULL_SENT, date: "2026-09-22", raw: "22/9" }],
    reasons: ["two-dates"] }])).queries[0];
  it("keeps the date on the event, clears the sent date, and asks with the no-date card", () => {
    expect(repeated.sentDate).toBeNull();
    expect(repeated.sentDateRaw).toBeNull();
    expect(repeated.timeline.map((t) => t.raw)).toEqual(["15/9", "22/9"]);
    expect(repeated.reasons.map((r) => r.code)).toEqual(["no-date"]);
    const h = card(repeated);
    expect(h).toContain('data-reason="no-date"');
    expect(h).not.toContain('data-reason="two-dates"');
    expect((h.match(/15\/9|15 Sept|2026-09-15/g) ?? []).length).toBeLessThanOrEqual(1);
  });
});

describe("a ✗ is not a crossing-out", () => {
  const qs = parseModel(result([
    { agentRef: "a3", status: QueryStatus.REJECTED, sentDate: "2026-08-08", sentDateRaw: "8/8", timeline: [], reasons: ["crossed-out"] },
    { agentRef: "a2", status: QueryStatus.PARTIAL_SENT, sentDate: null, sentDateRaw: null, timeline: [{ type: QueryStatus.PARTIAL_SENT, date: "2026-09-11", raw: "11/9" }], reasons: ["mark-unclear"], markRaw: "✗" },
    { agentRef: "a1", status: QueryStatus.REJECTED, sentDate: "2026-07-14", sentDateRaw: "14/7", timeline: [], reasons: ["crossed-out"] },
  ])).queries;
  it("the answer-all lists only the other queries whose own code is crossed-out", () => {
    const others = openCrossedOthers(qs, qs[0].id).map((q) => q.agentRef);
    expect(others).toEqual(["a1"]);
    expect(others).not.toContain("a2");
  });
});
