/**
 * Your notes v1 — the page's rules (lib/yourNotes).
 *   YN1  a stored doc reads defensively: every field optional, nothing guessed.
 *   YN2  built and fixed are one outcome, "Now in the app": one bucket, one chip, one filter, worth four.
 *   YN3  the counting line is the server's rule: summed over the notes it equals functions' `writerTotals`.
 *   YN4  the switch's four filters, and the ring's buckets partition every note.
 *   YN5  the timeline: statusLog when there is one, else derived; the steps ahead are hollow.
 *   YN6  a new reply is one newer than writerSeenAt.
 */
import { describe, expect, it } from "vitest";
import { writerTotals } from "../../functions/src/foundingContributions";
import {
  BUCKETS, CHIP, FILTERS, bucketCounts, bucketOf, canReopen, composeKeyOf, countStates, filterCounts, hasNewReply, kindWords,
  noteFrom, passes, readSoFar, rowTitle, timeline, type YourNote,
} from "./yourNotes";

const W = "one two three four five six";
const D = (s: string) => Date.parse(s);
const note = (o: Partial<YourNote> & { id: string }): YourNote => ({
  kind: "An idea", message: W, title: null, status: null, statusAt: null, createdAt: D("2026-10-20T09:00:00Z"), pageName: "Dashboard",
  counted: null, reply: null, writerSeenAt: null, statusLog: null, ...o,
});

describe("YN1 · reading a stored note", () => {
  it("reads every field, and drops what is malformed", () => {
    const n = noteFrom("a", {
      kind: "Something's broken", message: "  It broke  ", title: " Short title ", status: "built", statusAt: 5, createdAt: { toMillis: () => 4 },
      pageName: "Contact list", counted: false, reply: { text: " Fixed it ", at: 9 }, writerSeenAt: 3,
      statusLog: [{ status: "read", at: 6 }, { status: "built", at: 7, note: "In the 7 Nov update" }, { nope: 1 }, "x"],
    });
    expect(n).toMatchObject({ kind: "Something's broken", message: "It broke", title: "Short title", status: "built", statusAt: 5, createdAt: 4, counted: false, reply: { text: "Fixed it", at: 9 }, writerSeenAt: 3 });
    expect(n.statusLog).toEqual([{ status: "read", at: 6, note: null }, { status: "built", at: 7, note: "In the 7 Nov update" }]);
  });
  it("an empty doc is a note with nothing guessed", () => {
    expect(noteFrom("b", {})).toEqual({ id: "b", kind: "", message: "", title: null, status: null, statusAt: null, createdAt: null, pageName: "", counted: null, reply: null, writerSeenAt: null, statusLog: null });
    expect(noteFrom("c", { status: "shipped", reply: { text: "  " }, statusLog: [] })).toMatchObject({ status: null, reply: null, statusLog: null });
  });
});

describe("YN2 · built and fixed are one outcome", () => {
  it("one bucket, one chip, one filter", () => {
    expect(bucketOf("built")).toBe("inapp");
    expect(bucketOf("fixed")).toBe("inapp");
    expect(CHIP.inapp).toEqual({ cls: "ok", label: "Now in the app" });
    expect(passes(note({ id: "x", status: "fixed" }), "done")).toBe(true);
  });
  it("the ring's buckets and chips are the ref's", () => {
    expect(BUCKETS.map((b) => [b.label, b.fill])).toEqual([["Not read yet", "#f1eee9"], ["Read", "#efe7da"], ["Planned", "#d9e1ea"], ["Now in the app", "#ecd6d2"]]);
    expect(BUCKETS[0].hatch).toBe(true);
    expect(Object.values(CHIP).map((c) => c.label)).toEqual(["Not read yet", "Read", "Planned", "Now in the app"]);
  });
});

describe("YN3 · the counting line is the server's rule", () => {
  const fixtures: YourNote[][] = [
    [note({ id: "1", status: "fixed" }), note({ id: "2", status: "built" }), note({ id: "3", status: "read" }), note({ id: "4" })],
    /* five in one London week: the earliest three count; a capped built note keeps its bonus */
    [0, 1, 2, 3, 4].map((i) => note({ id: `w${i}`, status: i === 4 ? "built" : "read", createdAt: D(`2026-10-2${i}T09:00:00Z`) })),
    [note({ id: "x", status: "read", counted: false }), note({ id: "y", status: "fixed", message: "too short" }), note({ id: "z", status: "planned", createdAt: null })],
  ];
  it("summed, it equals writerTotals over the same docs", () => {
    for (const notes of fixtures) {
      const states = countStates(notes);
      const mine = [...states.values()].reduce((s, c) => s + (c.state === "counted" ? c.worth : 0), 0);
      const server = writerTotals(notes.map((n) => ({ uid: "u", status: n.status, counted: n.counted, message: n.message, createdAt: n.createdAt }))).contributions;
      expect(mine).toBe(server);
    }
  });
  it("says what each note is: pending, counted (and worth), or nothing", () => {
    const s = countStates(fixtures[0]);
    expect(s.get("1")).toEqual({ state: "counted", worth: 4 });
    expect(s.get("2")).toEqual({ state: "counted", worth: 4 });
    expect(s.get("3")).toEqual({ state: "counted", worth: 1 });
    expect(s.get("4")).toEqual({ state: "pending" });
    const t = countStates(fixtures[2]);
    expect(t.get("x")).toEqual({ state: "silent" });
    expect(t.get("y")).toEqual({ state: "silent" });
    /* an unread note under five words says nothing about counting either */
    expect(countStates([note({ id: "s", message: "hi" })]).get("s")).toEqual({ state: "silent" });
  });
});

