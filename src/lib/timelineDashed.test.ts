/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §2 — on the timeline, dashed means provisional and nothing else.
 *
 * ⚠️ THIS IS A SOURCE LOCK AND IT IS THE RIGHT TOOL HERE, which is worth stating because this repo
 * has a standing rule against using one for layout claims. The claim is not "this element ends up
 * looking like so" — it is "this stylesheet declares no OTHER dashed border on the timeline", which
 * is a fact about the file and can only be checked in the file. The two rules that survive are
 * named, so a third arriving fails rather than quietly joining them.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");
const f12 = strip(readFileSync(new URL("../components/shell/f12.css", import.meta.url), "utf8"));
const composer = strip(readFileSync(new URL("../components/reading-pane/timelineComposer.css", import.meta.url), "utf8"));

/** Every selector in a sheet whose rule declares a dashed border. */
const dashedSelectors = (css: string): string[] => {
  /* ⚠️ TYPED EXPLICITLY. `String.match` returns `RegExpMatchArray | null`, and `|| []` widens the
     fallback to `never[]` — so `rule` inferred as `never` and tsc rejected `.split`. Vitest passed
     regardless (esbuild strips types), which is exactly the gap between the two gates. */
  const rules: string[] = css.match(/[^{}]+\{[^}]*\}/g) ?? [];
  return rules
    .filter((rule) => /border(-style)?\s*:[^;]*dashed/.test(rule.split("{")[1] ?? ""))
    .map((rule) => rule.split("{")[0].trim().replace(/\s+/g, " "));
};

describe("§2 · dashed on the timeline means provisional", () => {
  /* the two that may: a future the writer scheduled, and a date the writer estimated */
  const ALLOWED = [".tl-ghostmark", ".tl-ghostpanel", ".tl-waitmark--est"];

  it("only the ghost rung and the writer's estimate wear it", () => {
    const timeline = dashedSelectors(f12).filter((sel) => /(^|[\s,])\.tl-/.test(sel));
    for (const sel of timeline) {
      expect(ALLOWED.some((a) => sel.includes(a)), `a third meaning for dashed on the timeline: ${sel}`).toBe(true);
    }
    /* ⚠️ AND BOTH ARE STILL THERE — a lock that only forbids passes when the feature is deleted. */
    expect(timeline.join(" "), "the writer's estimate lost its dashed ring").toContain(".tl-waitmark--est");
    expect(timeline.join(" "), "the nudge ghost lost its dashed mark").toContain(".tl-ghostmark");
  });

  it("the composer's action chips carry none", () => {
    expect(dashedSelectors(composer), "an action chip is wearing the provisional signal again").toEqual([]);
  });

  /**
   * ⚠️ THE PANE IS A DIFFERENT SURFACE AND KEEPS ITS OWN USES — recorded so the boundary is a
   * decision rather than an oversight. `.qp-inplace` (a dashed underline meaning "editable in
   * place") and `.f12-addmat` (a dashed add tile) are both fine and deliberately untouched.
   */
  it("the pane's own dashed affordances are untouched", () => {
    expect(f12, ".qp-inplace lost its editable underline").toMatch(/\.qp-inplace[^{]*\{[^}]*dashed/);
    expect(f12, ".f12-addmat lost its dashed add tile").toMatch(/\.f12-addmat[^{]*\{[^}]*dashed/);
  });
});
