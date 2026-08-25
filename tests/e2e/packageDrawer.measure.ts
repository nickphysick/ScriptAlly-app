/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE PACKAGE DRAWER, ON THE RUNNING APP (packages Part 3) ══════════════════════════════════
 *
 * ⚠️ THE FOUR DISMISSAL ROUTES ARE DRIVEN, NOT READ. A source lock proves a handler was written; it
 * cannot prove the key reaches it. Escape in particular: `Form11Drawer` binds it at the document, so
 * whether it fires depends on what has focus — and "an on-panel handler is not a dismissal route
 * unless something focuses the panel" is precisely the fault this case exists to catch.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const openDrawer = async (page: import("@playwright/test").Page, width: number) => {
  await openRoute(page, "/manuscripts/packages", { width, height: 1200 });
  await page.waitForTimeout(900);
  const card = page.locator(".pkgb-pkgcard .pkgb-sopen").first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await card.click();
  await page.waitForTimeout(500);
};
const isOpen = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const el = document.querySelector(".pkgdd-body");
    if (!el) return false;
    const b = el.getBoundingClientRect();
    return b.width > 0 && b.height > 0;
  });

test("the drawer opens from a card and reads what the card cannot", async ({ page }) => {
  const out: Record<string, unknown>[] = [];
  for (const width of [1440, 1920]) {
    await openDrawer(page, width);
    expect(await isOpen(page), `the card did not open a drawer at ${width}`).toBe(true);

    const r = await page.evaluate(() => {
      const t = (el: Element | null) => (el as HTMLElement | null)?.innerText.trim() ?? "";
      const body = document.querySelector(".pkgdd-body") as HTMLElement;
      const panel = body.closest("[class*=f11]") ?? body.parentElement!;
      const slots = [...body.querySelectorAll(".pkgdd-slot")].map((s) => {
        const open = s.querySelector(".pkgdd-open") as HTMLElement | null;
        return {
          band: t(s.querySelector(".pkgb-chlbl")),
          words: t(s.querySelector(".pkgb-chrt")) || null,
          name: t(s.querySelector(".pkgdd-slotname")).split("\n")[0],
          version: t(s.querySelector(".pkgb-mver")) || null,
          /* ⚠️ CLAMPED MEANS THE BOX SHOWS TWO LINES OF A LONGER TEXT — measured, not counted in a
             string. `scrollHeight > clientHeight` on a `-webkit-line-clamp` box is the overflow it
             is hiding; the line count comes from the box height over the line height. */
          openLines: open
            ? Math.round(open.getBoundingClientRect().height / parseFloat(getComputedStyle(open).lineHeight))
            : 0,
          openClamped: open ? open.scrollHeight - open.clientHeight > 1 : false,
          hasOpenBtn: !!s.querySelector(".pkgdd-omat"),
          none: !!s.querySelector(".pkgdd-none"),
        };
      });
      return {
        panelW: Math.round((panel as HTMLElement).getBoundingClientRect().width),
        headBand: t(document.querySelector(".pkgdd-head .pkgb-chlbl")),
        /* ⚠️ THE ✕ AND THE BAND'S RIGHT LABEL SHARE A CORNER — measured as boxes, because they
           overlapped and every per-element check passed while the page read `LOCKE✕`. */
        xOverlapsLabel: (() => {
          const x = document.querySelector(".pkgdd-x")?.getBoundingClientRect();
          const l = document.querySelector(".pkgdd-head .pkgb-chrt")?.getBoundingClientRect();
          if (!x || !l) return false;
          return !(x.right <= l.left + 1 || x.left >= l.right - 1 || x.bottom <= l.top + 1 || x.top >= l.bottom - 1);
        })(),
        headBandBg: getComputedStyle(document.querySelector(".pkgdd-head .pkgb-cardhead")!).backgroundImage.slice(0, 60),
        cardBandBg: getComputedStyle(document.querySelector(".pkgb-pkgcard .pkgb-cardhead")!).backgroundImage.slice(0, 60),
        name: t(document.querySelector(".pkgdd-head h2")),
        score: [...document.querySelectorAll(".pkgdd-scell")].map((c) => t(c).replace(/\n/g, " ")),
        slots,
        holders: [...body.querySelectorAll(".pkgdd-hrow")].map((h) => ({
          dot: !!h.querySelector("svg, .sd-dot, [class*=status]"),
          agent: t(h.querySelector(".pkgdd-hagent")).split("\n")[0],
          sent: t(h.querySelector(".pkgdd-hsent")),
        })),
        returns: t(body.querySelector(".pkgdd-returns")) || null,
        lock: t(body.querySelector(".pkgdd-lock")) || null,
        footer: [...document.querySelectorAll(".pkgdd-act, .pkgdd-close")].map((b) => t(b)),
        /* D16 — nothing in the body writes */
        writable: body.querySelectorAll("input, textarea, select, [contenteditable]").length,
      };
    });
    out.push({ width, ...r });

    /* D8/D9 — the panel's width, and the head repeating the card's band in the same blue */
    expect(r.panelW, `panel width at ${width}`).toBeGreaterThanOrEqual(440);
    expect(r.headBand.toLowerCase()).toContain("submission package");
    expect(r.xOverlapsLabel, "the close control sits on the band's right label").toBe(false);
    expect(r.headBandBg, "the drawer's band is not the card's blue").toBe(r.cardBandBg);
    expect(r.score.length).toBe(3);

    /* D10 — three slots, each banded, each with an opening and a way through */
    expect(r.slots.length, `slots at ${width}`).toBe(3);
    for (const s of r.slots) {
      expect(s.band.length, "a slot with no band label").toBeGreaterThan(0);
      if (!s.none) {
        expect(s.hasOpenBtn, `${s.name} offers no way to open the material`).toBe(true);
        /* ⚠️ THE CLAMP IS PROVED ON A SLOT THAT ACTUALLY OVERFLOWS — a short opening is not clamped
           and asserting two lines on it would be asserting the content, not the rule. */
        if (s.openClamped) expect(s.openLines, `${s.name} shows ${s.openLines} lines`).toBeLessThanOrEqual(2);
      }
    }

    /* D11 — the chip is on the sample and nowhere else */
    const sample = r.slots.find((s) => /sample/i.test(s.band));
    const others = r.slots.filter((s) => !/sample/i.test(s.band));
    expect(sample, "no sample slot").toBeTruthy();
    for (const o of others) expect(o.version, `${o.band} drew a version chip`).toBeNull();

    /* D12 — every holder row names somebody and carries a dot */
    for (const h of r.holders) {
      expect(h.agent.length, "a holder with no name").toBeGreaterThan(0);
      expect(h.dot, `${h.agent} has no StatusDot`).toBe(true);
      expect(h.sent).toMatch(/^(SENT |DATE NOT RECORDED)/i);
    }

    /* D13 — one returns line, no bars */
    if (r.returns) expect(r.returns).toMatch(/^\d+ SENT · \d+ REPLIED · \d+ REQUESTS?$/i);

    /* D16 — the body offers nothing that writes */
    expect(r.writable, `the drawer body has ${r.writable} editable controls`).toBe(0);
  }
  console.log(JSON.stringify(out, null, 2));
});

