/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DASHBOARD v59 — the DB59 locks, measured on the rendered page (ref design-refs/dashboard-v59/).
 *
 * R1 the right column · R2 the focus card's rust edge · V1 "View task →" lands and writes nothing ·
 * P1 the panel's copy · P2 the panel fits at every size · P3 the weekly pulse · P4 one feedback
 * panel · T1 the folder tab and its badge · S1 the hawk's shadow · S2 in front, then behind ·
 * E1 the first paint · F1 one screen · L1 loading does not jump. (P5 is the rules suite:
 * tests/rules/firestore.rules.test.ts, `/betaPulse`.)
 *
 * Every lock states its population first: a probe that finds nothing is a red, never a pass.
 * `DB59_MUTATE=<name>` applies a lock's named break in the page; the code mutations are run in the
 * worktree and recorded in reports/dashboard-v59/mutation-proofs.jsonl.
 *
 * ⚠️ THE CALLABLE IS NOT DEPLOYED, so P3 answers `sendWeeklyPulse` itself (`page.route`), once with a
 * yes and once with a refusal. The betaPulse rules are not deployed either, so every read of the
 * five weeks is refused on dev and the dots draw unanswered — which is the panel's own fallback.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";
import { readPng } from "./pngPixels";
import { harnessDb, snapshotQuery, stable } from "./harnessDocs";
import { isoWeekKey } from "../../src/lib/weeklyPulse";

const DIR = "reports/dashboard-v59";
const SIZES = [
  { width: 1920, height: 1080 }, { width: 1696, height: 820 }, { width: 1536, height: 864 }, { width: 1512, height: 900 },
  { width: 1440, height: 900 }, { width: 1366, height: 768 }, { width: 1280, height: 800 }, { width: 1280, height: 720 },
  { width: 1280, height: 680 }, { width: 1366, height: 650 }, { width: 1280, height: 650 },
] as const;
type VP = { width: number; height: number };
const tag = (v: VP) => `${v.width}x${v.height}`;
const V1512 = { width: 1512, height: 900 };
const MUT = process.env.DB59_MUTATE ?? "";

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
  "R2-edge-on-band": `.d58-focus::before { bottom: auto !important; height: 40px !important; }`,
  "P2-no-height-tiers": `.d59-fwnote, .d59-fwnote > span + span { display: block !important; }`,
  "S1-no-clip": `.d59-sheet { overflow: visible !important; }`,
  "S2-column-context": `[data-d58="right"] { position: relative !important; z-index: 1 !important; }`,
  "F1-panel-260": `.d59-fw { min-height: 260px !important; }`,
  "L1-no-panel-skeleton": `[data-d58="panel"][data-loading="1"] { display: none !important; }`,
};

async function openDash(page: Page, vp: VP, flags: Record<string, unknown> = {}, ms = "seed-ms-1") {
  await page.addInitScript(([f, m]) => {
    Object.assign(window, f);
    try { localStorage.setItem("scriptally_active_manuscript_id", m as string); } catch { /* private mode */ }
  }, [flags, ms] as const);
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"]').first().waitFor({ timeout: 12_000 }).catch(() => {});
  if (!("__SA_DASH_HOLD_MS" in flags)) {
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
  }
  await page.evaluate(() => document.fonts.ready);
  if (MUT === "R1-rows") {
    await page.evaluate(() => document.querySelector('[data-d58="rule"]')?.insertAdjacentHTML("beforebegin", '<div class="d58-row" data-d58="row">a restored row</div>'));
  } else if (MUT === "P1-copy") {
    await page.evaluate(() => { const e = document.querySelector('[data-d58="panel-note2"]'); if (e) e.textContent = "Your feedback is gratefully received!"; });
  } else if (MUTATIONS[MUT]) {
    await page.addStyleTag({ content: MUTATIONS[MUT] });
  }
  await page.waitForTimeout(700);
}

const shot = async (page: Page, name: string, vp: VP) => {
  if (!process.env.DB59_SHOTS) return;
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await page.screenshot({ path: `${DIR}/shots/${name}-${tag(vp)}.png`, animations: "disabled" });
};

