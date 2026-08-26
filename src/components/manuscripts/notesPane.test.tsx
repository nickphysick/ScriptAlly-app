/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BOOK PROFILE — Notes ══════════════════════════════════════════════════════════════════
 *
 * ⚠️ THE SCOPE RULE IS THE WHOLE FEATURE. A note about nothing in particular is NOT a note about
 * this book, and a DATED item is a task that lives on the To-do list. Getting either wrong lists
 * something under a manuscript the writer never said anything about, or gives one item two homes
 * that disagree the moment it is ticked in one of them.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NotesPane } from "./NotesPane";
import { manuscriptNotes, notesMeta, noteDay } from "../../lib/manuscriptProfile";
import { UserTask } from "../../types";

const t = (over: Partial<UserTask>): UserTask =>
  ({ id: "n1", userId: "u", text: "Word count", detail: "Three agents want under 45k.",
     done: false, createdAt: "2026-06-14T09:00:00.000Z", updatedAt: "2026-06-14T09:00:00.000Z",
     ...over } as UserTask);

const POOL: UserTask[] = [
  t({ id: "a", text: "Word count", manuscriptId: "m1", createdAt: "2026-06-14T09:00:00.000Z" }),
  t({ id: "b", text: "Marsh call", manuscriptId: "m1", createdAt: "2026-05-28T09:00:00.000Z" }),
  t({ id: "c", text: "Other book", manuscriptId: "m2" }),
  t({ id: "d", text: "Unattached note" }),                                   // no manuscript
  t({ id: "e", text: "Dated task", manuscriptId: "m1", dueDate: "2026-09-01" }), // a TASK
  t({ id: "f", text: "Finished", manuscriptId: "m1", done: true }),
];

