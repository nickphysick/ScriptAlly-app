/**
 * Query card v158 (design-refs/query-card-v158/query-card-v158.html) — the source halves of the QC158 locks. The
 * measured halves (heights, boxes, colours on the rendered card) are tests/e2e/qc158.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = (f: string) => readFileSync(`src/components/queries/centre/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const card = () => readFileSync("src/components/queries/centre/QcCard152.tsx", "utf8");

describe("QC158-1/2 (source) one height", () => {
  it("nothing lets the reading card shrink to its content: no `height: auto` on the card's panel", () => {
    const all = ["qcv152card.css", "qcv1522card.css", "qcv153thread.css", "qcv152inplace.css", "sc1card.css"].map(css).join("\n");
    expect(all).not.toMatch(/\.spanel\.qsp[^{]*:has\(> \.spanel-own > \[data-qc152\]\)[^{]*\{[^}]*height:\s*auto/);
    expect(css("qcv152card.css")).toMatch(/height: var\(--qc152-h\);/);
  });
  it("the tab body takes the room between the tab bar and the footer, and is still the only thing that scrolls", () => {
    const r = css("qcv152card.css").match(/\.qc152 \.qc152-in > \.qc152-body \{([^}]*)\}/)?.[1] ?? "";
    expect(r).toContain("flex: 1 1 auto");
    expect(r).toContain("min-height: 0");
    expect(r).toContain("overflow: auto");
  });
});

describe("QC158-3/4 (source) Tracking: no day pill, no status line, the wait at the side", () => {
  it("the card draws no day pill and no status line, and no stylesheet styles either", () => {
    expect(card()).not.toMatch(/qc152-dp|day-pill|qc153-sl|status-line|statusLine/);
    const all = ["qcv152card.css", "qcv1522card.css", "qcv153thread.css"].map(css).join("\n");
    expect(all).not.toMatch(/\.qc152-dp|\.qc153-sl/);
  });
  it("the wait: italic serif 13px #8a8076, 14px above and 5px below; the agent's side past the seal; one-day messages 14px apart", () => {
    const c = css("qcv1522card.css");
    expect(c).toMatch(/\.qc152 \.qc1522-lt \{ margin: 14px 6px 5px; font: italic 400 13px\/1\.2 var\(--sp-serif\) !important; color: #8a8076; \}/);
    expect(c).toMatch(/\.qc152 \.qc1522-lt\.me \{ align-self: flex-end;[^}]*text-align: right;/);
    expect(c).toMatch(/\.qc152 \.qc1522-lt\.them \{ align-self: flex-start; margin-left: 40px;/);
    expect(c).toMatch(/\.qc152 \.qc152-th > \.qc152-m \+ \.qc152-m \{ margin-top: 14px; \}/);
    expect(css("qcv152card.css")).toMatch(/\.qc152 \.qc152-th \{ display: flex; flex-direction: column; padding: 16px 18px 14px; \}/);
  });
});