/** One read of every box the fit and column locks ask about. */
const readPage = (page: Page) => page.evaluate(() => {
  const q = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
  const box = (e: Element | null) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }; };
  const right = q('[data-d58="right"]');
  const scroller = document.querySelector<HTMLElement>(".ws-wbody");
  const panel = q('[data-d58="panel"]');
  const frame = panel?.querySelector(".d59-fwframe") ?? null;
  const fb = frame?.getBoundingClientRect();
  const panelEscapes: string[] = [];
  let panelN = 0;
  if (panel && fb) {
    for (const el of panel.querySelectorAll<HTMLElement>("*")) {
      if (el.closest("svg")) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      panelN += 1;
      if (r.bottom > fb.bottom + 1 || r.top < fb.top - 1 || r.right > fb.right + 1 || r.left < fb.left - 1) panelEscapes.push(`${el.className || el.tagName} ${Math.round(r.left)},${Math.round(r.top)}→${Math.round(r.right)},${Math.round(r.bottom)}`);
    }
  }
  const shown = (s: string) => { const e = panel?.querySelector<HTMLElement>(s); return !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== "none"; };
  const h = q('[data-d58="panel-h"]');
  const title = q('[data-d58="list-title"]');
  const rule = q('[data-d58="rule"]');
  const kids = right ? [...right.children].map((c) => (c as HTMLElement).dataset.d58 ?? c.className) : [];
  return {
    kids,
    right: box(right), titleRow: box(q('[data-d58="title-row"]')), title: box(title), all: box(q('[data-d58="list-all"]')),
    allText: q('[data-d58="list-all"]')?.textContent ?? null,
    titleFits: title ? title.scrollWidth <= title.clientWidth + 0.5 : null,
    focus: box(q('[data-d58="focus"]')), rule: box(rule), ruleBg: rule ? getComputedStyle(rule).backgroundColor : null,
    panel: box(panel), tab: box(q('[data-d58="tab"]')), sheet: box(document.querySelector(".ws-window")),
    /* RE-POINTED (Dashboard v60): the left column's lowest card is the Closed hoop's row */
    closed: box(q('[data-d60="closed-hoop"]')),
    rows: document.querySelectorAll('[data-d58="row"], [data-d58="group"], [data-d58="then"]').length,
    scroller: scroller ? { sh: scroller.scrollHeight, ch: scroller.clientHeight, sw: scroller.scrollWidth, cw: scroller.clientWidth } : null,
    doc: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight },
    panelN, panelEscapes: panelEscapes.slice(0, 5),
    headingFits: h ? h.scrollWidth <= h.clientWidth + 0.5 : null,
    tiers: { art: shown('[data-d58="panel-art"]'), hist: shown('[data-d58="panel-hist"]'), cap: shown('[data-d58="panel-cap"]'), note1: shown('[data-d58="panel-note1"]'), note2: shown('[data-d58="panel-note2"]'), note: shown('[data-d58="panel-note"]'), faces: shown('[data-d58="panel-faces"]'), sig: shown('[data-d58="panel-sig"]'), heading: shown('[data-d58="panel-h"]'), poster: panel ? getComputedStyle(panel.querySelector(".d59-fwrow")!).flexWrap === "wrap" : false },
  };
});

/* ── R1 · F1 · P2 — every listed size ───────────────────────────────────────────────────────── */

test("DB59 R1 · F1 · P2 — the column, one screen, and the panel fits", async ({ page }) => {
  const L = new Ledger("fit");
  const heights: Record<string, unknown> = {};
  for (const vp of SIZES) {
    await openDash(page, vp);
    const p = await readPage(page);
    const w = tag(vp);
    heights[w] = { panel: p.panel && Math.round(p.panel.h), focus: p.focus && Math.round(p.focus.h), tiers: p.tiers };
    await shot(page, "page", vp);
    /* R1 */
    L.check("R1", `${w} population`, !!p.right && !!p.focus && !!p.panel && !!p.rule, `right ${!!p.right} · focus ${!!p.focus} · rule ${!!p.rule} · panel ${!!p.panel}`);
    L.check("R1", `${w} order`, p.kids.join(">") === "list-head>focus>rule>panel" || p.kids.join(">") === "list-head>focus>coming-extra>rule>panel", p.kids.join(">"));
    L.check("R1", `${w} "All {n} →" inside the column`, !!p.all && !!p.right && p.all.r <= p.right.r + 0.5 && /^All \d+ →$/.test(p.allText ?? ""), `${p.allText} · link right ${p.all?.r.toFixed(1)} · column right ${p.right?.r.toFixed(1)}`);
    L.check("R1", `${w} the title never overflows`, p.titleFits === true, `scrollWidth ≤ clientWidth: ${p.titleFits}`);
    L.check("R1", `${w} the link on the title's first line`, !!p.all && !!p.title && p.all.y >= p.title.y - 1 && p.all.b <= p.title.b + 1, `title ${p.title?.y.toFixed(1)}→${p.title?.b.toFixed(1)} · link ${p.all?.y.toFixed(1)}→${p.all?.b.toFixed(1)}`);
    L.check("R1", `${w} the hairline`, !!p.rule && Math.abs(p.rule.h - 1) < 0.01 && p.ruleBg === "rgba(28, 19, 15, 0.18)" && !!p.right && Math.abs(p.rule.w - p.right.w) < 1, `${p.rule?.h}px · ${p.ruleBg} · ${p.rule?.w.toFixed(1)} of ${p.right?.w.toFixed(1)}`);
    L.check("R1", `${w} no list rows, group headings or "Then"`, p.rows === 0, `${p.rows} found`);
    /* F1 */
    const s = p.scroller!;
    L.check("F1", `${w} one screen`, !!s && s.sh <= s.ch + 1, `scroller ${s?.sh} in ${s?.ch}`);
    L.check("F1", `${w} no horizontal overflow`, !!s && s.sw <= s.cw + 1 && p.doc.sw <= p.doc.cw + 1, `scroller ${s?.sw}/${s?.cw} · doc ${p.doc.sw}/${p.doc.cw}`);
    /* P2 */
    L.check("P2", `${w} population`, p.panelN > 8, `${p.panelN} boxes in the panel`);
    L.check("P2", `${w} the panel ends 22px above the tab`, !!p.panel && !!p.tab && p.panel.b <= p.tab.y - 22 + 1, `panel bottom ${p.panel?.b.toFixed(1)} · tab top ${p.tab?.y.toFixed(1)} · gap ${p.panel && p.tab ? (p.tab.y - p.panel.b).toFixed(1) : "?"}`);
    /* ⚠️ THE LEFT COLUMN IS NOT HELD 22px ABOVE THE TAB'S LINE (a deviation from Part C, see the report):
       it keeps v58's foot, because the tab is not over it and the kept chart clipped. It must still
       never be under the tab, fillets included. */
    L.check("P2", `${w} the tab is never over the left column`, !!p.closed && !!p.tab && p.closed.r <= p.tab.x - 12, `closed right ${p.closed?.r.toFixed(1)} · tab left ${p.tab?.x.toFixed(1)} (−12 for the fillet)`);
    L.check("P2", `${w} nothing escapes the frame`, p.panelEscapes.length === 0, p.panelEscapes.join(" | ") || "none");
    L.check("P2", `${w} the heading never overflows`, p.headingFits === true && p.tiers.heading && p.tiers.faces && p.tiers.sig, `fits ${p.headingFits} · heading ${p.tiers.heading} faces ${p.tiers.faces} sig ${p.tiers.sig}`);
    const t = p.tiers;
    if (w === "1696x820") L.check("P2", `${w} art, dots and both sentences`, t.art && t.hist && t.note1 && t.note2, JSON.stringify(t));
    if (w === "1280x800") L.check("P2", `${w} no art, both sentences`, !t.art && t.note1 && t.note2, JSON.stringify(t));
    if (w === "1280x680") L.check("P2", `${w} the first sentence only`, t.note1 && !t.note2, JSON.stringify(t));
    if (w === "1280x650") L.check("P2", `${w} the note goes; heading and faces stay`, !t.note && t.heading && t.faces, JSON.stringify(t));
    if (w === "1920x1080") L.check("P2", `${w} the poster tier`, t.poster, JSON.stringify(t));
  }
  mkdirSync(DIR, { recursive: true });
  writeFileSync(`${DIR}/heights${MUT ? `.mut-${MUT}` : ""}.json`, JSON.stringify(heights, null, 1));
  L.done(SIZES.length * 14 + 5);
});

