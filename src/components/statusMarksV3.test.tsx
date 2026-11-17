/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Status marks v3 — locks SM3-1 to SM3-6 on `StatusDot` (design-refs/status-marks-v3.html).
 *
 * ⚠️ THE PATHS ARE READ OUT OF THE REFERENCE, NOT RETYPED HERE. The reference's "Path data" block is
 * parsed at test time, so a mark that drifts from the drawing Nick approved goes red even if someone
 * "fixes" the component and this file together.
 *
 * ⚠️ SM3-3 AND SM3-6 COMPARE AGAINST A CAPTURE, not against a description: src/test/fixtures/
 * statusMarksV3.baseline.json is the component's own markup and names as they stood at 9d66210a6,
 * before this pack, so "unchanged" means byte-identical.
 *
 * SM3-5's computed-colour half runs in a browser (tests/e2e/statusMarksV3.measure.ts); this file
 * holds the markup half — no colour on the svg under `tone="inherit"`.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../types";
import { StatusDot } from "./StatusDot";

const refHtml = readFileSync(new URL("../../design-refs/status-marks-v3.html", import.meta.url), "utf8");
const pre = /<pre id="paths">([\s\S]*?)<\/pre>/.exec(refHtml)?.[1] ?? "";
const block = JSON.parse(pre) as Record<string, string | string[]>;
const ref = (prefix: string) => {
  const k = Object.keys(block).find((x) => x === prefix || x.startsWith(`${prefix} `));
  if (!k) throw new Error(`the reference has no ${prefix}`);
  return block[k];
};
const SEAL_SOLID = ref("SEAL_SOLID") as string;
const SEAL_OUTLINE = ref("SEAL_OUTLINE") as string;
const SEAL_OUTLINE_STAR = ref("SEAL_OUTLINE_STAR") as string;
const RR_INNER = ref("RR_INNER") as string[];
const RR_SMALL = ref("RR_SMALL") as string[];

const baseline = JSON.parse(readFileSync(new URL("../test/fixtures/statusMarksV3.baseline.json", import.meta.url), "utf8")) as {
  markup: Record<string, Record<string, string>>;
  names: Record<string, { label: string | null; title: string | null }>;
};

const draw = (status: string, over: Partial<React.ComponentProps<typeof StatusDot>> = {}) =>
  renderToStaticMarkup(<StatusDot status={status} {...over} />);
const svgOf = (h: string) => h.slice(h.indexOf("<svg"), h.lastIndexOf("</svg>") + 6);
const paths = (h: string) => [...svgOf(h).matchAll(/<path\b([^>]*)>/g)].map((m) => m[1]);
const attr = (a: string, n: string) => new RegExp(`\\s${n}="([^"]*)"`).exec(a)?.[1] ?? null;
const circles = (h: string) => (svgOf(h).match(/<circle\b/g) ?? []).length;
const OLD_PAGE = ["M7 3.5h7l4 4V20.5H7z", "h7l4 4", "l7 7v23", "h9l4.5 4.5"];

describe("SM3 — the reference parsed", () => {
  it("finds every v3 path in the reference", () => {
    expect(SEAL_SOLID).toMatch(/^M12\.00 2\.40A/);
    expect(SEAL_OUTLINE).toMatch(/^M12\.00 3\.20A/);
    expect(SEAL_OUTLINE_STAR).toMatch(/^M12\.00 7\.80L/);
    expect(RR_INNER).toHaveLength(4);
    expect(RR_SMALL).toHaveLength(4);
  });
});

describe("SM3-1 seal", () => {
  it("Offer and Signed draw one filled, evenodd path equal to SEAL_SOLID at every size, and no page", () => {
    for (const s of [QueryStatus.OFFER, QueryStatus.SIGNED]) {
      for (const px of [12, 13, 16, 24, 30]) {
        const h = draw(s, { overrideSize: px });
        const p = paths(h);
        expect(p, `${s} @${px}: one path`).toHaveLength(1);
        expect(attr(p[0], "d"), `${s} @${px}: the reference's seal`).toBe(SEAL_SOLID);
        expect(attr(p[0], "fill"), `${s} @${px}`).toBe("currentColor");
        expect(attr(p[0], "fill-rule"), `${s} @${px}`).toBe("evenodd");
        expect(attr(p[0], "stroke"), `${s} @${px}`).toBe("none");
        expect(circles(h), `${s} @${px}: no ring`).toBe(0);
        for (const old of OLD_PAGE) expect(h, `${s} @${px}: the page is gone`).not.toContain(old);
      }
    }
  });
});

