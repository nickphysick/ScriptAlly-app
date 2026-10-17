/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v60.1 — the S locks, measured on the rendered page (ref design-refs/dashboard-v60-1/).
 *
 * S1 the eyebrow is the sidebar's status · S2 before the first query the header holds only "Where do
 * I start?"; once querying, the three buttons and no start button · S3 each answer rings exactly its
 * targets and dims the rest, and the founding panel never dims · S4 Escape closes the pop-up first,
 * then clears the spotlight, and focus comes back to the button · S5 no em dash in the first-use copy
 * (cards, tiles, pop-up) · S6 no tile description is cut · S7 choosing writes nothing and stores
 * nothing. Part E: fit at five sizes, three states, the pop-up open and closed.
 *
 * Fixtures are v60's (seedDash60.mjs): A day one = `db60-pre` + `__SA_DASH_NO_AGENTS`, B = `db60-pre`,
 * C = `seed-ms-1`. `DB601_MUTATE=<lock>` applies a lock's in-page break.
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/dashboard-v60-1";
const SIZES = [
  { width: 1280, height: 800 }, { width: 1440, height: 900 }, { width: 1512, height: 900 },
  { width: 1709, height: 849 }, { width: 1920, height: 1080 },
] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const MUT = process.env.DB601_MUTATE ?? "";
type State = { key: "A" | "B" | "C"; ms: string; flags: Record<string, unknown> };
const STATES: State[] = [
  { key: "A", ms: "db60-pre", flags: { __SA_DASH_NO_AGENTS: true } },
  { key: "B", ms: "db60-pre", flags: {} },
  { key: "C", ms: "seed-ms-1", flags: {} },
];
/* what each answer lights, by the page's own target attributes */
const WANT: Record<string, string[]> = {
  sent: ["queries", "tile:import"],
  agents: ["agents"],
  materials: ["tile:mats", "tile:comps", "tile:version"],
};

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

const MUTATIONS: Record<string, string> = {
  S3: `[data-d58="panel"] { opacity: .38 !important; }`,
  S6: `.d58 .d60-wp { font-size: 24px !important; }`,
};
const seed = (mode: "" | "--clean") => execSync(`node tests/e2e/seedDash60.mjs ${mode}`, { stdio: "pipe" }).toString().trim();
test.beforeAll(() => { seed(""); });
test.afterAll(() => { seed("--clean"); });

