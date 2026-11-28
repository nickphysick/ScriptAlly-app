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
mkdirSync(resolve(DIR, "shots"), { recursive: true });
mkdirSync(resolve(DIR, "audit"), { recursive: true });
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
/* Phone Birds-eye first look v1: the day's first open of Birds-eye plays a two-second grow-in that holds the world's
   frame; these readings are of the world at rest, so today's first look is marked as already seen (the app's own
   day stamp, lib/phoneV41 `dayStamp`). The grow-in's own locks are phoneBirdsFirstLook.measure.ts. */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { const d = new Date(); localStorage.setItem("bw1.firstLook.day", `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`); } catch { /* */ } });
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
      for (const k of ["slim", "tab-on", "tile", "tile-navy", "tile-q", "hdg", "lead", "lead-n", "head", "cta", "card", "row", "row-press", "name", "sec", "time", "link", "ber", "ber-card", "ber-bar", "tlink", "chip", "need", "snack", "skel"]) parts[k] = read(k);
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
    { const v = has("ber"); const c = has("ber-card"); L.check("PS2", "a Birds-eye row is 40 high, 16 inside its card", v.h === 40 && Math.abs(v.l - c.l - 16) < 0.6 && Math.abs(v.rr - c.rr - 16) < 0.6, `${v.h} · ${v.l - c.l} / ${v.rr - c.rr}`); }
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

