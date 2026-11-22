/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Responses v15 — THE REFERENCE'S OWN EXAMPLE BOOK (design-refs/responses-v15/responses-v15.html, `FULL`, `EARLY`,
 * `WAITING`), as plain data. One source for the seed (`seedRs15.mjs`) and the unit tests (src/lib/responses15.test.ts),
 * so the page's figures, the locks' expected values and the reference's numbers are the same numbers.
 *
 *   full   34 queried: 7 asked for more (4 your move), 11 passed (5 with a note, one after the full, one after a
 *          partial), 4 closed with no reply, 12 still out; one revise and resubmit with a note
 *   early  9 queried: 1 partial request, 1 pass, 7 still out
 *   none   12 queried, nothing answered
 *
 * Dates are [month, day] in 2026 against the reference's clock, 17 Nov 2026 (`REF_TODAY`). `fr` is the days to the
 * agent's FIRST answer where it differs from the last (a request that came before the current answer).
 * k: offer | fullReq | partReq | rr | fullSent | partSent | passed | noReply · far: 0 query, 1 partial, 2 full, 3 offer
 */
export const REF_TODAY = [11, 17];

export const FULL = [
  { n: "Tom Ellery", fr: 83, a: "Curtis Vane", k: "offer", far: 3, sent: [5, 11], at: [11, 9], move: 1, due: [11, 23] },
  { n: "Jonathan Marsh", fr: 18, a: "Marsh & Tide Literary", k: "fullReq", far: 2, sent: [9, 26], at: [11, 7], move: 1, part: 1 },
  { n: "Clara Beaumont", a: "Harbour Lane", k: "partReq", far: 1, sent: [10, 6], at: [11, 12], move: 1 },
  { n: "Daniel O’Rourke", fr: 53, a: "Inkwell & Stone", k: "rr", far: 2, sent: [6, 20], at: [10, 30], move: 1, note: "The voice is terrific. I’d be glad to look again if the middle third moved faster." },
  { n: "Marcus Webb", a: "Webb & Thorne", k: "fullSent", far: 2, sent: [8, 3], at: [10, 14], mine: [10, 22] },
  { n: "Sophie Dunn", a: "Ashgrove Literary", k: "partSent", far: 1, sent: [9, 1], at: [10, 2], mine: [10, 5] },
  { n: "Mei Tanaka", fr: 18, a: "Tanaka Literary", k: "fullSent", far: 2, sent: [7, 14], at: [9, 8], mine: [9, 10], part: 1 },
  { n: "Eleanor Whitlock", a: "Whitlock & Rowe", k: "passed", far: 0, sent: [10, 22], at: [11, 14], note: "I enjoyed Murphy’s voice a great deal, but I didn’t connect with the opening chapters as strongly as I’d hoped." },
  { n: "Ben Okafor", fr: 38, a: "The Lantern Agency", k: "passed", far: 2, sent: [6, 2], at: [11, 6], note: "Such a close call. The ending didn’t quite land for me, but I’d be glad to see your next book." },
  { n: "Sarah Kendrick", a: "Kendrick Associates", k: "passed", far: 0, sent: [9, 17], at: [10, 28] },
  { n: "Hugo Lindqvist", a: "Northlight Literary", k: "passed", far: 0, sent: [10, 5], at: [10, 21], note: "Not right for my list at the moment. I already represent something very similar." },
  { n: "Maya Thorne", a: "Thorne & Bell", k: "passed", far: 0, sent: [9, 27], at: [10, 9] },
  { n: "Rafael Costa", fr: 26, a: "Costa Books", k: "passed", far: 1, sent: [7, 6], at: [9, 30], note: "The premise is lovely. The pacing in the sample felt slow to me." },
  { n: "William Tate", a: "Tate & Morrow", k: "passed", far: 0, sent: [8, 19], at: [9, 18] },
  { n: "Imogen Hale", a: "Hale & Finch", k: "passed", far: 0, sent: [7, 28], at: [9, 2], note: "A warm, funny voice. I just can’t see how I’d sell it right now." },
  { n: "Beatrice Wong", a: "Wong Literary", k: "passed", far: 0, sent: [7, 21], at: [8, 20] },
  { n: "Oliver Grant", a: "Grant & Lowe", k: "passed", far: 0, sent: [6, 30], at: [8, 5] },
  { n: "Nadia Petrova", a: "Petrova Agency", k: "passed", far: 0, sent: [6, 9], at: [7, 22] },
  { n: "Alice Moreno", a: "Moreno & Clarke", k: "noReply", far: 0, sent: [8, 4], at: [11, 1] },
  { n: "Liam Gallagher", a: "Gallagher Literary", k: "noReply", far: 0, sent: [6, 16], at: [10, 12] },
  { n: "Jun Mori", a: "Mori & West", k: "noReply", far: 0, sent: [6, 2], at: [9, 1] },
  { n: "Ruth Feldman", a: "Feldman Books", k: "noReply", far: 0, sent: [5, 18], at: [8, 18] },
];
export const EARLY = [
  { n: "Clara Beaumont", a: "Harbour Lane", k: "partReq", far: 1, sent: [10, 6], at: [11, 12], move: 1 },
  { n: "Maya Thorne", a: "Thorne & Bell", k: "passed", far: 0, sent: [10, 27], at: [11, 9] },
];
/** [name, agency, sent, the reply time the agent gives in weeks (0 = none given)] */
export const WAITING = [
  ["Theo Blake", "Blake & Sons", [9, 8], 12], ["Isla Fraser", "Fraser Ross", [8, 12], 8], ["Aisha Kapoor", "The Lantern Agency", [9, 2], 8],
  ["Priya Raman", "Raman & Rowe", [10, 1], 10], ["George Ashworth", "Ashworth Lit.", [10, 14], 8], ["Nora Quinn", "Quinn Literary", [10, 20], 12],
  ["Sam Achebe", "Achebe & Hart", [10, 27], 6], ["Lena Fischer", "Fischer Books", [11, 3], 8], ["Owen Price", "Price Literary", [11, 5], 12],
  ["Dara Singh", "Singh Agency", [11, 10], 6], ["Kit Marlowe", "Marlowe & Co", [10, 8], 0], ["Fay Okoro", "Okoro Literary", [11, 12], 0],
];
/** the reference's three states: the answers, and how many queries went out */
export const SETS = { full: { items: FULL, queried: 34 }, early: { items: EARLY, queried: 9 }, none: { items: [], queried: 12 } };
