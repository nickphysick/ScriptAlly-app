/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Drawer-3 run — chrome D and geometry 1, measured. §1: the stage block's one tint across three
 * stages, equal to the CARD's own band (the ladder cannot disagree with itself); §2: the desk's
 * bounds contract against .ws-window, with the ancestor chain proved un-clippable; §4: the shots.
 *
 * ⚠️ PRECONDITION: `node tests/e2e/seedCorrection.mjs`. Nothing here commits.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
import { mkdirSync, writeFileSync } from "node:fs";

const SHOTS = "reports/query-drawer-3-shots";
const out: Record<string, unknown> = {};

async function openDrawerOn(page: import("@playwright/test").Page, queryId: string, width: number) {
  await openRoute(page, "/queries", { width, height: 900 });
  await expect(page.locator(".qcc").first()).toBeVisible({ timeout: 30_000 });
  const card = page.locator(`[data-qcc-id="${queryId}"]`);
  await expect(card, `no card for ${queryId} — was seedCorrection run?`).toBeVisible();
  await card.click();
  await expect(page.locator(".qpn[data-on='true']")).toBeVisible();
  await page.locator(".qpn-tab", { hasText: "Tracking" }).click();
  await expect(page.locator(".qpn .tl-more").first()).toBeVisible({ timeout: 20_000 });
}

test("§1 · one tint across the block, equal to the card's band, three stages — 1440", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  const stages: [string, string][] = [["cor-move-b", "queried"], ["cor-move-a", "partialreq"], ["cor-closed", "rejected"]];
  for (const [id, label] of stages) {
    await openDrawerOn(page, id, 1440);
    const r = await page.evaluate((qid) => {
      const bg = (el: Element | null) => el ? getComputedStyle(el).backgroundColor : "MISSING";
      const qpn = [...document.querySelectorAll<HTMLElement>(".qpn")].find((e) => e.getBoundingClientRect().height > 0)!;
      const cardBand = document.querySelector(`[data-qcc-id="${qid}"] .qcc-band`);
      /* everything between the top bar and the tab rail, enumerated */
      const between = [".qpn-band", ".qpn-head", ".qpn-ms"].map((sel) => ({ sel, bg: bg(qpn.querySelector(sel)) }));
      return {
        band: bg(qpn.querySelector(".qpn-band")),
        head: bg(qpn.querySelector(".qpn-head")),
        ms: bg(qpn.querySelector(".qpn-ms")),
        cardBand: bg(cardBand),
        bar: bg(qpn.querySelector(".qpn-bar")),
        tabs: bg(qpn.querySelector(".qpn-tabs")),
        body: bg(qpn.querySelector(".qpn-body")),
        avatar: bg(qpn.querySelector(".qpn-avatar")),
        parchmentBetween: between.filter((b) => b.bg === "rgb(253, 250, 245)").map((b) => b.sel),
        illo: !!qpn.querySelector(".qpn-illo"),
      };
    }, id);
    out[`block-${label}`] = r;
    expect(r.band, `${label}: band ≠ head`).toBe(r.head);
    expect(r.band, `${label}: band ≠ ms`).toBe(r.ms);
    expect(r.band, `${label}: the drawer's tint is not the card's band`).toBe(r.cardBand);
    expect(r.bar, `${label}: the top bar left parchment`).toBe("rgb(253, 250, 245)");
    expect(r.tabs, `${label}: tabs are not white`).toBe("rgb(255, 255, 255)");
    expect(r.body, `${label}: body is not white`).toBe("rgb(255, 255, 255)");
    expect(r.avatar, `${label}: the chip is not white on the tint`).toBe("rgb(255, 255, 255)");
    expect(r.parchmentBetween, `${label}: parchment between bar and tabs`).toEqual([]);
    expect(r.illo, `${label}: the header slot is missing`).toBe(true);
    await page.screenshot({ path: `${SHOTS}/block-${label}-1440.png` });
    await page.keyboard.press("Escape");
  }
});

/**
 * ⚠️ A RECT LOCK CANNOT SEE A CLIPPED DESK — this replaces one (drawer-3 correction). The bounds
 * check was green on a build whose strip painted dead and whose title sat hard against it, because
 * `getBoundingClientRect` describes a BOX and says nothing about what is painted in it. These ask
 * the browser what is actually at the pixel.
 */
