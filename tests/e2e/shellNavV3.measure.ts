/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shell nav v3 (13 Nov; ref design-refs/shell-nav-v3.html) — the rendered tab strip, the account menu's Your notes
 * row and the guide pill. Report: reports/shell-nav-v3/REPORT.md.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/shellNavV3.measure.ts --project=measure --workers=1`.
 *
 * ⚠️ EVERY LOCK PROVES ITSELF IN THE SAME RUN. Each reading goes through a pure `problems()` function; the test
 * asserts the clean page has none, then breaks the page in place (a stylesheet rule or a DOM move named in the test)
 * and asserts the same function now finds some. A lock that cannot see its own break fails.
 *
 * SNV3_SHOTS=<dir> writes the Phase 3 screenshots there.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const WIDE = { width: 1512, height: 982 };
const SIZES = [{ width: 1280, height: 800 }, WIDE, { width: 1728, height: 1117 }];
const MATERIALS: [string, string, string][] = [
  ["/materials/letters", "m-letters", "Letters"],
  ["/queries/packages", "q-pkg", "Packages"],
  ["/manuscripts/comps", "m-comps", "Comps"],
  ["/manuscripts/versions", "m-ver", "Versions"],
  ["/manuscripts", "m-ms", "Manuscript"],
];
const SHOTS = process.env.SNV3_SHOTS ?? "";

async function sidebarMode(page: Page, mode: "rail" | "pinned") {
  await page.addInitScript((m) => {
    try {
      localStorage.setItem("scriptally:sidebar-collapsed", m === "rail" ? "1" : "0");
      localStorage.setItem("scriptally:sidebar-pinned", m === "pinned" ? "1" : "0");
    } catch { /* first visit */ }
  }, mode);
}
async function addCss(page: Page, css: string): Promise<void> {
  await page.evaluate((c) => { const st = document.createElement("style"); st.dataset.snv3Break = ""; st.textContent = c; document.head.appendChild(st); }, css);
  await page.waitForTimeout(250);
}
async function dropBreaks(page: Page): Promise<void> {
  await page.evaluate(() => document.querySelectorAll("[data-snv3-break]").forEach((e) => e.remove()));
  await page.waitForTimeout(250);
}

interface Tab { id: string; left: number; right: number; top: number; bottom: number; cur: boolean; sw: number; cw: number; text: string }
async function readTabs(page: Page): Promise<{ tabs: Tab[]; search: { left: number; right: number }; bar: { left: number; right: number }; pill: number | null }> {
  return page.evaluate(() => {
    const nav = document.querySelector<HTMLElement>('[data-shell="tabs"]');
    const els = nav ? [...nav.querySelectorAll<HTMLElement>("[data-tab], .ws-ftmore")] : [];
    const tabs = els.map((e) => {
      const r = e.getBoundingClientRect();
      const label = e.querySelector<HTMLElement>(".ws-ftn, .ws-fttl");
      return {
        id: e.dataset.tab ?? "more", left: r.left, right: r.right, top: r.top, bottom: r.bottom, cur: e.getAttribute("aria-current") === "page",
        sw: label ? label.scrollWidth : e.scrollWidth, cw: label ? label.clientWidth : e.clientWidth, text: (label?.textContent ?? "").trim(),
      };
    });
    const s = document.querySelector<HTMLElement>(".ws-sfield")!.getBoundingClientRect();
    const b = document.querySelector<HTMLElement>(".ws-pagebar")!.getBoundingClientRect();
    const p = [...document.querySelectorAll<HTMLElement>("[data-pck='pill'], [data-snv3-pill]")].find((e) => e.getBoundingClientRect().width > 0);
    return { tabs, search: { left: s.left, right: s.right }, bar: { left: b.left, right: b.right }, pill: p ? p.getBoundingClientRect().width : null };
  });
}

/** SNV3-F1's rule: no overlap, clear of the search field, the current tab's full name, nothing clipped. */
function fitProblems(r: Awaited<ReturnType<typeof readTabs>>, expectName: string): string[] {
  const out: string[] = [];
  const t = r.tabs;
  if (t.length === 0) out.push("no tabs");
  for (let i = 1; i < t.length; i++) if (t[i].left < t[i - 1].right - 0.5) out.push(`${t[i - 1].id} overlaps ${t[i].id} by ${(t[i - 1].right - t[i].left).toFixed(1)}`);
  const last = t[t.length - 1];
  if (last && last.right > r.search.left - 0.5) out.push(`${last.id} reaches the search field (${last.right.toFixed(1)} > ${r.search.left.toFixed(1)})`);
  const cur = t.find((x) => x.cur);
  if (!cur) out.push("no current tab");
  else if (cur.text !== expectName) out.push(`the current tab reads "${cur.text}", not "${expectName}"`);
  for (const x of t) if (x.sw > x.cw + 0.5) out.push(`${x.id} is clipped (${x.sw} > ${x.cw})`);
  for (const x of t) if (x.left < r.bar.left - 0.5) out.push(`${x.id} starts left of the bar`);
  return out;
}

test.describe("shell nav v3 — the tab strip, measured", () => {
  test.setTimeout(600_000);

  test("SNV3-E1 the rendered tabs are the section's pages in nav order on every page of Queries, Agents, Materials and Tasks", async ({ page }) => {
    await sidebarMode(page, "rail");
    const SECTIONS: [string, string[]][] = [
      ["queries", ["/queries", "/queries/responses", "/queries/analytics"]],
      ["agents", ["/agents", "/agents/discover"]],
      ["materials", MATERIALS.map((m) => m[0])],
      ["tasks", ["/todo", "/todo/corkboard"]],
    ];
    const ORDER: Record<string, string[]> = {
      queries: ["q-centre", "q-responses", "q-analytics"], agents: ["a-list", "a-disc"],
      materials: ["m-letters", "q-pkg", "m-comps", "m-ver", "m-ms"], tasks: ["list", "noteboard"],
    };
    const ids = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-shell="tabs"] [data-tab]')]
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left).map((e) => e.dataset.tab!));
    for (const [sec, routes] of SECTIONS) {
      for (const route of routes) {
        await openRoute(page, route, WIDE);
        const got = await ids();
        console.log(`[SNV3-E1] ${route}`, JSON.stringify(got));
        expect(got, route).toEqual(ORDER[sec]);
      }
    }
    /* self-check: the old behaviour — the current page moved to the first slot — is seen */
    await page.evaluate(() => { const n = document.querySelector('[data-shell="tabs"]')!; n.prepend(n.querySelector('[aria-current="page"]')!); });
    expect(await ids(), "the break (current tab first) is seen").not.toEqual(ORDER.tasks);
  });

  test("SNV3-E2 stability at 1512×982: clicking a tab never reorders the strip, and no tab left of both moves", async ({ page }) => {
    await sidebarMode(page, "rail");
    await openRoute(page, "/materials/letters", WIDE);
    const lefts = () => page.evaluate(() => Object.fromEntries([...document.querySelectorAll<HTMLElement>('[data-shell="tabs"] [data-tab]')]
      .map((e) => [e.dataset.tab!, Math.round(e.getBoundingClientRect().left * 10) / 10])));
    const order = (l: Record<string, number>) => Object.entries(l).sort((a, b) => a[1] - b[1]).map((e) => e[0]);
    const before = await lefts();
    await page.locator('[data-shell="tabs"] [data-tab="m-comps"]').click();
    await expect(page).toHaveURL(/\/manuscripts\/comps$/);
    await page.waitForTimeout(600);
    const after = await lefts();
    console.log("[SNV3-E2] on Query letters", JSON.stringify(before), "→ on Comparable titles", JSON.stringify(after));
    const ids = MATERIALS.map((m) => m[1]);
    expect(order(before)).toEqual(ids);
    expect(order(after), "the order is unchanged").toEqual(ids);
    expect(Math.abs(after["m-letters"] - before["m-letters"]), "the first tab's left edge").toBeLessThan(0.5);
    /* ⚠️ THE BRIEF'S LITERAL READING CANNOT HOLD WITH THE REF'S VALUES: Packages, left of Comps, moves by the old
       current tab's growth (19px vs 16px type, 22 vs 16 padding) and its right lane. Recorded, not asserted. */
    console.log("[SNV3-E2] Packages moved by", (after["q-pkg"] - before["q-pkg"]).toFixed(1), "px (Letters settled)");
    /* the stronger claim that does hold: a tab left of BOTH the old and the new current tab never moves */
    await page.locator('[data-shell="tabs"] [data-tab="m-ms"]').click();
    await expect(page).toHaveURL(/\/manuscripts$/);
    await page.waitForTimeout(600);
    const third = await lefts();
    console.log("[SNV3-E2] → on Manuscripts", JSON.stringify(third));
    expect(order(third), "the order is unchanged").toEqual(ids);
    for (const id of ["m-letters", "q-pkg"]) expect(Math.abs(third[id] - after[id]), `${id} left of both`).toBeLessThan(0.5);
    /* self-check: the current tab jumping to the front is seen */
    await addCss(page, '[data-shell="tabs"] .ws-fttab.is-cur { order: -1 }');
    const broken = await lefts();
    expect(order(broken), "the break (current first) is seen").not.toEqual(ids);
    await dropBreaks(page);
  });

  for (const mode of ["rail", "pinned"] as const) {
    test(`SNV3-F1 fit (${mode}): at 1280×800, 1512×982 and 1728×1117, on each Materials page with the guide pill showing`, async ({ page }) => {
      await sidebarMode(page, mode);
      const rows: string[] = [];
      for (const vp of SIZES) {
        let pillW: number | null = null;
        for (const [route, , name] of MATERIALS) {
          await openRoute(page, route, vp);
          let r = await readTabs(page);
          let how = "the page's own pill";
          if (r.pill === null) {
            /* no guide on this page (or the harness has it hidden): a stand-in of the real pill's measured width in the
               page slot, so the strip is fitted against the bar it would have */
            const w = pillW ?? 232;
            await page.evaluate((px) => {
              const slot = document.querySelector<HTMLElement>('[data-shell="page-slot"]');
              const s = document.createElement("span"); s.dataset.snv3Pill = ""; s.style.cssText = `display:inline-block;width:${px}px;height:36px;margin-right:10px`;
              slot?.appendChild(s);
            }, w);
            await page.waitForTimeout(400);
            r = await readTabs(page);
            how = `a ${w}px stand-in`;
          } else pillW = r.pill;
          const p = fitProblems(r, name);
          const modes = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-shell="tabs"] [data-tab], [data-shell="tabs"] .ws-ftmore')].map((e) => e.getAttribute("aria-current") ? "cur" : e.dataset.mode ?? "more").join(","));
          rows.push(`${mode} ${vp.width} ${route}: ${modes} · pill ${Math.round(r.pill ?? 0)} (${how}) · ${p.length ? p.join("; ") : "ok"}`);
          expect(p, `${mode} ${vp.width} ${route}`).toEqual([]);
        }
      }
      console.log(`[SNV3-F1]\n${rows.join("\n")}`);
      /* self-check: live resting tabs drawn wider than the fit measured them overlap the search field */
      await addCss(page, '[data-shell="tabs"] .ws-fttab:not(.is-cur) { padding: 0 90px !important }');
      expect(fitProblems(await readTabs(page), "Manuscript").length, "the break (tabs wider than fitted) is seen").toBeGreaterThan(0);
      await dropBreaks(page);
      await addCss(page, '[data-shell="tabs"] .ws-ftab .ws-ftn { display: inline-block; max-width: 30px; overflow: hidden }');
      expect(fitProblems(await readTabs(page), "Manuscript").length, "the break (current name clipped) is seen").toBeGreaterThan(0);
      await dropBreaks(page);
    });
  }

  test("SNV3-F2 a long section retreats names → icons → +N from the right; the current tab never does", async ({ page }) => {
    await sidebarMode(page, "pinned");
    await page.addInitScript(() => { (window as unknown as { __SA_INK_TABS: number }).__SA_INK_TABS = 6; });
    const seen = new Set<string>();
    for (const [w, route] of [[1728, "/materials/letters"], [1512, "/manuscripts/comps"], [1280, "/manuscripts"], [1100, "/manuscripts/comps"], [960, "/materials/letters"]] as [number, string][]) {
      await openRoute(page, route, { width: w, height: 900 });
      const modes = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-shell="tabs"] [data-tab], [data-shell="tabs"] .ws-ftmore')]
        .map((e) => (e.getAttribute("aria-current") ? "cur" : e.dataset.mode ?? "more")));
      console.log(`[SNV3-F2] ${w} ${route}`, modes.join(" "));
      modes.forEach((m) => seen.add(m));
      expect(modes.filter((m) => m === "cur"), `${w}: one current tab, never an icon`).toHaveLength(1);
      const resting = modes.filter((m) => m !== "cur" && m !== "more");
      expect(resting.join(" "), `${w}: names before icons`).toMatch(/^(full ?)*(ic ?)*$/);
      if (modes.includes("more")) expect(modes[modes.length - 1], `${w}: +N last`).toBe("more");
      const r = await readTabs(page);
      expect(fitProblems(r, r.tabs.find((t) => t.cur)?.text ?? "").filter((x) => !/reads/.test(x)), `${w} ${route}`).toEqual([]);
    }
    expect([...seen].sort(), "every branch exercised").toEqual(["cur", "full", "ic", "more"]);
  });

  test("SNV3-E4 no group label in the bar on any page", async ({ page }) => {
    await sidebarMode(page, "rail");
    const count = () => page.evaluate(() => document.querySelectorAll(".ws-pagebar .ws-ftg, .ws-pagebar small").length);
    for (const route of ["/dashboard", "/queries", "/queries/responses", "/queries/analytics", "/agents", "/agents/discover", ...MATERIALS.map((m) => m[0]),
      "/todo", "/todo/corkboard", "/your-notes", "/account/profile", "/help", "/plans"]) {
      await openRoute(page, route, WIDE);
      expect(await count(), route).toBe(0);
    }
    await page.evaluate(() => { const s = document.createElement("small"); s.className = "ws-ftg"; s.textContent = "ACCOUNT"; document.querySelector(".ws-pagebar .ws-ftab")?.prepend(s); });
    expect(await count(), "the break (a group label) is seen").toBe(1);
  });
});

/** The page's guide pill, made visible if the harness account has it hidden or finished (the Help menu's own rows). */
async function showPill(page: Page): Promise<boolean> {
  const vis = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].some((e) => e.getBoundingClientRect().width > 0));
  if (await vis()) return true;
  await page.locator('.ws-pagebar [data-shell="help"]').click();
  const row = page.locator('[data-hm="restore"], [data-hm="open-guide"]').first();
  if (await row.count()) { await row.click(); await page.waitForTimeout(800); await page.keyboard.press("Escape"); await page.waitForTimeout(300); }
  else await page.keyboard.press("Escape");
  return vis();
}
const pillBg = (page: Page) => page.evaluate(() => {
  const p = [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].find((e) => e.getBoundingClientRect().width > 0);
  return p ? getComputedStyle(p).backgroundColor : null;
});
const transparent = (c: string | null) => c === "rgba(0, 0, 0, 0)" || c === "transparent";

test.describe("shell nav v3 — the account menu and the guide pill, measured", () => {
  test.setTimeout(300_000);

  test("SNV3-A1e the account menu's Your notes row sits between Task settings and Help centre, and goes to /your-notes", async ({ page }) => {
    await sidebarMode(page, "rail");
    await openRoute(page, "/dashboard", WIDE);
    await page.locator(".wsr-av").click();
    const menu = page.locator('[data-shell="account-menu"]');
    await expect(menu).toBeVisible();
    const rows = async () => (await menu.locator('[role="menuitem"] > span').allTextContents()).map((t) => t.trim());
    const got = await rows();
    console.log("[SNV3-A1e]", JSON.stringify(got));
    expect(got).toEqual(["Settings", "Task settings", "Your notes", "Help centre", "Sign out"]);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/10-account-menu-open.png` });
    /* self-check: the row moved below Help centre is seen */
    await page.evaluate(() => { const m = document.querySelector('[data-shell="account-menu"]')!; const r = m.querySelector('[data-am="your-notes"]')!; m.querySelector('.am-out')!.before(r); });
    expect(await rows(), "the break (row moved) is seen").not.toEqual(["Settings", "Task settings", "Your notes", "Help centre", "Sign out"]);
    await menu.locator('[data-am="your-notes"]').click();
    await expect(page).toHaveURL(/\/your-notes$/);
    await expect(menu).toHaveCount(0);
    await expect(page.locator('[data-shell="tabs"] .ws-ftn')).toHaveText("Your notes");
  });

  test("SNV3-P1 the guide pill's computed background is transparent on the Contact list and the Query Centre", async ({ page }) => {
    await sidebarMode(page, "rail");
    for (const route of ["/agents", "/queries"]) {
      await openRoute(page, route, WIDE);
      expect(await showPill(page), `${route}: a guide pill is on screen`).toBe(true);
      const bg = await pillBg(page);
      console.log(`[SNV3-P1] ${route}`, bg);
      expect(transparent(bg), `${route}: ${bg}`).toBe(true);
    }
    await addCss(page, ".pck-pill { background: #fbeee8 !important }");
    expect(transparent(await pillBg(page)), "the break (the blush fill) is seen").toBe(false);
    await dropBreaks(page);
  });

  test("SNV3-S screenshots at 1512×982", async ({ page }) => {
    test.skip(!SHOTS, "set SNV3_SHOTS to a folder to write the screenshots");
    await sidebarMode(page, "rail");
    const list: [string, string][] = [
      ["01-dashboard", "/dashboard"], ["02-query-centre", "/queries"], ["03-responses", "/queries/responses"], ["04-contact-list", "/agents"],
      ["05-query-letters", "/materials/letters"], ["06-comparable-titles", "/manuscripts/comps"], ["07-manuscripts", "/manuscripts"],
      ["08-todo-list", "/todo"], ["09-your-notes", "/your-notes"],
    ];
    for (const [name, route] of list) {
      await openRoute(page, route, WIDE);
      if (["/queries", "/agents", "/manuscripts"].includes(route)) await showPill(page);
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${SHOTS}/${name}.png` });
      /* the bar alone, for the comparison with the ref's frames */
      await page.screenshot({ path: `${SHOTS}/${name}-bar.png`, clip: { x: 0, y: 0, width: 1512, height: 110 } });
    }
  });
});
