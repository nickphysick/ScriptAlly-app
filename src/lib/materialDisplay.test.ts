/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DISPLAY / STORAGE SEPARATION for material names.
 *
 * ⚠️ THE WHOLE POINT IS THAT TWO STRINGS STAY DIFFERENT. `"Query letter"` is a STORED value —
 * `MAT_OPTS[0]`, `ComponentType.QUERY_LETTER`, and a literal inside every seeded agent and every
 * existing Firestore document. `"Covering letter"` is what a reader sees. Renaming the token would
 * be a data migration through `packageMetrics` and the component-type enum; this is not that, and
 * these tests exist to make sure it never quietly becomes that.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { materialLabel, materialToken, formatQueryMaterial } from "./materials";
import {
  MAT_OPTS, MATERIAL_ROW_NAMES, buildAgentMaterials, parseAgentMaterials,
  materialRowsFromAgent, materialsWantedFromRows, emptyMaterials,
} from "./agentMaterials";
import { ComponentType } from "../types";

describe("the map", () => {
  it("returns UK display copy for the covering letter, in either stored casing", () => {
    expect(materialLabel("Query letter")).toBe("Covering letter");
    expect(materialLabel("Query Letter")).toBe("Covering letter");
    expect(materialLabel("query letter")).toBe("Covering letter");
  });

  it("⚠️ BOTH CASINGS MATTER — the corpus really holds both", () => {
    // the agent editor writes one, the ComponentType enum and the seeds write the other
    expect(MAT_OPTS[0]).toBe("Query letter");
    expect(ComponentType.QUERY_LETTER).toBe("Query Letter");
    expect(materialLabel(MAT_OPTS[0])).toBe(materialLabel(ComponentType.QUERY_LETTER));
  });

  it("passes unknown tokens through untouched — the writer's own words are not rewritten", () => {
    expect(materialLabel("A one-page pitch in the email body")).toBe("A one-page pitch in the email body");
    expect(materialLabel("Synopsis")).toBe("Synopsis");
    expect(materialLabel("")).toBe("");
  });

  it("`materialToken` is the opposite job and does NOT map", () => {
    expect(materialToken("Query letter")).toBe("Query letter");
    expect(materialToken({ material: "Query Letter" })).toBe("Query Letter");
  });
});

describe("⚠️ STORAGE IS UNTOUCHED", () => {
  it("the stored vocabulary still says Query letter", () => {
    expect(MAT_OPTS).toContain("Query letter");
    expect((MAT_OPTS as readonly string[])).not.toContain("Covering letter");
  });

  it("the encoder writes the TOKEN, never the label", () => {
    const s = emptyMaterials();
    s.selected.push("Query letter");
    expect(buildAgentMaterials(s)).toEqual(["Query letter"]);
  });

  it("⚠️ rows round-trip through the label and back to the token", () => {
    const stored = ["Query letter", "Synopsis"];
    const rows = materialRowsFromAgent(stored);
    // the row a reader sees…
    expect(rows.find((r) => r.key === "queryLetter")!.name).toBe("Covering letter");
    // …and what it writes back
    expect(materialsWantedFromRows(rows)).toEqual(stored);
  });

  it("the parser still recognises the stored token after the relabel", () => {
    expect(parseAgentMaterials(["Query letter"]).selected).toContain("Query letter");
  });

  it("the row NAME is display and the row KEY is storage — they are not the same string", () => {
    expect(MATERIAL_ROW_NAMES.queryLetter).toBe("Covering letter");
    expect(MAT_OPTS[0]).toBe("Query letter");
    expect(MATERIAL_ROW_NAMES.queryLetter).not.toBe(MAT_OPTS[0]);
  });
});

describe("the canonical formatter renders the label", () => {
  it("every screen routing through formatQueryMaterial says Covering letter", () => {
    expect(formatQueryMaterial("Query letter")).toBe("Covering letter");
    expect(formatQueryMaterial("Query Letter")).toBe("Covering letter");
    expect(formatQueryMaterial({ material: "Query Letter" })).toBe("Covering letter");
  });
});

/**
 * ⚠️ NO RENDER SITE INTERPOLATES A RAW TOKEN. Read as source across the material-naming surfaces —
 * a display constant holding the literal is exactly the drift this phase removes.
 */
describe("no material-naming surface hard-codes the token as display copy", () => {
  const root = join(__dirname, "..");
  const strip = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

  const SURFACES = [
    "lib/manuscriptPackages.ts",
    "components/packages/typeMeta.ts",
    "components/todo/PaneJourney.tsx",
  ];

  it.each(SURFACES)("%s names the covering letter through materialLabel", (rel) => {
    const src = strip(readFileSync(join(root, rel), "utf8"));
    /* ⚠️ the assertion is that the DISPLAY position does not hold the token. A `stored:` field
       legitimately does, which is why this looks for the label call rather than banning the word. */
    expect(src, `${rel} should call materialLabel`).toContain("materialLabel(");
  });

  it("⚠️ and PaneJourney keeps the token in its `stored` field — display moved, storage did not", () => {
    const src = readFileSync(join(root, "components/todo/PaneJourney.tsx"), "utf8");
    expect(src).toContain('stored: "Query letter"');
  });
});
