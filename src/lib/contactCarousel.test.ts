/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * contactCarousel — Contact list v13 §3–4: the three sets and the three figure sets, each as a
 * SEQUENCE OF NAMES (an order claim is never a count), over a cast built in an order that is none
 * of the orders under test.
 */
import { describe, it, expect } from "vitest";
import type { Agent } from "../types";
import { SubmissionStatus } from "../types";
import { carouselSet, figureSet, RECENT_N } from "./contactCarousel";
import { stripFacts } from "./contactStrip";

const NOW = Date.UTC(2026, 9, 15, 12);
const ag = (name: string, p: Partial<Agent>): Agent => ({
  id: name, name, agency: `${name} Agency`, genres: [], submissionStatus: SubmissionStatus.OPEN,
  dateAdded: "2026-01-10T10:00:00.000Z", ...p,
} as Agent);
/* alphabetical by name, which is none of the orders under test */
const CAST = [
  ag("Ada", { genres: ["Thriller"], starRating: 3, dateAdded: "2026-10-03T09:00:00Z" }),
  ag("Bea", { genres: ["Thriller"], starRating: 5, dateAdded: "2026-03-01T09:00:00Z" }),
  ag("Cal", { genres: ["Crime"], starRating: 4, dateAdded: "2026-10-12T09:00:00Z" }),
  ag("Dot", { genres: ["Thriller"], starRating: 4, submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-12-01", dateAdded: "2026-09-01T09:00:00Z" }),
  ag("Eli", { genres: ["Thriller"], starRating: 5, dateAdded: "2026-08-01T09:00:00Z" }),
  ag("Fay", { submissionStatus: SubmissionStatus.CLOSED, dateAdded: "2026-07-01T09:00:00Z" }),
  ag("Gus", { genres: ["Thriller"], starRating: 2, submissionStatus: SubmissionStatus.CLOSED, reopensOn: "2026-11-01", dateAdded: "2026-10-08T09:00:00Z" }),
];
const QUERIED = new Set(["Eli"]);
const X = { agents: CAST, queried: (a: Agent) => QUERIED.has(a.id), msGenre: "Thriller", nowMs: NOW };
const names = (xs: Agent[]) => xs.map((a) => a.name);

describe("the selector's sets", () => {
  it("Best fits: fit the book, open, not queried — by rating, then name", () => {
    expect(names(carouselSet("fit", X))).toEqual(["Bea", "Ada"]);
  });
  it("Recently added: the last eight by dateAdded, newest first", () => {
    expect(names(carouselSet("new", X))).toEqual(["Cal", "Gus", "Ada", "Dot", "Eli", "Fay", "Bea"]);
    const many = Array.from({ length: 12 }, (_, i) => ag(`N${i}`, { dateAdded: new Date(NOW - i * 86_400_000).toISOString() }));
    expect(carouselSet("new", { ...X, agents: many })).toHaveLength(RECENT_N);
  });
  it("Reopening soon: closed agents, soonest reopensOn first, undated last", () => {
    expect(names(carouselSet("reopen", X))).toEqual(["Gus", "Dot", "Fay"]);
  });
});

describe("the figures' sets — and each count IS its figure", () => {
  it("Fit your book: every fit, not-queried first, then rating", () => {
    expect(names(figureSet("fit", X))).toEqual(["Bea", "Dot", "Ada", "Gus", "Eli"]);
    expect(figureSet("fit", X)).toHaveLength(stripFacts(CAST, "Thriller", NOW).fit);
  });
  it("Open now: every open agent, ordered the same way", () => {
    expect(names(figureSet("open", X))).toEqual(["Bea", "Cal", "Ada", "Eli"]);
    expect(figureSet("open", X)).toHaveLength(stripFacts(CAST, "Thriller", NOW).open);
  });
  it("Added this month: newest first", () => {
    expect(names(figureSet("added", X))).toEqual(["Cal", "Gus", "Ada"]);
    expect(figureSet("added", X)).toHaveLength(stripFacts(CAST, "Thriller", NOW).addedThisMonth);
  });
});
