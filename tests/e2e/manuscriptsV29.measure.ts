/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * MSV29 — Manuscripts v29 (design-refs/manuscripts-v29/manuscripts-v29.html) measured on the rendered page, on the
 * emulator's harness account:
 *   npm run e2e:emu -- tests/e2e/manuscriptsV29.measure.ts --project=measure --workers=1
 *   MSV29_TAG=before   reads only the navy header's box (L1's oracle) into reports/manuscripts-v29/before.json. Run once on
 *                      the line BEFORE this pack (its page has no desk), and never again.
 *   MSV29_ONLY=<L…>    runs only the locks whose id starts with it.
 *   MSV29_MUTATE=<L…>  applies that lock's own named break, so the lock must go red and name it (the red-before proofs);
 *                      `all` applies every lock's break, each in its own test.
 * Unit halves: src/components/manuscripts/v29/msv29.test.tsx.
 *
 * SEEDS (tests/e2e/ms29Fixture.mjs, emulator only; every field written is put back in afterAll):
 *   Everyday   cv25-ms — 14 queries, Querying since 14 Mar 2026; all three pieces written, a synopsis over 90 words,
 *              two further genres
 *   Just added cv25-ms-empty — no queries; none written, no word count, Drafting
 *   edges      a 45-character title, a synopsis of exactly 90 words, Shelved with the old querying-since date
 *   (one query: the harness has no book with exactly one — the unit lock C4 holds that variant)
 */
import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(300_000);
const DIR = "reports/manuscripts-v29";
const SHOTS = `${DIR}/shots`;
mkdirSync(SHOTS, { recursive: true });
const TAG = process.env.MSV29_TAG ?? "";
const ONLY = process.env.MSV29_ONLY ?? "";
const MUT = process.env.MSV29_MUTATE ?? "";
const run = (id: string) => !ONLY || id.startsWith(ONLY);
const brk = (id: string) => MUT === "all" || MUT === id;

const MS = "cv25-ms";
const NEWMS = "cv25-ms-empty";
const fx = (...a: string[]) => execFileSync("node", ["tests/e2e/ms29Fixture.mjs", ...a], { encoding: "utf8" }).trim().split("\n").pop()!;
const get = (id: string): Record<string, unknown> => JSON.parse(fx("--get", id));
const set = (id: string, v: Record<string, unknown>) => JSON.parse(fx("--set", id, JSON.stringify(v)));
const feed = (id: string): string[] => JSON.parse(fx("--feed", id));
const KEYS = ["title", "genre", "subGenres", "ageCategory", "wordCount", "logline", "elevatorPitch", "synopsis", "series", "status", "shelved", "shelvedReason", "statusChangedDate"];
const restoreTo = (id: string, was: Record<string, unknown>) => set(id, Object.fromEntries(KEYS.map((k) => [k, k in was ? was[k] : "__delete__"])));

const SYN = "On the morning of his father’s funeral, Murphy takes the urn from the undertaker’s and drives for the Dublin ferry. His father asked, once and only to him, to be scattered off the Welsh coast where he worked as a young man. The family plot in Kildare has been paid for; his sister Orla has organised everything, and nobody else believes the request was ever made.\n\nMurphy misses the first sailing after his car is clamped. Stuck in the port, he meets Des, a retired lorry driver who knew his father under a different name. Des’s account of those Welsh years does not match the one the family tells.";
const LOG = "Murphy has twelve hours to get his father’s ashes across the Irish Sea before his sister finds out he took them.";
const PITCH = "It’s a road trip with an urn. Murphy steals his father’s ashes on the morning of the funeral to scatter them where the old man actually wanted.";
const EVERYDAY = { title: "Murphy's Day Out", genre: "Literary mystery", subGenres: ["Book club", "Crime"], ageCategory: "Adult", wordCount: 84000, logline: LOG, elevatorPitch: PITCH, synopsis: SYN, status: "Querying", shelved: "__delete__", series: "__delete__" };
const JUST_ADDED = { title: "Murphy's Day Out", genre: "Literary mystery", subGenres: [], ageCategory: "Adult", wordCount: 0, logline: "", elevatorPitch: "__delete__", synopsis: "__delete__", status: "Drafting", shelved: "__delete__", series: "__delete__" };
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