/* ── R2 — the rust edge ─────────────────────────────────────────────────────────────────────── */

test("DB59 R2 — the focus card's rust edge", async ({ page }) => {
  const L = new Ledger("edge");
  for (const vp of [V1512, { width: 1280, height: 680 }]) {
    await openDash(page, vp);
    const e = await page.evaluate(() => {
      const f = document.querySelector<HTMLElement>('[data-d58="focus"]');
      if (!f) return null;
      const c = getComputedStyle(f, "::before");
      return { content: c.content, w: parseFloat(c.width), h: parseFloat(c.height), bg: c.backgroundColor, left: c.left, top: c.top, fh: f.getBoundingClientRect().height };
    });
    const w = tag(vp);
    L.check("R2", `${w} population`, !!e && e.content !== "none", JSON.stringify(e));
    L.check("R2", `${w} 6px of rgb(162, 69, 42), full height`, !!e && e.w === 6 && e.bg === "rgb(162, 69, 42)" && Math.abs(e.h - e.fh) <= 0.5 && e.left === "0px" && e.top === "0px", JSON.stringify(e));
  }
  L.done(4);
});

/* ── V1 — "View task →" opens where the task is completed, and writes nothing ──────────────── */

test("DB59 V1 — View task lands, and writes nothing", async ({ page }) => {
  test.setTimeout(900_000);
  const L = new Ledger("view-task");
  const states: { name: string; drop: string[]; ms?: string }[] = [
    { name: "A as the account stands", drop: [] },
    { name: "B no agents waiting", drop: ["req"] },
    { name: "B2 gone quiet", drop: ["req", "nudge"] },
    { name: "C housekeeping only", drop: ["req", "nudge", "quiet"] },
    { name: "D ready to query", drop: ["req", "nudge", "quiet", "house"] },
    { name: "E coming up", drop: ["req", "nudge", "quiet", "house", "ready"] },
  ];
  /* RETIRED (Dashboard v60): the "F first run" state. Before the first query the right column is "Ready
     for lift off?" and there is no focus card to press; DB60 P1 holds that swap, and the left column's
     doors carry "Log a query" and "Add an agent". */
  const seen: Record<string, string> = {};
  for (const s of states) {
    await openDash(page, V1512, { __SA_DASH_DROP: s.drop }, s.ms);
    const f = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-d58="focus"]');
      return el ? { group: el.dataset.group ?? "", key: el.dataset.key ?? "", query: el.dataset.query ?? "", act: el.querySelector('[data-d58="focus-act"]')?.textContent ?? "" } : null;
    });
    L.check("V1", `${s.name} · the button`, !!f && f.act === "View task →", `${f?.group} · "${f?.act}"`);
    if (!f) continue;
    seen[s.name] = f.group;
    const before = f.query ? await snapshotQuery(f.query).catch(() => null) : null;
    if (["req", "nudge", "quiet", "coming"].includes(f.group)) L.check("V1", `${s.name} · the query is known`, !!before, f.query || "none");
    const dialogsBefore = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter((e) => e.getBoundingClientRect().width > 0).length);
    await page.locator('[data-d58="focus-act"]').click();
    await page.waitForTimeout(1200);
    const land = await page.evaluate(() => ({
      panel: [...document.querySelectorAll<HTMLElement>("[data-qp='panel']")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute("data-qp-id")),
      drawer: [...document.querySelectorAll<HTMLElement>("[data-qad-drawer]")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute("data-qad-drawer") ?? "drawer"),
      agent: [...document.querySelectorAll<HTMLElement>(".ac.agent-card")].filter((e) => e.getBoundingClientRect().width > 0).length,
      dialogs: [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter((e) => e.getBoundingClientRect().width > 0).length,
      path: location.pathname,
    }));
    const where = land.panel.length ? `query panel ${land.panel[0]}` : land.agent ? "agent card" : land.drawer.length ? `drawer ${land.drawer[0]}` : `${land.path} · ${land.dialogs - dialogsBefore} new dialog(s)`;
    const expect = f.group === "house" && f.key.startsWith("hk:") ? "agent card"
      : f.group === "ready" || f.key === "start:query" ? "drawer"
        : f.key.startsWith("start:") ? "route"
          : "query panel";
    const ok = expect === "query panel" ? land.panel.length === 1 && land.panel[0] === f.query && land.drawer.length === 0
      : expect === "agent card" ? land.agent > 0 && land.panel.length === 0
        : expect === "drawer" ? land.drawer.length > 0 && land.panel.length === 0
          : land.path !== "/dashboard" || land.drawer.length > 0 || land.dialogs > dialogsBefore;
    L.check("V1", `${s.name} · lands on the ${expect}`, ok, `${f.key} → ${where}`);
    if (before) {
      await page.waitForTimeout(600);
      const after = await snapshotQuery(f.query).catch(() => null);
      L.check("V1", `${s.name} · nothing written`, !!after && stable(after) === stable(before), after ? (stable(after) === stable(before) ? "query, log and flags unchanged" : "the query changed") : "no reading");
    }
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }
  console.log(`  V1 kinds seen: ${JSON.stringify(seen)}`);
  L.check("V1", "four or more kinds entered", new Set(Object.values(seen)).size >= 4, JSON.stringify(seen));
  L.done(16);
});