test("all four dismissal routes close it", async ({ page }) => {
  const routes: Record<string, boolean> = {};

  /* 1 — the header × */
  await openDrawer(page, 1440);
  await page.locator(".pkgdd-x").click();
  await page.waitForTimeout(600);
  routes["×"] = !(await isOpen(page));

  /* 2 — the footer Close */
  await openDrawer(page, 1440);
  await page.locator(".pkgdd-close").click();
  await page.waitForTimeout(600);
  routes["footer Close"] = !(await isOpen(page));

  /* 3 — Escape. ⚠️ DRIVEN AT THE PAGE, NOT DISPATCHED AT THE PANEL: the handler is bound at the
        document, so pressing the key wherever focus happens to be is the only honest test of it. */
  await openDrawer(page, 1440);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);
  routes["Escape"] = !(await isOpen(page));

  /**
   * 4 — the scrim.
   *
   * ⚠️ THE CLICK POINT IS DERIVED FROM THE PANEL'S MEASURED BOX, NOT ASSUMED. A hardcoded x=60
   * reported "scrim did not close the drawer" — and it was true: the panel was AT x=24, because the
   * primitive's fixed wrapper resolves to the full viewport width and its flex row put the panel
   * hard left. The probe was right about the symptom and wrong about the cause, which is what a
   * fixed coordinate buys you. Clicking a measured distance clear of the panel tests the scrim
   * wherever the panel is.
   */
  await openDrawer(page, 1440);
  const box = await page.evaluate(() => {
    const b = document.querySelector(".pkgdd-body")!.getBoundingClientRect();
    return { left: b.left, right: b.right, w: innerWidth };
  });
  /* the wider clear side */
  const x = box.left > box.w - box.right ? Math.round(box.left / 2) : Math.round((box.right + box.w) / 2);
  await page.mouse.click(x, 400);
  await page.waitForTimeout(600);
  routes["scrim"] = !(await isOpen(page));

  /* ⚠️ AND THE PANEL IS ON THE RIGHT (D8) — asserted, because it was not. */
  await openDrawer(page, 1440);
  const side = await page.evaluate(() => {
    const b = document.querySelector(".pkgdd-body")!.getBoundingClientRect();
    return { left: Math.round(b.left), rightGap: Math.round(innerWidth - b.right) };
  });
  console.log("panel box " + JSON.stringify(side));
  expect(side.rightGap, `the drawer is ${side.left}px from the left — it should hug the right`)
    .toBeLessThan(side.left);

  console.log(JSON.stringify(routes, null, 2));
  for (const [name, closed] of Object.entries(routes)) {
    expect(closed, `${name} did not close the drawer`).toBe(true);
  }
});
