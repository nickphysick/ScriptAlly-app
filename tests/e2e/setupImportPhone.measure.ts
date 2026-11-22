/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SIP1 — set-up and importing on phones v1 (30 Oct; ref design-refs/setup-import-phone-v1/). The
 * screens between sign-up and the dashboard, below 768px, on `#/onb-lab` (no sign-in, nothing written).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port>   this build (run `--no-deps`: the lab needs no sign-in)
 *   SIP1_BASE_URL=http://127.0.0.1:<port>     the build before the pack, for S11
 *   SIP1_MUTATE=<lock>                        that lock's named break, to prove it goes red
 *   SIP1_READINGS=<file>                      one JSON line of readings per lock
 *
 * ⚠️ EVERY LOCK ASSERTS ITS POPULATION FIRST. A census over nothing passes.
 */
import { test, expect, Page } from "@playwright/test";
import { appendFileSync } from "node:fs";

const MUTATE = process.env.SIP1_MUTATE ?? "";
const BEFORE = process.env.SIP1_BASE_URL ?? "";
const READINGS = process.env.SIP1_READINGS ?? "";
const origin = () => (test.info().project.use.baseURL as string).replace(/\/$/, "");
const PHONES = [{ width: 390, height: 844 }, { width: 360, height: 780 }];

/** The set-up screens that carry the frame's own steps, and the review screens that override them. */
const SETUP = ["welcome", "ack", "bookmore", "fork", "confirm", "overview"];
const REVIEW = ["review", "review&fx=clear", "review&fx=dupes", "review&fx=gate"];

const BREAK: Record<string, string> = {
  S1: ".sf--setup .sf-tabs{display:flex!important}",
  S2: ".sf .sf-lab{text-transform:uppercase!important;font-size:10px!important}",
  S3: ".sf .o9-panel .o9-slot{display:block!important}.sf .o9-wayslot{display:block!important}",
  S4: ".sf .sf-foothost{position:static!important}",
  S7: ".sf .im-swact{display:none!important}",
  S10: ".sf .o9-gomark{background:#4e7d60!important}",
};

function record(lock: string, data: unknown) {
  if (READINGS) appendFileSync(READINGS, JSON.stringify({ lock, mutate: MUTATE || null, data }) + "\n");
}

