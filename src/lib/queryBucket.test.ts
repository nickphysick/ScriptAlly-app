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

  it("the floating filter bar exists with STATUS + Sort · Date sent, driven by the bucket", () => {
    expect(src).toContain("qp-filterbar");
    expect(src).toContain("Sort · Date sent");
    expect(src).toContain("statusBucket");
    expect(src).toContain("queryBucket(q.status as QueryStatus) !== statusBucket");
  });

  it("the list-header Sort/Filter icon-buttons + their menus retired", () => {
    expect(src.includes("List head — count only")).toBe(true);
    expect(src.includes("setSortMenuOpen")).toBe(false);
    expect(src.includes("setFilterMenuOpen")).toBe(false);
    expect(src.includes("Filter menu — status set")).toBe(false);
  });

  it("the Sort dropdown wires to setSortKey (the actual sort driver)", () => {
    expect(src).toContain("onChange={(e) => setSortKey(e.target.value)}");
  });
});
