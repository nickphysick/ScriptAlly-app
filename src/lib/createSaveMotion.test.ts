/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE SAVE TRANSITION — the form becomes the row (fix pack 5 §3, ref 82-create-exits.html).
 *
 * ⚠️ THE CLAIM THIS MOTION MAKES IS "what you filled in is now that line". The two halves must
 * OVERLAP: played in sequence it reads as two events — a form closing, and separately a row
 * arriving — which is the opposite of the thing being said.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");

/**
 * The body of `saveCreate`.
 *
 * ⚠️ ANCHOR BEFORE YOU SLICE (house rule). The first version of this sliced to `const closeCreate`,
 * which is declared BEFORE `saveCreate` — so the range ran backwards and every extraction was "",
 * at which point `.not.toContain` passes on nothing. Both ends are asserted.
 */
const saveBody = (): string => {
  const a = queries.indexOf("const saveCreate = async");
  const b = queries.indexOf("if (!pendingSave) return;", a);
  expect(a, "saveCreate is missing").toBeGreaterThan(-1);
  expect(b, "the pendingSave effect that follows it is missing").toBeGreaterThan(a);
  return queries.slice(a, b);
};

const rule = (selector: string): string => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp("\\n[ \\t]*" + esc + "\\s*[,{]").exec(css);
  if (!m) return "";
  const open = css.indexOf("{", m.index);
  return open < 0 ? "" : css.slice(m.index, css.indexOf("}", open) + 1);
};
const frames = (name: string): string => {
  const at = css.indexOf(`@keyframes ${name}`);
  if (at < 0) return "";
  const open = css.indexOf("{", at);
  let depth = 1, i = open + 1;
  while (i < css.length && depth) { if (css[i] === "{") depth++; else if (css[i] === "}") depth--; i++; }
  return css.slice(at, i);
};

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ THE EXIT PLAYS ON WRITE SUCCESS, NEVER ON CLICK. A failed save must not have already shown a
   row that then vanishes. This is the assertion that matters most in the file.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("nothing animates until the write resolves", () => {
  it("the exit is armed past every early return, not in the click handler", () => {
    const save = saveBody();
    expect(save).toContain("if (!logAnother) {");
    expect(save).toContain("else setCreateExiting(true);");
    /* It must sit AFTER the failure branch — if it were above, a rejected write would animate. */
    expect(save.indexOf("setCreateError(res.error"), "the failure branch is missing")
      .toBeGreaterThan(-1);
    expect(save.indexOf("setCreateExiting(true)"), "the exit must come after the failure return")
      .toBeGreaterThan(save.indexOf("setCreateError(res.error"));
    expect(save.indexOf("setCreateExiting(true)"), "and after the write itself")
      .toBeGreaterThan(save.indexOf("await addQuery"));
  });

  /* A rejected write leaves the takeover open with its error: the early return happens before the
     exit is armed, and `createExiting` is what the class reads. */
  it("a rejected write returns before anything is armed", () => {
    const save = saveBody();
    const fail = save.slice(save.indexOf("if (!res.success"), save.indexOf("if (createDraft.journal"));
    expect(fail).toContain("return;");
    expect(fail, "a failed save must not arm the exit").not.toContain("setCreateExiting");
    expect(fail, "nor land a row").not.toContain("setLandedId");
  });

  /* The button holds its pressed state while the write is in flight — a spinner in place is
     honest; an optimistic exit is a claim the app cannot yet make. */
  it("the button stays pressed while the write is in flight", () => {
    expect(queries).toContain('{createSaving ? "Saving…" : "Save query"}');
    expect(queries).toContain("disabled={!createReady || createSaving}");
  });
});