async function openDash(page: Page, vp: VP, s: State) {
  /* ⚠️ INIT SCRIPTS ACCUMULATE on one page, so every flag a state may set is cleared first */
  await page.addInitScript(([m, f, mut]) => {
    Object.assign(window, { __SA_DASH_NO_AGENTS: undefined, __SA_DASH_HOLD_MS: undefined, __SA_DASH_DROP: undefined }, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
    /* S7's break: a choice that remembers itself */
    if (mut === "S7") document.addEventListener("click", (e) => { if ((e.target as Element)?.closest?.('[data-wds="answer"]')) localStorage.setItem("sa.wdsSeen", "1"); }, true);
    /* S4's break: the button loses focus after Escape */
    if (mut === "S4") window.addEventListener("keydown", (e) => { if (e.key === "Escape") setTimeout(() => (document.activeElement as HTMLElement | null)?.blur(), 0); }, true);
  }, [s.ms, s.flags, MUT] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  if (MUT === "S1") await page.evaluate(() => { const e = document.querySelector('[data-d58="eyebrow"]'); if (e) e.textContent = "— NOW QUERYING —"; });
  if (MUT === "S2" && s.key !== "C") await page.evaluate(() => document.querySelector('[data-d58="buttons"]')?.insertAdjacentHTML("beforeend", '<button class="d58-btn" data-d58="btn-log">Log a query</button>'));
  if (MUT === "S5" && s.key !== "C") await page.evaluate(() => { const p = document.querySelector(".d60-wp"); if (p) p.textContent = "Your letter — synopsis"; });
  if (MUTATIONS[MUT]) await page.addStyleTag({ content: MUTATIONS[MUT] });
  await page.waitForTimeout(600);
}

const shot = async (page: Page, name: string) => {
  if (!process.env.DB601_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}.png`, animations: "disabled" });
};

const read = (page: Page) => page.evaluate(() => {
  const vis = (e: Element | null) => !!e && e.getBoundingClientRect().height > 0;
  const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const side = document.querySelector('.ws-ms--side [data-ms="standing"]') ?? document.querySelector('[data-ms="standing"]');
  const sideStatus = side ? (side.childNodes[0]?.textContent ?? "").trim() : null;
  const btns = document.querySelector('[data-d58="buttons"]');
  const buttons = btns ? [...btns.querySelectorAll<HTMLElement>("button")].map((b) => ({ d: b.dataset.d58 ?? b.dataset.wds ?? "", vis: vis(b) })) : [];
  const firstUse = [...document.querySelectorAll<HTMLElement>('.d60-card, .d60-way, [data-d60="lift-sub"], .wds')].filter(vis).map((e) => e.innerText);
  const descs = [...document.querySelectorAll<HTMLElement>(".d60-wp")].filter(vis).map((e) => ({ t: e.textContent ?? "", sh: e.scrollHeight, ch: e.clientHeight, cw: e.clientWidth, col: document.querySelector('[data-d58="right"]')?.getBoundingClientRect().width ?? 0 }));
  const sheet = document.querySelector(".ws-window")!.getBoundingClientRect();
  const scroller = document.querySelector<HTMLElement>(".ws-wbody")!;
  const pop = document.querySelector<HTMLElement>('[data-wds="pop"]');
  const popCut = pop ? [...pop.querySelectorAll<HTMLElement>(".wds-ct b, .wds-ct small, .wds-dests i, .wds-band span, .wds-lede")].filter((e) => e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1).map((e) => e.textContent) : [];
  const past = [...document.querySelectorAll<HTMLElement>('[data-d58="body"] .os-card, .d60-way, [data-d58="panel"], [data-d58="header"]')]
    .filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && (r.bottom > sheet.bottom + 0.5 || r.right > sheet.right + 0.5); }).map((e) => e.className);
  return {
    pre: document.querySelector('[data-d58="left"]')?.getAttribute("data-pre") ?? null,
    eyebrow: document.querySelector('[data-d58="eyebrow"]')?.textContent?.trim() ?? null,
    sideStatus, buttons, firstUse, descs, popCut, past,
    pop: box(pop), sheet: { x: sheet.x, y: sheet.y, r: sheet.right, b: sheet.bottom },
    scroller: { sh: scroller.scrollHeight, ch: scroller.clientHeight, sw: scroller.scrollWidth, cw: scroller.clientWidth },
  };
});

/* ── S1 · S2 · S5 · S6 · Part E — every state at every size, the pop-up shut and open ──────── */

test("DB601 S1 S2 S5 S6 E — eyebrow, header, copy and fit", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("states");
  for (const vp of SIZES) {
    for (const s of STATES) {
      await openDash(page, vp, s);
      const w = `${tag(vp)} ${s.key}`;
      let r = await read(page);
      await shot(page, `${s.key}-${tag(vp)}`);
      const pre = s.key !== "C";
      L.check("S1", `${w} population`, !!r.sideStatus, `sidebar status "${r.sideStatus}"`);
      L.check("S1", `${w} eyebrow is the sidebar's status`, !!r.sideStatus && r.eyebrow === `— ${r.sideStatus.toUpperCase()} —`, `eyebrow "${r.eyebrow}" · sidebar "${r.sideStatus}"`);
      L.check("S2", `${w} state`, r.pre === (pre ? "1" : "0"), `pre ${r.pre}`);
      if (pre) {
        L.check("S2", `${w} only "Where do I start?"`, r.buttons.length === 1 && r.buttons[0].d === "button" && r.buttons[0].vis, JSON.stringify(r.buttons));
      } else {
        const ds = r.buttons.map((b) => b.d);
        L.check("S2", `${w} the three buttons, no start button`, ["btn-log", "btn-record", "btn-agent"].every((d) => ds.includes(d)) && !ds.includes("button"), ds.join(","));
      }
      L.check("E", `${w} closed: one screen`, r.scroller.sh <= r.scroller.ch + 1 && r.scroller.sw <= r.scroller.cw + 1, `${r.scroller.sh}/${r.scroller.ch} · ${r.scroller.sw}/${r.scroller.cw}`);
      L.check("E", `${w} closed: nothing past the sheet`, r.past.length === 0, r.past.join(" | ") || "none");
      if (!pre) continue;
      /* S6 — no description cut (below 1400 the copy is not drawn at all, by v60's rule) */
      const wantDescs = vp.width >= 1401 ? 4 : 0;
      L.check("S6", `${w} population`, r.descs.length === wantDescs, `${r.descs.length} descriptions drawn, expected ${wantDescs}`);
      for (const d of r.descs) L.check("S6", `${w} "${d.t.slice(0, 24)}…"`, d.sh <= d.ch + 1, `${d.sh}/${d.ch} at ${d.cw}px of text, column ${d.col.toFixed(0)}`);
      /* S5 — no em dash in the cards and the tiles (the pop-up is read again once it is open) */
      L.check("S5", `${w} closed: population`, r.firstUse.length >= 4, `${r.firstUse.length} first-use surfaces`);
      const dashed0 = r.firstUse.filter((t) => t.includes("—"));
      L.check("S5", `${w} closed: no em dash`, dashed0.length === 0, dashed0.map((t) => t.slice(0, 50)).join(" | ") || "none");
      /* the pop-up, open — a page with no start button is a red, never a wait */
      if (await page.locator('[data-wds="button"]').count() === 0) { L.check("E", `${w} open: population`, false, "no start button"); continue; }
      await page.locator('[data-wds="button"]').click();
      await page.locator('[data-wds="pop"]').waitFor();
      await page.waitForTimeout(250);
      r = await read(page);
      await shot(page, `${s.key}-${tag(vp)}-open`);
      const wantW = vp.width < 1400 ? 400 : 460;
      L.check("E", `${w} open: population`, !!r.pop, "pop-up drawn");
      L.check("E", `${w} open: width`, !!r.pop && Math.abs(r.pop.w - wantW) <= 0.5, `${r.pop?.w} vs ${wantW}`);
      L.check("E", `${w} open: inside the sheet`, !!r.pop && r.pop.x >= r.sheet.x - 0.5 && r.pop.r <= r.sheet.r + 0.5 && r.pop.b <= r.sheet.b + 0.5, `pop ${JSON.stringify(r.pop)} · sheet ${JSON.stringify(r.sheet)}`);
      L.check("E", `${w} open: nothing cut`, r.popCut.length === 0, r.popCut.join(" | ") || "none");
      /* S5 — no em dash in the cards, the tiles and the pop-up */
      L.check("S5", `${w} population`, r.firstUse.length >= 4, `${r.firstUse.length} first-use surfaces`);
      const dashed = r.firstUse.filter((t) => t.includes("—"));
      L.check("S5", `${w} no em dash`, dashed.length === 0, dashed.map((t) => t.slice(0, 50)).join(" | ") || "none");
      await page.keyboard.press("Escape");
    }
  }
  /* C: 6 a size · A and B: 13, or 17 where the descriptions are drawn (1440 and up) */
  L.done(5 * 6 + 2 * 15 + 8 * 19);
});