/* ══ PS1 — THE PROBE: every rendered text node, card, button and tappable element under the given roots ══ */
import { STAGE_COLOURS } from "../../src/lib/stageColours";
const hexRgb = (h: string) => `rgb(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)})`;
const STAGE_RGB = [...new Set(Object.values(STAGE_COLOURS).flatMap((c) => [c.band, c.tint]).map(hexRgb))];
export interface PsReading { vw: number; rules: Record<string, string[]>; pop: Record<string, number>; pageBg: string }
const PS_RULES = ["PS1-1", "PS1-2", "PS1-3", "PS1-4", "PS1-5", "PS1-6", "PS1-7", "PS1-8", "PS1-9", "PS1-10"] as const;
async function probe(page: Page, roots: string[], extra: { cardSel?: string } = {}): Promise<PsReading> {
  return page.evaluate(({ roots, stage, cardSel }) => {
    const vw = window.innerWidth;
    const SIZES = new Set(["56px", "28px", "20px", "16px", "14px", "12px"]);
    const MUTED = "rgb(107, 111, 120)", NAVY = "rgb(42, 58, 82)";
    const probeEl = (css: string) => { const p = document.createElement("div"); p.className = "pa-layer"; p.setAttribute("style", css); document.body.appendChild(p); const v = getComputedStyle(p).boxShadow; const bg = getComputedStyle(p).backgroundColor; p.remove(); return { v, bg }; };
    const SH = new Set([probeEl("box-shadow: var(--ps-sh-card)").v, probeEl("box-shadow: var(--ps-sh-raised)").v, "none"]);
    const PAGE = probeEl("background: var(--ps-page)").bg;
    const rules: Record<string, string[]> = {};
    const add = (k: string, e: Element, why: string) => { (rules[k] ??= []).push(`${e.tagName.toLowerCase()}.${String((e as HTMLElement).className?.toString?.() ?? "").trim().split(/\s+/).slice(0, 2).join(".")} "${(e.textContent ?? "").trim().slice(0, 24)}" ${why}`); };
    const rootEls = roots.flatMap((s) => [...document.querySelectorAll<HTMLElement>(s)]).filter((e) => e.getClientRects().length > 0);
    const shown = (e: Element) => {
      if (e.closest('[aria-hidden="true"]') && !e.closest("[data-pa5='be']")) return false;
      if (e.getClientRects().length === 0) return false;
      const cs = getComputedStyle(e);
      return cs.visibility !== "hidden" && cs.display !== "none" && parseFloat(cs.opacity) > 0;
    };
    const all = [...new Set(rootEls.flatMap((r) => [r, ...r.querySelectorAll<HTMLElement>("*")]))]
      .filter((e) => !(e.closest("svg") && e.tagName.toLowerCase() !== "svg") && !e.closest('[data-pa5="dock"]') && shown(e));
    const alpha = (c: string) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 0; const p = m[1].split(",").map((x) => parseFloat(x)); return p.length === 4 ? p[3] : 1; };
    const isCardEl = (e: HTMLElement) => {
      if (cardSel && e.matches(cardSel)) return true;
      const cs = getComputedStyle(e), b = e.getBoundingClientRect();
      if (e.closest(".pa5-hd, [data-pa5='mini'], [data-pa5='tabs']")) return false;
      const filled = alpha(cs.backgroundColor) > 0.5 || cs.backgroundImage !== "none";
      return filled && parseFloat(cs.borderTopLeftRadius) >= 8 && b.width >= vw * 0.5 && !["BUTTON", "A", "INPUT", "TEXTAREA"].includes(e.tagName) && cs.backgroundColor !== NAVY;
    };
    /* a sheet runs edge to edge with its top corners at 24 (P19): it is not a card, so the card rules skip it */
    const isSheet = (e: HTMLElement) => { const b = e.getBoundingClientRect(); return b.left <= 0.5 && b.right >= vw - 0.5; };
    const cards = all.filter((e) => isCardEl(e) && !isSheet(e));
    const bgOf = (e: HTMLElement): string => {
      for (let n: HTMLElement | null = e; n; n = n.parentElement) {
        const cs = getComputedStyle(n);
        if (alpha(cs.backgroundColor) > 0.5) return cs.backgroundColor;
        if (cs.backgroundImage !== "none" && !cs.backgroundImage.startsWith("url(")) return "image";
      }
      return getComputedStyle(document.body).backgroundColor;
    };
    const texts = all.filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? "").trim()));
    const taps = all.filter((e) => e.matches("button, a[href], [role='button'], [role='tab'], input:not([type='hidden']), select, textarea") && !e.closest("[data-ps-skip]"));
    const isRow = (e: HTMLElement) => e.matches(".ps-row, .pa4-tap, .pa4-ib2, [data-pa4='qrow'], [data-pa4='feed-row'], .pa3-row, .pa-agrow")
      || (taps.includes(e) && e.getBoundingClientRect().width >= vw * 0.8 && !!e.querySelector("svg, img, .pa-disc, .pa4-seal") && !e.matches(".ps-link, .pa4-link, .pa5-be-f, .ps-cta, .pa4-cta, .ps-tlink, .ps-tile, .bwq"));
    const rows = all.filter(isRow);
    /* PS1-1 sizes */
    for (const e of texts) { const fs = getComputedStyle(e).fontSize; if (!SIZES.has(fs)) add("PS1-1", e, fs); else if (fs === "12px" && !e.closest("[data-ps-cap]")) add("PS1-1", e, "12px unmarked"); }
    /* PS1-2 weights; the typewriter face never under 20, never bold */
    for (const e of texts) {
      const cs = getComputedStyle(e); const w = cs.fontWeight === "normal" ? "400" : cs.fontWeight === "bold" ? "700" : cs.fontWeight;
      if (w !== "400" && w !== "600") add("PS1-2", e, `weight ${w}`);
      /* Birds-eye polish v1's brief sets My queries' counts in Special Elite at 16px (the ref's `.mr b`): named, not a breach */
      if (/Special Elite/.test(cs.fontFamily) && (parseFloat(cs.fontSize) < 20 || w !== "400") && !(e.matches(".bwq-n") && cs.fontSize === "16px" && w === "400")) add("PS1-2", e, `typewriter ${cs.fontSize} ${w}`);
    }
    /* PS1-3 page and cards */
    const ground = document.querySelector<HTMLElement>(".ws-main") ?? document.body;
    const pageBg = getComputedStyle(ground).backgroundColor;
    if (pageBg !== PAGE) add("PS1-3", ground, `page ${pageBg}`);
    for (const c of cards) { const cs = getComputedStyle(c); if (cs.borderTopLeftRadius !== "16px") add("PS1-3", c, `radius ${cs.borderTopLeftRadius}`); if (!SH.has(cs.boxShadow)) add("PS1-3", c, `shadow ${cs.boxShadow.slice(0, 60)}`); }
    /* PS1-4 one gutter: cards, tiles, section headings */
    const edge = (e: HTMLElement, l: number, r: number) => Math.abs(l - 16) > 0.6 || Math.abs(vw - r - 16) > 0.6;
    for (const c of cards) { const b = c.getBoundingClientRect(); if (c.parentElement?.closest(".ps-card, .pa4-card, .ps-lead") ) continue; if (edge(c, b.left, b.right)) add("PS1-4", c, `${Math.round(b.left)} / ${Math.round(vw - b.right)}`); }
    for (const g of all.filter((e) => e.matches(".ps-tiles"))) { const k = [...g.children].filter((x) => x.getClientRects().length) as HTMLElement[]; if (!k.length) continue; const l = k[0].getBoundingClientRect().left, r = k[k.length - 1].getBoundingClientRect().right; if (edge(g, l, r)) add("PS1-4", g, `${Math.round(l)} / ${Math.round(vw - r)}`); }
    for (const h of all.filter((e) => e.matches("h2, h3, .ps-hdg") && !e.closest(".pa5-hd, [data-pa5='mini'], .ps-card, .pa4-card, .ps-lead, [role='dialog']"))) {
      const b = h.getBoundingClientRect(), cs = getComputedStyle(h);
      if (edge(h, b.left + parseFloat(cs.paddingLeft), b.right - parseFloat(cs.paddingRight))) add("PS1-4", h, `${Math.round(b.left + parseFloat(cs.paddingLeft))} / ${Math.round(vw - b.right + parseFloat(cs.paddingRight))}`);
    }
    /* PS1-5 targets 48 × 48; a list row 64 (a Birds-eye row is the sheet's own 40) */
    for (const t of taps) { if (t.matches(".pa5-be-row")) continue; const b = t.getBoundingClientRect(); if (b.width < 47.5 || b.height < 47.5) add("PS1-5", t, `${Math.round(b.width)}×${Math.round(b.height)}`); }
    for (const r of rows) { if (r.matches(".pa5-be-row")) continue; const b = r.getBoundingClientRect(); if (b.height < 63.5) add("PS1-5", r, `row ${Math.round(b.height)}`); }
    /* PS1-6 the grey never on the page */
    for (const e of texts) if (getComputedStyle(e).color === MUTED && bgOf(e) === PAGE) add("PS1-6", e, "grey on the page");
    /* PS1-7 one coloured card */
    const tinted = cards.filter((c) => stage.includes(getComputedStyle(c).backgroundColor));
    if (tinted.length > 1) for (const c of tinted) add("PS1-7", c, `${tinted.length} coloured cards`);
    /* PS1-8 one filled navy button in the body */
    const filled = taps.filter((t) => { const cs = getComputedStyle(t), b = t.getBoundingClientRect(); return cs.backgroundColor === NAVY && parseFloat(cs.borderTopLeftRadius) >= b.height / 2 - 1 && !t.closest("[data-pa5='mini'], .pa5-hd"); });
    if (filled.length > 1) for (const t of filled) add("PS1-8", t, `${filled.length} filled buttons`);
    /* PS1-9 no dashed or dotted edge but "not filled in yet" */
    for (const e of all) { const cs = getComputedStyle(e); for (const s of ["Top", "Right", "Bottom", "Left"] as const) { const st = cs.getPropertyValue(`border-${s.toLowerCase()}-style`); if ((st === "dashed" || st === "dotted") && parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) > 0 && !e.closest("[data-ps-empty]")) { add("PS1-9", e, `${s} ${st}`); break; } } }
    /* PS1-10 no loose rows */
    for (const r of rows) { let ok = false; for (let n = r.parentElement; n && !rootEls.includes(n); n = n.parentElement) if (isCardEl(n) || n.matches(".ps-card, .pa4-card, [role='dialog']")) { ok = true; break; } if (!ok) add("PS1-10", r, "loose on the page"); }
    return { vw, rules, pageBg, pop: { texts: texts.length, cards: cards.length, taps: taps.length, rows: rows.length } };
  }, { roots, stage: STAGE_RGB, cardSel: extra.cardSel });
}
const TODAY_ROOTS = ['[data-pa5="today"]', '[data-pa5="mini"][data-on="1"]'];

