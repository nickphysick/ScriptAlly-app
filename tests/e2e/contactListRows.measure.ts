/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list rows v1 (design-refs/contact-list-rows-v1) — THE MEASUREMENT, on the rendered page, over the emulator's
 * own 19-agent fixture account (tests/e2e/clrFixture.mjs), at window widths 1280, 1440, 1600 and 1920.
 *
 *   M1  column left edges match the template for the card's width (±1px); Fit's left = Agent's right + the gap
 *   M2  no cell's content leaves its cell; no cell box overlaps its neighbour's; headings neither wrap nor truncate
 *   M3  Fit, Genres sought and Query status content is centred in its column (±2px)
 *   M4  the flag shows only for the abroad agent; the agency line never holds a city
 *   M5  your-move actions are visible at rest; the others are opacity 0 at rest and 1 on row hover; hover moves no row
 *   M6  each heading sort orders the fixture as the brief's 3.1 says, both ways, unrated/unknown last both ways; the
 *       chip names the same field and direction
 *   M7  the list opens A to Z; the search reads "Filter by name or agency", with no "/" hint
 *
 * ⚠️ EMULATOR ONLY: `npm run e2e:emu -- tests/e2e/contactListRows.measure.ts --project=measure`.
 * ⚠️ RED-BEFORE: CLR_MUTATE=m1,m3,m5 injects each deleted fix's old rule (a comma list); M6's red is a source revert.
 * ⚠️ POPULATION FIRST: every lock asserts the rows it measures exist (19) before it asserts anything about them.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { readPng } from "./pngPixels";
import { execFileSync } from "node:child_process";
import { CLR_AGENTS, CLR_EMAIL, clrId } from "./clrFixture.mjs";

test.use({ storageState: { cookies: [], origins: [] } });
/* not serial: each lock reads on its own, so one red does not hide the next */

const DIR = process.env.CLR_DIR ?? "reports/contact-list-rows-v1-3";
const WIDTHS = [1280, 1440, 1600, 1920];
const H = 900;
const MUTATE = new Set((process.env.CLR_MUTATE ?? "").split(",").map((s) => s.trim()).filter(Boolean));

/* ── the fixture, as the locks read it ─────────────────────────────────────────────────────────────────────────── */
type Fx = { id: string; name: string; surname: string; agency: string; city: string; country: string; rating: number | null;
  genres: string[]; nrmn: boolean | null; door: string;
  weeks: number | null; stand: "you" | "agent" | "none" | "closed"; rank: number };
const RANK = ["signed", "offer", "resub", "rr", "fs", "fr", "ps", "pr", "queried", "none", "closed"];
const KEY: Record<string, string> = { "Queried": "queried", "Partial Requested": "pr", "Partial Sent": "ps", "Full Requested": "fr", "Full Sent": "fs", "Rejected": "closed" };
const NUDGE_DUE = new Set(["Ferris"]);
const FX: Fx[] = CLR_AGENTS.map((r) => {
  const [first, surname, agency, city, country, rating, genres, weeks, nrmn, door, story] = r as [string, string, string, string, string, number | null, string[], number | null, boolean | null, string, [number, string][] | null];
  const last = story ? story[story.length - 1][1] : null;
  const k = last ? KEY[last] : "none";
  const stand = !last ? "none" : last === "Rejected" ? "closed" : (last === "Partial Requested" || last === "Full Requested" || NUDGE_DUE.has(surname)) ? "you" : "agent";
  return { id: clrId(surname), name: `${first} ${surname}`, surname, agency, city, country, rating, weeks, stand, rank: RANK.indexOf(k), genres, nrmn, door };
});
const byId = new Map(FX.map((x) => [x.id, x]));
const COUNTRY: Record<string, string> = { US: "United States", IE: "Ireland", GB: "United Kingdom" };
const AZ = [...FX].sort((a, b) => a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name)).map((x) => x.id);

/* the template, for a card width — v1.2.1's retuned tiers (4.4): narrow below 900, middle 900–1099, wide from 1100 */
type Tr = number | "genres" | "status";
function template(card: number): { tracks: Tr[]; gap: number; genresMin: number; genresMax: number | null; statusMin: number | null } {
  if (card >= 1100) return { tracks: [290, 90, "genres", 180, "status", 30], gap: 24, genresMin: 0, genresMax: 360, statusMin: 220 };
  if (card >= 900) return { tracks: [232, 72, "genres", 160, "status", 30], gap: 16, genresMin: 170, genresMax: 260, statusMin: 176 };
  return { tracks: [228, 64, "genres", 138, 156, 22], gap: 14, genresMin: 0, genresMax: null, statusMin: null };
}
const tierOf = (card: number): "narrow" | "middle" | "wide" => (card >= 1100 ? "wide" : card >= 900 ? "middle" : "narrow");
/** expected left edges (relative to the row's own left) for a row this wide, by the grid algorithm: fixed tracks; Genres
 *  grows from its minimum to its maximum before the flexible track (Query status) takes what is left; narrow: Genres is
 *  the 1fr */
function expectedLefts(card: number, row: number): number[] {
  const t = template(card);
  const fixed = t.tracks.filter((x): x is number => typeof x === "number").reduce((s, x) => s + x, 0);
  const free = row - fixed - t.gap * (t.tracks.length - 1);
  let genres: number, status = 0;
  if (t.statusMin == null) genres = Math.max(0, free);
  else { genres = Math.max(t.genresMin, Math.min(t.genresMax!, free - t.statusMin)); status = Math.max(t.statusMin, free - genres); }
  const w = t.tracks.map((x) => (x === "genres" ? genres : x === "status" ? status : x));
  const out: number[] = []; let at = 0;
  for (const x of w) { out.push(at); at += x + t.gap; }
  return out;
}

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUTATE.size ? `-mut-${[...MUTATE].join("-")}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 25)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/* ── the page ─────────────────────────────────────────────────────────────────────────────────────────────────── */
const MUTATIONS: Record<string, string> = {
  /* M1's fix deleted: the old fr shares, which hand spare width to every column */
  m1: `[data-cl26="card"] .cl26-row, [data-cl26="card"] .cl26-th { grid-template-columns: minmax(0,1.25fr) minmax(0,.4fr) minmax(0,1fr) minmax(0,.7fr) minmax(0,.95fr) 34px !important; }`,
  /* M3's fix deleted: the centred cells start at their left edge */
  m3: `[data-clr-c] { justify-content: flex-start !important; align-items: flex-start !important; text-align: left !important; }`,
  /* M5's fix deleted: the quiet actions show at rest */
  m5: `[data-clr="act"]:not([data-ym]) { opacity: 1 !important; }`,
  /* v1.2 — each fix deleted in turn */
  m8: `.cl26-card .cl26-row, .cl26-card .cl26-th { grid-template-columns: 290px 90px minmax(0,360px) 180px 220px minmax(24px,1fr) !important; } .cl26-card .cl26-row .cl26-chev { justify-content: center !important; }`,
  m10: `.cl26-card .cl26-th.cl26-pin { top: 0px !important; border-radius: 0 !important; }`,
  m11: `.cl26-card .cl26-row .clr-gline .clr-tag { height: 26px !important; padding: 0 9px !important; border-radius: 7px !important; font: 400 14px/26px var(--sp-type) !important; } .cl26-card .cl26-row .cl26-want { padding: 0 !important; }`,
  m14: `.cl26-card .cl26-q > .clr-act { opacity: 1 !important; transform: none !important; } .cl26-card .cl26-row .cl26-q > .clr-rest { opacity: 1 !important; transform: none !important; }`,
  /* v1.3 — M28's above-the-slim-bar fix deleted: the slim bar's ground no longer reaches up to the sheet's top */
  m28: `.clv-group.cl27 > .qc156-slim[data-shown]::after { content: none !important; }`,
  m15: `@media (hover: none) { .cl26-card .cl26-q > .clr-act { display: inline-flex !important; opacity: 1 !important; } .cl26-card .cl26-chev[data-has] > .clr-act-end { display: none !important; } }`,
};
async function open(page: Page, width: number, view?: { group26: "none" | "letter" }) {
  /* a remembered view, written before the app reads it (qh.cl.view, lib/contactListMemory) */
  if (view) await page.addInitScript((g) => { try { localStorage.setItem("qh.cl.view", JSON.stringify({ v: 1, group: "none", sort: "surname", reversed: false, pinned: false, view: "list", byStatus: true, group26: g })); } catch { /* none */ } }, view.group26);
  await openRoute(page, "/agents", { width, height: H });
  for (const m of MUTATE) if (MUTATIONS[m]) await page.addStyleTag({ content: MUTATIONS[m] });
  await expect(page.locator('[data-cl26="row"]').filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(600);
}

/** one read of the list: the card, the headings and every row's cells, from measured boxes */
const readList = (page: Page) => page.evaluate(() => {
  const shown = (e: Element | null): e is HTMLElement => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0.5 && r.height > 0.5; };
  const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown) ?? null;
  if (!card) return null;
  const box = (e: Element) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
  /* the content's own box: the union of its children's boxes (text nodes through a range). A pill and the track count as
     their PAINTED box (a pill's background, the track's 78px drawing), not the text inside them */
  const content = (cell: Element) => {
    const rs: DOMRect[] = [];
    const parts: string[] = [];
    const walk = (n: Node) => {
      for (const c of n.childNodes) {
        if (c.nodeType === 3 && (c.textContent ?? "").trim()) {
          const rg = document.createRange(); rg.selectNodeContents(c);
          for (const r of rg.getClientRects()) { rs.push(r); parts.push(`"${(c.textContent ?? "").trim().slice(0, 12)}" ${r.left.toFixed(0)}–${r.right.toFixed(0)}`); }
        }
        else if (c.nodeType === 1) {
          const el = c as HTMLElement; const s = getComputedStyle(el);
          /* v1.2 — the action waiting under the status and the rater's stars sit at opacity 0 until hover: not content */
          if (s.display === "none" || s.visibility === "hidden" || parseFloat(s.opacity) === 0) continue;
          if (el.matches("svg, img, i, [data-clr-atom], [data-cl252='pill'], [data-cl252='track']")) {
            const r = el.getBoundingClientRect();
            if (r.width > 0) { rs.push(r); parts.push(`${el.tagName.toLowerCase()}.${String(el.getAttribute("class") ?? "").split(" ")[0]} ${r.left.toFixed(0)}–${r.right.toFixed(0)}`); }
            continue;
          }
          walk(el);
        }
      }
    };
    walk(cell);
    const v = rs.filter((r) => r.width > 0 && r.height > 0);
    if (!v.length) return null;
    return { l: Math.min(...v.map((r) => r.left)), r: Math.max(...v.map((r) => r.right)), t: Math.min(...v.map((r) => r.top)), b: Math.max(...v.map((r) => r.bottom)), parts: parts.join(" | ") };
  };
  const heads = [...card.querySelectorAll<HTMLElement>("[data-clr-h]")].map((h) => {
    /* the heading cell itself: `innerText` drops the hidden long/short word, and its scroll width shows any overflow */
    /* lines: the distinct tops of its TEXT only (an element box and its text line differ by a pixel and are one line) */
    const tops = new Set<number>();
    const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
    for (let t = tw.nextNode(); t; t = tw.nextNode()) {
      if (!(t.textContent ?? "").trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(t);
      for (const r of rg.getClientRects()) if (r.width > 0) tops.add(Math.round(r.top + r.height / 2));
    }
    const lines = tops.size;
    return { k: h.getAttribute("data-clr-h"), text: (h.innerText ?? "").replace(/[↑↓↕]/g, "").trim(), ...box(h),
      sw: h.scrollWidth, cw: h.clientWidth, lines, sort: h.getAttribute("aria-sort"),
      disabled: !!h.querySelector("button:disabled"), title: h.querySelector("button")?.getAttribute("title") ?? null };
  });

  const rows = [...card.querySelectorAll<HTMLElement>('[data-cl26="row"]')].filter(shown).map((row) => {
    const cells = [...row.querySelectorAll<HTMLElement>(":scope > [role='cell']")].map((c) => ({
      k: c.getAttribute("data-clr"), ...box(c), content: content(c), centred: c.hasAttribute("data-clr-c"),
    }));
    const act = row.querySelector<HTMLElement>('[data-clr="act"]');
    const flag = row.querySelector<HTMLElement>('[data-clr="flag"]');
    return {
      id: row.getAttribute("data-id"), ...box(row), cells,
      agency: row.querySelector('[data-cl26="agency"]')?.textContent ?? null,
      flag: flag && shown(flag) ? flag.getAttribute("title") : null,
      bang: !!row.querySelector(".cl26-bang"),
      act: act ? { text: act.textContent, ym: act.hasAttribute("data-ym"), opacity: parseFloat(getComputedStyle(act).opacity), color: getComputedStyle(act).color } : null,
    };
  });
  const chip = [...document.querySelectorAll<HTMLElement>('[data-clq="sort"]')].find(shown) ?? null;
  const find = [...document.querySelectorAll<HTMLElement>('[data-cl26="find"]')].find(shown) ?? null;
  const kbd = find?.querySelector("kbd") ?? null;
  /* the width a container query on the card reads: its content box (border box less padding and border) */
  const cs = getComputedStyle(card);
  const inner = card.getBoundingClientRect().width - ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"]
    .reduce((s, k) => s + (parseFloat(cs[k as "paddingLeft"]) || 0), 0);
  return {
    card: { ...box(card), w: inner }, heads, rows,
    chip: chip ? { field: chip.querySelector('[data-sc="field"]')?.textContent ?? null, dir: chip.querySelector('[data-sc="dir"]')?.textContent ?? null } : null,
    placeholder: find?.querySelector("input")?.getAttribute("placeholder") ?? null,
    kbd: !!kbd && shown(kbd),
  };
});
type List = NonNullable<Awaited<ReturnType<typeof readList>>>;

const COLS = ["agent", "fit", "genres", "policy", "status", "chev"];
const CENTRED = new Set(["fit", "genres", "status"]);

test.beforeAll(() => {
  /* a child process with a timeout, never an in-test await: an emulator write that cannot land retries forever and an
     in-test seed would hold the slot past Playwright's own timeout (memory: execsync-seed-hangs-the-slot) */
  const out = execFileSync("node", ["tests/e2e/clrFixture.mjs"], { encoding: "utf8", timeout: 90_000 });
  console.log(out.trim());
  expect(out).toContain("19 agents");
  /* the fixture's own login, set only now: the setup project shares this process and reads the variable when it loads,
     so a top-level assignment had it sign in as an account the seed had not made yet */
  process.env.SA_E2E_EMAIL = CLR_EMAIL;
});

test("M1–M4 · columns, cells, centring, the flag — at 1280, 1440, 1600, 1920", async ({ page }) => {
  test.setTimeout(300_000);
  const m1 = new Ledger("M1"), m2 = new Ledger("M2"), m3 = new Ledger("M3"), m4 = new Ledger("M4");
  mkdirSync(`${DIR}/shots`, { recursive: true });
  for (const w of WIDTHS) {
    await open(page, w);
    const L = (await readList(page)) as List | null;
    m1.check(`${w} · the card`, !!L, "the list card is on screen");
    if (!L) continue;
    /* POPULATION FIRST */
    m1.check(`${w} · population`, L.rows.length === 19, `${L.rows.length} rows (want the fixture's 19)`);
    m4.check(`${w} · population`, L.rows.length === 19, `${L.rows.length} rows`);
    const exp0 = expectedLefts(L.card.w, L.rows[0]?.w ?? 0);
    for (const row of L.rows) {
      const ks = row.cells.map((c) => c.k);
      m1.check(`${w} · ${row.id} · cells`, JSON.stringify(ks) === JSON.stringify(COLS), `cells ${JSON.stringify(ks)}`);
      if (ks.length !== COLS.length) continue;
      const exp = expectedLefts(L.card.w, row.w);
      row.cells.forEach((c, i) => {
        const got = c.l - row.l;
        m1.check(`${w} · ${row.id} · ${c.k} left`, Math.abs(got - exp[i]) <= 1, `left ${got.toFixed(1)} want ${exp[i].toFixed(1)} (card ${L.card.w.toFixed(0)}, row ${row.w.toFixed(0)})`);
      });
      const gap = template(L.card.w).gap;
      m1.check(`${w} · ${row.id} · fit = agent right + gap`, Math.abs(row.cells[1].l - (row.cells[0].r + gap)) <= 1,
        `fit ${row.cells[1].l.toFixed(1)} agent.r ${row.cells[0].r.toFixed(1)} gap ${gap}`);
      /* M2: cells never overlap, and their content stays inside */
      for (let i = 0; i + 1 < row.cells.length; i++) {
        m2.check(`${w} · ${row.id} · ${row.cells[i].k}|${row.cells[i + 1].k}`, row.cells[i].r <= row.cells[i + 1].l + 0.5,
          `r ${row.cells[i].r.toFixed(1)} next l ${row.cells[i + 1].l.toFixed(1)}`);
      }
      for (const c of row.cells) {
        if (!c.content) continue;
        m2.check(`${w} · ${row.id} · ${c.k} content inside`, c.content.l >= c.l - 0.5 && c.content.r <= c.r + 0.5,
          `content ${c.content.l.toFixed(1)}–${c.content.r.toFixed(1)} cell ${c.l.toFixed(1)}–${c.r.toFixed(1)}`);
        /* M3 */
        if (CENTRED.has(c.k ?? "")) {
          const off = (c.content.l + c.content.r) / 2 - (c.l + c.r) / 2;
          m3.check(`${w} · ${row.id} · ${c.k} centred`, Math.abs(off) <= 2, `content centre off by ${off.toFixed(1)} · cell ${c.l.toFixed(0)}–${c.r.toFixed(0)} · ${c.content.parts}`);
        }
      }
      /* M4 */
      const fx = byId.get(row.id ?? "");
      if (fx) {
        const abroad = fx.country !== "GB";
        m4.check(`${w} · ${fx.surname} · flag`, abroad ? !!row.flag : !row.flag, `flag ${JSON.stringify(row.flag)} (abroad: ${abroad})`);
        if (abroad) m4.check(`${w} · ${fx.surname} · flag title`, row.flag === `${fx.city}, ${COUNTRY[fx.country]}`, `title ${JSON.stringify(row.flag)}`);
        m4.check(`${w} · ${fx.surname} · agency alone`, (row.agency ?? "").trim() === fx.agency, `agency line ${JSON.stringify(row.agency)}`);
        m4.check(`${w} · ${fx.surname} · no city`, !(row.agency ?? "").includes(fx.city), `agency line ${JSON.stringify(row.agency)}`);
      }
    }
    m1.check(`${w} · expected template`, exp0.length === 6, `lefts ${exp0.map((x) => x.toFixed(0)).join(",")}`);
    /* headings: on the same template, never wrapping or truncated */
    m2.check(`${w} · headings`, L.heads.length === 5, `${L.heads.length} headings`);
    const row0 = L.rows[0];
    for (const h of L.heads) {
      m2.check(`${w} · heading ${h.k} fits`, h.sw <= h.cw + 0.5 && h.lines === 1, `"${h.text}" sw ${h.sw} cw ${h.cw} lines ${h.lines}`);
      const i = COLS.indexOf(h.k ?? "");
      if (row0 && i >= 0 && row0.cells[i]) m1.check(`${w} · heading ${h.k} on its column`, Math.abs(h.l - row0.cells[i].l) <= 1, `heading l ${h.l.toFixed(1)} cell l ${row0.cells[i].l.toFixed(1)}`);
    }
    const short = L.card.w < 900;
    const want = short ? ["Agent", "Fit", "Genres", "Response", "Query status"] : ["Agent", "Fit", "Genres sought", "Response policy", "Query status"];
    m2.check(`${w} · heading words`, JSON.stringify(L.heads.map((h) => h.text)) === JSON.stringify(want), `${JSON.stringify(L.heads.map((h) => h.text))} (card ${L.card.w.toFixed(0)})`);
    if (!MUTATE.size) await page.screenshot({ path: `${DIR}/shots/rest-${w}.png` });
  }
  m1.done(19 * 4 * 6); m2.done(19 * 4 * 5); m3.done(19 * 4 * 2); m4.done(19 * 4 * 3);
});

