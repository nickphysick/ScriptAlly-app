/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The card face — the claims Phase 2 makes about it (design authority: contact-list-v5.html).
 *
 * ⚠️ THE GEOMETRIC CLAIM IS NOT HERE, AND THAT IS DELIBERATE. "The wishlist clears the footer" is
 * a fact about a rendered page, and this repo's tests run in `environment: "node"` — no jsdom, no
 * layout. A source lock asserting `flex: 1` would prove the rule was WRITTEN, never that the
 * browser did anything with it, and this repo has already paid for that distinction: a locked
 * `flex: 0 0 auto` passed for months over a declaration the browser was discarding, about a class
 * no component rendered. That claim lives in `tests/e2e/contactCard.measure.ts`, over a real
 * build, at two real widths.
 *
 * What CAN be settled here is what the card is made of, and it is asserted against the RENDERED
 * markup rather than the source wherever the claim is about output.
 */
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { AgentCard, WISHLIST_EMPTY } from "./AgentCard";
import { CONTACT_FIXTURE_AGENTS, CONTACT_FIXTURE_QUERIES, FIXTURE_GENRE } from "./contactFixture";
import { stripComments } from "../../lib/styleWiring";
import { matchGenre } from "../../lib/genreMatch";

const css = readFileSync(new URL("./agentList.css", import.meta.url), "utf8");
const source = readFileSync(new URL("./AgentCard.tsx", import.meta.url), "utf8");
const A = CONTACT_FIXTURE_AGENTS;
const byId = (id: string) => A.find((a) => a.id === id)!;

const draw = (id: string, tint: string | null = matchGenre(FIXTURE_GENRE)) =>
  renderToStaticMarkup(
    <AgentCard
      agent={byId(id)}
      queries={CONTACT_FIXTURE_QUERIES}
      matchGenre={tint}
      onOpen={() => {}}
      onEdit={() => {}}
      onPeek={() => {}}
      onLogQuery={() => {}}
    />,
  );

describe("the card face — what it is made of", () => {
  it("renders every agent in the fixture without throwing", () => {
    for (const a of A) expect(draw(a.id).length, a.name).toBeGreaterThan(200);
  });

  it("the band states their door in words, both ways round", () => {
    expect(draw("fx-long")).toContain("Open to queries");
    expect(draw("fx-shut")).toContain("Closed to queries");
  });

  it("the two sections are the ref's, in order", () => {
    const html = draw("fx-long");
    expect(html).toContain("Genres sought");
    expect(html).toContain("Manuscript wishlist");
    expect(html.indexOf("Genres sought")).toBeLessThan(html.indexOf("Manuscript wishlist"));
  });

  /* ⚠️ THE PAGE IS REFERENCE DATA. Attention, progress and urgency belong to the To-do board and
     the Query Centre; a fact with two homes is two facts that will eventually disagree. Asserted
     over RENDERED output, so a status device cannot arrive through a child component. */
  it("carries NO status dot, relationship pill or history line", () => {
    for (const a of A) {
      const html = draw(a.id);
      expect(html, `${a.name}: a StatusDot reached the card`).not.toMatch(/sd-|StatusDot|status-dot/);
      for (const gone of ["Active queries", "No active queries", "Never queried", "Your history"]) {
        expect(html, `${a.name}: "${gone}" reached the card`).not.toContain(gone);
      }
    }
  });

  it("an absent wishlist says so in the card's own voice", () => {
    expect(draw("fx-none")).toContain(WISHLIST_EMPTY);
    expect(draw("fx-long")).not.toContain(WISHLIST_EMPTY);
  });

  /* the tint's BOTH branches — a lock that only saw matches would pass on a card that tinted
     everything, which is exactly what the harness account's single-genre data would have done */
  it("tints only the manuscript's genre, and nothing when there is no manuscript in scope", () => {
    const matched = draw("fx-long");
    expect(matched, "the matching chip lost its tint").toContain("agl-chip agl-chip-match");
    expect(matched.match(/agl-chip-match/g)!.length, "more than one chip tinted — only the manuscript's genre matches").toBe(1);
    expect(draw("fx-fresh"), "an agent seeking none of the manuscript's genres tinted anyway").not.toContain("agl-chip-match");
    expect(draw("fx-long", null), "the tint survived a null match — null means no claim").not.toContain("agl-chip-match");
  });

  it("the footer names the field the app stores — Submissions page, never 'website'", () => {
    const html = draw("fx-long");
    expect(html).toContain("Submissions page");
    expect(html, "the card went back to calling one field two things").not.toContain("View website");
  });

  /* ⚠️ THE DISABLED GRAMMAR IS THE FULL ONE, and it is `[disabled]` doing it rather than a second
     class — the sheet already carries paper fill, hairline, faint text and not-allowed there. A
     `.agl-btn-off` beside it would be a second mechanism for one state. */
  it("a shut door disables Log query, and the sheet gives it the full disabled grammar", () => {
    expect(draw("fx-shut")).toMatch(/<button[^>]*disabled[^>]*>Log query/);
    expect(draw("fx-long")).not.toMatch(/<button[^>]*disabled[^>]*>[^<]*Log query/);
    const off = /\.aglist \.agl-btn\[disabled\] \{([^}]*)\}/.exec(stripComments(css))?.[1] ?? "";
    expect(off).not.toBe("");
    expect(off).toContain("cursor: not-allowed");
    expect(off).toContain("var(--agl-hair)");
  });

  /* ⚠️ THE DIM'S CARVE-OUT — the case the ref does not draw. Both of its closed agents are
     terminal, so it never shows a shut door over a live query and its unconditional
     `.closed { opacity }` is silent rather than authoritative. `agentCardDims` decides it. */
  it("a closed door with a LIVE query does not dim; with nothing live it does", () => {
    expect(draw("fx-shut"), "closed, nothing live — must dim").toContain("s-dim");
    expect(draw("fx-shut-live"), "closed WITH a live query — an outstanding full does not matter less because the agency shut its doors").not.toContain("s-dim");
    expect(draw("fx-long"), "an open door dimmed").not.toContain("s-dim");
  });
});