async function paintProbe(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const card = document.querySelector<HTMLElement>(".qcd-card")!;
    const c = card.getBoundingClientRect();
    const cs = getComputedStyle(card);
    const strip = parseFloat(cs.borderTopWidth);
    const h3 = card.querySelector<HTMLElement>("h3")!;
    const spot = card.querySelector<HTMLElement>(".qcd-spot");
    const hit = document.elementFromPoint(c.left + c.width / 2, c.top + strip / 2);
    const sr = spot?.getBoundingClientRect();
    return {
      stripPx: strip,
      stripColour: cs.borderTopColor,
      /* the pixel at the strip's midpoint belongs to the card (its border area) or to a descendant */
      stripHitInCard: !!hit && (hit === card || card.contains(hit)),
      stripHit: hit ? `${hit.tagName.toLowerCase()}.${(hit.className || "").toString().split(/\s+/)[0]}` : "NONE",
      stripBottom: c.top + strip,
      h3Top: h3.getBoundingClientRect().top,
      spotInsideCard: sr ? (sr.top >= c.top && sr.bottom <= c.bottom && sr.left >= c.left && sr.right <= c.right) : null,
      spotRect: sr ? { top: +sr.top.toFixed(1), bottom: +sr.bottom.toFixed(1) } : null,
      cardTop: c.top, cardBottom: c.bottom, cardH: c.height,
      chain: (() => { const out: string[] = []; let el = card.parentElement;
        while (el && el !== document.body) { out.push(el.className.toString().slice(0, 24) || el.tagName); el = el.parentElement; } return out; })(),
      scrollerOverflow: getComputedStyle(card.querySelector<HTMLElement>(".qcd-scroll")!).overflowY,
      cardOverflow: cs.overflowY,
    };
  });
}

for (const width of [1440, 2560] as const) {
  test(`§2 · the desk PAINTS its top, all three verbs, at ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openDrawerOn(page, "cor-move-b", width);
    const verbs: [string, string, string][] = [
      ["Record response", ".qcd-card .qrd-kinds", "respond"],
      ["Nudge", ".qcd-card .qrd-mail", "nudge"],
      ["Mark closed", ".qcd-card .qrd-kinds--closed", "closed"],
    ];
    for (const [verb, ready, key] of verbs) {
      await page.locator(".qpn-act", { hasText: verb }).first().click();
      await expect(page.locator(ready)).toBeVisible();
      /* the frame AFTER open — place() runs in a layout effect against .ws-window */
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const r = await paintProbe(page);
      out[`paint-${key}-${width}`] = r;

      /* the three paint claims */
      expect(r.stripHitInCard, `${key}: the strip's midpoint paints ${r.stripHit}, not the card`).toBe(true);
      expect(r.h3Top, `${key}: the title is flush to the strip`).toBeGreaterThanOrEqual(r.stripBottom + 12);
      expect(r.spotInsideCard, `${key}: the spot slot is not wholly inside the card`).toBe(true);
      /* and the strip is the STAGE's colour, not the neutral fallback the portal used to leave it */
      expect(r.stripPx).toBe(5);
      expect(r.stripColour, `${key}: the strip paints the #e0d5c8 fallback — the palette did not reach the portal`)
        .not.toBe("rgb(224, 213, 200)");

      /* the bounds contract still holds, as a floor rather than the whole claim */
      expect(r.cardTop).toBeGreaterThanOrEqual(122 - 0.5);
      expect(r.cardBottom).toBeLessThanOrEqual(880 - 12 + 1);
      expect(r.cardH).toBeLessThanOrEqual(770 - 24 + 1);
      expect(r.chain.length, `ancestors: ${r.chain.join(" → ")}`).toBe(1);
      expect(r.chain[0]).toMatch(/qcd/);
      expect(r.scrollerOverflow).toBe("auto");
      expect(r.cardOverflow, "the card scrolls its own box — the notch clips").toBe("visible");
      await page.keyboard.press("Escape");
    }
  });

  test(`§4 · the three verbs open, at ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openDrawerOn(page, "cor-move-b", width);
    await page.locator(".qpn-act", { hasText: "Record response" }).first().click();
    await expect(page.locator(".qcd-card .qrd-kinds")).toBeVisible();
    expect(await page.locator(".qcd-spot").count(), "the spot slot is missing").toBe(1);
    await page.screenshot({ path: `${SHOTS}/respond-${width}.png` });
    await page.keyboard.press("Escape");
    await page.locator(".qpn-act", { hasText: "Nudge" }).first().click();
    await expect(page.locator(".qcd-card .qrd-mail")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/nudge-${width}.png` });
    await page.keyboard.press("Escape");
    await page.locator(".qpn-act", { hasText: "Mark closed" }).first().click();
    await expect(page.locator(".qcd-card .qrd-kinds--closed")).toBeVisible();
    await page.screenshot({ path: `${SHOTS}/markclosed-${width}.png` });
    await page.keyboard.press("Escape");
  });
}

test("§4 · the drawer at rest, each tab — 1440", async ({ page }) => {
  mkdirSync(SHOTS, { recursive: true });
  await openDrawerOn(page, "cor-move-b", 1440);
  await page.screenshot({ path: `${SHOTS}/tab-tracking-1440.png` });
  await page.locator(".qpn-tab", { hasText: "Agent" }).click();
  await page.screenshot({ path: `${SHOTS}/tab-agent-1440.png` });
  await page.locator(".qpn-tab", { hasText: "Notes" }).click();
  await page.screenshot({ path: `${SHOTS}/tab-notes-1440.png` });
  writeFileSync("reports/query-drawer-3.json", JSON.stringify(out, null, 2));
});