/* ── S3 · S4 · S7 — the spotlight ─────────────────────────────────────────────────────────── */

const spot = (page: Page) => page.evaluate(() => {
  const ts = [...document.querySelectorAll<HTMLElement>("[data-spot]")].filter((e) => e.getBoundingClientRect().height > 0);
  const id = (e: HTMLElement) => e.dataset.d60 === "queries-door" ? "queries" : /agents/.test(e.dataset.d60 ?? "") ? "agents" : `tile:${e.dataset.key}`;
  const panel = document.querySelector<HTMLElement>('[data-d58="panel"]');
  return {
    ring: ts.filter((e) => e.dataset.spot === "ring").map(id),
    dim: ts.filter((e) => e.dataset.spot === "dim").map(id),
    dimOpacity: ts.filter((e) => e.dataset.spot === "dim").map((e) => getComputedStyle(e).opacity),
    tags: [...document.querySelectorAll<HTMLElement>('[data-wds="tag"]')].map((t) => id(t.parentElement as HTMLElement)),
    panelOpacity: panel ? getComputedStyle(panel).opacity : null,
    panelFilter: panel ? getComputedStyle(panel).filter : null,
    panelSpot: panel?.closest("[data-spot]") ? "inside a target" : null,
    pop: !!document.querySelector('[data-wds="pop"]'),
    focus: (document.activeElement as HTMLElement | null)?.dataset?.wds ?? document.activeElement?.tagName ?? null,
    expanded: document.querySelector('[data-wds="button"]')?.getAttribute("aria-expanded") ?? null,
  };
});

