/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Scout's `returned` state — the appraisal line, verified (v3.1 §7).
 *
 * ⚠️ THIS EXISTS BECAUSE THE STATE SHIPS UNEXERCISED. `SCOUT_LIVE` is false, so a send lands on
 * `notyet` and no browser walk reaches a suggestion card — and `returned` is the one state that
 * could appraise. A presentation nobody can reach is a presentation nobody has checked.
 *
 * ⚠️ AND IT SCANS ATTRIBUTES, NOT JUST TEXT. A verdict hidden in an `aria-label` or a `title` is
 * still a verdict, and it is the one a sighted reviewer cannot see. The brief names those two and
 * sort labels specifically; this reads every attribute of every element.
 */
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import React from "react";
import { ScoutRow, returnedLine } from "./compsScoutRow";
import { CompSuggestion } from "../../lib/suggestComps";

const base: CompSuggestion = {
  title: "The Appeal", author: "Janice Hallett", publisher: "Viper", year: 2021,
  media: "book", matchAxis: "structure · tone",
  why: "Found-document storytelling with the same wry ensemble feel.",
  verification: { catalogue: "Google Books", checkedAt: "2026-08-21T10:00:00.000Z" },
};

const render = (s: CompSuggestion) =>
  renderToStaticMarkup(
    <ScoutRow s={s} onShelf={false} leaving={false} onAdd={() => {}} onDismiss={() => {}} />,
  );

/**
 * ⚠️ THE FORBIDDEN SET IS ABOUT THE WRITER'S BOOK, NOT ABOUT THE CATALOGUE. "Verified" and
 * "Matched on" are facts — one about the record, one about the query. "Strong fit", "87%", "Best
 * match", "Rank 1" are claims about how well a title suits a manuscript, which the Scout does not
 * and must not make.
 */
const VERDICT = /\b(score|scored|scoring|ranked|ranking|rank\s*#?\d|best\s+match|top\s+match|strong(est)?\s+fit|good\s+fit|poor\s+fit|close\s+match|recommended\s+for\s+you|suits?\s+your|ideal|perfect\s+match|\d{1,3}\s*%)/i;

describe("the Scout's returned state does not appraise", () => {
  it("a suggestion card renders no score, rank or fit language in its text", () => {
    const html = render(base);
    /* the card really rendered — a vacuous scan of an empty string passes every negative check */
    expect(html, "the suggestion card did not render").toContain("The Appeal");
    expect(html).toContain("Matched on");
    expect(html.replace(/<[^>]+>/g, " "), "the card states a verdict").not.toMatch(VERDICT);
  });

  it("…nor in any attribute — aria text, titles, or anything else", () => {
    const html = render(base);
    const attrs = [...html.matchAll(/\s[\w-]+="([^"]*)"/g)].map((m) => m[1]);
    expect(attrs.length, "no attributes found — the scan measured nothing").toBeGreaterThan(5);
    for (const v of attrs) {
      expect(v, `an attribute carries a verdict: "${v}"`).not.toMatch(VERDICT);
    }
  });

  it("…and carries no ordering or rank index at all", () => {
    /* ⚠️ THE CARD LOST ITS INDEX PROP IN v2 §4 and must not regain one. A visible position is an
       ordering, and an ordering the Scout did not earn reads as a ranking. */
    const html = render(base);
    expect(html, "a rank or position marker is back on the card").not.toMatch(/\bct-srow\b[^>]*>\s*<div[^>]*class="[^"]*idx/);
    expect(html).not.toContain("data-rank");
  });

  /**
   * ⚠️ MODEL TEXT PASSES THROUGH, AND THAT IS THE REAL EXPOSURE. `why` and `matchAxis` are free text
   * from the run. The component adds no verdict of its own — proved here by feeding it one — but it
   * cannot strip a verdict the model wrote. That is a contract for the PROMPT, not for this card,
   * and it is named in the report rather than papered over with a client-side filter that would give
   * false comfort about text nobody has validated.
   */
  it("the card adds no verdict of its own, even when the payload contains one", () => {
    const html = render({ ...base, why: "A strong fit for your manuscript — 92% match." });
    const chrome = html.replace(/A strong fit for your manuscript — 92% match\./, "");
    expect(chrome.replace(/<[^>]+>/g, " "), "the card's own chrome states a verdict").not.toMatch(VERDICT);
  });

  it("the returned status states when and how many, and nothing about quality", () => {
    const line = returnedLine("2026-08-21T10:00:00.000Z", 3);
    expect(line).toBe("Returned 21 Aug · 3 titles");
    expect(line).not.toMatch(VERDICT);
    /* singular agrees, and a malformed date loses the DATE and keeps the count */
    expect(returnedLine("2026-08-21T10:00:00.000Z", 1)).toBe("Returned 21 Aug · 1 title");
    expect(returnedLine("not-a-date", 2)).toBe("Returned · 2 titles");
  });
});
