/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Create mode v3 · P1 — THE LIST STANDS DOWN (supersedes the monogram rail).
 *
 * Three presentations of "focus" have now been tried on this page, and the two that were deleted
 * are worth naming, because each looked right until it was used:
 *
 *   1. THE SCRIM — dim everything but the pane. Deleted in v2 P1: dimming makes the page look
 *      broken rather than focused, and the darkened list stayed clickable, so it lied.
 *   2. THE MONOGRAM RAIL — collapse the list to 62px of initials. Deleted here: it kept the list
 *      PRESENT without keeping it USEFUL. You could not read a name, the selection marker had to
 *      stand down, and the one thing worth seeing — the draft — was a 32px circle. A smaller
 *      version of a thing whose entire value was being readable.
 *   3. THE LIST HIDES. The pane takes the full width; the confirmation is the list RETURNING
 *      with the new row in it, wearing the settle the list already draws for an arriving row.
 *
 * ⚠️ REMOVING THE RAIL WAS NOT A CSS DELETION. Three things in the page were load-bearing on the
 * draft row existing, and each would have failed silently:
 *   · `closeCreate` parked its discard closure in a ref for the row's collapse to fire. No row,
 *     no transitionend, no discard — Cancel would have done NOTHING AT ALL.
 *   · `saveCreate` measured the row's rect for the FLIP. A hidden element measures 0, so every
 *     save would have flown the new row from the top of the window.
 *   · The reduced-motion block suppressed transitions on selectors that no longer render.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");

const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

describe("the list hides; it does not shrink", () => {
  it("display: none, not a width collapse", () => {
    const r = rule(".qh-create .f12-list");
    expect(r, "the stand-down rule is missing").not.toBe("");
    expect(r, "a 0px flex item still takes part in layout — the point is that it does not")
      .toContain("display: none");
  });

  it("desktop only — below md the pusher already does this job", () => {
    const at = css.indexOf("@media (min-width: 768px) {");
    expect(at, "the rule escaped its desktop scope").toBeGreaterThan(-1);
    expect(css.indexOf(".qh-create .f12-list")).toBeGreaterThan(at);
  });

  it("the width transition went with the rail — nothing animates a width any more", () => {
    expect(rule(".f12-list"), "a rail leftover").not.toContain("transition: width");
  });
});

describe("the rail machinery is gone, every trace", () => {
  for (const dead of ["--f12-railw", "f12-draft", "f12-drafttag"]) {
    it(`${dead} survives nowhere`, () => {
      const bareCss = css.replace(/\/\*[\s\S]*?\*\//g, "");
      const bareTsx = queries.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
      expect(bareCss, `${dead} is still in f12.css`).not.toContain(dead);
      expect(bareTsx, `${dead} is still in Queries.tsx`).not.toContain(dead);
      expect(read("../index.css"), `${dead} is still in index.css`).not.toContain(dead);
    });
  }

  it("and so is the state that served it", () => {
    const bare = queries.replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "").replace(/\/\/[^\n]*/g, "");
    for (const s of ["draftIn", "draftSaved", "draftRowRef", "pendingDiscardRef", "fromTop"]) {
      expect(bare, `${s} outlived the row it choreographed`).not.toContain(s);
    }
  });
});

describe("the three things that would have broken silently", () => {
  /* ⚠️ THE ONE THAT MATTERS MOST. The discard used to be deferred into a ref and fired by the
     draft row's height transitionend. With no row, that closure is never called and create mode
     simply refuses to close — a dead Cancel button, with no error anywhere. */
  it("the discard runs directly — Cancel cannot depend on a row that is not rendered", () => {
    const at = queries.indexOf("const shutCreate = (then?: () => void) => {");
    expect(at, "shutCreate() is missing").toBeGreaterThan(-1);
    const shut = queries.slice(at, queries.indexOf("\n  };", at));
    expect(shut).not.toBe("");
    expect(shut, "the discard is deferred again — Cancel will do nothing").not.toContain("pendingDiscardRef");
    expect(shut, "the reset must happen in the teardown itself").toContain("setCreateDraft(null)");
    expect(shut, "the stashed selection must still be restored").toContain("setSelectedQueryId(restore)");
    expect(shut, "the caller's continuation must still run").toContain("then?.()");
  });

  /* ⚠️ FIX PACK 5 §2 GAVE CANCEL A 150ms EXIT, WHICH IS A DEFERRAL — so the distinction this
     describe() exists to protect has to be stated rather than assumed. The historic bug was not
     "waiting"; it was waiting on a SIBLING that had been deleted, so the closure was never called.
     The exit waits on the takeover's OWN animation — the element that is leaving, and therefore by
     definition rendered — and under reduced motion it does not wait at all. */
  it("the cancel exit waits on the takeover itself, and not at all under reduced motion", () => {
    /* ⚠️ ANCHORED THROUGH `closeCreate` — `closeRecord` has its own `leave()`, declared earlier. */
    const door = queries.indexOf("const closeCreate = (then?: () => void) => {");
    expect(door, "closeCreate is missing").toBeGreaterThan(-1);
    const at = queries.indexOf("const leave = () => {", door);
    expect(at, "closeCreate's leave() is missing").toBeGreaterThan(door);
    const leave = queries.slice(at, queries.indexOf("\n    };", at));
    expect(leave).not.toBe("");
    /* The teardown must be reachable WITHOUT the animation, or a suppressed animation is a dead
       Cancel button — the exact shape of the original bug. */
    expect(leave, "reduced motion must tear down directly")
      .toContain("if (prefersReducedMotion()) { shutCreate(then); logTriggerRef.current?.focus(); return; }");
    expect(leave, "and the deferral is armed only after that branch").toContain("setCreateCancelling(true);");
    expect(leave.indexOf("prefersReducedMotion")).toBeLessThan(leave.indexOf("setCreateCancelling(true)"));
  });

  it("the save no longer measures a hidden element", () => {
    expect(queries, "the FLIP came back").not.toContain("Math.abs(delta)");
    expect(queries, "the FLIP came back").not.toContain("getBoundingClientRect().top");
  });

  /* The save path still waits for the listener before handing over — that was never about the
     row, and dropping it would show an empty pane between the write and the data arriving. */
  it("but the wait-for-the-listener handover is untouched", () => {
    expect(queries).toContain("const saved = queries.find((q) => q.id === pendingSave.id);");
    expect(queries).toContain("if (!saved) return;");
    expect(queries, "the confirmation beat").toContain("setSettleId(pendingSave.id)");
  });
});
