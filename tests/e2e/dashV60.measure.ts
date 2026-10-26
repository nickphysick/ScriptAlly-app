/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60 — the DB60 locks, measured on the rendered page (ref design-refs/dashboard-v60/).
 *
 * P1 the pre-query swap follows the chart's predicate · P2 the agents band is slate · P3 two equal
 * hoops beneath the full-width chart · P4 the agents hoop's figures are the Contact list's · P5 the
 * closed hoop's counts are `closedTile`'s · P6 no closed strip before the first query · P7 one drawing
 * on the left before it · P8 the tiles' done states, every branch the account can reach · P9 is the
 * onboarding hatch suites (unit; see the report) · P10 fit, and loading does not jump.
 *
 * The three fixtures are the ref's three STATE buttons:
 *   A "Day one"            — `db60-pre` (seedDash60.mjs: a manuscript with no queries) + the dev aid
 *                            `__SA_DASH_NO_AGENTS` (agents are account-wide on the shared account)
 *   B "3 agents, no queries" — `db60-pre`, with the account's agents
 *   C "Querying"           — `seed-ms-1`
 * Every lock states its population first. `DB60_MUTATE=<name>` applies a lock's in-page break.
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { harnessDb } from "./harnessDocs";
import { agentQueryStates } from "../../src/lib/contactDesk";
import { nextStep } from "../../src/lib/contactNextStep";
import { bookGenres } from "../../src/lib/genreMatch";
import { closedTile } from "../../src/lib/dashClosed";
import { scopeActivities, scopeQueries } from "../../src/lib/manuscriptScope";
import { getSmartImportEntitlement } from "../../src/lib/smartImportEntitlement";

