/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v40 — the lifecycle, the copy and the one model of the figures (lib/packagesV40). L3 is the
 * stage table. The figures are asserted against Versions v2's own helpers (a second route), never typed twice.
 */
import { describe, expect, it } from "vitest";
import { ComponentType, QueryStatus, type ManuscriptVersion, type Query, type SubmissionPackage } from "../types";
import type { AnalyticsRow } from "./analytics";
import { isMore, isReply } from "./versionsV2";
import {
  canDelete, canMakeActive, canRetire, copyFields, copyToast, deleteLabel, factsOf, headToHeadDefaults, headToHeadVerdict,
  matLeader, matVerdict, MIN_SENT_FOR_RATE, nextCopyName, orderMatCards, packageStage, pieceOf, piecesDiffer, rankColumn,
  shareText, shelfPackages, testFooter, testState, workbenchPackages, type Facts,
} from "./packagesV40";

const pkg = (over: Partial<SubmissionPackage>): SubmissionPackage => ({
  id: "p", userId: "u", manuscriptId: "m", packageName: "P", queryLetterVersionId: "", synopsisVersionId: "",
  samplePagesVersionId: "", status: "Active", createdDate: "2026-01-01", ...over,
});
const q = (id: string, status: QueryStatus, over: Partial<Query> = {}): Query => ({ id, status, manuscriptId: "m", ...over } as unknown as Query);
const row = (o: Partial<AnalyticsRow>): AnalyticsRow => o as AnalyticsRow;

describe("L3 · the stage table", () => {
  const cases: [string, Partial<SubmissionPackage>, ReturnType<typeof packageStage>][] = [
    ["empty", {}, "draft"],
    ["a letter only", { queryLetterVersionId: "L" }, "draft"],
    ["pages only", { bookVersionId: "V" }, "draft"],
    ["a letter and pages", { queryLetterVersionId: "L", bookVersionId: "V" }, "ready"],
    ["a letter and pages, synopsis missing, is still Ready", { queryLetterVersionId: "L", bookVersionId: "V", synopsisVersionId: "" }, "ready"],
    ["gone out", { queryLetterVersionId: "L", bookVersionId: "V", firstSentAt: "2026-01-02" }, "out"],
    ["gone out with nothing in it", { firstSentAt: "2026-01-02" }, "out"],
    ["retired", { status: "Retired", firstSentAt: "2026-01-02" }, "retired"],
    ["retired before going out", { status: "Retired" }, "retired"],
  ];
  for (const [name, over, want] of cases) it(name, () => expect(packageStage(pkg(over))).toBe(want));
});

describe("A · what each stage offers", () => {
  const draft = pkg({ id: "d" }), ready = pkg({ id: "r", queryLetterVersionId: "L", bookVersionId: "V" });
  const out = pkg({ id: "o", firstSentAt: "x" }), ret = pkg({ id: "t", status: "Retired", firstSentAt: "x" });
  it("Make active: Ready, or out and not active", () => {
    expect(canMakeActive(draft, null)).toBe(false);
    expect(canMakeActive(ready, null)).toBe(true);
    expect(canMakeActive(out, null)).toBe(true);
    expect(canMakeActive(out, "o")).toBe(false);
    expect(canMakeActive(ret, null)).toBe(false);
  });
  it("Retire: out and not active", () => {
    expect(canRetire(out, null)).toBe(true);
    expect(canRetire(out, "o")).toBe(false);
    expect(canRetire(ready, null)).toBe(false);
  });
  it("Delete: never gone out — Delete draft on a Draft, Delete on Ready", () => {
    expect(canDelete(draft)).toBe(true);
    expect(canDelete(ready)).toBe(true);
    expect(canDelete(out)).toBe(false);
    expect(canDelete(ret)).toBe(false);
    expect(deleteLabel(draft)).toBe("Delete draft");
    expect(deleteLabel(ready)).toBe("Delete");
  });
  it("L4 · the shelf is Out and Retired (active first, retired last); the workbench Draft and Ready", () => {
    const all = [draft, ready, pkg({ id: "o2", firstSentAt: "x", createdDate: "2026-03-01" }), ret, out];
    expect(shelfPackages(all, "o").map((p) => p.id)).toEqual(["o", "o2", "t"]);
    expect(workbenchPackages(all).map((p) => p.id)).toEqual(["d", "r"]);
  });
});

