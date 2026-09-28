/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2.1 — LIGHT PROFILE (28 Sep). V1–V9 on the signed-in app against
 * design-refs/materials/packages-v2-1.html; the S-locks run once from pkgMat.measure.ts.
 *
 * ⚠️ IT WRITES, SO IT RESTORES: every case re-seeds `pkg21-` (seedPackagesV21Fixture.mjs, delete-
 * before-write) and the file's afterAll removes it. Nothing here touches the query-actions fixtures.
 * Every claim is a ledger row; a case asserts rows first, then its population floor.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { COLLAPSE_KEY, Ledger } from "./shellV3Lib";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default", timeout: Number(process.env.PM_TIMEOUT ?? 900_000) });
test.use({ actionTimeout: 10_000 });

const ROUTE = "/manuscripts/packages";
const F = "pkg21-ms-filled", R = "pkg21-ms-retired", P = "pkg21-ms-putaway";
const KEY = "scriptally_active_manuscript_id";
const SEEDER = "tests/e2e/seedPackagesV21Fixture.mjs";
const V1440 = { width: 1440, height: 900 };
const V1280 = { width: 1280, height: 800 };

class L21 extends Ledger {
  write() {
    mkdirSync("reports/packages-v2-1", { recursive: true });
    writeFileSync(`reports/packages-v2-1/ledger-${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 60)) console.log(`  ✗ ${r.lock} · ${r.size} · ${r.state} — ${r.detail}`);
  }
}
const seed = () => execFileSync("node", [SEEDER], { stdio: "inherit" });
const last = (args: string[]) => execFileSync("node", [SEEDER, ...args], { encoding: "utf8" }).trim().split("\n").pop() ?? "";
type Dump = { activePackageId: string | null; bookVersions: { id: string; name: string; note: string | null }[]; materials: { id: string; name: string; status: string }[]; packages: { id: string; name: string; status: string }[] };
const dump = (ms = F) => JSON.parse(last(["--dump", ms])) as Dump;

test.afterAll(() => execFileSync("node", [SEEDER, "--restore"], { stdio: "inherit" }));

function close(L: L21, floor: number) {
  L.write();
  expect(L.failures().map((f) => `${f.lock} · ${f.state} — ${f.detail}`)).toEqual([]);
  expect(L.rows.length, `${L.name}: population floor`).toBeGreaterThanOrEqual(floor);
}
const n = (a: number | null | undefined, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

async function open(page: Page, ms: string, vp = V1440) {
  await page.addInitScript(([k, v, ck]) => { try { localStorage.setItem(k, v); localStorage.setItem(ck, "0"); } catch { /* */ } }, [KEY, ms, COLLAPSE_KEY]);
  await openRoute(page, ROUTE, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
}
async function fresh(page: Page, ms = F, vp = V1440) { seed(); await open(page, ms, vp); }
const on = (page: Page, sel: string) => page.locator(`[data-ppv="page"]:visible ${sel}`);
const chip = (page: Page, id: string) => on(page, `[data-ppv="rail"] [data-mat="${id}"]`);
const more = (page: Page, id: string) => on(page, `[data-ppv="rail"] [data-more="${id}"]`);
const card = (page: Page, name: string) => on(page, `[data-ppv="pkg"][data-name="${name}"]`);
const focusedAttr = (page: Page, attr: string) => page.evaluate((a) => (document.activeElement as HTMLElement | null)?.getAttribute(a) ?? null, attr);
const txt = (page: Page, sel: string) => page.evaluate((s) => {
  const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0);
  return root?.querySelector(s)?.textContent?.replace(/\s+/g, " ").trim() ?? null;
}, sel);

/* ══ V1 · header art ══ */
test("V1 · the header art is the boxes image and clears the title (1440, 1920)", async ({ page }) => {
  const L = new L21("pkg21-V1");
  seed();
  for (const vp of [V1440, { width: 1920, height: 1080 }]) {
    await open(page, F, vp);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const hd = root?.querySelector('[data-probe="page-header"]');
      const img = hd?.querySelector('[data-probe="art"] img') as HTMLImageElement | null;
      const title = hd?.querySelector('[data-probe="title"]') as HTMLElement | null;
      let drawnL = NaN;
      if (img) { const q = img.getBoundingClientRect(); const ar = (img.naturalWidth || 1) / (img.naturalHeight || 1); let w = q.width, h = q.width / ar; if (h > q.height) { h = q.height; w = q.height * ar; } drawnL = q.right - w; }
      const titleR = title ? Math.max(...[...(() => { const rg = document.createRange(); rg.selectNodeContents(title); return rg.getClientRects(); })()].map((x) => x.right)) : NaN;
      return { src: img?.getAttribute("src") ?? null, alt: img?.getAttribute("alt") ?? null, drawnL, titleR, h: img?.getBoundingClientRect().height ?? NaN };
    });
    const ctx = { route: ROUTE, size: `${vp.width}`, state: "filled" };
    L.check("V1 · the art is packages-hero-boxes.png", ctx, /packages-hero-boxes\.png/.test(r.src ?? ""), `${r.src}`);
    L.check("V1 · S6: the drawn art clears the title's last letter by 24", ctx, r.drawnL >= r.titleR + 24, `drawn ${r.drawnL} title ${r.titleR}`);
  }
  close(L, 4);
});

/* ══ V2 · slim tray ══ */
test("V2 · the Materials tray is the title and the pile, 80 tall (1440, 1280)", async ({ page }) => {
  const L = new L21("pkg21-V2");
  seed();
  for (const vp of [V1440, V1280]) {
    await open(page, F, vp);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const rail = root?.querySelector('[data-ppv="rail"]');
      const tray = rail?.querySelector(".sa-prail-tray") as HTMLElement | null;
      const pile = rail?.querySelector('[data-ppv="pile"]') as HTMLImageElement | null;
      const t = tray?.getBoundingClientRect(); const p = pile?.getBoundingClientRect();
      return {
        text: tray?.textContent?.replace(/\s+/g, " ").trim() ?? null, h: t?.height ?? NaN,
        pileIn: !!(pile && tray?.contains(pile)), clip: tray ? getComputedStyle(tray).overflow : null,
        pileOverflows: !!(p && t && p.bottom > t.bottom + 1), pileSrc: pile?.getAttribute("src") ?? null,
        hawk: !!rail?.querySelector('img[src*="be-hawk-head"]'),
      };
    });
    const ctx = { route: ROUTE, size: `${vp.width}`, state: "filled" };
    L.check("V2 · the tray's text is exactly \"Materials\"", ctx, r.text === "Materials", `${r.text}`);
    L.check("V2 · the tray is 80 tall (±1)", ctx, n(r.h, 80, 1), `${r.h}`);
    L.check("V2 · the pile art is inside the tray and clipped by it", ctx, r.pileIn && r.clip === "hidden" && r.pileOverflows && /materials-tray-pile/.test(r.pileSrc ?? ""), JSON.stringify(r));
    L.check("V2 · no BE_HAWK_HEAD in this rail", ctx, !r.hawk, "");
  }
  close(L, 8);
});

/* ══ V3 · bands (M) ══ */
test("V3 · the three headings are anthracite bands; Your packages lines up with the tray", async ({ page }) => {
  const L = new L21("pkg21-V3");
  seed();
  for (const vp of [V1440, V1280]) {
    await open(page, F, vp);
    const r = await page.evaluate(() => {
      const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
      const band = (k: string) => root?.querySelector(`[data-ppv="band"][data-band="${k}"]`) as HTMLElement | null;
      const look = (k: string) => { const b = band(k); return b ? { bg: getComputedStyle(b).backgroundColor, h: b.getBoundingClientRect().height, tag: b.tagName } : null; };
      const tray = root?.querySelector('[data-ppv="rail"] .sa-prail-tray') as HTMLElement | null;
      return { pk: look("packages"), sbs: look("sbs"), ret: look("retired"), pkTop: band("packages")?.getBoundingClientRect().top ?? NaN, trayTop: tray?.getBoundingClientRect().top ?? NaN,
        hint: band("packages")?.querySelector('[data-ppv="band-hint"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null };
    });
    const ctx = { route: ROUTE, size: `${vp.width}`, state: "filled" };
    for (const k of ["pk", "sbs", "ret"] as const) {
      const b = r[k];
      L.check(`V3 · ${k} is a band: rgb(42, 58, 82), 52 tall`, ctx, !!b && b.bg === "rgb(42, 58, 82)" && n(b.h, 52, 1), JSON.stringify(b));
    }
    L.check("V3 · Your packages' top = the tray's top (±1)", ctx, n(r.pkTop, r.trayTop, 1), `${r.pkTop} ${r.trayTop}`);
    L.check("V3 · the hint names the package used for new queries", ctx, r.hint === "Autumn round is used for new queries", `${r.hint}`);
  }
  const ctx = { route: ROUTE, size: "1440", state: "filled" };
  await open(page, F, V1440);
  const ret = on(page, '[data-ppv="band"][data-band="retired"]');
  L.check("V3 · Retired is a collapsed button", ctx, (await ret.getAttribute("aria-expanded")) === "false" && (await on(page, '[data-ppv="retired"]').count()) === 0, "");
  await ret.click();
  L.check("V3 · toggling sets aria-expanded and shows the list; focus stays on the band", ctx,
    (await ret.getAttribute("aria-expanded")) === "true" && (await on(page, '[data-ppv="retired"] [data-ppv="pkg"]').count()) === 1 && (await focusedAttr(page, "data-band")) === "retired",
    `${await ret.getAttribute("aria-expanded")} ${await focusedAttr(page, "data-band")}`);
  L.check("V3 · the band's hint reads Hide when open", ctx, (await txt(page, '[data-band="retired"] [data-ppv="band-hint"]')) === "Hide", `${await txt(page, '[data-band="retired"] [data-ppv="band-hint"]')}`);
  /* "none": retire the used-for-new-queries package, then read the hint */
  await card(page, "Autumn round").locator('[data-act="retire"]').click();
  await expect.poll(() => txt(page, '[data-band="packages"] [data-ppv="band-hint"]'), { timeout: 12_000 }).toBe("No package is used for new queries").catch(() => {});
  L.check("V3 · with none in use the hint says so", ctx, (await txt(page, '[data-band="packages"] [data-ppv="band-hint"]')) === "No package is used for new queries", `${await txt(page, '[data-band="packages"] [data-ppv="band-hint"]')}`);
  close(L, 15);
});

/* ══ V4 · nothing in use (M) ══ */
test("V4 · every package retired: the card, the open composer, the example and the open Retired list", async ({ page }) => {
  const L = new L21("pkg21-V4");
  const ctx = { route: ROUTE, size: "1440", state: "retired" };
  await fresh(page, R);
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const ex = root?.querySelector('[data-ppv="example"]');
    const band = root?.querySelector('[data-ppv="band"][data-band="retired"]');
    return {
      card: root?.querySelector('[data-ppv="none-live"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      composer: !!root?.querySelector('[data-ppv="composer"]'), newBtn: !!root?.querySelector('[data-ppv="none-new"]'),
      heads: root?.querySelectorAll('[data-probe="page-header"] .ph-primary, [data-probe="page-header"] .ph-secondary').length ?? -1,
      ex: !!ex && ex.getAttribute("aria-hidden") === "true" && ex.hasAttribute("inert"),
      bandIsButton: band?.tagName === "BUTTON", listed: root?.querySelectorAll('[data-ppv="retired"] [data-ppv="pkg"]').length ?? 0,
      sbs: !!root?.querySelector('[data-ppv="sbs"]'),
    };
  });
  L.check("V4 · the Nothing-in-use card states both packages are retired", ctx, !!r.card && r.card.includes("Nothing in use right now") && r.card.includes("All 2 of your packages are retired"), `${r.card}`);
  L.check("V4 · the composer is open and the card's button is hidden", ctx, r.composer && !r.newBtn, JSON.stringify(r));
  L.check("V4 · the header has no buttons", ctx, r.heads === 0, `${r.heads}`);
  L.check("V4 · the example is inert and aria-hidden", ctx, r.ex, "");
  L.check("V4 · Retired is a plain band and its list is open", ctx, !r.bandIsButton && r.listed === 2, JSON.stringify(r));
  L.check("V4 · no Side by side", ctx, !r.sbs, "");
  await on(page, '[data-ppv="cancel"]').click();
  await page.waitForTimeout(300);
  L.check("V4 · Cancel keeps the composer closed and brings back the card's button", ctx,
    (await on(page, '[data-ppv="composer"]').count()) === 0 && (await on(page, '[data-ppv="none-new"]').count()) === 1, "");
  await on(page, '[data-ppv="none-new"]').click();
  await page.waitForTimeout(300);
  await card(page, "First round").locator('[data-act="restore"]').click();
  await expect.poll(async () => on(page, '[data-ppv="list"] [data-ppv="pkg"][data-name="First round"]').count(), { timeout: 12_000 }).toBe(1).catch(() => {});
  L.check("V4 · Restore returns the filled state and closes the untouched composer", ctx,
    (await on(page, '[data-ppv="list"] [data-ppv="pkg"][data-name="First round"]').count()) === 1 && (await on(page, '[data-ppv="none-live"]').count()) === 0 && (await on(page, '[data-ppv="composer"]').count()) === 0, "");
  close(L, 8);
});

/* ══ V5 · the material ⋯ menu (M) ══ */
test("V5 · every chip has a sibling ⋯; three items for letters, two for versions; Esc and outside close", async ({ page }) => {
  const L = new L21("pkg21-V5");
  const ctx = { route: ROUTE, size: "1440", state: "filled" };
  await fresh(page, F);
  const s = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const chips = [...root.querySelectorAll('[data-ppv="rail"] [data-mat]')];
    return { chips: chips.length, sib: chips.filter((c) => { const m = c.parentElement?.querySelector(`[data-more="${c.getAttribute("data-mat")}"]`); return !!m && !c.contains(m); }).length };
  });
  L.check("V5 · every chip has a sibling ⋯ (never nested)", ctx, s.chips === 8 && s.sib === s.chips, JSON.stringify(s));
  const items = async (id: string) => { await more(page, id).click(); await page.waitForTimeout(150); const r = await on(page, '[data-ppv="mmenu"] [role="menuitem"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-mact"))); return r; };
  const li = await items("pkg21-l2");
  L.check("V5 · a letter offers Open, Rename, Put away", ctx, JSON.stringify(li) === JSON.stringify(["open", "rename", "away"]), JSON.stringify(li));
  L.check("V5 · opening focuses the first item; ⋯ is expanded", ctx, (await focusedAttr(page, "data-mact")) === "open" && (await more(page, "pkg21-l2").getAttribute("aria-expanded")) === "true", `${await focusedAttr(page, "data-mact")}`);
  await page.keyboard.press("Escape");
  L.check("V5 · Esc closes it and focus returns to ⋯", ctx, (await on(page, '[data-ppv="mmenu"]').count()) === 0 && (await focusedAttr(page, "data-more")) === "pkg21-l2", `${await focusedAttr(page, "data-more")}`);
  const vi = await items("pkg21-v2");
  L.check("V5 · a version offers Open and Rename only", ctx, JSON.stringify(vi) === JSON.stringify(["open", "rename"]), JSON.stringify(vi));
  await more(page, "pkg21-s1").click();
  L.check("V5 · opening another chip's menu closes the first", ctx, (await on(page, '[data-ppv="mmenu"]').count()) === 1 && (await more(page, "pkg21-v2").getAttribute("aria-expanded")) === "false", "");
  await page.mouse.click(700, 120);
  await page.waitForTimeout(150);
  L.check("V5 · a click outside closes it and focus returns to ⋯", ctx, (await on(page, '[data-ppv="mmenu"]').count()) === 0 && (await focusedAttr(page, "data-more")) === "pkg21-s1", `${await focusedAttr(page, "data-more")}`);
  L.check("V5 · the ⋯ never opens the composer", ctx, (await on(page, '[data-ppv="composer"]').count()) === 0, "");
  await chip(page, "pkg21-l2").click();
  await more(page, "pkg21-s1").click(); await page.keyboard.press("Escape");
  await more(page, "pkg21-l2").click(); await page.keyboard.press("Escape");
  const wells = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    return ["letter", "synopsis", "version"].map((k) => root.querySelector(`[data-well="${k}"] [data-ppv="filled"]`)?.getAttribute("data-mat") ?? "");
  });
  L.check("V5 · with the composer open, the ⋯ never fills or empties a slot", ctx, JSON.stringify(wells) === JSON.stringify(["pkg21-l2", "", ""]), JSON.stringify(wells));
  close(L, 10);
});

/* ══ V6 · the material drawer ══ */
test("V6 · Open shows kind, name, text or note and Used in; Esc, scrim and Close each close it", async ({ page }) => {
  const L = new L21("pkg21-V6");
  const ctx = { route: ROUTE, size: "1440", state: "filled" };
  await fresh(page, F);
  const dr = () => page.locator('[data-ppv="mdrawer"]');
  const read = () => page.evaluate(() => {
    const d = document.querySelector('[data-ppv="mdrawer"]') as HTMLElement | null;
    if (!d) return null;
    return {
      vis: getComputedStyle(d).visibility, role: d.getAttribute("role"), modal: d.getAttribute("aria-modal"),
      kind: d.querySelector('[data-ppv="d-kind"]')?.textContent?.trim() ?? null, title: d.querySelector("#ppv-d-title")?.textContent?.trim() ?? null,
      text: (d.querySelector('[data-ppv="d-text"]') as HTMLElement | null)?.innerText ?? null, label: d.querySelector('[data-ppv="d-label"]')?.textContent?.trim() ?? null,
      uses: [...d.querySelectorAll('[data-ppv="d-uses"] li')].map((li) => li.textContent?.replace(/\s+/g, " ").trim()),
    };
  });
  const openOn = async (id: string) => { await more(page, id).click(); await on(page, '[data-ppv="mmenu"] [data-mact="open"]').click(); await page.waitForTimeout(350); };
  let r = await read();
  L.check("V6 · closed: hidden, so it cannot be tabbed into", ctx, !!r && r.vis === "hidden", JSON.stringify(r));
  await openOn("pkg21-l3");
  r = await read();
  L.check("V6 · a letter: kind, name and its saved text with line breaks", ctx, !!r && r.vis === "visible" && r.role === "dialog" && r.modal === "true" && /QUERY LETTER/i.test(r.kind ?? "") && r.title === "Query letter v3" && (r.text ?? "").includes("MURPHY'S DAY OUT") && (r.text ?? "").includes("\n"), JSON.stringify(r));
  L.check("V6 · Used in lists the packages that hold it", ctx, JSON.stringify(r?.uses) === JSON.stringify(["Autumn round", "Winter draft"]), JSON.stringify(r?.uses));
  await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  L.check("V6 · Esc closes it; focus returns to ⋯", ctx, (await read())?.vis === "hidden" && (await focusedAttr(page, "data-more")) === "pkg21-l3", `${await focusedAttr(page, "data-more")}`);
  await openOn("pkg21-l1");
  r = await read();
  L.check("V6 · a retired package in Used in is tagged Retired", ctx, JSON.stringify(r?.uses) === JSON.stringify(["Spring round Retired"]), JSON.stringify(r?.uses));
  await page.mouse.click(40, 450); await page.waitForTimeout(300);
  L.check("V6 · the scrim closes it; focus returns to ⋯", ctx, (await read())?.vis === "hidden" && (await focusedAttr(page, "data-more")) === "pkg21-l1", `${await focusedAttr(page, "data-more")}`);
  await openOn("pkg21-v2");
  r = await read();
  L.check("V6 · a version: What changed and its note", ctx, !!r && /^VERSION$/i.test(r.kind ?? "") && r.label === "What changed" && (r.text ?? "") === "Cut the prologue; opens on the ferry.", JSON.stringify(r));
  await dr().locator('[data-ppv="d-close"]').click(); await page.waitForTimeout(300);
  L.check("V6 · Close closes it; focus returns to ⋯", ctx, (await read())?.vis === "hidden" && (await focusedAttr(page, "data-more")) === "pkg21-v2", `${await focusedAttr(page, "data-more")}`);
  await openOn("pkg21-v1");
  r = await read();
  L.check("V6 · no note: \"Nothing written about this version.\"", ctx, r?.text === "Nothing written about this version.", JSON.stringify(r));
  close(L, 9);
});

/* ══ V7 · rename ══ */
test("V7 · Rename stores through the right write, updates card slots, refuses an empty name", async ({ page }) => {
  const L = new L21("pkg21-V7");
  const ctx = { route: ROUTE, size: "1440", state: "filled" };
  await fresh(page, F);
  const rename = async (id: string, name: string) => {
    await more(page, id).click(); await on(page, '[data-ppv="mmenu"] [data-mact="rename"]').click();
    await page.locator("#ppv-r-name").fill(name); await page.keyboard.press("Enter");
  };
  await more(page, "pkg21-l2").click(); await on(page, '[data-ppv="mmenu"] [data-mact="rename"]').click();
  L.check("V7 · the field is prefilled", ctx, (await page.locator("#ppv-r-name").inputValue()) === "Query letter v2", await page.locator("#ppv-r-name").inputValue());
  await page.locator("#ppv-r-name").fill("   "); await page.keyboard.press("Enter");
  L.check("V7 · an empty name is refused inline", ctx, (await page.locator('[data-ppv="r-err"]').textContent())?.trim() === "Add a name to save it.", "");
  await page.keyboard.press("Escape");
  await rename("pkg21-l2", "Query letter v2 (MSWL)");
  await expect.poll(() => dump().materials.find((m) => m.id === "pkg21-l2")?.name, { timeout: 12_000 }).toBe("Query letter v2 (MSWL)").catch(() => {});
  L.check("V7 · a letter's rename is stored (updateVersion)", ctx, dump().materials.find((m) => m.id === "pkg21-l2")?.name === "Query letter v2 (MSWL)", "");
  L.check("V7 · the SENT package's slot shows the new name", ctx, ((await card(page, "Agents with MSWL").locator(".ppv-slots").textContent()) ?? "").includes("Query letter v2 (MSWL)"), "");
  await rename("pkg21-v3", "Fast opening");
  await expect.poll(() => dump().bookVersions.find((b) => b.id === "pkg21-v3")?.name, { timeout: 12_000 }).toBe("Fast opening").catch(() => {});
  L.check("V7 · a version's rename is stored on the manuscript", ctx, dump().bookVersions.find((b) => b.id === "pkg21-v3")?.name === "Fast opening", "");
  L.check("V7 · cards show the renamed version", ctx, ((await card(page, "Autumn round").locator(".ppv-slots").textContent()) ?? "").includes("Fast opening"), "");
  L.check("V7 · Side by side's sub-line shows the new names", ctx, ((await on(page, '[data-ppv="sbs"]').textContent()) ?? "").includes("Query letter v2 (MSWL)"), "");
  close(L, 7);
});

/* ══ V8 · put away ══ */
test("V8 · Put away empties the slot, leaves the section, keeps cards' names; Undo and Restore bring it back", async ({ page }) => {
  const L = new L21("pkg21-V8");
  const ctx = { route: ROUTE, size: "1440", state: "filled" };
  await fresh(page, F);
  await chip(page, "pkg21-s3").click();
  await more(page, "pkg21-s3").click(); await on(page, '[data-ppv="mmenu"] [data-mact="away"]').click();
  await expect.poll(() => dump().materials.find((m) => m.id === "pkg21-s3")?.status, { timeout: 12_000 }).toBe("Retired").catch(() => {});
  L.check("V8 · stored as put away", ctx, dump().materials.find((m) => m.id === "pkg21-s3")?.status === "Retired", "");
  L.check("V8 · the chip leaves its section; the composer slot empties", ctx, (await chip(page, "pkg21-s3").count()) === 0 && (await on(page, '[data-well="synopsis"] [data-ppv="filled"]').count()) === 0, "");
  L.check("V8 · the Put away section lists it", ctx, (await on(page, '[data-ppv="putaway"] [data-away="pkg21-s3"]').count()) === 1, "");
  L.check("V8 · cards that use it still show its name", ctx, ((await card(page, "Winter draft").locator(".ppv-slots").textContent()) ?? "").includes("Synopsis, 3 pages"), "");
  await page.locator(".sa-toast-undo").first().click();
  await expect.poll(() => chip(page, "pkg21-s3").count(), { timeout: 12_000 }).toBe(1).catch(() => {});
  L.check("V8 · Undo brings the chip back", ctx, (await chip(page, "pkg21-s3").count()) === 1 && dump().materials.find((m) => m.id === "pkg21-s3")?.status === "Active", "");
  const pctx = { ...ctx, state: "putaway" };
  await open(page, P);
  L.check("V8 · the put-away fixture shows the section with its letter", pctx, (await on(page, '[data-ppv="putaway"] [data-away="pkg21-plb"]').count()) === 1 && (await chip(page, "pkg21-plb").count()) === 0, "");
  L.check("V8 · the card using it still shows its name", pctx, ((await card(page, "Early round").locator(".ppv-slots").textContent()) ?? "").includes("Query letter v1 (old)"), "");
  await on(page, '[data-away="pkg21-plb"] [data-ppv="restore-mat"]').click();
  await expect.poll(() => chip(page, "pkg21-plb").count(), { timeout: 12_000 }).toBe(1).catch(() => {});
  L.check("V8 · Restore brings the chip back", pctx, (await chip(page, "pkg21-plb").count()) === 1 && dump(P).materials.find((m) => m.id === "pkg21-plb")?.status === "Active", "");
  close(L, 8);
});

/* ══ V9 · Log a query with this (M) ══ */
test("V9 · the first action on live cards opens the query drawer with the package passed in", async ({ page }) => {
  const L = new L21("pkg21-V9");
  const ctx = { route: ROUTE, size: "1440", state: "filled" };
  await fresh(page, F);
  await on(page, '[data-ppv="band"][data-band="retired"]').click();
  const firsts = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    return [...root.querySelectorAll('[data-ppv="pkg"]')].map((c) => ({ name: c.getAttribute("data-name"), first: c.querySelector(".ppv-pacts [data-act]")?.getAttribute("data-act") ?? null, log: !!c.querySelector('[data-act="log"]') }));
  });
  const live = firsts.filter((c) => c.name !== "Spring round");
  L.check("V9 · it is the first action on every live card, sent or unsent", ctx, live.length === 3 && live.every((c) => c.first === "log"), JSON.stringify(firsts));
  L.check("V9 · retired cards do not get it", ctx, firsts.find((c) => c.name === "Spring round")?.log === false, JSON.stringify(firsts));
  /* Winter draft: live, unsent, NOT the used-for-new-queries package — so the drawer's own defaults
     cannot land on it by coincidence. The plain agent states no materials, so nothing matches. */
  await card(page, "Winter draft").locator('[data-act="log"]').click();
  const drawer = page.locator('[data-qad-drawer="log"]');
  await expect(drawer).toBeVisible({ timeout: 10_000 }).catch(() => {});
  L.check("V9 · the query drawer opens in log mode", ctx, (await drawer.count()) === 1 && (await drawer.isVisible()), "");
  if (await drawer.count()) {
    await page.locator("[data-qad-agent-input]").fill("Pkgtwentyone Plain");
    await page.locator('[data-qad-agent="pkg21-agent-plain"]').click();
    await page.locator('[data-qad-step="2"]').click().catch(() => {});
    await page.waitForTimeout(400);
  }
  const on2 = await page.locator(".qad-pkg.on").getAttribute("data-qad-pkg").catch(() => null);
  L.check("V9 · with a no-match agent, the passed package is the one selected", ctx, on2 === "pkg21-p4", `${on2}`);
  /* 1280: the actions wrap to their own row under the name, and nothing overflows */
  await open(page, F, V1280);
  const w = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    return [...root.querySelectorAll('[data-ppv="list"] [data-ppv="pkg"]')].map((c) => {
      const h = c.querySelector("h3")!.getBoundingClientRect(); const a = c.querySelector(".ppv-pacts")!.getBoundingClientRect();
      return { below: a.top >= h.bottom - 1, fits: (c as HTMLElement).scrollWidth <= (c as HTMLElement).clientWidth };
    });
  });
  L.check("V9 · at 1280 the actions sit on their own row and nothing overflows", { ...ctx, size: "1280" }, w.length === 3 && w.every((x) => x.below && x.fits), JSON.stringify(w));
  close(L, 5);
});
