/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Manuscript spine v1 (16 Nov) — the collapsed rail's manuscript selector as a navy cloth spine at the foot of the
 * rail, and its cloth label. Ref: design-refs/shell/manuscript-spine-v1.html. Report: reports/manuscript-spine-v1/.
 *
 * Run on the emulators: `npm run e2e:emu -- tests/e2e/manuscriptSpine.measure.ts --project=measure`.
 * MSP_MUTATE=<name>[,<name>] applies a named break to every page the test opens, so each lock can be watched going
 * red. MSP_SHOTS=<dir> writes the report's screenshots there.
 *
 * ⚠️ EVERY READING IS THE RENDERED PAGE'S (getBoundingClientRect, getComputedStyle, getAnimations), never a
 * declaration. Every population is counted before it is asserted on.
 *
 * ⚠️ THE HARNESS ACCOUNT HOLDS SEVEN MANUSCRIPTS, so "many" is its natural state. The one-, two- and
 * no-manuscript cases delete manuscripts through the client SDK and put every one back in the same test (the
 * emulator run also starts from the committed snapshot and exports nothing, so a failed restore cannot outlive
 * the run).
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, doc, setDoc, deleteDoc, type DocumentData } from "firebase/firestore";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

test.setTimeout(300_000);

const MUTATE = process.env.MSP_MUTATE ?? "";
const broken = (name: string) => MUTATE === "all" || MUTATE.split(",").includes(name);
async function breakCss(page: Page, name: string, css: string) {
  if (!broken(name)) return;
  console.log(`[MSP] MUTATION ON: ${name}`);
  await page.addInitScript((c) => {
    const add = () => { const st = document.createElement("style"); st.textContent = c; document.head.appendChild(st); };
    if (document.head) add(); else document.addEventListener("DOMContentLoaded", add);
  }, css);
}
/* the named breaks — each is the removal of one fix, and each lock below must go red under its own */
async function breaks(page: Page) {
  await breakCss(page, "shelf", ".wsr .ws-ms--rail.ms-shelfwrap { margin-bottom: -2px !important }");
  await breakCss(page, "nav", ".wsr-nav, .wsr-setnav { margin-top: 18px !important }");
  await breakCss(page, "tilt", ".wsr .ms-spine-btn:hover .ms-spine { transform: none !important }");
  await breakCss(page, "short", ".wsr .ms-spine { --msp-h: 152px !important }");
  await breakCss(page, "label-left", ".ms-label { margin-left: 6px !important }");
  await breakCss(page, "motion", "@media (prefers-reduced-motion: reduce) { .wsr .ms-spine { transition: transform .22s ease !important } .ms-label { animation: ms-label-in .16s ease-out .1s both !important } }");
}

