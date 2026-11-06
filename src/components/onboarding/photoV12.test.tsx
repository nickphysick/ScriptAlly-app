/**
 * Smart Import from photos v1.2, decision 3 on the review's side: a mark the page's key explains is
 * quoted back with the key's words, its status chosen already; without a key the card is unchanged;
 * and markMeaning never reaches the commit. Locks PH12-4…PH12-6.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../types";
import type { SmartImportResult } from "../../types/smartImport";
import { parseModel, modelToResult, queryReasonText } from "../../lib/smartImportReviewModel";
import { QueryQuestion } from "./v9/DeckQuestions";

const noop = () => {};
const html = (n: React.ReactElement) => renderToStaticMarkup(n).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const result = (extra: Record<string, unknown>) => ({
  agents: [{ ref: "a1", name: "Tom Hale", agency: "Hale & Co" }],
  queries: [{ agentRef: "a1", status: QueryStatus.REJECTED, sentDate: "2026-09-03", sentDateRaw: "3/9", reasons: ["mark-unclear"], markRaw: "✗", lineRaw: "Tom Hale – Hale & Co – 3/9 ✗", ...extra }],
}) as unknown as SmartImportResult;
const card = (r: SmartImportResult) => {
  const q = parseModel(r).queries[0];
  return { q, h: html(<QueryQuestion query={q} code="mark-unclear" onPatch={noop} onResolveReason={noop} agentName="Tom Hale" agentAgency="Hale & Co" />) };
};

describe("PH12-4 a keyed mark: the key's words, and the status chosen", () => {
  it("There's a “✗” after this line, and your key says ✗ means “pass”. Is that right?", () => {
    const { h } = card(result({ markMeaning: "pass" }));
    expect(h.replace(/<[^>]+>/g, "")).toContain("There's a “✗” after this line, and your key says ✗ means “pass”. Is that right?");
    expect(h).toMatch(/class="o9-pick is-on" data-status="Rejected" aria-pressed="true"/);
    expect(h.match(/is-on/g)?.length).toBe(1);
    expect(h.match(/aria-pressed="false"/g)?.length).toBe(9);
  });
  it("the row's own wording says the same", () => {
    const { q } = card(result({ markMeaning: "pass" }));
    expect(queryReasonText("mark-unclear", q)).toBe(`There's a "✗" after this line, and your key says ✗ means "pass". Is that right?`);
  });
});

describe("PH12-5 without a key the card is unchanged", () => {
  it("the old question, nothing chosen", () => {
    const { h } = card(result({}));
    expect(h.replace(/<[^>]+>/g, "")).toContain("Where does this one stand?");
    expect(h).not.toContain("your key says");
    expect(h).not.toContain("is-on");
    expect(h).not.toContain("aria-pressed");
  });
  it("a meaning with no mark beside it is not quoted", () => {
    const r = result({ markMeaning: "pass" }) as unknown as { queries: Record<string, unknown>[] };
    delete r.queries[0].markRaw;
    expect(parseModel(r as unknown as SmartImportResult).queries[0].markMeaning).toBeUndefined();
  });
});

describe("PH12-6 markMeaning is never written on commit", () => {
  it("the review carries it; modelToResult leaves it, and markRaw, behind", () => {
    const r = result({ markMeaning: "pass" });
    const { agents, queries } = parseModel(r);
    expect(queries[0].markMeaning).toBe("pass");
    const out = modelToResult(r, agents, queries);
    expect(JSON.stringify(out)).not.toMatch(/markMeaning|markRaw|"pass"/);
  });
});
