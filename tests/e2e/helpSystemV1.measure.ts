/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help system v1 — locks HS1 A1 to E2 (design-refs/help-system-v1), on the rendered page at 1512 × 900 and 1280 × 800,
 * on the Contact list (unpinned and pinned) and the Query Centre. E3 and E4 are unit locks
 * (functions/src/betaFeedbackCore.test.ts): the callable's core with its effects stubbed.
 *
 * Every lock was run green here and RED against its named break: a page mutation (`HS1_MUTATE=<lock>`, CSS or script
 * applied in the page, MUTATIONS) or a `src` mutation made and undone in the measurement worktree from a path-derived
 * backup (`tests/e2e/hs1Mutate.sh`), with `HS1_MUTATE` naming the ledger only. Ledgers in reports/help-system-v1/ledger.
 *
 * ⚠️ EVERY WORKSPACE PAGE STAYS MOUNTED: every read starts from the visible copy (box height > 0).
 * ⚠️ THE GUIDES' STATE IS THE ACCOUNT'S (todoPrefs.{contacts,queries}.guide): every test that needs one sets it with
 *    guideFlags.mjs and puts back exactly what it found, in a finally.
 * ⚠️ NOTHING HERE SENDS FEEDBACK: E2's send is answered by a route stub, so no document is written and no email goes.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/help-system-v1";
