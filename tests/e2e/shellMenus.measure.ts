/**
 * Ink shell v1 · follow-up 2 — MS1…MS15: the bar menus, search, your menu and Settings, rendered at 1280 /
 * 1440 / 1710 with fonts loaded (ref shell-menus-pack/shell-menus-settings-v1.html).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test shellMenus
 *   INK_MUTATE=<msN-…> …             applies one named break in the page (inkLib.ts) to prove a lock red
 *   MS15_CAPTURE=1 against `main`    writes the phone references MS15 compares against
 *
 * Every case states its precondition first (the menu is open, the row exists, the state asked for) — a
 * probe that finds nothing passes vacuously.
 */
import { test, expect, Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { WIDTHS, inkOpen, rect, applyMutation } from "./inkLib";
import { openRoute } from "./measure";

const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
const vis = (page: Page, sel: string) => rect(page, sel);

/** Every text-bearing descendant's computed face, for the "no sans, no Playfair" sweeps. */
async function faces(page: Page, rootSel: string): Promise<{ text: string; face: string }[]> {
  return page.evaluate((sel) => {
    const out: { text: string; face: string }[] = [];
    const roots = [...document.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getBoundingClientRect().width > 0);
    for (const root of roots) {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n: Node | null;
      while ((n = w.nextNode())) {
        const t = (n.textContent || "").trim();
        const el = n.parentElement;
        if (!t || !el || !el.getBoundingClientRect().width) continue;
        out.push({ text: t.slice(0, 40), face: getComputedStyle(el).fontFamily });
      }
    }
    return out;
  }, rootSel);
}
const BANNED = /Playfair|\bInter\b|Source Sans|Arial|Helvetica|system-ui|sans-serif/;
const firstFace = (f: string) => f.split(",")[0].replace(/["']/g, "").trim();

/**
 * Contrast FROM RENDERED PIXELS: the element's own screenshot; its background is the most common
 * colour, its text the pixel furthest from that in luminance. WCAG's ratio between the two.
 */
async function pixelContrast(page: Page, sel: string, index = 0): Promise<number> {
  /* ⚠️ THE TEXT'S OWN BOX, NEVER THE ELEMENT'S. The first version screenshotted the whole element and
     read 16:1 for an eyebrow at ink 42%: an eyebrow's box takes in the menu's rounded corner, where the
     dark page shows through, and a row's box takes in its icon, whose semi-transparent strokes overlap
     and composite darker than their stated ink. Clipped to the first text run's Range, the reading is
     the glyphs on their own ground and nothing else. */
  const box = await page.locator(sel).nth(index).evaluate((root) => {
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let n: Node | null;
    while ((n = w.nextNode())) {
      if (!(n.textContent || "").trim()) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      const b = r.getBoundingClientRect();
      if (b.width > 0) return { x: b.left, y: b.top, width: b.width, height: b.height };
    }
    return null;
  });
  if (!box) throw new Error(`${sel}[${index}]: no text to measure`);
  const png = await page.screenshot({ clip: { x: box.x - 2, y: box.y, width: box.width + 4, height: box.height } });
  return page.evaluate(async (b64) => {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = `data:image/png;base64,${b64}`; });
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const x = c.getContext("2d")!; x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, img.width, img.height).data;
    const lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
    const lum = (r: number, g: number, b: number) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    const counts = new Map<string, number>();
    for (let i = 0; i < d.length; i += 4) { const k = `${d[i]},${d[i + 1]},${d[i + 2]}`; counts.set(k, (counts.get(k) ?? 0) + 1); }
    const bg = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0].split(",").map(Number);
    const lb = lum(bg[0], bg[1], bg[2]);
    let best = lb;
    for (let i = 0; i < d.length; i += 4) { const l = lum(d[i], d[i + 1], d[i + 2]); if (Math.abs(l - lb) > Math.abs(best - lb)) best = l; }
    const [hi, lo] = best > lb ? [best, lb] : [lb, best];
    return (hi + 0.05) / (lo + 0.05);
  }, png.toString("base64"));
}

