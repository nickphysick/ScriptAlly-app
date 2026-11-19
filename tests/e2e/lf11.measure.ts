/**
 * List filters v1.1 — the Filter panel always pins (Queries list and Agents list). Emulator harness on the built app.
 *
 *   SA_PHASE=step0   the readings that name the cause, on whatever build is served (asserts nothing):
 *                    at 1440×900 and 1717×960, both pages, at rest and scrolled 1500px: the panel's offsetHeight, the
 *                    scrollport's clientHeight, --pin-cover, data-qc154-tall, the computed position, the panel's top and
 *                    bottom against the port, and on /agents the clp-page container's width (sidebar open and collapsed);
 *                    then again on /agents with real-data-shaped genres and one door not known (Step 0.2)
 *   SA_PHASE=shots   each page at 1440×700 scrolled 1500px, and at 1717×1200
 *   (default)        the locks LF15–LF19
 *
 *   LF15 pins when short      1440×700 scrolled 1500: top = --pin-cover + 14 (±1); bottom ≥ 12px above the port's; the
 *                             body scrolls; head and foot fully visible
 *   LF16 no scroll when it fits  1717×1200: pinned top once scrolled; the body does not scroll; no foot shadow
 *   LF17 follows the bar      1440×900: down until the collapsed bar shows, then back: top = --pin-cover + 14 within a
 *                             frame both ways, and never over the bar
 *   LF18 folded               page content under 1000px: the panel above the list, not pinned, full height, unclipped
 *   LF19 real-data shape      /agents with the Step 0.2 data at 1440×900: the content taller than the room (proved first),
 *                             and the panel pinned after scrolling 1500px
 *
 * ⚠️ STEP 0.2 AND LF19 WRITE TO THE EMULATOR (agents' genres, one door, the manuscript's genre) and restore every field
 *    in the same run; the e2e run imports the committed snapshot and exports nothing, so nothing outlives it either way.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const QC = ".qc151.qc153";
const CL = ".clv-group.cl27";
const DIR = "reports/list-filters-v1-1";
const PHASE = process.env.SA_PHASE === "step0" ? "step0" : process.env.SA_PHASE === "shots" ? "shots" : "locks";
const FS = "http://127.0.0.1:8085/v1/projects/demo-scriptally/databases/(default)/documents";
const UID = "LS4ymFFCEvhN82advZQJ5zkr7sv2";
const H = { Authorization: "Bearer owner", "Content-Type": "application/json" };
test.setTimeout(900_000);
test.use({ actionTimeout: 15_000 });
mkdirSync(`${DIR}/ledger`, { recursive: true });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect.soft(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect.soft(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`), `${this.id} reds`).toEqual([]);
  }
}
const panelOf = (root: string) => `${root} .qc153-rail.fp`;

async function open(page: Page, route: string, root: string, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { for (const k of ["sa.guide.queries", "sa.guide.queries-explainer", "sa.guide.contacts"]) localStorage.setItem(k, "1"); } catch { /* private */ } });
  await openRoute(page, route, vp);
  await expect(page.locator(`${panelOf(root)} >> visible=true`).first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(900);
}
/** the visible page's scroller to y (instant), then a settle */
async function scrollTo(page: Page, root: string, y: number, settle = 700) {
  await page.evaluate(([root, y]) => {
    const r = [...document.querySelectorAll<HTMLElement>(root as string)].find((e) => e.getBoundingClientRect().width > 0);
    r?.closest<HTMLElement>(".wpg-scroll")?.scrollTo({ top: y as number, behavior: "instant" as ScrollBehavior });
  }, [root, y] as const);
  await page.waitForTimeout(settle);
}
/** everything about the panel and its room, as drawn */
async function reading(page: Page, root: string) {
  return page.evaluate((root) => {
    const pg = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
    const rail = pg.querySelector<HTMLElement>(".qc153-rail.fp")!;
    const port = pg.closest<HTMLElement>(".wpg-scroll")!;
    const body = rail.querySelector<HTMLElement>(".fp-body");
    const hd = rail.querySelector<HTMLElement>(".fp-hd")!, ft = rail.querySelector<HTMLElement>(".fp-ft")!;
    const pr = port.getBoundingClientRect(), rr = rail.getBoundingClientRect();
    const cs = getComputedStyle(rail);
    const inner = document.querySelector<HTMLElement>(".aglist .agl-inner");
    const bar = pg.querySelector<HTMLElement>(".qc154-tbw");
    /* the collapsed bar (shell/SlimBar, `.qc156-slim` on both pages), only while shown */
    const slim = pg.querySelector<HTMLElement>(".qc156-slim[data-shown]");
    return {
      railH: rail.offsetHeight, portH: port.clientHeight, cover: parseFloat(cs.getPropertyValue("--pin-cover")) || 0,
      tall: rail.hasAttribute("data-qc154-tall"), position: cs.position, maxH: cs.maxHeight,
      top: +(rr.top - pr.top).toFixed(1), bottomGap: +(pr.bottom - rr.bottom).toFixed(1), scrollTop: Math.round(port.scrollTop),
      body: body ? { sh: body.scrollHeight, ch: body.clientHeight, top: body.scrollTop } : null,
      headIn: hd.getBoundingClientRect().top >= pr.top - 0.5 && hd.getBoundingClientRect().bottom <= pr.bottom + 0.5,
      footIn: ft.getBoundingClientRect().top >= pr.top - 0.5 && ft.getBoundingClientRect().bottom <= pr.bottom + 0.5,
      footShadow: getComputedStyle(ft).boxShadow, more: rail.hasAttribute("data-fp-more"),
      clpPage: inner ? Math.round(inner.getBoundingClientRect().width) : null,
      barBottom: bar ? +(bar.getBoundingClientRect().bottom - pr.top).toFixed(1) : null,
      slimBottom: slim ? +(slim.getBoundingClientRect().bottom - pr.top).toFixed(1) : null,
      listTop: +((pg.querySelector<HTMLElement>(".qc153-main")?.getBoundingClientRect().top ?? 0) - pr.top).toFixed(1),
      sidebar: Math.round(document.querySelector<HTMLElement>("#ws-sidebar")?.getBoundingClientRect().width ?? 0),
    };
  }, root);
}
type Reading = Awaited<ReturnType<typeof reading>>;
const brief = (r: Reading) => `rail ${r.railH} · port ${r.portH} · cover ${r.cover} · tall ${r.tall} · ${r.position} · top ${r.top} · gap ${r.bottomGap}`
  + (r.body ? ` · body ${r.body.sh}/${r.body.ch}` : "") + (r.clpPage !== null ? ` · clp-page ${r.clpPage}` : "");

