/**
 * PE1–PE4 · Part B of "Packages through the journey" (28 Sep): editions, results, locked versions.
 *
 * ⚠️ RESULTS ARE FED THROUGH ANALYTICS' OWN `buildRows`, never hand-typed rows — the first answer is
 * whatever that derivation says it is, so a fixture cannot agree with this module by construction.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import type { Activity, PackageEdition, Query, SubmissionPackage } from "../types";
import { QueryStatus } from "../types";
import { buildRows } from "./analytics";
import { contentsChanged, editionWarning, editionsOf, nextEdition, ordinal, summaryFrom } from "./packageEditions";
import { packageResults, rateLine, sentSpan } from "./packageResults";
import { isVersionSent, lockedEditLine, nextVersionName } from "./versionLock";
import { sentRecordOf, sentHowWords } from "./queryActions/sentRecord";

const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const decls = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const PKG: SubmissionPackage = {
  id: "p1", userId: "u", manuscriptId: "m", packageName: "Standard", queryLetterVersionId: "ql3",
  synopsisVersionId: "syn2", samplePagesVersionId: "", bookVersionId: "bv1", status: "Active",
  createdDate: "2026-06-01T09:00:00.000Z",
};
const SENT = { ...PKG, firstSentAt: "2026-06-12T09:00:00.000Z" };
const VERSIONS = [
  { id: "ql3", versionName: "Query letter v3" }, { id: "ql4", versionName: "Query letter v4" }, { id: "syn2", versionName: "Synopsis v2" },
];
const BOOKS = [{ id: "bv1", name: "Fast-paced opening" }];
const sum = summaryFrom(VERSIONS, BOOKS);

describe("PE1 · an edition is a change of CONTENTS, and only once the package has gone out", () => {
  it("contents are the letter, the synopsis, the book version and the other materials", () => {
    expect(contentsChanged(PKG, { ...PKG, queryLetterVersionId: "ql4" })).toBe(true);
    expect(contentsChanged(PKG, { ...PKG, synopsisVersionId: "" })).toBe(true);
    expect(contentsChanged(PKG, { ...PKG, bookVersionId: undefined })).toBe(true);
    expect(contentsChanged(PKG, { ...PKG, otherMaterials: "Author bio" })).toBe(true);
  });
  it("the sample's size, a rename and the note are NOT contents (Nick, 28 Sep)", () => {
    const next = { ...PKG, samplePagesVersionId: "anything", packageName: "Renamed", note: "n" } as SubmissionPackage;
    expect(contentsChanged(PKG, next)).toBe(false);
    expect(nextEdition(SENT, next, "2026-09-02T09:00:00.000Z", sum)).toBeNull();
  });
  it("an unsent package's contents change without starting anything", () => {
    expect(nextEdition(PKG, { ...PKG, queryLetterVersionId: "ql4" }, "2026-09-02T09:00:00.000Z", sum)).toBeNull();
    expect(editionWarning(PKG, { ...PKG, queryLetterVersionId: "ql4" })).toBeNull();
  });
  it("a sent package's contents change starts the next edition and KEEPS the earlier one", () => {
    const b = nextEdition(SENT, { ...SENT, queryLetterVersionId: "ql4" }, "2026-09-02T09:00:00.000Z", sum)!;
    expect(b.edition).toBe(2);
    expect(b.editions.map((e) => e.n)).toEqual([1, 2]);
    expect(b.editions[0]).toMatchObject({ queryLetterVersionId: "ql3", startedAt: PKG.createdDate, summary: "Query letter v3 · Synopsis v2 · Fast-paced opening" });
    expect(b.editions[1]).toMatchObject({ queryLetterVersionId: "ql4", startedAt: "2026-09-02T09:00:00.000Z", versions: ["ql4", "syn2"] });
  });
  it("a third edition appends to the stored list, never rewriting it", () => {
    const two = { ...SENT, queryLetterVersionId: "ql4", ...nextEdition(SENT, { ...SENT, queryLetterVersionId: "ql4" }, "2026-09-02T09:00:00.000Z", sum)! };
    const b = nextEdition(two, { ...two, synopsisVersionId: "" }, "2026-09-20T09:00:00.000Z", sum)!;
    expect(b.edition).toBe(3);
    expect(b.editions.slice(0, 2)).toEqual(two.editions);
  });
  it("the edit screen's warning names both editions", () => {
    expect(editionWarning(SENT, { ...SENT, queryLetterVersionId: "ql4" })).toBe("This starts Standard's 2nd edition. Queries already sent keep the 1st.");
  });
  it("a package written before editions reads as its 1st, started on its createdDate", () => {
    expect(editionsOf(SENT, sum)).toEqual([expect.objectContaining({ n: 1, startedAt: PKG.createdDate })]);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23].map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "11th", "12th", "13th", "21st", "22nd", "23rd"]);
  });
});

/* ── results, through the real derivation ── */
const DAY = 86_400_000;
const T0 = Date.parse("2026-06-15T09:00:00.000Z");
let aid = 0;
const act = (queryId: string, status: QueryStatus, day: number): Activity =>
  ({ id: `a${++aid}`, queryId, resultingStatus: status, date: new Date(T0 + day * DAY).toISOString() } as unknown as Activity);
