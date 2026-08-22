/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Noteboard — the note model (build Phase 2).
 *
 * ⚠️ COLOUR IS THE ONE THING ON THIS BOARD THAT CANNOT BE DERIVED. The task link is derived (a
 * projected task takes the id `notetask-{noteId}`, so the link is a lookup and needs no field);
 * a colour is a CHOICE a writer made, and no other stored fact implies it. Inventing one from a
 * tag or a position would be the fabricated-value fault this codebase already names three times.
 * So it is a real field — and a real field on `userTasks` means the closed rules allowlist.
 *
 * ⚠️ WHICH IS WHY IT IS NEVER SENT ON CREATE. `isValidUserTask` is `keys().hasOnly([...])`, so an
 * unlisted key does not cost the key — it denies the whole document. Sent on create, a pink note
 * would not be a yellow note, it would be NO note. The create stays plain and the colour follows
 * as its own write, so a denial costs the colour and never the writing.
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { NoteColour, UserTask } from "../../types";
import { noteColour, NOTE_COLOURS } from "../../lib/noteboard";

const here = __dirname;
const decls = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const types = readFileSync(join(here, "../../types.ts"), "utf8");
const rules = readFileSync(join(here, "../../../firestore.rules"), "utf8");
const dbSrc = decls(readFileSync(join(here, "../../lib/db.tsx"), "utf8"));

const note = (over: Partial<UserTask>): UserTask => ({
  id: "n1", userId: "u1", text: "A note", done: false,
  createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z", ...over,
});

describe("⚠️ absence is yellow, READ AT RENDER — never backfilled", () => {
  it("a note with no colour is yellow, and a stated colour is itself", () => {
    /* three genuinely different inputs, three distinct answers — a default asserted alone
       cannot tell a working derivation from `return \"yellow\"` */
    const answers = [note({}), note({ colour: "pink" }), note({ colour: "sage" })].map(noteColour);
    expect(answers).toEqual(["yellow", "pink", "sage"]);
    expect(new Set(answers).size).toBe(3);
  });

  it("nothing writes a colour to a note that has none — there is no backfill", () => {
    /* a migration would be inventing a choice the writer never made. The word "backfill" is in
       db.tsx for unrelated reasons, so the check is that NO write path defaults a colour — the
       default exists at the READ only. */
    expect(dbSrc).not.toMatch(/colour\s*(\?\?|\|\|)\s*"yellow"/);
    expect(dbSrc).not.toMatch(/colour:\s*"yellow"/);
    /* the default lives at the READ, in the pure layer, and nowhere else */
    const lib = decls(readFileSync(join(here, "../../lib/noteboard.ts"), "utf8"));
    expect([...lib.matchAll(/\?\?\s*"yellow"/g)].length).toBe(1);
  });
});

describe("⚠️ the type is ADDITIVE, and it reuses the union that already existed", () => {
  it("UserTask gains an optional colour typed as the app's own NoteColour", () => {
    expect(types).toMatch(/colour\?:\s*NoteColour/);
    /* ⚠️ NOT A PARALLEL UNION. `NoteColour = "pink" | "sage" | "yellow"` has been in types.ts
       since the dashboard post-its — the mockup's three colours exactly. A second union naming
       the same three would be two lists to keep in step. */
    expect(types).toContain('export type NoteColour = "pink" | "sage" | "yellow"');
    expect([...types.matchAll(/type NoteColour/g)].length).toBe(1);
    /* and the board's own list is that union, not a hand-typed copy */
    const declared: NoteColour[] = ["yellow", "pink", "sage"];
    expect([...NOTE_COLOURS].sort()).toEqual([...declared].sort());
  });
});

describe("⚠️ the write degrades to yellow — it never costs the note", () => {
  it("the create path does NOT carry colour", () => {
    /* hasOnly() on create denies the whole document for one unlisted key */
    const add = dbSrc.slice(dbSrc.indexOf("const addUserTask"), dbSrc.indexOf("const updateUserTask"));
    expect(dbSrc.indexOf("const addUserTask")).toBeGreaterThan(-1); // the anchor, before the slice
    expect(dbSrc.indexOf("const updateUserTask")).toBeGreaterThan(-1);
    expect(add).not.toContain("colour");
  });

  it("colour rides its OWN write, which reports failure rather than swallowing it", () => {
    /* updateUserTask routes every error through handleFirestoreError and returns void, so a
       denial is invisible to its caller. A control that silently does nothing is worse than no
       control, so the colour write is its own function with a boolean answer. */
    expect(dbSrc).toContain("setUserTaskColour");
    const fn = dbSrc.slice(dbSrc.indexOf("const setUserTaskColour"));
    expect(dbSrc.indexOf("const setUserTaskColour")).toBeGreaterThan(-1);
    expect(fn.slice(0, 700)).toContain("return false");
    expect(fn.slice(0, 700)).toContain("return true");
  });
});

describe("⚠️ the rules are EDITED AND NOT DEPLOYED — the house pattern, stated out loud", () => {
  it("colour is in both allowlists, so one dev rules deploy switches it on", () => {
    /* ⚠️ BOTH ANCHORS ASSERTED BEFORE THE SLICE. indexOf returns -1 for a marker that is not
       there and slice(-1) reads one character from the END, so a renamed anchor widens the slice
       to the rest of the file and every assertion over it silently covers code it never meant
       to see. The repo's own sliceBetween fails loudly naming the missing anchor. */
    const valid = sliceBetween(rules, "function isValidUserTask", "function isValidActivity");
    expect(valid).toContain("'colour'");                       // the create allowlist
    expect(valid).toMatch(/colour in \['pink', 'sage', 'yellow'\]/); // the value shape
    /* and the update's affectedKeys, or every colour change is denied while creates pass */
    const upd = rules.slice(rules.indexOf("match /tasks/{taskId}"));
    expect(rules.indexOf("match /tasks/{taskId}")).toBeGreaterThan(-1);
    expect(upd.slice(0, 1800)).toMatch(/affectedKeys\(\)\.hasOnly\(\[[^\]]*'colour'/);
  });
});
