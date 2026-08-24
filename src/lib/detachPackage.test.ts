/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ F-O — a package can be taken off a send, from the menu that put it there ══════════════════
 *
 * `detachPackage` was written, commented, and had **zero callers**. Attaching was a one-way act: the
 * only way back was to hover each pill and remove it separately — three removals and three undos for
 * one decision, and nothing on the page said those items belonged to one.
 *
 * ⚠️ THE REACHABILITY CASE IS THE POINT OF THIS FILE. Every other assertion here would have passed
 * on the broken build, because the function was correct — it simply ran for nobody. A lock that only
 * tests behaviour cannot tell a live function from a dead one, and this repo has lost a whole
 * session to exactly that (a cluster of four buttons and thirty-eight green cases, none reachable).
 * So the mount is asserted against the page's source, not just the helper's output.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  detachMenuRows, detachRowLabel, detachToast, withoutPackage, groupByOrigin,
  attachedMaterials, packageItems, type MaterialGroup,
} from "./packageAttach";
import { materialsLinkWrites } from "./packageMetrics";
import { sliceBetween } from "../test/sliceBetween";
import { ComponentType, SubmissionPackage, ManuscriptVersion, QueryMaterial } from "../types";

const root = join(__dirname, "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
/** ⚠️ Strip comments first — this pack's prose names every symbol and state it asserts. */
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const group = (over: Partial<MaterialGroup> = {}): MaterialGroup =>
  ({ packageId: "p1", packageName: "Standard UK", materials: ["Query Letter", "Synopsis"], ...over });

// ─────────────────────────────────────────────────────────────────────────────
describe("detachMenuRows — one row per package the send is actually carrying", () => {
  it("offers nothing when the send carries no package", () => {
    // ⚠️ NO ROW WITH NOTHING TO REMOVE — the same rule `packageMenuRow` applies to attaching.
    expect(detachMenuRows([])).toEqual([]);
  });

  it("names the package, so a send drawing on two is unambiguous", () => {
    const rows = detachMenuRows([group(), group({ packageId: "p2", packageName: "US agencies", materials: ["Query Letter"] })]);
    expect(rows.map((r) => r.label)).toEqual(["Remove Standard UK", "Remove US agencies"]);
    expect(rows.map((r) => r.packageId)).toEqual(["p1", "p2"]);
  });

  it("its hint states the scope, and agrees with itself in the singular", () => {
    expect(detachMenuRows([group()])[0].hint).toBe("2 ITEMS");
    expect(detachMenuRows([group({ materials: ["Synopsis"] })])[0].hint).toBe("1 ITEM");
  });

  it("the label is built from one function, so the menu and any probe cannot drift", () => {
    expect(detachMenuRows([group()])[0].label).toBe(detachRowLabel("Standard UK"));
  });

  it("carries the name AS STORED, so it still reads after the package is deleted", () => {
    // The group's name comes off the ITEMS' marks, never a live lookup — that is what outlives a
    // deleted package, and the removal row has to keep saying which one it means.
    const rows = detachMenuRows([group({ packageName: "a package" })]);
    expect(rows[0].label).toBe("Remove a package");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("detachToast — states the deed and its scope, and passes no verdict", () => {
  it("counts what went, and agrees in the singular", () => {
    expect(detachToast(3, "Standard UK")).toBe("Removed 3 items from Standard UK");
    expect(detachToast(1, "Standard UK")).toBe("Removed 1 item from Standard UK");
  });

  it("no verdict word, no warning tone", () => {
    // ⚠️ D2. A removal the writer chose is an ordinary act; "lost", "careful", "permanently" would
    // all be the app having an opinion about a reversible edit.
    expect(detachToast(3, "Standard UK"))
      .not.toMatch(/lost|careful|permanent|warning|sure|cannot|unable|only|just|simply/i);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the removal takes what the package brought, and nothing else", () => {
  const pkg: SubmissionPackage = {
    id: "p1", manuscriptId: "m1", userId: "u1", packageName: "Standard UK",
    queryLetterVersionId: "v-l", synopsisVersionId: "v-s", samplePagesVersionId: "",
    status: "Active", createdDate: "2026-08-01T00:00:00.000Z",
  };
  const versions = [
    { id: "v-l", componentType: ComponentType.QUERY_LETTER, versionName: "Hook-first" },
    { id: "v-s", componentType: ComponentType.SYNOPSIS, versionName: "One-page" },
  ] as unknown as ManuscriptVersion[];

  /**
   * ⚠️ THE INPUT IS BUILT BY THE REAL ATTACH PATH, not hand-written. A literal fixture is the same
   * fault one step along: it goes green the day `attachedMaterials` changes the mark it writes, and
   * the removal would then match nothing on a real send.
   */
  const attached = attachedMaterials(pkg, packageItems(pkg, versions));

  it("round-trips: what attach adds, detach takes away", () => {
    const own: (string | QueryMaterial)[] = ["First 15 pages"];
    const sent = [...own, ...attached];
    expect(sent.length).toBeGreaterThan(own.length);
    expect(withoutPackage(sent, "p1")).toEqual(own);
  });

  it("a hand-added material of the SAME NAME survives — the match is on the mark", () => {
    // The writer's own synopsis is not the package's synopsis, and only the mark tells them apart.
    const own: (string | QueryMaterial)[] = ["Synopsis"];
    const left = withoutPackage([...own, ...attached], "p1");
    expect(left).toEqual(own);
  });

  it("another package's items are untouched", () => {
    const other = [{ material: "Synopsis", fromPackageId: "p2", fromPackageName: "US agencies" }] as unknown as QueryMaterial[];
    const left = withoutPackage([...attached, ...other], "p1");
    expect(left).toEqual(other);
  });

  it("after the removal the send has no group left, so it renders as loose (D4)", () => {
    // ⚠️ TWO DERIVATIONS AGAINST EACH OTHER — `withoutPackage`'s output fed to `groupByOrigin`,
    // rather than asserting a literal about what the strip "should" show.
    const sent = ["First 15 pages", ...attached];
    const after = groupByOrigin(withoutPackage(sent, "p1"));
    expect(after.groups).toEqual([]);
    expect(after.loose).toEqual(["First 15 pages"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("it is MOUNTED, in the menu that attaches", () => {
  const page = decls(read("src/components/Queries.tsx"));

  it("detachPackage has a caller", () => {
    /**
     * ⚠️ THE CASE THE WHOLE FILE EXISTS FOR. `grep -c` finds a definition; only a reference outside
     * the declaration proves it runs. Before this pack the count was one — its own `const`.
     */
    const refs = (page.match(/detachPackage(?![A-Za-z0-9_])/g) ?? []).length;
    expect(refs, "detachPackage is unreachable again").toBeGreaterThan(1);
    expect(page).toContain("detachPackage(activeQuery, r.packageId, r.packageName)");
  });

  it("the rows are built from the groups already on screen", () => {
    // A menu offering to remove a package the strip does not show, or a strip with no way off it,
    // are the two halves of the same divergence. One derivation feeds both.
    expect(page).toContain("detachMenuRows(sentGroups)");
    expect(page).toContain("const { groups: sentGroups } = groupByOrigin(materialsOf(activeQuery))");
    expect(page).toContain("const groups = sentGroups;");
  });

  it("removal sits in the SAME menu as attach, not a second entry point (D1)", () => {
    const menu = page.indexOf("packageMenuRow(canAttachPackages(currentUser)");
    expect(menu, "the attach row is gone").toBeGreaterThan(-1);
    const detach = page.indexOf("detachMenuRows(sentGroups)", menu);
    expect(detach, "the removal rows are not in the attach menu").toBeGreaterThan(menu);
    // …and close to it: same `items={[…]}` array, not a different surface further down the file.
    expect(detach - menu).toBeLessThan(2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("D3 — a correction, not history", () => {
  const page = decls(read("src/components/Queries.tsx"));
  const body = (() => {
    const a = page.indexOf("const detachPackage = (");
    expect(a, "detachPackage is gone").toBeGreaterThan(-1);
    const b = page.indexOf("const writeMaterials = (", a);
    // ⚠️ BOTH ANCHORS ASSERTED — `indexOf` returns -1 and `slice(-1)` silently widens to the whole
    // rest of the file, which is how a bounded lock goes vague instead of red.
    expect(b, "the closing anchor is gone").toBeGreaterThan(a);
    return page.slice(a, b);
  })();

  it("writes materialsWanted and nothing else", () => {
    /**
     * ⚠️ THE CHECK IS ON THE WRITE CALLS, NOT ON THE FUNCTION BODY — and the first draft was on the
     * body, so `packageId:` matched the SIGNATURE (`packageId: string`) and the case went red on
     * correct code. Same substring trap as `tdk-q` matching `tdk-quiet`: a probe is only as good as
     * the artefact it reads, and "does this function mention the word" is a different question from
     * "does this function write the field".
     */
    const writes = [...body.matchAll(/updateQuery\([^)]*\)/g)].map((m) => m[0]);
    expect(writes.length, "detachPackage makes no updateQuery call").toBeGreaterThan(0);
    expect(writes.some((w) => w.includes("materialsWanted: next"))).toBe(true);
    for (const field of ["status", "dateSent", "responseDeadline", "lastStatusChange",
                         "responseReceivedAt", "rejectedDate", "packageId"]) {
      for (const w of writes) {
        expect(w, `detachPackage writes ${field}`).not.toContain(`${field}:`);
      }
    }
  });

  it("appends no activity — removing a package edits the record, it is not an event", () => {
    for (const t of ["addActivity", "logActivity", "ActivityType", "activities"]) {
      expect(body, `detachPackage writes an activity (${t})`).not.toContain(t);
    }
  });

  it("does not touch the derivation engine", () => {
    expect(body).not.toContain("recomputeQuery");
  });

  it("its undo captures the list BEFORE the write", () => {
    // ⚠️ THE EMPTY-CLOSURE LAW. An undo built from state read back afterwards restores what it just
    // wrote, and the toast says it worked. `before` is read at the top of the function.
    const beforeAt = body.indexOf("const before =");
    const writeAt = body.indexOf("updateQuery(q.id, { materialsWanted: next })");
    expect(beforeAt).toBeGreaterThan(-1);
    expect(beforeAt).toBeLessThan(writeAt);
    expect(body).toContain("undo: () => void updateQuery(q.id, { materialsWanted: before })");
  });
});

/**
 * ══ THE SWITCH'S UNDO RESTORES BOTH HALVES ═══════════════════════════════════════════════════
 *
 * ⚠️ THIS IS THE PARTIAL-UNDO SHAPE, WHICH IS WORSE THAN NO UNDO. Attaching a package CLEARS the
 * loose materials (`materialsLinkWrites` enforces one-or-the-other), so an undo that restored only
 * `packageId` left the query holding NEITHER — while the toast said the change had been reversed.
 * Measured on the running app before the fix: two loose materials, switched to a package, undone,
 * and both were gone.
 *
 * ⚠️ ASSERTED AS A PROPERTY OF THE INVERSE, NOT AS A STRING. The claim is "whatever state you were
 * in comes back", so it is checked by round-tripping both prior states through the same function
 * the component builds its restore with.
 */
describe("the switch's undo", () => {
  const mats = ["Query letter", "Synopsis"];

  it("restores a loose list that attaching cleared", () => {
    /* prior state: no link, two materials */
    const restore = materialsLinkWrites({ packageId: "", materials: mats });
    expect(restore.packageId).toBe("");
    expect(restore.materialsWanted).toEqual(mats);
  });

  it("restores a prior link as a link, with nothing loose beside it", () => {
    const restore = materialsLinkWrites({ packageId: "pkg-a", materials: [] });
    expect(restore.packageId).toBe("pkg-a");
    expect(restore.materialsWanted).toEqual([]);
  });

  it("never returns a state holding both a link and a list", () => {
    for (const args of [
      { packageId: "pkg-a", materials: mats },
      { packageId: "", materials: mats },
      { packageId: "pkg-a", materials: [] },
      { packageId: "", materials: [] },
    ]) {
      const r = materialsLinkWrites(args);
      expect(!!r.packageId && r.materialsWanted.length > 0).toBe(false);
    }
  });

  /**
   * ⚠️ AND THE COMPONENT MUST UNDO THROUGH THAT INVERSE, not through the forward writer.
   * `setQueryPackage` only takes a package id — it cannot carry materials back — so an undo wired
   * to it is the bug above by construction, whatever the surrounding code intends.
   */
  it("changeQueryPackage undoes with the built restore, not with setQueryPackage", () => {
    const fn = decls(sliceBetween(read("src/components/Queries.tsx"),
      "const changeQueryPackage", "const removeQueryPackage"));
    expect(fn).toContain("materialsLinkWrites({ packageId: before, materials: beforeMats })");
    expect(fn).toMatch(/undo:\s*\(\)\s*=>\s*void updateQuery\(q\.id, restore\)/);
    expect(fn, "the undo still routes through the forward writer").not.toMatch(
      /undo:\s*\(\)\s*=>\s*void setQueryPackage/,
    );
  });
});
