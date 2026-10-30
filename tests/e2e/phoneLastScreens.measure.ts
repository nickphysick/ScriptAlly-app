/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PLS1 — the last screens on phones v1 (30 Oct; ref design-refs/phone-last-screens-v1/).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port>   this build (dev mode: `#/throw-lab` and `#/onb-lab` are dev-only)
 *   PLS1_BASE_URL=http://127.0.0.1:<port>     the build before the pack, for L11
 *   PLS1_MUTATE=<lock>                        that lock's named break, to prove it goes red
 *   PLS1_READINGS=<file>                      one JSON line of readings per lock
 *
 * The lab cases (L1, L2, L3) need no sign-in; the app cases sign in through `openPhone` (pa2Lib).
 * ⚠️ EVERY LOCK ASSERTS ITS POPULATION FIRST. A census over nothing passes.
 */
import { test, expect, type Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { PHONES, colourSweep, imageSweep, openPhone } from "./pa2Lib";
import { openRoute } from "./measure";

const MUTATE = process.env.PLS1_MUTATE ?? "";
const BEFORE = process.env.PLS1_BASE_URL ?? "";
const READINGS = process.env.PLS1_READINGS ?? "";
const origin = () => (test.info().project.use.baseURL as string).replace(/\/$/, "");
const record = (lock: string, data: unknown) => { if (READINGS) appendFileSync(READINGS, JSON.stringify({ lock, mutate: MUTATE || null, data }) + "\n"); };

const BREAK: Record<string, string> = {
  L1: "@media (max-width: 767.98px) { .sf--account .ws-ftsibs { display: flex !important; } }",
};

async function lab(page: Page, hash: string, vp: { width: number; height: number }, base = origin()) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("about:blank");
  await page.goto(`${base}/${hash}`, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  if (BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
  await page.waitForTimeout(800);
}

test.describe("PLS1 the last screens on phones", () => {
  test("L1 account screens show one tab, nothing clipped at 320/360, no small capitals", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of [...PHONES, { width: 320, height: 700 }]) for (const s of ["signin", "signup", "reset", "reset-sent"]) {
      await lab(page, `#/onb-lab?s=${s}`, vp);
      rows.push({ vp: vp.width, s, ...(await page.evaluate(() => {
        const shown = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none";
        const tabs = [...document.querySelectorAll(".sf--account .ws-ftab, .sf--account .ws-ftsib")].filter(shown).length;
        const label = shown(document.querySelector(".sf--account .ws-ftg"));
        const caps: string[] = []; const clipped: string[] = []; let n = 0;
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t: Node | null;
        while ((t = tw.nextNode())) {
          const el = t.parentElement; if (!el || !t.textContent?.trim() || el.closest(".ws-beta, script, style")) continue;
          const r = el.getBoundingClientRect(); if (!r.width) continue; const cs = getComputedStyle(el); if (cs.visibility === "hidden") continue;
          n++;
          if (cs.textTransform === "uppercase" && parseFloat(cs.fontSize) < 14) caps.push(t.textContent.trim().slice(0, 20));
          if ((cs.overflow === "hidden" || cs.textOverflow === "ellipsis") && el.scrollWidth > el.clientWidth + 1) clipped.push(t.textContent.trim().slice(0, 20));
        }
        return { tabs, label, caps, clipped, n, overflow: document.documentElement.scrollWidth - innerWidth, frame: !!document.querySelector(".sf--account") };
      })) });
    }
    record("L1", rows);
    expect(rows.length).toBe(12);
    for (const r of rows as Array<Record<string, unknown>>) {
      expect(r.frame, `${r.s}: the account frame`).toBe(true);
      expect(r.n as number, `${r.s}: text measured`).toBeGreaterThan(5);
      expect(r.tabs, `${r.s} @${r.vp}: one tab`).toBe(1);
      expect(r.label, `${r.s} @${r.vp}: no "Your account" label`).toBe(false);
      expect(r.caps, `${r.s} @${r.vp}: small capitals`).toEqual([]);
      expect(r.clipped, `${r.s} @${r.vp}: clipped text`).toEqual([]);
      expect(r.overflow as number, `${r.s} @${r.vp}: sideways scroll`).toBeLessThanOrEqual(0);
    }
  });

  test("L2 the dead ends carry the band and pinned actions; each action fires its own handler", async ({ page }) => {
    const want: Record<string, string[]> = { "used-free": ["back", "byhand", "template"], "used-pro": ["back", "byhand"], unreadable: ["back", "byhand", "download"], unloaded: ["byhand", "restart"] };
    const rows: Record<string, unknown>[] = [];
    for (const vp of PHONES) for (const [s, acts] of Object.entries(want)) {
      await lab(page, `#/onb-lab?s=${s}`, vp);
      const shape = await page.evaluate(() => {
        const host = document.querySelector<HTMLElement>(".sf-foothost");
        return {
          band: document.querySelector('[data-sf="pband-step"]')?.textContent ?? null,
          pinned: !!host && host.childElementCount > 0 && Math.round(host.getBoundingClientRect().bottom) === innerHeight,
          acts: [...(host?.querySelectorAll<HTMLElement>("button[data-act], button.sf-link") ?? [])].map((b) => b.dataset.act ?? b.textContent?.trim() ?? ""),
        };
      });
      const fired: Record<string, string[]> = {};
      for (const a of acts) {
        await lab(page, `#/onb-lab?s=${s}`, vp);
        /* the break: two actions' labels swapped, so each press reaches the other's handler */
        if (MUTATE === "L2") await page.evaluate(() => { const bs = [...document.querySelectorAll<HTMLElement>(".sf-foothost button")]; if (bs.length > 1) { const a = bs[0].dataset.act, b = bs[1].dataset.act; if (b) bs[0].dataset.act = b; else delete bs[0].dataset.act; if (a) bs[1].dataset.act = a; else delete bs[1].dataset.act; } });
        const sel = a === "back" ? ".sf-foothost button:not([data-act])" : `.sf-foothost [data-act="${a}"]`;
        await page.locator(sel).first().click({ timeout: 10_000 });
        fired[a] = await page.evaluate(() => ((window as unknown as { __onbLab?: { calls: { name: string }[] } }).__onbLab?.calls ?? []).map((c) => c.name));
      }
      rows.push({ vp: vp.width, s, ...shape, fired });
    }
    record("L2", rows);
    expect(rows.length).toBe(8);
    for (const r of rows as Array<{ vp: number; s: string; band: string | null; pinned: boolean; fired: Record<string, string[]> }>) {
      expect(r.band, `${r.s}: the band`).toMatch(/^Step \d of \d$/);
      expect(r.pinned, `${r.s} @${r.vp}: actions pinned`).toBe(true);
      for (const [a, calls] of Object.entries(r.fired)) expect(calls.length, `${r.s} ${a}: one handler fired`).toBe(1);
      const names = Object.values(r.fired).map((c) => c[0]);
      expect(new Set(names).size, `${r.s}: each action its own handler`).toBe(names.length);
    }
  });

  test("L3 the error page renders on a forced error, with Reload, Go to Home and the feedback link", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of [...PHONES, { width: 1440, height: 900 }]) {
      await lab(page, "#/throw-lab", vp);
      if (MUTATE === "L3") await page.addStyleTag({ content: ".eb-page { background: #F5F0EA !important; } .eb-btn--home, .eb-tell { display: none !important; }" });
      const r = await page.evaluate(() => {
        const pg = document.querySelector<HTMLElement>('[data-eb="page"]');
        const box = pg?.getBoundingClientRect();
        const vis = (s: string) => { const e = document.querySelector<HTMLElement>(s); return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== "none"; };
        return {
          page: !!pg, bg: pg ? getComputedStyle(pg).backgroundColor : null, full: !!box && box.width === innerWidth && box.height === innerHeight,
          title: document.querySelector(".eb-h")?.textContent, titleFace: getComputedStyle(document.querySelector(".eb-h")!).fontFamily,
          reload: vis('[data-eb="reload"]'), home: vis('[data-eb="home"]'), tell: (document.querySelector<HTMLAnchorElement>('[data-eb="tell"]')?.getAttribute("href")) ?? null,
          tellShown: vis('[data-eb="tell"]'), colWidth: Math.round(document.querySelector(".eb-in")!.getBoundingClientRect().width),
        };
      });
      let homePath = "";
      if (r.home) { await page.click('[data-eb="home"]'); await page.waitForTimeout(300); homePath = await page.evaluate(() => location.pathname + location.hash); }
      rows.push({ vp: vp.width, ...r, homePath, gone: await page.locator('[data-eb="page"]').count() === 0 });
    }
    record("L3", rows);
    for (const r of rows as Array<Record<string, unknown>>) {
      expect(r.page, `@${r.vp}: the fallback rendered`).toBe(true);
      expect(r.bg, `@${r.vp}: shell ink`).toBe("rgb(27, 36, 51)");
      expect(r.full).toBe(true);
      expect(r.title).toBe("Something went wrong.");
      expect(String(r.titleFace)).toMatch(/Special Elite/);
      expect(r.reload).toBe(true);
      expect(r.home, `@${r.vp}: Go to Home`).toBe(true);
      expect(r.tellShown, `@${r.vp}: Tell us what happened`).toBe(true);
      expect(r.tell).toBe("/contact");
      expect(r.colWidth as number).toBeLessThanOrEqual(420);
      expect(r.homePath, "Go to Home lands on /dashboard").toBe("/dashboard");
      expect(r.gone, "the boundary resets").toBe(true);
    }
  });

  test("L4 the four addresses open the right section or tab on a phone; desktop routes unchanged", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    const cases: [string, string, string][] = [
      ["/queries/packages", "/manuscripts#packages", '[data-pa="ms-pkgs"]'],
      ["/manuscripts/comps", "/manuscripts#comps", "#comps"],
      ["/manuscripts/versions", "/manuscripts#versions", '[data-pa="ms-pro"]'],
      ["/todo/calendar", "/todo", '[data-pa="wk-day"]'],
    ];
    for (const vp of PHONES) {
      await openPhone(page, "/dashboard", vp);
      for (const [from, to, mark] of cases) {
        await page.goto(`${origin()}/dashboard`); await page.locator('[data-pa="band"]').first().waitFor();
        await page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, from);
        if (MUTATE === "L4") await page.evaluate((p) => history.replaceState({}, "", p), from);
        await page.waitForTimeout(1500);
        const r = await page.evaluate((m) => {
          const el = document.querySelector<HTMLElement>(m);
          const head = (el && el.id !== "comps" && el.dataset.pa !== "wk-day" ? el.previousElementSibling as HTMLElement : el) ?? null;
          const t = head?.getBoundingClientRect().top ?? null;
          return { at: location.pathname + location.hash, top: t, vh: innerHeight };
        }, mark);
        await page.goBack(); await page.waitForTimeout(500);
        const back = await page.evaluate(() => location.pathname);
        rows.push({ vp: vp.width, from, to, ...r, back });
      }
    }
    await openRoute(page, "/queries/packages", { width: 1440, height: 900 }); await page.waitForTimeout(800);
    const desk = await page.evaluate(() => location.pathname);
    record("L4", { rows, desk });
    expect(rows.length).toBe(8);
    for (const r of rows as Array<{ vp: number; from: string; to: string; at: string; top: number | null; vh: number; back: string }>) {
      expect(r.at, `${r.from} @${r.vp}`).toBe(r.to);
      expect(r.top, `${r.from} @${r.vp}: its section is on screen`).not.toBeNull();
      expect(r.top!, `${r.from} @${r.vp}: its section is near the top`).toBeGreaterThanOrEqual(0);
      expect(r.top!).toBeLessThan(r.vh * 0.6);
      expect(r.back, `${r.from} @${r.vp}: back returns to the opener`).toBe("/dashboard");
    }
    expect(desk, "the desktop route is unchanged").toBe("/queries/packages");
  });

  test("L5 the matcher tile on a phone opens the sheet; both doors reach their flows; desktop opens the matcher", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of PHONES) {
      await openPhone(page, "/import", vp);
      if (MUTATE === "L5") await page.evaluate(() => { const b = document.querySelector<HTMLElement>('[data-pa="imp-match"]'); b?.replaceWith(Object.assign(document.createElement("a"), { textContent: "x" })); });
      await page.locator('[data-pa="imp-match"]').click();
      await page.waitForTimeout(500);
      const sheet = await page.locator('[data-pa="imp-match-sheet"]').isVisible();
      const words = sheet ? await page.locator('[data-pa="imp-match-sheet"]').innerText() : "";
      const smartEnabled = sheet && await page.locator('[data-pa="imp-match-smart"]').isEnabled();
      const tplChooser = sheet ? await Promise.race([page.waitForEvent("filechooser", { timeout: 5000 }).then(() => true).catch(() => false), page.locator('[data-pa="imp-match-template"]').click().then(() => new Promise<boolean>(() => {}))]) : false;
      rows.push({ vp: vp.width, sheet, words: words.slice(0, 80), smartEnabled, tplChooser, matcher: await page.locator('[data-impm]').count() });
    }
    await openRoute(page, "/import", { width: 1440, height: 900 }); await page.waitForTimeout(600);
    await page.locator('[data-tile="match"] [data-act="match"]').click(); await page.waitForTimeout(500);
    const desk = await page.locator('[data-impg="matcher-view"]').count();
    record("L5", { rows, desk });
    for (const r of rows as Array<Record<string, unknown>>) {
      expect(r.sheet, `@${r.vp}: the sheet opens`).toBe(true);
      expect(String(r.words)).toContain("Matching columns works best on a computer.");
      expect(r.tplChooser, `@${r.vp}: Upload my sheet reaches the template upload`).toBe(true);
      expect(r.matcher, `@${r.vp}: the matcher stays shut on a phone`).toBe(0);
    }
    expect(desk, "the desktop tile still opens the matcher").toBe(1);
  });

  test("L10 colour laws and no image twice on this pack's phone screens", async ({ page }) => {
    const bad: string[] = []; let judged = 0;
    for (const vp of PHONES) {
      for (const s of ["signin", "signup", "reset", "used-free", "unreadable", "unloaded"]) {
        await lab(page, `#/onb-lab?s=${s}`, vp);
        const c = await colourSweep(page); judged += c.navy + c.blush; c.bad.forEach((b: string) => bad.push(`${s} ${b}`));
        for (const set of await imageSweep(page)) set.filter((x, i) => set.indexOf(x) !== i).forEach((x) => bad.push(`${s} image twice ${x}`));
      }
      await openPhone(page, "/import", vp);
      await page.locator('[data-pa="imp-match"]').click(); await page.waitForTimeout(400);
      const c = await colourSweep(page); judged += c.navy + c.blush; c.bad.forEach((b: string) => bad.push(`match ${b}`));
    }
    record("L10", { judged, bad });
    expect(judged).toBeGreaterThan(0);
    expect([...new Set(bad)]).toEqual([]);
  });

  test("L11 desktop unchanged at 1440 and 1280 on the touched lab screens (the error page exempt by name)", async ({ browser }) => {
    test.skip(!BEFORE, "PLS1_BASE_URL is required");
    const screens = ["signin", "signup", "reset", "used-free", "used-pro", "unreadable", "nothing", "unloaded", "import-page"];
    const rows: Record<string, unknown>[] = [];
    for (const [w, h] of [[1440, 900], [1280, 800]]) for (const s of screens) {
      const grab = async (base: string, broken: boolean) => {
        const ctx = await browser.newContext(); const p = await ctx.newPage();
        await p.setViewportSize({ width: w, height: h }); await p.emulateMedia({ reducedMotion: "reduce" });
        await p.goto(`${base}/#/onb-lab?s=${s}`); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(700);
        if (broken && MUTATE === "L11") await p.addStyleTag({ content: ".sf--account .ws-ftsibs { display: none !important; }" });
        const dom = await p.evaluate(() => document.body.innerHTML.replace(/ style="[^"]*"/g, ""));
        const png = await p.screenshot({ fullPage: true }); await ctx.close(); return { dom, png };
      };
      const A: Buffer[] = [], B: Buffer[] = []; let dom = true;
      for (let k = 0; k < 5; k++) { // the sign-up screen renders one of two byte-different frames on the same build
        const a = await grab(BEFORE, false), b = await grab(origin(), true);
        if (k === 0) dom = a.dom === b.dom;
        A.push(a.png); B.push(b.png);
        if (A.some((x) => B.some((y) => x.equals(y)))) break;
      }
      rows.push({ vp: w, s, dom, px: A.some((x) => B.some((y) => x.equals(y))) });
    }
    record("L11", rows);
    expect(rows.length).toBe(screens.length * 2);
    expect(rows.filter((r) => !r.dom || !r.px), "screens that changed at a desktop width").toEqual([]);
  });
});
