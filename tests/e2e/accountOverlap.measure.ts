/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * THE OVERLAP GATE — the acceptance test for the v5 rework.
 *
 * ⚠️ IT IS A NEGATIVE SPACE CHECK, WHICH IS THE ONLY KIND THAT CATCHES THIS CLASS. Every previous
 * pass asserted that named elements were where they should be, and each time something ELSE was in
 * the wrong place: a header mark flew to the bottom-right of the page, an aside's text sat under
 * its own illustration, a card body filled 213px of 520. Naming what must not happen — no two
 * pieces of text may occupy the same pixels — catches all of those without knowing about any of
 * them.
 *
 * ⚠️ LEAVES ONLY. A parent's box contains its children's by construction, and an inline sibling
 * shares a line box with its neighbours; comparing those would report overlap on correct pages
 * forever. Only elements with no element children and real text are compared.
 *
 * ⚠️ AND IT RUNS UNDER STRESS. Growth must push layout, never overlap it — so the pass repeats with
 * a 40-character display name and every helper note doubled in length, injected in the page.
 *
 *   npm run build:dev && npx vite preview --port 4180 &
 *   SA_E2E_BASE_URL=http://localhost:4180 npx playwright test accountOverlap
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { ACCOUNT_ROUTES } from "../../src/lib/accountRoutes";

const WIDTHS = [1440, 1024, 800];

interface Box { tag: string; text: string; x: number; y: number; w: number; h: number; illo: boolean }

/** Collect text leaves and illustrations inside the header and the section card. */
async function collect(page: import("@playwright/test").Page): Promise<Box[]> {
  return page.evaluate(() => {
    const roots = [document.querySelector(".acct-hdr"), document.querySelector("#acct-panel")]
      .filter(Boolean) as HTMLElement[];
    const out: Box[] = [] as never;
    for (const root of roots) {
      for (const el of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) continue;
        const r = el.getBoundingClientRect();
        if (r.width <= 0 || r.height <= 0) continue;

        const isIllo = el.tagName.toLowerCase() === "svg";
        /* a TEXT LEAF: no element children, and some text of its own */
        const isTextLeaf = el.childElementCount === 0 && (el.textContent ?? "").trim().length > 0;
        if (!isIllo && !isTextLeaf) continue;
        /* an illustration's own <path> children are not separate marks */
        if (el.closest("svg") && !isIllo) continue;

        out.push({
          tag: el.tagName.toLowerCase(),
          text: (el.textContent ?? "").trim().slice(0, 40),
          x: r.left, y: r.top, w: r.width, h: r.height, illo: isIllo,
        });
      }
    }
    return out;
  });
}

/** True overlap — shared area, with a 1px tolerance for sub-pixel edges meeting. */
const hits = (a: Box, b: Box) =>
  a.x + a.w - 1 > b.x && b.x + b.w - 1 > a.x && a.y + a.h - 1 > b.y && b.y + b.h - 1 > a.y;

function findOverlaps(boxes: Box[]): string[] {
  const bad: string[] = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      if (a.illo && b.illo) continue;              // two marks may share a plate
      if (!hits(a, b)) continue;
      bad.push(`${a.illo ? "ILLO" : `"${a.text}"`}  ×  ${b.illo ? "ILLO" : `"${b.text}"`}`);
    }
  }
  return bad;
}

/** The stress pass: a long name and doubled notes, applied in the page. */
async function applyStress(page: import("@playwright/test").Page) {
  await page.evaluate(() => {
    const input = document.querySelector("#account-name") as HTMLInputElement | null;
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "Wilhelmina Featherstonehaugh-Marchbank");   // 38 + hyphen
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    for (const n of Array.from(document.querySelectorAll<HTMLElement>("#acct-panel .acct-note"))) {
      n.textContent = `${n.textContent} ${n.textContent}`;
    }
  });
  await page.waitForTimeout(250);
}

for (const width of WIDTHS) {
  test(`no text overlaps any text or illustration @${width}`, async ({ page }) => {
    const report: string[] = [];
    for (const r of ACCOUNT_ROUTES) {
      await openRoute(page, r.path, { width, height: 900 });

      for (const pass of ["rest", "stressed"] as const) {
        if (pass === "stressed") await applyStress(page);
        const boxes = await collect(page);
        const bad = findOverlaps(boxes);
        report.push(`${r.id.padEnd(14)} @${width} ${pass.padEnd(9)} ${boxes.length} boxes, ${bad.length} overlaps`);
        if (bad.length) report.push(...bad.map((b) => `    ${b}`));
        expect(bad, `${r.id} @${width} (${pass})\n${bad.join("\n")}`).toEqual([]);
        /* ⚠️ AND THE SCAN MUST HAVE SEEN SOMETHING. An empty box list produces zero overlaps and
           would pass having measured nothing — the vacuous shape this repo keeps meeting. */
        expect(boxes.length, `${r.id} @${width}: nothing was measured`).toBeGreaterThan(8);
      }
    }
    console.log(`\nOVERLAP GATE @${width}\n` + report.join("\n"));
  });
}
