/**
 * Smart Import from photos v1.1 — dates on a handwritten line, and a ✗ that is not a crossing-out.
 *
 * Locks: the photo addendum carries the new rules (and the sheet's prompt does not); the assembled
 * result for Kirsten Vale's two lines is one undated Full Sent query with both events and a no-date
 * question; one date given twice (as the sent date and an event's) is kept on the event only.
 */
import { describe, it, expect } from "vitest";
import { assembleResult } from "./assembleImport";
import { SYSTEM_PROMPT, PHOTO_ADDENDUM } from "./smartImportPrompt";

const KIRSTEN = "Kirsten Vale - Vale Agency - FULL!! 15/9 -> sent full 22/9";
const read = (q: Record<string, unknown>) =>
  assembleResult({ agents: [{ ref: "a1", name: "Kirsten Vale", agency: "Vale Agency" }], queries: [{ agentRef: "a1", ...q }] } as any, { photos: { pageCount: 1 } }).queries[0] as any;

describe("the photo addendum (v1.1)", () => {
  it("says an event's date is the event's, never the sent date, and that an arrow line continues the entry above", () => {
    expect(PHOTO_ADDENDUM).toContain("a handwritten list has no Date-sent column");
    expect(PHOTO_ADDENDUM).toContain("is THAT EVENT's\n  date. Carry it as a timeline entry with its verbatim \"rawDate\" — NEVER as sentDateRaw.");
    expect(PHOTO_ADDENDUM).toContain("A date in a part of its own is the sent date, whatever the next part says: sentDateRaw.");
    expect(PHOTO_ADDENDUM).toContain("IN THE SAME PART, with no separator between them");
    expect(PHOTO_ADDENDUM).toContain("A line whose ONLY date sits in a part of its own ALWAYS has that date as sentDateRaw");
    expect(PHOTO_ADDENDUM).toContain("CONTINUES the entry above it: its events belong to that query, and it is never an\n  entry of its own.");
    expect(PHOTO_ADDENDUM).toContain("sentDateRaw, timeline Full Requested 15/9 then Full Sent 22/9, status \"Full Sent\".");
    expect(PHOTO_ADDENDUM).toContain("Never give the same date as both sentDateRaw and a timeline event.");
  });
  it("says a crossing-out is a line drawn across the writing, and a ✗ after an entry is mark-unclear", () => {
    expect(PHOTO_ADDENDUM).toContain("\"crossed-out\": the line itself is struck through — a line drawn ACROSS the writing.");
    expect(PHOTO_ADDENDUM).toContain("A ✗ or an x written after an entry is NEVER \"crossed-out\":\n    that is \"mark-unclear\" with markRaw \"✗\".");
  });
  it("is photo-only: the sheet's prompt carries none of it", () => {
    for (const s of ["no Date-sent column", "CONTINUES the entry above", "drawn ACROSS the writing"]) expect(SYSTEM_PROMPT).not.toContain(s);
  });
});

describe("the assembled result for Kirsten Vale's lines", () => {
  it("as the rules ask: no sent date, Full Requested 15/9 then Full Sent 22/9, status Full Sent, the no-date question", () => {
    const q = read({ status: "Full Sent", timeline: [{ type: "Full Requested", rawDate: "15/9" }, { type: "Full Sent", rawDate: "22/9" }], lineRaw: KIRSTEN });
    expect(q.sentDate).toBeNull();
    expect(q.status).toBe("Full Sent");
    expect(q.timeline.map((t: any) => [t.type, t.raw])).toEqual([["Full Requested", "15/9"], ["Full Sent", "22/9"]]);
    expect(q.timeline.every((t: any) => /^\d{4}-09-(15|22)$/.test(t.date))).toBe(true);
    expect(q.reasons).toContain("no-date");
    expect(q.reasons).not.toContain("two-dates");
  });
  it("as the model gave it on 4 Nov (15/9 as the sent date AND the request): the date stays on the event only", () => {
    const q = read({ status: "Full Sent", sentDateRaw: "15/9", timeline: [{ type: "Full Requested", rawDate: "15/9" }, { type: "Full Sent", rawDate: "22/9" }], reasons: ["two-dates"], lineRaw: KIRSTEN });
    expect(q.sentDate).toBeNull();
    expect(q.sentDateRaw).toBeNull();
    expect(q.timeline.map((t: any) => t.raw)).toEqual(["15/9", "22/9"]);
    expect(q.reasons).toEqual(["no-date"]);
  });
  it("two different dates are still the two-dates question", () => {
    const q = read({ status: "Full Requested", sentDateRaw: "2/9", timeline: [{ type: "Full Requested", rawDate: "15/9" }] });
    expect(q.sentDate).toMatch(/-09-02$/);
    expect(q.reasons).toEqual(["two-dates"]);
  });
});