describe("A4 · New package from this", () => {
  it("names the copy “{name} 2”, or the next free number", () => {
    expect(nextCopyName("Standard UK", [])).toBe("Standard UK 2");
    expect(nextCopyName("Standard UK", ["Standard UK 2", "Standard UK 3"])).toBe("Standard UK 4");
  });
  it("L2 · the copy carries the same pieces, extras, icon and note, nothing sent, and copiedFromId", () => {
    const src = pkg({ id: "k1", packageName: "Standard", queryLetterVersionId: "L", synopsisVersionId: "S", bookVersionId: "V",
      extraIds: ["e1"], otherMaterials: "Author bio", icon: "crown", note: "For most UK agents", firstSentAt: "x", edition: 2 });
    const c = copyFields(src, ["Standard"]);
    expect(c).toMatchObject({ packageName: "Standard 2", queryLetterVersionId: "L", synopsisVersionId: "S", bookVersionId: "V",
      extraIds: ["e1"], otherMaterials: "Author bio", icon: "crown", note: "For most UK agents", copiedFromId: "k1" });
    expect(c).not.toHaveProperty("firstSentAt");
    expect(c).not.toHaveProperty("edition");
    expect(c.extraIds).not.toBe(src.extraIds);
    expect(copyToast("Standard 2", "Standard")).toBe("Made Standard 2 from Standard. Standard stays as it was.");
  });
});

describe("H · the figures follow Versions v2", () => {
  const rows = new Map<string, AnalyticsRow>([
    ["a", row({ reachedRequest: false, hasResponded: false })],
    ["b", row({ reachedRequest: false, hasResponded: true, replyDays: 10 })],
    ["c", row({ reachedRequest: true, hasResponded: true, replyDays: 20 })],
    ["d", row({ reachedRequest: true, reachedFull: true, hasResponded: true })],
    ["e", row({ reachedRequest: false, hasResponded: false })],
    ["w", row({ reachedRequest: true, hasResponded: true })],
  ]);
  const qs = [q("a", QueryStatus.QUERIED), q("b", QueryStatus.REJECTED), q("c", QueryStatus.PARTIAL_REQUESTED),
    q("d", QueryStatus.FULL_REQUESTED), q("e", QueryStatus.NO_RESPONSE), q("w", QueryStatus.WITHDRAWN)];
  it("withdrawn is not sent; asked for more and replied are Versions v2's isMore / isReply", () => {
    const f = factsOf(qs, rows);
    const counted = qs.filter((x) => x.status !== QueryStatus.WITHDRAWN);
    expect(f.n).toBe(5);
    expect(f.more).toBe(counted.filter((x) => isMore(x, rows)).length);
    expect(f.replied).toBe(counted.filter((x) => isReply(x, rows)).length);
    expect(f.full).toBe(1);
    expect(f.days).toBe(15);
    expect(f.pct).toBe(40);
    expect(shareText(f)).toBe("40%");
  });
  it(`under ${MIN_SENT_FOR_RATE} sent: no percentage, "{q} of {n}", early`, () => {
    const f = factsOf(qs.slice(1, 5), rows);
    expect(f.n).toBe(4);
    expect(f.pct).toBeNull();
    expect(f.early).toBe(true);
    expect(shareText(f)).toBe("2 of 4");
  });
});

describe("H3 · a piece is credited from what the query recorded", () => {
  const mats = [
    { id: "L1", componentType: ComponentType.QUERY_LETTER }, { id: "L2", componentType: ComponentType.QUERY_LETTER },
    { id: "S1", componentType: ComponentType.SYNOPSIS },
  ] as ManuscriptVersion[];
  const packages = [pkg({ id: "k", queryLetterVersionId: "L1", synopsisVersionId: "" })];
  const ctx = { packages, materials: mats, versions: [] };
  it("sentVersions wins, whichever package it was in", () => {
    const x = q("x", QueryStatus.QUERIED, { sentHow: "package", sentPackageId: "k", packageId: "k", sentVersions: ["L2", "S1"] } as Partial<Query>);
    expect(pieceOf(x, "let", ctx)).toBe("L2");
    expect(pieceOf(x, "syn", ctx)).toBe("S1");
  });
  it("a recorded send with no synopsis is the No synopsis bucket", () => {
    const x = q("x", QueryStatus.QUERIED, { sentHow: "individual", sentVersions: ["L1"] } as Partial<Query>);
    expect(pieceOf(x, "syn", ctx)).toBe("none");
  });
  it("an older query falls back to its package's credited edition", () => {
    const x = q("x", QueryStatus.QUERIED, { packageId: "k" } as Partial<Query>);
    expect(pieceOf(x, "let", ctx)).toBe("L1");
    expect(pieceOf(x, "syn", ctx)).toBe("none");
  });
  it("a query that recorded nothing is credited to no piece", () => {
    expect(pieceOf(q("x", QueryStatus.QUERIED), "let", ctx)).toBeNull();
    expect(pieceOf(q("x", QueryStatus.QUERIED), "syn", ctx)).toBeNull();
  });
});

