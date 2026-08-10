/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CANCEL — NOTHING HAPPENED (fix pack 5 §2, ref 82-create-exits.html).
 *
 * ⚠️ THE THREE EXITS ARE THREE DIFFERENT STATEMENTS, which is the whole reason this is not the save
 * animation with different numbers. Save says "what you filled in is now that line" and lifts
 * upward toward it; cancel says nothing happened and settles out of the way — no receipt, no row,
 * no trace. If these two ever converge on one animation, the app has stopped saying which happened.
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
const frames = (name: string): string => {
  const at = css.indexOf(`@keyframes ${name}`);
  if (at < 0) return "";
  const open = css.indexOf("{", at);
  let depth = 1, i = open + 1;
  while (i < css.length && depth) { if (css[i] === "{") depth++; else if (css[i] === "}") depth--; i++; }
  return css.slice(at, i);
};

/** `closeCreate`'s `leave()` — where the exit is armed. Both ends anchored (house rule). */
const leaveBody = (): string => {
  const a = queries.indexOf("const leave = () => {");
  expect(a, "closeCreate's leave() is missing").toBeGreaterThan(-1);
  const b = queries.indexOf("\n    };", a);
  expect(b, "leave() never closes").toBeGreaterThan(a);
  return queries.slice(a, b);
};

describe("it is one gesture, and it is quicker than the entrance", () => {
  it("150ms, ease-in, settling 6px down and barely in", () => {
    const r = rule(".qc-exit-cancel");
    expect(r, "the cancel exit rule is missing").not.toBe("");
    expect(r).toContain("qc-exit-cancel 150ms ease-in both");
    const f = frames("qc-exit-cancel");
    expect(f, "the keyframes are missing").not.toBe("");
    expect(f).toContain("translateY(6px)");
    expect(f).toContain("scale(0.995)");
    expect(f).toContain("opacity: 0");
  });

  /* ⚠️ FASTER THAN THE ENTRANCE, ASSERTED AGAINST THE ENTRANCE rather than against the number 150.
     The asymmetry is the claim: undoing an opening should not feel like an event. Pinning both as
     literals would let someone slow this one past the entrance with both tests still green. */
  it("quicker than the frame it is undoing", () => {
    const ms = (s: string) => Number(/(\d+)ms/.exec(s)?.[1] ?? NaN);
    const cancel = ms(rule(".qc-exit-cancel"));
    const entrance = ms(rule(".f12-pane-enter-create"));
    expect(Number.isFinite(cancel) && Number.isFinite(entrance), "a duration could not be read").toBe(true);
    expect(cancel, "leaving must not take longer than arriving").toBeLessThan(entrance);
  });

  /* ⚠️ NEVER A REVERSED STAGGER. A staggered exit makes leaving feel like work, and the writer who
     opened this by accident has to sit through it. There must be no descendant rule under the
     cancel class at all — its absence is the guarantee. */
  it("no per-element delays anywhere under the cancel class", () => {
    for (const line of css.split("\n")) {
      if (!line.includes(".qc-exit-cancel")) continue;
      if (line.trimStart().startsWith("*") || line.trimStart().startsWith("/*")) continue;
      const selector = line.split("{")[0];
      expect(selector.trim().replace(/^\}?\s*/, ""), "a descendant rule would stagger the exit")
        .not.toMatch(/\.qc-exit-cancel\s+\S/);
    }
  });

  /* ⚠️ `both`, NOT `backwards`. The exit must HOLD its final frame, or the takeover flashes back to
     full opacity for a frame between the animation ending and React unmounting it. */
  it("it holds its final frame until the unmount", () => {
    expect(rule(".qc-exit-cancel")).toContain("both");
  });

  it("and it is a different animation from the save, not the same one retimed", () => {
    expect(frames("qc-exit-cancel")).not.toBe(frames("qc-exit-save"));
    /* Save lifts UP toward the row it becomes; cancel settles DOWN out of the way. */
    expect(frames("qc-exit-save")).toContain("translateY(-18px)");
    expect(frames("qc-exit-cancel")).toContain("translateY(6px)");
  });
});

describe("the entrance stops the moment the exit is armed", () => {
  /* Children still arriving while the frame leaves is two gestures at once — and the second of them
     is the stagger playing backwards in effect. The scope class goes first. */
  it("leave() drops the entrance scope before arming anything", () => {
    const leave = leaveBody();
    expect(leave).toContain("setCreateEntering(false);");
    expect(leave.indexOf("setCreateEntering(false)"), "the entrance must be stopped first")
      .toBeLessThan(leave.indexOf("setCreateCancelling(true)"));
  });

  /* A `qc-in-last` already in flight when Cancel is pressed would otherwise put focus back into a
     takeover that is on its way out. */
  it("and a late entrance completion cannot fire while leaving", () => {
    expect(queries).toContain('if (!createCancelling && e.animationName === "qc-in-last")');
  });
});

