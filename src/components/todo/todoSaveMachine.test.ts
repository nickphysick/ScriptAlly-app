/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SAVE STATE MACHINE (save-and-today pack · P1). idle → pending → (saved | failed). A denied
 * or dropped write must fail VISIBLY — never a silent close — and the optimistic insert must not
 * flicker. The classifier is unit-tested; the machine + no-flicker + no-silent-no-op are source
 * locks (the page is auth-gated; jsdom mounts nothing).
 */
import { describe, it, expect } from "vitest";
import { sliceBetween } from "../../test/sliceBetween";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { classifyWriteError, saveErrorCopy, TodoWriteError } from "../../lib/todoWrite";

const here = __dirname;
const page = readFileSync(join(here, "ToDoPage.tsx"), "utf8");
const db = readFileSync(join(here, "..", "..", "lib", "db.tsx"), "utf8");

describe("save machine P1 — the error classifier (permission vs network, by CODE)", () => {
  it("classifies from the Firestore error code, never the message", () => {
    expect(classifyWriteError({ code: "permission-denied" })).toBe("permission");
    expect(classifyWriteError({ code: "unauthenticated" })).toBe("permission");
    expect(classifyWriteError({ code: "unavailable" })).toBe("network");
    expect(classifyWriteError({ code: "deadline-exceeded" })).toBe("network");
    expect(classifyWriteError({ code: "resource-exhausted" })).toBe("network");
    expect(classifyWriteError({ code: "internal" })).toBe("unknown");
    expect(classifyWriteError(new Error("Missing or insufficient permissions"))).toBe("unknown"); // message text is NOT consulted
    expect(classifyWriteError(new TodoWriteError("permission", "x"))).toBe("permission"); // idempotent
  });

  it("the copy distinguishes permission from network, and never leaks a raw Firebase message", () => {
    expect(saveErrorCopy("permission")).toContain("doesn’t have permission yet");
    expect(saveErrorCopy("network")).toMatch(/offline/i);
    expect(saveErrorCopy("unknown")).toBe("Couldn’t save that. Try again?");
    expect(saveErrorCopy("permission")).not.toBe(saveErrorCopy("network"));
    for (const c of ["permission", "network", "unknown"] as const) {
      expect(saveErrorCopy(c).toLowerCase()).not.toContain("firestore");
      expect(saveErrorCopy(c).toLowerCase()).not.toContain("permission-denied");
    }
  });
});

describe("save machine P1 — the write paths throw a typed, coded error", () => {
  it("addUserTask throws a TodoWriteError classified by code (not handleFirestoreError's message-only throw)", () => {
    const add = sliceBetween(db, "const addUserTask =", "const updateUserTask =");
    expect(add).toContain("throw new TodoWriteError(classifyWriteError(e)");
    expect(add).not.toContain("handleFirestoreError(e, OperationType.WRITE"); // the code-discarding path is gone from create
    // the caller can supply the id so the composer knows it BEFORE the optimistic insert
    expect(add).toContain('const id = fields.id ?? "task-"');
  });
});

