/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phase 1 — the consequence preview is the engine run twice.
 *
 * ⚠️ THE ROW BUILDER USED HERE IS THE PAGE'S OWN, imported from `QueryTimeline`. A stub would make
 * these tests agree with themselves about a timeline the app never renders — the harness-is-not-the-
 * page fault, one layer in. The whole claim of this module is that preview and outcome run the same
 * code, so the test must run that code too.
 */
import { describe, it, expect, vi } from "vitest";

/* ⚠️ THE PAGE'S BUILDER PULLS IN THE COMPONENT'S IMPORT GRAPH, WHICH REACHES `firebase.ts` AND
   BOOTS AUTH. The repo's own `firebaseMock` is the standing answer — every page smoke uses it — so
   the REAL builder runs here rather than a stand-in that would agree with itself about a timeline
   the app never renders. */
vi.mock("./firebase", async () => (await import("../test/pageSmoke")).firebaseMock());
import { previewCorrection, previewBody, type PreviewRow } from "./correctionPreview";
import { buildTimelineRows } from "../components/reading-pane/QueryTimeline";
import type { RawActivityDoc } from "./recomputeQuery";
import { QueryStatus } from "../types";

const DAY = 86400000;
const NOW = Date.UTC(2026, 7, 20);
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const doc = (id: string, status: QueryStatus, daysAgo: number): RawActivityDoc =>
  ({ id, data: { type: status, resultingStatus: status, createdAt: iso(daysAgo) } });

const query = { id: "q1", dateSent: iso(300), materialsWanted: [] } as never;
/* the page's own builder, bound to this query — one builder, both sides */
const buildRows = (docs: RawActivityDoc[]): PreviewRow[] =>
  buildTimelineRows(docs.map((d) => ({ id: d.id, ...d.data })), query, null) as unknown as PreviewRow[];

const run = (current: RawActivityDoc[], proposed: RawActivityDoc[]) =>
  previewCorrection({ current, proposed, buildRows, query, agencyWeeks: 8 });

describe("Phase 1 · the preview is a real derivation, twice", () => {
  const log = [
    doc("a1", QueryStatus.QUERIED, 300),
    doc("a2", QueryStatus.PARTIAL_REQUESTED, 200),
    doc("a3", QueryStatus.PARTIAL_SENT, 190),
  ];

  /** ⚠️ AN EDIT THAT CHANGES NOTHING VISIBLE RAISES NO SHEET (ref 170, card 6). */
  it("an unchanged log is an empty diff", () => {
    const d = run(log, log);
    expect(d.empty, "a sheet would be raised over no consequences").toBe(true);
    expect(d.changes).toEqual([]);
    expect(d.removed).toEqual([]);
  });

  /** A note-only edit touches no derived field and no row identity. */
  it("editing only a note is an empty diff", () => {
    const proposed = log.map((d) => (d.id === "a2" ? { ...d, data: { ...d.data, note: "reworded" } } : d));
    expect(run(log, proposed).empty, "a note edit raised a consequence sheet").toBe(true);
  });

  it("removing the last rung moves the status, and says so", () => {
    const d = run(log, log.slice(0, 2));
    expect(d.empty).toBe(false);
    expect(d.removed.map((r) => r.title)).toContain("Partial sent");
    const status = d.changes.find((c) => c.surface === "status");
    expect(status, "the status change was not reported").toBeTruthy();
    expect(status!.before).toBe(QueryStatus.PARTIAL_SENT);
    expect(status!.after).toBe(QueryStatus.PARTIAL_REQUESTED);
    /* ⚠️ AND IT AGREES WITH THE ENGINE, because it IS the engine — asserted against the fields
       rather than against the sentence, so a formatting change cannot make this pass wrongly. */
    expect(d.fieldsAfter.status).toBe(QueryStatus.PARTIAL_REQUESTED);
  });

  /**
   * ⚠️ THE ORDINAL RENUMBERING — the case a writer could never predict. Two partial rounds label
   * "The partial" and "The second partial"; deleting the first renames the survivor. `chapterise`
   * numbers repeats itself, so the diff catches it without knowing the rule.
   */
  it("deleting the first partial round renumbers the second", () => {
    const two = [
      doc("a1", QueryStatus.QUERIED, 300),
      doc("a2", QueryStatus.PARTIAL_REQUESTED, 250),
      doc("a3", QueryStatus.PARTIAL_SENT, 240),
      doc("a4", QueryStatus.FULL_REQUESTED, 200),
      doc("a5", QueryStatus.FULL_SENT, 190),
    ];
    const d = run(two, two.filter((x) => x.id !== "a2" && x.id !== "a3"));
    const ch = d.changes.find((c) => c.surface === "chapters");
    expect(ch, "a chapter relabelling went unreported").toBeTruthy();
    expect(ch!.before).not.toBe(ch!.after);
  });

  /** ⚠️ THE ANCHOR IS A SURFACE TOO — removing the last send moves what the tracker counts from. */
  it("removing the latest send re-bases the waiting anchor", () => {
    const d = run(log, log.slice(0, 2));
    const anchor = d.changes.find((c) => c.surface === "anchor");
    expect(anchor, "the anchor moved and the preview did not say so").toBeTruthy();
    expect(anchor!.before).toContain("your send");
  });

  /**
   * ⚠️ ORDER IS COMPARABLE ONLY BECAUSE OF THE SHARED TIEBREAK. Both sides sort an array that never
   * came from Firestore; this is the case the correction UI creates most often — a date moved onto
   * a day that already holds an event — and without one stated rule the preview would compare its
   * own arbitrary order against `orderBy`'s.
   */
  it("a date edit that crosses another event is reported as a reorder", () => {
    const moved = log.map((d) => (d.id === "a3" ? { ...d, data: { ...d.data, createdAt: iso(250) } } : d));
    const d = run(log, moved);
    expect(d.empty).toBe(false);
    expect(d.reordered, "the crossing was not detected as a reorder").toBe(true);
  });

  /**
   * ⚠️ SCOPE OF THIS CLAIM, VERIFIED RATHER THAN ASSUMED: it goes red only when BOTH of
   * `buildTimelineRows`' sorts lose the shared rule. Either one alone normalises this fixture — the
   * merge fixes what the status sort leaves, and the status sort feeds a stable merge — so this
   * proves the OUTPUT is deterministic, which is the claim that matters, and not that each sort
   * carries the tiebreak individually. Checked by neutering each in turn and then both.
   */
  it("two events on one day order deterministically, by document id", () => {
    const sameDay = [
      doc("a1", QueryStatus.QUERIED, 300),
      doc("zz", QueryStatus.PARTIAL_REQUESTED, 200),
      doc("aa", QueryStatus.PARTIAL_SENT, 200),
    ];
    /* the same log, handed over in the opposite order — the rule must not care */
    const shuffled = [sameDay[0], sameDay[2], sameDay[1]];
    const a = run(sameDay, sameDay).rowsAfter.map((r) => r.title).join("|");
    const b = run(shuffled, shuffled).rowsAfter.map((r) => r.title).join("|");
    expect(a, "same-day order depends on the order the rows were handed in").toBe(b);
  });
});