let was: Record<string, Record<string, unknown>> = {};
test.beforeAll(() => { if (!TAG) was = { [MS]: get(MS), [NEWMS]: get(NEWMS) }; });
test.afterAll(() => { for (const [id, v] of Object.entries(was)) restoreTo(id, v); });

const ROOT = ".ms29";
async function open(page: Page, id: string, vp: { width: number; height: number }) {
  await page.addInitScript((m) => {
    try {
      localStorage.setItem("scriptally_active_manuscript_id", m);
      sessionStorage.setItem("sa.guide.autoOpened", "1");
    } catch { /* private */ }
  }, id);
  await openRoute(page, "/manuscripts", vp);
  await page.locator('[data-wsnh-page="manuscripts"]').first().waitFor({ state: "visible", timeout: 30_000 });
  if (!TAG) await page.locator(`${ROOT} [data-ms29="desk"]`).first().waitFor({ state: "visible", timeout: 30_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
}
const css = (page: Page, rule: string) => page.addStyleTag({ content: rule });
const drawer = '[data-hdr="ms-edit"]';
async function closeDrawer(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.locator(`${drawer}.is-in`)).toHaveCount(0, { timeout: 10_000 });
  await page.waitForTimeout(300);
}

/* ══ L1 · the header's box and its distance from the top of the sheet, against the line before this pack ══════════ */

const readHeader = (page: Page) => page.evaluate(() => {
  const hd = [...document.querySelectorAll<HTMLElement>('[data-wsnh-page="manuscripts"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const sc = hd.closest<HTMLElement>(".wpg-scroll") ?? hd.parentElement!;
  sc.scrollTop = 0;
  const r = hd.getBoundingClientRect(), s = sc.getBoundingClientRect();
  return { left: Math.round(r.left), width: Math.round(r.width), height: Math.round(r.height), fromSheet: Math.round(r.top - s.top), top: Math.round(r.top) };
});
const BEFORE = `${DIR}/before.json`;

for (const vp of [{ width: 1280, height: 800 }, { width: 1512, height: 900 }, { width: 1717, height: 1000 }]) {
  test(`L1 header box @${vp.width}`, async ({ page }) => {
    test.skip(!run("L1"));
    if (!TAG) set(MS, EVERYDAY);
    await open(page, MS, vp);
    if (brk("L1")) await css(page, `[data-wsnh-page="manuscripts"] { margin-top: 60px !important; }`);
    const now = await readHeader(page);
    if (TAG === "before") {
      const all = existsSync(BEFORE) ? JSON.parse(readFileSync(BEFORE, "utf8")) : {};
      all[vp.width] = now;
      writeFileSync(BEFORE, JSON.stringify(all, null, 1));
      return;
    }
    const b = JSON.parse(readFileSync(BEFORE, "utf8"))[vp.width];
    expect(b, `before.json has @${vp.width}`).toBeTruthy();
    for (const k of ["left", "width", "height", "fromSheet", "top"] as const) expect.soft(now[k], `L1 ${k} @${vp.width}: ${now[k]} vs before ${b[k]}`).toBe(b[k]);
  });
}

if (!TAG) {
  /* ══ L2 · exactly one button in the header, and it is above the fold at 1280 × 800 ════════════════════════════════ */
  test("L2 one filled button, above the fold", async ({ page }) => {
    test.skip(!run("L2"));
    set(MS, EVERYDAY);
    await open(page, MS, { width: 1280, height: 800 });
    if (brk("L2")) await page.evaluate(() => { const a = document.querySelector('.ms29 [data-ms29="edit-details"]')!; a.after(a.cloneNode(true)); });
    const r = await page.evaluate(() => {
      const hd = [...document.querySelectorAll<HTMLElement>('.ms29 [data-wsnh="header"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const filled = [...hd.querySelectorAll<HTMLElement>("button")].filter((b) => { const s = getComputedStyle(b); return s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.textDecorationLine !== "underline"; });
      const desk = document.querySelector<HTMLElement>('.ms29 [data-ms29="desk"]')!;
      /* a filled primary anywhere on the desk: the navy fill of a `.b1` */
      const navy = [...desk.querySelectorAll<HTMLElement>("button")].filter((b) => /rgb\(4[0-9], 5[0-9], 8[0-9]\)/.test(getComputedStyle(b).backgroundColor));
      const e = filled[0]?.getBoundingClientRect();
      return { n: filled.length, label: filled[0]?.innerText.trim(), bg: filled[0] ? getComputedStyle(filled[0]).backgroundColor : null, bottom: e?.bottom ?? 9999, navy: navy.length };
    });
    expect.soft(r.n, "L2 exactly one filled button in the header").toBe(1);
    expect.soft(r.label, "L2 it is Edit details").toBe("Edit details");
    expect.soft(r.bg, "L2 white fill").toBe("rgb(255, 255, 255)");
    expect.soft(r.bottom <= 800, `L2 visible without scrolling at 1280 × 800 (bottom ${r.bottom})`).toBe(true);
    expect.soft(r.navy, "L2 no navy-filled button on the desk").toBe(0);
  });

  /* ══ L3 · two columns at 1280 and up, one at 1180; no sideways overflow (and 200% zoom on 1512) ═══════════════════ */
  const overflow = (page: Page) => page.evaluate(() => {
    const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().width > 0);
    return { doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, scroller: sc ? sc.scrollWidth - sc.clientWidth : 0 };
  });
  for (const w of [1280, 1512, 1717, 1180]) {
    test(`L3 desk @${w}`, async ({ page }) => {
      test.skip(!run("L3"));
      set(MS, EVERYDAY);
      await open(page, MS, { width: w, height: 900 });
      /* the break: the columns swapped for the other breakpoint's, and a desk wider than the sheet */
      if (brk("L3")) await css(page, `.ms29 .ms29-desk { grid-template-columns: ${w >= 1280 ? "minmax(0,1fr)" : "minmax(0,1fr) 392px"} !important; min-width: ${w + 200}px; }`);
      const r = await page.evaluate(() => {
        const q = (s: string) => document.querySelector<HTMLElement>(`.ms29 [data-ms29="${s}"]`)!.getBoundingClientRect();
        const p = q("pitch"), s = q("side"), d = q("details"), sh = q("shelf"), hd = [...document.querySelectorAll<HTMLElement>('.ms29 [data-wsnh="header"]')].find((e) => e.getBoundingClientRect().height > 0)!.getBoundingClientRect();
        return { pTop: p.top, sTop: s.top, sLeft: s.left, pRight: p.right, pBottom: p.bottom, sW: s.width, gap: s.left - p.right, stack: sh.top - d.bottom, deskTop: p.top - hd.bottom, pLeft: p.left, hdLeft: hd.left, sRight: s.right, hdRight: hd.right };
      });
      const o = await overflow(page);
      if (w >= 1280) {
        expect.soft(Math.abs(r.pTop - r.sTop) < 1, `L3 @${w} tops aligned (${r.pTop}, ${r.sTop})`).toBe(true);
        expect.soft(Math.round(r.sW), `L3 @${w} the right column is 392`).toBe(392);
        expect.soft(Math.round(r.gap), `L3 @${w} 24 between`).toBe(24);
      } else {
        expect.soft(r.sTop >= r.pBottom + 23, `L3 @${w} one column: Details under the pitch (${r.sTop} vs ${r.pBottom})`).toBe(true);
      }
      expect.soft(Math.round(r.stack), `L3 @${w} 24 between Details and Your manuscripts`).toBe(24);
      expect.soft(Math.abs(r.pLeft - r.hdLeft) < 1 && Math.abs(r.sRight - r.hdRight) < 1, `L3 @${w} the desk on the header's edges`).toBe(true);
      expect.soft(o.doc <= 0 && o.scroller <= 0, `L3 @${w} no sideways overflow (${o.doc}, ${o.scroller})`).toBe(true);
      test.info().annotations.push({ type: "reading", description: JSON.stringify({ w, ...r, ...o }) });
    });
  }
  test("L3 200% zoom on 1512 (a 756-wide viewport)", async ({ page }) => {
    test.skip(!run("L3"));
    set(MS, EVERYDAY);
    /* a 756-wide viewport is below 768: the desktop shell stands aside for the phone screens, so the page is opened at
       1512 (signed in, the shell found) and then narrowed, as a zoom would */
    await open(page, MS, { width: 1512, height: 900 });
    await page.setViewportSize({ width: 756, height: 450 });
    await page.waitForTimeout(2000);
    if (brk("L3")) await css(page, `body { min-width: 900px; }`);
    const o = await overflow(page);
    test.info().annotations.push({ type: "reading", description: JSON.stringify({ zoom200: o, url: page.url() }) });
    expect.soft(o.doc <= 0 && o.scroller <= 0, `L3 200%: no sideways overflow (${o.doc}, ${o.scroller})`).toBe(true);
  });

  /* ══ L4 · every clickable is at least 32 tall; the Details rows are clickable across their full width ═════════════ */
  test("L4 targets", async ({ page }) => {
    test.skip(!run("L4"));
    set(MS, EVERYDAY);
    await open(page, MS, { width: 1512, height: 900 });
    if (brk("L4")) await css(page, `.ms29 .ms29-lk { min-height: 0 !important; line-height: 1 !important; } .ms29 .ms29-dt-r { width: 60% !important; }`);
    const r = await page.evaluate(() => {
      const root = document.querySelector<HTMLElement>(".ms29")!;
      const els = [...root.querySelectorAll<HTMLElement>('[data-ms29="desk"] button, [data-ms29="vitals"] button, [data-wsnh="header"] button')].filter((e) => e.getBoundingClientRect().width > 0);
      const short = els.filter((e) => e.getBoundingClientRect().height < 32).map((e) => `${e.dataset.ms29 ?? e.className}:${Math.round(e.getBoundingClientRect().height)}`);
      const led = root.querySelector<HTMLElement>('[data-ms29="ledger"]')!;
      const cw = led.clientWidth - parseFloat(getComputedStyle(led).paddingLeft) - parseFloat(getComputedStyle(led).paddingRight);
      const rows = [...led.querySelectorAll<HTMLElement>('[data-ms29="dt-row"]')].map((e) => Math.round(e.getBoundingClientRect().width));
      return { n: els.length, short, rows, cw: Math.round(cw) };
    });
    expect.soft(r.n, "L4 the population is non-zero").toBeGreaterThan(8);
    expect.soft(r.short, "L4 nothing clickable under 32px").toEqual([]);
    expect.soft(r.rows.length, "L4 five Details rows").toBe(5);
    for (const w of r.rows) expect.soft(w, `L4 a row spans the ledger (${w} vs ${r.cw})`).toBe(r.cw);
  });

  /* ══ L5 · Copy writes the stored text (the logline without the display quotes) ═══════════════════════════════════ */
  test("L5 copy", async ({ page }) => {
    test.skip(!run("L5"));
    set(MS, EVERYDAY);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await open(page, MS, { width: 1512, height: 900 });
    if (brk("L5")) await page.evaluate(() => { const w = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = (t: string) => w(`“${t}”`); });
    const got: Record<string, string> = {};
    for (const k of ["logline", "elevatorPitch", "synopsis"]) {
      await page.locator(`.ms29 [data-ms29="pt"][data-k="${k}"] [data-ms29="copy"]`).click();
      await page.waitForTimeout(200);
      got[k] = await page.evaluate(() => navigator.clipboard.readText());
    }
    expect.soft(got.logline, "L5 the logline as stored, no added quotes").toBe(LOG);
    expect.soft(got.elevatorPitch, "L5 the pitch as stored").toBe(PITCH);
    expect.soft(got.synopsis, "L5 the synopsis as stored, paragraphs kept").toBe(SYN);
    const pill = page.locator('.ms29 [data-ms29="pt"][data-k="synopsis"] [data-ms29="copy"]');
    await expect.soft(pill, "L5 the pill reads Copied").toHaveText("Copied");
    expect.soft(await pill.evaluate((e) => getComputedStyle(e).backgroundColor), "L5 on the sage fill").toBe("rgb(224, 229, 221)");
    await expect.soft(page.locator(".sa-toast").filter({ hasText: "Synopsis copied." }).first(), "L5 the toast").toBeVisible();
    await page.waitForTimeout(1900);
    await expect.soft(pill, "L5 back to Copy after 1.8s").toHaveText("Copy");
  });

  /* ══ L6 · Edit, Add one and Add a word count open the drawer on the right field, focused; Esc returns focus ════════ */
  const FIELD: Record<string, string> = { logline: "ms21-f-logline", elevatorPitch: "ms21-f-pitch", synopsis: "ms21-f-synopsis" };
  for (const st of ["everyday", "just-added"] as const) {
    test(`L6 opens on the field (${st})`, async ({ page }) => {
      test.skip(!run("L6"));
      const id = st === "everyday" ? MS : NEWMS;
      set(id, st === "everyday" ? EVERYDAY : JUST_ADDED);
      await open(page, id, { width: 1512, height: 900 });
      const entries: [string, string, string][] = (["logline", "elevatorPitch", "synopsis"] as const).map((k) => [`[data-ms29="pt"][data-k="${k}"] [data-ms29="${st === "everyday" ? "edit" : "add"}"]`, FIELD[k], k]);
      if (st === "just-added") entries.push(['[data-ms29="add-words"]', "ms21-f-words", "wordCount"]);
      for (const [sel, want, k] of entries) {
        const opener = page.locator(`.ms29 ${sel}`);
        await opener.click();
        await expect(page.locator(`${drawer}.is-in`)).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(500);
        if (brk("L6")) await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
        const f = await page.evaluate(() => { const a = document.activeElement as HTMLInputElement | null; return { id: a?.id ?? null, caret: a?.selectionStart ?? null, len: a?.value?.length ?? null }; });
        expect.soft(f.id, `L6 ${st} ${k}: the field has focus`).toBe(want);
        expect.soft(f.caret, `L6 ${st} ${k}: the caret at the end`).toBe(f.len);
        await closeDrawer(page);
        expect.soft(await opener.evaluate((e) => e === document.activeElement), `L6 ${st} ${k}: Esc closes and focus returns to the opener`).toBe(true);
      }
    });
  }

  /* ══ L7 · Read it all only above 90 words, toggling aria-expanded, focus staying on the link ═════════════════════ */
  test("L7 read it all", async ({ page }) => {
    test.skip(!run("L7"));
    set(MS, EVERYDAY);
    await open(page, MS, { width: 1512, height: 900 });
    const more = page.locator('.ms29 [data-ms29="more"]');
    await expect.soft(more, "L7 the link above 90 words").toHaveCount(1);
    const lines = () => page.locator('.ms29 #ms29-syn').evaluate((p) => Math.round(p.getBoundingClientRect().height / parseFloat(getComputedStyle(p).lineHeight)));
    expect.soft(await lines(), "L7 clamped to five lines").toBe(5);
    await expect.soft(more).toHaveAttribute("aria-expanded", "false");
    await more.focus();
    await page.keyboard.press("Enter");
    if (brk("L7")) await page.evaluate(() => { const m = document.querySelector('.ms29 [data-ms29="more"]')!; m.setAttribute("aria-expanded", "false"); (m as HTMLElement).blur(); });
    await expect.soft(more, "L7 expanded").toHaveAttribute("aria-expanded", "true");
    await expect.soft(more).toHaveText("Show less");
    expect.soft(await more.evaluate((e) => e === document.activeElement), "L7 focus stays on the link").toBe(true);
    expect.soft(await lines(), "L7 open: more than five lines").toBeGreaterThan(5);
    set(MS, { ...EVERYDAY, synopsis: words(90) });
    await open(page, MS, { width: 1512, height: 900 });
    await expect.soft(page.locator('.ms29 [data-ms29="more"]'), "L7 at exactly 90 words: no link").toHaveCount(0);
    await expect.soft(page.locator('.ms29 [data-ms29="count"]'), "L7 the count still shows").toHaveText("90 words");
  });

  /* ══ L8 · the band sub-lines and the query foot; Shelved shows no since; a 45-character title ═════════════════════ */
  test("L8 copy by state", async ({ page }) => {
    test.skip(!run("L8"));
    const sub = () => page.locator('.ms29 [data-ms29="pitch"] [data-ms29="band-sub"]').innerText();
    /* textContent with the figure's own gap: `<b>14</b>queries…` is spaced by the b's margin, not a character */
    const foot = () => page.locator('.ms29 [data-ms29="foot"]').evaluate((f) => {
      const sp = f.querySelector<HTMLElement>(":scope > span")!;
      const fig = sp.querySelector("b")?.textContent ?? "";
      const rest = [...sp.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
      return [fig, rest, f.querySelector("button")!.textContent].map((t) => (t ?? "").trim()).filter(Boolean).join(" ");
    });
    set(MS, EVERYDAY);
    await open(page, MS, { width: 1512, height: 900 });
    if (brk("L8")) await page.evaluate(() => { document.querySelector('.ms29 [data-ms29="band-sub"]')!.textContent = "Missing 0 of 3."; });
    expect.soft(await sub(), "L8 all three").toBe("Your book in one line, in thirty seconds and in full.");
    expect.soft(await foot(), "L8 14 queries").toBe("14 queries sent for this book See them");
    const vit = (await page.locator('.ms29 [data-ms29="vitals"]').innerText()).replace(/\s+/g, " ").trim();
    expect.soft(vit, "L8 the vitals").toBe("84,000 words Literary mystery Adult Querying since 14 Mar 2026");
    set(MS, { ...EVERYDAY, elevatorPitch: "__delete__", synopsis: "__delete__" });
    await open(page, MS, { width: 1512, height: 900 });
    expect.soft(await sub(), "L8 one written").toBe("1 of 3 written.");
    set(NEWMS, JUST_ADDED);
    await open(page, NEWMS, { width: 1512, height: 900 });
    expect.soft(await sub(), "L8 none written").toBe("Three ways of telling people what your book is. Add them when you’re ready.");
    expect.soft(await foot(), "L8 no queries").toBe("No queries sent for this book yet. Log a query");
    set(MS, { ...EVERYDAY, status: "Shelved" });
    await open(page, MS, { width: 1512, height: 900 });
    const txt = await page.locator(".ms29").first().innerText();
    expect.soft(/\bsince\b/i.test(txt), "L8 Shelved: no since anywhere").toBe(false);
    set(MS, { ...EVERYDAY, title: "The Long Way Round to Kinsale with Three Dogs" });
    await open(page, MS, { width: 1280, height: 800 });
    const t = await page.evaluate(() => {
      const h1 = [...document.querySelectorAll<HTMLElement>('.ms29 [data-wsnh="title"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const b = document.querySelector<HTMLElement>('.ms29 [data-ms29="active"] b')!;
      return { len: h1.textContent!.length, ellipsis: getComputedStyle(h1).textOverflow, clipped: h1.scrollWidth > h1.clientWidth + 1, tile: b.scrollWidth > b.clientWidth + 1 };
    });
    expect.soft(t.len, "L8 the title is 45 characters").toBe(45);
    expect.soft(t.ellipsis !== "ellipsis" && !t.clipped, "L8 the long title wraps, never truncates").toBe(true);
    expect.soft(t.tile, "L8 the active tile's title is not clipped").toBe(false);
    await page.screenshot({ path: `${SHOTS}/long-title-1280.png` });
  });

  /* ══ L9 · save → toast with Undo → Undo restores every changed field, including one empty before ══════════════════ */
  test("L9 save and undo", async ({ page }) => {
    test.skip(!run("L9"));
    const seed = set(MS, { ...EVERYDAY, elevatorPitch: "__delete__" });
    const feed0 = feed(MS);
    await open(page, MS, { width: 1512, height: 900 });
    await page.locator('.ms29 [data-ms29="pt"][data-k="elevatorPitch"] [data-ms29="add"]').click();
    await expect(page.locator(`${drawer}.is-in`)).toBeVisible({ timeout: 10_000 });
    await page.waitForTimeout(500);
    await page.keyboard.type("A pitch written in the drawer.");
    await page.locator("#ms21-f-words").fill("91,000");
    await page.locator('[data-ms21="status-seg"] [role="radio"]', { hasText: "Revising" }).click();
    await page.screenshot({ path: `${SHOTS}/drawer-on-pitch-1512.png` });
    await page.locator('[data-ms21="save"]').click();
    await expect(page.locator(`${drawer}.is-in`)).toHaveCount(0, { timeout: 15_000 });
    const toast = page.locator(".sa-toast").filter({ hasText: "Saved the book’s details." }).first();
    await expect.soft(toast, "L9 the saved toast").toBeVisible();
    const flash = await page.locator('.ms29 [data-ms29="pt"][data-k="elevatorPitch"]').evaluate((e) => e.classList.contains("is-flash"));
    expect.soft(flash, "L9 the changed pitch row flashes").toBe(true);
    await page.screenshot({ path: `${SHOTS}/saved-toast-1512.png` });
    let after = get(MS);
    for (let i = 0; i < 10 && after.wordCount !== 91000; i++) { await page.waitForTimeout(500); after = get(MS); }
    expect.soft(after.elevatorPitch, "L9 the save wrote the pitch").toBe("A pitch written in the drawer.");
    expect.soft(after.status, "L9 and the status").toBe("Revising");
    expect.soft(feed(MS).length, "L9 the save narrated one feed row").toBe(feed0.length + 1);
    const undo = toast.getByRole("button", { name: /undo/i });
    await expect.soft(undo, "L9 the toast offers Undo").toBeVisible();
    await undo.click();
    await expect.soft(page.locator(".sa-toast").filter({ hasText: "Put back as it was." }).first(), "L9 the undone message").toBeVisible();
    let back = get(MS);
    for (let i = 0; i < 10 && back.wordCount !== seed.wordCount; i++) { await page.waitForTimeout(500); back = get(MS); }
    if (brk("L9")) back = { ...back, elevatorPitch: "" };
    expect.soft(back, "L9 Undo puts back every field exactly (the pitch absent again, the stamp restored)").toEqual(seed);
    expect.soft("elevatorPitch" in back, "L9 the field empty before is absent again").toBe(false);
    expect.soft(feed(MS), "L9 the feed row the save made is gone").toEqual(feed0);
  });

  /* ══ L10 · Tab reaches every action, never the coming-soon tile; a visible focus ring ════════════════════════════ */
  test("L10 keyboard", async ({ page }) => {
    test.skip(!run("L10"));
    set(MS, EVERYDAY);
    await open(page, MS, { width: 1512, height: 900 });
    if (brk("L10")) await page.evaluate(() => document.querySelector('.ms29 [data-ms29="next"]')!.setAttribute("tabindex", "0"));
    await page.locator('.ms29 [data-ms29="edit-details"]').focus();
    const seen: string[] = [];
    let ring = "";
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const s = await page.evaluate(() => {
        const a = document.activeElement as HTMLElement | null;
        if (!a) return null;
        const inDesk = !!a.closest('.ms29 [data-ms29="desk"]');
        const st = getComputedStyle(a);
        return { key: inDesk ? `${a.dataset.ms29 ?? a.tagName}:${a.closest("[data-k]")?.getAttribute("data-k") ?? ""}` : null, next: !!a.closest('[data-ms29="next"]'), ring: `${st.outlineStyle} ${st.outlineWidth}` };
      });
      if (!s) break;
      if (s.next) seen.push("NEXT");
      if (s.key) { seen.push(s.key); if (!ring && s.key.startsWith("dt-row")) ring = s.ring; }
    }
    const want = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.ms29 [data-ms29="desk"] button')].map((a) => `${a.dataset.ms29 ?? a.tagName}:${a.closest("[data-k]")?.getAttribute("data-k") ?? ""}`));
    expect.soft(want.length, "L10 the population is non-zero").toBeGreaterThan(10);
    for (const w of want) expect.soft(seen, `L10 Tab reaches ${w}`).toContain(w);
    expect.soft(seen, "L10 the Add a manuscript tile is not in the tab order").not.toContain("NEXT");
    expect.soft(ring.startsWith("solid") && !ring.endsWith(" 0px"), `L10 a visible focus ring (${ring})`).toBe(true);
  });

  /* ══ shots ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
  for (const w of [1280, 1512]) {
    test(`S shots @${w}`, async ({ page }) => {
      test.skip(!run("S"));
      const h = w === 1280 ? 800 : 900;
      set(MS, EVERYDAY);
      await open(page, MS, { width: w, height: h });
      await page.screenshot({ path: `${SHOTS}/everyday-${w}.png` });
      set(NEWMS, JUST_ADDED);
      await open(page, NEWMS, { width: w, height: h });
      await page.screenshot({ path: `${SHOTS}/just-added-${w}.png` });
    });
  }
}
