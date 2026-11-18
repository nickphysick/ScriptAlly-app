/**
 * Analytics v26 — the AN26 locks (design-refs/analytics-v26/analytics-v26.html), measured on the RENDERED page at
 * 1512 × 900 and 1280 × 800 with the shell.
 *
 * ⚠️ TWO ANCHORS FOR EVERY FIGURE: the page's published model (`window.__SA_AN26`, dev builds only) AND the fixture's
 *    own fixed values — the mock's sample, seeded by tests/e2e/seedAn26.mjs. A mutation in lib/analyticsV26 moves the
 *    page and the model together, so a lock that only compared the two could never go red; the fixed values cannot move.
 * ⚠️ GEOMETRY IS READ OFF THE DRAWING (a mark's box, a bar's box), never from the data attributes beside them.
 * ⚠️ THE VISIBLE PAGE ONLY: every workspace page stays mounted, so every probe starts from the visible `[data-a26="page"]`.
 * ⚠️ BELOW 768px THIS PAGE IS NOT MOUNTED (phone/pages/PageRoutes → AnalyticsPhone), so L1's phone reading is of the
 *    phone app's page and is reported, not asserted against this page's parts.
 * ⚠️ IT WRITES AND RESTORES IN THE SAME RUN: beforeAll seeds every fixture, afterAll removes them (`seed-an26-` ids).
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { BENCHMARKS_QUERYTRACKER } from "../../src/lib/analyticsV24";

const DIR = "reports/analytics-v26";
const ROUTE = "/queries/analytics";
const MS = (k: string) => `seed-an26-${k}`;
const VPS = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
const TAG = process.env.AN26_TAG ?? "run";

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: boolean, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger-${TAG}`, { recursive: true });
    writeFileSync(`${DIR}/ledger-${TAG}/${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`LEDGER ${this.name}: ${this.rows.length} readings, ${this.rows.filter((r) => !r.ok).length} failed`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}
const eq = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const near = (a: number, b: number, t: number) => Number.isFinite(a) && Math.abs(a - b) <= t;

/* eslint-disable @typescript-eslint/no-explicit-any */
async function open(page: Page, vp: { width: number; height: number }, ms: string, init?: Record<string, unknown>) {
  await page.addInitScript(({ id, init }) => {
    try { localStorage.setItem("scriptally_active_manuscript_id", id); localStorage.setItem("sa.guide.analytics", "1"); } catch { /* */ }
    if (init) Object.assign(window as any, init);
  }, { id: ms, init: init ?? null });
  await openRoute(page, ROUTE, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForFunction((id) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a26="page"]')].find((e) => e.getBoundingClientRect().height > 0);
    return !!p && p.dataset.ms === id && p.dataset.a26State !== "loading" && !!(window as any).__SA_AN26;
  }, ms, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(600);
}
const model = (page: Page) => page.evaluate(() => (window as any).__SA_AN26 ?? null);
/** run `fn` against the visible page root (a string body, so nothing in it is rewritten by the bundler) */
const onPage = <T,>(page: Page, body: string, arg?: unknown): Promise<T> =>
  page.evaluate(({ body, arg }) => {
    const root = [...document.querySelectorAll<HTMLElement>('[data-a26="page"]')].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    // eslint-disable-next-line no-new-func
    return new Function("root", "arg", body)(root, arg);
  }, { body, arg }) as Promise<T>;

test.beforeAll(() => { execSync("node tests/e2e/seedAn26.mjs restore && node tests/e2e/seedAn26.mjs all", { stdio: "inherit" }); });
test.afterAll(() => { execSync("node tests/e2e/seedAn26.mjs restore", { stdio: "inherit" }); });

/* the mock's sample, as the brief states it — the fixed anchor */
const SAMPLE = {
  sent: 27, replies: 10, groups: { waiting: 13, reading: 4, offer: 1, ended: 9 }, path: [27, 10, 7, 2, 1],
  replyWeeks: [2, 3, 5, 6, 7, 7, 8, 9, 11, 13], typical: 7, beyond: 6,
  rounds: { n: [9, 9, 9], asked: [1, 4, 2], waiting: [2, 4, 7] },
  genre: [["Crime and thriller", 5, 12], ["Literary fiction", 1, 8], ["Commercial fiction", 1, 7]], note: [[5, 11], [2, 16]],
  nudges: { n: 5, replied: [4, 6, 9] }, findings: ["beyond", "typical", "bestRound"],
};

