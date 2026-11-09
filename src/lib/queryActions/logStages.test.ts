/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v1 — the staged journey's model: the agent groups, the answers → the unchanged log plan, the preview
 * built from the save's own record, and the celebration's words.
 */
import { describe, expect, it } from "vitest";
import { QueryStatus, SubmissionMethod, SubmissionStatus, type Agent, type Query } from "../../types";
import { logPayload } from "./logSave";
import {
  askWords, calMonth, celebrationLine, checkLine, materialsOf, MILESTONE, piecesFromAsk, piecesMatchAsk, planOf, previewOf,
  stageAgents, titleName, whoGroups, type PlanContext, type StagePackage,
} from "./logStages";
import type { PackageCard } from "./packages";

const NOW = new Date(2026, 10, 9, 12).getTime();
const ag = (id: string, name: string, x: Partial<Agent> = {}): Agent => ({
  id, name, agency: "Hartley & Co", email: "", submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: ["Query Letter", "Synopsis", "First 10 pages"], responseTimeWeeks: 8, noResponseMeansNo: false, ...x,
} as unknown as Agent);
const AGENTS = [
  ag("mr", "Marcus Reed", { email: "marcus@hartleyandco.com" }),
  ag("ps", "Priya Shah", { submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2027-01-05" }),
  ag("ok", "Olu Kane"),
  ag("nw", "No Window", { responseTimeWeeks: undefined, materialsWanted: [] }),
];
const LIVE = [{ id: "q1", agentId: "ok", manuscriptId: "m", status: QueryStatus.QUERIED, dateSent: "2026-10-02" } as Query];
const card: PackageCard = { id: "pa", name: "First round", ql: true, syn: true, qlVersion: "Letter A", synVersion: "One-page synopsis", qlId: "la", synId: "s1", bookVersion: "Version 2", other: null, edition: 1, summary: "" };
const PKGS: StagePackage[] = [{ id: "pa", name: "First round", active: true, card, pieces: [] }];
const CTX: PlanContext = {
  manuscriptId: "m", agents: AGENTS, packages: PKGS,
  letters: [{ id: "la", name: "Letter A" }, { id: "lb", name: "Letter B" }],
  synopses: [{ id: "s1", name: "One-page synopsis" }],
  bookVersions: [{ id: "v2", name: "Version 2", current: true }, { id: "v1", name: "Version 1", current: false }],
};

describe("the Agent stage", () => {
  const list = stageAgents(AGENTS, LIVE, NOW);
  it("groups ready, closed and already querying, and the closed carry their reopening date", () => {
    const g = whoGroups(list, "");
    expect(g.ready.map((a) => a.id)).toEqual(["mr", "nw"]);
    expect(g.closed.map((a) => a.id)).toEqual(["ps"]);
    expect(g.closed[0].reopens).toBe("5 Jan 2027");
    expect(g.busy.map((a) => a.id)).toEqual(["ok"]);
  });
  it("a search that matches an agent already querying finds them greyed, not choosable", () => {
    const g = whoGroups(list, "olu");
    expect(g.ready).toEqual([]);
    expect(g.busyHit.map((a) => a.id)).toEqual(["ok"]);
  });
  it("titles a typed name for the add button", () => expect(titleName(" jane  doe ")).toBe("Jane Doe"));
});

describe("the answers make the log save's own plan", () => {
  const base = { agentId: "mr", sent: NOW, via: SubmissionMethod.EMAIL, note: "" };
  it("a package: its own versions, the sample portion the writer chose", () => {
    const m = materialsOf({ ...base, packageId: "pa", letterId: null, synopsisId: null, sample: { unit: "pages", amt: 10, bookVersionId: null } }, CTX);
    expect(m.pkCard?.id).toBe("pa");
    expect(m.pieceV).toMatchObject({ qlId: "la", synId: "s1", bookVersion: "Version 2" });
    expect(m.mat).toMatchObject({ ql: true, syn: true, s: { unit: "pages", amt: 10 } });
  });
  it("pieces chosen one by one: the chosen letter, synopsis and book version — not the current ones", () => {
    const m = materialsOf({ ...base, packageId: null, letterId: "lb", synopsisId: null, sample: { unit: "chapters", amt: 3, bookVersionId: "v1" } }, CTX);
    expect(m.pkCard).toBeNull();
    expect(m.pieceV).toMatchObject({ qlId: "lb", qlVersion: "Letter B", synId: null, bookVersion: "Version 1" });
    expect(m.mat).toMatchObject({ ql: true, syn: false, s: { unit: "chapters", amt: 3 } });
  });
  it("adds nothing to the payload the old form saved", () => {
    const plan = planOf({ ...base, packageId: null, letterId: "la", synopsisId: "s1", sample: null }, CTX, "id1", false)!;
    expect(Object.keys(logPayload(plan).payload).sort()).toEqual(
      ["agentId", "dateSent", "id", "ifNoResponse", "manuscriptId", "materialsWanted", "nudgeDate", "packageId", "personalisationNotes", "sendMethod", "sentHow", "sentMaterials", "sentVersions"].sort());
  });
});

describe("the agent's asks", () => {
  const list = stageAgents(AGENTS, LIVE, NOW);
  const mr = list.find((a) => a.id === "mr")!;
  it("words the card's asks", () => expect(askWords(mr.ask)).toBe("a query letter, a synopsis and the first 10 pages"));
  it("says nothing when the card says nothing", () => expect(askWords(list.find((a) => a.id === "nw")!.ask)).toBeNull());
  it("ticks the pieces from the asks, and knows when they match", () => {
    const p = piecesFromAsk(mr.ask, { letterId: null, synopsisId: null, sample: null }, { letter: "la", synopsis: "s1", book: "v2" });
    expect(p).toEqual({ letterId: "la", synopsisId: "s1", sample: { unit: "pages", amt: 10, bookVersionId: "v2" } });
    expect(piecesMatchAsk(mr.ask, p)).toBe(true);
    expect(piecesMatchAsk(mr.ask, { ...p, synopsisId: null })).toBe(false);
  });
});

describe("the check and the celebration", () => {
  it("the preview is the save's own record, through the list's helpers", () => {
    const plan = planOf({ agentId: "mr", sent: NOW, via: SubmissionMethod.EMAIL, packageId: "pa", letterId: null, synopsisId: null, sample: null, note: "" }, CTX, "pv", false)!;
    const pv = previewOf(plan, NOW, 4);
    expect(pv.row.status).toBe(QueryStatus.QUERIED);
    expect(pv.row.agentName).toBe("Marcus Reed");
    expect(pv.packageName).toBe("First round");
    expect(pv.state).toBe("agent");
  });
  it("an old send lands in Gone quiet by the app's own rule, and says so", () => {
    const sent = new Date(2026, 4, 1).getTime();
    const plan = planOf({ agentId: "mr", sent, via: SubmissionMethod.EMAIL, packageId: "pa", letterId: null, synopsisId: null, sample: null, note: "" }, CTX, "pv", false)!;
    const pv = previewOf(plan, NOW, 4);
    expect(pv.state).toBe("quiet");
    expect(celebrationLine(pv, "Marcus", 8, NOW)).toMatch(/goes straight into Gone quiet/);
  });
  it("with a window it gives the date, and with none it asks for one", () => {
    expect(celebrationLine({ state: "agent", expectMs: new Date(2027, 0, 4).getTime(), noWindow: false }, "Marcus", 8, NOW))
      .toBe("Marcus usually replies within 8 weeks, so expect something by 4 Jan 2027. We'll remind you if it goes quiet.");
    expect(celebrationLine({ state: "agent", expectMs: null, noWindow: true }, "Jo", null, NOW)).toBe("Add a reply window to Jo's card and we'll remind you when it's time to nudge.");
  });
  it("the milestones, worded exactly", () => {
    expect(Object.keys(MILESTONE).map(Number)).toEqual([1, 10, 25, 50, 100]);
    expect(MILESTONE[25]).toBe("Twenty-five queries. That takes some nerve.");
    expect(checkLine(27, "Murphy's Day Out")).toBe("Your 27th query for Murphy's Day Out.");
  });
});

describe("the inline calendar", () => {
  it("is Monday-first, disables the future, and stops at this month", () => {
    const c = calMonth(2026, 10, NOW);
    expect(c.lead).toBe(6); // 1 Nov 2026 is a Sunday
    expect(c.days.find((d) => d.day === 9)!.future).toBe(false);
    expect(c.days.find((d) => d.day === 10)!.future).toBe(true);
    expect(c.canNext).toBe(false);
    expect(calMonth(2026, 9, NOW).canNext).toBe(true);
  });
});