test("DB601 S3 S4 S7 — the answers light their targets, Escape unwinds in order, nothing is written", async ({ page }) => {
  test.setTimeout(600_000);
  const L = new Ledger("spotlight");
  const writes: string[] = [];
  page.on("request", (q) => { if (/Firestore\/Write|:commit|documents\/.*:batchWrite/.test(q.url())) writes.push(q.url()); });
  for (const vp of [SIZES[2], SIZES[0]]) {
    for (const s of STATES.filter((x) => x.key !== "C")) {
      await openDash(page, vp, s);
      const w = `${tag(vp)} ${s.key}`;
      const before = await page.evaluate(() => ({ ls: Object.keys(localStorage).sort(), ss: Object.keys(sessionStorage).sort() }));
      const w0 = writes.length;
      if (await page.locator('[data-wds="button"]').count() === 0) { L.check("S3", `${w} population`, false, "no start button"); continue; }
      for (const key of Object.keys(WANT)) {
        await page.locator('[data-wds="button"]').click();
        await page.locator(`[data-wds="answer"][data-key="${key}"]`).click();
        await page.waitForTimeout(450);
        await shot(page, `spot-${s.key}-${tag(vp)}-${key}`);
        const sp = await spot(page);
        const want = WANT[key];
        const others = ["queries", "agents", "tile:import", "tile:mats", "tile:comps", "tile:version"].filter((t) => !want.includes(t));
        L.check("S3", `${w} ${key} population`, sp.ring.length + sp.dim.length === 6, `${sp.ring.length} ringed + ${sp.dim.length} dimmed`);
        L.check("S3", `${w} ${key} rings exactly its targets`, JSON.stringify([...sp.ring].sort()) === JSON.stringify([...want].sort()), `ring ${sp.ring.join(",")}`);
        L.check("S3", `${w} ${key} dims every other target`, JSON.stringify([...sp.dim].sort()) === JSON.stringify([...others].sort()) && sp.dimOpacity.every((o) => Math.abs(Number(o) - 0.38) < 0.01), `dim ${sp.dim.join(",")} @ ${sp.dimOpacity.join(",")}`);
        L.check("S3", `${w} ${key} START HERE on the first target`, sp.tags.length === 1 && sp.tags[0] === want[0], sp.tags.join(",") || "none");
        L.check("S3", `${w} ${key} the founding panel never dims`, sp.panelOpacity === "1" && sp.panelFilter === "none" && !sp.panelSpot, `opacity ${sp.panelOpacity} · filter ${sp.panelFilter}`);
        L.check("S4", `${w} ${key} choosing closed the pop-up`, !sp.pop && sp.expanded === "false", `pop ${sp.pop} · expanded ${sp.expanded}`);
        /* S4 — reopen over the spotlight: Escape closes the pop-up first, focus returns, then Escape clears */
        await page.locator('[data-wds="button"]').click();
        await page.locator('[data-wds="pop"]').waitFor();
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
        const s1 = await spot(page);
        L.check("S4", `${w} ${key} first Escape closes the pop-up only`, !s1.pop && s1.ring.length === want.length, `pop ${s1.pop} · ring ${s1.ring.join(",")}`);
        L.check("S4", `${w} ${key} focus back on the button`, s1.focus === "button", `focus ${s1.focus}`);
        await page.keyboard.press("Escape");
        await page.waitForTimeout(150);
        const s2 = await spot(page);
        L.check("S4", `${w} ${key} second Escape clears the spotlight`, s2.ring.length === 0 && s2.dim.length === 0 && s2.tags.length === 0, `ring ${s2.ring.length} · dim ${s2.dim.length}`);
      }
      /* the other ways out: a click outside the ringed targets clears; ✕ closes */
      await page.locator('[data-wds="button"]').click();
      await page.locator('[data-wds="answer"][data-key="agents"]').click();
      await page.mouse.click(vp.width - 40, vp.height - 20);
      await page.waitForTimeout(150);
      L.check("S3", `${w} a click outside clears`, (await spot(page)).ring.length === 0, "cleared");
      await page.locator('[data-wds="button"]').click();
      await page.locator('[data-wds="close"]').click();
      const sx = await spot(page);
      L.check("S4", `${w} ✕ closes and returns focus`, !sx.pop && sx.focus === "button", `pop ${sx.pop} · focus ${sx.focus}`);
      /* S7 — nothing written, nothing stored */
      await page.waitForTimeout(800);
      const after = await page.evaluate(() => ({ ls: Object.keys(localStorage).sort(), ss: Object.keys(sessionStorage).sort() }));
      const newLs = after.ls.filter((k) => !before.ls.includes(k));
      const newSs = after.ss.filter((k) => !before.ss.includes(k));
      L.check("S7", `${w} no Firestore write`, writes.length === w0, `${writes.length - w0} write requests`);
      L.check("S7", `${w} no new storage key`, newLs.length === 0 && newSs.length === 0, `local [${newLs}] · session [${newSs}]`);
    }
  }
  L.done(4 * (3 * 9 + 4));
});
