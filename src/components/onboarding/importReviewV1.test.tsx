/**
 * Import review v1, Part A — the review list (ref design-refs/onboarding/import-review-v1/
 * review-agents.dc.html). Rendered rows, not source: what the writer sees, and what the review
 * hands the import.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AgentRow, QueryRow, ROW_WORDS } from "./reviewRows";
import { SmartImportReview } from "./SmartImportReview";
import { parseModel, modelToResult, applyAgentRemoval, type ReviewAgent } from "../../lib/smartImportReviewModel";
import { REVIEW_FIXTURE_CLEAR } from "./SmartImportReviewFixture";

const noop = () => {};
const agent = (p: Partial<ReviewAgent> = {}): ReviewAgent => ({
  id: "a1", name: "Priya Anand", agency: "Anand Literary", agencyOnly: false, genres: ["Fantasy"], website: "",
  submissionsOpen: null, weeks: null, rating: 0, reasons: [], mergeWith: [], mergeResolved: false, deleted: false, ...p,
});
const row = (a: ReviewAgent, x: Partial<React.ComponentProps<typeof AgentRow>> = {}) =>
  renderToStaticMarkup(<AgentRow agent={a} open={false} onToggleOpen={noop} onPatch={noop} onDelete={noop} onReopenReason={noop} {...x} />);
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&#x27;/g, "'").replace(/\s+/g, " ");

describe("A · a ready row", () => {
  it("offers 'Don't import' as a labelled pill, never a bare ×, and 'Add details'", () => {
    const h = row(agent());
    expect(text(h)).toContain(ROW_WORDS.dontImport);
    expect(text(h)).toContain(ROW_WORDS.add);
    expect(h).not.toContain("✕");
    expect(text(h)).not.toMatch(/set aside/i);
  });
  it("says the name once: an agency-only row reads 'Agency only', and only its panel asks for a name", () => {
    const named = row(agent(), { open: true });
    const only = row(agent({ name: "", agencyOnly: true, agency: "Thornfield & Drake" }), { open: true });
    expect(text(only)).toMatch(/Thornfield &amp; Drake Agency only/);
    expect(only).toContain('data-im="det-name"');
    expect(only).toContain(`placeholder="${ROW_WORDS.namePlaceholder}"`);
    expect(named).not.toContain('data-im="det-name"');
    for (const h of [named, only]) expect(text(h)).not.toMatch(/Referenced by agency only|Reference by agency only/);
  });
  it("after Done, a changed row says 'Details added' and its link reads 'Edit details'", () => {
    const h = row(agent(), { added: true });
    expect(h).toContain('data-im="row-added"');
    expect(text(h)).toContain(ROW_WORDS.edit);
    expect(text(row(agent()))).not.toContain(ROW_WORDS.added);
  });
});

describe("A · the details panel answers nothing for the writer", () => {
  const h = row(agent(), { open: true });
  it("the door: neither Open nor Closed is chosen, and the note says it isn't known", () => {
    expect(h).toMatch(/aria-pressed="false"[^>]*data-im="det-open"/);
    expect(h).toMatch(/aria-pressed="false"[^>]*data-im="det-closed"/);
    expect(text(h)).toContain(ROW_WORDS.doorUnknown);
    const chosen = row(agent({ submissionsOpen: true }), { open: true });
    expect(chosen).toMatch(/aria-pressed="true"[^>]*data-im="det-open"/);
    expect(text(chosen)).toContain(ROW_WORDS.doorFromYou);
  });
  it("the reply time: 'Not set' with 'Set a reply time' — no slider, no 6 weeks shown", () => {
    expect(text(h)).toContain(ROW_WORDS.weeksUnset);
    expect(text(h)).toContain(ROW_WORDS.setWeeks);
    expect(h).not.toContain('type="range"');
    expect(text(h)).not.toMatch(/\b6 weeks\b/);
    const set = row(agent({ weeks: 6 }), { open: true });
    expect(set).toContain('data-im="det-weeks-val"');
    expect(text(set)).toContain("6 weeks");
    expect(text(set)).toContain(ROW_WORDS.clear);
  });
  it("Agent fit is gone from the review, and the foot names the Contact list", () => {
    expect(text(h)).not.toMatch(/Agent fit/);
    expect(text(h)).toContain(ROW_WORDS.agentFoot);
    expect(text(h)).toContain(ROW_WORDS.done);
    expect(text(h)).not.toMatch(/\bClose\b(?! details)/);
  });
});

describe("A · a row the writer chose not to import", () => {
  it("stays in place, says 'Won't be imported', offers Undo, and no other action", () => {
    const h = row(agent({ deleted: true, setAsideStage: "agents" }), { out: true });
    expect(h).toContain('data-out="1"');
    expect(text(h)).toContain(ROW_WORDS.out);
    expect(h).toContain('data-im="row-undo"');
    expect(h).not.toContain('data-im="row-remove"');
    expect(h).not.toContain('data-im="row-action"');
  });
  it("a query row follows the same parts", () => {
    const m = parseModel(REVIEW_FIXTURE_CLEAR);
    const q = m.queries[0];
    const live = renderToStaticMarkup(<QueryRow query={q} agentName="Priya Anand" origin="Anand Literary" open={false} onToggleOpen={noop} onPatch={noop} onDelete={noop} onReopen={noop} />);
    const out = renderToStaticMarkup(<QueryRow query={q} agentName="Priya Anand" origin="Anand Literary" open={false} onToggleOpen={noop} onPatch={noop} onDelete={noop} onReopen={noop} out />);
    expect(text(live)).toContain(ROW_WORDS.dontImport);
    expect(text(out)).toContain(ROW_WORDS.out);
  });
});

describe("A · the 'Ready to import' header", () => {
  it("is the navy band with the sage tick and the ready count", () => {
    const h = renderToStaticMarkup(<SmartImportReview result={REVIEW_FIXTURE_CLEAR} />);
    expect(h).toContain("im-listhead--ready");
    expect(h).toContain("im-readymark");
    expect(h).toMatch(/data-im="ready-chip"[^>]*>\d+ ready</);
    expect(h).not.toContain("im-listhead--quiet");
    expect(h).not.toContain('data-im="tray"');
  });
});

describe("A · import truth: the review hands the import nothing nobody gave", () => {
  it("an untouched agent goes in with no reply time, no open/closed and no rating", () => {
    const m = parseModel(REVIEW_FIXTURE_CLEAR);
    const r = modelToResult(REVIEW_FIXTURE_CLEAR, m.agents, m.queries);
    for (const a of r.agents) {
      const fromFile = REVIEW_FIXTURE_CLEAR.agents.find((o) => o.ref === a.ref)!;
      expect(a.responseTimeWeeks ?? null).toBe(fromFile.responseTimeWeeks && fromFile.responseTimeWeeks > 0 ? Math.min(26, fromFile.responseTimeWeeks) : null);
      expect(a.submissionStatus).toBeNull();
      expect(a.starRating).toBeNull();
    }
  });
  it("'Don't import' leaves the agent and its queries out, through the same path as before", () => {
    const m = parseModel(REVIEW_FIXTURE_CLEAR);
    const id = m.agents[0].id;
    const next = applyAgentRemoval(m.agents, m.queries, id);
    const r = modelToResult(REVIEW_FIXTURE_CLEAR, next.agents, next.queries);
    expect(r.agents.some((a) => a.ref === id)).toBe(false);
    expect(r.queries.some((q) => q.agentRef === id)).toBe(false);
  });
});
