import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 5 — the range pack's acceptance, every width against every range.
 *
 * ⚠️ THE TABLE IS THE CLAIM, AND IT IS ASSERTED AS A TABLE. Each range is a row of expectations
 * that hold together — grain, columns, whether a bar may carry text, whether the row head carries
 * the sentence instead, how big a marker is. Checking them one at a time across separate tests is
 * how a board comes to be right about columns and wrong about what is written on them.
 */
const WIDTHS = [1280, 1440, 1920, 2400];

interface Want {
  name: string; days: number; cols: number; dense: number;
  initials: boolean; barText: boolean; rowSay: boolean; disc: number;
}
const WANT: Want[] = [
  { name: "1 week",   days: 7,   cols: 7,  dense: 1, initials: true,  barText: true,  rowSay: false, disc: 34 },
  { name: "2 weeks",  days: 14,  cols: 14, dense: 2, initials: true,  barText: true,  rowSay: false, disc: 34 },
  { name: "1 month",  days: 31,  cols: 31, dense: 2, initials: false, barText: true,  rowSay: false, disc: 34 },
  { name: "3 months", days: 91,  cols: 13, dense: 3, initials: false, barText: false, rowSay: true,  disc: 22 },
  { name: "6 months", days: 182, cols: 7,  dense: 4, initials: false, barText: false, rowSay: true,  disc: 22 },
];

test("Phase 5 — four widths, five ranges, one table", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(`${m.text().slice(0, 120)}`); });

  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    await page.waitForTimeout(900);
    const slider = page.getByRole("slider", { name: /range/i });
    expect(await slider.count(), `[${width}] no range control found by role`).toBe(1);

    for (let i = 0; i < WANT.length; i++) {
      const w = WANT[i];
      await slider.fill(String(i));
      await page.waitForTimeout(620);

      const m = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
        const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
        const cs = getComputedStyle(tl);
        const B = tl.getBoundingClientRect();
        const lbl = tl.querySelector(".tl-seg .tl-lbl") as HTMLElement | null;
        const node = tl.querySelector('.tl-node[data-marker="status"]') as HTMLElement | null;
        /* ⚠️ RETIRED (grouped pack, Phase 2) — counted so its return fails rather than passes. */
        const spines = tl.querySelectorAll(".tl-spine").length;
        const tips = [...tl.querySelectorAll(".tl-tip")] as HTMLElement[];
        return {
          dense: Number((tl.className.match(/dense(\d)/) ?? [])[1] ?? 0),
          days: cs.getPropertyValue("--tl-days").trim(),
          cols: Number(cs.getPropertyValue("--tl-cols").trim()),
          headers: tl.querySelectorAll(".tl-dh").length,
          initials: tl.querySelectorAll(".tl-dw").length,
          barText: lbl ? getComputedStyle(lbl).display !== "none" : null,
          rowSays: tl.querySelectorAll(".tl-rowsay").length,
          disc: node ? Math.round(node.getBoundingClientRect().width) : null,
          spines,
          tips: tips.length,
          tipsPainted: tips.filter((e) => getComputedStyle(e).opacity !== "0").length,
          docScrollW: document.documentElement.scrollWidth,
          docClientW: document.documentElement.clientWidth,
        };
      });

      const say = `[${width}] ${w.name.padEnd(9)} dense ${m.dense} · ${m.days}d/${m.cols}c · heads ${m.headers}` +
        ` · initials ${m.initials} · barText ${m.barText} · rowSays ${m.rowSays} · disc ${m.disc}` +
        ` · spines ${m.spines} · tips ${m.tipsPainted}/${m.tips}`;
      console.log(say);

      expect(m.dense, `${say} — density tier`).toBe(w.dense);
      expect(m.days, `${say} — the board's span`).toBe(String(w.days));
      expect(m.cols, `${say} — drawn divisions`).toBe(w.cols);
      expect(m.headers, `${say} — a header per division`).toBe(w.cols);
      expect(m.initials > 0, `${say} — weekday initials`).toBe(w.initials);
      if (m.barText !== null) expect(m.barText, `${say} — bar text`).toBe(w.barText);
      expect(m.rowSays > 0, `${say} — the row head carries the sentence`).toBe(w.rowSay);

      /* ⚠️ NO CAPTION AT REST, AT ANY WIDTH OR RANGE (Phase 4). */
      expect(m.tipsPainted, `${say} — captions painted with nothing hovered`).toBe(0);
      /* ⚠️ THE SPINE IS RETIRED, AND ITS ABSENCE IS ASSERTED RATHER THAN ASSUMED (Phase 2).
         Today is where the board starts, so a line marking it stated what the layout already
         guarantees; the ref draws none either. */
      expect(m.spines, `${say} — the today spine is back`).toBe(0);
      expect(m.docScrollW, `${say} — the page scrolls sideways`).toBeLessThanOrEqual(m.docClientW + 1);

      /* ⚠️ THE MARKER SIZE HAS TO BE MEASURED IN A WINDOW THAT HAS MARKERS, and the window at rest
         does not have any. The board opens at TODAY and runs forward (the ref anchors the same
         way) while a marker is a RECORD, which is in the past — so `disc` came back `null` at all
         twenty stops and a guarded `if (disc !== null)` skipped the whole row of the table in
         silence. That is the vacuous shape this repo records against every population-free check:
         it is not that the assertion failed, it is that it never ran and said nothing about it.
         One window back, measure, one window forward again. */
      await page.getByRole("button", { name: "Previous window" }).click();
      await page.waitForTimeout(420);
      const k = await page.evaluate(() => {
        const all = Array.from(document.querySelectorAll(".tl")) as HTMLElement[];
        const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
        const wide = (sel: string) => [...tl.querySelectorAll(sel)]
          .map((e) => Math.round(e.getBoundingClientRect().width));
        return { status: wide('.tl-node[data-marker="status"]'), dir: wide('.tl-node[data-marker="direction"]') };
      });
      const marks = `[${width}] ${w.name.padEnd(9)} back one · status ${JSON.stringify([...new Set(k.status)])}` +
        ` · direction ${JSON.stringify([...new Set(k.dir)])}`;
      console.log(marks);
      expect(k.status.length + k.dir.length, `${marks} — no marker in the previous window either`).toBeGreaterThan(0);
      for (const px of k.status) expect(px, `${marks} — a status marker is off its tier`).toBe(w.disc);
      /* the direction dot owns its own size and is always the smaller of the pair */
      for (const px of k.dir) expect(px, `${marks} — a direction dot is not smaller than the disc`).toBeLessThan(w.disc);
      await page.getByRole("button", { name: "Next window" }).click();
      await page.waitForTimeout(380);
    }
  }
  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