const q = (id: string, status: QueryStatus, over: Partial<Query> = {}): Query =>
  ({ id, userId: "u", manuscriptId: "m", agentId: `ag-${id}`, packageId: "p1", sentHow: "package", sentPackageId: "p1",
     sentPackageEdition: 1, sentMaterials: "Standard package: Query letter v3", status, dateSent: new Date(T0).toISOString(), ...over } as unknown as Query);

const QS: Query[] = [
  q("pass", QueryStatus.REJECTED),
  q("req-then-pass", QueryStatus.REJECTED),
  q("offer", QueryStatus.OFFER),
  q("noreply", QueryStatus.NO_RESPONSE),
  q("out", QueryStatus.QUERIED),
  q("wd", QueryStatus.WITHDRAWN),
  q("ed2", QueryStatus.QUERIED, { sentPackageEdition: 2 }),
  q("based", QueryStatus.PARTIAL_REQUESTED, { sentHow: "individual", packageId: "", sentPackageId: undefined, basedOnPackageId: "p1", basedOnPackageEdition: 1 }),
];
const ACTS = [
  act("pass", QueryStatus.QUERIED, 0), act("pass", QueryStatus.REJECTED, 10),
  act("req-then-pass", QueryStatus.QUERIED, 0), act("req-then-pass", QueryStatus.PARTIAL_REQUESTED, 5), act("req-then-pass", QueryStatus.REJECTED, 30),
  act("offer", QueryStatus.QUERIED, 0), act("offer", QueryStatus.FULL_REQUESTED, 3), act("offer", QueryStatus.OFFER, 40),
  act("noreply", QueryStatus.QUERIED, 0), act("noreply", QueryStatus.NO_RESPONSE, 60),
  act("out", QueryStatus.QUERIED, 0), act("wd", QueryStatus.QUERIED, 0), act("wd", QueryStatus.WITHDRAWN, 4),
  act("ed2", QueryStatus.QUERIED, 80), act("based", QueryStatus.QUERIED, 0), act("based", QueryStatus.PARTIAL_REQUESTED, 6),
];
const ROWS = new Map(buildRows(QS, ACTS, [], T0 + 100 * DAY).map((r) => [r.id, r]));

describe("PE4 · the six tiles (§C4) — the FIRST answer decides the column", () => {
  const r = packageResults("p1", 1, QS, ROWS);
  it("a request that later became a pass counts as a request; an offer is a subset, not a column", () => {
    expect({ sent: r.sent, out: r.out, requests: r.requests, offers: r.offers, passes: r.passes, noReply: r.noReply })
      .toEqual({ sent: 6, out: 1, requests: 2, offers: 1, passes: 1, noReply: 1 });
  });
  it("withdrawn before any answer is in neither answered nor still out, and is noted", () => {
    expect(r.withdrawnEarly).toBe(1);
    expect(r.answered).toBe(r.requests + r.passes + r.noReply);
    expect(r.sent).toBe(r.answered + r.out + r.withdrawnEarly);
  });
  it("the rate counts only answered queries", () => {
    expect(rateLine(r)).toBe("2 in 4 answered");
    expect(rateLine({ requests: 0, answered: 0 })).toBe("None answered yet");
  });
  it("sent with changes, based on this edition, is listed and never counted", () => {
    expect(r.withChanges).toEqual(["based"]);
    expect(r.rows.map((x) => x.id)).not.toContain("based");
  });
  it("editions are counted apart, and All editions is their sum", () => {
    const two = packageResults("p1", 2, QS, ROWS);
    const all = packageResults("p1", null, QS, ROWS);
    expect(two.sent).toBe(1);
    expect(all.sent).toBe(r.sent + two.sent);
    expect(all.out).toBe(r.out + two.out);
  });
  it("dates use a fixed month table — never en-GB's \"Sept\"", async () => {
    const { lockLine } = await import("./packagesPage");
    expect(lockLine("2026-09-06T09:00:00.000Z")).toContain("First sent on 6 Sep,");
  });
  it("the SENT subline: since for the current edition, a range for a past one", () => {
    expect(sentSpan(r, false)).toBe("Since 15 Jun");
    expect(sentSpan({ sent: 2, firstSentMs: T0, lastSentMs: T0 + 30 * DAY }, true)).toBe("15 Jun – 15 Jul");
    expect(sentSpan({ sent: 0, firstSentMs: null, lastSentMs: null }, false)).toBe("None yet");
  });
  it("undo, corrections and deletes move the results by themselves: nothing is stored", () => {
    const without = packageResults("p1", 1, QS.filter((x) => x.id !== "offer"), ROWS);
    expect(without.offers).toBe(0);
    expect(without.requests).toBe(1);
  });
});

