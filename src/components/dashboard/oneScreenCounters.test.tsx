/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Locks for the header counters card (ref design-refs/dashboard-v16.html, `.counters`).
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryStatus } from "../../types";
import { dailyLedger, headerCounters, queriesSentCount, sentAt } from "../../lib/oneScreen";
import { OneScreenCounters } from "./OneScreenCounters";

const cssRules = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/* ⚠️ THE BASE RULE, NOT THE FIRST MATCH. Several of these selectors are also overridden inside
   media queries, and a naive indexOf finds whichever comes first in the file — which for
   `.os-counters` is the 1440 override, so an assertion about the base rule silently tested the
   responsive one. Strip the media queries, then look. */
const baseCss = cssRules.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
/* ⚠️ ALL the base blocks for a selector, joined — `.os-greet` is legitimately declared twice
   (its grid placement, then its layout), so taking the first block tests half the rule. */
const rule = (sel: string) => {
  const out: string[] = [];
  for (let i = baseCss.indexOf(`${sel} {`); i > -1; i = baseCss.indexOf(`${sel} {`, i + 1)) {
    out.push(baseCss.slice(i, baseCss.indexOf("}", i)));
  }
  expect(out.length, `${sel} must exist as a BASE rule`).toBeGreaterThan(0);
  return out.join("\n");
};

const NOW = new Date(2026, 7, 7, 10, 0, 0);
const ago = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
const q = (o: Record<string, unknown> = {}) => ({ id: String(Math.random()), agentId: "a1", status: QueryStatus.QUERIED, ...o }) as any;
const ag = (n: number) => ({ id: String(Math.random()), name: "A", dateAdded: ago(n) }) as any;

describe("what counts as SENT — one predicate, two readers", () => {
  /* ⚠️ THE COUNTER AND THE CHART MUST NOT BE ABLE TO DRIFT. Both read `sentAt`, so this is an
     identity rather than two implementations that happen to agree today. */
  it("the counter equals the daily ledger's own total sends", () => {
    const queries = [q({ dateSent: ago(40) }), q({ dateSent: ago(3) }), q({}), q({ dateSent: "" })];
    const ledgerSends = dailyLedger(queries, NOW).reduce((n, d) => n + d.sent, 0);
    expect(queriesSentCount(queries)).toBe(2);
    expect(queriesSentCount(queries)).toBe(ledgerSends);
  });

  it("a draft with no send date is not sent — never counted by queries.length", () => {
    expect(sentAt(q({}))).toBeNull();
    expect(queriesSentCount([q({}), q({}), q({})])).toBe(0);
  });
});

describe("the three figures", () => {
  const queries = [
    q({ dateSent: ago(60) }),
    q({ dateSent: ago(40), status: QueryStatus.REJECTED, hasAgentResponded: true }),
    q({ dateSent: ago(10), status: QueryStatus.FULL_REQUESTED, hasAgentResponded: true }),
    q({ dateSent: ago(2) }),
    q({}), // a draft — on file, not sent
  ];
  const agents = [ag(90), ag(40), ag(5), ag(1)];

  it("figures: queries sent, agents on file, responses received", () => {
    const [sent, ags, res] = headerCounters(queries, agents, NOW);
    expect(sent).toMatchObject({ label: "Queries sent", n: 4 }); // the draft is excluded
    expect(ags).toMatchObject({ label: "Agents on file", n: 4 });
    expect(res).toMatchObject({ label: "Responses", n: 2 });
  });

  it("the chips: a rolling month of sends and of agents added", () => {
    const [sent, ags] = headerCounters(queries, agents, NOW);
    expect(sent.chip).toBe("↑ 2");  // 10 and 2 days ago
    expect(ags.chip).toBe("↑ 2");   // 5 and 1 days ago
  });

  /* ⚠️ THE RATE DIVIDES BY QUERIES SENT, not by every query on file. With 2 responses to 4 sends
     it is 50% — dividing by all 5 would report 40% and quietly punish the writer for a draft. */
  it("⚠️ the response rate is out of SENT, so a draft cannot drag it down", () => {
    const [, , res] = headerCounters(queries, agents, NOW);
    expect(res.chip).toBe("50%");
    const noDraft = headerCounters(queries.filter((x) => x.dateSent), agents, NOW);
    expect(noDraft[2].chip).toBe("50%"); // adding a draft changes nothing
  });
});