test("AN26-A1 header: the shared header, at Queries' edges, with the model's headline", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("a1");
  for (const vp of VPS) {
    await open(page, vp, MS("mock"));
    const m = await model(page);
    const a = await onPage<any>(page, `
      if (!root) return null;
      const h = [...root.querySelectorAll('[data-wsnh-page]')].filter((e) => e.getBoundingClientRect().height > 0);
      const r = h[0]?.getBoundingClientRect();
      return { n: h.length, page: h[0]?.getAttribute('data-wsnh-page'), own: root.querySelectorAll('[data-a21], [data-a17], header:not([data-wsnh])').length,
        lines: (() => { const t = root.querySelector('[data-wsnh="title"]'); if (!t) return 0; const lh = parseFloat(getComputedStyle(t).lineHeight); return Math.round(t.getBoundingClientRect().height / lh); })(),
        lh: (() => { const t = root.querySelector('[data-wsnh="title"]'); return t ? parseFloat(getComputedStyle(t).lineHeight) : 0; })(),
        rect: r ? [r.top, r.left, r.right, r.height] : null, title: root.querySelector('[data-a26="title"]')?.textContent ?? null };`);
    const sent = m?.v26?.outcomes?.sent, replies = m?.v26?.tally?.all;
    const want = `${sent} ${sent === 1 ? "query" : "queries"}, ${replies === 0 ? "no replies yet" : `${replies} ${replies === 1 ? "reply" : "replies"}`}`;
    L.check("A1", `${vp.width} population`, sent === SAMPLE.sent && replies === SAMPLE.replies, `model sent ${sent}, replies ${replies}`);
    L.check("A1", `${vp.width} shared header`, a?.n === 1 && a?.page === "analytics" && a?.own === 0, JSON.stringify(a && { n: a.n, page: a.page, own: a.own }));
    L.check("A1", `${vp.width} headline`, a?.title === want && want === "27 queries, 10 replies", `"${a?.title}" vs "${want}"`);
    /* Queries' header, same viewport, same session */
    await page.goto("/queries");
    await page.waitForTimeout(2500);
    const q = await page.evaluate(() => {
      const h = [...document.querySelectorAll<HTMLElement>('[data-qcv="open-header"]')].find((e) => e.getBoundingClientRect().height > 0);
      const r = h?.getBoundingClientRect();
      return r ? [r.top, r.left, r.right, r.height] : null;
    });
    const names = ["top", "left", "right", "height"];
    for (let i = 0; i < 3; i++) {
      L.check("A1", `${vp.width} ${names[i]}`, !!a?.rect && !!q && near(a.rect[i], q[i], 1), `analytics ${a?.rect?.[i]?.toFixed?.(1)} · queries ${q?.[i]?.toFixed?.(1)}`);
    }
    /* height: equal while the headline is one line. At 1280 the reference itself sets "27 queries, 10 replies" on two
       lines (screens/01-everyday-1280@2x.png), so there the header may grow by no more than that second line. */
    const extra = a?.rect && q ? a.rect[3] - q[3] : NaN;
    L.check("A1", `${vp.width} height`, a?.lines === 1 ? near(extra, 0, 1) : a?.lines === 2 && extra >= -1 && extra <= a.lh + 1,
      `analytics ${a?.rect?.[3]?.toFixed?.(1)} · queries ${q?.[3]?.toFixed?.(1)} · title lines ${a?.lines} (line ${a?.lh})`);
    if (vp.width === 1512) L.check("A1", "1512 one-line headline", a?.lines === 1, `${a?.lines} lines`);
  }
  L.done(15);
});

