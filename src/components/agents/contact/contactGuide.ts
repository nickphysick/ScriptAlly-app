/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v14 §8 (v13 §8's mechanism) — the page guide's four steps, verbatim from the pack, each with the subject it
 * scrolls to and rings. The shared `PageGuide` draws them; the page key is `contacts`
 * (`sa.guide.contacts`).
 */
import type { GuideStep } from "../../shell/PageGuide";

export const CONTACT_GUIDE_PAGE = "contacts";

export const CONTACT_GUIDE: readonly GuideStep[] = [
  {
    title: "Your list in numbers",
    body: ["How many agents you have on file, how many fit your book, who’s open, how fast they reply, and what you added this month."],
    subject: '[data-cl13="strip"]',
  },
  {
    title: "Your next step",
    body: ["The agents to query next for this book, and the next one up. When there’s no one left to query, this tells you who reopens soon, who might fit, or where to find more."],
    subject: '[data-cl14="next"]',
  },
  {
    title: "Your agents",
    body: ["Every agent on your list. Search, filter, group and sort it your way, or jump by letter. Click an agent to open their card."],
    subject: '[data-cl14="ws"]',
  },
  {
    title: "Housekeeping",
    body: ["The details missing from your agents’ profiles, and why each one helps. Fill them in here, a few at a time."],
    subject: '[data-ftab="housekeeping"]',
  },
];