test("M5 · the action's words (re-pointed by v1.2: the query card's words everywhere; no action on a closed query)", async ({ page }) => {
  test.setTimeout(180_000);
  const m5 = new Ledger("M5");
  await open(page, 1600);
  const L = (await readList(page)) as List;
  m5.check("population", L.rows.length === 19, `${L.rows.length} rows`);
  /* the words: the query card's Next box's own (lib/qc1512 `rowAct`), "Log a query" for an agent not yet queried */
  const WANT: Record<string, string> = { Ferris: "Nudge", Tan: "Send your partial", Okafor: "Send your full", Holt: "Record a response", Ellison: "Log a query", Pemberton: "Log a query" };
  for (const r of L.rows) {
    const fx = byId.get(r.id!)!;
    if (WANT[fx.surname]) m5.check(`${fx.surname} · words`, r.act?.text === WANT[fx.surname], `action ${JSON.stringify(r.act?.text)} want ${WANT[fx.surname]}`);
    if (fx.stand === "closed" || fx.surname === "Whitfield") m5.check(`${fx.surname} · no action`, !r.act, `action ${JSON.stringify(r.act?.text)}`);
  }
  m5.done(9);
});

/** the drawn order after a heading press */
async function pressHead(page: Page, k: string) {
  await page.locator(`[data-cl26="card"] [data-clr-h="${k}"] button`).filter({ visible: true }).first().click();
  await page.waitForTimeout(400);
  return (await readList(page)) as List;
}
const ids = (L: List) => L.rows.map((r) => r.id!);
const surnames = (xs: string[]) => xs.map((i) => byId.get(i)?.surname ?? i).join(" ");
/** every adjacent pair satisfies `ok`; names the first that does not */
function ordered(xs: string[], ok: (a: Fx, b: Fx) => boolean): string | null {
  for (let i = 0; i + 1 < xs.length; i++) { const a = byId.get(xs[i])!, b = byId.get(xs[i + 1])!; if (!ok(a, b)) return `${a.surname} before ${b.surname}`; }
  return null;
}

test("M6 · heading sorts, both ways; the chip agrees", async ({ page }) => {
  test.setTimeout(180_000);
  const m6 = new Ledger("M6");
  /* v1.2 — ungrouped: grouped by Letter the status sort draws one section a stage (5.2), so the pure order is read here */
  await open(page, 1600, { group26: "none" });
  let L = (await readList(page)) as List;
  m6.check("population", L.rows.length === 19, `${L.rows.length} rows`);
  const tiers = (x: Fx) => (x.stand === "you" ? 0 : x.stand === "closed" ? 2 : 1);
  const cases: { k: string; chip: string; check: (xs: string[], rev: boolean) => string | null }[] = [
    { k: "fit", chip: "Fit", check: (xs, rev) => ordered(xs, (a, b) => (a.rating == null ? b.rating == null : b.rating == null || (rev ? a.rating <= b.rating : a.rating >= b.rating))) },
    { k: "policy", chip: "Response time", check: (xs, rev) => ordered(xs, (a, b) => (a.weeks == null ? b.weeks == null : b.weeks == null || (rev ? a.weeks >= b.weeks : a.weeks <= b.weeks))) },
    { k: "status", chip: "Query status", check: (xs, rev) => ordered(xs, (a, b) => {
      const ka = [tiers(a), a.rank], kb = [tiers(b), b.rank];
      const cmp = ka[0] - kb[0] || ka[1] - kb[1];
      return rev ? cmp >= 0 : cmp <= 0;
    }) },
    { k: "agent", chip: "Surname", check: (xs, rev) => (JSON.stringify(xs) === JSON.stringify(rev ? [...AZ].reverse() : AZ) ? null : `order ${surnames(xs)}`) },
  ];
  for (const c of cases) {
    /* the first press sorts in its natural order, the second reverses (Agent comes last: the list opens on it, so a
       press there first would reverse) */
    for (const rev of [false, true]) {
      L = await pressHead(page, c.k);
      const xs = ids(L);
      m6.check(`${c.k} ${rev ? "reversed" : "first press"} · population`, xs.length === 19, `${xs.length} rows`);
      const bad = c.check(xs, rev);
      m6.check(`${c.k} ${rev ? "reversed" : "first press"} · order`, !bad, bad ? `${bad} · ${surnames(xs)}` : surnames(xs));
      const head = L.heads.find((h) => h.k === c.k);
      m6.check(`${c.k} ${rev ? "reversed" : "first press"} · aria-sort`, head?.sort === (rev ? "descending" : "ascending"), `aria-sort ${head?.sort}`);
      m6.check(`${c.k} ${rev ? "reversed" : "first press"} · chip`, L.chip?.field === c.chip && L.chip?.dir === (rev ? "↓" : "↑"), `chip ${JSON.stringify(L.chip)}`);
    }
    /* the unrated and unknown sit last both ways — named, not only implied by the pair rule (which also forbids it) */
    if (c.k === "fit" || c.k === "policy") {
      const missing = (x: Fx) => (c.k === "fit" ? x.rating == null : x.weeks == null);
      const xs = ids(L); /* the reversed press, just read */
      const n = FX.filter(missing).length;
      m6.check(`${c.k} · missing last when reversed`, n > 0 && xs.slice(xs.length - n).every((i) => missing(byId.get(i)!)), `tail ${surnames(xs.slice(xs.length - n))}`);
    }
  }
  /* Genres sought does not sort */
  const g = L.heads.find((h) => h.k === "genres");
  const gBtn = await page.locator('[data-cl26="card"] [data-clr-h="genres"] button').filter({ visible: true }).count();
  m6.check("genres · no sort", !!g && gBtn === 0, `genres heading buttons ${gBtn}`);
  /* the screen the report asks for: 1600 sorted by Query status */
  L = await pressHead(page, "status");
  if (L.heads.find((h) => h.k === "status")?.sort === "descending") L = await pressHead(page, "status");
  if (!MUTATE.size) await page.screenshot({ path: `${DIR}/shots/sorted-status-1600.png` });
  m6.done(36);
});