test("AN26-B1 findings: the cards equal findings, in order; a failed condition has no card; each link goes where it says", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("b1");
  const cards = () => onPage<any>(page, `
    if (!root) return null;
    return { keys: [...root.querySelectorAll('[data-a26-finding]')].map((e) => e.getAttribute('data-a26-finding')),
      gos: [...root.querySelectorAll('[data-a26-finding]')].map((e) => e.querySelector('[data-a26-go]')?.getAttribute('data-a26-go')),
      beyondMarks: root.querySelectorAll('[data-a26="beyond-mark"]').length, rounds: root.querySelectorAll('[data-a26="round"]').length,
      roundAsked: [...root.querySelectorAll('[data-a26="round"]')].map((t) => t.querySelectorAll('[data-a26="round-asked"]').length) };`);
  for (const k of ["mock", "inside", "eight"]) {
    await open(page, VPS[0], MS(k));
    const m = await model(page);
    const c = await cards();
    const want = m?.v26?.findings?.map((f: any) => f.key);
    L.check("B1", `${k} cards = model`, !!c && eq(c.keys, want), `${JSON.stringify(c?.keys)} vs ${JSON.stringify(want)}`);
    /* the DOM's own anchors: a beyond card iff the timeline's beyond zone holds marks; a best-round card iff a round has an ask */
    L.check("B1", `${k} beyond iff zone`, !!c && c.keys.includes("beyond") === c.beyondMarks > 0, `zone ${c?.beyondMarks}, card ${c?.keys?.includes("beyond")}`);
    L.check("B1", `${k} bestRound iff an ask in a round`, !!c && c.keys.includes("bestRound") === (c.rounds > 0 && Math.max(0, ...c.roundAsked) > 0), JSON.stringify(c?.roundAsked));
    if (k === "mock") L.check("B1", "mock = the sample", !!c && eq(c.keys, SAMPLE.findings), JSON.stringify(c?.keys));
    if (k === "inside") L.check("B1", "inside: no beyond card (population: an Everyday page)", !!c && !c.keys.includes("beyond") && c.keys.length > 0, JSON.stringify(c?.keys));
    const GO: Record<string, string> = { beyond: "beyond", typical: "quiet", bestRound: "best-round" };
    L.check("B1", `${k} links`, !!c && c.keys.every((key: string, i: number) => c.gos[i] === GO[key]), JSON.stringify(c?.gos));
  }
  /* where each link goes */
  for (const [go, path] of [["beyond", "/queries"], ["quiet", "/account/preferences"], ["best-round", "/queries"]] as const) {
    await open(page, VPS[0], MS("mock"));
    await page.locator(`[data-a26="page"]:visible [data-a26-go="${go}"]`).first().click();
    await page.waitForTimeout(1200);
    const at = await page.evaluate(() => location.pathname + location.hash);
    L.check("B1", `link ${go}`, at.includes(path) && !at.includes("/queries/analytics"), at);
  }
  L.done(17);
});

test("AN26-B2 early: under 5 replies, no findings, D or nudges; the segments fill to the reply count", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("b2");
  for (const [k, n] of [["four", 4], ["early", 0]] as const) {
    await open(page, VPS[0], MS(k));
    const m = await model(page);
    const r = await onPage<any>(page, `
      if (!root) return null;
      return { state: root.dataset.a26State, next: !!root.querySelector('[data-a26="next"]'), d: !!root.querySelector('[data-a26="row-d"]'),
        nudges: !!root.querySelector('[data-a26-card="nudges"]'), early: !!root.querySelector('[data-a26="early"]'),
        on: root.querySelectorAll('[data-a26-seg="on"]').length, segs: root.querySelectorAll('[data-a26-seg]').length };`);
    L.check("B2", `${k} population`, m?.v26?.tally?.all === n, `replies ${m?.v26?.tally?.all}`);
    L.check("B2", `${k} early`, r?.state === "early" && r?.early && !r?.next && !r?.d && !r?.nudges, JSON.stringify(r));
    L.check("B2", `${k} segments`, r?.segs === 5 && r?.on === n, `${r?.on} of ${r?.segs}`);
  }
  L.done(6);
});

test("AN26-C1 groups: marks per group equal nowGroups and the sample; every mark a StatusDot; hover names the agent", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("c1");
  await open(page, VPS[0], MS("mock"));
  const m = await model(page);
  const g = await onPage<any>(page, `
    if (!root) return null;
    const groups = Object.fromEntries([...root.querySelectorAll('[data-a26="group"]')].map((e) => [e.getAttribute('data-a26-group'), e.querySelectorAll('[data-a26-mark]').length]));
    const marks = [...root.querySelectorAll('[data-a26="what"] [data-a26-mark]')];
    return { groups, dots: marks.filter((x) => x.querySelector('svg')).length, n: marks.length };`);
  const want = m?.v26?.now?.counts;
  L.check("C1", "population", (g?.n ?? 0) > 0, `${g?.n} marks`);
  for (const k of ["waiting", "reading", "offer", "ended"]) {
    L.check("C1", `${k} = model`, (g?.groups?.[k] ?? 0) === want?.[k], `${g?.groups?.[k]} vs ${want?.[k]}`);
    L.check("C1", `${k} = sample`, (g?.groups?.[k] ?? 0) === (SAMPLE.groups as any)[k], `${g?.groups?.[k]} vs ${(SAMPLE.groups as any)[k]}`);
  }
  L.check("C1", "sum = sent", g?.n === m?.v26?.outcomes?.sent && g?.n === SAMPLE.sent, `${g?.n}`);
  L.check("C1", "every mark a StatusDot", g?.dots === g?.n, `${g?.dots} of ${g?.n}`);
  /* hover: the tip names the agent the model gives that mark */
  const first = m?.v26?.now?.groups?.[0]?.marks?.[0];
  const mk = page.locator(`[data-a26="page"]:visible [data-a26="what"] [data-a26-mark="${first?.id}"]`).first();
  await mk.hover();
  await page.waitForTimeout(250);
  const tip = await page.locator('[data-a26="tip-name"]').first().textContent().catch(() => null);
  L.check("C1", "hover names the agent", !!first && tip === first.agent, `"${tip}" vs "${first?.agent}"`);
  L.done(12);
});

