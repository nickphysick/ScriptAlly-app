/**
 * IP1 — the Import page (onboarding v5, part 3).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test onbV5ImportPage --project=measure --no-deps
 *   IP1_CAPTURE=1   write lock P1's fixture (done once, on the build before Phase 1)
 *   IP1_MUTATE=<lock>   apply that lock's named break in the page
 *   IP1_SHOTS=1     write the report's screenshots
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { FIX, MUTATE, SHOTS, OUT, VIEWPORTS, lab, capture, record, vpName } from "./ip1Lib";
import { openRoute } from "./measure";
import { settleStep } from "./reviewDrive";
import { devDb } from "./devWrite";
import { openMatcher, readRun, snapshot as matcherSnapshot, cleanup as matcherCleanup, type Kind } from "./matcherDrive";

test.setTimeout(120_000);

/* ════ P1 · Phase 1 changes nothing a writer can see ════════════════════════════════════════════
   Every import screen on the lab, as rendered by the build BEFORE the import was lifted out of
   BranchB, against the same screen now. Static screens compare their whole markup; the two loaders
   compare their structure (their text and inline styles move with time). */
interface Screen { id: string; q: string; mode: "full" | "skeleton"; steps?: Array<"primary" | "import">; wait?: string }
const P1_SCREENS: Screen[] = [
  /* v9: set-up no longer shows the v5 book step (OB9 B1–B4); the Import page's is held by F2. */
  /* v9: the fork and the hand-off are redrawn (OB9 F1). */
  { id: "used-free", q: "s=used-free", mode: "full" },
  { id: "used-pro", q: "s=used-pro", mode: "full" },
  { id: "unreadable", q: "s=unreadable", mode: "full" },
  { id: "nothing", q: "s=nothing", mode: "full" },
  { id: "unloaded", q: "s=unloaded", mode: "full" },
  { id: "reading-work", q: "s=reading&hold=work", mode: "skeleton" },
  { id: "reading-done", q: "s=reading&hold=done", mode: "skeleton" },
  { id: "importing", q: "s=importing", mode: "skeleton" },
  /* v9: the summary and the three review steps are redrawn (OB9 S1, G1 to G4), so they left the
     pre-move comparison. The loaders and the nothing-imported screen are still held to it. */
  { id: "flow-importing", q: "s=flow&fx=clear&floor=60000", mode: "skeleton", steps: ["primary", "primary", "import"] },
  { id: "flow-nothing", q: "s=flow&fx=clear&none=1&floor=50", mode: "full", steps: ["primary", "primary", "import"], wait: '[data-screen="nothing"], [data-sf="chip"]' },
];
const P1_VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const CAPTURE = !!process.env.IP1_CAPTURE;
const P1_FILE = resolve(FIX, "p1-before.json");

/* The capture must not depend on the machine or the day.
   THE MACHINE: the dashboard ghost behind the importing loader sits in `.ws-wbody`, which reserves a
   scrollbar gutter on both edges (`scrollbar-gutter: stable both-edges`). Chromium follows the
   machine's scrollbar mode, so on a machine showing classic bars the ghost is 11px further in on
   each side than on one showing overlay bars. The capture was taken with overlay bars; on
   12 Oct the same build measured the ghost's heading at 61 where the capture has 50. The gutter is
   switched off for the capture, so the boxes are the same in either mode.
   THE DAY: the clock is fixed (`P1_CLOCK`, or IP1_P1_CLOCK to move it), so nothing drawn from the
   date can move a box. Nothing does today; this keeps it that way. */
const P1_CLOCK = process.env.IP1_P1_CLOCK ?? "2026-10-11T12:00:00";
const P1_NO_GUTTER = ".ws-wbody { scrollbar-gutter: auto !important; }";

async function reach(page: Page, s: Screen) {
  await page.clock.setFixedTime(new Date(P1_CLOCK));
  await lab(page, s.q);
  if (!process.env.IP1_P1_GUTTER) await page.addStyleTag({ content: P1_NO_GUTTER });
  for (const step of s.steps ?? []) {
    await page.locator('[data-im="primary"]').first().click();
    await page.waitForTimeout(step === "import" ? 500 : 250);
  }
  if (s.wait) await page.waitForSelector(s.wait, { timeout: 15_000 });
  await page.waitForTimeout(300);
  if (MUTATE === "P1") {
    /* the named break: reorder two children in the summary */
    await page.evaluate(() => { const pops = document.querySelector(".im-pops"); if (pops && pops.children.length > 1) pops.appendChild(pops.children[0]); });
  }
}

