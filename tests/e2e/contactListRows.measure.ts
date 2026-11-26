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
import { execFileSync } from "node:child_process";
import { CLR_AGENTS, CLR_EMAIL, clrId } from "./clrFixture.mjs";

test.use({ storageState: { cookies: [], origins: [] } });
/* not serial: each lock reads on its own, so one red does not hide the next */

const DIR = "reports/contact-list-rows-v1";
const WIDTHS = [1280, 1440, 1600, 1920];
const H = 900;
const MUTATE = new Set((process.env.CLR_MUTATE ?? "").split(",").map((s) => s.trim()).filter(Boolean));

/* ── the fixture, as the locks read it ─────────────────────────────────────────────────────────────────────────── */
type Fx = { id: string; name: string; surname: string; agency: string; city: string; country: string; rating: number | null;
  weeks: number | null; stand: "you" | "agent" | "none" | "closed"; rank: number };
const RANK = ["signed", "offer", "resub", "rr", "fs", "fr", "ps", "pr", "queried", "none", "closed"];
const KEY: Record<string, string> = { "Queried": "queried", "Partial Requested": "pr", "Partial Sent": "ps", "Full Requested": "fr", "Full Sent": "fs", "Rejected": "closed" };
const NUDGE_DUE = new Set(["Ferris"]);
const FX: Fx[] = CLR_AGENTS.map((r) => {
  const [first, surname, agency, city, country, rating, , weeks, , , story] = r as [string, string, string, string, string, number | null, string[], number | null, boolean | null, string, [number, string][] | null];
  const last = story ? story[story.length - 1][1] : null;
  const k = last ? KEY[last] : "none";
  const stand = !last ? "none" : last === "Rejected" ? "closed" : (last === "Partial Requested" || last === "Full Requested" || NUDGE_DUE.has(surname)) ? "you" : "agent";
  return { id: clrId(surname), name: `${first} ${surname}`, surname, agency, city, country, rating, weeks, stand, rank: RANK.indexOf(k) };
});
const byId = new Map(FX.map((x) => [x.id, x]));
const AZ = [...FX].sort((a, b) => a.surname.localeCompare(b.surname) || a.name.localeCompare(b.name)).map((x) => x.id);

/* the template the brief's 1.1 sets, for a card width */
function template(card: number): { tracks: (number | "genres" | "last")[]; gap: number; genresMax: number | null; lastMin: number; lastFixed: number | null } {
  if (card >= 1150) return { tracks: [290, 90, "genres", 180, 220, "last"], gap: 24, genresMax: 360, lastMin: 24, lastFixed: null };
  if (card >= 980) return { tracks: [262, 72, "genres", 160, 196, "last"], gap: 24, genresMax: 300, lastMin: 20, lastFixed: null };
  return { tracks: [228, 64, "genres", 138, 156, "last"], gap: 14, genresMax: null, lastMin: 16, lastFixed: 16 };
}
/** expected left edges (relative to the row's own left) for a row this wide, by the grid algorithm: fixed tracks, then
 *  Genres grows to its maximum, then the last (flexible) track takes what is left */
function expectedLefts(card: number, row: number): number[] {
  const t = template(card);
  const fixed = t.tracks.filter((x): x is number => typeof x === "number").reduce((s, x) => s + x, 0);
  const free = row - fixed - t.gap * (t.tracks.length - 1);
  let genres: number, last: number;
  if (t.lastFixed != null) { last = t.lastFixed; genres = Math.max(0, free - last); }
  else { genres = Math.max(0, Math.min(t.genresMax!, free - t.lastMin)); last = Math.max(t.lastMin, free - genres); }
  const w = t.tracks.map((x) => (x === "genres" ? genres : x === "last" ? last : x));
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
};
async function open(page: Page, width: number) {
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
          if (s.display === "none" || s.visibility === "hidden") continue;
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
        if (abroad) m4.check(`${w} · ${fx.surname} · flag title`, row.flag === `${fx.city}, United States`, `title ${JSON.stringify(row.flag)}`);
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
    const short = L.card.w < 980;
    const want = short ? ["Agent", "Fit", "Genres", "Response", "Query status"] : ["Agent", "Fit", "Genres sought", "Response policy", "Query status"];
    m2.check(`${w} · heading words`, JSON.stringify(L.heads.map((h) => h.text)) === JSON.stringify(want), `${JSON.stringify(L.heads.map((h) => h.text))} (card ${L.card.w.toFixed(0)})`);
    if (!MUTATE.size) await page.screenshot({ path: `${DIR}/shots/rest-${w}.png` });
  }
  m1.done(19 * 4 * 6); m2.done(19 * 4 * 5); m3.done(19 * 4 * 2); m4.done(19 * 4 * 3);
});

