import { describe, it, expect } from "vitest";
import { ComponentType, RecordStatus, UserPlan, type ManuscriptVersion, type QueryMaterial, type SubmissionPackage } from "../types";
import { MATERIAL_LABEL } from "./manuscriptPackages";
import {
  packageItems, overlaps, overlapNote, attachedMaterials, originTags, originTagText,
  withoutPackage, attachablePackages, materialName, type AttachedMaterial,
  canAttachPackages, packageMenuRow, PACKAGE_ROW_LABEL, isProUser,
} from "./packageAttach";

const PKG = {
  id: "p1", manuscriptId: "m1", userId: "u", packageName: "UK standard",
  queryLetterVersionId: "v-ql", synopsisVersionId: "v-syn", samplePagesVersionId: "v-smp",
  status: "Active" as RecordStatus, createdDate: "2026-01-01T00:00:00.000Z",
} as SubmissionPackage;

const V = (id: string, componentType: ComponentType, versionName: string) =>
  ({ id, manuscriptId: "m1", userId: "u", componentType, versionName, fileAttached: false, createdDate: "" }) as ManuscriptVersion;
const VERSIONS = [V("v-ql", ComponentType.QUERY_LETTER, "QL v3"), V("v-syn", ComponentType.SYNOPSIS, "Syn v1"), V("v-smp", ComponentType.SAMPLE_PAGES, "First 50")];

describe("a package's items", () => {
  it("resolves the filled slots in canonical order", () => {
    /* ⚠️ DERIVED FROM THE APP'S OWN MAP, not hand-written. The query letter reads "Covering
       letter" here — which is what the ref's overlap line says too — and a literal in this test
       would pin a WORDING the product owns, going red the day it is reworded. */
    expect(packageItems(PKG, VERSIONS).map((i) => i.label)).toEqual([
      MATERIAL_LABEL[ComponentType.QUERY_LETTER],
      MATERIAL_LABEL[ComponentType.SYNOPSIS],
      MATERIAL_LABEL[ComponentType.SAMPLE_PAGES],
    ]);
  });

  it("⚠️ skips an UNFILLED slot — the sentinel is empty string, not absence", () => {
    const half = { ...PKG, synopsisVersionId: "" } as SubmissionPackage;
    expect(packageItems(half, VERSIONS).map((i) => i.label)).toEqual([
      MATERIAL_LABEL[ComponentType.QUERY_LETTER], MATERIAL_LABEL[ComponentType.SAMPLE_PAGES],
    ]);
  });

  it("⚠️ keeps a slot whose VERSION is missing — a gap in the register is not evidence nothing was sent", () => {
    const items = packageItems(PKG, [VERSIONS[0]]);
    expect(items).toHaveLength(3);
    expect(items[1].versionName).toBeUndefined();
    expect(items[1].label).toBe("Synopsis");
  });

  /**
   * ⚠️ THE LAW: NOTHING INVENTS A SIZE. `SubmissionPackage` stores version ids and
   * `ManuscriptVersion` has no quantity or unit, so an attached opening sample cannot carry one.
   * The ref draws "First 3 chapters"; the data cannot say it.
   */
  it("⚠️ carries NO quantity or unit — packages do not store one", () => {
    for (const m of attachedMaterials(PKG, packageItems(PKG, VERSIONS))) {
      expect(m.quantity).toBeUndefined();
      expect(m.type).toBeUndefined();
    }
  });

  it("⚠️ uses the app's own name for a sample — never 'Sample pages', which asserts a unit", () => {
    expect(packageItems(PKG, VERSIONS)[2].label).toBe(MATERIAL_LABEL[ComponentType.SAMPLE_PAGES]);
    expect(packageItems(PKG, VERSIONS)[2].label).not.toMatch(/sample pages/i);
  });
});

describe("overlaps are declared, never resolved", () => {
  const items = packageItems(PKG, VERSIONS);
  it("names an item the send already carries", () => {
    const clash = overlaps(items, [{ material: "Query Letter" } as QueryMaterial]);
    expect(clash.map((i) => i.label)).toEqual([MATERIAL_LABEL[ComponentType.QUERY_LETTER]]);
    expect(overlapNote(clash[0])).toContain("will sit beside it");
  });
  it("⚠️ never says replace or skip — both would decide for the writer", () => {
    expect(overlapNote(items[0])).not.toMatch(/replac|skip|remov/i);
  });
  it("reads legacy plain-string materials too", () => {
    expect(overlaps(items, ["Synopsis"]).map((i) => i.label)).toEqual(["Synopsis"]);
    expect(materialName("Synopsis")).toBe("Synopsis");
  });
  it("finds none when nothing clashes", () => {
    expect(overlaps(items, ["Author bio"])).toEqual([]);
  });
});