const MUT = process.env.HS1_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const flags = (page: "contacts" | "queries", args = "") => sh(`node tests/e2e/guideFlags.mjs --page ${page} ${args}`).trim().split("\n").pop()!;
const setGuide = (page: "contacts" | "queries", v: unknown) => flags(page, `--restore '${JSON.stringify(v)}'`);

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  /** write what was read so far — a lock whose break takes the page down still leaves its readings */
  flush() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT === this.name ? `mut-${MUT}` : this.name}.json`, JSON.stringify(this.rows, null, 1));
  }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    const mine = MUT === this.name;
    writeFileSync(`${DIR}/ledger/${mine ? `mut-${MUT}` : this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** one named break per lock, in the page (the src breaks are hs1Mutate.sh's) */
const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* render the menu back inside .ws-pagebar: its stacking context (z 3) puts the page's own layers over it */
  "HS1-A1": { js: `(() => { const go = () => { const bar = [...document.querySelectorAll('.ws-pagebar')].find((b) => b.getBoundingClientRect().height > 0); for (const m of document.querySelectorAll('#qh-popovers > [data-shell="help-menu"], #qh-popovers > [data-shell="capture-menu"], #qh-popovers > [data-pck="popover"]')) if (bar && m.parentElement !== bar) bar.appendChild(m); }; new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); go(); })()` },
  /* restore the shortcuts row */
  "HS1-B1": { js: `(() => { const go = () => { const m = document.querySelector('[data-shell="help-menu"] [data-hm="links"]'); if (m && !m.querySelector('[data-mut-kb]')) { const b = document.createElement('button'); b.setAttribute('role', 'menuitem'); b.setAttribute('data-mut-kb', ''); b.className = 'hm-row'; b.textContent = 'Keyboard shortcuts'; m.appendChild(b); } }; new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()` },
  /* make Continue open the checklist instead */
  "HS1-B2": { js: `window.addEventListener('click', (e) => { const c = e.target.closest && e.target.closest('[data-hm="continue"]'); if (!c) return; e.stopImmediatePropagation(); e.preventDefault(); document.querySelector('.ws-help').click(); setTimeout(() => { const p = [...document.querySelectorAll('[data-pck="pill"]')].find((x) => x.getBoundingClientRect().height > 0); p && p.click(); }, 50); }, true)` },
  /* remove the keydown handler: the "?" no longer hears its keys */
  "HS1-B3": { js: `window.addEventListener('keydown', (e) => { if (e.target && e.target.closest && e.target.closest('.ws-help')) { e.stopImmediatePropagation(); } }, true)` },
  /* restore the bars */
  "HS1-C1": { js: `(() => { const go = () => { for (const p of document.querySelectorAll('[data-pck="pill"]')) if (!p.querySelector('.segs')) { const s = document.createElement('span'); s.className = 'segs pck-pbars'; s.innerHTML = '<i></i><i></i><i></i><i></i><i></i>'; p.prepend(s); } }; new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); go(); })()` },
  /* clear the session key on every route change */
  "HS1-C2": { js: `(() => { const clr = () => { try { sessionStorage.removeItem('sa.guide.autoOpened'); } catch {} }; const p = history.pushState; history.pushState = function (...a) { clr(); return p.apply(this, a); }; window.addEventListener('popstate', clr); })()` },
  /* stop propagation on the term in the capture phase (the mock's bug) */
  "HS1-D2": { js: `document.addEventListener('click', (e) => { if (e.target && e.target.closest && e.target.closest('.qh-term')) e.stopPropagation(); }, true)` },
  /* a copied glyph in place of the real StatusDot */
  "HS1-D3": { js: `(() => { const go = () => { for (const s of document.querySelectorAll('.qh-def-t svg')) { const g = document.createElement('span'); g.textContent = '●'; s.replaceWith(g); } }; new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()` },
  /* restore the select */
  "HS1-E1": { js: `(() => { const go = () => { const k = document.querySelector('[data-fb="kinds"]'); if (k && !k.dataset.mut) { k.dataset.mut = '1'; k.style.display = 'none'; const s = document.createElement('select'); s.innerHTML = "<option>Something's broken</option><option>An idea</option>"; k.after(s); } }; new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()` },
};
const mutate = async (page: Page, lock: string) => {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(150);
};

/**
 * every open: per-device guide memory cleared; `autoOpened` set unless a lock is about the first open.
 * ⚠️ ONCE PER open(), NOT ONCE PER TAB, AND ONLY BY THE NEWEST SCRIPT. Init scripts accumulate on a page, and a tab's
 *    session outlives one width; so each open() names itself in a cookie, and a script acts only when the cookie is its
 *    own and this tab has not yet been set up for it. A later in-app navigation keeps the state the lock built.
 */
const open = async (page: Page, route: string, vp: VP, lock: string, o: { fresh?: boolean } = {}) => {
  const token = `t${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  const base = process.env.SA_E2E_BASE_URL!;
  await page.context().addCookies([{ name: "hs1", value: token, url: base }]);
  await page.addInitScript(({ fresh, token }) => {
    try {
      if (!document.cookie.split("; ").includes(`hs1=${token}`)) return;
      if (sessionStorage.getItem("__hs1_init") === token) return;
      sessionStorage.setItem("__hs1_init", token);
      for (const k of Object.keys(localStorage)) if (/^sa\.guide\..*\.(skipped|last)$/.test(k) || k === "sa.guides.off" || k === "sa.whatsNew.seen") localStorage.removeItem(k);
      if (fresh) sessionStorage.removeItem("sa.guide.autoOpened"); else sessionStorage.setItem("sa.guide.autoOpened", "1");
    } catch { /* private mode */ }
  }, { fresh: !!o.fresh, token });
  await openRoute(page, route, vp);
  await page.evaluate(() => document.fonts.ready);
  await mutate(page, lock);
};
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const pillReady = async (page: Page) => { await vis(page, "[data-pck='pill']").waitFor({ timeout: 20_000 }); };
/** the page's scroller (the visible one with something to scroll) */
const scrollBy = (page: Page, y: number) => page.evaluate((dy) => {
  const s = [...document.querySelectorAll<HTMLElement>(".wpg-scroll, .ws-wbody")].filter((e) => e.getBoundingClientRect().height > 0 && e.scrollHeight > e.clientHeight + 5);
  const el = s[s.length - 1];
  if (el) el.scrollTop += dy;
  return el ? el.scrollTop : -1;
}, y);
/** elementFromPoint at the four inset corners and the centre: is every hit inside `sel`? */
const onTop = (page: Page, sel: string) => page.evaluate((s) => {
  const el = [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0);
  if (!el) return { has: false, hits: [] as boolean[], box: null as null | number[] };
  const r = el.getBoundingClientRect(); const i = 10;
  const pts = [[r.left + i, r.top + i], [r.right - i, r.top + i], [r.left + i, r.bottom - i], [r.right - i, r.bottom - i], [r.left + r.width / 2, r.top + r.height / 2]];
  const inView = r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth;
  return { has: true, inView, box: [r.left, r.top, r.width, r.height], hits: pts.map(([x, y]) => { const h = document.elementFromPoint(x, y); return !!h && el.contains(h); }) };
}, sel);

const CL_LIVE = { seen: true, done: { search: true, pin: true } };
const QC_LIVE = { seen: true, done: { log: true, find: true } };

/* ───────────────────────── A · one pop-up layer ───────────────────────── */
test("HS1-A1 · on top: the Help menu, the Log a query menu and the checklist are above the page, scrolled 400px", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("HS1-A1");
  const c0 = flags("contacts"), q0 = flags("queries");
  try {
    await page.goto("about:blank");
    setGuide("contacts", CL_LIVE); setGuide("queries", QC_LIVE);
    for (const vp of SIZES) {
      for (const where of ["contacts", "contacts-pinned", "queries"] as const) {
        const w = `@${vp.width} ${where}`;
        await open(page, where === "queries" ? "/queries" : "/agents", vp, "HS1-A1");
        await pillReady(page);
        if (where === "contacts-pinned") {
          const pin = vis(page, "[data-cl19='pin']");
          if ((await pin.getAttribute("aria-pressed")) !== "true") await pin.click();
          await page.waitForTimeout(800);
          L.check(`${w} pinned (precondition)`, (await pin.getAttribute("aria-pressed")) === "true", "");
        }
        const top = await scrollBy(page, 400);
        L.check(`${w} the page scrolled (precondition)`, top > 0, `scrollTop ${top}`);
        for (const [name, opener, sel] of [
          ["help menu", ".ws-help", "[data-shell='help-menu']"],
          ["Log a query menu", ".ws-capr", "[data-shell='capture-menu'].is-open"],
          ["checklist", "[data-pck='pill']", "[data-pck='popover']"],
        ] as const) {
          const pressed = await vis(page, opener).click({ timeout: 8000 }).then(() => true, () => false);
          L.check(`${w} ${name}: its opener could be pressed`, pressed, "covered or missing");
          await page.waitForTimeout(450);
          const r = await onTop(page, sel);
          L.check(`${w} ${name}: open and on screen (precondition)`, r.has && r.inView, JSON.stringify(r.box));
          L.check(`${w} ${name}: all five points hit the pop-up`, r.has && r.hits.every(Boolean), JSON.stringify(r.hits));
          await page.keyboard.press("Escape"); await page.waitForTimeout(500);
        }
        /* unpin (the pin is this test context's own, so a press that cannot land costs nothing) */
        if (where === "contacts-pinned") { await vis(page, "[data-cl19='pin']").click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(500); }
      }
    }
  } finally { L.flush(); setGuide("contacts", JSON.parse(c0)); setGuide("queries", JSON.parse(q0)); }
  L.done(54);
});

test("HS1-A2 · one open: opening the Help menu while the checklist is open leaves only the menu", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-A2");
  const c0 = flags("contacts");
  try {
    await page.goto("about:blank");
    setGuide("contacts", CL_LIVE);
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/agents", vp, "HS1-A2");
      await pillReady(page);
      await vis(page, "[data-pck='pill']").click(); await page.waitForTimeout(400);
      L.check(`${w} the checklist is open (precondition)`, await page.locator("#qh-popovers [data-pck='popover']").count() === 1, "");
      /* ⚠️ FROM THE KEYBOARD: a pointer press on the "?" also closes the checklist by its own outside-press rule, so a
         click cannot tell whether the one-open claim works. Enter on the focused "?" presses nothing outside it. */
      await vis(page, ".ws-help").focus();
      await page.keyboard.press("Enter"); await page.waitForTimeout(700);
      /* what is OPEN in the layer: the Log a query menu stays mounted there, hidden, between opens */
      const openKids = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("#qh-popovers > *")]
        .filter((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return r.height > 0 && s.visibility !== "hidden" && Number(s.opacity) > 0.05; })
        .map((e) => e.dataset.shell ?? e.dataset.pck ?? e.className));
      const kids = await openKids();
      L.check(`${w} only the Help menu is in the layer (opened from the keyboard)`, kids.length === 1 && kids[0] === "help-menu", JSON.stringify(kids));
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      /* and by pointer: the checklist again, then the "?" pressed */
      await vis(page, "[data-pck='pill']").click(); await page.waitForTimeout(400);
      await vis(page, ".ws-help").click(); await page.waitForTimeout(700);
      const kids2 = await openKids();
      L.check(`${w} only the Help menu is in the layer (opened by pointer)`, kids2.length === 1 && kids2[0] === "help-menu", JSON.stringify(kids2));
      await page.keyboard.press("Escape");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); }
  L.done(6);
});

/* ───────────────────────── B · the Help menu ───────────────────────── */
test("HS1-B1 · contents: no Keyboard shortcuts; eyebrow, guide, three articles, four links, the switch, in order", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-B1");
  const c0 = flags("contacts");
  try {
    await page.goto("about:blank");
    setGuide("contacts", CL_LIVE);
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/agents", vp, "HS1-B1");
      await pillReady(page);
      await vis(page, ".ws-help").click(); await page.waitForTimeout(500);
      const r = await page.evaluate(() => {
        const m = document.querySelector<HTMLElement>("[data-shell='help-menu']");
        if (!m) return null;
        return {
          text: m.textContent ?? "",
          order: [...m.querySelectorAll<HTMLElement>("[data-hm]")].map((e) => e.dataset.hm),
          eyebrow: m.querySelector("[data-hm='eyebrow']")?.textContent ?? "",
          eyebrowCase: getComputedStyle(m.querySelector("[data-hm='eyebrow']")!).textTransform,
          arts: [...m.querySelectorAll<HTMLElement>("[data-hm='article']")].map((e) => e.textContent),
          sw: m.querySelector("[data-hm='switch']")?.getAttribute("aria-checked"),
        };
      });
      L.check(`${w} the menu is open (precondition)`, !!r, "");
      if (!r) continue;
      L.check(`${w} no Keyboard shortcuts`, !/Keyboard shortcuts/i.test(r.text), r.text.slice(0, 120));
      L.check(`${w} the eyebrow names the page`, r.eyebrow === "Help · Contact list" && r.eyebrowCase === "uppercase", r.eyebrow);
      const want = ["head", "eyebrow", "guide", "continue", "articles", "article", "article", "article", "links", "search", "news", "feedback", "centre", "switch"];
      L.check(`${w} in order: eyebrow, guide, three articles, the four links, the switch`, JSON.stringify(r.order) === JSON.stringify(want), JSON.stringify(r.order));
      L.check(`${w} the three articles are the page's`, JSON.stringify(r.arts.map((a) => a?.replace(/\d.*$/, "").trim())) === JSON.stringify(["Add an agent", "What List health measures", "Pin the list"]), JSON.stringify(r.arts));
      L.check(`${w} the switch is on`, r.sw === "true", String(r.sw));
      await page.keyboard.press("Escape");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); }
  L.done(12);
});

