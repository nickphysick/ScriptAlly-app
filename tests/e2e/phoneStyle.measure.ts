/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Phone style v1 — THE MEASUREMENT (design-refs/phone-style-v1/), on the emulator harness account.
 *
 *   npm run e2e:emu -- tests/e2e/phoneStyle.measure.ts --project=pixel
 *   PS_ONLY=<group>[,<group>]   lab · today · lead · rulings · audit
 *   PS_MUTATE=<name>            one mutation, run as its own test on a fresh page; it must turn its own lock red
 *   PS_OUT=<dir>                where readings and shots go (default reports/phone-style-v1)
 *
 *   PS2   (lab)     every part on `#/ps-lab` at 390 × 844: computed size, radius, shadow, type and padding equal the
 *                   tokens. The expected values are read IN THE PAGE from probes styled with the `--ps-*` tokens
 *                   themselves, so the lock compares the parts with the sheet, not with numbers copied here.
 *   PS1   (today)   Today at 390 × 844 and 360 × 740 — top, scrolled, the offer state, the ordinary state, the
 *                   one-query state: every assertion PS1-1…10 is a HARD GATE.
 *   PSL   (lead)    the lead card's button text equals the To do card's for the same task, and opens the same screen;
 *                   where the first Your move query has no task, there is no lead card.
 *   PSR   (rulings) ruling 1a: each fade's opaque end and the seal's ring equal the page; ruling 1b: each
 *                   `--pa-inset-legacy` reader is pixel-identical inside itself with the page at its old and new colour.
 *   PS1R  (audit)   PS1 in REPORT mode across every other phone screen: counts, never a failure. A screen the probe
 *                   cannot reach is recorded as FAILED, not skipped.
 * ⚠️ READINGS ARE ON THE VISIBLE PAGE (every workspace page stays mounted): each probe filters to what is visible.
 * ⚠️ NOTHING HERE WRITES. The lead lock opens the task's screen and closes it without pressing anything in it.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute, KILL_MOTION_ID } from "./measure";

