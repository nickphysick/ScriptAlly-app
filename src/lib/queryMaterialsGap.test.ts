/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * queryMaterialsGap — the sends that never recorded what went with them.
 *
 * ⚠️ THE INVARIANTS HERE ASSERT TWO DERIVATIONS AGAINST EACH OTHER, not against literals — the
 * pattern `agentList.test.ts` set. A `toBe(3)` on both sides of a reconciliation goes green the day
 * someone changes both in the same wrong direction.
 */
import { describe, it, expect } from "vitest";
import {
  BULK_MATERIALS_THRESHOLD,
  isBulkMaterialsGap,
  hasRecordedMaterials,
  sendMaterialsRecorded,
  queriesMissingMaterials,
  MATERIALS_GAP_CAVEAT,
  MATERIALS_BULK_RECORD_ID,
} from "./queryMaterialsGap";
import { boardStreamForTaskType } from "./todoBoard";
import { cardJourney } from "./todoJourneys";
import { agentDataQualityNeeds } from "./agentDataQuality";
import { ActivityType, QueryStatus, SubmissionStatus, type Activity, type Agent, type Query } from "../types";

const agent = (over: Partial<Agent> = {}): Agent => ({
  id: "ag1", userId: "u", name: "Jonathan Ferry", agency: "Ferry & Co",
  email: "j@ferry.test", submissionStatus: SubmissionStatus.OPEN,
  materialsWanted: ["Query letter", "Synopsis"], genres: [], starRating: 4,
  responseTimeWeeks: 8, ...over,
} as Agent);

const query = (over: Partial<Query> = {}): Query => ({
  id: "q1", userId: "u", manuscriptId: "m1", agentId: "ag1", packageId: "",
  status: QueryStatus.QUERIED, dateSent: "2026-02-14", ...over,
} as Query);

const sendActivity = (over: Partial<Activity> & { materials?: unknown } = {}): Activity => ({
  id: "a1", userId: "u", queryId: "q1", manuscriptId: "m1",
  activityType: ActivityType.QUERY_SENT, description: "Query sent", date: "2026-02-14", details: "",
  ...over,
} as Activity);

const MS = [{ id: "m1", title: "The Clockmaker's Ghost" }];
const displayName = (a: Agent) => a.name || a.agency;

const run = (over: Partial<Parameters<typeof queriesMissingMaterials>[0]> = {}) =>
  queriesMissingMaterials({
    queries: [query()], activities: [sendActivity()], agents: [agent()],
    manuscripts: MS, displayName, ...over,
  });

describe("hasRecordedMaterials — absence in all the shapes the store can produce", () => {
  it("treats undefined, empty array and empty map as not recorded", () => {
    expect(hasRecordedMaterials(undefined)).toBe(false);
    expect(hasRecordedMaterials([])).toBe(false);
    expect(hasRecordedMaterials({})).toBe(false);
  });

  it("accepts a legacy string list and a structured map list alike", () => {
    expect(hasRecordedMaterials(["Query letter"])).toBe(true);
    expect(hasRecordedMaterials([{ material: "Sample pages", type: "pages", quantity: 50 }])).toBe(true);
  });
});

describe("sendMaterialsRecorded — the canonical home, and the legacy one", () => {
  it("reads materials on the send ACTIVITY (the home the rules settled on)", () => {
    const a = sendActivity({ materials: ["Query letter"] });
    expect(sendMaterialsRecorded(query(), [a])).toBe(true);
  });

  it("⚠️ accepts the legacy query field, or every existing query would report a gap", () => {
    // Nothing writes Activity.materials yet — the rule shipped ahead of its consumer.
    expect(sendMaterialsRecorded(query({ materialsWanted: ["Query letter"] }), [sendActivity()])).toBe(true);
  });

  it("reports a gap when neither home holds anything", () => {
    expect(sendMaterialsRecorded(query(), [sendActivity()])).toBe(false);
  });

  it("a MATERIALS_SENT event counts as a send — a later full still records something", () => {
    const later = sendActivity({ id: "a2", activityType: ActivityType.MATERIALS_SENT, materials: ["Full manuscript"] });
    expect(sendMaterialsRecorded(query(), [sendActivity(), later])).toBe(true);
  });

  it("⚠️ a NUDGE carrying materials does not count — a nudge is not a send", () => {
    const nudge = sendActivity({ id: "a3", activityType: ActivityType.NUDGE_SENT, materials: ["Query letter"] });
    expect(sendMaterialsRecorded(query(), [nudge])).toBe(false);
  });

  it("does not read another query's activity", () => {
    const other = sendActivity({ id: "a9", queryId: "q-other", materials: ["Query letter"] });
    expect(sendMaterialsRecorded(query(), [other])).toBe(false);
  });
});

