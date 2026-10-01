/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The sidebar — the split "Log a query" button, tuned metrics, ruled eyebrows, the gear in the foot
 * (sidebar metrics pass; ref design-refs/shell/sidebar-metrics-states.html). The RENDERED halves of
 * SB1–SB8, at 1280 and 1440, fonts loaded. The unit halves are src/components/shell/sidebarCapture.test.tsx.
 *
 * ⚠️ ONE TEST PER WIDTH, deliberately: every test signs in, and a long run of sign-ins trips Firebase's
 * password throttle (CLAUDE.md / e2e-signin-throttle). Each check is a ledger row rather than an
 * `expect`, so one red does not hide the rows behind it, and the run REFUSES to pass under its own
 * assertion floor — a probe that found nothing must say so in the language of a failure.
 *
 * ⚠️ IT WRITES NOTHING. The main segment and the gear only navigate; the menu's rows are opened by
 * the keyboard and closed with Escape, never picked — a pick opens an existing flow (a form, the
 * query drawer), and the unit lock SB2 owns which flow each row reaches.
 */
import { test, expect, Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { liftMotionSuppression } from "./measure";
import { openShell } from "./shellV3Lib";

const OUT = "reports/sidebar-metrics";
const WIDTHS = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;
/** The floor: a run that checks fewer rows than this measured less than it claims to. */
const FLOOR = 70;

type Row = { lock: string; ok: boolean; detail: string };

const near = (a: number, b: number, tol = 0.6) => Number.isFinite(a) && Math.abs(a - b) <= tol;

async function shot(page: Page, name: string, clip?: { x: number; y: number; width: number; height: number }) {
  await page.screenshot({ path: `${OUT}/${name}.png`, ...(clip ? { clip } : {}) });
}

/** The live geometry of the expanded sidebar, by `getBoundingClientRect` on settled boxes. */
async function readSidebar(page: Page) {
  return page.evaluate(() => {
    const side = document.getElementById("ws-sidebar")!;
    const r = (el: Element | null) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
    const nav = side.querySelector(".ws-nav")!;
    const kids = [...nav.children] as HTMLElement[];
    const seq = kids.map((k) => ({
      kind: k.classList.contains("ws-glabel") ? "label" : "row",
      text: (k.textContent ?? "").trim(),
      box: r(k)!,
      mt: parseFloat(getComputedStyle(k).marginTop), mb: parseFloat(getComputedStyle(k).marginBottom),
      after: (() => { const a = getComputedStyle(k, "::after"); return { content: a.content, w: parseFloat(a.width), h: parseFloat(a.height), bg: a.backgroundColor }; })(),
    }));
    const pfrow = side.querySelector(".ws-pfrow");
    const gear = side.querySelector(".ws-gear");
    const uacct = side.querySelector(".ws-uacct");
    return {
      brand: r(side.querySelector(".ws-brand")),
      caps: [...document.querySelectorAll('[data-shell="capture"]')].map((e) => ({ inSide: side.contains(e), box: r(e) })),
      capb: r(side.querySelector(".ws-capb")),
      capl: r(side.querySelector(".ws-capl")),
      capr: r(side.querySelector(".ws-capr")),
      caplName: side.querySelector(".ws-capl")?.textContent?.trim() ?? null,
      capInBar: !!document.querySelector('[data-probe="navrow"] .ws-cap, [data-probe="navrow"] [data-shell="capture"]'),
      navTop: r(nav)!.y,
      seq,
      gear: r(gear),
      gearName: gear?.getAttribute("aria-label") ?? null,
      gearSiblingOfUser: !!(gear && uacct && gear.parentElement === uacct.parentElement && gear.parentElement === pfrow && !uacct.contains(gear)),
      side: r(side),
    };
  });
}

/** Computed transition durations/delays/timing for a selector — read from the element itself. */
async function tx(page: Page, sel: string, pseudo?: string) {
  return page.evaluate(([s, p]) => {
    const el = document.querySelector(s as string);
    if (!el) return null;
    const c = getComputedStyle(el, (p as string) || undefined);
    return { prop: c.transitionProperty, dur: c.transitionDuration, delay: c.transitionDelay, fn: c.transitionTimingFunction, transform: c.transform };
  }, [sel, pseudo ?? ""]);
}

for (const vp of WIDTHS) {
  test(`the sidebar at ${vp.width} — the capture button, the metrics, the foot, the rail`, async ({ page }) => {
    mkdirSync(OUT, { recursive: true });
    const rows: Row[] = [];
    const check = (lock: string, ok: boolean, detail: string) => rows.push({ lock, ok: !!ok, detail });
    const W = vp.width;
    /* the ledger — written on every exit, so an absent control FAILS by name rather than hanging */
    const finish = () => {
      writeFileSync(`${OUT}/ledger-${W}.json`, JSON.stringify(rows, null, 1));
      const bad = rows.filter((r) => !r.ok);
      console.log(`LEDGER ${W}: ${rows.length} checks, ${bad.length} failed`);
      for (const r of bad) console.log(`  ✗ ${r.lock} — ${r.detail}`);
      expect(bad.map((r) => `${r.lock}: ${r.detail}`)).toEqual([]);
      expect(rows.length, `the run checked ${rows.length} rows, under its floor of ${FLOOR} — it measured less than it claims`).toBeGreaterThanOrEqual(FLOOR);
    };

    /* ══ EXPANDED ══ */
    await openShell(page, "/dashboard", vp, false);
    const fonts = await page.evaluate(() => ["Source Serif 4", "JetBrains Mono"].map((f) => [...document.fonts].some((x) => x.family.replace(/["']/g, "") === f && x.status === "loaded")));
    check("fonts", fonts.every(Boolean), `serif/mono loaded: ${fonts}`);
    const s = await readSidebar(page);

    /* SB1 */
    check("SB1 one control", s.caps.length === 1 && s.caps[0].inSide, `capture controls: ${JSON.stringify(s.caps.map((c) => c.inSide))}`);
    check("SB1 between brand and nav", !!s.brand && !!s.capb && s.capb.y >= s.brand.b && s.capb.b <= s.navTop, `brand.b ${s.brand?.b} cap ${s.capb?.y}–${s.capb?.b} nav ${s.navTop}`);
    check("SB1 named Log a query", s.caplName === "Log a query", `main segment: ${s.caplName}`);
    check("SB1 the bar holds none", !s.capInBar, `capture in bar: ${s.capInBar}`);
    /* scoped to the shell's chrome: the dashboard's own quick actions carry a "Log a query" of their
       own, which is page content and not this control */
    const mainName = await page.locator("#ws-sidebar").getByRole("button", { name: "Log a query", exact: true }).count();
    const barName = await page.locator('[data-probe="navrow"]').getByRole("button", { name: "Log a query", exact: true }).count();
    check("SB1 accessible name", mainName === 1 && barName === 0, `in the sidebar: ${mainName}, in the bar: ${barName}`);
    const barNew = await page.locator('[data-probe="navrow"]').getByText("+ New").count();
    check("SB1 no + New in the bar", barNew === 0, `+ New in bar: ${barNew}`);

    /* ⚠️ NO CONTROL, NO INTERACTION: every step below drives it, and a locator waiting on an absent
       element hangs to the test timeout instead of failing. Stop here with the ledger instead. */
    if (!s.capb || !s.capr) { check("SB1 the control exists", false, "no .ws-capb/.ws-capr in the sidebar"); finish(); return; }

    /* SB3 geometry */
    check("SB3 button 36 tall", !!s.capb && near(s.capb.h, 36), `capb.h ${s.capb?.h}`);
    check("SB3 chevron 32 wide", !!s.capr && near(s.capr.w, 32), `capr.w ${s.capr?.w}`);
    const navRows = s.seq.filter((k) => k.kind === "row");
    check("SB3 rows populated", navRows.length >= 10, `rows ${navRows.length}`);
    for (const r of navRows) check("SB3 row 32", near(r.box.h, 32), `${r.text}: ${r.box.h}`);
    for (let i = 1; i < s.seq.length; i++) {
      const a = s.seq[i - 1], b = s.seq[i];
      if (a.kind === "row" && b.kind === "row") check("SB3 row gap 2", near(b.box.y - a.box.b, 2), `${a.text}→${b.text}: ${b.box.y - a.box.b}`);
      /* above a label: 20 margin + 2 flex gap; below it: 6 margin + 2 flex gap — the gap is the nav's, the margin the label's */
      if (a.kind === "row" && b.kind === "label") check("SB3 eyebrow 20 above", near(b.mt, 20) && near(b.box.y - a.box.b, 22), `${b.text}: margin ${b.mt}, rendered ${b.box.y - a.box.b} (20 + the 2px row gap)`);
      if (a.kind === "label" && b.kind === "row") check("SB3 eyebrow 6 below", near(a.mb, 6) && near(b.box.y - a.box.b, 8), `${a.text}: margin ${a.mb}, rendered ${b.box.y - a.box.b} (6 + the 2px row gap)`);
    }
    const first = s.seq[0];
    check("SB3 button → first eyebrow 22", !!s.capb && first.kind === "label" && near(first.box.y - s.capb.b, 22), `capb.b ${s.capb?.b} first label ${first.box.y} → ${first.box.y - (s.capb?.b ?? 0)}`);

    /* SB4 ruled */
    const labels = s.seq.filter((k) => k.kind === "label");
    check("SB4 labels", labels.map((l) => l.text).join("|") === "Workspace|Queries|Agents|Materials|Tasks", `labels ${labels.map((l) => l.text).join("|")}`);
    for (const l of labels) check("SB4 label + hairline", l.after.content === '""' && near(l.after.h, 1) && l.after.w > 40, `${l.text}: ::after ${JSON.stringify(l.after)}`);
    check("SB4 WORKSPACE over Dashboard", s.seq[0].kind === "label" && s.seq[0].text === "Workspace" && s.seq[1].text === "Dashboard", `${s.seq[0].text} → ${s.seq[1].text}`);

    /* SB5 the foot */
    check("SB5 no Settings row", !s.seq.some((k) => k.kind === "row" && k.text === "Settings"), "nav rows have no Settings");
    check("SB5 no Account section", !labels.some((l) => l.text === "Account"), "labels have no Account");
    check("SB5 gear present", !!s.gear && near(s.gear.w, 30) && near(s.gear.h, 30) && s.gearName === "Settings", `gear ${JSON.stringify(s.gear)} ${s.gearName}`);
    check("SB5 gear is a sibling of the user row", s.gearSiblingOfUser, `sibling: ${s.gearSiblingOfUser}`);

    /* screenshots: at rest, a hovered row, the foot */
    const sideClip = s.side ? { x: 0, y: s.side.y, width: Math.ceil(s.side.w) + 40, height: Math.min(vp.height - s.side.y, Math.ceil(s.side.h)) } : undefined;
    await shot(page, `${W}-expanded-rest`, sideClip);
    await page.locator("#ws-sidebar .ws-ni:not(.on)").nth(2).hover();
    await page.waitForTimeout(250);
    await shot(page, `${W}-row-hover`, sideClip);
    if (s.gear) await shot(page, `${W}-foot-gear`, { x: 0, y: Math.max(0, s.gear.y - 60), width: Math.ceil(s.side!.w) + 10, height: 110 });

    /* SB5 the user row still opens the account menu */
    await page.mouse.move(vp.width - 10, vp.height - 10);
    await page.locator(".ws-uacct").click();
    const am = await page.locator(".am-menu").isVisible().catch(() => false);
    check("SB5 user row opens the account menu", am, `account menu visible: ${am}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    /* SB6 the menu's keyboard */
    const active = () => page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null;
      return { cls: a?.className ?? "", text: (a?.textContent ?? "").trim(), inMenu: !!a?.closest(".ws-capm") };
    });
    const isOpen = () => page.evaluate(() => {
      const m = document.querySelector(".ws-capm");
      const r = document.querySelector(".ws-capr");
      return { open: !!m?.classList.contains("is-open"), vis: m ? getComputedStyle(m).visibility : "", expanded: r?.getAttribute("aria-expanded") ?? "" };
    });
    const chev = page.locator(".ws-capr");
    const closedFirst = await isOpen();
    check("SB6 closed at rest", !closedFirst.open && closedFirst.vis === "hidden" && closedFirst.expanded === "false", JSON.stringify(closedFirst));
    for (const key of ["Enter", " ", "ArrowDown"]) {
      await chev.focus();
      await page.keyboard.press(key);
      await page.waitForTimeout(120);
      const o = await isOpen(); const a = await active();
      check(`SB6 opens on ${key === " " ? "Space" : key}`, o.open && o.vis === "visible" && o.expanded === "true" && a.inMenu && a.text === "Record a response", `${JSON.stringify(o)} focus ${a.text}`);
      await page.keyboard.press("Escape");
      await page.waitForTimeout(80);
      const c = await isOpen(); const af = await active();
      check("SB6 Escape closes, focus to the chevron", !c.open && /ws-capr/.test(af.cls), `${JSON.stringify(c)} focus ${af.cls}`);
    }
    await chev.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(120);
    const steps: [string, string][] = [
      ["ArrowDown", "Add an agent"], ["ArrowDown", "Add a manuscript"], ["ArrowDown", "Record a response"],
      ["ArrowUp", "Add a manuscript"], ["Home", "Record a response"], ["End", "Add a manuscript"],
    ];
    for (const [k, want] of steps) {
      await page.keyboard.press(k);
      const a = await active();
      check(`SB6 ${k}`, a.text === want, `${k} → ${a.text} (want ${want})`);
    }
    /* the chevron is at 180° while open — read with motion suppressed, so it is the settled value */
    const rot = await tx(page, ".ws-capr svg");
    check("SB6 chevron 180° open", !!rot && /matrix\(-1, ?[-0-9.e]+, ?[-0-9.e]+, ?-1, ?0, ?0\)/.test(rot.transform), `transform ${rot?.transform}`);
    const capb = s.capb!;
    await shot(page, `${W}-menu-open`, { x: 0, y: s.side!.y, width: Math.ceil(s.side!.w) + 40, height: Math.min(260, vp.height - s.side!.y) });
    const menuBox = await page.locator(".ws-capm").boundingBox();
    check("SB6 menu full width, 6 below", !!menuBox && near(menuBox.x, capb.x) && near(menuBox.width, capb.w) && near(menuBox.y - capb.b, 6), `menu ${JSON.stringify(menuBox)} button ${JSON.stringify(capb)}`);
    const rowsH = await page.$$eval(".ws-capm .ws-capi", (els) => els.map((e) => e.getBoundingClientRect().height));
    check("SB6 menu rows 34", rowsH.length === 3 && rowsH.every((h) => Math.abs(h - 34) < 0.6), `rows ${rowsH}`);
    const kbd = await page.locator(".ws-capm kbd, .ws-capm .dk-railkbd").count();
    check("SB9 no keycaps in the menu", kbd === 0, `keycaps ${kbd}`);
    /* Tab closes without trapping */
    await page.keyboard.press("Tab");
    await page.waitForTimeout(80);
    const t = await isOpen(); const at = await active();
    check("SB6 Tab closes, no trap", !t.open && !at.inMenu, `${JSON.stringify(t)} focus ${at.cls}`);
    /* click opens; an outside pointerdown closes */
    await chev.click();
    await page.waitForTimeout(80);
    check("SB6 click opens", (await isOpen()).open, "after click");
    await page.mouse.click(Math.round(s.side!.r + 300), Math.round(vp.height / 2));
    await page.waitForTimeout(80);
    check("SB6 outside pointerdown closes", !(await isOpen()).open, "after outside click");

    /* SB8 motion — lift the harness's suppression and read the stated durations off the elements */
    await liftMotionSuppression(page);
    await page.mouse.move(vp.width - 10, vp.height - 10);
    await page.waitForTimeout(300);
    const restRow = await tx(page, "#ws-sidebar .ws-ni:not(.on)");
    check("SB8 row out 160ms", !!restRow && /^background-color$/.test(restRow.prop) && restRow.dur === "0.16s", JSON.stringify(restRow));
    await page.locator("#ws-sidebar .ws-ni:not(.on)").first().hover();
    const hovRow = await tx(page, "#ws-sidebar .ws-ni:not(.on)");
    check("SB8 row in 120ms", !!hovRow && hovRow.dur === "0.12s", JSON.stringify(hovRow));
    const onRow = await tx(page, "#ws-sidebar .ws-ni.on");
    check("SB8 active row instant", !onRow || /^(all|none)$/.test(onRow.prop) && onRow.dur === "0s", JSON.stringify(onRow));
    const btnTx = await tx(page, ".ws-capb");
    check("SB8 button ring 120ms", !!btnTx && btnTx.dur.split(", ").every((d) => d === "0.12s"), JSON.stringify(btnTx));
    const chevTx = await tx(page, ".ws-capr svg");
    check("SB8 chevron 200ms house", !!chevTx && chevTx.dur === "0.2s" && chevTx.fn === "cubic-bezier(0.22, 0.8, 0.3, 1)", JSON.stringify(chevTx));
    const closedM = await tx(page, ".ws-capm");
    check("SB8 menu out 120ms fade only", !!closedM && closedM.prop.split(", ").join("|") === "opacity|transform|visibility" && closedM.dur === "0.12s, 0s, 0s" && closedM.delay === "0s, 0.12s, 0.12s", JSON.stringify(closedM));
    await chev.click();
    const openM = await tx(page, ".ws-capm");
    check("SB8 menu in 170 (opacity 150) house", !!openM && openM.dur === "0.15s, 0.17s, 0s" && openM.fn.includes("cubic-bezier(0.22, 0.8, 0.3, 1)"), JSON.stringify(openM));
    await page.keyboard.press("Escape");
    /* pressed: hold the pointer down on the main segment, move off before releasing so no click fires */
    const capl = await page.locator(".ws-capl").boundingBox();
    await page.mouse.move(capl!.x + 20, capl!.y + 18);
    await page.mouse.down();
    /* past the 70ms press, so the reading is the pressed state rather than a frame of the way there */
    await page.waitForTimeout(200);
    const pressed = await tx(page, ".ws-capb");
    const pressedShadow = await page.$eval(".ws-capb", (e) => getComputedStyle(e).boxShadow);
    check("SB8 pressed 70ms, .5px, no drop shadow", !!pressed && pressed.dur.split(", ").every((d) => d === "0.07s") && /matrix\(1, 0, 0, 1, 0, 0\.5\)/.test(pressed.transform) && !/0px 1px 2px/.test(pressedShadow), `${JSON.stringify(pressed)} shadow ${pressedShadow}`);
    await page.mouse.move(vp.width - 10, vp.height - 10);
    await page.mouse.up();
    /* reduced motion: every duration 0s */
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForTimeout(100);
    for (const sel of ["#ws-sidebar .ws-ni:not(.on)", ".ws-capb", ".ws-capl", ".ws-capr svg", ".ws-capm", ".ws-capi", ".ws-gear"]) {
      const r = await tx(page, sel);
      check("SB8 reduced motion 0s", !!r && r.dur.split(", ").every((d) => d === "0s") && r.delay.split(", ").every((d) => d === "0s"), `${sel}: ${JSON.stringify(r)}`);
    }
    await page.emulateMedia({ reducedMotion: "no-preference" });

    /* SB2 rendered: the main segment runs the existing Log-a-query contract — it routes to the Query
       Centre, whose seed opens the query drawer's log journey (Query actions v1). Closed unsaved. */
    await page.locator(".ws-capl").click();
    await page.waitForTimeout(900);
    const drawer = await page.locator(".qad-root.is-open").count();
    check("SB2 Log a query → the drawer, on /queries", new URL(page.url()).pathname === "/queries" && drawer === 1, `url ${page.url()} drawer ${drawer}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    if (await page.locator(".qad-root.is-open").count()) {
      await page.locator('.qad-root.is-open [aria-label^="Close"]').first().click({ timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
    }

    /* SB5 the gear routes to /account */
    await page.locator(".ws-gear").click({ timeout: 10_000 });
    await page.waitForTimeout(500);
    check("SB5 gear → /account", new URL(page.url()).pathname.startsWith("/account"), `url ${page.url()}`);

    /* ══ COLLAPSED — the rail ══ */
    await openShell(page, "/dashboard", vp, true);
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
    const c = await page.evaluate(() => {
      const side = document.getElementById("ws-sidebar")!;
      const sb = side.getBoundingClientRect();
      const tile = side.querySelector(".ws-captile")?.getBoundingClientRect() ?? null;
      return {
        panel: { x: sb.x, w: sb.width, y: sb.y },
        tile: tile && { x: tile.x, y: tile.y, w: tile.width, h: tile.height, cx: tile.x + tile.width / 2, r: tile.right },
        gear: !!side.querySelector(".ws-gear"),
        user: !!side.querySelector(".ws-uacct"),
        caps: document.querySelectorAll('[data-shell="capture"]').length,
      };
    });
    check("SB7 tile 40×36", !!c.tile && near(c.tile.w, 40) && near(c.tile.h, 36), JSON.stringify(c.tile));
    check("SB7 tile centred", !!c.tile && near(c.tile.cx, c.panel.x + c.panel.w / 2, 1), `tile cx ${c.tile?.cx} panel centre ${c.panel.x + c.panel.w / 2}`);
    check("SB7 one control collapsed", c.caps === 1, `captures ${c.caps}`);
    check("SB5 gear absent collapsed", !c.gear && c.user, `gear ${c.gear} user ${c.user}`);
    const railClip = { x: 0, y: c.panel.y, width: 320, height: Math.min(360, vp.height - c.panel.y) };
    await shot(page, `${W}-collapsed-rest`, railClip);
    /* the rail tip names the tile */
    await liftMotionSuppression(page);
    await page.locator(".ws-captile").hover();
    await page.waitForTimeout(400);
    const tipText = await page.locator(".dk-tip.show").textContent().catch(() => null);
    check("SB7 rail tip Log a query", (tipText ?? "").trim() === "Log a query", `tip ${tipText}`);
    await page.locator(".ws-captile").click();
    await page.waitForTimeout(300);
    const fly = await page.evaluate(() => {
      const m = document.querySelector(".ws-capm--fly");
      if (!m) return null;
      const b = m.getBoundingClientRect();
      const tile = document.querySelector(".ws-captile")!.getBoundingClientRect();
      const hit = document.elementFromPoint(b.x + b.width / 2, b.y + 20);
      return {
        open: m.classList.contains("is-open"), vis: getComputedStyle(m).visibility,
        inBody: m.parentElement === document.body, inPanel: !!document.getElementById("ws-sidebar")!.contains(m),
        box: { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom },
        tileR: tile.right, tileY: tile.y,
        vw: window.innerWidth, vh: window.innerHeight,
        hitInside: !!hit && m.contains(hit),
        first: (m.querySelector('[role="menuitem"]')?.textContent ?? "").trim(),
        rows: [...m.querySelectorAll('[role="menuitem"]')].map((e) => (e.textContent ?? "").trim()),
        tip: !!document.querySelector(".dk-tip.show"),
        tx: (() => { const s = getComputedStyle(m); return { dur: s.transitionDuration, fn: s.transitionTimingFunction }; })(),
      };
    });
    check("SB7 flyout portalled", !!fly && fly.inBody && !fly.inPanel, JSON.stringify({ inBody: fly?.inBody, inPanel: fly?.inPanel }));
    check("SB7 flyout open and visible", !!fly && fly.open && fly.vis === "visible", JSON.stringify({ open: fly?.open, vis: fly?.vis }));
    check("SB7 flyout fully on screen", !!fly && fly.box.x >= 0 && fly.box.y >= 0 && fly.box.r <= fly.vw && fly.box.b <= fly.vh, JSON.stringify(fly?.box));
    check("SB7 flyout not clipped (the browser paints it)", !!fly && fly.hitInside, `elementFromPoint inside: ${fly?.hitInside}`);
    check("SB7 flyout at the tile's right edge, 228 wide", !!fly && near(fly.box.x, fly.tileR + 8, 1) && near(fly.box.w, 228) && near(fly.box.y, fly.tileY, 1), JSON.stringify({ box: fly?.box, tileR: fly?.tileR }));
    check("SB7 Log a query first", !!fly && fly.first === "Log a query" && fly.rows.join("|") === "Log a query|Record a response|Add an agent|Add a manuscript", `${fly?.rows.join("|")}`);
    check("SB7 tip and flyout never together", !!fly && !fly.tip, `tip showing: ${fly?.tip}`);
    check("SB8 flyout in 170 house", !!fly && fly.tx.dur === "0.15s, 0.17s, 0s" && fly.tx.fn.includes("cubic-bezier(0.22, 0.8, 0.3, 1)"), JSON.stringify(fly?.tx));
    /* ⚠️ READ BEFORE THE SCREENSHOT'S STYLE TAG BELOW, which forces `transition: none` everywhere — read
       after it, this row is green whatever the sheet says (proved: it stayed green with the rule deleted). */
    await page.emulateMedia({ reducedMotion: "reduce" });
    const flyRm = await tx(page, ".ws-capm--fly");
    check("SB8 flyout reduced motion 0s", !!flyRm && flyRm.dur.split(", ").every((d) => d === "0s") && flyRm.delay.split(", ").every((d) => d === "0s"), JSON.stringify(flyRm));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.addStyleTag({ content: "*,*::before,*::after{transition:none!important}" });
    await page.waitForTimeout(50);
    await shot(page, `${W}-flyout-open`, { x: 0, y: c.panel.y, width: 340, height: Math.min(360, vp.height - c.panel.y) });
    /* hovering the tile while the flyout is open shows no tip */
    await page.mouse.move(vp.width - 10, vp.height - 10);
    await page.locator(".ws-captile").hover();
    await page.waitForTimeout(300);
    check("SB7 no tip over an open flyout", (await page.locator(".dk-tip.show").count()) === 0, "tip count after re-hover");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(80);
    const back = await page.evaluate(() => ({ open: !!document.querySelector(".ws-capm--fly.is-open"), focus: (document.activeElement as HTMLElement | null)?.className ?? "" }));
    check("SB7 Escape closes, focus to the tile", !back.open && /ws-captile/.test(back.focus), JSON.stringify(back));

    finish();
  });
}
