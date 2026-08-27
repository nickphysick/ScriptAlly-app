import { describe, it, expect } from "vitest";
import { ComponentType, RecordStatus, UserPlan, type ManuscriptVersion, type QueryMaterial, type SubmissionPackage } from "../types";
import { MATERIAL_LABEL } from "./manuscriptPackages";
import {
  packageItems, attachedMaterials, originTags, originTagText,
  withoutPackage, attachablePackages, materialName, type AttachedMaterial,
  canAttachPackages, packageMenuRow, PACKAGE_ROW_LABEL, isProUser, groupByOrigin,
  packageDrift, driftNote, sendsWithPackage, sentWithLine, NEVER_SENT_LINE,
} from "./packageAttach";

const PKG = {
  id: "p1", manuscriptId: "m1", userId: "u", packageName: "UK standard",
  queryLetterVersionId: "v-ql", synopsisVersionId: "v-syn", samplePagesVersionId: "v-smp",
  status: "Active" as RecordStatus, createdDate: "2026-01-01T00:00:00.000Z",
} as SubmissionPackage;

const V = (id: string, componentType: ComponentType, versionName: string) =>
  ({ id, manuscriptId: "m1", userId: "u", componentType, versionName, fileAttached: false, createdDate: "" }) as ManuscriptVersion;
const VERSIONS = [V("v-ql", ComponentType.QUERY_LETTER, "QL v3"), V("v-syn", ComponentType.SYNOPSIS, "Syn v1"), V("v-smp", ComponentType.SAMPLE_PAGES, "First 50")];

/**
 * ⚠️ A PACKAGE HOLDS TWO MATERIALS NOW, NOT THREE — and every expectation below that fell from 3 to
 * 2 fell for that one reason, so it is stated here rather than twenty-eight times.
 *
 * Sample pages is retired as a material type (D9). A package is a covering letter, a synopsis and a
 * VERSION; the portion that actually went is the agency's decision and is recorded on the query.
 * `PACKAGE_SLOTS` is a union now, and the two consumers here iterate `PACKAGE_MATERIAL_SLOTS`,
 * because a chip resolves a slot id to a version DOCUMENT and the version slot has none.
 *
 * ⚠️ THE FIXTURES DELIBERATELY KEEP A FILLED `samplePagesVersionId`. No package document is
 * rewritten by this change — a sent package's slots are frozen so it keeps reporting what the agent
 * received — so the realistic state is a stored sample slot that nothing reads. A fixture with the
 * key emptied would be testing a migration that does not happen.
 */