test("HS1-B2 · Continue closes the menu and spotlights the next undone item's target", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-B2");
  const c0 = flags("contacts");
  try {
    await page.goto("about:blank");
    setGuide("contacts", CL_LIVE);
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/agents", vp, "HS1-B2");
      await pillReady(page);
      await vis(page, ".ws-help").click(); await page.waitForTimeout(400);
      const next = (await vis(page, "[data-hm='guide'] p").textContent())?.replace(/^Next:\s*/, "") ?? "";
      L.check(`${w} the guide names a next item (precondition)`, next.length > 0, next);
      await vis(page, "[data-hm='continue']").click(); await page.waitForTimeout(800);
      L.check(`${w} the menu closed`, await page.locator("[data-shell='help-menu']").count() === 0, "");
      L.check(`${w} the checklist did not open`, await page.locator("[data-pck='popover']").count() === 0, "");
      const card = await page.locator("[data-pck='spot'] [data-pck='card'] b").first().textContent({ timeout: 3000 }).catch(() => null);
      L.check(`${w} the spotlight shows the next item`, card === next, `${card} vs ${next}`);
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
  } finally { setGuide("contacts", JSON.parse(c0)); }
  L.done(8);
});

test("HS1-B3 · keys: ↓ on the ? opens with focus on the first item, End lands on the switch, Esc returns to the ?", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-B3");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, "/agents", vp, "HS1-B3");
    await vis(page, ".ws-help").focus();
    await page.keyboard.press("ArrowDown"); await page.waitForTimeout(400);
    const a = await page.evaluate(() => {
      const m = document.querySelector("[data-shell='help-menu']");
      const first = m?.querySelector("[role='menuitem']");
      return { open: !!m, first: !!first && document.activeElement === first };
    });
    L.check(`${w} ↓ opens it`, a.open, "");
    L.check(`${w} …with focus on the first item`, a.first, "");
    await page.keyboard.press("End"); await page.waitForTimeout(100);
    L.check(`${w} End lands on the switch`, await page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset.hm === "switch"), "");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    const b = await page.evaluate(() => ({ closed: !document.querySelector("[data-shell='help-menu']"), help: !!document.activeElement?.classList.contains("ws-help") }));
    L.check(`${w} Esc closes it`, b.closed, "");
    L.check(`${w} …and focuses the ?`, b.help, "");
  }
  L.done(10);
});

