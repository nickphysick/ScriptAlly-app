/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ⚠️ THE CHART IS MEASURED BY ITS WRAPPER'S OWN REF (v35).
 *
 * The dashboard's plot drew nothing for every account on dev from `f0a2368c`: its size came from an
 * effect with `[]` deps that read the wrapper through an object ref, and an early return added above
 * the wrapper meant that effect's only run found nothing, bailed, and never ran again.
 *
 * ⚠️ THIS IS A CONSTRUCTION CLAIM, AND IT IS HERE BECAUSE IT RUNS ON EVERY PUSH. The rendered claim —
 * the plot draws at every width — is `tests/e2e/dashStages.measure.ts` (the line is sampled off the
 * rendered path and every pin and the end marker must sit on it, at five widths), and that
 * harness only runs when somebody runs it. (It was `plotDraws` in `scripts/dash-refdiff.mjs` until that
 * script was retired on 19 Sep with the v16 mockup it compared against.) That is exactly how the fault shipped: the structural gate
 * would have failed on the first run, and the stream that changed the chart never ran it. Two instruments for one fault, on purpose: this one is cheap and always on;
 * the rendered one is the proof that the plot actually paints.
 *
 * ⚠️ IT READS THE REF THE WRAPPER ACTUALLY CARRIES, NOT A NAME TYPED HERE, so renaming the ref does not
 * blind it — and it strips comments first, because the component's own note describes the retired
 * pattern in the words this lock forbids.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const raw = readFileSync(join(__dirname, "OneScreenChart.tsx"), "utf8");
const src = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

describe("⚠️ the chart's size is measured when its wrapper arrives, not once at mount", () => {
  /* ⚠️ RETARGETED, SAME LAW (v33, 18 Sep): the measured element is `.os-acdraw` — the absolute box
     that holds the svg, short of the Mentor — where stage 3 measured `.os-acplot` and the chart before
     it `.os-chartwrap`. The claim is unchanged: the box is measured by a callback ref on the element
     that holds the drawing, so an early return above it cannot leave the chart unmeasured. */
  const attach = /className="os-acdraw"\s+ref=\{(\w+)\}/.exec(src);

  it("the wrapper carries a ref (the anchor every claim below reads)", () => {
    expect(attach, "no ref on .os-acdraw — nothing measures the drawing").not.toBeNull();
  });

  it("that ref is a callback ref, not an object ref read by an effect", () => {
    const id = attach![1];
    expect(src).toMatch(new RegExp("const " + id + "\\s*=\\s*useCallback\\("));
    /* the retired shape: an object ref whose `.current` a mount-once effect reads */
    expect(src).not.toContain(id + ".current");
    expect(src).not.toMatch(new RegExp("const " + id + "\\s*=\\s*useRef"));
  });

  it("the callback observes the wrapper and returns the cleanup that stops observing it", () => {
    const id = attach![1];
    const start = src.indexOf("const " + id + " = useCallback(");
    expect(start).toBeGreaterThan(-1);
    const end = src.indexOf("}, []);", start);
    expect(end).toBeGreaterThan(start);
    const body = src.slice(start, end);
    expect(body).toContain("new ResizeObserver");
    expect(body).toContain(".observe(el)");
    expect(body).toMatch(/return \(\) => ro\.disconnect\(\)/);
  });
});