/* ── P1 · P4 — the copy, and the one feedback panel ─────────────────────────────────────────── */

const COPY = {
  band: "— FOUNDING WRITER —", more: "Tell us anything →", heading: "The early bird gets the worm.",
  note1: "Thank you for helping shape QueryHawk for future writers.", note2: "Finding it useful? We’d love to hear your feedback!",
  sig: "— Nick, founder", cap: "This week?", faces: ["Lost", "Meh", "Good", "Loving it"],
};

test("DB59 P1 · P4 — the panel's copy, and its doors open the one feedback panel", async ({ page }) => {
  const L = new Ledger("panel-copy");
  await openDash(page, { width: 1696, height: 820 });
  const c = await page.evaluate(() => {
    const p = document.querySelector('[data-d58="panel"]');
    const t = (s: string) => p?.querySelector(s)?.textContent ?? null;
    return {
      band: p?.querySelector('[data-d58="panel-band"] > span')?.textContent ?? null, more: t('[data-d58="panel-more"]'), heading: t('[data-d58="panel-h"]'),
      note1: t('[data-d58="panel-note1"]'), note2: t('[data-d58="panel-note2"]'), sig: t('[data-d58="panel-sig"]'), cap: t('[data-d58="panel-cap"]'),
      faces: [...(p?.querySelectorAll('[data-d58="panel-face"]') ?? [])].map((f) => f.getAttribute("data-label")),
      titles: p ? p.querySelectorAll("[title]").length : -1,
    };
  });
  L.check("P1", "population", c.faces.length === 4, JSON.stringify(c));
  for (const k of ["band", "more", "heading", "note1", "note2", "sig", "cap"] as const) L.check("P1", k, c[k] === COPY[k], `"${c[k]}"`);
  L.check("P1", "the face labels", c.faces.join("|") === COPY.faces.join("|"), c.faces.join("|"));
  L.check("P1", "no native title in the panel", c.titles === 0, `${c.titles} [title]`);

  const docks = () => page.locator(".sa-fbpanel").count();
  L.check("P4", "closed at rest", (await docks()) === 0, `${await docks()} open`);
  await page.locator('[data-d58="panel-more"]').click();
  await page.waitForTimeout(400);
  if (MUT === "P4-second-panel") await page.evaluate(() => { const d = document.querySelector(".sa-fbpanel"); if (d) document.body.appendChild(d.cloneNode(true)); });
  L.check("P4", "Tell us anything opens one feedback panel", (await docks()) === 1, `${await docks()} panel(s)`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  if ((await docks()) > 0) await page.locator(".sa-fbpanel button[aria-label*='lose' i], .sa-fbpanel .sa-fbx").first().click({ timeout: 1500 }).catch(() => {});
  await page.waitForTimeout(300);
  const sidebar = page.locator('[data-probe="feedback"]:visible, .ws-fbb:visible, .ws-fbi:visible').first();
  const hasSidebar = (await sidebar.count()) > 0;
  L.check("P4", "the sidebar's Give feedback is on the page", hasSidebar, `${hasSidebar}`);
  if (hasSidebar) {
    if ((await docks()) > 0) await sidebar.click(); // a toggle: close it first
    await page.waitForTimeout(200);
    await sidebar.click();
    await page.waitForTimeout(400);
    L.check("P4", "the sidebar opens the same, single panel", (await docks()) === 1, `${await docks()} panel(s)`);
  }
  L.done(13);
});

/* ── P3 — the weekly pulse ──────────────────────────────────────────────────────────────────── */

test("DB59 P3 — a face records the week, and only a yes says Noted", async ({ page, context }) => {
  const L = new Ledger("pulse");
  const week = isoWeekKey(new Date());
  const calls: unknown[] = [];
  let answer: "yes" | "no" = "yes";
  await context.route("**/sendWeeklyPulse", async (route) => {
    calls.push(route.request().postDataJSON());
    if (MUT === "P3-noted-early") await new Promise((r) => setTimeout(r, 1500));
    if (answer === "yes") await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true } }) });
    else await route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: { status: "INTERNAL", message: "no" } }) });
  });
  const { uid } = await harnessDb();
  /* a clean week on the FIRST load only: the reload below must find what the yes stored */
  await page.addInitScript(([u, w]) => { try { if (!sessionStorage.getItem("db59-p3")) { localStorage.removeItem(`sa.pulse.${u}.${w}`); sessionStorage.setItem("db59-p3", "1"); } } catch { /* */ } }, [uid, week] as const);
  await openDash(page, V1512);
  const read = () => page.evaluate(() => {
    const p = document.querySelector('[data-d58="panel"]');
    return {
      state: p?.getAttribute("data-state"), noted: p?.querySelector('[data-d58="panel-noted"]')?.textContent ?? null,
      faces: p?.querySelectorAll('[data-d58="panel-face"]').length ?? 0, failed: p?.querySelector('[data-d58="panel-failed"]')?.textContent ?? null,
      now: p?.querySelector('[data-d58="panel-hist"] i.now')?.getAttribute("data-m") ?? null,
      on: [...(p?.querySelectorAll('[data-d58="panel-face"].on') ?? [])].map((f) => f.getAttribute("data-label")),
    };
  });
  const r0 = await read();
  L.check("P3", "population: four faces, unanswered", r0.faces === 4 && r0.state === "idle", JSON.stringify(r0));
  /* a yes */
  await page.locator('[data-d58="panel-face"][data-label="Good"]').click();
  const early = await read();
  if (MUT === "P3-noted-early") L.check("P3", "nothing says Noted before the answer", !early.noted, JSON.stringify(early));
  await page.waitForTimeout(MUT === "P3-noted-early" ? 2200 : 800);
  const r1 = await read();
  const body = calls[0] as { data?: { mood?: number; week?: string } } | undefined;
  L.check("P3", "one call, with mood 3 and this ISO week", calls.length === 1 && body?.data?.mood === 3 && body?.data?.week === week, `${calls.length} call(s) · ${JSON.stringify(body)} · expected ${week}`);
  L.check("P3", "Noted, and this week's dot reads Good", /Noted — thank you\./.test(r1.noted ?? "") && r1.now === "3" && r1.faces === 1 && r1.on[0] === "Good", JSON.stringify(r1));
  /* the Noted state is cut nowhere: Say more and Change both inside the frame, at a wide and a short size */
  for (const vp of [V1512, { width: 1280, height: 680 }]) {
    await page.setViewportSize(vp);
    await page.waitForTimeout(500);
    const fit = await page.evaluate(() => {
      const fr = document.querySelector('[data-d58="panel"] .d59-fwframe')!.getBoundingClientRect();
      const out: string[] = [];
      for (const s of ['[data-d58="panel-say"]', '[data-d58="panel-change"]', '[data-d58="panel-noted"] b', '[data-d58="panel-face"]']) {
        const e = document.querySelector(s); const r = e?.getBoundingClientRect();
        if (!r || r.width === 0) { out.push(`${s} missing`); continue; }
        if (r.right > fr.right + 1 || r.bottom > fr.bottom + 1 || r.left < fr.left - 1 || r.top < fr.top - 1) out.push(`${s} ${Math.round(r.right)}/${Math.round(fr.right)} ${Math.round(r.bottom)}/${Math.round(fr.bottom)}`);
      }
      return out;
    });
    L.check("P3", `${tag(vp)} the Noted line is cut nowhere`, fit.length === 0, fit.join(" | ") || "all inside the frame");
  }
  await page.setViewportSize(V1512);
  /* a stored answer: the panel loads Noted */
  await page.reload();
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  const r2 = await read();
  L.check("P3", "a stored answer for this week loads Noted", r2.state === "noted" && r2.on[0] === "Good", JSON.stringify(r2));
  /* a refusal: Change, then a face the server refuses */
  answer = "no";
  await page.locator('[data-d58="panel-change"]').click();
  await page.waitForTimeout(200);
  await page.locator('[data-d58="panel-face"][data-label="Meh"]').click();
  await page.waitForTimeout(900);
  const r3 = await read();
  L.check("P3", "a refusal: no Noted, the faces back, the failure line", !r3.noted && r3.faces === 4 && r3.failed === "That didn't send. Try again?", JSON.stringify(r3));
  L.check("P3", "the refused face clears back to the stored answer", r3.on.join() === "Good", JSON.stringify(r3.on));
  await page.evaluate(([u, w]) => { try { localStorage.removeItem(`sa.pulse.${u}.${w}`); } catch { /* */ } }, [uid, week] as const);
  L.done(8);
});