const DIR = "reports/dashboard-v60";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }, { width: 1709, height: 849 }] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const MUT = process.env.DB60_MUTATE ?? "";
const PRE = "db60-pre";
const QMS = "seed-ms-1";
type State = { key: "A" | "B" | "C"; name: string; ms: string; flags: Record<string, unknown> };
const STATES: State[] = [
  { key: "A", name: "day one", ms: PRE, flags: { __SA_DASH_NO_AGENTS: true } },
  { key: "B", name: "agents, no queries", ms: PRE, flags: {} },
  { key: "C", name: "querying", ms: QMS, flags: {} },
];

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${this.name}${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** The in-page breaks. Each is the lock's own named mutation. */
const MUTATIONS: Record<string, string> = {
  P2: `.d58 .d60-band--slate { background: #e4e1db !important; }`,
  P3: `.d60-hoops { grid-template-columns: 2fr 1fr !important; }`,
  P10: `.d60-door { min-height: 640px !important; }`,
};
const seed = (mode: "" | "--full" | "--clean") => execSync(`node tests/e2e/seedDash60.mjs ${mode}`, { stdio: "pipe" }).toString().trim();

test.beforeAll(() => { seed(""); });
test.afterAll(() => { seed("--clean"); });

async function openDash(page: Page, vp: VP, s: State, extra: Record<string, unknown> = {}) {
  /* ⚠️ INIT SCRIPTS ACCUMULATE on one page, so every flag a state may set is cleared first */
  await page.addInitScript(([m, f]) => {
    Object.assign(window, { __SA_DASH_NO_AGENTS: undefined, __SA_DASH_HOLD_MS: undefined, __SA_DASH_DROP: undefined }, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [s.ms, { ...s.flags, ...extra }] as const);
  await openRoute(page, "/dashboard", vp);
  if (!("__SA_DASH_HOLD_MS" in extra)) await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  if (MUT === "P6" && s.key !== "C") await page.evaluate(() => document.querySelector('[data-d58="left"]')?.insertAdjacentHTML("beforeend", '<div class="os-card d60-card d60-closed" data-d60="closed-hoop">3 closed · No reply</div>'));
  if (MUT === "P7" && s.key !== "C") await page.evaluate(() => document.querySelector('[data-d60="glyph"], [data-d60="agents-snap"] .d60-snap')?.insertAdjacentHTML("afterbegin", '<img src="/images/dash/archivist.png" width="60" height="60" alt="">'));
  if (MUTATIONS[MUT]) await page.addStyleTag({ content: MUTATIONS[MUT] });
  await page.waitForTimeout(700);
}

const shot = async (page: Page, name: string) => {
  if (!process.env.DB60_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}.png`, animations: "disabled" });
};

/** One read of everything the locks ask about. */
const read = (page: Page) => page.evaluate(() => {
  const q = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const left = q('[data-d58="left"]');
  const scroller = document.querySelector<HTMLElement>(".ws-wbody")!;
  const probe = document.createElement("i");
  probe.style.background = "var(--clv-slate)";
  document.body.appendChild(probe);
  const slate = getComputedStyle(probe).backgroundColor;
  probe.remove();
  const slateBands = [...document.querySelectorAll<HTMLElement>(".d60-band--slate")].filter((e) => e.getBoundingClientRect().height > 0).map((e) => getComputedStyle(e).backgroundColor);
  /* the drawings in the left column: visible <img>s (glyphs are svg, the chart's line is svg) */
  const drawings = left ? [...left.querySelectorAll<HTMLImageElement>("img")].filter((i) => i.getBoundingClientRect().width > 0).map((i) => i.getAttribute("src") ?? "") : [];
  const hoops = [...document.querySelectorAll<HTMLElement>('[data-d60="hoops"] > .d60-hoopcard')].map(box);
  /* everything that could be cut: text leaves in the left cards and the tiles */
  const cut: string[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('.d60-card li, .d60-card h3, .d60-card .d60-ready, .d60-way h4, .d60-way small, .d60-way .d60-wa, .d60-liftsub span, .d60-liftsub b')) {
    if (el.getBoundingClientRect().width <= 0) continue;
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).textOverflow !== "ellipsis") cut.push(`${el.className || el.tagName}: "${el.textContent?.trim().slice(0, 30)}" ${el.scrollWidth}/${el.clientWidth}`);
  }
  const sheet = document.querySelector(".ws-window")!.getBoundingClientRect();
  const past = [...document.querySelectorAll<HTMLElement>('[data-d58="body"] .os-card, .d60-way, [data-d58="panel"]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && (r.bottom > sheet.bottom + 0.5 || r.right > sheet.right + 0.5); })
    .map((e) => e.className);
  const legend = (sel: string) => [...document.querySelectorAll<HTMLElement>(`${sel} li`)].map((li) => ({ n: Number(li.querySelector("b")?.textContent ?? NaN), text: li.textContent?.trim() ?? "" }));
  return {
    pre: left?.getAttribute("data-pre") ?? null,
    queriesDoor: !!q('[data-d60="queries-door"]'), agentsDoor: !!q('[data-d60="agents-door"]'), agentsSnap: !!q('[data-d60="agents-snap"]'),
    chart: !!q('[data-d58="active"]'), hoopsRow: box(q('[data-d60="hoops"]')), hoops, active: box(q('[data-d58="active"]')), left: box(left),
    closedHoop: !!q('[data-d60="closed-hoop"]'), closedAny: !!document.querySelector('[data-d58="closed"], [data-d60="closed-hoop"]'),
    closedText: left ? /No reply|Passed on/.test(left.innerText) : false,
    liftTitle: q('[data-d60="lift-title"]')?.textContent ?? null, listTitle: q('[data-d58="list-title"]')?.textContent ?? null,
    /* RE-POINTED (Dashboard v71): the focus card is the task card; "All {n}" is retired */
    focus: !!q('[data-d71="task"]'), all: !!q('[data-d58="list-all"]'), ways: [...document.querySelectorAll<HTMLElement>('[data-d60="way"]')].map((w) => ({ key: w.dataset.key, done: w.dataset.done === "1", status: w.querySelector('[data-d60="way-status"]')?.textContent?.trim() ?? "" })),
    liftDone: q('[data-d60="lift-done"]')?.textContent ?? null,
    slate, slateBands, drawings,
    cov: (() => { const e = q('[data-d60="agents-hoop"], [data-d60="agents-snap"]'); return e ? JSON.parse(e.getAttribute("data-cov") ?? "null") : null; })(),
    agentsLegend: legend('[data-d60="agents-legend"]'), closedLegend: legend('[data-d60="closed-legend"]'),
    closedCounts: (() => { const e = q('[data-d60="closed-hoop"]'); return e ? JSON.parse(e.getAttribute("data-counts") ?? "null") : null; })(),
    closedTitle: q('[data-d60="closed-title"]')?.textContent ?? null,
    snapQueried: q('[data-d60="snap-queried"]')?.textContent ?? null,
    ready: q('[data-d60="ready"]')?.textContent ?? null,
    cut, past,
    scroller: { sh: scroller.scrollHeight, ch: scroller.clientHeight, sw: scroller.scrollWidth, cw: scroller.clientWidth },
    panel: box(q('[data-d58="panel"]')),
  };
});

/* ── P1 · P2 · P3 · P6 · P7 · P10 — every state at every size ──────────────────────────────── */

test("DB60 P1 P2 P3 P6 P7 P10 — the swap, the slate, the hoops, nothing closed or second before the first query, and fit", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("states");
  const { db, uid } = await harnessDb();
  const { collection, getDocs } = await import("firebase/firestore");
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d: { data: () => Record<string, unknown> }) => d.data());
  const onMs = (ms: string) => qs.filter((x: Record<string, unknown>) => x.manuscriptId === ms).length;
  L.check("P1", "population: the two manuscripts", onMs(PRE) === 0 && onMs(QMS) > 0, `${PRE}: ${onMs(PRE)} queries · ${QMS}: ${onMs(QMS)}`);
  for (const vp of SIZES) {
    for (const s of STATES) {
      await openDash(page, vp, s);
      const r = await read(page);
      const w = `${tag(vp)} ${s.key}`;
      await shot(page, `${s.key}-${tag(vp)}`);
      const wantPre = onMs(s.ms) === 0; // the chart's own predicate, read from the data
      /* P1 — both columns follow the one predicate */
      L.check("P1", `${w} left follows the predicate`, wantPre ? r.pre === "1" && r.queriesDoor && !r.chart : r.pre === "0" && r.chart && !r.queriesDoor, `pre ${r.pre} · door ${r.queriesDoor} · chart ${r.chart} · expected ${wantPre ? "pre" : "querying"}`);
      /* REWRITTEN (Dashboard v71): while querying the column is the task card, with no list title */
      L.check("P1", `${w} right follows the predicate`, wantPre ? r.liftTitle === "Ready for lift off?" && !r.focus && !r.all : !r.listTitle && r.focus && !r.liftTitle && !r.all, `lift "${r.liftTitle}" · list "${r.listTitle}" · task card ${r.focus}`);
      /* P2 — the agents band is the Contact list's slate */
      L.check("P2", `${w} slate band`, r.slateBands.length === 1 && r.slateBands[0] === r.slate && r.slate !== "rgba(0, 0, 0, 0)", `${r.slateBands.join(",")} · --clv-slate ${r.slate}`);
      if (s.key === "C") {
        /* P3 — two equal hoops, beneath the full-width chart */
        const [a, b] = r.hoops;
        L.check("P3", `${w} population`, r.hoops.length === 2 && !!r.active && !!r.left, `${r.hoops.length} hoop cards`);
        L.check("P3", `${w} equal widths`, !!a && !!b && Math.abs(a.w - b.w) <= 1, `${a?.w.toFixed(1)} · ${b?.w.toFixed(1)}`);
        L.check("P3", `${w} side by side, beneath the chart`, !!a && !!b && !!r.active && Math.abs(a.y - b.y) <= 1 && a.y >= r.active.b - 1 && b.x > a.r, `chart bottom ${r.active?.b.toFixed(1)} · hoops ${a?.y.toFixed(1)}/${b?.y.toFixed(1)}`);
        L.check("P3", `${w} the chart takes the full width`, !!r.active && !!r.left && Math.abs(r.active.w - r.left.w) <= 1 && !!r.hoopsRow && Math.abs(r.hoopsRow.w - r.left.w) <= 1, `chart ${r.active?.w.toFixed(1)} · hoops row ${r.hoopsRow?.w.toFixed(1)} · column ${r.left?.w.toFixed(1)}`);
      } else {
        /* P6 — no closed strip of any kind */
        L.check("P6", `${w} no closed strip`, !r.closedAny && !r.closedText, `closed element ${r.closedAny} · closed words ${r.closedText}`);
        /* P7 — one drawing, the Courier */
        L.check("P7", `${w} one drawing, the Courier`, r.drawings.length === 1 && /courier/.test(r.drawings[0]), r.drawings.join(" | ") || "none");
        L.check("P7", `${w} the agents door carries a glyph or the snapshot, no drawing`, s.key === "A" ? r.agentsDoor : r.agentsSnap, `door ${r.agentsDoor} · snap ${r.agentsSnap}`);
      }
      /* P10 — fit: no page scroll, nothing past the sheet, nothing cut, the panel above its floor */
      /* REWRITTEN (Dashboard v71): while querying the founding card is a fixed 194px (128 at 760 tall and
         under); before the first query it keeps v60's floor */
      const floor = s.key === "C" ? (vp.height <= 760 ? 128 : 194) : 112;
      /* ⚠️ AND BEFORE THE FIRST QUERY IT IS 112 (Dashboard v71): with the ink header taller than v60's, a
         150px card ran 27–41px under the feed tab at 1280–1512 (DB71 L3, first use) */
      L.check("P10", `${w} one screen`, r.scroller.sh <= r.scroller.ch + 1 && r.scroller.sw <= r.scroller.cw + 1, `${r.scroller.sh}/${r.scroller.ch} · ${r.scroller.sw}/${r.scroller.cw}`);
      L.check("P10", `${w} nothing past the sheet`, r.past.length === 0, r.past.join(" | ") || "none");
      L.check("P10", `${w} nothing cut`, r.cut.length === 0, r.cut.slice(0, 4).join(" | ") || "none");
      L.check("P10", `${w} the panel keeps its floor`, !!r.panel && r.panel.h >= floor - 0.5, `${r.panel?.h.toFixed(1)} ≥ ${floor}`);
    }
  }
  L.done(1 + SIZES.length * 31);
});

/* ── P4 · P5 — the hoops' figures are the Contact list's and closedTile's ──────────────────── */

test("DB60 P4 P5 — the agents figures are the Contact list's; the closed counts are closedTile's", async ({ page }) => {
  const L = new Ledger("figures");
  const { db, uid } = await harnessDb();
  const { collection, getDocs, doc, getDoc } = await import("firebase/firestore");
  const list = async (c: string) => (await getDocs(collection(db, "users", uid, c))).docs.map((d: { data: () => unknown }) => d.data());
  const [agents, queries, activities] = await Promise.all([list("agents"), list("queries"), list("activities")]) as [never[], never[], never[]];
  const todayIso = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();
  for (const ms of [QMS, PRE]) {
    const m = (await getDoc(doc(db, "users", uid, "manuscripts", ms))).data() as never;
    const st = [...agentQueryStates(agents, queries, ms).values()].map((f) => f.state);
    const ready = nextStep({ agents, queries, msId: ms, book: bookGenres(m), todayIso }).ready.length;
    const want = { querying: st.filter((x) => x === "active").length, closed: st.filter((x) => x === "closed").length, none: st.filter((x) => x === "none").length, ready, total: agents.length };
    const s = STATES.find((x) => x.ms === ms && x.key !== "A")!;
    await openDash(page, V(1512), s);
    const r = await read(page);
    L.check("P4", `${s.key} population`, want.total > 0 && !!r.cov, `${want.total} agents`);
    L.check("P4", `${s.key} the page's figures are agentQueryStates' and nextStep's`, JSON.stringify(r.cov) === JSON.stringify(want), `page ${JSON.stringify(r.cov)} · contact list ${JSON.stringify(want)}`);
    L.check("P4", `${s.key} and the words say them`, new RegExp(`^${want.ready} ready to query`).test(r.ready ?? ""), `"${r.ready}"`);
    if (s.key === "C") {
      const legendN = r.agentsLegend.slice(0, 3).map((x) => x.n);
      L.check("P4", "C the legend reads the same three", legendN.join() === [want.querying, want.closed, want.none].join(), legendN.join());
      /* P5 */
      const t = closedTile(scopeQueries(queries, ms), scopeActivities(activities, ms));
      const wantC = Object.fromEntries(t.buckets.map((b) => [b.key, b.count]));
      L.check("P5", "population: something closed", t.total > 0, `${t.total} closed`);
      L.check("P5", "the hoop's four counts are closedTile's", JSON.stringify(r.closedCounts) === JSON.stringify(wantC), `page ${JSON.stringify(r.closedCounts)} · closedTile ${JSON.stringify(wantC)}`);
      L.check("P5", "the legend reads them, in bucket order", r.closedLegend.map((x) => x.n).join() === t.buckets.map((b) => b.count).join(), r.closedLegend.map((x) => `${x.n}`).join());
      L.check("P5", "the title is their sum", (r.closedTitle ?? "").startsWith(`${t.total} closed`), `"${r.closedTitle}" · ${t.total}`);
    } else {
      L.check("P4", "B the snapshot's big figure is the queried count", r.snapQueried === String(want.querying + want.closed), `"${r.snapQueried}"`);
    }
  }
  L.done(12);
});
const V = (w: number) => SIZES.find((s) => s.width === w)!;

/* ── P8 — the four tiles' done states, every branch the account can reach ──────────────────── */

test("DB60 P8 — the tiles' done states", async ({ page }) => {
  const L = new Ledger("tiles");
  const { db, uid } = await harnessDb();
  const { doc, getDoc } = await import("firebase/firestore");
  /* the entitlement the app reads (db.tsx: users/{uid}/private/entitlement) and the plan, through the app's own rule */
  const usage = (await getDoc(doc(db, "users", uid, "private", "entitlement"))).data() as never;
  const plan = ((await getDoc(doc(db, "users", uid))).data() as { plan?: never } | undefined)?.plan;
  const spent = !getSmartImportEntitlement(plan, usage).allowed;
  const seen: Record<string, Set<boolean>> = { import: new Set(), mats: new Set(), comps: new Set(), version: new Set() };
  try {
    for (const mode of ["", "--full"] as const) {
      seed(mode);
      await openDash(page, V(1512), STATES[1]);
      const r = await read(page);
      L.check("P8", `${mode || "bare"} population`, r.ways.length === 4, `${r.ways.length} tiles`);
      for (const w of r.ways) seen[w.key ?? ""]?.add(w.done);
      const by = Object.fromEntries(r.ways.map((w) => [w.key, w]));
      if (mode === "") {
        L.check("P8", "bare: materials 0 of 3, not done", by.mats?.status === "0 OF 3 ON FILE" && !by.mats.done, by.mats?.status ?? "");
        L.check("P8", "bare: no comps, not done", by.comps?.status === "0 COMPS" && !by.comps.done, by.comps?.status ?? "");
        L.check("P8", "bare: no version, not done", by.version?.status === "NONE YET" && !by.version.done, by.version?.status ?? "");
      } else {
        L.check("P8", "full: materials 3 of 3, done", by.mats?.status === "✓ 3 OF 3 ON FILE" && by.mats.done, by.mats?.status ?? "");
        L.check("P8", "full: two comps, done", by.comps?.status === "✓ 2 COMPS" && by.comps.done, by.comps?.status ?? "");
        L.check("P8", "full: one version, done", by.version?.status === "✓ V1 CURRENT" && by.version.done, by.version?.status ?? "");
        L.check("P8", "full: the count is the tiles'", r.liftDone === `${r.ways.filter((w) => w.done).length} OF 4 · OPTIONAL`, `"${r.liftDone}"`);
      }
      /* the import tile is the entitlement's own answer, in whichever state the account holds */
      L.check("P8", `${mode || "bare"} import follows the entitlement`, by.import?.done === spent, `${by.import?.status} · spent ${spent}`);
    }
  } finally {
    seed("");
  }
  const both = Object.entries(seen).filter(([, v]) => v.size === 2).map(([k]) => k);
  console.log(`  P8 branches entered both ways: ${both.join(", ")} (import: the account's one state; the unit suite enters both)`);
  L.check("P8", "materials, comps and version each entered done and not done", ["mats", "comps", "version"].every((k) => both.includes(k)), both.join(","));
  L.done(12);
});

/* ── P10 (loading) — the page's own containers, at their loaded size, and no flash of the other state ── */

test("DB60 P10 — loading draws the state it last saw, at its loaded size", async ({ page }) => {
  const L = new Ledger("loading");
  const boxes = () => page.evaluate(() => ["[data-d60=\"queries-door\"]", "[data-d60=\"agents-snap\"]", "[data-d58=\"active\"]", "[data-d60=\"hoops\"]", "[data-d60=\"ways\"]", "[data-d71=\"task\"]", "[data-d58=\"panel\"]"].map((s) => {
    const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0);
    if (!e) return null;
    const r = e.getBoundingClientRect();
    return { s, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  }).filter(Boolean));
  for (const s of [STATES[1], STATES[2]]) {
    await openDash(page, V(1512), s);
    await openDash(page, V(1512), s, { __SA_DASH_HOLD_MS: 5000 });
    const held = await boxes();
    const isLoading = await page.evaluate(() => document.querySelector('[data-d58="page"]')?.getAttribute("data-loading"));
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
    await page.waitForTimeout(1800);
    const loaded = await boxes();
    L.check("P10", `${s.key} the hold is real`, isLoading === "1", `${isLoading}`);
    L.check("P10", `${s.key} the same containers`, JSON.stringify(held.map((b) => b?.s)) === JSON.stringify(loaded.map((b) => b?.s)), `${held.map((b) => b?.s).join(",")} → ${loaded.map((b) => b?.s).join(",")}`);
    const moved = loaded.filter((b, i) => { const a = held[i]; return !a || !b || Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1 || Math.abs(a.w - b.w) > 1 || Math.abs(a.h - b.h) > 1; });
    L.check("P10", `${s.key} at their loaded size`, moved.length === 0, moved.length ? `held ${JSON.stringify(held)} · loaded ${JSON.stringify(loaded)}` : "none moved");
  }
  L.done(6);
});