async function openCapture(page: Page) {
  await page.locator(".ws-cap--bar .ws-capr").click();
  await page.waitForTimeout(250);
}
async function openHelp(page: Page) {
  await page.locator('[data-shell="help"]').click();
  await page.waitForTimeout(250);
}
async function closeAll(page: Page) {
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
}
async function openSearch(page: Page) {
  await page.locator('[data-probe="search"]').click();
  await page.waitForTimeout(400);
  await expect(page.locator(".sp-pal--ink")).toBeVisible();
}

test.describe("shell menus", () => {
  /* ── MS1 · the arrow opens the capture menu ───────────────────────────────────────────────────── */
  test("MS1 · the arrow opens the capture menu, 8px below the button, right edges together", async ({ page }) => {
    for (const w of WIDTHS) {
      await inkOpen(page, "/queries", w, { scope: "ms1" });
      await openCapture(page);
      expect(await page.locator('[data-shell="help-menu"]').count(), `${w}: the arrow opened Help`).toBe(0);
      const m = await vis(page, '[data-shell="capture-menu"].is-open');
      expect(m, `${w}: the capture menu is open`).not.toBeNull();
      /* and it is SEEN: the pixel at its centre belongs to it (it was clipped once) */
      const hit = await page.evaluate(({ x, y }) => !!document.elementFromPoint(x, y)?.closest('[data-shell="capture-menu"]'), { x: m!.x + m!.w / 2, y: m!.y + m!.h / 2 });
      expect(hit, `${w}: the menu is on top at its own centre, not clipped`).toBe(true);
      const b = (await vis(page, ".ws-cap--bar .ws-capb"))!;
      expect(near(m!.y, b.b + 8), `${w}: top ${m!.y} vs button foot + 8 ${b.b + 8}`).toBe(true);
      expect(near(m!.r, b.r), `${w}: right ${m!.r} vs button right ${b.r}`).toBe(true);
      expect(m!.w, `${w}: at least 220 wide`).toBeGreaterThanOrEqual(219.5);
      const lit = await page.evaluate(() => getComputedStyle(document.querySelector(".ws-cap--bar .ws-capr")!).backgroundColor);
      expect(lit, `${w}: the arrow half is lit while open`).toMatch(/rgba\(27, 36, 51, 0\.1\)/);
      await closeAll(page);
    }
  });

  /* ── MS2 · "?" opens Help ─────────────────────────────────────────────────────────────────────── */
  test("MS2 · \"?\" opens the Help menu under it, right edges together, three rows", async ({ page }) => {
    for (const w of WIDTHS) {
      await inkOpen(page, "/queries", w, { scope: "ms2" });
      await openHelp(page);
      expect(await page.locator('[data-shell="capture-menu"].is-open').count(), `${w}: "?" opened the capture menu`).toBe(0);
      const m = await vis(page, '[data-shell="help-menu"]');
      expect(m, `${w}: the Help menu is open`).not.toBeNull();
      const h = (await vis(page, '[data-shell="help"]'))!;
      expect(near(m!.y, h.b + 8), `${w}: top ${m!.y} vs "?" foot + 8 ${h.b + 8}`).toBe(true);
      expect(near(m!.r, h.r), `${w}: right ${m!.r} vs "?" right ${h.r}`).toBe(true);
      const rows = await page.locator('[data-shell="help-menu"] [role="menuitem"]').allInnerTexts();
      expect(rows.map((r) => r.replace(/\s+/g, " ").trim()), `${w}: the three rows (the Query Centre has a page guide)`)
        .toEqual(["Help centre", "Show the page guide", "Keyboard shortcuts ?"]);
      await closeAll(page);
    }
  });
});

