/**
 * §4 — the list row, on the running page.
 *
 * ⚠️ THE MARK'S SIZE IS THE WHOLE POINT and it is a rect: the ref's complaint is that it renders at
 * 17px because the two-line block took the width, so "the StatusDot is imported" proves nothing on
 * its own.
 *
 *   npx playwright test --project=measure qcRow
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§4 — the mark leads at full size, the initials are gone, the figure says 'ago'", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });

  const rows = await page.evaluate(() => {
    const out = [...document.querySelectorAll<HTMLElement>(".f12-row")].map((r) => {
      const rect = r.getBoundingClientRect();
      const lead = r.querySelector<HTMLElement>(".f12-lead");
      /* ⚠️ THE MARK IS `StatusDot`'s OUTER SPAN — the tinted disc and its ring. The `<svg>` inside
         is the GLYPH, drawn at about two-thirds of it, so measuring the svg reported 19px for a
         30px mark and read as a failure of the size this section sets. */
      const dot = lead?.firstElementChild as HTMLElement | undefined;
      const mark = dot?.getBoundingClientRect();
      const glyph = lead?.querySelector<SVGElement>("svg")?.getBoundingClientRect();
      const fig = r.querySelector<HTMLElement>(".f12-d2");
      const nm = r.querySelector<HTMLElement>(".f12-nm");
      const ag = r.querySelector<HTMLElement>(".f12-ag");
      return {
        name: (nm?.textContent || "").trim(),
        agency: (ag?.textContent || "").trim(),
        markW: mark ? Math.round(mark.width) : 0,
        glyphW: glyph ? Math.round(glyph.width) : 0,
        /* is the mark actually the leftmost thing in the row? */
        markLeadsX: mark && nm ? Math.round(mark.left) < Math.round(nm.getBoundingClientRect().left) : false,
        monograms: r.querySelectorAll(".f12-av").length,
        /* the mark's own accessible name — the status, which is what a screen reader gets */
        status: (lead?.querySelector("[role='img']")?.getAttribute("aria-label") || "").trim(),
        /* the whole option's name, so the row can be read as a sentence */
        readsAs: (r.getAttribute("aria-label") || r.innerText || "").replace(/\s+/g, " ").trim(),
        figure: (fig?.textContent || "").trim(),
        figureTitle: fig?.getAttribute("title") || "",
        figureRight: fig ? Math.round(rect.right - fig.getBoundingClientRect().right) : -1,
        wraps: fig ? fig.getBoundingClientRect().height > 20 : false,
        sel: r.classList.contains("f12-sel"),
      };
    });
    return out;
  });

  for (const r of rows.slice(0, 12)) {
    console.log(`  ${r.sel ? "▸" : " "} mark ${String(r.markW).padStart(2)}px (glyph ${r.glyphW}) · ${r.name.padEnd(22)} ${r.agency.padEnd(22)} · "${r.figure}"  [${r.figureTitle}]`);
  }
  expect(rows.length, "no rows on the page").toBeGreaterThan(2);

  for (const r of rows) {
    expect(r.monograms, `"${r.name}" still renders a monogram`).toBe(0);
    expect(r.markLeadsX, `"${r.name}": the mark does not lead the row`).toBe(true);
    /* ⚠️ THE SIZE FLOOR THE SECTION NAMES — 17px was the fault, 12px is StatusDot's own floor. */
    expect(r.markW, `"${r.name}": the mark renders at ${r.markW}px`).toBeGreaterThanOrEqual(26);
    expect(r.figure, `"${r.name}" states no figure`).not.toBe("");
    /* ⚠️ "ago" IS THE LABEL — a row that still needs a caption above the number has not changed. */
    expect(r.figure, `"${r.name}" reads "${r.figure}", which is not a relative date`).toMatch(/ ago$|^today$/);
    expect(r.figure, `"${r.name}" kept the old position wording`).not.toMatch(/left|with agent|overdue/i);
    expect(r.figureTitle, `"${r.name}" lost the exact date`).toMatch(/^Sent \d/);
    expect(r.wraps, `"${r.name}"'s figure wraps at ${r.figure} — the column is too narrow`).toBe(false);
  }

  /* ⚠️ AND NO CAPTION SURVIVES ANYWHERE IN THE LIST — the two-line block is what squeezed the mark. */
  const caption = await page.evaluate(() => document.querySelectorAll(".f12-d2lab").length);
  expect(caption, "the elapsed caption is still rendered").toBe(0);

  /* ⚠️ AND THE MARK IS STILL THE ROW'S STATUS TO A SCREEN READER. Wrapping it in an `aria-hidden`
     slot would have removed the status from the option's name with nothing left to replace it —
     the initials it replaced never carried it either, so it would have gone entirely. */
  for (const r of rows) expect(r.status, `"${r.name}"'s mark states no status`).not.toBe("");
  console.log(`\n  a row reads as: "${rows[0].readsAs}"`);

  /**
   * §4c — REPORTED, NOT SOLVED. Two queries to the same agent at the same agency now differ only by
   * their mark and their figure. This prints them rather than asserting anything about them.
   */
  const seen = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.name} · ${r.agency}`;
    seen.set(k, [...(seen.get(k) ?? []), r]);
  }
  const dupes = [...seen.entries()].filter(([, v]) => v.length > 1);
  console.log(`\n§4c — ${dupes.length} agent+agency pair(s) appear more than once:`);
  for (const [k, v] of dupes) console.log(`  ${k}\n${v.map((r) => `      ${r.status.padEnd(18)} "${r.figure}"`).join("\n")}`);
  if (!dupes.length) console.log("  (none in this account — the two-Marcus-Reed case is not present)");
});

test("§4 — the mark reads against the pink selected row", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").nth(2).click({ timeout: 5000 });
  await page.waitForTimeout(350);
  const read = await page.evaluate(() => {
    const sel = document.querySelector<HTMLElement>(".f12-row.f12-sel");
    const other = document.querySelector<HTMLElement>(".f12-row:not(.f12-sel)");
    /* ⚠️ THE RING IS THE DISC'S BORDER, not a stroke on the glyph — StatusDot draws a 1px ring on
       the tinted disc and the glyph inside it in a third colour. Reading the svg's strokes answered
       a different question. */
    const dot = (r: HTMLElement | null) => {
      const d = r?.querySelector<HTMLElement>(".f12-lead > span > span");
      if (!d) return null;
      const c = getComputedStyle(d);
      return { ring: `${c.borderTopWidth} ${c.borderTopColor}`, fill: c.backgroundColor, w: Math.round(d.getBoundingClientRect().width) };
    };
    const lum = (c: string) => {
      const v = c.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number).map((n) => { const s = n / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
    };
    const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100; };
    const onPink = dot(sel), onWhite = dot(other);
    const pinkBg = sel ? getComputedStyle(sel).backgroundColor : "";
    const whiteBg = other ? getComputedStyle(other).backgroundColor : "";
    return {
      onPink, onWhite, pinkBg, whiteBg,
      ringVsPink: onPink ? ratio(onPink.ring.split(" ").slice(1).join(" "), pinkBg) : 0,
      /* ⚠️ AN UNSELECTED ROW IS TRANSPARENT, so its own `backgroundColor` is `rgba(0,0,0,0)` and a
         ratio against it is a ratio against BLACK — a number that looks like a reading and is not.
         The ground is the panel behind it. */
      ringVsWhite: onWhite ? ratio(onWhite.ring.split(" ").slice(1).join(" "), (() => {
        let el: HTMLElement | null = other;
        while (el) { const b = getComputedStyle(el).backgroundColor; if (b && b !== "rgba(0, 0, 0, 0)") return b; el = el.parentElement; }
        return "rgb(255, 255, 255)";
      })()) : 0,
      ringVsFill: onPink ? ratio(onPink.ring.split(" ").slice(1).join(" "), onPink.fill) : 0,
    };
  });
  console.log(`\nmark on the pink row (${read.pinkBg}): ${read.onPink?.w}px · ring ${read.onPink?.ring} · fill ${read.onPink?.fill}`);
  console.log(`mark on a white row  (${read.whiteBg}): ${read.onWhite?.w}px · ring ${read.onWhite?.ring} · fill ${read.onWhite?.fill}`);
  console.log(`ring against its ground: ${read.ringVsPink}:1 on the pink row · ${read.ringVsWhite}:1 on a white row · ${read.ringVsFill}:1 against its own fill`);

  expect(read.onPink, "no mark on the selected row").not.toBeNull();
  /* ⚠️ THE MARK CARRIES ITS OWN COLOURS, so a tinted row must not be changing them. If these differ,
     something on the row is repainting the locked glyph. */
  expect(read.onPink!.ring, "the selected row repaints the mark's ring").toBe(read.onWhite!.ring);
  expect(read.onPink!.fill, "the selected row repaints the mark's fill").toBe(read.onWhite!.fill);
  /* ⚠️ AND THE RING STILL READS AGAINST THE PINK — the section's own question, answered as a number
     rather than by eye. 3:1 is the non-text bar; a 1px ring that fails it on a tinted row is the
     one thing this size change could have broken. */
  expect(read.ringVsPink, `the ring reads ${read.ringVsPink}:1 against the selected row's pink`).toBeGreaterThanOrEqual(3);
});
