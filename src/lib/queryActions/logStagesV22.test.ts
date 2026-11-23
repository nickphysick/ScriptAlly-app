/**
 * Log a query v2.2 (design-refs/log-a-query-v2-2/, mock v25) — the units: the review's notes (Phase 2). The rendered
 * halves are tests/e2e/laqV22.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { addNote, deleteNote, editNote, notesToSave, type JourneyNote } from "./logStages";

const T = new Date(2026, 10, 23, 10).getTime();

describe("LAQ22-N the review's notes (D2)", () => {
  it("add: a note dated now; blank words add nothing", () => {
    const a = addNote([], "  Met at the Winchester festival.  ", T);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({ text: "Met at the Winchester festival.", ms: T });
    expect(addNote(a, "   ", T + 1)).toEqual(a);
  });
  it("two notes: oldest first, each with its own id", () => {
    const two = addNote(addNote([], "First", T), "Second", T + 60_000);
    expect(two.map((n) => n.text)).toEqual(["First", "Second"]);
    expect(new Set(two.map((n) => n.id)).size).toBe(2);
    expect(notesToSave({ notes: two, edit: null, draft: "" })).toEqual(["First", "Second"]);
  });
  it("edit: in place, the others untouched; blank words change nothing", () => {
    const two = addNote(addNote([], "First", T), "Second", T + 1);
    const e = editNote(two, two[0].id, " First, changed ");
    expect(e.map((n) => n.text)).toEqual(["First, changed", "Second"]);
    expect(e[0].id).toBe(two[0].id);
    expect(e[0].ms).toBe(T);
    expect(editNote(two, two[0].id, "  ")).toEqual(two);
  });
  it("delete: that note goes at once", () => {
    const two = addNote(addNote([], "First", T), "Second", T + 1);
    expect(deleteNote(two, two[0].id).map((n) => n.text)).toEqual(["Second"]);
  });
  it("Log query loses nothing: words left in the writing box are the last note; an open edit saves its words", () => {
    const two: JourneyNote[] = addNote(addNote([], "First", T), "Second", T + 1);
    expect(notesToSave({ notes: two, edit: null, draft: "  Still typing  " })).toEqual(["First", "Second", "Still typing"]);
    expect(notesToSave({ notes: [], edit: null, draft: "Only words in the box" })).toEqual(["Only words in the box"]);
    expect(notesToSave({ notes: two, edit: { id: two[1].id, text: "Second, edited" }, draft: "" })).toEqual(["First", "Second, edited"]);
    expect(notesToSave({ notes: two, edit: { id: two[1].id, text: "  " }, draft: "" })).toEqual(["First", "Second"]);
    expect(notesToSave({ notes: [], edit: null, draft: "   " })).toEqual([]);
  });
});

describe("LAQ22-N (source) saved as the Notes tab saves one; gone on Undo; not carried by Log and start another", () => {
  const host = readFileSync("src/components/queries/centre/LogStagesHost.tsx", "utf8");
  const ui = readFileSync("src/components/queries/centre/QcLogStages.tsx", "utf8");
  it("each note is a journal entry on the new query, oldest first (the Notes tab's own `addJournalEntry`)", () => {
    expect(host).toMatch(/for \(const t of a\.notes\) await addJournalEntry\(id, t\);/);
    expect(ui).toMatch(/notes: notesToSave\(\{ notes: s\.notes, edit: s\.noteEdit, draft: s\.draft \}\)/);
  });
  it("Undo deletes the query's journal entries with it", () => {
    const undo = host.slice(host.indexOf("const undo = async () => {"), host.indexOf("onLogged?.(id, undo);"));
    expect(undo).toMatch(/journalEntries\.filter\(\(x\) => x\.queryId === id\)\) await deleteJournalEntry\(j\.id\)/);
  });
  it("Log and start another starts with no notes", () => {
    const more = ui.slice(ui.indexOf("if (more) {"), ui.indexOf("} else {", ui.indexOf("if (more) {")));
    expect(more).toMatch(/notes: \[\], noteOpen: false, draft: "", noteEdit: null/);
  });
  it("the review draws the Notes tab's own parts, never a copy; Edit and Delete only (no Pin, task or Corkboard)", () => {
    expect(ui).toMatch(/import \{ NoteArticle, NoteCompose \} from "\.\/QcNotes158";/);
    const block = ui.slice(ui.indexOf("const notesBlock = () => ("), ui.indexOf("const checkBody = () => ("));
    expect(block).toMatch(/<NoteArticle /);
    expect(block).toMatch(/<NoteCompose /);
    expect(block).not.toMatch(/onPin=|onTask=|onCork=/);
    expect(block).toMatch(/"Add another note" : "Add a note"/);
  });
  it("Escape: an edit, then an empty writing box; a box with words goes on to the leave check", () => {
    const esc = ui.slice(ui.indexOf("useEscapeLayer(true, () => {"), ui.indexOf("}, ESC_LEVEL.journey);"));
    const iEdit = esc.indexOf("s.noteEdit) {"), iBox = esc.indexOf("s.noteOpen && !s.draft.trim()"), iLeave = esc.lastIndexOf("leave();");
    expect(iEdit).toBeGreaterThan(0);
    expect(iBox).toBeGreaterThan(iEdit);
    expect(iLeave).toBeGreaterThan(iBox);
  });
  it("⌘↵ in a note's field saves the note, not the query", () => {
    expect(ui).toMatch(/closest\?\.\('\[data-qls="notes"\]'\)\) return;/);
  });
});

/* ── Phase 3 (D5): one count of queries sent ─────────────────────────────────────────────────────────────────── */
import { reviewCounts } from "./logStages";
import { QueryStatus, type Query } from "../../types";

const qy = (i: number, dateSent: string): Query => ({ id: `q${i}`, userId: "u", agentId: `a${i}`, manuscriptId: "m", status: QueryStatus.QUERIED, dateSent } as unknown as Query);

describe("LAQ22-S the review's 'queries sent' is the Queries page's count, and equals 'Query number {n}' (D5)", () => {
  /* 28 queries for the book, five of them with no sent date */
  const book = Array.from({ length: 28 }, (_, i) => qy(i, i < 5 ? "" : "2026-10-01"));
  const unsaved = qy(99, "2026-11-23");
  const now = new Date(2026, 10, 23, 12);
  it("a book with five undated queries among 28: the review says 29", () => {
    expect(reviewCounts(book, unsaved, now).sent).toEqual([28, 29]);
  });
  it("the logged screen's 'Query number' reads the same count, plus this query: 29", () => {
    const host = readFileSync("src/components/queries/centre/LogStagesHost.tsx", "utf8");
    const ui = readFileSync("src/components/queries/centre/QcLogStages.tsx", "utf8");
    expect(host).toMatch(/count=\{queriesSentOf\(forBook\)\}/);
    expect(host).toMatch(/bookQueries=\{forBook\}/);
    expect(ui).toMatch(/const n = p\.count \+ 1;/);
    expect(ui).toMatch(/Query number <Odometer n=\{L\.n\} \/>/);
  });
  it("the Queries page header still counts one per query of the book (Queries.tsx, read only)", () => {
    const q = readFileSync("src/components/Queries.tsx", "utf8");
    expect(q).toMatch(/counts=\{showGridSkeleton \|\| qcLoadFail \? null : \{ ms: qcLineTitle, sent: qcScoped\.length,/);
  });
});