describe("save machine P1 — idle → pending → (saved | failed)", () => {
  const save = sliceBetween(page, "async function saveComposer", "function renderComposer");

  it("PENDING: sets pending, hides the in-flight id, disables the button, locks fields, suppresses Esc", () => {
    expect(save).toContain('setSaveState("pending")');
    expect(save).toContain("setPendingSaveId(id)");
    expect(save).toContain("if (!composerCanSave || savePending) return;"); // no double-submit
    // the button is disabled + the fields read-only while pending
    expect(page).toContain("disabled={!composerCanSave || savePending}");
    expect(page).toContain("readOnly={savePending}");
    // Esc is suppressed mid-write
    expect(page).toContain("async function tryCloseComposer() {\n    if (savePending) return;");
    // the quiet spinner appears only past ~300ms
    expect(save).toContain("window.setTimeout(() => setSaveSlow(true), 300)");
  });

  /* ⚠️ board fixes II P1 added the EDIT branch ABOVE the create inside saveComposer, so these
     two locks now slice per branch (anchored, per the slice law) instead of trusting "the first
     catch is the create's". The machine's states are shared; each branch is held to them. */
  it("SAVED: the composer closes only AFTER the write resolves; the item is unhidden in place", () => {
    expect(save).toContain('const id = "task-"'); // the branch anchor
    const create = save.slice(save.indexOf('const id = "task-"'));
    const awaitIdx = create.indexOf("await addUserTask(");
    const closeIdx = create.indexOf("closeComposer();");
    expect(awaitIdx).toBeGreaterThan(-1);
    expect(closeIdx).toBeGreaterThan(awaitIdx);
    // the settled item is unhidden (id cleared) as it closes
    expect(create).toContain("setPendingSaveId(null); // the settled item may now render");
    // the edit branch honours the same order: its close follows ITS awaited write
    expect(save).toContain("if (composerEdit) {"); // the branch anchor
    const edit = sliceBetween(save, "if (composerEdit) {", 'const id = "task-"');
    expect(edit.indexOf("closeComposer();")).toBeGreaterThan(edit.indexOf("await updateUserTask("));
  });

  it("FAILED: the write throws → the composer STAYS open with content intact, editable, error set", () => {
    expect(save).toContain("setSaveError(classifyWriteError(e))");
    expect(save).toContain('setSaveState("failed")');
    // NEITHER branch's failure closes the composer or clears the draft
    for (const branch of [
      sliceBetween(save, "if (composerEdit) {", 'const id = "task-"'),
      save.slice(save.indexOf('const id = "task-"')),
    ]) {
      expect(branch).toContain("} catch (e) {");
      const failBranch = branch.slice(branch.indexOf("} catch (e) {"));
      expect(failBranch).not.toContain("closeComposer()");
      expect(failBranch).not.toContain("setComposerDraft");
    }
    // the inline error + a Try again that RE-RUNS the write (retry after a failure)
    expect(page).toContain('{saveErrorCopy(saveError ?? "unknown")}');
    expect(page).toContain('<button type="button" className="tdb-nc-retry" onClick={saveComposer}>Try again</button>');
  });

  it("NO FLICKER: the in-flight create is hidden from the board until it resolves (inserted once, never removed)", () => {
    /* tasks-pages P2 moved the hide into the ONE derivation's input — same contract, one home. */
    expect(page).toContain("hiddenUserTaskId: pendingSaveId");
    const cols = readFileSync(join(here, "..", "..", "lib", "todoColumns.ts"), "utf8");
    expect(cols).toContain("input.userTasks.filter((t) => t.id !== input.hiddenUserTaskId)");
    expect(page).toContain("[tasks, userTasks, pendingSaveId,"); // the board recomputes as the id clears
  });

  it("NO NATIVE DIALOGS anywhere in the save path; the discard confirm is the styled ask", () => {
    for (const nativeDlg of ["window.confirm", "window.alert", "window.prompt"]) expect(page).not.toContain(nativeDlg);
  });
});

describe("save machine P1 — the tick is a write too (no silent no-op)", () => {
  it("ticking a user task complete surfaces a Try-again toast on failure instead of throwing silently", () => {
  /* ⚠️ `quickDone` LEFT THE PAGE for `useTaskCommit` (Pack C Phase 1) so the calendar can reach
     the same primitive. The law below is unchanged; only the file holding it moved. */
    const writer = readFileSync(join(here, "useTaskCommit.tsx"), "utf8");
    const qd = sliceBetween(writer, "async function quickDone", "function writeQueryMaterials");
    expect(qd).toContain("try {\n        await updateUserTask(c.userTaskId, { done: true, completedAt: nowIso });");
    expect(qd).toContain('flash("Couldn’t mark that done — try again?", { label: "Try again", fn: () => quickDone(c) })');
  });
});
