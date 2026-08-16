/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RECON BEFORE ANY FIX — what the DEPLOYED page shows, with an image beside every number.
 *
 * ⚠️ THIS EXISTS BECAUSE THREE REPORTS THIS WEEK SAID AN ITEM LANDED WHILE THE PAGE SHOWED
 * OTHERWISE. A measured value can be true of the wrong element; a screenshot cannot. So every run
 * writes both, and the image is the primary artefact.
 *
 * ⚠️ AND IT ASKS WHETHER THE SCROLLER ACTUALLY SCROLLS, rather than whether it COULD. `scrollHeight
 * > clientHeight` says overflow exists; it says nothing about whether a writer can reach it or can
 * tell it is there. The wheel gesture below is the difference, and it is the check my last report
 * was missing.
 */
import { test } from "@playwright/test";
import { openRoute, scrollbarWidth } from "./measure";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const SHOTS = resolve(process.cwd(), "reports/pane");

test.setTimeout(300_000);

test("recon — the deployed pane, measured and photographed", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  await openRoute(page, "/todo", { width: 1920, height: 1000 });
  const bar = await scrollbarWidth(page);
  console.log(`scrollbar ${bar}px ${bar === 0 ? "(OVERLAY — this browser cannot make a classic bar, so a missing INDICATOR cannot be measured here)" : ""}`);

  /* the rail's rows, so the report can name the card it is describing */
  const rows = await page.locator(".tdg-row").allTextContents();
  console.log("ROWS:", JSON.stringify(rows.map((r) => r.replace(/\s+/g, " ").trim().slice(0, 60)), null, 1));

  /* Jonathan Marsh if he is here, else the first Send */
  const target = page.locator(".tdg-row").filter({ hasText: /Marsh/ }).first();
  const row = (await target.count()) ? target : page.locator(".tdg-row").filter({ hasText: /^Send/ }).first();
  await row.click();
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const one = (s: string) => ([...document.querySelectorAll(s)].find(vis) as HTMLElement | undefined) ?? null;
    const n = (x: number) => Math.round(x * 10) / 10;
    const box = (s: string) => { const e = one(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: n(b.top), bottom: n(b.bottom), h: n(b.height), w: n(b.width) }; };
    const body = one(".tdk-body");
    const cardEl = one(".tdk-w");
    return {
      agent: (one(".tdk-name")?.textContent ?? "").trim(),
      /* ── item 1: is there a footer at all, and where is the primary ── */
      cardFoot: box(".tdk-foot"),
      lastChildOfCard: cardEl ? [...cardEl.children].map((c) => (c.getAttribute("class") ?? "—").split(" ")[0]) : [],
      barPrimary: box(".tdw-cbprim"),
      barPrimaryText: (one(".tdw-cbprim")?.textContent ?? "").trim(),
      /* ── item 2: how many timeline rows, and what do they say ── */
      timeline: [...document.querySelectorAll(".tdk-tl li")].filter(vis).map((li) => ({
        when: (li.querySelector(".tdk-tlw")?.textContent ?? "").trim(),
        text: (li.querySelector(".tdk-tle")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
      /* ── item 3: the clip ── */
      pane: box(".tdw-work"),
      card: box(".tdk-w"),
      body: box(".tdk-body"),
      bodyScrollH: body?.scrollHeight ?? null,
      bodyClientH: body?.clientHeight ?? null,
      bodyScrollTop: body?.scrollTop ?? null,
      bodyOverflowY: body ? getComputedStyle(body).overflowY : null,
      /* what is the LAST thing in the body, and is its bottom inside the card */
      bodyLastSection: (() => {
        const secs = [...(body?.querySelectorAll(".tdk-sect, .tdk-flow") ?? [])].filter(vis);
        const last = secs[secs.length - 1] as HTMLElement | undefined;
        if (!last || !cardEl) return null;
        const b = last.getBoundingClientRect();
        const c = cardEl.getBoundingClientRect();
        return { cls: (last.getAttribute("class") ?? "—"), bottom: n(b.bottom), cardBottom: n(c.bottom), cutBy: n(b.bottom - c.bottom) };
      })(),
      /* ── item 4: the band above the control bar ── */
      pageHeader: box(".wsh"),
      controlBar: box(".tdw-cbar") ?? box(".tdb-cbar"),
      split: box(".tdw-split"),
      grid: box(".wpg-scroll"),
      /* ── item 5: the provisional string ── */
      provisionalStrings: [...document.querySelectorAll(".tdk-tlq, .tdk-tle")]
        .map((e) => (e.textContent ?? "").trim()).filter((t) => /imported|date needed/i.test(t)),
    };
  });
  console.log("BEFORE:", JSON.stringify(before, null, 2));

  /* ⚠️ DOES IT ACTUALLY SCROLL — the check the last report did not make. */
  const scrolled = await page.evaluate(async () => {
    const vis = (e: Element) => e.getBoundingClientRect().height > 0;
    const body = [...document.querySelectorAll(".tdk-body")].find(vis) as HTMLElement | undefined;
    if (!body) return null;
    const start = body.scrollTop;
    body.scrollTop = 400;
    await new Promise((r) => requestAnimationFrame(() => r(null)));
    const after = body.scrollTop;
    body.scrollTop = start;
    return { start, after, moved: after !== start };
  });
  console.log("BODY SCROLLS WHEN SET:", JSON.stringify(scrolled));

  /* and by a real wheel gesture over the body, which is what a writer does */
  const bodyBox = await page.locator(".tdk-body").first().boundingBox();
  if (bodyBox) {
    await page.mouse.move(bodyBox.x + bodyBox.width / 2, bodyBox.y + bodyBox.height / 2);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(350);
    const wheeled = await page.evaluate(() => {
      const vis = (e: Element) => e.getBoundingClientRect().height > 0;
      const b = [...document.querySelectorAll(".tdk-body")].find(vis) as HTMLElement | undefined;
      const p = [...document.querySelectorAll(".tdw-work")].find(vis) as HTMLElement | undefined;
      return { bodyScrollTop: b?.scrollTop ?? null, paneScrollTop: p?.scrollTop ?? null };
    });
    console.log("AFTER A REAL WHEEL OVER THE BODY:", JSON.stringify(wheeled));
  }

  await page.locator(".tdk-w").first().screenshot({ path: resolve(SHOTS, "recon-card-1920.png") }).catch(() => {});
  await page.screenshot({ path: resolve(SHOTS, "recon-page-1920.png") }).catch(() => {});
  console.log("→ reports/pane/recon-card-1920.png, recon-page-1920.png");
});