test("AN26-C2 path: five rows equal pathSteps; bars ∝ count ÷ sent; a zero reads None yet", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("c2");
  for (const k of ["mock", "early"]) {
    await open(page, VPS[0], MS(k));
    const m = await model(page);
    const rows = await onPage<any[]>(page, `
      if (!root) return [];
      return [...root.querySelectorAll('[data-a26="step"]')].map((r) => { const t = r.querySelector('[data-a26="track"]').getBoundingClientRect(); const b = r.querySelector('[data-a26="bar"]');
        return { key: r.getAttribute('data-a26-step'), n: Number(r.getAttribute('data-a26-n')), fig: r.querySelector('b').textContent, track: t.width, bar: b ? b.getBoundingClientRect().width : 0 }; });`);
    const counts = m?.v26?.path?.map((p: any) => p.count);
    L.check("C2", `${k} rows = model`, rows.length === 5 && eq(rows.map((r) => r.n), counts), `${JSON.stringify(rows.map((r) => r.n))} vs ${JSON.stringify(counts)}`);
    if (k === "mock") L.check("C2", "mock = sample", eq(rows.map((r) => r.n), SAMPLE.path), JSON.stringify(rows.map((r) => r.n)));
    const sent = m?.v26?.outcomes?.sent;
    for (const r of rows) {
      L.check("C2", `${k} ${r.key} bar`, near(r.bar, (r.n / sent) * r.track, 2), `${r.bar.toFixed(1)} vs ${((r.n / sent) * r.track).toFixed(1)}`);
      if (r.n === 0) L.check("C2", `${k} ${r.key} zero`, r.fig === "None yet" && r.bar === 0, `"${r.fig}"`);
    }
  }
  L.done(16);
});

test("AN26-D1 rounds: three tiles by the cut rule, asked and waiting equal rounds; none under 9 dated", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("d1");
  const read = () => onPage<any[]>(page, `
    if (!root) return [];
    return [...root.querySelectorAll('[data-a26="round"]')].map((t) => ({ n: t.querySelectorAll('[data-a26-mark]').length, asked: Number(t.querySelector('.a26-rd-n b').textContent),
      dotsAsked: t.querySelectorAll('[data-a26="round-asked"]').length, w: t.querySelector('.a26-rd-w').textContent }));`);
  for (const k of ["mock", "nine"]) {
    await open(page, VPS[0], MS(k));
    const m = await model(page);
    const t = await read();
    const n = m?.v26?.outcomes?.sent;
    const size = Math.ceil(n / 3);
    L.check("D1", `${k} sizes by the cut rule`, eq(t.map((x) => x.n), [size, size, n - 2 * size]), JSON.stringify(t.map((x) => x.n)));
    L.check("D1", `${k} sum = dated`, t.reduce((s, x) => s + x.n, 0) === n, `${t.reduce((s, x) => s + x.n, 0)} vs ${n}`);
    L.check("D1", `${k} asked = model`, eq(t.map((x) => x.asked), m?.v26?.rounds?.map((r: any) => r.asked)), JSON.stringify(t.map((x) => x.asked)));
    L.check("D1", `${k} asked = its asked marks`, t.every((x) => x.asked === x.dotsAsked), JSON.stringify(t.map((x) => [x.asked, x.dotsAsked])));
    if (k === "mock") {
      L.check("D1", "mock asked = sample", eq(t.map((x) => x.asked), SAMPLE.rounds.asked), JSON.stringify(t.map((x) => x.asked)));
      L.check("D1", "mock waiting = sample", eq(t.map((x) => x.w), SAMPLE.rounds.waiting.map((w) => `${w} still waiting`)), JSON.stringify(t.map((x) => x.w)));
    }
  }
  await open(page, VPS[0], MS("eight"));
  const e = await read();
  const em = await model(page);
  L.check("D1", "eight: population is Everyday", em?.v26?.state === "everyday", em?.v26?.state);
  L.check("D1", "eight: no rounds under 9 dated", e.length === 0, `${e.length} tiles`);
  L.done(12);
});

