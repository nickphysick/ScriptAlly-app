/**
 * Smart Import v1.2, decision 5: every single-date deck card uses the timeline strip's date field and
 * calendar, and the calendar opens on the month the writer's words name. Locks DP-1…DP-4. The
 * rendered locks (the calendar moves nothing; "early Oct" opens on October) are in
 * tests/e2e/importDatePick.measure.ts.
 */
import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus } from "../../../types";
import type { ReviewReasonCode, SmartImportResult } from "../../../types/smartImport";
import { parseModel } from "../../../lib/smartImportReviewModel";
import { cardCalendarStart } from "../../../lib/importTimeline";
import { monthHint } from "../../../lib/importTypedDate";
import { QueryQuestion } from "./DeckQuestions";
import { QueryReasonPanel } from "../reviewRows";

const T = "2026-11-04";
const noop = () => {};
const q = (extra: Record<string, unknown>) =>
  parseModel({ agents: [{ ref: "a", name: "A", agency: "B" }], queries: [{ agentRef: "a", status: QueryStatus.QUERIED, ...extra }] } as unknown as SmartImportResult).queries[0];

describe("DP-1 the month the writer's words name", () => {
  it("a month, from any start of its name of three letters or more", () => {
    expect(monthHint("early Oct", T)).toBe("2026-10-01");
    expect(monthHint("sometime in Sept", T)).toBe("2026-09-01");
    expect(monthHint("late October", T)).toBe("2026-10-01");
    expect(monthHint("mid-sept.", T)).toBe("2026-09-01");
  });
  it("its year when one is written; else the most recent one that has begun", () => {
    expect(monthHint("late October 2025", T)).toBe("2025-10-01");
    expect(monthHint("Nov", T)).toBe("2026-11-01");
    expect(monthHint("early Dec", T)).toBe("2025-12-01");
  });
  it("never a day, and nothing when no month is named", () => {
    expect(monthHint("22 Oct", T)).toBe("2026-10-01");
    for (const raw of ["12/8", "sometime", "", null, undefined, "early", "Octavia"]) expect(monthHint(raw as string, T), String(raw)).toBeNull();
  });
});

describe("DP-2 where a card's calendar opens", () => {
  it("the words first, then the adjacent known date, then today", () => {
    expect(cardCalendarStart(q({ sentDate: null, sentDateRaw: "early Oct", reasons: ["no-date"] }), T)).toBe("2026-10-01");
    expect(cardCalendarStart(q({ sentDate: null, sentDateRaw: null, timeline: [{ type: QueryStatus.FULL_REQUESTED, date: "2026-09-15", raw: "15/9" }], reasons: ["no-date"] }), T)).toBe("2026-09-15");
    expect(cardCalendarStart(q({ sentDate: null, sentDateRaw: "??", reasons: ["unreadable-date"] }), T)).toBe(T);
    expect(cardCalendarStart(q({ sentDate: "2026-03-14", sentDateRaw: "14/3", reasons: ["serial-outlier"] }), T)).toBe("2026-03-14");
  });
});

describe("DP-3 every single-date card draws the strip's field, never a native date input", () => {
  const cases: [ReviewReasonCode, Record<string, unknown>][] = [
    ["no-date", { sentDate: null, sentDateRaw: "early Oct" }],
    ["unreadable-date", { sentDate: null, sentDateRaw: "??" }],
    ["missing-day", { sentDate: "2025-10-01", sentDateRaw: "Oct 2025" }],
  ];
  for (const [code, extra] of cases) {
    it(code, () => {
      const query = q({ ...extra, reasons: [code] });
      const h = renderToStaticMarkup(<QueryQuestion query={query} code={code} onPatch={noop} onResolveReason={noop} />)
        + renderToStaticMarkup(<QueryReasonPanel query={query} code={code} onPatch={noop} onResolveReason={noop} />);
      expect(h).toContain('data-dpick="input"');
      expect(h).not.toContain('type="date"');
      expect(h).toContain("Save date");
    });
  }
  it("no review file renders a native date input", () => {
    const dir = join(__dirname, "..");
    const files = [...readdirSync(dir).map((f) => join(dir, f)), ...readdirSync(__dirname).map((f) => join(__dirname, f))]
      .filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f));
    expect(files.length).toBeGreaterThan(10);
    const bad = files.filter((f) => /type="date"/.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")));
    expect(bad).toEqual([]);
  });
});

describe("DP-4 \"I don't have this date\" stays on the card", () => {
  it("no-date keeps its escape", () => {
    const query = q({ sentDate: null, sentDateRaw: "early Oct", reasons: ["no-date"] });
    const h = renderToStaticMarkup(<QueryQuestion query={query} code="no-date" onPatch={noop} onResolveReason={noop} />).replace(/&#x27;/g, "'");
    expect(h).toMatch(/I don't have this date|Leave undated/);
  });
});
