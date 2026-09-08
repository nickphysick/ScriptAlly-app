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
import { cssRule } from "../../test/cssRule";

const cssRules = readFileSync(resolve(__dirname, "./oneScreen.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/* ⚠️ THE BASE RULE, NOT THE FIRST MATCH. Several of these selectors are also overridden inside
   media queries, and a naive indexOf finds whichever comes first in the file — which for
   `.os-counters` is the 1440 override, so an assertion about the base rule silently tested the
   responsive one. Strip the media queries, then look. */
const baseCss = cssRules.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
/* ⚠️ ALL the base blocks for a selector, joined — `.os-greet` is legitimately declared twice
   (its grid placement, then its layout), so taking the first block tests half the rule. */
/* the shared ANCHORED reader — its message claimed "BASE rule" while the search was a
   substring; see src/test/cssRule.ts */
const rule = (sel: string) => cssRule(baseCss, sel, "oneScreen.css");

const NOW = new Date(2026, 7, 7, 10, 0, 0);
const ago = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
const q = (o: Record<string, unknown> = {}) => ({ id: String(Math.random()), agentId: "a1", status: QueryStatus.QUERIED, ...o }) as any;
/* ⚠️ THE ID IS A PARAMETER SO A FIXTURE CAN BE MIXED. With every agent on a random id and every
   query on "a1", nothing is ever queried and the split chip has only one branch to report — a
   monoculture that passes while proving a third of the behaviour. */
const ag = (n: number, id?: string) => ({ id: id ?? String(Math.random()), name: "A", dateAdded: ago(n) }) as any;

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
  const agents = [ag(90, "a1"), ag(40), ag(5), ag(1)]; // one queried (every fixture query is on a1), three idle

  it("figures: queries sent, agents on file, responses received", () => {
    const [sent, ags, res] = headerCounters(queries, agents, NOW);
    expect(sent).toMatchObject({ label: "Queries sent", n: 4 }); // the draft is excluded
    expect(ags).toMatchObject({ label: "Agents on file", n: 4 });
    expect(res).toMatchObject({ label: "Responses", n: 2 });
  });

  /* ⚠️ THE TWO CHIPS ANSWER DIFFERENT QUESTIONS, AND ONLY ONE OF THEM IS A MOVEMENT (refdiff pass).
     Sends ask "what has changed" — a rolling-month count with the ▲ and the period named, because a
     bare "↑ 2" left the reader to work out of what and over how long. Agents ask "what is the shape
     of the list" — a SPLIT, which is not a change at all and therefore takes the ref's `.plain`
     capsule rather than the tinted one. Reading the agents chip as a recency count is the mistake
     this case exists to catch. */
  it("the chips: a rolling month of SENDS, and the agents' standing split", () => {
    const [sent, ags] = headerCounters(queries, agents, NOW);
    expect(sent.chip).toBe("↑ 2 this week");  // 10 and 2 days ago
    expect(sent.plain).toBeUndefined();
    expect(ags.chip).toBe("1 queried · 3 idle");
    expect(ags.plain).toBe(true);
  });

  /* ⚠️ THE CLAIM IS THE DENOMINATOR, NOT THE SPELLING — and the spelling has now changed twice.
     It has been "of 21" and it is "57% response rate" today, because the ref states a rate. What has
     never changed, and is the only thing worth locking, is WHAT IT DIVIDES BY: queries SENT, never
     every query on file. Dividing by all queries lets an unsent draft quietly make a writer's record
     look worse than it is — and it would visibly disagree with the "Queries sent" figure standing
     two cells to its left. So this asserts the arithmetic (2 of 4 → 50) and that a draft moves it
     not at all, rather than pinning a form of words a redesign is entitled to change. */
  it("⚠️ the denominator is queries SENT, so a draft cannot drag it down", () => {
    const [, , res] = headerCounters(queries, agents, NOW);
    expect(res.chip).toBe("50% response rate"); // 2 responses of 4 SENT — the draft is not counted
    const noDraft = headerCounters(queries.filter((x) => x.dateSent), agents, NOW);
    expect(noDraft[2].chip).toBe(res.chip); // removing the draft changes nothing
    /* the failing shape stated outright: divided by all 5 on file it would read 40% */
    expect(res.chip).not.toBe("40% response rate");
  });
});