/* ── Today's states ── */
async function phone(page: Page, vp: { width: number; height: number }) {
  if (!(page as unknown as { __ps?: boolean }).__ps) { await signIn(page); (page as unknown as { __ps?: boolean }).__ps = true; }
  await page.setViewportSize(vp);
}
async function today(page: Page, aids: { be?: unknown; move?: unknown } = {}) {
  await page.goto("/dashboard");
  await page.locator('[data-pa5="today"]').filter({ visible: true }).first().waitFor({ timeout: 30_000 });
  await page.evaluate((a) => { const w = window as unknown as Record<string, unknown>; w.__SA_PA5_BE = a.be ?? undefined; w.__SA_PS_MOVE = a.move ?? undefined; }, aids);
  await page.locator('[data-pa5="tab"][data-tab="activity"]').filter({ visible: true }).first().click();
  await page.waitForTimeout(300);
  await page.locator('[data-pa5="tab"][data-tab="queries"]').filter({ visible: true }).first().click();
  await settle(page, 1500);
}
const stageTo = (page: Page, y: number | "move") => page.evaluate((yy) => {
  const sc = document.getElementById("app-stage-scroll"); if (!sc) return;
  if (yy === "move") { const h = document.querySelector('[data-ps="move-hdg"]'); if (h) { sc.scrollTop += h.getBoundingClientRect().top - 150; } }
  else sc.scrollTop = yy;
}, y);
async function moveRows(page: Page) {
  return page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('[data-ps="move-hdg"]');
    const rows = [...document.querySelectorAll<HTMLElement>('[data-ps="move-row"]')].map((r) => ({ id: r.dataset.id!, status: r.dataset.status!, task: r.dataset.task === "1" }));
    const first = h ? { id: h.dataset.first!, status: h.dataset.firstStatus!, task: h.dataset.firstTask === "1" } : null;
    return first ? (first.task ? [first, ...rows] : rows) : rows;
  });
}

const TODAY_MUT: Record<string, string> = {
  "ps-size": ".ps-hdg { font-size: 15px !important; }",
  "ps-gutter": ".pa5 .ps-card { margin-left: 20px !important; }",
  "ps-target": ".pa5 .pa5-be .pa5-be-f { min-height: 40px !important; }",
};
test.describe("PS1 today", () => {
  test.skip(skip("today") || (!!MUT && !TODAY_MUT[MUT] && MUT !== "ps-loose"), "another mode");
  test("PS1 · Today, every assertion a hard gate (390 × 844, 360 × 740)", async ({ page }) => {
    test.setTimeout(900_000);
    const L = new Ledger("PS1-today");
    const sum: Record<string, unknown> = {};
    for (const vp of PHONES) {
      await phone(page, vp);
      await today(page);
      const all = await moveRows(page);
      const withTask = all.filter((r) => r.task);
      const offer = withTask.find((r) => r.status === "Offer");
      const plain = withTask.find((r) => r.status !== "Offer");
      const ids = all.map((r) => r.id);
      const from = (id: string) => ids.slice(ids.indexOf(id));
      const states: [string, { be?: unknown; move?: unknown } | null, number | "move"][] = [
        ["top", null, 0], ["scrolled", null, "move"],
        ["offer", offer ? { move: { ids: from(offer.id) } } : null, "move"],
        ["ordinary", plain ? { move: { ids: from(plain.id) } } : null, "move"],
        ["one-query", plain ? { be: { ids: [plain.id] }, move: { ids: [plain.id] } } : null, 0],
      ];
      for (const [name, aid, y] of states) {
        const at = `${tag(vp)} · ${name}`;
        if ((name === "offer" && !offer) || ((name === "ordinary" || name === "one-query") && !plain)) { L.check("PS1", `${at}: the state is reachable`, false, "no such query on the harness"); continue; }
        if (aid || name === "top") await today(page, aid ?? {});
        if (TODAY_MUT[MUT]) await page.addStyleTag({ content: TODAY_MUT[MUT] });
        if (MUT === "ps-loose") await page.evaluate(() => { const c = document.querySelector('[data-ps="move-card"]'); const r = c?.querySelector('[data-ps="move-row"]'); if (c && r) c.parentElement!.insertBefore(r, c); });
        await stageTo(page, y); await page.waitForTimeout(700);
        const r = await probe(page, TODAY_ROOTS);
        sum[at] = r;
        L.check("PS1", `${at}: population (${r.pop.texts} texts, ${r.pop.cards} cards, ${r.pop.taps} taps, ${r.pop.rows} rows)`, r.pop.texts > 10 && r.pop.cards > 0 && r.pop.taps > 3, JSON.stringify(r.pop));
        for (const k of PS_RULES) L.check(k, `${at}`, !(r.rules[k]?.length), (r.rules[k] ?? []).slice(0, 6).join(" | "));
        await page.screenshot({ path: resolve(DIR, "shots", `today-${tag(vp)}-${name}${MUT ? `.mut-${MUT}` : ""}.png`) });
      }
    }
    writeFileSync(resolve(DIR, `ps1-today${MUT ? `.mut-${MUT}` : ""}.json`), JSON.stringify(sum, null, 1));
    L.write();
    expect(L.red().map((x) => `${x.id} ${x.what}: ${x.got}`)).toEqual([]);
  });
});

