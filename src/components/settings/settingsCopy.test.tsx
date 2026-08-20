/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The settings copy rules, enforced rather than merely applied.
 *
 * ⚠️ IT READS THE RENDERED STRINGS, NOT THE SOURCE. A source scan would match every one of these
 * words inside the comments that explain why they were removed — this repo has burned seven false
 * reds on exactly that, and the same looseness gives a false GREEN when a comment happens to
 * contain the banned word the code no longer does. The page is rendered and its TEXT is scanned.
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderPage, renderPageSeeded, noNavigate } from "../../test/pageSmoke";

vi.mock("../../lib/db", async () => (await import("../../test/pageSmoke")).dbMock());
vi.mock("../../lib/firebase", async () => (await import("../../test/pageSmoke")).firebaseMock());
vi.mock("../toast/ToastProvider", async () => (await import("../../test/pageSmoke")).toastMock());

import { AccountSettings } from "../AccountSettings";
import { ACCOUNT_ROUTES } from "../../lib/accountRoutes";

/**
 * Rendered HTML reduced to what a reader actually sees.
 *
 * ⚠️ ENTITIES ARE DECODED, NOT BLANKED. `renderToStaticMarkup` writes an apostrophe as `&#x27;`,
 * so blanking entities turns "what's current" into "what s current" and every copy assertion
 * containing an apostrophe fails on correct text. The same trap cost a false miss when the design
 * ref was verified by content — its "Reminders you&#39;ve switched off" did not match a literal
 * grep either.
 */
const ENTITIES: Record<string, string> = {
  "&#x27;": "'", "&#39;": "'", "&rsquo;": "\u2019", "&lsquo;": "\u2018",
  "&quot;": '"', "&#34;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&nbsp;": " ",
  "&mdash;": "\u2014", "&ndash;": "\u2013",
};
function visibleText(html: string): string {
  const text = html.replace(/<[^>]*>/g, " ");
  return text
    .replace(/&(?:#x?[0-9a-f]+|[a-z]+);/gi, (m) => ENTITIES[m.toLowerCase()] ?? m)
    .replace(/\s+/g, " ");
}

const everySection = (seeded = false) =>
  ACCOUNT_ROUTES.map((r) =>
    visibleText((seeded ? renderPageSeeded : renderPage)(
      <AccountSettings section={r.id} onNavigate={noNavigate} />, r.path,
    )),
  ).join(" \n ");

/**
 * ⚠️ THE BANNED LIST IS ABOUT REGISTER, NOT SPELLING. Each of these is a word the app knows and the
 * writer does not have to: "stale" is a data state, "digest" and "retention" are systems words,
 * "machine-readable" and "entitlement" are policy words, and "lifetime" describes a licence rather
 * than a person's account.
 */
const BANNED = ["stale", "digest", "retention", "machine-readable", "entitlement", "lifetime"];

describe("no section speaks the app's own jargon at the reader", () => {
  const text = everySection().toLowerCase();
  const seeded = everySection(true).toLowerCase();

  for (const word of BANNED) {
    it(`never says "${word}"`, () => {
      expect(text, word).not.toContain(word);
      expect(seeded, `${word} (populated)`).not.toContain(word);
    });
  }

  /* ⚠️ "Nudge reminders" KEEPS ITS NAME — established Query Centre vocabulary, and the one term
     here the writer already meets elsewhere in the app. */
  it("keeps the vocabulary the rest of the app already uses", () => {
    expect(text).toContain("nudge reminders");
  });
});

describe("the copy the brief fixed, verbatim", () => {
  const text = everySection();

  const REQUIRED = [
    "The agent list uses this to tell agents in your country from international ones.",
    "The address you sign in with.",
    "One email each Monday with what happened in the past week.",
    "Emails about your account itself (sign-in, billing, your data) are always sent.",
    "Downloads everything ScriptAlly holds about your querying",
    "This removes your account and everything in it",
    "Long-waiting tasks drop to the back so your list leads with what's current. Nothing is deleted.",
    "Decisions you need to make always appear.",
  ];

  for (const line of REQUIRED) {
    it(`states: ${line.slice(0, 46)}…`, () => {
      expect(text).toContain(line);
    });
  }
});

/* ⚠️ THE RETENTION LINE CARRIES NO NUMBER, because none was confirmed. The v5 brief made the
   period a required input and it arrived blank; the instruction for that case is to ship without a
   figure and keep the constant's brackets. A bracketed "[30]" reaching a reader would be worse
   than no figure at all. */
describe("retention states no period nobody has confirmed", () => {
  const text = everySection();

  it("says the plain thing and shows no placeholder", () => {
    expect(text).toContain("it's removed from our backups soon afterwards");
    expect(text).not.toContain("[30]");
    expect(text).not.toMatch(/within \d+ days/);
  });
});
