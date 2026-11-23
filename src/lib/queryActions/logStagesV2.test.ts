/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2 (design-refs/log-a-query-v2/, mock v22) — the journey's pure model: the headline, catching up, the
 * nudge chips, what the agent asks for, and the review's two numbers.
 */
import { describe, expect, it } from "vitest";
import { headline, isCatchingUp, LOGGED_NAME_MAX, sod } from "./logStages";

const NOW = new Date(2026, 10, 22, 15).getTime();
const daysAgo = (n: number) => { const d = new Date(sod(NOW)); d.setDate(d.getDate() - n); return d.getTime(); };
const base = { sitting: 0, agentChosen: false, sentMs: null, nowMs: NOW };

describe("v2 · Phase 1 — the headline", () => {
  it("opens with the mock's two lines, on every step", () => {
    expect(headline(base)).toEqual(["Another query out. Great work!", "Let’s log the details."]);
    expect(headline({ ...base, agentChosen: true, sentMs: daysAgo(0) })).toEqual(["Another query out. Great work!", "Let’s log the details."]);
  });
  it("after Log and start another: the sitting's count, then the details once an agent is chosen", () => {
    expect(headline({ ...base, sitting: 2 })).toEqual(["That’s 2 logged.", "Who’s next?"]);
    expect(headline({ ...base, sitting: 2, agentChosen: true })).toEqual(["That’s 2 logged.", "Let’s log the details."]);
  });
  it("not sent yet", () => {
    expect(headline({ ...base, notSent: true })).toEqual(["Not out yet? No problem.", "It’s on your to-do list."]);
  });
  it("logged: the name up to 11 letters, else Logged. alone; the active count read back, else the Queries page", () => {
    expect(headline({ ...base, logged: { first: "Harriet", passed: false, active: 21 } })).toEqual(["Logged. Off to Harriet!", "That makes 21 active queries."]);
    expect(headline({ ...base, logged: { first: "Bartholomews", passed: false, active: 1 } })).toEqual(["Logged.", "That makes 1 active query."]);
    expect("Bartholomews".length).toBeGreaterThan(LOGGED_NAME_MAX);
    expect(headline({ ...base, logged: { first: "Maximiliana", passed: false, active: 3 } })[0]).toBe("Logged. Off to Maximiliana!");
    expect(headline({ ...base, logged: { first: "Harriet", passed: true, active: 21 } })[1]).toBe("It’s on your Queries page.");
    expect(headline({ ...base, logged: { first: "Harriet", passed: false, active: null } })[1]).toBe("It’s on your Queries page.");
  });
});

describe("v2 · Phase 3 — catching up", () => {
  it("7 days back is a normal log; 8 is catching up", () => {
    expect(isCatchingUp(daysAgo(7), NOW)).toBe(false);
    expect(isCatchingUp(daysAgo(8), NOW)).toBe(true);
    expect(isCatchingUp(null, NOW)).toBe(false);
    expect(headline({ ...base, sentMs: daysAgo(7) })[0]).toBe("Another query out. Great work!");
    expect(headline({ ...base, sentMs: daysAgo(8) })).toEqual(["Catching up.", "Let’s log the details."]);
  });
  it("catching up outranks the sitting's count; not sent and logged outrank both", () => {
    expect(headline({ ...base, sitting: 3, sentMs: daysAgo(30) })[0]).toBe("Catching up.");
    expect(headline({ ...base, sentMs: daysAgo(30), notSent: true })[0]).toBe("Not out yet? No problem.");
  });
});

/* ── Phase 2 — an agent added in the journey ── */
import { emptyCreated, heldTaskFor, toRemoveOnDiscard, toRemoveOnUndo, withAgent, withHeld, withLogged, withoutAgent, withoutHeld } from "./journeyCreated";
import { cascadePlan } from "../cascade";
import { agentFromDraft } from "../agentCreate";
import { emptyCardDraft, problemsOf } from "../cardDraft";
import { readFileSync } from "node:fs";

