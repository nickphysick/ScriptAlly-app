/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sidebar rail v1 (5 Nov) — the labelled rail, the open section's card, and the full sidebar that
 * floats or pins. Refs: design-refs/shell/sidebar-rail-v1.css + .js. Report: reports/sidebar-rail-v1/.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/sidebarRail.measure.ts --project=measure`.
 * SR_MUTATE=<name> applies one named break in the page, so each lock can be watched going red.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const MUTATE = process.env.SR_MUTATE ?? "";
/** Is this named break switched on? SR_MUTATE takes a comma list, or "all". */
const broken = (name: string) => MUTATE === "all" || MUTATE.split(",").includes(name);
/** A break that is a stylesheet rule, added to every page the test opens. */
async function breakCss(page: Page, name: string, css: string) {
  if (!broken(name)) return;
  await page.addInitScript((c) => {
    const add = () => { const st = document.createElement("style"); st.textContent = c; document.head.appendChild(st); };
    if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
  }, css);
}
/* SR_SHOTS=<dir> writes screenshots there (Phase 4 points it at reports/sidebar-rail-v1/) */
const SHOTS = process.env.SR_SHOTS ?? "";
async function shot(page: Page, name: string, clip?: { x: number; y: number; width: number; height: number }) {
  if (!SHOTS) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, clip });
}
const WIDE = { width: 1512, height: 982 };

/** The visible text of the folder tab's sibling links (the measuring copy is aria-hidden and skipped). */
async function tabSiblings(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[data-shell="tab-siblings"]');
    if (!row) return [];
    return [...row.querySelectorAll<HTMLElement>(".ws-ftsib")]
      .filter((b) => !b.classList.contains("ws-ftmore"))
      .map((b) => (b.getAttribute("aria-label") || b.textContent || "").trim());
  });
}

test.describe("sidebar rail v1 — Phase 1, the nav model", () => {
  test("SR1.1 the folder tab follows the new sections", async ({ page }) => {
    await openRoute(page, "/manuscripts", WIDE);
    await expect(page.locator(".ws-ftn")).toHaveText("Manuscripts");
    const ms = await tabSiblings(page);
    console.log("[SR1.1] /manuscripts siblings", JSON.stringify(ms));
    expect(ms).toEqual(["Comparable titles"]);
    await openRoute(page, "/manuscripts/packages", WIDE);
    await expect(page.locator(".ws-ftn")).toHaveText("Submission packages");
    const pk = await tabSiblings(page);
    console.log("[SR1.1] /manuscripts/packages siblings", JSON.stringify(pk));
    expect(pk).toEqual([]);
  });

  test("SR1.2 the palette lists the nav's pages by the nav's names", async ({ page }) => {
    await openRoute(page, "/dashboard", WIDE);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    const input = page.locator('.sp-pal [role="combobox"]');
    await expect(input).toBeVisible();
    for (const [term, title] of [["respon", "Responses"], ["analy", "Analytics"], ["submission", "Submission packages"], ["comparable", "Comparable titles"]] as const) {
      await input.fill(term);
      const titles = await page.locator(".sp-res .sp-t1").allTextContents();
      console.log(`[SR1.2] "${term}"`, JSON.stringify(titles.slice(0, 6)));
      expect(titles.map((t) => t.trim()), term).toContain(title);
    }
  });

  test("SR1.3 the phone bar names /queries Query Centre", async ({ page }) => {
    /* openRoute waits on the sidebar, which a phone hides: sign in wide, then reload at the phone's size */
    await openRoute(page, "/queries", WIDE);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator(".sv2-crumb b").first()).toBeVisible({ timeout: 30_000 });
    const crumb = (await page.locator(".sv2-crumb b").first().textContent())?.trim();
    console.log("[SR1.3] phone crumb", crumb);
    expect(crumb).toBe("Query Centre");
  });
});

/* ── Phase 2 — the rail ─────────────────────────────────────────────────────────────────────────── */

/** Start on the rail: the shell's stored state says the sidebar is the rail. */
async function onRail(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("scriptally:sidebar-collapsed", "1");
      localStorage.setItem("scriptally:sidebar-pinned", "0");
    } catch { /* first visit */ }
  });
}

type Fit = { text: string; lines: number; inside: boolean; overflow: number };
/** Every visible label in the rail: one line, and wholly inside its row. */
async function labelFits(page: Page): Promise<Fit[]> {
  return page.evaluate(() => {
    const out: Fit[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(".wsr .wsr-lbl, .wsr .wsr-spl, .wsr .wsr-t")) {
      const row = el.closest<HTMLElement>("button");
      if (!row || row.offsetWidth === 0 || getComputedStyle(row).visibility === "hidden") continue;
      const tray = el.closest(".wsr-grp");
      if (el.classList.contains("wsr-spl") && !tray?.classList.contains("open")) continue;
      if (el.closest(".wsr-setnav") && getComputedStyle(el.closest(".wsr-setnav")!).display === "none") continue;
      if (el.closest(".wsr-nav") && getComputedStyle(el.closest(".wsr-nav")!).display === "none") continue;
      const r = el.getBoundingClientRect();
      const b = row.getBoundingClientRect();
      const lh = parseFloat(getComputedStyle(el).lineHeight) || r.height;
      out.push({
        text: (el.textContent || "").trim(),
        lines: Math.round(r.height / lh),
        inside: r.left >= b.left - 0.5 && r.right <= b.right + 0.5 && r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5,
        overflow: el.scrollWidth - el.clientWidth,
      });
    }
    return out;
  });
}

async function navScroll(page: Page) {
  return page.evaluate(() => {
    const n = document.querySelector<HTMLElement>(".wsr-nav")!;
    const head = document.querySelector<HTMLElement>(".wsr-lgo")!.getBoundingClientRect();
    const foot = document.querySelector<HTMLElement>(".wsr-av")!.getBoundingClientRect();
    return { scrolls: n.scrollHeight > n.clientHeight + 1, sh: n.scrollHeight, ch: n.clientHeight, headTop: head.top, footBottom: foot.bottom, vh: innerHeight };
  });
}

test.describe("sidebar rail v1 — Phase 2, the rail", () => {
  test("SR2.1 the rail is 80px and every label is one line inside its row", async ({ page }) => {
    await onRail(page);
    await breakCss(page, "label", ".wsr-spl { font-size: 15px !important }");
    await breakCss(page, "railw", ".ws-panel { width: 84px !important }");
    const all: Fit[] = [];
    for (const route of ["/queries", "/agents", "/manuscripts", "/todo", "/manuscripts/packages", "/dashboard"]) {
      await openRoute(page, route, WIDE);
      const w = await page.locator("#ws-sidebar").evaluate((e) => (e as HTMLElement).offsetWidth);
      expect(w, route).toBe(80);
      await shot(page, `rail-${route.replace(/\//g, "_")}`, { x: 0, y: 0, width: 400, height: 982 });
      const fits = await labelFits(page);
      console.log(`[SR2.1] ${route}`, JSON.stringify(fits.map((f) => `${f.text}:${f.lines}${f.inside ? "" : "!OUT"}`)));
      all.push(...fits);
    }
    expect(all.length).toBeGreaterThan(20);
    const texts = new Set(all.map((f) => f.text));
    for (const t of ["Dashboard", "Queries", "Agents", "Manuscript", "Materials", "Tasks", "Query Centre", "Responses", "Analytics", "Contact list", "Discover", "Manuscripts", "Comps", "To-do list", "Calendar", "Corkboard", "Feedback"]) {
      expect([...texts], `label "${t}" was measured`).toContain(t);
    }
    for (const f of all) {
      expect(f.lines, `${f.text} is one line`).toBe(1);
      expect(f.inside, `${f.text} sits inside its row`).toBe(true);
      expect(f.overflow, `${f.text} is not cut`).toBeLessThanOrEqual(0);
    }
  });

  test("SR2.2 the nav scrolls only on a short window, with the head and foot in view", async ({ page }) => {
    await onRail(page);
    await breakCss(page, "scroll", ".wsr-grp .wsr-ni { height: 92px !important }");
    for (const h of [982, 900, 760]) {
      await openRoute(page, "/queries", { width: 1512, height: h });
      const r = await navScroll(page);
      console.log(`[SR2.2] ${h}px`, JSON.stringify(r));
      if (h === 760) expect(r.scrolls, "760 scrolls").toBe(true);
      else expect(r.scrolls, `${h} does not scroll`).toBe(false);
      expect(r.headTop).toBeGreaterThanOrEqual(0);
      expect(r.footBottom).toBeLessThanOrEqual(r.vh);
    }
  });

  test("SR2.3 a section goes back to the page last used in it", async ({ page }) => {
    await onRail(page);
    if (broken("memory")) await page.addInitScript(() => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k: string, v: string) { if (k !== "scriptally:rail-last-page") set.call(this, k, v); };
    });
    await openRoute(page, "/agents", WIDE);
    await page.locator('.wsr-grp[data-sec="agents"] .wsr-sp[data-go="a-disc"]').click();
    await expect(page).toHaveURL(/\/agents\/discover$/);
    await page.locator('.wsr-ni[data-sec="tasks"]').click();
    await expect(page).toHaveURL(/\/todo$/);
    await page.locator('.wsr-ni[data-sec="agents"]').click();
    await expect(page).toHaveURL(/\/agents\/discover$/);
    const cur = await page.locator('.wsr-grp[data-sec="agents"].open .wsr-sp.wsr-cur').textContent();
    console.log("[SR2.3] Agents card marks", cur);
    expect(cur?.trim()).toBe("Discover");
  });

  test("SR2.4 off-nav routes light nothing; settings swap in their own rail", async ({ page }) => {
    await onRail(page);
    await openRoute(page, "/help", WIDE);
    if (broken("offnav")) await page.evaluate(() => document.querySelector(".wsr-ni[data-sec=agents]")?.classList.add("wsr-on"));
    expect(await page.locator(".wsr .wsr-on").count(), "/help lights nothing").toBe(0);
    await openRoute(page, "/account/profile", WIDE);
    await expect(page.locator(".wsr.wsr-settings")).toHaveCount(1);
    await expect(page.locator('.wsr-setni[data-set="profile"]')).toHaveClass(/wsr-on/);
    const labels = (await page.locator(".wsr-setnav .wsr-lbl").allTextContents()).map((t) => t.trim());
    console.log("[SR2.4] settings rail", JSON.stringify(labels));
    expect(labels).toEqual(["Back", "Profile", "Security", "Plan", "Alerts", "Settings", "Tasks", "Your data"]);
    await page.locator(".wsr-back").click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.locator(".wsr.wsr-settings")).toHaveCount(0);
  });

  test("SR2.5 a To-do count of 128 reads 99+", async ({ page }) => {
    await onRail(page);
    await page.addInitScript(() => { (window as unknown as { __SA_RAIL_COUNT?: number }).__SA_RAIL_COUNT = 128; });
    await openRoute(page, "/queries", WIDE);
    const ct = page.locator('.wsr-ni[data-sec="tasks"] .wsr-ct');
    if (broken("count")) await ct.evaluate((e) => { e.textContent = "128"; });
    await expect(ct).toHaveText("99+");
  });

  test("SR2.6 on a touch screen the expand control is there without hover", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, isMobile: true, hasTouch: true, storageState: "tests/e2e/.auth/state.json" });
    const page = await ctx.newPage();
    await onRail(page);
    await breakCss(page, "touch", ".wsr-tog { opacity: 0 !important; pointer-events: none !important }");
    await openRoute(page, "/queries");
    const hoverNone = await page.evaluate(() => matchMedia("(hover: none)").matches);
    const tog = await page.locator(".wsr-tog").evaluate((e) => {
      const s = getComputedStyle(e); const r = e.getBoundingClientRect();
      return { opacity: s.opacity, pointer: s.pointerEvents, w: r.width, h: r.height, top: r.top };
    });
    console.log("[SR2.6]", JSON.stringify({ hoverNone, tog }));
    expect(hoverNone).toBe(true);
    expect(Number(tog.opacity)).toBe(1);
    expect(tog.pointer).toBe("auto");
    expect(tog.w).toBeGreaterThan(0);
    await ctx.close();
  });
});