/* ══ PSL — THE LEAD CARD: its button is To do's for the same task, and opens the same screen ══ */
test.describe("PSL lead", () => {
  test.skip(skip("lead") || (!!MUT && MUT !== "lead-verb"), "another mode");
  test("PSL · the lead card's button equals the To do card's, and opens the same task", async ({ page }) => {
    test.setTimeout(900_000);
    const L = new Ledger("PSL");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await phone(page, PHONES[0]);
    const ORDER_KEY = "pa5.todo.order";
    const saved = await page.evaluate((k) => localStorage.getItem(k), ORDER_KEY);
    const out: Record<string, unknown> = {};
    try {
      for (const [name, aid] of [["as built", null], ["first query has no task", "none"], ["one query", "one"]] as const) {
        await today(page);
        const all = await moveRows(page);
        let move: { ids: string[] } | undefined;
        if (aid === "none") { const n = all.find((r) => !r.task); if (!n) { L.check("PSL", `${name}: reachable`, false, "every Your move query has a task"); continue; } const ids = all.map((r) => r.id); move = { ids: ids.slice(ids.indexOf(n.id)) }; }
        if (aid === "one") { const t = all.find((r) => r.task); if (!t) { L.check("PSL", `${name}: reachable`, false, "no query with a task"); continue; } move = { ids: [t.id] }; }
        if (move) await today(page, { move });
        await stageTo(page, "move"); await page.waitForTimeout(500);
        const h = await page.evaluate(() => { const e = document.querySelector<HTMLElement>('[data-ps="move-hdg"]'); return e ? { first: e.dataset.first, task: e.dataset.firstTask === "1", n: Number(e.dataset.n) } : null; });
        const lead = await page.evaluate(() => { const e = [...document.querySelectorAll<HTMLElement>('[data-ps="lead"]')].filter((x) => x.getClientRects().length); return e.map((x) => ({ id: x.dataset.id, key: x.dataset.taskKey, verb: x.querySelector('[data-ps="lead-cta"]')?.textContent ?? "", head: x.querySelector('[data-ps="lead-head"]')?.textContent ?? "" })); });
        out[name] = { h, lead, rows: all.length, noTask: all.filter((r) => !r.task).map((r) => r.status) };
        if (!h) { L.check("PSL", `${name}: Your move is on show`, false, "no heading"); continue; }
        if (!h.task) { L.check("PSL", `${name}: the first query has no task → no lead card`, lead.length === 0, JSON.stringify(lead)); continue; }
        L.check("PSL", `${name}: one lead card, for the first query`, lead.length === 1 && lead[0].id === h.first, JSON.stringify(lead));
        if (lead.length !== 1) continue;
        let verb = lead[0].verb;
        if (MUT === "lead-verb") verb = `${verb}!`;
        /* tap it: the task's own screen, at that task */
        await page.locator('[data-ps="lead-cta"]').filter({ visible: true }).first().click();
        await page.locator('[data-tdp="task"]').first().waitFor({ timeout: 15_000 });
        const opened = await page.evaluate(() => document.querySelector<HTMLElement>('[data-tdp="task"]')?.dataset.key ?? "");
        L.check("PSL", `${name}: the lead button opens the task's screen at that task`, opened === lead[0].key, `${opened} vs ${lead[0].key}`);
        await page.locator('[data-tdp="close"]').first().click(); await page.waitForTimeout(600);
        /* To do: bring that task's card to the top with "Not now" (a display order only, kept in this browser), read its button */
        await page.goto("/todo");
        await page.locator('[data-pa5="todo"]').filter({ visible: true }).first().waitFor({ timeout: 30_000 });
        await settle(page, 1200);
        let top = "";
        for (let i = 0; i < 160; i++) {
          top = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa5="todo-card"]')].find((x) => x.getClientRects().length)?.dataset.key ?? "");
          if (top === lead[0].key || !top) break;
          await page.locator('[data-pa5="todo-later"]').filter({ visible: true }).first().click(); await page.waitForTimeout(120);
        }
        L.check("PSL", `${name}: To do shows the same task`, top === lead[0].key, `${top} vs ${lead[0].key}`);
        if (top !== lead[0].key) continue;
        const todoVerb = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-pa5="todo-verb"]')].find((x) => x.getClientRects().length)?.textContent ?? "");
        L.check("PSL", `${name}: the button's words are To do's ("${todoVerb}")`, verb === todoVerb && todoVerb.length > 0, `Today "${verb}" · To do "${todoVerb}"`);
        await page.locator('[data-pa5="todo-verb"]').filter({ visible: true }).first().click();
        await page.locator('[data-tdp="task"]').first().waitFor({ timeout: 15_000 });
        const opened2 = await page.evaluate(() => document.querySelector<HTMLElement>('[data-tdp="task"]')?.dataset.key ?? "");
        L.check("PSL", `${name}: To do's button opens the same screen at the same task`, opened2 === opened, `${opened2} vs ${opened}`);
        await page.locator('[data-tdp="close"]').first().click(); await page.waitForTimeout(600);
        await page.evaluate(([k, v]) => { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [ORDER_KEY, saved] as const);
      }
    } finally {
      await page.evaluate(([k, v]) => { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); }, [ORDER_KEY, saved] as const);
    }
    writeFileSync(resolve(DIR, `psl${MUT ? `.mut-${MUT}` : ""}.json`), JSON.stringify(out, null, 1));
    L.write();
    expect(L.red().map((x) => `${x.what}: ${x.got}`)).toEqual([]);
  });
});

