/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19.1 — locks CL191 A1 to G1 (design-refs/contact-list-v19-1/contact-list-v19-1.html), on the rendered
 * page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * Each lock was run against the build before the pack (v19 as on dev; `CL191_BASE=1`, ledger `base-<lock>.json`) and
 * with its named mutation (`CL191_MUTATE=<lock>`, ledger `mut-<lock>.json`) before its green was believed. A page
 * mutation is CSS or script applied in the page (MUTATIONS); a `src` mutation (B1, C1, D1) is a source edit made and
 * undone in this pack's worktree, from a path-derived backup, with `CL191_MUTATE` naming the ledger only. E1 carries two
 * mutations: `CL191-E1` (a clipping overflow on the band) and `CL191-E1-z` (the pinned head's z-index dropped).
 *
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible copy (box height > 0).
 * ⚠️ PINNING TICKS THE GETTING-STARTED GUIDE: every test that pins records the guide's state, marks it seen with "pin"
 *    done, and restores it exactly in `finally`.
 * ⚠️ B1 WRITES TO THE ACCOUNT: the harness has no websites, so one agent is given a long website and email (the same
 *    fixture as CL19-C1) and gets back exactly what it had (absent means deleted).
 * ⚠️ A ROW OPENS ON A 450ms HOVER, which changes its height: A1 reads its hover state well inside that.
 * ⚠️ THE ILLUSTRATION AND THE SHEET'S LIP TAKE NO POINTER EVENTS, so `elementsFromPoint` skips both: E1 gives every
 *    element `pointer-events: auto` for the one read (as PH3 does for one), or the probe answers "the band" or "the art"
 *    whatever paints on top. A first version freed only the art and read the base GREEN with the lip over the art.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { openContacts16, LOADED_ROW16, LIB16, MEMORY_KEYS, VIEW_KEYS } from "./cl16Lib";
import { harnessDb } from "./harnessDocs";

const DIR = "reports/contact-list-v19-1";
const MUT = process.env.CL191_MUTATE ?? "";
const BASE = process.env.CL191_BASE === "1";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const guideNow = () => sh("node tests/e2e/guideFlags.mjs").trim().split("\n").pop()!;
const guideSet = (args: string) => sh(`node tests/e2e/guideFlags.mjs ${args}`);
const guideRestore = (json: string) => sh(`node tests/e2e/guideFlags.mjs --restore '${json}'`);
const NAVY = "rgb(42, 58, 82)", CREAM = "rgb(244, 238, 229)";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    const mine = MUT === this.name || MUT.startsWith(`${this.name}-`);
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : ""}${mine ? `mut-${MUT}` : this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, in the page. B1, C1 and D1 are broken in `src` (the report names each). */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* show it at rest */
  "CL191-A1": { css: `.cl19-c .cl19-miss .cl19-mt { visibility: visible !important; }` },
  /* remove it from the tab order */
  "CL191-A2": { js: `(() => { const fix = () => { for (const b of document.querySelectorAll('.cl19-miss')) if (b.getAttribute('tabindex') !== '-1') b.setAttribute('tabindex', '-1'); }; fix(); new MutationObserver(fix).observe(document.body, { subtree: true, childList: true }); })()` },
  /* re-add the clipping overflow (on the band the art grows out of) */
  "CL191-E1": { css: `.cl19-head[data-pinned] .cl19-band { overflow: hidden !important; }` },
  /* the pinned head loses the lip's level */
  "CL191-E1-z": { css: `.clv-group .cl16-list .cl19-head[data-pinned] { z-index: auto !important; }` },
  /* revert the bar: v19's unpinned toolbar and Pin */
  "CL191-F1": { css: `.cl19-head:not([data-pinned]) .cl19-tb { background: rgb(247, 244, 238) !important; border-bottom: 1px solid rgba(28, 19, 15, 0.12) !important; } .cl19-head:not([data-pinned]) .cl19-pin { background: #2a3a52 !important; color: #fff !important; } .cl19-head:not([data-pinned]) .cl19-az button { color: #2a3a52 !important; } .clv-group:not([data-full]) .cl16-list.cl19-card { border-bottom-left-radius: 0 !important; border-bottom-right-radius: 0 !important; }` },
  /* restore powder */
  "CL191-G1": { css: `.cl19-strip { background: #edf1f7 !important; }` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock || MUT.startsWith(`${lock}-`) ? MUTATIONS[MUT] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(200);
};
/** every open starts from the defaults (as CL19's `open`): a second open in the same tab clears the list's memory */
const open = async (page: Page, vp: VP, lock: string) => {
  if (/^https?:/.test(page.url())) await page.evaluate(({ m, v }) => { try { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); } catch { /* private mode */ } }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  await openContacts16(page, vp);
  const dirty = await page.evaluate(({ m, v }) => { try { return [...m.map((k) => sessionStorage.getItem(k)), ...v.map((k) => localStorage.getItem(k))].some((x) => x != null && /"pinned":true|"group":"(?!none)|"scroll":[1-9]|"search":"[^"]/.test(x)); } catch { return false; } }, { m: MEMORY_KEYS, v: VIEW_KEYS });
  if (dirty) {
    await page.evaluate(({ m, v }) => { for (const k of m) sessionStorage.removeItem(k); for (const k of v) localStorage.removeItem(k); }, { m: MEMORY_KEYS, v: VIEW_KEYS });
    await page.reload(); await expect(page.locator(LOADED_ROW16).first()).toBeVisible({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; animation: none !important; }" });
    await page.waitForTimeout(400);
    await page.evaluate(LIB16);
  }
  await mutate(page, lock);
};
const withGuide = async (fn: () => Promise<void>) => {
  const g0 = guideNow();
  try { guideSet("--seen --done pin"); await fn(); } finally { await new Promise((r) => setTimeout(r, 1500)); guideRestore(g0); }
};
const click = async (page: Page, L: Ledger, sel: string, where: string) => {
  try { await page.locator(sel).filter({ visible: true }).first().click({ timeout: 6000 }); return true; }
  catch { L.check(`${where}: "${sel}" could be pressed`, false, "missing, hidden or covered"); return false; }
};
const pinned = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl19='pin']")].find((e) => e.getBoundingClientRect().height > 0)?.getAttribute("aria-pressed") === "true");
const setPin = async (page: Page, L: Ledger, on: boolean, where: string) => {
  if ((await pinned(page)) === on) return true;
  const ok = await click(page, L, "[data-cl19='pin']", where);
  await page.waitForTimeout(900);
  return ok && (await pinned(page)) === on;
};
const groupBy = async (page: Page, L: Ledger, key: string, where: string) => {
  if (!(await click(page, L, "button.cl19-grp", where))) return false;
  await page.waitForTimeout(350);
  const ok = await click(page, L, `[data-opt="group:${key}"]`, where);
  await page.waitForTimeout(700);
  return ok;
};
const scrollTo = (page: Page, y: number | "end") => page.evaluate(async (y) => {
  const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((e) => e.getBoundingClientRect().height > 0);
  const sc = card?.closest<HTMLElement>(".wpg-scroll");
  if (!sc) return null;
  sc.style.scrollBehavior = "auto";
  sc.scrollTop = y === "end" ? sc.scrollHeight : y;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 250));
  return sc.scrollTop;
}, y);
/** a row (by data) wholly on screen, clear of the sticky head at the top and the window's foot */
const rowOnScreen = (page: Page, sel: string, vp: VP) => page.evaluate(({ sel, h }) => {
  const head = [...document.querySelectorAll<HTMLElement>(".lt-labels.lth")].find((e) => e.getBoundingClientRect().height > 0);
  const top = Math.max(head ? head.getBoundingClientRect().bottom + 8 : 0, 120);
  const rows = [...document.querySelectorAll<HTMLElement>(".aglist [data-clv='row'][data-agent-card]")].filter((e) => { const b = e.getBoundingClientRect(); return b.height > 0 && b.top >= top && b.bottom <= h - 90 && !!e.querySelector(sel); });
  return rows.map((r) => r.dataset.agentCard!);
}, { sel, h: vp.height });

/* ───────────────────────── A · a missing website or email ───────────────────────── */
const readMiss = (page: Page, id: string) => page.evaluate((id) => {
  const row = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0);
  if (!row) return null;
  const cell = (k: string) => {
    const b = row.querySelector<HTMLElement>(`[data-cl19="add-${k}"]`), mt = b?.querySelector<HTMLElement>(".cl19-mt");
    if (!b) return null;
    const c = mt ? getComputedStyle(mt) : null;
    /* anything drawn in the cell besides the words: an icon, or other text */
    const icon = [...b.querySelectorAll<SVGElement>("svg")].filter((s) => s.getBoundingClientRect().width > 0 && getComputedStyle(s).visibility !== "hidden").length;
    const other = [...b.childNodes].filter((n) => n !== mt && (n.textContent ?? "").trim()).length;
    return { mt: !!mt, vis: c?.visibility ?? null, text: (mt?.textContent ?? "").trim(), fs: c?.fontSize ?? null, color: c?.color ?? null, icon, other };
  };
  return { h: row.getBoundingClientRect().height, peek: row.hasAttribute("data-peek"), email: cell("email"), website: cell("website") };
}, id);
test("CL191-A1 · blank: a missing email's (and website's) add link is hidden at rest, visible while its row is hovered, the row's height unchanged", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL191-A1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL191-A1");
    /* RE-POINTED (Contact list v20 §A): the title row sits above the card, so at 1280 × 800 the rows start 54px lower and
       the window this reads can hold no row without an email at the top; scrolled 300 it holds some again */
    let ids = (await rowOnScreen(page, "[data-cl19='add-email']", vp)).slice(0, 3);
    if (!ids.length) { await scrollTo(page, 300); ids = (await rowOnScreen(page, "[data-cl19='add-email']", vp)).slice(0, 3); }
    L.check(`${w} rows with no email on screen (the population)`, ids.length >= 1, `${ids.length}`);
    for (const id of ids) {
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const rest = await readMiss(page, id);
      const name = page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"] .clv-rwn b`).filter({ visible: true }).first();
      const b = await name.boundingBox();
      if (!b || !rest) { L.check(`${w} ${id}: the row is there`, false, "missing"); continue; }
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(80);
      const hov = await readMiss(page, id);
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      for (const k of ["email", "website"] as const) {
        const r = rest[k], h = hov?.[k];
        if (!r) { if (k === "email") L.check(`${w} ${id}: the email cell has an add link`, false, "none"); continue; }
        L.check(`${w} ${id} ${k}: the words are their own element (.cl19-mt)`, r.mt, `${r.mt}`);
        L.check(`${w} ${id} ${k}: at rest the add link is visibility:hidden`, r.vis === "hidden", `${r.vis}`);
        L.check(`${w} ${id} ${k}: at rest nothing else is drawn (no icon, no text, no dash)`, r.icon === 0 && r.other === 0, `icon ${r.icon} · other ${r.other}`);
        L.check(`${w} ${id} ${k}: hovered, it is visible`, h?.vis === "visible", `${h?.vis}`);
        L.check(`${w} ${id} ${k}: hovered, it reads "+ Add ${k}", 14px navy`, h?.text === `+ Add ${k}` && h?.fs === "14px" && h?.color === NAVY, `"${h?.text}" ${h?.fs} ${h?.color}`);
      }
      L.check(`${w} ${id}: the row had not opened when read (precondition)`, !hov?.peek, `${hov?.peek}`);
      L.check(`${w} ${id}: the row's height is identical at rest and hovered`, near((hov?.h ?? NaN) - rest.h, 0, 0.01), `${rest.h} → ${hov?.h}`);
    }
  }
  L.done(20);
});

test("CL191-A2 · focus: Tab reaches the hidden add link, which shows with a focus ring; Enter opens the add flow, not the card", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL191-A2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL191-A2");
    /* RE-POINTED (Contact list v20 §A): as A1 — scrolled 300 when the title row leaves the window without such a row */
    let id = (await rowOnScreen(page, "[data-cl19='add-email']", vp))[0];
    if (!id) { await scrollTo(page, 300); id = (await rowOnScreen(page, "[data-cl19='add-email']", vp))[0]; }
    L.check(`${w} a row with no email on screen (precondition)`, !!id, `${id}`);
    if (!id) continue;
    await page.mouse.move(5, 5); await page.waitForTimeout(300);
    /* focus the tab stop just before the link in document order (never the link itself), then Tab */
    const prep = await page.evaluate((id) => {
      const row = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0)!;
      const target = row.querySelector<HTMLElement>("[data-cl19='add-email']")!;
      const mt = target.querySelector<HTMLElement>(".cl19-mt");
      const before = mt ? getComputedStyle(mt).visibility : null;
      const all = [...document.querySelectorAll<HTMLElement>("a[href], button, input, select, textarea, [tabindex]")]
        .filter((e) => e === target || (e.tabIndex >= 0 && !(e as HTMLButtonElement).disabled && e.getBoundingClientRect().height > 0 && getComputedStyle(e).visibility !== "hidden"));
      const i = all.indexOf(target);
      const prev = all[i - 1];
      prev?.focus();
      return { before, prev: prev ? `${prev.tagName}.${String(prev.className).slice(0, 30)}` : null, focused: document.activeElement === prev };
    }, id);
    L.check(`${w} hidden before it is reached (precondition)`, prep.before === "hidden", `${prep.before}`);
    L.check(`${w} the stop before it took focus (precondition)`, !!prep.prev && prep.focused, `${prep.prev}`);
    await page.keyboard.press("Tab"); await page.waitForTimeout(150);
    const f = await page.evaluate((id) => {
      const a = document.activeElement as HTMLElement | null;
      const isIt = !!a && a.matches(`[data-agent-card="${id}"] [data-cl19='add-email']`);
      const mt = a?.querySelector<HTMLElement>(".cl19-mt");
      const c = a ? getComputedStyle(a) : null;
      return { isIt, at: a ? `${a.tagName}.${String(a.className).slice(0, 30)} ${a.dataset.cl19 ?? ""}` : null, vis: mt ? getComputedStyle(mt).visibility : null,
        fv: !!a && a.matches(":focus-visible"), os: c?.outlineStyle ?? null, ow: parseFloat(c?.outlineWidth ?? "0"), oc: c?.outlineColor ?? null };
    }, id);
    L.check(`${w} Tab reaches the add link`, f.isIt, `${f.at}`);
    L.check(`${w} focused, its words are visible`, f.isIt && f.vis === "visible", `${f.vis}`);
    L.check(`${w} focused, a visible focus ring (:focus-visible, an outline ≥ 1px)`, f.isIt && f.fv && f.os !== "none" && f.ow >= 1, `${f.fv} ${f.os} ${f.ow}px ${f.oc}`);
    if (f.isIt) {
      await page.keyboard.press("Enter"); await page.waitForTimeout(1200);
      const p = await page.evaluate((id) => {
        const panels = [...document.querySelectorAll<HTMLElement>("[data-ap='panel']")].filter((e) => e.getBoundingClientRect().height > 0);
        return { n: panels.length, id: panels[0]?.dataset.apId ?? null, acting: panels[0]?.dataset.apActing ?? null,
          edit: panels.some((e) => !!e.querySelector("[data-ap='act'][data-ap-act='edit']")) };
      }, id);
      L.check(`${w} Enter opens the add flow: the agent's card in its editor`, p.n === 1 && p.id === id && p.acting === "edit" && p.edit, JSON.stringify(p));
      L.check(`${w} not the card on its own (a panel that is not editing)`, p.acting === "edit", `${p.acting}`);
    } else L.check(`${w} Enter opens the add flow`, false, "the link was never focused");
    for (let i = 0; i < 4; i++) { await page.keyboard.press("Escape"); await page.waitForTimeout(250); }
    const left = await page.locator("[data-ap='panel']").filter({ visible: true }).count();
    L.check(`${w} Escape puts the panel away (clean-up)`, left === 0, `${left}`);
  }
  L.done(14);
});

