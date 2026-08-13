/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre · THE DESK STAYS (§2) — supersedes "the list stands down", which superseded the
 * monogram rail, which superseded the scrim.
 *
 * Four presentations of "focus" have now been tried on this page, and all four are worth naming,
 * because each looked right until it was used:
 *
 *   1. THE SCRIM — dim everything but the pane. Deleted in v2 P1: dimming made the page look
 *      broken rather than focused, and the darkened list stayed CLICKABLE, so it lied.
 *   2. THE MONOGRAM RAIL — collapse the list to 62px of initials. It kept the list PRESENT without
 *      keeping it USEFUL: you could not read a name, and the one thing worth seeing — the draft —
 *      was a 32px circle. A smaller version of a thing whose entire value was being readable.
 *   3. THE LIST HIDES, and the pane takes the full width.
 *   4. THE DESK STAYS, and the journey is a SHEET laid over it (§2).
 *
 * ⚠️ (1) AND (4) ARE NOT THE SAME THING, AND THE DIFFERENCE IS THE ENTIRE SECTION. The old scrim
 * dimmed a page you could still click, which is why it lied. This one belongs to a real overlay:
 * the desk is inert behind it, Escape and scrim-click leave, and focus cannot walk out of the
 * sheet. A dimmed-but-live page is a bug; a dimmed-and-inert page is a dialogue.
 *
 * So the assertions below INVERT the ones this file used to hold. `.qh-take .f12-list
 * { display: none }` is gone, and the class with it — the desk must be whole underneath.
 *
 * ⚠️ WHAT THE OLD FILE GOT RIGHT AND IS KEPT: removing a presentation from this page is never only
 * a CSS deletion. Three things were load-bearing on the draft ROW existing when the rail went, and
 * each would have failed silently — a discard that did nothing, a FLIP measured from a hidden
 * element, and reduced-motion rules for selectors that no longer render. The same class of check
 * applies to the sheet: the lifecycle handler must exist exactly once, or every teardown runs twice.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");
/** Comment-stripped: the deleted class names are DISCUSSED in the prose above their deletion. */
const code = queries.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, "");

const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};

describe("§2 · the desk stays whole beneath the sheet", () => {
  /* ⚠️ THE RULE IS GONE, NOT LOOSENED. A `display: none` on the list is the one edit that would
     make the sheet stop reading as a sheet — it would be an overlay floating above a page that had
     deleted half of itself. Asserted by ABSENCE of the rule, because that is the failure mode. */
  it("nothing hides the list while a journey is open", () => {
    expect(rule(".qh-take .f12-list"), "the stand-down rule came back — the sheet would sit on a half-empty desk")
      .toBe("");
    expect(css, "a stand-down rule came back under another key")
      .not.toMatch(/\.qh-(take|create)\s+\.f12-list/);
  });

  /* ⚠️ AND THE CLASSES WENT WITH IT. A className still computed on every render, still applied,
     matching no rule at all, is what gets "restored" later by someone assuming it once worked. */
  it("the two takeover classes are gone from the page as well as the stylesheet", () => {
    /* ⚠️ COMMENT-STRIPPED, BOTH SIDES. The deletion is EXPLAINED in prose sitting exactly where the
       rule used to be — so a raw scan of either file finds the names it is asserting are absent and
       fails on the explanation. Fourth time in this repo: `position: sticky` in a shell comment,
       `closeCreate()` quoted in a test, `--sa-col-gut` named in the rule that stopped reading it,
       and now this. A rule about code is asserted against code. */
    for (const name of ["qh-take", "qh-create"]) {
      expect(code, `${name} is still applied — it keys nothing now`).not.toContain(name);
      expect(cssCode, `${name} still has a rule`).not.toContain("." + name);
    }
  });

  /* ⚠️ NOT A BLANKET `qh-` SWEEP. `.qh-enter` is the route-entry stagger and `.qh-mv-*` are the
     mobile pusher's states — they share a prefix with the deleted pair and nothing else. */
  it("but the route-entry stagger and the mobile pusher are untouched", () => {
    expect(code, "the load animation went with the takeover classes").toContain("qh-enter");
    expect(code, "the mobile pusher's states went with them").toContain("qh-mv-detail");
    expect(css).toContain(".qh-enter .f12-list");
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
