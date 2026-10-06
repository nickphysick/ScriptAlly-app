/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v13 §8 — the page guide's four steps, verbatim from the pack, each with the subject it
 * scrolls to and rings. The shared `PageGuide` draws them; the page key is `contacts`
 * (`sa.guide.contacts`).
 */
import type { GuideStep } from "../../shell/PageGuide";

export const CONTACT_GUIDE_PAGE = "contacts";

export const CONTACT_GUIDE: readonly GuideStep[] = [
  {
    title: "Your list in numbers",
    body: ["How many agents you have on file, how many fit your book, who’s open, how fast they reply, and what you added this month. Press a figure to bring those agents up in the carousel below."],
    subject: '[data-cl13="strip"]',
  },
  {
    title: "Who to query next",
    body: ["Agents worth approaching now: the best fits you haven’t queried, the ones you added recently, and the ones reopening soon."],
    subject: '[data-cz="contacts"]',
  },
  {
    title: "Every agent, on file",
    body: ["Your whole list as a card index. Jump by letter, or use Filters, Grouped and Sort to see it your way. Click an agent to open their card."],
    subject: '[data-ob="contacts"] .ob-txt',
  },
  {
    title: "Housekeeping",
    body: ["The details missing from your agents’ profiles, and why each one helps. Fill them in here, a few at a time."],
    subject: '[data-ftab="housekeeping"]',
  },
];