/* ───────────────────────── B · website and email text ───────────────────────── */
const LONG = "msv12-agent-4";
const LONG_EMAIL = "theo.abara@abaragrantliteraryagency.co.uk", LONG_WEB = "https://www.abaragrantliteraryagency.co.uk";
const withLong = async (fn: () => Promise<void>) => {
  const { db, uid } = await harnessDb();
  const ref = doc(db, "users", uid, "agents", LONG);
  const d = (await getDoc(ref)).data() ?? {};
  const before = { email: d.email, website: d.website };
  try {
    await updateDoc(ref, { email: LONG_EMAIL, website: LONG_WEB });
    await fn();
  } finally {
    await updateDoc(ref, { email: before.email === undefined ? deleteField() : before.email, website: before.website === undefined ? deleteField() : before.website });
    const after = (await getDoc(ref)).data() ?? {};
    if (after.email !== before.email || after.website !== before.website) throw new Error(`B1 did not put ${LONG} back: ${JSON.stringify({ before, after: { email: after.email, website: after.website } })}`);
  }
};
test("CL191-B1 · icons: each website and email has a 15px icon before its text, no underline at rest, and is ≥ 18px clear of the next column", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL191-B1");
  await withLong(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL191-B1");
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
      const r = await page.evaluate(() => {
        const vals = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='website'], .aglist [data-cl19='email']")].filter((e) => e.getBoundingClientRect().height > 0);
        return { stacked: !![...document.querySelectorAll<HTMLElement>(".aglist [data-cl19-stacked]")].find((e) => e.getBoundingClientRect().height > 0), vals: vals.map((v) => {
          const kind = v.dataset.cl19!;
          const ic = v.querySelector<SVGElement>(`svg.cl19-ci`), t = v.querySelector<HTMLElement>(kind === "website" ? ".cl19-wt" : ".cl19-et");
          const ib = ic?.getBoundingClientRect(), tb = t?.getBoundingClientRect(), vb = v.getBoundingClientRect();
          const cell = v.closest<HTMLElement>(".cl19-c");
          let next: HTMLElement | null = cell?.nextElementSibling as HTMLElement | null;
          while (next && !(next.getBoundingClientRect().height > 0 && !next.matches("[data-cl19='strip']"))) next = next.nextElementSibling as HTMLElement | null;
          const deco = (e: Element | null | undefined) => (e ? getComputedStyle(e).textDecorationLine : null);
          return { kind, text: (t?.textContent ?? "").trim(), icon: ib ? { w: ib.width, h: ib.height } : null, before: !!ib && !!tb && ib.right <= tb.left + 0.5, gapToText: ib && tb ? tb.left - ib.right : null,
            deco: deco(t), decoParent: deco(v), right: vb.right, nextLeft: next?.getBoundingClientRect().left ?? null, next: next ? String(next.className).slice(0, 24) : null };
        }) };
      });
      const webs = r.vals.filter((v) => v.kind === "website"), mails = r.vals.filter((v) => v.kind === "email");
      L.check(`${w} the population: websites and emails, the long ones among them`, webs.length >= 1 && mails.length >= 5 && webs.some((v) => v.text.includes("abaragrantliteraryagency")) && mails.some((v) => v.text === LONG_EMAIL), `${webs.length} websites · ${mails.length} emails`);
      for (const v of r.vals) {
        const k = `${w} ${v.kind} "${v.text}"`;
        L.check(`${k}: a 15 ±1px icon`, !!v.icon && near(v.icon.w, 15, 1) && near(v.icon.h, 15, 1), JSON.stringify(v.icon));
        L.check(`${k}: the icon comes before the text, 6 ±1.5 to it`, v.before && near(v.gapToText, 6, 1.5), `${v.before} · ${v.gapToText?.toFixed(1)}`);
        L.check(`${k}: no underline at rest`, v.deco === "none" && v.decoParent === "none", `${v.deco} · ${v.decoParent}`);
        L.check(`${k}: ≥ 18px clear of the next column (${v.next})`, v.nextLeft != null && v.nextLeft - v.right >= 18 - 0.5, `${(v.nextLeft ?? NaN) - v.right}`);
      }
      console.log(`  ${w}: ${webs.length} websites, ${mails.length} emails, stacked ${r.stacked}; least clearance ${Math.min(...r.vals.map((v) => (v.nextLeft ?? NaN) - v.right)).toFixed(1)}`);
    }
  });
  L.done(30);
});

