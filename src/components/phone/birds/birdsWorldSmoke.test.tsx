/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Render smokes — Phone Birds-eye world v2 (BirdsWorld). See `src/test/pageSmoke.tsx` for why these exist. The node
 * environment has no layout, so the shell renders statically (the frame is drawWorld.test.ts's, the rendered checks are
 * tests/e2e/phoneBirdsWorld.measure.ts's).
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { SMOKE_USER, renderPageSeededWith } from "../../../test/pageSmoke";
import { QueryStatus, SubmissionMethod } from "../../../types";

vi.mock("../../../lib/db", async () => (await import("../../../test/pageSmoke")).dbMock());
vi.mock("../../../lib/firebase", async () => (await import("../../../test/pageSmoke")).firebaseMock());
vi.mock("../../toast/ToastProvider", async () => (await import("../../../test/pageSmoke")).toastMock());

import { V3Provider } from "../v3/V3Provider";
import { BirdsWorld, cardFor } from "./BirdsWorld";
import { shadowStyle } from "./worldMotion";
import { QueriesV4 } from "../v4/QueriesV4";

const NOW = Date.parse("2026-11-11T12:00:00Z");
const DAY = 86_400_000;
const iso = (d: number) => new Date(NOW + d * DAY).toISOString();
const P = (n: React.ReactNode) => <V3Provider on now={NOW}>{n}</V3Provider>;
const agent = (i: number) => ({ id: `ag${i}`, userId: SMOKE_USER.id, name: `Agent Number${i}`, agency: `Agency ${i}`, email: "", status: "Active", responseTimeWeeks: 1 + (i % 6) });
const query = (i: number, status: QueryStatus, o: Record<string, unknown> = {}) => ({
  id: `qq${i}`, userId: SMOKE_USER.id, manuscriptId: "m1", agentId: `ag${i}`, packageId: "", personalisationNotes: "",
  status, dateSent: iso(-10 - i * 9), sendMethod: SubmissionMethod.EMAIL, expectedSendDate: iso(-2 + i), materialsWanted: ["Query Letter"], ...o,
});
const QS = (n: number) => ({
  agents: Array.from({ length: n }, (_, i) => agent(i)),
  queries: Array.from({ length: n }, (_, i) => query(i, i % 4 === 1 ? QueryStatus.PARTIAL_REQUESTED : QueryStatus.QUERIED)),
});
const ONLY_CLOSED = { agents: [agent(0), agent(1)], queries: [query(0, QueryStatus.REJECTED, { lastStatusChange: iso(-3) }), query(1, QueryStatus.NO_RESPONSE, { lastStatusChange: iso(-5) })] };
const text = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
const W = (court: string | null = null, route = "/queries/all?view=birds", data: Record<string, unknown> = QS(12)) =>
  renderPageSeededWith(P(<BirdsWorld court={court} onBack={() => {}} onList={() => {}} />), route, data);
const pills = (html: string) => Object.fromEntries([...html.matchAll(/data-bw="chip" data-k="(\w+)" data-n="(\d+)"/g)].map((m) => [m[1], Number(m[2])]));

describe("Phone Birds-eye world v2 renders", () => {
  it("the header: the hawk badge, Birds-eye view, back, List, replay, search; four pills, counts after the label, adding up", () => {
    const html = W();
    expect(html).toContain('data-bw="world"');
    expect(html).toMatch(/data-bw="badge" src="\/images\/qc\/be-hawk-head\.png"/);
    expect(html).toContain(">Birds-eye view</h1>");
    for (const l of ["Back", "List", "Replay your campaign", "Search"]) expect(html).toContain(`aria-label="${l}"`);
    expect(text(html)).toMatch(/All \d+ With you \d+ Needs chasing \d+ Waiting \d+/);
    const p = pills(html);
    expect(Object.keys(p)).toEqual(["all", "you", "chase", "wait"]);
    expect(p.you + p.chase + p.wait).toBe(p.all);
    expect(p.all).toBe(12);
    expect(text(html)).not.toMatch(/overdue|\blate\b/i);
  });
  it("&court= maps as v1's: you → With you, quiet → Needs chasing, agent → All; a filter shows its chip and hides the folded title", () => {
    expect(W("you", "/queries/all?view=birds&court=you")).toMatch(/data-filter="you"[\s\S]*data-bw="fon" data-k="you">With you ✕/);
    expect(W("quiet")).toContain('data-filter="chase"');
    expect(W("agent")).toContain('data-filter="all"');
    expect(W("you")).toMatch(/class="bw-hd filt"/);
  });
  it("no queries at all: the card over the blurred invented sample; no pills, no hint", () => {
    const html = W(null, "/queries/all?view=birds", { agents: [], queries: [] });
    expect(html).toContain('data-demo="1"');
    expect(html).toContain('class="bw-w demo"');
    expect(html).toMatch(/data-bw="card" data-k="none"[\s\S]*No queries out yet[\s\S]*Log your first query and it lands here, with every stage on its own dates\.[\s\S]*Log a query/);
    expect(html).not.toContain('data-bw="chips"');
    expect(html).toMatch(/class="bw-hint hide"/);
    expect(html).toContain("pa-layer bw isdemo");
  });
  it("the Queries list's Birds-eye side mounts the world even with no queries (the list keeps Nothing sent yet)", () => {
    const empty = { agents: [], queries: [] };
    expect(renderPageSeededWith(P(<QueriesV4 />), "/queries/all?view=birds", empty)).toMatch(/data-bw="world"[^>]*data-demo="1"/);
    const list = renderPageSeededWith(P(<QueriesV4 />), "/queries/all", empty);
    expect(list).toContain("Nothing sent yet.");
    expect(list).not.toContain('data-bw="world"');
  });
  it("only closed queries: the card at the top, Closed below it; a pill with nothing: its own card with See all queries", () => {
    const closed = W(null, "/queries/all?view=birds", ONLY_CLOSED);
    expect(closed).toMatch(/data-bw="card" data-k="closed"[\s\S]*No open queries[\s\S]*Your closed queries are below\./);
    expect(closed).toMatch(/class="bw-card"/);
    const c = (f: "you" | "chase" | "wait") => cardFor(false, f, []);
    expect([c("you")?.title, c("chase")?.title, c("wait")?.title]).toEqual(["Nothing’s with you", "Nothing needs chasing", "Nothing waiting on a reply"]);
    expect([c("you")?.cta, c("chase")?.cta, c("wait")?.cta]).toEqual(["all", "all", "all"]);
    expect(cardFor(false, "all", [{ t: "Closed" }])?.k).toBe("closed");
    expect(cardFor(false, "all", [{ t: "With you" }])).toBeNull();
  });
  it("v3: the level control, the hawk's button, the colour key and the hawk's shadow (?hawk=0 drops it); no + / −, See it all or mini map", () => {
    const html = W();
    /* v3.2: at rest the switch is one chip naming the level, a button with aria-expanded; the three levels only when open */
    expect(html).toMatch(/data-bw="levels" data-open="0"[^>]*><button type="button" class="bw-lvchip" data-a="lvchip" data-bw="level-chip" data-t="All" aria-expanded="false" aria-label="Zoom level: All"><span>All<\/span>/);
    expect(html).not.toContain('data-bw="level" ');
    /* v3.3: open, the chip stays (the source renders it outside the open branch, aria-expanded following the state) */
    const src = readFileSync("src/components/phone/birds/BirdsWorld.tsx", "utf8");
    expect(src).toContain('data-bw="level-chip" data-t={t} aria-expanded={lvOpen}');
    expect(src).toContain('if (a === "lvchip") { buzz(8); setLvOpen((o) => !o); return; }');
    expect(html).toContain('data-bw="hawk-btn"');
    expect(html).toContain('aria-label="What the colours mean"');
    for (const k of ["hint", "hawk"]) expect(html).toContain(`data-bw="${k}"`);
    for (const k of ["zin", "zout", "fit", "mini"]) expect(html).not.toContain(`data-bw="${k}"`);
    expect(html).toContain("Pinch to zoom · hold to scrub");
    expect(html).toContain('src="/images/hawk-shadow.png?v=1"');
    expect(W(null, "/queries/all?view=birds&hawk=0")).not.toContain('data-bw="hawk"');
    expect(shadowStyle(1, 10, 200, { z: 1, ox: 10, oy: 200 }).opacity).toBe("0.100");
  });
  it("v3 source: the long-press menu opens the one query sheet at the desktop's journeys or its dates edit (Phone query sheet v1 §D); no Reopen; per-device storage; haptics never throw", () => {
    const v = readFileSync("src/components/phone/birds/BirdsWorld.tsx", "utf8");
    expect(v).toContain('case "replied": openV3({ type: "query", id, j: "resp" }); return;');
    expect(v).toContain('case "nudge": runAct("nudge", id); return;');
    expect(v).toContain('case "sent": openV3({ type: "query", id, j: "send" }); return;');
    expect(v).toContain('case "edit": openV3({ type: "query", id, edit: "dates" }); return;');
    expect(v).toContain('case "open": openV3Query(id); return;');
    expect(v).toContain('case "sendby": openV3({ type: "query", id, edit: "sendby" }); return;');
    expect(v).not.toMatch(/case "reopen"|"Reopen"|SendBySheet|TimelineSheet/);
    expect(v).toContain('BW_SEEN_KEY = "bw3.lastOpened"');
    expect(v).toContain('BW_FOLD_KEY = "bw3.folded"');
    expect(v).toContain("writerExpectedWrite(");
    expect(v).toContain("if (rp.current.rt != null || calm()) { stopReplay(); return; }");
    const m = readFileSync("src/components/phone/birds/worldMotion.ts", "utf8");
    expect(m).toContain("export const HOLD_MS = 380;");
    expect(m).toMatch(/export function buzz\(ms = 8\): void \{ try \{/);
    const css = readFileSync("src/components/phone/birds/birdsWorld.css", "utf8");
    expect(css).toMatch(/\.bw-vp \{[^}]*touch-action: none/);
    expect(css).toMatch(/\.bw-hint \{[^}]*top: 46%/);
  });
});
