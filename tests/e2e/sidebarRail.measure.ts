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
import { openRoute, liftMotionSuppression } from "./measure";

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
  test("SR1.1 the folder tab follows the sections", async ({ page }) => {
    await openRoute(page, "/manuscripts", WIDE);
    await expect(page.locator(".ws-ftn")).toHaveText("Manuscripts");
    const ms = await tabSiblings(page);
    console.log("[SR1.1] /manuscripts siblings", JSON.stringify(ms));
    /* sidebar materials v1 (6 Nov): Your book = Manuscripts · Versions; Materials = Query letters · Comps · Packages */
    expect(ms).toEqual(["Versions"]);
    await openRoute(page, "/manuscripts/versions", WIDE);
    await expect(page.locator(".ws-ftn")).toHaveText("Versions");
    expect(await tabSiblings(page)).toEqual(["Manuscripts"]);
    await openRoute(page, "/materials/letters", WIDE);
    await expect(page.locator(".ws-ftn")).toHaveText("Query letters");
    const ql = await tabSiblings(page);
    console.log("[SR1.1] /materials/letters siblings", JSON.stringify(ql));
    expect(ql).toEqual(["Comparable titles", "Submission packages"]);
    await openRoute(page, "/queries/packages", WIDE);
    await expect(page.locator(".ws-ftn")).toHaveText("Submission packages");
    const pk = await tabSiblings(page);
    console.log("[SR1.1] /queries/packages siblings", JSON.stringify(pk));
    expect(pk).toEqual(["Query letters", "Comparable titles"]);
  });

  test("SR1.2 the palette lists the nav's pages by the nav's names", async ({ page }) => {
    await openRoute(page, "/dashboard", WIDE);
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    const input = page.locator('.sp-pal [role="combobox"]');
    await expect(input).toBeVisible();
    for (const [term, title] of [["respon", "Responses"], ["analy", "Analytics"], ["submission", "Submission packages"], ["versions", "Versions"], ["comparable", "Comparable titles"], ["letters", "Query letters"]] as const) {
      await input.fill(term);
      const titles = await page.locator(".sp-res .sp-t1").allTextContents();
      console.log(`[SR1.2] "${term}"`, JSON.stringify(titles.slice(0, 6)));
      expect(titles.map((t) => t.trim()), term).toContain(title);
    }
  });

  test("SR1.3 the phone never says Queries Hub", async ({ page }) => {
    /* dev's phone (Phone app v2) names its tab pages by the tab and everything under /manuscripts "Manuscripts"; the
       crumb's "Query Centre" for /queries is unit-locked (shellV2Smoke). Here: the stale name is gone everywhere. */
    await openRoute(page, "/queries", WIDE);
    await page.setViewportSize({ width: 390, height: 844 });
    const seen: string[] = [];
    for (const r of ["/queries", "/queries/analytics", "/queries/responses", "/manuscripts/comps", "/agents"]) {
      await page.goto(r);
      const title = page.locator('[data-pa="band-title"]').first();
      await expect(title).toBeVisible({ timeout: 30_000 });
      seen.push(`${r}=${(await title.textContent())?.trim()}`);
      expect(await page.locator("body").innerText(), r).not.toContain("Queries Hub");
    }
    console.log("[SR1.3] phone band titles", JSON.stringify(seen));
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

/** The full sidebar layer's opacity — "0" whenever the rail is what shows. */
const hiddenFull = (page: Page) => page.evaluate(() => getComputedStyle(document.querySelector(".ws-panel > .ws-pin")!).opacity);

type Fit = { text: string; lines: number; inside: boolean; overflow: number };
/** Every visible label in the rail: one line, and wholly inside its row. */
async function labelFits(page: Page): Promise<Fit[]> {
  return page.evaluate(() => {
    const out: Fit[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(".wsr .wsr-lbl, .wsr .wsr-t")) {
      const row = el.closest<HTMLElement>("button");
      if (!row || row.offsetWidth === 0 || getComputedStyle(row).visibility === "hidden") continue;
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
    await breakCss(page, "label", ".wsr-nav .wsr-lbl { font-size: 15px !important }");
    await breakCss(page, "railw", ".ws-panel { width: 84px !important }");
    const all: Fit[] = [];
    for (const route of ["/queries", "/agents", "/manuscripts/versions", "/todo", "/materials/letters", "/dashboard"]) {
      await openRoute(page, route, WIDE);
      const w = await page.locator("#ws-sidebar").evaluate((e) => (e as HTMLElement).offsetWidth);
      expect(w, route).toBe(80);
      await shot(page, `rail-${route.replace(/\//g, "_")}`, { x: 0, y: 0, width: 400, height: 982 });
      expect(await hiddenFull(page), `${route}: the full layer is hidden on the rail`).toBe("0");
      const fits = await labelFits(page);
      console.log(`[SR2.1] ${route}`, JSON.stringify(fits.map((f) => `${f.text}:${f.lines}${f.inside ? "" : "!OUT"}`)));
      all.push(...fits);
    }
    expect(all.length).toBeGreaterThan(30);
    const texts = new Set(all.map((f) => f.text));
    /* sidebar rail v2: the five places and More, which takes the More page's short name (Versions here) */
    for (const t of ["Dashboard", "Queries", "Agents", "Letters", "Tasks", "More", "Versions", "Feedback"]) {
      expect([...texts], `label "${t}" was measured`).toContain(t);
    }
    const cut = all.filter((f) => f.lines !== 1 || !f.inside || f.overflow > 0);
    console.log("[SR2.1] labels measured", all.length, "— wrapped, escaping or cut:", JSON.stringify(cut));
    for (const f of all) {
      expect(f.lines, `${f.text} is one line`).toBe(1);
      expect(f.inside, `${f.text} sits inside its row`).toBe(true);
      expect(f.overflow, `${f.text} is not cut`).toBeLessThanOrEqual(0);
    }
  });

  test("SR2.2 the nav scrolls only on a short window, with the head and foot in view", async ({ page }) => {
    await onRail(page);
    await breakCss(page, "scroll", ".wsr-nav .wsr-ni { height: 92px !important }");
    /* sidebar rail v2: six items, so the nav fits from 760 up; 640 is reported, and keeps its head and foot */
    for (const h of [982, 900, 760, 640]) {
      await openRoute(page, "/queries", { width: 1512, height: h });
      const r = await navScroll(page);
      console.log(`[SR2.2] ${h}px`, JSON.stringify(r));
      if (h !== 640) expect(r.scrolls, `${h} does not scroll`).toBe(false);
      expect(r.headTop).toBeGreaterThanOrEqual(0);
      expect(r.footBottom).toBeLessThanOrEqual(r.vh);
    }
  });

  test("SR2.4 off-nav routes light nothing; settings swap in their own rail", async ({ page }) => {
    await onRail(page);
    await breakCss(page, "fullshow", ".set-mode .ws-panel > .ws-pin { opacity: 1 !important }");
    await openRoute(page, "/help", WIDE);
    if (broken("offnav")) await page.evaluate(() => document.querySelector(".wsr-ni[data-go=a-list]")?.classList.add("wsr-on"));
    expect(await page.locator(".wsr .wsr-on").count(), "/help lights nothing").toBe(0);
    await openRoute(page, "/account/profile", WIDE);
    await expect(page.locator(".wsr.wsr-settings")).toHaveCount(1);
    expect(await hiddenFull(page), "settings: the full layer is hidden on the rail").toBe("0");
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
    const ct = page.locator('.wsr-ni[data-go="list"] .wsr-ct');
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

/* ── Phase 3 — the full sidebar and its three states ─────────────────────────────────────────────────── */

type Frame = { t: number; w: number; mode: string; layoutLeft: number; tx: number; left: number };

/** Start recording, every animation frame: the panel's width and state, and `.ws-main`'s left edge —
 *  its laid-out position (offsetLeft, which a transform does not move) and its transform. */
async function startFrames(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __srFrames: Frame[]; __srStop?: boolean };
    w.__srFrames = []; w.__srStop = false;
    const panel = document.getElementById("ws-sidebar")!;
    const main = document.querySelector<HTMLElement>(".ws-main")!;
    const tick = (t: number) => {
      if (w.__srStop) return;
      const m = new DOMMatrixReadOnly(getComputedStyle(main).transform === "none" ? undefined : getComputedStyle(main).transform);
      w.__srFrames.push({ t, w: panel.getBoundingClientRect().width, mode: panel.dataset.sidebar ?? "", layoutLeft: main.offsetLeft, tx: m.m41, left: main.getBoundingClientRect().left });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function stopFrames(page: Page): Promise<Frame[]> {
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const w = window as unknown as { __srFrames: Frame[]; __srStop?: boolean };
    w.__srStop = true; return w.__srFrames;
  });
}
const mode = (page: Page) => page.locator("#ws-sidebar").getAttribute("data-sidebar");
/** The expand control appears on the hawk's hover. */
async function expandFromRail(page: Page) {
  await page.locator(".wsr-lgo").hover();
  await page.locator(".wsr-tog").click();
}
/** "A click on the page": the top bar's empty middle, a point no control owns. */
async function clickPage(page: Page) {
  /* ⚠️ the folder tab's siblings are positioned OVER the bar's spacer (dev's tab row), so the spacer's middle can be a
     tab: aim between the last thing drawn on the left and the bar's right-hand controls */
  const p = await page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>(".ws-pagebar")!.getBoundingClientRect();
    const right = document.querySelector<HTMLElement>(".ws-bright")!.getBoundingClientRect().left;
    let left = bar.left;
    for (const el of document.querySelectorAll<HTMLElement>(".ws-pagebar [data-shell='tab'], .ws-pagebar .ws-ftsib")) {
      const b = el.getBoundingClientRect(); if (b.width > 0 && !el.closest(".ws-ftmeasure")) left = Math.max(left, b.right);
    }
    return { x: (left + right) / 2, y: bar.top + bar.height / 2, w: right - left };
  });
  expect(p.w, "the bar has an empty stretch to click").toBeGreaterThan(40);
  await page.mouse.click(p.x, p.y);
}
async function startPinned(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem("scriptally:sidebar-pinned", "1"); } catch { /* */ } });
}
/** Motion on: openRoute suppresses it for static geometry; these cases are about the motion. */
async function openMoving(page: Page, route: string, vp = WIDE) {
  await openRoute(page, route, vp);
  await liftMotionSuppression(page);
  await page.waitForTimeout(300);
}

