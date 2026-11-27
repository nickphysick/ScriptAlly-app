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
    /* RE-POINTED by v1.2: tags in lines (two a line at the default width, at most two lines, then "+n") */
    expect(row(h, "three")).toMatch(/data-clr="glines" data-per="2" data-total="3" data-shown="3"/);
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
    /* RE-POINTED by v1.2: Query status takes the spare width; the › is a fixed 30 (22 below 980) */
    expect(css).toContain("grid-template-columns: 290px 90px minmax(0, 360px) 180px minmax(220px, 1fr) 30px;");
    expect(css).toMatch(/@container clr \(width < 1150px\) \{\s*\.cl26-card \.cl26-row, \.cl26-card \.cl26-th \{ grid-template-columns: 262px 72px minmax\(0, 300px\) 160px minmax\(196px, 1fr\) 30px; \}/);
    expect(css).toMatch(/@container clr \(width < 980px\) \{\s*\.cl26-card \.cl26-row, \.cl26-card \.cl26-th \{ grid-template-columns: 228px 64px minmax\(0, 1fr\) 138px 156px 22px; column-gap: 14px; \}/);
  });
});

import { sortFacts, HEADING_SORTS } from "../../../lib/contactList";
import { sections, sectionKind } from "../../../lib/contactV26";
import { FIND_AGENT } from "./ContactBar";

describe("Contact list rows v1 · Phase 3 — sorting and search", () => {
  const st = (id: string, stand: AgentFacts["stand"], status14: string, agent: Record<string, unknown> = {}) =>
    fx(id, { name: `Ann ${id}`, ...agent }, { stand, status14 } as Partial<AgentFacts>);
  it("the headings that sort: Agent, Fit, Response policy, Query status — and not Genres sought", () => {
    expect(HEADING_SORTS).toEqual(["surname", "rating", "reply", "status"]);
    const h = sheet([fx("a", { starRating: 3 })]);
    expect([...h.matchAll(/data-clr-h="(\w+)"[^>]*>\s*<button[^>]*data-key="(\w+)"/g)].map((m) => `${m[1]}:${m[2]}`)).toEqual(["agent:surname", "fit:rating", "policy:reply", "status:status"]);
    expect(h).toMatch(/data-clr-h="agent"[^>]*aria-sort="ascending"/);
    expect(h).toMatch(/data-clr-h="genres"[^>]*><span data-clr-hl/);
  });
  it("Fit is disabled, and says why, while no agent is rated", () => {
    expect(sheet([fx("a")])).toMatch(/data-key="rating" disabled="" title="Fit sorts once you’ve rated your agents"/);
    expect(sheet([fx("a", { starRating: 2 })])).not.toMatch(/data-key="rating" disabled/);
  });
  it("Query status: your move first (furthest along first), then the rest by furthest along, closed last; reversed turns the whole key", () => {
    const xs = [st("pass", "closed", "closed"), st("nq", "none", "none"), st("wait", "agent", "queried"), st("fsent", "agent", "fs"),
      st("nudge", "you", "queried"), st("part", "you", "pr"), st("full", "you", "fr")];
    expect(sortFacts(xs, "status").map((x) => x.agent.id)).toEqual(["full", "part", "nudge", "fsent", "wait", "nq", "pass"]);
    expect(sortFacts(xs, "status", true).map((x) => x.agent.id)).toEqual(["pass", "nq", "wait", "fsent", "nudge", "part", "full"]);
  });
  it("grouped by letter, a Fit sort draws rating sections and a status sort keeps your move's run apart", () => {
    expect(sectionKind("letter", "rating")).toBe("fit");
    const r = [fx("a", { starRating: 5 }), fx("b", { starRating: 5 }), fx("c", { starRating: 2 }), fx("d")];
    expect(sections(r, "letter", "rating").map((s) => `${s.label}:${s.ids.join("")}`)).toEqual(["5 stars:ab", "2 stars:c", "Not rated:d"]);
    /* RE-POINTED by v1.2 (5.2): one Queried section, never two, the nudge due first within it */
    const q = sortFacts([st("w", "agent", "queried"), st("n", "you", "queried"), st("f", "agent", "fs")], "status");
    expect(sections(q, "letter", "status").map((s) => `${s.key}:${s.ids.join("")}`)).toEqual(["t:queried:nw", "t:fs:f"]);
  });
  it("the search reads Filter by name or agency, and this page hides the \"/\" hint", () => {
    expect(FIND_AGENT).toBe("Filter by name or agency");
    expect(read("./contactListRows.css")).toContain('.cl27 [data-cl26="find"] kbd { display: none; }');
  });
});