test("AN26-D2 who: rows equal whoSaysYes and the sample; no genre under 3; the foot's count is unqueried and absent at 0", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("d2");
  const read = () => onPage<any>(page, `
    if (!root) return null;
    const rows = (p) => [...root.querySelectorAll('[data-a26-yes="' + p + '"]')].map((r) => [r.querySelector('span').textContent, Number(r.dataset.a26Asked), Number(r.dataset.a26Sent)]);
    return { genre: rows('genre'), note: rows('note'), foot: root.querySelector('[data-a26="unqueried"]')?.textContent ?? null, none: !!root.querySelector('[data-a26="no-genre"]') };`);
  await open(page, VPS[0], MS("mock"));
  const m = await model(page);
  const w = await read();
  L.check("D2", "genre = model", eq(w?.genre, m?.v26?.who?.byGenre?.map((r: any) => [r.label, r.asked, r.sent])), JSON.stringify(w?.genre));
  L.check("D2", "genre = sample", eq(w?.genre, SAMPLE.genre), JSON.stringify(w?.genre));
  L.check("D2", "note = sample", eq(w?.note?.map((r: any) => [r[1], r[2]]), SAMPLE.note), JSON.stringify(w?.note));
  L.check("D2", "no genre under 3", (w?.genre ?? []).every((r: any) => r[2] >= 3) && (w?.genre?.length ?? 0) > 0, JSON.stringify(w?.genre));
  const extras = Array.from({ length: 8 }, (_, j) => `seed-an26-mock-ex-${j}`);
  L.check("D2", "foot = unqueried", w?.foot?.startsWith(`${m?.v26?.who?.unqueried} agent`) && m?.v26?.who?.unqueried > 0, `"${w?.foot}" · ${m?.v26?.who?.unqueried}`);
  L.check("D2", "unqueried holds the eight who take it", extras.every((id) => m?.v26?.who?.unqueriedIds?.includes(id)), `${m?.v26?.who?.unqueriedIds?.length}`);
  await open(page, VPS[0], MS("nogenre"));
  const n = await read();
  const nm = await model(page);
  L.check("D2", "no genres: population Everyday", nm?.v26?.state === "everyday", nm?.v26?.state);
  L.check("D2", "no genres: the one line, no rows, no foot", n?.none === true && n?.genre?.length === 0 && n?.foot === null, JSON.stringify(n));
  L.done(8);
});

