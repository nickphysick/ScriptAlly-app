/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Log a query v2.1 — the model's new parts (mock v24): "What went" under the review card.
 */
import { describe, expect, it } from "vitest";
import { whatWent, planOf, previewOf, PREVIEW_ID, sod, type LogAnswers, type PlanContext } from "./logStages";
import { SubmissionMethod, SubmissionStatus, type Agent } from "../../types";

const NOW = new Date(2026, 10, 23, 15).getTime();
const harriet = { id: "hv", name: "Harriet Vance", agency: "Vance & Wren", email: "", submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  materialsWanted: ["Query Letter", "Synopsis", "First 3 chapters"], responseTimeWeeks: 8, noResponseMeansNo: false } as unknown as Agent;
const ctx: PlanContext = { manuscriptId: "m1", agents: [harriet], packages: [], letters: [{ id: "lb", name: "Letter B" }], synopses: [{ id: "s1", name: "One-page synopsis" }], bookVersions: [] };
const base: LogAnswers = { agentId: "hv", sent: sod(NOW), via: SubmissionMethod.EMAIL, packageId: null, letterId: "lb", synopsisId: "s1",
  sample: { unit: "chapters", amt: 3, bookVersionId: null }, note: "" };
const went = (a: LogAnswers) => previewOf(planOf(a, ctx, PREVIEW_ID, false, NOW)!, NOW, 8).went;

describe("v2.1 · Phase 1 — What went: one item per material, its icon from the item", () => {
  it("three materials: the named versions, then the sample by its size, each with its own icon kind", () => {
    expect(went(base)).toEqual([
      { name: "Letter B", kind: "letter" },
      { name: "One-page synopsis", kind: "synopsis" },
      { name: "First 3 chapters", kind: "chapters" },
    ]);
  });
  it("one material", () => {
    expect(went({ ...base, synopsisId: null, sample: null })).toEqual([{ name: "Letter B", kind: "letter" }]);
  });
  it("generic pieces (nothing named saved) keep the material's own words", () => {
    const w = went({ ...base, letterId: "__letter", synopsisId: "__synopsis", sample: { unit: "pages", amt: 10, bookVersionId: null } });
    expect(w.map((x) => x.kind)).toEqual(["letter", "synopsis", "pages"]);
    expect(w[0].name).not.toBe("Letter B");
    expect(w[2].name).toMatch(/10 pages/);
  });
  it("the kind is never read from the name: a letter version called 'Synopsis draft' is still a letter", () => {
    const c2: PlanContext = { ...ctx, letters: [{ id: "odd", name: "Synopsis draft" }] };
    const plan = planOf({ ...base, letterId: "odd", synopsisId: null, sample: null }, c2, PREVIEW_ID, false, NOW)!;
    expect(whatWent(plan)).toEqual([{ name: "Synopsis draft", kind: "letter" }]);
  });
});

/* ── Phase 3 — step one: agents already queried with this book (D4) ── */
import { stageAgents, whoGroups, standingOf, BUSY_SHOWN } from "./logStages";
import { QueryStatus, type Query } from "../../types";

