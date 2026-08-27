/**
 * ⚠️ THE CLAIM THAT MATTERS IS `recorded`, NOT `text`. A test asserting only the string would pass
 * on a build that presented the agent's stated requirement as a record of what went — which is
 * precisely what D6 forbids, and precisely what a derivation with a fallback makes easy.
 */
import { describe, it, expect } from "vitest";
import { queryPortion, withPortion, PORTION_UNRECORDED } from "./queryPortion";
import type { Agent, Query, QueryMaterial } from "../types";

const q = (materialsWanted?: (string | QueryMaterial)[]) => ({ materialsWanted }) as Pick<Query, "materialsWanted">;
const ag = (materialsWanted?: string[]) => ({ materialsWanted }) as unknown as Pick<Agent, "materialsWanted">;

describe("queryPortion", () => {
  it("reads the query's own sample and other members", () => {
    const p = queryPortion(q(["Query Letter", "Synopsis", "First 50 pages"]), ag([]));
    expect(p.text).toBe("First 50 pages");
    expect(p.recorded).toBe(true);
  });

  it("⚠️ the letter and the synopsis are NOT the portion — the package states those", () => {
    expect(queryPortion(q(["Query Letter", "Synopsis"]), ag([])).text).toBeNull();
  });

  it("holds free text, which is the whole reason the field is free text (D5)", () => {
    const m: QueryMaterial = { material: "Sample Pages", type: "other", quantity: "first 3 chapters + 1-page pitch" };
    expect(queryPortion(q([m]), ag([])).text).toBe("first 3 chapters + 1-page pitch");
  });

  it("⚠️ PRE-FILLS FROM THE AGENT, AND SAYS IT IS NOT A RECORD (D5/D6)", () => {
    const p = queryPortion(q(), ag(["Query Letter", "Sample chapters"]));
    expect(p.text).toBeTruthy();
    expect(p.recorded, "the agent's ask must never present as what went").toBe(false);
  });

  it("⚠️ the query's list wins WHOLE — the two are never merged", () => {
    /* Merging would invent a set neither the writer nor the agency stated. */
    const p = queryPortion(q(["First 10 pages"]), ag(["Sample chapters"]));
    expect(p.text).toBe("First 10 pages");
    expect(p.text).not.toContain("chapters");
  });

  it("⚠️ is null when nothing at all is known, and stores nothing (D6)", () => {
    const p = queryPortion(q(), ag());
    expect(p.text).toBeNull();
    expect(p.recorded).toBe(false);
    /* the module offers no writer that could fire on a read */
    expect(PORTION_UNRECORDED).toBe("Not recorded");
  });

  it("⚠️ a query holding materials but NO portion still reads not recorded", () => {
    /* An empty string rendered as though something were there is the fabricated-value fault. */
    expect(queryPortion(q(["Query Letter"]), ag()).text).toBeNull();
  });
});

describe("withPortion — the write-back", () => {
  it("replaces the portion members and leaves the others alone", () => {
    const next = withPortion(["Query Letter", "Synopsis", "First 50 pages"], "first 3 chapters");
    expect(next.filter((m) => typeof m === "string")).toEqual(["Query Letter", "Synopsis"]);
    expect(queryPortion(q(next), ag()).text).toBe("first 3 chapters");
  });

  it("⚠️ ROUND-TRIPS — what is written is what reads back", () => {
    /* Two derivations against each other, rather than a literal on both sides. */
    for (const text of ["first 3 chapters + 1-page pitch", "50 pages", "the opening & a bio"]) {
      expect(queryPortion(q(withPortion([], text)), ag()).text).toBe(text);
      expect(queryPortion(q(withPortion([], text)), ag()).recorded).toBe(true);
    }
  });

  it("⚠️ EMPTY CLEARS RATHER THAN STORING '' — the absence is the record (D6)", () => {
    const next = withPortion(["Query Letter", "First 50 pages"], "   ");
    expect(next).toEqual(["Query Letter"]);
    expect(queryPortion(q(next), ag()).text).toBeNull();
  });

  it("⚠️ writes ONE portion member, never appends a second", () => {
    const once = withPortion(["First 50 pages"], "30 pages");
    const twice = withPortion(once, "20 pages");
    expect(twice.filter((m) => typeof m !== "string")).toHaveLength(1);
    expect(queryPortion(q(twice), ag()).text).toBe("20 pages");
  });
});