test("AN26-E1 timeline: a mark per dated reply at its week; waiting at weeks out; the beyond zone; the typical line; no band under 4", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("e1");
  await open(page, VPS[0], MS("mock"));
  const m = await model(page);
  const t = await onPage<any>(page, `
    if (!root) return null;
    const plot = root.querySelector('[data-a26="plot-replies"]').getBoundingClientRect();
    const axis = Number(root.querySelector('[data-a26="timeline"]').dataset.a26Axis);
    const xs = (sel) => [...root.querySelectorAll(sel)].map((e) => { const r = e.getBoundingClientRect(); return (r.left + r.width / 2 - plot.left) / plot.width; });
    const typ = root.querySelector('[data-a26="typical"]');
    return { axis, plotW: plot.width, reply: xs('[data-a26="reply-mark"]'), wait: xs('[data-a26="wait-mark"]'),
      beyond: root.querySelectorAll('[data-a26="beyond-mark"]').length, typ: typ ? (typ.getBoundingClientRect().left + 1 - plot.left) / plot.width : null,
      band: !!root.querySelector('[data-a26="band"]') };`);
  const X = (w: number, axis: number) => (Math.min(w, axis) / axis) * 0.94 + 0.03;
  const reps = [...(m?.v26?.times?.replies ?? [])].map((r: any) => r.weeks).sort((a: number, b: number) => a - b);
  L.check("E1", "population", (t?.reply?.length ?? 0) > 0, `${t?.reply?.length} reply marks`);
  L.check("E1", "replies = sample weeks", eq(reps, SAMPLE.replyWeeks), JSON.stringify(reps));
  const got = [...(t?.reply ?? [])].sort((a: number, b: number) => a - b);
  SAMPLE.replyWeeks.forEach((w, i) => L.check("E1", `reply ${i} at ${w} wks`, near(got[i] * t.plotW, X(w, t.axis) * t.plotW, 2), `${(got[i] * t.plotW).toFixed(1)} vs ${(X(w, t.axis) * t.plotW).toFixed(1)}`));
  const waits = (m?.v26?.times?.waiting ?? []).filter((w: any) => w.weeks <= 13).map((w: any) => w.weeks).sort((a: number, b: number) => a - b);
  const gw = [...(t?.wait ?? [])].sort((a: number, b: number) => a - b);
  L.check("E1", "waiting marks inside", gw.length === waits.length && waits.length === 7, `${gw.length} vs ${waits.length}`);
  waits.forEach((w: number, i: number) => L.check("E1", `wait ${i} at ${w} wks`, near(gw[i] * t.plotW, X(w, t.axis) * t.plotW, 2), `${(gw[i] * t.plotW).toFixed(1)}`));
  L.check("E1", "beyond = model = sample", t?.beyond === m?.v26?.times?.beyond?.length && t?.beyond === SAMPLE.beyond, `${t?.beyond}`);
  L.check("E1", "typical line at typical", t?.typ !== null && near(t.typ * t.plotW, X(SAMPLE.typical, t.axis) * t.plotW, 2), `${(t?.typ * t?.plotW).toFixed?.(1)}`);
  L.check("E1", "band with 10 replies", t?.band === true, String(t?.band));
  for (const k of ["early"]) {
    await open(page, VPS[0], MS(k));
    const e = await onPage<any>(page, `return root ? { band: !!root.querySelector('[data-a26="band"]'), typ: !!root.querySelector('[data-a26="typical"]'), axis: Number(root.querySelector('[data-a26="timeline"]').dataset.a26Axis) } : null;`);
    L.check("E1", `${k}: no band, no line, axis 13`, e?.band === false && e?.typ === false && e?.axis === 13, JSON.stringify(e));
  }
  L.done(22);
});

test("AN26-E2 nudges: rows equal nudgeResults; Replied {d} days later; a reply before the nudge never counts", async ({ page }) => {
  test.setTimeout(200_000);
  const L = new Ledger("e2");
  const read = () => onPage<any[]>(page, `return root ? [...root.querySelectorAll('[data-a26="nudge"]')].map((r) => r.querySelector('[data-a26="nudge-r"]').textContent) : [];`);
  const words = (d: number | null) => (d === null ? "No reply since" : d === 0 ? "Replied the same day" : `Replied ${d} ${d === 1 ? "day" : "days"} later`);
  await open(page, VPS[0], MS("mock"));
  const m = await model(page);
  const r = await read();
  L.check("E2", "population", r.length > 0, `${r.length} rows`);
  L.check("E2", "rows = model", eq(r, (m?.v26?.nudges?.rows ?? []).slice(0, 6).map((x: any) => words(x.repliedDays))), JSON.stringify(r));
  const days = (m?.v26?.nudges?.rows ?? []).map((x: any) => x.repliedDays).filter((d: any) => d !== null).sort((a: number, b: number) => a - b);
  L.check("E2", "sample: 5 sent, replied 4, 6, 9", r.length === SAMPLE.nudges.n && eq(days, SAMPLE.nudges.replied), `${r.length} · ${JSON.stringify(days)}`);
  await open(page, VPS[0], MS("nine"));
  const n = await read();
  L.check("E2", "nine: the nudge after its reply reads No reply since", n.length === 2 && n.filter((x) => x === "No reply since").length === 1 && n.includes("Replied 4 days later"), JSON.stringify(n));
  L.done(4);
});

