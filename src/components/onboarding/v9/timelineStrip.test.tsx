/**
 * The timeline strip in the import review (ref design-refs/import-timeline-strip-v1.html) — the card,
 * the strip's markup, the gate, the ready row, and what Kirsten Vale's answered card commits.
 * Locks TS-B1…TS-B6. The rendered locks (the pop-over moves nothing, flips, closes, focus) are
 * tests/e2e/importTimelineStrip.measure.ts.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../../types";
import type { SmartImportResult } from "../../../types/smartImport";
import { parseModel, modelToResult, type ReviewQuery } from "../../../lib/smartImportReviewModel";
import { openQueryQuestions } from "../../../lib/reviewGate";
import { stripEligible, showsStrip, setSentDate, confirmStrip, waiveSentDate, STRIP_WORDS, STRIP_CODES } from "../../../lib/importTimeline";
import { impliedRungs, assignTimes } from "../../../lib/impliedRungs";
import { deriveStatus } from "../../../lib/queryDerivation";
import { StripQuestion, QueryQuestion } from "./DeckQuestions";
import { QueryRow } from "../reviewRows";
import { REVIEW_FIXTURE_TIMELINE } from "../SmartImportReviewFixture";

const noop = () => {};
const html = (n: React.ReactElement) => renderToStaticMarkup(n).replace(/<!-- -->/g, "").replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const T = "2026-11-04";
const model = parseModel(REVIEW_FIXTURE_TIMELINE);
const kirsten = model.queries[0];
const jamal = model.queries[1];
const cordelia = model.queries[2];

describe("TS-B1 the strip card shows for its cases, and not otherwise", () => {
  const seen = (qs: ReviewQuery[]) => new Set(qs.filter(stripEligible).map((q) => q.id));
  it("Kirsten (events, no sent date) and the two-dates row get it; ready and single-date rows do not", () => {
    const s = seen(model.queries);
    expect(showsStrip(kirsten, s)).toBe(true);
    expect(showsStrip(jamal, s)).toBe(true);
    expect(showsStrip(cordelia, s)).toBe(false);
    const single = parseModel({ agents: [{ ref: "a", name: "A", agency: "B" }], queries: [{ agentRef: "a", status: QueryStatus.REJECTED, sentDate: null, reasons: ["no-date"] }] } as SmartImportResult).queries[0];
    expect(showsStrip(single, seen([single]))).toBe(false);
  });
  it("a status question on the same query is still its own card", () => {
    const q = { ...kirsten, reasons: [{ code: "crossed-out" as const, resolved: false }, ...kirsten.reasons] };
    expect(showsStrip(q, seen([q]))).toBe(false);
    expect(STRIP_CODES.has("crossed-out")).toBe(false);
  });
});

describe("TS-B2 the card: one question, the strip, one button that says what is missing", () => {
  it("as Kirsten's card arrives", () => {
    const h = html(<StripQuestion query={kirsten} agentName="Kirsten Vale" onChange={noop} onConfirm={noop} today={T} />);
    expect(h).toContain("Is this Kirsten Vale's timeline right?");
    expect(h).not.toContain('class="o9-why"');
    expect(h.match(/data-step="/g)?.length).toBe(4); // sent, two events, add
    expect(h).toMatch(/data-step="sent"[^>]*>.*?Query sent.*?Add the date/);
    expect(h).toContain("15 Sep 2026");
    expect(h).toContain("22 Sep 2026");
    expect(h).toContain(STRIP_WORDS.add);
    expect(h).toMatch(/class="o9-stop is-now"[^>]*data-step="e1"/);
    expect(h).toContain("Where it stands: <b>Full sent</b>, with the agent. Press any step to change it.");
    expect(h).toMatch(/<button[^>]*disabled[^>]*data-strip="confirm">Add the date you sent it first</);
    expect(h).not.toMatch(/Now<|>NOW</);
  });
  it("answered: Yes, that's right", () => {
    const h = html(<StripQuestion query={setSentDate(kirsten, "2026-08-30")} agentName="Kirsten Vale" onChange={noop} onConfirm={noop} today={T} />);
    expect(h).toMatch(/<button type="button" class="sf-btn" data-strip="confirm">Yes, that's right</);
  });
  it("an event before the sent date: the rust line, and Fix the dates first", () => {
    const h = html(<StripQuestion query={setSentDate(kirsten, "2026-09-18")} agentName="Kirsten Vale" onChange={noop} onConfirm={noop} today={T} />);
    expect(h).toContain('<span class="o9-warn">An event is dated before the query was sent.</span>');
    expect(h).toContain(">Fix the dates first<");
  });
  it("an agency-only agent: this query's timeline", () => {
    expect(html(<StripQuestion query={kirsten} agentName={null} onChange={noop} onConfirm={noop} today={T} />)).toContain("Is this query's timeline right?");
  });
  it("a waived sent date reads No date", () => {
    expect(html(<StripQuestion query={waiveSentDate(kirsten)} agentName="K" onChange={noop} onConfirm={noop} today={T} />)).toMatch(/Query sent<\/b><small>No date</);
  });
  it("every ring is a StatusDot", () => {
    const h = html(<StripQuestion query={kirsten} agentName="K" onChange={noop} onConfirm={noop} today={T} />);
    expect(h.match(/<button[^>]*data-step="(sent|e\d)"[^>]*><span aria-hidden="true"[^>]*><svg/g)?.length).toBe(3);
  });
});

describe("TS-B3 the retired two-dates controls are gone", () => {
  it("no card offers Swap the dates, It's just one date, or Neither is when I sent it", () => {
    /* every card a strip code can reach, the strip card itself, and the ready row open and closed */
    const all = [
      ...[...STRIP_CODES].map((code) => html(<QueryQuestion query={jamal} code={code} onPatch={noop} onResolveReason={noop} />)),
      html(<StripQuestion query={jamal} agentName="Jamal Carter" onChange={noop} onConfirm={noop} today={T} />),
      html(<QueryRow query={jamal} agentName="Jamal Carter" origin="Carter & Vale" open onToggleOpen={noop} onPatch={noop} onDelete={noop} onReopen={noop} />),
      html(<QueryRow query={jamal} agentName="Jamal Carter" origin="Carter & Vale" open={false} onToggleOpen={noop} onPatch={noop} onDelete={noop} onReopen={noop} />),
    ];
    expect(all.join("").length, "the cards rendered").toBeGreaterThan(2000);
    for (const h of all) for (const s of ["Swap the dates", "It's just one date", "Neither is when I sent it"]) expect(h).not.toContain(s);
  });
});

