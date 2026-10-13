/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v17 §F (v13 §8's mechanism) — the page guide's four steps, each with the subject it scrolls to and rings.
 * Steps 1 to 3 were re-pointed by v17 at the summary card, the filter row and the list; their words are this build's, not a
 * pack's (the v17 pack gave none), and are listed for Nick in the v17 report. The shared `PageGuide` draws them; the page key is `contacts`
 * (`sa.guide.contacts`).
 */
import type { GuideStep } from "../../shell/PageGuide";

export const CONTACT_GUIDE_PAGE = "contacts";

export const CONTACT_GUIDE: readonly GuideStep[] = [
  {
    title: "Your list in numbers",
    /* v17 §F: the summary card replaced the strip — its ring follows */
    body: ["How many agents you have on file, and how many are not queried yet, querying or closed for this book. Choose a row to filter the list."],
    subject: '[data-cl17="card"]',
  },
  {
    title: "Find and filter",
    /* v17 §F: search and the filter pills are in the header */
    body: ["Search by name or agency, or narrow the list by status, who\u2019s open, and genre."],
    subject: '[data-cl17="filter-row"]',
  },
  {
    title: "The full list",
    body: ["Every agent on your list. Group it your way, sort it from its column headings, or jump by letter. Click an agent to open them."],
    subject: '[data-cl16="list"]',
  },
  {
    title: "Housekeeping",
    body: ["The details missing from your agents\u2019 profiles, and why each one helps. Fill them in here, a few at a time."],
    subject: '[data-ftab="housekeeping"]',
  },
];
