/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * §1 (provenance pack) — whose expected date is it, and the one-time move that sorts them out.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { agentWindowMs, planExpectedDateMigration, writerExpectedIso, writerExpectedMs, WRITER_EXPECTED_FIELD, MIGRATION_TOLERANCE_MS } from "./expectedDate";
import { queryAmbientStatus } from "./queryAmbient";
import { QueryStatus } from "../types";

const DAY = 86400000;
const NOW = Date.UTC(2026, 7, 18);
const iso = (ms: number) => new Date(ms).toISOString();

describe("the two shapes", () => {
  /* ⚠️ THE AGENCY'S WINDOW IS DERIVED, so an agency that states nothing has none — there is no
     stored copy that could survive them clearing it. That is the whole of the fix. */
  it("the agency's window comes from the weeks they state now", () => {
    const sent = NOW - 30 * DAY;
    expect(agentWindowMs(sent, 8)).toBe(sent + 56 * DAY);
    expect(agentWindowMs(sent, undefined), "a window was derived for an agency stating none").toBeNull();
    expect(agentWindowMs(sent, 0), "zero weeks is not a window").toBeNull();
    expect(agentWindowMs(null, 8), "a window was derived with nothing to anchor it to").toBeNull();
  });

  /* ⚠️ THE CAST LIVES IN ONE PLACE. The field is not in `src/types.ts` — another stream's file —
     and `closureOfferDismissed` is the standing precedent for exactly this. */
  it("the writer's date is read through one accessor", () => {
    const q = { id: "q1", [WRITER_EXPECTED_FIELD]: iso(NOW) } as never;
    expect(writerExpectedIso(q)).toBe(iso(NOW));
    expect(writerExpectedMs(q)).toBe(NOW);
    expect(writerExpectedIso({ id: "q2" } as never)).toBeUndefined();
    expect(writerExpectedMs({ id: "q2" } as never)).toBeNull();
    /* an empty string is absence, not a date */
    expect(writerExpectedIso({ id: "q3", [WRITER_EXPECTED_FIELD]: "  " } as never)).toBeUndefined();
    expect(writerExpectedMs({ id: "q4", [WRITER_EXPECTED_FIELD]: "not a date" } as never)).toBeNull();
  });
});

/**
 * ⚠️ THE PRECEDENCE, ASSERTED THROUGH THE REAL DERIVATION rather than by reading the source: the
 * writer's own date, then the agency's current window, then nobody's.
 */
describe("precedence, and what an agency clearing its window does", () => {
  const q = (over: Record<string, unknown> = {}) =>
    ({ id: "q", userId: "u", manuscriptId: "m", agentId: "a", packageId: "", sendMethod: "Email",
       status: QueryStatus.QUERIED, dateSent: iso(NOW - 30 * DAY), ...over }) as never;

  it("the writer's date outranks the agency's window", () => {
    const mine = NOW + 10 * DAY;
    const a = queryAmbientStatus(q({ [WRITER_EXPECTED_FIELD]: iso(mine) }), "agent", undefined, NOW, 8);
    expect(a.windowSource).toBe("writer");
    expect(a.expMs).toBe(mine);
  });

  it("without one, the agency's current window", () => {
    const a = queryAmbientStatus(q(), "agent", undefined, NOW, 8);
    expect(a.windowSource).toBe("agent");
    expect(a.expMs).toBe(NOW - 30 * DAY + 56 * DAY);
  });

  /**
   * ⚠️ THE FIXTURE THIS SECTION EXISTS FOR: the agency clears its stated weeks. The window must
   * leave the query — and a writer's date on the same query must not.
   */
  it("an agency clearing its weeks removes their window; a writer's date survives it", () => {
    const cleared = queryAmbientStatus(q(), "agent", undefined, NOW, undefined);
    expect(cleared.windowSource, "a window survived the agency clearing it").toBeNull();
    expect(cleared.windowStated).toBe(false);

    const mine = NOW + 10 * DAY;
    const kept = queryAmbientStatus(q({ [WRITER_EXPECTED_FIELD]: iso(mine) }), "agent", undefined, NOW, undefined);
    expect(kept.windowSource, "the writer's own date went with the agency's").toBe("writer");
    expect(kept.expMs).toBe(mine);
  });

  /* ⚠️ AND A STORED `responseDeadline` NO LONGER SPEAKS FOR ANYONE. It was the field the create-time
     seed also wrote, so it could never be evidence of who set a date. */
  it("a stored responseDeadline attributes nothing", () => {
    const a = queryAmbientStatus(q({ responseDeadline: iso(NOW + 5 * DAY) }), "agent", undefined, NOW, undefined);
    expect(a.windowSource, "the old field is speaking for someone again").toBeNull();
  });
});