test.describe("shell menus · the language", () => {
  /** Opens each menu in turn and hands it to `fn`; closes it after. */
  async function eachMenu(page: Page, w: number, scope: string, fn: (name: string, sel: string) => Promise<void>) {
    await page.addInitScript(() => { (window as unknown as { __SA_INK_TABS: number }).__SA_INK_TABS = 5; });
    await inkOpen(page, "/manuscripts", w, { scope });
    const menus: [string, () => Promise<void>, string][] = [
      ["capture", () => openCapture(page), '[data-shell="capture-menu"].is-open'],
      ["help", () => openHelp(page), '[data-shell="help-menu"]'],
      ["account", async () => { await page.locator(".ws-uacct").click(); await page.waitForTimeout(350); }, '[data-shell="account-menu"]'],
      ["selector", async () => { await page.locator("#ws-sidebar [data-shell='switcher'] .ws-ms-btn").click(); await page.waitForTimeout(350); }, '.ws-ms-menu--port[data-open="true"]'],
      ["more", async () => { await page.locator(".ws-ftmore").click(); await page.waitForTimeout(250); }, '[data-shell="tab-more-menu"]'],
    ];
    for (const [name, open, sel] of menus) {
      await open();
      expect(await vis(page, sel), `${w}: the ${name} menu opened`).not.toBeNull();
      await fn(name, sel);
      await closeAll(page);
    }
  }

  /* ── MS3 · legible ────────────────────────────────────────────────────────────────────────────── */
  test("MS3 · every chooseable row and every search title is at least 4.5:1, from rendered pixels", async ({ page }) => {
    const secondary: string[] = [];
    await eachMenu(page, 1440, "ms3", async (name, sel) => {
      const rows = page.locator(`${sel} .sa-mi:not([aria-disabled="true"]):not(.sa-mi--mute)`);
      const n = await rows.count();
      expect(n, `${name}: rows to measure`).toBeGreaterThan(0);
      for (let i = 0; i < n; i++) {
        const label = (await rows.nth(i).innerText()).split("\n")[0];
        const r = await pixelContrast(page, `${sel} .sa-mi:not([aria-disabled="true"]):not(.sa-mi--mute)`, i);
        expect(r, `${name} · "${label}": ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
      }
      /* the brief's own secondary inks, reported (see the report's false premises) */
      for (const s2 of [`${sel} .sa-mi--mute`, `${sel} .sa-peb`]) {
        if (await page.locator(s2).count()) secondary.push(`${name} ${s2.split(" ").pop()}: ${(await pixelContrast(page, s2)).toFixed(2)}:1`);
      }
    });
    await inkOpen(page, "/queries", 1440, { scope: "ms3" });
    await openSearch(page);
    const titles = page.locator(".sp-pal--ink .sp-res:not(.sp-res--soon) .sp-t1");
    const n = await titles.count();
    expect(n, "search titles to measure").toBeGreaterThan(3);
    for (let i = 0; i < n; i++) {
      const r = await pixelContrast(page, ".sp-pal--ink .sp-res:not(.sp-res--soon) .sp-t1", i);
      expect(r, `search title ${i}: ${r.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
    secondary.push(`search description: ${(await pixelContrast(page, ".sp-pal--ink .sp-t2", 1)).toFixed(2)}:1`);
    secondary.push(`search eyebrow: ${(await pixelContrast(page, ".sp-pal--ink .sp-grp")).toFixed(2)}:1`);
    mkdirSync("reports/ink-shell-v1/menus", { recursive: true });
    writeFileSync("reports/ink-shell-v1/menus/ms3-secondary.json", JSON.stringify(secondary, null, 2));
  });

  /* ── MS5 · rows ───────────────────────────────────────────────────────────────────────────────── */
  test("MS5 · in every menu, rows are 36 tall in Source Serif 4, and hover shows the wash and the edge", async ({ page }) => {
    for (const w of WIDTHS) {
      await eachMenu(page, w, "ms5", async (name, sel) => {
        const rows = await page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(`${s} .sa-mi`)]
          .map((e) => ({ h: e.getBoundingClientRect().height, f: getComputedStyle(e).fontFamily, t: e.innerText.split("\n")[0] })), sel);
        expect(rows.length, `${w} ${name}: rows`).toBeGreaterThan(0);
        for (const r of rows) {
          expect(near(r.h, 36), `${w} ${name} · "${r.t}": ${r.h} tall`).toBe(true);
          expect(firstFace(r.f), `${w} ${name} · "${r.t}": ${r.f}`).toBe("Source Serif 4");
        }
        const target = page.locator(`${sel} .sa-mi:not([aria-disabled="true"])`).first();
        await target.hover();
        await page.waitForTimeout(200);
        const st = await target.evaluate((e) => { const c = getComputedStyle(e); return { bg: c.backgroundColor, sh: c.boxShadow }; });
        expect(st.bg, `${w} ${name}: the hover wash`).toMatch(/rgba\(217, 150, 122, 0\.13\)/);
        expect(st.sh, `${w} ${name}: the hover edge`).toMatch(/rgb\(217, 150, 122\) 2px 0px 0px 0px inset/);
      });
    }
  });

  /* ── MS6 · anchoring ──────────────────────────────────────────────────────────────────────────── */
  test("MS6 · each menu 8px from its control on its nearer edge; your menu above the foot, 232 wide", async ({ page }) => {
    for (const w of WIDTHS) {
      await eachMenu(page, w, "ms6", async (name, sel) => {
        const m = (await vis(page, sel))!;
        if (name === "account") {
          const f = (await vis(page, ".ws-pfrow"))!;
          expect(near(m.b, f.y - 8), `${w} your menu: foot ${m.b} vs foot row top − 8 ${f.y - 8}`).toBe(true);
          expect(near(m.x, f.x), `${w} your menu: left ${m.x} vs the sidebar's inner edge ${f.x}`).toBe(true);
          expect(near(m.w, 232), `${w} your menu: ${m.w} wide`).toBe(true);
          return;
        }
        const ctl = {
          capture: ".ws-cap--bar .ws-capb", help: '[data-shell="help"]',
          selector: "#ws-sidebar [data-shell='switcher'] .ws-ms-btn", more: ".ws-ftmore",
        }[name]!;
        const c = (await vis(page, ctl))!;
        expect(near(m.y, c.b + 8), `${w} ${name}: top ${m.y} vs control foot + 8 ${c.b + 8}`).toBe(true);
        const rightAligned = name === "capture" || name === "help";
        if (rightAligned) expect(near(m.r, c.r), `${w} ${name}: right ${m.r} vs ${c.r}`).toBe(true);
        else expect(near(m.x, c.x), `${w} ${name}: left ${m.x} vs ${c.x}`).toBe(true);
      });
    }
  });

  /* ── MS4 · soon ───────────────────────────────────────────────────────────────────────────────── */
  test("MS4 · every Add a manuscript entry is aria-disabled, tagged SOON, inert, and skipped by the arrow keys", async ({ page }) => {
    await inkOpen(page, "/queries", 1440, { scope: "ms4" });
    const before = page.url();
    const check = async (where: string, row: string, menu: string, open: () => Promise<void>) => {
      await open();
      expect(await page.locator(row).count(), `${where}: the entry exists`).toBe(1);
      expect(await page.locator(row).getAttribute("aria-disabled"), `${where}: aria-disabled`).toBe("true");
      expect(await page.locator(`${row} .sa-soon`).innerText(), `${where}: the SOON tag`).toBe("SOON");
      /* the arrow keys walk every row twice round and never land on it */
      await page.locator(`${menu} [role="menuitem"], ${menu} [role="menuitemradio"], ${menu} [role="option"]`).first().focus().catch(() => {});
      let landed = false;
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("ArrowDown");
        landed ||= await page.locator(row).evaluate((e) => e === document.activeElement || e.getAttribute("aria-selected") === "true");
      }
      expect(landed, `${where}: an arrow key landed on it`).toBe(false);
      await page.locator(row).click({ force: true });
      await page.waitForTimeout(400);
      expect(page.url(), `${where}: a click navigated`).toBe(before);
      expect(await page.getByText(/Manuscript Title/).count(), `${where}: the add form opened`).toBe(0);
      await closeAll(page);
    };
    await check("capture menu", '[data-shell="capture-menu"] [data-cap="manuscript"]', '[data-shell="capture-menu"]', () => openCapture(page));
    await check("selector menu", '.ws-ms-menu--port [data-ms="add"]', ".ws-ms-menu--port", async () => {
      await page.locator("#ws-sidebar [data-shell='switcher'] .ws-ms-btn").click(); await page.waitForTimeout(350);
    });
    await check("search", '.sp-pal--ink .sp-res--soon', ".sp-pal--ink", async () => {
      await openSearch(page); await page.keyboard.type("add a manuscript"); await page.waitForTimeout(300);
    });
  });
});

test.describe("search", () => {
  /* ── MS7 · the frame ──────────────────────────────────────────────────────────────────────────── */
  test("MS7 · 660 wide, centred on the sheet, 10 below the bar, an ink input band, no sans-serif", async ({ page }) => {
    for (const w of WIDTHS) {
      await inkOpen(page, "/queries", w, { scope: "ms7" });
      await openSearch(page);
      const p = (await vis(page, ".sp-pal--ink"))!;
      const sheet = (await vis(page, ".ws-window"))!;
      const bar = (await vis(page, ".ws-pagebar"))!;
      expect(near(p.w, 660), `${w}: ${p.w} wide`).toBe(true);
      expect(near(p.x + p.w / 2, sheet.x + sheet.w / 2), `${w}: centre ${p.x + p.w / 2} vs the sheet's ${sheet.x + sheet.w / 2}`).toBe(true);
      expect(near(p.y, bar.b + 10), `${w}: top ${p.y} vs bar + 10 ${bar.b + 10}`).toBe(true);
      const band = await page.evaluate(() => getComputedStyle(document.querySelector(".sp-pal--ink .sp-in")!).backgroundColor);
      expect(band, `${w}: the input band`).toBe("rgb(27, 36, 51)");
      const dim = await page.evaluate(() => getComputedStyle(document.querySelector(".sp-dim")!).backgroundColor);
      expect(dim, `${w}: the window dims`).toBe("rgba(10, 14, 22, 0.42)");
      for (const f of await faces(page, ".sp-pal--ink")) expect(firstFace(f.face), `${w}: "${f.text}" in ${f.face}`).not.toMatch(BANNED);
      await closeAll(page);
    }
  });

  /* ── MS8 · labels ─────────────────────────────────────────────────────────────────────────────── */
  test("MS8 · no \"Queries Hub\" in search; the eyebrows read START SOMETHING and GO TO", async ({ page }) => {
    await inkOpen(page, "/queries", 1440, { scope: "ms8" });
    await openSearch(page);
    const text = await page.locator(".sp-pal--ink").innerText();
    expect(text, "Query Centre is listed (the precondition)").toMatch(/Query Centre|Queries Hub/);
    expect(text).not.toContain("Queries Hub");
    const eyebrows = (await page.locator(".sp-pal--ink .sp-grp").allInnerTexts()).map((t) => t.trim());
    expect(eyebrows.slice(0, 2)).toEqual(["START SOMETHING", "GO TO"]);
  });

  /* ── MS9 · page icons ─────────────────────────────────────────────────────────────────────────── */
  test("MS9 · each Go-to row's icon is its sidebar row's, path for path", async ({ page }) => {
    await inkOpen(page, "/queries", 1440, { scope: "ms9" });
    const side = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>("#ws-sidebar .ws-ni")]
      .map((e) => [e.querySelector(".ws-lbl")?.textContent?.trim() ?? "", [...e.querySelectorAll(".ws-ic svg *")].map((n) => n.outerHTML.replace(/\s+/g, " ")).join("")])));
    await openSearch(page);
    const rows = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.sp-pal--ink .sp-res[data-kind="page"]')]
      .map((e) => ({ t: e.querySelector(".sp-t1")?.textContent?.trim() ?? "", d: [...e.querySelectorAll(".sp-ic svg *")].map((n) => n.outerHTML.replace(/\s+/g, " ")).join("") })));
    const sidebarPages = rows.filter((r) => side[r.t] !== undefined);
    expect(sidebarPages.length, "Go-to rows that are sidebar pages").toBeGreaterThanOrEqual(3);
    for (const r of sidebarPages) expect(r.d, `"${r.t}"`).toBe(side[r.t]);
  });

  /* ── MS10 · keycaps ───────────────────────────────────────────────────────────────────────────── */
  test("MS10 · every keycap shown is a bound key", async ({ page }) => {
    /* the Step 0 audit's bound list: the palette's own keys (↑ ↓ ↵ Esc), ⌘K / Ctrl K (usePalette), and
       "?" (ShortcutsSheet) — nothing else is bound, so nothing else may show a keycap */
    const BOUND = new Set(["↑", "↓", "↵", "ESC", "⌘K", "Ctrl K", "?"]);
    await inkOpen(page, "/queries", 1440, { scope: "ms10" });
    await openSearch(page);
    const caps = async () => (await page.locator(".sp-pal--ink .sp-kc, .sp-pal--ink .sp-kb, .sp-pal--ink .sp-foot i, .sp-pal--ink .sp-esc").allInnerTexts()).map((t) => t.trim());
    const a = await caps();
    await page.keyboard.type("marsh"); await page.waitForTimeout(300);
    const b = await caps();
    await closeAll(page);
    await openHelp(page);
    const c = (await page.locator('[data-shell="help-menu"] .sa-kc').allInnerTexts()).map((t) => t.trim());
    const all = [...a, ...b, ...c];
    expect(all.length, "keycaps seen").toBeGreaterThan(4);
    for (const k of all) expect(BOUND.has(k), `keycap "${k}" is not a bound key`).toBe(true);
  });
});

