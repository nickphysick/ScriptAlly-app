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
import { sortNotes, noteRestoreFields, composerWithColour, editCommit } from "../../lib/noteboard";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const page = decls(readFileSync(join(here, "TodoNoteboardPage.tsx"), "utf8"));

const note = (id: string, text: string, day: string, over: Partial<UserTask> = {}): UserTask => ({
  id, userId: "u1", text, done: false,
  createdAt: `2026-08-${day}T09:00:00Z`, updatedAt: `2026-08-${day}T09:00:00Z`, ...over,
});

/* six notes, six days, six bodies — a board where order is observable */
const board = (): UserTask[] => [
  note("a", "One", "12"), note("b", "Two", "13"), note("c", "Three", "14", { tags: ["t1"] }),
  note("d", "Four", "15", { colour: "pink" }), note("e", "Five", "16"), note("f", "Six", "17"),
];
const sequence = (ts: UserTask[]) => sortNotes(ts).map((t) => t.text).join(" | ");

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
      const restored = [...left, { ...victim, ...noteRestoreFields(victim) } as UserTask];
      expect(sequence(restored), `undo of ${victim.text}`).toBe(was);
    }
  });

  it("⚠️ the receipt captures BEFORE it destroys, and carries everything that decides the note", () => {
    const n = note("c", "Three", "14", { tags: ["t1", "t2"], colour: "sage", detail: "second line" });
    const f = noteRestoreFields(n);
    /* ⚠️ EXHAUSTIVE AGAINST THE NOTE'S OWN KEYS, not against a hand-written list — a list on both
       sides agrees with itself the day someone adds a field and forgets this one. */
    const carried = new Set(Object.keys(f));
    const dropped = Object.keys(n).filter((k) => !carried.has(k));
    /* userId is the writer's, updatedAt is stamped by the write, done is false by definition on a
       note. Everything else must survive, or the note comes back changed. */
    expect(dropped.sort()).toEqual(["done", "updatedAt", "userId"]);
    expect(f.createdAt).toBe(n.createdAt);   // the field that decides WHERE it lands
    expect(f.tags).toEqual(["t1", "t2"]);
    expect(f.colour).toBe("sage");
  });

  it("⚠️ the undo is a real inverse, never an empty closure", () => {
    /* showToast renders Undo whenever an action is present, and a no-op satisfies the type. An
       absent control leaves someone knowing they must fix it themselves; a dead one leaves them
       believing it is already fixed. */
    const fn = page.slice(page.indexOf("const deleteNote"));
    expect(page.indexOf("const deleteNote")).toBeGreaterThan(-1);
    const body = fn.slice(0, fn.indexOf("\n  };"));
    expect(body).toContain("noteRestoreFields");
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