/* ── Step 0.2 / LF19 — the Agents panel the shape real data gives it ─────────────────────────────────────────────── */
const LONG = ["Upmarket book-club women's fiction", "Speculative literary historical", "Psychological domestic suspense",
  "Dark academia coming-of-age", "Cosy small-town mystery series", "Southern Gothic family saga", "Climate fiction near-future thriller"];
const TALL_AGENTS = ["clv-fx-never"];
async function fsGet(path: string) { const r = await fetch(`${FS}/users/${UID}/${path}`, { headers: H }); return r.ok ? r.json() : null; }
async function fsPatch(path: string, fields: Record<string, unknown>) {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join("&");
  const r = await fetch(`${FS}/users/${UID}/${path}?${mask}`, { method: "PATCH", headers: H, body: JSON.stringify({ fields }) });
  if (!r.ok) throw new Error(`PATCH ${path}: ${r.status}`);
}
async function agentIds(n: number): Promise<string[]> {
  const r = await fetch(`${FS}/users/${UID}/agents?pageSize=${n + 5}`, { headers: H });
  const j = await r.json() as { documents?: { name: string }[] };
  return (j.documents ?? []).map((d) => d.name.split("/").pop()!).filter((id) => !TALL_AGENTS.includes(id)).slice(0, n);
}
/** seven agents each carry two long genres (seven long pills, five-plus rows); the book carries the first; one door
 *  is not known. Returns the restore. */
