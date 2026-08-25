/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE BANDED CARDS — geometry, not screenshots (packages Part 1) ════════════════════════════
 *
 * ⚠️ "FLUSH" IS A MEASUREMENT, NOT A LOOK. A band that reads as inset and a band that is inset are
 * different claims, and only one of them is checkable. Every case here compares the band's painted
 * box against its card's BORDER box and requires the two to meet — which a screenshot can suggest
 * and cannot prove, and which survives any restyle that keeps the construction.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const WIDTHS = [1440, 1920];

export const readBands = async (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const vis = (el: Element) => {
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const r = (n: number) => Math.round(n * 10) / 10;

    /** A card and its band head, measured against each other. */
    const pair = (card: Element) => {
      const head = card.querySelector(".pkgb-cardhead") as HTMLElement | null;
      if (!head) return null;
      const c = card.getBoundingClientRect();
      const h = head.getBoundingClientRect();
      const cs = getComputedStyle(card);
      const bw = (k: string) => parseFloat(cs.getPropertyValue(k)) || 0;
      return {
        type: card.className.match(/pkgb-t-(\w+)/)?.[1] ?? "?",
        cardW: r(c.width),
        bandH: r(h.height),
        /* ⚠️ AGAINST THE PADDING BOX — the card's own border is not white space, so a band flush to
           the inside of a 1px border is flush. Anything more is the inset this is looking for. */
        gapTop: r(h.top - (c.top + bw("border-top-width"))),
        gapLeft: r(h.left - (c.left + bw("border-left-width"))),
        gapRight: r(c.right - bw("border-right-width") - h.right),
        bandBg: getComputedStyle(head).backgroundImage.slice(0, 90),
        /* the card must clip, or a flush band would square off its corners */
        clips: cs.overflow === "hidden" || cs.overflowX === "hidden",
        radius: cs.borderRadius,
        /* D4 — the folded corner */
        fold: !!getComputedStyle(card, "::before").content.match(/^"/) &&
              getComputedStyle(card, "::before").backgroundImage !== "none",
      };
    };

    const sheets = [...document.querySelectorAll(".pkgb-msheet")].filter(vis).map(pair).filter(Boolean);
    const pkgs = [...document.querySelectorAll(".pkgb-pkgcard")].filter(vis).map(pair).filter(Boolean);

    /* D5 — the slot row: does the label read as a column head or a lead-in? */
    const slot = document.querySelector(".pkgb-slotline") as HTMLElement | null;
    const slotGeom = slot
      ? (() => {
          const l = slot.querySelector(".pkgb-sl") as HTMLElement;
          const v = slot.querySelector(".pkgb-sv, .pkgb-sv--none") as HTMLElement;
          if (!l || !v) return null;
          const lb = l.getBoundingClientRect(), vb = v.getBoundingClientRect();
          return { labelW: r(lb.width), gap: r(vb.left - lb.right), text: l.innerText + " / " + v.innerText };
        })()
      : null;

    /* D1 — the glyph. A `?` is an ARC plus a small filled circle; an envelope is a rect plus a path. */
    const glyphs = [...document.querySelectorAll(".pkgb-cardhead svg")].filter(vis).map((g) => ({
      owner: (g.closest("[class*=pkgb-t-]")?.className.match(/pkgb-t-(\w+)/)?.[1]) ?? "pkg",
      shapes: [...g.children].map((c) => c.tagName.toLowerCase()).join("+"),
      d: ([...g.querySelectorAll("path")][0]?.getAttribute("d") ?? "").slice(0, 24),
    }));

    return { sheets, pkgs, slotGeom, glyphs };
  });

test("bands, glyphs and slot rows", async ({ page }) => {
  const out: Record<string, unknown>[] = [];
  for (const width of WIDTHS) {
    await openRoute(page, "/manuscripts/packages", { width, height: 1200 });
    await page.waitForTimeout(900);
    const r = await readBands(page);
    out.push({ width, ...r });

    /* the population floor — a negative check over nothing passes having measured nothing */
    expect(r.sheets.length, `no material cards at ${width}`).toBeGreaterThan(2);
    expect(r.pkgs.length, `no package cards at ${width}`).toBeGreaterThan(0);

    /**
     * ⚠️ EVERY OFFENDER, NOT THE FIRST. This kind of declaration gets copied between cards, so a
     * check that throws on the first one hides the rest and takes two runs to find what one should
     * have. The standing lesson from a pack that named two clipped sites and had three.
     */
    const faults: string[] = [];
    for (const c of [...r.sheets, ...r.pkgs] as Record<string, number | boolean | string>[]) {
      for (const edge of ["gapTop", "gapLeft", "gapRight"] as const) {
        if ((c[edge] as number) > 0.5) faults.push(`${c.type} ${edge}=${c[edge]}`);
      }
      if (!c.clips) faults.push(`${c.type} does not clip`);
      if (c.fold) faults.push(`${c.type} draws a folded corner`);
    }
    expect(faults, `band faults at ${width}`).toEqual([]);

    /* D3 — one system: the package band is the same height as the material bands */
    const matH = [...new Set(r.sheets.map((s) => (s as { bandH: number }).bandH))];
    const pkgH = [...new Set(r.pkgs.map((p) => (p as { bandH: number }).bandH))];
    expect(matH.length, `material bands disagree on height: ${matH}`).toBe(1);
    expect(pkgH.length, `package bands disagree on height: ${pkgH}`).toBe(1);
    expect(pkgH[0], `package band ${pkgH[0]} vs material ${matH[0]} at ${width}`).toBe(matH[0]);

    /* D1 — no glyph is a question mark. The `?` was an arc plus a filled circle. */
    for (const g of r.glyphs) {
      expect(g.d, `${g.owner} glyph still draws the question-mark arc`).not.toContain("a3.5 3.5 0 1");
    }
    const letter = r.glyphs.find((g) => g.owner === "let");
    expect(letter, `no letter glyph at ${width}`).toBeTruthy();
    expect(letter!.shapes, "the letter mark is not an envelope (rect + flap)").toBe("rect+path");

    /* D5 — the label is a lead-in, not a column: no fixed track, and it sits close to its value */
    expect(r.slotGeom, `no slot row at ${width}`).not.toBeNull();
    expect(r.slotGeom!.labelW, `slot label is a ${r.slotGeom!.labelW}px column`).toBeLessThan(38);
    expect(r.slotGeom!.gap, `slot gap ${r.slotGeom!.gap}px reads as two columns`).toBeLessThanOrEqual(7);
  }
  console.log(JSON.stringify(out, null, 2));
});
