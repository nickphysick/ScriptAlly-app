/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Also-changes engine (v11 §7.3), locked the way §11.7 demands: the reply-time note's dates
 * come from the ENGINE (`expectedFor` → `resolveExpectedDate`, D4 recency and floor), and the
 * fixture carries a query where the engine and `stage date + weeks × 7` DISAGREE — a writer-dated
 * query — so the naive-arithmetic mutation cannot pass. Inputs are produced, never typed.
 */
import { describe, expect, it } from "vitest";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES } from "../components/agents/contactFixture";
import { expectedFor } from "./qcSummary";
import { AlsoNote, alsoChanges, alsoSummary, draftFromAgentRecord, savedLine } from "./contactEdit";
import type { Agent, Query } from "../types";

const NOW = Date.parse("2026-09-01T12:00:00.000Z");
const AGENT = CONTACT_FIXTURE_AGENTS.find((a) => a.id === "fx-long")!; // 6-week window, one live Queried
const QUERIES = CONTACT_FIXTURE_QUERIES;
const ctx = { queries: QUERIES, agents: CONTACT_FIXTURE_AGENTS, msGenre: "Thriller", msTitle: "Fixture", nowMs: NOW };

const draftOf = (a: Agent) => draftFromAgentRecord(a);

describe("the reply-time note is a dry run through the engine", () => {
  it("the note's dates ARE expectedFor's, before and after (never weeks-arithmetic)", () => {
    const draft = { ...draftOf(AGENT), responseTimeWeeks: 12 };
    const notes = alsoChanges(AGENT, draft, ctx);
    const reply = notes.find((n) => n.field === "reply")!;
    const q = QUERIES.find((x) => x.agentId === AGENT.id)!;
    const before = expectedFor(q, AGENT);
    const after = expectedFor(q, { ...AGENT, responseTimeWeeks: 12 });
    const fmt = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    expect(reply.lines[0]).toContain(`${fmt(before.ms!)} → ${fmt(after.ms!)}`);
  });

  it("⚠️ THE §11.7 FIXTURE: a writer-dated query does not move with the window, so it gets NO line", () => {
    /* the writer stated their own expected date (D4's field, reached the way the app reaches it);
       the engine's recency law keeps it whatever the agency window becomes — `send + weeks × 7`
       would move, which is exactly the mutation this case exists to redden */
    const writerDated = {
      ...QUERIES.find((x) => x.agentId === AGENT.id)!,
      writerExpectedDate: "2026-12-20",
      writerExpectedSetAt: "2026-08-30T00:00:00.000Z",
    } as unknown as Query;
    const engineOld = expectedFor(writerDated, AGENT);
    const engineNew = expectedFor(writerDated, { ...AGENT, responseTimeWeeks: 8 });
    expect(engineOld.ms, "precondition: the engine holds the writer's date").toBe(engineNew.ms);
    const naive = (w: number) => Date.parse(writerDated.dateSent) + w * 7 * 86_400_000;
    expect(naive(6), "precondition: the naive arithmetic DISAGREES with the engine here").not.toBe(engineOld.ms);

    const notes = alsoChanges(AGENT, { ...draftOf(AGENT), responseTimeWeeks: 8 },
      { ...ctx, queries: [writerDated] });
    const reply = notes.find((n) => n.field === "reply")!;
    expect(
      reply.lines.filter((l) => l.startsWith("Query Centre")).length,
      "a per-query line appeared for a query whose date does not depend on the window — the note is not running the engine",
    ).toBe(0);
  });

  it("the crossing clause appears only when the date crosses today, in either direction", () => {
    const q = QUERIES.find((x) => x.agentId === AGENT.id)!; // sent 10 Aug; 6w → 21 Sep (future at NOW)
    /* 6 → 2 weeks: 24 Aug, PAST — the date crosses today going backwards */
    const toPast = alsoChanges(AGENT, { ...draftOf(AGENT), responseTimeWeeks: 2 }, { ...ctx, queries: [q] })
      .find((n) => n.field === "reply")!;
    expect(toPast.lines[0]).toContain("so it becomes past the date and moves to Your move");
    /* 6 → 12 weeks: future → future — no clause */
    const stillFuture = alsoChanges(AGENT, { ...draftOf(AGENT), responseTimeWeeks: 12 }, { ...ctx, queries: [q] })
      .find((n) => n.field === "reply")!;
    expect(stillFuture.lines[0]).not.toContain("Your move");
    /* and the leaving direction, from a past date to a future one */
    const pastAgent = { ...AGENT, responseTimeWeeks: 2 };
    const toFuture = alsoChanges(pastAgent, { ...draftFromAgentRecord(pastAgent), responseTimeWeeks: 12 }, { ...ctx, queries: [q] })
      .find((n) => n.field === "reply")!;
    expect(toFuture.lines[0]).toContain("so it is no longer past the date and leaves Your move");
  });
});

describe("the other notes name only real readers", () => {
  it("a rename notes the feed's qualitative consequence, and only for an agent with queries", () => {
    const notes = alsoChanges(AGENT, { ...draftOf(AGENT), name: "A. Kapoor" }, ctx);
    const who = notes.find((n) => n.field === "who")!;
    expect(who.lines.some((l) => l.includes("older entries that use the old name will no longer link"))).toBe(true);
    const fresh = CONTACT_FIXTURE_AGENTS.find((a) => a.id === "fx-fresh")!;
    const none = alsoChanges(fresh, { ...draftOf(fresh), name: "New Name" }, ctx);
    expect(none.find((n) => n.field === "who"), "an agent with no queries is named nowhere else").toBeUndefined();
  });

  it("genres note fires only when the manuscript's genre joins or leaves, with the count computed", () => {
    const fresh = CONTACT_FIXTURE_AGENTS.find((a) => a.id === "fx-fresh")!;
    const before = CONTACT_FIXTURE_AGENTS.filter((a) => (a.genres ?? []).some((g) => g.toLowerCase().includes("thriller"))).length;
    const notes = alsoChanges(fresh, { ...draftOf(fresh), genres: [...fresh.genres, "Thriller"] }, ctx);
    const g = notes.find((n) => n.field === "genres")!;
    expect(g.lines[0]).toContain(`Want thriller: ${before} → ${before + 1}`);
    /* reordering without touching the match: no note */
    const long = alsoChanges(AGENT, { ...draftOf(AGENT), genres: [...AGENT.genres].reverse() }, ctx);
    expect(long.find((n) => n.field === "genres")).toBeUndefined();
  });

  it("rating, wishlist, materials, links and location say Only this card changes", () => {
    const draft = { ...draftOf(AGENT), starRating: 5, mswlNotes: "New wishes.", city: "Bath", website: "https://x.co" };
    const notes = alsoChanges(AGENT, draft, ctx);
    expect(notes, "a note fired for a field with no outside reader").toEqual([]);
    expect(alsoSummary(notes)).toBe("Only this card changes.");
    expect(savedLine(notes)).toBe("Saved.");
  });

  it("the footer unions the surfaces across notes, readably", () => {
    const notes: AlsoNote[] = [
      { field: "reply", lines: [], surfaces: ["the Query Centre", "Analytics"] },
      { field: "nrn", lines: [], surfaces: ["the To-do list", "the Query Centre"] },
    ];
    expect(alsoSummary(notes)).toBe("Saving also updates the Query Centre, Analytics and the To-do list.");
  });
});
