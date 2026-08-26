import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 4 — every row head that has a query leads with the LOCKED `StatusDot`.
 *
 * ⚠️ THE SVG IS HOW YOU KNOW IT IS THE COMPONENT AND NOT A LOOKALIKE. Nothing in this page's
 * stylesheet emits one; `.tl-sd`, the disc it replaces, is a bordered `<i>` with no children. So
 * "contains an svg" is a claim about provenance that a local drawing cannot satisfy by accident —
 * which is what a check against a class name or a colour would have allowed.
 */
test("Phase 4 — the row head's dot is the real component, at 18", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);

  const r = await page.evaluate(() => {
    const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
    const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
    const px = (n: number) => Math.round(n * 100) / 100;
    return [...tl.querySelectorAll(".tl-rowhead")].map((h) => {
      const nm = h.querySelector(".tl-nm")!;
      const lead = nm.firstElementChild as HTMLElement;
      const b = lead.getBoundingClientRect();
      return {
        name: (h.querySelector(".tl-nmtxt")?.textContent || "").trim().slice(0, 24),
        pinned: !!h.closest(".tl-row--pin"),
        tag: lead.tagName,
        svgs: lead.querySelectorAll("svg").length,
        w: px(b.width), h: px(b.height),
        /* ⚠️ THE LEAD IS FIRST IN THE HEAD'S OWN READING ORDER, not merely present somewhere in
           it — "leads with" is a claim about POSITION, and `querySelector` anywhere in the subtree
           would be satisfied by a dot after the name. */
        leads: nm.firstElementChild === lead,
      };
    });
  });

  for (const h of r) {
    console.log(`  ${h.pinned ? "PIN " : "    "}${h.name.padEnd(26)} <${h.tag}> ${h.svgs} svg · ${h.w}×${h.h}`);
  }
  expect(r.length, "no row heads at all — nothing was measured").toBeGreaterThan(3);

  const real = r.filter((h) => !h.pinned);
  expect(real.length, "every row was the pinned one").toBeGreaterThan(0);
  for (const h of real) {
    expect(h.leads, `${h.name}: the dot is not first in the head`).toBe(true);
    expect(h.tag, `${h.name}: the lead is <${h.tag}> — the CSS disc, not the component`).toBe("SPAN");
    expect(h.svgs, `${h.name}: no StatusDot glyph — this is a drawing, not the locked component`).toBeGreaterThan(0);
    /* ⚠️ 18 EXACTLY, AND UNFORKED. `overrideSize` clamps at 12, so a value below it would render
       silently larger than asked; 18 is inside the supported range and the component owns it. */
    expect(h.w, `${h.name}: the dot is ${h.w}px, not 18`).toBe(18);
    expect(h.h, `${h.name}: the dot is ${h.h}px tall, not 18`).toBe(18);
  }

  /* the pinned row holds no query, so it keeps its square rather than inventing a journey */
  const pin = r.filter((h) => h.pinned);
  if (pin.length) {
    expect(pin[0].tag, "the pinned row grew a StatusDot for a query it does not have").toBe("I");
    console.log(`  pinned row keeps its square mark`);
  } else {
    console.log("  NOTE: no pinned row on this account — its fallback is unit-locked only");
  }

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
