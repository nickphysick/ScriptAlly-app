/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drawer cut 2 · §4 — the Agent tab is a view of the agent document: present fields render,
 * absent fields leave NOTHING behind, and the only figures are derived.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { QueryAgentTab, type AgentHistoryRow } from "./QueryAgentTab";
import { QueryStatus, SubmissionStatus, SubmissionMethod } from "../../types";

const agent = (over: Record<string, unknown> = {}) => ({
  id: "a1", userId: "u", name: "Priya Raman", agency: "Raman Literary",
  email: "priya@raman.co.uk", website: "raman.co.uk",
  country: "GB", city: "London",
  genres: [], mswlNotes: "Literary fiction with a strong sense of place.",
  submissionStatus: SubmissionStatus.OPEN, submissionMethod: SubmissionMethod.EMAIL,
  responseTimeWeeks: 6, noResponseMeansNo: true,
  materialsWanted: ["Query letter", "Synopsis"],
  dateAdded: "2026-01-01", lastCheckedDate: "2026-01-01", notes: "",
  ...over,
}) as never;

const rows: AgentHistoryRow[] = [
  { queryId: "q1", manuscriptTitle: "Murphy's Day Out", statusLine: "Partial Requested", when: "this query", isThisQuery: true, status: QueryStatus.PARTIAL_REQUESTED },
  { queryId: "q2", manuscriptTitle: "The Quiet House", statusLine: "Rejected", when: "Nov 2024", isThisQuery: false, status: QueryStatus.REJECTED },
];

const draw = (a = agent(), history = rows) =>
  renderToStaticMarkup(React.createElement(QueryAgentTab, { agent: a, history }));

describe("§4 · chips render only for present fields", () => {
  it("email, website and a URL social each get a chip; a bare handle stays plain text", () => {
    const html = draw(agent({ socials: [{ platform: "X / Twitter", handle: "https://x.com/priyareads" }, { platform: "Bluesky", handle: "@priya.bsky" }] }));
    expect(html).toContain("mailto:priya@raman.co.uk");
    expect(html).toContain('href="https://raman.co.uk"');
    expect(html).toContain('href="https://x.com/priyareads"');
    /* the bare handle is a fact with no address — rendering a link would invent one */
    expect(html).toMatch(/qat-actb--plain[^>]*>@priya\.bsky/);
  });

  it("an agent with no email, website or socials renders NO action row at all", () => {
    const html = draw(agent({ email: "", website: "", socials: [] }));
    expect(html).not.toMatch(/["\s]qat-acts["\s]/);
  });

  it("the wishlist block is absent for an agent with no MSWL", () => {
    expect(draw(agent({ mswlNotes: "" }))).not.toMatch(/["\s]qat-quote["\s]/);
    expect(draw(agent({ mswlNotes: "   " }))).not.toMatch(/["\s]qat-quote["\s]/);
    expect(draw()).toContain("Manuscript wishlist");
  });

  it("asks-for chips come from the one stored-materials reader", () => {
    const html = draw();
    /* the one reader's own display name — the stored token is "Query letter", the label is not */
    expect(html).toContain("Covering letter");
    expect(html).toContain("Synopsis");
    /* and the grey not-looking-for treatment SHIPS UNWORN — no model field feeds it */
    expect(html).not.toContain("qat-achip--no");
    const src = readFileSync(join(process.cwd(), "src/components/queries/QueryAgentTab.tsx"), "utf8");
    expect(src, "the asks bypass materialRowsFromAgent").toContain("materialRowsFromAgent(agent.materialsWanted)");
  });
});

describe("§4 · the four tiles state — when absent, and the count is derived", () => {
  it("absent window/method/silence read —, never an invented value", () => {
    const html = draw(agent({ responseTimeWeeks: undefined, submissionMethod: undefined, noResponseMeansNo: undefined }));
    const tiles = html.split('class="qat-tile"').length - 1;
    expect(tiles).toBe(4);
    expect((html.match(/>—</g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it("the your-queries tile equals the history rows handed in", () => {
    expect(draw()).toMatch(/>2<\/div><div class="qat-tk">your queries/);
    expect(draw(agent(), [])).toMatch(/>0<\/div><div class="qat-tk">your queries/);
  });

  it("silence distinguishes its three states — unstated is an origin, not a no", () => {
    expect(draw(agent({ noResponseMeansNo: true }))).toContain("Means no");
    expect(draw(agent({ noResponseMeansNo: false }))).toContain("Not a no");
    expect(draw(agent({ noResponseMeansNo: undefined }))).not.toContain("Means no");
  });
});

describe("§4 · history rows across manuscripts", () => {
  it("the state swatch is the query's own band class, and `this query` is marked", () => {
    const html = draw();
    expect(html).toMatch(/qat-sw qcc--s-in-1/);      /* Partial Requested */
    expect(html).toMatch(/qat-sw qcc--s-closed/);    /* Rejected */
    expect(html).toContain("this query");
    expect(html).toContain("Nov 2024");
  });

  it("the door pill uses the two-systems vocabulary — never a bare Closed", () => {
    expect(draw()).toContain("Open to submissions");
    expect(draw(agent({ submissionStatus: SubmissionStatus.CLOSED }))).toContain("Closed for submissions");
  });
});
