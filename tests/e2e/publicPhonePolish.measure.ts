/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PP1 — public pages on phones v1 (29 Oct; ref design-refs/public-phone-polish-v1/). The logged-out
 * site below 761px, and the proof that nothing at 761 and up moved.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port>   the build under test (logged-out pages need no sign-in;
 *                                             run with `--no-deps` to skip the sign-in setup)
 *   PP1_BASE_URL=http://127.0.0.1:<port>      the build BEFORE this pack, served beside it, for P1
 *   PP1_MUTATE=<lock>                         apply that lock's named break, to prove it goes red
 *   PP1_READINGS=<file>                       append each lock's readings as one JSON line
 *
 * P1 desktop unchanged · P2 no text under 12px · P3 no small capitals under 14px · P4 Contact and
 * About · P5 44px hit boxes that never overlap · P6 the sign-up tab is whole · P7 the phone menu ·
 * P8 auth follows the address · P9 no sideways scroll.
 *
 * ⚠️ EVERY LOCK ASSERTS ITS POPULATION BEFORE ITS CLAIM. A census over nothing passes; each one
 * states how many things it looked at, and fails on zero.
 */
import { test, expect, Page } from "@playwright/test";
import { appendFileSync } from "node:fs";
import { sampleHitBoxes, overlaps } from "./hitBoxes";

const MUTATE = process.env.PP1_MUTATE ?? "";
const BEFORE = process.env.PP1_BASE_URL ?? "";
/* Phone fixes v1: the phone projects now start from a cached SIGNED-IN session (playwright.config `phoneSession`);
   these are the logged-out public pages, so this file starts signed out. Signed in, the menu, the account tab and the
   sign-in route all draw the signed-in variants and P5–P9 measured the wrong page. */
test.use({ storageState: { cookies: [], origins: [] } });
const READINGS = process.env.PP1_READINGS ?? "";

const PAGES = ["/", "/pricing", "/about", "/contact", "/founders", "/terms", "/privacy", "/#/signup", "/#/login"];
const EXEMPT = ".mk-hc-pile, .mk-hp-fly, .mk-aplatetag";

/** Each lock's named break, injected as a style after load. P4, P7, P8 and P1 break by script below. */
const BREAK: Record<string, string> = {
  P2: ".mk-pvm .mk-pvtabsin button small{font-size:8.6px!important}",
  P3: ".mk-ccpill{text-transform:uppercase!important;font-size:10.5px!important;letter-spacing:.16em!important}",
  P5: ".mk-footcol ul{gap:12px!important}.mk-footcol button{min-height:0!important}",
  P6: ".sf--account .ws-ftg{display:inline!important}",
  P9: ".mk-footinner{min-width:520px!important}",
};

function record(lock: string, data: unknown) {
  if (READINGS) appendFileSync(READINGS, JSON.stringify({ lock, mutate: MUTATE || null, data }) + "\n");
}

/** `breakIt` false opens the page clean whatever PP1_MUTATE says — P1's before-build is never broken. */
async function open(page: Page, url: string, w: number, h: number, breakIt = true) {
  const M = breakIt ? MUTATE : "";
  await page.setViewportSize({ width: w, height: h });
  await page.emulateMedia({ reducedMotion: "reduce" });
  /* A live count, so the counters and the join bar render — their text is part of the census. */
  await page.route("**/api/waitlist*", (r) => r.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({ visible: true, cap: 50, count: 12 }),
  }));
  if (M === "P8") {
    /* The listener removed: nothing below the window hears the address move. */
    await page.addInitScript(() => window.addEventListener("hashchange", (e) => e.stopImmediatePropagation(), true));
  }
  await page.goto(url, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}" });
  if (BREAK[M]) await page.addStyleTag({ content: BREAK[M] });
  if (M === "P1") {
    /* The media query dropped: two of this pack's phone rules applied at every width. */
    await page.addStyleTag({ content: ".mk-footgrid{grid-template-columns:1fr 1fr!important}.mk-cbtn{background:#2a3a52!important}" });
  }
  await page.waitForTimeout(700);
}