describe("YN4 · the switch and the ring", () => {
  const notes = [
    note({ id: "a" }), note({ id: "b", status: "read", kind: "Something I liked" }), note({ id: "c", status: "read" }),
    note({ id: "d", status: "planned", reply: { text: "Soon", at: 1 } }), note({ id: "e", status: "built" }), note({ id: "f", status: "fixed", reply: { text: "Done", at: 2 } }),
  ];
  it("still open = not read yet, planned, or read for anything but a like", () => {
    expect(filterCounts(notes)).toEqual({ all: 6, replies: 2, open: 3, done: 2 });
    expect(notes.filter((n) => passes(n, "open")).map((n) => n.id)).toEqual(["a", "c", "d"]);
  });
  it("the four buckets partition every note, and the middle is everything read", () => {
    const c = bucketCounts(notes);
    expect(c).toEqual({ none: 1, read: 2, planned: 1, inapp: 2 });
    expect(Object.values(c).reduce((s, n) => s + n, 0)).toBe(notes.length);
    expect(readSoFar(c)).toBe(5);
  });
  it("the switch's labels are the ref's", () => { expect(FILTERS.map((f) => f.label)).toEqual(["All", "With a reply", "Still open", "In the app"]); });
});

describe("YN5 · the timeline", () => {
  it("derives Sent + the current status when there is no log, with the rest hollow", () => {
    const t = timeline(note({ id: "a", status: "read", statusAt: 10, createdAt: 5 }));
    expect(t.map((s) => [s.label, s.todo])).toEqual([["Sent", false], ["Read", false], ["Planned", true], ["In the app", true]]);
  });
  it("reads statusLog when there is one", () => {
    const t = timeline(note({ id: "b", status: "fixed", createdAt: 1, statusLog: [{ status: "read", at: 2, note: null }, { status: "fixed", at: 3, note: "Fixed in the 7 Nov update" }] }));
    expect(t.map((s) => s.label)).toEqual(["Sent", "Read", "Now in the app"]);
    expect(t[2].note).toBe("Fixed in the 7 Nov update");
  });
  it("a read like has nothing ahead; an unread note has three steps ahead", () => {
    expect(timeline(note({ id: "c", status: "read", kind: "Something I liked" })).filter((s) => s.todo)).toEqual([]);
    expect(timeline(note({ id: "d" })).map((s) => s.label)).toEqual(["Sent", "Read", "Planned", "In the app"]);
  });
  it("only a built or fixed What-I-don't note can be opened again", () => {
    expect(canReopen(note({ id: "e", status: "fixed", kind: "Something's broken" }))).toBe(true);
    expect(canReopen(note({ id: "f", status: "built", kind: "Something's confusing" }))).toBe(true);
    expect(canReopen(note({ id: "g", status: "built", kind: "An idea" }))).toBe(false);
    expect(canReopen(note({ id: "h", status: "planned", kind: "Something's broken" }))).toBe(false);
  });
});

describe("YN6 · new replies, and the words", () => {
  it("a reply is new until seen after it", () => {
    expect(hasNewReply({ reply: { text: "x", at: 5 }, writerSeenAt: null })).toBe(true);
    expect(hasNewReply({ reply: { text: "x", at: 5 }, writerSeenAt: 4 })).toBe(true);
    expect(hasNewReply({ reply: { text: "x", at: 5 }, writerSeenAt: 6 })).toBe(false);
    expect(hasNewReply({ reply: null, writerSeenAt: null })).toBe(false);
  });
  it("kinds in the writer's words, and the pop-up's key", () => {
    expect(kindWords("Something's broken")).toBe("Something’s broken");
    expect(kindWords("Something I liked")).toBe("What I like");
    expect(composeKeyOf("Something's confusing")).toBe("dont");
    expect(composeKeyOf("Article")).toBeNull();
  });
  it("the title is the desk's, else the message quoted and cut near 90", () => {
    expect(rowTitle({ title: "Agency names missing", message: "x" })).toBe("Agency names missing");
    const long = rowTitle({ title: null, message: "a".repeat(120) });
    expect(long.startsWith("“")).toBe(true);
    expect(long.endsWith("…”")).toBe(true);
    expect(long.length).toBeLessThanOrEqual(92);
  });
});