async function makeTall(): Promise<() => Promise<void>> {
  const ids = await agentIds(8);
  const saved: { path: string; fields: Record<string, unknown> }[] = [];
  const keep = async (path: string, keys: string[]) => {
    const doc = await fsGet(path) as { fields?: Record<string, unknown> } | null;
    saved.push({ path, fields: Object.fromEntries(keys.map((k) => [k, doc?.fields?.[k] ?? { nullValue: null }])) });
  };
  const arr = (xs: string[]) => ({ arrayValue: { values: xs.map((x) => ({ stringValue: x })) } });
  for (let i = 0; i < 7; i++) { await keep(`agents/${ids[i]}`, ["genres"]); await fsPatch(`agents/${ids[i]}`, { genres: arr([LONG[i], LONG[(i + 3) % 7]]) }); }
  await keep(`agents/${ids[7]}`, ["submissionStatus"]); await fsPatch(`agents/${ids[7]}`, { submissionStatus: { stringValue: "Unknown" } });
  await keep("manuscripts/cv25-ms", ["genre"]); await fsPatch("manuscripts/cv25-ms", { genre: { stringValue: LONG[0] } });
  return async () => { for (const s of saved) await fsPatch(s.path, s.fields); };
}

/* ═══════════════════════════════ Step 0 ═══════════════════════════════ */
if (PHASE === "step0") {
  test("Step 0 — what un-pins the panel", async ({ page }) => {
    const rows: Record<string, unknown>[] = [];
    const rec = (label: string, r: Reading) => { rows.push({ label, ...r }); console.log(`S0 ${label} — ${brief(r)}`); };
    for (const vp of [{ width: 1440, height: 900 }, { width: 1717, height: 960 }]) {
      for (const [route, root, tag] of [["/queries", QC, "queries"], ["/agents", CL, "agents"]] as const) {
        await open(page, route, root, vp);
        rec(`${tag} ${vp.width}×${vp.height} rest`, await reading(page, root));
        await scrollTo(page, root, 1500);
        rec(`${tag} ${vp.width}×${vp.height} @1500`, await reading(page, root));
        /* 0.5 — the collapsed bar changes --pin-cover; does the tall reading follow it? back to the top and read again */
        await scrollTo(page, root, 0);
        rec(`${tag} ${vp.width}×${vp.height} back at 0`, await reading(page, root));
      }
      /* 0.3 — the clp-page container with the sidebar collapsed (⌘\) */
      await open(page, "/agents", CL, vp);
      await page.keyboard.press("Meta+Backslash"); await page.waitForTimeout(800);
      rec(`agents ${vp.width}×${vp.height} sidebar collapsed`, await reading(page, CL));
      await scrollTo(page, CL, 1500);
      rec(`agents ${vp.width}×${vp.height} sidebar collapsed @1500`, await reading(page, CL));
      await page.keyboard.press("Meta+Backslash"); await page.waitForTimeout(500);
    }
    /* 0.2 — real-data shape */
    const restore = await makeTall();
    try {
      for (const vp of [{ width: 1440, height: 900 }, { width: 1717, height: 960 }]) {
        await open(page, "/agents", CL, vp);
        const g = await page.locator(`${CL} [data-clq='genre'] >> visible=true`).count();
        const nk = await page.locator(`${CL} [data-clq='not-known'] >> visible=true`).count();
        rec(`agents tall-data ${vp.width}×${vp.height} rest (genre pills ${g}, not-known link ${nk})`, await reading(page, CL));
        await scrollTo(page, CL, 1500);
        rec(`agents tall-data ${vp.width}×${vp.height} @1500`, await reading(page, CL));
        await page.screenshot({ path: `${DIR}/step0-agents-tall-${vp.width}.png` });
      }
    } finally { await restore(); }
    writeFileSync(`${DIR}/step0.json`, JSON.stringify(rows, null, 1));
  });
}