test("M7 · opens A to Z; the search's words", async ({ page }) => {
  test.setTimeout(120_000);
  const m7 = new Ledger("M7");
  await open(page, 1440);
  const L = (await readList(page)) as List;
  m7.check("population", L.rows.length === 19, `${L.rows.length} rows`);
  m7.check("opens A to Z", JSON.stringify(ids(L)) === JSON.stringify(AZ), surnames(ids(L)));
  m7.check("chip says Surname ↑", L.chip?.field === "Surname" && L.chip?.dir === "↑", `chip ${JSON.stringify(L.chip)}`);
  m7.check("agent heading active", L.heads.find((h) => h.k === "agent")?.sort === "ascending", `aria-sort ${L.heads.find((h) => h.k === "agent")?.sort}`);
  m7.check("placeholder", L.placeholder === "Filter by name or agency", `placeholder ${JSON.stringify(L.placeholder)}`);
  m7.check("no / hint", !L.kbd, `kbd shown ${L.kbd}`);
  m7.done(6);
});

/* ══ Contact list rows v1.2 — M8 to M20 ══════════════════════════════════════════════════════════════════════════════
 * Hooks: the status cell's resting stack [data-clr="rest"] and its action [data-clr="act"]; the touch action at the row's
 * end [data-clr="act-end"]; the unrated rater [data-clr="rate"] with [data-clr="rate-star"]; the genre lines
 * [data-clr="gline"]; the panel's options [data-clq-opt], its Clear all [data-clq="clear"], its foot [data-clq="foot"].
 * ⚠️ The agents page's panel is the visible `.qc153-rail.fp`; the Query Centre's is the same class on /queries. */
const box0 = (e: Element) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
const visibleRows = (page: Page) => page.locator('[data-cl26="card"] [data-cl26="row"]').filter({ visible: true });

test("M8, M9, M11 · status centred in its space; typewriter headings; genre tags in lines", async ({ page }) => {
  test.setTimeout(300_000);
  const m8 = new Ledger("M8"), m9 = new Ledger("M9"), m11 = new Ledger("M11");
  for (const w of WIDTHS) {
    await open(page, w);
    const R = await page.evaluate(() => {
      const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5;
      const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown)!;
      const cs = getComputedStyle(card);
      const inner = card.getBoundingClientRect().width - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      const b = (e: Element) => { const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width, h: r.height }; };
      const heads = [...card.querySelectorAll<HTMLElement>("[data-clr-h]")].map((h) => {
        /* the element that DRAWS the words: the parent of the first visible text node (an inner span can take another face) */
        const tw = document.createTreeWalker(h, NodeFilter.SHOW_TEXT);
        let lab: HTMLElement = h;
        for (let t = tw.nextNode(); t; t = tw.nextNode()) { const pe = t.parentElement!; if ((t.textContent ?? "").trim() && pe.getBoundingClientRect().width > 0 && !/[↑↓↕]/.test(t.textContent ?? "")) { lab = pe; break; } }
        const s = getComputedStyle(lab);
        return { k: h.dataset.clrH, family: s.fontFamily, size: parseFloat(s.fontSize), sw: h.scrollWidth, cw: h.clientWidth };
      });
      const rows = [...card.querySelectorAll<HTMLElement>('[data-cl26="row"]')].filter(shown).map((row) => {
        /* the › itself (the brief's "the ›'s left edge"), not its column */
        const pol = row.querySelector('[data-clr="policy"]'), chev = row.querySelector('[data-clr="chev-mark"]');
        const rest = row.querySelector('[data-clr="rest"]');
        const gcell = row.querySelector('[data-clr="genres"]');
        const lines = [...row.querySelectorAll<HTMLElement>('[data-clr="gline"]')].filter(shown).map((ln) => ({
          ...b(ln),
          pills: [...ln.querySelectorAll<HTMLElement>('[data-cl252="pill"]')].filter(shown).map((p) => {
            const s = getComputedStyle(p);
            return { ...b(p), family: s.fontFamily, weight: s.fontWeight, size: parseFloat(s.fontSize), trunc: p.scrollWidth > p.clientWidth + 1 };
          }),
          more: !!ln.querySelector('[data-clr="more"]'),
        }));
        return { id: row.dataset.id, pol: pol ? b(pol) : null, chev: chev ? b(chev) : null, rest: rest && shown(rest) ? b(rest) : null,
          gcell: gcell ? b(gcell) : null, lines };
      });
      return { inner, heads, rows };
    });
    m8.check(`${w} · population`, R.rows.length === 19, `${R.rows.length} rows`);
    for (const r of R.rows) {
      if (!r.pol || !r.chev || !r.rest) { m8.check(`${w} · ${r.id} · parts`, false, `pol ${!!r.pol} chev ${!!r.chev} rest ${!!r.rest}`); continue; }
      const mid = (r.pol.r + r.chev.l) / 2, c = (r.rest.l + r.rest.r) / 2;
      m8.check(`${w} · ${r.id} · status centred between policy and ›`, Math.abs(c - mid) <= 2, `centre ${c.toFixed(1)} want ${mid.toFixed(1)}`);
      const fx = byId.get(r.id!)!;
      if (fx.genres.length) {
        const per = R.inner >= 1250 ? 3 : R.inner < 900 ? 1 : 2;
        const shownPills = r.lines.reduce((n, ln) => n + ln.pills.length, 0);
        m11.check(`${w} · ${fx.surname} · lines ≤ 2`, r.lines.length >= 1 && r.lines.length <= 2, `${r.lines.length} lines`);
        m11.check(`${w} · ${fx.surname} · ${per} a line`, r.lines.every((ln) => ln.pills.length <= per) && shownPills === Math.min(fx.genres.length, per * 2),
          `lines ${r.lines.map((ln) => ln.pills.length).join("+")} of ${fx.genres.length} (per ${per}, card ${R.inner.toFixed(0)})`);
        const more = fx.genres.length > per * 2;
        m11.check(`${w} · ${fx.surname} · +n on the last line`, more ? r.lines[r.lines.length - 1]?.more === true && r.lines.slice(0, -1).every((ln) => !ln.more) : r.lines.every((ln) => !ln.more), `more ${r.lines.map((ln) => ln.more)}`);
        for (const ln of r.lines) for (const p of ln.pills) {
          m11.check(`${w} · ${fx.surname} · tag clear of the cell`, p.l >= r.gcell!.l + 6 - 0.5 && p.r <= r.gcell!.r - 6 + 0.5, `tag ${p.l.toFixed(1)}–${p.r.toFixed(1)} cell ${r.gcell!.l.toFixed(1)}–${r.gcell!.r.toFixed(1)}`);
          m11.check(`${w} · ${fx.surname} · tag face`, Math.abs(p.h - 28) < 0.6 && /Source Serif/.test(p.family) && p.weight === "600" && p.size === 14, `h ${p.h} ${p.family.split(",")[0]} ${p.weight} ${p.size}`);
        }
      }
    }
    for (const h of R.heads) {
      const want = R.inner >= 1100 ? 18 : 16; /* v1.2.1: 18px on the wide tier */
      m9.check(`${w} · heading ${h.k}`, /Special Elite/.test(h.family) && h.size === want && h.sw <= h.cw + 0.5, `${h.family.split(",")[0]} ${h.size}px (want ${want}) sw ${h.sw} cw ${h.cw}`);
    }
  }
  m8.done(19 * 4); m9.done(20); m11.done(60);
});

test("M10 · pinned: the heading row level with the filter panel, rounded, nothing showing above", async ({ page }) => {
  test.setTimeout(180_000);
  const m10 = new Ledger("M10");
  for (const w of [1440, 1920]) {
    await open(page, w);
    await page.evaluate(() => { const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().width > 0); sc?.scrollBy({ top: 900, behavior: "instant" as ScrollBehavior }); });
    await page.waitForTimeout(500);
    const R = await page.evaluate(() => {
      const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5;
      const th = [...document.querySelectorAll<HTMLElement>('[data-cl26="heads"]')].find(shown)!;
      const fp = [...document.querySelectorAll<HTMLElement>(".qc153-rail.fp")].find(shown)!;
      const t = th.getBoundingClientRect(), f = fp.getBoundingClientRect();
      const s = getComputedStyle(th);
      /* just above the heading row, across it: never a row */
      const hits: string[] = [];
      for (let x = t.left + 8; x < t.right - 8; x += 40) {
        for (const dy of [1, 3, 6]) {
          const el = document.elementFromPoint(x, t.top - dy);
          if (el?.closest('[data-cl26="row"]')) hits.push(`${Math.round(x)},${Math.round(t.top - dy)}`);
        }
      }
      const firstRow = [...document.querySelectorAll<HTMLElement>('[data-cl26="row"]')].find(shown);
      return { thTop: t.top, fpTop: f.top, rl: parseFloat(s.borderTopLeftRadius), rr: parseFloat(s.borderTopRightRadius), hits,
        stuck: th.closest("[data-clq-stuck], [data-stuck]") != null || th.hasAttribute("data-stuck"), scrolledPast: firstRow ? firstRow.getBoundingClientRect().top < t.bottom : false, shadow: s.boxShadow };
    });
    m10.check(`${w} · precondition: rows have scrolled under the headings`, R.scrolledPast, `scrolled ${R.scrolledPast}`);
    m10.check(`${w} · heading top = panel top`, Math.abs(R.thTop - R.fpTop) <= 1, `headings ${R.thTop.toFixed(1)} panel ${R.fpTop.toFixed(1)}`);
    m10.check(`${w} · rounded top corners`, R.rl >= 13 && R.rr >= 13, `radius ${R.rl}/${R.rr}`);
    m10.check(`${w} · no row above the headings`, R.hits.length === 0, `row pixels at ${R.hits.slice(0, 5).join(" ")}`);
    m10.check(`${w} · a soft shadow once stuck`, R.shadow !== "none", `shadow ${R.shadow}`);
    if (w === 1440 && !MUTATE.size) await page.screenshot({ path: `${DIR}/shots/pinned-1440.png` });
  }
  m10.done(10);
});

