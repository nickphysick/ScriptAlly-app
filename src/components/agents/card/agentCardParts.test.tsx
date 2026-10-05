/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * LOCK 4 (Contact list v13 §11.4), the source half: the carousel's cards ARE the agent card — the
 * identity and the three blocks come from `AgentCardParts`, which the quick view renders too, and
 * neither file writes that markup itself. The rendered half is contactV13 CL13-4.
 */
import { describe, it, expect } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Agent } from "../../../types";
import { SubmissionStatus } from "../../../types";
import { CardIdentity, GenresBlock, MaterialsBlock, WishlistBlock } from "./AgentCardParts";
import { AgentCarouselCard } from "./AgentCarouselCard";
import { agentFacts } from "../../../lib/contactList";
import { materialChips } from "../../../lib/agentCard";

const read = (p: string) => readFileSync(resolve(process.cwd(), "src/components/agents/card", p), "utf8");
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");
/* the block markup's own class names — a file that writes any of these has forked a block */
const BLOCK_CLASSES = ["acq-ini", "acq-gch", "acq-wish", "acq-mats", "acq-mat", "ac-torn"];
/* (`acq-lab` is not in the set: the quick view's own Notes section, which no other card has, labels with it too) */

const agent: Agent = {
  id: "a1", name: "Tom Ellery", agency: "Ellery & Finch", city: "London", genres: ["Thriller", "Crime"],
  mswlNotes: "Pacy crime with a strong sense of place.", materialsWanted: ["Query letter", "Synopsis"],
  responseTimeWeeks: 4, starRating: 5, submissionStatus: SubmissionStatus.OPEN, dateAdded: "2026-10-02T09:00:00Z",
} as Agent;

describe("lock 4 — one set of blocks, two dresses", () => {
  for (const file of ["AgentCarouselCard.tsx", "AgentQuickView.tsx"]) {
    it(`${file} imports the shared blocks and writes none of their markup`, () => {
      const src = code(read(file));
      expect(src).toMatch(/from "\.\/AgentCardParts"/);
      for (const name of ["CardIdentity", "GenresBlock", "WishlistBlock", "MaterialsBlock"]) expect(src, name).toContain(`<${name}`);
      for (const cls of BLOCK_CLASSES) expect(src, `${file} writes "${cls}" itself`).not.toMatch(new RegExp(`["\\s\`]${cls}["\\s\`]`));
    });
  }

  it("the carousel card renders the shared blocks' exact markup for the same agent", () => {
    const hit = (g: string) => g === "Thriller";
    const facts = agentFacts(agent, [], null);
    const card = renderToStaticMarkup(
      <AgentCarouselCard agent={agent} facts={facts} q={null} genreHit={hit} fitWord="thrillers" fits onOpen={() => {}} onAdd={() => {}} onAct={() => {}} />,
    );
    const genres = renderToStaticMarkup(<GenresBlock genres={["Thriller", "Crime"]} genreHit={hit} onAdd={() => {}} probe="cl13" />);
    const wish = renderToStaticMarkup(<WishlistBlock wish={agent.mswlNotes!} onAdd={() => {}} probe="cl13" />);
    const mats = renderToStaticMarkup(<MaterialsBlock mats={materialChips(agent.materialsWanted as string[])} label="Wants you to send" onAdd={() => {}} probe="cl13" />);
    expect(card).toContain(genres);
    expect(card).toContain(wish);
    expect(card).toContain(mats);
    expect(card).toContain('class="acq-ini"');
    /* the root is an agent card (`.ac`), so the card sheet's `.ac .acq-*` rules dress it */
    expect(card).toMatch(/^<article class="ac cl13-ac"/);
    /* one card on a page carries the heading id; a carousel of them never does */
    expect(card).not.toContain('id="ac-name"');
    /* …and no data-ac marker at all: those are the open card's probes */
    expect(card).not.toContain("data-ac=");
    /* the namespace is the ONLY difference between the two dresses of a block */
    const norm = (h: string) => h.replace(/data-(ac|cl13-blk)=/g, "data-x=");
    expect(norm(renderToStaticMarkup(<GenresBlock genres={[]} genreHit={hit} onAdd={() => {}} />)))
      .toBe(norm(renderToStaticMarkup(<GenresBlock genres={[]} genreHit={hit} onAdd={() => {}} probe="cl13" />)));
    expect(renderToStaticMarkup(<CardIdentity agent={agent} headingId="ac-name" />)).toContain('id="ac-name"');
  });
});