test("AN26-F1 compare: Most = the anchors, You = benchmark; the constant removes F and the header's line", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("f1");
  const read = () => onPage<any>(page, `
    if (!root) return null;
    return { most: [...root.querySelectorAll('[data-a26="most-v"]')].map((e) => e.textContent), you: [...root.querySelectorAll('[data-a26="bench"]')].map((e) => e.dataset.a26You),
      card: root.querySelectorAll('[data-a26-card="compare"]').length, hd: root.querySelector('[data-a26="hd-most"]')?.textContent ?? null };`);
  const B = BENCHMARKS_QUERYTRACKER;
  await open(page, VPS[0], MS("mock"));
  const m = await model(page);
  const a = await read();
  L.check("F1", "Most = BENCHMARKS_QUERYTRACKER", eq(a?.most, [`${B.requestRate}%`, `${B.replyRate}%`, `${B.queriesSent}`]), JSON.stringify(a?.most));
  L.check("F1", "You = benchmark", eq(a?.you, (m?.bench ?? []).map((b: any) => (b.verdict === "Too early to say" || b.you === null ? "" : String(b.you)))), JSON.stringify(a?.you));
  L.check("F1", "header line", a?.hd === `Most writers see about 1 in ${Math.round(100 / B.requestRate)}.`, `"${a?.hd}"`);
  /* swapped anchors (dev only): the page must follow them */
  const SW = { requestRate: 9, replyRate: 41, queriesSent: 33 };
  await open(page, VPS[0], MS("mock"), { __SA_AN26_BENCH: SW });
  const s = await read();
  L.check("F1", "swapped anchors followed", eq(s?.most, ["9%", "41%", "33"]) && s?.hd === "Most writers see about 1 in 11.", JSON.stringify(s));
  await open(page, VPS[0], MS("mock"), { __SA_AN26_NO_COMPARE: true });
  const off = await read();
  L.check("F1", "constant off: no F, no header line", off?.card === 0 && off?.hd === null, JSON.stringify(off));
  L.done(5);
});

const BANNED = /\b(suggests?|likely|probably|should|expect(ed)?|predict|forecast|overdue|late)\b/i;
test("AN26-G1 words: no forecast or verdict word, no 1 in 1, no 0 weeks or 0 days, in any state", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("g1");
  for (const k of ["mock", "nine", "five", "four", "early", "dayone", "inside", "eight", "nogenre"]) {
    await open(page, VPS[0], MS(k));
    /* the page and its tips: innerText of the page above the footer, plus every mark's accessible name */
    const text = await onPage<string>(page, `
      if (!root) return '';
      const flow = root.querySelector('[data-a26="flow"]'); const hd = root.querySelector('[data-wsnh="root"]');
      return [hd?.innerText ?? '', flow?.innerText ?? '', ...[...root.querySelectorAll('[data-a26-mark]')].map((e) => e.getAttribute('aria-label'))].join('\\n');`);
    L.check("G1", `${k} population`, text.length > 40, `${text.length} chars`);
    const hit = text.match(BANNED)?.[0] ?? text.match(/\b1 in 1\b/)?.[0] ?? text.match(/\b0 (weeks|days)\b/)?.[0] ?? null;
    L.check("G1", `${k} words`, hit === null, `"${hit}"`);
  }
  L.done(18);
});

test("AN26-H1 day one: the header reads Analytics, three steps, one filled button, no sections, nothing counted", async ({ page }) => {
  test.setTimeout(120_000);
  const L = new Ledger("h1");
  await open(page, VPS[0], MS("dayone"));
  const m = await model(page);
  const d = await onPage<any>(page, `
    if (!root) return null;
    return { title: root.querySelector('[data-a26="title"]')?.textContent, steps: root.querySelectorAll('[data-a26="step-card"]').length,
      btn: root.querySelectorAll('[data-a26="day-one"] .a26-btn').length, cards: root.querySelectorAll('[data-a26-card]').length,
      marks: root.querySelectorAll('[data-a26-mark]').length, examples: root.querySelectorAll('[data-a26="example"]').length };`);
  L.check("H1", "population: no queries", m?.v26?.outcomes?.sent === 0 && m?.v26?.state === "dayOne", `${m?.v26?.outcomes?.sent}`);
  L.check("H1", "header", d?.title === "Analytics", `"${d?.title}"`);
  L.check("H1", "three steps, one filled button", d?.steps === 3 && d?.btn === 1, JSON.stringify(d));
  L.check("H1", "no sections", d?.cards === 0, `${d?.cards}`);
  L.check("H1", "the example tiles are never counted", d?.examples === 3 && d?.marks === 0, JSON.stringify(d));
  L.done(5);
});

