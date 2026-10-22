/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ MANUSCRIPTS v27 — MSV27: two containers, a book that opens, the Edit details field, the guide, Versions ══
 *
 * Ref: design-refs/manuscripts-v27/manuscripts-v27.html (hash-enrolled). Run at 1512 × 900 and 1280 × 800 on the
 * rendered page, signed in as the v21 harness's dedicated filled account (ms21Fixture.mjs), which nothing else uses.
 *
 * THE FIXTURE: seedManuscriptsV21.mjs --only filled (book: genre, age, words, logline, setting; no series, no pitch, no
 * synopsis), then `ms27Fixture.mjs` gives it a synopsis and clears the account's guide state. Both are put back in
 * `afterAll` (MS27_SEEDED=1 skips seeding, for a run known to write nothing).
 *
 * `MS27_MUTATE=<name>` injects one named break into the page, so each lock can be shown red without a rebuild:
 *   a1 re-mounts a versions section · a2 drops the in-card inset · a3 drops the narrow-card rule · a4 moves the strip's
 *   text · b1 stops the cover turning · b2 draws a dash row · b3 keeps the transitions under reduced motion ·
 *   c1 restores a "working copy" hint · c2 opens the form without the field · d1 marks the pitch done on the click ·
 *   d2 routes the pitch step to the book · e1 removes the Versions row
 *
 * A LOCK THAT FINDS NO SUBJECT HAS FAILED: every case asserts its population before its claim, and the floor case
 * refuses a run that asserted less than it claims.
 */
import { test, expect, type Page, type BrowserContext, type Browser } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { KILL_MOTION, KILL_MOTION_ID } from "./measure";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { FILLED_EMAIL, MS_ID, MS_TITLE, MS, QUERIES } from "./ms21Fixture.mjs";

test.setTimeout(240_000);
test.describe.configure({ mode: "serial" });

let asserts = 0;
const ck = (n = 1) => { asserts += n; };
const FLOOR = 110; /* v28: A4 retired (its 10 copy and alignment asserts moved to MSV28-F1 and msv28Smoke) */

const VPS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const MUTATE = process.env.MS27_MUTATE ?? "";
const CSS_MUT: Record<string, string> = {
  a2: ".ms27-bkx .ms27-mh{--ms27-ins:max(64px,calc((100cqw - 900px)/2))!important}",
  a3: "@container ms27 (max-width:1152px){.ms27 .ms27-bf{grid-template-columns:minmax(0,1fr) 1px 128px!important}.ms27-bf .ms27-wc,.ms27-bf .ms27-dv{display:flex!important}.ms27 .ms27-bf .ms27-cw{display:none!important}}",
  b1: ".ms27-bx.open .ms27-bx-cover{transform:none!important}",
  b3: "@media (prefers-reduced-motion:reduce){.ms27-bx-cover{transition:transform .9s!important}}",
};

const readPw = (): string => {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  for (const line of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.*)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no SA_E2E_PASSWORD");
};

const SEEDED = process.env.MS27_SEEDED === "1";
const run = (cmd: string) => execSync(cmd, { cwd: process.cwd(), stdio: "pipe", timeout: 240_000 });
const seed = () => { if (!SEEDED) { run("node tests/e2e/seedManuscriptsV21.mjs --only filled"); run("node tests/e2e/ms27Fixture.mjs"); } };

async function context(browser: Browser, baseURL: string, opts: { reducedMotion?: "reduce" } = {}): Promise<{ ctx: BrowserContext; page: Page }> {
  const port = new URL(baseURL).port || "443";
  const file = resolve(process.cwd(), `tests/e2e/.auth/${FILLED_EMAIL.split("@")[0]}-${port}.json`);
  const base = { viewport: { width: 1512, height: 900 }, baseURL, ...opts };
  if (existsSync(file)) {
    const ctx = await browser.newContext({ ...base, storageState: file });
    const page = await ctx.newPage();
    await assertLocalBundleIsDev();
    await page.goto("/manuscripts");
    if (await page.locator(".ws-window").first().waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false)) return { ctx, page };
    await ctx.close();
  }
  const ctx = await browser.newContext(base);
  const page = await ctx.newPage();
  await assertLocalBundleIsDev();
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(FILLED_EMAIL);
  await page.locator("#au-pw").fill(readPw());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await expect(page.locator(".ws-work").first()).toBeVisible({ timeout: 30_000 });
  await ctx.storageState({ path: file, indexedDB: true });
  return { ctx, page };
}