/* ══ PS1R — THE AUDIT (Phase 5): PS1 in REPORT mode on every other phone screen, with touch, loads, icons and the two
   rulings read on the same screens. Nothing fails the run except a screen the probe cannot reach (that is FAILED). ══ */
const LEGACY = [".pf-av.pf-empty", ".pf-lctray", ".pa-addrow", ".pa-anote", ".pa-aq", ".pa-dwish", ".pa5-gc-where",
  ".pa-mtile .pa-mi", ".pa-set .sc-cf", ".pa-pg .pa-annote", ".pa3 .pa3-row", ".pa3 .pa3-opt.on"];
const press = async (page: Page, sel: string) => { const l = page.locator(sel).filter({ visible: true }).first(); await l.click({ timeout: 12_000 }); await page.waitForTimeout(900); };
const go = async (page: Page, path: string) => { await page.goto(path); await page.locator("#root > *").first().waitFor({ state: "attached", timeout: 30_000 }); await settle(page, 2000); };
type Screen = [string, (page: Page) => Promise<void>];
const SCREENS: Screen[] = [
  ["Today · Queries (built to the sheet; the calibration)", async (p) => { await go(p, "/dashboard"); await press(p, '[data-pa5="tab"][data-tab="queries"]'); await stageTo(p, "move"); await p.waitForTimeout(500); }],
  ["Today · Agents", async (p) => { await go(p, "/dashboard"); await press(p, '[data-pa5="tab"][data-tab="agents"]'); }],
  ["Today · Activity", async (p) => { await go(p, "/dashboard"); await press(p, '[data-pa5="tab"][data-tab="activity"]'); }],
  ["To do", async (p) => { await go(p, "/todo"); }],
  ["the task screen", async (p) => { await go(p, "/todo"); await press(p, '[data-pa5="todo-verb"]'); await p.locator('[data-tdp="task"]').first().waitFor(); }],
  ["Materials · Packages", async (p) => { await go(p, "/materials"); await press(p, '[data-pa5="tab"][data-tab="packages"]'); }],
  ["Materials · Letters", async (p) => { await go(p, "/materials"); await press(p, '[data-pa5="tab"][data-tab="letters"]'); }],
  ["Materials · Versions", async (p) => { await go(p, "/materials"); await press(p, '[data-pa5="tab"][data-tab="versions"]'); }],
  ["Materials · Comps", async (p) => { await go(p, "/materials"); await press(p, '[data-pa5="tab"][data-tab="comps"]'); }],
  ["Profile", async (p) => { await go(p, "/you"); }],
  ["the full query list", async (p) => { await go(p, "/queries/all?view=list"); await p.locator('[data-pa4="qrow"]').filter({ visible: true }).first().waitFor(); }],
  ...["Queried", "Partial", "Full", "Offer", "Rejected"].map((w): Screen => [`one query · ${w === "Rejected" ? "closed" : w}`, async (p) => {
    await go(p, "/queries/all?view=list");
    if (w === "Rejected") await press(p, '[data-pa4="chip"][data-k="closed"]');
    const ok = await p.evaluate((word) => { const rows = [...document.querySelectorAll<HTMLElement>('[data-pa4="qrow"]')].filter((x) => x.getClientRects().length); const r = word === "Rejected" ? rows.find((x) => x.dataset.court === "closed") : rows.find((x) => (x.querySelector('[data-pa4="qline"]')?.textContent ?? "").startsWith(word)); r?.click(); return !!r; }, w);
    if (!ok) throw new Error(`no ${w} query in the list`);
    await p.locator('[data-pa3="layer"]').first().waitFor(); await settle(p, 900);
  }]),
  ["the agent sheet", async (p) => { await go(p, "/dashboard"); await press(p, '[data-pa5="tab"][data-tab="agents"]'); await p.evaluate(() => { const b = [...document.querySelectorAll<HTMLElement>("button")].find((x) => x.getClientRects().length && /^See all \d+ agents/.test(x.textContent ?? "")); b?.click(); }); await p.waitForTimeout(900); await press(p, '[data-pa4="arow"]'); }],
  ["the + sheet", async (p) => { await go(p, "/dashboard"); await press(p, '[data-pa4="plus"]'); }],
  ["quick log", async (p) => { await go(p, "/dashboard"); await press(p, '[data-pa4="plus"]'); await p.evaluate(() => { const b = [...document.querySelectorAll<HTMLElement>('[data-pa3="layer"] button')].find((x) => x.getClientRects().length && /log a query|i sent a query/i.test(x.textContent ?? "")); b?.click(); }); await p.waitForTimeout(1200); }],
  ["search", async (p) => { await go(p, "/dashboard"); await press(p, '[data-pa5="today-hd"] [data-pa4="search"]'); }],
  ["the full Birds-eye view", async (p) => { await go(p, "/queries/all?view=birds"); }],
  ["the gaps sheet", async (p) => { await go(p, "/dashboard"); await press(p, '[data-pa5="tab"][data-tab="agents"]'); await press(p, '[data-pa5="fill-gaps"]'); }],
  ["Settings", async (p) => { await go(p, "/account"); }],
  ["Settings · a section", async (p) => { await go(p, "/account"); await p.evaluate(() => { const b = [...document.querySelectorAll<HTMLElement>("a[href], button")].find((x) => x.getClientRects().length && /^(Profile|Your details|Account|Notifications)/.test((x.textContent ?? "").trim())); b?.click(); }); await p.waitForTimeout(1200); }],
  ["set-up · a set-up step", async (p) => { await go(p, "/#/onb-lab?s=frame&form=setup&flow=B&at=list&ms=1"); }],
  ["account · sign-in", async (p) => { await go(p, "/#/onb-lab?s=frame&form=account&mode=signin"); }],
  ["account · sign-up", async (p) => { await go(p, "/#/onb-lab?s=frame&form=account&mode=signup"); }],
];
const PUBLIC: [string, string][] = [["the phone landing", "/"], ["pricing", "/pricing"]];