describe("Phase 1 · which body the sheet renders", () => {
  const log = [doc("a1", QueryStatus.QUERIED, 300), doc("a2", QueryStatus.PARTIAL_REQUESTED, 200)];

  it("the timeline preview when rows move", () => {
    expect(previewBody(run(log, log.slice(0, 1)))).toBe("timeline");
  });

  /** ⚠️ THE LEDGER IS THE FALLBACK FOR A DIFF THAT TOUCHES NO ROW (ref 171, A behind B). */
  it("the ledger when nothing on the timeline moves", () => {
    const d = { removed: [], added: [], reordered: false } as never;
    expect(previewBody(d)).toBe("ledger");
  });
});

describe("⚠️ a change is something the writer can SEE", () => {
  /**
   * The fault this guards was measured on the deployed page: a note-only edit raised a sheet whose
   * two rows read "your send on 16 Jul 2026 → your send on 16 Jul 2026". Saving normalises an
   * event's time to midday, so the anchor moved by hours while the day it states did not — and the
   * comparison was on milliseconds rather than on the sentence.
   */
  it("does not report a consequence when both sides state the same thing", async () => {
    const { buildTimelineRows } = await import("../components/reading-pane/QueryTimeline");
    const at = (iso: string) => ({ id: "e1", data: { type: "Queried", createdAt: iso, note: "" } });
    const rest = [{ id: "e0", data: { type: "Partial Requested", createdAt: "2026-05-02T09:00:00.000Z", note: "" } }];
    const build = (docs: any[]) =>
      buildTimelineRows(docs.map((d) => ({ id: d.id, ...d.data })), { id: "q1", status: "Queried" } as never, null) as never;

    /* same calendar day, different time — the stated fact is identical */
    const diff = previewCorrection({
      current: [at("2026-05-01T22:35:00.000Z"), ...rest] as never,
      proposed: [at("2026-05-01T11:00:00.000Z"), ...rest] as never,
      buildRows: build,
      agencyWeeks: 8,
      query: { id: "q1" },
    });
    expect(diff.changes.filter((c) => c.surface === "anchor" || c.surface === "window")).toEqual([]);
  });

  it("⚠️ still reports one when the day itself moves", async () => {
    const { buildTimelineRows } = await import("../components/reading-pane/QueryTimeline");
    const at = (iso: string) => ({ id: "e1", data: { type: "Queried", createdAt: iso, note: "" } });
    const build = (docs: any[]) =>
      buildTimelineRows(docs.map((d) => ({ id: d.id, ...d.data })), { id: "q1", status: "Queried" } as never, null) as never;
    const diff = previewCorrection({
      current: [at("2026-05-01T11:00:00.000Z")] as never,
      proposed: [at("2026-06-14T11:00:00.000Z")] as never,
      buildRows: build,
      agencyWeeks: 8,
      query: { id: "q1" },
    });
    expect(diff.changes.some((c) => c.surface === "anchor")).toBe(true);
  });
});