describe("Contact list rows v1.2 · Phase 1 — the pin", () => {
  it("the heading row is the pin, inside the frame; the cap is retired; its top is read off the filter panel", () => {
    const src = read("./ContactSheet26.tsx");
    expect(src).toContain('<div className="cl26-th cl26-pin" role="row" data-cl26="heads"');
    expect(src).not.toMatch(/className="cl26-pin clq-cap"|data-clq="cap"/);
    expect(src).toContain('const t = getComputedStyle(rail).top;');
    const css = read("./contactListRows.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toContain("position: sticky; top: var(--clr-th-top, 12px);");
    expect(css).toContain("--clr-head-bg: #d3deea; --clr-head-ink: #1f2c40; --clr-head-edge: #b9c9da;");
  });
});

import { GenreLines, FitRater } from "./ContactRowParts";
describe("Contact list rows v1.2 · Phase 2 — the cells", () => {
  const lines = (n: number, per: 1 | 2 | 3) => renderToStaticMarkup(
    <GenreLines genres={Array.from({ length: n }, (_, i) => `G${i}`)} hit={(g) => g === "G3"} word={(g) => g} per={per} />);
  const count = (h: string) => [...h.matchAll(/data-clr="gline">([\s\S]*?)<\/span><\/span>|data-clr="gline">/g)].length;
  it("lines of per, at most two, the book's genre first, +n on the last line only", () => {
    const h = lines(5, 2);
    expect(count(h)).toBe(2);
    expect(h).toMatch(/data-shown="4"/);
    expect(h.indexOf("G3")).toBeLessThan(h.indexOf("G0"));
    expect(h.match(/data-clr="more" data-n="1">\+1</g)).toHaveLength(1);
    expect(h.lastIndexOf('data-clr="gline"')).toBeLessThan(h.indexOf('data-clr="more"'));
    expect(lines(5, 3)).toMatch(/data-shown="5"/);
    expect(lines(5, 3)).not.toContain('data-clr="more"');
    expect(lines(5, 1)).toMatch(/data-shown="2"[\s\S]*data-clr="more" data-n="3"/);
  });
  it("no \"!\" on the initials; the disc keeps navy / dotted / stone", () => {
    const src = read("./ContactSheet26.tsx");
    expect(src).not.toContain("cl26-bang");
    expect(read("./contactV26.css")).toMatch(/\.cl26-dsc--none \{ background: #fff; color: #2a3a52; border: 1\.5px dotted #2a3a52; \}/);
  });
  it("the rater: the dash, five radio stars, the page's setter", () => {
    const h = renderToStaticMarkup(<FitRater name="Ann" onRate={noop} />);
    expect(h).toContain('data-clr="unrated"');
    expect(h.match(/data-clr="rate-star"/g)).toHaveLength(5);
    expect(h).toMatch(/role="radiogroup" aria-label="Rate Ann’s fit"/);
    expect(read("../AgentList.tsx")).toContain("onRate={(id, n) => { const ag = agents.find((x) => x.id === id); if (ag) void editKitFor(ag).save({ rating: n }); }}");
  });
});

describe("Contact list rows v1.2 · Phase 3 — the status and its action", () => {
  it("the status cell: the resting stack, then the action in the same place; the end cell: the touch action, then the ›", () => {
    const src = read("./ContactSheet26.tsx");
    expect(src).toMatch(/<span className="clr-rest" data-clr="rest">[\s\S]*?<button type="button" className="clr-act" data-clr="act"/);
    expect(src).toMatch(/<button type="button" className="clr-act clr-act-end" data-clr="act-end"[\s\S]*?<span className="clr-chev" data-clr="chev-mark" aria-hidden="true">›<\/span>/);
    expect(src).not.toMatch(/data-ym=/);
  });
  it("the swap is the mouse's; with no hover the action is at the row's end; reduced motion is opacity only", () => {
    const css = read("./contactListRows.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toContain(".cl26-card .cl26-row:hover .cl26-q[data-has] > .clr-rest, .cl26-card .cl26-row:focus-within .cl26-q[data-has] > .clr-rest { opacity: 0; transform: translateY(-4px); }");
    expect(css).toMatch(/@media \(hover: none\) \{[\s\S]*?\.cl26-card \.cl26-chev\[data-has\] > \.clr-act-end \{ display: inline-flex; \}/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.cl26-card \.clr-rest, \.cl26-card \.cl26-q > \.clr-act \{ transition: opacity \.2s ease; transform: none !important; \}/);
    expect(css).not.toMatch(/--sp-rust/);
  });
  it("one set of action words: the agent card's are the query card's", () => {
    const v24 = readFileSync(new URL("../../../lib/contactV24.ts", import.meta.url), "utf8");
    expect(v24).toContain('"Mark partial sent": "Send your partial", "Mark full sent": "Send your full", "Mark revision sent": "Send your revision"');
    const card = readFileSync(new URL("../../../lib/agentCard.ts", import.meta.url), "utf8");
    expect(card).not.toMatch(/"Send the partial"|"Send the full"|"Send a nudge"|"Send the new version"/);
    /* the mounted card's foot button (lib/agentCardV2 acFoot) */
    const v2 = readFileSync(new URL("../../../lib/agentCardV2.ts", import.meta.url), "utf8");
    expect(v2).toContain('label: full ? "Send your full" : "Send your partial"');
  });
});

describe("Contact list rows v1.2.1 · Phase 1 — nothing scrolls above the pinned headings", () => {
  it("one opaque cap owned by the pin: from the scroller's top to the heading's top, across the card and its rim", () => {
    const css = read("./contactListRows.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).toContain("top: calc(-1 * var(--clr-th-top, 12px)); height: var(--clr-th-top, 12px);");
    expect(css).toMatch(/\.cl26-card \.cl26-th::before \{\s*content: ""; position: absolute; left: -14px; right: -14px;/);
    expect(css).toContain(".cl26-card .cl26-frame.cl26-frame { overflow: visible; }");
    /* the light bar stacks with the page, under the cap */
    expect(css).toContain(".cl27 .qc153-main > .qc154-tbw.qc154-tbw { position: relative; top: auto; z-index: auto; }");
    /* never a second sticky element racing the first */
    expect((css.match(/position: sticky/g) ?? []).length).toBe(1);
  });
});