test.describe("your menu", () => {
  /* ── MS11 ─────────────────────────────────────────────────────────────────────────────────────── */
  test("MS11 · the plan sits on an ink tile and the lilac is gone", async ({ page }) => {
    for (const w of WIDTHS) {
      await inkOpen(page, "/queries", w, { scope: "ms11" });
      await page.locator(".ws-uacct").click(); await page.waitForTimeout(350);
      const r = await page.evaluate(() => {
        const menu = document.querySelector<HTMLElement>('[data-shell="account-menu"]');
        if (!menu) return null;
        const probe = document.createElement("div"); probe.style.background = "var(--slate-tint)"; document.body.appendChild(probe);
        const lilac = getComputedStyle(probe).backgroundColor; probe.remove();
        const bgs = [menu, ...menu.querySelectorAll<HTMLElement>("*")].map((e) => getComputedStyle(e).backgroundColor);
        return { tile: getComputedStyle(menu.querySelector(".am-iplan")!).backgroundColor, lilac, hasLilac: bgs.includes(lilac) };
      });
      expect(r, `${w}: your menu is open`).not.toBeNull();
      expect(r!.tile, `${w}: the plan tile`).toBe("rgb(27, 36, 51)");
      expect(r!.hasLilac, `${w}: the lilac (${r!.lilac}) is still in the menu`).toBe(false);
      await closeAll(page);
    }
  });
});

