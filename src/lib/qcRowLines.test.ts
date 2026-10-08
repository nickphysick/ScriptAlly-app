/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QC132 §3 — the list row's words: "Where it stands", "Next move" and the "What you sent" cell (§0.4:
 * a package send's tiles light from the edition that went).
 */
import { describe, it, expect } from "vitest";
import { QueryStatus, type SubmissionPackage } from "../types";
import type { QcRow } from "./qcSummary";
import { STAND_VERB, nextLine, sentCell, standLine } from "./qcRowLines";

const DAY = 86_400_000;
const NOW = Date.parse("2026-10-08T12:00:00Z");
const NONE = { queryLetter: null, synopsis: null, sample: null, other: null };
const COURT: Record<string, QcRow["court"]> = {
  [QueryStatus.QUERIED]: "agent", [QueryStatus.PARTIAL_SENT]: "agent", [QueryStatus.FULL_SENT]: "agent", [QueryStatus.RESUBMITTED]: "agent",
  [QueryStatus.PARTIAL_REQUESTED]: "you", [QueryStatus.FULL_REQUESTED]: "you", [QueryStatus.REVISE_RESUBMIT]: "you", [QueryStatus.OFFER]: "offer",
  [QueryStatus.REJECTED]: "closed", [QueryStatus.NO_RESPONSE]: "closed", [QueryStatus.WITHDRAWN]: "closed", [QueryStatus.SIGNED]: "closed",
};
const row = (status: QueryStatus, o: Partial<QcRow> & { q?: Record<string, unknown> } = {}): QcRow => {
  const { q, ...rest } = o;
  return {
    id: "q1", status, court: COURT[status], query: { id: "q1", status, ...q }, agentName: "Tom Ellery",
    sentMs: NOW - 40 * DAY, stageStartMs: NOW - 10 * DAY, expectedMs: null, materials: NONE, materialsRecorded: false,
    ...rest,
  } as unknown as QcRow;
};

describe("Where it stands — the sub-line", () => {
  it("one dating verb for every status", () => {
    for (const s of Object.values(QueryStatus)) expect(STAND_VERB[s], s).toBeTruthy();
  });
  it("the verb, the date the status began, the day count from the date queried", () => {
    expect(standLine(row(QueryStatus.PARTIAL_REQUESTED), NOW)).toBe("REQUESTED 28 SEP · DAY 40");
    expect(standLine(row(QueryStatus.QUERIED, { stageStartMs: NOW - 40 * DAY }), NOW)).toBe("QUERIED 29 AUG · DAY 40");
  });
  it("closed rows drop the day count", () => {
    expect(standLine(row(QueryStatus.REJECTED), NOW)).toBe("PASSED 28 SEP");
  });
  it("an undated status says so", () => {
    expect(standLine(row(QueryStatus.FULL_SENT, { stageStartMs: null }), NOW)).toBe("SENT · NOT DATED · DAY 40");
  });
});

describe("Next move — the phrase and its line", () => {
  it("a request over its date: N DAYS OVER, rust", () => {
    const n = nextLine(row(QueryStatus.PARTIAL_REQUESTED, { expectedMs: NOW - 8 * DAY }), null, NOW);
    expect(n).toEqual({ phrase: "Send partial", line: "8 DAYS OVER", hot: true });
  });
  it("a request with time left is ink, and turns rust at two days", () => {
    expect(nextLine(row(QueryStatus.FULL_REQUESTED, { expectedMs: NOW + 4 * DAY }), null, NOW)).toEqual({ phrase: "Send full", line: "BY 12 OCT · 4 DAYS", hot: false });
    expect(nextLine(row(QueryStatus.FULL_REQUESTED, { expectedMs: NOW + 2 * DAY }), null, NOW).hot).toBe(true);
  });
  it("an offer: the weekday, the days left", () => {
    expect(nextLine(row(QueryStatus.OFFER, { expectedMs: NOW + 1 * DAY }), null, NOW)).toEqual({ phrase: "Decide on offer", line: "BY FRI 9 OCT · 1 DAY LEFT", hot: true });
  });
  it("with the agent: waiting, reply due this week, nudge, consider closing — never rust", () => {
    expect(nextLine(row(QueryStatus.QUERIED, { expectedMs: NOW + 46 * DAY }), null, NOW)).toEqual({ phrase: "Waiting", line: "REPLY BY 23 NOV", hot: false });
    expect(nextLine(row(QueryStatus.QUERIED, { expectedMs: NOW + 1 * DAY }), null, NOW)).toEqual({ phrase: "Reply due", line: "BY FRI 9 OCT", hot: false });
    expect(nextLine(row(QueryStatus.QUERIED, { expectedMs: Date.parse("2026-06-11T12:00:00Z") }), null, NOW)).toEqual({ phrase: "Nudge", line: "OVERDUE SINCE 11 JUN", hot: false });
    const old = nextLine(row(QueryStatus.QUERIED, { sentMs: NOW - 913 * DAY, expectedMs: NOW - 800 * DAY }), null, NOW);
    expect(old).toEqual({ phrase: "Consider closing", line: "NO REPLY · 2.5 YEARS", hot: false });
  });
  it("closed: the outcome and when", () => {
    expect(nextLine(row(QueryStatus.REJECTED), null, NOW)).toEqual({ phrase: "Passed", line: "PASSED 28 SEP", hot: false });
  });
});