describe("v2 · Phase 2 — adding an agent without leaving", () => {
  it("the record is the new agent card's own: name and agency through the one mapping, an unknown agency marked so", () => {
    const d = { ...emptyCardDraft(), name: "Jo March", agency: "", agencyUnknown: true };
    expect(problemsOf(d)).toEqual({});
    const rec = agentFromDraft(d);
    expect(rec.name).toBe("Jo March");
    expect((rec as { agencyUnknown?: boolean }).agencyUnknown).toBe(true);
    /* without the mark the card's own rule asks for one — which is why the journey sets it */
    expect(problemsOf({ ...d, agencyUnknown: false }).agency).toBeTruthy();
  });
  it("create → select → discard removes the agent, and the agent's delete takes its Finish task", () => {
    let c = withAgent(emptyCreated(), "agent-new", "task-finish");
    expect(toRemoveOnDiscard(c)).toEqual([{ id: "agent-new", taskId: "task-finish" }]);
    /* the one delete (db.deleteAgent → cascadePlan) takes the agent's stored tasks with it */
    const plan = cascadePlan("agent", "agent-new", { queries: [], activities: [], taskFlags: [], userTasks: [{ id: "task-finish", agentId: "agent-new" }, { id: "other", agentId: "x" }] } as never);
    expect(plan.docs).toContainEqual({ col: "tasks", id: "task-finish" });
    expect(plan.docs).not.toContainEqual({ col: "tasks", id: "other" });
    c = withoutAgent(c, "agent-new");
    expect(toRemoveOnDiscard(c)).toEqual([]);
  });
  it("a logged agent is kept on close; Undo of that query removes it", () => {
    const c = withLogged(withAgent(emptyCreated(), "a1", "t1"), "a1");
    expect(toRemoveOnDiscard(c)).toEqual([]);
    expect(toRemoveOnUndo(c, "a1")).toEqual({ id: "a1", taskId: "t1" });
  });
  it("an agent the journey did not create is never removed (the duplicate check merged into it)", () => {
    const c = withLogged(emptyCreated(), "existing");
    expect(toRemoveOnDiscard(c)).toEqual([]);
    expect(toRemoveOnUndo(c, "existing")).toBeNull();
  });
  it("the host records an agent only when its id was not on the list before (the twin case is not recorded)", () => {
    const host = readFileSync("src/components/queries/centre/LogStagesHost.tsx", "utf8");
    expect(host).toMatch(/const isNew = !before\.has\(res\.id\);\s*if \(isNew\)/);
    expect(host).toMatch(/await addAgent\(agentFromDraft\(d\)\)/);
    expect(host).not.toMatch(/openNewAgentCard/);
  });
});

describe("v2 · Phase 3 — not sent yet", () => {
  it("one task per agent however often the link is pressed; a kept task keeps a new agent", () => {
    let c = withAgent(emptyCreated(), "a1", "t1");
    c = withHeld(c, "a1", "send-1");
    c = withHeld(c, "a1", "send-2");
    expect(c.held).toEqual([{ agentId: "a1", taskId: "send-1" }]);
    expect(heldTaskFor(c, "a1")).toBe("send-1");
    expect(toRemoveOnDiscard(c)).toEqual([]);
    c = withoutHeld(c, "a1");
    expect(heldTaskFor(c, "a1")).toBeNull();
    expect(toRemoveOnDiscard(c)).toEqual([{ id: "a1", taskId: "t1" }]);
  });
  it("the host reuses the held task before it makes one, and the not-sent route never saves a query", () => {
    const host = readFileSync("src/components/queries/centre/LogStagesHost.tsx", "utf8");
    /* v2.1 · Phase 4: "It has gone after all" (onSentAfterAll) is gone; the body ends at the way-out comment */
    const body = host.slice(host.indexOf("const onNotSent"), host.indexOf("/* every way out"));
    expect(body.length).toBeGreaterThan(50);
    expect(body.indexOf("heldTaskFor")).toBeLessThan(body.indexOf("addUserTask"));
    expect(body).not.toMatch(/saveLog|onSave/);
  });
});

/* ── Phase 4 — what the agent asks for ── */
import { askFill, askItems, NO_LETTER, NO_SYN, type StagePackage } from "./logStages";
import type { GuidelineAsk, PackageCard } from "./packages";
import { blankSample } from "./sample";

