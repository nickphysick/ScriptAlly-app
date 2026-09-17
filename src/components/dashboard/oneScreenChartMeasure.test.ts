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
 * the plot draws at every width and frequency — is `plotDraws` in scripts/dash-refdiff.mjs, and that
 * harness only runs when somebody runs it. That is exactly how the fault shipped: the structural gate
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
  /* the stage-3 chart (17 Sep) measures its plot box, `.os-acplot`, where the old chart measured
     `.os-chartwrap` — the same construction on the element that now holds the svg */
  const attach = /className="os-acplot"\s+ref=\{(\w+)\}/.exec(src);

  it("the wrapper carries a ref (the anchor every claim below reads)", () => {
    expect(attach, "no ref on .os-acplot — nothing measures the plot").not.toBeNull();
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