test.describe("sidebar rail v1 — Phase 3, RAIL · FLOAT · PINNED", () => {
  test("SR3.1 RAIL → FLOAT grows over the page: the page's left edge never moves", async ({ page }) => {
    await onRail(page);
    await breakCss(page, "frames", ".ws-panel.sb-ready { transition: width 0.24s ease !important }");
    await openMoving(page, "/queries");
    await startFrames(page);
    await expandFromRail(page);
    const f = await stopFrames(page);
    const mid = [...new Set(f.map((x) => Math.round(x.w * 10) / 10).filter((w) => w > 80.5 && w < 247.5))];
    const lefts = [...new Set(f.map((x) => Math.round(x.left * 10) / 10))];
    console.log(`[SR3.1] frames ${f.length}, intermediate widths ${mid.length}`, JSON.stringify(mid.slice(0, 14)), "main lefts", JSON.stringify(lefts));
    expect(await mode(page)).toBe("float");
    expect(f.at(-1)!.w).toBeCloseTo(248, 0);
    expect(lefts, "the page's left edge never moves").toEqual([80]);
    expect(mid.length, "intermediate widths").toBeGreaterThanOrEqual(8);
  });

  test("SR3.2 FLOAT → PINNED: one re-layout, then the page glides by transform", async ({ page }) => {
    await onRail(page);
    await breakCss(page, "glide", ".ws-main { transition: none !important }");
    await openMoving(page, "/queries");
    await expandFromRail(page);
    await page.waitForTimeout(500);
    await startFrames(page);
    await page.locator(".ws-pinbtn").click();
    const f = await stopFrames(page);
    const layouts = [...new Set(f.map((x) => Math.round(x.layoutLeft)))];
    const first = f.findIndex((x) => Math.round(x.layoutLeft) === 248);
    const gliding = f.slice(first).filter((x) => x.tx < -0.5 && x.tx > -167.5).length;
    console.log(`[SR3.2] frames ${f.length}; laid-out lefts ${JSON.stringify(layouts)}; re-layout at frame ${first}; glide frames ${gliding}; end left ${f.at(-1)!.left}`,
      JSON.stringify(f.slice(Math.max(0, first - 1), first + 12).map((x) => `${Math.round(x.tx)}@${Math.round(x.t - f[first].t)}ms`)));
    expect(await mode(page)).toBe("pinned");
    expect(layouts, "the page re-lays out once: 80, then 248").toEqual([80, 248]);
    expect(Math.round(f.at(-1)!.left)).toBe(248);
    expect(gliding, "frames of the transform moving after the re-layout").toBeGreaterThanOrEqual(8);
  });

  test("SR3.3 PINNED → RAIL: the page takes the width back once, then nothing moves", async ({ page }) => {
    await startPinned(page);
    await breakCss(page, "frames", ".ws-panel.sb-ready { transition: width 0.24s ease !important }");
    await openMoving(page, "/queries");
    expect(await mode(page)).toBe("pinned");
    await startFrames(page);
    await page.locator(".ws-pin .ws-acts .sb-toggle").click();
    const f = await stopFrames(page);
    const during = f.filter((x) => x.w > 80.5 && x.w < 247.5);
    const lefts = [...new Set(during.map((x) => Math.round(x.left * 10) / 10))];
    console.log(`[SR3.3] frames ${f.length}; during the width animation ${during.length}; lefts then ${JSON.stringify(lefts)}; end ${f.at(-1)!.w}/${f.at(-1)!.left}`);
    expect(await mode(page)).toBe("rail");
    expect(Math.round(f.at(-1)!.w)).toBe(80);
    expect(Math.round(f.at(-1)!.left)).toBe(80);
    expect(lefts, "no frame during the width animation moves the page's left edge").toEqual([80]);
    /* the ease-out curve gives about six sampled frames over its 240ms; four proves it animated */
    expect(during.length, "the width animated").toBeGreaterThanOrEqual(4);
  });

  test("SR3.4 FLOAT goes away on a page pick, a page click, Escape and ⌘K — not inside its own menu", async ({ page }) => {
    await onRail(page);
    await openMoving(page, "/queries");
    const open = async () => { await expandFromRail(page); await expect.poll(() => mode(page)).toBe("float"); };
    await open();
    await page.locator('.ws-pin .ws-ni[aria-label="Responses"]').click();
    await expect(page).toHaveURL(/\/queries\/responses$/);
    await expect.poll(() => mode(page), { message: "a page pick" }).toBe("rail");
    await open();
    await clickPage(page);
    await expect.poll(() => mode(page), { message: "a click on the page" }).toBe("rail");
    await open();
    await page.keyboard.press("Escape");
    await expect.poll(() => mode(page), { message: "Escape" }).toBe("rail");
    await open();
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await expect(page.locator(".sp-pal")).toBeVisible();
    await expect.poll(() => mode(page), { message: "⌘K" }).toBe("rail");
    /* ⚠️ Escape does not close the ⌘K palette on dev, with or without this pack (probed on the unmodified dev build,
       5 Nov) — so the page is opened afresh rather than the palette dismissed */
    await openMoving(page, "/queries");
    await open();
    await page.locator(".ws-pin .ws-ms-btn").click();
    const menu = page.locator('.ws-ms-menu--port[data-open="true"]');
    await expect(menu).toBeVisible();
    const dialogs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')]
      .filter((d) => d.offsetWidth > 0 && d.offsetHeight > 0).map((d) => d.className.toString().slice(0, 60)));
    console.log("[SR3.4] visible dialogs with the manuscript menu open:", JSON.stringify(dialogs), "mode", await mode(page));
    await menu.locator(".ws-ms-hint").click();
    await page.waitForTimeout(300);
    expect(await mode(page), "a click inside the manuscript menu").toBe("float");
    console.log("[SR3.4] page pick, page click, Escape and ⌘K each closed FLOAT; the manuscript menu did not");
  });

  test("SR3.5 PINNED ignores Escape and survives navigation and a reload", async ({ page }) => {
    await startPinned(page);
    await openMoving(page, "/queries");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    expect(await mode(page)).toBe("pinned");
    await page.locator('.ws-pin .ws-ni[aria-label="Contact list"]').click();
    await expect(page).toHaveURL(/\/agents$/);
    expect(await mode(page)).toBe("pinned");
    await page.reload();
    await expect(page.locator("#ws-sidebar")).toHaveAttribute("data-sidebar", "pinned", { timeout: 30_000 });
    const w = await page.locator("#ws-sidebar").evaluate((e) => e.getBoundingClientRect().width);
    const side = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--shell-side-w").trim());
    console.log("[SR3.5] after reload", w, side);
    expect(Math.round(w)).toBe(248);
    expect(side).toBe("248px");
  });

  test("SR3.6 a narrow window shows the rail, still floats, and refuses the pin", async ({ page }) => {
    await startPinned(page);
    await openMoving(page, "/queries", { width: 1024, height: 800 });
    expect(await mode(page)).toBe("rail");
    await expandFromRail(page);
    await expect.poll(() => mode(page)).toBe("float");
    const pin = page.locator(".ws-pinbtn");
    await expect(pin).toBeDisabled();
    await expect(pin).toHaveAttribute("title", "Pinning needs a wider window");
    await page.setViewportSize(WIDE);
    await expect.poll(() => mode(page), { message: "wide again: pinned" }).toBe("pinned");
    console.log("[SR3.6] 1024: rail → float, pin disabled; 1512: pinned");
  });

  test("SR3.7 migration: the old expanded sidebar starts pinned", async ({ browser }) => {
    for (const [old, want] of [["0", "pinned"], ["1", "rail"], [null, "rail"]] as const) {
      const ctx = await browser.newContext({ viewport: WIDE, storageState: "tests/e2e/.auth/state.json" });
      const page = await ctx.newPage();
      await page.addInitScript((o) => {
        try {
          if (sessionStorage.getItem("sr-mig")) return;
          sessionStorage.setItem("sr-mig", "1");
          localStorage.removeItem("scriptally:sidebar-pinned");
          if (o === null) localStorage.removeItem("scriptally:sidebar-collapsed"); else localStorage.setItem("scriptally:sidebar-collapsed", o);
        } catch { /* */ }
      }, old);
      await openRoute(page, "/queries");
      const got = await mode(page);
      console.log(`[SR3.7] collapsed=${old} → ${got}`);
      expect(got, `collapsed=${old}`).toBe(want);
      await ctx.close();
    }
  });

  test("SR3.8 the keyboard: [ opens on the current page's row, Escape returns to the expand control, [ in a field does nothing", async ({ page }) => {
    await onRail(page);
    await openMoving(page, "/queries");
    await clickPage(page);
    console.log("[SR3.8] after the page click the URL is", page.url());
    await expect(page).toHaveURL(/\/queries$/);
    await page.keyboard.press("[");
    await expect.poll(() => mode(page)).toBe("float");
    await expect.poll(() => page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Query Centre");
    await page.keyboard.press("Escape");
    await expect.poll(() => mode(page)).toBe("rail");
    await expect.poll(() => page.evaluate(() => document.activeElement?.className)).toBe("wsr-tog");
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    const input = page.locator('.sp-pal [role="combobox"]');
    await expect(input).toBeFocused();
    await page.keyboard.type("[");
    await page.waitForTimeout(300);
    await expect(input).toHaveValue("[");
    expect(await mode(page)).toBe("rail");
    console.log("[SR3.8] [ → float, focus on Query Centre; Escape → rail, focus on the expand control; [ in the palette typed");
  });

  test("SR3.9 reduced motion: every state change lands in one frame", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await onRail(page);
    await openMoving(page, "/queries");
    const settle = async (act: () => Promise<void>, want: number) => {
      await startFrames(page);
      await act();
      const f = await stopFrames(page);
      const firstNew = f.findIndex((x, i) => i > 0 && Math.abs(x.w - f[0].w) > 0.5);
      const firstDone = f.findIndex((x) => Math.abs(x.w - want) < 0.5);
      return { firstNew, firstDone, n: f.length };
    };
    const a = await settle(() => expandFromRail(page), 248);
    const b = await settle(() => page.locator(".ws-pinbtn").click(), 248);
    const c = await settle(() => page.locator(".ws-pin .ws-acts .sb-toggle").click(), 80);
    console.log("[SR3.9]", JSON.stringify({ a, b, c }));
    expect(a.firstNew, "float: the first changed frame is the final width").toBe(a.firstDone);
    expect(c.firstNew, "rail: the first changed frame is the final width").toBe(c.firstDone);
    const glide = await page.evaluate(() => getComputedStyle(document.querySelector(".ws-main")!).transform);
    expect(glide === "none" || glide === "matrix(1, 0, 0, 1, 0, 0)").toBe(true);
  });

  test("SR3.10 no sidebar label renders in Source Sans", async ({ page }) => {
    await startPinned(page);
    await breakCss(page, "font", ".wsr-lbl, .ws-pin .ws-lbl { font-family: inherit !important }");
    await openRoute(page, "/queries", WIDE);
    const faces = await page.evaluate(() => {
      const out: { cls: string; text: string; font: string }[] = [];
      const walk = document.createTreeWalker(document.getElementById("ws-sidebar")!, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        const t = (n.textContent || "").trim();
        const el = n.parentElement!;
        if (!t || el.closest("svg")) continue;
        out.push({ cls: el.className, text: t.slice(0, 24), font: getComputedStyle(el).fontFamily });
      }
      return out;
    });
    const sans = faces.filter((f) => /source sans/i.test(f.font));
    console.log(`[SR3.10] ${faces.length} labels; faces`, JSON.stringify([...new Set(faces.map((f) => f.font.split(",")[0]))]), "in Source Sans:", JSON.stringify(sans));
    expect(faces.length).toBeGreaterThan(30);
    expect(sans, "labels in Source Sans").toEqual([]);
  });
});