/** P23: press each tappable for a tenth of a second and see whether anything about it changes */
async function pressed(page: Page): Promise<{ n: number; none: string[] }> {
  const boxes = await page.evaluate(() => {
    const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
    return v("button:not([disabled]), a[href], [role='button'], [role='tab']").filter((e) => !e.closest('[data-pa5="dock"], [aria-hidden="true"]')).slice(0, 40).map((e, i) => {
      e.setAttribute("data-ps-press", String(i)); const b = e.getBoundingClientRect();
      return { i, x: b.left + b.width / 2, y: b.top + b.height / 2, inView: b.top >= 0 && b.bottom <= innerHeight && b.height > 0, label: `${e.tagName.toLowerCase()}.${String(e.className).split(" ")[0]} "${(e.textContent ?? e.getAttribute("aria-label") ?? "").trim().slice(0, 22)}"` };
    });
  });
  const look = (i: number) => page.evaluate((k) => { const e = document.querySelector<HTMLElement>(`[data-ps-press="${k}"]`); if (!e) return ""; const cs = getComputedStyle(e); return [cs.backgroundColor, cs.transform, cs.opacity, cs.filter, cs.boxShadow, cs.color].join("|"); }, i);
  const none: string[] = [];
  let n = 0;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  for (const b of boxes.filter((x) => x.inView)) {
    const before = await look(b.i);
    /* the pressed state, forced (DevTools' :active): a synthetic touch or mouse press did not raise :active in this
       emulation even on Today's rows, whose pressed state is known (the calibration), so it is forced here. What this
       cannot see: a press drawn by script on pointerdown (To do's card) — named in the report as not covered. */
    const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `[data-ps-press="${b.i}"]` });
    if (!nodeId) continue;
    await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] }); await page.waitForTimeout(60);
    const during = await look(b.i);
    await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });
    n++; if (before === during) none.push(b.label);
  }
  await cdp.detach();
  return { n, none };
}
/** P22: every icon — its box and its stroke */
async function icons(page: Page) {
  return page.evaluate(() => {
    const v = (window as unknown as { __v: (s: string) => HTMLElement[] }).__v;
    /* a status mark is not an icon (P22: status is drawn only by the marks): StatusDot is a span[role=img] named for
       the status around its svg; V3Glyph and the seal's badge carry their own classes */
    const STATUS = /^(Queried|Partial|Full|Offer|Revise|Rejected|Withdrawn|No Response|Resubmitted|Signed|Closed|Not queried)/i;
    const isMark = (s: Element) => !!s.closest('.pa-disc, .ps-disc, .pa3-gl, .pa4-seal, [data-pa5="mini-track"], .pa5-ch, [data-pa5="dock"]') || [s.parentElement, s.parentElement?.parentElement].some((a) => !!a && a.getAttribute("role") === "img" && STATUS.test(a.getAttribute("aria-label") ?? ""));
    return v("svg").filter((s) => !isMark(s) && s.getBoundingClientRect().width <= 40 && s.getBoundingClientRect().width > 0)
      .map((s) => { const b = s.getBoundingClientRect(); const p = s.querySelector("path, circle, line, rect, polyline") ?? s; const cs = getComputedStyle(p); return { box: `${Math.round(b.width)}×${Math.round(b.height)}`, stroke: cs.stroke === "none" ? "fill" : cs.strokeWidth, cap: cs.strokeLinecap, where: String((s.parentElement?.className as unknown) ?? "").split(" ")[0] }; });
  });
}
/** P26: a throttled reload — a spinner on a blank screen, and how far the layout jumps */
async function load(page: Page, path: string) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 200_000, uploadThroughput: 100_000 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(() => { const w = window as unknown as { __cls: number; __spin: number }; w.__cls = 0; w.__spin = 0;
    try { new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch { /* none */ }
    /* a spinner: something visible turning (an animation named for spinning or rotating) or a progressbar */
    const t = setInterval(() => { const on = [...document.querySelectorAll<HTMLElement>("body *")].some((e) => e.getClientRects().length > 0 && (e.getAttribute("role") === "progressbar" || /spin|rotat/i.test(getComputedStyle(e).animationName))); if (on) w.__spin++; }, 100); setTimeout(() => clearInterval(t), 15_000); });
  await page.goto(path); await page.waitForTimeout(9000);
  const r = await page.evaluate(() => { const w = window as unknown as { __cls: number; __spin: number }; return { cls: Math.round(w.__cls * 1000) / 1000, spinnerTicks: w.__spin }; });
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await cdp.detach();
  return r;
}
/** ruling 1b: inside each legacy reader, the pixels with the page at its new oat and at its old #f8f6f2 */
async function legacyPixels(page: Page) {
  const found = await page.evaluate((sels) => sels.flatMap((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getClientRects().length && e.getBoundingClientRect().width > 6).slice(0, 1).map((e) => { e.setAttribute("data-ps-legacy", s); return s; })), LEGACY);
  const out: { sel: string; same: boolean; bg: string }[] = [];
  for (const s of found) {
    const loc = page.locator(`[data-ps-legacy="${s}"]`).first();
    await loc.scrollIntoViewIfNeeded().catch(() => {});
    const box = await loc.boundingBox(); if (!box || box.width < 6 || box.height < 6) continue;
    /* inside the element: clear of its rounded corners, where the page behind shows through and is meant to change */
    /* (its own corners or a parent card's: 24 clears the largest phone corner, P19) */
    const rad = Math.min(box.width / 2 - 1, 24);
    const clip = { x: box.x + rad, y: box.y + 2, width: Math.max(2, box.width - 2 * rad), height: box.height - 4 };
    const cdp = s.includes("pa3-row") ? await page.context().newCDPSession(page) : null;
    if (cdp) { const { root } = await cdp.send("DOM.getDocument"); const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: `[data-ps-legacy="${s}"]` }); await cdp.send("CSS.enable"); await cdp.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] }); }
    const a = await page.screenshot({ clip });
    const tagId = await page.evaluate(() => { const st = document.createElement("style"); st.id = "ps-old-page"; st.textContent = ":is(.sa-shellframe,.pa-layer){--pa-page:#f8f6f2 !important}"; document.head.appendChild(st); return st.id; });
    await page.waitForTimeout(150);
    const b = await page.screenshot({ clip });
    await page.evaluate((id) => document.getElementById(id)?.remove(), tagId);
    const bg = await loc.evaluate((e) => getComputedStyle(e).backgroundColor);
    if (cdp) await cdp.detach();
    if (!a.equals(b)) { const k = s.replace(/[^a-z0-9]+/gi, "-"); writeFileSync(resolve(DIR, "audit", `legacy${k}-new.png`), a); writeFileSync(resolve(DIR, "audit", `legacy${k}-old.png`), b); }
    out.push({ sel: s, same: a.equals(b), bg });
  }
  return out;
}
/** ruling 1a: the fades' opaque ends, the seal's ring and the fold corner, against the computed page */
async function followers(page: Page) {
  return page.evaluate(() => {
    const ground = getComputedStyle(document.querySelector<HTMLElement>(".ws-main") ?? document.body).backgroundColor;
    const out: { what: string; got: string; page: string; onCard: boolean }[] = [];
    const last = (bgi: string) => { const m = [...bgi.matchAll(/rgba?\([^)]+\)/g)].map((x) => x[0]); return m[m.length - 1] ?? ""; };
    for (const e of [...document.querySelectorAll<HTMLElement>(".tdp-foot, .pa-edgefade")].filter((x) => x.getClientRects().length)) out.push({ what: `fade ${e.className.split(" ")[0]}`, got: last(getComputedStyle(e).backgroundImage), page: getComputedStyle(e.closest<HTMLElement>(".tdp-task") ?? document.querySelector<HTMLElement>(".ws-main") ?? document.body).backgroundColor, onCard: false });
    for (const e of [...document.querySelectorAll<HTMLElement>(".pa4-seal .pa3-gl")].filter((x) => x.getClientRects().length).slice(0, 3)) {
      const sh = getComputedStyle(e).boxShadow; const col = (sh.match(/rgba?\([^)]+\)/) ?? [""])[0];
      let bg = ""; for (let n = e.parentElement?.parentElement ?? null; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== "rgba(0, 0, 0, 0)") { bg = c; break; } }
      out.push({ what: "seal ring", got: col, page: ground, onCard: bg !== ground });
    }
    for (const e of [...document.querySelectorAll<HTMLElement>(".pa-sheetc")].filter((x) => x.getClientRects().length).slice(0, 2)) {
      const bi = getComputedStyle(e, "::before").backgroundImage; const col = (bi.match(/rgba?\([^)]+\)/) ?? [""])[0];
      let bg = ""; for (let n = e.parentElement; n; n = n.parentElement) { const c = getComputedStyle(n).backgroundColor; if (c !== "rgba(0, 0, 0, 0)") { bg = c; break; } }
      out.push({ what: "fold corner", got: col, page: ground, onCard: bg !== ground });
    }
    return out;
  });
}