for (const vp of P1_VIEWPORTS) {
  test.describe(`P1 ${vpName(vp)}`, () => {
    test.use({ viewport: vp });
    test("P1 every import screen renders as it did before the move", async ({ page }) => {
      await assertLocalBundleIsDev();
      const before: Record<string, { html: string; boxes: unknown[] }> = !CAPTURE && existsSync(P1_FILE) ? JSON.parse(readFileSync(P1_FILE, "utf8")) : {};
      const now: Record<string, { html: string; boxes: unknown[] }> = {};
      const diffs: string[] = [];
      /* Phone last screens v1 (2B): below 768px the dead ends' actions moved into the set-up frame's pinned
         foot by design, so their markup differs from this capture there (PLS1 L2 holds the new shape). */
      const PHONE_MOVED = new Set(["used-free", "used-pro", "unreadable", "nothing", "unloaded", "flow-nothing"]);
      for (const s of P1_SCREENS) {
        if (vp.width < 768 && PHONE_MOVED.has(s.id)) continue;
        await reach(page, s);
        const c = await capture(page, '[data-sf="sheet"]', s.mode);
        expect(c, `${s.id}: the sheet is on screen`).toBeTruthy();
        expect(c!.html.length, `${s.id}: the screen has markup`).toBeGreaterThan(200);
        now[`${s.id}@${vp.width}`] = c!;
        if (CAPTURE) continue;
        const was = before[`${s.id}@${vp.width}`];
        if (!was) { diffs.push(`${s.id}: no capture to compare with`); continue; }
        if (was.html !== c!.html) {
          let i = 0; while (i < was.html.length && was.html[i] === c!.html[i]) i += 1;
          diffs.push(`${s.id}: markup differs at ${i}: was "${was.html.slice(Math.max(0, i - 40), i + 60)}" now "${c!.html.slice(Math.max(0, i - 40), i + 60)}"`);
        }
        const a = was.boxes as [string, number, number, number, number][]; const b = c!.boxes as [string, number, number, number, number][];
        if (a.length !== b.length) diffs.push(`${s.id}: ${a.length} boxes before, ${b.length} now`);
        else for (let k = 0; k < a.length; k++) {
          if (a[k][0] !== b[k][0] || [1, 2, 3, 4].some((j) => Math.abs((a[k][j] as number) - (b[k][j] as number)) > 0.5)) { diffs.push(`${s.id}: box ${k} ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); break; }
        }
      }
      if (CAPTURE) {
        mkdirSync(FIX, { recursive: true });
        const all = existsSync(P1_FILE) ? JSON.parse(readFileSync(P1_FILE, "utf8")) : {};
        writeFileSync(P1_FILE, JSON.stringify({ ...all, ...now }, null, 0) + "\n");
        return;
      }
      record("P1", vpName(vp), "screens", { compared: Object.keys(now).length, diffs, clock: P1_CLOCK, gutterLeftOn: !!process.env.IP1_P1_GUTTER });
      expect(Object.keys(now).length, "every screen was compared").toBe(P1_SCREENS.filter((x) => !(vp.width < 768 && PHONE_MOVED.has(x.id))).length);
      expect(diffs).toEqual([]);
    });
  });
}

/* ════ D1 · the page: one navy panel, three tiles, the footnote ═════════════════════════════════
   On the real route, signed in, inside the real shell. */

async function readPage(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element | null | undefined) => !!e && (e as HTMLElement).offsetParent !== null;
    const root = [...document.querySelectorAll(".impg")].find(vis) as HTMLElement | undefined;
    if (!root) return null;
    const box = (e: Element | null | undefined) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.round(r.left * 2) / 2, y: Math.round(r.top * 2) / 2, w: Math.round(r.width * 2) / 2, h: Math.round(r.height * 2) / 2, r: Math.round(r.right * 2) / 2 }; };
    const panels = [...root.querySelectorAll("[data-hpanel]")].filter(vis);
    const panel = panels[0];
    const tiles = [...root.querySelectorAll('[data-impg="tile"]')].filter(vis);
    const row = root.querySelector('[data-impg="tiles"]');
    const foot = root.querySelector('[data-impg="footnote"]');
    const sheet = document.querySelector(".ws-window");
    const scroller = root.closest(".ws-wbody") ?? document.scrollingElement!;
    return {
      panels: panels.length,
      panelBg: panel ? getComputedStyle(panel).backgroundColor : "",
      panelRadius: panel ? getComputedStyle(panel).borderTopLeftRadius : "",
      h1: panel?.querySelector("h1")?.textContent ?? "",
      h1Font: panel?.querySelector("h1") ? getComputedStyle(panel.querySelector("h1")!).fontSize : "",
      sub: panel?.querySelector('[data-hp3-part="sub"]')?.textContent ?? "",
      panelButtons: panel ? panel.querySelectorAll("button, a").length : -1,
      panelArt: panel ? panel.querySelectorAll('[data-hp3-part="art"], img, svg').length : -1,
      headerSheets: [...root.querySelectorAll(".hsheet, [data-hsheet]")].filter(vis).length + [...document.querySelectorAll(".hsheet-host")].filter(vis).length,
      panel: box(panel), row: box(row), sheet: box(sheet),
      tiles: tiles.map((t) => ({ id: t.getAttribute("data-tile"), box: box(t), title: t.querySelector("h2")?.textContent, buttons: [...t.querySelectorAll("button")].map((b) => b.textContent), fact: t.querySelector('[data-impg="fact"]')?.textContent, bg: getComputedStyle(t).backgroundColor })),
      footnote: foot?.textContent ?? "", foot: box(foot),
      order: [...root.querySelectorAll('[data-hpanel], [data-impg="tiles"], [data-impg="footnote"]')].filter(vis).map((e) => e.getAttribute("data-impg") ?? "panel"),
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      scrollerOverflowX: (scroller as HTMLElement).scrollWidth - (scroller as HTMLElement).clientWidth,
      bad: (root.textContent ?? "").match(/upgrade|recommended/gi) ?? [],
    };
  });
}

/** Open /import signed in. The shared opener cannot open a phone width (its first panel match is
 *  the hidden sidebar), so it opens at 1440 and the page is then resized and reloaded. */
async function openImport(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, "/import", { width: 1440, height: 900 });
  if (vp.width !== 1440 || vp.height !== 900) { await page.setViewportSize(vp); await page.reload({ waitUntil: "load" }); }
  await page.locator(".impg").first().waitFor({ state: "attached", timeout: 20_000 });
  await page.waitForFunction(() => [...document.querySelectorAll('.impg [data-impg="tile"]')].some((e) => (e as HTMLElement).offsetParent !== null), null, { timeout: 20_000 });
  await page.evaluate(() => (document as Document).fonts.ready);
  /* A page entering reports its animated box: read only once two reads agree. */
  let last = "";
  for (let i = 0; i < 20; i++) {
    const now = await page.evaluate(() => { const e = [...document.querySelectorAll(".impg [data-hpanel], .impg [data-impg=\"flow\"]")].find((x) => (x as HTMLElement).offsetParent !== null); const r = e?.getBoundingClientRect(); return r ? `${r.top},${r.height},${getComputedStyle(e!).opacity}` : ""; });
    if (now && now === last) break;
    last = now; await page.waitForTimeout(150);
  }
}

for (const vp of VIEWPORTS) {
  test.describe(`D1 ${vpName(vp)}`, () => {
    test("D1 the Import page opens on a panel, three tiles and the footnote", async ({ page }) => {
      await openImport(page, vp);
      if (MUTATE === "D1") {
        /* the named break: the old page header in the panel's place */
        await page.evaluate(() => { const p = document.querySelector(".impg [data-hpanel]"); if (p) { p.removeAttribute("data-hpanel"); (p as HTMLElement).style.background = "transparent"; } });
      }
      const r = await readPage(page);
      expect(r, "the page is on screen").toBeTruthy();
      record("D1", vpName(vp), "page", r);
      if (SHOTS) { mkdirSync(resolve(OUT, "shots"), { recursive: true }); await page.screenshot({ path: resolve(OUT, "shots", `import-page-${vp.width}.png`), fullPage: vp.width < 900 }); }
      expect(r!.panels, "one panel").toBe(1);
      expect(r!.panelBg).toBe("rgb(45, 58, 80)");
      expect(r!.h1).toBe("Bring your list across.");
      expect(r!.panelButtons, "no button in the panel").toBe(0);
      expect(r!.headerSheets, "no header sheet under the panel").toBe(0);
      expect(r!.tiles.length, "exactly three tiles").toBe(3);
      expect(r!.tiles.map((t) => t.id)).toEqual(["smart", "template", "match"]);
      expect(r!.tiles.map((t) => t.title)).toEqual(["Smart import.", "Our template.", "Match your own columns."]);
      expect(r!.tiles.map((t) => t.buttons)).toEqual([["Import a spreadsheet"], ["Download the template", "Upload my sheet"], ["Match columns"]]);
      expect(r!.sub).toBe("Agents, queries and dates from the spreadsheet you already keep. You check everything before it's saved.");
      expect(r!.footnote).toBe("An import adds to what you already have. An agent already on your contact list isn't added again.");
      expect(r!.order).toEqual(["header", "tiles", "footnote"]);
      expect(r!.footnote.length).toBeGreaterThan(10);
      expect(Math.abs(r!.panel!.x - r!.row!.x), "the panel's left edge is the tiles' row's").toBeLessThanOrEqual(0.5);
      expect(Math.abs(r!.panel!.r - r!.row!.r), "the panel's right edge is the tiles' row's").toBeLessThanOrEqual(0.5);
      expect(r!.overflowX, "no horizontal overflow").toBeLessThanOrEqual(0);
      expect(r!.scrollerOverflowX).toBeLessThanOrEqual(0);
      expect(r!.bad).toEqual([]);
      if (vp.width >= 1280) {
        const ys = r!.tiles.map((t) => t.box!.y);
        expect(new Set(ys).size, "three across").toBe(1);
        expect(Math.round(r!.tiles[1].box!.x - r!.tiles[0].box!.r), "16 apart").toBe(16);
        expect(Math.abs(r!.row!.y - (r!.panel!.y + r!.panel!.h) - 28), "28 under the panel").toBeLessThanOrEqual(1);
        expect(Math.abs(r!.panel!.y - r!.sheet!.y - 28), "the panel is 28 under the sheet's top").toBeLessThanOrEqual(1);
        if (vp.width === 1440) expect(Math.abs(r!.panel!.h - 174), "the panel is the reference's 174 tall").toBeLessThanOrEqual(1);
        expect(Math.abs(r!.foot!.y - (r!.row!.y + r!.row!.h) - 28), "the footnote is 28 under the tiles").toBeLessThanOrEqual(1);
      } else {
        expect(new Set(r!.tiles.map((t) => t.box!.x)).size, "stacked").toBe(1);
      }
    });
  });
}

/* ════ D2 · each tile's button calls its own handler; the entitlement decides the first ═════════ */
const ENTITLEMENTS = [
  { reason: "free_available", fact: "1 Smart Import available", disabled: false },
  { reason: "free_used", fact: "Smart Import already used", disabled: true },
  { reason: "pro_available", fact: "1 Smart Import available", disabled: false },
  { reason: "pro_month_used", fact: "Available 1 Nov", disabled: true },
] as const;

test.describe("D2", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const e of ENTITLEMENTS) {
    test(`D2 tiles with the entitlement ${e.reason}`, async ({ page }) => {
      await lab(page, `s=import-page&ent=${e.reason}`, { wait: '.impg [data-impg="tile"]' });
      if (MUTATE === "D2") {
        /* the named break: the button is enabled when the Smart Import is used */
        await page.evaluate(() => { for (const b of document.querySelectorAll('[data-act="smart"]')) (b as HTMLButtonElement).disabled = false; });
      }
      const read = await page.evaluate(() => ({
        fact: document.querySelector('[data-tile="smart"] [data-impg="fact"]')?.textContent ?? "",
        disabled: (document.querySelector('[data-act="smart"]') as HTMLButtonElement | null)?.disabled,
        others: [...document.querySelectorAll('[data-act="download"], [data-act="upload"], [data-act="match"]')].map((b) => (b as HTMLButtonElement).disabled),
        facts: [...document.querySelectorAll('[data-impg="fact"]')].map((f) => f.textContent),
        bad: (document.querySelector(".impg")?.textContent ?? "").match(/upgrade|recommended/gi) ?? [],
        ringed: document.querySelectorAll(".impg .is-ringed, .impg [data-ringed], .impg .impg-badge").length,
      }));
      record("D2", "1440x900", e.reason, read);
      expect(read.fact).toBe(e.fact);
      expect(read.disabled, "disabled exactly when the entitlement says no").toBe(e.disabled);
      expect(read.others, "the other three buttons are always live").toEqual([false, false, false]);
      expect(read.facts.slice(1)).toEqual(["Always free · No limit", "CSV · Always free"]);
      expect(read.bad).toEqual([]);
      expect(read.ringed, "no tile is ringed or badged").toBe(0);
      // each press reaches its own handler
      const calls = async () => page.evaluate(() => (window.__onbLab?.calls ?? []).map((c: { name: string }) => c.name));
      const want: string[] = [];
      if (!e.disabled) { await page.locator('[data-act="smart"]').click(); want.push("picker"); }
      else { await page.locator('[data-act="smart"]').click({ force: true, trial: false }).catch(() => {}); }
      await page.locator('[data-act="download"]').click(); want.push("download");
      await page.locator('[data-act="upload"]').click(); want.push("templatePicker");
      await page.locator('[data-act="match"]').click(); want.push("matcher");
      expect(await calls()).toEqual(want);
    });
  }
});

/* ════ D3 · every way into /import lands on the tiles ═══════════════════════════════════════════ */
test.describe("D3", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  const onTiles = async (page: Page) => {
    await page.waitForFunction(() => [...document.querySelectorAll('.impg [data-impg="tile"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length === 3, null, { timeout: 20_000 });
    return page.evaluate(() => ({ path: location.pathname, matcher: !!document.querySelector(".impm, [data-impm]"), tiles: [...document.querySelectorAll('.impg [data-impg="tile"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length }));
  };
  test("D3 the address and the search palette each land on the tiles", async ({ page }) => {
    const seen: Record<string, unknown> = {};
    // 1 · the address itself (what the Contact list's, the Query Centre's and account settings' links navigate to)
    await openImport(page, { width: 1440, height: 900 });
    seen.address = await onTiles(page);
    // 2 · the search palette's "Import" page entry
    await openRoute(page, "/dashboard", { width: 1440, height: 900 });
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await page.keyboard.type("Import");
    const entry = page.getByText("Bring in queries from a spreadsheet").first();
    await entry.waitFor({ timeout: 10_000 });
    if (MUTATE === "D3") {
      /* the named break: the palette's entry opens the matcher instead of the tiles */
      await entry.click();
      await page.waitForFunction(() => location.pathname === "/import", null, { timeout: 10_000 });
      await page.locator('[data-act="match"]:visible').first().click();
      seen.palette = await page.evaluate(() => ({ path: location.pathname, tiles: [...document.querySelectorAll('.impg [data-impg="tile"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length }));
    } else {
      await entry.click();
      seen.palette = await onTiles(page);
    }
    record("D3", "1440x900", "ways", seen);
    for (const [way, r] of Object.entries(seen)) {
      expect((r as { path: string }).path, way).toBe("/import");
      expect((r as { tiles: number }).tiles, `${way} lands on the three tiles`).toBe(3);
    }
  });
});

/* ════ T1 · every token the page's rules read resolves ══════════════════════════════════════════ */
test.describe("T1", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("T1 the Import page's rules read only tokens that resolve", async ({ page }) => {
    await openImport(page, { width: 1440, height: 900 });
    if (MUTATE === "T1") await page.addStyleTag({ content: ".impg .impg-tile{background:var(--impg-nope)}" });
    const r = await page.evaluate(() => {
      const unresolved: string[] = []; let rules = 0; let reads = 0;
      const walk = (list: CSSRuleList) => {
        for (const rule of Array.from(list)) {
          if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule || (typeof CSSContainerRule !== "undefined" && rule instanceof CSSContainerRule)) { walk((rule as CSSGroupingRule).cssRules); continue; }
          if (!(rule instanceof CSSStyleRule) || !/\.impg|\.hp3--slim/.test(rule.selectorText)) continue;
          rules += 1;
          const names = new Set<string>();
          for (const m of rule.style.cssText.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) if (!m[2]) names.add(m[1]);
          if (!names.size) continue;
          let el: Element | null = null;
          try { el = document.querySelector(rule.selectorText.replace(/::?[\w-]+(\([^)]*\))?/g, (p) => (/^::|^:(hover|focus|focus-visible|disabled)/.test(p) ? "" : p))); } catch { el = null; }
          if (!el) continue;
          for (const n of names) { reads += 1; if (!getComputedStyle(el).getPropertyValue(n).trim()) unresolved.push(`${rule.selectorText} reads ${n}`); }
        }
      };
      for (const sheet of Array.from(document.styleSheets)) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
      const buttons = [...document.querySelectorAll(".impg button")].map((b) => getComputedStyle(b).backgroundColor);
      return { rules, reads, unresolved: [...new Set(unresolved)], buttons };
    });
    record("T1", "1440x900", "page", r);
    expect(r.rules, "the page's rules were found").toBeGreaterThan(15);
    expect(r.reads, "they read tokens").toBeGreaterThan(8);
    expect(r.unresolved).toEqual([]);
    for (const bg of r.buttons) { expect(bg).not.toBe("rgb(162, 69, 42)"); expect(bg).not.toBe("rgb(124, 58, 42)"); }
  });
});

/* ════ F1 · the import, inside the app ══════════════════════════════════════════════════════════
   On the real route, signed in: the flow's screens take the sheet, the real sidebar stays, and the
   set-up frame is not used. Nothing is imported: the walk stops at the summary and goes back. */
const FIXTURE = (name: string) => resolve(process.cwd(), "tests/fixtures/import", name);
async function flowState(page: Page) {
  return page.evaluate(() => {
    const vis = (e: Element | null | undefined) => !!e && (e as HTMLElement).offsetParent !== null;
    const root = [...document.querySelectorAll(".impg")].find(vis);
    const flow = root?.querySelector('[data-impg="flow"]');
    const sheet = document.querySelector(".ws-window")?.getBoundingClientRect();
    const screenEl = flow ? [...flow.querySelectorAll("[data-screen], [data-im='summary'], [data-im='review']")].find(vis) : null;
    const r = screenEl?.getBoundingClientRect();
    return {
      screen: flow?.getAttribute("data-flow-screen") ?? "",
      setupFrame: document.querySelectorAll("[data-setup-frame]").length,
      sidebar: [...document.querySelectorAll(".ws-panel")].filter(vis).length,
      navLinks: [...document.querySelectorAll(".ws-panel a, .ws-panel button")].filter(vis).length,
      tiles: root ? [...root.querySelectorAll('[data-impg="tile"]')].filter(vis).length : -1,
      panel: root ? [...root.querySelectorAll("[data-hpanel]")].filter(vis).length : -1,
      inSheet: !!(r && sheet && r.left >= sheet.left - 0.5 && r.right <= sheet.right + 0.5 && r.top >= sheet.top - 0.5),
      queriesCard: root?.querySelector('[data-im="card-queries"]')?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      sidebarBook: document.querySelector(".ws-panel [data-ms-title], .ws-panel .ws-mscard b, .ws-panel .bsw-title")?.textContent?.trim() ?? "",
      title: [...(root?.querySelectorAll("h1") ?? [])].filter(vis).map((h) => h.textContent)[0] ?? "",
    };
  });
}

test.describe("F1", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("F1 the template tile starts the flow in the app's sheet", async ({ page }) => {
    await openImport(page, { width: 1440, height: 900 });
    const book = await page.evaluate(() => { const id = localStorage.getItem("scriptally_active_manuscript_id"); return id; });
    await page.locator('.impg input[data-picker="template"]').setInputFiles(FIXTURE("template-iso.csv"));
    await page.locator('.impg [data-im="summary"]').waitFor({ timeout: 20_000 });
    if (MUTATE === "F1") {
      /* the named break: the set-up frame mounted in the app */
      await page.evaluate(() => { const d = document.createElement("div"); d.setAttribute("data-setup-frame", ""); document.querySelector(".impg")?.appendChild(d); });
    }
    const s = await flowState(page);
    record("F1", "1440x900", "template", { ...s, book });
    if (SHOTS) await page.screenshot({ path: resolve(OUT, "shots", "flow-summary-in-app-1440.png") });
    expect(s.screen).toBe("overview");
    expect(s.setupFrame, "the set-up frame is not used in the app").toBe(0);
    expect(s.sidebar, "the real sidebar is present").toBeGreaterThanOrEqual(1);
    expect(s.navLinks, "…with its navigation").toBeGreaterThan(8);
    expect(s.tiles, "the tiles gave way to the flow").toBe(0);
    expect(s.panel, "…and so did the header panel").toBe(0);
    expect(s.inSheet, "the flow renders inside the sheet's box").toBe(true);
    expect(s.queriesCard, "the queries card names a manuscript").toMatch(/5\s*queries\s*for\s+\S+/);
    // into the review, then Back: the first screen's Back returns to the tiles
    await page.locator('.impg [data-im="primary"]').click();
    await page.locator('.impg [data-im="review"]').waitFor({ timeout: 10_000 });
    await page.locator('.impg [data-im="back"]').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.impg [data-impg="tile"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length === 3, null, { timeout: 10_000 });
    const back = await flowState(page);
    expect(back.screen).toBe("idle");
    expect(back.tiles).toBe(3);
  });

  test("F1 the Smart import tile opens its confirm step; Back returns to the tiles", async ({ page }) => {
    await openImport(page, { width: 1440, height: 900 });
    const allowed = await page.evaluate(() => !(document.querySelector('.impg [data-act="smart"]') as HTMLButtonElement).disabled);
    test.skip(!allowed, "the harness account's Smart Import is spent; the confirm step is covered by the set-up lab");
    await page.locator('.impg input[data-picker="smart"]').setInputFiles(FIXTURE("smart-messy.xlsx"));
    await page.locator('.impg [data-screen="confirm"]').waitFor({ timeout: 10_000 });
    const s = await flowState(page);
    record("F1", "1440x900", "smart-confirm", s);
    if (SHOTS) await page.screenshot({ path: resolve(OUT, "shots", "flow-confirm-in-app-1440.png") });
    expect(s.screen).toBe("confirm");
    expect(s.setupFrame).toBe(0);
    expect(s.inSheet).toBe(true);
    await page.getByRole("button", { name: /Back/ }).first().click();
    await page.waitForFunction(() => [...document.querySelectorAll('.impg [data-impg="tile"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length === 3, null, { timeout: 10_000 });
    expect((await flowState(page)).screen).toBe("idle");
  });
});

/* ════ F2 · with no manuscript, the import opens on the book step ═══════════════════════════════ */
const labCalls = (page: Page) => page.evaluate(() => (window.__onbLab?.calls ?? []).map((c: { name: string; arg?: unknown }) => (c.arg ? `${c.name}:${String(c.arg)}` : c.name)));
const tilesShown = (page: Page) => page.evaluate(() => [...document.querySelectorAll('.impg [data-impg="tile"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length);

test.describe("F2", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("F2 no manuscript: Import a spreadsheet opens the book step, and nothing is written", async ({ page }) => {
    await lab(page, "s=import-page&live=1", { wait: '.impg [data-impg="tile"]' });
    await page.locator('[data-act="smart"]').click();
    if (MUTATE === "F2") await page.evaluate(() => document.querySelector('.impg [data-screen="book"]')?.remove()); // the named break: the book step skipped
    const r = await page.evaluate(() => ({
      book: [...document.querySelectorAll('.impg [data-screen="book"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length,
      title: document.querySelector('.impg [data-screen="book"] h1')?.textContent ?? "",
      fields: document.querySelectorAll('.impg [data-screen="book"] input, .impg [data-screen="book"] textarea').length,
      screen: document.querySelector('[data-impg="flow"]')?.getAttribute("data-flow-screen"),
    }));
    record("F2", "1440x900", "book", { ...r, tiles: await tilesShown(page), calls: await labCalls(page) });
    expect(r.book, "the book step is on screen").toBe(1);
    expect(r.title).toBe("The book you're querying.");
    expect(r.fields, "with its fields").toBeGreaterThanOrEqual(2);
    expect(await tilesShown(page)).toBe(0);
    expect(await labCalls(page), "nothing is written by reaching it").toEqual([]);
    // Continue without a title is refused, as in set-up; Back returns to the tiles
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await expect(page.getByText("Give it a title")).toBeVisible();
    await page.getByRole("button", { name: /Back/ }).first().click();
    expect(await tilesShown(page)).toBe(3);
    expect(await labCalls(page)).toEqual([]);
  });
});

/* ════ F3 · leaving part-way asks, with the drawer's words ══════════════════════════════════════ */
test.describe("F3", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("F3 Cancel asks on the summary and on each review step; Discard returns to the tiles", async ({ page }) => {
    await lab(page, "s=import-page&fx=dupes", { wait: '.impg [data-im="summary"]' });
    if (MUTATE === "F3") {
      /* the named break: discard without asking */
      await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest('[data-im="cancel"]')) setTimeout(() => (document.querySelector('[data-im="ask-skip"]') as HTMLElement | null)?.click(), 0); }, true));
    }
    const ask = async (where: string) => {
      await page.locator('.impg [data-im="cancel"]:visible').first().click();
      await page.waitForTimeout(150);
      const d = await page.evaluate(() => { const a = document.querySelector('.impg [data-im="ask"]'); return a ? { title: a.querySelector("h2")?.textContent, text: a.querySelector("p")?.textContent, buttons: [...a.querySelectorAll("button")].map((b) => b.textContent) } : null; });
      expect(d, `${where}: the confirm is shown`).toBeTruthy();
      expect(d).toEqual({ title: "Discard this?", text: "Nothing has been saved yet.", buttons: ["Keep going", "Discard"] });
      return d;
    };
    const seen: string[] = [];
    await ask("summary"); seen.push("summary");
    await page.locator('[data-im="ask-keep"]').click();
    await expect(page.locator('.impg [data-im="ask"]')).toHaveCount(0);
    await expect(page.locator('.impg [data-im="summary"]')).toBeVisible();
    for (const step of ["duplicates", "agents", "queries"]) {
      /* v9: a step's primary is disabled until everything on it has an answer */
      await settleStep(page, { scope: ".impg" });
      await page.locator('.impg [data-im="primary"]').click();
      await page.locator(`.impg [data-im="review"][data-step="${step}"]`).waitFor({ timeout: 10_000 });
      await ask(step); seen.push(step);
      if (step !== "queries") await page.locator('[data-im="ask-keep"]').click();
    }
    await page.locator('[data-im="ask-skip"]').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.impg [data-impg="tile"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length === 3, null, { timeout: 10_000 });
    const calls = await labCalls(page);
    record("F3", "1440x900", "cancel", { seen, calls, tiles: await tilesShown(page) });
    expect(seen).toEqual(["summary", "duplicates", "agents", "queries"]);
    expect(calls.filter((c) => /commit|ensureManuscript|navigate/.test(c)), "no write and no navigation").toEqual([]);
  });
});

/* ════ F4 · an in-app import ends on the dashboard, with the skipped-rows notice saved ═══════════ */
test.describe("F4", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  for (const c of [{ skip: 1, rows: 1 }, { skip: 0, rows: 0 }]) {
    test(`F4 an import that skips ${c.skip} row${c.skip === 1 ? "" : "s"}`, async ({ page }) => {
      if (MUTATE === "F4") {
        /* the named break: the notice is not saved in the app */
        await page.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (k: string, v: string) { if (k.startsWith("sa.importSkipped.")) return; return set.call(this, k, v); }; });
      }
      await lab(page, `s=import-page&fx=clear&skip=${c.skip}&floor=100`, { wait: '.impg [data-im="summary"]', reduced: false });
      await page.evaluate(() => localStorage.removeItem("sa.importSkipped.onb-lab"));
      for (let i = 0; i < 3; i++) { await page.locator('.impg [data-im="primary"]').click(); await page.waitForTimeout(200); }
      await page.waitForFunction(() => (window.__onbLab?.calls ?? []).some((x: { name: string }) => x.name === "navigate"), null, { timeout: 30_000 });
      const calls = await labCalls(page);
      const notice = await page.evaluate(() => { const raw = localStorage.getItem("sa.importSkipped.onb-lab"); return raw ? JSON.parse(raw) : null; });
      record("F4", "1440x900", `skip-${c.skip}`, { calls, notice });
      expect(calls.filter((x) => x.startsWith("navigate")), "it ends on the dashboard").toEqual(["navigate:dashboard"]);
      expect(calls).toContain("ensureManuscript");
      expect(calls).toContain("commit");
      expect(notice ? notice.rows.length : 0, "the notice's rows").toBe(c.rows);
      if (c.rows > 0) expect(notice.count).toBe(c.rows);
    });
  }
});

/* ════ M2 · M3 · the column matcher: no developer words, and its shape ══════════════════════════
   On the real route, signed in, for each of the four kinds, with a file that produces each kind of
   run line. Every row the run adds is removed in the same run. */
const DEVELOPER_WORDS = /database|repositor|catalog|stream|inject|synchron|migration|console|registr|Zite|Mock|Demo/i;
const stamp = Date.now().toString(36).slice(-5);
const MATCHER_FILES: Array<{ kind: Kind; slug: string; csv: string }> = [
  { kind: "Agents", slug: "agents", csv: `Name,Agency,Email\nM2 Probe ${stamp},Probe House,probe@example.com\nM2 Solo ${stamp},,\nM2 Probe ${stamp},Probe House,\n,No Name Agency,` },
  { kind: "Manuscripts", slug: "manuscripts", csv: `Title,Genre,Word Count\nM2 Book ${stamp},Thriller,90000\nM2 Book ${stamp},Thriller,90000\n,Thriller,1000` },
  { kind: "Queries", slug: "queries", csv: `Manuscript Title,Agent Name,State,Date Sent\nM2 Book ${stamp},M2 Probe ${stamp},Queried,2026-08-01\nM2 Missing ${stamp},M2 Nobody ${stamp},Queried,2026-08-02\n,M2 Probe ${stamp},Queried,2026-08-03` },
  { kind: "Query history", slug: "history", csv: `Related Query,Related Title,Event Type,Description,Date,Extras\nM2 Probe ${stamp},M2 Book ${stamp},Status Changed,M2 asked for the partial,2026-08-10,\nM2 Nobody ${stamp},M2 Missing ${stamp},Status Changed,M2 orphan event,2026-08-11,` },
];

test.describe("M2 M3", () => {
  test.describe.configure({ mode: "serial" });
  test.use({ viewport: { width: 1440, height: 1000 } });
  test.setTimeout(420_000);
  test("M2 no developer words on any step, for any kind; M3 the matcher's shape", async ({ page }) => {
    const { db, uid } = await devDb();
    const before = await matcherSnapshot(db, uid);
    const texts: Record<string, string> = {};
    const lines = new Set<string>();
    const shape: Record<string, unknown> = {};
    const grab = async (key: string) => { texts[key] = await page.evaluate(() => (document.querySelector(".impm") as HTMLElement).innerText + " " + [...document.querySelectorAll(".impm option, .impm [placeholder]")].map((e) => (e.textContent ?? "") + " " + (e.getAttribute("placeholder") ?? "")).join(" ")); };
    const shoot = async (name: string) => { if (SHOTS) { mkdirSync(resolve(OUT, "shots"), { recursive: true }); await page.screenshot({ path: resolve(OUT, "shots", `${name}.png`), fullPage: true }); } };
    try {
      for (const f of MATCHER_FILES) {
        await openMatcher(page, f.kind);
        await grab(`${f.slug}-1`); await shoot(`matcher-${f.slug}-1-1440`);
        if (f.slug === "agents") {
          shape.step1 = await page.evaluate(() => {
            const root = document.querySelector(".impm")!;
            const group = root.querySelector('[role="radiogroup"]');
            return {
              radios: group ? group.querySelectorAll('[role="radio"]').length : 0,
              checked: group ? group.querySelectorAll('[role="radio"][aria-checked="true"]').length : 0,
              tabs: [...root.querySelectorAll("button")].filter((b) => /grid viewer|live .* viewer|wizard/i.test(b.textContent ?? "")).length,
              demo: [...root.querySelectorAll("button")].filter((b) => /demo|sample/i.test(b.textContent ?? "")).length,
              back: root.querySelector('[data-impm="back"]')?.textContent ?? "",
              title: root.querySelector("h1")?.textContent ?? "",
              pageHeaders: document.querySelectorAll('.impg [data-probe="page-header"]:not([hidden])').length ? [...document.querySelectorAll('.impg [data-probe="page-header"]')].filter((e) => (e as HTMLElement).offsetParent !== null).length : 0,
            };
          });
        }
        await page.locator('.impm [data-impm="paste"]').fill(f.csv);
        await page.locator('.impm [data-impm="read"]').click();
        await page.locator('.impm [data-impm="import"]').waitFor({ state: "visible", timeout: 15_000 });
        await grab(`${f.slug}-2`); await shoot(`matcher-${f.slug}-2-1440`);
        await page.locator('.impm [data-impm="import"]').click();
        await page.waitForFunction(() => document.querySelector('.impm [data-impm="run-title"]')?.textContent === "Import finished.", null, { timeout: 90_000 });
        if (MUTATE === "M2") await page.evaluate(() => { const li = document.createElement("li"); li.textContent = 'Successfully added Agent: "X" (Y) to the repository'; document.querySelector('.impm [data-impm="log"]')?.appendChild(li); }); // the named break: one old log line restored
        await grab(`${f.slug}-3`); await shoot(`matcher-${f.slug}-3-1440`);
        const run = await readRun(page);
        for (const l of run.log) lines.add(l.replace(new RegExp(stamp, "g"), "·").replace(/\d+/g, "N"));
        if (f.slug === "agents") {
          if (MUTATE === "M3") await page.evaluate(() => { const b = document.createElement("button"); b.textContent = "B. Live Database Grid Viewer"; document.querySelector(".impm")?.prepend(b); }); // the named break: the grids tab restored
          shape.step3 = await page.evaluate(() => {
            const root = document.querySelector(".impm")!;
            const log = root.querySelector('[data-impm="log"]') as HTMLElement | null;
            const bad = [...root.querySelectorAll("button")].map((b) => getComputedStyle(b).backgroundColor).filter((bg) => ["rgb(162, 69, 42)", "rgb(124, 58, 42)", "rgb(41, 37, 36)", "rgb(59, 130, 246)", "rgb(37, 99, 235)"].includes(bg));
            return {
              logMax: log ? getComputedStyle(log).maxHeight : "", logOverflow: log ? getComputedStyle(log).overflowY : "", logHeight: log ? Math.round(log.getBoundingClientRect().height) : -1,
              badButtons: bad, tabs: [...root.querySelectorAll("button")].filter((b) => /grid viewer/i.test(b.textContent ?? "")).length,
              counts: [...root.querySelectorAll('[data-impm="counts"] dt')].map((d) => d.textContent),
            };
          });
        }
        if (SHOTS) { await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400); await shoot(`matcher-${f.slug}-3-390`); await page.setViewportSize({ width: 1440, height: 1000 }); }
      }
    } finally {
      const removed = await matcherCleanup(db, uid, before);
      const after = await matcherSnapshot(db, uid);
      record("M2", "1440x1000", "cleanup", { removed, before: Object.fromEntries(Object.entries(before).map(([k, v]) => [k, v.length])), after: Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v.length])) });
      expect(Object.fromEntries(Object.entries(after).map(([k, v]) => [k, v.length])), "every imported row was removed").toEqual(Object.fromEntries(Object.entries(before).map(([k, v]) => [k, v.length])));
    }
    const offenders = Object.entries(texts).flatMap(([k, t]) => { const m = t.match(new RegExp(DEVELOPER_WORDS.source, "gi")); return m ? [`${k}: ${[...new Set(m)].join(", ")}`] : []; });
    record("M2", "1440x1000", "words", { screens: Object.keys(texts).length, distinctLines: [...lines], offenders });
    record("M3", "1440x1000", "shape", shape);
    expect(Object.keys(texts).length, "three steps for each of four kinds").toBe(12);
    console.log(`M2 distinct run lines: ${lines.size}`);
    expect(lines.size, "the files produced a spread of run lines").toBeGreaterThan(5);
    expect(offenders, "no developer words anywhere").toEqual([]);
    // M3
    const s1 = shape.step1 as { radios: number; checked: number; tabs: number; demo: number; back: string; title: string; pageHeaders: number };
    const s3 = shape.step3 as { logMax: string; logOverflow: string; logHeight: number; badButtons: string[]; tabs: number; counts: string[] };
    expect(s1.radios, "the kinds are a radio group of four").toBe(4);
    expect(s1.checked).toBe(1);
    expect(s1.tabs + s3.tabs, "no grids tab").toBe(0);
    expect(s1.demo, "no demo button").toBe(0);
    expect(s1.back).toBe("‹ Back to import");
    expect(s1.title).toBe("Match your own columns.");
    expect(s1.pageHeaders, "the page's own header is gone from the matcher").toBe(0);
    expect(s3.badButtons, "no rust, burgundy or utility-colour button").toEqual([]);
    expect(s3.logMax).toBe("280px");
    expect(s3.logOverflow).toBe("auto");
    expect(s3.logHeight).toBeLessThanOrEqual(280);
    expect(s3.counts).toEqual(["Imported", "Not imported", "Need a decision"]);
  });

  test("M3 the matcher at 390: its first two steps, for each kind", async ({ page }) => {
    test.skip(!SHOTS, "shots only");
    for (const f of MATCHER_FILES) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await openMatcher(page, f.kind);
      await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
      await page.screenshot({ path: resolve(OUT, "shots", `matcher-${f.slug}-1-390.png`), fullPage: true });
      await page.locator('.impm [data-impm="paste"]').fill(f.csv);
      await page.locator('.impm [data-impm="read"]').click();
      await page.locator('.impm [data-impm="import"]').waitFor({ state: "visible" });
      await page.screenshot({ path: resolve(OUT, "shots", `matcher-${f.slug}-2-390.png`), fullPage: true });
    }
  });
});

test.describe("T1 matcher", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });
  test("T1 the matcher's rules read only tokens that resolve", async ({ page }) => {
    await openMatcher(page, "Queries");
    await page.locator('.impm [data-impm="paste"]').fill("Manuscript Title,Agent Name,State,Date Sent\nA,B,Queried,2026-08-01");
    await page.locator('.impm [data-impm="read"]').click();
    await page.locator('.impm [data-impm="import"]').waitFor({ state: "visible" });
    if (MUTATE === "T1") await page.addStyleTag({ content: ".sf.impm .impm-map tbody tr{border-top-color:var(--impm-nope)}" });
    const r = await page.evaluate(() => {
      const unresolved: string[] = []; let rules = 0; let reads = 0;
      const walk = (list: CSSRuleList) => {
        for (const rule of Array.from(list)) {
          if (rule instanceof CSSMediaRule) { if (matchMedia(rule.conditionText).matches) walk(rule.cssRules); continue; }
          if (!(rule instanceof CSSStyleRule) || !/\.impm/.test(rule.selectorText)) continue;
          rules += 1;
          const names = new Set<string>();
          for (const m of rule.style.cssText.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) if (!m[2]) names.add(m[1]);
          if (!names.size) continue;
          let el: Element | null = null;
          try { el = document.querySelector(rule.selectorText.replace(/::?[\w-]+(\([^)]*\))?/g, (p) => (/^::|^:(hover|focus|focus-visible|disabled)/.test(p) ? "" : p))); } catch { el = null; }
          if (!el) continue;
          for (const n of names) { reads += 1; if (!getComputedStyle(el).getPropertyValue(n).trim()) unresolved.push(`${rule.selectorText} reads ${n}`); }
        }
      };
      for (const sheet of Array.from(document.styleSheets)) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } }
      return { rules, reads, unresolved: [...new Set(unresolved)] };
    });
    record("T1", "1440x1000", "matcher", r);
    expect(r.rules, "the matcher's rules were found").toBeGreaterThan(30);
    expect(r.reads, "they read tokens").toBeGreaterThan(8);
    expect(r.unresolved).toEqual([]);
  });
});