describe("SM3-2 arrows", () => {
  it("Revise & Resubmit: the ring and RR_INNER at 16, 24, 30; RR_SMALL and no ring at 12, 13, 15", () => {
    for (const px of [16, 24, 30]) {
      const h = draw(QueryStatus.REVISE_RESUBMIT, { overrideSize: px });
      expect(circles(h), `@${px}: one ring`).toBe(1);
      expect(svgOf(h), `@${px}`).toContain('<circle cx="12" cy="12" r="10"');
      expect(svgOf(h), `@${px}: a solid ring`).not.toContain("stroke-dasharray");
      const p = paths(h);
      expect(p.map((a) => attr(a, "d")), `@${px}`).toEqual(RR_INNER);
      for (const a of p) {
        expect(attr(a, "stroke-width"), `@${px}`).toBe("1.8");
        expect(attr(a, "stroke-linecap"), `@${px}`).toBe("round");
        expect(attr(a, "stroke-linejoin"), `@${px}`).toBe("round");
      }
    }
    for (const px of [12, 13, 15]) {
      const h = draw(QueryStatus.REVISE_RESUBMIT, { overrideSize: px });
      expect(circles(h), `@${px}: no ring`).toBe(0);
      const p = paths(h);
      expect(p.map((a) => attr(a, "d")), `@${px}`).toEqual(RR_SMALL);
      for (const a of p) {
        expect(attr(a, "stroke-width"), `@${px}: the set's stroke 2`).toBeNull();
        expect(attr(a, "stroke-linecap"), `@${px}`).toBe("round");
        expect(attr(a, "stroke-linejoin"), `@${px}`).toBe("round");
      }
      expect(svgOf(h), `@${px}`).toContain('stroke-width="2"');
    }
  });
});

describe("SM3-3 unchanged", () => {
  it("the other statuses' markup at 13 and 24 is byte-identical to the baseline capture", () => {
    const statuses = Object.keys(baseline.markup);
    expect(statuses.sort()).toEqual([
      QueryStatus.FULL_REQUESTED, QueryStatus.FULL_SENT, QueryStatus.NO_RESPONSE, QueryStatus.PARTIAL_REQUESTED,
      QueryStatus.PARTIAL_SENT, QueryStatus.QUERIED, QueryStatus.REJECTED, QueryStatus.RESUBMITTED, QueryStatus.WITHDRAWN,
    ].sort());
    for (const s of statuses) for (const px of ["13", "24"]) {
      expect(draw(s, { overrideSize: Number(px) }), `${s} @${px}`).toBe(baseline.markup[s][px]);
    }
  });
});

describe("SM3-4 outline", () => {
  it("reached={false} on Offer draws SEAL_OUTLINE unfilled plus the small filled star", () => {
    for (const s of [QueryStatus.OFFER, QueryStatus.SIGNED]) {
      const h = draw(s, { reached: false, overrideSize: 20 });
      const p = paths(h);
      expect(p, s).toHaveLength(2);
      expect(attr(p[0], "d"), s).toBe(SEAL_OUTLINE);
      expect(attr(p[0], "fill"), `${s}: the outline is not filled`).toBeNull();
      expect(attr(p[0], "stroke-linejoin"), s).toBe("round");
      expect(svgOf(h), `${s}: the svg's own fill is none`).toMatch(/^<svg[^>]*\sfill="none"/);
      expect(attr(p[1], "d"), s).toBe(SEAL_OUTLINE_STAR);
      expect(attr(p[1], "fill"), s).toBe("currentColor");
      expect(attr(p[1], "stroke"), s).toBe("none");
      expect(h, s).not.toContain(SEAL_SOLID);
    }
  });
  it("on every other status the prop changes nothing", () => {
    for (const s of Object.values(QueryStatus)) {
      if (s === QueryStatus.OFFER || s === QueryStatus.SIGNED) continue;
      expect(draw(s, { reached: false, overrideSize: 20 }), s).toBe(draw(s, { overrideSize: 20 }));
    }
  });
});

describe("SM3-5 inherit (markup half)", () => {
  it('tone="inherit" sets no colour on the svg; the default is still the ink; ghost still works', () => {
    for (const s of Object.values(QueryStatus)) {
      const h = draw(s, { tone: "inherit" });
      expect(svgOf(h), s).not.toMatch(/color:/);
      expect(svgOf(h), s).toContain('stroke="currentColor"');
      expect(draw(s), s).toContain("color:#1c130f");
    }
    expect(draw(QueryStatus.FULL_SENT, { ghost: true })).toContain("color:#a99e90");
    expect(draw(QueryStatus.FULL_SENT, { tone: "ghost" })).toBe(draw(QueryStatus.FULL_SENT, { ghost: true }));
    expect(draw(QueryStatus.FULL_SENT, { tone: "ink" })).toBe(draw(QueryStatus.FULL_SENT));
  });
});

describe("SM3-6 names", () => {
  it("accessible names and titles for all twelve statuses equal the baseline", () => {
    expect(Object.keys(baseline.names)).toHaveLength(12);
    for (const s of Object.values(QueryStatus)) {
      const h = draw(s);
      expect({ label: /aria-label="([^"]*)"/.exec(h)?.[1] ?? null, title: /title="([^"]*)"/.exec(h)?.[1] ?? null }, s).toEqual(baseline.names[s]);
    }
    expect(Object.values(QueryStatus)).toHaveLength(12);
  });
});
