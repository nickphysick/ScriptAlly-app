/**
 * Search v1 — the rendered locks (SV1-R1 … SV1-R8, prompt Part E), on the emulator build, at 1512 × 900 and
 * 1280 × 800 (and 390 for the phone). Each was run red against the base (query-card-v160 @ 343976d1c) before its
 * green was trusted; reports/search-v1.md records the reds.
 *
 *   SEARCH_V1_PHONE_OUT=<file>   write the phone palette's reading (the base run makes the baseline)
 *   SEARCH_V1_PHONE_BASE=<file>  compare the phone palette's reading with that baseline
 */
import { test, expect, Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { inkOpen } from "./inkLib";
import { openRoute } from "./measure";

const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const PAL = ".sp-pal--ink";
const INPUT = `${PAL} [role="combobox"]`;
const mod = process.platform === "darwin" ? "Meta" : "Control";

async function openSearch(page: Page) {
  await page.locator('[data-probe="search"]').click();
  await expect(page.locator(INPUT)).toBeFocused();
}
async function typeTerm(page: Page, term: string) {
  await page.locator(INPUT).fill(term);
  await page.waitForTimeout(150);
}
const boxOf = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().width > 0);
  if (!e) return null;
  const b = e.getBoundingClientRect();
  return { x: b.left, y: b.top, w: b.width, h: b.height };
}, sel);

/** Every element inside the palette that draws text of its own: its size, its transform, and the text. */
const textReadings = (page: Page) => page.evaluate((sel) => {
  const root = document.querySelector(sel);
  if (!root) return [];
  const out: { text: string; size: number; transform: string; cls: string }[] = [];
  for (const el of root.querySelectorAll<HTMLElement>("*")) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join("").trim();
    const ph = el instanceof HTMLInputElement ? el.placeholder : "";
    if (!own && !ph) continue;
    if (el.getBoundingClientRect().width === 0) continue;
    const cs = getComputedStyle(el);
    out.push({ text: (own || ph).slice(0, 40), size: parseFloat(cs.fontSize), transform: cs.textTransform, cls: el.className.toString() });
  }
  return out;
}, PAL);

