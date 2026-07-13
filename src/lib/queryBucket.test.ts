/**
 * Locks for the Queries filter bar (ref hub-token-sheet-v3.html): STATUS bucket membership
 * (the CTA-engine derived state — Waiting / Your move / Closed), and artefact locks that the
 * list-header Sort/Filter controls retired into the floating bar.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { queryBucket, queriesPulse } from "./queryAmbient";
import { QueryStatus } from "../types";

describe("queryBucket — STATUS pill membership", () => {
  it("Waiting = the agent's court (queried / partial sent / full sent)", () => {
    for (const s of [QueryStatus.QUERIED, QueryStatus.PARTIAL_SENT, QueryStatus.FULL_SENT]) {
      expect(queryBucket(s)).toBe("waiting");
    }
  });

  it("Your move = the writer owes materials (partial/full requested, R&R)", () => {
    for (const s of [QueryStatus.PARTIAL_REQUESTED, QueryStatus.FULL_REQUESTED, QueryStatus.REVISE_RESUBMIT]) {
      expect(queryBucket(s)).toBe("move");
    }
  });

  it("Closed = terminal (offer / rejected / withdrawn / no response)", () => {
    for (const s of [QueryStatus.OFFER, QueryStatus.REJECTED, QueryStatus.WITHDRAWN, QueryStatus.NO_RESPONSE]) {
      expect(queryBucket(s)).toBe("closed");
    }
  });

  it("every status maps to exactly one bucket (total, no gaps)", () => {
    for (const s of Object.values(QueryStatus)) {
      expect(["waiting", "move", "closed"]).toContain(queryBucket(s));
    }
  });
});

describe("queriesPulse — masthead pulse line", () => {
  const q = (status: QueryStatus) => ({ status });

  it("reads Tracking {scope} · {n} queries · {m} awaiting your move", () => {
    const list = [q(QueryStatus.QUERIED), q(QueryStatus.PARTIAL_REQUESTED), q(QueryStatus.FULL_SENT)];
    expect(queriesPulse(list, "all manuscripts")).toBe("Tracking all manuscripts · 3 queries · 1 awaiting your move");
  });

  it("derives m from the CTA engine's writer's-turn bucket (queryBucket === move), not raw status", () => {
    // two 'move' statuses, one 'waiting', one 'closed' → m = 2
    const list = [
      q(QueryStatus.PARTIAL_REQUESTED), q(QueryStatus.REVISE_RESUBMIT),
      q(QueryStatus.QUERIED), q(QueryStatus.REJECTED),
    ];
    expect(queriesPulse(list, "Lost Clockworks")).toBe("Tracking Lost Clockworks · 4 queries · 2 awaiting your move");
  });

  it("is singular-safe and honest at zero", () => {
    expect(queriesPulse([q(QueryStatus.QUERIED)], "x")).toContain("· 1 query ·");
    expect(queriesPulse([], "all manuscripts")).toBe("Tracking all manuscripts · 0 queries · 0 awaiting your move");
  });
});

describe("Queries filter bar — artefacts", () => {
  const src = readFileSync(resolve(__dirname, "../components/Queries.tsx"), "utf8");

  it("the F12 FILTER popover exists — Whose turn + Manuscript + Status + Needs attention", () => {
    expect(src).toContain("renderFilterPopover");
    expect(src).toContain("Whose turn");
    expect(src).toContain("Needs attention");
    expect(src).toContain("statusSel"); // the Status multi-select's committed selection
  });

  it("Whose turn reuses the CTA engine's bucket (move / waiting) — never a second derivation", () => {
    expect(src).toContain("queryBucket(q.status as QueryStatus)");
    expect(src).toContain('turnFilter === "move" && bkt !== "move"');
    expect(src).toContain('turnFilter === "wait" && bkt !== "waiting"');
  });

  it("the above-list count is removed + the list-header menus stay retired", () => {
    expect(src.includes("List head — count only")).toBe(false); // above-list count removed
    expect(src.includes("setSortMenuOpen")).toBe(false);
    expect(src.includes("setFilterMenuOpen")).toBe(false);
  });

  it("the SORT popover drives setSortKey (the actual sort driver), defaulting to last activity", () => {
    expect(src).toContain("renderSortPopover");
    expect(src).toContain("onClick={() => setSortKey(i.key)}");
    expect(src).toContain('useState<string>("last_activity")');
  });
});