test("M13, M14, M16 · plain discs; the status/action swap; the small outline button and its words", async ({ page }) => {
  test.setTimeout(240_000);
  const m13 = new Ledger("M13"), m14 = new Ledger("M14"), m16 = new Ledger("M16");
  await open(page, 1440);
  const discs = await page.evaluate(() => {
    const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5;
    const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown)!;
    const page = card.closest(".wpg") ?? document.body;
    return {
      bangs: [...page.querySelectorAll(".cl26-bang")].filter(shown).length,
      d: [...card.querySelectorAll<HTMLElement>('[data-cl26="row"]')].filter(shown).map((r) => {
        const d = r.querySelector<HTMLElement>('[data-cl26="disc"]')!; const s = getComputedStyle(d);
        /* every row's words are DRAWN (a box, not display:none), closed rows included — a lock found missing on 26 Nov */
        const drawn = (sel: string) => { const e = r.querySelector<HTMLElement>(sel); return !!e && e.getBoundingClientRect().width > 1 && getComputedStyle(e).display !== "none"; };
        return { id: r.dataset.id, bg: s.backgroundColor, bs: s.borderTopStyle, bc: s.borderTopColor, name: drawn('[data-cl26="name"]'), stage: drawn('[data-clr="stage"]') };
      }),
    };
  });
  m13.check("no \"!\" on this page", discs.bangs === 0, `${discs.bangs} bangs`);
  for (const d of discs.d) {
    const fx = byId.get(d.id!)!;
    const ok = fx.stand === "none" ? d.bg === "rgb(255, 255, 255)" && d.bs === "dotted" && d.bc === "rgb(42, 58, 82)"
      : fx.stand === "closed" ? d.bg === "rgb(228, 225, 219)" : d.bg === "rgb(42, 58, 82)";
    m13.check(`${fx.surname} · disc (${fx.stand})`, ok, `bg ${d.bg} border ${d.bs} ${d.bc}`);
    m13.check(`${fx.surname} · name and stage word drawn`, d.name && d.stage, `name ${d.name} stage ${d.stage}`);
  }
  /* the swap, row by row */
  const rows = visibleRows(page);
  const n = await rows.count();
  m14.check("population", n === 19, `${n} rows`);
  for (let i = 0; i < n; i++) {
    const row = rows.nth(i);
    const id = (await row.getAttribute("data-id"))!;
    const fx = byId.get(id)!;
    await row.scrollIntoViewIfNeeded();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(60);
    const read = () => row.evaluate((e) => {
      const rest = e.querySelector<HTMLElement>('[data-clr="rest"]'), act = e.querySelector<HTMLElement>('[data-clr="act"]');
      const c = (x: HTMLElement | null) => { if (!x) return null; const r = x.getBoundingClientRect(); return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2 }; };
      return { h: e.getBoundingClientRect().height, rest: rest ? parseFloat(getComputedStyle(rest).opacity) : -1, act: act ? parseFloat(getComputedStyle(act).opacity) : -1, rc: c(rest), ac: c(act) };
    });
    const atRest = await read();
    const bx = (await row.boundingBox())!;
    await page.mouse.move(bx.x + 40, bx.y + bx.height / 2);
    await page.waitForTimeout(260);
    const hov = await read();
    if (fx.stand === "closed" || (fx.stand === "none" && fx.door === "Closed")) {
      m14.check(`${fx.surname} · no action, no swap`, atRest.act === -1 && hov.rest === 1, `act ${hov.act} rest ${hov.rest}`);
      continue;
    }
    m14.check(`${fx.surname} · at rest`, atRest.rest === 1 && atRest.act === 0, `rest ${atRest.rest} act ${atRest.act}`);
    m14.check(`${fx.surname} · hovered`, hov.rest === 0 && hov.act === 1, `rest ${hov.rest} act ${hov.act}`);
    m14.check(`${fx.surname} · one centre`, !!hov.ac && !!atRest.rc && Math.abs(hov.ac.x - atRest.rc.x) <= 2 && Math.abs(hov.ac.y - atRest.rc.y) <= 2,
      `action ${hov.ac?.x.toFixed(1)},${hov.ac?.y.toFixed(1)} status ${atRest.rc?.x.toFixed(1)},${atRest.rc?.y.toFixed(1)}`);
    m14.check(`${fx.surname} · height unchanged`, Math.abs(hov.h - atRest.h) < 0.5, `${atRest.h} → ${hov.h}`);
    if (fx.surname === "Tan") {
      const st = await row.locator('[data-clr="act"]').evaluate((e) => { const s = getComputedStyle(e); return { h: e.getBoundingClientRect().height, r: s.borderTopLeftRadius, bg: s.backgroundColor, b: `${s.borderTopWidth} ${s.borderTopStyle} ${s.borderTopColor}`, c: s.color, f: s.fontFamily, w: s.fontWeight, z: s.fontSize, p: `${s.paddingLeft} ${s.paddingRight}` }; });
      m16.check("button: 30 high, radius 8, white, 1px navy edge, navy text, Source Serif 600 14px, padding 0 12",
        Math.abs(st.h - 30) < 0.6 && st.r === "8px" && st.bg === "rgb(255, 255, 255)" && st.b === "1px solid rgb(42, 58, 82)" && st.c === "rgb(42, 58, 82)" && /Source Serif/.test(st.f) && st.w === "600" && st.z === "14px" && st.p === "12px 12px",
        JSON.stringify(st));
      if (!MUTATE.size) await page.screenshot({ path: `${DIR}/shots/hover-action-1440.png` });
    }
    await page.mouse.move(2, 2);
  }
  /* the agent card says the same words: Tan's card, its next-step button */
  await page.locator('[data-cl26="row"][data-id="clr-tan"]').filter({ visible: true }).click({ position: { x: 30, y: 20 } });
  await page.waitForTimeout(900);
  const cardBtn = await page.locator('[data-acv2="foot-btn"]').filter({ visible: true }).first().textContent().catch(() => null);
  m16.check("the agent card's words match the row's", (cardBtn ?? "").trim() === "Send your partial", `card ${JSON.stringify(cardBtn)}`);
  m13.done(39); m14.done(60); m16.done(2);
});

test("M15 · no hover: the action at the row's end, the row still two lines", async ({ browser, page }) => {
  test.setTimeout(240_000);
  const m15 = new Ledger("M15");
  await open(page, 1440);
  const mouseH = Object.fromEntries(await visibleRows(page).evaluateAll((rs) => rs.map((r) => [r.getAttribute("data-id"), r.getBoundingClientRect().height])));
  const ctx = await browser.newContext({ viewport: { width: 1440, height: H }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, storageState: { cookies: [], origins: [] } });
  const tp = await ctx.newPage();
  await open(tp, 1440);
  const hoverNone = await tp.evaluate(() => matchMedia("(hover: none)").matches);
  m15.check("precondition: (hover: none) matches", hoverNone, `hover:none ${hoverNone}`);
  const R = await tp.evaluate(() => {
    const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5 && getComputedStyle(e).display !== "none" && parseFloat(getComputedStyle(e).opacity) > 0.5;
    const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown)!;
    return [...card.querySelectorAll<HTMLElement>('[data-cl26="row"]')].filter(shown).map((r) => {
      const cells = [...r.querySelectorAll<HTMLElement>(":scope > [role='cell']")];
      const last = cells[cells.length - 1];
      const end = r.querySelector<HTMLElement>('[data-clr="act-end"]');
      const mid = r.querySelector<HTMLElement>('[data-clr="act"]');
      const lb = last.getBoundingClientRect(), eb = end?.getBoundingClientRect();
      return { id: r.dataset.id, h: r.getBoundingClientRect().height, end: !!end && shown(end), endIn: !!eb && eb.left >= lb.left - 0.5 && eb.right <= lb.right + 0.5,
        mid: !!mid && shown(mid), chev: !!r.querySelector('[data-clr="chev-mark"]') && shown(r.querySelector('[data-clr="chev-mark"]')) };
    });
  });
  m15.check("population", R.length === 19, `${R.length} rows`);
  for (const r of R) {
    const fx = byId.get(r.id!)!;
    if (fx.stand === "closed" || fx.surname === "Whitfield") { m15.check(`${fx.surname} · keeps its ›, no button`, r.chev && !r.end, `chev ${r.chev} end ${r.end}`); continue; }
    m15.check(`${fx.surname} · button in the last column`, r.end && r.endIn && !r.mid, `end ${r.end} inside ${r.endIn} centre-action shown ${r.mid}`);
    m15.check(`${fx.surname} · still two lines`, r.h <= (mouseH[r.id!] ?? 0) + 4, `touch ${r.h.toFixed(1)} mouse ${mouseH[r.id!]}`);
  }
  if (!MUTATE.size) await tp.screenshot({ path: `${DIR}/shots/touch-1440.png` });
  await ctx.close();
  m15.done(35);
});

/* ── the panel: a hand count over the fixture, per option, faceted ── */
/* ── v1.3 · the smart panel: a hand count over the fixture, per option, faceted ── */
const COUNTRY_OF: Record<string, string> = Object.fromEntries(FX.map((x) => [x.id, x.country]));
const gapsOf = (x: Fx) => x.genres.length === 0 || x.weeks == null || x.surname === "Achebe" || x.door === "Closed";
type PanelState = { queried: null | "yes" | "no"; door: null | "open" | "closed"; fitMin: number | null; unrated: boolean;
  genres: string[]; rt: [number, number] | null; rtUnknown: boolean; loc: string[]; always: null | "yes" | "no"; prof: null | "full" | "gaps" };
const PS0: PanelState = { queried: null, door: null, fitMin: null, unrated: false, genres: [], rt: null, rtUnknown: true, loc: [], always: null, prof: null };
type Sec = "queried" | "door" | "fit" | "genres" | "rt" | "loc" | "always" | "prof";
const passes = (x: Fx, s: PanelState, skip: Sec | null) =>
  (skip === "queried" || !s.queried || (s.queried === "yes" ? x.stand !== "none" : x.stand === "none"))
  && (skip === "door" || !s.door || (s.door === "open" ? x.door === "Open" : x.door === "Closed"))
  && (skip === "fit" || s.fitMin == null || (x.rating == null ? s.unrated : x.rating >= s.fitMin))
  && (skip === "genres" || s.genres.length === 0 || x.genres.some((g) => s.genres.includes(g)))
  && (skip === "rt" || !s.rt || (x.weeks == null ? s.rtUnknown : x.weeks >= s.rt[0] && (s.rt[1] >= 16 || x.weeks <= s.rt[1])))
  && (skip === "loc" || s.loc.length === 0 || s.loc.includes(COUNTRY_OF[x.id]))
  && (skip === "always" || !s.always || (s.always === "yes" ? x.nrmn === false : x.nrmn !== false))
  && (skip === "prof" || !s.prof || (s.prof === "gaps" ? gapsOf(x) : !gapsOf(x)));
function handCounts(s: PanelState): Record<string, number> {
  const c = (skip: Sec, fn: (x: Fx) => boolean) => FX.filter((x) => passes(x, s, skip) && fn(x)).length;
  const out: Record<string, number> = {
    "queried:yes": c("queried", (x) => x.stand !== "none"), "queried:no": c("queried", (x) => x.stand === "none"),
    "door:open": c("door", (x) => x.door === "Open"), "door:closed": c("door", (x) => x.door === "Closed"),
    "fit:unrated": c("fit", (x) => x.rating == null),
    "rt:unknown": c("rt", (x) => x.weeks == null),
    "always:yes": c("always", (x) => x.nrmn === false), "always:no": c("always", (x) => x.nrmn !== false),
    "prof:full": c("prof", (x) => !gapsOf(x)), "prof:gaps": c("prof", (x) => gapsOf(x)),
  };
  for (const k of [1, 2, 3, 4, 5]) out[`fit:${k}`] = c("fit", (x) => x.rating != null && x.rating >= k);
  for (const g of new Set(FX.flatMap((x) => x.genres))) out[`genre:${g.toLowerCase()}`] = c("genres", (x) => x.genres.includes(g));
  for (const k of new Set(FX.map((x) => x.country))) out[`loc:${k}`] = c("loc", (x) => x.country === k);
  return out;
}
const readPanel = (page: Page) => page.evaluate(() => {
  const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5;
  const fp = [...document.querySelectorAll<HTMLElement>(".qc153-rail.fp")].find(shown)!;
  /* a genre option is keyed by its words ("genre:crime"), not the app's genre key */
  const keyOf = (o: HTMLElement) => { const k = o.dataset.clqOpt ?? ""; return k.startsWith("genre:") ? `genre:${(o.dataset.label ?? "").toLowerCase()}` : k; };
  const opts = Object.fromEntries([...fp.querySelectorAll<HTMLElement>("[data-clq-opt]")].filter(shown).map((o) => [keyOf(o),
    { n: Number(o.dataset.n), on: o.getAttribute("aria-pressed") === "true" || o.getAttribute("aria-checked") === "true", disabled: (o as HTMLButtonElement).disabled }]));
  const t = (sel: string) => { const e = fp.querySelector<HTMLElement>(sel); return e && shown(e) ? (e.textContent ?? "").trim() : null; };
  return { opts, clear: !!fp.querySelector('[data-clq="clear"]') && shown(fp.querySelector('[data-clq="clear"]')), summary: t('[data-clq="summary"]'),
    fitSum: t('[data-clq="fit-sum"]'), rtLabel: t('[data-clq="rt-label"]'), loc: t('[data-clq="loc"]'),
    sections: [...fp.querySelectorAll<HTMLElement>("[data-clq-sec]")].filter(shown).map((s) => s.dataset.clqSec),
    heads: [...fp.querySelectorAll<HTMLElement>("[data-clq-sec] > .clr-fh > b, [data-clq-sec] .clr-fh b")].filter(shown).map((h) => (h.textContent ?? "").trim()),
    box: (() => { const b = fp.getBoundingClientRect(); return { t: b.top, b: b.bottom, l: b.left, r: b.right }; })(), sh: fp.scrollHeight, ch: fp.clientHeight };
});
type Panel = Awaited<ReturnType<typeof readPanel>>;
const cmpCounts = (L: Ledger, tag: string, P: Panel, s: PanelState) => {
  const want = handCounts(s);
  for (const [k, n] of Object.entries(want)) {
    const got = P.opts[k];
    if (!got && n === 0) continue; /* an absent zero (a genre or country not shown) is not a disagreement */
    /* a genre past the four quick pills, or a country while Location's list is closed, is not drawn: its count is read
       where it IS drawn (the search list, M32; the open list, M34) */
    if (!got && (k.startsWith("genre:") || k.startsWith("loc:"))) continue;
    L.check(`${tag} · ${k}`, !!got && got.n === n, `got ${got ? got.n : "missing"} want ${n}`);
  }
};
const fpOf = (page: Page) => page.locator(".qc153-rail.fp").filter({ visible: true });

