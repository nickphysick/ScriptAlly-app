/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · Phase 3 — the query card. The agent's reply that moves nothing is a small note between steps
 * (design-refs/controls-entry-v1 "A small note between steps"): title, the date line when there is one, their words,
 * the date. Its words reach the Notes tab with the phrase for the kind; Last heard says what it was. The entry is
 * edited and deleted through the card's own step editor, which routes it to editActivity / deleteActivity. The
 * browser half (the rendered card) is tests/e2e/controlsEntry.measure.ts.
 */
import React from "react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../../types";
import { Bubble } from "./QcBubble152";
import { quotesOf } from "./QcNotes158";
import { buildThread, heardWhat, type ThreadStepIn } from "../../../lib/qcThread152";

const NOW = Date.UTC(2026, 10, 24, 12);
const at = (d: number) => NOW - d * 86_400_000;
const st = (key: string, status: QueryStatus | null, daysAgo: number, extra: Partial<ThreadStepIn> = {}): ThreadStepIn =>
  ({ key, status, kind: null, ms: at(daysAgo), chips: [], ...extra });
const chaser: ThreadStepIn = st("c", null, 0, {
  kind: "reply", activityId: "e1", quote: "Any news on the manuscript?",
  reply: { kind: "chaser", chase: "full", dateMs: Date.UTC(2026, 11, 4, 12), withYou: true, stage: QueryStatus.FULL_REQUESTED },
});
const holding: ThreadStepIn = st("h", null, 0, {
  kind: "reply", activityId: "e2", quote: "Still on my pile.",
  reply: { kind: "holding", chase: null, dateMs: Date.UTC(2027, 0, 15, 12), withYou: false, stage: QueryStatus.QUERIED },
});
const note: ThreadStepIn = st("n", null, 0, { kind: "reply", activityId: "e3", quote: "Away until 7 December.", reply: { kind: "note", chase: null, dateMs: null, withYou: true, stage: QueryStatus.FULL_REQUESTED } });
const thread = (s: ThreadStepIn) => buildThread([st("q", QueryStatus.QUERIED, 236), st("f", QueryStatus.FULL_REQUESTED, 3), s],
  { first: "Jonathan", nowMs: NOW, state: "materials", replyMs: null, agentWeeks: 8 });
const msgOf = (s: ThreadStepIn) => thread(s).find((x) => x.t === "msg" && x.key === s.key) as Extract<ReturnType<typeof buildThread>[number], { t: "msg" }>;

describe("the thread's words (baked)", () => {
  it("title and date line by kind and by the way the query faced", () => {
    expect(msgOf(chaser)).toMatchObject({ title: "Jonathan chased the full", sub: "Send by Fri 4 Dec", quote: "Any news on the manuscript?", side: "them" });
    expect(msgOf(holding)).toMatchObject({ title: "Jonathan sent a holding reply", sub: "Reply expected by 15 Jan" });
    expect(msgOf(note)).toMatchObject({ title: "Jonathan sent a note", sub: null });
  });
});