/* ───────────────────────── C · Date added ───────────────────────── */
const DATE_RE = /^\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4}$/;
test("CL191-C1 · date: every Date added reads '25 Jun 2026', and all its text is one colour", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL191-C1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, vp, "CL191-C1");
    const ds = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='date']")].filter((e) => e.getBoundingClientRect().height > 0 && !e.hasAttribute("data-none")).map((d) => {
      const tw = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
      const cols = new Set<string>(); for (let n = tw.nextNode(); n; n = tw.nextNode()) if ((n.textContent ?? "").trim()) cols.add(getComputedStyle(n.parentElement!).color);
      return { t: (d.textContent ?? "").replace(/\s+/g, " ").trim(), cols: [...cols], own: getComputedStyle(d).color };
    }));
    L.check(`${w} the population: dates on the rows`, ds.length >= 10, `${ds.length}`);
    const bad = ds.filter((d) => !DATE_RE.test(d.t));
    L.check(`${w} every date matches "D Mon YYYY" (never "Sept")`, ds.length > 0 && bad.length === 0, JSON.stringify(bad.slice(0, 4).map((d) => d.t)));
    const mixed = ds.filter((d) => d.cols.length !== 1 || d.cols[0] !== d.own);
    L.check(`${w} all of each date's text is one computed colour`, ds.length > 0 && mixed.length === 0, JSON.stringify(mixed.slice(0, 3)));
    L.check(`${w} that colour is ink rgb(28, 19, 15)`, ds.length > 0 && ds.every((d) => d.own === "rgb(28, 19, 15)"), [...new Set(ds.map((d) => d.own))].join(" "));
    console.log(`  ${w}: ${ds.length} dates, e.g. ${ds.slice(0, 3).map((d) => d.t).join(" · ")}`);
  }
  L.done(8);
});