test("M17, M18, M25, M30 · the smart panel: sections, words, faceted counts; Clear all", async ({ page }) => {
  test.setTimeout(240_000);
  const m17 = new Ledger("M17"), m18 = new Ledger("M18"), m25 = new Ledger("M25"), m30 = new Ledger("M30");
  await open(page, 1440);
  const fp = fpOf(page);
  let P = await readPanel(page);
  m30.check("sections in the ref's order", JSON.stringify(P.sections) === JSON.stringify(["pairs", "fit", "genres", "reply", "loc", "pairs2"]), JSON.stringify(P.sections));
  m30.check("headings", JSON.stringify(P.heads) === JSON.stringify(["Minimum fit", "Genres sought", "Reply time", "Location"]), JSON.stringify(P.heads));
  m30.check("summaries at rest", P.fitSum === "Any" && P.rtLabel === "Any" && /Anywhere/.test(P.loc ?? ""), `fit ${P.fitSum} rt ${P.rtLabel} loc ${P.loc}`);
  m25.check("no Outside or No genres yet pill; no Missing details", !["abroad", "nogenres", "missing"].some((k) => k in P.opts), Object.keys(P.opts).join(","));
  m25.check("pairs neither chosen at rest", ["queried:yes", "queried:no", "door:open", "door:closed", "always:yes", "always:no", "prof:full", "prof:gaps"].every((k) => P.opts[k] && !P.opts[k].on), "");
  m18.check("Clear all and the summary hidden at rest", !P.clear && P.summary === null, `clear ${P.clear} summary ${P.summary}`);
  cmpCounts(m17, "rest", P, PS0);
  /* three combinations, each faceted. ⚠️ A pair option with no agents under the others is DISABLED (the panel's rule): a
     combination picks the side the fixture can show, read off the panel, so a click never waits on a disabled button. */
  page.setDefaultTimeout(8000);
  const side = async (a: string, b: string) => { const Q = await readPanel(page); return (Q.opts[a]?.n ?? 0) > 0 ? a : b; };
  let st2: PanelState = { ...PS0 }, st3: PanelState = { ...PS0 };
  let lastAlways = "always:yes";
  const states: { tag: string; s: () => PanelState; press: () => Promise<void> }[] = [
    { tag: "Open + 4★", s: () => ({ ...PS0, door: "open", fitMin: 4 }), press: async () => { await fp.locator('[data-clq-opt="door:open"]').click(); await fp.locator('[data-clq-opt="fit:4"]').click(); } },
    { tag: "+ Crime + a profile side", s: () => st2, press: async () => {
      await fp.locator('[data-clq-opt^="genre:"][data-label="Crime"]').click(); await page.waitForTimeout(250);
      const k = await side("prof:gaps", "prof:full");
      st2 = { ...PS0, door: "open", fitMin: 4, genres: ["Crime"], prof: k === "prof:gaps" ? "gaps" : "full" };
      await fp.locator(`[data-clq-opt="${k}"]`).click(); } },
    { tag: "+ Not rated, a reply side", s: () => st3, press: async () => {
      await fp.locator('[data-clq-opt="fit:unrated"]').click(); await page.waitForTimeout(250);
      lastAlways = await side("always:yes", "always:no");
      st3 = { ...st2, unrated: true, always: lastAlways === "always:yes" ? "yes" : "no" };
      await fp.locator(`[data-clq-opt="${lastAlways}"]`).click(); } },
  ];
  for (const st of states) {
    await st.press(); await page.waitForTimeout(350);
    P = await readPanel(page);
    cmpCounts(m30, st.tag, P, st.s());
    const want = FX.filter((x) => passes(x, st.s(), null)).map((x) => x.id).sort();
    const got = (await visibleRows(page).evaluateAll((rs) => rs.map((r) => r.getAttribute("data-id")))).sort();
    m30.check(`${st.tag} · the list is exactly the matching agents`, JSON.stringify(got) === JSON.stringify(want), `got ${got.join(",")} want ${want.join(",")}`);
    m18.check(`${st.tag} · the summary`, P.summary === `${want.length} of 19` && P.clear, `summary ${P.summary} clear ${P.clear}`);
  }
  /* a chosen option clicked again clears it */
  await fp.locator(`[data-clq-opt="${lastAlways}"]`).click(); await page.waitForTimeout(250);
  P = await readPanel(page);
  m30.check("clicking a chosen option again clears it", P.opts[lastAlways]?.on === false, `${lastAlways} ${P.opts[lastAlways]?.on}`);
  await fp.locator('[data-clq="clear"]').click(); await page.waitForTimeout(300);
  P = await readPanel(page);
  m18.check("Clear all resets every section", Object.values(P.opts).every((o) => !o.on) && P.fitSum === "Any", Object.entries(P.opts).filter(([, o]) => o.on).map(([k]) => k).join(","));
  m18.check("Clear all hides itself and the summary", !P.clear && P.summary === null, `clear ${P.clear} summary ${P.summary}`);
  m18.check("the whole list is back", (await visibleRows(page).count()) === 19, "");
  if (!MUTATE.size) await fp.screenshot({ path: `${DIR}/shots/panel-rest.png` });
  m17.done(15); m18.done(7); m25.done(2); m30.done(30);
});

test("M19 · 1280 Letter grouping shows a full tag; one Queried section; Nudge due its own section above Full sent", async ({ page }) => {
  test.setTimeout(180_000);
  const m19 = new Ledger("M19");
  await open(page, 1280);
  const R = await page.evaluate(() => {
    const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5;
    const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown)!;
    const mg = card.querySelector<HTMLElement>('[data-cl26="margin"]');
    return { grouped: !!card.querySelector('[data-cl26="index"]'), margin: mg ? mg.getBoundingClientRect().width : null,
      rows: [...card.querySelectorAll<HTMLElement>('[data-cl26="row"]')].filter(shown).map((r) => {
        const cell = r.querySelector<HTMLElement>('[data-clr="genres"]')!.getBoundingClientRect();
        const pills = [...r.querySelectorAll<HTMLElement>('[data-cl252="pill"]')].filter(shown);
        const full = pills.filter((p) => { const b = p.getBoundingClientRect(); return p.scrollWidth <= p.clientWidth + 1 && b.left >= cell.left && b.right <= cell.right; }).length;
        return { id: r.dataset.id, full, any: pills.length > 0, cellW: cell.width, need: pills.map((p) => p.scrollWidth).join("/") };
      }) };
  });
  m19.check("precondition: grouped by Letter", R.grouped, `index ${R.grouped}`);
  m19.check("the letter margin's width (reported)", R.margin != null, `margin ${R.margin}px`);
  const withG = R.rows.filter((r) => (byId.get(r.id!)?.genres.length ?? 0) > 0);
  m19.check("population: rows with genres", withG.length > 0, `${withG.length}`);
  for (const r of withG) m19.check(`${byId.get(r.id!)!.surname} · a full tag at 1280`, r.full >= 1, `${r.full} full tags · cell ${r.cellW.toFixed(1)} · tags need ${r.need}`);
  /* the status sort */
  await page.locator('[data-cl26="card"] [data-clr-h="status"] button').filter({ visible: true }).first().click();
  await page.waitForTimeout(400);
  const S = await page.evaluate(() => {
    const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5;
    const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown)!;
    return [...card.querySelectorAll<HTMLElement>('[data-cl26="section"]')].map((s) => ({ k: s.dataset.k, ids: [...s.querySelectorAll<HTMLElement>('[data-cl26="row"]')].map((r) => r.dataset.id) }));
  });
  const queried = S.filter((s) => /queried$/.test(s.k ?? "") && !/none|nq/.test(s.k ?? ""));
  m19.check("one Queried section", queried.length === 1, `sections ${S.map((s) => s.k).join(" ")}`);
  /* RE-POINTED by v1.3 (3.3): the nudge due has its own section, after your move's stages and directly above Full sent */
  const ks = S.map((s) => s.k ?? "");
  const nudge = S.find((s) => s.k === "t:nudge");
  m19.check("a Nudge due section holding the nudge due (Ferris), not inside Queried", !!nudge && nudge.ids.includes("clr-ferris") && !queried[0]?.ids.includes("clr-ferris"), `sections ${ks.join(" ")}`);
  const fsAt = ks.indexOf("t:fs"), nAt = ks.indexOf("t:nudge");
  m19.check("Nudge due sits above Full sent and below every your-move stage", nAt >= 0 && (fsAt < 0 || nAt === fsAt - 1)
    && ks.slice(0, nAt).every((k) => ["t:offer", "t:rr", "t:fr", "t:pr"].includes(k)), `sections ${ks.join(" ")}`);
  m19.done(7);
});

test("M12 · rate Fit from the row: hover, click, keyboard; saved, toasted, drawn", async ({ page }) => {
  test.setTimeout(180_000);
  const m12 = new Ledger("M12");
  const store = (who: string) => JSON.parse(execFileSync("node", ["tests/e2e/clrRead.mjs", who], { encoding: "utf8", timeout: 60_000 }).trim()) as { starRating: number | null };
  try {
    await open(page, 1440);
    m12.check("precondition: Carey unrated in the store", store("Carey").starRating === null, "");
    const row = page.locator('[data-cl26="row"][data-id="clr-carey"]').filter({ visible: true });
    const bx = (await row.boundingBox())!;
    await page.mouse.move(bx.x + 40, bx.y + bx.height / 2);
    await page.waitForTimeout(250);
    const stars = row.locator('[data-clr="rate-star"]');
    const vis = await stars.evaluateAll((s) => s.map((e) => parseFloat(getComputedStyle(e.parentElement!).opacity) * (e.getBoundingClientRect().width > 0 ? 1 : 0)));
    m12.check("five buttons on hover", vis.length === 5 && vis.every((o) => o === 1), `opacities ${vis.join(",")}`);
    if (!MUTATE.size) await page.screenshot({ path: `${DIR}/shots/hover-rate-fit-1440.png` });
    await stars.nth(3).click();
    await page.waitForTimeout(1200);
    m12.check("saved 4 (read back from the store)", store("Carey").starRating === 4, JSON.stringify(store("Carey")));
    const toast = await page.getByText("Agent fit: great fit").first().isVisible().catch(() => false);
    m12.check("the card's own toast", toast, `toast ${toast}`);
    const drawn = await row.locator('[data-clp2="fit"]').getAttribute("data-n").catch(() => null);
    m12.check("the dash became four stars", drawn === "4", `data-n ${drawn}`);
    /* keyboard: Sandhu — focus the first star, → twice, Enter */
    const srow = page.locator('[data-cl26="row"][data-id="clr-sandhu"]').filter({ visible: true });
    await srow.locator('[data-clr="rate-star"]').first().focus();
    await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("Enter");
    await page.waitForTimeout(1200);
    m12.check("keyboard: → → Enter saves 3", store("Sandhu").starRating === 3, JSON.stringify(store("Sandhu")));
  } finally {
    /* a measurement that writes restores in the same run */
    store("Carey"); execFileSync("node", ["tests/e2e/clrRead.mjs", "Carey", "--clear"], { timeout: 60_000 });
    execFileSync("node", ["tests/e2e/clrRead.mjs", "Sandhu", "--clear"], { timeout: 60_000 });
  }
  m12.done(6);
});

test("M20 · the Query Centre's filter panel is unchanged", async ({ page }) => {
  test.setTimeout(120_000);
  await openRoute(page, "/queries", { width: 1440, height: H });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(800);
  const panel = page.locator(".qc151.qc153 .qc153-rail.fp").filter({ visible: true }).first();
  await expect(panel).toBeVisible();
  await expect(panel).toHaveScreenshot("m20-qc-filter-panel-1440.png", { maxDiffPixels: 0 });
});

/* ══ Contact list rows v1.2.1 — M21 to M27 ═══════════════════════════════════════════════════════════════════════════
 * A 1440×900 laptop window's INNER height is about 790px (the browser's own bars take the rest): the window locks use
 * 1440×790, never the 900 of the screen. */
const WIN = { width: 1440, height: 790 };
async function openWin(page: Page) {
  await page.setViewportSize(WIN);
  await openRoute(page, "/agents", WIN);
  for (const m of MUTATE) if (MUTATIONS[m]) await page.addStyleTag({ content: MUTATIONS[m] });
  await expect(page.locator('[data-cl26="row"]').filter({ visible: true }).first()).toBeVisible({ timeout: 30_000 });
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(500);
}
const scrollTo = (page: Page, y: number) => page.evaluate((y) => {
  const sc = [...document.querySelectorAll<HTMLElement>(".wpg-scroll")].find((e) => e.getBoundingClientRect().width > 0);
  if (sc) sc.scrollTo({ top: y, behavior: "instant" as ScrollBehavior });
}, y);