describe("the two halves overlap rather than sequence", () => {
  it("the takeover lifts as specified", () => {
    const f = frames("qc-exit-save");
    expect(f).toContain("translateY(-18px)");
    expect(f).toContain("scale(0.985)");
    expect(rule(".qc-exit-save")).toContain("220ms cubic-bezier(0.5, 0, 0.75, 0)");
  });

  it("and the row lands over a longer beat, so the two are on screen together", () => {
    const f = frames("qc-row-land");
    expect(f).toContain("translateY(-10px)");
    expect(rule(".f12-row.qc-landed")).toContain("420ms");
    /* ⚠️ NO DELAY ON THE LANDING. A delay would sequence them, and sequencing is exactly the
       reading this motion exists to avoid. */
    expect(rule(".f12-row.qc-landed"), "a delay would make it two events")
      .not.toMatch(/\b\d+ms\s+\d+ms/);
  });

  /* The ring is a receipt, not a highlight: it holds long enough to be seen arriving after the eye
     has followed the takeover upward. */
  it("the sage ring holds to 55% and then settles into the normal rim", () => {
    const f = frames("qc-row-land");
    expect(f).toContain("55%");
    expect(f).toContain("inset 0 0 0 1px #8a9e88");
    expect(f, "and it must end at nothing, not linger").toContain("inset 0 0 0 0 rgba(138, 158, 136, 0)");
  });
});