/* ═══════════════════════════════ the locks ═══════════════════════════════ */
if (PHASE === "locks") {
  for (const [route, root, tag] of [["/queries", QC, "q"], ["/agents", CL, "a"]] as const) {
    test(`LF15–LF18 — ${tag}`, async ({ page }) => {
      /* LF15 */
      const L15 = new Ledger(`LF15-${tag}`);
      await open(page, route, root, { width: 1440, height: 700 });
      await scrollTo(page, root, 1500);
      const a = await reading(page, root);
      L15.check("the panel's top is --pin-cover + 14 (±1)", Math.abs(a.top - (a.cover + 14)) <= 1, `top ${a.top}, cover ${a.cover}`);
      L15.check("its bottom is at least 12px above the scrollport's", a.bottomGap >= 12, `${a.bottomGap}px`);
      L15.check("the body scrolls (content taller than the room)", !!a.body && a.body.sh > a.body.ch + 1, JSON.stringify(a.body));
      L15.check("the head and the foot are fully visible", a.headIn && a.footIn, `head ${a.headIn} foot ${a.footIn}`);
      L15.check("the foot carries the more-below shadow", a.more && a.footShadow !== "none", a.footShadow);
      /* the body scrolled to its end: no shadow */
      await page.evaluate((root) => { const b = document.querySelector<HTMLElement>(`${root} .fp-body`); b?.scrollTo({ top: 99999 }); }, root);
      await page.waitForTimeout(300);
      const end = await reading(page, root);
      L15.check("scrolled to its end, the foot has no shadow", !end.more && end.footShadow === "none", end.footShadow);
      /* keyboard: Tab to a control out of sight brings it into view inside the body, not the page */
      await page.evaluate((root) => { document.querySelector<HTMLElement>(`${root} .fp-body`)?.scrollTo({ top: 0 }); }, root);
      await page.waitForTimeout(200);
      const before = (await reading(page, root)).scrollTop;
      const last = page.locator(`${panelOf(root)} .fp-body button:not([disabled]) >> visible=true`).last();
      await last.focus();
      await page.waitForTimeout(300);
      const kb = await page.evaluate((root) => {
        const b = document.querySelector<HTMLElement>(`${root} .fp-body`)!, f = document.activeElement as HTMLElement;
        const br = b.getBoundingClientRect(), fr = f.getBoundingClientRect();
        return { inBody: b.contains(f), visible: fr.top >= br.top - 0.5 && fr.bottom <= br.bottom + 0.5, bodyTop: b.scrollTop };
      }, root);
      const after = (await reading(page, root)).scrollTop;
      L15.check("focus on a control out of sight scrolls the body to it, not the page", kb.inBody && kb.visible && kb.bodyTop > 0 && after === before, `${JSON.stringify(kb)} page ${before}→${after}`);
      L15.done(7);

      /* LF16 */
      const L16 = new Ledger(`LF16-${tag}`);
      await open(page, route, root, { width: 1717, height: 1200 });
      const r0 = await reading(page, root);
      L16.check("at rest: the body does not scroll", !!r0.body && r0.body.sh <= r0.body.ch + 1, JSON.stringify(r0.body));
      L16.check("at rest: no foot shadow", r0.footShadow === "none" && !r0.more, r0.footShadow);
      await scrollTo(page, root, 1500);
      const r1 = await reading(page, root);
      L16.check("scrolled: pinned at --pin-cover + 14 (±1)", Math.abs(r1.top - (r1.cover + 14)) <= 1, `top ${r1.top}, cover ${r1.cover}`);
      L16.check("scrolled: the body does not scroll, no shadow", !!r1.body && r1.body.sh <= r1.body.ch + 1 && r1.footShadow === "none", `${JSON.stringify(r1.body)} ${r1.footShadow}`);
      L16.done(4);

      /* LF17 */
      const L17 = new Ledger(`LF17-${tag}`);
      await open(page, route, root, { width: 1440, height: 900 });
      const covers: string[] = [];
      for (const y of [400, 900, 1500, 900, 400, 0]) {
        await scrollTo(page, root, y, 50);
        /* one frame after the variable changed: read on the next animation frame */
        await page.evaluate(() => new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res()))));
        const r = await reading(page, root);
        covers.push(`${y}:${r.cover}`);
        if (r.scrollTop > 0 && r.position === "sticky" && r.top <= r.cover + 14 + 1) {
          L17.check(`@${y}: pinned at --pin-cover + 14 (±1)`, Math.abs(r.top - (r.cover + 14)) <= 1, `top ${r.top}, cover ${r.cover}`);
          const overBar = r.slimBottom !== null && r.top < r.slimBottom - 0.5;
          L17.check(`@${y}: never over the collapsed bar`, !overBar, `top ${r.top}, bar bottom ${r.slimBottom}`);
        }
      }
      L17.check("the collapsed bar changed --pin-cover during the run (else the lock is vacuous)", new Set(covers.map((c) => c.split(":")[1])).size > 1, covers.join(" "));
      L17.done(5);

      /* LF18 — page content under 1000px wide: the folded layout */
      const L18 = new Ledger(`LF18-${tag}`);
      await open(page, route, root, { width: 1040, height: 800 });
      const f = await page.evaluate((root) => {
        const pg = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
        const rail = pg.querySelector<HTMLElement>(".qc153-rail.fp")!, main = pg.querySelector<HTMLElement>(".qc153-main")!;
        const b = rail.querySelector<HTMLElement>(".fp-body")!;
        return { content: Math.round(pg.getBoundingClientRect().width), above: rail.getBoundingClientRect().bottom <= main.getBoundingClientRect().top + 0.5,
          position: getComputedStyle(rail).position, maxH: getComputedStyle(rail).maxHeight, sh: b.scrollHeight, ch: b.clientHeight };
      }, root);
      L18.check("the page content is under 1000px wide", f.content < 1000, `${f.content}px`);
      if (tag === "a") {
        L18.check("the panel is above the list", f.above, JSON.stringify(f));
        L18.check("not pinned", f.position === "static" || f.position === "relative", f.position);
        L18.check("full height, nothing clipped (no max-height, the body does not scroll)", f.maxH === "none" && f.sh <= f.ch + 1, `${f.maxH} ${f.sh}/${f.ch}`);
      } else {
        /* the Queries list has no under-1000px fold (only the Agents sheet has one): there the panel must still pin and
           never be clipped by the cap */
        await scrollTo(page, root, 1500);
        const q = await reading(page, root);
        L18.check("Queries keeps two columns and the panel pins", q.position === "sticky" && Math.abs(q.top - (q.cover + 14)) <= 1, `${q.position} top ${q.top} cover ${q.cover}`);
        L18.check("nothing clipped: head and foot in view, 12px clear beneath", q.headIn && q.footIn && q.bottomGap >= 12, `gap ${q.bottomGap}`);
      }
      L18.done(tag === "a" ? 4 : 3);
    });
  }

  test("LF19 — the Agents panel with real-data shape", async ({ page }) => {
    const L = new Ledger("LF19");
    const restore = await makeTall();
    try {
      await open(page, "/agents", CL, { width: 1440, height: 900 });
      await scrollTo(page, CL, 1500);
      const r = await reading(page, CL);
      /* proved first: the content is taller than the room, or the lock is vacuous */
      const content = await page.evaluate((cl) => {
        const rail = document.querySelector<HTMLElement>(`${cl} .qc153-rail.fp`)!;
        const b = rail.querySelector<HTMLElement>(".fp-body")!;
        return rail.offsetHeight - b.clientHeight + b.scrollHeight;
      }, CL);
      const room = r.portH - r.cover - 14 - 12;
      L.check("the panel's content is taller than the room (proved first)", content > room, `content ${content} vs room ${room}`);
      L.check("pinned after scrolling 1500px: top = --pin-cover + 14 (±1)", Math.abs(r.top - (r.cover + 14)) <= 1 && r.position === "sticky", `top ${r.top}, cover ${r.cover}, ${r.position}`);
      L.check("the head and foot are in view", r.headIn && r.footIn, `head ${r.headIn} foot ${r.footIn}`);
      L.check("its body is taller inside than its box", !!r.body && r.body.sh > r.body.ch + 1, JSON.stringify(r.body));
      /* and it really scrolls: scrolled to its end, it has moved and its last control sits inside its box (content that
         merely overflows a clipped card passes the line above and fails this one) */
      const end = await page.evaluate((cl) => {
        const b = document.querySelector<HTMLElement>(`${cl} .qc153-rail.fp .fp-body`)!;
        b.scrollTo({ top: 99999 });
        const last = [...b.querySelectorAll<HTMLElement>("button")].filter((e) => e.getBoundingClientRect().height > 0).pop()!;
        const br = b.getBoundingClientRect(), lr = last.getBoundingClientRect();
        return { top: b.scrollTop, inside: lr.bottom <= br.bottom + 0.5 && lr.top >= br.top - 0.5 };
      }, CL);
      L.check("scrolled to its end, the body moved and its last control is in view", end.top > 0 && end.inside, JSON.stringify(end));
      L.done(5);
    } finally { await restore(); }
  });
}

/* ═══════════════════════════════ the screens ═══════════════════════════════ */
if (PHASE === "shots") {
  test("screens", async ({ page }) => {
    for (const [route, root, tag] of [["/queries", QC, "queries"], ["/agents", CL, "agents"]] as const) {
      await open(page, route, root, { width: 1440, height: 700 });
      await scrollTo(page, root, 1500);
      await page.screenshot({ path: `${DIR}/${tag}-1440x700-scrolled.png` });
      await open(page, route, root, { width: 1717, height: 1200 });
      await page.screenshot({ path: `${DIR}/${tag}-1717x1200.png` });
    }
  });
}