describe("v2 · Phase 4 — I sent what {First} asks for", () => {
  const smp = (unit: "pages" | "chapters", amt: number) => ({ ...blankSample(), unit, amt });
  const full: GuidelineAsk = { stated: true, ql: true, syn: true, sample: smp("chapters", 3) };
  const pcard = (x: Partial<PackageCard>): PackageCard => ({ id: "p", name: "P", ql: true, syn: true, qlVersion: "Letter B", synVersion: "One-page synopsis", qlId: "lb", synId: "s1", bookVersion: "Version 2", other: null, edition: 1, summary: "", ...x } as PackageCard);
  const pk = (c: PackageCard): StagePackage => ({ id: c.id, name: c.name, active: false, card: c, pieces: [] });
  const d = { letter: "lb", synopsis: "s1", book: "v2" };
  it("exact match: the package, with the sample at the size the card asks for", () => {
    const packs = [pk(pcard({ id: "p2", name: "Letter and sample", syn: false, synId: null })), pk(pcard({ id: "p1", name: "Full submission" }))];
    const f = askFill(full, packs, d);
    expect(f?.kind).toBe("pkg");
    expect(f?.kind === "pkg" && f.pkg.name).toBe("Full submission");
    expect(f?.pieces).toEqual({ letterId: "lb", synopsisId: "s1", sample: { unit: "chapters", amt: 3, bookVersionId: null } });
  });
  it("no match (a package with an extra, or with opening pages the card does not want): the pieces themselves", () => {
    const packs = [pk(pcard({ id: "x", other: "Author bio" }))];
    const f = askFill(full, packs, d);
    expect(f).toEqual({ kind: "pieces", pieces: { letterId: "lb", synopsisId: "s1", sample: { unit: "chapters", amt: 3, bookVersionId: "v2" } } });
    const noSample: GuidelineAsk = { ...full, sample: { ...blankSample(), unit: "none" } };
    expect(askFill(noSample, [pk(pcard({ id: "y" }))], d)?.kind).toBe("pieces");
  });
  it("a partial card (only 'first three chapters'): the sample alone", () => {
    const partial: GuidelineAsk = { stated: true, ql: false, syn: false, sample: smp("chapters", 3) };
    expect(askItems(partial)).toEqual(["First 3 chapters"]);
    expect(askFill(partial, [], d)).toEqual({ kind: "pieces", pieces: { letterId: null, synopsisId: null, sample: { unit: "chapters", amt: 3, bookVersionId: "v2" } } });
  });
  it("nothing on the card: no items and no button", () => {
    const nil: GuidelineAsk = { stated: false, ql: false, syn: false, sample: { ...blankSample(), unit: "none" } };
    expect(askItems(nil)).toEqual([]);
    expect(askFill(nil, [], d)).toBeNull();
    expect(askFill(null, [], d)).toBeNull();
  });
  it("nothing saved: the generic stand-ins the build already stores (no new field)", () => {
    expect(askFill(full, [], { letter: null, synopsis: null, book: null })).toEqual({
      kind: "pieces", pieces: { letterId: NO_LETTER, synopsisId: NO_SYN, sample: { unit: "chapters", amt: 3, bookVersionId: null } },
    });
  });
  it("the items read as the ref lists them", () => {
    expect(askItems(full)).toEqual(["Query letter", "Synopsis", "First 3 chapters"]);
    expect(askItems({ ...full, syn: false, sample: smp("pages", 50) })).toEqual(["Query letter", "First 50 pages"]);
  });
});

/* ── Phase 5 — the Nudge step ── */
import { chipOn, isPastReply, nudgeChips, nudgeDateOf, replyDefaults, replyPlan, settleReply, nudgeAnswer } from "./logStages";

describe("v2 · Phase 5 — nudgeChips never offers a date in the past", () => {
  const today = sod(NOW);
  const notPast = (cs: { d: Date }[]) => cs.every((c) => c.d.getTime() >= today);
  it("sent 60 days ago with an 8-week window: the reply date has passed, so a week / two weeks / a month from today", () => {
    expect(isPastReply(daysAgo(60), 8, NOW)).toBe(true);
    const cs = nudgeChips(daysAgo(60), 8, NOW);
    expect(cs.map((c) => [c.k, c.label])).toEqual([["n1", "In a week"], ["n2", "In two weeks"], ["n4", "In a month"]]);
    expect(notPast(cs)).toBe(true);
  });
  it("sent today: counted from the reply date, all ahead", () => {
    const cs = nudgeChips(daysAgo(0), 8, NOW);
    expect(cs.map((c) => c.k)).toEqual(["w0", "week", "2w"]);
    expect(notPast(cs)).toBe(true);
    expect(isPastReply(daysAgo(0), 8, NOW)).toBe(false);
  });
  it("Unknown: counted from today, never from the sent date", () => {
    const recent = nudgeChips(daysAgo(3), null, NOW);
    expect(recent.map((c) => c.k)).toEqual(["6w", "8w", "12w"]);
    expect(notPast(recent)).toBe(true);
    /* v1.3 counted from the sent date: 42 days after a date 60 days back is 18 days ago */
    const old = nudgeChips(daysAgo(60), null, NOW);
    expect(old.map((c) => c.k)).toEqual(["n1", "n2", "n4"]);
    expect(notPast(old)).toBe(true);
  });
  it("a reply date of today has not passed", () => {
    expect(isPastReply(daysAgo(56), 8, NOW)).toBe(false);
    expect(nudgeChips(daysAgo(56), 8, NOW)[0].k).toBe("w0");
  });
});

