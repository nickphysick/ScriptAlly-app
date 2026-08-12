/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { effectiveQueryingStage, importDefaultForStage } from "./onboardingStage";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(resolve(here, rel), "utf8");

describe("importDefaultForStage", () => {
  it("pre-selects adding by hand for a writer with a few queries out", () => {
    expect(importDefaultForStage("early")).toBe("byhand");
  });

  it("pre-selects Smart Import for the deeper two", () => {
    expect(importDefaultForStage("deep")).toBe("smart");
    expect(importDefaultForStage("interest")).toBe("smart");
  });

  it("falls to Smart Import when the stage is absent or unrecognised", () => {
    expect(importDefaultForStage(null)).toBe("smart");
    expect(importDefaultForStage(undefined)).toBe("smart");
  });
});

describe("effectiveQueryingStage prefers the stored answer", () => {
  it("reads the stored value when there is one", () => {
    expect(effectiveQueryingStage("deep", "early")).toBe("deep");
  });

  /**
   * ⚠️ THE WINDOW THE FALLBACK COVERS IS REAL. Onboarding writes the profile fire-and-forget on
   * purpose (an awaited write can hang the flow when a field is silently denied), so the answer
   * exists in this session before the document comes back.
   */
  it("uses the session answer only while the stored one has not arrived", () => {
    expect(effectiveQueryingStage(undefined, "early")).toBe("early");
    expect(effectiveQueryingStage(null, "interest")).toBe("interest");
  });

  it("is null when neither exists", () => {
    expect(effectiveQueryingStage(null, null)).toBeNull();
  });
});

/**
 * ⚠️ THE POINT OF THE PHASE, ASSERTED: `queryingStage` is kept because it has a READER. A stored
 * field whose only consumer read a local copy of the same answer was write-only in everything but
 * name — which is precisely what got `journeyStage` deleted.
 */
describe("the stored field has at least one real reader", () => {
  it("Onboarding reads currentUser.queryingStage, not just its own state", () => {
    const onboarding = read("../components/Onboarding.tsx");
    expect(onboarding).toContain("currentUser?.queryingStage");
  });

  it("and the value it reads is what drives Branch B's import default", () => {
    const onboarding = read("../components/Onboarding.tsx");
    const anchor = "defaultImport={";
    expect(onboarding).toContain(anchor);
    const line = onboarding.slice(onboarding.indexOf(anchor));
    const call = line.slice(0, line.indexOf("\n"));
    expect(call).toContain("effectiveQueryingStage");
    expect(call).toContain("currentUser?.queryingStage");
  });
});

describe("journeyStage is gone everywhere", () => {
  const strip = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");

  it("is not a field on User", () => {
    expect(strip(read("../types.ts"))).not.toContain("journeyStage");
  });

  it("is not written by onboarding", () => {
    expect(strip(read("../components/Onboarding.tsx"))).not.toContain("journeyStage");
  });

  it("is not validated or allowlisted by the rules", () => {
    // Rules comments are `//`-style; the stripper handles them, so a surviving mention is real.
    expect(strip(read("../../firestore.rules"))).not.toContain("journeyStage");
  });
});
