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
    expect(save).toContain("if (!logAnother) setCreateExiting(true);");
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
     moment a timing changed. Reduced motion still fires `animationend` with `animation: none`, so
     the cut-to-final-frame path closes too. */
  it("the close is bound to animationend, never to a timer", () => {
    expect(queries).toContain("onAnimationEnd={(e) => {");
    expect(queries).toContain('e.animationName !== "qc-exit-save"');
    const handler = queries.slice(queries.indexOf("onAnimationEnd={(e) => {"), queries.indexOf("closeCreate();") + 20);
    expect(handler, "a setTimeout here would drift from the CSS").not.toContain("setTimeout");
  });

  it("and focus returns to the control that opened it", () => {
    expect(queries).toContain("logTriggerRef.current?.focus();");
    expect(queries).toContain('<button ref={logTriggerRef} type="button" className="f12-btn-pri"');
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
