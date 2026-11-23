/**
 * Query card v158 §5 — the Notes tab's render and source locks (QC158-10, -11, -12, -13's source halves; the measured
 * halves are tests/e2e/qc158.measure.ts).
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { NotesTab158, menuItems168, notesList, quotePhrase, quotesOf, type NoteIn, type QuoteIn } from "./QcNotes158";
import { QueryStatus } from "../../../types";
import { STAGE_COLOURS } from "../../../lib/stageColours";
import type { ThreadStepIn } from "../../../lib/qcThread152";

const NOW = new Date(2026, 10, 18, 12).getTime();
const DAY = 86_400_000;
const note = (id: string, d: number, text: string, pinned = false): NoteIn => ({ id, text, ms: NOW - d * DAY, pinned });
const step = (key: string, status: QueryStatus, d: number, quote: string): ThreadStepIn =>
  ({ key, status, kind: null, ms: NOW - d * DAY, chips: [], quote } as unknown as ThreadStepIn);
const quotes = quotesOf([step("pr", QueryStatus.PARTIAL_REQUESTED, 40, "Sorry for the wait."), step("fr", QueryStatus.FULL_REQUESTED, 20, "Please send the full."),
  step("q", QueryStatus.QUERIED, 60, "not the agent's")]);
const html = (notes: NoteIn[], q: QuoteIn[] = quotes, actions = true) => renderToStaticMarkup(
  <NotesTab158 first="Fenella" nowMs={NOW} notes={notes} quotes={q} onAdd={() => {}} resetKey="x"
    onPin={actions ? () => {} : null} onTask={actions ? () => {} : null} onCork={actions ? () => {} : null} />);

describe("QC158-10 (source) notes and the agent's words, one list in date order", () => {
  it("the fixture has notes and quotes; the list interleaves them oldest first; a quote's background is its status's band (Plumage colours v1)", () => {
    const notes = [note("a", 50, "Picked for the list."), note("b", 10, "Chase in a fortnight.")];
    expect(quotes.length).toBe(2);
    const h = html(notes);
    const order = [...h.matchAll(/data-qc158="(note|quote)"[^>]*data-(?:id|status)="([^"]+)"/g)].map((m) => m[2]);
    expect(order).toEqual(["a", "Partial Requested", "Full Requested", "b"]);
    expect(h).toContain(`--bt:${STAGE_COLOURS.partial.bandRequested};--be:${STAGE_COLOURS.partial.edge}`);
    expect(h).toContain(`--bt:${STAGE_COLOURS.full.bandRequested};--be:${STAGE_COLOURS.full.edge}`);
    expect(h).toContain("<b>Fenella</b><span>when asking for the partial");
    expect(h).toContain("“Sorry for the wait.”");
    expect(h).not.toContain("not the agent's");
  });
  it("a quote has Send to Corkboard only: no Pin and no task", () => {
    /* Query card v168 — re-pointed: the actions sit behind each entry's ⋯ (the card's small menu), so nothing moves on
       hover; the disc is drawn, and what it holds is menuItems168's */
    const q = html([], quotes).match(/<article[^>]*data-qc158="quote"[^]*?<\/article>/g) ?? [];
    expect(q.length).toBe(2);
    for (const a of q) {
      expect(a).toContain('data-qc168="more"');
      expect(a).toContain('aria-label="More for these words"');
      expect(a).not.toContain("nx-acts");
    }
    const all = { onPin: () => {}, onTask: () => {}, onCork: () => {} };
    expect(menuItems168({ t: "quote", q: quotes[0] }, all).map((x) => x.k)).toEqual(["cork"]);
  });
  it("the phrases", () => {
    expect(quotePhrase(QueryStatus.REJECTED, null)).toBe("when passing");
    expect(quotePhrase(QueryStatus.OFFER, null)).toBe("with the offer");
    expect(quotePhrase(QueryStatus.FULL_REQUESTED, null)).toBe("when asking for the full");
  });
});