describe("the wishlist box is told how much room it may TAKE, never how tall to BE", () => {
  const decl = stripComments(css);
  /* ⚠️ ANCHORED AT A LINE START. A bare `.agl-wish {` also matches the tail of any longer
     selector ending in it, and a first-match slice then reads a block that is not the subject —
     the fault this repo has recorded four times, twice on reads and twice on removals. */
  const rule = (sel: string) => {
    const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`).exec(decl)?.[1] ?? "";
  };

  /* the SOURCE half of the claim; the browser half is in tests/e2e/contactCard.measure.ts */
  it("the section and its box both grow and both may shrink to nothing", () => {
    const wish = rule(".aglist .agl-wish");
    expect(wish).not.toBe("");
    expect(wish).toContain("flex: 1");
    expect(wish, "a min-height yields; a height does not — this is the fixed height that painted a wishlist through the footer").toContain("min-height: 64px");
    expect(wish, "a fixed height came back").not.toMatch(/[^-]height:\s*\d/);
    const wrap = rule(".aglist .agl-mswlwrap");
    expect(wrap).toContain("flex: 1");
    expect(wrap).toContain("min-height: 0");
  });

  it("the body clips, as the second line of defence behind it", () => {
    expect(rule(".aglist .agl-body")).toContain("overflow: hidden");
  });

  /* ⚠️ ONE ANSWER, TWO CONSUMERS. The fade and the drift both ask `hasMoreToRead`, so a card can
     never show a "there is more" fade over a wishlist that will not move. */
  it("the fade and the drift share one derivation", () => {
    expect(source).toContain("hasMoreToRead(el.scrollHeight, el.clientHeight)");
    expect(decl, "the fade stopped being conditional — every card would wear one").toContain(".agl-mswlwrap.agl-more::after");
  });

  /* ⚠️ REDUCED MOTION GETS A SCROLLER, NOT A FROZEN BOX — a preference about ANIMATION must never
     become a reduction in what can be read. Asserted in BOTH directions, because a check that
     only sees the suppression passes on a page where the words became unreachable. */
  it("reduced motion suppresses the drift and keeps the wishlist readable", () => {
    expect(source, "the drift ignores the preference").toContain('matchMedia?.("(prefers-reduced-motion: reduce)")');
    /* ⚠️ THE SHEET HAS MORE THAN ONE REDUCED-MOTION BLOCK, so a first-match slice reads the wrong
       one and reports about a rule that is not the subject. Select the block that names the
       wishlist, and assert there is exactly one such block to select. */
    const blocks = [...decl.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)]
      .map((m) => m[1]).filter((b) => b.includes("agl-mswl"));
    expect(blocks.length, "no reduced-motion block mentions the wishlist").toBe(1);
    expect(blocks[0], "the words stopped being reachable under reduced motion").toContain("overflow-y: auto");
  });
});

/**
 * ⚠️ ONE BASE RULE PER SELECTOR — and this sweep earned its place on its first run.
 *
 * It caught `.agl-door`: the card's new door pill and the EDITOR's segmented door control, one
 * name, two rules. The editor's is later in the file, so at equal specificity it would have won
 * and the pill would have rendered as a full-width 999px flex row with an ink border — from a
 * declaration that reads perfectly correctly at its own site. It caught `.agl-empty` the same way.
 *
 * The cascade takes the LAST base rule; a person reading top-down takes the FIRST. Where a
 * selector is declared twice those are different blocks, and every reasonable-looking action on
 * the earlier one is spent.
 */
describe("agentList.css declares each selector once", () => {
  it("no base selector in this sheet has two rules", () => {
    const found = [...stripComments(css).matchAll(/(?:^|\n)(\.aglist \.[a-z0-9-]+)\s*\{/g)].map((m) => m[1]);
    expect(found.length, "the sweep matched nothing — it would pass on any file").toBeGreaterThan(40);
    const seen = new Map<string, number>();
    for (const sel of found) seen.set(sel, (seen.get(sel) ?? 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([sel]) => sel)).toEqual([]);
  });
});