/* ── T1 — the folder tab and its badge ──────────────────────────────────────────────────────── */

test("DB59 T1 — the folder tab on the sheet's edge, and its unseen badge", async ({ page }) => {
  const L = new Ledger("tab");
  const { uid } = await harnessDb();
  const key = `sa.feedSeenAt.${uid}`;
  /* everything in the window unseen: the badge counts every row the drawer shows */
  await page.addInitScript(([k]) => { try { if (!sessionStorage.getItem("db59-t1")) { localStorage.setItem(k, "1"); sessionStorage.setItem("db59-t1", "1"); } } catch { /* */ } }, [key] as const);
  await openDash(page, V1512);
  const t = await page.evaluate(() => {
    const tab = document.querySelector<HTMLElement>('[data-d58="tab"]');
    const win = document.querySelector(".ws-window")!.getBoundingClientRect();
    const probe = document.createElement("i");
    probe.style.background = "var(--ink-shell)";
    document.body.appendChild(probe);
    const desk = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return tab ? { text: tab.textContent, bottom: tab.getBoundingClientRect().bottom, sheet: win.bottom, bg: getComputedStyle(tab).backgroundColor, desk, badge: tab.querySelector('[data-d58="tab-badge"]')?.textContent ?? null } : null;
  });
  L.check("T1", "population", !!t, JSON.stringify(t));
  L.check("T1", "no LAST 30 DAYS", !!t && !/LAST 30 DAYS/i.test(t.text ?? ""), `"${t?.text}"`);
  L.check("T1", "on the sheet's bottom edge", !!t && Math.abs(t.bottom - t.sheet) <= 1, `tab ${t?.bottom} · sheet ${t?.sheet}`);
  L.check("T1", "the desk's colour", !!t && t.bg === t.desk && t.bg !== "rgba(0, 0, 0, 0)", `${t?.bg} · desk ${t?.desk}`);
  await page.locator('[data-d58="tab"]').click();
  await page.waitForTimeout(700);
  const rows = await page.locator('[data-d58="ev"]').count();
  const expected = rows > 9 ? "9+" : rows === 0 ? null : String(rows);
  L.check("T1", "the badge is the unseen count", rows > 0 && t?.badge === expected, `badge ${t?.badge} · ${rows} rows in the drawer → ${expected}`);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(500);
  const afterOpen = await page.locator('[data-d58="tab-badge"]').count();
  L.check("T1", "opening the drawer clears it", afterOpen === 0, `${afterOpen} badge(s)`);
  await page.reload();
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
  await page.waitForTimeout(800);
  const afterReload = await page.locator('[data-d58="tab-badge"]').count();
  L.check("T1", "and stays cleared after a reload", afterReload === 0, `${afterReload} badge(s)`);
  L.done(7);
});