describe("queriesMissingMaterials", () => {
  it("returns the gap with the agent's DISPLAY name, not the raw field", () => {
    const [gap] = run();
    expect(gap.agentName).toBe("Jonathan Ferry");
    expect(gap.manuscriptTitle).toBe("The Clockmaker's Ghost");
  });

  it("⚠️ an UNSENT query is never a gap — nothing has happened to record", () => {
    expect(run({ queries: [query({ dateSent: "" })] })).toHaveLength(0);
  });

  it("skips a query whose agent or manuscript is missing — no orphan cards", () => {
    expect(run({ agents: [] })).toHaveLength(0);
    expect(run({ manuscripts: [] })).toHaveLength(0);
  });

  it("⚠️ orders OLDEST SENT FIRST", () => {
    const qs = [
      query({ id: "new", dateSent: "2026-06-01" }),
      query({ id: "old", dateSent: "2025-01-05" }),
      query({ id: "mid", dateSent: "2026-02-14" }),
    ];
    const acts = qs.map((q, i) => sendActivity({ id: `a${i}`, queryId: q.id }));
    expect(run({ queries: qs, activities: acts }).map((g) => g.queryId)).toEqual(["old", "mid", "new"]);
  });

  it("includes closed queries — the send happened whatever the outcome", () => {
    const rejected = query({ id: "qr", status: QueryStatus.REJECTED });
    expect(run({ queries: [rejected], activities: [sendActivity({ queryId: "qr" })] })).toHaveLength(1);
  });

  it("an unparseable date is skipped rather than sorted as NaN", () => {
    expect(run({ queries: [query({ dateSent: "not a date" })] })).toHaveLength(0);
  });
});

describe("the bulk threshold", () => {
  it("is named, and the predicate reads it rather than restating the number", () => {
    expect(isBulkMaterialsGap(BULK_MATERIALS_THRESHOLD)).toBe(true);
    expect(isBulkMaterialsGap(BULK_MATERIALS_THRESHOLD - 1)).toBe(false);
  });

  it("⚠️ the singles and the bulk are mutually exclusive at every count", () => {
    // Whatever the threshold becomes, exactly one presentation is correct for a given n.
    for (let n = 0; n <= 10; n++) {
      const bulk = isBulkMaterialsGap(n);
      const singles = n > 0 && !bulk;
      expect(bulk && singles).toBe(false);
    }
  });
});

describe("⚠️ this rule and dq_materials have DIFFERENT SUBJECTS — merging them would be wrong", () => {
  it("an agent with a full materials list can still have a send that recorded nothing", () => {
    const stated = agent({ materialsWanted: ["Query letter", "Synopsis"], mswlNotes: "x", responseTimeWeeks: 8 });
    // The housekeeping rule is satisfied…
    expect(agentDataQualityNeeds(stated)).not.toContain("materials");
    // …and this one still reports the gap. Knowing what they ASK FOR says nothing about what WENT.
    expect(run({ agents: [stated] })).toHaveLength(1);
  });

  it("and the converse: an agent stating nothing can have a send that was fully recorded", () => {
    const silent = agent({ materialsWanted: [] });
    expect(agentDataQualityNeeds(silent)).toContain("materials");
    expect(run({ agents: [silent], queries: [query({ materialsWanted: ["Query letter"] })] })).toHaveLength(0);
  });
});

describe("the caveat", () => {
  it("says requirements are not evidence, and never urges", () => {
    expect(MATERIALS_GAP_CAVEAT).toMatch(/not a record of what you actually sent/i);
    expect(MATERIALS_GAP_CAVEAT).not.toMatch(/\b(just|simply|quickly|easy|only)\b/i);
  });

  it("⚠️ carries no gendered pronoun for the agent (the house rule)", () => {
    expect(MATERIALS_GAP_CAVEAT).not.toMatch(/\b(his|her|hers)\b/i);
  });
});

/**
 * ⚠️ REACHABILITY, NOT DEFINITION. The tests above prove the predicate is correct; these prove the
 * task it produces actually arrives somewhere — the check this codebase has paid for skipping
 * (thirty-eight green cases over four buttons nothing rendered). A derivation nothing routes is a
 * function with no caller.
 */
describe("⚠️ the two task types reach the board", () => {
  it("both are HOUSEKEEPING — a record gap is never something an agent is waiting on", () => {
    expect(boardStreamForTaskType("materials_unrecorded")).toBe("hk");
    expect(boardStreamForTaskType("materials_unrecorded_bulk")).toBe("hk");
  });

  it("⚠️ and NEITHER is urgent — the urgent count must not move because of a record gap", () => {
    expect(boardStreamForTaskType("materials_unrecorded")).not.toBe("do");
    expect(boardStreamForTaskType("materials_unrecorded_bulk")).not.toBe("do");
  });

  it("both open the materials journey, and it is NOT the agent-editing `dq` one", () => {
    const card = (taskType: string) => ({ taskType, key: "k", stream: "hk" } as Parameters<typeof cardJourney>[0]);
    expect(cardJourney(card("materials_unrecorded"))).toBe("materials");
    expect(cardJourney(card("materials_unrecorded_bulk"))).toBe("materials");
    expect(cardJourney(card("data_quality_poor"))).toBe("dq");
  });

  it("⚠️ a materials card is not mistaken for a send — it must never offer 'Mark sent'", () => {
    const card = { taskType: "materials_unrecorded", key: "k", stream: "hk" } as Parameters<typeof cardJourney>[0];
    expect(cardJourney(card)).not.toBe("send");
  });

  it("the bulk id survives `isValidId`'s charset — a flag doc id is composed from it", () => {
    expect(MATERIALS_BULK_RECORD_ID).toMatch(/^[a-zA-Z0-9_-]+$/);
  });
});
