/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DB77 B4 — the founding writer's record: order, counts, the title fallback, the tooltips.
 */
import { describe, it, expect } from "vitest";
import { recordOf, titleOf, tooltipOf, mergePending, toMs, type FeedbackDoc } from "./feedbackRecord";

const D = (iso: string) => Date.parse(iso);

const DOCS: FeedbackDoc[] = [
  { id: "a", kind: "An idea", message: "Sent only", createdAt: D("2026-10-20T10:00:00Z") },
  { id: "b", kind: "An idea", message: "Planned one", status: "planned", createdAt: D("2026-10-01T10:00:00Z") },
  { id: "c", kind: "Something's broken", message: "Fixed one", status: "fixed", statusAt: D("2026-10-10T10:00:00Z"), createdAt: D("2026-09-01T10:00:00Z") },
  { id: "d", kind: "An idea", message: "Built one", title: "Bulk nudge", status: "built", statusAt: D("2026-10-20T10:00:00Z"), createdAt: D("2026-10-02T10:00:00Z") },
  { id: "e", kind: "Something I liked", message: "Read one", status: "read", createdAt: D("2026-10-15T10:00:00Z") },
  { id: "f", kind: "An idea", message: "Older sent", createdAt: D("2026-08-01T10:00:00Z") },
  { id: "g", kind: "An idea", message: "Unknown status", status: "wontfix", createdAt: D("2026-07-01T10:00:00Z") },
];

describe("recordOf", () => {
  const r = recordOf(DOCS);
  it("orders built/fixed by statusAt, then planned, read, then sent by createdAt", () => {
    expect(r.rows.map((x) => x.id)).toEqual(["d", "c", "b", "e", "a", "f", "g"]);
  });
  it("counts every doc as sent and built + fixed as changed", () => {
    expect(r.sent).toBe(7);
    expect(r.changed).toBe(2);
  });
  it("reads an unknown status as sent", () => {
    expect(r.rows.find((x) => x.id === "g")!.status).toBe("sent");
    expect(r.rows.find((x) => x.id === "g")!.statusLabel).toBe("Sent");
  });
  it("is empty for no docs", () => {
    expect(recordOf([])).toEqual({ sent: 0, changed: 0, rows: [] });
  });
});

describe("titleOf", () => {
  it("uses the set title", () => expect(titleOf({ title: "  Bulk nudge ", message: "x" })).toBe("Bulk nudge"));
  it("quotes a message of 60 characters or fewer whole", () => {
    const m = "x".repeat(60);
    expect(titleOf({ message: m })).toBe(`“${m}”`);
  });
  it("cuts a longer message at 60 and adds an ellipsis", () => {
    const m = "y".repeat(61);
    expect(titleOf({ message: m })).toBe(`“${"y".repeat(60)}…”`);
  });
});

describe("tooltipOf", () => {
  it("built → Shipped with the date", () => expect(tooltipOf(DOCS[3])).toBe("Your idea, 2 Oct → Shipped 20 Oct"));
  it("fixed → Fixed with the date", () => expect(tooltipOf(DOCS[2])).toBe("Your report, 1 Sep → Fixed 10 Oct"));
  it("planned → On the list", () => expect(tooltipOf(DOCS[1])).toBe("Your idea, 1 Oct → On the list"));
  it("read → Read by our founder", () => expect(tooltipOf(DOCS[4])).toBe("Your feedback, 15 Oct → Read by our founder"));
  it("sent → We read all feedback", () => expect(tooltipOf(DOCS[0])).toBe("Your idea, 20 Oct → We read all feedback"));
  it("a missing statusAt leaves the result undated", () => expect(tooltipOf({ id: "x", kind: "An idea", status: "built", createdAt: D("2026-10-02T10:00:00Z") })).toBe("Your idea, 2 Oct → Shipped"));
});

describe("mergePending", () => {
  it("adds a pending note until the snapshot carries it", () => {
    const p: FeedbackDoc = { id: "pending-1", kind: "An idea", message: "New one" };
    expect(mergePending(DOCS, [p]).length).toBe(DOCS.length + 1);
    expect(mergePending([...DOCS, { id: "z", kind: "An idea", message: "New one " }], [p]).length).toBe(DOCS.length + 1);
  });
});

describe("toMs", () => {
  it("reads a Timestamp-like, a Date, a string and ms", () => {
    expect(toMs({ toMillis: () => 5 })).toBe(5);
    expect(toMs({ seconds: 2 })).toBe(2000);
    expect(toMs(new Date(7))).toBe(7);
    expect(toMs(3)).toBe(3);
    expect(toMs(null)).toBe(null);
  });
});