const F = (n: number, more: number): Facts => ({ n, more, replied: more, full: 0, days: null, raw: n ? Math.round((more / n) * 100) : 0, pct: n >= 5 ? Math.round((more / n) * 100) : null, early: n < 5 });

describe("F · the Packages tab's words", () => {
  const A = pkg({ id: "a", packageName: "Standard UK", queryLetterVersionId: "L1", synopsisVersionId: "S1", bookVersionId: "V1" });
  const B = pkg({ id: "b", packageName: "Standard UK 2", queryLetterVersionId: "L2", synopsisVersionId: "S1", bookVersionId: "V1", copiedFromId: "a", createdDate: "2026-02-01" });
  const join = (v: { lead: string; rest: string }) => `${v.lead} ${v.rest}`;
  it("the verdict: too early, too close, ahead — with the likely reason when one piece differs", () => {
    const d = piecesDiffer(A, B);
    expect(d.map((x) => x[0])).toEqual(["let"]);
    expect(join(headToHeadVerdict(A.packageName, B.packageName, d, F(5, 2), F(4, 1)))).toBe("Only the letter differs. Too early to call: 5 and 4 sent. Each needs 5 before it counts.");
    /* 10 points is a lead; under 10 is too close (45 against 50 here) */
    expect(join(headToHeadVerdict(A.packageName, B.packageName, d, F(20, 9), F(20, 10)))).toBe("Only the letter differs. Too close to call: 45% against 50%. Keep sending.");
    expect(join(headToHeadVerdict(A.packageName, B.packageName, d, F(10, 2), F(10, 5)))).toBe("Only the letter differs, so that’s the likely reason. Standard UK 2 is ahead: 50% asked for more, against 20%.");
    expect(join(headToHeadVerdict(A.packageName, B.packageName, [], F(10, 2), F(10, 5)))).toBe("They’re the same mix. Standard UK 2 is ahead: 50% asked for more, against 20%.");
  });
  it("L5 · a test's state and footer follow 5 sent and the 10-point rule", () => {
    expect(testState({ name: "A", f: F(5, 2) }, { name: "B", f: F(4, 1) })).toEqual({ k: "run", label: "Running" });
    expect(testFooter(F(5, 2), F(4, 1))).toBe("Each side needs 5 sent. 1 to go.");
    expect(testState({ name: "A", f: F(20, 9) }, { name: "B", f: F(20, 10) }).label).toBe("Too close to call");
    expect(testState({ name: "A", f: F(10, 4) }, { name: "B", f: F(10, 5) }).label).toBe("B ahead"); // exactly 10 points
    expect(testState({ name: "A", f: F(10, 2) }, { name: "B", f: F(10, 5) }).label).toBe("B ahead");
  });
  it("defaults: A the active package, B the newest copied from it", () => {
    const C = pkg({ id: "c", packageName: "Other" });
    const d = headToHeadDefaults([C, A, B], "a", () => 0);
    expect([d.a?.id, d.b?.id]).toEqual(["a", "b"]);
  });
  it("a scoreboard column: rated first by share, early after, unsent out", () => {
    const r = rankColumn([{ id: "x", f: F(4, 4) }, { id: "y", f: F(10, 3) }, { id: "z", f: F(0, 0) }, { id: "w", f: F(5, 4) }]);
    expect(r.map((o) => o.id)).toEqual(["w", "y", "x"]);
  });
});

describe("G · the letters and synopses words", () => {
  it("too early, too close, ahead", () => {
    expect(matVerdict([{ id: "a", name: "Hook-first", f: F(7, 2) }, { id: "b", name: "Comps-forward", f: F(4, 1) }], "let"))
      .toEqual({ lead: "Too early to call.", rest: "Hook-first has 7 sent. One more letter needs 5 sent each before this compares them." });
    expect(matVerdict([{ id: "a", name: "A", f: F(20, 9) }, { id: "b", name: "B", f: F(20, 10) }], "let").lead).toBe("Too close to call.");
    const cards = [{ id: "a", name: "One-page", f: F(10, 6) }, { id: "none", name: "No synopsis", none: true, f: F(10, 2) }];
    expect(matVerdict(cards, "syn")).toEqual({ lead: "One-page is ahead.", rest: "60% asked for more from 10 sent, against 20% for no synopsis." });
    expect(matLeader(cards)?.id).toBe("a");
    expect(orderMatCards([cards[1], cards[0]]).map((c) => c.id)).toEqual(["a", "none"]);
  });
});