const PKG = {
  id: "p1", packageName: "Standard", createdDate: "2026-07-01", queryLetterVersionId: "ql2", synopsisVersionId: "syn1", bookVersionId: "bv1", otherMaterials: "",
  editions: [
    { n: 1, startedAt: "2026-07-01", summary: "", versions: [], queryLetterVersionId: "ql1", synopsisVersionId: "", bookVersionId: "bv1" },
    { n: 2, startedAt: "2026-08-01", summary: "", versions: [], queryLetterVersionId: "ql2", synopsisVersionId: "syn1", bookVersionId: "bv1" },
  ],
} as unknown as SubmissionPackage;

describe("What you sent — the cell (§0.4)", () => {
  it("a package send: the chip, and the tiles lit from the edition that went — not the current one", () => {
    const c = sentCell(row(QueryStatus.QUERIED, { q: { sentHow: "package", sentPackageId: "p1", sentPackageEdition: 1, sentPackageName: "Standard" } }), PKG, NOW);
    expect(c.slot.kind).toBe("package");
    expect(c.tiles.map((t) => `${t.kind}:${t.state}`)).toEqual(["queryLetter:sent", "synopsis:not", "sample:sent", "other:not"]);
    const c2 = sentCell(row(QueryStatus.QUERIED, { q: { sentHow: "package", sentPackageId: "p1", sentPackageEdition: 2, sentPackageName: "Standard" } }), PKG, NOW);
    expect(c2.tiles.find((t) => t.kind === "synopsis")!.state).toBe("sent");
  });
  it("the chip's popup: name, attached date and contents in words", () => {
    const c = sentCell(row(QueryStatus.QUERIED, { q: { sentHow: "package", sentPackageId: "p1", sentPackageEdition: 2, sentPackageName: "Standard" } }), PKG, NOW);
    expect(c.slot).toMatchObject({ title: "Standard package", line: "Attached 29 Aug · Query letter, synopsis and opening sample" });
  });
  it("a sample sent later on request lights its tile and says so", () => {
    const c = sentCell(row(QueryStatus.PARTIAL_SENT, { q: { sentHow: "package", sentPackageId: "p1", sentPackageEdition: 1, partialSentDate: "2026-09-20T12:00:00Z" } }), PKG, NOW);
    expect(c.tiles.find((t) => t.kind === "sample")!.line).toBe("Sent 20 Sep · on request");
  });
  it("an individual send: an empty slot, the pieces that went lit", () => {
    const c = sentCell(row(QueryStatus.QUERIED, { q: { sentHow: "individual", sentMaterials: "Query letter" }, materials: { ...NONE, queryLetter: "Sent" }, materialsRecorded: true }), null, NOW);
    expect(c.slot.kind).toBe("empty");
    expect(c.tiles.map((t) => t.state)).toEqual(["sent", "not", "not", "not"]);
    expect(c.tiles[1].line).toBe("Not sent");
  });
  it("unrecorded: + Add, and four unlit tiles reading Not recorded", () => {
    const c = sentCell(row(QueryStatus.QUERIED), null, NOW);
    expect(c.slot).toMatchObject({ kind: "add", title: "Nothing recorded" });
    expect(c.tiles.every((t) => t.state === "unrecorded" && t.line === "Not recorded")).toBe(true);
  });
});

describe("What you sent — a package that is no longer on file", () => {
  it("shows the chip, says so in the popup, and lights no tile as 'Not sent'", () => {
    const c = sentCell(row(QueryStatus.QUERIED, { q: { sentHow: "package", sentPackageId: "gone", sentPackageName: "Old" } }), null, NOW);
    expect(c.slot).toMatchObject({ kind: "package", line: "Attached 29 Aug · This package is no longer on file" });
    expect(c.known).toBe(false);
    expect(c.tiles.every((t) => t.state === "unrecorded" && t.line === "Not recorded")).toBe(true);
  });
});