describe("PE3 · a sent version is locked; editing it makes the next one", () => {
  it("a version in any query's snapshot is sent", () => {
    expect(isVersionSent("ql3", [{ packageId: "", sentVersions: ["ql3"] }], [])).toBe(true);
    expect(isVersionSent("ql4", [{ packageId: "", sentVersions: ["ql3"] }], [])).toBe(false);
  });
  it("an older query records only its package — every edition that package has had could be it", () => {
    const e1 = { n: 1, startedAt: "", summary: "", versions: ["ql2"], queryLetterVersionId: "ql2", synopsisVersionId: "" } as PackageEdition;
    const pkgs = [{ ...SENT, editions: [e1] }];
    expect(isVersionSent("ql3", [{ packageId: "p1" }], pkgs)).toBe(true);
    expect(isVersionSent("ql2", [{ packageId: "p1" }], pkgs)).toBe(true);
    expect(isVersionSent("syn9", [{ packageId: "p1" }], pkgs)).toBe(false);
  });
  it("the next version's name, and the sentence the edit screen says", () => {
    expect(nextVersionName("Query letter v3")).toBe("Query letter v4");
    expect(nextVersionName("Query letter v3", ["Query letter v4"])).toBe("Query letter v5");
    expect(nextVersionName("My letter")).toBe("My letter v2");
    expect(lockedEditLine("Query letter v3", "Query letter v4")).toBe("v3 has been sent, so your changes become v4.");
  });
  it("the store refuses a content edit on a sent version; a rename stays allowed", () => {
    const db = decls(read("src/lib/db.tsx"));
    const fn = db.slice(db.indexOf("const updateVersion = async"), db.indexOf("const deleteVersion = async"));
    expect(fn).toContain('["contentDraft", "fileAttached", "fileName", "contentType", "contentLink", "wordCount"]');
    expect(fn).toContain("content && isVersionSent(id, queries, packages)");
    expect(fn).not.toMatch(/"versionName"\s*,\s*"contentDraft"[^\]]*\]\s*as const\)\.some/);
  });
});

describe("sentPackageName — the name as it was on the day (Nick, 28 Sep)", () => {
  it("readers prefer the field, then fall back to the summary's prefix", () => {
    expect(sentRecordOf({ sentHow: "package", sentPackageId: "p1", sentPackageName: "Standard", sentMaterials: "Old name package: x" }).packageName).toBe("Standard");
    expect(sentRecordOf({ sentHow: "package", sentPackageId: "p1", sentMaterials: "Old name package: x" }).packageName).toBe("Old name");
    expect(sentRecordOf({ sentHow: "individual", sentPackageName: "Standard" }).packageName).toBeNull();
    expect(sentHowWords({ sentHow: "package", sentPackageId: "p1", sentPackageName: "Standard" }, "Live")).toBe("Sent as the Standard package");
  });
  it("both writers set it: the log, and a correction (cleared when the correction is not a package)", () => {
    expect(decls(read("src/components/queryActions/journeys/LogJourney.tsx"))).toContain("sentPackageName: pkCard.name");
    expect(decls(read("src/components/queryActions/journeys/EditJourney.tsx"))).toContain("sentPackageName: next.id ? (next.name ?? none) : none");
  });
});

describe("PE2 · the rule allows a sent package's contents to change ONLY by starting its next edition", () => {
  const rules = decls(read("firestore.rules"));
  const i = rules.indexOf("match /packages/{packageId}");
  const block = rules.slice(i, rules.indexOf("match /attachments/", i));
  it("up by exactly one, the list longer by exactly one, stamp and sample slot untouched", () => {
    expect(block).toContain("incoming().get('edition', 1) == existing().get('edition', 1) + 1");
    expect(block).toContain("incoming().get('editions', []).size() == existing().get('editions', [0]).size() + 1");
  });
  it("the stale-stamp lift removes the stamp and changes nothing else", () => {
    expect(block).toMatch(/affectedKeys\(\)\.hasOnly\(\['firstSentAt'\]\)\s*&& !incoming\(\)\.keys\(\)\.hasAny\(\['firstSentAt'\]\)/);
  });
  it("the three new fields are validated and allowlisted", () => {
    for (const k of ["edition", "editions", "retiredAt"]) {
      expect(rules).toContain(`!data.keys().hasAny(['${k}'])`);
      expect(block).toContain(`'${k}'`);
    }
    expect(rules).toContain("data.sentPackageName is string");
  });
});

describe("the stale-stamp rule is reconciled after every undo and correction", () => {
  it("undo reconciles every package the query pointed at, before AND after the save", () => {
    const d = decls(read("src/components/queryActions/QueryDrawer.tsx"));
    expect(d).toMatch(/const after = await packagesHeldBy\(uid, snap\.queryIds\);\s*await restoreSnapshot\(snap\);\s*await db\.reconcileStamps\(\[\.\.\.packagesIn\(snap\), \.\.\.after\]\);/);
  });
  it("a correction off a package reconciles the one it left", () => {
    expect(decls(read("src/components/queryActions/journeys/EditJourney.tsx"))).toMatch(/if \(sentChanged && oldPkg && oldPkg !== next\?\.id\) await db\.reconcileStamps\(\[oldPkg\]\);/);
  });
});
