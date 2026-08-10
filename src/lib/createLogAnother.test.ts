/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SAVE & LOG ANOTHER — YOU DID NOT LEAVE (fix pack 5 §4, ref 82-create-exits.html).
 *
 * ⚠️ THIS IS THE ONE PATH WITH NO EXIT, and that is the whole statement. The takeover stays; only
 * its body wipes and reseats, the chips reset, and a tally appears. Exiting and re-entering here
 * would be a lie: you never went anywhere.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");
const css = read("../components/shell/f12.css");
const queries = read("../components/Queries.tsx");
const pane = read("../components/queries/QueryCreatePane.tsx");
const toast = read("../components/toast/ToastProvider.tsx");

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

/** The `again` branch of the pendingSave effect. Both ends anchored (house rule). */
const againBranch = (): string => {
  const a = queries.indexOf("if (pendingSave.again) {");
  expect(a, "the batch fork is missing").toBeGreaterThan(-1);
  const b = queries.indexOf("setPendingSave(null);", a);
  expect(b, "the branch never resolves the pending save").toBeGreaterThan(a);
  return queries.slice(a, b);
};

describe("the takeover does not leave", () => {
  it("the batch fork arms no exit at all", () => {
    const again = againBranch();
    expect(again, "an exit here would tear down a takeover that never went anywhere")
      .not.toContain("setCreateExiting");
    expect(again, "nor a cancel").not.toContain("setCreateCancelling");
    expect(again, "nor a teardown").not.toContain("shutCreate");
  });

  /* The exit is armed only for the non-batch save — `if (!logAnother)`. */
  it("and the save path only arms one when it is genuinely leaving", () => {
    const a = queries.indexOf("const saveCreate = async");
    expect(a, "saveCreate is missing").toBeGreaterThan(-1);
    const b = queries.indexOf("if (!pendingSave) return;", a);
    expect(b).toBeGreaterThan(a);
    expect(queries.slice(a, b)).toContain("if (!logAnother) {");
  });
});

describe("the body wipes and reseats, and the header holds still", () => {
  it("300ms on the ref's easing, and it holds its final frame", () => {
    const r = rule(".qc-reseat .qc-take-body");
    expect(r, "the reseat rule is missing").not.toBe("");
    expect(r).toContain("qc-reseat 300ms cubic-bezier(0.2, 0.7, 0.3, 1) both");
  });

  /* ⚠️ THE 35%/36% PAIR IS THE WIPE. The body leaves upward, is REPLACED at the bottom of its
     travel while invisible, and rises back. A single fade reads as the same page flickering; this
     reads as one sheet going and another arriving. Tidying the two frames into one destroys it. */
  it("the replacement happens out of sight, between two adjacent frames", () => {
    const f = frames("qc-reseat");
    expect(f, "the keyframes are missing").not.toBe("");
    expect(f).toContain("35%");
    expect(f).toContain("36%");
    expect(f, "the body must leave upward").toContain("translateY(-6px)");
    expect(f, "and return from below").toContain("translateY(6px)");
    const at35 = f.indexOf("35%"), at36 = f.indexOf("36%");
    const between = f.slice(at35, f.indexOf("\n", at36));
    expect(between, "the swap must happen while invisible").toContain("opacity: 0");
  });

  /* The header is the thing that says what you are doing; it must not move. The rule reaches the
     BODY only, through a hook on the pane's own root. */
  it("the animation targets the body, never the whole takeover", () => {
    expect(rule(".qc-reseat .qc-take-body")).not.toBe("");
    expect(rule(".qc-reseat"), "animating the container would take the header with it").toBe("");
    expect(pane, "the body hook is missing from the pane's root")
      .toContain('className="f12-detail qc-take-body"');
  });

  /* ⚠️ NO WRAPPER DIV. This column's height chain is load-bearing (see the `.qc-ghosts` note in
     CLAUDE.md — an auto margin there opened a 514px hole); an extra flex parent silently rewrites
     it. The hook is a class on an element that already exists. */
  it("the hook adds no layout of its own", () => {
    const r = rule(".qc-reseat .qc-take-body");
    for (const prop of ["display", "flex", "height", "min-height", "padding", "margin"]) {
      expect(r, `${prop} on the hook would rewrite the height chain`).not.toContain(`${prop}:`);
    }
  });
});

describe("the chips reset with the draft", () => {
  /* They report which steps have been OPENED. Leaving them ticked would state that the writer had
     confirmed a date and a manuscript for a record they have not looked at yet. The values carry
     over; the claim that they were checked does not. */
  it("createOpened is cleared in the batch fork", () => {
    expect(againBranch()).toContain("setCreateOpened({ when: false, what: false });");
  });

  it("and the values that are agent-independent still carry over", () => {
    const again = againBranch();
    for (const k of ["dateSent", "sendMethod", "reminder"]) {
      expect(again, `${k} should survive the reseat`).toContain(k);
    }
  });
});

describe("the tally counts the sitting", () => {
  it("it increments on each batch save, and starts a new opening at nothing", () => {
    expect(againBranch()).toContain("setSessionLogged((n) => n + 1);");
    const open = queries.indexOf("const openCreate = (seed:");
    expect(open, "openCreate is missing").toBeGreaterThan(-1);
    const body = queries.slice(open, queries.indexOf("\n  };", open));
    expect(body).not.toBe("");
    expect(body, "a takeover opening at '3 logged' counts a session already finished")
      .toContain("setSessionLogged(0);");
  });

  /* "0 logged" is a statement about nothing. */
  it("it is absent until this sitting has produced something", () => {
    expect(queries).toContain("{sessionLogged > 0 && (");
  });

  it("and it is session-only — never stored", () => {
    expect(queries, "the tally is a fact about a stretch of work, not about the account")
      .not.toMatch(/sessionLogged[^\n]*(updateUser|localStorage|setDoc)/);
  });
});

