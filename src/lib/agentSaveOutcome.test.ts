/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for what happens to a card after it is saved. The motion is a browser check; the OUTCOME
 * is pure, and it is what decides both the choreography and the sentence — so if these disagree,
 * the interface tells the reader one thing and does another.
 */
import { describe, it, expect } from "vitest";
import { saveNotice, saveOutcome, sectionFor } from "./agentSaveOutcome";
import { emptyFilterSet } from "./agentList";
import { Agent, Query, QueryStatus, SubmissionMethod, SubmissionStatus } from "../types";

const mkAgent = (over: Partial<Agent>): Agent => ({
  id: "a1", userId: "u1", name: "Rosalind Achebe", agency: "Hartley & Co", email: "", website: "",
  genres: [], mswlNotes: "", submissionStatus: SubmissionStatus.OPEN,
  submissionMethod: SubmissionMethod.EMAIL, materialsWanted: [],
  dateAdded: "2026-01-01T00:00:00.000Z", lastCheckedDate: "2026-01-01T00:00:00.000Z", notes: "",
  ...over,
});

const mkQuery = (over: Partial<Query>): Query => ({
  id: "q1", userId: "u1", agentId: "a1", manuscriptId: "m1", status: QueryStatus.QUERIED,
  dateSent: "2026-03-01T00:00:00.000Z", ...over,
} as Query);

const ctx = (over: Partial<Parameters<typeof saveOutcome>[1]> = {}) => ({
  agents: [] as Agent[], queries: [] as Query[], filters: emptyFilterSet(), search: "",
  sort: "az" as const, grouping: "none" as const, ...over,
});

describe("saveOutcome · the card travels to a KNOWABLE place", () => {
  it("states a 1-based position under the active sort — a person counts cards, not array slots", () => {
    const saved = mkAgent({ id: "b", name: "Bell, Cara" });
    const agents = [mkAgent({ id: "a", name: "Achebe, Rosalind" }), saved, mkAgent({ id: "c", name: "Dunn, Sophie" })];
    const out = saveOutcome(saved, ctx({ agents, sort: "az" }));
    expect(out).toMatchObject({ kind: "travel", index: 2, total: 3, sortLabel: "Name A–Z" });
  });

  it("the position follows the ACTIVE sort, not insertion order", () => {
    const saved = mkAgent({ id: "b", name: "Bell", starRating: 5 });
    const agents = [mkAgent({ id: "a", name: "Achebe", starRating: 2 }), saved];
    // by name, Bell is second; by rating, Bell is first
    expect(saveOutcome(saved, ctx({ agents, sort: "az" }))).toMatchObject({ index: 2 });
    expect(saveOutcome(saved, ctx({ agents, sort: "rating" }))).toMatchObject({ index: 1, sortLabel: "Star rating" });
  });

  it("names the sort in the notice, so the position means something", () => {
    const saved = mkAgent({ id: "b", name: "Marcus Reed" });
    const out = saveOutcome(saved, ctx({ agents: [saved], sort: "az" }));
    expect(saveNotice("Marcus Reed", out)).toBe("Marcus Reed saved. Moved to position 1 under Name A–Z.");
  });
});

describe("saveOutcome · a card that fails the filters LEAVES, and says so", () => {
  it("a never-queried agent saved while filtered to Active queries is filtered-out, not travelling", () => {
    const saved = mkAgent({ id: "new", name: "Marcus Reed" }); // no queries at all
    const out = saveOutcome(
      saved,
      ctx({ agents: [saved], filters: { ...emptyFilterSet(), standing: ["active"] } }),
    );
    expect(
      out.kind,
      "a saved agent that cannot survive the active filters was told to travel — there is no slot for it to travel TO, so it would simply vanish, which is the one outcome this must never produce",
    ).toBe("filtered-out");
    expect(saveNotice("Marcus Reed", out)).toBe("Marcus Reed saved. Not shown under your current filters.");
  });

  it("the same agent travels normally once the filter would admit it", () => {
    const saved = mkAgent({ id: "new" });
    const queries = [mkQuery({ agentId: "new" })];
    const out = saveOutcome(
      saved,
      ctx({ agents: [saved], queries, filters: { ...emptyFilterSet(), standing: ["active"] } }),
    );
    expect(out.kind).toBe("travel");
  });

  it("a search that excludes the saved card counts as filtered-out too", () => {
    const saved = mkAgent({ id: "new", name: "Marcus Reed", agency: "Bloomsbury Quill" });
    expect(saveOutcome(saved, ctx({ agents: [saved], search: "penhallow" })).kind).toBe("filtered-out");
  });

  it("falls back to a usable sentence when the agent has no name", () => {
    const out = saveOutcome(mkAgent({ id: "x", name: "" }), ctx({ agents: [mkAgent({ id: "x", name: "" })] }));
    expect(saveNotice("", out)).toMatch(/^That agent saved\./);
  });
});

describe("saveOutcome · a card that changes SECTION does not fly across the heading", () => {
  it("sectionChanged is true when grouping is on and the card's section moved", () => {
    const saved = mkAgent({ id: "a" });
    const queries = [mkQuery({ agentId: "a" })]; // now has an active query
    const out = saveOutcome(
      saved,
      ctx({ agents: [saved], queries, grouping: "standing", sectionBefore: "never" }),
    );
    expect(out).toMatchObject({ kind: "travel", sectionChanged: true });
  });

  it("sectionChanged is false when the card stays in its section", () => {
    const saved = mkAgent({ id: "a" });
    const queries = [mkQuery({ agentId: "a" })];
    const out = saveOutcome(
      saved,
      ctx({ agents: [saved], queries, grouping: "standing", sectionBefore: "active" }),
    );
    expect(out).toMatchObject({ sectionChanged: false });
  });

  it("is ALWAYS false while grouping is off — there are no sections to change", () => {
    const saved = mkAgent({ id: "a" });
    const out = saveOutcome(saved, ctx({ agents: [saved], grouping: "none", sectionBefore: "anything" }));
    expect(
      out,
      "a card was told it changed section while the list is flat — it would fall and rise instead of travelling, for a boundary that isn't on screen",
    ).toMatchObject({ sectionChanged: false });
  });
});

describe("sectionFor", () => {
  it("returns null when grouping is off, and the section key when it is on", () => {
    const a = mkAgent({ id: "a" });
    expect(sectionFor(a, ctx({ grouping: "none" }))).toBeNull();
    expect(sectionFor(a, ctx({ grouping: "standing" }))).toBe("never");
    expect(sectionFor(a, ctx({ grouping: "door" }))).toBe("open");
  });
});
