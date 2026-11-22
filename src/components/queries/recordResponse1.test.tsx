/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Record a response v1 (design-refs/record-a-response-v1/record-a-response-v1.html) — the locks that can be read from
 * the source or rendered on the server. The measured ones (rects, the scrim's alpha, focus, the phone at 390) are
 * tests/e2e/recordResponse1.measure.ts.
 *
 *   R1  one door: every desktop door goes through `openResponse` / the Query Centre's `respondOn`, and none reaches
 *       the drawer's response journey, the old picker or QcWhoReplied149 on the desktop
 *   R4  closed queries: absent with nothing typed; found by typing; a pick opens Reopen (closed → "reopen")
 *   R5  nothing live: the day-one state and "Log a query", no search field
 *   R6  one writer: the composer's reply save is the only desktop response writer the doors reach
 *   R7  options: no "Asked for the full" on Full requested / Full sent / Offer; Queried gets "Asked for the partial"
 *   R12 phone: with nothing listening, `openResponse` is the drawer's own response journey, unchanged
 *   F1  the footer: "{first} replied" on the nudge-due and gone-quiet states
 */
import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../types";
import { QcWhoReplied, whoGroups, type WhoRow } from "./centre/QcWhoReplied";
import { QcComposer1522, type ComposerCtx } from "./centre/QcComposer1522";
import { footer1522 } from "../../lib/qcFoot1522";
import { openResponse } from "../../lib/queryPanelStore";
import { closeQueryDrawer, currentDrawerRequest } from "../../lib/queryActions/drawerStore";

vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const noop = () => {};

/* ── R1 · every desktop door, from the Step 0.3 census, and what it must call ─────────────────────────────────────── */
const DOORS: { door: string; file: string; calls: string }[] = [
  { door: "shell menu, sidebar capture, search palette", file: "src/App.tsx", calls: "openResponse();" },
  { door: "Analytics header and collapsed bar", file: "src/components/QueryAnalytics.tsx", calls: "openResponse();" },
  { door: "Responses header", file: "src/components/responses/ResponsesPage.tsx", calls: "openResponse();" },
  { door: "Responses card act", file: "src/components/responses/ResponsesPage.tsx", calls: "openResponse({ queryId: i.id" },
  { door: "Responses answer panel", file: "src/components/responses/RspPanel.tsx", calls: "openResponse({ queryId: item.id" },
  { door: "dashboard list run()", file: "src/components/dashboard/v58/Dash58.tsx", calls: "openResponse({ queryId: a.request.queryId" },
  { door: "agent quick view", file: "src/components/agents/card/AgentCardHost.tsx", calls: "openResponse({ queryId: q.id, back: agentBack(agent) })" },
  { door: "agent panel card", file: "src/components/agents/card/HostAgentCard.tsx", calls: "openResponse({ queryId, back: agentBack(agent) })" },
  { door: "Contact list card", file: "src/components/agents/AgentList.tsx", calls: "openResponse({ queryId, back: agentBack(x.agent) })" },
  { door: "To-do desk, They did reply", file: "src/components/todo/ws/useWsCore.ts", calls: "openResponse({ queryId: sel.query.id, onSaved" },
  { door: "parked chip (a response parked before)", file: "src/components/queryActions/ParkedChip.tsx", calls: "openResponse(id ? { queryId: id } : {})" },
  { door: "Queries rows, Birds-eye, trays (stepRow)", file: "src/components/Queries.tsx", calls: `if (req.mode === "resp") { respondOn(q.id` },
  { door: "Queries bulk queue", file: "src/components/Queries.tsx", calls: `if (qcBulk.mode === "resp" && !qmPhone) { respOpenRef.current({ queryId: next })` },
  { door: "Queries desk verb", file: "src/components/Queries.tsx", calls: `if (qid && mode === "resp" && !qmPhone) { setDeskVerb(null); respOpenRef.current({ queryId: qid })` },
  { door: "Queries correction fork, what happened next", file: "src/components/Queries.tsx", calls: "if (activeQuery && !qmPhone) { respOpenRef.current({ queryId: activeQuery.id })" },
  { door: "Who replied? pick", file: "src/components/Queries.tsx", calls: "swapCard(1, () => respondOn(id, { set: null }))" },
  { door: "card footer (Record a response, {first} replied, Reopen)", file: "src/components/Queries.tsx", calls: "card1522.onFoot = (a) => open1522(a);" },
];

describe("R1 · one door", () => {
  it("the census is not empty, and every door calls the one opener", () => {
    expect(DOORS.length).toBeGreaterThanOrEqual(15);
    const missing = DOORS.filter((d) => !read(d.file).includes(d.calls)).map((d) => `${d.door} (${d.file})`);
    expect(missing).toEqual([]);
  });
  it("no desktop door opens the drawer's response journey unguarded, and the old picker and the v149 list are gone", () => {
    /* the drawer is the phone's: every remaining `openQueryDrawer({ mode: "resp"` is behind a phone / not-hosted check */
    const hits: string[] = [];
    for (const f of ["src/App.tsx", "src/components/QueryAnalytics.tsx", "src/components/responses/ResponsesPage.tsx", "src/components/dashboard/v58/Dash58.tsx",
      "src/components/agents/card/AgentCardHost.tsx", "src/components/agents/card/HostAgentCard.tsx", "src/components/agents/AgentList.tsx"]) {
      if (read(f).includes('openQueryDrawer({ mode: "resp"')) hits.push(f);
    }
    /* Analytics' phone-only band goes through `record` too: on a phone openResponse is the same drawer (R12) */
    expect(hits).toEqual([]);
    const src = read("src/components/Queries.tsx");
    expect(src).not.toContain("QcWhoReplied149");
    expect(src).not.toContain("subscribeResponsePicker");
    expect(read("src/lib/queryPanelStore.ts")).not.toContain("openResponsePicker");
  });
});

/* ── R4 / R5 · "Who replied?" ─────────────────────────────────────────────────────────────────────────────────────── */
const ROWS: WhoRow[] = [
  { id: "a", initials: "AK", name: "Aisha Kapoor", agency: "The Lantern Agency", status: QueryStatus.QUERIED, step: "queried 3 Apr", group: "wait", sinceMs: 300 },
  { id: "m", initials: "MW", name: "Marcus Webb", agency: "Webb & Thorne", status: QueryStatus.FULL_SENT, step: "full sent 22 Aug", group: "wait", sinceMs: 100 },
  { id: "c", initials: "CB", name: "Clara Bell", agency: "Bell House", status: QueryStatus.FULL_REQUESTED, step: "full requested 1 Sep", group: "you", sinceMs: 200 },
  { id: "g", initials: "GH", name: "George Hale", agency: "Hale Lit", status: QueryStatus.REJECTED, step: "closed 2 Jul", group: "closed", sinceMs: 50 },
];

describe("R4 · closed queries only by searching", () => {
  it("nothing typed: waiting (longest first), then with you, and no closed group", () => {
    const g = whoGroups(ROWS, "");
    expect(g.map((x) => x.label)).toEqual(["Waiting to hear back · 2", "Already with you · 1"]);
    expect(g[0].rows.map((r) => r.id)).toEqual(["m", "a"]);
    expect(g.flatMap((x) => x.rows).some((r) => r.group === "closed")).toBe(false);
  });
  it("typing a closed agent's name lists it under its own heading", () => {
    const g = whoGroups(ROWS, "geo");
    expect(g.map((x) => x.label)).toEqual(["Closed · a reply after closing reopens it"]);
    expect(g[0].rows.map((r) => r.id)).toEqual(["g"]);
  });
  it("a closed query opens at Reopen (the opener's own rule)", () => {
    const src = read("src/components/Queries.tsx");
    expect(src).toContain(`const a: FootAct = courtOf(q.status as QueryStatus) === "closed" ? "reopen" : "resp";`);
  });
  it("a no-match shows the line and Log a query to them", () => {
    const html = renderToStaticMarkup(<QcWhoReplied rows={ROWS} onPick={noop} onClose={noop} onLog={noop} />);
    expect(html).toContain("Who replied?");
    expect(html).toContain("Find the agent");
    expect(html).toContain("Waiting to hear back · 2");
    expect(html).not.toContain("George Hale");
    expect(html).not.toContain("Paste the email");
  });
});

describe("R5 · nothing live", () => {
  it("the day-one state and Log a query, and no search field", () => {
    const html = renderToStaticMarkup(<QcWhoReplied rows={ROWS.filter((r) => r.group === "closed")} onPick={noop} onClose={noop} onLog={noop} />);
    expect(html).toContain("Nothing’s out with agents yet.");
    expect(html).toContain("Once you’ve logged a query, this is where you’ll record what came back.");
    expect(html).toContain("Log a query");
    expect(html).not.toContain('data-qcrr="search"');
  });
});

/* ── R6 · one writer ──────────────────────────────────────────────────────────────────────────────────────────────── */
describe("R6 · one writer", () => {
  it("the composer's reply is planned and committed by lib/qc1522Write and tells the door", () => {
    const src = read("src/components/Queries.tsx");
    const at = src.indexOf(`} else if (p.j === "reply") {`);
    expect(at).toBeGreaterThan(0);
    const body = src.slice(at, at + 600);
    expect(body).toContain("planReply(pc,");
    expect(body).toContain("commitPlan(uid, plan)");
    expect(body).toContain("responseSaved(q.id);");
  });
  it("no re-pointed door imports the old writers; the To-do desk's own tiles are the phone's", () => {
    for (const f of ["src/App.tsx", "src/components/dashboard/v58/Dash58.tsx", "src/components/responses/ResponsesPage.tsx", "src/components/responses/RspPanel.tsx",
      "src/components/agents/card/AgentCardHost.tsx", "src/components/agents/card/HostAgentCard.tsx", "src/components/agents/AgentList.tsx", "src/components/todo/ws/useWsCore.ts"]) {
      const s = read(f);
      expect(s, f).not.toMatch(/\b(saveResponse|recordQueryResponse)\b/);
    }
    const flows = read("src/components/todo/ws/wsFlows.tsx");
    const door = flows.indexOf(`if (act === "replied" && openReply) {`);
    const tiles = flows.indexOf(`if (act === "replied") {`);
    expect(door).toBeGreaterThan(0);
    expect(door).toBeLessThan(tiles);
    expect(read("src/components/todo/ws/useWsCore.ts")).toContain("openReply: responseHosted() ? () => {");
  });
});

/* ── R7 · the reply box's options ─────────────────────────────────────────────────────────────────────────────────── */
const ctx = (o: Partial<ComposerCtx>): ComposerCtx => ({
  first: "Aisha", fullName: "Aisha Kapoor", nowMs: Date.UTC(2026, 10, 16, 12), email: "", floorMs: null,
  env: { free: true, versions: [], letters: [], synopses: [], inUseVersionId: null }, pro: false,
  sendKind: "partial_sent", sendMats: [], queriedVia: "Email", nudgedMs: null, queryOnly: false, remindDays: 14,
  passMs: null, passedAfter: "your query", restartToMs: 0, offerFromMs: null, offerByMs: null, others: [], openOthers: 0, withPages: 0,
  packages: null, packageId: null, ...o,
});
const replyBox = (c: ComposerCtx) => renderToStaticMarkup(
  <QcComposer1522 journey="reply" ctx={c} onDraft={noop} onSave={async () => true} onClose={noop} busy={false} onAddEmail={noop} onEditOffer={noop} />,
);

describe("R7 · options", () => {
  it.each([["Full requested"], ["Full sent"], ["Offer"]])("%s: no “Asked for the full”", () => {
    const html = replyBox(ctx({ fullAsked: true }));
    expect(html).toContain("What did Aisha say?");
    expect(html).not.toContain("Asked for the full");
    expect(html).toContain("Passed");
  });
  it("the Query Centre says which statuses those are", () => {
    expect(read("src/components/Queries.tsx")).toContain("fullAsked: q.status === QueryStatus.FULL_REQUESTED || q.status === QueryStatus.FULL_SENT || q.status === QueryStatus.OFFER,");
  });
  it("Queried: “Asked for the partial”; a partial sent still gets “Asked for the full”", () => {
    expect(replyBox(ctx({ queryOnly: true, fullAsked: false }))).toContain("Asked for the partial");
    expect(replyBox(ctx({ queryOnly: false, fullAsked: false }))).toContain("Asked for the full");
  });
  it("after “Who replied?” the Cancel reads “← Someone else”", () => {
    const html = renderToStaticMarkup(
      <QcComposer1522 journey="reply" ctx={ctx({})} onDraft={noop} onSave={async () => true} onClose={noop} busy={false} onAddEmail={noop} onEditOffer={noop} cancelLabel="← Someone else" />,
    );
    expect(html).toContain("← Someone else");
  });
});

/* ── F1 · the footer of a waiting card ────────────────────────────────────────────────────────────────────────────── */
describe("F1 · {first} replied on every waiting state", () => {
  const now = Date.UTC(2026, 10, 16, 12);
  const base = { first: "Priya", fullName: "Priya Shah", nowMs: now, phase: null, dueMs: null, replyMs: now - 20 * 86_400_000, nudgeMs: null,
    quietWeeks: 4, closeLeads: false, toTell: 0, askedFor: null, closedMs: null, closedHow: null } as const;
  it("nudge due and gone quiet carry it; with the agent leads with Record a response", () => {
    expect(footer1522({ ...base, state: "nudge", status: QueryStatus.QUERIED }).replied?.label).toBe("Priya replied");
    expect(footer1522({ ...base, state: "quiet", status: QueryStatus.QUERIED }).replied?.label).toBe("Priya replied");
    expect(footer1522({ ...base, state: "quiet", status: QueryStatus.QUERIED, nudgeMs: now - 40 * 86_400_000 }).replied?.label).toBe("Priya replied");
    expect(footer1522({ ...base, state: "quiet", status: QueryStatus.QUERIED, closeLeads: true }).replied?.label).toBe("Priya replied");
    const a = footer1522({ ...base, state: "agent", status: QueryStatus.QUERIED });
    expect([a.button?.label, a.button?.act]).toEqual(["Record a response", "resp"]);
  });
  it("the second line is never clamped with an ellipsis", () => {
    const css = read("src/components/queries/centre/qcv1522card.css");
    expect(css).not.toContain("-webkit-line-clamp: 2");
    /* v158.1: every footer's lines wrap and the pill grows with them (qcv152card.css), for both footer paths */
    const card = read("src/components/queries/centre/qcv152card.css");
    expect(card).toContain(".qc152 .qc152-rft span { font: italic 400 12.5px/1.35 var(--sp-serif); color: #7d7268; white-space: normal; overflow: visible; display: block; }");
    expect(card).not.toMatch(/\.qc152-rft span \{[^}]*text-overflow: ellipsis/);
  });
});

/* ── R12 · the phone keeps its flow ───────────────────────────────────────────────────────────────────────────────── */
describe("R12 · phone", () => {
  it("with nothing listening (the phone page), openResponse opens the drawer's own response journey", () => {
    closeQueryDrawer();
    expect(openResponse({ queryId: "q1" })).toBe(false);
    const r = currentDrawerRequest();
    expect([r?.mode, r?.queryId]).toEqual(["resp", "q1"]);
    closeQueryDrawer();
    expect(read("src/components/Queries.tsx")).toContain("useEffect(() => (qmPhone ? undefined : subscribeResponse((r) => respOpenRef.current(r))), [qmPhone]);");
  });
});