const DIR = process.env.PS_OUT ?? "reports/phone-style-v1";
mkdirSync(resolve(DIR), { recursive: true });
const MUT = (process.env.PS_MUTATE ?? "").trim();
const ONLY = (process.env.PS_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const PHONES = [{ width: 390, height: 844 }, { width: 360, height: 740 }] as const;
const tag = (v: { width: number; height: number }) => `${v.width}x${v.height}`;
const skip = (g: string) => ONLY.length > 0 && !ONLY.includes(g);

/* ── a ledger: one line per check, written whatever happens ── */
class Ledger {
  rows: { id: string; what: string; ok: boolean; got: string }[] = [];
  constructor(readonly name: string) {}
  check(id: string, what: string, ok: boolean, got: string) { this.rows.push({ id, what, ok, got }); }
  write() {
    mkdirSync(resolve(DIR, "ledger"), { recursive: true });
    writeFileSync(resolve(DIR, "ledger", `${this.name}${MUT ? `.mut-${MUT}` : ""}.json`), JSON.stringify(this.rows, null, 1));
  }
  red() { return this.rows.filter((r) => !r.ok); }
}

async function signIn(page: Page) {
  page.setDefaultTimeout(45_000);
  try { await openRoute(page, "/dashboard", { width: 1440, height: 900 }); }
  catch { await page.locator("#au-pw").press("Enter"); await page.waitForTimeout(4000); await openRoute(page, "/dashboard", { width: 1440, height: 900 }); }
  page.setDefaultTimeout(20_000);
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __v: (s: string, r?: ParentNode) => HTMLElement[] };
    w.__v = (s, r = document) => [...r.querySelectorAll<HTMLElement>(s)].filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden");
  });
});
const KILL = `*,*::before,*::after{animation:none!important;transition:none!important}`;
async function settle(page: Page, ms = 1200) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
  await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL}` });
}

/* ══ PS2 — THE PARTS ON THE LAB ══ */
const LAB_MUT: Record<string, string> = {
  "lab-radius": ".ps-card { border-radius: 12px !important; }",
  "lab-cta": ".ps-cta { min-height: 56px !important; }",
};
test.describe("PS2 lab", () => {
  test.skip(skip("lab") || (!!MUT && !LAB_MUT[MUT]), "another mode");
  test("PS2 · every part equals the tokens (390 × 844)", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("PS2");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/#/ps-lab");
    await page.locator('[data-ps="lab"]').waitFor({ timeout: 30_000 });
    if (LAB_MUT[MUT]) await page.addStyleTag({ content: LAB_MUT[MUT] });
    await settle(page, 600);
    const r = await page.evaluate(() => {
      const lab = document.querySelector<HTMLElement>('[data-ps="lab"]')!;
      /* the token, resolved by the page: a probe inside the lab styled with it */
      const probe = (css: string) => {
        const p = document.createElement("div"); p.setAttribute("style", css); lab.appendChild(p);
        const cs = getComputedStyle(p); const out = { sh: cs.boxShadow, fs: cs.fontSize, fw: cs.fontWeight, ff: cs.fontFamily, lh: cs.lineHeight, bg: cs.backgroundColor, c: cs.color };
        p.remove(); return out;
      };
      const tok = {
        card: probe("box-shadow: var(--ps-sh-card)").sh, raised: probe("box-shadow: var(--ps-sh-raised)").sh,
        navy: probe("background: var(--ps-navy)").bg, fill: probe("background: var(--ps-fill)").bg, press: probe("background: var(--ps-press)").bg,
        page: probe("background: var(--ps-page)").bg, muted: probe("color: var(--ps-muted)").c,
        name: probe("font: var(--ps-name)"), sec: probe("font: var(--ps-secondary)"), label: probe("font: var(--ps-label)"),
        numeral: probe("font: var(--ps-numeral)"), headline: probe("font: var(--ps-headline)"), cap: probe("font: var(--ps-caption)"),
      };
      const P = (k: string) => document.querySelector<HTMLElement>(`[data-ps-part="${k}"]`);
      const read = (k: string, sub?: string) => {
        let e = P(k); if (e && sub) e = e.querySelector<HTMLElement>(sub);
        if (!e) return null;
        const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
        return { w: Math.round(b.width * 10) / 10, h: Math.round(b.height * 10) / 10, l: Math.round(b.left * 10) / 10, rr: Math.round((window.innerWidth - b.right) * 10) / 10,
          rad: cs.borderTopLeftRadius, sh: cs.boxShadow, fs: cs.fontSize, fw: cs.fontWeight, ff: cs.fontFamily, bg: cs.backgroundColor, c: cs.color,
          pt: cs.paddingTop, pb: cs.paddingBottom, pl: cs.paddingLeft, pr: cs.paddingRight, gap: cs.columnGap };
      };
      const parts: Record<string, unknown> = {};
      for (const k of ["slim", "tab-on", "tile", "tile-navy", "tile-q", "hdg", "lead", "lead-n", "head", "cta", "card", "row", "row-press", "name", "sec", "time", "link", "ber", "ber-bar", "tlink", "chip", "need", "snack", "skel"]) parts[k] = read(k);
      parts["slim-t"] = read("slim", ".ps-slim-t"); parts["tile-b"] = read("tile", "b"); parts["tile-s"] = read("tile", "span"); parts["tile-qb"] = read("tile-q", "b"); parts["lead-b"] = read("lead-n", "b");
      parts["lead-cap"] = read("lead-n", ".ps-cap"); parts["disc"] = read("row", ".ps-disc"); parts["ber-nm"] = read("ber", ".ps-ber-nm");
      return { tok, parts, pageBg: getComputedStyle(lab).backgroundColor };
    });
    writeFileSync(resolve(DIR, "ps2-lab.json"), JSON.stringify(r, null, 1));
    type R = { w: number; h: number; l: number; rr: number; rad: string; sh: string; fs: string; fw: string; ff: string; bg: string; c: string; pt: string; pb: string; pl: string; pr: string; gap: string };
    const p = r.parts as Record<string, R | null>;
    const t = r.tok;
    const has = (k: string) => { const v = p[k]; L.check("PS2", `${k} rendered`, !!v, v ? "" : "missing"); return v ?? ({} as R); };
    const font = (k: string, f: { fs: string; fw: string; ff: string }) => { const v = has(k); L.check("PS2", `${k} type = token (${f.fs} ${f.fw})`, v.fs === f.fs && v.fw === f.fw && v.ff === f.ff, `${v.fs} ${v.fw} ${v.ff}`); };
    const round = (v: R) => parseFloat(v.rad) >= v.h / 2 - 0.5;
    const gutter = (k: string) => { const v = has(k); L.check("PS2", `${k} 16 from each edge`, Math.abs(v.l - 16) < 0.6 && Math.abs(v.rr - 16) < 0.6, `${v.l} / ${v.rr}`); };

    L.check("PS2", "the page is oat (--ps-page)", r.pageBg === t.page, `${r.pageBg} vs ${t.page}`);
    { const v = has("slim"); L.check("PS2", "slim header 56 high, navy", v.h === 56 && v.bg === t.navy, `${v.h} ${v.bg}`); }
    { const v = has("slim-t"); L.check("PS2", "slim title 20, the typewriter face", v.fs === "20px" && v.fw === "400" && v.ff === t.numeral.ff, `${v.fs} ${v.fw} ${v.ff}`); }
    { const v = has("tab-on"); L.check("PS2", "a tab 48 high, 14 semibold, navy when on", v.h === 48 && v.fs === t.label.fs && v.fw === t.label.fw && v.c === t.navy, `${v.h} ${v.fs} ${v.fw} ${v.c}`); }
    for (const k of ["tile", "tile-navy", "tile-q"]) { const v = has(k); L.check("PS2", `${k}: 80 high, radius 16, padding 12`, v.h === 80 && v.rad === "16px" && v.pt === "12px" && v.pl === "12px", `${v.h} ${v.rad} ${v.pt} ${v.pl}`); }
    { const v = has("tile"); L.check("PS2", "a white tile casts the card's hairline", v.sh === t.card && v.bg === "rgb(255, 255, 255)", `${v.sh} ${v.bg}`); }
    { const v = has("tile-navy"); L.check("PS2", "the navy tile is navy with no shadow", v.bg === t.navy && v.sh === "none", `${v.bg} ${v.sh}`); }
    { const q = has("tile-qb"); const b = has("tile-b"); L.check("PS2", "the quiet tile's figures are grey", q.c === t.muted, q.c); L.check("PS2", "a tile's numeral is the part numeral", b.fs === t.numeral.fs && b.ff === t.numeral.ff && b.fw === "400", `${b.fs} ${b.ff}`); }
    font("tile-s", t.sec);
    { const v = has("hdg"); L.check("PS2", "a heading: 24 above, 8 below, 16 in, 16 semibold", v.pt === "24px" && v.pb === "8px" && v.pl === "16px" && v.fs === t.name.fs && v.fw === t.name.fw && v.ff === t.name.ff, `${v.pt} ${v.pb} ${v.pl} ${v.fs} ${v.fw} ${v.ff}`); }
    { const v = has("lead"); L.check("PS2", "the lead card: radius 16, padding 16, the card's hairline", v.rad === "16px" && v.pt === "16px" && v.pl === "16px" && v.sh === t.card, `${v.rad} ${v.pt} ${v.sh}`); }
    gutter("lead");
    font("head", t.headline);
    font("lead-b", t.numeral);
    font("lead-cap", t.cap);
    { const v = has("cta"); L.check("PS2", "the filled button: 48 high, fully round, navy, 16 semibold", v.h === 48 && round(v) && v.bg === t.navy && v.fs === "16px" && v.fw === "600", `${v.h} ${v.rad} ${v.bg} ${v.fs} ${v.fw}`); }
    { const v = has("card"); L.check("PS2", "a card: radius 16, the card's hairline", v.rad === "16px" && v.sh === t.card && v.bg === "rgb(255, 255, 255)", `${v.rad} ${v.sh}`); }
    gutter("card");
    { const v = has("row"); L.check("PS2", "a row: at least 64 high, padding 8 / 16, 12 between disc and text", v.h >= 64 && v.pt === "8px" && v.pl === "16px" && v.gap === "12px", `${v.h} ${v.pt} ${v.pl} ${v.gap}`); }
    { const v = has("row-press"); L.check("PS2", "a pressed row dims (--ps-press)", v.bg === t.press, `${v.bg} vs ${t.press}`); }
    { const v = has("disc"); L.check("PS2", "a row's disc is 40, round", v.w === 40 && v.h === 40 && v.rad === "50%", `${v.w}×${v.h} ${v.rad}`); }
    font("name", t.name);
    font("sec", t.sec);
    { const v = has("sec"); L.check("PS2", "secondary text on a card is the grey", v.c === t.muted, v.c); }
    { const v = has("time"); L.check("PS2", "a row's time at 14", v.fs === "14px" && v.fw === "400", `${v.fs} ${v.fw}`); }
    { const v = has("link"); L.check("PS2", "a link row: 48 high, 14 semibold, navy", v.h === 48 && v.fs === t.label.fs && v.fw === t.label.fw && v.c === t.navy, `${v.h} ${v.fs} ${v.fw} ${v.c}`); }
    { const v = has("ber"); L.check("PS2", "a Birds-eye row is 40 high", v.h === 40, String(v.h)); }
    { const v = has("ber-nm"); L.check("PS2", "its name column is 104 wide", v.w === 104, String(v.w)); }
    { const v = has("ber-bar"); L.check("PS2", "its bar is 10 high with round ends", v.h === 10 && round(v), `${v.h} ${v.rad}`); }
    { const v = has("tlink"); L.check("PS2", "a text link: 48 high, 16 semibold, navy", v.h === 48 && v.fs === "16px" && v.fw === "600" && v.c === t.navy, `${v.h} ${v.fs} ${v.c}`); }
    { const v = has("chip"); L.check("PS2", "a chip: 28 high, fully round, on the warm fill, 14 semibold", v.h === 28 && round(v) && v.bg === t.fill && v.fs === "14px" && v.fw === "600", `${v.h} ${v.rad} ${v.bg}`); }
    { const v = has("need"); L.check("PS2", "the need pill: 32 high, fully round, 14 semibold", v.h === 32 && round(v) && v.fs === "14px" && v.fw === "600", `${v.h} ${v.rad}`); }
    { const v = has("snack"); L.check("PS2", "the snackbar: 48 high, fully round, navy, the raised shadow", v.h === 48 && round(v) && v.bg === t.navy && v.sh === t.raised, `${v.h} ${v.rad} ${v.sh}`); }
    { const v = has("skel"); L.check("PS2", "a loading row is a row's 64", v.h === 64, String(v.h)); }
    L.write();
    await page.screenshot({ path: resolve(DIR, `ps2-lab${MUT ? `.mut-${MUT}` : ""}.png`), fullPage: true });
    expect(L.red().map((x) => `${x.what}: ${x.got}`)).toEqual([]);
  });
});
