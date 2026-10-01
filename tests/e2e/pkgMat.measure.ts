/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v2 — LIGHT PROFILE (Nick, 27 Sep). S1–S7 once, at 1440, sidebar expanded,
 * filled; P1–P9 at 1440 in both states; P2 and P8 again at 1280 (`PM_CW=1280`). Measured on the
 * signed-in app against design-refs/materials/packages-v2.html.
 *
 * ⚠️ IT WRITES, SO IT RESTORES: each page lock re-seeds (seedPackagesV2Fixture.mjs is
 * delete-before-write, and its restore also removes any package the page created on the fixture).
 * Every claim is a ledger row; a case asserts rows first, then its population floor.
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { COLLAPSE_KEY, Ledger, judge, probeShell } from "./shellV3Lib";
import { openApp, readBar, readTops } from "./pageHeaderV2Lib";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default", timeout: Number(process.env.PM_TIMEOUT ?? 900_000) });
test.use({ actionTimeout: 10_000 });

const ROUTE = "/manuscripts/packages";
const FILLED = "seed-ms-pkgv2";
const EMPTY = "seed-ms-pkgv2e";
const KEY = "scriptally_active_manuscript_id";
const SEEDER = "tests/e2e/seedPackagesV2Fixture.mjs";
const VP = Number(process.env.PM_CW ?? 1440) === 1280 ? { width: 1280, height: 800 } : { width: 1440, height: 900 };
const W = `${VP.width}`;

