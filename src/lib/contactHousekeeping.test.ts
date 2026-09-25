/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Housekeeping's gap model (v11 §9.3), locked the fixture-derived way: inputs are PRODUCED —
 * the live flag from `buildQcRows` over the cast's own queries, the reopen flag from a real
 * UserTask shape — and the tallies prove every branch was ENTERED, because a sweep over a cast
 * where every case is the same case passes while measuring nothing (the monoculture law).
 */
import { describe, expect, it } from "vitest";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES } from "../components/agents/contactFixture";
import { buildQcRows } from "./qcSummary";
import { agentRows } from "./contactList";
import {
  GAP_ORDER, STALE_DAYS, agentGaps, hkChecks, hkModel, isHkComplete, remindLabel, reopenTaskFields,
} from "./contactHousekeeping";
import type { Agent } from "../types";

const NOW = Date.parse("2026-09-01T12:00:00.000Z");
const A = CONTACT_FIXTURE_AGENTS;
const rows = buildQcRows(CONTACT_FIXTURE_QUERIES, A, [], NOW);
const liveOf = (id: string) => agentRows(rows, id, null).some((r) => r.court !== "closed");
const ctxOf = (a: Agent, hasReopenTask = false) => ({ hasLiveQuery: liveOf(a.id), hasReopenTask, nowMs: NOW });
const by = (id: string) => A.find((a) => a.id === id)!;

describe("the gap predicates — each through the app's own instrument", () => {
  it("⚠️ RULING (c): absent reply time is the writer's Unknown and NOT a gap; only the stub 0 is", () => {
    /* fx-bare has NO responseTimeWeeks at all — the everyday absence */
    expect(agentGaps(by("fx-bare"), ctxOf(by("fx-bare")))).not.toContain("reply");
    /* fx-stub0 carries the quick-add stub, the one flagged state — via agentDataQualityNeeds */
    expect(agentGaps(by("fx-stub0"), ctxOf(by("fx-stub0")))).toContain("reply");
  });

  it("⚠️ NULL NEVER COUNTS AS STALE — only a real stamp ≥180 days old, behind an OPEN door", () => {
    /* fx-long has a wishlist and no mswlCheckedAt: unknown age, never stale */
    expect(agentGaps(by("fx-long"), ctxOf(by("fx-long")))).not.toContain("recheck");
    /* fx-stale: stamped 10 Jan against a 1 Sep NOW — 234 days, open door */
    expect(agentGaps(by("fx-stale"), ctxOf(by("fx-stale")))).toContain("recheck");
    /* the same stamp behind a CLOSED door is not a recheck chore (§9.3 "and not closed") */
    const shutStale = { ...by("fx-stale"), submissionStatus: by("fx-reopen").submissionStatus };
    expect(agentGaps(shutStale, ctxOf(shutStale))).not.toContain("recheck");
    /* and a fresh stamp is clean */
    const fresh = { ...by("fx-stale"), mswlCheckedAt: new Date(NOW - (STALE_DAYS - 1) * 86_400_000).toISOString() };
    expect(agentGaps(fresh, ctxOf(fresh))).not.toContain("recheck");
  });

  it("⚠️ RULING (b): the reopen gap is a closed door with NO undone dated task for this agent", () => {
    expect(agentGaps(by("fx-reopen"), ctxOf(by("fx-reopen"), false))).toContain("reopen");
    expect(agentGaps(by("fx-reopen"), ctxOf(by("fx-reopen"), true)), "a live reminder task closes the gap").not.toContain("reopen");
    expect(agentGaps(by("fx-fresh"), ctxOf(by("fx-fresh"))), "an open door has no reopen chore").not.toContain("reopen");
  });

  it("the branch tally — every gap kind is ENTERED by the cast, and the fixture stays varied", () => {
    const tally = new Map<string, number>();
    for (const a of A) for (const g of agentGaps(a, ctxOf(a))) tally.set(g, (tally.get(g) ?? 0) + 1);
    for (const key of GAP_ORDER) {
      expect(tally.get(key) ?? 0, `the cast never enters the "${key}" branch — a monoculture`).toBeGreaterThan(0);
    }
  });
});

describe("the model — ordering, counts, and the six-check ring", () => {
  const model = hkModel(A, (a) => ctxOf(a), (a) => {
    const mine = agentRows(rows, a.id, null);
    if (mine.some((r) => r.court !== "closed")) return "live";
    return mine.length === 0 ? "never" : "closed";
  });

  it("sections come in the table's order and hold only their own members, live first", () => {
    const keys = model.sections.map((s) => s.key);
    expect([...keys].sort((x, y) => GAP_ORDER.indexOf(x) - GAP_ORDER.indexOf(y))).toEqual(keys);
    for (const s of model.sections) {
      expect(s.members.length, `an empty "${s.key}" section rendered`).toBeGreaterThan(0);
      const bands = s.members.map((m) => m.band);
      const order = { live: 0, never: 1, closed: 2 } as const;
      expect([...bands].sort((x, y) => order[x] - order[y])).toEqual(bands);
    }
  });

  it("the counts line: gaps sum the per-agent lists; agents count those with any; complete is the six-check pass", () => {
    const gaps = [...model.gapsById.values()].reduce((n, g) => n + g.length, 0);
    expect(model.counts.gaps).toBe(gaps);
    expect(model.counts.agents).toBe([...model.gapsById.values()].filter((g) => g.length > 0).length);
    expect(model.counts.total).toBe(A.length);
    expect(model.countsLine.gaps).toBe(`${gaps} GAPS`);
    expect(model.countsLine.rest).toContain(`OF ${A.length} COMPLETE`);
  });

  it("⚠️ the ring's reply check follows ruling (c): the stub blocks, absence does not", () => {
    const stub = hkChecks(by("fx-stub0"), ctxOf(by("fx-stub0")));
    expect(stub[1], "the stub 0 must hold the ring open").toBe(false);
    const bare = hkChecks(by("fx-bare"), ctxOf(by("fx-bare")));
    expect(bare[1], "the writer's Unknown is an answered check").toBe(true);
    /* and complete = all six — fx-fresh has location, window, genres, wishlist, materials, no stamp */
    expect(isHkComplete(by("fx-fresh"), ctxOf(by("fx-fresh")))).toBe(true);
    expect(isHkComplete(by("fx-stale"), ctxOf(by("fx-stale"))), "a stale wishlist is incomplete").toBe(false);
  });
});

describe("the reopen reminder is a dated UserTask, and the button carries its date", () => {
  it("the task fields come from the record, and the label prints the reopen date", () => {
    const t = reopenTaskFields(by("fx-reopen"));
    expect(t.agentId).toBe("fx-reopen");
    expect(t.dueDate).toBe("2026-11-01");
    expect(t.text).toContain("Tomas Keller");
    expect(remindLabel(by("fx-reopen"))).toBe("REMIND ME 1 NOV");
  });
  it("no reopensOn → a bare REMIND ME (the editor-at-the-door branch)", () => {
    expect(remindLabel(by("fx-shut"))).toBe("REMIND ME");
  });
});