/* ───────────────────────── C · the guide ───────────────────────── */
/** type into the Contact list's Find (ticks "Search for an agent" at two characters) */
/* ⚠️ AT A NARROW TOOLBAR THE FIND IS AN ICON UNTIL PRESSED: its input has no box until then, so press it first */
const typeFind = async (page: Page, s: string) => {
  const input = page.locator("input[aria-label='Find an agent']");
  const shown = async () => (await input.evaluateAll((els) => els.some((e) => e.getBoundingClientRect().width > 4)));
  if (!(await shown())) await vis(page, "[data-cl19='find-wrap'], [data-cl19='find']").click();
  await vis(page, "input[aria-label='Find an agent']").fill(s, { timeout: 15_000 });
};

test("HS1-C1 · the pill: a ring and \"n of N\", no bars; finished, sage", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-C1");
  const c0 = flags("contacts");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await page.goto("about:blank");
      setGuide("contacts", { seen: true, done: { pin: true, open: true, edit: true, hk: true } });
      await open(page, "/agents", vp, "HS1-C1");
      await pillReady(page);
      const r = await page.evaluate(() => {
        const p = [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].find((e) => e.getBoundingClientRect().height > 0)!;
        return { ring: !!p.querySelector("svg[data-guide='ring']"), count: p.querySelector("[data-pck='count']")?.textContent, bars: p.querySelectorAll(".segs, .pck-pbars").length };
      });
      L.check(`${w} a ring`, r.ring, "");
      L.check(`${w} "n of N"`, /^\d+ of 6$/.test(r.count ?? ""), String(r.count));
      L.check(`${w} no bars`, r.bars === 0, `${r.bars}`);
      await typeFind(page, "ab");
      await page.waitForTimeout(2500);
      const bg = await page.evaluate(() => {
        const p = [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].find((e) => e.getBoundingClientRect().height > 0)!;
        return { bg: getComputedStyle(p).backgroundColor, state: p.dataset.state, text: p.textContent };
      });
      L.check(`${w} finished: data-state done`, bg.state === "done", JSON.stringify(bg));
      L.check(`${w} finished: background #e0e5dd`, bg.bg === "rgb(224, 229, 221)", bg.bg);
      L.check(`${w} finished: "Contact list: Learned ✓"`, bg.text === "Contact list: Learned✓", String(bg.text));
      await typeFind(page, "");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); }
  L.done(12);
});

