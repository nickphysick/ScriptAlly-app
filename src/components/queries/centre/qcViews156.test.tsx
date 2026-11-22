/**
 * List filters v1 Phase 2 — the Queries list's Filter panel (QcViews156 over shell/FilterPanel), which replaces the
 * Views panel (and this file's old assertions with it: Views / Reset, the five view rows, Refine's eight Status tick rows,
 * More filters, the foot's export). Every control writes the page's one `Qc138Filters`; clicks and counts against the
 * list are measured in tests/e2e/lf1.measure.ts.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../../types";
import { QcViews156, queriesFoot, SENT_SHOWN } from "./QcViews156";
import { emptyQc138Filters, SENT_NONE, type Qc138Filters } from "../../../lib/qc138";
import { appliedChips, toggleStage } from "../../../lib/qc140";
import type { RailCounts } from "../../../lib/qc153Rail";
import { STAGE_COLOURS, STAGE_STATUSES } from "../../../lib/stageColours";

const counts: RailCounts = {
  quick: { you: 5, over: 2, wait: 7, offers: 1 } as RailCounts["quick"],
  where: { you: 4, agent: 3, quiet: 16, closed: 4 },
  stand: {},
  stage: { queried: 7, partial: 2, full: 2, offer: 1, closed: 0 },
  sent: { pkgA: 6, pkgB: 6, [SENT_NONE]: 2 },
  more: { dueWeek: 0, past: 2, missing: 2, overYear: 1 },
};
const sent = [{ key: "pkgA", name: "Round one" }, { key: "pkgB", name: "Round two" }, { key: SENT_NONE, name: "Nothing recorded" }];
const F = (o: Partial<Qc138Filters> = {}): Qc138Filters => ({ ...emptyQc138Filters(), ...o });
const html = (f: Qc138Filters = F(), s = sent, c = counts) => renderToStaticMarkup(
  <QcViews156 filters={f} onFilters={() => {}} counts={c} sent={s} onReset={() => {}} showing={14} total={14} needYou={5} />,
);
const buttons = (h: string, probe: string) => [...h.matchAll(new RegExp(`<button[^>]*data-qc156="${probe}"[^>]*>[\\s\\S]*?</button>`, "g"))].map((m) => m[0]);

describe("the Queries panel", () => {
  it("is the shared Filter panel, with the Queries list's own hooks", () => {
    const h = html();
    expect(h).toMatch(/<aside class="qc153-rail fp" aria-label="Filter your queries" data-qc156="panel"/);
    expect(h).toMatch(/data-qc156="title">Filter<\/b>/);
    expect(h).not.toContain("data-clq=");
  });
  it("What needs you: four tiles in the quick picks' order, with their counts and titles; no All queries", () => {
    const t = buttons(html(), "tile");
    expect(t.map((x) => x.match(/<span class="fp-tx">([^<]*)</)?.[1])).toEqual(["Your move", "Past their reply date", "Waiting to hear back", "Offers"]);
    expect(t.map((x) => x.match(/data-n="(\d+)"/)?.[1])).toEqual(["5", "2", "7", "1"]);
    expect(t.map((x) => x.match(/title="([^"]*)"/)?.[1])).toEqual(["Requests, offers and nudges", "Time for a nudge", "With agents, not yet due", "Waiting on your answer"]);
    expect(html()).not.toContain("All queries");
    expect(html()).not.toContain("Overdue");
  });
  it("a quick tile reads on from its field (Past their reply date is `past`)", () => {
    const t = buttons(html(F({ past: true })), "tile");
    expect(t[1]).toMatch(/aria-checked="true"/);
    expect(t.filter((x) => x.includes('aria-checked="true"'))).toHaveLength(1);
  });
  it("Stage: five labels in pipeline order on their bands, a bar of the stages with a count, the note", () => {
    const h = html();
    const labs = buttons(h, "stage");
    expect(labs.map((x) => x.match(/data-stage="(\w+)"/)?.[1])).toEqual(["queried", "partial", "full", "offer", "closed"]);
    expect(labs.map((x) => x.match(/<span class="sf-nm">([^<]*)</)?.[1])).toEqual(["Queried", "Partial", "Full", "Offer", "Closed"]);
    expect(labs[0]).toContain(`background:${STAGE_COLOURS.queried.band}`);
    expect(labs[3]).toContain(`${STAGE_COLOURS.offer.band}`);
    expect(labs[3]).toContain("linear-gradient(112deg");
    /* Closed has 0 and is off: inert */
    expect(labs[4]).toMatch(/disabled=""/);
    /* the bar: one segment per stage with a count, as wide as it, out of the tab order */
    expect(h).toMatch(/<div class="sf-bar" aria-hidden="true" data-qc156="stage-bar">/);
    const segs = [...h.matchAll(/<span class="sf-seg[^"]*" data-qc156="seg" data-stage="(\w+)" data-n="(\d+)"/g)].map((m) => `${m[1]}:${m[2]}`);
    expect(segs).toEqual(["queried:7", "partial:2", "full:2", "offer:1"]);
    expect(h).toMatch(/data-qc156="stage-note">how far they’ve got</);
    expect(h).not.toMatch(/Partial requested|Full sent|No reply|Passed/);
  });
  it("two stages on: \"2 picked\", both labels on, the bar's other segments drop", () => {
    const h = html(toggleStage(toggleStage(F(), "partial"), "full"));
    expect(h).toMatch(/data-qc156="stage-note">2 picked</);
    expect(buttons(h, "stage").filter((x) => x.includes('aria-checked="true"')).map((x) => x.match(/data-stage="(\w+)"/)?.[1])).toEqual(["partial", "full"]);
    expect(h).toMatch(/class="sf-bar is-some"/);
  });
  it("What you sent: pills over the rounds, Nothing recorded last; past eight, the eight highest then \"+n more\"", () => {
    const p = buttons(html(), "sent");
    expect(p.map((x) => x.match(/<span class="fp-pl">([^<]*)</)?.[1])).toEqual(["Round one", "Round two", "Nothing recorded"]);
    const many = Array.from({ length: 11 }, (_, i) => ({ key: `k${i}`, name: `R${i}` }));
    const c = { ...counts, sent: Object.fromEntries(many.map((o, i) => [o.key, i])) };
    const h = html(F(), many, c);
    expect(buttons(h, "sent")).toHaveLength(SENT_SHOWN);
    expect(h).toMatch(/data-qc156="sent-more">\+3 more<\/button>/);
    /* the lowest three are the ones held back */
    expect(h).not.toMatch(/>R0<|>R1<|>R2</);
  });
  it("Dates: a fold of three switches, closed by default; Past their reply date is not here", () => {
    const h = html();
    expect(h).toMatch(/data-qc156="dates" aria-expanded="false"/);
    expect(buttons(h, "switch").map((x) => x.match(/<span class="fp-swl">([^<]*)</)?.[1])).toEqual(["Due this week", "Missing materials", "Over a year"]);
    expect(html(F({ missing: true }))).toMatch(/data-qc156="dates" aria-expanded="true"[^>]*><span><b>Dates<\/b><small data-qc156="dates-on">1 on</);
  });
  it("the head counts what is on and Clear all is live; nothing on, it is disabled", () => {
    expect(html()).toMatch(/data-qc156="clear" disabled=""/);
    expect(html(F({ you: true, dueWeek: true }))).toMatch(/data-qc156="on">2 on</);
  });
  it("the foot", () => {
    expect(queriesFoot(false, 14, 14, 5)).toBe("All 14 queries. 5 need you.");
    expect(queriesFoot(false, 14, 14, 1)).toBe("All 14 queries. 1 needs you.");
    expect(queriesFoot(false, 14, 14, 0)).toBe("All 14 queries.");
    expect(queriesFoot(true, 3, 14, 5)).toBe("Showing 3 of 14 queries.");
    expect(html()).toMatch(/data-qc156="foot">All 14 queries\. 5 need you\.<\/p>/);
  });
});

