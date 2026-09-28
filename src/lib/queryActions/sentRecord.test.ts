import { describe, expect, it } from "vitest";
import { creditedTo, sentRecordOf } from "./sentRecord";
import { readFileSync } from "node:fs";

describe("sentRecordOf — the one reader of §C3", () => {
  it("an unmigrated query with a packageId reads as the migration writes it: package, edition 1", () => {
    const r = sentRecordOf({ packageId: "p1" });
    expect(r).toMatchObject({ how: "package", packageId: "p1", edition: 1, inferred: true });
  });

  it("an unmigrated query with no packageId reads as unrecorded, with no package", () => {
    const r = sentRecordOf({ packageId: "" });
    expect(r).toMatchObject({ how: "unrecorded", packageId: null, edition: null, inferred: true });
  });

  it("a recorded package send keeps its own id and edition", () => {
    const r = sentRecordOf({ sentHow: "package", sentPackageId: "p2", packageId: "p2", sentPackageEdition: 3 });
    expect(r).toMatchObject({ how: "package", packageId: "p2", edition: 3, inferred: false });
  });

  it("an individual send carries no package, however packageId is set", () => {
    const r = sentRecordOf({ sentHow: "individual", packageId: "p1", basedOnPackageId: "p1", basedOnPackageEdition: 2, sentChanges: ["Sample: a → b"] });
    expect(r.packageId).toBeNull();
    expect(r).toMatchObject({ basedOnId: "p1", basedOnEdition: 2, changes: ["Sample: a → b"] });
    expect(creditedTo({ sentHow: "individual", basedOnPackageId: "p1" }, "p1")).toBe(false);
  });

  it("credit is by package AND edition", () => {
    const q = { sentHow: "package" as const, sentPackageId: "p1", sentPackageEdition: 2 };
    expect(creditedTo(q, "p1", 2)).toBe(true);
    expect(creditedTo(q, "p1", 1)).toBe(false);
    expect(creditedTo(q, "p1")).toBe(true);
  });

  it("the rules carry every §C3 field, validated and allowlisted", () => {
    const rules = readFileSync("firestore.rules", "utf8");
    for (const f of ["sentHow", "sentPackageEdition", "basedOnPackageId", "basedOnPackageEdition", "sentChanges", "sentCorrectedAt", "sentCorrectedFrom"]) {
      expect(rules, `${f} validated`).toContain(`data.get('${f}', null) == null`);
      expect(rules.match(new RegExp(`'${f}'`, "g"))?.length ?? 0, `${f} allowlisted`).toBeGreaterThanOrEqual(2);
    }
  });
});
