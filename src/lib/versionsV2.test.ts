/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Versions v2 — the model (§DATA D1–D9) and the rulings R1–R13 that have logic. Each rule's case was proved red by
 * removing its fix before the green was trusted; the report lists each red-before.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus } from "../types";
import type { BookVersion, Manuscript, ManuscriptVersion, Query, SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import {
  MAX_CHANGES, MAX_CHANGE_LEN, MAX_VERSION_NAME, ORIGINAL_NAME, archiveVersion, bringBackVersion, changesProblem, childrenOf,
  deleteVersion, descendantsOf, editVersion, nameProblem, readVersions, saveNewVersion, setInUse, versionSeq, versionSnapshot,
  type VersionFields,
} from "./bookVersions";
import {
  MIN_SENT_FOR_RATE, carouselOrder, donut, inUseId, laterBy, leadingId, leagueOrder, pickerDefault, rated, resolveQueryVersion,
  savedBy, treeModel, versionAtLogging, versionColour, versionsModel, VERSION_NOT_SURE,
} from "./versionsV2";

const TODAY = "2026-10-23";
const base = (over: Partial<Manuscript> = {}): Manuscript => ({ id: "ms", userId: "u", title: "Murphy's Day Out", genre: "Thriller", ageCategory: "Adult", wordCount: 84100, logline: "", status: "Querying" as never, ...over } as Manuscript);
const apply = (ms: Manuscript, f: VersionFields | string): Manuscript => {
  if (typeof f === "string") throw new Error(`refused: ${f}`);
  return { ...ms, bookVersions: f.bookVersions, inUseBookVersionId: f.inUseBookVersionId ?? undefined, bookVersionSeq: f.bookVersionSeq ?? undefined };
};
const q = (id: string, over: Partial<Query> = {}): Query => ({ id, userId: "u", manuscriptId: "ms", agentId: "a", packageId: "", status: QueryStatus.QUERIED, dateSent: "2026-05-01T10:00:00.000Z", ...over } as Query);
const row = (id: string, over: Partial<AnalyticsRow> = {}): [string, AnalyticsRow] => [id, { id, sentMs: Date.parse("2026-05-01T10:00:00Z"), hasResponded: false, reachedRequest: false, reachedFull: false, reachedOffer: false, replyDays: null, ...over } as AnalyticsRow];

/** Original + Fast (in use, from Original) + Tighter (from Fast) + Dual (from Original). */
function seeded(): Manuscript {
  let ms = base();
  ms = apply(ms, saveNewVersion(ms, { name: "Fast-paced opening", changes: ["Cut the prologue"] }, "2026-03-03", { version: "v1", original: "v0" }));
  ms = apply(ms, saveNewVersion(ms, { name: "Tighter first chapter", changes: ["Trimmed chapter one"], parentId: "v1" }, "2026-09-01", { version: "v2" }));
  ms = apply(ms, saveNewVersion(ms, { name: "Dual timeline", changes: ["Alternates 1994"], parentId: "v0" }, "2026-09-10", { version: "v3" }));
  ms = apply(ms, setInUse(ms, "v1"));
  return ms;
}

describe("D5 / R1 — the first save creates Original, the permanent root", () => {
  it("creates Original (num 0, today, no word count of its own) and the new version (num 1, from Original, in use)", () => {
    const f = saveNewVersion(base(), { name: "Fast-paced opening", changes: ["Cut the prologue"] }, TODAY, { version: "v1", original: "v0" }) as VersionFields;
    expect(f.bookVersions.map((v) => [v.id, v.num, v.name, v.original ?? false, v.parentId ?? null])).toEqual([
      ["v0", 0, ORIGINAL_NAME, true, null], ["v1", 1, "Fast-paced opening", false, "v0"],
    ]);
    expect(f.bookVersions[0].createdDate).toBe(TODAY);
    expect(f.bookVersions[0].wordCount).toBeUndefined();
    expect(f.inUseBookVersionId).toBe("v1");
    expect(f.bookVersionSeq).toBe(1);
  });
  it("Original can be neither archived nor deleted, and an edit of it changes nothing", () => {
    const ms = seeded();
    expect(archiveVersion(ms, "v0", TODAY, "v1")).toBe("original");
    expect(deleteVersion(ms, "v0", "v1")).toBe("original");
    const f = editVersion(ms, "v0", { name: "Renamed", wordCount: 1 }, false) as VersionFields;
    expect(f.bookVersions.find((v) => v.id === "v0")?.name).toBe(ORIGINAL_NAME);
  });
  it("earlier queries count towards Original by date, with no per-query write (D4.3)", () => {
    const ms = seeded();
    const vs = readVersions(ms);
    expect(resolveQueryVersion(q("old", { dateSent: "2026-02-01T09:00:00.000Z" }), vs, [], [])).toEqual({ id: "v0", via: "original" });
    expect(resolveQueryVersion(q("sameday", { dateSent: "2026-03-03T22:00:00.000Z" }), vs, [], [])).toEqual({ id: "v0", via: "original" });
    expect(resolveQueryVersion(q("later", { dateSent: "2026-04-01T09:00:00.000Z" }), vs, [], [])).toBeNull();
  });
});

describe("D4 — the resolution order: the query's own, then its package's, then Original by date, else unrecorded", () => {
  const ms = seeded();
  const vs = readVersions(ms);
  const pkg = { id: "p1", manuscriptId: "ms", bookVersionId: "v3", queryLetterVersionId: "l", synopsisVersionId: "", samplePagesVersionId: "" } as SubmissionPackage;
  it("the query's own version wins over its package's, archived included", () => {
    const arch = apply(ms, archiveVersion(ms, "v2", TODAY, "v1"));
    expect(resolveQueryVersion(q("a", { bookVersionId: "v2", packageId: "p1" }), readVersions(arch), [pkg], [])?.id).toBe("v2");
  });
  it("the package's version, when the query names none", () => {
    expect(resolveQueryVersion(q("b", { packageId: "p1", dateSent: "2026-01-01T00:00:00Z" }), vs, [pkg], [])).toEqual({ id: "v3", via: "package" });
  });
  it("the package's sample material's version, when the package states none", () => {
    const p2 = { ...pkg, id: "p2", bookVersionId: undefined, samplePagesVersionId: "s1" } as SubmissionPackage;
    const mat = { id: "s1", componentType: "Sample Pages", bookVersionId: "v2" } as unknown as ManuscriptVersion;
    expect(resolveQueryVersion(q("c", { packageId: "p2" }), vs, [p2], [mat])?.id).toBe("v2");
  });
  it("\"Not sure yet\", said on purpose, stays unrecorded — the package and Original are not consulted", () => {
    expect(resolveQueryVersion(q("ns", { bookVersionId: VERSION_NOT_SURE, packageId: "p1", dateSent: "2026-01-01T00:00:00Z" }), vs, [pkg], [])).toBeNull();
  });
  it("R13 — an id that is not a version on this manuscript is ignored, never trusted", () => {
    expect(resolveQueryVersion(q("d", { bookVersionId: "other-book-v9" }), vs, [], [])).toBeNull();
  });
});

describe("D3a / R6 — a logged query records its package's version, else the in-use one", () => {
  const ms = seeded();
  it("the package's version wins over In use", () => {
    const pkg = { id: "p1", bookVersionId: "v3", samplePagesVersionId: "" } as SubmissionPackage;
    expect(versionAtLogging(ms, pkg, [pkg], [])).toBe("v3");
  });
  it("In use is the default when the package has none", () => {
    const pkg = { id: "p1", bookVersionId: "", samplePagesVersionId: "" } as SubmissionPackage;
    expect(versionAtLogging(ms, pkg, [pkg], [])).toBe("v1");
    expect(versionAtLogging(ms, null, [], [])).toBe("v1");
  });
  it("nothing is stamped on a manuscript with no versions", () => expect(versionAtLogging(base(), null, [], [])).toBeNull());
  it("addQuery stamps it, and skips an import (D7)", () => {
    const src = readFileSync(join(__dirname, "db.tsx"), "utf8");
    const at = src.indexOf("const stamp = versionAtLogging(");
    expect(at).toBeGreaterThan(0);
    expect(src.slice(at - 400, at)).toContain("!opts?.imported");
  });
});

describe("R2 — every version has exactly one parent, so the versions are always a tree", () => {
  const ms = seeded();
  const vs = readVersions(ms);
  it("descendants are found through every generation", () => expect([...descendantsOf(vs, "v1")]).toEqual(["v2"]));
  it("an unsent version cannot start from itself or a descendant", () => {
    expect(editVersion(ms, "v1", { parentId: "v1" }, false)).toBe("parent");
    expect(editVersion(ms, "v1", { parentId: "v2" }, false)).toBe("parent");
    expect(typeof editVersion(ms, "v2", { parentId: "v3" }, false)).toBe("object");
  });
  it("a sent version's parent is fixed", () => expect(editVersion(ms, "v2", { parentId: "v3" }, true)).toBe("parent"));
});

describe("R3 — what changed is a list of 1–8 items of 1–80 characters", () => {
  it("refuses none, more than eight, and one over eighty", () => {
    expect(changesProblem([])).toBe("none");
    expect(changesProblem(["  "])).toBe("none");
    expect(changesProblem(Array.from({ length: MAX_CHANGES + 1 }, (_, i) => `c${i}`))).toBe("many");
    expect(changesProblem(["x".repeat(MAX_CHANGE_LEN + 1)])).toBe("long");
    expect(changesProblem(["x".repeat(MAX_CHANGE_LEN)])).toBeNull();
  });
  it("a new version needs at least one change", () => {
    expect(saveNewVersion(seeded(), { name: "Empty", changes: [] }, TODAY, { version: "v9" })).toBe("changes");
  });
  it("the legacy read: a note with no changes reads as one change, and kind is ignored", () => {
    const legacy = base({ bookVersions: [{ id: "a", name: "Prologue first", kind: "initial", createdDate: "2026-01-01" }, { id: "b", name: "Fast", kind: "reordering", createdDate: "2026-02-01", note: "Cut the prologue" }] as BookVersion[] });
    const vs = readVersions(legacy);
    expect(vs.map((v) => [v.num, v.parentId, v.changes])).toEqual([[1, null, []], [2, "a", ["Cut the prologue"]]]);
  });
});

describe("R4 — a reply is any agent act; asked for more reads the HISTORY", () => {
  const ms = seeded();
  const qs = [
    q("q1", { bookVersionId: "v1", status: QueryStatus.REJECTED }),
    q("q2", { bookVersionId: "v1", status: QueryStatus.REJECTED }),
    q("q3", { bookVersionId: "v1" }),
    q("q4", { bookVersionId: "v1", status: QueryStatus.NO_RESPONSE }),
    q("q5", { bookVersionId: "v1", status: QueryStatus.WITHDRAWN }),
  ];
  const rows = new Map([
    /* asked for a partial, then passed: still asked for more */
    row("q1", { hasResponded: true, reachedRequest: true, replyDays: 9 }),
    row("q2", { hasResponded: true, replyDays: 20 }),
    row("q3"), row("q4"), row("q5", { reachedRequest: true }),
  ]);
  const m = versionsModel(ms, qs, [], [], rows);
  const f = m.facts.get("v1")!;
  it("a request that later passed still counts as asked for more", () => expect(f.more.map((x) => x.id)).toEqual(["q1"]));
  it("a pass is a reply; no reply and still waiting are not", () => expect(f.replied.map((x) => x.id).sort()).toEqual(["q1", "q2"]));
  it("D6 — Withdrawn is listed but never counted", () => {
    expect(f.n).toBe(4);
    expect(f.all.map((x) => x.id)).toContain("q5");
    expect(m.sentTotal).toBe(4);
  });
  it("the funnel is monotonic: sent ≥ replied ≥ asked for more ≥ offer", () => {
    expect(f.n >= f.replied.length && f.replied.length >= f.more.length && f.more.length >= f.offers.length).toBe(true);
  });
  it("average reply is over the replies that have a date", () => expect([f.avgReply, f.replyN]).toEqual([15, 2]));
});

describe("R5 — percentages, ranking first and Leading only from 5 sent", () => {
  const ms = seeded();
  const mk = (ver: string, n: number, more: number, pre: string) => Array.from({ length: n }, (_, i) => [q(`${pre}${i}`, { bookVersionId: ver }), row(`${pre}${i}`, { reachedRequest: i < more, hasResponded: i < more })] as const);
  const set = [...mk("v1", 5, 1, "a"), ...mk("v2", 4, 4, "b"), ...mk("v3", 6, 3, "c")];
  const m = versionsModel(ms, set.map((s) => s[0]), [], [], new Map(set.map((s) => s[1])));
  const fs = m.live.map((v) => m.facts.get(v.id)!);
  it("a version with fewer than 5 sent has no rate — counts only", () => {
    expect(m.facts.get("v2")!.ratePct).toBeNull();
    expect(m.facts.get("v2")!.early).toBe(true);
    expect(m.facts.get("v1")!.ratePct).toBe(20);
    expect(MIN_SENT_FOR_RATE).toBe(5);
  });
  it("only rated versions can be ranked first or Leading, though 4 of 4 is the highest share", () => {
    expect(rated(fs).map((f) => f.v.id)).toEqual(["v3", "v1"]);
    expect(leadingId(fs)).toBe("v3");
    expect(carouselOrder(fs, "rate").map((f) => f.v.id).slice(0, 3)).toEqual(["v3", "v1", "v2"]);
    expect(leagueOrder(fs, "rate")[0].v.id).toBe("v3");
  });
  it("no Leading when only one version is rated, or on a tie", () => {
    expect(leadingId(fs.filter((f) => f.v.id !== "v1"))).toBeNull();
  });
});

describe("R7 — exactly one in use, and it cannot be archived", () => {
  const ms = seeded();
  it("one write replaces the previous value", () => expect((setInUse(ms, "v3") as VersionFields).inUseBookVersionId).toBe("v3"));
  it("the in-use version cannot be archived or deleted", () => {
    expect(archiveVersion(ms, "v1", TODAY, "v1")).toBe("inUse");
    expect(deleteVersion(ms, "v1", "v1")).toBe("inUse");
  });
  it("an archived version cannot be put in use", () => {
    const arch = apply(ms, archiveVersion(ms, "v2", TODAY, "v1"));
    expect(setInUse(arch, "v2")).toBe("parent");
  });
  it("a pre-v2 manuscript reads the active package's version, else the newest live one", () => {
    const legacy = { ...ms, inUseBookVersionId: undefined };
    expect(inUseId(legacy, [])).toBe("v3");
    expect(inUseId({ ...legacy, activePackageId: "p" }, [{ id: "p", bookVersionId: "v2" } as SubmissionPackage])).toBe("v2");
  });
});

describe("R8 — archive keeps everything and can be undone; delete re-parents and is for never-sent versions only", () => {
  const ms = seeded();
  it("archive takes it off the list but keeps its queries and totals; bring back restores it", () => {
    const arch = apply(ms, archiveVersion(ms, "v2", TODAY, "v1"));
    const m = versionsModel(arch, [q("x", { bookVersionId: "v2" })], [], [], new Map([row("x")]));
    expect(m.live.map((v) => v.id)).not.toContain("v2");
    expect(m.facts.get("v2")!.n).toBe(1);
    expect(m.sentTotal).toBe(1);
    const back = apply(arch, bringBackVersion(arch, "v2"));
    expect(readVersions(back).find((v) => v.id === "v2")?.archived).toBe(false);
  });
  it("delete moves its children to its parent", () => {
    const del = apply(ms, deleteVersion(ms, "v1", "v3"));
    expect(readVersions(del).find((v) => v.id === "v2")?.parentId).toBe("v0");
    expect(childrenOf(readVersions(ms), "v1").map((v) => v.id)).toEqual(["v2"]);
  });
  it("an Undo is a snapshot: absent stays absent", () => {
    const snap = versionSnapshot(base());
    expect(snap).toEqual({ bookVersions: [], inUseBookVersionId: null, bookVersionSeq: null });
  });
});

describe("R9 — version numbers are never reused", () => {
  it("after deleting the highest, the next save takes a new number", () => {
    let ms = seeded();
    expect(versionSeq(ms)).toBe(3);
    ms = apply(ms, deleteVersion(ms, "v3", "v1"));
    ms = apply(ms, saveNewVersion(ms, { name: "Again", changes: ["x"], parentId: "v1" }, TODAY, { version: "v4" }));
    expect(readVersions(ms).find((v) => v.id === "v4")?.num).toBe(4);
  });
});

describe("R10 — names are unique per manuscript, ignoring case and spaces, and at most 40 characters", () => {
  const vs = readVersions(seeded());
  it("refuses a duplicate, an empty name and a long one", () => {
    expect(nameProblem("  fast-PACED opening ", vs)).toBe("taken");
    expect(nameProblem("   ", vs)).toBe("empty");
    expect(nameProblem("x".repeat(MAX_VERSION_NAME + 1), vs)).toBe("long");
    expect(nameProblem("Fast-paced opening", vs, "v1")).toBeNull();
  });
});

describe("R11 — a later-saved version may be assigned, with a soft warning", () => {
  const ms = seeded();
  const vs = readVersions(ms);
  it("savedBy compares the save day with the send day; Original was always saved", () => {
    expect(savedBy(vs.find((v) => v.id === "v2")!, "2026-08-01")).toBe(false);
    expect(savedBy(vs.find((v) => v.id === "v0")!, "2025-01-01")).toBe(true);
  });
  it("says how much later in days, weeks or months", () => {
    expect(laterBy("2026-05-06", "2026-05-01")).toBe("5 days");
    expect(laterBy("2026-06-01", "2026-05-01")).toBe("4 weeks");
    expect(laterBy("2026-09-01", "2026-05-01")).toBe("4 months");
  });
  it("auto-picks only when exactly one version existed by the send date", () => {
    /* Original always counts as saved by then, so a single fit is Original with every other version saved later */
    const two = base({ bookVersions: [
      { id: "o", name: ORIGINAL_NAME, kind: "initial", createdDate: "2026-03-03", num: 0, original: true },
      { id: "n", name: "New", kind: "revision", createdDate: "2026-06-01", num: 1, parentId: "o", changes: ["c"] },
    ] as BookVersion[], inUseBookVersionId: "n" });
    const m = versionsModel(two, [q("p", { dateSent: "2026-04-01T09:00:00Z" })], [], [], new Map([row("p")]));
    expect(pickerDefault(m.unrecorded[0], m)).toBe("o");
    const m2 = versionsModel(two, [q("r", { dateSent: "2026-10-01T09:00:00Z" })], [], [], new Map([row("r")]));
    expect(pickerDefault(m2.unrecorded[0], m2)).toBeNull();
  });
});

describe("R12 — the donut: Original navy, later versions lighter by number, Not recorded striped", () => {
  it("interpolates exactly as the ref's sh()", () => {
    expect(versionColour(0, 4)).toBe("rgb(42,58,82)");
    expect(versionColour(4, 4)).toBe("rgb(197,208,224)");
  });
  it("shows up to four versions, the in-use one always among them, then the rest, then Not recorded", () => {
    let ms = seeded();
    for (let i = 4; i <= 7; i++) ms = apply(ms, saveNewVersion(ms, { name: `V${i}`, changes: ["c"], parentId: "v0" }, TODAY, { version: `v${i}` }));
    ms = apply(ms, setInUse(ms, "v7"));
    const qs: Query[] = []; const rows: [string, AnalyticsRow][] = [];
    for (const [ver, n] of [["v0", 6], ["v1", 5], ["v2", 4], ["v3", 3], ["v7", 1]] as const) for (let i = 0; i < n; i++) { qs.push(q(`${ver}-${i}`, { bookVersionId: ver, dateSent: "2026-10-20T09:00:00Z" })); rows.push(row(`${ver}-${i}`)); }
    qs.push(q("none", { dateSent: "2026-10-20T09:00:00Z" })); rows.push(row("none"));
    const d = donut(versionsModel(ms, qs, [], [], new Map(rows)));
    expect(d.map((s) => s.name)).toEqual(["Original", "Fast-paced opening", "Tighter first chapter", "V7", "1 other version", "Not recorded"]);
    expect(d.find((s) => s.inUse)?.versionId).toBe("v7");
  });
});

describe("the family tree", () => {
  it("columns by generation, the route to the in-use version, and archived parents kept while a child is live", () => {
    let ms = seeded();
    ms = apply(ms, setInUse(ms, "v2"));
    ms = apply(ms, setInUse(ms, "v3"));
    ms = apply(ms, archiveVersion(ms, "v1", TODAY, "v3"));
    const t = treeModel(versionsModel(ms, [], [], [], new Map()));
    expect(t.cols.map((c) => c.map((v) => v.id))).toEqual([["v0"], ["v1", "v3"], ["v2"]]);
    expect([...t.path].sort()).toEqual(["v0", "v3"]);
  });
});

describe("the rules carry the new fields (artefact lock)", () => {
  const rules = readFileSync(join(__dirname, "..", "..", "firestore.rules"), "utf8");
  it("a query may store bookVersionId, and so may an update", () => {
    expect(rules).toContain("data.get('bookVersionId', null) == null || isValidId(data.bookVersionId)");
    expect(rules).toMatch(/'sentPackageName',\s*\n\s*\/\/ Versions v2 \(D3\)[^\n]*\n\s*'bookVersionId'/);
  });
  it("a manuscript may store the in-use version and the number sequence", () => {
    expect(rules).toContain("'inUseBookVersionId', 'bookVersionSeq',");
    expect(rules).toContain("isValidId(data.inUseBookVersionId)");
  });
});