async function lab(page: Page, q: string, vp: { width: number; height: number }, o: { base?: string; clean?: boolean; motion?: boolean } = {}) {
  await page.setViewportSize(vp);
  await page.emulateMedia({ reducedMotion: o.motion ? "no-preference" : "reduce" });
  /* A goto that only repeats the hash does not reload, so the previous run's answers would carry over. */
  await page.goto("about:blank");
  await page.goto(`${o.base ?? origin()}/#/onb-lab?s=${q}`, { waitUntil: "load" });
  await page.waitForSelector(".sf, [data-import-lab]", { timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  if (!o.clean && BREAK[MUTATE]) await page.addStyleTag({ content: BREAK[MUTATE] });
  await page.waitForTimeout(600);
}

/** Answers every question on the review's agents and queries steps the same way at either width —
 *  the first escape answer where there is one, else the first pick, else the card's own button with
 *  any empty field filled — then imports, and returns what the review handed the import. */
async function finishReview(page: Page, phone: boolean): Promise<{ answered: number; result: string }> {
  let answered = 0;
  for (const step of ["agents", "queries"]) {
    for (let k = 0; k < 40; k++) {
      if (!(await page.locator('[data-im="deck"]').count())) break;
      if (phone && !(await page.locator('[data-im="q-layer"]').count())) {
        if (!(await page.locator('[data-im="deck-answer"]').count())) break;
        await page.click('[data-im="deck-answer"]'); await page.waitForTimeout(200);
      }
      const c = page.locator(phone ? '[data-im="q-layer"] [data-im="deck-card"]' : '[data-im="deck-card"]').first();
      if ((await c.getAttribute("data-answered")) === "1") {
        if (phone) break;
        const next = page.locator('[data-im="deck-next"]:enabled');
        if (await next.count()) { await next.click(); continue; } else break;
      }
      const esc = c.locator('.o9-esc .sf-link:not([data-im="deck-change"])');
      const pick = c.locator(".o9-pick, .im-choice");
      if (await esc.count()) await esc.first().click();
      else if (await pick.count()) await pick.first().click();
      else {
        const texts = c.locator('input[type="text"]');
        for (let t = 0; t < (await texts.count()); t++) if (!(await texts.nth(t).inputValue())) await texts.nth(t).fill("Penhallow Literary");
        const dates = c.locator('input[type="date"]');
        for (let t = 0; t < (await dates.count()); t++) if (!(await dates.nth(t).inputValue())) await dates.nth(t).fill("2024-04-15");
        /* The phone hides the card's own `.o9-ans > .sf-btn` and offers Save and next, which clicks it. */
        if (phone && (await page.locator('[data-im="q-save"]').count())) await page.click('[data-im="q-save"]');
        else await c.locator("button.sf-btn:visible").first().click();
      }
      answered++; await page.waitForTimeout(200);
    }
    if (step === "agents") { await page.click('[data-im="primary"]'); await page.waitForTimeout(300); }
  }
  await page.click('[data-im="primary"]'); await page.waitForTimeout(300);
  return { answered, result: await page.evaluate(() => JSON.stringify((window as unknown as { __onbLab?: { result?: unknown } }).__onbLab?.result ?? null)) };
}

test.describe("SIP1 set-up and importing on phones", () => {
  test("S1 the band shows the frame's own step count and name; no folder tab", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of PHONES) for (const s of SETUP) {
      await lab(page, s, vp);
      rows.push({ vp: vp.width, s, ...(await page.evaluate(() => {
        const steps = [...document.querySelectorAll(".sf-steps .sf-step")];
        const now = steps.findIndex((e) => e.classList.contains("sf-step--now"));
        const tabs = document.querySelector<HTMLElement>(".sf-tabs");
        return {
          band: document.querySelector('[data-sf="pband-step"]')?.textContent ?? null,
          name: document.querySelector('[data-sf="pband-name"]')?.textContent ?? null,
          want: `Step ${now + 1} of ${steps.length}`, wantName: steps[now]?.querySelector(".sf-steplab")?.textContent ?? null,
          segs: document.querySelectorAll(".sf-pbsegs i").length, n: steps.length,
          tabsShown: !!tabs && tabs.getBoundingClientRect().height > 0 && getComputedStyle(tabs).display !== "none",
        };
      })) });
    }
    record("S1", rows);
    expect(rows.length).toBe(12);
    for (const r of rows) {
      expect(r.n as number, `${r.s}: the frame has steps`).toBeGreaterThan(0);
      expect(r.band, `${r.s} @${r.vp}`).toBe(r.want);
      expect(r.name, `${r.s} @${r.vp}`).toBe(r.wantName);
      expect(r.segs, `${r.s}: one segment per step`).toBe(r.n);
      expect(r.tabsShown, `${r.s} @${r.vp}: folder tab visible`).toBe(false);
    }
  });

  test("S2 no small capitals under 14px on set-up and review screens, except BETA", async ({ page }) => {
    const bad: string[] = []; let n = 0;
    for (const vp of PHONES) for (const s of [...SETUP, ...REVIEW, "reading&hold=work", "importing&loop=1", "used-free", "unreadable", "nothing", "unloaded"]) {
      await lab(page, s, vp);
      const r = await page.evaluate(() => {
        const out: string[] = []; let m = 0;
        const tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let t: Node | null;
        while ((t = tw.nextNode())) {
          const el = t.parentElement; if (!el || !t.textContent?.trim() || el.closest(".ws-beta, .sa-betapill, script, style, .sf-panel, .sr-only")) continue;
          const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height) continue;
          const cs = getComputedStyle(el); if (cs.visibility === "hidden") continue;
          m++;
          if (cs.textTransform === "uppercase" && parseFloat(cs.fontSize) < 14) out.push(`${el.className || el.tagName} "${t.textContent.trim().slice(0, 24)}"`);
        }
        return { out, m };
      });
      n += r.m; r.out.forEach((o) => bad.push(`${vp.width} ${s} ${o}`));
    }
    record("S2", { n, bad });
    expect(n, "text nodes measured").toBeGreaterThan(800);
    expect([...new Set(bad)]).toEqual([]);
  });

  test("S3 Welcome's options start on the first screen; Your list fits about one phone height", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of PHONES) {
      await lab(page, "welcome", vp);
      const w = await page.evaluate(() => {
        const foot = document.querySelector(".sf-foothost")!.getBoundingClientRect();
        const opts = [...document.querySelectorAll<HTMLElement>(".sf-opt")].map((e) => { const r = e.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; });
        return { footTop: Math.round(foot.top), opts };
      });
      await lab(page, "fork", vp);
      const f = await page.evaluate(() => {
        const t = document.querySelector<HTMLElement>(".sf-title")!.getBoundingClientRect();
        const ways = [...document.querySelectorAll<HTMLElement>(".o9-way")].map((e) => e.getBoundingClientRect());
        return { title: Math.round(t.top), last: Math.round(ways[ways.length - 1]?.bottom ?? 0), n: ways.length };
      });
      rows.push({ vp: `${vp.width}x${vp.height}`, welcome: w, fork: f, forkSpan: f.last - f.title });
    }
    record("S3", rows);
    for (const r of rows as Array<{ vp: string; welcome: { footTop: number; opts: number[][] }; fork: { n: number }; forkSpan: number }>) {
      expect(r.welcome.opts.length, `${r.vp}: four options`).toBe(4);
      expect(r.welcome.opts[0][1], `${r.vp}: the first option ends above the pinned foot`).toBeLessThanOrEqual(r.welcome.footTop);
      expect(r.fork.n, `${r.vp}: three ways`).toBe(3);
      /* "About one phone height at 390 × 844" (the brief); 360 × 780 is reported, not held. */
      if (r.vp === "390x844") expect(r.forkSpan, `${r.vp}: title to the last card fits about one phone height`).toBeLessThanOrEqual(844 * 1.05);
    }
  });

  test("S4 the foot is pinned to the bottom at both scroll ends, and the last content clears it", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    for (const vp of PHONES) for (const s of ["bookmore&filled=1", "confirm", "overview", "review"]) {
      await lab(page, s, vp);
      const read = () => page.evaluate(() => {
        const host = document.querySelector<HTMLElement>(".sf-foothost");
        const space = [...document.querySelectorAll<HTMLElement>('[data-sf="footspace"]')].pop();
        const prev = space?.previousElementSibling as HTMLElement | null;
        return {
          has: !!host && host.childElementCount > 0, bottom: host ? Math.round(host.getBoundingClientRect().bottom) : null, vh: innerHeight,
          footTop: host ? Math.round(host.getBoundingClientRect().top) : null,
          lastBottom: space ? Math.round(space.getBoundingClientRect().top) : null, prevBottom: prev ? Math.round(prev.getBoundingClientRect().bottom) : null,
        };
      });
      const top = await read();
      await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(150);
      const end = await read();
      rows.push({ vp: vp.width, s, top, end });
    }
    record("S4", rows);
    expect(rows.length).toBe(8);
    for (const r of rows as Array<{ vp: number; s: string; top: Record<string, number | boolean | null>; end: Record<string, number | boolean | null> }>) {
      expect(r.top.has, `${r.s}: a pinned foot`).toBe(true);
      expect(r.top.bottom, `${r.s} @${r.vp} at the top`).toBe(r.top.vh);
      expect(r.end.bottom, `${r.s} @${r.vp} at the end`).toBe(r.end.vh);
      expect(r.end.prevBottom as number, `${r.s} @${r.vp}: the last content clears the foot`).toBeLessThanOrEqual(r.end.footTop as number);
    }
  });

  test("S5 the reading piles end on the overview's totals; no slips under reduced motion", async ({ page }) => {
    await lab(page, "reading&rows=28&speed=3", PHONES[0], { motion: true });
    const slipsMoving = await page.locator(".im-slip").count();
    await page.waitForSelector('[data-im="reading"][data-im-state="done"]', { timeout: 30_000 });
    const piles = await page.evaluate(() => [...document.querySelectorAll('[data-im^="pile-"]')].map((e) => Number(e.textContent)));
    await lab(page, MUTATE === "S5" ? "overview&fx=clear" : "overview", PHONES[0]);
    const totals = await page.evaluate(() => [...document.querySelectorAll('[data-im="card-agents"] [data-im="total"], [data-im="card-queries"] [data-im="total"]')].map((e) => Number(e.textContent)));
    await lab(page, "reading&rows=28&speed=3", PHONES[0]);
    const slipsReduced = await page.locator(".im-slip").count();
    record("S5", { piles, totals, slipsMoving, slipsReduced });
    expect(totals.length).toBe(2);
    expect(slipsMoving, "slips fall with motion on").toBeGreaterThan(0);
    expect(piles).toEqual(totals);
    expect(slipsReduced, "no slips under reduced motion").toBe(0);
  });

  test("S6 one question per screen answers the same deck through the same handlers", async ({ page }) => {
    /* Answers every question the same way at both widths: the first escape answer where there is one,
       else the first pick. Then continues to queries and imports, and compares what the review hands
       the import (`window.__onbLab.result`). */
    const drive = async (phone: boolean) => {
      await lab(page, "review", phone ? PHONES[0] : { width: 1440, height: 900 });
      if (MUTATE === "S6" && phone) await page.evaluate(() => document.addEventListener("click", (e) => { if ((e.target as HTMLElement).closest(".o9-ql .o9-esc")) e.stopImmediatePropagation(); }, true));
      const r = await finishReview(page, phone);
      expect(r.answered, `${phone ? "phone" : "desktop"}: questions answered`).toBeGreaterThan(1);
      return r.result;
    };
    const desk = await drive(false);
    const phone = await drive(true);
    record("S6", { deskLen: desk.length, phoneLen: phone.length, same: desk === phone });
    expect(desk, "the desktop deck reached the import").not.toBe("null");
    expect(phone, "the phone screens reached the import").toBe(desk);
  });

  test("S7 a left swipe on a ready row reveals Don't import; the row leaves with Undo", async ({ page }) => {
    await lab(page, "review&fx=clear", PHONES[0]);
    const face = page.locator('[data-row="agent"] [data-im="row-face"]').nth(1);
    const b = (await face.boundingBox())!;
    await page.mouse.move(b.x + b.width - 30, b.y + b.height / 2); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(b.x + b.width - 30 - i * 14, b.y + b.height / 2, { steps: 2 });
    await page.mouse.up(); await page.waitForTimeout(250);
    const btn = page.locator('[data-im="swipe"][data-open="1"] [data-im="swipe-remove"]');
    const shown = (await btn.count()) > 0 && await btn.isVisible();
    if (shown) await btn.click({ timeout: 5000 });
    await page.waitForTimeout(250);
    const out = await page.evaluate(() => ({ out: document.querySelectorAll('[data-row="agent"][data-out="1"]').length, undo: document.querySelectorAll('[data-row="agent"][data-out="1"] [data-im="row-undo"]').length }));
    record("S7", { shown, ...out });
    expect(shown, "Don't import revealed").toBe(true);
    expect(out.out).toBe(1);
    expect(out.undo).toBe(1);
  });

  test("S8 repeats: one choice per set lands where today's buttons land", async ({ page }) => {
    /* Every set resolved the same way at both widths: a two-agent set by the choice under test
       (desktop: "Remove this one" on the second, or "They're different"; phone: the radio, then Next
       set), every other set by its own "Looks right", else its quiet "different" link. Then the review
       goes on to the end and what it hands the import is compared. */
    const run = async (phone: boolean, choice: "a" | "both") => {
      await lab(page, "review&fx=dupes", phone ? PHONES[0] : { width: 1440, height: 900 });
      const acts: string[] = [];
      for (let k = 0; k < 12; k++) {
        const sets = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-dup-set][data-dup-state="open"]')].map((e) => e.dataset.dupSet!));
        if (!sets.length) break;
        const id = sets[0]; const set = page.locator(`[data-dup-set="${id}"]`).first();
        const removes = set.locator(".sf-btn--line"); const looks = set.locator(".sf-btn--sm:not(.sf-btn--line)"); const quiet = set.locator(".sf-link--quiet");
        const pickHere = page.locator(`[data-im="dup-pick"][data-dup-set="${id}"]`);
        if (await pickHere.count()) {
          const want = MUTATE === "S8" && choice === "both" ? "a" : choice;
          await pickHere.locator(`[data-im="dup-opt-${want}"]`).click(); acts.push(`${id}:${choice}`);
        } else if (!phone && (await removes.count()) === 2) {
          if (choice === "a") await removes.nth(1).click(); else await quiet.first().click(); acts.push(`${id}:${choice}`);
        } else if (await looks.count()) { await looks.first().click(); acts.push(`${id}:looks`); }
        else { await quiet.first().click(); acts.push(`${id}:different`); }
        await page.waitForTimeout(200);
        if (phone && (await page.locator('[data-im="dup-next"]:enabled').count())) { await page.click('[data-im="dup-next"]'); await page.waitForTimeout(200); }
      }
      /* Still on the repeats step (its primary is REVIEW_PRIMARY.duplicates) → move on to agents. */
      if ((await page.locator('[data-im="primary"]').textContent())?.startsWith("Review all agents")) { await page.click('[data-im="primary"]'); await page.waitForTimeout(400); }
      const rows = (await finishReview(page, phone)).result;
      return { acts: acts.join(" "), rows };
    };
    const out: Record<string, unknown> = {};
    for (const choice of ["a", "both"] as const) out[choice] = { desk: await run(false, choice), phone: await run(true, choice) };
    record("S8", out);
    for (const choice of ["a", "both"]) {
      const r = out[choice] as { desk: { acts: string; rows: string }; phone: { acts: string; rows: string } };
      expect(r.desk.acts, `${choice}: a two-agent set was chosen on the desktop`).toContain(`:${choice}`);
      expect(r.phone.acts, `${choice}: a two-agent set was chosen on the phone`).toContain(`:${choice}`);
      expect(r.desk.rows.length).toBeGreaterThan(0);
      expect(r.phone.rows, `${choice}: the agents the review keeps`).toBe(r.desk.rows);
    }
    expect((out.a as { desk: { rows: string } }).desk.rows, "the two choices differ, or the check sees nothing").not.toBe((out.both as { desk: { rows: string } }).desk.rows);
  });

  test("S9 the importing loader's steps tick in order on the existing beat", async ({ page }) => {
    await lab(page, "importing", PHONES[0], { motion: true });
    if (MUTATE === "S9") await page.evaluate(() => document.querySelectorAll('[data-im="loader-steps"] li').forEach((l) => l.classList.add("is-on")));
    const seen = await page.evaluate(async () => {
      /* Times are from navigation (performance.now()), so the first tick is the interval's first beat. */
      const t0 = performance.now(); const at: number[] = [];
      while (performance.now() - t0 < 6000 && at.length < 5) {
        const on = document.querySelectorAll('[data-im="loader-steps"] li.is-on').length;
        while (at.length < on) at.push(Math.round(performance.now()));
        await new Promise((r) => setTimeout(r, 25));
      }
      return at;
    });
    record("S9", { seen });
    expect(seen.length).toBe(5);
    for (let k = 1; k < seen.length; k++) expect(Math.abs(seen[k] - seen[k - 1] - 950), `step ${k + 1} on the 950ms beat`).toBeLessThanOrEqual(200);
    expect(seen[0], "the first tick is the first beat, not the mount").toBeGreaterThan(900);
  });

  test("S10 colour laws: white on navy, no green on a phone, no image twice", async ({ page }) => {
    const bad: string[] = []; let n = 0;
    for (const s of [...SETUP, ...REVIEW, "reading&hold=done", "importing&done=1"]) {
      await lab(page, s, PHONES[0]);
      const r = await page.evaluate(() => {
        const out: string[] = []; let m = 0;
        const rgb = (c: string) => (c.match(/\d+(\.\d+)?/g) ?? []).map(Number);
        for (const el of document.querySelectorAll<HTMLElement>("body *")) {
          const rc = el.getBoundingClientRect(); if (!rc.width || !rc.height || el.closest(".sf-panel")) continue;
          const cs = getComputedStyle(el); m++;
          for (const c of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
            const [r, g, b, a = 1] = rgb(c); if (a === 0) continue;
            if (g > r + 20 && g > b + 8 && g > 60) out.push(`${el.className || el.tagName} ${c}`);
          }
        }
        const band = [...document.querySelectorAll<HTMLElement>(".sf-pband b, .sf-pband small")].map((e) => getComputedStyle(e).color);
        const imgs = [...document.querySelectorAll<HTMLImageElement>("img")].filter((i) => i.getBoundingClientRect().width > 0 && !i.closest(".sf-panel")).map((i) => i.src);
        const twice = imgs.filter((s, i) => imgs.indexOf(s) !== i && !s.includes("app-mark") && !s.includes("logo"));
        return { out, m, band, twice };
      });
      n += r.m;
      r.out.forEach((o) => bad.push(`${s} green ${o}`));
      r.band.forEach((c) => { if (!/rgba?\(255, 255, 255/.test(c)) bad.push(`${s} band text ${c}`); });
      r.twice.forEach((t) => bad.push(`${s} image twice ${t}`));
    }
    record("S10", { n, bad });
    expect(n, "elements measured").toBeGreaterThan(800);
    expect([...new Set(bad)]).toEqual([]);
  });

  test("S11 desktop unchanged at 1440 and 1280 on every lab screen", async ({ browser, page }) => {
    test.skip(!BEFORE, "SIP1_BASE_URL is required");
    const screens = [...SETUP, ...REVIEW, "signup", "used-free", "nothing", "reading&hold=done", "importing&done=1", "import-page"];
    const rows: Record<string, unknown>[] = [];
    for (const [w, h] of [[1440, 900], [1280, 800]]) for (const s of screens) {
      const grab = async (base: string, broken: boolean) => {
        const ctx = await browser.newContext(); const p = await ctx.newPage();
        await lab(p, s, { width: w, height: h }, { base, clean: !broken });
        if (broken && MUTATE === "S11") await p.addStyleTag({ content: ".sf .o9-panel .o9-slot{display:none!important}.sf .o9-wayslot{display:none!important}" });
        await p.waitForTimeout(400);
        const dom = await p.evaluate(() => document.body.innerHTML.replace(/ style="[^"]*"/g, "").replace(/-[A-Za-z0-9_-]{8}\.(js|css)/g, ""));
        const png = await p.screenshot({ fullPage: true }); await ctx.close(); return { dom, png };
      };
      const A: Buffer[] = [], B: Buffer[] = []; let dom = true;
      for (let k = 0; k < 5; k++) { // the sign-up screen renders one of two byte-different frames on the SAME build; up to five tries
        const a = await grab(BEFORE, false), b = await grab(origin(), true);
        if (k === 0) dom = a.dom === b.dom;
        A.push(a.png); B.push(b.png);
        if (A.some((x) => B.some((y) => x.equals(y)))) break;
      }
      rows.push({ vp: w, s, dom, px: A.some((x) => B.some((y) => x.equals(y))) });
    }
    void page;
    record("S11", rows);
    expect(rows.length).toBe(screens.length * 2);
    expect(rows.filter((r) => !r.dom || !r.px), "screens that changed at a desktop width").toEqual([]);
  });
});