describe("v2 · Phase 5 — past that date: nudge now, give it longer, or no reminder", () => {
  const harriet = { responseTimeWeeks: 8, noResponseMeansNo: false };
  it("the first look defaults to nudge now; now becomes a reminder for today", () => {
    const r = settleReply(replyDefaults(harriet), daysAgo(60), NOW, true);
    expect(r.ifNo).toBe("now");
    expect(nudgeDateOf(r, daysAgo(60), NOW)!.getTime()).toBe(today0());
    const plan = replyPlan(r, harriet, daysAgo(60), NOW);
    expect(plan.ifNo).toBe("nudge");
    expect(plan.nudgeDate!.getTime()).toBe(today0());
    expect(nudgeAnswer(r, daysAgo(60), NOW)).toBe("Now");
  });
  it("now falls back to a reminder once the window is no longer past; close needs a date ahead", () => {
    expect(settleReply({ ...replyDefaults(harriet), ifNo: "now" }, daysAgo(2), NOW, false).ifNo).toBe("nudge");
    expect(settleReply({ ...replyDefaults(harriet), ifNo: "close" }, daysAgo(60), NOW, false).ifNo).toBe("now");
    expect(settleReply({ ...replyDefaults(harriet), ifNo: "none" }, daysAgo(60), NOW, false).ifNo).toBe("none");
  });
  it("give it longer: the chip shown is the middle one until one in today's set is picked", () => {
    const r = { ...replyDefaults(harriet), ifNo: "nudge" as const };
    const cs = nudgeChips(daysAgo(60), 8, NOW);
    expect(chipOn(r, cs)).toBe("n2");
    expect(nudgeDateOf(r, daysAgo(60), NOW)!.getTime()).toBe(cs[1].d.getTime());
  });
});
function today0() { return sod(NOW); }

/* ── Phase 6 — the review card is the saved card ── */
import { planOf, previewOf, reviewCounts, showsActive, PREVIEW_ID, type LogAnswers, type PlanContext } from "./logStages";
import { logPayload } from "./logSave";
import { buildQcRows } from "../qcSummary";
import { stampRows } from "../queryState";
import { liveCount } from "../dashBreakdown";
import { sentAllTime } from "../dash2";
import { ActivityType, QueryStatus, SubmissionMethod, SubmissionStatus, type Activity, type Agent, type Query } from "../../types";

