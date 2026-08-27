import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 2 — the row head carries a sentence, and finishes it.
 *
 * ⚠️ "SENTENCE CASE" IS ASSERTED AGAINST THE RENDERED INK, not against the absence of a CSS
 * property. `text-transform: none` proves a declaration; a string that still reads
 * "OFFER ON THE TABLE" because the copy was written in capitals proves nothing was fixed.
 */
const WIDTHS = [1280, 1440, 1920, 2400];

test("Phase 2 — a sentence, in the page's voice, unclipped", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    await page.waitForTimeout(950);

    const r = await page.evaluate(() => {
      const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
      const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
      const says = [...tl.querySelectorAll<HTMLElement>(".tl-rowsay")];
      const cs = says[0] ? getComputedStyle(says[0]) : null;
      return {
        n: says.length,
        clipped: says.filter((s) => s.scrollWidth > s.clientWidth + 1)
          .map((s) => (s.textContent || "").trim().slice(0, 40)),
        texts: says.map((s) => (s.textContent || "").trim()),
        font: cs?.fontFamily ?? "", size: cs?.fontSize ?? "",
        tracking: cs?.letterSpacing ?? "", transform: cs?.textTransform ?? "",
        headW: Math.round((tl.querySelector(".tl-rowhead") as HTMLElement).getBoundingClientRect().width),
      };
    });

    console.log(`  [${width}] head ${r.headW}px · ${r.n} sentences · ${r.clipped.length} clipped`);
    if (width === 1440) {
      console.log(`      ${r.font.split(",")[0]} ${r.size} · tracking ${r.tracking} · transform ${r.transform}`);
      for (const t of r.texts.slice(0, 4)) console.log(`      "${t}"`);
    }

    expect(r.n, `[${width}] no row-head sentences — nothing was measured`).toBeGreaterThan(3);
    /* ⚠️ THE INK, NOT THE DECLARATION. A sentence that renders in capitals fails this whether or
       not `text-transform` says so — which is the check that survives the copy being rewritten. */
    for (const t of r.texts) {
      if (t.length < 6) continue;
      const letters = t.replace(/[^A-Za-z]/g, "");
      const caps = letters.replace(/[^A-Z]/g, "").length / Math.max(1, letters.length);
      expect(caps, `[${width}] "${t}" reads as a label, not a sentence (${Math.round(caps * 100)}% capitals)`)
        .toBeLessThan(0.4);
    }
    expect(r.transform, `[${width}] the sentence is transformed`).toBe("none");
    expect(r.tracking, `[${width}] the sentence carries label tracking`).toBe("normal");
    expect(r.font.toLowerCase(), `[${width}] the sentence is set in mono`).not.toContain("mono");
    /* ⚠️ AND IT FINISHES. The ellipsis survives for a genuinely long one — the sentence carries the
       agent's surname — but no ordinary sentence is cut at any acceptance width. */
    expect(r.clipped, `[${width}] ${r.clipped.length} sentences are cut`).toEqual([]);
  }

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
