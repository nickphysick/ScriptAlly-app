/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.1 — the model's new parts (mock v24): "What went" under the review card.
 */
import { describe, expect, it } from "vitest";
import { whatWent, planOf, previewOf, PREVIEW_ID, sod, type LogAnswers, type PlanContext } from "./logStages";
import { SubmissionMethod, SubmissionStatus, type Agent } from "../../types";

const NOW = new Date(2026, 10, 23, 15).getTime();
const harriet = { id: "hv", name: "Harriet Vance", agency: "Vance & Wren", email: "", submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: ["Query Letter", "Synopsis", "First 3 chapters"], responseTimeWeeks: 8, noResponseMeansNo: false } as unknown as Agent;
const ctx: PlanContext = { manuscriptId: "m1", agents: [harriet], packages: [], letters: [{ id: "lb", name: "Letter B" }], synopses: [{ id: "s1", name: "One-page synopsis" }], bookVersions: [] };
const base: LogAnswers = { agentId: "hv", sent: sod(NOW), via: SubmissionMethod.EMAIL, packageId: null, letterId: "lb", synopsisId: "s1",
  sample: { unit: "chapters", amt: 3, bookVersionId: null }, note: "" };
const went = (a: LogAnswers) => previewOf(planOf(a, ctx, PREVIEW_ID, false, NOW)!, NOW, 8).went;

describe("v2.1 · Phase 1 — What went: one item per material, its icon from the item", () => {
  it("three materials: the named versions, then the sample by its size, each with its own icon kind", () => {
    expect(went(base)).toEqual([
      { name: "Letter B", kind: "letter" },
      { name: "One-page synopsis", kind: "synopsis" },
      { name: "First 3 chapters", kind: "chapters" },
    ]);
  });
  it("one material", () => {
    expect(went({ ...base, synopsisId: null, sample: null })).toEqual([{ name: "Letter B", kind: "letter" }]);
  });
  it("generic pieces (nothing named saved) keep the material's own words", () => {
    const w = went({ ...base, letterId: "__letter", synopsisId: "__synopsis", sample: { unit: "pages", amt: 10, bookVersionId: null } });
    expect(w.map((x) => x.kind)).toEqual(["letter", "synopsis", "pages"]);
    expect(w[0].name).not.toBe("Letter B");
    expect(w[2].name).toMatch(/10 pages/);
  });
  it("the kind is never read from the name: a letter version called 'Synopsis draft' is still a letter", () => {
    const c2: PlanContext = { ...ctx, letters: [{ id: "odd", name: "Synopsis draft" }] };
    const plan = planOf({ ...base, letterId: "odd", synopsisId: null, sample: null }, c2, PREVIEW_ID, false, NOW)!;
    expect(whatWent(plan)).toEqual([{ name: "Synopsis draft", kind: "letter" }]);
  });
});