describe("empty and early states — a chip that reports nothing is omitted", () => {
  it("⚠️ zero everywhere: figures are 0 and EVERY chip is absent", () => {
    const cs = headerCounters([], [], NOW);
    expect(cs.map((c) => c.n)).toEqual([0, 0, 0]);
    for (const c of cs) expect(c.chip, c.key).toBeUndefined();
  });

  it("⚠️ never '↑ 0' and never '0%'", () => {
    // sends and agents exist, but all older than the window; no responses at all
    const cs = headerCounters([q({ dateSent: ago(200) })], [ag(200)], NOW);
    expect(cs[0]).toMatchObject({ n: 1 });
    expect(cs[0].chip).toBeUndefined();
    expect(cs[1].chip).toBeUndefined();
    expect(cs[2]).toMatchObject({ n: 0 });
    expect(cs[2].chip).toBeUndefined(); // no responses → no rate, not "0%"
  });

  it("the zero state renders 0s and no chips, without breaking", () => {
    const html = renderToStaticMarkup(<OneScreenCounters loading={false} queries={[]} agents={[]} now={NOW} />);
    expect(html).toContain("Queries sent");
    expect(html).toContain("Agents on file");
    expect(html).toContain("Responses");
    expect(html).not.toContain("os-cd"); // no chip elements at all
    expect((html.match(/class="os-counter"/g) ?? []).length).toBe(3);
  });
});

describe("the card's CSS", () => {
  it("takes the remaining width; three centred equal columns with hairline dividers", () => {
    const c = rule(".os-counters");
    expect(c).toContain("flex: 1");
    expect(c).toContain("min-width: 0");
    const col = rule(".os-counter");
    expect(col).toContain("flex: 1");
    expect(col).toContain("justify-content: center");
    expect(col).toContain("border-left: 1px solid");
    expect(cssRules).toContain(".os-counter:first-child { border-left: none; }");
  });

  /* ⚠️ READOUTS, NOT CONTROLS — a hover lift promises a click that does not happen. Asserted even
     though the card carries no `os-lift`, so adding the class later cannot re-arm it. */
  it("⚠️ the card does NOT lift on hover, even if given the lift class", () => {
    expect(cssRules).toContain(".os-card.os-counters:hover, .os-card.os-counters.os-lift:hover");
    expect(rule(".os-card.os-counters:hover, .os-card.os-counters.os-lift:hover")).toContain("transform: none");
  });

  it("the header is a centred flex row and the greeting sizes to its content", () => {
    const g = rule(".os-greet");
    expect(g).toContain("display: flex");
    expect(g).toContain("align-items: center");
    expect(g).toContain("gap: 32px");
    expect(rule(".os-greet .os-gl")).toContain("flex: 0 0 auto");
  });

  it("figures are Playfair with tabular numerals; the chip is sage", () => {
    const n = rule(".os-cn");
    expect(n).toContain("font-family: var(--font-serif)");
    expect(n).toContain("font-variant-numeric: tabular-nums");
    expect(rule(".os-cd")).toContain("#e9ede6");
  });

  /* ⚠️ THE STEPS MUST COME AFTER THE BASE RULES, not up in the page's responsive frame. Same
     specificity means SOURCE ORDER decides; parked earlier in the file they lost to the base
     rules and every step was silently dead — the icons still showed at 1200 while the h1 beside
     them had already stepped. Asserting the declarations exist is NOT enough; this asserts they
     can win. */
  it("responsive: figures shrink, icons go, the header stacks — and the steps can WIN", () => {
    expect(cssRules).toContain(".os-cn { font-size: 21px; }");
    expect(cssRules).toContain(".os-cic { display: none; }");
    expect(cssRules).toContain(".os-counters { width: 100%; margin-top: 4px; }");
    const base = cssRules.indexOf(".os-cic {");
    expect(base).toBeGreaterThan(-1);
    for (const step of [".os-cn { font-size: 21px; }", ".os-cic { display: none; }", ".os-counters { width: 100%; margin-top: 4px; }"]) {
      expect(cssRules.indexOf(step), step).toBeGreaterThan(base);
    }
  });

  /* ⚠️ the steps ride breakpoints the PAGE already has, so the card moves with the greeting
     beside it rather than on a ladder of its own — see the note at the rules */
  it("the steps ride the page's existing breakpoints, so the row moves as one", () => {
    const after = cssRules.indexOf(".os-cic {");
    for (const bp of ["1360", "1240", "1024"]) {
      expect(cssRules.indexOf(`@media (max-width: ${bp}px) {`, after), bp).toBeGreaterThan(-1);
    }
    // every one of them is a breakpoint the page ALREADY used before the counters existed
    for (const bp of ["1360", "1240", "1024"]) {
      expect(cssRules.indexOf(`@media (max-width: ${bp}px) {`), bp).toBeLessThan(after);
    }
    expect(cssRules).not.toContain("@media (max-width: 1440px)"); // the ref's step, not ours
  });
});
