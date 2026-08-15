/**
 * Locks for the three data bugs behind the live board (To-do workspace pack, Phase 0B).
 *
 * ⚠️ THESE ARE DERIVATION FIXES, NOT COSMETIC HIDING, and the distinction is the point of the
 * phase. A guard that suppressed the render would have made each fault invisible while leaving
 * the wrong data flowing into the four new pages.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { QueryStatus } from "../types";
import { BoardCard, dedupeAgentCards, silentDays } from "./todoBoard";

const DAY = 86_400_000;
const now = Date.UTC(2026, 7, 5);
const iso = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString();

describe("silentDays — the figure the template was dropping", () => {
  /* ⚠️ THE FIXTURE. queryAmbientStatus picks its send date from STATUS: anything that is not
     QUERIED or PARTIAL_SENT looked for a `fullSentDate` that was never set, got NaN, and the card
     printed a bare "SILENT" — while `dateSent` sat right there. */
  it("falls back to dateSent when the stage date is absent", () => {
    const q = { status: QueryStatus.REVISE_RESUBMIT, dateSent: iso(40) };
    expect(silentDays(q, now)).toBe(40);
  });

  it("uses the stage date when the query is at that stage", () => {
    const q = { status: QueryStatus.PARTIAL_SENT, dateSent: iso(90), partialSentDate: iso(12) };
    expect(silentDays(q, now)).toBe(12);
  });

  it("uses dateSent for a plain queried record", () => {
    expect(silentDays({ status: QueryStatus.QUERIED, dateSent: iso(7) }, now)).toBe(7);
  });

  /* Still honest where the data genuinely cannot supply it — a null here is an absence, not a
     dropped figure, and the card's bare "SILENT" is then the right render. */
  it("returns null when there is no send date at all", () => {
    expect(silentDays({ status: QueryStatus.QUERIED }, now)).toBeNull();
    expect(silentDays(undefined, now)).toBeNull();
  });

  it("returns null on an unparsable date rather than NaN days", () => {
    expect(silentDays({ status: QueryStatus.QUERIED, dateSent: "not a date" }, now)).toBeNull();
  });

  it("never goes negative on a future-dated send", () => {
    expect(silentDays({ status: QueryStatus.QUERIED, dateSent: iso(-3) }, now)).toBe(0);
  });
});

const card = (over: Partial<BoardCard>): BoardCard => ({
  key: "k", stream: "do", title: "t", who: "w", subtitle: "", due: "", warn: false, snoozes: 0,
  hk: false, initials: "MR", record: "Marcus Reed · Reed Literary", committed: false, done: false,
  ...over,
});

describe("dedupeAgentCards — 'Marcus Reed twice'", () => {
  /* ⚠️ THE CAUSE IS NOT DUPLICATE ACTIVITIES. Derived tasks are generated PER QUERY, and one agent
     can hold several. Two rows for one agent are usually two real pieces of work — but the title
     carries the agent alone, so they render identically. */
  it("collapses same type + same agent + same manuscript", () => {
    const out = dedupeAgentCards([
      card({ key: "a", taskType: "nudge_overdue", agentId: "ag1", msTitle: "The Hollow Sea" }),
      card({ key: "b", taskType: "nudge_overdue", agentId: "ag1", msTitle: "The Hollow Sea" }),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0].key, "the first survives — the lanes are already urgency-ordered").toBe("a");
  });

  /* ⚠️ TWO BOOKS IS TWO PIECES OF WORK. Collapsing these would LOSE a real task, which is the
     failure mode a naive "dedupe by agent" would have introduced while fixing the visible one. */
  it("keeps two rows for one agent across different manuscripts", () => {
    const out = dedupeAgentCards([
      card({ key: "a", taskType: "nudge_overdue", agentId: "ag1", msTitle: "The Hollow Sea" }),
      card({ key: "b", taskType: "nudge_overdue", agentId: "ag1", msTitle: "Winter Ledger" }),
    ]);
    expect(out).toHaveLength(2);
  });

  /* ...and having kept them, they must not look the same. */
  it("names the manuscript on each surviving row so they are distinguishable", () => {
    const out = dedupeAgentCards([
      card({ key: "a", taskType: "nudge_overdue", agentId: "ag1", msTitle: "The Hollow Sea" }),
      card({ key: "b", taskType: "nudge_overdue", agentId: "ag1", msTitle: "Winter Ledger" }),
    ]);
    expect(out[0].record).toContain("The Hollow Sea");
    expect(out[1].record).toContain("Winter Ledger");
    expect(out[0].record).not.toBe(out[1].record);
  });

  it("leaves a lone row's meta line alone", () => {
    const out = dedupeAgentCards([
      card({ key: "a", taskType: "nudge_overdue", agentId: "ag1", msTitle: "The Hollow Sea" }),
    ]);
    expect(out[0].record).toBe("Marcus Reed · Reed Literary");
  });

  it("does not double-append a manuscript the meta line already carries", () => {
    const out = dedupeAgentCards([
      card({ key: "a", taskType: "nudge_overdue", agentId: "ag1", msTitle: "Sea", record: "On Sea" }),
      card({ key: "b", taskType: "nudge_overdue", agentId: "ag1", msTitle: "Ledger" }),
    ]);
    expect(out[0].record).toBe("On Sea");
  });

  it("different task types for one agent are never collapsed", () => {
    const out = dedupeAgentCards([
      card({ key: "a", taskType: "nudge_overdue", agentId: "ag1", msTitle: "Sea" }),
      card({ key: "b", taskType: "no_response_close", agentId: "ag1", msTitle: "Sea" }),
    ]);
    expect(out).toHaveLength(2);
  });

  /* Cards with no agent have no identity to collide on — collapsing them would silently eat the
     writer's own tasks. */
  it("never collapses agent-less cards", () => {
    const out = dedupeAgentCards([
      card({ key: "a", title: "Buy stamps" }),
      card({ key: "b", title: "Buy stamps" }),
    ]);
    expect(out).toHaveLength(2);
  });
});

describe("no render path can draw an empty pill", () => {
  const page = readFileSync(resolve(__dirname, "../components/todo/ToDoPage.tsx"), "utf8");

  /* ⚠️ `kind` is "" for a user task (todoBoard's default branch). The LIST row was guarded and the
     BOARD card was not — chrome with nothing in it, which reads as a load failure. */

  it("renders no literal 'undefined' anywhere in the page's markup", () => {
    expect(page).not.toMatch(/>\s*\{[^}]*\bundefined\b[^}]*\}\s*</);
  });
});