/* ── S1 · S2 — the hawk's shadow, and a hovered card in front of it ─────────────────────────── */

test("DB59 S1 · S2 — one shadow over the cards, and a hovered card comes forward", async ({ page, browser }) => {
  const L = new Ledger("shadow");
  await openDash(page, V1512);
  const s = await page.evaluate(() => {
    const all = document.querySelectorAll('[data-d58="shadow"]');
    const e = all[0] as HTMLElement | undefined;
    const c = e ? getComputedStyle(e) : null;
    const sheet = e?.parentElement ? getComputedStyle(e.parentElement) : null;
    const sc = document.querySelector<HTMLElement>(".ws-wbody")!;
    return c ? { n: all.length, pe: c.pointerEvents, op: Number(c.opacity), blend: c.mixBlendMode, layerOverflow: sheet?.overflow, sh: sc.scrollHeight, ch: sc.clientHeight, win: (document.querySelector(".ws-window") as HTMLElement).scrollHeight - (document.querySelector(".ws-window") as HTMLElement).clientHeight } : null;
  });
  L.check("S1", "exactly one shadow", s?.n === 1, JSON.stringify(s));
  L.check("S1", "no pointer events, .145, multiply", !!s && s.pe === "none" && Math.abs(s.op - 0.145) <= 0.005 && s.blend === "multiply", JSON.stringify(s));
  L.check("S1", "the sheet clips it, and it adds no scroll", !!s && s.layerOverflow === "clip" && s.sh <= s.ch + 1 && s.win <= 0, JSON.stringify(s));
  /* the drift: with motion allowed it moves; under reduced motion it does not */
  await liftMotionSuppression(page);
  const tr = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-d58="shadow"]')!).transform);
  const a = await tr(); await page.waitForTimeout(5000); const b = await tr();
  L.check("S1", "it drifts", a !== b, `${a} → ${b}`);
  const ctx = await browser.newContext({ storageState: await page.context().storageState(), reducedMotion: "reduce", viewport: V1512 });
  const rp = await ctx.newPage();
  await openDash(rp, V1512);
  await liftMotionSuppression(rp);
  const ra = await rp.evaluate(() => getComputedStyle(document.querySelector('[data-d58="shadow"]')!).transform);
  await rp.waitForTimeout(5000);
  const rb = await rp.evaluate(() => getComputedStyle(document.querySelector('[data-d58="shadow"]')!).transform);
  L.check("S1", "and not under reduced motion", ra === rb, `${ra} → ${rb}`);

  /* S2 — find the focus card's pixels the shadow darkens, then hover */
  const focus = (await rp.locator('[data-d58="focus"]').boundingBox())!;
  const clip = { x: Math.round(focus.x) + 10, y: Math.round(focus.y) + 60, width: Math.round(focus.width) - 20, height: Math.round(focus.height) - 70 };
  await rp.addStyleTag({ content: `/*s2*/[data-d58="shadow"]{visibility:hidden!important}` });
  const bare = readPng(await rp.screenshot({ clip }));
  await rp.evaluate(() => document.querySelectorAll("style").forEach((s) => { if (s.textContent?.startsWith("/*s2*/")) s.remove(); }));
  await rp.mouse.move(5, 5);
  await rp.waitForTimeout(200);
  const rest = readPng(await rp.screenshot({ clip }));
  const pts: [number, number][] = [];
  for (let y = 4; y < bare.height - 4; y += 6) for (let x = 4; x < bare.width - 4; x += 6) {
    const [r, g, bl] = bare.at(x, y);
    if (r < 250 || g < 250 || bl < 250) continue; // flat white only, so a 2px lift cannot move content under the point
    const [r2, g2, b2] = rest.at(x, y);
    if (r - r2 >= 6 && g - g2 >= 6 && bl - b2 >= 6) pts.push([x, y]);
  }
  L.check("S2", "population: the shadow crosses the focus card", pts.length >= 10, `${pts.length} darkened white points`);
  await rp.mouse.move(focus.x + focus.width / 2, focus.y + 20);
  await rp.waitForTimeout(300);
  const hov = readPng(await rp.screenshot({ clip }));
  const lighter = pts.filter(([x, y]) => { const [r, g, bl] = rest.at(x, y); const [r2, g2, b2] = hov.at(x, y); return r2 - r >= 6 && g2 - g >= 6 && b2 - bl >= 6; }).length;
  L.check("S2", "at rest darker than hovered (the card is in front of the shadow)", pts.length > 0 && lighter >= pts.length * 0.9, `${lighter} of ${pts.length} points lighter when hovered`);
  const hovT = await rp.evaluate(() => { const f = document.querySelector('[data-d58="focus"]')!; return { t: getComputedStyle(f).transform, z: getComputedStyle(f).zIndex, sz: getComputedStyle(document.querySelector('[data-d58="shadow"]')!).zIndex }; });
  L.check("S2", "under reduced motion: no transform, but above the shadow", hovT.t === "none" && Number(hovT.z) > Number(hovT.sz), JSON.stringify(hovT));
  await ctx.close();
  L.done(8);
});