describe("v2.1 · Phase 3 — Not queried yet lists only agents with no query for this book", () => {
  const ag = (id: string, name: string) => ({ id, name, agency: `${name} Agency`, email: "", submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
    materialsWanted: [], responseTimeWeeks: 8 } as unknown as Agent);
  const AG = [ag("none", "Nora None"), ag("act", "Abel Active"), ag("pass", "Pia Pass"), ag("nr", "Ned Noreply"), ag("now", "Lena Logged")];
  const qy = (id: string, agentId: string, status: QueryStatus, dateSent: string, extra: Partial<Query> = {}) => ({ id, agentId, manuscriptId: "m1", status, dateSent, ...extra } as Query);
  const BOOK = [
    qy("q1", "act", QueryStatus.QUERIED, "2026-10-03"),
    qy("q2", "pass", QueryStatus.REJECTED, "2026-08-01", { lastStatusChange: "2026-09-12T10:00:00Z" } as Partial<Query>),
    qy("q3", "nr", QueryStatus.NO_RESPONSE, "2026-07-01", { lastStatusChange: "2026-11-02T10:00:00Z" } as Partial<Query>),
    /* logged in this sitting: the save's record, back through the listener */
    qy("q4", "now", QueryStatus.QUERIED, "2026-11-23"),
  ];
  const list = stageAgents(AG, BOOK, NOW);
  const g = whoGroups(list, "");
  it("no query → Not queried yet; active, passed, no reply and logged just now → already queried", () => {
    expect(g.ready.map((a) => a.id)).toEqual(["none"]);
    expect(g.busy.map((a) => a.id).sort()).toEqual(["act", "now", "nr", "pass"]);
  });
  it("a closed query (a pass, no reply) is queried but not 'querying': the agent card's door is left as it was (D5)", () => {
    const by = Object.fromEntries(list.map((a) => [a.id, a]));
    expect([by.pass.queried, by.pass.querying]).toEqual([true, false]);
    expect([by.nr.queried, by.nr.querying]).toEqual([true, false]);
    expect([by.act.queried, by.act.querying]).toEqual([true, true]);
  });
  it("most recent first, each in the Queries page's own words", () => {
    expect(g.busy.map((a) => [a.id, a.standing])).toEqual([
      ["now", "Queried · sent 23 Nov"],
      ["nr", "No reply · closed 2 Nov"],
      ["act", "Queried · sent 3 Oct"],
      ["pass", "Passed · 12 Sep"],
    ]);
    expect(standingOf({ status: QueryStatus.PARTIAL_REQUESTED }, Date.parse("2026-10-01"))).toBe("Partial requested");
  });
  it("a search that matches an agent already queried finds them under busyHit, never in ready", () => {
    const s = whoGroups(list, "pia");
    expect(s.ready).toEqual([]);
    expect(s.busyHit.map((a) => a.id)).toEqual(["pass"]);
  });
  it("the open list shows ten", () => expect(BUSY_SHOWN).toBe(10));
});

/* ── Phase 4 — the held task brings the writer back ── */
import { heldSendDoor, heldTaskText, heldToComplete } from "./journeyCreated";
import { listPlan, readyItems } from "../dashList";

describe("v2.1 · Phase 4 — the held task's door", () => {
  const held = { id: "t1", text: heldTaskText("Harriet Vance"), done: false, agentId: "hv", manuscriptId: "m1" };
  it("an open held task opens Log a query for its agent and book", () => {
    expect(heldSendDoor(held)).toEqual({ mode: "log", agentId: "hv", manuscriptId: "m1" });
  });
  it("no door when done, linked to a query, missing the agent or book, or renamed", () => {
    expect(heldSendDoor({ ...held, done: true })).toBeNull();
    expect(heldSendDoor({ ...held, queryId: "q1" })).toBeNull();
    expect(heldSendDoor({ ...held, agentId: undefined })).toBeNull();
    expect(heldSendDoor({ ...held, manuscriptId: undefined })).toBeNull();
    expect(heldSendDoor({ ...held, text: "Chase Harriet" })).toBeNull();
    expect(heldSendDoor({ text: "Finish Harriet Vance’s card", agentId: "hv", done: false })).toBeNull();
  });
  it("logging completes only that agent's held task for that book", () => {
    const tasks = [held, { ...held, id: "t2", manuscriptId: "m2" }, { ...held, id: "t3", agentId: "x" }, { ...held, id: "t4", done: true }];
    expect(heldToComplete(tasks, "hv", "m1").map((t) => t.id)).toEqual(["t1"]);
  });
  it("the Dashboard: the held task leads Ready to query with I've sent it, and stays on the list behind other work", () => {
    const ms = { id: "m1", title: "Murphy's Day Out", genre: "Literary" } as never;
    const ag = { id: "hv", name: "Harriet Vance", agency: "Vance & Wren", submissionStatus: SubmissionStatus.OPEN, genres: ["Literary"] } as unknown as Agent;
    const items = readyItems({ agents: [ag], queries: [], manuscript: ms, now: new Date(NOW), userTasks: [held as never] });
    expect(items[0]).toMatchObject({ key: "held:t1", group: "ready", actLabel: "I’ve sent it", pre: "Send your query to ", who: "Harriet Vance",
      action: { kind: "drawer", request: { mode: "log", agentId: "hv", manuscriptId: "m1" } } });
    expect(items.filter((x) => x.who === "Harriet Vance")).toHaveLength(1);
    const work = { key: "w", group: "nudge" } as never;
    expect(listPlan({ nudge: [work], ready: items }).groups.map((g) => g.key)).toEqual(["nudge", "ready"]);
    const plain = readyItems({ agents: [ag], queries: [], manuscript: ms, now: new Date(NOW), userTasks: [] });
    expect(listPlan({ nudge: [work], ready: plain }).groups.map((g) => g.key)).toEqual(["nudge"]);
  });
});