describe("TS-B4 the gate counts the strip card as one question", () => {
  it("a query with two date reasons and a strip is one open question, and none once confirmed", () => {
    const q = { ...kirsten, reasons: [{ code: "no-date" as const, resolved: false }, { code: "unreadable-response-date" as const, resolved: false }] };
    expect(openQueryQuestions([q, cordelia]).length).toBe(1);
    const done = confirmStrip(setSentDate(q, "2026-08-30"));
    expect(openQueryQuestions([done, cordelia]).length).toBe(0);
  });
});

describe("TS-B5 the ready row: Edit opens the strip, Done in place of Edit and Don't import", () => {
  it("open", () => {
    const h = html(<QueryRow query={cordelia} agentName="Cordelia Vane" origin="Vane & Hart" open onToggleOpen={noop} onPatch={noop} onDelete={noop} onReopen={noop} />);
    expect(h).toContain('data-strip="strip"');
    expect(h).toMatch(/data-im="row-action">Done</);
    expect(h).not.toContain("Don't import");
    expect(h).not.toMatch(/<select[^>]*>.*Queried/);
    expect(h).not.toContain('type="date"');
    expect(h).toContain("Where it stands: <b>Queried, no reply yet</b>, with the agent.");
  });
  it("closed: Edit (the ref's word, not Add details) and Don't import", () => {
    const h = html(<QueryRow query={cordelia} agentName="Cordelia Vane" origin="Vane & Hart" open={false} onToggleOpen={noop} onPatch={noop} onDelete={noop} onReopen={noop} />);
    expect(h).not.toContain('data-strip="strip"');
    expect(h).toContain("Don't import");
    expect(h).toMatch(/data-im="row-action">Edit</);
    expect(h).not.toContain("Add details");
  });
});

describe("TS-B6 Kirsten Vale's case commits three rungs at Full Sent", () => {
  it("sent 30 Aug, Full requested 15 Sep, Full sent 22 Sep", () => {
    const done = confirmStrip(setSentDate(kirsten, "2026-08-30"));
    const out = modelToResult(REVIEW_FIXTURE_TIMELINE, model.agents, [done]).queries[0];
    expect(out.sentDate).toBe("2026-08-30");
    expect(out.status).toBe(QueryStatus.FULL_SENT);
    expect((out as unknown as Record<string, unknown>).sentWaived).toBeUndefined();
    const rungs = impliedRungs(out);
    expect(rungs.map((r) => [r.status, r.date])).toEqual([[QueryStatus.QUERIED, "2026-08-30"], [QueryStatus.FULL_REQUESTED, "2026-09-15"], [QueryStatus.FULL_SENT, "2026-09-22"]]);
    expect(deriveStatus(assignTimes(rungs, 0).map((t) => ({ resultingStatus: t.status, date: t.ms })))).toBe(QueryStatus.FULL_SENT);
  });
});