test.describe("PS1R audit", () => {
  test.skip(skip("audit") || !!MUT, "another mode");
  test("PS1R · every other phone screen, in report mode (390 × 844)", async ({ page, browser }) => {
    test.setTimeout(3_600_000);
    const L = new Ledger("PS1R");
    const report: Record<string, unknown> = {};
    await phone(page, PHONES[0]);
    for (const [name, open] of SCREENS) {
      const slug = name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
      try { await open(page); }
      catch (e) { report[name] = { failed: String(e).slice(0, 200) }; L.check("PS1R", `${name}: reached`, false, String(e).slice(0, 160)); continue; }
      /* an open overlay covers the page under it: read the overlay alone */
      const roots = await page.evaluate(() => {
        const o = [...document.querySelectorAll<HTMLElement>('[data-pa3="layer"] > *, [role="dialog"][aria-modal="true"]')].filter((e) => e.getClientRects().length && e.getBoundingClientRect().height > 200);
        o.forEach((e, i) => e.setAttribute("data-ps-root", String(i)));
        return o.length ? o.map((_, i) => `[data-ps-root="${i}"]`) : ["body"];
      });
      const r = await probe(page, roots);
      const legacy = await legacyPixels(page);
      const fol = await followers(page);
      const ic = await icons(page);
      await page.screenshot({ path: resolve(DIR, "audit", `${slug}.png`) });
      const pr = await pressed(page);
      report[name] = { roots, rules: Object.fromEntries(PS_RULES.map((k) => [k, r.rules[k]?.length ?? 0])), samples: r.rules, pop: r.pop, pressed: pr, icons: ic, legacy, followers: fol };
      L.check("PS1R", `${name}: reached (${r.pop.texts} texts, ${r.pop.taps} taps)`, r.pop.texts > 0, "");
      /* PSR — the rulings, hard: 1a every fade's opaque end and every ring on the page equal the page; 1b every legacy
         reader on show is pixel-identical inside itself with the page at either colour */
      for (const x of fol) if (!x.onCard) L.check("PSR-1a", `${name}: ${x.what} = the page`, x.got === x.page, `${x.got} vs ${x.page}`);
      for (const x of legacy) L.check("PSR-1b", `${name}: ${x.sel} unchanged inside (pixels)`, x.same, x.bg);
    }
    /* loads: a throttled reload of each root */
    const loads: Record<string, unknown> = {};
    for (const p of ["/dashboard", "/todo", "/materials", "/you", "/queries/all?view=list"]) loads[p] = await load(page, p);
    report["(loads)"] = loads;
    /* ruling 1b, for every reader: its own class chain built inside a phone layer, its background read with the page
       at the new oat and at the old #f8f6f2 (the pixel proof above covers the readers a screen showed) */
    report["(legacy, by class chain)"] = await page.evaluate((sels) => sels.map((sel) => {
      const host = document.createElement("div"); host.className = "pa-layer"; document.body.appendChild(host);
      let parent: HTMLElement = host, leaf: HTMLElement = host;
      for (const part of sel.split(" ")) { const [cls, ...pseudo] = part.split(":"); const e = document.createElement("div"); e.className = cls.split(".").filter(Boolean).join(" "); parent.appendChild(e); parent = e; leaf = e; void pseudo; }
      /* the pressed row reads the holding value only while pressed: at rest it is transparent in both states, and its
         pressed pixels are read on a screen that shows it (forced :active) */
      const active = sel.includes(":active");
      const read = () => getComputedStyle(leaf).backgroundColor;
      const a = active ? "(pressed state: read by pixels only)" : read();
      const st = document.createElement("style"); st.textContent = ":is(.sa-shellframe,.pa-layer){--pa-page:#f8f6f2 !important}"; document.head.appendChild(st);
      const b = active ? a : read();
      st.remove(); host.remove();
      return { sel, newPage: a, oldPage: b, same: a === b };
    }), LEGACY);
    for (const x of report["(legacy, by class chain)"] as { sel: string; same: boolean; newPage: string }[]) L.check("PSR-1b", `${x.sel}: its background unchanged by the page (class chain)`, x.same && (x.sel === ".pa3 .pa3-row" || x.newPage === "rgb(248, 246, 242)"), x.newPage);
    /* the public pages, as a stranger */
    const ctx = await browser.newContext({ viewport: PHONES[0], isMobile: true, hasTouch: true, storageState: { cookies: [], origins: [] } });
    const pub = await ctx.newPage();
    await pub.addInitScript(() => { const w = window as unknown as { __v: (s: string, r?: ParentNode) => HTMLElement[] }; w.__v = (s, r = document) => [...r.querySelectorAll<HTMLElement>(s)].filter((e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== "hidden"); });
    for (const [name, path] of PUBLIC) {
      try { await pub.goto(path); await settle(pub, 2500); }
      catch (e) { report[name] = { failed: String(e).slice(0, 200) }; L.check("PS1R", `${name}: reached`, false, String(e).slice(0, 160)); continue; }
      const r = await probe(pub, ["body"]);
      await pub.screenshot({ path: resolve(DIR, "audit", `${name.replace(/[^a-z0-9]+/gi, "-")}.png`) });
      report[name] = { rules: Object.fromEntries(PS_RULES.map((k) => [k, r.rules[k]?.length ?? 0])), samples: r.rules, pop: r.pop, icons: await icons(pub) };
      L.check("PS1R", `${name}: reached (${r.pop.texts} texts)`, r.pop.texts > 0, "");
    }
    await ctx.close();
    writeFileSync(resolve(DIR, "audit.json"), JSON.stringify(report, null, 1));
    L.write();
    /* report mode: only a screen the probe could not reach fails — and the rulings (PSR), which are locks */
    expect(L.red().map((x) => `${x.what}: ${x.got}`)).toEqual([]);
  });
});
