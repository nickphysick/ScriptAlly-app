/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE ENTRANCE — the takeover arrives (fix pack 5 §1, ref 82-create-exits.html).
 *
 * The frame, then its contents in reading order: what you are doing, what is being asked, where to
 * answer it, what comes after. The ref's timings and easings ARE the specification.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");

/** A rule's body. ⚠️ ANCHOR BEFORE YOU SLICE — a miss returns "" and every `.not.toContain` on an
 *  empty string passes, so every caller asserts the rule was found before reading it. */
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

const EASE = "cubic-bezier(0.2, 0.7, 0.3, 1)";

describe("the frame arrives first, and it is the only frame", () => {
  it("the create side of the pane crossfade IS the takeover's frame", () => {
    const r = rule(".f12-pane-enter-create");
    expect(r, "the create entrance rule is missing").not.toBe("");
    expect(r).toContain(`qc-frame-in 220ms ${EASE}`);
    const f = frames("qc-frame-in");
    expect(f, "qc-frame-in is missing").not.toBe("");
    expect(f).toContain("scale(0.985)");
  });

  /* ⚠️ ONE FRAME ANIMATION ON ONE ELEMENT. Adding a second frame class beside this one would both
     double the fade and leave this rule applied by nothing — dead code with a lock still on it. */
  it("the reading side keeps its own, unchanged", () => {
    expect(rule(".f12-pane-enter-read")).toContain("rise 0.18s ease-out backwards");
  });
});