test.describe("search v1", () => {
  test("SV1-R1 · no text under 12px and no capitals but SOON, with the population proved non-zero", async ({ page }) => {
    for (const vp of SIZES) {
      await inkOpen(page, "/queries", vp.width, { height: vp.height });
      await openSearch(page);
      const seen: Awaited<ReturnType<typeof textReadings>> = [];
      for (const term of ["", "marsh", "add a manuscript", "zzqqxx"]) {
        await typeTerm(page, term);
        seen.push(...(await textReadings(page)));
      }
      expect(seen.length, `${vp.width}: text elements read`).toBeGreaterThan(30);
      for (const r of seen) {
        expect(r.size, `${vp.width}: "${r.text}" (${r.cls}) is ${r.size}px`).toBeGreaterThanOrEqual(12);
        if (r.text !== "SOON") expect(r.transform, `${vp.width}: "${r.text}" is ${r.transform}`).not.toBe("uppercase");
      }
      await page.keyboard.press("Escape"); await page.keyboard.press("Escape");
    }
  });

  test("SV1-R2 · ↵ on an agent opens the agent's card over the page: the route stays, the Agents filter stays empty", async ({ page }) => {
    await inkOpen(page, "/queries", 1512, { height: 900 });
    await openSearch(page);
    await typeTerm(page, "tomas keller");
    const best = page.locator(`${PAL} .sv1-row.sel`);
    await expect(best).toHaveAttribute("data-kind", "agent");
    await page.keyboard.press("Enter");
    await expect(page.locator('[data-ac="card"]')).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/queries");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    await page.goto("/agents");
    /* every workspace page stays mounted: read the Contact list's Find that is on screen */
    const find = page.locator('input[aria-label^="Find an agent"]:visible').first();
    await expect(find).toBeVisible();
    await expect(find).toHaveValue("");
  });

  test("SV1-R3 · Esc clears the words and stays open; a second Esc closes, with focus on the bar's field", async ({ page }) => {
    await inkOpen(page, "/queries", 1512, { height: 900 });
    await openSearch(page);
    await typeTerm(page, "marsh");
    await page.keyboard.press("Escape");
    await expect(page.locator(INPUT)).toHaveValue("");
    await expect(page.locator(PAL)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(PAL)).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("data-probe"))).toBe("search");
  });

  test("SV1-R4 · Tab moves the pressed chip, and focus stays in the input", async ({ page }) => {
    await inkOpen(page, "/queries", 1512, { height: 900 });
    await openSearch(page);
    await typeTerm(page, "marsh");
    const pressed = () => page.locator(`${PAL} .sv1-scope[aria-pressed="true"]`).getAttribute("data-scope");
    expect(await pressed()).toBe("all");
    await page.keyboard.press("Tab");
    expect(await pressed()).not.toBe("all");
    await expect(page.locator(INPUT)).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    expect(await pressed()).toBe("all");
    await expect(page.locator(INPUT)).toBeFocused();
  });

  /* ⚠️ at 1280 × 800 the sheet is 1192 wide — still over 1180 — so 1100 is added to see the list-only box at all */
  test("SV1-R5 · the peek is drawn on a sheet 1180px or wider and not below; the box is 920 and 660 wide", async ({ page }) => {
    const seenNarrow: boolean[] = [];
    for (const vp of [...SIZES, { width: 1100, height: 800 }]) {
      await inkOpen(page, "/queries", vp.width, { height: vp.height });
      const sheet = (await boxOf(page, ".ws-window"))!;
      await openSearch(page);
      const box = (await boxOf(page, PAL))!;
      const wide = sheet.w >= 1180;
      console.log(`[SV1-R5] ${vp.width}: sheet ${sheet.w}, box ${box.w}, peek ${await page.locator(".sv1-peek").count()}`);
      expect(Math.abs(box.w - (wide ? 920 : 660)), `${vp.width}: box ${box.w} on a ${sheet.w} sheet`).toBeLessThan(1);
      await expect(page.locator(`${PAL} .sv1-peek`)).toHaveCount(wide ? 1 : 0);
      seenNarrow.push(!wide);
      await page.keyboard.press("Escape");
    }
    expect(seenNarrow, "both sides of 1180 were measured").toEqual(expect.arrayContaining([true, false]));
  });

  test("SV1-R6 · the body is one height with no term, one result and no match", async ({ page }) => {
    await inkOpen(page, "/queries", 1512, { height: 900 });
    await openSearch(page);
    const hs: number[] = [];
    for (const term of ["", "tomas keller", "zzqqxx"]) {
      await typeTerm(page, term);
      hs.push((await boxOf(page, `${PAL} .sv1-body`))!.h);
    }
    console.log("[SV1-R6]", hs);
    expect(hs[0]).toBeGreaterThan(400);
    expect(new Set(hs.map((h) => Math.round(h))).size).toBe(1);
  });

  test("SV1-R7 · crossing three rows in under 110ms leaves the peek alone; resting on one moves it", async ({ page }) => {
    await inkOpen(page, "/queries", 1512, { height: 900 });
    await openSearch(page);
    /* before you type: Start something and Go to, seven rows */
    const rows = page.locator(`${PAL} .sv1-row`);
    expect(await rows.count()).toBeGreaterThan(4);
    const peekText = () => page.locator(`${PAL} .sv1-peek`).innerText();
    const before = await peekText();
    const centre = async (i: number) => { const b = (await rows.nth(i).boundingBox())!; return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    const pts = [await centre(1), await centre(2), await centre(3)];
    const t0 = Date.now();
    for (const p of pts) await page.mouse.move(p.x, p.y, { steps: 1 });
    const crossed = Date.now() - t0;
    await page.mouse.move(pts[2].x, 40);
    await page.waitForTimeout(60);
    console.log(`[SV1-R7] crossed in ${crossed}ms`);
    expect(crossed, "the crossing itself was quick enough to test").toBeLessThan(110);
    expect(await peekText()).toBe(before);
    await page.mouse.move(pts[1].x, pts[1].y);
    await page.waitForTimeout(250);
    expect(await peekText()).not.toBe(before);
  });

  test("SV1-R8 · at 390 wide the phone's palette is as it was before this branch", async ({ page }) => {
    /* openRoute waits on the desktop shell, so the route opens wide and then narrows, as SR1.3 does */
    await openRoute(page, "/queries", { width: 1280, height: 800 });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.evaluate(() => document.fonts.ready);
    await page.keyboard.press(`${mod}+k`);
    /* ⚠️ ON THE BASE THE PHONE PALETTE MOUNTS AND NEVER SHOWS: at 390 no opener has a rect, so it is never placed and
       stays visibility:hidden. The compare reads it as it is, visible or not — "as it was" includes that. */
    const pal = page.locator(".sp-pal");
    await expect(pal).toBeAttached();
    await page.waitForTimeout(300);
    const read = () => page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".sp-pal")!;
      const b = root.getBoundingClientRect();
      const cs = getComputedStyle(root);
      return {
        visibility: cs.visibility,
        box: [Math.round(b.left), Math.round(b.top), Math.round(b.width)],
        ink: root.classList.contains("sp-pal--ink"),
        frame: [cs.backgroundColor, cs.borderRadius],
        rows: [...root.querySelectorAll<HTMLElement>(".sp-grp, .sp-res")].map((e) => {
          const r = e.getBoundingClientRect();
          return `${e.className.split(" ")[0]}|${Math.round(r.height)}|${(e.querySelector(".sp-t1")?.textContent ?? e.textContent ?? "").trim()}`;
        }),
        foot: root.querySelector(".sp-foot")?.textContent?.trim() ?? "",
        placeholder: root.querySelector("input")?.placeholder ?? "",
      };
    });
    const now = await read();
    console.log("[SV1-R8]", JSON.stringify(now));
    expect(now.rows.length, "phone rows read").toBeGreaterThan(4);
    if (process.env.SEARCH_V1_PHONE_OUT) {
      mkdirSync(dirname(process.env.SEARCH_V1_PHONE_OUT), { recursive: true });
      writeFileSync(process.env.SEARCH_V1_PHONE_OUT, JSON.stringify(now, null, 2));
    }
    const basePath = process.env.SEARCH_V1_PHONE_BASE ?? "reports/search-v1/phone-baseline.json";
    expect(existsSync(basePath), `the phone baseline ${basePath}`).toBe(true);
    expect(now).toEqual(JSON.parse(readFileSync(basePath, "utf8")));
  });
});
