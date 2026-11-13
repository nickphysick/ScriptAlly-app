/**
 * Non-workspace v1.1 — items 3, 4b, 4c, measured on the rendered page.
 *
 *  3   The clock timeline: at 1440, 1280 and 390, for every "goes quiet" option, no two label boxes overlap or come
 *      within 16px, and no week label is clipped by its container. ⚠️ IT WRITES: each option is saved, and the
 *      original value is put back in the same run, on the same page (nothing navigates between).
 *  4b  The settings rail: "Preferences" has at least 4px clear on each side, active and not.
 *  4c  The not-found heading is in the typewriter face.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

type Box = { l: number; r: number; t: number; b: number };

/** Every label box in the clock (node titles, node dates, week labels), and whether each week label is clipped. */
const clockBoxes = (page: Page) =>
  page.evaluate(() => {
    const card = document.querySelector('[data-acct="clock"] .ct-line') as HTMLElement | null;
    if (!card) return null;
    const box = (el: Element) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; };
    const nodes = [...card.querySelectorAll(".ct-node")].map((n) => {
      const parts = [...n.querySelectorAll("b, small")].map(box);
      return { l: Math.min(...parts.map((p) => p.l)), r: Math.max(...parts.map((p) => p.r)), t: Math.min(...parts.map((p) => p.t)), b: Math.max(...parts.map((p) => p.b)) };
    });
    const weeks = [...card.querySelectorAll(".ct-seg span")].map(box);
    /* the clipping container: the nearest ancestor that clips (overflow not visible), else the card */
    let clip: HTMLElement | null = card;
    while (clip && getComputedStyle(clip).overflow === "visible" && getComputedStyle(clip).overflowX === "visible") clip = clip.parentElement;
    const c = clip ? box(clip) : box(card);
    return { nodes, weeks, clip: c };
  });

const gap = (a: Box, b: Box) => {
  const dx = Math.max(b.l - a.r, a.l - b.r, 0);
  const dy = Math.max(b.t - a.b, a.t - b.b, 0);
  return Math.max(dx, dy);
};

for (const vp of [{ width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 390, height: 844 }]) {
  test(`3 · the clock's labels keep 16px apart and the week labels are whole — ${vp.width}`, async ({ page }) => {
    /* the sign-in helper waits for the desktop shell, so sign in wide, then narrow to the width under test */
    await openRoute(page, "/account/preferences", { width: 1440, height: 900 });
    await page.setViewportSize(vp);
    await page.goto("/account/preferences");
    const sel = page.locator("#pf-quiet");
    await expect(sel).toBeVisible();
    const original = await sel.inputValue();
    const options = await sel.locator("option").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value));
    expect(options.length, "the goes-quiet options").toBeGreaterThanOrEqual(5);
    try {
      for (const v of options) {
        await sel.selectOption(v);
        await page.waitForTimeout(400);
        const m = await clockBoxes(page);
        expect(m, "the clock is on the page").not.toBeNull();
        expect(m!.nodes.length, `nodes at ${v} weeks`).toBe(4);
        expect(m!.weeks.length, `week labels at ${v} weeks`).toBe(3);
        const labels: Box[] = [...m!.nodes, ...m!.weeks];
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
          expect(gap(labels[i], labels[j]), `labels ${i} and ${j} at ${v} weeks, ${vp.width}px`).toBeGreaterThanOrEqual(16);
        }
        for (const w of m!.weeks) {
          expect(w.l, "week label left").toBeGreaterThanOrEqual(m!.clip.l - 0.5);
          expect(w.r, "week label right").toBeLessThanOrEqual(m!.clip.r + 0.5);
          expect(w.t, "week label top").toBeGreaterThanOrEqual(m!.clip.t - 0.5);
          expect(w.b, "week label bottom").toBeLessThanOrEqual(m!.clip.b + 0.5);
        }
      }
    } finally {
      await sel.selectOption(original);
      await page.waitForTimeout(600);
    }
  });
}

test("4b · \"Preferences\" has at least 4px clear on each side in the settings rail", async ({ page }) => {
  for (const path of ["/account/preferences", "/account/profile"]) {
    await openRoute(page, path, { width: 1440, height: 900 });
    const m = await page.evaluate(() => {
      const l = [...document.querySelectorAll(".wsr-setnav .wsr-lbl")].find((x) => x.textContent === "Preferences") as HTMLElement | undefined;
      if (!l) return null;
      const item = l.closest(".wsr-ni") as HTMLElement, rail = l.closest(".wsr") as HTMLElement | null;
      const lr = l.getBoundingClientRect(), ir = item.getBoundingClientRect();
      return { left: lr.left - ir.left, right: ir.right - lr.right, size: getComputedStyle(l).fontSize, railW: rail?.getBoundingClientRect().width ?? null, others: [...document.querySelectorAll(".wsr-setnav .wsr-lbl")].map((x) => getComputedStyle(x).fontSize) };
    });
    expect(m, `the label on ${path}`).not.toBeNull();
    expect(m!.left, `left clear on ${path}`).toBeGreaterThanOrEqual(4);
    expect(m!.right, `right clear on ${path}`).toBeGreaterThanOrEqual(4);
    expect(new Set(m!.others), "every rail label one size").toEqual(new Set([m!.size]));
    expect(m!.railW, "the rail is not widened").toBe(80);
  }
});

test("4c · the not-found heading is in the typewriter face", async ({ page }) => {
  await openRoute(page, "/no-such-page-nw11", { width: 1440, height: 900 });
  const face = await page.locator(".nf-card .nf-h").evaluate((h) => getComputedStyle(h).fontFamily);
  expect(face).toMatch(/Special Elite/);
});
