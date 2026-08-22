/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the composer, edit-in-place, and remove-with-a-receipt (build Phase 4).
 *
 * ⚠️ THE UNDO RESTORES THE NOTE, NOT A COPY OF ITS WORDS. The board has no stored order: it is
 * `createdAt` descending, so where a restored note LANDS is decided by the fields the inverse
 * carries. The undo that was here re-created the note through `addUserTask({ id, text, detail })`,
 * and `addUserTask` stamps `createdAt: now` — so Undo returned the note to the TOP of the board
 * rather than to its slot, and dropped its tags with it. Nothing failed; the note simply came back
 * somewhere else wearing less. That is the shape this file exists to catch, and it is why the
 * check compares the whole ORDERED sequence rather than asking whether the note is present.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { UserTask } from "../../types";
import { sortNotes, noteReceipt, composerWithColour, editCommit } from "../../lib/noteboard";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));

const note = (id: string, text: string, day: string, over: Partial<UserTask> = {}): UserTask => ({
  id, userId: "u1", text, done: false,
  createdAt: `2026-08-${day}T09:00:00Z`, updatedAt: `2026-08-${day}T09:00:00Z`, ...over,
});

/* six notes, six days, six bodies, genuinely different fields — a board where order AND
   payload are observable. One mid-board note carries the two late optional fields. */
const board = (): UserTask[] => [
  note("a", "One", "12"), note("b", "Two", "13"),
  note("c", "Three", "14", { tags: ["t1"], committedDate: "2026-08-22", estimateMin: 15 }),
  note("d", "Four", "15", { colour: "pink" }), note("e", "Five", "16"), note("f", "Six", "17"),
];
/* ⚠️ THE SEQUENCE CARRIES THE PAYLOAD, not just the words — body · tag · colour per slot, joined
   once. A body-only compare passes on a note that came back in place wearing less. */
const sequence = (ts: UserTask[]) =>
  sortNotes(ts).map((t) => `${t.text}·${(t.tags ?? []).join("+")}·${t.colour ?? "-"}·${t.committedDate ?? "-"}`).join(" | ");

describe("⚠️ remove and undo — the board comes back as it was, in order", () => {
  it("the sequence after Undo is the sequence before Remove — one comparison, not six", () => {
    /* ⚠️ THE WHOLE ORDERED RUN, as one string. Asserting "the note is present" passes on a note
       that came back at the wrong index, which is exactly what was happening. */
    const before = board();
    const was = sequence(before);
    for (const victim of before) {
      const left = before.filter((t) => t.id !== victim.id);
      expect(sequence(left), `removing ${victim.text} should change the board`).not.toBe(was);
      /* the inverse rebuilds it from what the receipt captured — never from what is left */
      const restored = [...left, noteReceipt(victim)];
      expect(sequence(restored), `undo of ${victim.text}`).toBe(was);
    }
  });

  it("⚠️ the receipt is the WHOLE DOCUMENT — proven against a note carrying every optional field", () => {
    /* ⚠️ THE NAMED LIST WAS THE FAULT (finish run, Phase 2). `noteRestoreFields` carried a list of
       fields chosen when it was written, and two optional fields postdate the list —
       `committedDate` and `estimateMin` — so a note committed to Today came back silently
       uncommitted. The exhaustive-keys check never fired because its fixture carried neither
       field: it was honest about the note it was given. The fixture now carries EVERYTHING, and
       the receipt is the document itself rather than a list that has to chase the schema. */
    const n = note("c", "Three", "14", {
      tags: ["t1", "t2"], colour: "sage", detail: "second line",
      committedDate: "2026-08-22", estimateMin: 15,
    });
    const r = noteReceipt(n);
    expect(r).toEqual(n);                       // nothing dropped, nothing added
    expect(r).not.toBe(n);                      // and it is a COPY — later mutations cannot reach it
    expect(r.committedDate).toBe("2026-08-22"); // the two fields the named list lost
    expect(r.estimateMin).toBe(15);
    expect(r.createdAt).toBe(n.createdAt);      // the field that decides WHERE it lands
  });

  it("⚠️ the undo is a real inverse, never an empty closure", () => {
    /* showToast renders Undo whenever an action is present, and a no-op satisfies the type. An
       absent control leaves someone knowing they must fix it themselves; a dead one leaves them
       believing it is already fixed. */
    const fn = page.slice(page.indexOf("const deleteNote"));
    expect(page.indexOf("const deleteNote")).toBeGreaterThan(-1);
    const body = fn.slice(0, fn.indexOf("\n  };"));
    /* the receipt is captured before the confirm, and the undo REWRITES the document verbatim
       through restoreUserTask — never re-derives it through the create path, whose builder
       stamps its own createdAt and accepts only the fields it knows about */
    expect(body).toContain("noteReceipt(note)");
    expect(body).toContain("restoreUserTask(");
    expect(body).not.toContain("addUserTask(");
    expect(body).toMatch(/label:\s*"Undo"/);
    expect(body).not.toMatch(/fn:\s*async\s*\(\)\s*=>\s*\{\s*\}/);   // the empty closure
  });
});

describe("⚠️ the composer keeps what you have already written", () => {
  it("changing the paper repaints and preserves the draft — body and tag both", () => {
    const draft = { body: "Half a thought about\nthe opening", colour: "yellow" as const, tag: "letter" };
    const next = composerWithColour(draft, "sage");
    expect(next).toEqual({ ...draft, colour: "sage" });
    /* three papers, three distinct results, one unchanged body */
    const all = (["yellow", "pink", "sage"] as const).map((c) => composerWithColour(draft, c));
    expect(new Set(all.map((d) => d.colour)).size).toBe(3);
    expect(new Set(all.map((d) => d.body)).size).toBe(1);
  });

  it("one composer, two doors — the toolbar button and the ghost tile open the SAME one", () => {
    /* two openers with two bodies is two surfaces for one action, and they drift */
    const opens = [...page.matchAll(/openComposer\(/g)].length;
    expect(opens).toBeGreaterThanOrEqual(2);
    expect(page).toContain("const openComposer");
    /* and the ghost is FIRST in the flow, replaced by the composer rather than sitting beside it */
    expect(page).toContain("nb-ghost");
    expect(page.indexOf("nb-ghost")).toBeLessThan(page.indexOf("notes.map"));
  });
});

describe("⚠️ edit in place — blur commits, and an empty commit keeps the words", () => {
  it("typed text wins; blank and whitespace both keep what was there", () => {
    /* three genuinely different inputs; a single case cannot tell a working guard from `return
       typed` */
    expect(editCommit("Old words", "New words")).toBe("New words");
    expect(editCommit("Old words", "   ")).toBe("Old words");
    expect(editCommit("Old words", "")).toBe("Old words");
    expect(editCommit("Old words", "  Trimmed  ")).toBe("Trimmed");
  });

  it("the edit happens on the card, not in a modal", () => {
    expect(page).toContain("editCommit");
    expect(page).toContain("nb-edit");
    /* no second host: the note's own body element is what is replaced */
    expect(page).not.toContain("EditNoteModal");
  });
});