describe("drawn as a small note between steps — never a full bubble", () => {
  const render = (s: ThreadStepIn) => {
    const m = msgOf(s);
    return renderToStaticMarkup(<Bubble wordsFirst side={m.side} status={m.status} kind={m.kind} title={m.title} date={m.date} dated={m.dated} tint={m.tint} grey={m.grey}
      initials="JM" stamp={m.stamp} quote={m.quote} sub={m.sub} />);
  };
  it("carries `oc oc-note`, and the order is title, date line, their words, the date", () => {
    const h = render(chaser);
    expect(h).toMatch(/class="qc152-m them oc oc-note"/);
    const i = (x: string) => h.indexOf(x);
    expect(i("Jonathan chased the full")).toBeGreaterThan(-1);
    expect(i("Jonathan chased the full")).toBeLessThan(i('class="oc-sub"'));
    expect(i('class="oc-sub"')).toBeLessThan(i("Any news on the manuscript?"));
    expect(i("Any news on the manuscript?")).toBeLessThan(i('data-qc152="msg-date"'));
    expect(h).not.toContain("qc1522-sb");
  });
  it("the same on the agent card's reader (no wordsFirst), and a status step is untouched", () => {
    const m = msgOf(holding);
    const h = renderToStaticMarkup(<Bubble side={m.side} status={m.status} kind={m.kind} title={m.title} date={m.date} dated tint={m.tint} grey={false} initials="JM" quote={m.quote} sub={m.sub} />);
    expect(h).toContain("oc oc-note");
    expect(h.indexOf('class="oc-sub"')).toBeLessThan(h.indexOf("Still on my pile."));
    const s = renderToStaticMarkup(<Bubble side="them" status={QueryStatus.FULL_REQUESTED} kind={null} title="Jonathan asked for your full manuscript" date="" dated tint={null} grey={false} initials="JM" />);
    expect(s).not.toContain("oc-note");
  });
  it("the CSS is the ref's own .oc / .oc-note / .oc-sub rules, ported onto the bubble part", () => {
    const css = readFileSync("src/components/queries/centre/qcv168oc.css", "utf8");
    const ref = readFileSync("design-refs/controls-entry-v1/controls-v2.html", "utf8");
    for (const rule of [
      ".qc152 .qc152-m.oc .oc-sub{margin-top:2px;font:400 13.5px/1.4 var(--sp-serif);color:#6f655c}",
      ".qc152 .qc152-m.oc-note{max-width:82%}",
      ".qc152 .qc152-m.oc-note .qc152-bx{padding:7px 12px 8px 9px!important;border-radius:12px!important;background:#f6f3ee!important;box-shadow:none!important}",
      ".qc152 .qc152-m.oc .qc152-bx{animation:ocIn .35s ease-out both}",
    ]) {
      expect(ref, `the ref no longer has ${rule}`).toContain(rule);
      expect(css).toContain(rule);
    }
    expect(css.replace(/\/\*[\s\S]*?\*\//g, ""), "an oc-under rule was ported (ruling 4: the note only)").not.toContain("oc-under");
    expect(readFileSync("src/components/queries/centre/QcBubble152.tsx", "utf8")).toContain('import "./qcv168oc.css";');
  });
});

describe("Notes and Last heard", () => {
  it("their words are listed with the phrase for the kind, in the stage's colour when the stage was the agent's", () => {
    const [c] = quotesOf([chaser]);
    expect(c).toMatchObject({ text: "Any news on the manuscript?", phrase: "when chasing the full", kind: "reply" });
    const [f] = quotesOf([st("f", QueryStatus.FULL_REQUESTED, 3, { quote: "Please send the rest." })]);
    expect(c.fill).toBe(f.fill);
    expect(quotesOf([holding])[0].phrase).toBe("in a holding reply");
    expect(quotesOf([note])[0].phrase).toBe("in a note");
  });
  it("Last heard says what the latest reply was, of any kind", () => {
    expect(heardWhat(chaser)).toBe("chased the full");
    expect(heardWhat(holding)).toBe("a holding reply");
    expect(heardWhat(note)).toBe("a note");
    expect(heardWhat(st("f", QueryStatus.FULL_REQUESTED, 3))).toBe("asked for the full");
    expect(heardWhat(st("q", QueryStatus.QUERIED, 3))).toBeNull();
  });
});

describe("edited and deleted through the card's step editor, by editActivity and deleteActivity", () => {
  const src = readFileSync("src/components/Queries.tsx", "utf8");
  const block = (from: string, len = 900) => src.slice(src.indexOf(from), src.indexOf(from) + len);
  it("the editor's save, its delete and the Notes tab's words each branch a reply before any step plan", () => {
    const save = block('if (ed.kind === "reply") {\n                const snap');
    expect(save).toContain("await editActivity(q.id, ed.activityId!");
    expect(save.indexOf("return;")).toBeLessThan(save.indexOf("planStepEdit"));
    const del = block('if (ed.kind === "reply") {\n                const snap = await takeSnapshot(uid, [q.id]);\n                await deleteActivity');
    expect(del).toContain("await deleteActivity(ed.activityId!)");
    const words = block('if (st.kind === "reply") {');
    expect(words).toContain("await editActivity(q.id, st.activityId!, { reply: { words: text || null } })");
  });
  it("the editor offers no materials for a reply", () => {
    expect(readFileSync("src/components/queries/centre/QcStepEdit1522.tsx", "utf8")).toContain('p.kind !== "reply" ? <>\n            <label>Materials</label>');
  });
});