describe("the one-time migration", () => {
  const weeksFor = (id?: string) => (id === "stated" ? 8 : undefined);
  const sent = iso(NOW - 30 * DAY);
  const derived = iso(NOW - 30 * DAY + 56 * DAY);

  it("a stored date that is just the agency's window is dropped, because it re-derives", () => {
    const plan = planExpectedDateMigration([{ id: "q1", agentId: "stated", dateSent: sent, responseDeadline: derived }], weeksFor);
    expect(plan.drop).toEqual(["q1"]);
    expect(plan.adopt).toEqual([]);
  });

  /* ⚠️ A DAY OF TOLERANCE, because the seed anchored on `now` at creation while the derivation
     anchors on `dateSent` — the same fact, hours apart, and a strict equality would adopt the
     entire database into the writer's field. */
  it("hours of drift is still the same fact", () => {
    const near = iso(new Date(derived).getTime() - MIGRATION_TOLERANCE_MS + 1000);
    expect(planExpectedDateMigration([{ id: "q1", agentId: "stated", dateSent: sent, responseDeadline: near }], weeksFor).drop).toEqual(["q1"]);
  });

  it("a date the agency's window cannot explain becomes the writer's", () => {
    const mine = iso(NOW + 40 * DAY);
    const plan = planExpectedDateMigration([{ id: "q1", agentId: "stated", dateSent: sent, responseDeadline: mine }], weeksFor);
    expect(plan.adopt).toEqual([{ id: "q1", iso: mine }]);
    expect(plan.unresolvable, "a query with a stated window is not the unresolvable case").toEqual([]);
  });

  /**
   * ⚠️ THE BRANCH THAT IS KNOWINGLY WRONG, AND IT IS COUNTED. An agency stating nothing NOW with a
   * stored date is either the writer's or debris from a window they cleared; the information to
   * tell them apart was never recorded. Adopting is the conservative direction — it claims the
   * writer set a date they may not have, rather than putting words in an agency's mouth.
   */
  it("counts the unresolvable branch separately", () => {
    const plan = planExpectedDateMigration([{ id: "q1", agentId: "silent", dateSent: sent, responseDeadline: iso(NOW) }], weeksFor);
    expect(plan.adopt.map((a) => a.id)).toEqual(["q1"]);
    expect(plan.unresolvable).toEqual(["q1"]);
  });

  /* ⚠️ SAFE TO RUN TWICE — nothing guarantees a one-time pass runs once. */
  it("a query that already carries a writer's date is only ever dropped", () => {
    const plan = planExpectedDateMigration(
      [{ id: "q1", agentId: "silent", dateSent: sent, responseDeadline: iso(NOW), writerExpectedDate: iso(NOW + DAY) }], weeksFor);
    expect(plan.adopt).toEqual([]);
    expect(plan.drop).toEqual(["q1"]);
  });

  it("a query with nothing stored is left alone", () => {
    const plan = planExpectedDateMigration([{ id: "q1", agentId: "stated", dateSent: sent }], weeksFor);
    expect(plan).toEqual({ drop: [], adopt: [], unresolvable: [] });
  });
});

/**
 * ⚠️ THE FIELD MUST BE IN THE RULES OR EVERY WRITE IS SILENTLY DENIED — the `affectedKeys().hasOnly`
 * trap this repo has a standing note about. Asserted at source because the deploy is Nick's and the
 * failure mode is silence.
 */
describe("§1 · the rules carry the field", () => {
  const rules = readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8");
  it("validated and allowlisted", () => {
    expect(rules, "the field is not validated in isValidQuery").toContain("data.get('writerExpectedDate', null) == null");
    expect(rules, "the field is not in the query update allowlist").toMatch(/'closureOfferDismissed', 'writerExpectedDate'/);
  });
});

/* ⚠️ AND THE CREATE-TIME SEED IS GONE — the stored copy of a derivable fact that caused the debris. */
describe("§1 · addQuery no longer seeds the agency's window", () => {
  const db = readFileSync(new URL("./db.tsx", import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  it("nothing computes a deadline at create time", () => {
    expect(db, "the create-time seed is back").not.toContain("computeResponseDeadline(new Date().toISOString()");
  });
});

/**
 * §2 (provenance pack) — the agent editor's clear was never broken.
 *
 * ⚠️ THE CAUSE WAS A CLASS, NOT A WRITE PATH. `.agl-done` was worn by BOTH the Done button and the
 * Discard button beside it — a shared chassis named for one action and applied to its opposite,
 * thirty pixels apart. A probe clicking `.agl-done` first hit DISCARD, threw the draft away, and
 * the clear it was testing was reported as an agent-editor bug that does not exist. The write path
 * is correct end to end: the draft diff pushes `responseTimeWeeks` into `deletes`, `saveAgentEdits`
 * turns each delete into `deleteField()`, and the rules allow the key's absence.
 */
describe("§2 · Done and Discard no longer share a class", () => {
  const editor = readFileSync(new URL("../components/agents/AgentEditor.tsx", import.meta.url), "utf8");
  const css = readFileSync(new URL("../components/agents/agentList.css", import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("exactly one control carries the committing class", () => {
    /* ⚠️ BOUNDED, because `agl-done` is a prefix of nothing today and the looseness runs both ways —
       this is the repo's own class-name rule, and the fault it guards is the one that caused this. */
    const wearers = (editor.match(/className="[^"]*\bagl-done\b[^"]*"/g) || []);
    expect(wearers, `agl-done is worn by ${wearers.length} controls: ${wearers.join(", ")}`).toHaveLength(1);
    expect(wearers[0], "the discard button is wearing the committing class again").not.toContain("agl-disc");
  });

  it("the shape is shared through a chassis that names neither action", () => {
    expect(css, "the chassis rule is missing").toContain(".aglist .agl-hdrbtn {");
    expect(css, "the chassis is still named for one of the two actions").not.toMatch(/\.aglist \.agl-done \{/);
    expect(editor, "the discard button lost the shared shape").toContain('className="agl-hdrbtn agl-disc"');
    expect(editor, "the done button lost the shared shape").toContain('className="agl-hdrbtn agl-done"');
  });
});