describe("the snapshot, and its receipt", () => {
  const attached = attachedMaterials(PKG, packageItems(PKG, VERSIONS));

  it("⚠️ marks each item with the package's id AND its name as it was — a rename must not rewrite this send", () => {
    expect(attached.every((m) => m.fromPackageId === "p1" && m.fromPackageName === "UK standard")).toBe(true);
  });

  it("the tag derives from the items, so a hand-removed pill makes it count 2", () => {
    expect(originTagText(originTags(attached)[0])).toBe("3 items from UK standard");
    expect(originTagText(originTags(attached.slice(0, 2))[0])).toBe("2 items from UK standard");
    expect(originTagText(originTags(attached.slice(0, 1))[0])).toBe("1 item from UK standard");
  });

  it("⚠️ no tag at all once the last of them is gone — a stored count would still claim three", () => {
    expect(originTags(attached.filter(() => false))).toEqual([]);
    expect(originTags(["Query Letter", { material: "Synopsis" } as QueryMaterial])).toEqual([]);
  });

  it("counts two packages separately", () => {
    const other = attachedMaterials({ ...PKG, id: "p2", packageName: "US wide" } as SubmissionPackage, packageItems(PKG, VERSIONS));
    expect(originTags([...attached, ...other]).map(originTagText))
      .toEqual(["3 items from UK standard", "3 items from US wide"]);
  });

  /**
   * ⚠️ THE UNDO MATCHES ON THE MARK, NOT THE NAME. A writer who attached the package and then added
   * their own synopsis keeps it; a name-based removal cannot tell the two apart and would take it.
   */
  it("⚠️ the undo removes what the package brought and nothing else", () => {
    const own: AttachedMaterial = { material: "Synopsis" };
    const mixed = [...attached, own, "Author bio"];
    const left = withoutPackage(mixed, "p1");
    expect(left).toEqual([own, "Author bio"]);
  });

  it("leaves another package's items alone", () => {
    const other = attachedMaterials({ ...PKG, id: "p2", packageName: "US wide" } as SubmissionPackage, [packageItems(PKG, VERSIONS)[0]]);
    expect(withoutPackage([...attached, ...other], "p1")).toEqual(other);
  });
});

describe("which packages are offered", () => {
  const list = [PKG, { ...PKG, id: "p2", manuscriptId: "m2" }, { ...PKG, id: "p3", status: "Retired" }] as SubmissionPackage[];
  it("this manuscript's, retired excluded", () => {
    expect(attachablePackages(list, "m1").map((p) => p.id)).toEqual(["p1"]);
  });
  it("none when the query has no manuscript", () => {
    expect(attachablePackages(list, undefined)).toEqual([]);
  });
});

describe("§3 · the gate is wired, and open", () => {
  const free = { plan: UserPlan.FREE };
  const pro = { plan: UserPlan.PRO };

  it("⚠️ is OPEN today for everyone — beta grants Pro, so the feature ships available", () => {
    expect(canAttachPackages(pro)).toBe(true);
    expect(canAttachPackages(free)).toBe(true);
    expect(canAttachPackages(null)).toBe(true);
  });

  it("⚠️ but the row routes THROUGH it — flipping the predicate to false hides the row entirely", () => {
    expect(packageMenuRow(true, 2).map((r) => r.label)).toEqual([PACKAGE_ROW_LABEL]);
    expect(packageMenuRow(false, 2)).toEqual([]);
  });

  /**
   * ⚠️ NO ROW WITH NOWHERE TO GO. A manuscript with no packages would open a picker that can only
   * state its own emptiness — and the Packages page is already reachable from the rail.
   */
  it("shows nothing when the manuscript has no packages, gate open or not", () => {
    expect(packageMenuRow(true, 0)).toEqual([]);
    expect(packageMenuRow(false, 0)).toEqual([]);
  });

  /**
   * ⚠️ AND IT SELLS NOTHING. The row used to read `Attach a submission package · Pro` and send a
   * Free user to the plans page; the free plan shows no ceilings here, so the label carries no
   * badge, no meter and no upgrade wording.
   */
  it("⚠️ the label carries no upsell of any kind", () => {
    expect(PACKAGE_ROW_LABEL).not.toMatch(/pro\b|upgrade|unlock|plan|trial/i);
  });

  it("⚠️ reuses the app's ONE Pro predicate rather than re-implementing the plan check", () => {
    expect(isProUser(pro)).toBe(true);
    expect(isProUser(free)).toBe(false);
  });
});