/* ── E1 — the first paint ───────────────────────────────────────────────────────────────────── */

test("DB59 E1 — the first paint runs once, ends true, and not under reduced motion", async ({ page, browser }) => {
  const L = new Ledger("paint");
  await openDash(page, V1512);
  /* a fresh visit with motion allowed */
  await page.goto("/dashboard");
  const sawPaint = await page.locator('.d58[data-paint="1"]').waitFor({ timeout: 20_000 }).then(() => true, () => false);
  const mid = await page.evaluate(() => ({ left: getComputedStyle(document.querySelector(".d58-left")!).animationName, right: getComputedStyle(document.querySelector(".d58-right")!).animationName, counts: [...document.querySelectorAll('[data-d58="count"]')].length }));
  L.check("E1", "the paint runs on loading → loaded", sawPaint && mid.left === "d59Rise" && mid.right === "d59Rise" && mid.counts >= 3, JSON.stringify({ sawPaint, ...mid }));
  await page.waitForTimeout(1800);
  const end = await page.evaluate(() => ({
    attr: document.querySelector(".d58")?.getAttribute("data-paint") ?? null,
    figures: [...document.querySelectorAll<HTMLElement>('[data-d58="count"]')].map((e) => ({ text: e.textContent, value: e.getAttribute("value"), shown: getComputedStyle(e, "::after").content })),
  }));
  L.check("E1", "it ends, and the figures are the true figures", end.attr === null && end.figures.every((f) => f.text?.replace(/,/g, "") === f.value && f.shown === "none"), JSON.stringify(end));
  /* not again: a drawer open and close, a resize, a re-render */
  await page.locator('[data-d58="tab"]').click();
  await page.waitForTimeout(600);
  await page.keyboard.press("Escape");
  await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(300);
  await page.locator('[data-d58="focus-next"]').click({ timeout: 2000 }).catch(() => {});
  const again = await page.evaluate(() => new Promise<boolean>((res) => {
    const root = document.querySelector(".d58");
    let seen = root?.getAttribute("data-paint") === "1";
    const mo = new MutationObserver(() => { if (root?.getAttribute("data-paint") === "1") seen = true; });
    if (root) mo.observe(root, { attributes: true });
    setTimeout(() => { mo.disconnect(); res(seen); }, 1500);
  }));
  L.check("E1", "not after a drawer close, a resize or a step", again === false, `paint seen again: ${again}`);
  /* reduced motion */
  const ctx = await browser.newContext({ storageState: await page.context().storageState(), reducedMotion: "reduce", viewport: V1512 });
  const rp = await ctx.newPage();
  await openDash(rp, V1512);
  await rp.goto("/dashboard");
  await rp.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 });
  const running = await rp.evaluate(() => new Promise<number>((res) => setTimeout(() => res(document.getAnimations().filter((a) => a.playState === "running" && (a.effect as KeyframeEffect | null)?.target instanceof Element && ((a.effect as KeyframeEffect).target as Element).closest(".d58, .d59-sheet")).length), 200)));
  L.check("E1", "under reduced motion nothing on the page animates", running === 0, `${running} running animation(s)`);
  await ctx.close();
  L.done(4);
});

