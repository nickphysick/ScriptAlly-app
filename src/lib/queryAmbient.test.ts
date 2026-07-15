/**
 * Locks for the Queries command bar (ref design-refs/queries-workspace-v2.html): the shared
 * ambient-status derivation (waiting / each writer's-turn variant / closed), the bar's centre
 * text, plus artefact locks over Queries.tsx — the ONE-HOME-FOR-ACTIONS rule (old top toolbar
 * gone, command bar present, mark-sent trigger in the bar) and the ?q= deep-link regression.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { queryAmbientStatus, commandBarStatus } from "./queryAmbient";
import { QueryStatus } from "../types";

const NOW = new Date("2026-07-06T00:00:00Z").getTime();
const q = (over: Record<string, any> = {}): any => ({ id: "q", userId: "u", manuscriptId: "m", agentId: "a", packageId: "", sendMethod: "Email", status: QueryStatus.QUERIED, ...over });

describe("queryAmbientStatus — the shared open-state derivation", () => {
  it("agent's turn (Queried) → waiting, days + expected reply from the send date + 8-week window", () => {
    const sent = new Date("2026-06-16T00:00:00Z").toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: sent }), "agent", undefined, NOW);
    expect(a.mode).toBe("waiting");
    expect(a.nDays).toBe(20);
    expect(a.sentMs).toBe(new Date(sent).getTime());
    expect(a.expMs).toBe(new Date(sent).getTime() + 8 * 7 * 86400000); // +8 weeks
    expect(a.overdue).toBe(false);
  });

  it("undated waiting keeps mode but nulls the bar/date", () => {
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: undefined }), "agent", undefined, NOW);
    expect(a.mode).toBe("waiting");
    expect(a.sentMs).toBeNull();
    expect(a.expMs).toBeNull();
  });

  it("writer's turn — partial requested → event + days-ago from the request date", () => {
    const req = new Date("2026-06-12T00:00:00Z").toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: req }), "writer", "partial", NOW);
    expect(a.mode).toBe("writer");
    expect(a.sendWhat).toBe("partial");
    expect(a.eventLabel).toBe("partial requested");
    expect(a.writerDaysAgo).toBe(24);
  });

  it("writer's turn — full requested + R&R variants", () => {
    const full = queryAmbientStatus(q({ status: QueryStatus.FULL_REQUESTED, fullRequestedDate: new Date("2026-07-01T00:00:00Z").toISOString() }), "writer", "full", NOW);
    expect([full.sendWhat, full.eventLabel, full.writerDaysAgo]).toEqual(["full", "full requested", 5]);
    const rr = queryAmbientStatus(q({ status: QueryStatus.REVISE_RESUBMIT, dateSent: new Date("2026-07-04T00:00:00Z").toISOString() }), "writer", "resubmit", NOW);
    expect([rr.sendWhat, rr.eventLabel]).toEqual(["resubmission", "revise & resubmit"]);
  });

  it("closed / Offer (ballHolder null) → closed, no ambient", () => {
    const a = queryAmbientStatus(q({ status: QueryStatus.OFFER }), null, undefined, NOW);
    expect(a.mode).toBe("closed");
    expect(commandBarStatus(a)).toBeNull();
  });
});

describe("commandBarStatus — the bar's centre text", () => {
  it("waiting: WAITING TO HEAR BACK · N DAYS · EXPECTED ~date (singular-safe)", () => {
    const sent = new Date("2026-06-16T00:00:00Z").toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: sent }), "agent", undefined, NOW);
    const s = commandBarStatus(a)!;
    expect(s.bold).toBeUndefined();
    expect(s.text).toBe("Waiting to hear back · 20 days · expected ~11 Aug");
  });

  it("writer: burgundy 'Your move' fragment + the event/days-ago tail", () => {
    const req = new Date("2026-06-12T00:00:00Z").toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.PARTIAL_REQUESTED, partialRequestedDate: req }), "writer", "partial", NOW);
    const s = commandBarStatus(a)!;
    expect(s.bold).toBe("Your move");
    expect(s.text).toBe("· partial requested 24 days ago");
  });
});

describe("Queries.tsx artefacts — one home for actions + regressions", () => {
  const src = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");

  it("the F12 control bar sits at the TOP — two zones locked by --listw; the foot cards are retired", () => {
    // One bar above the panes (ref queries-hub-v14.html .ctl): FILTER + SORT in the list-width
    // left zone, the quiet query actions in the right zone. No foot control-row cards remain.
    expect(src).toContain('className="f12-ctl"');
    expect(src).toContain('className="f12-zone-list"');
    expect(src).toContain('className="f12-zone-read"');
    expect(src.includes("gridColumn: 1, gridRow: 2")).toBe(false); // foot list card gone
    expect(src.includes("gridColumn: 2, gridRow: 2")).toBe(false); // foot ribbon card gone
    expect(src.includes("qp-controlbar")).toBe(false);
    expect(src.includes("Actions toolbar")).toBe(false);
  });

  it("the mark-sent popover is anchored to the primary ribbon tile (single home)", () => {
    // The primary tile routes markSentTriggerRef through primaryRef only on the writer's turn.
    expect(src).toContain("const primaryRef = (sel && isMark && !isClosed) ? markSentTriggerRef : undefined");
    expect(src).toContain("ref={primaryRef}");
    expect(src).toContain("triggerRef={markSentTriggerRef}"); // the popover consumes the same ref
  });

  it("the ?q= deep-link scroll-into-view is untouched (regression)", () => {
    expect(src).toContain("query-row-${activeSubPage}");
    expect(src).toContain('scrollIntoView({ block: "center" })');
  });
});

describe("command-bar theming — per-theme token smoke (rule-text lock)", () => {
  const css = readFileSync(resolve(__dirname, "../index.css"), "utf8");
  const themeBlock = (sel: string) => {
    const start = css.indexOf(`\n${sel} {`);
    expect(start).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("\n}", start));
  };

  it("Cappuccino: warm bar + centre-fill primary", () => {
    const b = themeBlock(".t-capp");
    expect(b).toContain("--cmd-bar-bg: #fffefb");
    expect(b).toContain("--cmd-bar-bd: #e7ddd2");
    expect(b).toContain("--cmd-primary-bg: #5d4037");
    expect(b).toContain("--qp-col-bg: #fffefb");
  });

  it("Bold Pastille: ink rule bar (1.5px)", () => {
    const b = themeBlock(".t-bold");
    expect(b).toContain("--cmd-bar-bd: #1d1712");
    expect(b).toContain("--cmd-bar-bdw: 1.5px");
    expect(b).toContain("--cmd-primary-bg: #eec9c3");
  });

  it("Editorial: hairline + soft float shadow bar", () => {
    const b = themeBlock(".t-edn");
    expect(b).toContain("--cmd-bar-bd: #ececeb");
    // v2 — the control cards float in every theme, so the bar carries a soft downward shadow like Cappuccino
    expect(b).toContain("--cmd-bar-shadow: 0 10px 30px rgba(20, 20, 20, 0.08)");
    expect(b).toContain("--cmd-primary-bg: #e9eaeb");
  });
});

describe("Queries height chain — structural guards (jsdom cannot verify flex/grid sizing)", () => {
  const src = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");

  it("both branches share the centred .f12-body column (the old queries-content-grid is retired)", () => {
    // The panes live in the SAME centred column as the Contact List page — .f12-body caps at
    // --maxw with auto margins and the --gut bottom gap; the old page-specific grid is gone.
    expect(src.includes('className="queries-content-grid"')).toBe(false);
    const bodies = src.match(/className="f12-body"/g) ?? [];
    expect(bodies.length).toBeGreaterThanOrEqual(2); // empty + populated branches
  });

  it("the panes are the f12 pair (list --listw / detail flex:1), never grid-cell-anchored", () => {
    // No stale gridColumn/gridRow cell styles remain on the panes — the flex column owns layout.
    expect(src.includes('className="f12-pane f12-list"')).toBe(true);
    expect(src.includes('className="qp-pane f12-pane f12-detail"')).toBe(true);
    expect(src.includes("gridColumn: 2, gridRow:")).toBe(false);
    expect(src.includes("gridColumn: 1, gridRow:")).toBe(false);
  });

  it("no viewport-relative height or bottom-anchor in the workspace pane subtree", () => {
    // The stage bounds are the only place the viewport is known — the pane tree stretches
    // within the grid, never sizes to vh/dvh, and nothing margin-top:auto / flex-end pins it low.
    const paneStart = src.indexOf('className="qp-pane"');
    const paneEnd = src.indexOf("closes qp-pane", paneStart);
    const paneTree = src.slice(paneStart, paneEnd);
    expect(paneTree).not.toMatch(/100vh|100dvh|calc\(100v/);
    expect(paneTree).not.toMatch(/marginTop:\s*"auto"|alignSelf:\s*"flex-end"|alignSelf:\s*"end"/);
  });
});

describe("QueryTimeline artefact — move band keeps prose, loses its button", () => {
  const tl = readFileSync(resolve(__dirname, "../components/reading-pane/QueryTimeline.tsx"), "utf8");
  it("no send-materials button in the writer band (handler gone); the narrative remains", () => {
    expect(tl.includes("onMarkSent")).toBe(false); // the button + its handler are removed
    expect(tl.includes("Your move — send the")).toBe(true);
  });
});

describe("queryAmbientStatus — overdue boundary (P6; derived from now vs expected-by, no stored field)", () => {
  const DAY = 86400000;
  const WINDOW = 56; // QUERIED = STAGE_RESPONSE_WINDOWS.query (8) × 7
  const sentDaysAgo = (d: number) => new Date(NOW - d * DAY).toISOString();
  const at = (daysAgo: number) => queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: sentDaysAgo(daysAgo) }), "agent", undefined, NOW);

  it("expected-by YESTERDAY → overdue (daysOverdue = 1)", () => {
    const a = at(WINDOW + 1);
    expect(a.overdue).toBe(true);
    expect(a.daysOverdue).toBe(1);
  });
  it("expected-by TODAY → calm (the boundary itself is not overdue)", () => {
    const a = at(WINDOW);
    expect(a.overdue).toBe(false);
    expect(a.daysOverdue).toBe(0);
  });
  it("expected-by TOMORROW → calm", () => {
    const a = at(WINDOW - 1);
    expect(a.overdue).toBe(false);
    expect(a.daysOverdue).toBe(0);
  });
  it("well within the window → calm, daysOverdue 0", () => {
    const a = at(10);
    expect(a.overdue).toBe(false);
    expect(a.daysOverdue).toBe(0);
  });
});

describe("P6 artefacts — one escalation signal per pane (readout escalates, fork stays neutral)", () => {
  const tl = readFileSync(resolve(__dirname, "../components/reading-pane/QueryTimeline.tsx"), "utf8");
  const composer = readFileSync(resolve(__dirname, "../components/reading-pane/TimelineComposer.tsx"), "utf8");
  it("the overdue readout escalates to the needs-you token + badge + inline nudge", () => {
    expect(tl.includes("var(--pink-i)")).toBe(true);           // needs-you escalation colour
    expect(tl.includes("past expected")).toBe(true);           // the Overdue badge
    expect(tl.includes("onNudge")).toBe(true);                 // inline nudge seam
  });

  it("P3 tidy — no strikethrough anywhere (the expectation lapsed, it wasn't withdrawn)", () => {
    expect(tl.includes("line-through")).toBe(false);
  });
  it("the 'What happened next?' composer (the fork) carries NO needs-you tokens — stays neutral", () => {
    expect(composer.includes("--pink-i")).toBe(false);
    expect(composer.includes("--pink-t")).toBe(false);
    expect(composer.includes("--pink-b")).toBe(false);
  });
});
