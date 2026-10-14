/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.3 — the peek lab's reference cases (screens/03's four rows, plus a Full sent), on this year's
 * calendar, each event carrying its stage as the app's own rows do. Its own module: importing a `.measure.ts` from
 * another runs that file's tests in the importer's scope.
 */
const DAY = 86_400_000;
export const refCases = () => {
  const y = new Date().getFullYear();
  const at = (m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
  const now = Date.now();
  return [
    /* 0 · Clara Beaumont: queried 2 Jul, partial requested 2 Sep, due 30 Sep (overdue) */
    { events: [{ name: "Queried", ms: at(7, 2), status: "Queried" }, { name: "Partial requested", ms: at(9, 2), status: "Partial Requested" }], due: at(9, 30), yours: true },
    /* 1 · Sophie Dunn: queried 30 Jul, partial sent 3 Sep, reply due in two days */
    { events: [{ name: "Queried", ms: at(7, 30), status: "Queried" }, { name: "Partial sent", ms: at(9, 3), status: "Partial Sent" }], due: now + 2 * DAY, yours: false },
    /* 2 · Tom Ellery: queried 10 May, an offer six days ago, send by tomorrow */
    { events: [{ name: "Queried", ms: at(5, 10), status: "Queried" }, { name: "Offer", ms: now - 6 * DAY, status: "Offer" }], due: now + DAY, yours: true },
    /* 3 · George Ashworth: queried 20 Aug, passed 5 Oct */
    { events: [{ name: "Queried", ms: at(8, 20), status: "Queried" }, { name: "Passed", ms: at(10, 5), status: "Rejected" }], due: null, yours: false, closed: true },
    /* 4 · Aisha Kapoor: queried 20 Mar, full sent 3 Jun, reply due in a month */
    { events: [{ name: "Queried", ms: at(3, 20), status: "Queried" }, { name: "Full sent", ms: at(6, 3), status: "Full Sent" }], due: now + 30 * DAY, yours: false },
  ];
};
