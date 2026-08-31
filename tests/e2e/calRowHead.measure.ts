import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * ⚠️ THE ROW HEAD: THE LOCKED COMPONENT, ONE BOX, ONE COLUMN (v40, Phase 5).
 *
 * The head draws a real `StatusDot` where the relationship has a status, and a plain square where
 * it holds no query — a dot invented for a pinned row would state a journey that does not exist.
 * Two different elements, and the claim that matters is composed: every name in the column starts
 * at the SAME x. That is what a reader sees, and it is what breaks the moment the two kinds take
 * different boxes, which is exactly what they used to do — 13px against 10px.
 *
 * ⚠️ ASSERTED AS AN EQUALITY BETWEEN MEASURED THINGS, NEVER AS A TOLERANCE. A spread of "at most
 * two distinct values" is satisfied by half the column being wrong in the same direction; the names
 * either share an x or they do not.
 */
test("every name in the column starts at one x, whichever mark precedes it", async ({ page }) => {
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  const out = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    /* ⚠️ THE COLUMN HEADER WEARS THE SAME CLASS and holds no name — including it puts a null in
       every reading and turns a clean single-x result into a spread of three. */
    const heads = ([...document.querySelectorAll(".tl-c-nm")].filter(vis) as HTMLElement[])
      .filter((h) => !!h.querySelector(".tl-nm2"));
    return heads.map((h) => {
      const name = h.querySelector(".tl-nm2") as HTMLElement | null;
      /* ⚠️ THE COMPONENT'S BOX, NOT ITS ARTWORK. `StatusDot` at 18px draws an 11px `svg` inset
         inside an 18px element; measuring the svg reports the drawing and makes two marks that
         occupy identical boxes look 7px apart. What decides where the name starts is the box. */
      const sd = ([...h.children] as HTMLElement[])
        .find((c) => !c.classList.contains("tl-nmwrap")) ?? null;
      const hb = h.getBoundingClientRect();
      const nb = name?.getBoundingClientRect();
      const mb = sd?.getBoundingClientRect();
      return {
        kind: h.querySelector(".tl-sd") ? "square" : "statusdot",
        nameX: nb ? Math.round(nb.left * 10) / 10 : null,
        markW: mb ? Math.round(mb.width * 10) / 10 : null,
        markH: mb ? Math.round(mb.height * 10) / 10 : null,
        gap: nb && mb ? Math.round((nb.left - mb.right) * 10) / 10 : null,
        pad: mb ? Math.round((mb.left - hb.left) * 10) / 10 : null,
      };
    });
  });
  const kinds = new Set(out.map((r) => r.kind));
  const xs = new Set(out.map((r) => r.nameX));
  const sizes = new Set(out.flatMap((r) => [r.markW, r.markH]));
  console.log(`heads ${out.length} · kinds ${[...kinds].join("+")} · name x ${[...xs].join(",")} `
    + `· mark box ${[...sizes].join(",")} · gaps ${[...new Set(out.map((r) => r.gap))].join(",")}`);

  expect(out.length, "row heads measured").toBeGreaterThan(8);
  /* ⚠️ BOTH KINDS MUST BE PRESENT, or the equality is about one kind repeated and proves nothing
     about the thing it was written for. */
  expect(kinds.has("statusdot"), "no row drew a real StatusDot").toBe(true);
  expect([...xs], "names start at more than one x").toHaveLength(1);
  expect([...sizes], "the two kinds of mark take different boxes").toEqual([18]);
  expect([...new Set(out.map((r) => r.gap))], "more than one gap to the name").toHaveLength(1);
  expect(out[0].gap, "the gap to the name").toBe(14);
});

test("⚠️ the dot is the locked component, never a drawing of one", async ({ page }) => {
  /* `StatusDot` owns the ring, the glyph and the palette. A hand-drawn circle beside it would be a
     second implementation of the app's one status vocabulary — the fault the component exists to
     foreclose — and it would drift the first time the palette moved. The tell is an <svg>: the
     square has none, and nothing else in the head draws one. */
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(800);
  const got = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).getBoundingClientRect().width > 0;
    /* the column header wears the same class and names nobody — see the case above */
    const heads = ([...document.querySelectorAll(".tl-c-nm")].filter(vis) as HTMLElement[])
      .filter((h) => !!h.querySelector(".tl-nm2"));
    const withStatus = heads.filter((h) => !h.querySelector(".tl-sd"));
    return { heads: heads.length, withStatus: withStatus.length,
      svgs: withStatus.filter((h) => h.querySelector("svg")).length };
  });
  console.log(`row heads ${got.heads} · with a status ${got.withStatus} · drawing a StatusDot ${got.svgs}`);
  expect(got.withStatus, "rows carrying a status").toBeGreaterThan(5);
  expect(got.svgs, "a row with a status that did not render StatusDot").toBe(got.withStatus);
});