/* ══════════════════════════════════════════════════════════════════════════════════════════
   ⚠️ ONE RECEIPT AT A TIME. Two receipts on screen, each offering Undo, with nothing to say which
   undoes which. `showToast` STACKED — that was the finding — so the primitive gained a channel
   rather than the app gaining a second receipt system.
   ══════════════════════════════════════════════════════════════════════════════════════════ */
describe("the receipt replaces rather than stacks", () => {
  it("the toast primitive understands channels", () => {
    expect(toast).toContain("replaces?: string;");
    expect(toast).toContain("opts.replaces ? prev.filter((t) => t.replaces !== opts.replaces) : prev");
  });

  /* ⚠️ ABSENT → STACKS, EXACTLY AS BEFORE. Stacking is right for unrelated actions; three different
     writes each deserve their own confirmation. Making replacement the default would have changed
     every existing call site silently. */
  it("and a toast without a channel is untouched", () => {
    const at = toast.indexOf("const showToast = useCallback");
    expect(at).toBeGreaterThan(-1);
    const body = toast.slice(at, toast.indexOf("}, [dismiss]);", at));
    expect(body).not.toBe("");
    /* The ternary's else branch: no channel → the existing list is spread through untouched. */
    expect(body).toContain(": prev)");
  });

  it("both save paths share one channel, named once", () => {
    expect(queries).toContain('const CREATE_RECEIPT_CHANNEL = "query-created";');
    expect(queries).toContain("replaces: CREATE_RECEIPT_CHANNEL,");
    /* One showToast in saveCreate, serving both messages — two calls could drift onto two channels
       and stack after all. */
    const a = queries.indexOf("const saveCreate = async");
    const b = queries.indexOf("if (!pendingSave) return;", a);
    const save = queries.slice(a, b);
    expect(save.split("showToast({").length - 1, "two receipt calls can drift apart").toBe(1);
    expect(save).toContain("Ready for the next.");
  });
});

describe("focus comes back to where the next query begins", () => {
  it("the reseat completes on its own animation name", () => {
    expect(queries).toContain('if (createReseating && e.animationName === "qc-reseat")');
    const fin = queries.indexOf("const finishReseat = (pane: HTMLElement) => {");
    expect(fin, "finishReseat is missing").toBeGreaterThan(-1);
    const body = queries.slice(fin, queries.indexOf("\n  };", fin));
    expect(body).not.toBe("");
    expect(body).toContain("setCreateReseating(false)");
    expect(body).toContain('querySelector<HTMLElement>(".qc-pickfield")?.focus()');
  });

  /* The picker remounts with the agent cleared and autofocuses itself, so this is the guarantee
     rather than the mechanism — and it must not take focus off a writer already typing into it. */
  it("and it does not steal focus from someone already typing", () => {
    const fin = queries.indexOf("const finishReseat = (pane: HTMLElement) => {");
    const body = queries.slice(fin, queries.indexOf("\n  };", fin));
    expect(body).toContain("pane.contains(document.activeElement)");
    expect(body.indexOf("return;")).toBeLessThan(body.indexOf(".qc-pickfield"));
  });
});

describe("reduced motion never arms it", () => {
  it("the branch is at the arming site", () => {
    expect(againBranch()).toContain("if (!prefersReducedMotion()) setCreateReseating(true);");
  });

  it("and the stylesheet carries the second belt", () => {
    const at = css.indexOf("@media (prefers-reduced-motion: reduce) {\n  .qc-reseat .qc-take-body");
    expect(at, "the reseat's reduced-motion block is missing").toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("\n}", at));
    expect(block).toContain("animation: none");
    expect(block, "a shortened animation is still an animation").not.toMatch(/\b\d+ms\b/);
  });
});

/* ⚠️ EVERY `var()` A RULE READS MUST RESOLVE TO A DEFINITION. The first draft of the tally read
   `--sage-tx` and `--sage-soft` behind inline fallbacks; neither exists anywhere in this app, so it
   would have rendered the right colour while naming nothing — the `--pad-r` fault in CLAUDE.md. */
describe("the tally reads tokens that exist", () => {
  it("every custom property it names is defined", () => {
    const index = read("../index.css");
    const r = rule(".qch-tally");
    expect(r, "the tally rule is missing").not.toBe("");
    const named = [...r.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
    expect(named.length, "the rule reads no tokens at all — has it been rewritten?").toBeGreaterThan(0);
    for (const t of named) {
      expect(`${index}${css}`.includes(`${t}:`), `${t} is read but never defined`).toBe(true);
    }
  });
});

describe("the motion laws hold", () => {
  it("no var() in any keyframe percentage selector", () => {
    const f = frames("qc-reseat");
    expect(f).not.toBe("");
    for (const line of f.split("\n")) {
      const sel = line.split("{")[0];
      if (/\d+%/.test(sel)) expect(sel, "a var() in a keyframe selector fails silently").not.toContain("var(");
    }
  });
});
