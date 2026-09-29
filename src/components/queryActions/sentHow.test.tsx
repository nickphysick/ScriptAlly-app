/**
 * LP9 — the two treatments, over all six cases of the ref's "On the query" tab. Solid ink for a
 * package, dashed for individually, quiet for not recorded — asserted on the RENDERED markup of the
 * one component every surface uses. The rendered-page half is tests/e2e/packagesJourney.measure.ts.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FromPackageTag, SentBox, SentChip } from "./SentHow";
import { sentHowWords } from "../../lib/queryActions/sentRecord";
import type { SubmissionPackage } from "../../types";

const STD = "Standard package: Query letter v3 · Synopsis v2 · first 3 chapters · Fast-paced opening";
const live = [
  { id: "std", packageName: "Standard", status: "Active" },
  { id: "op", packageName: "Opening pages", status: "Retired" },
] as unknown as SubmissionPackage[];

const CASES = {
  pkg: { sentHow: "package" as const, sentPackageId: "std", packageId: "std", sentPackageEdition: 1, sentMaterials: STD },
  ind: { sentHow: "individual" as const, packageId: "", sentMaterials: "Query letter v3 · first 5,000 words" },
  based: { sentHow: "individual" as const, packageId: "", basedOnPackageId: "std", basedOnPackageEdition: 1, sentChanges: ["Synopsis: v2 → none"], sentMaterials: "Based on Standard: Query letter v3 · first 3 chapters" },
  ret: { sentHow: "package" as const, sentPackageId: "op", packageId: "op", sentPackageEdition: 1, sentMaterials: "Opening pages package: Query letter v3 · first 10 pages" },
  cor: { ...{ sentHow: "package" as const, sentPackageId: "std", packageId: "std", sentPackageEdition: 1, sentMaterials: STD }, sentCorrectedAt: "2026-09-28T10:00:00Z", sentCorrectedFrom: "Opening pages package: Query letter v3" },
  imp: { sentHow: "unrecorded" as const, packageId: "" },
};
const html = (el: React.ReactElement) => renderToStaticMarkup(el);
const box = (k: keyof typeof CASES) => html(<SentBox q={CASES[k]} packages={live} onOpenPackage={() => {}} onAddWhatSent={() => {}} />);
const chip = (k: keyof typeof CASES) => html(<SentChip q={CASES[k]} packages={live} />);

describe("LP9 · solid ink = a package, dashed = individually, quiet = not recorded", () => {
  it("the chip, per case", () => {
    expect(chip("pkg")).toMatch(/class="sh-chip sh-chip--pk"[^>]*>.*STANDARD PACKAGE/);
    expect(chip("ret")).toContain("sh-chip--pk");
    expect(chip("cor")).toContain("sh-chip--pk");
    expect(chip("ind")).toMatch(/sh-chip--in.*MATERIALS LOGGED INDIVIDUALLY</);
    expect(chip("based")).toContain("MATERIALS LOGGED INDIVIDUALLY · BASED ON STANDARD");
    expect(chip("imp")).toMatch(/sh-chip--no.*MATERIALS NOT RECORDED/);
  });
  it("Tracking's box, per case", () => {
    expect(box("pkg")).toMatch(/sh-mt sh-mt--pk.*SUBMISSION PACKAGE ATTACHED.*Standard.*1ST EDITION.*OPEN PACKAGE/);
    expect(box("ret")).toMatch(/sh-mt--pk.*RETIRED.*SEE ITS RESULTS/);
    expect(box("ret")).not.toContain("EDITION");
    expect(box("ind")).toMatch(/sh-mt sh-mt--in.*No package attached/);
    expect(box("based")).toMatch(/sh-mt--in.*Based on a package.*BASED ON STANDARD · 1ST ED\./);
    expect(box("based")).toMatch(/class="sh-row chg".*<s>v2<\/s> not sent/);
    expect(box("cor")).toContain("CORRECTED 28 SEP · WAS RECORDED AS “OPENING PAGES”");
    expect(box("imp")).toMatch(/sh-mt--no.*MATERIALS NOT RECORDED.*ADD WHAT YOU SENT/);
  });
  it("what was sent reads from the query, never the live package (LP6)", () => {
    const renamed = [{ id: "std", packageName: "Renamed since", status: "Active" }] as unknown as SubmissionPackage[];
    const b = html(<SentBox q={CASES.pkg} packages={renamed} />);
    expect(b).toContain("Standard");
    expect(b).not.toContain("Renamed since");
    expect(b).toContain("first 3 chapters · Fast-paced opening");
  });
  it("requests carry the package's tag only when a package was attached", () => {
    expect(html(<FromPackageTag q={CASES.pkg} packages={live} />)).toContain("FROM THE STANDARD PACKAGE");
    for (const k of ["ind", "based", "imp"] as const) expect(html(<FromPackageTag q={CASES[k]} packages={live} />)).toBe("");
  });
  it("the Birds-eye's words say the same three things", () => {
    expect(sentHowWords(CASES.pkg)).toBe("Sent as the Standard package");
    expect(sentHowWords(CASES.based)).toBe("Materials logged individually, based on Standard");
    expect(sentHowWords(CASES.imp)).toBe("Materials not recorded");
  });
});