/** Counts the pixels two screenshots disagree on (any channel off by more than 2), with their bounds. */
async function pixelDiff(page: Page, a: Buffer, b: Buffer) {
  return page.evaluate(async ([a64, b64]) => {
    const load = (s: string) => new Promise<HTMLImageElement>((r) => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + s; });
    const [ia, ib] = await Promise.all([load(a64), load(b64)]);
    if (ia.width !== ib.width || ia.height !== ib.height) return { n: -1, box: [ia.width, ia.height, ib.width, ib.height] };
    const px = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const x = c.getContext("2d")!; x.drawImage(i, 0, 0); return x.getImageData(0, 0, i.width, i.height).data; };
    const da = px(ia), db = px(ib);
    let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let k = 0; k < da.length; k += 4) {
      if (Math.abs(da[k] - db[k]) > 2 || Math.abs(da[k + 1] - db[k + 1]) > 2 || Math.abs(da[k + 2] - db[k + 2]) > 2) {
        n++; const p = k / 4, x = p % ia.width, y = Math.floor(p / ia.width);
        if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
      }
    }
    return { n, box: n ? [x0, y0, x1, y1] : null };
  }, [a.toString("base64"), b.toString("base64")] as const);
}

/** Walks the page so lazily-revealed parts (the join bar, the counters) have rendered, then returns. */
async function walk(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
      await new Promise((r) => setTimeout(r, 40));
    }
  });
}