/* ───────────────────────── D · the Agent column ───────────────────────── */
test("CL191-D1 · agent width: with sparse data Agent is no wider than its widest name or agency line + 8 (floor 230, ≤ 330); no gap over 56; the headings follow", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL191-D1");
  await withGuide(async () => {
    for (const vp of SIZES) {
      for (const pos of ["unpinned", "pinned"] as const) {
        const w = `@${vp.width} ${pos}`;
        await open(page, vp, "CL191-D1");
        if (pos === "pinned") L.check(`${w} pinned (precondition)`, await setPin(page, L, true, `${w} pin`), "");
        const r = await page.evaluate(() => {
          const vis = (s: string, root: ParentNode = document) => [...root.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
          const rows = vis(".aglist [data-clv='row'][data-agent-card]");
          const range = document.createRange();
          const tw = (e: Element | null) => { if (!e) return { l: NaN, w: 0 }; range.selectNodeContents(e); const b = range.getBoundingClientRect(); return { l: b.left, w: b.width }; };
          /* disc + gap + text, from the disc's left */
          let need = 0, needWho = "";
          for (const r of rows) {
            const disc = r.querySelector<HTMLElement>(".clv-ini"); if (!disc) continue;
            const d = disc.getBoundingClientRect().left;
            const nm = tw(r.querySelector(".clv-rwn b"));
            const agyEl = r.querySelector<HTMLElement>(".clv-ragy"), ag = tw(agyEl);
            const n1 = nm.l - d + nm.w, n2 = agyEl ? ag.l - d + Math.max(ag.w, agyEl.scrollWidth) : 0;
            if (Math.max(n1, n2) > need) { need = Math.max(n1, n2); needWho = r.dataset.agentCard ?? ""; }
          }
          const hAgent = vis(".lt-labels.lth > [data-lt-col='Agent']")[0];
          const head = hAgent ? tw(hAgent).w : 0;
          const row = rows[0], cs = row ? getComputedStyle(row) : null;
          const tracks = cs ? cs.gridTemplateColumns.split(" ").map(parseFloat) : [];
          const gap = cs ? parseFloat(cs.columnGap) : NaN;
          const lbl = vis(".lt-labels.lth")[0], lgap = lbl ? parseFloat(getComputedStyle(lbl).columnGap) : NaN;
          const lefts: number[] = [];
          if (row && cs) { let x = row.getBoundingClientRect().left + parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth); for (const t of tracks) { lefts.push(x); x += t + gap; } }
          const heads = vis(".lt-labels.lth > [data-lt-col]").map((h) => h.getBoundingClientRect().left);
          const web = rows.filter((r) => r.querySelector("[data-cl19='website']")).length, mail = rows.filter((r) => r.querySelector("[data-cl19='email']")).length;
          return { n: rows.length, need, needWho, head, tracks, template: cs?.gridTemplateColumns ?? null, gap, lgap, lefts, heads, web, mail };
        });
        const agent = r.tracks[0];
        const want = Math.min(330, Math.max(230, Math.max(r.need, r.head) + 8));
        L.check(`${w} the population: rows, sparse websites and emails`, r.n > 20 && r.web <= r.n * 0.2 && r.mail <= r.n * 0.6, `${r.n} rows · ${r.web} websites · ${r.mail} emails`);
        L.check(`${w} Agent ≤ its widest name / agency line (${r.need.toFixed(1)}, ${r.needWho}) or heading (${r.head.toFixed(1)}) + 8, floor 230 (= ${want.toFixed(1)}) ±2`, agent <= want + 2, `Agent ${agent} · template ${r.template}`);
        L.check(`${w} Agent ≤ 330`, agent <= 330.5, `${agent}`);
        L.check(`${w} no gap between columns over 56`, r.gap <= 56.01 && r.lgap <= 56.01, `rows ${r.gap} · headings ${r.lgap}`);
        L.check(`${w} the headings and rows share one gap`, near(r.gap - r.lgap, 0, 0.01), `${r.gap} vs ${r.lgap}`);
        L.check(`${w} one heading per column`, r.heads.length === r.lefts.length, `${r.heads.length} vs ${r.lefts.length}`);
        for (const [i, l] of r.heads.entries()) L.check(`${w} heading ${i + 1} starts on its column's left ±1`, near(l - (r.lefts[i] ?? NaN), 0, 1), `${l.toFixed(1)} vs ${r.lefts[i]?.toFixed(1)}`);
        console.log(`  ${w}: template ${r.template} · gap ${r.gap} · Agent needs ${r.need.toFixed(1)} (${r.needWho}), heading ${r.head.toFixed(1)}`);
        if (pos === "pinned") await setPin(page, L, false, `${w} unpin`);
      }
    }
  });
  L.done(40);
});