/* ── L1 — loading and loaded boxes are the same boxes ───────────────────────────────────────── */

test("DB59 L1 — loading and loaded boxes are the same boxes", async ({ page }) => {
  const L = new Ledger("loading");
  const read = () => page.evaluate(() => {
    const q = (s: string) => [...document.querySelectorAll<HTMLElement>(s)].find((e) => e.getBoundingClientRect().height > 0) ?? null;
    const box = (s: string) => { const e = q(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; };
    return { header: box('[data-d58="header"]'), active: box('[data-d58="active"]'), closed: box('[data-d60="closed-hoop"]'), focus: box('[data-d58="focus"]'), panel: box('[data-d58="panel"]'), tab: box('[data-d58="tab"]') };
  });
  for (const vp of [V1512, { width: 1280, height: 800 }]) {
    await openDash(page, vp);
    await openDash(page, vp, { __SA_DASH_HOLD_MS: 6000 });
    const held = await read();
    const isLoading = await page.evaluate(() => document.querySelector('[data-d58="page"]')?.getAttribute("data-loading"));
    await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 20_000 }).catch(() => {});
    await page.waitForTimeout(1800); // after the first paint has finished
    const loaded = await read();
    const w = tag(vp);
    L.check("L1", `${w} the hold is real`, isLoading === "1", `data-loading ${isLoading}`);
    for (const part of ["header", "active", "closed", "focus", "panel", "tab"] as const) {
      const a = held[part], b = loaded[part];
      const same = !!a && !!b && Math.abs(a.x - b.x) <= 1 && Math.abs(a.y - b.y) <= 1 && Math.abs(a.w - b.w) <= 1 && Math.abs(a.h - b.h) <= 1;
      L.check("L1", `${w} ${part}`, same, a && b ? `loading ${Math.round(a.x)},${Math.round(a.y)} ${a.w.toFixed(1)}×${a.h.toFixed(1)} · loaded ${Math.round(b.x)},${Math.round(b.y)} ${b.w.toFixed(1)}×${b.h.toFixed(1)}` : `loading ${!!a} · loaded ${!!b}`);
    }
  }
  L.done(14);
});

/* ── the report's shots (DB59_SHOTS=1 only): the focus card hovered, the panel Noted, the drawer open ── */

test("DB59 shots — beside the reference PNGs", async ({ page, context }) => {
  test.skip(!process.env.DB59_SHOTS, "shots only");
  mkdirSync(`${DIR}/shots`, { recursive: true });
  await openDash(page, V1512);
  const f = (await page.locator('[data-d58="focus"]').boundingBox())!;
  await page.mouse.move(f.x + f.width / 2, f.y + 30);
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${DIR}/shots/hover-focus-1512x900.png` });
  await context.route("**/sendWeeklyPulse", (r) => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true } }) }));
  await page.mouse.move(5, 5);
  await page.locator('[data-d58="panel-face"][data-label="Good"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/shots/panel-noted-1512x900.png` });
  await page.locator('[data-d58="tab"]').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${DIR}/shots/drawer-open-1512x900.png` });
  const { uid } = await harnessDb();
  const week = isoWeekKey(new Date());
  await page.evaluate(([u, w]) => { try { localStorage.removeItem(`sa.pulse.${u}.${w}`); } catch { /* */ } }, [uid, week] as const);
});
