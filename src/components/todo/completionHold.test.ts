/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE RECEIPT WINDOW'S SOURCE LAWS — drawer round, Phase 5.
 *
 * ⚠️ THESE ARE THE CLAIMS A 31-TASK HARNESS ACCOUNT CANNOT MEASURE, held at source until the
 * fixture gains its sparse shape (the same second-account gap Phase 1's manuscript column has):
 * the LAST task completing closes the drawer, and the expiry never stomps a selection the writer
 * made mid-window. Everything the account CAN measure lives in
 * `tests/e2e/completionLeaves.measure.ts` — 12 rendered assertions, run twice for stability.
 *
 * Source locks, so: comments stripped before any negative claim, slices anchored and asserted,
 * claims about ORDER and SHAPE only — geometry stays in the measurement.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const page = readFileSync(join(__dirname, "ToDoPage.tsx"), "utf8");
const decls = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

describe("the receipt window — the drawer closes on the last task, and only then", () => {
  it("the expiry's advance falls back to NULL, which is the drawer's closed state", () => {
    /* ⚠️ `?? null`, NOT `?? dockable[0]` and not a guard that skips the set — with no next task
       there is nothing to open, and a null dockKey IS closeDock's state: Phase 2's measured close
       machinery (drawerMotion P2.8) takes it from there to the full-width list. The end-to-end
       walk of this needs a one-task account; the SHAPE that makes it inevitable is here. */
    const i = decls.indexOf("const next = list[Math.min(heldPos, list.length - 1)]?.key ?? null;");
    expect(i, "the expiry's next-task derivation is gone or reshaped").toBeGreaterThan(-1);
    const after = decls.slice(i, i + 300);
    expect(after, "the null no longer reaches the dock key").toContain("setDockKey(next)");
  });

  it("the expiry advances ONLY if the writer is still standing on the completed task", () => {
    /* ‹ ›, ↑/↓ and row clicks stay live through the window; stomping a selection made during it
       would be the auto-dock's fault reborn at the other end of the task */
    const i = decls.indexOf("if (dockKeyRef.current !== c.key) return;");
    const j = decls.indexOf("const next = list[Math.min(heldPos");
    expect(i, "the still-standing guard is gone").toBeGreaterThan(-1);
    expect(j, "the advance is gone").toBeGreaterThan(-1);
    expect(i, "the guard no longer precedes the advance").toBeLessThan(j);
  });

  it("the key-vanished effect stands down for a held key", () => {
    /* the race, held off at BOTH ends: armed before the write (the commit wrapper), and the
       narrowing effect refuses to move a key the receipt window owns */
    expect(decls).toContain("if (leavingRef.current === dockKey) return;");
    /* armed BEFORE the awaited write, or latency compensation renders first and the effect wins */
    const arm = decls.indexOf("leavingRef.current = c.key;");
    const write = decls.indexOf("await commitFromPane(c, v, rows);");
    expect(arm, "the stand-down is not armed").toBeGreaterThan(-1);
    expect(write, "the commit call is gone").toBeGreaterThan(arm - 400);
    expect(arm, "the stand-down is armed AFTER the write — the race is back").toBeLessThan(write);
  });

  it("the placement map REMEMBERS — set into the standing ref, never rebuilt from the board", () => {
    /* latency compensation guarantees a post-write render before `completed()` reads the map; a
       rebuilt map has already forgotten the card, and the held row re-enters under a fallback
       group three heads from home. Found by screenshot with every assertion green. */
    expect(decls).toContain("rowPlaceRef.current.set(c.key");
    expect(decls, "the map is rebuilt from scratch again")
      .not.toContain("rowPlaceRef.current = new Map");
    expect(decls, "the map is replaced wholesale").not.toMatch(/rowPlaceRef\.current = m\b/);
  });

  /**
   * ⚠️ RETARGETED, AND THE LAW IS STRONGER WHERE IT WENT (list round, Phase 3). This read the PAGE's
   * own `.filter((g) => g.id !== "done")`, which sat AFTER `applyView` — so it only held while the
   * grouping kept the group's id. Every other grouping flattens the groups and re-heads them, and a
   * finished card walked straight past that filter into a generated head: latent under "By agent"
   * since regrouping shipped, and about to become the default's behaviour when When landed. The
   * membership rule is stated in `applyView` now, beside the snoozed and dismissed ones, and it is
   * asserted over EVERY grouping in `todoListView.test.ts`. What is asserted here is that the page
   * has not grown a second one: two filters for one law is how they come to disagree.
   */
  it("the done group does not render in the list — completion LEAVES, it does not re-file", () => {
    const view = readFileSync(join(__dirname, "..", "..", "lib", "todoListView.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    expect(view, "the view stopped dropping the done group").toContain('if (g.id === "done") return false;');
    expect(decls, "the page grew its own done filter back beside the view's")
      .not.toContain('.filter((g) => g.id !== "done")');
  });
});