/* ───────────────────────── E · the pinned illustration ───────────────────────── */
test("CL191-E1 · illustration: pinned, the art keeps its aspect ratio, no ancestor clips it, nothing paints over it, it hides no heading's text", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL191-E1");
  await withGuide(async () => {
    for (const vp of SIZES) {
      await open(page, vp, "CL191-E1");
      L.check(`@${vp.width} pinned (precondition)`, await setPin(page, L, true, `@${vp.width} pin`), "");
      for (const at of [0, 600] as const) {
        const w = `@${vp.width} scroll ${at}`;
        const got = await scrollTo(page, at);
        L.check(`${w} scrolled as asked (precondition)`, near(got, at, 1), `${got}`);
        await page.mouse.move(5, 5); await page.waitForTimeout(250);
        const r = await page.evaluate(() => {
          const art = [...document.querySelectorAll<HTMLImageElement>("img.cl19-art[data-cl19='band-art']")].find((e) => e.getBoundingClientRect().height > 0);
          if (!art) return null;
          const a = art.getBoundingClientRect();
          /* every ancestor whose overflow (or clip) is not visible must contain the art, to the scroll area */
          const clips: string[] = [];
          for (let n = art.parentElement; n; n = n.parentElement) {
            const c = getComputedStyle(n), b = n.getBoundingClientRect();
            const clipping = c.overflowX !== "visible" || c.overflowY !== "visible" || c.clipPath !== "none" || /paint|strict|content/.test(c.contain);
            if (clipping && !(a.left >= b.left - 0.5 && a.right <= b.right + 0.5 && a.top >= b.top - 0.5 && a.bottom <= b.bottom + 0.5))
              clips.push(`${n.tagName}.${String(n.className).slice(0, 30)} (${c.overflowX}/${c.overflowY}) ${b.top.toFixed(1)}–${b.bottom.toFixed(1)} vs art ${a.top.toFixed(1)}–${a.bottom.toFixed(1)}`);
            if (n.classList.contains("wpg-scroll")) break;
          }
          /* what paints on top, across the art. The art takes no pointer events, and neither does the sheet's lip (the
             12px sticky strip at the scroll area's top, z 19) — so for this one read EVERYTHING takes them, or the probe
             skips exactly the layers in question and answers "the art" whatever is painted over it */
          const pe = document.createElement("style"); pe.textContent = "* { pointer-events: auto !important; }"; document.head.appendChild(pe);
          const over: string[] = []; let pts = 0;
          for (const fy of [1, 4, 8, 11, a.height * 0.5, a.height - 2]) for (const fx of [0.15, 0.5, 0.85]) {
            const x = a.left + a.width * fx, y = a.top + fy;
            if (y < 0 || y > innerHeight) continue;
            pts += 1;
            /* with every element hit-testable, an unpainted overlay (opacity 0, visibility hidden — a closed drawer's
               scrim) is skipped: it is in the stack and paints nothing */
            const painted = (e: Element) => { if (getComputedStyle(e).visibility === "hidden") return false; for (let n: Element | null = e; n; n = n.parentElement) if (getComputedStyle(n).opacity === "0") return false; return true; };
            const top = document.elementsFromPoint(x, y).find(painted) as HTMLElement | undefined;
            if (top !== art) over.push(`(${x.toFixed(0)},${y.toFixed(0)}) ${top ? `${top.tagName}.${String(top.className).slice(0, 30)}` : "nothing"}`);
          }
          pe.remove();
          const tb = [...document.querySelectorAll<HTMLElement>("[data-cl19='toolbar']")].find((e) => e.getBoundingClientRect().height > 0)?.getBoundingClientRect();
          const range = document.createRange();
          const hits = [...document.querySelectorAll<HTMLElement>(".lt-labels.lth > [data-lt-col]")].filter((h) => h.getBoundingClientRect().height > 0).filter((h) => {
            range.selectNodeContents(h); return [...range.getClientRects()].some((t) => t.width > 0 && t.left < a.right && t.right > a.left && t.top < a.bottom && t.bottom > a.top);
          }).map((h) => h.dataset.ltCol);
          return { w: a.width, h: a.height, nw: art.naturalWidth, nh: art.naturalHeight, top: a.top, bottom: a.bottom, tbBottom: tb?.bottom ?? null, clips, over, pts, hits };
        });
        if (!r) { L.check(`${w} the illustration shows`, false, "none"); continue; }
        const ratio = (r.w / r.h) / (r.nw / r.nh);
        L.check(`${w} its box keeps the natural aspect ratio ±1% (${r.nw}×${r.nh})`, near(ratio, 1, 0.01), `${r.w}×${r.h} · ${ratio.toFixed(4)}`);
        L.check(`${w} no ancestor's clip cuts it`, r.clips.length === 0, JSON.stringify(r.clips));
        L.check(`${w} nothing paints over it (${r.pts} points across its top rows, middle and foot)`, r.pts >= 9 && r.over.length === 0, JSON.stringify(r.over.slice(0, 4)));
        L.check(`${w} it hides no heading's text`, r.hits.length === 0, JSON.stringify(r.hits));
        L.check(`${w} its foot is in the toolbar row or at most 8px past it`, r.tbBottom != null && r.bottom <= r.tbBottom + 8 && r.bottom > r.tbBottom - 52, `${r.bottom.toFixed(1)} vs toolbar ${r.tbBottom?.toFixed(1)}`);
        if (vp.width === 1512) L.check(`${w} about 137 × 122 at 1512 (screen 05) ±3`, near(r.w, 137, 3) && near(r.h, 122, 3), `${r.w}×${r.h}`);
      }
      await scrollTo(page, 0);
      await setPin(page, L, false, `@${vp.width} unpin`);
    }
  });
  L.done(20);
});