test("AN26-L1 layout: no horizontal overflow, nothing clipped, every clickable at least 24 × 24", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("l1");
  for (const vp of [...VPS, { width: 1920, height: 1080 }]) {
    for (const k of ["mock", "early", "dayone"]) {
      await open(page, vp, MS(k));
      const r = await onPage<any>(page, `
        if (!root) return null;
        const d = document.documentElement, sc = root.closest('.wpg-scroll');
        const clipped = [...root.querySelectorAll('.a26-rc-in, .a26-pad, .a26-wh > div, .a26-cm, .a26-tl')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.className);
        const small = [...root.querySelectorAll('button, a[href]')].filter((e) => !e.closest('footer, .af') && !String(e.className).startsWith('af-')).filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.width < 24 || b.height < 24); }).map((e) => (e.getAttribute('data-a26') || e.className) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
        const col = root.querySelector('[data-a26="flow"]').getBoundingClientRect();
        const out = [...root.querySelectorAll('.a26-rc')].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.right > col.right + 1 || b.left < col.left - 1); }).length;
        return { doc: d.scrollWidth - d.clientWidth, sc: sc ? sc.scrollWidth - sc.clientWidth : null, clipped, small, out };`);
      L.check("L1", `${vp.width} ${k} population`, !!r, "page found");
      L.check("L1", `${vp.width} ${k} no overflow`, r?.doc === 0 && (r?.sc ?? 0) <= 0, JSON.stringify({ doc: r?.doc, sc: r?.sc }));
      L.check("L1", `${vp.width} ${k} every card inside the column`, r?.out === 0, `${r?.out} outside`);
      L.check("L1", `${vp.width} ${k} nothing clipped`, (r?.clipped?.length ?? 1) === 0, JSON.stringify(r?.clipped?.slice(0, 5)));
      /* the page's own parts: AppFooter is shared and out of this pack (its mail link is 22px tall — listed for Nick) */
      L.check("L1", `${vp.width} ${k} targets ≥ 24`, (r?.small?.length ?? 1) === 0, JSON.stringify(r?.small?.slice(0, 5)));
    }
  }
  /* the phone: the route draws the phone app's own page below 768 — reported, not this page's parts */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForTimeout(3000);
  const phone = await page.evaluate(() => ({ doc: document.documentElement.scrollWidth - document.documentElement.clientWidth, v26: [...document.querySelectorAll<HTMLElement>('[data-a26="page"]')].some((e) => e.getBoundingClientRect().height > 0) }));
  console.log(`L1 390: overflow ${phone.doc}px; v26 page mounted: ${phone.v26}`);
  L.check("L1", "390 no document overflow", phone.doc === 0, JSON.stringify(phone));
  L.done(46);
});

test("AN26 screenshots for the report", async ({ page }) => {
  test.skip(process.env.AN26_SHOTS !== "1", "AN26_SHOTS=1 to take the report's screenshots");
  test.setTimeout(400_000);
  mkdirSync(`${DIR}/shots`, { recursive: true });
  /* the page scrolls inside its own scroller, so a full-page shot sees one screen: step the scroller, a frame a screen */
  const shot = async (name: string) => {
    const h = await page.evaluate(() => {
      const p = [...document.querySelectorAll<HTMLElement>('[data-a26="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
      const sc = p.closest(".wpg-scroll") as HTMLElement; sc.scrollTop = 0; return { total: sc.scrollHeight, view: sc.clientHeight };
    });
    const frames = Math.max(1, Math.ceil(h.total / (h.view - 80)));
    for (let i = 0; i < frames; i++) {
      await page.evaluate((y) => { const p = [...document.querySelectorAll<HTMLElement>('[data-a26="page"]')].find((e) => e.getBoundingClientRect().height > 0)!; (p.closest(".wpg-scroll") as HTMLElement).scrollTop = y; }, i * (h.view - 80));
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${DIR}/shots/${name}-${i + 1}.png` });
    }
  };
  for (const [k, name] of [["mock", "01-everyday"], ["early", "02-early"], ["dayone", "03-day-one"]] as const) {
    for (const vp of VPS) { await open(page, vp, MS(k)); await shot(`${name}-${vp.width}`); }
  }
  await open(page, { width: 1920, height: 1080 }, MS("mock")); await shot("everyday-1920");
  await open(page, VPS[0], MS("nine")); await shot("nine-queries-1512");
  await open(page, VPS[0], MS("five")); await shot("five-replies-no-nudges-1512");
  await open(page, VPS[0], MS("nogenre")); await shot("no-genres-1512");
  await open(page, VPS[0], MS("four")); await shot("four-replies-1512");
  await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await page.waitForTimeout(3000);
  await page.screenshot({ path: `${DIR}/shots/phone-390-route.png`, fullPage: false });
});