test.describe("PP1 public pages on phones", () => {
  test("P1 desktop unchanged at 1440 × 900 and 1280 × 800 on all nine pages", async ({ browser, page }) => {
    test.skip(!BEFORE, "PP1_BASE_URL (the build before this pack) is required for P1");
    const base = process.env.SA_E2E_BASE_URL!;
    const rows: { vp: string; path: string; dom: boolean; px: boolean; diff: unknown }[] = [];
    for (const [w, h] of [[1440, 900], [1280, 800]]) {
      for (const path of PAGES) {
        const grab = async (origin: string, mutate: boolean) => {
          const ctx = await browser.newContext();
          const p = await ctx.newPage();
          await open(p, origin + path, w, h, mutate);
          const dom = await p.evaluate(() => document.body.innerHTML.replace(/ style="[^"]*"/g, "").replace(/-[A-Za-z0-9_-]{8}\.(js|css)/g, ""));
          const png = await p.screenshot({ fullPage: true });
          await ctx.close();
          return { dom, png };
        };
        /* ⚠️ PASS WHEN ANY CAPTURE OF THIS BUILD IS BYTE-IDENTICAL TO ANY CAPTURE OF THE BUILD BEFORE.
           Each side is captured up to three times. Measured: the build before, against ITSELF, differed
           on 2 of 18 captures in one run and 0 in the next, and the account frame's "Sign in" sibling
           tab renders its text two ways on that build alone (crop hashes 46c1fd39… and 60bd61fa…).
           That noise cannot hide a real change, because a changed page can never produce an
           identical image. Where nothing matches, the smallest diff is reported. The DOM comparison
           takes no retry. */
        const A: Buffer[] = [], B: Buffer[] = [];
        let a = await grab(BEFORE, false), b = await grab(base, true);
        A.push(a.png); B.push(b.png);
        const same = () => A.some((x) => B.some((y) => x.equals(y)));
        for (let k = 0; k < 2 && !same(); k++) {
          a = await grab(BEFORE, false); b = await grab(base, true); A.push(a.png); B.push(b.png);
        }
        let d: { n: number; box: unknown } = { n: 0, box: null };
        if (!same()) {
          d = { n: -1, box: null };
          for (const x of A) for (const y of B) {
            const e = await pixelDiff(page, x, y);
            if (e.n >= 0 && (d.n < 0 || e.n < d.n)) d = e;
          }
        }
        rows.push({ vp: `${w}x${h}`, path, dom: a.dom === b.dom, px: d.n === 0, diff: d });
      }
    }
    record("P1", rows);
    expect(rows.length).toBe(18);
    expect(rows.filter((r) => !r.dom || !r.px), "pages that changed at a desktop width").toEqual([]);
  });

  for (const lock of ["P2", "P3"] as const) {
    test(`${lock} ${lock === "P2" ? "no text under 12px" : "no small capitals under 14px"} at 360 and 390`, async ({ page }) => {
      const bad: string[] = []; let measured = 0;
      for (const w of [360, 390]) for (const path of PAGES) {
        await open(page, process.env.SA_E2E_BASE_URL + path, w, 800);
        await walk(page);
        const r = await page.evaluate(([ex, which]) => {
          const out: string[] = []; let n = 0;
          const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let t: Node | null;
          while ((t = tw.nextNode())) {
            const el = t.parentElement;
            if (!el || !t.textContent?.trim() || el.closest(ex) || el.closest("script,style,noscript,.mk-skip,.mk-trap")) continue;
            const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) continue;
            const cs = getComputedStyle(el); if (cs.visibility === "hidden") continue;
            n++;
            const fs = parseFloat(cs.fontSize);
            if (which === "P2" ? fs < 12 : cs.textTransform === "uppercase" && fs < 14) {
              out.push(`${el.className || el.tagName} ${fs}px "${t.textContent.trim().slice(0, 24)}"`);
            }
          }
          return { out, n };
        }, [EXEMPT, lock] as const);
        measured += r.n;
        r.out.forEach((o) => bad.push(`${w} ${path} ${o}`));
      }
      record(lock, { measured, bad });
      expect(measured, "text nodes measured").toBeGreaterThan(500);
      expect([...new Set(bad)]).toEqual([]);
    });
  }

  test("P4 Contact and About match the after state", async ({ page }) => {
    const base = process.env.SA_E2E_BASE_URL!;
    await open(page, base + "/contact", 390, 844);
    if (MUTATE === "P4") {
      await page.evaluate(() => { const w = document.querySelector(".mk-pvm--contact"); if (w) w.replaceWith(...w.childNodes); });
      await page.waitForTimeout(200);
    }
    const c = await page.evaluate(() => {
      const card = document.querySelector<HTMLElement>(".mk-pvm .mk-pvbox");
      const sheet = document.querySelector<HTMLElement>(".mk-sheet")!;
      const ways = [...document.querySelectorAll<HTMLElement>(".mk-way")];
      return {
        card: !!card,
        overlapsNavy: !!card && card.getBoundingClientRect().top < sheet.getBoundingClientRect().top,
        h1: card?.querySelector("h1")?.textContent ?? "",
        mail: !!card?.querySelector(".mk-cmail"),
        waysH2: document.querySelector(".mk-waysh")?.textContent ?? "",
        ways: ways.length,
        waysWhite: ways.filter((w) => getComputedStyle(w).backgroundColor === "rgb(255, 255, 255)").length,
        kickerShown: [...document.querySelectorAll<HTMLElement>(".mk-ckicker")].some((k) => k.getBoundingClientRect().height > 0),
        btn: getComputedStyle(document.querySelector(".mk-cbtn")!).backgroundColor,
      };
    });
    await open(page, base + "/about", 390, 844);
    const a = await page.evaluate(() => {
      const hero = document.querySelector<HTMLElement>(".mk-ahero")!;
      const bands = [...document.querySelectorAll<HTMLElement>(".mk-band")];
      const numShown = [...document.querySelectorAll<HTMLElement>(".mk-anum")].some((n) => n.getBoundingClientRect().height > 0);
      const notes = [...document.querySelectorAll<HTMLElement>(".mk-note")];
      return {
        heroBg: getComputedStyle(hero).backgroundColor,
        h1: getComputedStyle(hero.querySelector("h1")!).color,
        bands: bands.length,
        bandsWhite: bands.filter((b) => getComputedStyle(b).backgroundColor === "rgb(255, 255, 255)").length,
        numShown,
        notes: notes.length,
        noteWhite: notes.filter((n) => getComputedStyle(n).backgroundColor === "rgb(255, 255, 255)").length,
        noteHasHeading: !!notes[0]?.querySelector(".mk-noteh"),
      };
    });
    record("P4", { contact: c, about: a });
    expect(c.card, "Contact opens on a card").toBe(true);
    expect(c.overlapsNavy, "the card overlaps the navy").toBe(true);
    expect(c.h1).toBe("Get in touch.");
    expect(c.mail, "the email sits inside the card").toBe(true);
    expect(c.waysH2).toBe("How can we help?");
    expect(c.ways).toBe(3);
    expect(c.waysWhite, "each way is a white card").toBe(3);
    expect(c.kickerShown, "the Contact kicker is gone").toBe(false);
    expect(c.btn, "Send message is navy").toBe("rgb(42, 58, 82)");
    expect(a.heroBg, "About opens on the shell ink").toBe("rgb(27, 36, 51)");
    expect(a.h1, "its heading is white").toBe("rgb(255, 255, 255)");
    expect(a.bands).toBe(3);
    expect(a.bandsWhite, "three white point cards").toBe(3);
    expect(a.numShown, "no 01/02/03").toBe(false);
    expect(a.notes).toBe(1);
    expect(a.noteWhite, "the note is one white card").toBe(1);
    expect(a.noteHasHeading).toBe(true);
  });

  test("P5 footer, menu and account frame: every hit box at least 44 × 44, none overlapping", async ({ page }) => {
    const base = process.env.SA_E2E_BASE_URL!;
    const groups: Record<string, { n: number; small: string[]; over: string[] }> = {};
    const check = (name: string, boxes: Awaited<ReturnType<typeof sampleHitBoxes>>) => {
      groups[name] = {
        n: boxes.length,
        small: boxes.filter((b) => b.w < 44 || b.h < 44).map((b) => `${b.label} ${b.w}×${b.h}`),
        over: overlaps(boxes),
      };
    };
    for (const w of [360, 390]) {
      await open(page, base + "/", w, 800);
      check(`footer ${w}`, await sampleHitBoxes(page, "a, button", ".mk-foot"));
      await page.click(".mk-burger");
      await page.waitForSelector(".mk-navpanel");
      check(`menu ${w}`, await sampleHitBoxes(page, "a, button", ".mk-navwrap"));
      for (const h of ["/#/signup", "/#/login"]) {
        await open(page, base + h, w, 800);
        check(`account ${h} ${w}`, await sampleHitBoxes(page, "a, button", ".sf--account"));
      }
    }
    /* The other links the pack gave a 44px area, page by page: each at least 44 × 44, and none
       overlapping ANY control on its page (not only each other). */
    const LISTED = ".mk-vlink, .mk-ccmore, .mk-lsuit, .mk-cfine .mk-doclink, .mk-lg";
    for (const path of ["/", "/pricing", "/contact", "/founders"]) {
      await open(page, base + path, 390, 800);
      await walk(page);
      const listed = await sampleHitBoxes(page, LISTED, ".mk-scope");
      const all = await sampleHitBoxes(page, "a, button", ".mk-scope");
      const labels = new Set(listed.map((b) => b.label));
      groups[`links ${path}`] = {
        n: listed.length,
        small: listed.filter((b) => b.w < 44 || b.h < 44).map((b) => `${b.label} ${b.w}×${b.h}`),
        over: overlaps(all).filter((o) => [...labels].some((l) => o.startsWith(l + " ∩") || o.includes("∩ " + l + " ("))),
      };
    }
    record("P5", groups);
    for (const [name, g] of Object.entries(groups)) {
      expect(g.n, `${name}: controls sampled`).toBeGreaterThan(name.startsWith("menu") ? 6 : name.startsWith("links") ? 0 : 3);
      expect(g.small, `${name}: under 44 × 44`).toEqual([]);
      expect(g.over, `${name}: overlapping`).toEqual([]);
    }
  });

  test("P6 the account tab's name is whole at 320 and 360", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const w of [320, 360]) for (const h of ["/#/signup", "/#/login"]) {
      await open(page, process.env.SA_E2E_BASE_URL + h, w, 760);
      const r = await page.evaluate(() => {
        const nm = document.querySelector<HTMLElement>(".sf--account .ws-ftab .ws-ftnm")!;
        const tab = document.querySelector<HTMLElement>(".sf--account .ws-ftab")!.getBoundingClientRect();
        const tabs = document.querySelector<HTMLElement>(".sf--account .sf-tabs")!.getBoundingClientRect();
        const exit = document.querySelector<HTMLElement>(".sf--account .sf-exit")!.getBoundingClientRect();
        const n = nm.getBoundingClientRect();
        return {
          name: document.querySelector(".sf--account .ws-ftn")?.textContent,
          sw: nm.scrollWidth, cw: nm.clientWidth,
          nameRight: Math.round(n.right * 10) / 10, tabsRight: Math.round(tabs.right * 10) / 10, exitLeft: Math.round(exit.left * 10) / 10,
          meetsExit: tab.right > exit.left && tab.left < exit.right && tab.bottom > exit.top && tab.top < exit.bottom,
        };
      });
      rows.push({ w, h, ...r });
    }
    record("P6", rows);
    expect(rows.length).toBe(4);
    for (const r of rows) {
      expect(r.name === "Create account" || r.name === "Sign in").toBe(true);
      expect(r.sw as number, `${r.w} ${r.h}: name overflows its box`).toBeLessThanOrEqual(r.cw as number);
      expect(r.nameRight as number, `${r.w} ${r.h}: name clipped by the tab row`).toBeLessThanOrEqual(r.tabsRight as number);
      expect(r.meetsExit, `${r.w} ${r.h}: tab meets Back to site`).toBe(false);
    }
  });

  test("P7 the phone menu: six items in order, then the founding button to the founders flow", async ({ page }) => {
    await open(page, process.env.SA_E2E_BASE_URL + "/", 390, 844);
    await page.click(".mk-burger");
    await page.waitForSelector(".mk-navpanel");
    if (MUTATE === "P7") await page.evaluate(() => [...document.querySelectorAll(".mk-navpanel > button")].find((b) => b.textContent === "Founding writers")?.remove());
    const items = await page.$$eval(".mk-navpanel > button", (bs) => bs.map((b) => b.textContent?.trim()));
    const join = await page.$eval(".mk-navpanel .mk-navjoin", (b) => ({ t: b.textContent?.trim(), w: b.getBoundingClientRect().width, pw: (b.closest(".mk-navpanel") as HTMLElement).clientWidth }));
    await page.click(".mk-navpanel .mk-navjoin");
    await page.waitForURL(/\/founders$/);
    const landed = await page.evaluate(() => ({ path: location.pathname, hasForm: !!document.querySelector(".mk-fw input[type=email], .mk-fw form") }));
    record("P7", { items, join, landed });
    expect(items).toEqual(["Features", "About", "Pricing", "Founding writers", "Contact", "Log in"]);
    expect(join.t).toBe("Become a founding writer");
    expect(join.w, "full width").toBeGreaterThan(join.pw - 50);
    expect(landed.path).toBe("/founders");
  });

  test("P8 sign in and sign up follow the address with no reload", async ({ page }) => {
    await open(page, process.env.SA_E2E_BASE_URL + "/#/login", 390, 844);
    const read = () => page.evaluate(() => ({ auth: document.querySelector("[data-auth]")?.getAttribute("data-auth"), tab: document.querySelector(".ws-ftn")?.textContent }));
    const marks: unknown[] = [];
    await page.evaluate(() => { (window as unknown as { __pp: number }).__pp = 1; });
    const a = await read(); marks.push(a);
    await page.evaluate(() => { location.hash = "#/signup"; }); await page.waitForTimeout(400);
    const b = await read(); marks.push(b);
    await page.evaluate(() => { location.hash = "#/login"; }); await page.waitForTimeout(400);
    const c = await read(); marks.push(c);
    const noReload = await page.evaluate(() => (window as unknown as { __pp?: number }).__pp === 1);
    record("P8", { marks, noReload });
    expect(noReload, "no reload happened").toBe(true);
    expect(a).toEqual({ auth: "signin", tab: "Sign in" });
    expect(b).toEqual({ auth: "signup", tab: "Create account" });
    expect(c).toEqual({ auth: "signin", tab: "Sign in" });
  });

  test("P9 no sideways scroll at 320, 360, 390 and 430", async ({ page }) => {
    /* ⚠️ `scrollWidth` CANNOT SEE THIS ON THESE PAGES. `html:has(.mk-scope), body:has(.mk-scope)` carry
       `overflow-x: clip`, so the document never scrolls sideways whatever is wider than it — and the
       real failure becomes content CUT OFF at the right edge, silently. The first version of this lock
       read `scrollWidth` alone and stayed green under its own mutation (a 520px footer at 390): proved
       vacuous, then rewritten. It now asks for every element drawn past either edge of the viewport,
       except inside an ancestor of its own that deliberately clips or scrolls sideways (the perk rail,
       the sheet), and except fixed parts parked off screen (the join bar before it shows) and `.mk-sr`,
       the visually-hidden labels parked at −9999px on purpose. */
    const bad: string[] = []; let n = 0, els = 0;
    for (const w of [320, 360, 390, 430]) for (const path of PAGES) {
      await open(page, process.env.SA_E2E_BASE_URL + path, w, 800);
      await walk(page);
      const r = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth, out: string[] = []; let m = 0;
        const held = (e: Element) => {
          for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
            const ox = getComputedStyle(a).overflowX;
            if (ox !== "visible") return true;
          }
          return false;
        };
        for (const e of document.body.querySelectorAll("*")) {
          const rc = e.getBoundingClientRect();
          if (!rc.width || !rc.height) continue;
          m++;
          if (rc.right <= vw + 0.5 && rc.left >= -0.5) continue;
          if (e.closest("[aria-hidden='true'], .mk-skip, .mk-trap, .mk-jbar, .mk-sr")) continue;
          if (getComputedStyle(e).position === "fixed" || held(e)) continue;
          out.push(`${(e as HTMLElement).className || e.tagName} ${Math.round(rc.left)}..${Math.round(rc.right)}`);
        }
        return { out: out.slice(0, 5), m, sw: document.documentElement.scrollWidth, vw };
      });
      n++; els += r.m;
      if (r.sw > r.vw) bad.push(`${w} ${path} scrollWidth ${r.sw}>${r.vw}`);
      r.out.forEach((o) => bad.push(`${w} ${path} ${o}`));
    }
    record("P9", { n, els, bad });
    expect(n).toBe(36);
    expect(els, "elements measured").toBeGreaterThan(5000);
    expect(bad).toEqual([]);
  });
});