/* ───────────────────────── F · the unpinned bar ───────────────────────── */
const readBar = (page: Page) => page.evaluate(() => {
  const vis = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0);
  const tb = vis("[data-cl19='toolbar']")[0], card = vis("[data-cl19='card']")[0], pin = vis("button.cl19-pin")[0];
  const c = (e?: Element | null) => (e ? getComputedStyle(e) : null);
  const letters = vis("[data-cl19='letter']").map((l) => ({ cur: l.getAttribute("aria-current") === "true", dis: (l as HTMLButtonElement).disabled, color: c(l)!.color, bg: c(l)!.backgroundColor }));
  const ctl = ["label.cl19-find", "button.cl19-grp", "button.cl19-fil"].map((s) => { const e = vis(`.cl19-head ${s}`)[0]; return e ? { s, bg: c(e)!.backgroundColor, ring: c(e)!.boxShadow } : { s, bg: null, ring: null }; });
  const cs = c(card);
  return {
    tbBg: c(tb)?.backgroundColor ?? null, tbRule: c(tb)?.borderBottomWidth ?? null,
    corners: cs ? [cs.borderTopLeftRadius, cs.borderTopRightRadius, cs.borderBottomRightRadius, cs.borderBottomLeftRadius] : [],
    clips: cs ? cs.overflowX !== "visible" : false,
    pinBg: c(pin)?.backgroundColor ?? null, pinColor: c(pin)?.color ?? null, letters, ctl,
  };
});
test("CL191-F1 · unpinned bar: navy toolbar, cream letters and Pin, white controls without a ring, a card rounded 18 on all four corners with 22px below it; pinned unchanged", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL191-F1");
  const RING = "rgba(28, 19, 15, 0.12) 0px 0px 0px 1px, rgba(28, 19, 15, 0.06) 0px 1px 2px 0px";
  await withGuide(async () => {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, vp, "CL191-F1");
      L.check(`${w} unpinned (precondition)`, !(await pinned(page)), "");
      const u = await readBar(page);
      L.check(`${w} unpinned: the toolbar is ${NAVY} with no rule beneath`, u.tbBg === NAVY && u.tbRule === "0px", `${u.tbBg} · ${u.tbRule}`);
      L.check(`${w} unpinned: the card's four corners are 18px, and it clips (the toolbar's top corners follow it)`, u.corners.length === 4 && u.corners.every((x) => x === "18px") && u.clips, `${u.corners.join(" ")} · clips ${u.clips}`);
      /* RE-POINTED (Contact list v20 §C): unpinned, the toolbar's full-screen button (v19's Pin) appears only once the title
         row has scrolled away, so its colours are read there — the claim (cream with navy text on the navy bar) stands */
      await scrollTo(page, 1400);
      const us = await readBar(page);
      await scrollTo(page, 0);
      L.check(`${w} unpinned (scrolled): Full screen is ${CREAM} with navy text`, us.pinBg === CREAM && us.pinColor === NAVY, `${us.pinBg} · ${us.pinColor}`);
      const cur = u.letters.filter((l) => l.cur), on = u.letters.filter((l) => !l.cur && !l.dis), off = u.letters.filter((l) => l.dis);
      L.check(`${w} unpinned: letters (the population)`, u.letters.length >= 20 && cur.length === 1, `${u.letters.length} · current ${cur.length}`);
      L.check(`${w} unpinned: the letters are cream`, on.length > 0 && on.every((l) => l.color === CREAM), [...new Set(on.map((l) => l.color))].join(" "));
      L.check(`${w} unpinned: the current letter is a cream tile with navy text`, cur.length === 1 && cur[0].bg === CREAM && cur[0].color === NAVY, JSON.stringify(cur[0]));
      if (off.length) L.check(`${w} unpinned: an empty letter is cream at 28%`, off.every((l) => l.color === "rgba(244, 238, 229, 0.28)"), [...new Set(off.map((l) => l.color))].join(" "));
      /* cards-sort-search v1 §C — re-pointed: Find is the recessed well (a dark well, its inset drop and 14% cream ring); the
         other controls stay white with no ring */
      for (const x of u.ctl) {
        if (/cl19-find/.test(x.s)) L.check(`${w} unpinned: ${x.s} is the recessed well`, x.bg === "rgba(10, 18, 32, 0.32)" && /inset/.test(x.ring), `${x.bg} · ${x.ring}`);
        else L.check(`${w} unpinned: ${x.s} is white with no ring`, x.bg === "rgb(255, 255, 255)" && x.ring === "none", `${x.bg} · ${x.ring}`);
      }
      await scrollTo(page, "end");
      const e = await page.evaluate(() => {
        const card = [...document.querySelectorAll<HTMLElement>("[data-cl19='card']")].find((x) => x.getBoundingClientRect().height > 0);
        const sc = card?.closest<HTMLElement>(".wpg-scroll");
        let after = 0; for (let n = card?.nextElementSibling; n; n = n.nextElementSibling) if ((n as HTMLElement).getBoundingClientRect().height > 0) after += 1;
        return { below: sc && card ? sc.getBoundingClientRect().top + sc.clientHeight - card.getBoundingClientRect().bottom : null, after };
      });
      L.check(`${w} unpinned, at the list's end: 22 ±1 of page below the card`, near(e.below, 22, 1), `${e.below?.toFixed(1)}`);
      L.check(`${w} unpinned, at the list's end: nothing else below it`, e.after === 0, `${e.after}`);
      await scrollTo(page, 0);
      /* pinned is unchanged: v19's values, read on the build before the pack */
      L.check(`${w} pinned (precondition)`, await setPin(page, L, true, `${w} pin`), "");
      const p = await readBar(page);
      L.check(`${w} pinned: the toolbar is v19's rgb(247, 244, 238) with its 1px rule`, p.tbBg === "rgb(247, 244, 238)" && p.tbRule === "1px", `${p.tbBg} · ${p.tbRule}`);
      L.check(`${w} pinned: the card is square`, p.corners.every((x) => x === "0px"), p.corners.join(" "));
      L.check(`${w} pinned: Pin is navy with white text`, p.pinBg === NAVY && p.pinColor === "rgb(255, 255, 255)", `${p.pinBg} · ${p.pinColor}`);
      const pcur = p.letters.filter((l) => l.cur);
      L.check(`${w} pinned: the letters are navy, the current one on white`, p.letters.filter((l) => !l.cur && !l.dis).every((l) => l.color === NAVY) && pcur.length === 1 && pcur[0].bg === "rgb(255, 255, 255)" && pcur[0].color === NAVY, JSON.stringify(pcur[0]));
      /* cards-sort-search v1 §C — re-pointed: on the cream toolbar Find is white with the well's full-screen outline (an inset
         1px at 16% ink); the other controls keep the controls' ring */
      for (const x of p.ctl) {
        if (/cl19-find/.test(x.s)) L.check(`${w} pinned: ${x.s} is white with its inset outline`, x.bg === "rgb(255, 255, 255)" && x.ring === "rgba(28, 19, 15, 0.16) 0px 0px 0px 1px inset", `${x.bg} · ${x.ring}`);
        else L.check(`${w} pinned: ${x.s} keeps its ring`, x.bg === "rgb(255, 255, 255)" && x.ring === RING, `${x.bg} · ${x.ring}`);
      }
      await setPin(page, L, false, `${w} unpin`);
    }
  });
  L.done(36);
});