/* ══ §0 · THE MOTION LAWS ══════════════════════════════════════════════════════════════════ */
describe("the motion laws hold", () => {
  /* ⚠️ A `var()` IN A KEYFRAME PERCENTAGE FAILS SILENTLY — the whole block is dropped and the
     animation simply does not play, with nothing in the console. It has cost this project a bug. */
  it("no var() in any keyframe percentage selector", () => {
    for (const name of ["qc-exit-save", "qc-row-land"]) {
      const f = frames(name);
      expect(f, `${name} is missing`).not.toBe("");
      for (const line of f.split("\n")) {
        const sel = line.split("{")[0];
        if (/\d+%/.test(sel)) expect(sel, `${name} has a var() in a keyframe selector`).not.toContain("var(");
      }
    }
  });

  /* ⚠️ REDUCED MOTION CUTS TO THE FINAL FRAME — no animation, not a shortened one. */
  it("reduced motion removes the animation rather than shortening it", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .qc-exit-save");
    expect(at, "the reduced-motion block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at));
    expect(block).toContain("animation: none");
    expect(block, "a shortened animation is still an animation").not.toMatch(/\b\d+ms\b/);
    expect(block, "the takeover must still end up gone").toContain("opacity: 0");
  });

  /* ⚠️ THE STATE CLASS GOES ON THE CONTAINER — a class that exists only in the stylesheet
     animates nothing. */
  it("the state class is applied to the element, not merely styled", () => {
    expect(queries).toContain('${createExiting ? " qc-exit-save" : ""}');
    expect(queries).toContain('${landedId === q.id ? " qc-landed" : ""}');
  });

  /* ⚠️ THE TAKEOVER GOES WHEN THE ANIMATION ENDS, not after a hardcoded delay that would drift the
     moment a timing changed. */
  it("the close is bound to animationend, never to a timer", () => {
    /* ⚠️ TWO `onAnimationEnd` HANDLERS LIVE IN THIS FILE — the row's and the pane's. A bare
       `indexOf` anchors on the row's and reads a slice spanning everything in between, which is
       how a lock ends up green while looking at code it was never pointed at. */
    const pane = queries.indexOf("className={`qp-pane f12-detail");
    expect(pane, "the pane's className is missing").toBeGreaterThan(-1);
    const a = queries.indexOf("onAnimationEnd={(e) => {", pane);
    expect(a, "the pane's animationend handler is missing").toBeGreaterThan(pane);
    /* One handler, dispatching on the animation NAME — the entrance and the exit both end on this
       element, so a handler that did not discriminate would close the takeover the moment it had
       finished arriving. */
    expect(queries).toContain('createExiting && e.animationName === "qc-exit-save"');
    /* ⚠️ ANCHOR BOTH ENDS, AND ASSERT THE RANGE RUNS FORWARDS. The first version of this sliced to
       `queries.indexOf("closeCreate();")`, which first occurs in the ESCAPE handler ~2,000 lines
       ABOVE — so the range ran backwards, the extraction was "", and `.not.toContain` passed on
       nothing. It is the very fault this file's header warns about, committed in this file. */
    const b = queries.indexOf("finishSaveExit();", a);
    expect(b, "the handler no longer completes through finishSaveExit").toBeGreaterThan(a);
    const handler = queries.slice(a, b);
    expect(handler, "the slice must not be empty").not.toBe("");
    expect(handler, "a setTimeout here would drift from the CSS").not.toContain("setTimeout");
  });

  it("and focus returns to the control that opened it", () => {
    expect(queries).toContain("logTriggerRef.current?.focus();");
    expect(queries).toContain('<button ref={logTriggerRef} type="button" className="f12-btn-pri"');
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ `animation: none` DOES NOT FIRE `animationend` — verified in-browser, 10 Aug. The shipped
   comment asserted the opposite, and the consequence was severe: under reduced motion the pane kept
   `qc-exit-save` (which is `opacity: 0` in that block) after every successful save, with no event
   left to clear it — the reading pane blanked for the rest of the session.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("reduced motion completes without an event that never arrives", () => {
  it("the class is never armed when motion is suppressed", () => {
    const save = saveBody();
    const at = save.indexOf("if (prefersReducedMotion()) finishSaveExit();");
    expect(at, "the reduced-motion branch is missing").toBeGreaterThan(-1);
    /* The branch must sit BEFORE the arming, as its alternative — not after it as a repair. */
    expect(save.indexOf("else setCreateExiting(true);")).toBeGreaterThan(at);
  });

  it("it is a branch on the preference, never a timer standing in for the animation", () => {
    const save = saveBody();
    expect(save, "a setTimeout here is the drift this exists to avoid").not.toContain("setTimeout");
    expect(queries).toContain('import { prefersReducedMotion } from "../lib/reducedMotion";');
  });

  /* ⚠️ READ AT THE MOMENT OF USE. A module-level const answers with whatever was true when the
     bundle was first evaluated, so a writer turning the preference on mid-session gets the old
     answer for the rest of the session. */
  it("the helper asks the preference when called, and is node-safe", () => {
    const lib = read("./reducedMotion.ts");
    expect(lib).toContain("export const prefersReducedMotion = (): boolean =>");
    expect(lib).toContain('typeof window !== "undefined"');
    expect(lib, "caching it at module load answers with a stale preference")
      .not.toMatch(/^const\s+\w+\s*=\s*typeof window/m);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ THE SAVE EXIT MUST NOT COMPLETE THROUGH `closeCreate`. That is the DISCARD door: it owns the
   dirty-confirm, so a listener slower than the 220ms exit would put "Discard this query?" on screen
   after a SUCCESSFUL save; and it restores the stashed selection, overriding the saved row the
   pendingSave effect had just selected.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the save exit does not go out through the discard door", () => {
  it("completion is finishSaveExit, and it is not closeCreate", () => {
    const a = queries.indexOf("const finishSaveExit = () => {");
    expect(a, "finishSaveExit is missing").toBeGreaterThan(-1);
    const b = queries.indexOf("};", a);
    expect(b, "its body never closes").toBeGreaterThan(a);
    const body = queries.slice(a, b);
    expect(body).not.toBe("");
    expect(body, "the discard door would confirm after a successful save").not.toContain("closeCreate");
    expect(body, "and would override the selection the pendingSave effect sets")
      .not.toContain("setSelectedQueryId");
    expect(body, "the exit flag must clear or the pane stays armed").toContain("setCreateExiting(false)");
    expect(body, "and the draft must go even if the listener never delivers").toContain("setCreateDraft(null)");
  });
});

/* ⚠️ THE RECEIPT IS THE APP'S EXISTING TOAST. `showToast` already owns one-at-a-time replacement
   and lives in this file already; a receipt built here would be a parallel system that drifts. */
describe("the receipt uses the primitive that already exists", () => {
  it("showToast, not a second receipt system", () => {
    expect(queries).toContain("const { showConfirm, showToast } = useToast();");
    const save = saveBody();
    expect(save).toContain("showToast({");
    expect(save).toContain("logged");
  });
});
