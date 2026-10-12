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
    /* v16 §G: the strip replaced the desk — its ring follows; the words lose the Profiles card and gain the filter */
    body: ["How many agents you have on file, how many you\u2019ve queried for this book, and how many of those queries are closed. Choose a card to filter the list."],
    subject: '[data-cl16="strip"]',
  },
  {
    title: "Your next step",
    /* v16 §G: the next-step section is gone; the header's two buttons are where a next agent comes from */
    body: ["Add an agent you already know of, or find more in Discover."],
    subject: '[data-cl16="header"] [data-hp3-part="acts"]',
  },
  {
    title: "Agents on file",
    /* v16 §G: the list is the page; an agent opens in a side panel, and the column headings sort */
    body: ["Every agent on your list. Search, filter and group it your way, sort it from its column headings, or jump by letter. Click an agent to open them."],
    subject: '[data-cl16="list"]',
  },
  {
    title: "Housekeeping",
    body: ["The details missing from your agents\u2019 profiles, and why each one helps. Fill them in here, a few at a time."],
    subject: '[data-ftab="housekeeping"]',
  },
];