describe("QC158-11 (source) the writing box", () => {
  it("one field and an Add note button that is disabled while the field is empty; saved by the button or Ctrl/Cmd + Enter, never on blur", () => {
    const h = html([]);
    expect(h).toMatch(/<textarea[^>]*placeholder="Add a note about this query"/);
    expect(h).toMatch(/<button type="button" data-qc158="add-note" disabled="">Add note<\/button>/);
    const src = readFileSync("src/components/queries/centre/QcNotes158.tsx", "utf8");
    expect(src).not.toMatch(/onBlur/);
    expect(src).toMatch(/e\.key === "Enter" && \(e\.metaKey \|\| e\.ctrlKey\)/);
  });
  it("it is fixed to the bottom of the tab body: sticky, at the bottom it has with no notes", () => {
    const css = readFileSync("src/components/queries/centre/qcv158.css", "utf8");
    expect(css).toMatch(/\.qc152 \.nx-nc \{ position: sticky; bottom: 14px;/);
    expect(css).toMatch(/\.qc152 \.nx-notes \{[^}]*padding: 12px 18px 14px;/);
  });
});

describe("QC158-12 (source) note actions", () => {
  it("a writer's note offers Pin to the top (or Unpin), Make it a task, Send to Corkboard; a pinned note sits first and only one is", () => {
    const notes = [note("a", 50, "old"), note("b", 10, "new", true), note("c", 5, "newer", true)];
    const list = notesList(notes, []);
    expect(list.map((e) => (e.t === "note" ? e.n.id : ""))).toEqual(["b", "a", "c"]);
    const h = html([note("a", 50, "old"), note("b", 10, "new", true)], []);
    expect(h.indexOf('data-id="b"')).toBeLessThan(h.indexOf('data-id="a"'));
    expect(h).toMatch(/data-id="b"[^]*>Pinned</);
    /* v168 — re-pointed: behind ⋯ */
    expect(h).toMatch(/data-id="a"[^]*aria-label="More for this note"/);
    const all = { onPin: () => {}, onTask: () => {}, onCork: () => {} };
    expect(menuItems168({ t: "note", n: note("b", 10, "new", true) }, all).map((x) => x.label)).toEqual(["Unpin", "Make it a task", "Send to Corkboard"]);
    expect(menuItems168({ t: "note", n: note("a", 50, "old") }, all).map((x) => x.label)).toEqual(["Pin to the top", "Make it a task", "Send to Corkboard"]);
  });
  it("the page copies the text and leaves the note: a dated task, or an undated one (a Corkboard note); pinning unpins the others", () => {
    const q = readFileSync("src/components/Queries.tsx", "utf8");
    const at = q.indexOf("onNoteTask={(text) => {");
    expect(at).toBeGreaterThan(0);
    /* v168 — re-pointed: the block ends where the note's own edit and delete begin (they are the journal's writes) */
    const block = q.slice(q.indexOf("onPinNote={(id, on) => {"), q.indexOf("onEditNote={async (id, text) => {", at));
    expect(block).toMatch(/addUserTask\(\{ text, queryId: q\.id, agentId: ag\?\.id, manuscriptId: q\.manuscriptId, dueDate: today \}\)/);
    expect(block).toMatch(/addUserTask\(\{ text, queryId: q\.id \}\)/);
    expect(block).toMatch(/pinJournalEntry\(j\.id, false\)/);
    expect(block).not.toMatch(/deleteJournalEntry|updateJournalEntry/);
  });
  it("the To-do desk's read-only preview passes no actions, so none are drawn", () => {
    expect(html([note("a", 5, "x")], [], false)).not.toContain('data-qc158="act"');
    expect(html([note("a", 5, "x")], [], false)).not.toContain('data-qc168="more"');
  });
});

describe("QC158-13 (source) empty", () => {
  it("no notes and no quotes: the empty wording with the agent's first name", () => {
    const h = html([], []);
    expect(h).toContain("<b>Nothing noted yet</b><span>This is the place for why you picked Fenella, and what you’d change if this one’s a no.</span>");
    const css = readFileSync("src/components/queries/centre/qcv158.css", "utf8");
    expect(css).toMatch(/\.qc152 \.nx-nempty \{ margin: auto 0; text-align: center; \}/);
  });
});

/* Agent card v2.2 B5 — the agent's words: Send to Corkboard and "Change it on the query" (when the card gives a door) */
describe("ACV22-B5 (source) the agent's words' ⋯", () => {
  it("holds Change it on the query only with a door and a query", () => {
    const q0 = { ...quotes[0], queryId: "q1" };
    const all = { onCork: () => {}, onQuoteOpen: () => {} };
    expect(menuItems168({ t: "quote", q: q0 }, all).map((x) => x.label)).toEqual(["Send to Corkboard", "Change it on the query"]);
    expect(menuItems168({ t: "quote", q: { ...q0, queryId: null } }, all).map((x) => x.k)).toEqual(["cork"]);
    expect(menuItems168({ t: "quote", q: q0 }, { onCork: () => {} }).map((x) => x.k)).toEqual(["cork"]);
  });
});