describe("a package's items", () => {
  it("resolves the filled slots in canonical order", () => {
    /* ⚠️ DERIVED FROM THE APP'S OWN MAP, not hand-written. The query letter reads "Covering
       letter" here — which is what the ref's overlap line says too — and a literal in this test
       would pin a WORDING the product owns, going red the day it is reworded. */
    expect(packageItems(PKG, VERSIONS).map((i) => i.label)).toEqual([
      MATERIAL_LABEL[ComponentType.QUERY_LETTER],
      MATERIAL_LABEL[ComponentType.SYNOPSIS],
    ]);
  });

  it("⚠️ skips an UNFILLED slot — the sentinel is empty string, not absence", () => {
    const half = { ...PKG, synopsisVersionId: "" } as SubmissionPackage;
    expect(packageItems(half, VERSIONS).map((i) => i.label)).toEqual([
      MATERIAL_LABEL[ComponentType.QUERY_LETTER],
    ]);
  });

  it("⚠️ keeps a slot whose VERSION is missing — a gap in the register is not evidence nothing was sent", () => {
    const items = packageItems(PKG, [VERSIONS[0]]);
    expect(items).toHaveLength(2);
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

  it("⚠️ NO LONGER RESOLVES A SAMPLE AT ALL — the slot is not read (D9)", () => {
    /**
     * ⚠️ RETARGETED, AND THE LAW IT NOW ASSERTS. This case guarded the sample's LABEL: three unit
     * choices map to one `ComponentType`, so "Sample pages" would assert a unit the record does not
     * carry, and it had to read "Opening sample". That law is unchanged and still lives on
     * `MATERIAL_LABEL` — where archived samples still read through it.
     *
     * What changed is that a package no longer HAS a sample slot to label. The fixture still stores
     * one, deliberately (no document is rewritten), so this asserts the stronger thing: a stored
     * sample slot produces no item, whatever it is called.
     */
    expect(packageItems(PKG, VERSIONS)).toHaveLength(2);
    expect(packageItems(PKG, VERSIONS).map((i) => i.label))
      .not.toContain(MATERIAL_LABEL[ComponentType.SAMPLE_PAGES]);
    /* the naming law itself, still true where it still applies */
    expect(MATERIAL_LABEL[ComponentType.SAMPLE_PAGES]).not.toMatch(/sample pages/i);
  });
});

describe("the snapshot, and its receipt", () => {
  const attached = attachedMaterials(PKG, packageItems(PKG, VERSIONS));

  it("⚠️ marks each item with the package's id AND its name as it was — a rename must not rewrite this send", () => {
    expect(attached.every((m) => m.fromPackageId === "p1" && m.fromPackageName === "UK standard")).toBe(true);
  });

  it("the tag derives from the items, so a hand-removed pill makes it count 2", () => {
    expect(originTagText(originTags(attached)[0])).toBe("2 items from UK standard");
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
      .toEqual(["2 items from UK standard", "2 items from US wide"]);
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

describe("§1 · the group is presentation over stored origin", () => {
  const attached = attachedMaterials(PKG, packageItems(PKG, VERSIONS));

  it("gathers a package's items and leaves hand-attached ones loose", () => {
    const { groups, loose } = groupByOrigin([...attached, "Author bio", { material: "Synopsis" } as QueryMaterial]);
    expect(groups).toHaveLength(1);
    expect(groups[0].packageName).toBe("UK standard");
    expect(groups[0].materials).toEqual(["Query Letter", "Synopsis"]);
    /* ⚠️ ANYTHING ATTACHED OUTSIDE THE PACKAGE SITS BELOW IT, including a second synopsis added by
       hand — the group is a statement about provenance, not about the material's name. */
    expect(loose).toEqual(["Author bio", "Synopsis"]);
  });

  it("keeps two packages apart, in the order they were attached", () => {
    const other = attachedMaterials({ ...PKG, id: "p2", packageName: "US wide" } as SubmissionPackage, packageItems(PKG, VERSIONS).slice(0, 1));
    const { groups } = groupByOrigin([...other, ...attached]);
    expect(groups.map((g) => g.packageName)).toEqual(["US wide", "UK standard"]);
  });

  /**
   * ⚠️ REMOVING A PILL DOES NOT DISSOLVE THE GROUP — the remaining items still came from the
   * template, and the send simply no longer matches it. There is no container in the data to break.
   */
  it("survives one of its items being removed", () => {
    const { groups } = groupByOrigin(attached.slice(1));
    expect(groups).toHaveLength(1);
    expect(groups[0].materials).toEqual(["Synopsis"]);
  });

  it("disappears once the last of its items is gone", () => {
    expect(groupByOrigin(["Author bio"]).groups).toEqual([]);
  });

  it("⚠️ carries the name STORED ON THE ITEMS, so it outlives the package's deletion", () => {
    const { groups } = groupByOrigin(attached);
    expect(groups[0].packageName).toBe("UK standard");
    expect(groups[0].packageId).toBe("p1");
  });
});

describe("§2 · the three states, each only when true", () => {
  const items = packageItems(PKG, VERSIONS);
  const sent = attachedMaterials(PKG, items);
  const group = groupByOrigin(sent).groups[0];

  it("⚠️ says NOTHING when the send and the package still match", () => {
    expect(packageDrift(group, PKG, sent)).toEqual({ state: "none", differing: [] });
  });

  it("⚠️ compares by VERSION IDENTITY — a swapped synopsis is seen, though the names are identical", () => {
    const moved = { ...PKG, synopsisVersionId: "v-syn2" } as SubmissionPackage;
    const d = packageDrift(group, moved, sent);
    expect(d.state).toBe("changed");
    expect(d.differing).toEqual(["Synopsis"]);
    expect(driftNote(d.differing)).toContain("a different synopsis");
    expect(driftNote(d.differing)).toContain("keeps what actually went");
  });

  it("sees a MATERIAL slot the package has since emptied", () => {
    /* ⚠️ THE SAMPLE IS NO LONGER COMPARED (D9) — drift asks what a send took against what the
       package holds now, and a send takes materials. Emptying the sample slot is invisible here
       because nothing reads it; emptying the SYNOPSIS is still drift. */
    const d = packageDrift(group, { ...PKG, synopsisVersionId: "" } as SubmissionPackage, sent);
    expect(d.state).toBe("changed");
    expect(d.differing).toEqual(["Synopsis"]);
  });

  it("⚠️ and emptying the retired sample slot is NOT drift", () => {
    const d = packageDrift(group, { ...PKG, samplePagesVersionId: "" } as SubmissionPackage, sent);
    expect(d.state).toBe("none");
  });

  /**
   * ⚠️ ORDER IS NOT PART OF THE QUESTION AND CANNOT BE. A package has three NAMED slots, so there
   * is no sequence to reorder; both sides are compared as slot→version maps, order-free by
   * construction. This asserts that building the same package's items in a different order changes
   * nothing — the closest this model can come to a "reordered" package.
   */
  it("⚠️ a reordered-but-identical package is not a change", () => {
    const shuffled = [...sent].reverse();
    expect(packageDrift(groupByOrigin(shuffled).groups[0], PKG, shuffled).state).toBe("none");
  });

  it("⚠️ editing a version's CONTENT is not a change — the send went out with that version", () => {
    /* nothing in the package's slot map moved, so nothing here can see a reworded draft */
    expect(packageDrift(group, { ...PKG, packageName: "Renamed" } as SubmissionPackage, sent).state).toBe("none");
  });

  it("the deleted state keeps the name and reports the absence", () => {
    expect(packageDrift(group, null, sent)).toEqual({ state: "deleted", differing: [] });
    expect(group.packageName, "the name must outlive the package").toBe("UK standard");
  });

  /**
   * ⚠️ `unknown` RENDERS NOTHING. A send attached before version ids were stored cannot be
   * compared, and a false "changed" is worse than no marker — it tells a writer their record
   * diverged from a template when it did not.
   */
  it("⚠️ says nothing about a send that carries no version ids", () => {
    const legacy = sent.map(({ fromVersionId, ...rest }) => rest as AttachedMaterial);
    expect(packageDrift(groupByOrigin(legacy).groups[0], PKG, legacy).state).toBe("unknown");
  });

  it("⚠️ a pill the WRITER removed is not the package moving on", () => {
    const minusSynopsis = sent.filter((m) => m.material !== "Synopsis");
    expect(packageDrift(groupByOrigin(minusSynopsis).groups[0], PKG, minusSynopsis).state).toBe("none");
  });
});

describe("§3 · the derived count, and §5 · the gate on its affordance", () => {
  const Q = (id: string, pkgId: string | null, status: string, dateSent: string) => ({
    id, agentId: `ag-${id}`, status, dateSent,
    materialsWanted: pkgId ? [{ material: "Query Letter", fromPackageId: pkgId, fromPackageName: "UK standard" }] : ["Query Letter"],
  });
  const QUERIES = [Q("a", "p1", "Queried", "2026-08-12"), Q("b", "p1", "Full Requested", "2026-08-04"), Q("c", null, "Queried", "2026-08-06"), Q("d", "p2", "Queried", "2026-08-01")];

  it("counts the sends whose MARKS name this package", () => {
    expect(sendsWithPackage("p1", QUERIES as never).map((s) => s.queryId)).toEqual(["a", "b"]);
  });

  /**
   * ⚠️ IT DOES NOT READ `query.packageId`, and that is load-bearing. The snapshot attach CLEARS that
   * older link field (a query carries the link or its own materials, never both), so a count over
   * it would report zero for every send made through the attach flow.
   */
  it("⚠️ ignores the legacy packageId link entirely", () => {
    const linked = [{ id: "e", status: "Queried", dateSent: "2026-08-20", packageId: "p1", materialsWanted: [] }];
    expect(sendsWithPackage("p1", linked as never)).toEqual([]);
  });

  it("newest first — the short list is what happened lately", () => {
    expect(sendsWithPackage("p1", QUERIES as never)[0].queryId).toBe("a");
  });

  /* ⚠️ A DELETED QUERY STOPS BEING COUNTED WITH NO CLEANUP — nothing was ever written to decrement. */
  it("a query that is gone is simply not counted", () => {
    expect(sendsWithPackage("p1", QUERIES.filter((q) => q.id !== "a") as never)).toHaveLength(1);
  });

  it("states state 3 only when nothing has been sent", () => {
    expect(sendsWithPackage("p9", QUERIES as never)).toEqual([]);
    expect(NEVER_SENT_LINE).toMatch(/not yet sent/i);
    /* ⚠️ AND IT NEVER SELLS — no badge, no meter, no upgrade, per the locked law. */
    expect(NEVER_SENT_LINE).not.toMatch(/pro\b|upgrade|unlock|plan/i);
  });

  it("the count's wording agrees with itself at one", () => {
    expect(sentWithLine(1)).toBe("1 query sent with this package");
    expect(sentWithLine(4)).toBe("4 queries sent with this package");
  });

  /** §5 — the affordance routes through the same one predicate the Query Centre's menu row uses. */
  it("⚠️ the Attach affordance is gated by the ONE predicate, which is open today", () => {
    expect(canAttachPackages({ plan: UserPlan.FREE })).toBe(true);
    expect(canAttachPackages({ plan: UserPlan.PRO })).toBe(true);
  });
});