describe("nothing is left behind", () => {
  it("no receipt and no landed row on this path", () => {
    const leave = leaveBody();
    expect(leave, "cancel leaves no trace — a receipt is a trace").not.toContain("showToast");
    expect(leave, "nor a row").not.toContain("setLandedId");
  });

  it("the continuation survives the 150ms rather than being dropped", () => {
    /* `closeCreate(() => pickRow(id))` must still select that row once the takeover has gone. */
    expect(queries).toContain("cancelThenRef.current = then;");
    const fin = queries.indexOf("const finishCancelExit = () => {");
    expect(fin, "finishCancelExit is missing").toBeGreaterThan(-1);
    const body = queries.slice(fin, queries.indexOf("\n  };", fin));
    expect(body).not.toBe("");
    expect(body).toContain("shutCreate(then)");
    expect(body, "the ref must be cleared or the next cancel replays it").toContain("cancelThenRef.current = undefined;");
  });

  it("focus returns to the control that opened it", () => {
    const fin = queries.indexOf("const finishCancelExit = () => {");
    const body = queries.slice(fin, queries.indexOf("\n  };", fin));
    expect(body).toContain("logTriggerRef.current?.focus();");
  });
});

describe("the door still asks before it leaves", () => {
  /* ⚠️ THE MOTION PLAYS ON THE DECISION, not on the click that raised the question. A takeover
     that began leaving while the confirm was still open would be answering for the writer. */
  it("a dirty draft confirms, and the exit is what the confirm runs", () => {
    const at = queries.indexOf("title: \"Discard this query?\"");
    expect(at, "the discard confirm is missing").toBeGreaterThan(-1);
    const block = queries.slice(at, queries.indexOf("});", at));
    expect(block).not.toBe("");
    expect(block).toContain("onConfirm: leave,");
  });

  /* A second Esc during the 150ms would re-arm the animation from its first frame — the takeover
     flashing back to full opacity on its way out. */
  it("a second cancel while already leaving is ignored", () => {
    const a = queries.indexOf("const closeCreate = (then?: () => void) => {");
    expect(a, "closeCreate is missing").toBeGreaterThan(-1);
    const head = queries.slice(a, queries.indexOf("const leave = () => {", a));
    expect(head).not.toBe("");
    expect(head).toContain("if (createCancelling) return;");
  });

  /* Esc is bound for as long as create mode is open, so it works DURING the entrance too — the
     writer who opened this by accident does not have to wait 650ms to undo it. */
  it("Escape is live from the moment create mode opens, not once it has finished arriving", () => {
    const at = queries.indexOf("if (!creating) return;");
    expect(at, "the Escape effect's gate is missing").toBeGreaterThan(-1);
    const effect = queries.slice(at, queries.indexOf("window.addEventListener(\"keydown\", onKey);", at));
    expect(effect).not.toBe("");
    expect(effect, "Escape must not wait on the entrance").not.toContain("createEntering");
    expect(effect).toContain("closeCreate();");
  });
});

describe("reduced motion tears down directly", () => {
  /* ⚠️ `animation: none` FIRES NO `animationend`. Arming the class under reduced motion would leave
     the teardown waiting on an event that never arrives — a dead Cancel button, which is exactly
     the historic bug createListStandsDown.test.ts exists to prevent. */
  it("the branch comes before the arming, and completes the whole exit", () => {
    const leave = leaveBody();
    expect(leave).toContain("if (prefersReducedMotion()) { shutCreate(then); logTriggerRef.current?.focus(); return; }");
    expect(leave.indexOf("prefersReducedMotion")).toBeLessThan(leave.indexOf("setCreateCancelling(true)"));
  });

  it("and the stylesheet carries the second belt", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .qc-exit-cancel");
    expect(at, "the cancel's reduced-motion block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at));
    expect(block).toContain("animation: none");
    expect(block, "a shortened animation is still an animation").not.toMatch(/\b\d+ms\b/);
  });
});

describe("the motion laws hold", () => {
  it("no var() in any keyframe percentage selector", () => {
    const f = frames("qc-exit-cancel");
    expect(f).not.toBe("");
    for (const line of f.split("\n")) {
      const sel = line.split("{")[0];
      if (/\d+%/.test(sel)) expect(sel, "a var() in a keyframe selector fails silently").not.toContain("var(");
    }
  });

  it("the state class is applied to the element, not merely styled", () => {
    expect(queries).toContain('${createCancelling ? " qc-exit-cancel" : ""}');
  });
});