test("HS1-C2 · once: a fresh session auto-opens the Contact list's guide and only pulses the Query Centre's", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-C2");
  const c0 = flags("contacts"), q0 = flags("queries");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await page.goto("about:blank");
      setGuide("contacts", { done: { search: true } }); setGuide("queries", { done: { log: true } });
      await page.addInitScript(() => {
        (window as unknown as { __pulses: number }).__pulses = 0;
        new MutationObserver((ms) => { for (const m of ms) { const t = m.target as HTMLElement; if (m.attributeName === "class" && t.dataset?.pck === "pill" && t.classList.contains("pulse")) (window as unknown as { __pulses: number }).__pulses++; } })
          .observe(document, { attributes: true, subtree: true, attributeFilter: ["class"] });
      });
      await open(page, "/agents", vp, "HS1-C2", { fresh: true });
      await pillReady(page);
      await page.locator("[data-pck='popover']").waitFor({ timeout: 8000 }).catch(() => {});
      L.check(`${w} the Contact list's guide opened by itself`, await page.locator("[data-pck='popover']").count() === 1, "");
      await page.keyboard.press("Escape"); await page.waitForTimeout(600);
      /* an in-app route change (the sidebar), so the browser session is the same one */
      await page.locator("#ws-sidebar").getByText("Query Centre", { exact: true }).first().click({ timeout: 8000 });
      await page.waitForURL(/\/queries/);
      await pillReady(page);
      await page.waitForTimeout(4000);
      L.check(`${w} the Query Centre's did not open`, await page.locator("[data-pck='popover']").count() === 0, "");
      const pulses = await page.evaluate(() => (window as unknown as { __pulses: number }).__pulses);
      L.check(`${w} …and its pill pulsed`, pulses >= 1, `${pulses}`);
      /* the next width is a NEW browser session: this tab's session storage goes (the auto-open record and the init flag) */
      await page.evaluate(() => sessionStorage.clear());
    }
  } finally { setGuide("contacts", JSON.parse(c0)); setGuide("queries", JSON.parse(q0)); }
  L.done(6);
});

test("HS1-C3 · quiet: on a first visit with an agent's panel open, nothing opens by itself", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-C3");
  const c0 = flags("contacts");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await page.goto("about:blank");
      setGuide("contacts", { done: { search: true } });
      /* the first load only finds an agent: `autoOpened` is set so nothing opens and nothing is marked seen */
      await open(page, "/agents", vp, "HS1-C3");
      const id = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-agent-card]")].find((e) => e.getBoundingClientRect().height > 0)?.dataset.agentCard ?? "");
      L.check(`${w} an agent to open (precondition)`, !!id, id);
      /* then a FIRST visit in a fresh session: the session key removed on this origin, the guide unseen */
      await page.evaluate(() => { sessionStorage.removeItem("sa.guide.autoOpened"); });
      setGuide("contacts", { done: { search: true } });
      await page.goto(`/agents?agent=${id}`);
      L.check(`${w} a fresh session: no auto-open recorded yet (precondition)`, await page.evaluate(() => sessionStorage.getItem("sa.guide.autoOpened")) === null, "");
      await page.locator("[data-ap='panel']").first().waitFor({ timeout: 20_000 }).catch(() => {});
      await pillReady(page);
      L.check(`${w} the agent panel is open (precondition)`, await page.locator("[data-ap='panel']").filter({ visible: true }).count() > 0, "");
      await page.waitForTimeout(4500);
      L.check(`${w} the checklist did not open`, await page.locator("[data-pck='popover']").count() === 0, "");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); }
  L.done(8);
});

const noteState = (page: Page) => page.evaluate(() => {
  const n = document.querySelector<HTMLElement>("[data-pck='note']");
  return n ? { has: true, final: n.dataset.final === "true", bg: getComputedStyle(n).backgroundColor } : { has: false, final: false, bg: "" };
});

/** the note's lifetime, recorded IN THE PAGE (performance.now at mount and unmount), so the reading is the page's own
 *  clock rather than the harness's round trips */
