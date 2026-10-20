import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { ImportTipsCard } from "./ImportTipsCard";
import { IMPORT_TIPS, IMPORT_TIP_ART, TIP_EVERY_MS, TIP_SHOW_AFTER_MS } from "../../lib/importTips";

/** The brief's five tips, verbatim (title, then body). */
const BRIEF = [
  "Whose move is it? Your Query Centre will tell you at a glance which queries need your attention and which ones you don't need to worry about right now.",
  "Heads up When a query passes its agent's reply window, we'll add a nudge to your to-do list. Nothing slips through the cracks.",
  "Record a response Got an answer? Log what came back, good news or bad, and see your campaign analytics and to-do list update in real time.",
  "Materials & Packages Track which manuscript versions, letters and synopses are getting agents asking for more.",
  "Benchmarking Track your response rate and how far your queries are getting, and use the analysis to shape your campaign.",
];

describe("the tips (exact)", () => {
  it("are the brief's five, word for word, in order", () => {
    expect(IMPORT_TIPS.map((t) => `${t.title} ${t.body}`)).toEqual(BRIEF);
  });
  it("time as the brief says: shown from 3 s, a new one every 7 s", () => {
    expect([TIP_SHOW_AFTER_MS, TIP_EVERY_MS]).toEqual([3000, 7000]);
  });
});

describe("ImportTipsCard", () => {
  const html = renderToStaticMarkup(<ImportTipsCard reduced={false} />);
  it("starts at tip 1 of 5", () => {
    expect(html).toContain('data-im="tip-num">1 / 5<');
    expect(html.match(/class="im-tip-one is-on"/g)).toHaveLength(1);
    expect(html.indexOf("is-on")).toBeLessThan(html.indexOf("Heads up"));
  });
  it("keeps the live region to the tip being shown, and the dots out of it", () => {
    expect(html).toMatch(/data-im="tip-stack" aria-live="polite"/);
    expect(html.match(/data-im="tip" aria-hidden="true"/g)).toHaveLength(IMPORT_TIPS.length - 1);
    expect(html).toMatch(/class="im-tip-dots" aria-hidden="true"/);
  });
  it("shows the art through the one named constant, with no alt text", () => {
    expect(html).toContain(`src="${IMPORT_TIP_ART.src}?v=${IMPORT_TIP_ART.version}" alt=""`);
    expect(readFileSync("public/images/import/tip-hawk.png").equals(readFileSync("design-refs/onboarding/smart-import-loader-v2/tip-hawk.png"))).toBe(true);
  });
  it("offers Next tip and nothing that leaves or carries on", () => {
    expect(html).toContain('data-im="tip-next"');
    expect(html.match(/<button/g)).toHaveLength(1);
  });
});

describe("the reading screen offers no way to leave (Nick's ruling, locked)", () => {
  it("has no carry-on, leave, skip or cancel control in the loader or the card", () => {
    for (const f of ["src/components/onboarding/ScatterSettleLoader.tsx", "src/components/onboarding/ImportTipsCard.tsx"]) {
      const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      expect(src, f).not.toMatch(/carry on|Carry on|[Ll]eave|[Ss]kip|[Cc]ancel|Do this later/);
    }
  });
});