test.describe("settings", () => {
  /* ── MS12 · the shell ─────────────────────────────────────────────────────────────────────────── */
  test("MS12 · the tab says ACCOUNT · Settings; Back to app once, in the bar; no Playfair in the sidebar", async ({ page }) => {
    for (const w of WIDTHS) {
      await inkOpen(page, "/account/profile", w, { scope: "ms12" });
      const tab = await page.evaluate(() => ({
        g: (document.querySelector(".ws-ftab .ws-ftg, .ws-ftab small") as HTMLElement | null)?.innerText ?? "",
        n: (document.querySelector(".ws-ftab .ws-ftn") as HTMLElement | null)?.innerText ?? "",
      }));
      expect(tab.g, `${w}: the tab's group`).toBe("ACCOUNT");
      expect(tab.n, `${w}: the tab's page`).toBe("Settings");
      const backs = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("button, a")]
        .filter((e) => /Back to app/.test(e.innerText) && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== "hidden")
        .map((e) => !!e.closest(".ws-pagebar")));
      expect(backs, `${w}: one visible Back to app, in the bar`).toEqual([true]);
      const fs = await faces(page, "#ws-sidebar");
      expect(fs.length, `${w}: sidebar text found`).toBeGreaterThan(8);
      for (const f of fs) expect(f.face, `${w}: "${f.text}"`).not.toMatch(/Playfair/);
    }
  });

  /* ── MS13 · the layout ────────────────────────────────────────────────────────────────────────── */
  test("MS13 · content starts 56 from the sheet, two columns at every width, no Playfair/Inter/Source Sans", async ({ page }) => {
    for (const w of WIDTHS) {
      for (const route of ["/account/profile", "/account/notifications", "/account/preferences", "/account/data"]) {
        await inkOpen(page, route, w, { scope: "ms13" });
        const sheet = (await vis(page, ".ws-window"))!;
        const hd = (await vis(page, ".acct-page .sc-ttl"))!;
        expect(near(hd.x - sheet.x, 56), `${w} ${route}: content at ${hd.x - sheet.x} from the sheet`).toBe(true);
        const cols = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".acct-page .sc-card")].filter((c) => c.getBoundingClientRect().width > 0)
          .map((c) => ({ ch: c.querySelector(".sc-ch")!.getBoundingClientRect().right, cb: c.querySelector(".sc-cb")!.getBoundingClientRect().left })));
        expect(cols.length, `${w} ${route}: sections`).toBeGreaterThan(0);
        for (const c of cols) expect(c.cb, `${w} ${route}: the card sits beside its heading`).toBeGreaterThan(c.ch + 30);
        for (const f of await faces(page, ".acct-page")) expect(f.face, `${w} ${route}: "${f.text}"`).not.toMatch(/Playfair|\bInter\b|Source Sans/);
      }
    }
  });

  /* ── MS14 · the controls ──────────────────────────────────────────────────────────────────────── */
  test("MS14 · toggles on #2d3a50; the input focus ring and halo; the primary button #2d3a50", async ({ page }) => {
    await inkOpen(page, "/account/notifications", 1440, { scope: "ms14" });
    const on = page.locator('.acct-page .acct-toggle[aria-checked="true"]').first();
    expect(await on.count(), "a toggle that is on (the precondition)").toBe(1);
    expect(await on.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(45, 58, 80)");
    await inkOpen(page, "/account/profile", 1440, { scope: "ms14" });
    const input = page.locator("#account-name");
    await input.focus();
    const ring = await input.evaluate((e) => getComputedStyle(e).boxShadow);
    expect(ring, "the focus ring").toMatch(/rgb\(45, 58, 80\) 0px 0px 0px 1\.5px inset/);
    expect(ring, "the halo").toMatch(/rgba\(45, 58, 80, 0\.12\) 0px 0px 0px 4px/);
    /* the primary only exists while the name differs: type, read, then put it back WITHOUT saving */
    const was = await input.inputValue();
    await input.press("End"); await input.type("x");
    const save = page.locator(".acct-page .acct-btn--primary");
    await expect(save).toBeVisible();
    expect(await save.evaluate((e) => getComputedStyle(e).backgroundColor), "the primary button").toBe("rgb(45, 58, 80)");
    await page.getByRole("button", { name: "Discard" }).click();
    expect(await input.inputValue(), "the name is back as it was, unsaved").toBe(was);
  });

  /* ── MS15 · the phone ─────────────────────────────────────────────────────────────────────────── */
  test("MS15 · at 390px the Settings pages and the Query Centre are main's, pixel for pixel", async ({ page }) => {
    test.setTimeout(600_000);
    const dir = "reports/ink-shell-v1/menus/ms15-main-390";
    const routes = ["/account/profile", "/account/notifications", "/account/preferences", "/account/data"];
    await openRoute(page, "/dashboard", { width: 1440, height: 900 });
    await page.setViewportSize({ width: 390, height: 844 });
    const shots: Record<string, Buffer> = {};
    for (const r of routes) {
      await page.goto(r); await page.waitForTimeout(2500);
      await page.evaluate(() => document.fonts.ready);
      await applyMutation(page, "ms15");
      shots[r] = await page.screenshot({ fullPage: true });
    }
    /* ⚠️ NONE OF THE FIVE MENUS EXISTS BELOW 768px — the bar (capture, Help) and the sidebar (selector,
       "+N", your menu) are desktop chrome, and the phone bar draws no account opener (its button is in
       the DOM and not visible). So the phone's half of "the menus match main" is the pages they would
       sit over: the Query Centre is held too, which is where the fix-ups card leaked onto the phone. */
    await page.goto("/queries"); await page.waitForTimeout(2500);
    await applyMutation(page, "ms15");
    shots["/queries"] = await page.screenshot({ fullPage: true });
    if (process.env.MS15_CAPTURE) {
      mkdirSync(dir, { recursive: true });
      for (const [k, v] of Object.entries(shots)) writeFileSync(`${dir}/${k.replace(/\//g, "_")}.png`, v);
      return;
    }
    for (const [k, v] of Object.entries(shots)) {
      const f = `${dir}/${k.replace(/\//g, "_")}.png`;
      expect(existsSync(f), `${f}: capture main's references first (MS15_CAPTURE=1 against main)`).toBe(true);
      expect(Date.now() - statSync(f).mtimeMs, `${f} is older than 12 hours — recapture from main`).toBeLessThan(12 * 3600e3);
      expect(v.equals(readFileSync(f)), `${k} at 390 differs from main`).toBe(true);
    }
  });
});
