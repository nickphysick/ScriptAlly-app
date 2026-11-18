/**
 * Query card v158.1 (design-refs/query-card-v158-1/query-card-v158-1.html) — the source halves of the QC1581 locks;
 * the measured halves are tests/e2e/qc1581.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const css = (f: string) => readFileSync(`src/components/queries/centre/${f}`, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

describe("QC1581-1 (source) the one-row footer cannot spill", () => {
  it("the pill grows with its words: min-height 52px, 8px above and below; no fixed height", () => {
    const r = css("qcv152card.css").match(/\.qc152 \.qc152-rf \{([^}]*)\}/)?.[1] ?? "";
    expect(r).toContain("min-height: 52px");
    expect(r).toContain("padding: 8px 16px 8px 10px");
    expect(r).not.toMatch(/(^|;)\s*height: 52px/);
  });
  it("its lines wrap and are never clipped", () => {
    const c = css("qcv152card.css");
    expect(c).toMatch(/\.qc152 \.qc152-rf b \{[^}]*white-space: normal; overflow: visible;/);
    expect(c).toMatch(/\.qc152 \.qc152-rft span \{[^}]*white-space: normal; overflow: visible;/);
    expect(c + css("qcv1522card.css")).not.toMatch(/\.qc152-rft (span|b) \{[^}]*text-overflow: ellipsis/);
  });
});

describe("QC1581-2/3 (source) one row for one action; two rows, in place, for two or three", () => {
  const css158 = css("qcv158.css");
  it("one action: one row — the pill, then the button", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { Foot } = await import("./QcFoot1581");
    const h = renderToStaticMarkup(React.createElement(Foot, { late: false, icon: { k: "clock" }, lead: "Waiting on Fenella", sub: "Reply expected by 23 Nov", outer: {},
      primary: { label: "Record a response", tone: "outline", act: "resp", run: () => {}, hook: { "data-qc152": "reply-btn" } }, others: [] }));
    expect(h).toMatch(/^<div class="qc152-rb" data-qc152="reply" data-rows="1"/);
    expect(h).toContain('class="qc152-rf" data-qc152="reply-field"');
  });
  it("three actions: status, then the replied link, the link action as an outlined button, the navy primary — in reading order", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { Foot } = await import("./QcFoot1581");
    const a = (label: string, act: string, hook: Record<string, string>) => ({ label, act, run: () => {}, hook });
    const h = renderToStaticMarkup(React.createElement(Foot, { late: false, icon: { k: "clock" }, lead: "No reply from Eleanor", sub: "Reply was due 11 Apr 2024 · quiet for 135 weeks", outer: {},
      primary: { ...a("Close it", "close", { "data-qc152": "reply-btn" }), tone: "navy" },
      others: [a("Nudge", "nudge", { "data-qc1522": "foot-link" }), a("Eleanor replied", "resp", { "data-qc1522": "foot-replied" })] }));
    expect(h).toMatch(/^<div class="qc152-rb nf" data-qc152="reply" data-rows="2"/);
    expect(h).not.toMatch(/class="qc152-rf"/);
    const order = [...h.matchAll(/data-(?:qc152|qc1522)="(reply-field|foot-replied|foot-link|reply-btn)"/g)].map((m) => m[1]);
    expect(order).toEqual(["reply-field", "foot-replied", "foot-link", "reply-btn"]);
    expect(h).toMatch(/<button type="button" class="qc1522-flink" data-qc1522="foot-replied" data-act="resp">Eleanor replied<\/button>/);
    expect(h).toMatch(/<button type="button" class="qc152-rbtn gh2" data-qc1522="foot-link" data-act="nudge">Nudge<\/button>/);
    expect(h).toMatch(/<button type="button" class="qc152-rbtn nv" data-qc152="reply-btn" data-tone="navy" data-act="close">Close it<svg/);
  });
  it("two actions (the older footer's second, or a link): the outlined button then the primary, and no link", async () => {
    const React = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { Foot } = await import("./QcFoot1581");
    const h = renderToStaticMarkup(React.createElement(Foot, { late: false, icon: { k: "clock" }, lead: "Deciding", sub: "Answer by 9 Oct · 2 to tell", outer: {},
      primary: { label: "Accept or decline", tone: "navy", act: "offer", run: () => {}, hook: { "data-qc152": "reply-btn" } },
      others: [{ label: "Tell them", act: "tell", run: () => {}, hook: { "data-qc1522": "foot-link" } }, null] }));
    expect(h).toMatch(/data-rows="2"/);
    expect(h).not.toContain("qc1522-flink");
    expect(h).toMatch(/class="qc152-rbtn gh2" data-qc1522="foot-link" data-act="tell">Tell them<\/button><button type="button" class="qc152-rbtn nv"/);
  });
  it("the two-row footer's rules: a column 10px apart, the actions one line, 46px buttons, the outlined second", () => {
    expect(css158).toMatch(/\.qc152 \.qc152-rb\.nf \{ flex-direction: column; align-items: stretch; gap: 10px; padding: 12px 14px 14px; \}/);
    expect(css158).toMatch(/\.qc152 \.qc152-rb\.nf \.nf-ac \{ display: flex; flex-wrap: nowrap;/);
    expect(css158).toMatch(/\.qc152 \.qc152-rb\.nf \.nf-ac \.qc152-rbtn \{ height: 46px; border-radius: 23px; \}/);
    expect(css158).toMatch(/\.qc152-rbtn\.gh2 \{ background: #fff; color: #1c130f; box-shadow: inset 0 0 0 1px #cfc7bc; font-weight: 400; \}/);
    expect(css("qcv152card.css")).not.toMatch(/\.qc152-rb:has\(> \.qc152-rbtn\.sm\)|\.qc152-rbtn\.sm/);
  });
});
