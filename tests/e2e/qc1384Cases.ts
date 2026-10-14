/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.4 — the acceptance cases of screens/01 and 02, exactly as the prompt spells them, each against a
 * forced today of 8 Oct 2026 (the peek lab's `now`). Their own module: importing a `.measure.ts` from another runs its
 * tests in the importer's scope.
 */
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
export const TODAY_1384 = at(2026, 10, 8);
export const CASES_1384 = [
  { key: "sophie", events: [{ name: "Query sent", ms: at(2026, 8, 22), status: "Queried" }, { name: "Partial requested", ms: at(2026, 8, 22) + 3_600_000, status: "Partial Requested" }, { name: "Partial sent", ms: at(2026, 9, 21), status: "Partial Sent" }], due: at(2026, 11, 2), yours: false, now: TODAY_1384 },
  { key: "marcus", events: [{ name: "Query sent", ms: at(2024, 6, 11), status: "Queried" }], due: at(2024, 7, 23), yours: false, now: TODAY_1384 },
  { key: "clara", events: [{ name: "Query sent", ms: at(2026, 7, 2), status: "Queried" }, { name: "Partial requested", ms: at(2026, 9, 2), status: "Partial Requested" }], due: at(2026, 9, 30), yours: true, now: TODAY_1384 },
  { key: "tom", events: [{ name: "Query sent", ms: at(2024, 3, 3), status: "Queried" }, { name: "Partial requested", ms: at(2024, 4, 10), status: "Partial Requested" }, { name: "Partial sent", ms: at(2024, 4, 12), status: "Partial Sent" }, { name: "Offer", ms: at(2026, 7, 17), status: "Offer" }], due: at(2026, 7, 31), yours: true, now: TODAY_1384 },
  { key: "george", events: [{ name: "Query sent", ms: at(2026, 8, 20), status: "Queried" }, { name: "Passed", ms: at(2026, 10, 5), status: "Rejected" }], due: null, yours: false, closed: true, now: TODAY_1384 },
];