const SHOTS = process.env.MSP_SHOTS ?? "";
async function shot(page: Page, name: string, clip?: { x: number; y: number; width: number; height: number }) {
  if (!SHOTS) return;
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/${name}.png`, clip });
}

async function onRail(page: Page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("scriptally:sidebar-collapsed", "1");
      localStorage.setItem("scriptally:sidebar-pinned", "0");
    } catch { /* first visit */ }
  });
}

const SIZES = [{ width: 1512, height: 982 }, { width: 1280, height: 720 }];
const ROUTES = ["/queries", "/materials/letters"];
/** The old manuscript tile's slot began this far under the hawk's box: `.wsr-mswrap`'s margin-top, 12px, or 8px
 *  on a window under 920px tall (sidebarRail.css before this pass). The nav now starts there. */
const SLOT_GAP = (h: number) => (h <= 919 ? 8 : 12);

type R = { top: number; bottom: number; left: number; right: number; width: number; height: number };
type Reading = {
  rail: R; lgo: R; btn: R; spine: R; shelf: R; fb: R; nav: R; firstRow: R;
  transform: string; spineH: number; spines: number; shelves: number; label: { shown: boolean; box: R | null; text: string };
  menuOpen: number; menu: R | null; vh: number; vw: number;
};
async function read(page: Page): Promise<Reading> {
  return page.evaluate(() => {
    const box = (e: Element | null) => {
      if (!e) return null;
      const r = e.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, width: r.width, height: r.height };
    };
    const q = (s: string) => document.querySelector(s);
    const btn = q('.wsr [data-ms="spine"], .wsr [data-ms="spine-empty"]');
    const spine = btn?.querySelector(".ms-spine") ?? null;
    const label = q('.ms-label[role="tooltip"]') as HTMLElement | null;
    const menu = q('.ws-ms-menu--port[data-open="true"]');
    return {
      rail: box(q(".wsr"))!, lgo: box(q(".wsr-lgo"))!, btn: box(btn)!, spine: box(spine)!, shelf: box(q(".wsr .ms-shelf"))!,
      fb: box(q(".wsr .wsr-fb"))!, nav: box(q(".wsr-nav"))!, firstRow: box(q(".wsr-nav .wsr-ni"))!,
      transform: spine ? getComputedStyle(spine).transform : "",
      spineH: spine ? (spine as HTMLElement).offsetHeight : 0,
      spines: document.querySelectorAll(".wsr .ms-spine").length,
      shelves: document.querySelectorAll(".wsr .ms-shelf").length,
      label: { shown: !!label && !label.hidden && label.getBoundingClientRect().width > 0, box: label && !label.hidden ? box(label) : null, text: label?.innerText ?? "" },
      menuOpen: document.querySelectorAll('.ws-ms-menu--port[data-open="true"]').length,
      menu: box(menu),
      vh: innerHeight, vw: innerWidth,
    };
  });
}

/** rotate(-7deg) translateY(-3px), as the matrix getComputedStyle reports it. */
function tiltMatrix(): number[] {
  const a = (-7 * Math.PI) / 180;
  const c = Math.cos(a), s = Math.sin(a);
  /* R · T: the rotation matrix(c, s, -s, c, 0, 0) times translate(0, -3) moves the origin by R·(0, -3) = (3s, -3c) */
  return [c, s, -s, c, 3 * s, -3 * c];
}
const parseMatrix = (t: string) => (t.match(/matrix\(([^)]+)\)/)?.[1] ?? "").split(",").map((n) => parseFloat(n));

async function hoverSpine(page: Page) {
  await page.locator('.wsr [data-ms="spine"], .wsr [data-ms="spine-empty"]').hover();
  await page.waitForTimeout(400);
}

/* ── manuscripts, deleted and put back in the same test ──────────────────────────────────────────── */
async function keepOnly(n: number): Promise<() => Promise<void>> {
  const { db, uid } = await devDb();
  const snap = await getDocs(collection(db, "users", uid, "manuscripts"));
  const all = snap.docs.map((d) => ({ id: d.id, data: d.data() as DocumentData }));
  /* keep the books with queries first, so the kept one reads a facts line */
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const per = new Map<string, number>();
  for (const d of qs.docs) { const m = (d.data() as { manuscriptId?: string }).manuscriptId; if (m) per.set(m, (per.get(m) ?? 0) + 1); }
  all.sort((a, b) => (per.get(b.id) ?? 0) - (per.get(a.id) ?? 0));
  const gone = all.slice(n);
  for (const m of gone) await deleteDoc(doc(db, "users", uid, "manuscripts", m.id));
  console.log(`[MSP] kept ${all.slice(0, n).map((m) => m.id).join(",") || "none"}; removed ${gone.length} of ${all.length}`);
  return async () => {
    for (const m of gone) await setDoc(doc(db, "users", uid, "manuscripts", m.id), m.data);
    const back = await getDocs(collection(db, "users", uid, "manuscripts"));
    console.log(`[MSP] restored: ${back.size} manuscripts (was ${all.length})`);
    expect(back.size, "every manuscript is back").toBe(all.length);
  };
}

test.describe("manuscript spine v1", () => {
  test("MSP1 the spine stands on the shelf, 10px above Feedback; the nav starts where the tile's slot did; it tips inside the rail", async ({ page }) => {
    await onRail(page);
    await breaks(page);
    let n = 0;
    for (const size of SIZES) {
      for (const route of ROUTES) {
        await openRoute(page, route, size);
        const r = await read(page);
        const ctx = `${route} ${size.width}×${size.height}`;
        expect(r.spines, `${ctx}: one spine on the rail`).toBe(1);
        expect(r.shelves, `${ctx}: one shelf line`).toBe(1);
        const slotTop = r.lgo.bottom + SLOT_GAP(size.height);
        console.log(`[MSP1] ${ctx}`, JSON.stringify({
          spineFoot: r.btn.bottom, shelfTop: r.shelf.top, shelfBottom: r.shelf.bottom, fbTop: r.fb.top,
          shelfToFb: +(r.fb.top - r.shelf.bottom).toFixed(2), shelfW: r.shelf.width, shelfCentre: (r.shelf.left + r.shelf.right) / 2,
          railCentre: (r.rail.left + r.rail.right) / 2, oldSlotTop: slotTop, firstRowTop: r.firstRow.top, spineH: r.spineH, transform: r.transform,
        }));
        expect.soft(Math.abs(r.btn.bottom - r.shelf.top), `${ctx}: the spine's foot is on the line`).toBeLessThanOrEqual(1);
        expect.soft(Math.abs(r.fb.top - r.shelf.bottom - 10), `${ctx}: the line is 10px above Feedback`).toBeLessThanOrEqual(1);
        expect.soft(r.shelf.width, `${ctx}: a 50px line`).toBeCloseTo(50, 0);
        expect.soft(Math.abs((r.shelf.left + r.shelf.right) / 2 - (r.rail.left + r.rail.right) / 2), `${ctx}: centred in the rail`).toBeLessThanOrEqual(0.5);
        expect.soft(Math.abs(r.firstRow.top - slotTop), `${ctx}: the first nav row starts where the slot did`).toBeLessThanOrEqual(0.5);
        expect.soft(r.transform, `${ctx}: upright at rest`).toBe("none");
        expect.soft(r.spineH, `${ctx}: full height`).toBe(152);

        await hoverSpine(page);
        const h = await read(page);
        const m = parseMatrix(h.transform);
        const want = tiltMatrix();
        console.log(`[MSP1] ${ctx} hovered`, h.transform, "spine box", JSON.stringify(h.spine), "rail", JSON.stringify(h.rail));
        expect(m.length, `${ctx}: hovered, the spine has a matrix`).toBe(6);
        m.forEach((v, i) => expect.soft(Math.abs(v - want[i]), `${ctx}: matrix[${i}] ${v} vs ${want[i]}`).toBeLessThan(0.01));
        expect.soft(h.spine.left, `${ctx}: tipped, inside the rail's left`).toBeGreaterThanOrEqual(h.rail.left);
        expect.soft(h.spine.right, `${ctx}: tipped, inside the rail's right`).toBeLessThanOrEqual(h.rail.right);
        expect.soft(h.spine.top, `${ctx}: tipped, below the nav`).toBeGreaterThanOrEqual(h.nav.bottom);
        await page.mouse.move(700, 400);
        n++;
      }
    }
    expect(n).toBe(4);
  });

  test("MSP2 hovered, the cloth label sits 8px right of the rail, centred on the spine, and reads the book", async ({ page }) => {
    await onRail(page);
    await breaks(page);
    let n = 0;
    for (const size of SIZES) {
      for (const route of ROUTES) {
        await openRoute(page, route, size);
        const rest = await read(page);
        expect.soft(rest.label.shown, "no label at rest").toBe(false);
        await hoverSpine(page);
        const r = await read(page);
        const ctx = `${route} ${size.width}×${size.height}`;
        const spineMid = r.btn.top + 6 + (r.btn.height - 6) / 2;
        console.log(`[MSP2] ${ctx}`, JSON.stringify({ label: r.label.box, railRight: r.rail.right, spineMid, text: r.label.text }));
        expect(r.label.shown, `${ctx}: the label shows`).toBe(true);
        const b = r.label.box!;
        expect.soft(Math.abs(b.left - r.rail.right - 8), `${ctx}: 8px right of the rail`).toBeLessThanOrEqual(1);
        expect.soft(Math.abs((b.top + b.bottom) / 2 - spineMid), `${ctx}: centred on the spine`).toBeLessThanOrEqual(2);
        const lines = r.label.text.split("\n").map((s) => s.trim()).filter(Boolean);
        const title = await page.locator('.wsr [data-ms="spine"]').getAttribute("aria-label");
        expect.soft(title?.startsWith("Manuscript: "), "the spine is named for its book").toBe(true);
        expect.soft(lines[0], `${ctx}: the title first`).toBe(title!.slice("Manuscript: ".length));
        expect.soft(lines.some((l) => /·.*words$|^[A-Z][a-z].* · /.test(l)), `${ctx}: the meta line`).toBe(true);
        expect.soft(lines.some((l) => /^(\d+ quer(y|ies)( since \d{1,2} [A-Z][a-z]{2})?|No queries yet)$/.test(l)), `${ctx}: the facts line`).toBe(true);
        expect.soft(lines.slice(-2).join(" | "), `${ctx}: the coming soon row`).toBe("Add a manuscript | coming soon");
        /* it goes at once: pointer off, then keyboard focus brings it back, Escape sends it away */
        await page.mouse.move(700, 400);
        expect.soft((await read(page)).label.shown, `${ctx}: pointer off, gone at once`).toBe(false);
        await shot(page, `rest-${size.width}x${size.height}-${route.replace(/\W+/g, "")}`, { x: 0, y: 0, width: 480, height: size.height });
        await hoverSpine(page);
        await shot(page, `hover-${size.width}x${size.height}-${route.replace(/\W+/g, "")}`, { x: 0, y: 0, width: 480, height: size.height });
        await page.mouse.move(700, 400);
        n++;
      }
    }
    expect(n).toBe(4);
  });

  test("MSP2.1 keyboard: Tab reaches the spine after the nav and before Feedback; focus tips it and shows the label; Escape hides it", async ({ page }) => {
    await onRail(page);
    await breaks(page);
    for (const size of SIZES) {
      await openRoute(page, "/queries", size);
      await page.locator('.wsr-nav [data-go="tasks"]').focus();
      await page.keyboard.press("Tab");
      const on = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("data-ms"));
      expect(on, "Tab from the last nav row lands on the spine").toBe("spine");
      await page.waitForTimeout(400);
      const r = await read(page);
      const ring = await page.evaluate(() => { const s = getComputedStyle(document.activeElement!); return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`; });
      console.log(`[MSP2.1] ${size.width}×${size.height}`, ring, r.transform, r.label.shown);
      expect(ring, "the ref's 2px #9db7d8 ring").toBe("solid 2px rgb(157, 183, 216)");
      expect(r.transform, "focused, it tips").not.toBe("none");
      expect(r.label.shown, "focused, the label shows").toBe(true);
      await shot(page, `focus-${size.width}x${size.height}`, { x: 0, y: 0, width: 480, height: size.height });
      await page.keyboard.press("Escape");
      expect((await read(page)).label.shown, "Escape hides it").toBe(false);
      await page.keyboard.press("Tab");
      const next = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute("data-probe"));
      expect(next, "then Feedback").toBe("feedback-rail");
    }
  });

  test("MSP3 reduced motion: no running transition or animation on the tilt or the label", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await onRail(page);
    await breaks(page);
    await openRoute(page, "/queries", SIZES[0]);
    await liftMotionSuppression(page);
    await page.locator('.wsr [data-ms="spine"]').hover();
    await page.waitForTimeout(30);
    const r = await page.evaluate(() => {
      const spine = document.querySelector(".wsr .ms-spine")!;
      const label = document.querySelector(".ms-label")!;
      return {
        spineAnims: spine.getAnimations().length, labelAnims: label.getAnimations().length,
        spineDur: getComputedStyle(spine).transitionDuration, labelAnim: getComputedStyle(label).animationName,
        transform: getComputedStyle(spine).transform, labelOpacity: getComputedStyle(label).opacity,
      };
    });
    console.log("[MSP3]", JSON.stringify(r));
    expect.soft(r.transform, "the end position, at once").not.toBe("none");
    expect.soft(r.spineAnims, "no transition running on the spine").toBe(0);
    expect.soft(r.labelAnims, "no animation running on the label").toBe(0);
    expect.soft(r.labelOpacity, "the label is fully there at once").toBe("1");
  });

  test("MSP4 one manuscript: a click opens its page and no menu opens; M does the same", async ({ page }) => {
    const restore = await keepOnly(1);
    try {
      await onRail(page);
      await openRoute(page, "/queries", SIZES[0]);
      const spine = page.locator('.wsr [data-ms="spine"]');
      await expect(spine).toHaveCount(1);
      expect(await spine.getAttribute("aria-haspopup"), "no menu to pop").toBeNull();
      await spine.click();
      await page.waitForTimeout(800);
      const url = page.url();
      const r = await read(page);
      console.log("[MSP4] after click", url, "menus open", r.menuOpen, "menus in DOM", await page.locator(".ws-ms-menu--port").count());
      expect(url, "the manuscript's own page").toMatch(/\/manuscripts\?(.*&)?m=[\w-]+/);
      expect(r.menuOpen, "no menu open").toBe(0);
      await openRoute(page, "/queries", SIZES[0]);
      /* no click to clear focus: a click on /queries opens a query, and M stands down while a panel is open */
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      console.log("[MSP4] before M", JSON.stringify(await page.evaluate(() => ({
        active: document.activeElement?.tagName, dialogs: document.querySelectorAll('[role="dialog"], [aria-modal="true"]').length,
        /* shortcuts.ts modalOpen(): what M's guard sees (shortcut guard, 16 Nov: an inert / aria-hidden one is not counted) */
        modal: [...document.querySelectorAll<HTMLElement>('[aria-modal="true"], dialog[open]')]
          .filter((e) => e.getBoundingClientRect().width > 0 && !e.closest('[inert], [aria-hidden="true"]'))
          .map((e) => `${e.tagName}.${e.className}`.slice(0, 120)),
        spineW: document.querySelector<HTMLElement>('.wsr [data-ms="spine"]')?.getBoundingClientRect().width ?? null,
        inert: !!document.querySelector('.wsr [data-ms="spine"]')?.closest("[inert]"),
      }))));
      await page.keyboard.press("m");
      await page.waitForTimeout(800);
      console.log("[MSP4] after M", page.url());
      expect(page.url(), "M opens the page too").toMatch(/\/manuscripts\?(.*&)?m=[\w-]+/);
      expect((await read(page)).menuOpen).toBe(0);
    } finally { await restore(); }
  });

  test("MSP5 two manuscripts: a click opens the menu, standing on the spine's foot, inside the window", async ({ page }) => {
    const restore = await keepOnly(2);
    try {
      await onRail(page);
      for (const size of SIZES) {
        await openRoute(page, "/queries", size);
        await page.locator('.wsr [data-ms="spine"]').click();
        await page.waitForTimeout(400);
        const r = await read(page);
        console.log(`[MSP5] ${size.width}×${size.height}`, JSON.stringify({ menu: r.menu, spineFoot: r.btn.bottom, btnRight: r.btn.right, label: r.label.shown }));
        expect(r.menuOpen, "the menu is open").toBe(1);
        const m = r.menu!;
        expect(Math.abs(m.bottom - r.btn.bottom), "its bottom is level with the spine's foot").toBeLessThanOrEqual(2);
        expect(Math.abs(m.left - r.btn.right - 10), "10px right of the spine's button").toBeLessThanOrEqual(1);
        expect(m.top, "inside the window's top").toBeGreaterThanOrEqual(8);
        expect(m.bottom).toBeLessThanOrEqual(r.vh);
        expect(m.right).toBeLessThanOrEqual(r.vw);
        expect(r.label.shown, "no label while the menu is open").toBe(false);
        expect(r.transform, "tipped while open").not.toBe("none");
        await shot(page, `menu-two-${size.width}x${size.height}`, { x: 0, y: 0, width: 520, height: size.height });
        await page.keyboard.press("Escape");
      }
    } finally { await restore(); }
  });

  test("MSP6 a 600px-tall window: the spine shortens, stays at least 72px, and overlaps neither the nav nor Feedback", async ({ page }) => {
    await onRail(page);
    await breaks(page);
    await openRoute(page, "/queries", { width: 1280, height: 600 });
    const r = await read(page);
    console.log("[MSP6]", JSON.stringify({ spineH: r.spineH, btn: r.btn, nav: r.nav, fb: r.fb, navScrolls: await page.evaluate(() => { const n = document.querySelector<HTMLElement>(".wsr-nav")!; return n.scrollHeight > n.clientHeight + 1; }) }));
    expect.soft(r.spineH, "shorter than 152").toBeLessThan(152);
    expect.soft(r.spineH, "at least 72").toBeGreaterThanOrEqual(72);
    expect.soft(r.btn.top, "below the nav").toBeGreaterThanOrEqual(r.nav.bottom);
    expect.soft(r.shelf.bottom, "above Feedback").toBeLessThanOrEqual(r.fb.top);
    await shot(page, "short-1280x600", { x: 0, y: 0, width: 480, height: 600 });
    /* OBSERVATION ONLY (the report's "below 600px"): no assertion */
    for (const h of [540, 480]) {
      await page.setViewportSize({ width: 1280, height: h });
      await page.waitForTimeout(400);
      const o = await read(page);
      const nav = await page.evaluate(() => { const n = document.querySelector<HTMLElement>(".wsr-nav")!; return { sh: n.scrollHeight, ch: n.clientHeight }; });
      console.log(`[MSP6-obs] 1280×${h}`, JSON.stringify({ spineH: o.spineH, btnTop: o.btn.top, navBottom: o.nav.bottom, nav, shelfBottom: o.shelf.bottom, fbTop: o.fb.top, avBottom: await page.evaluate(() => document.querySelector(".wsr-av")!.getBoundingClientRect().bottom) }));
      await shot(page, `obs-1280x${h}`, { x: 0, y: 0, width: 480, height: h });
    }
  });

  test("MSP7 no manuscript: the empty spine, named Add a manuscript", async ({ page }) => {
    const restore = await keepOnly(0);
    try {
      await onRail(page);
      await openRoute(page, "/queries", SIZES[0]);
      const empty = page.locator('.wsr [data-ms="spine-empty"]');
      await expect(empty).toHaveCount(1);
      expect(await empty.getAttribute("aria-label")).toBe("Add a manuscript");
      const style = await empty.locator(".ms-spine").evaluate((e) => getComputedStyle(e).borderTopStyle);
      expect(style, "a dashed outline").toBe("dashed");
      await hoverSpine(page);
      const r = await read(page);
      console.log("[MSP7]", JSON.stringify({ label: r.label.text, transform: r.transform }));
      expect(r.label.text.trim()).toBe("Add your manuscript");
      expect(r.transform, "it tips like the cloth spine").not.toBe("none");
      await shot(page, "empty-1512x982", { x: 0, y: 0, width: 480, height: 982 });
    } finally { await restore(); }
  });
  /* the report's side-by-side: the ref's live demo hovered, beside the app hovered (MSP2's shot). Shots only. */
  test("MSP-shots the hovered spine beside the ref", async ({ page }) => {
    test.skip(!SHOTS, "set MSP_SHOTS");
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(`file://${resolve("design-refs/shell/manuscript-spine-v1.html")}`);
    await page.evaluate(() => document.fonts.ready);
    const live = page.locator("#live");
    await live.scrollIntoViewIfNeeded();
    await live.hover();
    await page.waitForTimeout(500);
    const demo = (await page.locator(".demo").boundingBox())!;
    await page.screenshot({ path: `${SHOTS}/ref-hover.png`, clip: { x: demo.x, y: demo.y, width: 480, height: demo.height } });
    const app = `${SHOTS}/hover-1512x982-queries.png`;
    expect(existsSync(app), "MSP2 wrote the app's hovered shot first").toBe(true);
    const b64 = (f: string) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
    await page.setContent(`<body style="margin:0;background:#fbf9f5;font:14px Georgia;display:flex;gap:24px;padding:16px;align-items:flex-start">
      <figure style="margin:0"><figcaption>Ref (design-refs/shell/manuscript-spine-v1.html, live demo, hovered)</figcaption><img src="${b64(`${SHOTS}/ref-hover.png`)}"></figure>
      <figure style="margin:0"><figcaption>App (/queries, 1512×982, collapsed rail, hovered)</figcaption><img style="height:${Math.round(demo.height)}px" src="${b64(app)}"></figure></body>`);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${SHOTS}/side-by-side-hover.png`, fullPage: true });
  });
});