test("M21, M22 · pinned at 1440×900: only the slim bar and page colour above the headings; no row above them", async ({ page }) => {
  test.setTimeout(240_000);
  const m21 = new Ledger("M21"), m22 = new Ledger("M22");
  await openWin(page);
  for (const depth of [700, 1100, 1600]) {
    await scrollTo(page, depth);
    await page.waitForTimeout(500);
    const G = await page.evaluate(() => {
      const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5 && getComputedStyle(e).visibility !== "hidden";
      const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown)!;
      const th = card.querySelector<HTMLElement>('[data-cl26="heads"]')!;
      const sc = card.closest<HTMLElement>(".wpg-scroll")!;
      const slim = [...document.querySelectorAll<HTMLElement>(".qc156-slim")].find((e) => shown(e) && parseFloat(getComputedStyle(e).opacity) > 0.5) ?? null;
      /* the page colour: the first ancestor of the scroller that paints a background (the scroller itself is transparent) */
      let pe: HTMLElement | null = sc, page = "rgba(0, 0, 0, 0)";
      while (pe) { const bg = getComputedStyle(pe).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { page = bg; break; } pe = pe.parentElement; }
      const c = card.getBoundingClientRect(), t = th.getBoundingClientRect(), s = sc.getBoundingClientRect();
      /* rows whose box reaches above the headings' top, and what the pointer finds there */
      const hits: string[] = [];
      for (let x = c.left - 2; x <= c.right + 2; x += 24) for (let y = s.top + 2; y < t.top - 1; y += 6) {
        const el = document.elementFromPoint(x, y);
        /* the cap belongs to the heading row: a hit on the heading is the cap; a row, or the card's frame elsewhere, is not */
        if (el && !el.closest('[data-cl26="heads"]') && el.closest('[data-cl26="row"], .cl26-frame, [data-cl26="card"], .qc154-tbw')) hits.push(`${Math.round(x)},${Math.round(y)}`);
      }
      return { l: c.left, r: c.right, top: s.top, th: t.top, slim: slim ? (() => { const r = slim.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; })() : null,
        page, stuck: th.hasAttribute("data-stuck"), rowsUnder: [...card.querySelectorAll<HTMLElement>('[data-cl26="row"]')].some((r) => r.getBoundingClientRect().top < t.top), hits };
    });
    m21.check(`${depth} · precondition: pinned, with rows passed under`, G.stuck && G.rowsUnder, `stuck ${G.stuck} rows under ${G.rowsUnder}`);
    /* the pixels: every column across the card and its rim, from the shell's top bar to the headings */
    const png = readPng(await page.screenshot());
    const [pr, pg, pb] = (G.page.match(/\d+/g) ?? ["0", "0", "0"]).map(Number);
    let bad = 0, total = 0; const where: string[] = [];
    for (let x = Math.floor(G.l) - 2; x <= Math.ceil(G.r) + 2; x++) {
      for (let y = Math.ceil(G.top) + 1; y < Math.floor(G.th) - 1; y++) {
        /* the slim bar's own band: its ::before paints its ground and its bottom rule (#e0d9ce) past its box to the page's
           edges (qcv156.css), so the whole row of its height is the slim bar */
        if (G.slim && y >= G.slim.t && y <= G.slim.b) continue;
        total += 1;
        const [r, g, b] = png.at(x, y);
        if (Math.abs(r - pr) > 3 || Math.abs(g - pg) > 3 || Math.abs(b - pb) > 3) { bad += 1; if (where.length < 6) where.push(`${x},${y}=${r},${g},${b}`); }
      }
    }
    m21.check(`${depth} · population: pixels sampled`, total > 1000, `${total} pixels`);
    m21.check(`${depth} · only page colour (and the slim bar) above the headings`, bad === 0, `${bad} of ${total} not page colour (${G.page}) · ${where.join(" ")}`);
    m22.check(`${depth} · no row or card under the pointer above the headings`, G.hits.length === 0, `at ${G.hits.slice(0, 6).join(" ")}`);
    if (depth === 1100 && !MUTATE.size) await page.screenshot({ path: `${DIR}/shots/pinned-1440x900.png` });
  }
  m21.done(6); m22.done(3);
});

test("M23 · each row action opens its own journey, never the card; the keyboard too; elsewhere opens the card", async ({ page }) => {
  test.setTimeout(300_000);
  const m23 = new Ledger("M23");
  await openWin(page);
  /* bounded: a case that hangs is a red reading that names itself, never a silent test timeout */
  page.setDefaultTimeout(8000);
  const CASES: { surname: string; words: string; mode: string; via?: string; key: "queryId" | "agentId" }[] = [
    { surname: "Ferris", words: "Nudge", mode: "nudge", key: "queryId" },
    /* the send journey: the drawer's "sent", routed to the card journey "send" where the side panel hosts it */
    { surname: "Tan", words: "Send your partial", mode: "send", key: "queryId" },
    { surname: "Okafor", words: "Send your full", mode: "send", key: "queryId" },
    { surname: "Holt", words: "Record a response", mode: "resp", key: "queryId" },
    { surname: "Ellison", words: "Log a query", mode: "log", key: "agentId" },
  ];
  const state = () => page.evaluate(() => {
    const shown = (e: Element | null) => !!e && e.getBoundingClientRect().width > 1 && getComputedStyle(e).visibility !== "hidden";
    const j = (window as unknown as { __saJourneys?: Record<string, unknown>[] }).__saJourneys ?? [];
    /* the app's journey hosts: the query drawer; the side panel that holds the response journey and the card journeys
       (send, close, offer: Card journeys v1 — `openQueryDrawer` routes "sent" there as kind "send"); and Log a query's
       staged panel (QcLogStages, its band `data-qc149f`) */
    return { last: j[j.length - 1] ?? null, n: j.length,
      drawer: [...document.querySelectorAll(".qad-drawer")].some(shown),
      response: [...document.querySelectorAll('[data-side-panel][data-rar="panel"], [data-qc149f="band"]')].some(shown),
      card: [...document.querySelectorAll("[data-cl262='panel'], [data-cl24='card-panel']")].some(shown) };
  });
  const close = async () => {
    for (let i = 0; i < 4; i++) {
      const s = await state();
      if (!s.drawer && !s.response && !s.card) return;
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      for (const sel of ['[data-rar="leave-discard"]', '[data-cj="leave-discard"]', '[data-qad="leave-discard"]', 'button:has-text("Discard")',
        '[data-side-panel] [data-rar="close"]', '[data-side-panel] [data-cj="close"]', '[data-qc149f="close"]', '[data-side-panel] button[aria-label^="Close"]']) {
        const d = page.locator(sel).filter({ visible: true }); if (await d.count()) { await d.first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(300); }
      }
    }
  };
  for (const kb of [false, true]) {
    for (const c of CASES) {
     try {
      const id = clrId(c.surname);
      const row = page.locator(`[data-cl26="row"][data-id="${id}"]`).filter({ visible: true });
      /* mid-screen, clear of the slim bar and the pinned headings */
      await row.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }));
      await page.waitForTimeout(250);
      const before = (await state()).n;
      const btn = row.locator('[data-clr="act"]');
      if (kb) { await btn.focus(); await page.keyboard.press(c.surname === "Holt" ? " " : "Enter"); }
      else {
        /* a PERSON's click: hover the row, then press the pointer at the button's centre — whatever is on top there gets
           it (Playwright's own click would wait for the button to be uncovered, and hide the fault this lock is about) */
        const bx = (await row.boundingBox())!; await page.mouse.move(bx.x + 40, bx.y + bx.height / 2); await page.waitForTimeout(250);
        const b = (await btn.boundingBox())!; await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
      }
      await page.waitForTimeout(900);
      const s = await state();
      const want = c.key === "queryId" ? `clr-q-${c.surname.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : id;
      const tag = `${kb ? "keyboard" : "mouse"} · ${c.words}`;
      m23.check(`${tag} · the words`, (await btn.textContent())?.trim() === c.words, `button ${JSON.stringify(await btn.textContent())}`);
      m23.check(`${tag} · a journey started`, s.n > before, `journeys ${before} → ${s.n}`);
      /* the journey's own record: its mode and this agent's query (or the agent, for Log a query), and never via the card */
      m23.check(`${tag} · its journey and this agent's query`, !!s.last && (s.last.mode === c.mode || (c.mode === "send" && s.last.mode === "sent")) && s.last[c.key] === want,
        `last ${JSON.stringify(s.last)} want mode ${c.mode} ${c.key} ${want}`);
      m23.check(`${tag} · its host is on screen`, s.drawer || s.response, `drawer ${s.drawer} side panel ${s.response}`);
      m23.check(`${tag} · the agent card did not open`, !s.card, `card ${s.card}`);
      if (!kb && c.surname === "Tan" && !MUTATE.size) await page.screenshot({ path: `${DIR}/shots/row-action-journey-1440x900.png` });
      await close();
     } catch (e) {
      m23.check(`${kb ? "keyboard" : "mouse"} · ${c.words} · ran`, false, String(e).split("\n")[0].slice(0, 180));
      await close().catch(() => {});
     }
    }
  }
  /* a click elsewhere on the row still opens the card */
  try {
    await close();
    const inert = await page.evaluate(() => !!document.querySelector('[data-cl26="card"]')?.closest("[inert]"));
    m23.check("the page is live again after the journeys (nothing left open)", !inert, `inert ${inert}`);
    const r = page.locator('[data-cl26="row"][data-id="clr-tan"]').filter({ visible: true });
    await r.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "instant" as ScrollBehavior }));
    const b = (await r.boundingBox())!; await page.mouse.click(b.x + 30, b.y + 20);
    await page.waitForTimeout(900);
    m23.check("elsewhere on the row opens the card", (await state()).card, "");
    await close();
  } catch (e) { m23.check("elsewhere on the row opens the card · ran", false, String(e).split("\n")[0].slice(0, 180)); }
  m23.done(52);
});

test("M24 · the panel fits a 1440×900 window: height + sticky top + 16 ≤ the inner height; no inner scroll", async ({ page }) => {
  test.setTimeout(120_000);
  const m24 = new Ledger("M24");
  await openWin(page);
  if (!MUTATE.size) await page.screenshot({ path: `${DIR}/shots/rest-1440x900.png` });
  /* pinned: the panel at its sticky top (the formula's case). ⚠️ The sticky top is measured from the page's scroller, which
     starts under the shell's top bar (and, until it is dismissed, the beta strip): the room the panel has is the window
     less all of that. The beta strip is dismissed as Nick has it on dev; its cost is read and reported. */
  const strip = await page.evaluate(() => { const b = document.querySelector<HTMLElement>(".sa-beta, [class*='sa-beta']"); return b && b.getBoundingClientRect().height > 0 ? Math.round(b.getBoundingClientRect().height) : 0; });
  const x = page.locator('button.sa-betax[aria-label="Dismiss"]').filter({ visible: true });
  if (await x.count()) { await x.click(); await page.waitForTimeout(400); }
  await scrollTo(page, 900);
  await page.waitForTimeout(500);
  const R = await page.evaluate(() => {
    const fp = [...document.querySelectorAll<HTMLElement>(".qc153-rail.fp")].find((e) => e.getBoundingClientRect().width > 0)!;
    const sc = fp.closest<HTMLElement>(".wpg-scroll")!;
    const b = fp.getBoundingClientRect();
    return { h: fp.scrollHeight, box: b.height, bottom: b.bottom, scTop: sc.getBoundingClientRect().top, top: parseFloat(getComputedStyle(fp).top) || 0, inner: window.innerHeight, sh: fp.scrollHeight, ch: fp.clientHeight };
  });
  m24.check("precondition: a 1440×900 window's inner height", R.inner === WIN.height, `inner ${R.inner}`);
  m24.check("full height + the shell above the scroller + sticky top + 16 ≤ inner height", R.h + R.scTop + R.top + 16 <= R.inner,
    `${R.h.toFixed(0)} + ${R.scTop.toFixed(0)} + ${R.top} + 16 = ${(R.h + R.scTop + R.top + 16).toFixed(0)} vs ${R.inner} (with the beta strip showing: +${strip})`);
  m24.check("no scrolling inside the panel", R.sh <= R.ch + 1, `scrollHeight ${R.sh} clientHeight ${R.ch}`);
  m24.check("pinned, the whole panel is inside the window", R.bottom <= R.inner, `bottom ${R.bottom.toFixed(0)} inner ${R.inner}`);
  /* M36 (v1.3): every list closed, the beta strip dismissed: no inner scroll (the ref measures 632) */
  const m36 = new Ledger("M36");
  m36.check("no inner scroll at 1440×900, lists closed, strip dismissed", R.sh <= R.ch + 1, `content ${R.sh} room ${R.ch}`);
  m36.done(1);
  if (!MUTATE.size) await page.locator(".qc153-rail.fp").filter({ visible: true }).screenshot({ path: `${DIR}/shots/panel-compact-1440.png` });
  m24.done(4);
});