const NOTE_REC = () => {
  const w = window as unknown as { __notes: { add: number; gone: number | null }[] };
  w.__notes = [];
  new MutationObserver((ms) => {
    for (const m of ms) {
      for (const n of m.addedNodes) if (n instanceof HTMLElement && n.dataset.pck === "note") w.__notes.push({ add: performance.now(), gone: null });
      for (const n of m.removedNodes) if (n instanceof HTMLElement && n.dataset.pck === "note") { const last = w.__notes[w.__notes.length - 1]; if (last && last.gone === null) last.gone = performance.now(); }
    }
  }).observe(document, { childList: true, subtree: true });
};
const notes = (page: Page) => page.evaluate(() => ({ list: (window as unknown as { __notes: { add: number; gone: number | null }[] }).__notes, now: performance.now() }));

test("HS1-C4 · the note: present at 5.5s, gone at 6.6s; hovered from 1s to 8s, still there at 8s", async ({ page }) => {
  test.setTimeout(400_000);
  const L = new Ledger("HS1-C4");
  const c0 = flags("contacts");
  await page.addInitScript(NOTE_REC);
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await page.goto("about:blank");
      setGuide("contacts", { seen: true, done: { pin: true } });
      await open(page, "/agents", vp, "HS1-C4");
      await pillReady(page);
      await page.mouse.move(5, 600);
      await typeFind(page, "ab");
      await page.locator("[data-pck='note']").waitFor({ timeout: 8000 });
      await page.waitForTimeout(7500);
      const a = await notes(page);
      L.check(`${w} one note (precondition)`, a.list.length === 1, JSON.stringify(a.list));
      const life = a.list[0] && a.list[0].gone !== null ? a.list[0].gone - a.list[0].add : null;
      L.check(`${w} present at 5.5s`, life !== null && life > 5500, `${life}`);
      L.check(`${w} gone at 6.6s`, life !== null && life <= 6600, `${life}`);
      await typeFind(page, "");

      await page.goto("about:blank");
      setGuide("contacts", { seen: true, done: { pin: true } });
      await open(page, "/agents", vp, "HS1-C4");
      await pillReady(page); await page.waitForTimeout(800);
      await page.mouse.move(5, 600);
      await typeFind(page, "cd");
      await page.locator("[data-pck='note']").waitFor({ timeout: 8000 });
      const b0 = await notes(page);
      const born = b0.list[0]?.add ?? b0.now;
      await page.waitForTimeout(Math.max(0, born + 1000 - b0.now));
      const box = await page.locator("[data-pck='note']").boundingBox();
      if (box) await page.mouse.move(box.x + box.width / 2, box.y + 10);
      const b1 = await notes(page);
      await page.waitForTimeout(Math.max(0, born + 8000 - b1.now));
      const b2 = await notes(page);
      L.check(`${w} hovered from 1s: the note was hovered (precondition)`, !!box, "");
      L.check(`${w} hovered: still there at 8s`, b2.list[0] && b2.list[0].gone === null && b2.now - born >= 8000, JSON.stringify(b2));
      await page.mouse.move(5, 600);
      await typeFind(page, "");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); }
  L.done(10);
});

test("HS1-C5 · the last item's note is sage and still there at 15s", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-C5");
  const c0 = flags("contacts");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await page.goto("about:blank");
      setGuide("contacts", { seen: true, done: { pin: true, open: true, edit: true, hk: true } });
      await open(page, "/agents", vp, "HS1-C5");
      await pillReady(page);
      await typeFind(page, "ab");
      await page.locator("[data-pck='note']").waitFor({ timeout: 8000 });
      const s = await noteState(page);
      L.check(`${w} the last note`, s.final, JSON.stringify(s));
      L.check(`${w} …is sage`, s.bg === "rgb(224, 229, 221)", s.bg);
      await page.mouse.move(5, 600);
      await page.waitForTimeout(15_000);
      L.check(`${w} still there at 15s`, (await noteState(page)).has, "");
      await typeFind(page, "");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); }
  L.done(6);
});

