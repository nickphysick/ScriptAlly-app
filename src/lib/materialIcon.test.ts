/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Material icons v1 — which drawing a stored material item takes. Every MAT_OPTS entry, the agent-side
 * strings buildAgentMaterials writes, the legacy query strings, and the structured QueryMaterial shapes.
 */
import { describe, expect, it } from "vitest";
import { materialIconKind } from "./materialIcon";
import { MAT_OPTS, buildAgentMaterials } from "./agentMaterials";
import { ComponentType, type QueryMaterial } from "../types";

describe("materialIconKind — every MAT_OPTS pill", () => {
  const want: Record<(typeof MAT_OPTS)[number], string | null> = {
    "Query letter": "letter",
    "Author bio": "bio",
    "Synopsis": "synopsis",
    "Sample pages": "pages",
    "Sample chapters": "chapters",
    "Sample words": "words",
    "Full manuscript": null,
    "Other": null,
  };
  it("covers the whole list", () => expect(Object.keys(want).sort()).toEqual([...MAT_OPTS].sort()));
  for (const opt of MAT_OPTS) it(`${opt} → ${want[opt]}`, () => expect(materialIconKind(opt)).toBe(want[opt]));
});

describe("materialIconKind — the strings the agent editor writes", () => {
  it("counted pills, through buildAgentMaterials itself", () => {
    const stored = buildAgentMaterials({
      selected: ["Query letter", "Author bio", "Synopsis", "Sample pages", "Sample chapters", "Sample words", "Full manuscript", "Other"],
      counts: { "Synopsis": "2", "Sample pages": "50", "Sample chapters": "5", "Sample words": "5000" },
      otherText: "Marketing plan",
    });
    expect(stored).toEqual(["Query letter", "Author bio", "Synopsis (2 pages)", "First 50 pages", "First 5 chapters", "5,000 words", "Full manuscript", "Marketing plan"]);
    expect(stored.map(materialIconKind)).toEqual(["letter", "bio", "synopsis", "pages", "chapters", "words", null, null]);
  });
});

describe("materialIconKind — case and legacy spellings", () => {
  it.each([
    ["Query Letter", "letter"],
    ["query letter", "letter"],
    [ComponentType.QUERY_LETTER, "letter"],
    ["AUTHOR BIO", "bio"],
    [ComponentType.SYNOPSIS, "synopsis"],
    ["Synopsis (1 page)", "synopsis"],
    ["First 50 pages", "pages"],
    ["5,000 words", "words"],
    ["Chapters", "chapters"],
    ["Word count", "words"],
    [ComponentType.SAMPLE_PAGES, "pages"],
    ["Sample chapters: 3", "chapters"],
    ["50 pages", "pages"],
    ["Sample", "pages"],
    [ComponentType.FULL_MANUSCRIPT, null],
    ["Full Manuscript", null],
    ["Marketing plan", null],
    ["Two pages of notes", null],
    ["", null],
  ] as const)("%s → %s", (item, kind) => expect(materialIconKind(item)).toBe(kind));
});

describe("materialIconKind — structured QueryMaterial", () => {
  const q = (m: Partial<QueryMaterial> & { material: string }): QueryMaterial => m as QueryMaterial;
  it.each([
    [q({ material: "Sample Pages", type: "pages", quantity: 50 }), "pages"],
    [q({ material: "Sample Pages", type: "chapters", quantity: 3 }), "chapters"],
    [q({ material: "Sample Pages", type: "words", quantity: 5000 }), "words"],
    [q({ material: "Sample Pages", type: "chapters", quantity: 2, from: 7, fromUnit: "chapter" }), "chapters"],
    [q({ material: "Sample Pages" }), "pages"],
    [q({ material: "Query Letter" }), "letter"],
    [q({ material: "Synopsis", type: "pages", quantity: 2 }), "synopsis"],
    [q({ material: "Author bio" }), "bio"],
    [q({ material: "Full Manuscript" }), null],
    [q({ material: "Other", type: "other", quantity: "Marketing plan" }), null],
    [q({ material: "Marketing plan", type: "other" }), null],
  ] as const)("%j → %s", (item, kind) => expect(materialIconKind(item)).toBe(kind));
});
