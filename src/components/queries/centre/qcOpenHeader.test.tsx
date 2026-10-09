/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v133 — the open header, rendered: the living title, the fixed line, the two buttons,
 * the figure-only courier; and the loading shape.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QcOpenHeader, QC_HEADER_SUB } from "./QcOpenHeader";
import { QC_COURIER_DISC, QC_PLATE_FIGURE } from "./qcArt";

const living = (count: number | null) => ({ count, copy: (n: number) => ({ headline: `${n} queries out`, subline: ["a living sentence the open header does not draw"] }) });
const html = (count: number | null, o: { loading?: boolean; logDisabled?: boolean } = {}) =>
  renderToStaticMarkup(<QcOpenHeader living={living(count) as never} loading={!!o.loading} logDisabled={o.logDisabled} onLog={() => {}} onRecord={() => {}} />);

describe("QcOpenHeader", () => {
  it("draws the living title and both buttons on the panel; no subheader (header panel v2)", () => {
    const h = html(27);
    expect(h).toMatch(/<h1 class="qcoh-title" data-probe="title" data-page-title="" aria-label="27 queries out">/);
    expect(h).toMatch(/<span class="qcoh-hn" data-qcv="oh-hn">27<\/span><span class="qcoh-ht" data-qcv="oh-ht">queries out<\/span>/);
    expect(html(1)).toMatch(/data-qcv="oh-hn">1<\/span><span class="qcoh-ht" data-qcv="oh-ht">query out<\/span>/);
    /* header panel v2: the subheader is not rendered on this page (the constant stays for the phone's page) */
    expect(QC_HEADER_SUB).toBe("Send, track, and chase them from this page.");
    expect(h).not.toContain(QC_HEADER_SUB);
    expect(h, "the header is the panel, with no header sheet").toMatch(/<header class="qcoh hpanel hpanel--hero"[^>]*data-hpanel=""/);
    expect(h).not.toContain("data-header-sheet");
    expect(h).toContain(">+ Log a query</button>");
    expect(h).toContain(">Record a response</button>");
    expect(h, "the living facts sentence is not drawn").not.toContain("a living sentence");
    expect(h, "an own-header route's marker").toContain('data-own-header=""');
  });
  it("the drawing is the courier on his white disc (header panel v2), aria-hidden, and it is not the shared band", () => {
    const h = html(27);
    expect(h).toContain(`src="${QC_COURIER_DISC.src}?v=${QC_COURIER_DISC.version}"`);
    expect(h).toMatch(/<img class="qcoh-art" data-qcv="oh-art" aria-hidden="true"/);
    expect(h).not.toMatch(/ph--band|ph-bdisc/);
    expect(h).not.toContain(QC_PLATE_FIGURE.src);
  });
  it("the stamp: the With you count as real text outside the h1; absent at 0, absent while loading", () => {
    const stamp = (n: number | null, o: { loading?: boolean } = {}) =>
      renderToStaticMarkup(<QcOpenHeader living={living(27) as never} loading={!!o.loading} onLog={() => {}} onRecord={() => {}} withYou={n} />);
    const h = stamp(4);
    expect(h).toContain('<span class="hpanel-stamp" data-qcv="oh-stamp">4 with you</span>');
    const h1 = h.slice(h.indexOf("<h1"), h.indexOf("</h1>"));
    expect(h1, "the stamp is not inside the h1").not.toContain("hpanel-stamp");
    expect(h.indexOf("hpanel-stamp")).toBeGreaterThan(h.indexOf("</h1>"));
    expect(stamp(0)).not.toContain("hpanel-stamp");
    expect(stamp(null)).not.toContain("hpanel-stamp");
    expect(stamp(4, { loading: true })).not.toContain("hpanel-stamp");
  });
  it("loading: the title holds a shape and both buttons are disabled", () => {
    for (const h of [html(null), html(27, { loading: true })]) {
      expect(h).toContain('data-loading=""');
      expect(h).toMatch(/data-qcv="oh-hn">00<\/span><span class="qcoh-ht" data-qcv="oh-ht">queries out<\/span>/);
      expect(h, "three placeholder discs, and no real face").toMatch(/qcoh-fc--sk/);
      expect(h).not.toContain('data-qcv="oh-face"');
      expect((h.match(/disabled=""/g) ?? []).length, "both buttons disabled").toBe(2);
    }
    expect(html(27)).not.toContain("data-loading");
  });
  it("the log rule disables + Log a query alone", () => {
    const h = html(27, { logDisabled: true });
    expect((h.match(/disabled=""/g) ?? []).length).toBe(1);
    expect(h).toMatch(/data-qcv="oh-log" disabled=""/);
  });
  it("the faces: a disc per face in its court's class, hidden from assistive tech under one sentence, and + more", () => {
    const faces = { faces: [
      { id: "a", court: "you" as const, initials: "TH", name: "Tobias Hark", line: "Full requested · with you" },
      { id: "b", court: "agent" as const, initials: "EH", name: "Elinor Hale", line: "Queried · with agents" },
      { id: "c", court: "closed" as const, initials: "MR", name: "Marcus Reed", line: "Passed · closed" },
    ], total: 27, more: 24, sentence: "3 of 27 queries shown: 1 with you, 1 with agents, 1 closed" };
    const h = renderToStaticMarkup(<QcOpenHeader living={living(27) as never} loading={false} faces={faces} onLog={() => {}} onRecord={() => {}} />);
    expect(h).toContain('aria-label="3 of 27 queries shown: 1 with you, 1 with agents, 1 closed"');
    expect((h.match(/data-qcv="oh-face"/g) ?? []).length).toBe(3);
    expect(h).toMatch(/class="qcoh-fc qcoh-fc--you" data-qcv="oh-face" data-court="you" data-qid="a" data-tip="Tobias Hark" data-tl="Full requested · with you"/);
    expect(h.indexOf("qcoh-fc--you")).toBeLessThan(h.indexOf("qcoh-fc--agent"));
    expect(h.indexOf("qcoh-fc--agent")).toBeLessThan(h.indexOf("qcoh-fc--closed"));
    expect(h).toContain(">+24 more</span>");
    expect(h, "no key").not.toMatch(/fkey|oh-key/);
    const none = renderToStaticMarkup(<QcOpenHeader living={living(3) as never} loading={false} faces={{ ...faces, more: 0 }} onLog={() => {}} onRecord={() => {}} />);
    expect(none).not.toContain("oh-more");
  });
});