test("HS1-C6 · skip ticks the row and raises n; Undo lowers it; a real save after a skip shows a plain tick", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-C6");
  const c0 = flags("contacts");
  const count = () => page.evaluate(() => Number(([...document.querySelectorAll<HTMLElement>("[data-pck='pill'] [data-pck='count']")].find((e) => e.getBoundingClientRect().height > 0)?.textContent ?? "").split(" ")[0]));
  const row = (k: string) => page.evaluate((key) => { const r = document.querySelector<HTMLElement>(`[data-pck='item'][data-k='${key}']`); return r ? { done: r.dataset.done, skipped: r.dataset.skipped ?? null, tick: r.querySelector(".pck-tick")?.textContent } : null; }, k);
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await page.goto("about:blank");
      setGuide("contacts", { seen: true, done: { pin: true } });
      await open(page, "/agents", vp, "HS1-C6");
      await pillReady(page);
      const n0 = await count();
      await vis(page, "[data-pck='pill']").click(); await page.waitForTimeout(400);
      const pre = await row("search");
      L.check(`${w} "Search for an agent" is not done yet (precondition)`, pre?.done === "false", JSON.stringify(pre));
      await page.locator("[data-pck='item'][data-k='search']").hover();
      await page.locator("[data-pck='item'][data-k='search'] [data-pck='skip']").click({ timeout: 8000 }); await page.waitForTimeout(300);
      const a = await row("search");
      L.check(`${w} skip ticks the row (skipped)`, a?.done === "true" && a?.skipped === "true" && a?.tick === "–", JSON.stringify(a));
      L.check(`${w} skip raises n`, (await count()) === n0 + 1, `${n0} → ${await count()}`);
      await page.locator("[data-pck='item'][data-k='search']").hover();
      await page.locator("[data-pck='item'][data-k='search'] [data-pck='undo']").click({ timeout: 8000 }); await page.waitForTimeout(300);
      L.check(`${w} Undo lowers it`, (await count()) === n0 && (await row("search"))?.done === "false", `${await count()}`);
      await page.locator("[data-pck='item'][data-k='search']").hover();
      await page.locator("[data-pck='item'][data-k='search'] [data-pck='skip']").click({ timeout: 8000 }); await page.waitForTimeout(300);
      await page.keyboard.press("Escape"); await page.waitForTimeout(500);
      await typeFind(page, "ab"); await page.waitForTimeout(2500);
      await vis(page, "[data-pck='pill']").click(); await page.waitForTimeout(400);
      const b = await row("search");
      L.check(`${w} a real save after a skip shows a plain tick`, b?.done === "true" && b?.skipped === null && b?.tick === "✓", JSON.stringify(b));
      await page.keyboard.press("Escape");
      await typeFind(page, "");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); }
  L.done(10);
});

/* ───────────────────────── D · definitions ───────────────────────── */
test("HS1-D1 · hovering \"list health\": no card at 200ms, the card with a link at 400ms", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-D1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, "/agents", vp, "HS1-D1");
    await page.mouse.move(5, 600);
    const term = vis(page, "[data-term='listHealth']");
    await term.waitFor({ timeout: 15_000 });
    await term.hover();
    await page.waitForTimeout(200);
    L.check(`${w} no card at 200ms`, await page.locator("[data-term-card='listHealth']").count() === 0, "");
    await page.waitForTimeout(200);
    const c = await page.evaluate(() => { const c = document.querySelector("[data-term-card='listHealth']"); return c ? { title: c.querySelector(".qh-def-t")?.textContent, link: !!c.querySelector("a[data-term-link]") } : null; });
    L.check(`${w} the card at 400ms`, !!c && c.title === "List health", JSON.stringify(c));
    L.check(`${w} …with its article link`, !!c?.link, "");
    await page.mouse.move(5, 600); await page.waitForTimeout(400);
  }
  L.done(6);
});

/* ⚠️ RESTATED FROM THE PACK (a false premise, reported): the pack spotlights the housekeeping step on the List health
   ring and has the press tick it. In this app the step's spotlight is "Fill in the gaps" (v18.3), so with it on the ring
   is under the dim; and the step ticks on a Housekeeping SAVE, not on a press. The law the lock guards is the
   click-through itself — a press on the defined words inside the ring's button does the button's own job — so that is
   what is asserted: Housekeeping opens. The mutation is the pack's: the mock's capture-phase stop on the term. */
test("HS1-D2 · click-through: pressing exactly on the words \"list health\" does the ring's job (Housekeeping opens)", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-D2");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, "/agents", vp, "HS1-D2");
    await page.mouse.move(5, 600);
    const t = await vis(page, "[data-term='listHealth']").boundingBox();
    L.check(`${w} the words are on screen (precondition)`, !!t, "");
    const hit = t ? await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y) as HTMLElement | null; return { term: !!e?.closest(".qh-term"), ring: !!e?.closest("button[data-cl17='health']") }; }, [t.x + t.width / 2, t.y + t.height / 2]) : null;
    L.check(`${w} the press lands on the term, inside the ring's button (precondition)`, !!hit?.term && !!hit?.ring, JSON.stringify(hit));
    L.check(`${w} Housekeeping is closed (precondition)`, await page.locator(".hdr.is-in[data-hdr='housekeeping']").count() === 0, "");
    if (t) await page.mouse.click(t.x + t.width / 2, t.y + t.height / 2);
    await page.waitForTimeout(1200);
    L.check(`${w} the press reached the ring: Housekeeping opened`, await page.locator(".hdr.is-in[data-hdr='housekeeping']").count() === 1, "");
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
  }
  L.done(8);
});

