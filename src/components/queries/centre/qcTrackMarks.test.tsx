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
        expect(x.inner, `${s}: a StatusDot`).toMatch(/^<span aria-hidden="true" style="width:12px;height:12px;flex-shrink:0;display:inline-flex[^"]*"><svg width="12" height="12" viewBox="0 0 24 24"/);
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
