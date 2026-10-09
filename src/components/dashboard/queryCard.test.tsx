/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The query card — what opens it, and what it says at the end of the story.
 *
 * ⚠️ THE MODEL IS THE SUBJECT, NOT THE MARKUP. `QueryPeekLive` reaches Firebase and cannot be
 * rendered here (`environment: 'node'`, no emulator), and `QueryPeek` itself portals to
 * `document.body`, which does not exist either. What these assert is the two decisions a reader
 * would notice if they were wrong: which rows offer a glance at all, and whether the story ends by
 * telling the writer they owe something.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { existsSync } from "node:fs";
import { stripComments } from "../../test/pageSmoke";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => stripComments(readFileSync(resolve(here, rel), "utf8"));

/* ⚠️ RETIRED WITH THE FEED CARD (Dashboard v58): "what opens a card" and "the story's last line"
   read `OneScreenFeed` and `QueryCardLive`, the dashboard's peek. The feed is a drawer now and has
   no peek; both files are deleted. The shared card and its host/anchor seam below are untouched. */

/**
 * ⚠️ THE ONE SEAM, AND THAT IT IS ADDITIVE (v21 §5, 21 Sep).
 *
 * The Query Centre's fan deals this card inside a modal, so it needed the card to stop being a
 * popover — to render in place, and to install none of the document-level handlers that would put
 * twelve competing Escape listeners on one page. The ruling was to EXTEND rather than fork, so what
 * is asserted here is that the extension is a single concept and that every existing caller is
 * untouched by it: the anchored behaviour is still conditional on an anchor, and the popover's own
 * words are still the default.
 *
 * The suite reads source rather than rendering — `createPortal` needs a `document` this runner does
 * not have — which is the same reason the cases above read the feed.
 */
describe("⚠️ placed by a host, or anchored: one seam, and every existing caller is unchanged", () => {
  const card = read("QueryCard.tsx");

  it("the anchor is what decides it — placement, the portal and the dismissal together", () => {
    /* the hook only runs when there is something to anchor to */
    expect(card).toContain("useFixedMenu<HTMLElement>(!!anchor,");
    /* no anchor: no document-level listeners at all */
    expect(card).toContain("if (!anchor || !onClose) return undefined;");
    /* no anchor: rendered in place rather than portalled */
    expect(card).toContain("return anchor ? createPortal(card, document.body) : card;");
    /* …and it stops calling itself a dialog when it is not one */
    expect(card).toContain('role={anchor ? "dialog" : "group"}');
  });

  it("⚠️ the popover's own words and geometry are the DEFAULT, so no existing caller moved", () => {
    expect(card).toContain('{model.actionLabel ?? "Open the full query"}');
    expect(card).toContain("export const CARD_W = 440;");
    /* the fan's 260px and its missing tab row follow the HOST, never a prop — a prop here is what
       forks the component, which is the treatment the To-do reference card already settled */
    for (const forked of ["compact?:", "variant?:", "width?:", "fan?:"]) {
      expect(card, `${forked} is a second personality wearing a prop`).not.toContain(forked);
    }
  });
});