class PLedger extends Ledger {
  write() {
    mkdirSync("reports/packages-v2", { recursive: true });
    writeFileSync(`reports/packages-v2/ledger-${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 60)) console.log(`  ✗ ${r.lock} · ${r.route} · ${r.size} · ${r.state} — ${r.detail}`);
  }
}
const seed = () => execFileSync("node", [SEEDER], { stdio: "inherit" });
const restore = () => execFileSync("node", [SEEDER, "--restore"], { stdio: "inherit" });
const last = (args: string[]) => execFileSync("node", [SEEDER, ...args], { encoding: "utf8" }).trim().split("\n").pop() ?? "";
const dump = () => JSON.parse(last(["--dump"])) as { activePackageId: string | null; packages: { id: string; name: string; ql: string; syn: string; bv: string | null; status: string; sent: boolean; note: string | null }[] };

test.beforeAll(() => seed());
test.afterAll(() => restore());

function close(L: PLedger, floor: number) {
  L.write();
  expect(L.failures().map((f) => `${f.lock} · ${f.state} — ${f.detail}`)).toEqual([]);
  expect(L.rows.length, `${L.name}: population floor`).toBeGreaterThanOrEqual(floor);
}
const n = (a: number | null | undefined, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

async function openPkgs(page: Page, ms: string, vp = VP, search = "") {
  await page.addInitScript(([k, v, ck]) => { try { localStorage.setItem(k, v); localStorage.setItem(ck, "0"); } catch { /* */ } }, [KEY, ms, COLLAPSE_KEY]);
  await openRoute(page, ROUTE + search, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(400);
}
async function fresh(page: Page, ms = FILLED, search = "") { seed(); await openPkgs(page, ms, VP, search); }
const on = (page: Page, sel: string) => page.locator(`[data-ppv="page"]:visible ${sel}`);
const card = (page: Page, name: string) => on(page, `[data-ppv="pkg"][data-name="${name}"]`);
/* a RAIL chip — the composer's filled chip carries the same data-mat, so an unscoped locator is ambiguous */
const chip = (page: Page, id: string) => on(page, `[data-ppv="rail"] [data-mat="${id}"]`);
/**
 * ⚠️ A DRAG NEEDS BOTH ENDS ON SCREEN, AND `dragTo` CANNOT ARRANGE THAT HERE. The rail is taller than
 * the window at rest (by design: it is the height it has when stuck) and its body scrolls; `dragTo`
 * scrolls the SOURCE into view by scrolling every ancestor, which lifts the composer off the top,
 * and then drops on a target that is no longer there. So: page at the top, the rail's BODY scrolled
 * to the chip, both rects asserted inside the viewport (the precondition, stated), then a stepped
 * native drag. Measured: with the source on screen a real dragstart/dragover/drop fire.
 */
async function dragChip(page: Page, id: string, k: string): Promise<boolean> {
  const ok = await page.evaluate(([id, k]) => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const sc = root.closest(".wpg-scroll") as HTMLElement;
    const chip = root.querySelector(`[data-ppv="rail"] [data-mat="${id}"]`) as HTMLElement;
    const rail = root.querySelector('[data-ppv="rail"]') as HTMLElement;
    const body = chip.closest(".sa-prail-body") as HTMLElement;
    const w = root.querySelector(`[data-ppv="composer"] [data-well="${k}"]`) as HTMLElement;
    const on = (e: Element) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; };
    /* first at rest; then with the page scrolled just far enough for the rail to STICK, where the
       whole card fits the window and the composer's wells are still above the fold */
    sc.scrollTop = 0;
    for (const lift of [0, rail.getBoundingClientRect().top - sc.getBoundingClientRect().top - 16]) {
      sc.scrollTop = lift;
      body.scrollTop += chip.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
      if (on(chip) && on(w)) return true;
    }
    return false;
  }, [id, k]);
  if (!ok) return false;
  const a = (await chip(page, id).boundingBox())!; const b = (await well(page, k).boundingBox())!;
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(a.x + a.width / 2 + 8, a.y + a.height / 2 + 4, { steps: 3 });
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 12 }); await page.mouse.up();
  await page.waitForTimeout(150);
  return true;
}
const well = (page: Page, k: string) => on(page, `[data-ppv="composer"] [data-well="${k}"]`);
async function read(page: Page) {
  return page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    if (!root) return null;
    const wells = Object.fromEntries(["letter", "synopsis", "version"].map((k) => {
      const w = root.querySelector(`[data-ppv="composer"] [data-well="${k}"]`);
      return [k, w ? (w.querySelector('[data-ppv="filled"]')?.getAttribute("data-mat") ?? "") : null];
    }));
    return {
      composer: !!root.querySelector('[data-ppv="composer"]'),
      wells,
      create: (root.querySelector('[data-ppv="create"]') as HTMLButtonElement | null)?.disabled ?? null,
      why: root.querySelector('[data-ppv="why"]')?.textContent?.trim() ?? null,
      cards: [...root.querySelectorAll('[data-ppv="list"] [data-ppv="pkg"]')].map((c) => ({
        name: c.getAttribute("data-name"), active: !!c.querySelector('[data-tag="active"]'),
        acts: [...c.querySelectorAll("[data-act]")].map((b) => b.getAttribute("data-act")),
      })),
      sbs: !!root.querySelector('[data-ppv="sbs"]'),
      text: root.innerText,
      focused: (document.activeElement as HTMLElement | null)?.id || (document.activeElement as HTMLElement | null)?.getAttribute("data-ppv") || null,
    };
  });
}

/* ══ S1–S7 · once: 1440, sidebar expanded, filled ══ */
test("S1–S7 · the shell conformance, once (1440, expanded, filled)", async ({ page }) => {
  const L = new PLedger("pkg-S");
  const ctx = { route: ROUTE, size: "1440", state: "expanded filled" };
  seed();
  await openApp(page, "/queries", { width: 1440, height: 900 }); const qc = await readTops(page);
  await openPkgs(page, FILLED, { width: 1440, height: 900 });
  judge(L, await probeShell(page), { ...ctx, route: "Submission packages" }, false, false);
  const b = await readBar(page);
  /* retargeted by the quiet bar: the bar is the page ground, not the sidebar */
  L.check("S1 · the bar is the page ground, 64 tall", ctx, !!b && b.barBg === b.groundBg && n(b.barH, 64, 0.5), JSON.stringify(b && { bg: b.barBg, ground: b.groundBg, h: b.barH }));
  const r = await page.evaluate(() => {
    const vis = (s: string, root: ParentNode = document) => [...root.querySelectorAll(s)].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined;
    const pageEl = vis('[data-ppv="page"]'); const sc = pageEl?.closest(".wpg-scroll") as HTMLElement | null;
    const hd = pageEl ? vis('[data-probe="page-header"]', pageEl) : undefined;
    const bx = (e?: Element | null) => e ? e.getBoundingClientRect() : null;
    const main = pageEl ? vis('[data-ppv="main"]', pageEl) : undefined; const rail = pageEl ? vis('[data-ppv="rail"]', pageEl) : undefined;
    const first = main ? [...main.children].find((c) => c.getBoundingClientRect().height > 0) : null;
    const title = hd?.querySelector('[data-probe="title"]') as HTMLElement | null;
    const img = hd?.querySelector('[data-probe="art"] img') as HTMLImageElement | null;
    let drawnL = NaN;
    if (img) { const q = img.getBoundingClientRect(); const ar = (img.naturalWidth || 1) / (img.naturalHeight || 1); let w = q.width, h = q.width / ar; if (h > q.height) { h = q.height; w = q.height * ar; } drawnL = q.right - w; }
    const titleR = title ? Math.max(...[...(() => { const rg = document.createRange(); rg.selectNodeContents(title); return rg.getClientRects(); })()].map((x) => x.right)) : NaN;
    const cs = pageEl ? getComputedStyle(pageEl) : null;
    return {
      pname: document.querySelector('[data-probe="navrow"] [data-shell="pagename"]')?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      size: hd?.getAttribute("data-size") ?? null, rule: hd ? hd.getBoundingClientRect().bottom - 1 : NaN, hdL: bx(hd)?.left ?? NaN,
      titleFam: title ? getComputedStyle(title).fontFamily : null, titleLines: title ? new Set([...(() => { const rg = document.createRange(); rg.selectNodeContents(title); return rg.getClientRects(); })()].map((x) => Math.round(x.top))).size : 0,
      railT: bx(rail)?.top ?? NaN, railW: bx(rail)?.width ?? NaN, railL: bx(rail)?.left ?? NaN, mainR: bx(main)?.right ?? NaN, mainL: bx(main)?.left ?? NaN, firstT: bx(first)?.top ?? NaN,
      padL: cs ? parseFloat(cs.paddingLeft) : NaN, gutter: Math.min(52, Math.max(28, innerWidth * 0.032)), pageL: bx(pageEl)?.left ?? NaN,
      bg: cs ? cs.backgroundColor : null, drawnL, titleR, scTop: sc?.getBoundingClientRect().top ?? NaN, hasArt: !!img,
      railPos: rail ? getComputedStyle(rail).position : null,
    };
  });
  const tops = await readTops(page);
  L.check("S1 · the bar reads MATERIALS above Submission packages", ctx, /^materials\s*\/?\s*submission packages$/i.test(r.pname ?? ""), `${r.pname}`);
  L.check("S1 · the page root paints no surface", ctx, /rgba\(\d+, \d+, \d+, 0\)|transparent/.test(r.bg ?? ""), `${r.bg}`);
  L.check("S2 · full PageHeader, top = the Query Centre's (±1)", ctx, r.size === "full" && n(tops.header, qc.header, 1) && n(tops.title, qc.title, 1), `${r.size} ${tops.header}/${qc.header}`);
  L.check("S2 · the title is Special Elite, one line", ctx, /^"?Special Elite/.test(r.titleFam ?? "") && r.titleLines === 1, `${r.titleFam} ${r.titleLines}`);
  L.check("S3 · the panel and the first box start at the rule + 24; 340 wide; 28 gap", ctx, n(r.railT, r.rule + 24, 1) && n(r.firstT, r.rule + 24, 1) && n(r.railW, 340, 1) && n(r.railL - r.mainR, 28, 1), JSON.stringify({ railT: r.railT, firstT: r.firstT, rule: r.rule, w: r.railW, gap: r.railL - r.mainR }));
  L.check("S5 · one gutter: the root pays it, the header and column start on it", ctx, n(r.padL, r.gutter, 0.6) && n(r.hdL, r.pageL + r.gutter, 1) && n(r.mainL, r.hdL, 1), JSON.stringify({ pad: r.padL, g: r.gutter, hd: r.hdL, main: r.mainL }));
  L.check("S6 · the art is drawn and its drawn left clears the title's last letter by 24", ctx, r.hasArt && r.drawnL >= r.titleR + 24, `drawn ${r.drawnL} title ${r.titleR}`);
  const { did, max } = await page.evaluate(() => { const el = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0); const s = el?.closest(".wpg-scroll") as HTMLElement; s.scrollTop = 600; return { did: s.scrollTop, max: s.scrollHeight - s.clientHeight }; });
  await page.waitForTimeout(250);
  const stuck = await page.evaluate(() => { const r = [...document.querySelectorAll('[data-ppv="rail"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement; return r.getBoundingClientRect().top; });
  L.check("S4 · sticky at the window's top + 16 after scrolling (not fixed)", ctx, did === Math.min(600, max) && did > 0 && n(stuck, r.scTop + 16, 1) && r.railPos === "sticky", `did ${did}/${max} top ${stuck} sc ${r.scTop} ${r.railPos}`);
  /* ⚠️ RETIRED (quiet bar, 28 Sep): "no G4 file changed (illustratedMasthead.css is the one exception)".
     It diffed the WORKING TREE against 5d2a46e8, so it failed on every later shell change however
     legitimate — the claim belongs to the Packages pass, and git history records it. */
  let css = ""; try { css = readFileSync("src/components/packages/packagesV2.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, ""); } catch { /* absent on main */ }
  L.check("S7 · the page's sheet exists and names no shell/header/grid selector", ctx, css.length > 0 && !/(^|[\s,}>+~])\.(ws-[\w-]+|ph(?:-[\w-]+|--[\w-]+)?|wpg(?:-[\w-]+)?)(?=[\s,{.:>[])/m.test(css), `${css.length}`);
  close(L, 40);
});

/* ══ P1 · open access (red-first + mutation) ══ */
test("P1 · a Free account can create a package; no Pro tag or lock anywhere", async ({ page }) => {
  const L = new PLedger("pkg-P1");
  const ctx = { route: ROUTE, size: W, state: "filled" };
  L.check("P1 · precondition: the harness account is on Free", ctx, last(["--plan"]) === "Free", last(["--plan"]));
  await fresh(page);
  await on(page, ".ph-primary").first().click().catch(() => {});
  const sel = on(page, '[data-well="letter"] select');
  if (await sel.count()) await sel.selectOption("pv2-l1");
  const name = page.locator("#ppv-c-name:visible");
  if (await name.count()) await name.fill("P1 probe");
  const create = on(page, '[data-ppv="create"]');
  if (await create.count()) await create.click();
  await expect.poll(() => dump().packages.some((p) => p.name === "P1 probe"), { timeout: 12_000 }).toBe(true).catch(() => {});
  L.check("P1 · the package was created (stored)", ctx, dump().packages.some((p) => p.name === "P1 probe"), JSON.stringify(dump().packages.map((p) => p.name)));
  const txt = (await read(page))?.text ?? "";
  L.check("P1 · no Pro tag, lock or upgrade on the packages page", ctx, txt.length > 100 && !/\bPro\b|upgrade|premium/i.test(txt), txt.match(/\bPro\b|upgrade|premium/i)?.[0] ?? `${txt.length}`);
  await openRoute(page, "/manuscripts", VP);
  const ms = await page.evaluate(() => ({ pro: document.querySelectorAll(".msv12-pro").length, lock: /Attach a package · Pro/.test(document.body.innerText) }));
  L.check("P1 · the Manuscripts page carries no Pro tag on packages", ctx, ms.pro === 0 && !ms.lock, JSON.stringify(ms));
  close(L, 4);
});

/* ══ P2 · composer fill: click, drag, select; wrong kind refused; click again empties ══ */
test(`P2 · composer fill · ${W}`, async ({ page }) => {
  const L = new PLedger(`pkg-P2-${W}`);
  const ctx = { route: ROUTE, size: W, state: "filled" };
  await fresh(page);
  await chip(page, "pv2-l2").click();
  let r = await read(page);
  L.check("P2 · a click with the composer closed opens it with that material in place", ctx, !!r?.composer && r.wells.letter === "pv2-l2", JSON.stringify(r?.wells));
  await chip(page, "pv2-l2").click();
  r = await read(page);
  L.check("P2 · clicking it again empties the slot", ctx, r?.wells.letter === "", JSON.stringify(r?.wells));
  await on(page, '[data-well="synopsis"] select').selectOption("pv2-s3");
  r = await read(page);
  L.check("P2 · the select fills its own well", ctx, r?.wells.synopsis === "pv2-s3", JSON.stringify(r?.wells));
  const d1 = await dragChip(page, "pv2-v2", "version");
  L.check("P2 · precondition: the chip and the well are both on screen for the drag", ctx, d1, "");
  r = await read(page);
  L.check("P2 · a drag onto the matching well fills it", ctx, r?.wells.version === "pv2-v2", JSON.stringify(r?.wells));
  const d2 = await dragChip(page, "pv2-s1", "letter");
  L.check("P2 · precondition: the wrong-kind drag had both ends on screen", ctx, d2, "");
  r = await read(page);
  L.check("P2 · a drag onto the wrong kind is refused", ctx, r?.wells.letter === "" && r?.wells.synopsis === "pv2-s3", JSON.stringify(r?.wells));
  await chip(page, "pv2-l3").click();
  r = await read(page);
  L.check("P2 · a click with the composer open fills its kind's well", ctx, r?.wells.letter === "pv2-l3", JSON.stringify(r?.wells));
  close(L, 8);
});

/* ══ P3 · letter required ══ */
test("P3 · the letter is required; the rest are optional", async ({ page }) => {
  const L = new PLedger("pkg-P3");
  const ctx = { route: ROUTE, size: W, state: "filled" };
  await fresh(page);
  await on(page, ".ph-primary").first().click();
  let r = await read(page);
  L.check("P3 · no letter: Create is disabled and the reason shown", ctx, r?.create === true && r?.why === "Add a query letter to continue.", `${r?.create} ${r?.why}`);
  await on(page, '[data-well="letter"] select').selectOption("pv2-l1");
  r = await read(page);
  L.check("P3 · a letter alone enables Create (synopsis and version optional)", ctx, r?.create === false && r?.wells.synopsis === "" && r?.wells.version === "", `${r?.create}`);
  close(L, 2);
});

/* ══ P4 · sent lock / duplicate (red-first + mutation) ══ */
/* ⚠️ RETARGETED (Part B of "Packages through the journey", 28 Sep). A sent package now OFFERS Edit —
   the edit starts its next edition, so the queries already sent keep the one they went with (the
   record stays true, which is what "fixed" protected) — and never Delete. Duplicate is its own action
   and still makes a NEW, unsent document; that half of the law is unchanged and asserted as before. */
test("P4 · a sent package is never deleted; Duplicate makes a new one; the note still saves", async ({ page }) => {
  const L = new PLedger("pkg-P4");
  const ctx = { route: ROUTE, size: W, state: "filled" };
  await fresh(page);
  let r = await read(page);
  const autumn = r?.cards.find((c) => c.name === "Autumn round");
  const winter = r?.cards.find((c) => c.name === "Winter draft");
  L.check("P4 · a sent package offers Edit (a new edition) and Duplicate, never Delete", ctx, !!autumn && autumn.acts.includes("edit") && autumn.acts.includes("dup") && !autumn.acts.includes("delete"), JSON.stringify(autumn?.acts));
  L.check("P4 · an unsent package offers Edit and Delete", ctx, !!winter && winter.acts.includes("edit") && winter.acts.includes("delete"), JSON.stringify(winter?.acts));
  const before = dump().packages.find((p) => p.id === "pv2-p1");
  const dup = card(page, "Autumn round").locator('[data-act="dup"]');
  if (await dup.count()) await dup.click();
  const nm = page.locator("#ppv-c-name:visible");
  L.check("P4 · Duplicate opens a new package named by duplicateName", ctx, (await nm.count()) > 0 && (await nm.inputValue()) === "Autumn round v2", (await nm.count()) ? await nm.inputValue() : "no composer");
  const create = on(page, '[data-ppv="create"]');
  if (await create.count()) await create.click();
  await expect.poll(() => dump().packages.some((p) => p.name === "Autumn round v2"), { timeout: 12_000 }).toBe(true).catch(() => {});
  const d = dump(); const copy = d.packages.find((p) => p.name === "Autumn round v2"); const orig = d.packages.find((p) => p.id === "pv2-p1");
  L.check("P4 · …a NEW document with the same slots, unsent", ctx, !!copy && copy.id !== "pv2-p1" && copy.ql === "pv2-l3" && copy.syn === "pv2-s1" && copy.bv === "pv2-v3" && !copy.sent, JSON.stringify(copy));
  L.check("P4 · …and the original is untouched", ctx, JSON.stringify(orig) === JSON.stringify(before), JSON.stringify({ before, orig }));
  const noteBtn = card(page, "Autumn round").locator('[data-act="note"]');
  if (await noteBtn.count()) { await noteBtn.click(); await page.locator("#ppv-note-ed:visible").fill("Locked, but the note moves."); await card(page, "Autumn round").locator('[data-act="noteSave"]').click(); }
  await expect.poll(() => dump().packages.find((p) => p.id === "pv2-p1")?.note, { timeout: 12_000 }).toBe("Locked, but the note moves.").catch(() => {});
  L.check("P4 · the note saves on a locked package", ctx, dump().packages.find((p) => p.id === "pv2-p1")?.note === "Locked, but the note moves.", `${dump().packages.find((p) => p.id === "pv2-p1")?.note}`);
  close(L, 6);
});

/* ══ P5 · active package (red-first + mutation) ══ */
test("P5 · Use for new queries sets activePackageId; exactly one tag; retiring it clears the field", async ({ page }) => {
  const L = new PLedger("pkg-P5");
  const ctx = { route: ROUTE, size: W, state: "filled" };
  await fresh(page);
  let r = await read(page);
  L.check("P5 · exactly one card carries the tag, and it is the stored one", ctx, r?.cards.filter((c) => c.active).map((c) => c.name).join() === "Autumn round", JSON.stringify(r?.cards.filter((c) => c.active).map((c) => c.name)));
  const use = card(page, "Agents with MSWL").locator('[data-act="use"]');
  if (await use.count()) await use.click();
  await expect.poll(() => dump().activePackageId, { timeout: 12_000 }).toBe("pv2-p2").catch(() => {});
  await page.waitForTimeout(600);
  r = await read(page);
  L.check("P5 · Use for new queries sets activePackageId", ctx, dump().activePackageId === "pv2-p2", `${dump().activePackageId}`);
  L.check("P5 · …and exactly one card carries the tag", ctx, r?.cards.filter((c) => c.active).map((c) => c.name).join() === "Agents with MSWL", JSON.stringify(r?.cards.filter((c) => c.active).map((c) => c.name)));
  const ret = card(page, "Agents with MSWL").locator('[data-act="retire"]');
  if (await ret.count()) await ret.click();
  await expect.poll(() => dump().activePackageId, { timeout: 12_000 }).toBe(null).catch(() => {});
  L.check("P5 · retiring the active package clears activePackageId", ctx, dump().activePackageId === null && dump().packages.find((p) => p.id === "pv2-p2")?.status === "Retired", JSON.stringify(dump().packages.find((p) => p.id === "pv2-p2")));
  close(L, 4);
});

/* ══ P6 · facts only (red-first + mutation) ══ */
test("P6 · Side by side: only with ≥2 sent; no row distinguished; no rank or verdict words", async ({ page }) => {
  const L = new PLedger("pkg-P6");
  const ctx = { route: ROUTE, size: W, state: "filled" };
  await fresh(page);
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    const sbs = root?.querySelector('[data-ppv="sbs"]');
    const rows = sbs ? [...sbs.querySelectorAll("tbody tr")] as HTMLElement[] : [];
    const look = (tr: HTMLElement) => { const td = tr.querySelector("td:nth-child(2)") as HTMLElement; const s = getComputedStyle(td); const t = getComputedStyle(tr); return [s.fontWeight, s.fontStyle, s.backgroundColor, t.backgroundColor, t.boxShadow, t.outlineStyle].join("|"); };
    const live = rows.filter((tr) => !tr.classList.contains("is-retired"));
    return { has: !!sbs, rows: rows.length, looks: [...new Set(live.map(look))], cells: rows.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent?.replace(/\s+/g, " ").trim())), text: root?.innerText ?? "" };
  });
  L.check("P6 · shown with ≥2 sent (three sent here: two live, one retired)", ctx, r.has && r.rows === 3, `${r.has} ${r.rows}`);
  L.check("P6 · no live row is visually distinguished", ctx, r.looks.length === 1, JSON.stringify(r.looks));
  const verdict = r.text.match(/\b(best|top|winner|winning|strongest|weakest|worst|leading|ranked|rank|most successful|better|outperform\w*)\b/i);
  L.check("P6 · the page has no rank or verdict word", ctx, r.text.length > 200 && !verdict, `${verdict?.[0]}`);
  L.check("P6 · the facts read from the log (Autumn round: 8 queries, 3 of 8 requests)", ctx, JSON.stringify(r.cells[0]?.slice(1, 4)) === JSON.stringify(["8", "3 of 8", "3 of 8"]), JSON.stringify(r.cells[0]));
  /* with fewer than two sent it is absent: retire nothing, delete-free — reseed with one sent by retiring is not fewer; use the empty fixture */
  await openPkgs(page, EMPTY);
  L.check("P6 · absent with fewer than two sent", ctx, (await read(page))?.sbs === false, "");
  close(L, 5);
});

/* ══ P7 · deep links ══ (v2.1: Side by side is a band now — read by data-band) */
test("P7 · ?tab=builder opens the composer; ?tab=tracking scrolls to Side by side", async ({ page }) => {
  const L = new PLedger("pkg-P7");
  const ctx = { route: ROUTE, size: W, state: "filled" };
  await fresh(page, FILLED, "?tab=builder");
  L.check("P7 · ?tab=builder opens the composer", ctx, (await read(page))?.composer === true, "");
  await openPkgs(page, FILLED, VP, "?tab=tracking");
  await page.waitForTimeout(800);
  const t = await page.evaluate(() => { const s = [...document.querySelectorAll('[data-ppv="band"][data-band="sbs"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement | undefined; const sc = s?.closest(".wpg-scroll") as HTMLElement | null; return s && sc ? { top: s.getBoundingClientRect().top - sc.getBoundingClientRect().top, st: sc.scrollTop, max: sc.scrollHeight - sc.clientHeight, ch: sc.clientHeight } : null; });
  /* ⚠️ "TO THE TOP" OR AS FAR AS THE SCROLLER GOES: a section near the page's end cannot reach the top */
  L.check("P7 · ?tab=tracking scrolls to Side by side (at the top, or at max scroll with it in view)", ctx, !!t && t.st > 0 && t.top >= -2 && (t.top < 80 || (Math.abs(t.st - t.max) <= 1 && t.top < t.ch - 60)), JSON.stringify(t));
  await openPkgs(page, FILLED, VP, "?tab=packages");
  const top = await page.evaluate(() => ([...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0)?.closest(".wpg-scroll") as HTMLElement | null)?.scrollTop ?? -1);
  L.check("P7 · ?tab=packages is the top of the page", ctx, top === 0, `${top}`);
  close(L, 3);
});

/* ══ P8 · empty state ══ */
test(`P8 · empty · ${W}`, async ({ page }) => {
  const L = new PLedger(`pkg-P8-${W}`);
  const ctx = { route: ROUTE, size: W, state: "empty" };
  await fresh(page, EMPTY);
  const r = await page.evaluate(() => {
    const root = [...document.querySelectorAll('[data-ppv="page"]')].find((e) => e.getBoundingClientRect().height > 0) as HTMLElement;
    /* living headers v3 §5: the example is the exhibition band now (its label, not an Example tag) */
    const ex = root?.querySelector('[data-lh="band"]') as HTMLElement | null;
    const lede = root?.querySelector(".ph-intro")?.textContent?.replace(/\s+/g, " ").trim();
    return {
      composer: !!root?.querySelector('[data-ppv="composer"]'), exHidden: ex?.getAttribute("aria-hidden") === "true", exInert: ex?.hasAttribute("inert") ?? false,
      exTag: root?.querySelector('[data-lh="exhibition"] .lh-exl')?.textContent?.trim() ?? null,
      exControls: ex ? [...ex.querySelectorAll("button, a[href], input, select, textarea")].filter((c) => !c.closest("[inert]")).length : -1,
      exClickable: ex ? getComputedStyle(ex).pointerEvents !== "none" : true,
      sbs: !!root?.querySelector('[data-ppv="sbs"]'), retired: !!root?.querySelector('[data-ppv="band"][data-band="retired"]'), lede,
    };
  });
  L.check("P8 · the composer is open by default", ctx, r.composer, "");
  L.check("P8 · the exhibition: aria-hidden, inert, labelled, not clickable", ctx, r.exHidden && r.exInert && r.exTag === "HOW THE PAGE LOOKS ONCE YOU’VE MADE ONE" && r.exControls === 0 && !r.exClickable, JSON.stringify(r));
  L.check("P8 · no Side by side, no Retired", ctx, !r.sbs && !r.retired, "");
  L.check("P8 · the empty lede", ctx, r.lede === "Build one package — the letter, the synopsis, the sample — and attach it to a query in one go, with a record of exactly what went.", `${r.lede}`);
  const sel = on(page, '[data-well="letter"] select');
  if (await sel.count()) { await sel.selectOption("pv2e-l1"); await on(page, '[data-ppv="create"]').click(); }
  await expect.poll(async () => (await read(page))?.cards.length ?? 0, { timeout: 12_000 }).toBe(1).catch(() => {});
  const after = await read(page);
  L.check("P8 · the first create flips to filled", ctx, after?.cards.length === 1 && !after.composer, JSON.stringify(after?.cards));
  close(L, 5);
});

/* ══ P9 · the add-material modal ══ */
test("P9 · the add-material modal: focus trap, Esc, name required, live word count", async ({ page }) => {
  const L = new PLedger("pkg-P9");
  const ctx = { route: ROUTE, size: W, state: "filled" };
  await fresh(page);
  const add = on(page, '[data-add="letter"]');
  if (await add.count()) await add.click();
  const modal = page.locator('[data-ppv="modal"]:visible');
  L.check("P9 · + Add opens the modal with the name focused", ctx, (await modal.count()) === 1 && (await page.evaluate(() => document.activeElement?.id)) === "ppv-m-name", "");
  if (await modal.count()) {
    await page.locator("#ppv-m-text").fill("one two three four five");
    L.check("P9 · the word count is live", ctx, ((await page.locator("#ppv-m-count").textContent()) ?? "").trim() === "5 words", `${await page.locator("#ppv-m-count").textContent()}`);
    await modal.locator('[data-ppv="m-save"]').click();
    L.check("P9 · a name is required", ctx, ((await modal.locator('[data-ppv="m-err"]').textContent()) ?? "").trim() === "Add a name to save it.", "");
    const inside: boolean[] = [];
    for (let i = 0; i < 8; i++) { await page.keyboard.press("Tab"); inside.push(await page.evaluate(() => !!document.activeElement?.closest('[data-ppv="modal"]'))); }
    for (let i = 0; i < 4; i++) { await page.keyboard.press("Shift+Tab"); inside.push(await page.evaluate(() => !!document.activeElement?.closest('[data-ppv="modal"]'))); }
    L.check("P9 · Tab and Shift+Tab stay inside the modal", ctx, inside.every(Boolean), JSON.stringify(inside));
    await page.keyboard.press("Escape");
    L.check("P9 · Esc closes it", ctx, (await page.locator('[data-ppv="modal"]:visible').count()) === 0, "");
  }
  close(L, 5);
});
