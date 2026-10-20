import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { ScatterSettleLoader } from "./ScatterSettleLoader";
import type { LoaderProgress } from "../../lib/importEstimate";

const cards = Array.from({ length: 8 }, (_, i) => ({ messy: `Agent ${i} · Agency · 14/03/2024 · queried` }));
const render = (progress?: LoaderProgress, complete = false) =>
  renderToStaticMarkup(<ScatterSettleLoader cards={cards} complete={complete} total={8} onProceed={() => {}} progress={progress} />);
const strip = (html: string) => html.slice(html.indexOf('data-im="strip"'));
const at = (p: Partial<LoaderProgress>): LoaderProgress => ({ rowsTotal: 150, rowsDone: 0, phase: "opening", stream: "live", ...p });

describe("the reading loader's foot bar (loader v2)", () => {
  it("opens on the row count and the estimate, over the shimmer", () => {
    const s = strip(render(at({})));
    expect(s).toContain("Opening your file…");
    expect(s).toContain("150 rows · about 2 minutes");
    expect(s).toContain('data-im="shimmer"');
    expect(s).not.toContain('data-im="fill"');
  });
  it("names the row being read, with a fill", () => {
    const s = strip(render(at({ phase: "reading", rowsDone: 40 })));
    expect(s).toContain("Reading row 40 of 150");
    expect(s).toContain('data-im="fill"');
    expect(s).not.toContain('data-im="shimmer"');
  });
  it("never renders the retired words or the sample count, in any phase", () => {
    for (const p of [at({}), at({ phase: "reading", rowsDone: 0 }), at({ phase: "reading", rowsDone: 75 }), at({ phase: "retry" }), at({ stream: "none" }), undefined]) {
      const s = strip(render(p));
      expect(s).not.toMatch(/Larger import|almost there…|\/ 8\b|Parsing agents|Interpreting dates|Matching statuses/);
      expect(s).not.toContain('data-im="count"');
    }
  });
  it("says tidying once the data is back, whatever the host last said", () => {
    expect(strip(render(at({ phase: "reading", rowsDone: 149 }), true))).toContain("Tidying records…");
  });
  it("tells a screen reader the phase, not every row", () => {
    const s = strip(render(at({ phase: "reading", rowsDone: 40 })));
    expect(s).toMatch(/<span class="sr-only" role="status">Reading your file<\/span>/);
    expect(s).toMatch(/data-im="status" aria-hidden="true"/);
  });
  it("leaves the retired constants out of the source (comments aside)", () => {
    const src = readFileSync("src/components/onboarding/ScatterSettleLoader.tsx", "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
    expect(src).not.toMatch(/\bWAIT_TXT\b|\bSLOW_TXT\b|\bSLOW_AT_MS\b|Larger import|countShown|\b78\b/);
  });
});
