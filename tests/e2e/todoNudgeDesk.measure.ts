/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * To-do nudge desk v2 (design-refs/todo-nudge-desk-v2/; replaces v1's measure of the one-sentence desk) — read off the
 * rendered page at 1280×800, 1512×900, 1920×1080, in every state: on open, step 1 confirmed, Today picked (settled), the
 * calendar open, Another day picked. In each: no column scroll (nothing hidden), Log it right-aligned in the footer,
 * no timeline label overlapping another label or a point; with the calendar open, the popover wholly inside the column.
 * Frames at 0.1s / 0.5s / 1.0s after a pick at 1512.
 * ⚠️ NOTHING IS LOGGED: steps are answered, Log it is never pressed. The only write is the tray's prefs, restored.
 *   SA_E2E_BASE_URL=http://127.0.0.1:4321 npm run e2e:emu -- tests/e2e/todoNudgeDesk.measure.ts --project=measure --workers=1
 */
import { expect, test, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.describe.configure({ mode: "default" });
test.setTimeout(240_000);
const DIR = "reports/todo-nudge-desk-v2";
mkdirSync(`${DIR}/shots`, { recursive: true });
const PG = '[data-tws="page"]:visible';
const SIZES = [{ width: 1280, height: 800 }, { width: 1366, height: 768 }, { width: 1512, height: 900 }, { width: 1920, height: 1080 }];

const readings: Record<string, unknown> = {};
const note = (k: string, v: unknown) => { readings[k] = v; };
const seed = (cmd: string, arg: unknown): Record<string, unknown> => {
  const out = execFileSync("node", ["tests/e2e/seedTd55.mjs", cmd, JSON.stringify(arg)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 60_000 });
  return JSON.parse(out.trim().split("\n").pop()!);
};
let prefs: Record<string, unknown> | null = null;
test.beforeAll(() => { prefs = seed("prefs", { trayGrouping: null, trayCollapsed: null }); });
test.afterAll(() => {
  const file = `${DIR}/readings.json`;
  const prev = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown> : {};
  writeFileSync(file, JSON.stringify({ ...prev, ...readings }, null, 1));
  if (prefs) seed("prefs", prefs);
});

async function settle(page: Page, ms = 600) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
  await page.mouse.move(2, 2);
}
async function openNudge(page: Page, vp: { width: number; height: number }) {
  await openRoute(page, "/todo", vp);
  await expect(page.locator(`${PG} [data-tws-row]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    const sc = root?.closest<HTMLElement>(".wpg-scroll");
    if (sc) sc.scrollTop = sc.scrollHeight;
  });
  await page.locator(`${PG} [data-tws-row][data-kind="nudge"]`).first().click();
  await expect(page.locator(`${PG} [data-twn="desk"]`)).toBeVisible({ timeout: 10_000 });
  await settle(page);
}

const read = (page: Page) => page.evaluate(() => {
  const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const R = (e: Element | null) => { const r = e?.getBoundingClientRect(); return r ? { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height } : null; };
  const wq = q('[data-tws="questions"]'), foot = q('[data-tws="footer"]'), log = q('[data-tws="footer"] [data-log]') as HTMLButtonElement | null;
  const col = q('[data-tws="qcol"]');
  const labs = [...root.querySelectorAll<HTMLElement>("[data-twn-lab]")].map((e) => ({ k: e.getAttribute("data-twn-lab"), ...R(e)! }));
  const pts = [...root.querySelectorAll<HTMLElement>("[data-twn-pt]")].map((e) => ({ k: e.getAttribute("data-twn-pt"), ...R(e)! }));
  const hit = (a: { l: number; t: number; r: number; b: number }, b: { l: number; t: number; r: number; b: number }) => a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5;
  const overlaps: string[] = [];
  for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) if (hit(labs[i], labs[j])) overlaps.push(`${labs[i].k}×${labs[j].k}`);
  for (const l of labs) for (const p of pts) if (hit(l, p)) overlaps.push(`${l.k}×pt:${p.k}`);
  const cal = R(q('[data-twn="calendar"]')), c = R(col);
  const fr = R(foot), lr = R(log);
  return {
    title: (q('[data-twn="band"]')?.textContent ?? "").trim(),
    headline: (q('[data-twn="context"] h2')?.textContent ?? "").trim(),
    steps: [...root.querySelectorAll('[data-twn-step]')].map((s) => `${s.getAttribute("data-twn-step")}:${s.getAttribute("data-st")}`),
    sentBtn: (q('[data-twn="sent"]')?.textContent ?? "").trim(),
    nudged: q('[data-twn="nudged"]')?.textContent ?? null,
    nudgedShown: (() => { const n = q('[data-twn="nudged"]'); return n ? getComputedStyle(n).display !== "none" && n.getBoundingClientRect().height > 0 : null; })(),
    answers: [...root.querySelectorAll('[data-twn-when]')].map((b) => `${b.getAttribute("data-twn-when")}:${b.getAttribute("aria-checked")}:${(b.querySelector("small")?.textContent ?? "")}`),
    logDisabled: log?.disabled ?? null,
    logRightGap: fr && lr ? Math.round((fr.r - lr.r) * 10) / 10 : null,
    logLeftOfDismiss: lr && fr ? Math.round(lr.l - fr.l) : null,
    footPadRight: foot ? parseFloat(getComputedStyle(foot).paddingRight) : null,
    column: wq ? { scrollH: wq.scrollHeight, clientH: wq.clientHeight } : null,
    /* the questions column's width, the card column's width, and the desk's natural height (content + padding) */
    colW: col ? Math.round(col.getBoundingClientRect().width) : null,
    /* compact on short screens: the hook's flag, and the smallest text rendered on the desk (the card preview aside) */
    compact: q('[data-twn="desk"]')?.hasAttribute("data-compact") ?? null,
    deskMinText: (() => {
      let min = Infinity, who = "";
      for (const el of q('[data-twn="desk"]')?.querySelectorAll<HTMLElement>("*") ?? []) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) continue;
        const cs = getComputedStyle(el);
        if (el.getBoundingClientRect().width === 0 || cs.visibility === "hidden" || cs.opacity === "0") continue;
        const f = parseFloat(cs.fontSize);
        if (f < min) { min = f; who = el.className || el.tagName; }
      }
      return { px: min, who };
    })(),
    cardColW: Math.round(root.querySelector<HTMLElement>('[data-tws="side"]')?.getBoundingClientRect().width ?? 0),
    needH: wq && q('[data-twn="desk"]') ? Math.ceil(q('[data-twn="desk"]')!.getBoundingClientRect().height + parseFloat(getComputedStyle(wq).paddingTop) + parseFloat(getComputedStyle(wq).paddingBottom)) : null,
    /* the card preview: its scale and the smallest rendered text inside it (font size × scale) */
    preview: (() => {
      const pv = root.querySelector<HTMLElement>('[data-tws="preview-card"]');
      if (!pv) return null;
      /* ScaledCard scales with CSS zoom (WsPreview): the zoom is the scale */
      const scale = parseFloat(pv.style.zoom || "1") || 1;
      let min = Infinity, minBody = Infinity;
      for (const el of pv.querySelectorAll<HTMLElement>("*")) {
        if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim())) continue;
        if (el.getBoundingClientRect().width === 0) continue;
        const f = parseFloat(getComputedStyle(el).fontSize) * scale;
        min = Math.min(min, f);
        if (!/^(SMALL|SUP|SUB)$/.test(el.tagName)) minBody = Math.min(minBody, f);
      }
      return { scale: Math.round(scale * 1000) / 1000, minText: Math.round(min * 10) / 10, minBodyText: Math.round(minBody * 10) / 10 };
    })(),
    calendar: cal && c ? { ...cal, inside: cal.l >= c.l - 0.5 && cal.r <= c.r + 0.5 && cal.t >= c.t - 0.5 && cal.b <= c.b + 0.5, col: c } : null,
    labels: labs.map((l) => `${l.k}:${Math.round(l.l)}-${Math.round(l.r)}`), points: pts.map((p) => p.k), overlaps,
    /* nothing hidden: a timeline label outside the card's body (into the band, or past the card's clipped bottom), and any
       answer title or date cut short (its text wider than its box) */
    labelsClipped: (() => {
      const card = q('[data-twn="timeline"]')?.getBoundingClientRect(), band = q('[data-twn="band"]')?.getBoundingClientRect();
      if (!card || !band) return [];
      return labs.filter((l) => l.t < band.bottom - 0.5 || l.b > card.bottom + 0.5).map((l) => `${l.k}:${l.t < band.bottom - 0.5 ? `into the band by ${Math.round(band.bottom - l.t)}px` : `cut at the bottom by ${Math.round(l.b - card.bottom)}px`}`);
    })(),
    truncated: [...root.querySelectorAll<HTMLElement>("[data-twn-when] b, [data-twn-when] small")].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => `${e.closest("[data-twn-when]")!.getAttribute("data-twn-when")}:${e.tagName === "B" ? "title" : "date"} ${e.textContent}`),
  };
});

async function check(page: Page, key: string, w: number) {
  const r = await read(page);
  note(`${key}-${w}`, r);
  await page.screenshot({ path: `${DIR}/shots/${key}-${w}.png` });
  /* soft: every state is still measured after one overflows, so a shortfall is reported in full */
  expect.soft(r.column!.scrollH, `${key}: no column scroll`).toBeLessThanOrEqual(r.column!.clientH + 1);
  expect(r.logRightGap!, `${key}: Log it on the right`).toBeLessThanOrEqual(r.footPadRight! + 1);
  expect(r.overlaps, `${key}: timeline labels clear`).toEqual([]);
  expect.soft(r.labelsClipped, `${key}: no timeline label clipped`).toEqual([]);
  expect.soft(r.truncated, `${key}: no answer cut short`).toEqual([]);
  return r;
}

for (const vp of SIZES) {
  test(`the nudge desk in every state at ${vp.width}`, async ({ page }) => {
    const w = vp.width;
    await openNudge(page, vp);
    const open = await check(page, "open", w);
    expect(open.steps).toEqual(["send:on", "when:off"]);
    expect(open.title).toMatch(/’s timeline$/);
    expect(open.points).toContain("today");
    expect(open.logDisabled).toBe(true);

    await page.locator(`${PG} [data-twn="sent"]`).click();
    await settle(page, 400);
    /* compact: the how-to is behind the info mark; hovering it shows the line, inside the column */
    if (open.compact) {
      await page.locator(`${PG} [data-twn="info"]`).hover();
      await page.waitForTimeout(250);
      const tip = await page.evaluate(() => {
        const root = [...document.querySelectorAll<HTMLElement>('[data-tws="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
        const how = root.querySelector<HTMLElement>('[data-twn="how"]')!, col = root.querySelector<HTMLElement>('[data-tws="qcol"]')!.getBoundingClientRect();
        const r = how.getBoundingClientRect(), cs = getComputedStyle(how);
        return { visible: cs.display !== "none" && cs.visibility === "visible", inside: r.left >= col.left - 0.5 && r.right <= col.right + 0.5 && r.bottom <= col.bottom + 0.5, text: how.textContent };
      });
      note(`howto-${w}`, tip);
      await page.screenshot({ path: `${DIR}/shots/howto-${w}.png` });
      expect(tip.visible).toBe(true);
      expect(tip.inside).toBe(true);
      await page.mouse.move(2, 2);
      await page.waitForTimeout(250);
    }

    const sent = await check(page, "sent", w);
    expect(sent.steps).toEqual(["send:done", "when:on"]);
    expect(sent.sentBtn).toBe("Sent");
    expect(sent.logDisabled).toBe(true);

    await page.keyboard.press("1");
    await settle(page, 1400);
    const today = await check(page, "today", w);
    expect(today.steps).toEqual(["send:done", "when:done"]);
    expect(today.title).toMatch(/’s updated timeline$/);
    expect(today.points).toEqual(expect.arrayContaining(["nudge", "next"]));
    expect(today.logDisabled).toBe(false);
    /* the picked-day line: folded in compact, shown everywhere else */
    expect(today.nudgedShown, `today: the "You nudged" line ${today.compact ? "folded (compact)" : "shown"}`).toBe(!today.compact);

    await page.locator(`${PG} [data-twn-when="other"]`).click();
    await settle(page, 400);
    const cal = await check(page, "calendar", w);
    expect(cal.calendar, "the calendar is open").not.toBeNull();
    expect(cal.calendar!.inside, "the popover sits wholly inside the column").toBe(true);
    expect(cal.logDisabled, "opening the calendar changes nothing").toBe(false);

    /* Esc closes only the popover */
    await page.keyboard.press("Escape");
    await settle(page, 300);
    const esc = await read(page);
    note(`esc-${w}`, { calendar: !!esc.calendar, desk: esc.steps });
    expect(esc.calendar).toBeNull();
    expect(esc.steps, "still on the task").toEqual(["send:done", "when:done"]);

    /* Another day: a day three back, or the first open day of the month */
    await page.locator(`${PG} [data-twn-when="other"]`).click();
    await settle(page, 300);
    const d = new Date(); d.setDate(d.getDate() - 3);
    const want = page.locator(`${PG} [data-twn="calendar"] [data-mg-day="${d.getDate()}"]:not([disabled])`);
    await (await want.count() ? want : page.locator(`${PG} [data-twn="calendar"] [data-mg-day]:not([disabled])`).first()).click();
    await settle(page, 1400);
    const other = await check(page, "another-day", w);
    expect(other.calendar).toBeNull();
    expect(other.answers.find((a) => a.startsWith("other:true:"))).toBeTruthy();
    expect(other.nudgedShown).toBe(!other.compact);
    expect(other.nudged).toMatch(/^You nudged \S+ on \w{3} \d{1,2} \w{3}\. Next reminder \d{1,2} \w{3}\.$/);

    /* un-confirming step 1 clears step 2 and disables Log it */
    await page.locator(`${PG} [data-twn="sent"]`).click();
    await settle(page, 400);
    const undone = await read(page);
    note(`unconfirm-${w}`, { steps: undone.steps, logDisabled: undone.logDisabled, answers: undone.answers });
    expect(undone.steps).toEqual(["send:on", "when:off"]);
    expect(undone.logDisabled).toBe(true);
    await page.keyboard.press("Escape");
  });
}

test("frames after a pick at 1512 (0.1s, 0.5s, 1.0s)", async ({ page }) => {
  await openNudge(page, SIZES[1]);
  await page.locator(`${PG} [data-twn="sent"]`).click();
  await settle(page, 400);
  const t0 = Date.now();
  await page.locator(`${PG} [data-twn-when="today"]`).click();
  for (const at of [100, 500, 1000]) {
    const wait = at - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    await page.screenshot({ path: `${DIR}/shots/frame-${String(at).padStart(4, "0")}ms-1512.png` });
    note(`frame-${at}`, { tookAt: Date.now() - t0 });
  }
  await page.keyboard.press("Escape");
});

/* 1512 and 1920 fit as they were: every state pixel-identical to the screenshots taken before compact existed
   (reports/todo-nudge-desk-v2/before/, from 197b4d939). Compared in the browser, pixel by pixel. */
test("1512 and 1920 are pixel-identical to before compact", async ({ page }) => {
  const names = readdirSync(`${DIR}/before`).filter((f) => f.endsWith(".png"));
  expect(names.length).toBe(10);
  await page.setContent("<canvas id=a></canvas><canvas id=b></canvas>");
  const diffs: Record<string, number> = {};
  for (const n of names) {
    const a = `data:image/png;base64,${readFileSync(`${DIR}/before/${n}`).toString("base64")}`;
    const b = `data:image/png;base64,${readFileSync(`${DIR}/shots/${n}`).toString("base64")}`;
    diffs[n] = await page.evaluate(async ([x, y]) => {
      const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const [ia, ib] = await Promise.all([load(x), load(y)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return -1;
      const px = (i: HTMLImageElement) => { const c = document.createElement("canvas"); c.width = i.width; c.height = i.height; const g = c.getContext("2d")!; g.drawImage(i, 0, 0); return g.getImageData(0, 0, i.width, i.height).data; };
      const da = px(ia), db = px(ib);
      let n = 0;
      /* from y = 42 down: the beta banner's text row above it (y 14–26) varied between runs at 1512 with nothing of this
         change in it (measured: every differing pixel sat there; 1920 identical) */
      for (let k = ia.width * 42 * 4; k < da.length; k += 4) if (da[k] !== db[k] || da[k + 1] !== db[k + 1] || da[k + 2] !== db[k + 2] || da[k + 3] !== db[k + 3]) n++;
      return n;
    }, [a, b] as const);
  }
  note("pixel-diff", diffs);
  for (const [n, d] of Object.entries(diffs)) expect(d, `${n}: pixels that differ`).toBe(0);
});