/** Open a route settled. `guide: false` (the default) stops the checklist opening by itself over the case. */
async function openAt(page: Page, route: string, vp: { width: number; height: number }, o: { motion?: boolean; guide?: boolean } = {}) {
  await page.setViewportSize(vp);
  await page.evaluate(([id, guide]) => {
    localStorage.setItem("scriptally_active_manuscript_id", id as string);
    if (guide) sessionStorage.removeItem("sa.guide.autoOpened"); else sessionStorage.setItem("sa.guide.autoOpened", "1");
    localStorage.removeItem("sa.guide.skipped.Manuscripts");
  }, [MS_ID, !!o.guide]);
  await page.goto(route);
  if (!o.motion) await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` });
  if (CSS_MUT[MUTATE]) await page.addStyleTag({ content: CSS_MUT[MUTATE] });
  await expect(page.locator(".ws-work").first()).toBeVisible({ timeout: 30_000 });
  const sel = route === "/manuscripts/versions" ? '[data-ms27="versions-header"]' : '[data-ms27="book"]';
  await page.waitForFunction((s) => [...document.querySelectorAll(s)].some((e) => e.getBoundingClientRect().height > 0), sel, { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  if (MUTATE === "a1") await page.evaluate(() => { const s = document.createElement("section"); s.setAttribute("data-ms21", "versions"); s.textContent = "What's landing"; document.querySelector(".ms27-bkp")?.appendChild(s); });
  if (MUTATE === "e1") await page.evaluate(() => document.querySelector('.ws-ni[aria-label="Versions"]')?.remove());
}

type R = { l: number; t: number; r: number; b: number; w: number; h: number };
const box = (page: Page, sel: string) => page.evaluate((s) => {
  const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } as R;
}, sel);
const near = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol;

/* the fixture's expected facts, derived from the one fixture file */
const mine = (QUERIES as { ms: string; status: string; steps: { status: string; day: string }[] }[]).filter((q) => q.ms === MS_ID);
const firstDay = mine.map((q) => q.steps[0].day).sort()[0];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const SINCE = ((d: string) => { const [y, m, dd] = d.split("-"); return `${Number(dd)} ${MONTHS[Number(m) - 1]} ${y}`; })(firstDay);
const AGENT_COURT = new Set(["Queried", "Partial Sent", "Full Sent", "Resubmitted"]);
const ASKED = new Set(["Partial Requested", "Full Requested", "Revise & Resubmit", "Offer"]);
const STATS = {
  sent: mine.length,
  askedForMore: mine.filter((q) => q.steps.some((s) => ASKED.has(s.status))).length,
  withAgents: mine.filter((q) => AGENT_COURT.has(q.status)).length,
};
const WORDS = (MS.wordCount as number).toLocaleString("en-GB");

let ctx: BrowserContext; let page: Page;
test.beforeAll(async ({ browser, baseURL }) => {
  seed();
  ({ ctx, page } = await context(browser, baseURL!));
});
test.afterAll(async () => {
  await ctx?.close();
  if (!SEEDED) { run("node tests/e2e/seedManuscriptsV21.mjs --only filled"); run("node tests/e2e/ms27Fixture.mjs --clean"); }
});

for (const vp of VPS) {
  const w = vp.width;

  test(`MSV27-A1 sections ${w}`, async () => {
    await openAt(page, "/manuscripts", vp);
    const r = await page.evaluate(() => {
      const kids = [...document.querySelectorAll(".ms27-bkp")].filter((e) => e.getBoundingClientRect().height > 0).flatMap((e) => [...e.children]);
      const root = document.querySelector('[data-ms27="page"]')!;
      /* v28 Part F: the coming-soon strip is the page foot (bar and two tiles) */
      const soon = root.querySelector(".ms28-foot");
      const outside = root.cloneNode(true) as HTMLElement;
      outside.querySelector(".ms28-foot")?.remove();
      return {
        kids: kids.map((k) => `${k.tagName}.${k.className}`),
        old: [...root.querySelectorAll('[data-ms21="versions"],[data-ms21="activity"],[data-ms21="materials"],[data-ms21="banner"],.ms21-vc,[data-probe="app-footer"]')].length,
        text: (root as HTMLElement).innerText,
        outside: outside.innerText,
        soon: !!soon,
      };
    });
    expect(r.soon, "the page foot exists").toBe(true); ck();
    expect(r.kids).toEqual(["SECTION.ms27-bkx", "DIV.ms28-foot"]); ck();
    expect(r.old, "an old section or a footer is on the page").toBe(0); ck();
    expect(r.text).not.toMatch(/What['’]s landing|Comparable|Recent activity/); ck();
    expect(r.outside, "Submission packages is named only in the page foot").not.toMatch(/Submission package/); ck();
  });

  test(`MSV27-A2 header ${w}`, async () => {
    await openAt(page, "/manuscripts", vp);
    const g = await page.evaluate(() => {
      const q = (s: string) => { const e = document.querySelector<HTMLElement>(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, h: r.height }; };
      const sec = document.querySelector<HTMLElement>(".ms27-bkx")!;
      /* a custom property holding a calc() reads back unresolved: resolve it on a probe's width */
      const tok = (n: string) => { const p = document.createElement("i"); p.style.cssText = `position:absolute;visibility:hidden;width:var(${n})`; sec.appendChild(p); const v = p.getBoundingClientRect().width; p.remove(); return v; };
      return {
        card: q(".ms27-bkx"), ey: q('[data-ms27="eyebrow"]'), title: q('[data-ms27="title"]'), by: q('[data-ms27="byline"]'),
        acts: q('[data-ms27="acts"]'), right: q('[data-ms27="right"]'), art: q('[data-ms27="art"]'),
        ts: tok("--hero-title-size"), gap: tok("--hero-act-gap"), tx: tok("--hero-text-x"),
      };
    });
    for (const k of ["card", "ey", "title", "by", "acts", "right", "art"] as const) { expect(g[k], k).toBeTruthy(); ck(); }
    const c = g.card!;
    /* H3: the stack — eyebrow 12 · 15 · title · 12 · byline 26 · act gap · actions */
    expect(near(g.title!.t - g.ey!.t, 27), `title ${g.title!.t - g.ey!.t} below the eyebrow`).toBe(true); ck();
    expect(near(g.title!.h, g.ts), `title ${g.title!.h} vs ${g.ts}`).toBe(true); ck();
    expect(near(g.by!.t - g.title!.b, 12), `byline ${g.by!.t - g.title!.b}`).toBe(true); ck();
    expect(near(g.acts!.t - g.by!.b, g.gap), `actions ${g.acts!.t - g.by!.b} vs ${g.gap}`).toBe(true); ck();
    /* H5 in the card: art 22 in, text at the hero's text column + 8 */
    expect(near(g.art!.l - c.l, 22), `art ${g.art!.l - c.l}`).toBe(true); ck();
    expect(near(g.ey!.l - c.l, g.tx + 8), `text ${g.ey!.l - c.l} vs ${g.tx + 8}`).toBe(true); ck();
    expect(near(g.title!.l, g.ey!.l), "title on the eyebrow's left").toBe(true); ck();
    /* the right card's right edge 40 inside the card */
    expect(near(c.r - g.right!.r, 40), `right inset ${c.r - g.right!.r}`).toBe(true); ck();
    /* the page's gutters: 24 compact (the sheet is compact at both widths) */
    const sheet = await box(page, ".msv12-wpg .wpg-scroll");
    expect(near(c.l - sheet!.l, 24, 1), `left gutter ${c.l - sheet!.l}`).toBe(true); ck();
  });

  test(`MSV27-A3 card ${w}`, async () => {
    await openAt(page, "/manuscripts", vp);
    const r = await page.evaluate(() => {
      const card = document.querySelector('[data-ms27="card"]')!;
      const vis = (e: Element) => e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== "none";
      return {
        rows: [...card.querySelectorAll("dd")].filter(vis).map((d) => [d.getAttribute("data-row"), (d as HTMLElement).innerText.trim()]),
        big: vis(card.querySelector('[data-ms27="words-big"]')!),
        bigText: (card.querySelector('[data-ms27="words-big"] b') as HTMLElement | null)?.innerText ?? null,
      };
    });
    const wantTop = [["genre", MS.genre], ["age", MS.ageCategory], ["status", "Querying"], ["since", SINCE]];
    if (w === 1512) {
      expect(r.rows).toEqual(wantTop); ck();
      expect(r.big, "the large count").toBe(true); ck();
      expect(r.bigText).toBe(WORDS); ck();
    } else {
      expect(r.rows).toEqual([...wantTop, ["words", WORDS]]); ck();
      expect(r.big, "no large figure on a narrow sheet").toBe(false); ck();
    }
  });

  /* MSV27-A4 (the coming-soon strip's alignment and copy) is retired by v28 Part F: MSV28-F1 measures the foot that
     replaced it, and v28/msv28Smoke.test.tsx locks its copy */
  test(`MSV27-B1 the book opens ${w}`, async () => {
    /* v28.1: "Read it all" is gone; View summary and the details card are the two ways in */
    for (const opener of ['[data-ms27="full"]', '[data-ms27="card"]']) {
      await openAt(page, "/manuscripts", vp, { motion: true });
      await page.locator(opener).click();
      await page.waitForTimeout(1800);
      const r = await page.evaluate(() => {
        const cover = document.querySelector<HTMLElement>(".ms27-bx-cover");
        const stage = document.querySelector<HTMLElement>(".ms27-bx-stage");
        if (!cover || !stage) return null;
        const m = new DOMMatrix(getComputedStyle(cover).transform);
        const s = stage.getBoundingClientRect();
        return { m11: m.m11, m13: m.m13, s: { l: s.left, t: s.top, r: s.right, b: s.bottom }, vw: innerWidth, vh: innerHeight, sy: document.scrollingElement!.scrollTop };
      });
      expect(r, `${opener} opened the book`).toBeTruthy(); ck();
      expect(r!.m11, `${opener}: cover rotateY(-180) → m11 ${r!.m11}`).toBeLessThan(-0.99); ck();
      expect(r!.s.l >= 0 && r!.s.t - 52 >= 0 && r!.s.r <= r!.vw && r!.s.b <= r!.vh, `spread fits ${JSON.stringify(r!.s)}`).toBe(true); ck();
      expect(r!.sy).toBe(0); ck();
      await page.keyboard.press("Escape");
      await page.waitForFunction(() => !document.querySelector(".ms27-bx"), null, { timeout: 5000 });
      const back = await page.evaluate((s) => document.activeElement === document.querySelector(s), opener);
      expect(back, `focus back on ${opener}`).toBe(true); ck();
    }
  });

  test(`MSV27-B2 rows ${w}`, async () => {
    await openAt(page, "/manuscripts", vp);
    await page.locator('[data-ms27="full"]').click();
    await page.waitForSelector(".ms27-bx-r", { state: "attached" });
    if (MUTATE === "b2") await page.evaluate(() => { const d = document.createElement("div"); d.className = "ms27-bx-r"; d.setAttribute("data-row", "dash"); d.innerHTML = "<dt>Dash</dt><dd>—</dd>"; document.querySelector(".ms27-bx-dl")!.appendChild(d); });
    const rows = await page.evaluate(() => [...document.querySelectorAll(".ms27-bx-r")].map((r) => [r.getAttribute("data-row"), (r.querySelector("dd") as HTMLElement).textContent!.trim()]));
    expect(rows.length, "rows drawn").toBeGreaterThan(3); ck();
    /* v28 Part B: Series is always a row ("Standalone" when unset) and Setting is gone */
    expect(rows.find((r) => r[0] === "series")?.[1], "the fixture states no series: Standalone").toBe("Standalone"); ck();
    expect(rows.filter((r) => /^[—–-]$/.test(r[1] ?? "")), "a dash row").toEqual([]); ck();
    expect(rows.map((r) => r[0])).not.toContain("setting"); ck();
    const stats = await page.evaluate(() => [...document.querySelectorAll('[data-ms27bx="stats"] b')].map((b) => Number(b.textContent)));
    expect(stats).toEqual([STATS.sent, STATS.askedForMore, STATS.withAgents]); ck();
    await page.keyboard.press("Escape");
  });

  test(`MSV27-B3 reduced motion ${w}`, async ({ browser, baseURL }) => {
    const { ctx: rc, page: rp } = await context(browser, baseURL!, { reducedMotion: "reduce" });
    try {
      await openAt(rp, "/manuscripts", vp, { motion: true });
      await rp.locator('[data-ms27="full"]').click();
      await rp.waitForTimeout(50);
      const r = await rp.evaluate(() => {
        const c = document.querySelector<HTMLElement>(".ms27-bx-cover");
        const i = document.querySelector<HTMLElement>(".ms27-bx-in");
        return c && i ? { m11: new DOMMatrix(getComputedStyle(c).transform).m11, op: Number(getComputedStyle(i).opacity) } : null;
      });
      expect(r, "the book is on screen").toBeTruthy(); ck();
      expect(r!.m11, `cover already turned: m11 ${r!.m11}`).toBeLessThan(-0.99); ck();
      expect(r!.op, "the text already shown").toBe(1); ck();
    } finally { await rc.close(); }
  });

  test(`MSV27-C1 copy ${w}`, async () => {
    await openAt(page, "/manuscripts", vp);
    const pageText = await page.locator('[data-ms27="page"]').innerText();
    await page.locator('[data-ms27="full"]').click();
    await page.waitForSelector(".ms27-bx-pg", { state: "attached" });
    const bookText = await page.locator(".ms27-bx").evaluate((e) => e.textContent ?? "");
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".ms27-bx"));
    await page.locator('[data-ms27="edit"]').click();
    await page.waitForSelector('[data-ms21="edit-dialog"]');
    if (MUTATE === "c1") await page.evaluate(() => { document.querySelector('[data-ms21="synopsis-hint"]')!.textContent = "Your working copy, kept with the manuscript."; });
    const formText = await page.locator('[data-ms21="edit-dialog"]').innerText();
    for (const [n, t] of [["page", pageText], ["book", bookText], ["form", formText]] as const) {
      expect(t.length, `${n} has text`).toBeGreaterThan(40); ck();
      expect(t, `${n}`).not.toMatch(/working (copy|synopsis)/i); ck();
    }
    expect(await page.locator('[data-ms21="pitch-hint"]').innerText()).toBe("What you’d say if someone asked what your book’s about: the hook, then the stakes and what makes it yours. Keep it on the tip of your tongue. You never know when the right person might ask."); ck();
    expect(await page.locator('[data-ms21="synopsis-hint"]').innerText()).toBe("The whole story in brief, ending included."); ck();
    await page.keyboard.press("Escape");
  });

  test(`MSV27-C2 opens on the field ${w}`, async () => {
    await openAt(page, "/manuscripts", vp);
    await page.locator('[data-ms27="full"]').click();
    await page.locator('[data-ms27bx="none-elevatorPitch"] button').click();
    await page.waitForSelector('[data-ms21="edit-dialog"]');
    await page.waitForTimeout(400);
    if (MUTATE === "c2") await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    const r = await page.evaluate(() => {
      const ta = document.querySelector("#ms21-f-pitch");
      const sect = document.querySelector<HTMLElement>('[data-ms21-sect="elevatorPitch"]')!.getBoundingClientRect();
      /* v28 Part A: the form is the drawer's scrolling body */
      const modal = document.querySelector<HTMLElement>('[data-hdr="ms-edit"] [data-hdr="body"]')!.getBoundingClientRect();
      return { focused: document.activeElement === ta, book: !!document.querySelector(".ms27-bx"), inView: sect.top >= modal.top - 1 && sect.bottom <= modal.bottom + 1 };
    });
    expect(r.book, "the book closed first").toBe(false); ck();
    expect(r.focused, "the pitch field has focus").toBe(true); ck();
    expect(r.inView, "its section is in the form's visible area").toBe(true); ck();
    await page.keyboard.press("Escape");
  });

  test(`MSV27-D2 steps open the form, never the book ${w}`, async () => {
    for (const [i, sect] of [[1, "logline"], [2, "elevatorPitch"], [3, "synopsis"]] as const) {
      await openAt(page, "/manuscripts", vp);
      await page.locator('[data-pck="pill"]').click();
      await page.locator('[data-pck="item"]').nth(i).locator("button").first().click();
      if (MUTATE === "d2" && sect === "elevatorPitch") await page.locator('[data-ms27="full"]').click({ force: true }).catch(() => {});
      await page.waitForSelector('[data-pck="flow"] [data-pck="dim"][data-hole]', { timeout: 10_000 });
      await page.waitForTimeout(300);
      const r = await page.evaluate((s) => {
        const hole = JSON.parse(document.querySelector('[data-pck="flow"] [data-pck="dim"]')!.getAttribute("data-hole")!);
        const e = document.querySelector<HTMLElement>(`[data-ms21-sect="${s}"]`)!.getBoundingClientRect();
        return { hole, e: { l: e.left, t: e.top, w: e.width, h: e.height }, book: !!document.querySelector(".ms27-bx"), form: !!document.querySelector('[data-ms21="edit-dialog"]') };
      }, sect);
      expect(r.form, `step ${i + 1} opened Edit details`).toBe(true); ck();
      expect(r.book, `step ${i + 1} opened the book`).toBe(false); ck();
      expect(near(r.hole.left, r.e.l - 8, 1.5) && near(r.hole.top, r.e.t - 8, 1.5) && near(r.hole.width, r.e.w + 16, 1.5),
        `hole ${JSON.stringify(r.hole)} around ${JSON.stringify(r.e)}`).toBe(true); ck();
      await page.locator('[data-ms21="cancel"]').click();
      await expect(page.locator('[data-pck="flow"]')).toHaveCount(0); ck();
    }
  });

  test(`MSV27-E1 versions ${w}`, async () => {
    await openAt(page, "/manuscripts", vp);
    const row = await page.evaluate(() => {
      const r = document.querySelector<HTMLElement>('.ws-ni[aria-label="Versions"]');
      return r ? { pro: !!r.querySelector('[data-shell="pro"]'), text: r.innerText } : null;
    });
    expect(row, "a Versions row in the sidebar").toBeTruthy(); ck();
    expect(row!.pro, "its PRO tag").toBe(true); ck();
    const tab = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".ws-ftsib")].some((e) => e.getBoundingClientRect().width > 0 && (e.getAttribute("aria-label") === "Versions" || e.textContent === "Versions")));
    expect(tab, "Versions in the Materials tabs").toBe(true); ck();
    await openAt(page, "/manuscripts/versions", vp);
    expect(await page.locator('[data-ms27="versions-header"] [data-ms27="eyebrow"]').innerText()).toMatch(/Versions/i); ck();
    expect(await page.locator('[data-ms27="versions-header"] h1').innerText()).toBe(MS_TITLE); ck();
    expect(await page.locator('[data-ms21="versions"]').count()).toBe(1); ck();
    expect(await page.locator('[data-ms27="new-version"]').innerText()).toBe("+ New version"); ck();
    expect(await page.locator('[data-ms27="how-versions"]').innerText()).toBe("How version tracking works"); ck();
  });
}

/* D1 runs once, at 1512: it saves to the account, and the restore runs in afterAll */
test("MSV27-D1 done is read from the save", async () => {
  await openAt(page, "/manuscripts", VPS[0], { guide: true });
  const count = () => page.locator('[data-pck="count"]').innerText();
  await expect(page.locator('[data-pck="pill"]')).toBeVisible({ timeout: 15_000 });
  expect(await count()).toBe("3 of 4"); ck();
  /* a step started and cancelled stays undone */
  if (!(await page.locator('[data-pck="popover"]').isVisible())) await page.locator('[data-pck="pill"]').click();
  await page.locator('[data-pck="item"][data-k="pitch"] button').first().click();
  await page.waitForSelector('[data-ms21="edit-dialog"]');
  if (MUTATE === "d1") await page.evaluate(() => document.querySelector('[data-pck="count"]')!.textContent = "Learned ✓");
  await page.locator('[data-ms21="cancel"]').click();
  await page.waitForTimeout(500);
  expect(await count(), "cancelled: still 3 of 4").toBe("3 of 4"); ck();
  /* typed and saved: learned */
  await page.locator('[data-pck="pill"]').click();
  await page.locator('[data-pck="item"][data-k="pitch"] button').first().click();
  await page.locator("#ms21-f-pitch").fill("A ferry skipper races the tide to bring his brother home.");
  await page.locator('[data-ms21="save"]').click();
  await expect(page.locator('[data-pck="pill"]')).toHaveAttribute("data-state", "done", { timeout: 15_000 }); ck();
  expect(await count()).toBe("✓"); ck();
  expect(await page.locator('[data-pck="pill"]').innerText()).toMatch(/Manuscripts:\s*Learned/); ck();
});

test("MSV27 floor", () => {
  expect(asserts, `asserted ${asserts}, claims ${FLOOR}`).toBeGreaterThanOrEqual(FLOOR);
});
