/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v14 §8 / v15 (v13 §8's mechanism) — the page guide's four steps, verbatim from the packs, each with the subject it
 * scrolls to and rings. The shared `PageGuide` draws them; the page key is `contacts`
 * (`sa.guide.contacts`).
 */
import type { GuideStep } from "../../shell/PageGuide";

export const CONTACT_GUIDE_PAGE = "contacts";

export const CONTACT_GUIDE: readonly GuideStep[] = [
  {
    title: "Your list in numbers",
    /* v15 §3 (ruling 7): the desk replaced the strip — its words and its ring follow */
    body: ["How many agents you have on file, how many you’ve queried for this book, and how complete their profiles are."],
    subject: '[data-cl15="desk"]',
  },
  {
    title: "Your next step",
    body: ["The agents to query next for this book, and the next one up. When there’s no one left to query, this tells you who reopens soon, or where the book has been."],
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
