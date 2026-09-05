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

for (const width of [1440, 2560] as const) {
  test(`§2 · the desk's bounds contract, button-anchored, at ${width}`, async ({ page }) => {
    mkdirSync(SHOTS, { recursive: true });
    await openDrawerOn(page, "cor-move-b", width);
    await page.locator(".qpn-act", { hasText: "Record response" }).first().click();
    await expect(page.locator(".qcd-card .qrd")).toBeVisible();
    const r = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".qcd-card")!;
      const win = document.querySelector<HTMLElement>(".ws-window")!.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      /* the ancestor chain, card → body: anything that could clip or contain */
      const chain: string[] = [];
      let el: HTMLElement | null = card.parentElement;
      while (el && el !== document.body) { chain.push(el.className.toString().slice(0, 24) || el.tagName); el = el.parentElement; }
      const scroller = card.querySelector<HTMLElement>(".qcd-scroll")!;
      return {
        cardTop: c.top, cardBottom: c.bottom, cardH: c.height,
        winTop: win.top, winBottom: win.bottom, winH: win.height,
        chain, cardOverflow: getComputedStyle(card).overflowY,
        scrollerOverflow: getComputedStyle(scroller).overflowY,
        notch: card.getAttribute("data-notch"),
      };
    });
    out[`bounds-${width}`] = r;
    expect(r.cardTop, "top bound").toBeGreaterThanOrEqual(r.winTop + 12);
    expect(r.cardBottom, "bottom bound").toBeLessThanOrEqual(r.winBottom - 12 + 1);
    expect(r.cardH, "height bound").toBeLessThanOrEqual(r.winH - 24 + 1);
    /* the only element between the card and the body is the desk's OWN portal root — a
       pointer-events:none fixed wrapper with no overflow; any page ancestor here is the fault */
    expect(r.chain.length, `ancestors: ${r.chain.join(" → ")}`).toBe(1);
    expect(r.chain[0], "the card's parent is not the desk's own root").toMatch(/^qcd /);
    expect(r.scrollerOverflow, "no internal scroller").toBe("auto");
    expect(r.cardOverflow, "the card scrolls its own box — the notch clips").toBe("visible");
    expect(r.notch).toBe("on");
    await page.keyboard.press("Escape");
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