/* ── Phase 4 — screenshots (SR_SHOTS=<dir>; skipped without it) ─────────────────────────────────────── */
test.describe("sidebar rail v2 — screenshots", () => {
  test.use({ deviceScaleFactor: 2 });
  test.skip(!SHOTS, "SR_SHOTS names the folder");

  test("RV2 screenshots at 1512×982: rail, More open, a More page, pinned, keyboard focus, a Free writer", async ({ page }) => {
    test.skip(!SHOTS, "set SR_SHOTS to a folder to write the screenshots");
    const full = async (name: string) => { await page.waitForTimeout(600); await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
    await onRail(page);
    await openMoving(page, "/queries");
    await full("01-rail-query-centre");
    await page.locator('[data-go="more"]').click();
    await expect(page.locator('[data-shell="more"]')).toBeVisible();
    await full("02-more-open");
    await page.locator('[data-shell="more"] [data-go="q-responses"]').click();
    await expect(page).toHaveURL(/\/queries\/responses$/);
    await full("03-more-page-responses");
    await expandFromRail(page);
    await page.locator(".ws-pinbtn").click();
    await expect.poll(() => mode(page)).toBe("pinned");
    await full("04-pinned");
    await page.locator(".ws-pinbtn").click();
    await expect.poll(() => mode(page)).toBe("rail");
    await page.mouse.move(700, 500);
    await page.locator('[data-go="more"]').focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("ArrowDown");
    await full("05-keyboard-focus");
    await page.keyboard.press("Escape");
    await page.addInitScript(() => { (globalThis as unknown as { __SA_NAV_FREE?: boolean }).__SA_NAV_FREE = true; });
    await openMoving(page, "/materials/letters");
    await page.locator('[data-go="more"]').click();
    await expect(page.locator('[data-shell="more"] [data-shell="pro"]').first()).toBeVisible();
    await full("06-free-writer");
  });
});

/* ── Part D of sidebar materials v1: the two new cards ── */
test.describe("sidebar materials v1 — the regrouped rail", () => {
  test("SR6.1 the rail is five places and More, each one click to its own page", async ({ page }) => {
    await onRail(page);
    await openRoute(page, "/dashboard", WIDE);
    const labels = (await page.locator(".wsr-nav .wsr-ni .wsr-lbl").allTextContents()).map((t) => t.trim());
    console.log("[SR6.1] rail", JSON.stringify(labels));
    expect(labels).toEqual(["Dashboard", "Queries", "Agents", "Letters", "Tasks", "More"]);
    await expect(page.locator(".wsr-nav .wsr-sep")).toHaveCount(1);
    await page.locator('.wsr-ni[data-go="m-letters"]').click();
    await expect(page).toHaveURL(/\/materials\/letters$/);
    await expect(page.locator('.wsr-ni[data-go="m-letters"]')).toHaveClass(/wsr-on/);
    await expect(page.locator('.wsr-nav .wsr-on')).toHaveCount(1);
    await expect(page.locator('[data-ql="page"]')).toBeVisible();
  });
  test("SR6.2 the full sidebar groups Materials under one heading with the full names", async ({ page }) => {
    await startPinned(page);
    await openRoute(page, "/materials/letters", WIDE);
    const heads = (await page.locator(".ws-pin .ws-glabel").allTextContents()).map((t) => t.trim());
    expect(heads).toEqual(["Queries", "Agents", "Your book", "Materials", "Tasks"]);
    const names = await page.locator(".ws-pin .ws-ni").evaluateAll((els) => els.map((e) => (e.querySelector(".ws-lbl")?.textContent ?? "").trim()));
    console.log("[SR6.2] full sidebar rows", JSON.stringify(names));
    expect(names).toEqual(["Dashboard", "Queries", "Responses", "Analytics", "Contact list", "Discover", "Manuscripts", "Versions",
      "Query letters", "Comparable titles", "Submission packages", "To-do list", "Corkboard"]);
    await expect(page.locator('.ws-pin .ws-ni.on')).toHaveAttribute("aria-label", "Query letters");
    /* a founding writer sees no Pro mark */
    expect(await page.locator('[data-shell="pro"]').count()).toBe(0);
  });
});

/* ── sidebar rail v2: More ── */
test.describe("sidebar rail v2 — More", () => {
  const panel = (page: Page) => page.locator('[data-shell="more"]');
  const more = (page: Page) => page.locator('.wsr [data-go="more"]');

  test("RV2.1 hover opens after a beat, and leaving both closes it", async ({ page }) => {
    await onRail(page);
    await openMoving(page, "/queries");
    await more(page).hover();
    await expect(panel(page)).toBeVisible();
    await expect(more(page)).toHaveAttribute("aria-expanded", "true");
    const g = await page.evaluate(() => {
      const p = document.querySelector<HTMLElement>('[data-shell="more"]')!.getBoundingClientRect();
      const r = document.querySelector<HTMLElement>(".wsr")!.getBoundingClientRect();
      const b = document.querySelector<HTMLElement>('.wsr [data-go="more"]')!.getBoundingClientRect();
      return { gap: p.left - r.right, dTop: b.top - p.top, w: p.width, inside: p.bottom <= innerHeight };
    });
    console.log("[RV2.1] panel", JSON.stringify(g));
    expect(g.gap).toBeCloseTo(8, 0);
    expect(g.w).toBe(248);
    expect(g.inside).toBe(true);
    const heads = (await panel(page).locator(".wsm-h").allTextContents()).map((t) => t.trim());
    expect(heads).toEqual(["Queries", "Agents", "Your book", "Materials", "Tasks"]);
    const rows = (await panel(page).locator('[role="menuitem"] .wsm-lbl').allTextContents()).map((t) => t.trim());
    expect(rows).toEqual(["Responses", "Analytics", "Discover", "Manuscripts", "Versions", "Comparable titles", "Submission packages", "Corkboard"]);
    await expect(panel(page)).toContainText("The pages you use most live on the rail.");
    await page.mouse.move(900, 500);
    await expect(panel(page)).toHaveCount(0);
  });

  test("RV2.2 a click holds it open; a click outside closes it", async ({ page }) => {
    await onRail(page);
    await openMoving(page, "/queries");
    await more(page).click();
    await expect(panel(page)).toBeVisible();
    await page.mouse.move(900, 500);
    await page.waitForTimeout(500);
    await expect(panel(page), "held after the pointer leaves").toBeVisible();
    await clickPage(page);
    await expect(panel(page)).toHaveCount(0);
  });

  test("RV2.3 the keyboard: Enter opens on the first row, arrows move, Escape closes and returns focus to More", async ({ page }) => {
    await onRail(page);
    await openMoving(page, "/queries");
    await page.mouse.move(900, 500);
    await more(page).focus();
    await page.keyboard.press("Enter");
    await expect(panel(page)).toBeVisible();
    await expect(panel(page).locator('[role="menuitem"]').first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(panel(page).locator('[data-go="q-analytics"]')).toBeFocused();
    await page.keyboard.press("End");
    await expect(panel(page).locator('[data-go="noteboard"]')).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(panel(page)).toHaveCount(0);
    await expect(more(page)).toBeFocused();
  });

  test("RV2.4 choosing Responses lands there, with More lit and named Responses", async ({ page }) => {
    await onRail(page);
    await openMoving(page, "/queries");
    await more(page).click();
    await panel(page).locator('[data-go="q-responses"]').click();
    await expect(page).toHaveURL(/\/queries\/responses$/);
    await expect(panel(page)).toHaveCount(0);
    await expect(more(page)).toHaveClass(/wsr-on/);
    await expect(more(page).locator(".wsr-lbl")).toHaveText("Responses");
    await expect(page.locator('.wsr-nav .wsr-on')).toHaveCount(1);
    await more(page).click();
    await expect(panel(page).locator('[aria-current="page"]')).toHaveAttribute("data-go", "q-responses");
  });

  test("RV2.5 a Free writer sees the Pro marks on Letters and in the panel", async ({ page }) => {
    await onRail(page);
    await page.addInitScript(() => { (globalThis as unknown as { __SA_NAV_FREE?: boolean }).__SA_NAV_FREE = true; });
    await openMoving(page, "/queries");
    await expect(page.locator('.wsr-ni[data-go="m-letters"] .wsr-pro')).toBeVisible();
    await more(page).click();
    const marked = await panel(page).locator('[data-shell="pro"]').evaluateAll((els) => els.map((e) => {
      const row = e.closest("[data-go]"); return row ? row.getAttribute("data-go") : `heading:${(e.parentElement?.textContent ?? "").replace("Pro", "").trim()}`;
    }));
    console.log("[RV2.5] marks", JSON.stringify(marked));
    expect(marked.sort()).toEqual(["a-disc", "heading:Materials", "m-ver"]);
  });

  test("RV2.6 the panel never opens while the sidebar is pinned or floating", async ({ page }) => {
    await startPinned(page);
    await openMoving(page, "/queries");
    await expect.poll(() => mode(page)).toBe("pinned");
    await page.locator('.wsr [data-go="more"]').evaluate((b) => { (b as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await page.waitForTimeout(400);
    await expect(panel(page)).toHaveCount(0);
  });
});

/* ── the pinned sidebar fits at 1512×982 (Nick's ruling, 25 Oct): every row AND the full feedback card ── */
test.describe("sidebar rail v1 — the full sidebar's height", () => {
  test("SR5 at 1512×982 the pinned sidebar shows every row and the full Give feedback card, no nav scroll", async ({ page }) => {
    await startPinned(page);
    await breakCss(page, "tall", ".ws-panel .ws-pin .ws-ni { height: 40px !important }");
    await openRoute(page, "/queries", WIDE);
    expect(await mode(page)).toBe("pinned");
    const r = await page.evaluate(() => {
      const nav = document.querySelector<HTMLElement>(".ws-pin .ws-nav")!;
      const card = document.querySelector<HTMLElement>(".ws-pin .ws-fbc");
      const rows = [...nav.querySelectorAll<HTMLElement>(".ws-ni")];
      const nb = nav.getBoundingClientRect();
      const cut = rows.filter((x) => { const b = x.getBoundingClientRect(); return b.top < nb.top - 0.5 || b.bottom > nb.bottom + 0.5; }).map((x) => x.getAttribute("aria-label"));
      const cs = card ? getComputedStyle(card) : null;
      return { heads: nav.querySelectorAll(".ws-glabel").length, rows: rows.length, sh: nav.scrollHeight, ch: nav.clientHeight, cut, card: !!card && cs!.display !== "none" && card.getBoundingClientRect().height > 0,
        cardBottom: card?.getBoundingClientRect().bottom ?? 0, vh: innerHeight, spare: nav.clientHeight - nav.scrollHeight };
    });
    console.log("[SR5]", JSON.stringify(r));
    /* sidebar materials v1 (6 Nov): Dashboard and twelve pages, under six groups */
    expect(r.rows).toBe(13);
    expect(r.heads, "five group headings").toBe(5);
    expect(r.card, "the full feedback card shows").toBe(true);
    expect(r.cut, "rows outside the nav's box").toEqual([]);
    expect(r.sh, "the nav does not scroll").toBeLessThanOrEqual(r.ch);
  });
});
