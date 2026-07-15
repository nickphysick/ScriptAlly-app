/**
 * Locks for the Queries command bar (ref design-refs/queries-workspace-v2.html): the shared
 * ambient-status derivation (waiting / each writer's-turn variant / closed), the bar's centre
 * text, plus artefact locks over Queries.tsx — the ONE-HOME-FOR-ACTIONS rule (old top toolbar
 * gone, command bar present, mark-sent trigger in the bar) and the ?q= deep-link regression.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { queryAmbientStatus, commandBarStatus, deriveEscalation, trackingBar, nudgeCount } from "./queryAmbient";
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

  it("grace P3 — a re-escalated overdue badge acknowledges the prior chase (nudged N×), not a fresh overdue", () => {
    expect(tl.includes("nudged once")).toBe(true);
    expect(tl.includes("nudged ${nudges}×")).toBe(true);
    expect(tl.includes("· no reply`")).toBe(true);
  });

  it("P5 connector — container-drawn hairline, gated on !isLast (2+ events), spacing via a constant", () => {
    expect(tl.includes("const TL_EVENT_GAP")).toBe(true);
    expect(tl.includes("var(--hairline")).toBe(true);      // theme token, not a scattered hex
    expect(tl.includes("bottom: -TL_EVENT_GAP")).toBe(true);
    // The connector is inside the `{!isLast && (` guard — no orphan line on a single-event query.
    expect(/\{!isLast && \(\s*[\s\S]{0,220}var\(--hairline/.test(tl)).toBe(true);
    // Drawn by the row container, never by editing the locked StatusDot.
    expect(tl.includes("<StatusDot") && !tl.includes("StatusDot connector")).toBe(true);
  });
  it("the 'What happened next?' composer (the fork) carries NO needs-you tokens — stays neutral", () => {
    expect(composer.includes("--pink-i")).toBe(false);
    expect(composer.includes("--pink-t")).toBe(false);
    expect(composer.includes("--pink-b")).toBe(false);
  });
});

const DAY = 86400000;
const overdueAt = (daysAgo: number) =>
  queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: new Date(NOW - daysAgo * DAY).toISOString() }), "agent", undefined, NOW);

describe("deriveEscalation — grace vs overdue (P1; live-derived, no stored flag)", () => {
  const a = overdueAt(57); // window 56d → overdue by 1; expMs = NOW − 1 day
  const nudgedSince = NOW - 0.5 * DAY; // fired after expected lapsed

  it("nudge since lapse + reminder in the FUTURE → grace", () => {
    expect(deriveEscalation(a, { reminderMs: NOW + 3 * DAY, lastNudgeMs: nudgedSince, now: NOW })).toBe("grace");
  });
  it("reminder in the PAST (lapsed) → re-escalated overdue", () => {
    expect(deriveEscalation(a, { reminderMs: NOW - 1 * DAY, lastNudgeMs: nudgedSince, now: NOW })).toBe("overdue");
  });
  it("nudge but NO reminder → overdue (no horizon to wait on)", () => {
    expect(deriveEscalation(a, { reminderMs: null, lastNudgeMs: nudgedSince, now: NOW })).toBe("overdue");
  });
  it("nudge fired BEFORE expected lapsed → overdue (not 'since lapse')", () => {
    expect(deriveEscalation(a, { reminderMs: NOW + 3 * DAY, lastNudgeMs: a.expMs! - 2 * DAY, now: NOW })).toBe("overdue");
  });
  it("within the window → 'within' regardless of nudge fields", () => {
    expect(deriveEscalation(overdueAt(10), { reminderMs: NOW + 3 * DAY, lastNudgeMs: NOW - DAY, now: NOW })).toBe("within");
  });
  it("response-safe: grace de-escalates the READOUT; the overdue CLOCK is untouched", () => {
    expect(a.overdue).toBe(true);
    expect(a.daysOverdue).toBe(1);
    deriveEscalation(a, { reminderMs: NOW + 3 * DAY, lastNudgeMs: nudgedSince, now: NOW });
    expect(a.overdue).toBe(true); // deriveEscalation reads reminder/nudge only — never rewrites it
    expect(a.daysOverdue).toBe(1);
  });
});

describe("trackingBar — derived geometry, no magic percentages (P4)", () => {
  const a = overdueAt(57);
  it("within-window: bar ends at expected, NO marker", () => {
    const bar = trackingBar("within", overdueAt(14), null, NOW);
    expect(bar.markerPct).toBeNull();
    expect(bar.overdueZone).toBe(false);
    expect(bar.fillPct).toBeCloseTo((14 / 56) * 100, 1);
  });
  it("overdue: full fill, expected marker at window/(window+daysPast), hatch beyond", () => {
    const bar = trackingBar("overdue", a, null, NOW);
    expect(bar.fillPct).toBe(100);
    expect(bar.markerPct).toBeCloseTo((56 / 57) * 100, 1);
    expect(bar.overdueZone).toBe(true);
  });
  it("grace: bar spans sent→reminder (horizon), faded expected tick, no loud marker", () => {
    const bar = trackingBar("grace", a, NOW + 7 * DAY, NOW);
    const span = 57 + 7; // sent 57d ago → reminder +7d
    expect(bar.markerPct).toBeNull();
    expect(bar.overdueZone).toBe(false);
    expect(bar.graceTickPct).toBeCloseTo((56 / span) * 100, 1);
    expect(bar.fillPct).toBeCloseTo((57 / span) * 100, 1);
  });
});

describe("nudgeCount", () => {
  it("counts only nudge-typed events; null-safe", () => {
    expect(nudgeCount([{ type: "Nudge sent" }, { type: "Queried" }, { type: "Nudge sent" }], "Nudge sent")).toBe(2);
    expect(nudgeCount([], "Nudge sent")).toBe(0);
    expect(nudgeCount(null, "Nudge sent")).toBe(0);
  });
});

describe("TWS P2 artefacts — five readout treatments + CSS-only sage pulse", () => {
  const tl = readFileSync(resolve(__dirname, "../components/reading-pane/QueryTimeline.tsx"), "utf8");
  const css = readFileSync(resolve(__dirname, "../components/shell/f12.css"), "utf8");

  it("grace is DASHED + sage-pulse (the Warm --grace-* treatment is gone)", () => {
    expect(tl.includes('"1px dashed var(--sage')).toBe(true);
    expect(tl.includes("tl-gracebar")).toBe(true);
    expect(tl.includes("tl-sweep")).toBe(true);
    expect(tl.includes("var(--grace-bg")).toBe(false); // Warm treatment removed
    expect(tl.includes("Nudge again")).toBe(false);     // the grace nudge link removed
  });
  it("overdue carries NO nudge CTA in the readout (nudge is a fork chip now)", () => {
    expect(tl.includes("Nudge {agentFirst}")).toBe(false);
    expect(tl.includes("agentFirst")).toBe(false);
  });
  it("the no-expected-date state + Set-an-expected-date link exist", () => {
    expect(tl.includes("no expected date set")).toBe(true);
    expect(tl.includes("Set an expected date")).toBe(true);
    expect(tl.includes("onSetExpectedDate")).toBe(true);
  });
  it("your-move is soft-pink fill + ink border (was amber)", () => {
    expect(tl.includes("Your move — send the")).toBe(true);
    expect(tl.includes("var(--pink, #f5e2da)")).toBe(true);
    expect(tl.includes("#f6edd6")).toBe(false); // old amber gone
  });
  it("the pulse keyframe is transform-only — NO var() inside the keyframe (silent-failure trap)", () => {
    const kf = css.slice(css.indexOf("@keyframes tl-sweep"), css.indexOf("}", css.indexOf("@keyframes tl-sweep") + 40) + 1);
    expect(kf.length).toBeGreaterThan(0);
    expect(kf.includes("transform")).toBe(true);
    expect(kf.includes("var(")).toBe(false);
    expect(css.includes("prefers-reduced-motion")).toBe(true);
  });
});

describe("queryAmbientStatus — responseDeadline override (P4; undated stage)", () => {
  it("undated + FUTURE responseDeadline → expMs = the override, no send anchor (no bar)", () => {
    const future = new Date(NOW + 5 * DAY).toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: undefined, responseDeadline: future }), "agent", undefined, NOW);
    expect(a.expMs).toBe(new Date(future).getTime());
    expect(a.sentMs).toBeNull();
    expect(a.overdue).toBe(false);
  });
  it("undated + PAST responseDeadline → overdue by the override", () => {
    const past = new Date(NOW - 3 * DAY).toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: undefined, responseDeadline: past }), "agent", undefined, NOW);
    expect(a.overdue).toBe(true);
    expect(a.daysOverdue).toBe(3);
  });
  it("undated + NO override → no expected date (expMs null)", () => {
    expect(queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: undefined }), "agent", undefined, NOW).expMs).toBeNull();
  });
  it("a real stage send date WINS over the override (derived stays primary)", () => {
    const sent = new Date(NOW - 10 * DAY).toISOString();
    const a = queryAmbientStatus(q({ status: QueryStatus.QUERIED, dateSent: sent, responseDeadline: new Date(NOW).toISOString() }), "agent", undefined, NOW);
    expect(a.sentMs).toBe(new Date(sent).getTime());
    expect(a.expMs).toBe(new Date(sent).getTime() + 56 * DAY); // derived, not the override
  });
});

describe("TWS P4 artefacts — no-date gate + set-date wiring", () => {
  const tl = readFileSync(resolve(__dirname, "../components/reading-pane/QueryTimeline.tsx"), "utf8");
  const qsrc = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");
  it("the no-expected-date branch gates on hasExpected (expMs), not merely a send date", () => {
    expect(tl.includes("const hasExpected = waiting.expMs != null")).toBe(true);
    expect(tl.includes("{!hasExpected ? (")).toBe(true);
  });
  it("Set an expected date opens the Edit drawer (which edits responseDeadline)", () => {
    expect(qsrc.includes("onSetExpectedDate={() => openEditQuery(activeQuery.id)}")).toBe(true);
  });
});