test("M27 · the list card's width gives narrow / middle / wide / wide at 1280, 1440, 1600, 1920", async ({ page }) => {
  test.setTimeout(180_000);
  const m27 = new Ledger("M27");
  const want: Record<number, string> = { 1280: "narrow", 1440: "middle", 1600: "wide", 1920: "wide" };
  for (const w of WIDTHS) {
    await open(page, w);
    const L = (await readList(page)) as List;
    const agentW = L.rows[0]?.cells[0]?.w ?? 0;
    const drawn = agentW >= 289 ? "wide" : agentW >= 231 ? "middle" : "narrow";
    const short = L.heads.some((h) => h.text === "Genres");
    m27.check(`${w} · card ${L.card.w.toFixed(0)} → ${want[w]}`, tierOf(L.card.w) === want[w] && drawn === want[w] && short === (want[w] === "narrow"),
      `card ${L.card.w.toFixed(1)} tier ${tierOf(L.card.w)} drawn ${drawn} (Agent ${agentW.toFixed(0)}) short headings ${short}`);
  }
  m27.done(4);
});

/* ══ Contact list rows v1.3 — M28 to M36 ═════════════════════════════════════════════════════════════════════════════ */
const sheetBand = (page: Page) => page.evaluate(() => {
  const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5 && getComputedStyle(e).visibility !== "hidden";
  const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown)!;
  const sc = card.closest<HTMLElement>(".wpg-scroll")!;
  const slim = [...document.querySelectorAll<HTMLElement>(".qc156-slim")].find((e) => shown(e) && parseFloat(getComputedStyle(e).opacity) > 0.5) ?? null;
  const th = card.querySelector<HTMLElement>('[data-cl26="heads"]')!;
  const fp = [...document.querySelectorAll<HTMLElement>(".qc153-rail.fp")].find(shown)!;
  let pe: HTMLElement | null = sc, page = "rgba(0, 0, 0, 0)";
  while (pe) { const bg = getComputedStyle(pe).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { page = bg; break; } pe = pe.parentElement; }
  const s = sc.getBoundingClientRect(), t = th.getBoundingClientRect();
  const slimBg = slim ? getComputedStyle(slim, "::before").backgroundColor : null;
  return { sheet: { l: s.left, r: s.right - (sc.offsetWidth - sc.clientWidth), t: s.top }, slim: slim ? (() => { const r = slim.getBoundingClientRect(); return { t: r.top, b: r.bottom, l: r.left, r: r.right }; })() : null,
    slimBg, page, th: t.top, fpTop: fp.getBoundingClientRect().top, stuck: th.hasAttribute("data-stuck") };
});
const rgb = (s: string | null) => (s?.match(/\d+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number) as [number, number, number];
const near = (a: [number, number, number], b: [number, number, number], d = 3) => Math.abs(a[0] - b[0]) <= d && Math.abs(a[1] - b[1]) <= d && Math.abs(a[2] - b[2]) <= d;

test("M28 · pinned at 1440×900: from the sheet's top to the slim bar's foot, slim-bar ground; then page colour to the headings", async ({ page }) => {
  test.setTimeout(240_000);
  const m28 = new Ledger("M28");
  await openWin(page);
  /* three depths inside the list (deeper, the filter column ends and the panel's sticky end moves it up: not this lock) */
  for (const depth of [600, 800, 1000]) {
    await scrollTo(page, depth); await page.waitForTimeout(500);
    const G = await sheetBand(page);
    m28.check(`${depth} · precondition: the slim bar shown, the headings pinned`, !!G.slim && G.stuck, `slim ${!!G.slim} stuck ${G.stuck}`);
    if (!G.slim) continue;
    const png = readPng(await page.screenshot());
    const slimC = rgb(G.slimBg), pageC = rgb(G.page);
    let badA = 0, badB = 0, nA = 0, nB = 0; const wA: string[] = [], wB: string[] = [];
    /* every column across the sheet, inside its rounded top corners (radius 18: the shell's navy shows past them) */
    for (let x = Math.ceil(G.sheet.l) + 20; x < Math.floor(G.sheet.r) - 20; x += 1) {
      /* the band above the slim bar's content and its own ground: from the sheet's top to the slim bar's top */
      for (let y = Math.ceil(G.sheet.t) + 1; y < Math.floor(G.slim.t); y++) { nA++; const c = png.at(x, y); if (!near(c, slimC) && !near(c, pageC)) { badA++; if (wA.length < 4) wA.push(`${x},${y}=${c}`); } }
      /* below the slim bar (past its 1px rule) to the headings: page colour only */
      for (let y = Math.ceil(G.slim.b) + 1; y < Math.floor(G.th) - 1; y++) { nB++; const c = png.at(x, y); if (!near(c, pageC)) { badB++; if (wB.length < 4) wB.push(`${x},${y}=${c}`); } }
    }
    m28.check(`${depth} · above the slim bar: its ground only (${nA} px)`, badA === 0, `${badA} other · ${wA.join(" ")}`);
    m28.check(`${depth} · below it to the headings: page colour only (${nB} px)`, nB > 0 && badB === 0, `${badB} other · ${wB.join(" ")}`);
    m28.check(`${depth} · the headings level with the panel`, Math.abs(G.th - G.fpTop) <= 1, `headings ${G.th.toFixed(1)} panel ${G.fpTop.toFixed(1)}`);
    if (depth === 800 && !MUTATE.size) await page.screenshot({ path: `${DIR}/shots/pinned-1440x900.png` });
  }
  /* ⚠️ the window BEFORE the headings pin: the slim bar shown, the heading row still in the flow — the pin's cap is off, so
     only the slim bar's own ground keeps the rows out of the band above it (the case the v1.3 fix exists for) */
  let early = 0;
  for (let depth = 40; depth < 600; depth += 40) {
    await scrollTo(page, depth); await page.waitForTimeout(300);
    const G = await sheetBand(page);
    if (!G.slim || G.stuck) continue;
    early++;
    const png = readPng(await page.screenshot());
    const slimC = rgb(G.slimBg), pageC = rgb(G.page);
    let bad = 0, n = 0; const w: string[] = [];
    for (let x = Math.ceil(G.sheet.l) + 20; x < Math.floor(G.sheet.r) - 20; x += 1)
      for (let y = Math.ceil(G.sheet.t) + 1; y < Math.floor(G.slim.t); y++) { n++; const c = png.at(x, y); if (!near(c, slimC) && !near(c, pageC)) { bad++; if (w.length < 4) w.push(`${x},${y}=${c}`); } }
    m28.check(`${depth} (slim shown, headings not yet pinned) · above the slim bar: its ground only (${n} px)`, n > 0 && bad === 0, `${bad} other · ${w.join(" ")}`);
  }
  m28.check("the early window was read at least once", early > 0, `${early} depths`);
  m28.done(14);
});

test("M29 · at the end of the list the card ends cleanly: corners, rim and shadow drawn, page colour below", async ({ page }) => {
  test.setTimeout(120_000);
  const m29 = new Ledger("M29");
  await openWin(page);
  await scrollTo(page, 100000); await page.waitForTimeout(600);
  const R = await page.evaluate(() => {
    const shown = (e: Element | null): e is HTMLElement => !!e && e.getBoundingClientRect().width > 0.5;
    const card = [...document.querySelectorAll<HTMLElement>('[data-cl26="card"]')].find(shown)!;
    const b = card.getBoundingClientRect(); const cs = getComputedStyle(card);
    let pe: HTMLElement | null = card.parentElement, page = "";
    while (pe) { const bg = getComputedStyle(pe).backgroundColor; if (bg && !/rgba\(0, 0, 0, 0\)|transparent/.test(bg)) { page = bg; break; } pe = pe.parentElement; }
    return { l: b.left, r: b.right, b: b.bottom, radius: parseFloat(cs.borderBottomLeftRadius), page, inner: window.innerHeight };
  });
  m29.check("precondition: the card's foot is on screen", R.b < R.inner - 12, `card bottom ${R.b.toFixed(0)} window ${R.inner}`);
  const png = readPng(await page.screenshot());
  const pageC = rgb(R.page);
  /* inside each bottom corner, 8px in from the curve: the card's white; just outside the corner's arc: page colour or the
     shadow (warmer, darker), never cut white; 14px below the card's foot: page colour */
  const corner = (x: number) => png.at(Math.round(x), Math.round(R.b - 10));
  const inL = corner(R.l + 12), inR = corner(R.r - 12);
  m29.check("bottom corners: the card's white inside", near(inL, [255, 255, 255], 4) && near(inR, [255, 255, 255], 4), `left ${inL} right ${inR}`);
  const outL = png.at(Math.round(R.l + 2), Math.round(R.b - 2)), outR = png.at(Math.round(R.r - 2), Math.round(R.b - 2));
  m29.check("bottom corners rounded (the arc's outside is not white)", !near(outL, [255, 255, 255], 6) && !near(outR, [255, 255, 255], 6) && R.radius >= 12, `outside ${outL} / ${outR} radius ${R.radius}`);
  let bad = 0, n = 0;
  for (let x = Math.ceil(R.l) + 24; x < Math.floor(R.r) - 24; x += 4) { const y = Math.round(R.b + 30); if (y >= R.inner) break; n++; if (!near(png.at(x, y), pageC, 8)) bad++; }
  m29.check("page colour below (past the shadow)", n > 0 && bad === 0, `${bad} of ${n} not page colour`);
  /* the rim: the card's ring on its foot (a darker line than the page, 1px under the white) */
  const rim = png.at(Math.round((R.l + R.r) / 2), Math.round(R.b));
  m29.check("the rim and shadow drawn on the foot", !near(rim, [255, 255, 255], 6) && !near(rim, pageC, 1), `foot ${rim} page ${pageC}`);
  if (!MUTATE.size) await page.screenshot({ path: `${DIR}/shots/end-of-list-1440x900.png` });
  m29.done(5);
});

test("M31 · Minimum fit: a star sets ≥ k; Not rated waits for a minimum, then adds the unrated", async ({ page }) => {
  test.setTimeout(120_000);
  const m31 = new Ledger("M31");
  await open(page, 1440);
  const fp = fpOf(page);
  let P = await readPanel(page);
  m31.check("Not rated disabled until a minimum is set", P.opts["fit:unrated"]?.disabled === true, JSON.stringify(P.opts["fit:unrated"]));
  await fp.locator('[data-clq-opt="fit:4"]').click(); await page.waitForTimeout(300);
  P = await readPanel(page);
  const want4 = FX.filter((x) => (x.rating ?? 0) >= 4).map((x) => x.id).sort();
  const got4 = (await visibleRows(page).evaluateAll((rs) => rs.map((r) => r.getAttribute("data-id")))).sort();
  m31.check("4★ shows fit ≥ 4 only", JSON.stringify(got4) === JSON.stringify(want4), `got ${got4.length} want ${want4.length}`);
  m31.check("the summary", P.fitSum === `4★ and up · ${want4.length}`, `summary ${P.fitSum}`);
  m31.check("Not rated now enabled, with what it would add", P.opts["fit:unrated"]?.disabled === false && P.opts["fit:unrated"].n === FX.filter((x) => x.rating == null).length, JSON.stringify(P.opts["fit:unrated"]));
  await fp.locator('[data-clq-opt="fit:unrated"]').click(); await page.waitForTimeout(300);
  const gotU = await visibleRows(page).count();
  m31.check("on, it adds the unrated", gotU === want4.length + FX.filter((x) => x.rating == null).length, `${gotU} rows`);
  await fp.locator('[data-clq-opt="fit:4"]').click(); await page.waitForTimeout(300);
  P = await readPanel(page);
  m31.check("the chosen star again clears it", P.fitSum === "Any" && (await visibleRows(page).count()) === 19, `summary ${P.fitSum}`);
  m31.done(6);
});

test("M32 · Genres: the quick pills keep their order; the search list is inline, scrolls past 168, and is keyboard-only", async ({ page }) => {
  test.setTimeout(180_000);
  const m32 = new Ledger("M32");
  await open(page, 1440);
  const fp = fpOf(page);
  const order = () => fp.locator('[data-clq-opt^="genre:"]').evaluateAll((es) => es.map((e) => (e as HTMLElement).dataset.label));
  const o0 = await order();
  m32.check("four quick pills, the book's genre first", o0.length === 4 && o0[0] === "Crime", JSON.stringify(o0));
  page.setDefaultTimeout(8000);
  /* ⚠️ a zero pair is disabled; Not always is the side this fixture keeps above zero under Open + 5★ */
  for (const press of ['[data-clq-opt="door:open"]', '[data-clq-opt="fit:5"]', '[data-clq-opt="always:no"]']) {
    await fp.locator(press).click(); await page.waitForTimeout(300);
    const o = await order();
    m32.check(`order unchanged after ${press}`, JSON.stringify(o.slice(0, 4)) === JSON.stringify(o0), JSON.stringify(o));
  }
  await fp.locator('[data-clq="clear"]').click(); await page.waitForTimeout(300);
  /* keyboard only: type, arrows, Enter, Esc, Backspace */
  const input = fp.locator('[data-clq="genre-find"] input');
  await input.focus(); await page.keyboard.type("i");
  await page.waitForTimeout(250);
  const G = await page.evaluate(() => {
    const fp = [...document.querySelectorAll<HTMLElement>(".qc153-rail.fp")].find((e) => e.getBoundingClientRect().width > 0)!;
    const l = fp.querySelector<HTMLElement>('[data-clq="genre-sugs"]'); if (!l) return null;
    const a = l.getBoundingClientRect(), f = fp.getBoundingClientRect();
    return { inside: a.left >= f.left && a.right <= f.right && l.closest(".qc153-rail") === fp, h: a.height, sh: l.scrollHeight, ch: l.clientHeight,
      items: l.querySelectorAll('[data-clq="genre-sug"]').length, mark: !!l.querySelector("mark"), oy: getComputedStyle(l).overflowY, pos: getComputedStyle(l).position };
  });
  m32.check("the list opens inline, inside the panel's box (never a popover)", !!G && G.inside && G.pos !== "absolute" && G.pos !== "fixed", JSON.stringify(G));
  m32.check("at most 168 high, then it scrolls inside itself", !!G && G.h <= 168.5 && (G.sh <= G.ch + 1 || G.oy === "auto"), JSON.stringify(G));
  m32.check("matches highlighted", !!G?.mark, "");
  if (!MUTATE.size) await fpOf(page).screenshot({ path: `${DIR}/shots/panel-genre-search.png` });
  await page.keyboard.press("ArrowDown"); await page.keyboard.press("Enter"); await page.waitForTimeout(300);
  let P = await readPanel(page);
  const picked = Object.entries(P.opts).filter(([k, o]) => k.startsWith("genre:") && o.on).map(([k]) => k);
  m32.check("ArrowDown + Enter picks the first match", picked.length === 1, picked.join(","));
  await input.focus(); await page.keyboard.type("x"); await page.keyboard.press("Escape"); await page.waitForTimeout(200);
  m32.check("Esc closes the list", (await fp.locator('[data-clq="genre-sugs"]').filter({ visible: true }).count()) === 0, "");
  await input.fill(""); await input.focus(); await page.keyboard.press("Backspace"); await page.waitForTimeout(300);
  P = await readPanel(page);
  m32.check("Backspace on an empty field removes the last pick", Object.entries(P.opts).every(([k, o]) => !k.startsWith("genre:") || !o.on), "");
  m32.done(9);
});

test("M33 · Reply time: both handles by mouse and keyboard, never crossing; rows mid-drag; focus kept; Not known on", async ({ page }) => {
  test.setTimeout(180_000);
  const m33 = new Ledger("M33");
  await open(page, 1440);
  const fp = fpOf(page);
  const lo = fp.locator('[data-clq="rt-lo"]'), hi = fp.locator('[data-clq="rt-hi"]');
  let P = await readPanel(page);
  m33.check("Not known disabled until a range is set", P.opts["rt:unknown"]?.disabled === true, JSON.stringify(P.opts["rt:unknown"]));
  /* keyboard */
  await lo.focus(); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  const focusLo = await lo.evaluate((e) => document.activeElement === e);
  P = await readPanel(page);
  m33.check("keyboard moves the low handle; focus stays on it", P.rtLabel === "6–16+ wks" && focusLo, `label ${P.rtLabel} focus ${focusLo}`);
  m33.check("a range set: Not known starts on", P.opts["rt:unknown"]?.on === true && P.opts["rt:unknown"].disabled === false, JSON.stringify(P.opts["rt:unknown"]));
  const s1: PanelState = { ...PS0, rt: [6, 16], rtUnknown: true };
  m33.check("the rows follow (with the unknown kept in)", (await visibleRows(page).count()) === FX.filter((x) => passes(x, s1, null)).length, "");
  await hi.focus(); for (let i = 0; i < 14; i++) await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(300);
  P = await readPanel(page);
  m33.check("the handles can't cross", P.rtLabel === "6 wks", `label ${P.rtLabel}`);
  /* mouse: drag the high handle back to the end, reading the rows mid-drag and the focus throughout */
  await hi.focus(); for (let i = 0; i < 10; i++) await page.keyboard.press("ArrowRight");
  const box = (await hi.boundingBox())!;
  const val = async () => Number(await hi.inputValue());
  const v0 = await val();
  /* the thumb (20 wide) travels the input's width less its own: start ON it, never at the input's edge */
  const x0 = box.x + 10 + ((v0 - 1) / 15) * (box.width - 20), y = box.y + box.height / 2;
  await page.mouse.move(x0, y); await page.mouse.down();
  await page.mouse.move(x0 - box.width * 0.2, y, { steps: 4 });
  const mid = await page.evaluate(() => { const r = [...document.querySelectorAll('[data-cl26="card"] [data-cl26="row"]')].filter((e) => e.getBoundingClientRect().width > 0).length; return { rows: r, focus: (document.activeElement as HTMLElement | null)?.dataset?.clq ?? null }; });
  await page.mouse.up(); await page.waitForTimeout(200);
  const v1 = await val();
  m33.check("the mouse moves the handle", v1 < v0, `${v0} → ${v1}`);
  m33.check("rows update mid-drag; focus stays on the handle", mid.focus === "rt-hi", JSON.stringify(mid));
  await fp.locator('[data-clq-opt="rt:unknown"]').click(); await page.waitForTimeout(300);
  P = await readPanel(page);
  m33.check("Not known turns off", P.opts["rt:unknown"]?.on === false, "");
  m33.done(8);
});

test("M26, M34 · Location: exactly the countries present; grows to five then scrolls; never pushes anything out of reach", async ({ page }) => {
  test.setTimeout(240_000);
  const m26 = new Ledger("M26"), m34 = new Ledger("M34");
  const setCountry = (who: string, c: string) => execFileSync("node", ["tests/e2e/clrRead.mjs", who, "--country", c], { encoding: "utf8", timeout: 60_000 });
  const readLoc = () => page.evaluate(() => {
    const fp = [...document.querySelectorAll<HTMLElement>(".qc153-rail.fp")].find((e) => e.getBoundingClientRect().width > 0)!;
    const l = fp.querySelector<HTMLElement>('[data-clq="loc-list"]');
    const rows = l ? [...l.querySelectorAll<HTMLElement>("[data-clq-opt^='loc:']")] : [];
    return { open: !!l && l.getBoundingClientRect().height > 0, inside: !!l && l.closest(".qc153-rail") === fp,
      rows: rows.map((r) => ({ k: r.dataset.clqOpt, n: Number(r.dataset.n), flag: !!r.querySelector(".fi, [data-clq='flag']"), words: (r.textContent ?? "").replace(/\d+$/, "").trim(), h: r.getBoundingClientRect().height })),
      sh: l?.scrollHeight ?? 0, ch: l?.clientHeight ?? 0 };
  });
  try {
    await open(page, 1440);
    const fp = fpOf(page);
    await fp.locator('[data-clq="loc"]').click(); await page.waitForTimeout(300);
    let L = await readLoc();
    const want = [...new Set(FX.map((x) => x.country))].sort((a, b) => FX.filter((x) => x.country === b).length - FX.filter((x) => x.country === a).length || a.localeCompare(b));
    m34.check("opens inline, inside the panel", L.open && L.inside, JSON.stringify({ open: L.open, inside: L.inside }));
    m34.check("exactly the countries present, by count", JSON.stringify(L.rows.map((r) => r.k)) === JSON.stringify(want.map((c) => `loc:${c}`)), JSON.stringify(L.rows.map((r) => r.k)));
    m34.check("each with its flag, full name and count", L.rows.every((r) => r.flag && r.n === FX.filter((x) => `loc:${x.country}` === r.k).length) && L.rows.some((r) => r.words.includes("United Kingdom")), JSON.stringify(L.rows));
    m34.check("rows 28 high", L.rows.every((r) => Math.abs(r.h - 28) <= 1), L.rows.map((r) => r.h).join(","));
    m34.check(`${L.rows.length} countries: no scroll`, L.sh <= L.ch + 1, `${L.sh}/${L.ch}`);
    if (!MUTATE.size) await fp.screenshot({ path: `${DIR}/shots/panel-location-open.png` });
    /* M26 (re-pointed): the label follows the picks */
    await fp.locator('[data-clq-opt="loc:US"]').click(); await page.waitForTimeout(300);
    const P = await readPanel(page);
    m26.check("the picked country names the button", /United States/.test(P.loc ?? ""), `loc ${P.loc}`);
    m26.check("and the list follows", (await visibleRows(page).count()) === FX.filter((x) => x.country === "US").length, "");
    await fp.locator('[data-clq="loc"]').click(); await page.waitForTimeout(200);
    m34.check("a second click closes it", !(await readLoc()).open, "");
    /* six-plus countries: it scrolls inside itself; at 1280×640 the panel still reaches Has gaps */
    for (const [who, c] of [["Achebe", "FR"], ["Blackwood", "DE"], ["Carey", "AU"], ["Lang", "CA"]] as const) setCountry(who, c);
    await page.setViewportSize({ width: 1280, height: 640 });
    await open(page, 1280);
    await page.setViewportSize({ width: 1280, height: 640 });
    await page.waitForTimeout(500);
    await fpOf(page).locator('[data-clq="loc"]').click(); await page.waitForTimeout(300);
    L = await readLoc();
    m34.check(`${L.rows.length} countries: it scrolls inside itself`, L.rows.length >= 6 && L.sh > L.ch + 1 && L.ch <= 5 * 28 + 8, `${L.rows.length} rows ${L.sh}/${L.ch}`);
    const reach = await page.evaluate(() => {
      const fp = [...document.querySelectorAll<HTMLElement>(".qc153-rail.fp")].find((e) => e.getBoundingClientRect().width > 0)!;
      fp.scrollTop = fp.scrollHeight;
      const g = fp.querySelector<HTMLElement>('[data-clq-opt="prof:gaps"]')!.getBoundingClientRect(), f = fp.getBoundingClientRect();
      return { inView: g.bottom <= f.bottom + 0.5 && g.top >= f.top - 0.5, overscroll: getComputedStyle(fp).overscrollBehaviorY, scrolls: fp.scrollHeight > fp.clientHeight };
    });
    m34.check("at 1280×640 with it open, scrolling the panel reaches Has gaps", reach.inView && reach.scrolls, JSON.stringify(reach));
    m34.check("overscroll contained", reach.overscroll === "contain", reach.overscroll);
    if (!MUTATE.size) await fpOf(page).screenshot({ path: `${DIR}/shots/panel-1280x640-scrolled.png` });
  } finally {
    for (const [who, c] of [["Achebe", "GB"], ["Blackwood", "GB"], ["Carey", "GB"], ["Lang", "GB"]] as const) setCountry(who, c);
  }
  m26.done(2); m34.done(9);
});

test("M35 · an agent with no genres has gaps (List health's own rule), never a full profile", async ({ page }) => {
  test.setTimeout(120_000);
  const m35 = new Ledger("M35");
  await open(page, 1440);
  const fp = fpOf(page);
  const P = await readPanel(page);
  const wantGaps = FX.filter(gapsOf).length;
  m35.check("Has gaps counts List health's rule", P.opts["prof:gaps"]?.n === wantGaps && P.opts["prof:full"]?.n === 19 - wantGaps, `gaps ${P.opts["prof:gaps"]?.n} full ${P.opts["prof:full"]?.n} want ${wantGaps}/${19 - wantGaps}`);
  await fp.locator('[data-clq-opt="prof:gaps"]').click(); await page.waitForTimeout(300);
  const gapIds = await visibleRows(page).evaluateAll((rs) => rs.map((r) => r.getAttribute("data-id")));
  m35.check("Carey and Lang (no genres) are under Has gaps", gapIds.includes("clr-carey") && gapIds.includes("clr-lang"), gapIds.join(","));
  await fp.locator('[data-clq-opt="prof:full"]').click(); await page.waitForTimeout(300);
  const fullIds = await visibleRows(page).evaluateAll((rs) => rs.map((r) => r.getAttribute("data-id")));
  m35.check("and never under Full profile", !fullIds.includes("clr-carey") && !fullIds.includes("clr-lang") && fullIds.length === 19 - wantGaps, fullIds.join(","));
  m35.done(3);
});
