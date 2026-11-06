/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do list v51 — ONE SAVE PATH FOR THE DRAWER AND THE DESK. The sent and nudge saves moved into stepSaves for Query
 * Centre v149; the offer decision joins them here. The drawer's journeys commit through these functions, and the
 * To-do workspace's desk calls the same ones, so a change to what a decision records is made once.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { QueryStatus, type Agent, type Query } from "../../types";

const calls = vi.hoisted(() => ({ record: [] as { query: string; key: string }[], set: [] as string[], recompute: [] as string[] }));
vi.mock("../firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...p: string[]) => p.join("/"),
  setDoc: async (path: string) => { calls.set.push(path); },
  deleteField: () => "__delete__",
}));
vi.mock("../recordResponse", () => ({
  recordQueryResponse: async (ctx: { query: Query }, data: { eventKey: string }) => { calls.record.push({ query: ctx.query.id, key: data.eventKey }); },
}));
vi.mock("../recomputeQuery", () => ({ recomputeQuery: async (_u: string, id: string) => { calls.recompute.push(id); } }));

import { saveOfferDecision, saveOfferMoreTime } from "./stepSaves";

const root = join(__dirname, "..", "..", "..");
const read = (p: string) => readFileSync(join(root, p), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");

const q = (id: string, extra: Partial<Query> = {}) => ({ id, agentId: "a1", manuscriptId: "m1", status: QueryStatus.OFFER, ...extra } as Query);
const updates: { id: string; patch: Record<string, unknown> }[] = [];
const db = {
  currentUser: { id: "u1" }, manuscripts: [{ id: "m1", title: "Book" }], agents: [{ id: "a2", name: "Other" }],
  updateQuery: async (id: string, patch: Record<string, unknown>) => { updates.push({ id, patch }); },
} as never;

beforeEach(() => { calls.record = []; calls.set = []; calls.recompute = []; updates.length = 0; });

describe("the drawer's offer journey writes through stepSaves", () => {
  it("OfferJourney commits a decision through saveOfferDecision and never writes one itself", () => {
    const src = read("src/components/queryActions/journeys/OfferJourney.tsx");
    expect(src).toMatch(/import \{[^}]*saveOfferDecision[^}]*\} from "\.\.\/\.\.\/\.\.\/lib\/queryActions\/stepSaves"/);
    expect(src).toContain("await saveOfferDecision(db, q, agent,");
    expect(src, "the journey records no response of its own").not.toContain("recordQueryResponse(");
    expect(src, "the journey recomputes nothing of its own").not.toContain("recomputeQuery(");
    expect(src, "the signed rung is written by the save").not.toContain("QueryStatus.SIGNED");
  });
  it("the sent and nudge journeys still commit through stepSaves (v149), and there is no second save module", () => {
    expect(read("src/components/queryActions/journeys/SentJourney.tsx")).toContain("await saveSent(db, q,");
    expect(read("src/components/queryActions/journeys/NudgeJourney.tsx")).toContain("await saveNudgeSent(db, q, agent,");
    expect(existsSync(join(root, "src/lib/queryActions/deskSaves.ts")), "one save path: no deskSaves").toBe(false);
  });
});

describe("saveOfferDecision", () => {
  it("decline: one close recorded as offer declined, nothing else", async () => {
    const n = await saveOfferDecision(db, q("q1"), { id: "a1", name: "Tom" } as Agent, { dec: "decline", on: new Date(2026, 10, 6), withdraw: [], remindTell: false });
    expect(n).toBe(0);
    expect(calls.record).toEqual([{ query: "q1", key: "offer_declined" }]);
    expect(calls.set).toEqual([]);
  });
  it("accept: a signed rung in both stores, a recompute, each other query withdrawn, and the plan dates cleared", async () => {
    const other = q("q2", { status: QueryStatus.FULL_SENT, agentId: "a2", nudgeDate: "2026-12-01" });
    const n = await saveOfferDecision(db, q("q1", { closePlan: "2026-12-10" }), { id: "a1", name: "Tom" } as Agent, { dec: "accept", on: new Date(2026, 10, 6), withdraw: [other], remindTell: true });
    expect(n).toBe(1);
    expect(calls.set).toHaveLength(2);
    expect(calls.set[0]).toMatch(/^users\/u1\/queries\/q1\/activity\/act-/);
    expect(calls.set[1]).toMatch(/^users\/u1\/activities\/act-/);
    expect(calls.recompute).toEqual(["q1"]);
    expect(calls.record).toEqual([{ query: "q2", key: "withdrawn_on_offer" }]);
    expect(updates).toEqual([
      { id: "q2", patch: { withdrawTold: false, nudgeDate: "__delete__" } },
      { id: "q1", patch: { closePlan: "__delete__" } },
    ]);
  });
  it("more time moves the answer-by date and nothing else", async () => {
    await saveOfferMoreTime(db, q("q1"), new Date(2026, 10, 20));
    /* a drawer date is the day at local noon (dates.dayIso), as every other date this save path writes */
    expect(updates).toEqual([{ id: "q1", patch: { offerResponseDeadline: new Date(2026, 10, 20, 12).toISOString() } }]);
  });
});