describe("v2 · Phase 6 — the preview row is the row the saved query produces", () => {
  const harriet = { id: "hv", name: "Harriet Vance", agency: "Vance & Wren", email: "", submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
    materialsWanted: ["Query Letter", "Synopsis", "First 3 chapters"], responseTimeWeeks: 8, noResponseMeansNo: false } as unknown as Agent;
  const ctx: PlanContext = { manuscriptId: "m1", agents: [harriet], packages: [], letters: [{ id: "lb", name: "Letter B" }], synopses: [], bookVersions: [] };
  const base: LogAnswers = { agentId: "hv", sent: daysAgo(0), via: SubmissionMethod.EMAIL, packageId: null, letterId: "lb", synopsisId: null,
    sample: { unit: "chapters", amt: 3, bookVersionId: null }, notes: [] };
  /** what addQuery writes for this plan (db.tsx: the payload, the id, QUERIED, undefined stripped) and its query-sent entry */
  const saved = (a: LogAnswers) => {
    const plan = planOf(a, ctx, "q-saved", false, NOW)!;
    const { payload, summary } = logPayload(plan);
    const q = Object.fromEntries(Object.entries({ ...payload, id: "q-saved", userId: "u", status: QueryStatus.QUERIED, sentMaterials: summary }).filter(([, v]) => v !== undefined)) as unknown as Query;
    const act = { id: "act-1", userId: "u", queryId: "q-saved", manuscriptId: "m1", activityType: ActivityType.QUERY_SENT, description: "", date: new Date(NOW).toISOString(),
      details: summary, resultingStatus: QueryStatus.QUERIED, eventKey: "query_sent" } as unknown as Activity;
    const [r0] = buildQcRows([q], [harriet], [act], NOW);
    return stampRows([r0], [harriet], { quietWeeks: 8, nowMs: NOW })[0];
  };
  const pv = (a: LogAnswers) => previewOf(planOf(a, ctx, PREVIEW_ID, false, NOW)!, NOW, 8).row;
  /* the facts the grid card draws from (QcCard154: slipTrack, standWords, queriedFact, nextBox154, materialGroups) */
  const drawn = (r: ReturnType<typeof pv>) => ({
    status: r.status, court: r.court, withYou: r.withYou, sentMs: r.sentMs, expectedMs: r.expectedMs, pastExpected: r.pastExpected, stageStartMs: r.stageStartMs,
    qs: (r as { qs?: unknown }).qs, agentName: r.agentName, agency: r.agency, initials: r.initials,
    nudgeDate: (r.query as { nudgeDate?: unknown }).nudgeDate ?? null, sentMaterials: (r.query as { sentMaterials?: unknown }).sentMaterials ?? null,
  });
  const cases: [string, LogAnswers][] = [
    ["normal", base],
    ["no date (Unknown), a reminder in 8 weeks", { ...base, reply: { wk: null, saveWk: false, ifNo: "nudge", nWhen: "8w", nPick: null } }],
    ["past the date (sent 60 days ago, 8 weeks), nudge now", { ...base, sent: daysAgo(60), reply: { wk: 8, saveWk: false, ifNo: "now", nWhen: "n2", nPick: null } }],
    ["generic materials (nothing named saved)", { ...base, letterId: "__letter", synopsisId: "__synopsis", sample: { unit: "pages", amt: 10, bookVersionId: null } }],
  ];
  for (const [name, a] of cases) {
    it(name, () => { expect(drawn(pv(a))).toEqual(drawn(saved(a))); });
  }
  it("the two numbers are the Dashboard's own, without and with the query", () => {
    const book = [{ id: "q1", agentId: "x", manuscriptId: "m1", status: QueryStatus.QUERIED, dateSent: "2026-11-02" } as Query,
      { id: "q2", agentId: "y", manuscriptId: "m1", status: QueryStatus.REJECTED, dateSent: "2026-10-01" } as Query];
    const p = previewOf(planOf(base, ctx, PREVIEW_ID, false, NOW)!, NOW, 8);
    const c = reviewCounts(book, p.query, new Date(NOW));
    expect(c.active).toEqual([liveCount(book), liveCount([...book, p.query])]);
    expect(c.active).toEqual([1, 2]);
    expect(c.sent).toEqual([sentAllTime(book, new Date(NOW)), 3]);
    expect(showsActive(c)).toBe(true);
    /* a query the Dashboard would not count as active leaves "Active queries" where it was (the tile then hides) */
    expect(reviewCounts(book, { ...p.query, status: QueryStatus.REJECTED } as Query, new Date(NOW)).active).toEqual([1, 1]);
    expect(showsActive(reviewCounts(book, { ...p.query, status: QueryStatus.REJECTED } as Query, new Date(NOW)))).toBe(false);
    /* at half past midnight a query sent today still counts as sent (measured: it read 0 → 0) */
    const early = new Date(2026, 10, 22, 0, 30).getTime();
    const pe = previewOf(planOf({ ...base, sent: sod(early) }, ctx, PREVIEW_ID, false, early)!, early, 8);
    expect(reviewCounts([], pe.query, new Date(early)).sent).toEqual([0, 1]);
  });
});

/* ── Phase 7 — the logged screen's line ── */
import { celebrationLine } from "./logStages";