// ─────────────────────────────────────────────────────────────────────────────
describe("manuscriptNotes — exact scope, notes only", () => {
  it("takes this manuscript's dateless, unfinished notes and nothing else", () => {
    expect(manuscriptNotes(POOL, "m1").map((n) => n.id)).toEqual(["a", "b"]);
  });

  /**
   * ⚠️ AN UNATTACHED NOTE IS NOT THIS BOOK'S. `scopeTasks` deliberately keeps unscoped items in
   * view, which is right for a page filtering the whole board and wrong here — listing one under a
   * manuscript claims the writer said something about it that they did not.
   */
  it("excludes an unattached note rather than letting it float into every book", () => {
    expect(manuscriptNotes(POOL, "m1").map((n) => n.id)).not.toContain("d");
    expect(manuscriptNotes(POOL, "m2").map((n) => n.id)).toEqual(["c"]);
  });

  /** A dated item is a TASK by the app's own derivation, and the To-do list is where it surfaces. */
  it("excludes a dated task", () => {
    expect(manuscriptNotes(POOL, "m1").map((n) => n.id)).not.toContain("e");
  });

  it("excludes a note already ticked off", () => {
    expect(manuscriptNotes(POOL, "m1").map((n) => n.id)).not.toContain("f");
  });

  it("is newest first, with an undated one last rather than reading as just now", () => {
    const pool = [...POOL, t({ id: "z", text: "No stamp", manuscriptId: "m1", createdAt: undefined as unknown as string })];
    expect(manuscriptNotes(pool, "m1").map((n) => n.id)).toEqual(["a", "b", "z"]);
  });

  it("states its own count in the header's meta", () => {
    expect(notesMeta(4)).toBe("4 on this manuscript");
    expect(notesMeta(0)).toBe("0 on this manuscript");
  });

  it("states no date rather than today's where there is no stamp", () => {
    expect(noteDay(undefined)).toBeNull();
    expect(noteDay("not a date")).toBeNull();
    expect(noteDay("2026-06-14T09:00:00.000Z")).toBe("14 Jun 2026");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("the pane", () => {
  const pane = (over: Partial<React.ComponentProps<typeof NotesPane>> = {}) =>
    renderToStaticMarkup(
      <NotesPane notes={manuscriptNotes(POOL, "m1")} onWrite={() => {}} onOpenNoteboard={() => {}} {...over} />,
    );

  it("draws one card per note, newest first, and the ghost after them", () => {
    const html = pane();
    expect(html.match(/msp-paper/g)).toHaveLength(2);
    expect(html.indexOf("Word count")).toBeLessThan(html.indexOf("Marsh call"));
    expect(html.indexOf("msp-ghostcard")).toBeGreaterThan(html.indexOf("Marsh call"));
  });

  it("renders no body line where a note has none", () => {
    const html = pane({ notes: [t({ id: "x", text: "Bare", detail: undefined })] });
    expect(html).toContain("Bare");
    expect(html).not.toContain("msp-ptext");
  });

  /**
   * ⚠️ THE GHOST APPEARS ONLY WHERE IT CAN ACTUALLY WRITE. Without a handler it would look like an
   * invitation and do nothing — a dead control, which this repo already records as worse than an
   * absent one.
   */
  it("offers no way to write when there is no writer", () => {
    const html = pane({ onWrite: undefined });
    expect(html).not.toContain("msp-ghostcard");
    expect(html).not.toContain("Write a note");
  });

  it("says the book has no notes rather than showing an empty grid, where it cannot offer one", () => {
    expect(pane({ notes: [], onWrite: undefined })).toContain("No notes about this book yet.");
  });

  it("points at the one place a note is edited or ticked off", () => {
    expect(pane()).toContain("Open Noteboard ›");
  });

  /**
   * ⚠️ ONE STORE. These are `UserTask` documents — the collection the Noteboard and the To-do list
   * already read. A manuscripts/{id}/notes subcollection existed once and was RETIRED (the rules
   * default-deny it); a second store here would recreate the split that retirement closed.
   */
  it("builds no second note store", () => {
    const src = readFileSync(join(__dirname, "NotesPane.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(src).not.toMatch(/collection\(|addDoc|firestore/i);
    expect(src).toContain("UserTask");
  });

  /**
   * ⚠️ THE OTHER WRITER OF `manuscriptId` IS WHY THE DATELESS FILTER IS LOAD-BEARING. The Query
   * Centre's `Remind me later` sets it, and ALWAYS sets `dueDate` alongside — so what it makes is a
   * task. Without `manuscriptNotes`'s datelessness test, every two-week nudge reminder a writer has
   * ever set would surface on their manuscript's Notes tab as though they had written it there.
   *
   * ⚠️ AND THE KEY MUST BE ALLOWLISTED OR THE WRITE IS DENIED IN SILENCE (the affectedKeys gotcha),
   * which is why the rules are read here rather than trusted.
   */
  it("writes a field the rules actually allow", () => {
    const rules = readFileSync(join(__dirname, "..", "..", "..", "firestore.rules"), "utf8");
    /* The Query Centre's reminder writes the same field — and always with a dueDate, so it is a
       task. `manuscriptNotes` excluding dated items is what keeps those off this tab. */
    const qc = readFileSync(join(__dirname, "..", "Queries.tsx"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    /* Every `addUserTask` call in that file, then the one that scopes to a manuscript — anchored on
       the CALL rather than sliced by a character budget, which is how a first-match window comes to
       report an empty string about code that is right there. */
    const calls = [...qc.matchAll(/addUserTask\(\{[\s\S]*?\}\);/g)].map((m) => m[0]);
    const scoped = calls.filter((c) => c.includes("manuscriptId"));
    expect(scoped.length, "the Query Centre reminder moved — re-check the scope rule").toBeGreaterThan(0);
    for (const c of scoped) {
      expect(c, "a scoped task stopped carrying a date — every one would land on the Notes tab")
        .toContain("dueDate");
    }
    const taskAllow = /hasOnly\(\[([^\]]*'surfaceOffset'[^\]]*)\]/.exec(rules)?.[1];
    expect(taskAllow, "the user-task allowlist moved — re-find it").toBeTruthy();
    expect(taskAllow).toContain("'manuscriptId'");
    expect(taskAllow).toContain("'detail'");
  });
});
