/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Status marks v3 — SM3-7's structure half: the card's four-step track draws every step with `StatusDot`, and no
 * `TrackNode` svg is left. The Offer step is the outline seal until the query is at Offer or Signed; a closed query's
 * current step is its closed status's mark. The geometry half (every node within 0.5px of its baseline) is measured
 * on the fixture grid by tests/e2e/statusMarksV3.measure.ts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { QueryStatus } from "../../../types";
import { card154, row154 } from "./qc154.fixture";

const SEAL_SOLID_HEAD = 'd="M12.00 2.40A2.78';
const SEAL_OUTLINE_HEAD = 'd="M12.00 3.20A2.55';

/** each node's inner markup, in order */
const nodes = (h: string) => {
  const trk = h.slice(h.indexOf('data-qc153="track"'));
  return [...trk.matchAll(/<span class="qc153-nd qc153-nd--(\w+)" data-qc153="node" data-state="\w+" title="(\w+)">([\s\S]*?<\/svg><\/span>)/g)]
    .map((m) => ({ state: m[1], title: m[2], inner: m[3] }));
};

describe("SM3-7 the track draws with StatusDot", () => {
  it("every track holds four StatusDot svgs and no TrackNode svg, on every status", () => {
    for (const s of Object.values(QueryStatus)) {
      const h = card154(row154(s, "agent"));
      const n = nodes(h);
      expect(n, s).toHaveLength(4);
      for (const x of n) {
        /* the wrapper is 12px, except an R&R query's current step (17px, so StatusDot draws the ringed arrows: SM3-10) */
        const px = s === QueryStatus.REVISE_RESUBMIT && x.state === "cur" ? 17 : 12;
        expect(x.inner, `${s}: a StatusDot`).toMatch(new RegExp(`^<span aria-hidden="true" style="width:${px}px;height:${px}px;flex-shrink:0;display:inline-flex[^"]*"><svg width="${px}" height="${px}" viewBox="0 0 24 24"`));
        expect(x.inner, `${s}: the track's CSS colours it`).not.toMatch(/color:#/);
      }
      expect(h, s).not.toContain('<svg data-qc153="node"');
      expect(h, s).not.toMatch(/<svg[^>]*data-qc153="node"/);
      expect(n.map((x) => x.title), s).toEqual(["Queried", "Partial", "Full", "Offer"]);
    }
  });

  it("the fourth step: solid at Offer and Signed, the outline everywhere else", () => {
    for (const s of [QueryStatus.OFFER, QueryStatus.SIGNED]) {
      const n = nodes(card154(row154(s, "offer")));
      expect(n[3].state, s).toBe("cur");
      expect(n[3].inner, `${s}: the solid seal`).toContain(SEAL_SOLID_HEAD);
      expect(n[3].inner, s).not.toContain(SEAL_OUTLINE_HEAD);
    }
    for (const s of [QueryStatus.QUERIED, QueryStatus.FULL_SENT, QueryStatus.FULL_REQUESTED, QueryStatus.REJECTED]) {
      const n = nodes(card154(row154(s, "agent")));
      expect(n[3].inner, `${s}: the outline seal`).toContain(SEAL_OUTLINE_HEAD);
      expect(n[3].inner, s).not.toContain(SEAL_SOLID_HEAD);
    }
  });

  it("a closed query's current step is the closed mark; the three endings share it", () => {
    const cur = (s: QueryStatus) => nodes(card154(row154(s, "closed"))).find((x) => x.state === "cur")!.inner;
    const marks = [QueryStatus.REJECTED, QueryStatus.NO_RESPONSE, QueryStatus.WITHDRAWN].map(cur);
    for (const m of marks) expect(m).toContain('d="M7.5 12h9"');
    expect(new Set(marks).size).toBe(1);
  });
});

/* ── SM3-10: the R&R card's current step is the arrows ─────────────────────────────────────────────────────── */
const refHtml = readFileSync(new URL("../../../../design-refs/status-marks-v3.html", import.meta.url), "utf8");
const block = JSON.parse(/<pre id="paths">([\s\S]*?)<\/pre>/.exec(refHtml)?.[1] ?? "{}") as Record<string, unknown>;
const RR_INNER = block[Object.keys(block).find((k) => k.startsWith("RR_INNER "))!] as string[];
const today = JSON.parse(readFileSync(new URL("../../../test/fixtures/qcTrackCurrent.baseline.json", import.meta.url), "utf8")) as {
  currentStep: Record<string, string | null>;
};
const curOf = (s: QueryStatus) => nodes(card154(row154(s, "agent"))).find((x) => x.state === "cur")!.inner;

describe("SM3-10 the R&R card's current step", () => {
  it("holds one ring and the four RR_INNER paths (the arrows-in-a-ring form), in the track's colour", () => {
    expect(RR_INNER).toHaveLength(4);
    const m = curOf(QueryStatus.REVISE_RESUBMIT);
    expect((m.match(/<circle\b/g) ?? []).length).toBe(1);
    expect(m).toContain('<circle cx="12" cy="12" r="10"');
    expect([...m.matchAll(/<path d="([^"]*)"/g)].map((x) => x[1])).toEqual(RR_INNER);
    expect(m).not.toMatch(/color:#/);
    expect(m, "the Full step's mark").not.toContain('r="6.5"');
  });

  it("every other status's current step is byte-identical to today's (Resubmitted keeps Full Sent's mark)", () => {
    for (const s of Object.values(QueryStatus)) {
      if (s === QueryStatus.REVISE_RESUBMIT) continue;
      expect(curOf(s), s).toBe(today.currentStep[s]);
    }
    expect(curOf(QueryStatus.RESUBMITTED)).toBe(today.currentStep[QueryStatus.FULL_SENT]);
  });

  it("the other three steps of an R&R card are unchanged", () => {
    const now = nodes(card154(row154(QueryStatus.REVISE_RESUBMIT, "agent"))).filter((x) => x.state !== "cur").map((x) => x.inner);
    const fs = nodes(card154(row154(QueryStatus.FULL_SENT, "agent"))).filter((x) => x.state !== "cur").map((x) => x.inner);
    expect(now).toEqual(fs);
  });
});
