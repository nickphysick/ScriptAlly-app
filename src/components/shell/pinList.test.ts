/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * v138.6 · QC138.6 A1 — ONE PIN: both list pages use the shared hook (`usePinList`) and `PinListButton`, and neither
 * holds the sidebar, binds the pin's key or writes the pinned state on its own. (The rendered half — both pages draw
 * `[data-pin-list]` — is tests/e2e/qcV1386.measure.ts.)
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { PIN_KEYS } from "./useFullScreenList";

const code = (p: string) => readFileSync(p, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
const PAGES = { queries: "src/components/Queries.tsx", agents: "src/components/agents/AgentList.tsx" } as const;

describe("QC138.6 A1 · one pin for both lists", () => {
  for (const [page, file] of Object.entries(PAGES)) {
    it(`${page}: uses usePinList("${page}") and PinListButton`, () => {
      const src = code(file) + (page === "queries" ? code("src/components/queries/centre/QcList138.tsx") : "");
      expect(src).toMatch(new RegExp(`usePinList\\("${page}"`));
      /* RETARGETED (Contact list v19 §A): the Contact list's pin is the toolbar's own navy "Pin list" / "Unpin" button
         (ContactListHead), drawn by the page's one head component */
      if (page === "agents") {
        expect(src).toMatch(/<ContactListHead\b/);
        const head = code("src/components/agents/contact/ContactListHead.tsx");
        expect(head).toMatch(/data-pin-list=""/);
        expect(head).toMatch(/aria-pressed=\{pinned\}/);
      } else {
        /* RETARGETED (Query Centre v140 §A/§B): the Query Centre's pin is the toolbar's own cream "Pin list" / "Unpin"
           button (QcToolbar140), drawn by the list's one toolbar component, as the Contact list's is */
        expect(src).toMatch(/<QcToolbar140\b/);
        const bar = code("src/components/queries/centre/QcToolbar140.tsx");
        expect(bar).toMatch(/data-pin-list=""/);
        expect(bar).toMatch(/aria-pressed=\{pinned\}/);
      }
    });
    it(`${page}: holds no sidebar, binds no pin key and writes no pinned state of its own`, () => {
      const src = code(file);
      expect(src).not.toMatch(/holdSidebarCollapsed|releaseSidebarHolds/);
      expect(src).not.toMatch(/SHORTCUTS\.(contactsFull|qcPin)\b/);
      expect(src).not.toMatch(/localStorage\.(setItem|removeItem)\([^)]*(pinList|contactsFull)/);
      expect(src).not.toMatch(/useFullScreenList\(/);
    });
  }
  it("each page has its own key", () => {
    expect(PIN_KEYS.queries).not.toBe(PIN_KEYS.agents);
  });
});