test("HS1-D3 · every status in the status column is a defined word whose card draws a real StatusDot", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-D3");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, "/agents", vp, "HS1-D3");
    const cells = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(".clv-row [data-cl17='stage']")].filter((e) => e.getBoundingClientRect().height > 0)
      .map((e) => ({ term: e.querySelector<HTMLElement>(".qh-term")?.dataset.term ?? null, text: e.textContent?.trim() ?? "" })));
    L.check(`${w} status cells to read (precondition)`, cells.length >= 3, `${cells.length}`);
    L.check(`${w} every status name is a Term`, cells.every((c) => !!c.term), JSON.stringify(cells.filter((c) => !c.term).slice(0, 3)));
    const kinds = [...new Set(cells.map((c) => c.term))].slice(0, 3);
    for (const k of kinds) {
      const t = vis(page, `.clv-row [data-cl17='stage'] [data-term='${k}']`);
      await t.scrollIntoViewIfNeeded(); await page.mouse.move(5, 600); await page.waitForTimeout(250);
      await t.hover(); await page.waitForTimeout(600);
      const dot = await page.evaluate((id) => {
        const s = document.querySelector(`[data-term-card='${id}'] .qh-def-t svg`);
        return s ? { vb: s.getAttribute("viewBox"), ring: !!s.querySelector("[r='10']") || s.innerHTML.includes('r="10"') || id === "offer" } : null;
      }, k as string);
      L.check(`${w} ${k}: the card draws the real StatusDot`, !!dot && dot.vb === "0 0 24 24" && dot.ring, JSON.stringify(dot));
      await page.mouse.move(5, 600); await page.waitForTimeout(400);
    }
  }
  L.done(6);
});

/* ───────────────────────── E · feedback ───────────────────────── */
const openFeedback = async (page: Page) => { await vis(page, ".ws-fbtn, .ws-fbb, .ws-fbi").click(); await page.locator("[data-fb='panel']").waitFor({ timeout: 8000 }); };

test("HS1-E1 · four radio tiles and no select; An idea asks what would make QueryHawk better", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-E1");
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, "/agents", vp, "HS1-E1");
    await openFeedback(page);
    const r = await page.evaluate(() => { const p = document.querySelector("[data-fb='panel']")!; return { radios: [...p.querySelectorAll("[role='radio'][data-fb='kind']")].filter((e) => (e as HTMLElement).getBoundingClientRect().height > 0).length, selects: p.querySelectorAll("select").length + p.parentElement!.querySelectorAll("select").length }; });
    L.check(`${w} four radio tiles`, r.radios === 4, JSON.stringify(r));
    L.check(`${w} no select`, r.selects === 0, JSON.stringify(r));
    await page.locator("[data-fb='kind'][data-k='An idea']").click({ timeout: 5000 }).catch(() => {});
    const q = await page.locator("[data-fb='question']").textContent({ timeout: 3000 }).catch(() => null);
    L.check(`${w} the question follows the kind`, q === "What would make QueryHawk better for you?", String(q));
    await page.keyboard.press("Escape").catch(() => {});
  }
  L.done(6);
});

test("HS1-E2 · the draft: kept through a close and a reopen; a send clears it", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HS1-E2");
  /* ⚠️ THE SEND IS ANSWERED HERE: nothing is written and no email goes */
  await page.route(/sendBetaFeedback/, (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true, emailed: true } }) }));
  for (const vp of SIZES) {
    const w = `@${vp.width}`;
    await open(page, "/agents", vp, "HS1-E2");
    await openFeedback(page);
    await page.locator("[data-fb='kind'][data-k='An idea']").click();
    await page.locator("[data-fb='message']").fill("A dark mode would be lovely.");
    await page.locator("[data-fb='close']").click(); await page.waitForTimeout(300);
    L.check(`${w} closed (precondition)`, await page.locator("[data-fb='panel']").count() === 0, "");
    await openFeedback(page);
    L.check(`${w} the text is kept`, (await page.locator("[data-fb='message']").inputValue().catch(() => "")) === "A dark mode would be lovely.", "");
    await page.locator("[data-fb='send']").click();
    await page.locator("[data-fb='sent']").waitFor({ timeout: 10_000 }).catch(() => {});
    L.check(`${w} sent (precondition)`, await page.locator("[data-fb='sent']").count() === 1, "");
    await page.locator("[data-fb='close2']").click(); await page.waitForTimeout(300);
    await openFeedback(page);
    const after = await page.evaluate(() => ({ kind: document.querySelector("[data-fb='kind'][aria-checked='true']") ? 1 : 0, msg: (document.querySelector("[data-fb='message']") as HTMLTextAreaElement | null)?.value ?? "" }));
    L.check(`${w} a send cleared it`, after.kind === 0 && after.msg === "", JSON.stringify(after));
    await page.locator("[data-fb='close']").click();
  }
  L.done(8);
});