describe("empty and early states — a chip that reports nothing is omitted", () => {
  it("⚠️ zero everywhere: figures are 0 and EVERY chip is absent", () => {
    const cs = headerCounters([], [], NOW);
    expect(cs.map((c) => c.n)).toEqual([0, 0, 0]);
    for (const c of cs) expect(c.chip, c.key).toBeUndefined();
  });

  /* ⚠️ THE OMISSION RULE APPLIES TO CHIPS THAT REPORT A MOVEMENT, AND THE SPLIT IS NOT ONE.
     "↑ 0 this week" and "0% response rate" both read as measurements of nothing, so both go. The
     agents chip is a standing description of the list — "0 queried · 1 idle" is a true and useful
     sentence about an account with one untouched agent, and suppressing it would leave the figure
     bare for exactly the reader who most needs telling what it is made of. Both halves are asserted
     together, because the interesting claim is that they differ. */
  it("⚠️ never '↑ 0' and never '0%' — but the split still speaks", () => {
    // sends and agents exist, but all older than the window; no responses at all
    const cs = headerCounters([q({ dateSent: ago(200) })], [ag(200)], NOW);
    expect(cs[0]).toMatchObject({ n: 1 });
    expect(cs[0].chip).toBeUndefined();
    expect(cs[1].chip).toBe("0 queried · 1 idle");
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
  /* ⚠️ RETARGETED (dashboard redesign, Phase 3) — THE CARD CAME OFF and the three stats sit on the
     page ground. The block still takes the remaining width; what changed is that the stats inside
     it shrink-wrap (`flex: 0 1 auto`) and the GROUP centres. Inside the card each took an equal
     third of a fixed box and filled it exactly, so `justify-content` had nothing to do — which is
     why "centred in the remaining width" needed the flex change to become a statement at all. */
  it("takes the remaining width; the three stats sit left, on the ref's OWN two gaps", () => {
    const r = rule(".os-counters");
    expect(r).toContain("flex: 1");
    expect(r).toContain("justify-content: flex-start");
    /* ⚠️ TWO GAPS, ONE PER REGIME — ref `.stats{gap:56px}` with `gap:36px!important` inside its
       `@media (max-width:1700px)`. The 36 was taken from the media block and applied at EVERY
       width, which is the ref's narrow value used wide; the same mistake as `.main`'s padding, two
       rules apart in the same sheet. Both are asserted, because pinning only the base would pass
       on a sheet that had lost the narrow step. */
    expect(r).toContain("gap: 56px");
    expect(cssRules).toMatch(/max-width:\s*1699px[\s\S]*?\.os-counters\s*\{[^}]*gap:\s*36px/);
  });

  /* ⚠️ READOUTS, NOT CONTROLS — a hover lift promises a click that does not happen. Asserted even
     though the card carries no `os-lift`, so adding the class later cannot re-arm it. */
  it("⚠️ the card does NOT lift on hover, even if given the lift class", () => {
    expect(cssRules).toContain(".os-card.os-counters:hover, .os-card.os-counters.os-lift:hover");
    expect(rule(".os-card.os-counters:hover, .os-card.os-counters.os-lift:hover")).toContain("transform: none");
  });

  /* ⚠️ RETARGETED: the ref's hero is a two-track GRID (`auto 1fr`), not a flex row. The difference
     is not cosmetic — in a flex row the stats took "whatever is left", so their left edge moved with
     the greeting's length; in the grid they have a track of their own and start where the design puts
     them whatever the writer is called. THE LAW IS THE TWO TRACKS, NOT THE GAP: v16 gapped them at 40
     and v22 at 28, and the geometry that decides which is right is measured against the ref by
     `scripts/dash-refdiff.mjs`, not read out of this file. Asserting a gap here would go red on every
     retune of a value this lock has no opinion about. */
  it("the hero is the ref's two-track grid, and the greeting sizes to its content", () => {
    const g = rule(".os-greet");
    expect(g).toContain("display: grid");
    expect(g).toContain("grid-template-columns: auto 1fr");
    expect(g).toMatch(/gap:\s*\d+px/);
    expect(g).toContain("align-items: center");
    expect(rule(".os-greet .os-gl")).toContain("flex: 0 0 auto");
  });

  it("figures are Playfair with tabular numerals; the chip is sage", () => {
    const n = rule(".os-cn");
    expect(n).toContain("font-family: var(--font-serif)");
    expect(n).toContain("font-variant-numeric: tabular-nums");
    expect(rule(".os-cd")).toContain("#e6ece3");
  });

  /* ⚠️ THE STEPS MUST COME AFTER THE BASE RULES, not up in the page's responsive frame. Same
     specificity means SOURCE ORDER decides; parked earlier in the file they lost to the base
     rules and every step was silently dead — the icons still showed at 1200 while the h1 beside
     them had already stepped. Asserting the declarations exist is NOT enough; this asserts they
     can win. */
  it("responsive: figures shrink, icons go, the header stacks — and the steps can WIN", () => {
    expect(cssRules).toContain(".os-cn { font-size: 21px; }");
    expect(cssRules).toContain(".os-cic { display: none; }");
    expect(cssRules).toContain(".os-counters { width: 100%; margin-top: 4px; justify-content: flex-start; }");
    const base = cssRules.indexOf(".os-cic {");
    expect(base).toBeGreaterThan(-1);
    for (const step of [".os-cn { font-size: 21px; }", ".os-cic { display: none; }", ".os-counters { width: 100%; margin-top: 4px; justify-content: flex-start; }"]) {
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
