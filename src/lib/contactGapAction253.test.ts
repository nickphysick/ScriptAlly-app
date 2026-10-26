/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v25.3 — the List row's one gap action reads Housekeeping's own model: its count is the agent's visible
 * items, its first gap the first of them in Housekeeping's order. Built through `hkModel`, never a hand-written list.
 */
import { describe, expect, it } from "vitest";
import { CONTACT_FIXTURE_AGENTS } from "../components/agents/contactFixture";
import { contactPrefsOf } from "./contactPrefs";
import { GAP_FOCUS, agentGapAction, agentGapLine, fillGapsWords, hkModel, type HkAgentCtx } from "./contactHousekeeping";
import type { Agent } from "../types";

const ctx = (): HkAgentCtx => ({ live: false, fits: false, queried: false, passedOn: false, hasReopenTask: false });

describe("agentGapAction", () => {
  const model = hkModel(CONTACT_FIXTURE_AGENTS, ctx, contactPrefsOf(null, new Date("2026-10-26T12:00:00Z")));
  it("its count is the panel's gap line's count, agent by agent", () => {
    let seen = 0;
    for (const a of CONTACT_FIXTURE_AGENTS) {
      const act = agentGapAction(model, a.id);
      const line = agentGapLine(model, a.id);
      expect(act?.n ?? 0).toBe(line?.n ?? 0);
      if (act) { seen += 1; expect(line!.keys[0]).toBe(`${a.id}:${act.first}`); }
    }
    expect(seen, "the fixture has agents with gaps").toBeGreaterThan(2);
  });
  it("an agent with no gaps has no action", () => {
    const full = { ...CONTACT_FIXTURE_AGENTS[0], id: "full", responseTimeWeeks: 6, genres: ["Thriller"], mswlNotes: "Dark thrillers.",
      materialsWanted: ["Query letter"], submissionStatus: "Open" } as Agent;
    expect(agentGapAction(hkModel([full], ctx, contactPrefsOf(null, new Date("2026-10-26T12:00:00Z"))), "full")).toBeNull();
  });
  it("the first gap follows Housekeeping's points: reply time before genres before the wishlist", () => {
    const bare = { ...CONTACT_FIXTURE_AGENTS[0], id: "bare", genres: [], mswlNotes: "", materialsWanted: ["Query letter"], submissionStatus: "Open" } as Agent;
    delete (bare as { responseTimeWeeks?: number }).responseTimeWeeks;
    const act = agentGapAction(hkModel([bare], ctx, contactPrefsOf(null, new Date("2026-10-26T12:00:00Z"))), "bare");
    expect(act).toEqual({ n: 3, first: "reply" });
    expect(GAP_FOCUS[act!.first]).toEqual({ tab: "work", focus: "reply" });
  });
  it("says one gap and many gaps", () => {
    expect(fillGapsWords(1)).toBe("Fill in 1 gap");
    expect(fillGapsWords(2)).toBe("Fill in 2 gaps");
  });
});