describe("v2 · Phase 7 — celebrationLine, by the reminder chosen", () => {
  const r = (ifNo: "nudge" | "close" | "none" | "now", wk: number | null, nWhen: "week" | "8w" | "n2" = "week") => ({ wk, saveWk: false, ifNo, nWhen, nPick: null });
  it("nudge set", () => {
    expect(celebrationLine({ first: "Harriet", wk: 8, sentMs: daysAgo(0), nowMs: NOW, reply: r("nudge", 8) }))
      .toBe("Harriet usually replies within 8 weeks, so expect something by 17 Jan 2027. We’ll remind you to nudge on 25 Jan 2027.");
  });
  it("will close if no reply", () => {
    expect(celebrationLine({ first: "Harriet", wk: 8, sentMs: daysAgo(0), nowMs: NOW, reply: r("close", 8) }))
      .toBe("Harriet usually replies within 8 weeks, so expect something by 17 Jan 2027. If there’s nothing by 18 Jan 2027 we’ll close it for you.");
  });
  it("no reminder", () => {
    expect(celebrationLine({ first: "Harriet", wk: 8, sentMs: daysAgo(0), nowMs: NOW, reply: r("none", 8) }))
      .toBe("Harriet usually replies within 8 weeks, so expect something by 17 Jan 2027. There’s no reminder set, so keep an eye on it.");
  });
  it("no date", () => {
    expect(celebrationLine({ first: "Callum", wk: null, sentMs: daysAgo(0), nowMs: NOW, reply: r("nudge", null, "8w") }))
      .toBe("There’s no reply date for Callum, so we’ll remind you to nudge on 18 Jan 2027.");
    expect(celebrationLine({ first: "Callum", wk: null, sentMs: daysAgo(0), nowMs: NOW, reply: r("none", null) }))
      .toBe("No reply date and no reminder for Callum. It’s waiting on your Queries page.");
  });
  it("already past the date", () => {
    expect(celebrationLine({ first: "Harriet", wk: 8, sentMs: daysAgo(60), nowMs: NOW, reply: r("now", 8, "n2") }))
      .toBe("It’s past Harriet’s usual reply time, so a nudge is on your to-do list for today.");
    expect(celebrationLine({ first: "Harriet", wk: 8, sentMs: daysAgo(60), nowMs: NOW, reply: r("nudge", 8, "n2") })).toMatch(/^It’s past Harriet’s usual reply time\. We’ll remind you to nudge on /);
    expect(celebrationLine({ first: "Harriet", wk: 8, sentMs: daysAgo(60), nowMs: NOW, reply: r("none", 8) }))
      .toBe("It’s past Harriet’s usual reply time, and there’s no reminder set. It’s waiting on your Queries page.");
  });
});

/* ── Phase 7 — Escape is the leave check ── */
import { ESC_LEVEL } from "../escapeStack";

describe("v2 · Phase 7 — Escape runs the leave check, in order", () => {
  const src = readFileSync("src/components/queries/centre/QcLogStages.tsx", "utf8");
  const esc = src.slice(src.indexOf("useEscapeLayer(true, () => {"), src.indexOf("}, ESC_LEVEL.journey);"));
  it("the journey's layer sits above every host that mounts it, below the paperclip and a docked card's peek", () => {
    expect(ESC_LEVEL.journey).toBeGreaterThan(ESC_LEVEL.drawer);       // LogStagesPanel
    expect(ESC_LEVEL.journey).toBeGreaterThan(ESC_LEVEL.pageDrawer);   // QueryPanelHost, the Contact list's panel
    expect(ESC_LEVEL.journey).toBeLessThan(ESC_LEVEL.dockPeek);
    expect(ESC_LEVEL.journey).toBeLessThan(ESC_LEVEL.drawerPopup);     // the review card's paperclip (QcCard154 preview)
    expect(readFileSync("src/components/queries/centre/QcCard154.tsx", "utf8")).toMatch(/escLevel=\{preview \? ESC_LEVEL\.drawerPopup/);
  });
  it("order: the leave check (Esc keeps the journey) → an in-place picker → ask (or close with nothing entered)", () => {
    expect(esc.length).toBeGreaterThan(100);
    const at = (k: string) => { const i = esc.indexOf(k); expect(i, k).toBeGreaterThan(-1); return i; };
    expect(at("if (leaveAsk) { setLeaveAsk(false)")).toBeLessThan(at("s.earlier"));
    expect(at("s.earlier")).toBeLessThan(at("s.pOpen.letter"));
    expect(at("s.pOpen.letter")).toBeLessThan(at("leave();"));
    /* and leave() asks only with something entered, otherwise closes — the dimmed page's own check */
    expect(src).toMatch(/const leave = \(\) => \{ if \(phase === "flow" && !s\.notSent && touched\.current\) setLeaveAsk\(true\); else p\.onClose\(\); \};/);
  });
});