describe("the children stagger in reading order, on the ref's timings", () => {
  const beats: [string, string][] = [
    [".qc-entering .qch", "120ms"],
    [".qc-entering .qc-askq", "200ms"],
    [".qc-entering .qc-pickhead", "250ms"],
    [".qc-entering .qc-stack > .qc-sec:nth-child(1)", "310ms"],
    [".qc-entering .qc-stack > .qc-sec:nth-child(2)", "360ms"],
    [".qc-entering .qc-stack > .qc-sec:last-child", "410ms"],
  ];

  it("every beat is present, 240ms on the ref's easing, at its own delay", () => {
    for (const [sel, delay] of beats) {
      const r = rule(sel);
      expect(r, `${sel} is missing`).not.toBe("");
      expect(r, `${sel} is not on the ref's duration/easing`).toContain(`240ms ${EASE}`);
      expect(r, `${sel} is not on its beat`).toContain(delay);
    }
  });

  it("the rise is 8px, from transparent, and lands at the natural state", () => {
    const f = frames("qc-in");
    expect(f, "qc-in is missing").not.toBe("");
    expect(f).toContain("translateY(8px)");
    expect(f).toContain("opacity: 0");
    expect(f).toContain("transform: none");
  });

  /* ⚠️ `backwards`, NOT `both`. The delays run to 410ms and the children must stay hidden through
     them — that is the backwards half. The forwards half would HOLD the final frame, and a held
     fill outranks inline transforms: the ~7px FLIP displacement in CLAUDE.md is that exact trap.
     Nothing here needs it, because the last frame is already the natural state. */
  it("no child holds its final frame", () => {
    for (const [sel] of beats) {
      expect(rule(sel), `${sel} holds a fill that would outrank an inline transform`)
        .not.toContain("both");
    }
  });

  /* Stage 1 asks the question in words; stage 2 has answered it and shows the agent. Same beat,
     same place — so they share a delay rather than drifting apart as two numbers. */
  it("stage 2's hero takes the question's beat", () => {
    const r = rule(".qc-entering .qc-askq");
    expect(r).toContain(".qc-entering .qc-hero");
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ "THE LAST-DELAYED ELEMENT" IS NOT SOMETHING `animationend` CAN BE ASKED ABOUT. Every child
   fires the same event carrying the same animation name, so a completion bound to `qc-in` would run
   six times — the first of them 530ms early. Counting events instead breaks the day a step is added
   or a stage renders one fewer child. The NAME is the signal.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the completion has something deterministic to listen for", () => {
  it("only the last beat carries the distinct name", () => {
    expect(rule(".qc-entering .qc-stack > .qc-sec:last-child")).toContain("qc-in-last");
    for (const sel of [".qc-entering .qch", ".qc-entering .qc-askq", ".qc-entering .qc-pickhead",
      ".qc-entering .qc-stack > .qc-sec:nth-child(1)", ".qc-entering .qc-stack > .qc-sec:nth-child(2)"]) {
      expect(rule(sel), `${sel} would fire the completion early`).not.toContain("qc-in-last");
    }
  });

  it("and the two names describe the same movement", () => {
    const a = frames("qc-in").replace("qc-in", "");
    const b = frames("qc-in-last").replace("qc-in-last", "");
    expect(b, "the last child must not move differently from its siblings").toBe(a);
  });

  it("the handler dispatches on that name, and never on a timer", () => {
    /* ⚠️ THERE ARE TWO `onAnimationEnd` HANDLERS IN THIS FILE — the row's and the journey's — so a
       bare `indexOf` anchors on the ROW's and reads the wrong handler entirely. Anchored through
       the journey frame first.
       ⚠️ THE FRAME IS THE SHEET NOW, NOT THE PANE (§2). The anchor used to be the pane's className;
       the journey is an overlay portalled out of the page, so the lifecycle handler moved with the
       frame that actually arrives and leaves. Re-anchored rather than loosened — a lock that stops
       naming a specific element is a lock that will find the wrong one. */
    const pane = queries.indexOf("<QueryJourneySheet");
    expect(pane, "the journey sheet is missing").toBeGreaterThan(-1);
    const a = queries.indexOf("onAnimationEnd={(e) => {", pane);
    expect(a, "the sheet's animationend handler is missing").toBeGreaterThan(pane);
    const b = queries.indexOf("}}", a);
    expect(b, "the handler never closes").toBeGreaterThan(a);
    const handler = queries.slice(a, b);
    expect(handler).not.toBe("");
    expect(handler).toContain('e.animationName === "qc-in-last"');
    expect(handler, "a setTimeout would drift from the CSS").not.toContain("setTimeout");
  });
});

describe("it plays once per opening", () => {
  /* ⚠️ THE SCOPE CLASS IS THE BOUND. Hung off `.f12-pane-enter-create` — which is on the pane for
     as long as create mode is open — these rules would replay on every remount of their elements,
     and picking an agent remounts stage 1's question and picker into stage 2's hero and stack. */
  it("the stagger is scoped to a class that is armed and cleared, not to create mode itself", () => {
    for (const [sel] of [[".qc-entering .qch"], [".qc-entering .qc-pickhead"]] as [string][]) {
      expect(rule(sel)).not.toBe("");
    }
    expect(css, "the stagger must not hang off the always-present class")
      .not.toContain(".f12-pane-enter-create .qch");
    /* ⚠️ WIDENED, NOT WEAKENED: both takeovers arm the same entrance scope class. */
    expect(queries).toContain('${createEntering || respEntering ? " qc-entering" : ""}');
  });

  it("armed on opening, cleared when the last child lands", () => {
    expect(queries).toContain("setCreateEntering(!prefersReducedMotion());");
    const fin = queries.indexOf("const finishEntrance = (pane: HTMLElement) => {");
    expect(fin, "finishEntrance is missing").toBeGreaterThan(-1);
    expect(queries.slice(fin, queries.indexOf("};", fin))).toContain("setCreateEntering(false)");
  });

  /* A takeover discarded mid-entrance must not leave the class set: the NEXT opening would then
     render its children already at rest, the stagger silently playing only for writers who did not
     change their mind. */
  it("and cleared on the way out, so a re-open re-arms", () => {
    const shut = queries.indexOf("const shutCreate = (then?: () => void) => {");
    expect(shut, "the create teardown is missing").toBeGreaterThan(-1);
    const body = queries.slice(shut, queries.indexOf("\n  };", shut));
    expect(body).not.toBe("");
    expect(body).toContain("setCreateEntering(false)");
  });
});

describe("focus ends in the field", () => {
  /* ⚠️ IT IS NOT A SECOND GRAB. The field autofocuses on mount so typing works from the first
     frame; this guarantees where focus ENDS UP. Stealing it back at 650ms from a writer who
     clicked or tabbed during the entrance is the behaviour that would actually eat a keystroke. */
  it("the field is only focused if focus has not already moved inside the takeover", () => {
    const fin = queries.indexOf("const finishEntrance = (pane: HTMLElement) => {");
    const body = queries.slice(fin, queries.indexOf("\n  };", fin));
    expect(body).not.toBe("");
    expect(body).toContain("pane.contains(document.activeElement)");
    expect(body).toContain('querySelector<HTMLElement>(".qc-pickfield")?.focus()');
    /* The guard must RETURN before the focus call, not merely be present above it. */
    expect(body.indexOf("return;")).toBeLessThan(body.indexOf(".qc-pickfield"));
  });
});

describe("reduced motion never arms it", () => {
  /* ⚠️ `animation: none` FIRES NO `animationend` — so an armed class would leave `qc-in-last`
     unfired and the scope class on the pane for the rest of the session. */
  it("the arming site asks the preference", () => {
    expect(queries).toContain("setCreateEntering(!prefersReducedMotion());");
  });

  it("and the stylesheet carries the second belt for a mid-flight change", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .qc-entering .qch");
    expect(at, "the entrance's reduced-motion block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at));
    expect(block).toContain("animation: none");
    expect(block, "a shortened animation is still an animation").not.toMatch(/\b\d+ms\b/);
  });
});

/* ⚠️ A `var()` IN A KEYFRAME PERCENTAGE FAILS SILENTLY — the whole block is dropped and the
   animation simply does not play, with nothing in the console. It has cost this project a bug. */
describe("the motion laws hold", () => {
  it("no var() in any keyframe percentage selector", () => {
    for (const name of ["qc-frame-in", "qc-in", "qc-in-last"]) {
      const f = frames(name);
      expect(f, `${name} is missing`).not.toBe("");
      for (const line of f.split("\n")) {
        const sel = line.split("{")[0];
        if (/\d+%/.test(sel)) expect(sel, `${name} has a var() in a keyframe selector`).not.toContain("var(");
      }
    }
  });
});
