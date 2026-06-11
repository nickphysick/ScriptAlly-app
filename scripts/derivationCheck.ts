/**
 * Unit checks for src/lib/queryDerivation.ts — the pure derivation functions.
 *
 * The project has no test runner, so this is a self-contained assertion script:
 *   npx esbuild scripts/derivationCheck.ts --bundle --platform=node --outfile=/tmp/derivationCheck.cjs
 *   node /tmp/derivationCheck.cjs
 * (or simply `npm run check:derivation` if a script is added later).
 */
import {
  deriveStatus,
  deriveResponseFlags,
  deriveRevisionRound,
  derivePipelineDates,
  deriveQueryFields,
  DerivableActivity,
} from "../src/lib/queryDerivation";
import { QueryStatus } from "../src/types";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ✓ ${name}`);
  } else {
    failures++;
    console.error(`  ✗ ${name}\n      expected ${e}\n      actual   ${a}`);
  }
}

const t0 = new Date("2026-01-01T10:00:00Z").toISOString();
const at = (status: QueryStatus | string | null | undefined, daysAfter: number, id?: string): DerivableActivity => ({
  id,
  resultingStatus: status as any,
  date: new Date(new Date(t0).getTime() + daysAfter * 86400000).toISOString(),
});

console.log("deriveStatus");
check("empty log → QUERIED", deriveStatus([]), QueryStatus.QUERIED);
check("query sent only → QUERIED", deriveStatus([at(QueryStatus.QUERIED, 0)]), QueryStatus.QUERIED);
check(
  "latest status-bearing wins",
  deriveStatus([at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_REQUESTED, 5)]),
  QueryStatus.PARTIAL_REQUESTED
);
check(
  "fetch order is irrelevant (determinism)",
  deriveStatus([at(QueryStatus.PARTIAL_SENT, 7), at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_REQUESTED, 5)]),
  QueryStatus.PARTIAL_SENT
);
check(
  "same timestamp → stable id tiebreak",
  deriveStatus([at(QueryStatus.PARTIAL_SENT, 1, "b"), at(QueryStatus.PARTIAL_REQUESTED, 1, "a")]),
  QueryStatus.PARTIAL_SENT
);
check(
  "non-status entries ignored",
  deriveStatus([at(QueryStatus.QUERIED, 0), at(null, 9), at(undefined, 10), at("Nudge Sent", 11)]),
  QueryStatus.QUERIED
);
check(
  "undo = delete last entry → previous derives",
  deriveStatus([at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_REQUESTED, 5)].slice(0, 1)),
  QueryStatus.QUERIED
);
check(
  "date shapes: Firestore-style seconds object",
  deriveStatus([
    { resultingStatus: QueryStatus.QUERIED, date: { seconds: 1767261600 } },
    { resultingStatus: QueryStatus.REJECTED, date: { seconds: 1767434400 } },
  ]),
  QueryStatus.REJECTED
);

console.log("deriveResponseFlags");
check("no activities → false", deriveResponseFlags([]).hasAgentResponded, false);
check("query sent only → false", deriveResponseFlags([at(QueryStatus.QUERIED, 0)]).hasAgentResponded, false);
check(
  "partial requested → true",
  deriveResponseFlags([at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_REQUESTED, 5)]).hasAgentResponded,
  true
);
check(
  "multiple agent actions still ONE response (boolean cap)",
  deriveResponseFlags([
    at(QueryStatus.PARTIAL_REQUESTED, 5),
    at(QueryStatus.FULL_REQUESTED, 10),
    at(QueryStatus.OFFER, 20),
  ]).hasAgentResponded,
  true
);
check("rejected → true", deriveResponseFlags([at(QueryStatus.REJECTED, 3)]).hasAgentResponded, true);
check(
  "closed without reply (No Response) → NOT a response",
  deriveResponseFlags([at(QueryStatus.QUERIED, 0), at(QueryStatus.NO_RESPONSE, 60)]).hasAgentResponded,
  false
);
check(
  "writer-only actions (sent) → false",
  deriveResponseFlags([at(QueryStatus.QUERIED, 0), at(QueryStatus.PARTIAL_SENT, 5)]).hasAgentResponded,
  false
);

console.log("deriveRevisionRound");
check("no activities → round 1", deriveRevisionRound([]), 1);
check(
  "plain full send → round 1",
  deriveRevisionRound([at(QueryStatus.FULL_REQUESTED, 0), at(QueryStatus.FULL_SENT, 1)]),
  1
);
check(
  "R&R → full sent → round 2",
  deriveRevisionRound([
    at(QueryStatus.FULL_REQUESTED, 0),
    at(QueryStatus.FULL_SENT, 1),
    at(QueryStatus.REVISE_RESUBMIT, 10),
    at(QueryStatus.FULL_SENT, 20),
  ]),
  2
);
check(
  "double R&R → round 3",
  deriveRevisionRound([
    at(QueryStatus.FULL_SENT, 1),
    at(QueryStatus.REVISE_RESUBMIT, 10),
    at(QueryStatus.FULL_SENT, 20),
    at(QueryStatus.REVISE_RESUBMIT, 30),
    at(QueryStatus.FULL_SENT, 40),
  ]),
  3
);
check(
  "deleting the R&R entry recomputes the round down",
  deriveRevisionRound([at(QueryStatus.FULL_SENT, 1), at(QueryStatus.FULL_SENT, 20)]),
  1
);

console.log("derivePipelineDates");
const seq = [
  at(QueryStatus.QUERIED, 0),
  at(QueryStatus.PARTIAL_REQUESTED, 5),
  at(QueryStatus.PARTIAL_SENT, 7),
  at(QueryStatus.FULL_REQUESTED, 14),
  at(QueryStatus.FULL_SENT, 16),
];
const dates = derivePipelineDates(seq);
check("partialRequestedDate", dates.partialRequestedDate, new Date(new Date(t0).getTime() + 5 * 86400000).toISOString());
check("fullSentDate", dates.fullSentDate, new Date(new Date(t0).getTime() + 16 * 86400000).toISOString());
check("absent stage → null", derivePipelineDates([at(QueryStatus.QUERIED, 0)]).partialSentDate, null);
check(
  "latest occurrence wins (resubmitted full)",
  derivePipelineDates([at(QueryStatus.FULL_SENT, 1), at(QueryStatus.REVISE_RESUBMIT, 5), at(QueryStatus.FULL_SENT, 9)]).fullSentDate,
  new Date(new Date(t0).getTime() + 9 * 86400000).toISOString()
);

console.log("deriveQueryFields (bundle + idempotence)");
const f1 = deriveQueryFields(seq);
const f2 = deriveQueryFields([...seq].reverse());
check("bundle status", f1.status, QueryStatus.FULL_SENT);
check("bundle responded", f1.hasAgentResponded, true);
check("identical log (any order) → identical fields", f1, f2);

if (failures > 0) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll derivation checks passed.");