/* ───────────────────────── G · the open row ───────────────────────── */
test("CL191-G1 · strip: the open row's strip is cream rgb(246, 241, 232), unlike the group header; its divider ink at 12%", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("CL191-G1");
  await withGuide(async () => {
    for (const vp of SIZES) {
      for (const pos of ["unpinned", "pinned"] as const) {
        const w = `@${vp.width} ${pos} by Status`;
        await open(page, vp, "CL191-G1");
        if (pos === "pinned") L.check(`${w} pinned (precondition)`, await setPin(page, L, true, `${w} pin`), "");
        await groupBy(page, L, "status", w);
        let ids = await rowOnScreen(page, ".clv-rwn b", vp);
        if (!ids.length) { await scrollTo(page, 300); ids = await rowOnScreen(page, ".clv-rwn b", vp); }
        const id = ids[0];
        L.check(`${w} a row on screen (precondition)`, !!id, `${id}`);
        if (!id) continue;
        await page.mouse.move(5, 5); await page.waitForTimeout(300);
        const b = await page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"] .clv-rwn b`).filter({ visible: true }).first().boundingBox();
        if (b) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2); await page.waitForTimeout(1100); }
        const r = await page.evaluate((id) => {
          const row = [...document.querySelectorAll<HTMLElement>(`.aglist [data-clv='row'][data-agent-card="${id}"]`)].find((e) => e.getBoundingClientRect().height > 0);
          const s = row?.querySelector<HTMLElement>("[data-cl19='strip']");
          const dv = s?.querySelector<HTMLElement>(".cl19-sdiv");
          const band = [...document.querySelectorAll<HTMLElement>(".aglist [data-cl19='gband']")].find((e) => e.getBoundingClientRect().height > 0);
          return { open: !!row?.hasAttribute("data-peek") && !!s, sbg: s ? getComputedStyle(s).backgroundColor : null, dv: dv ? getComputedStyle(dv).backgroundColor : null, gbg: band ? getComputedStyle(band).backgroundColor : null };
        }, id);
        L.check(`${w} ${id}: the row opened on a hover (precondition)`, r.open, `${r.open}`);
        L.check(`${w} the strip is rgb(246, 241, 232)`, r.sbg === "rgb(246, 241, 232)", `${r.sbg}`);
        L.check(`${w} the group header is there and is not the strip's colour`, !!r.gbg && r.gbg !== r.sbg, `${r.gbg} vs ${r.sbg}`);
        /* RE-POINTED (Contact list v20 §D): the group header is the cream ledger now, not powder; the claim that matters —
           an open row never reads as a group header — is the line above (the two colours differ) */
        L.check(`${w} the group header is v20's ledger rgb(244, 240, 233)`, r.gbg === "rgb(244, 240, 233)", `${r.gbg}`);
        if (r.dv) L.check(`${w} the divider is ink at 12%`, r.dv === "rgba(28, 19, 15, 0.12)", `${r.dv}`);
        await page.mouse.move(5, 5); await page.waitForTimeout(300);
        if (pos === "pinned") await setPin(page, L, false, `${w} unpin`);
      }
    }
  });
  L.done(16);
});
