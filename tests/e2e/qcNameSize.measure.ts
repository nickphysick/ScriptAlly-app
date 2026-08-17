/**
 * §2 — the agent name is the larger of the two, and the longest name still fits.
 *
 * ⚠️ THE LONGEST NAME IS THE CASE, AND THE PACK NAMES IT: `Penhallow Literary` with `Agent not
 * specified`. Whether this account holds it is not something a source lock can know, so the run
 * sweeps the list, reports every name it saw with its measured width, and says so if that one is
 * absent rather than passing on the short ones.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2 — the agent name is larger, and the longest one does not crowd the status", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 14);
  const seen: { name: string; nameW: number; agency: string; valW: number; free: number; fs: string; msFs: string; rowsRight: number; cardH: number; italic: string; colour: string }[] = [];

  for (let i = 0; i < n; i++) {
    await rows.nth(i).scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await rows.nth(i).click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(140);
    seen.push(await page.evaluate(() => {
      const r = (x: number) => Math.round(x * 10) / 10;
      const names = [...document.querySelectorAll(".qc-mname")] as HTMLElement[];
      const val = document.querySelector(".qc-mval") as HTMLElement;
      const sec = val.querySelector(".qc-msec") as HTMLElement | null;
      const rowsEl = document.querySelector(".qc-mailrows") as HTMLElement;
      const cs = getComputedStyle(names[0]);
      return {
        name: names[0].textContent?.trim() ?? "", nameW: r(names[0].getBoundingClientRect().width),
        agency: sec?.textContent?.trim() ?? "",
        valW: r(val.getBoundingClientRect().width),
        /* ⚠️ THE FREE SPACE ON THE VALUE LINE — what "crowd the status block" actually means here.
           The status column is a fixed reserve, so crowding shows up as the name and the agency
           filling their own row, not as the block moving. */
        free: r(val.getBoundingClientRect().width - names[0].getBoundingClientRect().width - (sec?.getBoundingClientRect().width ?? 0)),
        fs: cs.fontSize, msFs: getComputedStyle(names[1]).fontSize,
        italic: cs.fontStyle, colour: cs.color,
        rowsRight: r(rowsEl.getBoundingClientRect().right),
        cardH: r((document.querySelector(".qc-mail") as HTMLElement).getBoundingClientRect().height),
      };
    }));
  }

  for (const s of seen) console.log(`  ${s.name} / ${s.agency}: name ${s.nameW} + agency in ${s.valW} → free ${s.free} · ${s.fs}/${s.msFs} · card ${s.cardH}`);

  const first = seen[0];
  expect(parseFloat(first.fs), "the agent name is not larger than the manuscript title").toBeGreaterThan(parseFloat(first.msFs));
  expect(first.fs, "the agent name is not 24px").toBe("24px");
  expect(first.italic, "the agent name is italic").toBe("normal");
  /* ⚠️ AND NOT BURGUNDY — the outgoing status colour, which on this card would read as a second status */
  expect(first.colour, "a name took the status colour").toBe("rgb(20, 20, 18)");

  /* the card does not reflow with the name */
  expect([...new Set(seen.map((s) => s.rowsRight))], `a name moved the rows' right edge: ${[...new Set(seen.map((s) => s.rowsRight))].join(", ")}`).toHaveLength(1);
  expect([...new Set(seen.map((s) => s.cardH))], `a name changed the card's height: ${[...new Set(seen.map((s) => s.cardH))].join(", ")}`).toHaveLength(1);

  const longest = seen.reduce((a, b) => (b.nameW > a.nameW ? b : a));
  console.log(`longest rendered: "${longest.name}" at ${longest.nameW}px, ${longest.free}px free beside its agency`);
  const named = seen.find((s) => /penhallow/i.test(s.name));
  if (!named) console.log("⚠️ `Penhallow Literary` IS NOT IN THIS ACCOUNT — the pack's named worst case is unexercised; the widest present is above");
  else console.log(`Penhallow Literary / ${named.agency}: name ${named.nameW}, free ${named.free}`);
  /* ⚠️ REPORTED, NOT SILENTLY REDUCED. The pack says to report the measurement rather than drop the
     size unilaterally, so this fails loudly only when the line actually overflows. */
  expect(longest.free, `"${longest.name}" leaves ${longest.free}px on its value line — it has overflowed`).toBeGreaterThan(-0.5);
});

/**
 * ⚠️ THE PACK'S NAMED WORST CASE, MEASURED RATHER THAN ESTIMATED. `Penhallow Literary` with `Agent
 * not specified` is not in this account, and arithmetic from a shorter name ("18 characters over
 * 14, so about 196px") is the guess-wearing-a-measurement's-clothes this repo has a rule about.
 * The rendered card is given those exact strings and re-read, then put back. That is a probe of
 * the real rule at the real size; what it cannot prove is that such an agent exists.
 */
test("§2 — the pack's longest name, measured on the rendered card", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);

  const m = await page.evaluate(() => {
    const r = (x: number) => Math.round(x * 10) / 10;
    const name = document.querySelector(".qc-mname--lg") as HTMLElement;
    const val = name.closest(".qc-mval") as HTMLElement;
    const sec = val.querySelector(".qc-msec") as HTMLElement;
    const card = document.querySelector(".qc-mail") as HTMLElement;
    const rows = document.querySelector(".qc-mailrows") as HTMLElement;
    const wasN = name.textContent, wasS = sec.textContent;
    const snap = () => ({
      nameW: r(name.getBoundingClientRect().width), secW: r(sec.getBoundingClientRect().width),
      valW: r(val.getBoundingClientRect().width), cardH: r(card.getBoundingClientRect().height),
      rowsRight: r(rows.getBoundingClientRect().right),
      /* ⚠️ CLIPPED IS THE REAL QUESTION. Both are `text-overflow: ellipsis`, so "does not crowd"
         means neither has had to truncate — an overflow here is silent, not a broken layout. */
      nameClipped: name.scrollWidth > name.clientWidth + 0.5,
      secClipped: sec.scrollWidth > sec.clientWidth + 0.5,
    });
    const before = snap();
    name.textContent = "Penhallow Literary";
    sec.textContent = "Agent not specified";
    const after = snap();
    name.textContent = wasN; sec.textContent = wasS;
    return { before, after, free: r(after.valW - after.nameW - after.secW) };
  });
  console.log(`Penhallow Literary / Agent not specified → name ${m.after.nameW} + agency ${m.after.secW} in ${m.after.valW} · free ${m.free} · clipped name=${m.after.nameClipped} agency=${m.after.secClipped}`);
  console.log(`  (for comparison, the query's own: name ${m.before.nameW} + agency ${m.before.secW}, card ${m.before.cardH})`);

  expect(m.after.rowsRight, "the long name moved the rows' right edge").toBe(m.before.rowsRight);
  expect(m.after.cardH, "the long name reflowed the card").toBe(m.before.cardH);
  expect(m.after.nameClipped, `"Penhallow Literary" is truncated at 24px — report before reducing the size`).toBe(false);
  expect(m.free, `the value line has ${m.free}px left — the name crowds the agency`).toBeGreaterThan(0);
});
