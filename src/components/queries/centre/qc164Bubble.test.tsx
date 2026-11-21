/**
 * Query card v164 — the bubble's words (C.5): shown in the agent's bubble when a reply has stored words, under the
 * title and before what went, in curly quotes; nothing at all when no words are stored. The agent card (QcThreadRead)
 * keeps its old order: the new order is the slide-in card's (`wordsFirst`). The browser half (clamp, rule, size) is
 * tests/e2e/qc164.measure.ts L9.
 */
import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../../types";
import { Bubble } from "./QcBubble152";

const base = { side: "them" as const, status: QueryStatus.REJECTED, kind: null, title: "Paul passed", date: "", dated: true, tint: { fill: "#eceae6", edge: "#dedbd5" }, grey: true, initials: "PV", stamp: "2 Jun" };
const chips = <span className="qc152-chs" data-qc152="chips"><button type="button" data-qc152="chip">Full manuscript</button></span>;

describe("v164 L9 — their words", () => {
  it("stored words are shown, in curly quotes, under the title and before what went", () => {
    const h = renderToStaticMarkup(<Bubble {...base} wordsFirst quote="Not one for my list." chips={chips} />);
    expect(h).toMatch(/data-qc152="quote">“Not one for my list\.”/);
    expect(h.indexOf('data-qc152="msg-title"')).toBeLessThan(h.indexOf('data-qc152="quote"'));
    expect(h.indexOf('data-qc152="quote"')).toBeLessThan(h.indexOf('data-qc152="chips"'));
  });
  it("no words stored: no quote element", () => {
    for (const q of [null, undefined, ""]) {
      const h = renderToStaticMarkup(<Bubble {...base} wordsFirst quote={q} chips={chips} />);
      expect(h).not.toContain('data-qc152="quote"');
      expect(h).not.toContain("qc152-qt");
    }
  });
  it("without wordsFirst (the agent card) the old order stands: what went, then the words", () => {
    const h = renderToStaticMarkup(<Bubble {...base} quote="Not one for my list." chips={chips} />);
    expect(h.indexOf('data-qc152="chips"')).toBeLessThan(h.indexOf('data-qc152="quote"'));
  });
});