test("M5 · actions: your move at rest, the rest on hover; hover moves nothing", async ({ page }) => {
  test.setTimeout(180_000);
  const m5 = new Ledger("M5");
  await open(page, 1600);
  const L = (await readList(page)) as List;
  m5.check("population", L.rows.length === 19, `${L.rows.length} rows`);
  const ym = L.rows.filter((r) => r.act?.ym), quiet = L.rows.filter((r) => r.act && !r.act.ym);
  m5.check("your-move rows", ym.length === 3, `${ym.length} your-move actions: ${ym.map((r) => `${byId.get(r.id!)?.surname}:${r.act!.text}`).join(", ")}`);
  m5.check("quiet rows", quiet.length >= 10, `${quiet.length} quiet actions`);
  /* the words: the query card's Next box's own (lib/qc1512 `rowAct`), and the ref's "Log a query" where it has none */
  const WANT: Record<string, string> = { Ferris: "Nudge", Tan: "Send your partial", Okafor: "Send your full", Holt: "Record a response", Ellison: "Log a query" };
  for (const r of L.rows) {
    const fx = byId.get(r.id!)!;
    if (WANT[fx.surname]) m5.check(`${fx.surname} · words`, r.act?.text === WANT[fx.surname], `action ${JSON.stringify(r.act?.text)} want ${WANT[fx.surname]}`);
    if (fx.stand === "closed" || fx.surname === "Whitfield") m5.check(`${fx.surname} · no action`, !r.act, `action ${JSON.stringify(r.act?.text)}`);
    /* 2.3 — the disc's "!" follows your move: a partial or full request carries it, as a nudge due does */
    m5.check(`${fx.surname} · "!" on the disc`, r.bang === (fx.stand === "you"), `bang ${r.bang} (stand ${fx.stand})`);
    if (fx.stand === "you") m5.check(`${fx.surname} · rust, at rest`, !!r.act?.ym && r.act.opacity === 1 && r.act.color === "rgb(122, 63, 49)", `ym ${r.act?.ym} opacity ${r.act?.opacity} colour ${r.act?.color}`);
  }
  for (const r of quiet) {
    const fx = byId.get(r.id!)!;
    m5.check(`${fx.surname} · quiet at rest`, r.act!.opacity === 0, `opacity ${r.act!.opacity}`);
    const row = page.locator(`[data-cl26="row"][data-id="${r.id}"]`).filter({ visible: true });
    await row.scrollIntoViewIfNeeded();
    const before = await row.boundingBox();
    const bx = before!;
    await page.mouse.move(bx.x + 60, bx.y + bx.height / 2);
    await page.waitForTimeout(120);
    const on = await row.evaluate((e) => {
      const a = e.querySelector<HTMLElement>('[data-clr="act"]');
      return { opacity: a ? parseFloat(getComputedStyle(a).opacity) : -1, h: e.getBoundingClientRect().height };
    });
    m5.check(`${fx.surname} · shown on hover`, on.opacity === 1, `hover opacity ${on.opacity}`);
    m5.check(`${fx.surname} · height unchanged by hover`, Math.abs(on.h - bx.height) < 0.5, `rest ${bx.height.toFixed(1)} hover ${on.h.toFixed(1)}`);
    await page.mouse.move(2, 2);
  }
  m5.done(25);
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
  await open(page, 1600);
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