describe("Stage writes and chips (lib/qc140)", () => {
  it("a stage label puts exactly that stage's statuses in, and takes them all out again", () => {
    const on = toggleStage(F(), "partial");
    expect([...on.stages].sort()).toEqual([...STAGE_STATUSES.partial].sort());
    expect(toggleStage(on, "partial").stages).toEqual([]);
  });
  it("a part-set stage reads on, and pressing it takes every one of its statuses out", () => {
    const part = F({ stages: [QueryStatus.FULL_SENT] });
    expect(buttons(html(part), "stage").find((x) => x.includes('data-stage="full"'))).toMatch(/aria-checked="true"/);
    expect(toggleStage(part, "full").stages).toEqual([]);
  });
  it("a whole stage is one applied chip carrying the stage; a part-set stage names its statuses singly, as before", () => {
    const whole = appliedChips(toggleStage(F(), "partial"), () => "");
    expect(whole.map((c) => [c.label, c.stage])).toEqual([["Partial", "partial"]]);
    const part = appliedChips(F({ stages: [QueryStatus.FULL_SENT, QueryStatus.RESUBMITTED] }), () => "");
    expect(part.map((c) => [c.label, c.stage])).toEqual([["Full sent", undefined]]);
  });
  it("Past their reply date's chip says the quick pick's words", () => {
    expect(appliedChips(F({ past: true }), () => "").map((c) => c.label)).toEqual(["Past their reply date"]);
  });
});

describe("the page wiring", () => {
  const q = readFileSync(resolve(__dirname, "../../Queries.tsx"), "utf8");
  it("the filter column is the Queries panel; the rail is gone", () => {
    expect(q).toMatch(/rail=\{<QcViews156 /);
    expect(q).not.toMatch(/QcRail153/);
  });
  it("a held \"Where it stands\" tile filter is cleared on the desktop (it has no control there)", () => {
    expect(q).toMatch(/if \(qcDesk && qcF138\.where\) setQcF138\(\(f\) => \(\{ \.\.\.f, where: null \}\)\);/);
  });
});
