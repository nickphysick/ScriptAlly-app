/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1 — the row's cells, from the rendered markup and the helpers' own answers. Geometry (the columns'
 * widths, centring, hover) is not claimed here: it is measured on the rendered page, tests/e2e/contactListRows.measure.ts.
 */
import { describe, expect, it } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { ContactSheet26, abroadOf, policyWords, replyWindowWords } from "./ContactSheet26";
import { emptyContactFilters, type AgentFacts } from "../../../lib/contactList";

const read = (f: string) => readFileSync(new URL(f, import.meta.url), "utf8");
const noop = () => {};
const fx = (id: string, agent: Record<string, unknown> = {}, o: Partial<AgentFacts> = {}): AgentFacts => ({
  agent: { id, name: `Ann ${id}`, agency: `${id} Literary`, ...agent } as AgentFacts["agent"], stand: "none", standing: { kind: "none" },
  status14: "none", genres: [], gaps: 0, door: "open", openKey: "open", q: null, loc: "London", ...o,
} as unknown as AgentFacts);
const sheet = (pool: AgentFacts[]) => renderToStaticMarkup(
  <ContactSheet26 pool={pool} all={pool} group="none" sortKey="surname" reversed={false} onSort={noop} filters={emptyContactFilters()}
    onFilters={noop} onClearAll={noop} search="" onSearch={noop} genreWord={(g) => g} genreHit={() => false} openId={null} onOpen={noop}
    onExport={noop} gapsOf={() => null} onFill={noop} onClearFilters={noop} homeCountry="GB" onAddDetail={noop} />);
const row = (h: string, id: string) => h.slice(h.indexOf(`data-id="${id}"`), h.indexOf('data-clr="chev"', h.indexOf(`data-id="${id}"`)));

describe("Contact list rows v1 · Phase 1 — the columns and cells", () => {
  it("the headings: Agent · Fit · Genres sought · Response policy · Query status, each with its short word where it has one", () => {
    const h = sheet([fx("a")]);
    expect([...h.matchAll(/data-clr-h="(\w+)"/g)].map((m) => m[1])).toEqual(["agent", "fit", "genres", "policy", "status"]);
    expect(h).toContain('<span data-clr-hl="l">Genres sought</span><span data-clr-hl="s">Genres</span>');
    expect(h).toContain('<span data-clr-hl="l">Response policy</span><span data-clr-hl="s">Response</span>');
    expect(h).not.toContain("What they want");
  });
  it("every row: six cells in the headings' order", () => {
    const h = sheet([fx("a"), fx("b", { genres: ["Crime"] })]);
    for (const id of ["a", "b"]) expect([...row(h, id).matchAll(/role="cell"[^>]*data-clr="(\w+)"/g)].map((m) => m[1])).toEqual(["agent", "fit", "genres", "policy", "status"]);
  });
  it("the agency line is the agency alone; a flag only abroad, titled city and country", () => {
    const h = sheet([fx("home", { city: "Leeds", country: "GB" }), fx("away", { city: "New York", country: "US" }), fx("bare", { country: "United States" })]);
    expect(row(h, "home")).toContain('<span data-cl26="agency" title="home Literary">home Literary</span></small>');
    expect(row(h, "home")).not.toMatch(/Leeds|London|data-clr="flag"/);
    expect(row(h, "away")).toMatch(/class="clr-flag fi fi-us" data-clr="flag" role="img" title="New York, United States"/);
    expect(row(h, "bare")).toMatch(/data-clr="flag" role="img" title="United States"/);
    expect(abroadOf({ country: "GB", city: "Leeds" }, "GB")).toBeNull();
    expect(abroadOf({ country: "", city: "Paris" }, "GB")).toBeNull();
    expect(abroadOf({ country: "IE", city: "Dublin" }, "GB")?.title).toBe("Dublin, Ireland");
  });
  it("Fit is the writer's stars, out of the name line; unrated is a quiet dash titled Not rated yet", () => {
    const h = sheet([fx("r", { starRating: 4 }), fx("u")]);
    expect(row(h, "r")).toMatch(/data-clr="fit"[^>]*><span class="clp2-fit"[^>]*data-n="4"/);
    expect(row(h, "r")).not.toContain("clp2-nl");
    expect(row(h, "u")).toContain('<span class="clr-dash" data-clr="unrated" role="img" title="Not rated yet" aria-label="Not rated yet">–</span>');
  });
  it("Genres sought: at most two pills then +n; none on file is \"+ Add genres\", never \"No genres yet\"", () => {
    const h = sheet([fx("three", { genres: ["Crime", "Noir", "Gothic"] }), fx("none")]);
    expect(row(h, "three")).toMatch(/data-total="3" data-shown="2"/);
    expect(row(h, "none")).toContain('<button type="button" class="clr-add" data-clr="add" data-k="genres">+ Add genres</button>');
    expect(h).not.toContain("No genres yet");
  });
  it("Response policy: Up to n weeks (1 week), or + Add reply time; the policy line only when recorded", () => {
    expect([replyWindowWords(1), replyWindowWords(8), replyWindowWords(0), replyWindowWords(undefined)]).toEqual(["Up to 1 week", "Up to 8 weeks", null, null]);
    expect([policyWords(false), policyWords(true), policyWords(undefined)]).toEqual(["Always replies", "No response means no", null]);
    const h = sheet([fx("w", { responseTimeWeeks: 6, noResponseMeansNo: true }), fx("n")]);
    expect(row(h, "w")).toContain('<b>Up to 6 weeks</b><small data-clr="policy-line">No response means no</small>');
    expect(row(h, "n")).toContain('data-k="reply">+ Add reply time</button></b></span>');
  });
  it("the columns are the card's container query, fixed widths, spare width last — never fr shares between columns", () => {
    const css = read("./contactListRows.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toContain(".cl26-card { container: clr / inline-size; }");
    expect(css).toContain("grid-template-columns: 290px 90px minmax(0, 360px) 180px 220px minmax(24px, 1fr);");
    expect(css).toMatch(/@container clr \(width < 1150px\) \{\s*\.cl26-card \.cl26-row, \.cl26-card \.cl26-th \{ grid-template-columns: 262px 72px minmax\(0, 300px\) 160px 196px minmax\(20px, 1fr\); \}/);
    expect(css).toMatch(/@container clr \(width < 980px\) \{\s*\.cl26-card \.cl26-row, \.cl26-card \.cl26-th \{ grid-template-columns: 228px 64px minmax\(0, 1fr\) 138px 156px 16px; column-gap: 14px; \}/);
  });
});
