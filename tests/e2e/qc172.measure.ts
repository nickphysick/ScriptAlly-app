/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v172 — the locks L1–L6 (design-refs/query-centre-v172/cc-prompt-query-centre-v172.md, Phase 5), read off
 * the rendered page over the emulator seed (`npm run e2e:emu -- tests/e2e/qc172.measure.ts`).
 *
 *   L1 the heading row: deeper blush (#e8bdb4), Special Elite 18px at 1512 / 16px at 1280; "Sent by" starts where its
 *      column starts (±2px).
 *   L2 Birds-eye opens on All: every bar inside the card; no names column; a row's name label shows on hover.
 *   L3 the overdue chip at 3M: on every overdue row, centred on its bar (±2px), its centre ≥ 40px left of today.
 *   L4 the list's groups (Group = Action, v172.5): Action needed (taking in the waiting with no reply date) · Within
 *      their window · Closed last; Birds-eye keeps its own four; the first Action-needed row is an offer when one exists.
 *   L5 the panel: Stage Queried leaves only queries whose furthest stage is Queried; the reply date's "Not dated" count
 *      is Birds-eye's "Waiting, no reply date" count; reply + send-by together never shows fewer than either alone.
 *   L6 the panel's type sizes: every text node is 12, 14, 16, 18 or 20px — the ranges' scale numbers and the icon
 *      glyphs (★ ▾ ▴ ✓) excepted; a pill's words are the shell's filter-pill token (--sp-fpill-size, 14.5px).
 *
 *   v172.5 — L18 the ring at rest (its key sums to the total; the centre and the toolbar read the Action needed count);
 *   L19 picking a part (only its rows; the centre "n / of N"; again shows everything; hover names the part); L20 the
 *   ring by keyboard (arrows move, Enter picks); L21 the folding sections (Stage reached open, the rest shut and inert;
 *   220ms; remembered for the visit; instant under reduced motion).
 *
 * ⚠️ EVERY POPULATION IS PROVED NON-ZERO BEFORE IT IS ASSERTED OVER: an empty list passes every "for each".
 * ⚠️ EVERY READ STARTS FROM THE VISIBLE PAGE (`visiblePage`): every workspace page stays mounted.
 * Each lock writes reports/qc-v172/ledger/<tag>-<lock>.json; QC172_TAG names the run (green, or red-before).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openQc } from "./nb1Lib";
import { liftMotionSuppression, openRoute, visiblePage } from "./measure";

test.setTimeout(300_000);
const DIR = "reports/qc-v172";
const TAG = process.env.QC172_TAG ?? "green";
const WIDE = { width: 1512, height: 982 };
const NARROW = { width: 1280, height: 900 };

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${TAG}-${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** the list on Group = Action (the list's "attention"), the panel untouched */
async function openList(page: Page, vp: { width: number; height: number }) {
  await openQc(page, vp, { group: "attention" });
  return visiblePage(page);
}
async function toView(page: Page, v: "list" | "birds") {
  const V = await visiblePage(page);
  await page.locator(`${V}[data-qc151='switch'] [data-v='${v}']`).click();
  await page.waitForTimeout(1200);
}
const n = (s: string | null | undefined) => Number(String(s ?? "").replace(/[^\d]/g, "") || NaN);

test("L1 · the heading row: deeper blush, Special Elite 18 / 16, Sent by over its column", async ({ page }) => {
  const L = new Ledger("L1");
  for (const vp of [WIDE, NARROW]) {
    const V = await openList(page, vp);
    const r = await page.evaluate((V) => {
      const th = document.querySelector<HTMLElement>(`${V}.qc169-th`);
      const rows = document.querySelectorAll(`${V}[data-qc172='row']`).length;
      if (!th) return { rows, th: false } as const;
      const cs = getComputedStyle(th);
      const heads = [...th.querySelectorAll<HTMLElement>(".qc169-thc")].map((h) => {
        const el = h.querySelector("button") ?? h; const c = getComputedStyle(el);
        return { col: h.dataset.col, family: c.fontFamily, size: parseFloat(c.fontSize), shown: h.getBoundingClientRect().width > 0 && parseFloat(c.fontSize) > 0 };
      });
      const sm = th.querySelector<HTMLElement>(".c-sm")!.getBoundingClientRect().left;
      const cells = [...document.querySelectorAll<HTMLElement>(`${V}[data-qc172='row'] .qr170-sm`)].map((e) => e.getBoundingClientRect().left);
      return { rows, th: true, bg: cs.backgroundColor, h: th.getBoundingClientRect().height, heads, sm, cells } as const;
    }, V);
    L.check(`${vp.width} · population`, r.rows > 0, `${r.rows} list rows`);
    if (!r.th) { L.check(`${vp.width} · heading row`, false, "no .qc169-th"); continue; }
    L.check(`${vp.width} · background`, r.bg === "rgb(232, 189, 180)", r.bg);
    L.check(`${vp.width} · height`, r.h >= 53.5, `${r.h}px`);
    const want = vp.width >= 1400 ? 18 : 16;
    for (const h of r.heads.filter((x) => x.shown)) {
      L.check(`${vp.width} · ${h.col} face`, /Special Elite/i.test(h.family), h.family);
      L.check(`${vp.width} · ${h.col} size`, h.size === want, `${h.size}px, want ${want}`);
    }
    if (vp.width >= 1400) {
      L.check(`${vp.width} · Sent by shown`, r.heads.some((x) => x.col === "c-sm" && x.shown), "the heading is drawn");
      const bad = r.cells.filter((x) => Math.abs(x - r.sm) > 2);
      L.check(`${vp.width} · Sent by left edge`, r.cells.length > 0 && bad.length === 0, `heading ${r.sm.toFixed(1)}; ${r.cells.length} cells, ${bad.length} off (${bad.slice(0, 3).map((x) => x.toFixed(1)).join(", ")})`);
    }
  }
  L.done(12);
});

test("L2 · Birds-eye opens on All: every bar inside the card, no names column, the name on hover", async ({ page }) => {
  const L = new Ledger("L2");
  await openList(page, WIDE);
  await toView(page, "birds");
  const V = await visiblePage(page);
  const r = await page.evaluate((V) => {
    const be = document.querySelector<HTMLElement>(`${V}[data-qc150='birds']`);
    if (!be) return null;
    const box = be.getBoundingClientRect();
    const bars = [...be.querySelectorAll<HTMLElement>(".qc150-bar")].map((b) => b.getBoundingClientRect()).filter((b) => b.width > 0);
    const out = bars.filter((b) => b.left < box.left - 0.5 || b.right > box.right + 0.5).length;
    const ags = [...be.querySelectorAll<HTMLElement>(".qc150-ag")];
    const agShown = ags.filter((a) => a.getBoundingClientRect().width > 0).length;
    return { zoom: be.dataset.zoom, bars: bars.length, out, rows: be.querySelectorAll("[data-qc150='be-track']").length, ags: ags.length, agShown };
  }, V);
  L.check("birds-eye drawn", !!r, "[data-qc150='birds'] in the visible page");
  if (r) {
    L.check("population", r.bars > 0 && r.rows > 0, `${r.rows} rows, ${r.bars} bars`);
    L.check("opens on All", r.zoom === "all", `data-zoom=${r.zoom}`);
    L.check("every bar inside the card", r.out === 0, `${r.out} of ${r.bars} outside`);
    L.check("no names column", r.ags > 0 && r.agShown === 0, `${r.agShown} of ${r.ags} name cells drawn`);
  }
  const row = page.locator(`${V}[data-qc150='be-track']`).nth(2);
  await row.hover();
  await page.waitForTimeout(300);
  const lab = await page.evaluate((V) => {
    const shown = [...document.querySelectorAll<HTMLElement>(`${V}.qc169-nm`)].filter((e) => getComputedStyle(e).display !== "none" && e.getBoundingClientRect().width > 0);
    return shown.map((e) => e.textContent?.trim() ?? "");
  }, V);
  L.check("hover shows one name label", lab.length === 1 && lab[0].length > 2, JSON.stringify(lab));
  L.done(6);
});

test("L3 · the overdue chip at 3M: on every overdue row, centred, ≥ 40px left of today", async ({ page }) => {
  const L = new Ledger("L3");
  await openList(page, WIDE);
  await toView(page, "birds");
  const V = await visiblePage(page);
  await page.locator(`${V}[data-qc150='zoom'] [data-z='3m']`).click();
  await page.waitForTimeout(1200);
  /* ⚠️ 3M from All centres on the middle of the campaign, where today is off screen and its line is display:none
     (a rect at x 0). Back to today first, and a hidden line is a failed reading, never x 0. */
  await page.locator(`${V}[data-qc150='today']`).click();
  await page.waitForTimeout(1200);
  const r = await page.evaluate((V) => {
    const be = document.querySelector<HTMLElement>(`${V}[data-qc150='birds']`)!;
    const tl = be.querySelector<HTMLElement>("[data-qc150='today-line']")!;
    const t = tl.getBoundingClientRect();
    const shown = getComputedStyle(tl).display !== "none" && t.height > 0;
    const today = t.left + t.width / 2;
    const rows = [...be.querySelectorAll<HTMLElement>("[data-qc150='be-track']")].map((tr) => {
      const bar = tr.querySelector<HTMLElement>("[data-qc150='be-bar'].qc150-bar--o");
      const chip = tr.querySelector<HTMLElement>("[data-qc150='be-due']");
      if (!bar) return null;
      const b = bar.getBoundingClientRect();
      const c = chip?.getBoundingClientRect();
      return { chip: !!chip, title: chip?.title ?? "", dy: c ? Math.abs((c.top + c.height / 2) - (b.top + b.height / 2)) : NaN, gap: c ? today - (c.left + c.width / 2) : NaN };
    }).filter((x): x is NonNullable<typeof x> => !!x);
    return { zoom: be.dataset.zoom, rows, shown, today };
  }, V);
  L.check("at 3M", r.zoom === "3m", `data-zoom=${r.zoom}`);
  L.check("the today line is drawn", r.shown, `display/height of today-line; x ${r.today.toFixed(1)}`);
  L.check("population", r.rows.length > 0, `${r.rows.length} overdue rows`);
  r.rows.forEach((x, i) => {
    L.check(`row ${i} chip`, x.chip && /^Reply was due \d{1,2} [A-Z][a-z]+$/.test(x.title), x.title || "no chip");
    L.check(`row ${i} centred`, x.dy <= 2, `${x.dy.toFixed(2)}px off the bar's centre`);
    L.check(`row ${i} clear of today`, x.gap >= 39.5, `${x.gap.toFixed(1)}px left of today`);
  });
  L.done(5);
});

test("L4 · the list's groups: Action needed takes in the undated; Closed last; Birds-eye keeps its own; an offer first", async ({ page }) => {
  const L = new Ledger("L4");
  const V = await openList(page, WIDE);
  const list = await page.evaluate((V) => {
    const keys = [...document.querySelectorAll<HTMLElement>(`${V}.qc169 [data-qc1511='group'], ${V}.qc169 [data-qc153='fold']`)].map((e) => e.dataset.k ?? "");
    const all = [...document.querySelectorAll<HTMLElement>(`${V}[data-qc172='row']`)];
    const first = document.querySelector<HTMLElement>(`${V}[data-qc1511='group'][data-k='action'] [data-qc172='row']`);
    const actionN = document.querySelectorAll(`${V}[data-qc1511='group'][data-k='action'] [data-qc172='row']`).length;
    return { keys, actionN, offers: all.filter((e) => e.dataset.status === "Offer").length, first: first?.dataset.status ?? null };
  }, V);
  await toView(page, "birds");
  const be = await page.evaluate((V) => [...document.querySelectorAll<HTMLElement>(`${V}[data-qc150='be-group']`)].map((e) => ({ k: e.dataset.group ?? "", n: e.querySelectorAll("[data-qc150='be-track']").length })), V);
  const beN = (k: string) => be.find((g) => g.k === k)?.n ?? 0;
  L.check("population", list.keys.length >= 2 && be.length >= 2 && beN("nodate") > 0, `list ${JSON.stringify(list.keys)} · birds-eye ${JSON.stringify(be)}`);
  L.check("the list's three groups only, in order", JSON.stringify(list.keys) === JSON.stringify(["action", "window", "closed"].filter((k) => list.keys.includes(k))), JSON.stringify(list.keys));
  L.check("Action needed = Birds-eye's Needs action + Waiting, no reply date", list.actionN === beN("action") + beN("nodate"), `list ${list.actionN} · birds-eye ${beN("action")} + ${beN("nodate")}`);
  L.check("Birds-eye keeps its own four", be.every((g) => ["action", "window", "nodate", "closed"].includes(g.k)), JSON.stringify(be.map((g) => g.k)));
  L.check("Closed last (list)", !list.keys.includes("closed") || list.keys[list.keys.length - 1] === "closed", JSON.stringify(list.keys));
  L.check("Closed last (birds-eye)", !be.some((g) => g.k === "closed") || be[be.length - 1].k === "closed", JSON.stringify(be.map((g) => g.k)));
  L.check("an offer leads Action needed", list.offers === 0 || list.first === "Offer", `${list.offers} offers; first is ${list.first}`);
  L.done(7);
});

/** set a range input the way a drag does: the native setter, then an input event React hears */
async function setRange(page: Page, V: string, label: string, value: number) {
  await page.evaluate(({ V, label, value }) => {
    const el = document.querySelector<HTMLInputElement>(`${V}.qs172 input[aria-label="${label}"]`);
    if (!el) throw new Error(`no range ${label}`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, String(value));
    el.dispatchEvent(new Event("input", { bubbles: true }));
  }, { V, label, value });
  await page.waitForTimeout(500);
}
const showing = async (page: Page, V: string) => {
  const t = await page.locator(`${V}.qs172-h small`).textContent();
  const m = /(\d+) showing/.exec(t ?? "");
  return m ? Number(m[1]) : NaN;
};
async function clearPanel(page: Page, V: string) {
  const b = page.locator(`${V}.qs172-h button`);
  if (await b.count()) { await b.click(); await page.waitForTimeout(500); }
}

test("L5 · the panel: Stage Queried, Not dated = Birds-eye's no-reply-date, reply + send-by never fewer", async ({ page }) => {
  const L = new Ledger("L5");
  const V = await openList(page, WIDE);
  /* a — Stage Queried: every row left reached Queried and no further (R&R counts as Full) */
  await page.locator(`${V}.qs172-stg button[title='Queried']`).click();
  await page.waitForTimeout(800);
  const st = await page.evaluate((V) => {
    const later = new Set(["Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Resubmitted", "Offer"]);
    const rows = [...document.querySelectorAll<HTMLElement>(`${V}[data-qc172='row']`)];
    const bad = rows.filter((e) => later.has(e.dataset.status ?? "") || e.dataset.furthest === "partial" || e.dataset.furthest === "full");
    return { n: rows.length, bad: bad.map((e) => `${e.dataset.status}/${e.dataset.furthest}`) };
  }, V);
  L.check("Stage Queried · population", st.n > 0, `${st.n} rows`);
  L.check("Stage Queried · only Queried", st.bad.length === 0, `${st.bad.length} later: ${st.bad.slice(0, 4).join(", ")}`);
  await clearPanel(page, V);

  /* b — the reply date's Not dated count against Birds-eye's group */
  const nd = await page.evaluate((V) => {
    const sec = [...document.querySelectorAll<HTMLElement>(`${V}.qs172-s`)].find((s) => s.querySelector(".qs172-ft b")?.textContent?.includes("reply date"));
    return sec?.querySelector(".qs172-ck em")?.textContent ?? null;
  }, V);
  await toView(page, "birds");
  const beN = await page.evaluate((V) => document.querySelectorAll(`${V}[data-qc150='be-group'][data-group='nodate'] [data-qc150='be-track']`).length, V);
  L.check("Not dated · population", n(nd) > 0, `panel ${nd}`);
  L.check("Not dated = Waiting, no reply date", n(nd) === beN, `panel ${nd} · birds-eye ${beN}`);
  await toView(page, "list");

  /* c — reply date and send-by date: each alone, then both (a query passes on either) */
  const all = await showing(page, V);
  const cases: [string, [string, number][]][] = [
    ["reply overdue", [["Agent’s reply date to", 0]]],
    ["send-by overdue", [["Your send-by date to", 0]]],
    ["reply next 4w", [["Agent’s reply date from", 0], ["Agent’s reply date to", 28]]],
    ["send-by next 4w", [["Your send-by date from", 0], ["Your send-by date to", 28]]],
  ];
  const got: Record<string, number> = {};
  for (const [name, sets] of cases) {
    for (const [lab, v] of sets) await setRange(page, V, lab, v);
    got[name] = await showing(page, V);
    await clearPanel(page, V);
  }
  for (const [a, b] of [["reply overdue", "send-by overdue"], ["reply next 4w", "send-by next 4w"]] as const) {
    const sets = [...cases.find((c) => c[0] === a)![1], ...cases.find((c) => c[0] === b)![1]];
    for (const [lab, v] of sets) await setRange(page, V, lab, v);
    const both = await showing(page, V);
    await clearPanel(page, V);
    L.check(`${a} + ${b} · population`, got[a] + got[b] > 0 && got[a] < all, `all ${all}; ${a} ${got[a]}; ${b} ${got[b]}`);
    L.check(`${a} + ${b} · never fewer`, both >= Math.max(got[a], got[b]), `both ${both}; ${a} ${got[a]}; ${b} ${got[b]}`);
  }
  L.done(8);
});

test("L6 · the panel's type sizes: 12, 14, 16, 18 or 20px only", async ({ page }) => {
  const L = new Ledger("L6");
  const V = await openList(page, WIDE);
  const read = async (where: string) => {
    const r = await page.evaluate((V) => {
      const root = document.querySelector<HTMLElement>(`${V}.qs172`)!;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const out: { t: string; px: number; pill: number | null }[] = [];
      for (let x = w.nextNode(); x; x = w.nextNode()) {
        const t = (x.textContent ?? "").trim(); const el = x.parentElement!;
        if (!t || el.getBoundingClientRect().width === 0) continue;
        if (el.closest(".qs172-scale")) continue;          // the ranges' numbers
        if (el.closest(".qs172-rsvg")) continue;           // v172.5 — the ring's centre (typewriter 22, italic 9.5)
        if (/^[★▾▴✓\s]+$/.test(t)) continue;               // icon glyphs
        /* a pill is the shell's standard filter pill: its words are the shell token --sp-fpill-size (primitives.css) */
        const pill = el.closest(".qs172-chip, .qs172-inc") && !el.closest("em") ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sp-fpill-size")) : null;
        out.push({ t: t.slice(0, 24), px: parseFloat(getComputedStyle(el).fontSize), pill });
      }
      return out;
    }, V);
    L.check(`${where} · population`, r.length > 20, `${r.length} text nodes`);
    const bad = r.filter((x) => (x.pill != null ? x.px !== x.pill : ![12, 14, 16, 18, 20].includes(x.px)));
    /* the folded panel has no pill (v172.4 Include closed is a tick; v172.5 the ring); the pills are checked with More filters open */
    if (where !== "folded") L.check(`${where} · pills read the shell token`, r.some((x) => x.pill != null && x.pill > 0), `${r.filter((x) => x.pill != null).length} pill words`);
    L.check(`${where} · sizes`, bad.length === 0, bad.slice(0, 6).map((x) => `"${x.t}" ${x.px}px`).join("; ") || `${r.length} nodes, all in the set`);
  };
  await read("folded");
  await page.locator(`${V}.qs172-fold[data-fold='more'] .qs172-ft`).click();
  await page.waitForTimeout(400);
  await page.locator(`${V}.qs172-dd`).click();
  await page.waitForTimeout(400);
  await read("More filters open");
  L.done(5);
});

/* ── v172.1 ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

test("L7 · the panel's header stays pinned while the panel scrolls", async ({ page }) => {
  const L = new Ledger("L7");
  const V = await openList(page, WIDE);
  await page.locator(`${V}.qs172-fold[data-fold='more'] .qs172-ft`).click();
  await page.waitForTimeout(400);
  const read = () => page.evaluate((V) => {
    const col = document.querySelector<HTMLElement>(`${V}.qc153-railcol`)!;
    const h = document.querySelector<HTMLElement>(`${V}.qs172-h`)!;
    return { colTop: col.getBoundingClientRect().top, hTop: h.getBoundingClientRect().top, hH: h.getBoundingClientRect().height, scroll: col.scrollTop, room: col.scrollHeight - col.clientHeight, pos: getComputedStyle(h).position };
  }, V);
  const a = await read();
  L.check("population · the panel scrolls", a.room > 100, `${a.room}px to scroll with More filters open`);
  await page.evaluate((V) => { const c = document.querySelector<HTMLElement>(`${V}.qc153-railcol`)!; c.scrollTop = Math.min(300, c.scrollHeight - c.clientHeight); }, V);
  await page.waitForTimeout(400);
  const b = await read();
  L.check("scrolled", b.scroll >= 100, `scrollTop ${b.scroll}`);
  L.check("sticky", b.pos === "sticky", b.pos);
  L.check("the header stays at the panel's top", Math.abs(b.hTop - b.colTop) <= 1, `header top ${b.hTop.toFixed(1)} · panel top ${b.colTop.toFixed(1)}`);
  L.check("the header keeps its height", Math.abs(b.hH - a.hH) <= 0.5 && b.hH > 30, `${a.hH} → ${b.hH}`);
  L.done(5);
});

test("L8 · a row on hover: lifts, then its track replays in turn within 0.6s; still under reduced motion", async ({ page }) => {
  const L = new Ledger("L8");
  const V = await openList(page, WIDE);
  /* ⚠️ the harness kills every animation for steady readings (measure.ts KILL_MOTION); this lock is about animation */
  await liftMotionSuppression(page);
  /* a row with at least two steps reached, one with a skipped step if the seed has one */
  const ids = await page.evaluate((V) => {
    const rows = [...document.querySelectorAll<HTMLElement>(`${V}[data-qc172='row']`)];
    const two = rows.find((r) => r.querySelectorAll(".qr170-sp.is-reached").length >= 1 && r.querySelector(".qr170-sp.is-cur") && !r.querySelector(".qr170-sp.is-skip"));
    const skip = rows.find((r) => r.querySelector(".qr170-sp.is-skip") && r.querySelector(".qr170-sp.is-cur"));
    const far = rows.find((r) => r.querySelector(".qr170-sp:nth-child(4).is-cur"));
    return { two: two?.dataset.id ?? null, skip: skip?.dataset.id ?? null, far: far?.dataset.id ?? null };
  }, V);
  L.check("population", !!ids.two, JSON.stringify(ids));
  const probe = (id: string) => page.evaluate(({ V, id }) => {
    const row = document.querySelector<HTMLElement>(`${V}[data-qc172='row'][data-id="${CSS.escape(id)}"]`)!;
    const steps = [...row.querySelectorAll<HTMLElement>(".qr170-sp")].map((sp) => {
      const sn = sp.querySelector<HTMLElement>(".qr170-sn")!; const cs = getComputedStyle(sn);
      return { state: [...sp.classList].find((c) => c.startsWith("is-")) ?? "", anim: cs.animationName, delay: parseFloat(cs.animationDelay), dur: parseFloat(cs.animationDuration), ring: getComputedStyle(sn, "::after").animationName, line: getComputedStyle(sp, "::before").animationName };
    });
    return { edge: getComputedStyle(row, "::after").animationName, steps };
  }, { V, id });
  for (const [name, id] of Object.entries(ids)) {
    if (!id) continue;
    await page.locator(`${V}[data-qc172='row'][data-id="${id}"]`).hover();
    await page.waitForTimeout(100);
    const r = await probe(id);
    const on = r.steps.filter((s) => s.state === "is-reached" || s.state === "is-cur");
    L.check(`${name} · the edge sweeps`, r.edge.includes("qr172-edge"), r.edge);
    L.check(`${name} · every step reached pops`, on.length > 0 && on.every((s) => s.anim.includes("qr172-pop")), on.map((s) => s.anim).join(","));
    L.check(`${name} · in turn`, on.every((s, i) => i === 0 || s.delay > on[i - 1].delay), on.map((s) => s.delay).join(" < "));
    const end = Math.max(...on.map((s) => s.delay + s.dur)) - 0.15;
    L.check(`${name} · within 0.6s (+ the last pop)`, on[on.length - 1].delay - 0.15 <= 0.6 + 0.001, `last starts at ${(on[on.length - 1].delay - 0.15).toFixed(3)}s, ends ${end.toFixed(3)}s`);
    L.check(`${name} · the current step rings`, r.steps.some((s) => s.state === "is-cur" && s.ring.includes("qr172-ring")), r.steps.map((s) => s.ring).join(","));
    const still = r.steps.filter((s) => s.state === "is-skip" || s.state === "is-fut");
    L.check(`${name} · skipped and future steps keep still`, still.every((s) => !s.anim.includes("qr172-pop") && !s.line.includes("qr172-draw")), still.map((s) => `${s.state}:${s.anim}/${s.line}`).join(" ") || "none");
    await page.mouse.move(2, 2);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator(`${V}[data-qc172='row'][data-id="${ids.two}"]`).hover();
  await page.waitForTimeout(100);
  const rm = await probe(ids.two!);
  L.check("reduced motion · nothing moves", rm.edge === "none" && rm.steps.every((s) => s.anim === "none" && s.ring === "none" && s.line === "none"), `${rm.edge} · ${rm.steps.map((s) => s.anim).join(",")}`);
  L.done(8);
});

/* ── v172.2 ─────────────────────────────────────────────────────────────────────────────────────────────────────── */

test("L9 · the current step's badge: a white arrow on navy (in, out, end) at rest and hovered; the quiet badge navy on white", async ({ page }) => {
  const L = new Ledger("L9");
  const V = await openList(page, WIDE);
  await liftMotionSuppression(page);
  /* the closed group folds on Action: open it, so the ended (d-end) badges are drawn */
  const fold = page.locator(`${V}[data-qc153='fold'][data-k='closed'] [data-qc153='show-all']`);
  if (await fold.count()) { await fold.click(); await page.waitForTimeout(600); }
  const read = (dir: string) => page.evaluate(({ V, dir }) => [...document.querySelectorAll<HTMLElement>(`${V}[data-qc172='row'] .qr170-arw.d-${dir}`)].map((b) => {
    const path = b.querySelector("svg path, svg *:not(svg)") as SVGElement | null;
    const z = b.querySelector<HTMLElement>(".qr170-zz");
    return { id: b.closest<HTMLElement>("[data-qc172='row']")!.dataset.id!, bg: getComputedStyle(b).backgroundColor, stroke: path ? getComputedStyle(path).stroke : null, zz: z ? getComputedStyle(z).color : null };
  }), { V, dir });
  const WHITE = "rgb(255, 255, 255)", NAVY = "rgb(42, 58, 82)";
  for (const dir of ["in", "out", "end"]) {
    const all = await read(dir);
    L.check(`d-${dir} · population`, all.length > 0, `${all.length} badges`);
    const bad = all.filter((b) => b.stroke !== WHITE || b.bg !== NAVY);
    L.check(`d-${dir} · at rest`, all.length > 0 && bad.length === 0, bad.length ? bad.slice(0, 3).map((b) => `${b.id}: stroke ${b.stroke} on ${b.bg}`).join("; ") : `${all.length} white on navy`);
    if (!all.length) continue;
    await page.locator(`${V}[data-qc172='row'][data-id="${all[0].id}"]`).hover();
    await page.waitForTimeout(1200);
    const h = (await read(dir)).find((b) => b.id === all[0].id)!;
    L.check(`d-${dir} · hovered`, h.stroke === WHITE && h.bg === NAVY, `stroke ${h.stroke} on ${h.bg}`);
    await page.mouse.move(2, 2);
  }
  const q = await read("quiet");
  L.check("d-quiet · population", q.length > 0, `${q.length} badges`);
  const qb = q.filter((b) => b.zz !== NAVY || b.bg !== WHITE);
  L.check("d-quiet · navy z z z on white", q.length > 0 && qb.length === 0, qb.length ? qb.slice(0, 3).map((b) => `${b.id}: ${b.zz} on ${b.bg}`).join("; ") : `${q.length} navy on white`);
  L.done(9);
});

/* ── v172.3 · long campaigns ───────────────────────────────────────────────────────────────────────────────────── */

async function readSent(page: Page, V: string) {
  return page.evaluate((V) => {
    const sec = [...document.querySelectorAll<HTMLElement>(`${V}.qs172-s`)].find((s) => s.querySelector(".qs172-ft b")?.textContent?.trim() === "Sent");
    if (!sec) return null;
    const bars = [...sec.querySelectorAll<HTMLElement>(".qs172-hist > i")].map((b) => ({ w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }));
    const scale = [...sec.querySelectorAll<HTMLElement>(".qs172-scale span")].map((x) => x.textContent ?? "");
    /* v172.5 — the folding title row carries the section's value: the range once set, "any time" when not */
    const now = sec.querySelector(".qs172-fh.is-on .qs172-fv")?.textContent ?? "";
    const idle = sec.querySelector(".qs172-fv")?.textContent ?? "";
    const max = Number(sec.querySelector<HTMLInputElement>('input[aria-label="Sent to"]')?.max ?? NaN);
    return { bars, scale, now, idle, max };
  }, V);
}

test("L10 · the Sent chart on a long campaign: ≤ 26 bars, each counted bar ≥ 3px, a year on the scale, the handle steps", async ({ page }) => {
  const L = new Ledger("L10");
  const V = await openList(page, WIDE);
  /* v172.5 — Sent starts shut: open it so its chart is drawn */
  await page.locator(`${V}.qs172-fold[data-fold='sent'] .qs172-ft`).click();
  await page.waitForTimeout(400);
  const a = await readSent(page, V);
  L.check("the Sent section is drawn", !!a, "Sent section");
  if (a) {
    const counted = a.bars.filter((b) => b.h > 0);
    L.check("population · a counted bar", counted.length > 0, `${a.bars.length} bars, ${counted.length} counted`);
    L.check("≤ 26 bars", a.bars.length > 0 && a.bars.length <= 26, `${a.bars.length} bars`);
    const thin = counted.filter((b) => b.w < 3);
    L.check("every counted bar ≥ 3px wide", counted.length > 0 && thin.length === 0, `${thin.length} under 3px (${counted.slice(0, 4).map((b) => b.w.toFixed(1)).join(", ")}…)`);
    L.check("a year on the scale", a.scale.some((t) => /’\d\d/.test(t)), JSON.stringify(a.scale));
    await page.evaluate(({ V, v }) => {
      const sec = [...document.querySelectorAll<HTMLElement>(`${V}.qs172-s`)].find((s) => s.querySelector(".qs172-ft b")?.textContent?.trim() === "Sent")!;
      const el = sec.querySelector<HTMLInputElement>('input[aria-label="Sent to"]')!;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, String(v));
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }, { V, v: a.max - 1 });
    await page.waitForTimeout(500);
    const b = await readSent(page, V);
    L.check("one step of the right handle changes the summary", !!b && b.now !== "" && !/now$/.test(b.now), `before "${a.idle}" · after "${b?.now}"`);
    await clearPanel(page, V);
  }
  L.done(6);
});

test("L11 · the date sliders' open ends say so", async ({ page }) => {
  const L = new Ledger("L11");
  const V = await openList(page, WIDE);
  const ends = await page.evaluate((V) => [...document.querySelectorAll<HTMLElement>(`${V}.qs172-s`)]
    .filter((s) => s.querySelector(".qs172-ck"))
    .map((s) => { const sp = [...s.querySelectorAll<HTMLElement>(".qs172-scale span")]; return { t: s.querySelector(".qs172-ft b")?.textContent?.trim(), a: sp[0]?.textContent, b: sp[sp.length - 1]?.textContent }; }), V);
  L.check("both date fields", ends.length === 2, JSON.stringify(ends));
  const want: Record<string, [string, string]> = { "Agent’s reply date": ["8w+ ago", "12w+ ahead"], "Your send-by date": ["4w+ ago", "8w+ ahead"] };
  for (const e of ends) {
    const w = want[e.t ?? ""];
    L.check(`${e.t} · left end`, !!w && e.a === w[0], `"${e.a}"`);
    L.check(`${e.t} · right end`, !!w && e.b === w[1], `"${e.b}"`);
  }
  L.done(5);
});

test("L12 · every your-move and offer row with a dated track has a reason line", async ({ page }) => {
  const L = new Ledger("L12");
  const V = await openList(page, WIDE);
  const r = await page.evaluate((V) => [...document.querySelectorAll<HTMLElement>(`${V}[data-qc172='row']`)]
    .filter((row) => (row.dataset.court === "you" || row.dataset.court === "offer") && (row.querySelector(".qr170-sp.is-cur em")?.textContent ?? "").trim() !== "" && (row.querySelector(".qr170-sp.is-cur em")?.textContent ?? "").trim() !== "–")
    .map((row) => ({ name: row.querySelector(".qr170-who b")?.textContent ?? "", ss: row.dataset.ss ?? "", act: row.querySelector(".qr170-act")?.textContent?.replace("→", "").trim() ?? row.querySelector(".qr170-wait")?.textContent ?? "", line: (row.querySelector(".qr170-n em")?.textContent ?? "").trim() })), V);
  L.check("population", r.length > 0, `${r.length} rows`);
  L.check("population · a row with no stage start recorded", r.some((x) => x.ss === "none"), r.filter((x) => x.ss === "none").map((x) => x.name).join(", ") || "none");
  const empty = r.filter((x) => !x.line);
  L.check("every one has a reason line", r.length > 0 && empty.length === 0, empty.map((x) => `${x.name} (${x.act})`).join("; ") || `${r.length} with lines`);
  L.done(3);
});

test("L13 · every reached step has a date line (a dash when none); future steps none", async ({ page }) => {
  const L = new Ledger("L13");
  const V = await openList(page, WIDE);
  const r = await page.evaluate((V) => [...document.querySelectorAll<HTMLElement>(`${V}[data-qc172='row'] .qr170-sp`)].map((sp) => ({
    state: [...sp.classList].find((c) => c.startsWith("is-")) ?? "", em: (sp.querySelector("em")?.textContent ?? "").trim(),
    name: sp.closest<HTMLElement>("[data-qc172='row']")!.querySelector(".qr170-who b")?.textContent ?? "" })), V);
  const reached = r.filter((x) => x.state !== "is-fut"), fut = r.filter((x) => x.state === "is-fut");
  L.check("population", reached.length > 0 && fut.length > 0, `${reached.length} reached, ${fut.length} future`);
  const blank = reached.filter((x) => !x.em);
  L.check("every reached step has a date line", blank.length === 0, blank.slice(0, 5).map((x) => `${x.name} ${x.state}`).join("; ") || "all dated or dashed");
  const filled = fut.filter((x) => x.em);
  L.check("future steps have none", filled.length === 0, filled.slice(0, 5).map((x) => `${x.name}: "${x.em}"`).join("; ") || "none");
  L.done(3);
});

/* ── v172.4 · the list just ends, the handles, the closed tick, the loading shell, the arrival, the opening state ─── */

test("L14 · the list just ends; Closed (a key row of What's next) adds and removes the Closed group; handles centred on the track's ends", async ({ page }) => {
  const L = new Ledger("L14");
  const V = await openList(page, WIDE);
  const txt = await page.locator(`${V}.qc151`).first().innerText();
  L.check("no “That’s all” under the list", !/That’s all/.test(txt), /That’s all \d+/.exec(txt)?.[0] ?? "none");
  const keys = () => page.evaluate((V) => [...document.querySelectorAll<HTMLElement>(`${V}.qc169 [data-qc1511='group'], ${V}.qc169 [data-qc153='fold']`)].map((e) => e.dataset.k ?? ""), V);
  const row = page.locator(`${V}.qs172-rb[data-k='closed']`);
  L.check("no Include closed tick", (await page.locator(`${V}.qs172-ck--closed`).count()) === 0, `${await page.locator(`${V}.qs172-ck--closed`).count()}`);
  L.check("Closed is a key row", (await row.count()) === 1, `${await row.count()}`);
  if (await row.count()) {
    const on = await keys();
    await row.click(); await page.waitForTimeout(600);
    const only = await keys();
    await row.click(); await page.waitForTimeout(600);
    const back = await keys();
    L.check("population · a Closed group at rest", on.includes("closed") && on.length >= 2, JSON.stringify(on));
    L.check("Closed picked: only the Closed group", JSON.stringify(only) === JSON.stringify(["closed"]), JSON.stringify(only));
    L.check("picked again: everything is back", JSON.stringify(back) === JSON.stringify(on), JSON.stringify(back));
  }
  const sl = await page.evaluate((V) => [...document.querySelectorAll<HTMLElement>(`${V}.qs172-dual`)].map((d) => {
    const tr = d.querySelector<HTMLElement>(".tr")!.getBoundingClientRect(); const inp = d.querySelector<HTMLInputElement>("input")!.getBoundingClientRect();
    return { trL: tr.left, trR: tr.right, inL: inp.left, inR: inp.right };
  }), V);
  L.check("population · three sliders", sl.length === 3, `${sl.length}`);
  /* a 14px thumb's centre sits 7px in from each end of its input: on the track's ends when the input overhangs 7px */
  for (const [i, s] of sl.entries()) L.check(`slider ${i} · thumb centres on the track ends`, Math.abs(s.inL + 7 - s.trL) <= 0.5 && Math.abs(s.inR - 7 - s.trR) <= 0.5, `in ${s.inL.toFixed(1)}–${s.inR.toFixed(1)} · track ${s.trL.toFixed(1)}–${s.trR.toFixed(1)}`);
  L.done(10);
});

test("L15 · the loading shell: the list's own card and heading row with shapes, the panel's own frame; no figure; aria-busy", async ({ page }) => {
  const L = new Ledger("L15");
  /* the review aid holds the loading state (useQcLoad: never read in a production build); openRoute signs in and
     settles ~3s, well inside the hold */
  await page.addInitScript(() => { try { localStorage.setItem("sa.qc155.holdMs", "12000"); } catch { /* */ } });
  await openRoute(page, "/queries", WIDE);
  const r = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).getBoundingClientRect().height > 0;
    const list = [...document.querySelectorAll<HTMLElement>("[data-qc151='table']")].find(vis) ?? null;
    const sk = list?.querySelector<HTMLElement>(".qc169-card [data-qc172='skeleton']") ?? null;
    const head = list?.querySelector<HTMLElement>(".qc169-card .qc169-th") ?? null;
    const rail = [...document.querySelectorAll<HTMLElement>(".qc153-railcol")].find(vis) ?? null;
    const rsk = rail?.querySelector<HTMLElement>(".sk172-rail") ?? null;
    return { busy: list?.getAttribute("aria-busy") ?? null, sk: !!sk, rows: sk?.querySelectorAll(".sk172-row").length ?? 0, head: !!head && vis(head), skText: sk?.innerText ?? "", rail: !!rsk, railText: rsk?.innerText ?? "", old: !!list?.querySelector(".qc155-sk, [data-qc155='skeleton']") };
  });
  L.check("the list is busy", r.busy === "true", `aria-busy=${r.busy}`);
  L.check("the shell sits in the list card", r.sk && r.rows === 8, `${r.sk} · ${r.rows} rows`);
  L.check("the real heading row above it", r.head, String(r.head));
  L.check("no figure in the list's shell", r.sk && !/\d/.test(r.skText), JSON.stringify(r.skText.slice(0, 60)));
  L.check("the panel's own frame", r.rail, String(r.rail));
  L.check("no figure in the panel's shell", r.rail && !/\d/.test(r.railText), JSON.stringify(r.railText));
  L.check("the old card-grid skeleton is gone", !r.old, String(r.old));
  L.done(7);
});

test("L16 · the arrival: data-en172 after loading, gone by 700ms, not on a filter change; never under reduced motion", async ({ page, browser }) => {
  const L = new Ledger("L16");
  await page.setViewportSize(WIDE);
  /* watch the attribute from the first paint: record when it appears and disappears */
  await page.addInitScript(() => {
    const w = window as unknown as { __en172: { on: number | null; off: number | null; again: number } };
    w.__en172 = { on: null, off: null, again: 0 };
    new MutationObserver(() => {
      const el = [...document.querySelectorAll<HTMLElement>(".qc153-list")].find((e) => e.getBoundingClientRect().height > 0);
      const set = !!el?.hasAttribute("data-en172");
      if (set && w.__en172.on == null) w.__en172.on = performance.now();
      else if (set && w.__en172.off != null) w.__en172.again += 1;
      if (!set && w.__en172.on != null && w.__en172.off == null) w.__en172.off = performance.now();
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-en172"], childList: true });
  });
  const V = await openList(page, WIDE);
  const a = await page.evaluate(() => (window as unknown as { __en172: { on: number | null; off: number | null; again: number } }).__en172);
  L.check("set after loading", a.on != null, JSON.stringify(a));
  /* the timer is exactly 700ms (lib/arrival172, fake timers in qcv1724.test); read in the page it lands later by however
     long the main thread is busy finishing the load (≈80ms measured), so the rendered bound allows 150ms */
  L.check("cleared at 700ms (+ the load's main-thread time)", a.on != null && a.off != null && a.off - a.on <= 850 && a.off - a.on >= 650, a.on != null && a.off != null ? `${Math.round(a.off - a.on)}ms` : "never cleared");
  await page.locator(`${V}.qs172-rb[data-k='wait']`).click();
  await page.waitForTimeout(900);
  await page.locator(`${V}.qs172-rb[data-k='wait']`).click();
  await page.waitForTimeout(900);
  const b = await page.evaluate(() => (window as unknown as { __en172: { again: number } }).__en172.again);
  L.check("a filter change does not replay it", b === 0, `${b} replays`);
  const ctx = await browser.newContext({ reducedMotion: "reduce", storageState: (await page.context().storageState()) });
  const p2 = await ctx.newPage();
  await p2.addInitScript(() => {
    const w = window as unknown as { __en172n: number }; w.__en172n = 0;
    new MutationObserver(() => { if (document.querySelector("[data-en172]")) w.__en172n += 1; }).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-en172"], childList: true });
  });
  await openQc(p2, WIDE, { group: "attention" });
  const n = await p2.evaluate(() => (window as unknown as { __en172n: number }).__en172n);
  L.check("reduced motion: never set", n === 0, `${n}`);
  await ctx.close();
  L.done(4);
});

test("L17 · the opening state: defaults on a fresh session; the smart panel kept for the visit only; the sort per device", async ({ page, browser }) => {
  const L = new Ledger("L17");
  /* a fresh start once — not on this test's own reload, which must find the visit's filters */
  await page.addInitScript(() => { try { if (!sessionStorage.getItem("l17.cleared")) { sessionStorage.removeItem("qh.qc.filters"); localStorage.removeItem("qh.qc.view"); sessionStorage.setItem("l17.cleared", "1"); } localStorage.setItem("sa.guide.queries", "1"); sessionStorage.setItem("sa.qc138.folded", "[]"); } catch { /* */ } });
  await page.setViewportSize(WIDE);
  await openRoute(page, "/queries", WIDE);
  await page.locator("[data-qc172='row']").first().waitFor({ timeout: 30_000 });
  const V = await visiblePage(page);
  const read = () => page.evaluate((V) => ({
    group: document.querySelector(`${V}[data-qc151='toolbar']`)?.textContent?.match(/Group:\s*([A-Za-z][A-Za-z ]*)/)?.[1]?.trim() ?? "",
    sort: document.querySelector(`${V}[data-qc151='toolbar']`)?.textContent?.match(/Sort:\s*([^↑↓]+[↑↓])/)?.[1]?.trim() ?? "",
    chips: document.querySelectorAll(`${V}.lf-apc`).length,
    closed: (() => { const li = document.querySelector(`${V}.qs172-rb[data-k='closed']`)?.closest("li"); return li ? !li.classList.contains("off") : null; })(),
    lastKey: [...document.querySelectorAll<HTMLElement>(`${V}.qc169 [data-qc1511='group'], ${V}.qc169 [data-qc153='fold']`)].map((e) => e.dataset.k).pop(),
    closedFolded: !!document.querySelector(`${V}.qc169 [data-qc153='fold'][data-k='closed']`),
    bar: (document.querySelector(`${V}[data-qc151='toolbar']`)?.textContent ?? "").slice(0, 160),
  }), V);
  const d = await read();
  L.check("Group: Action", d.group === "Action", `${d.group} · bar "${d.bar}"`);
  L.check("Sort: Next due ↑", /^Next due\s*↑$/.test(d.sort), d.sort);
  L.check("no filters applied", d.chips === 0, `${d.chips} chips`);
  L.check("Closed shown (its key row lit)", d.closed === true, String(d.closed));
  L.check("Closed last, folded to its line", d.lastKey === "closed" && d.closedFolded, `${d.lastKey} · folded ${d.closedFolded}`);
  /* a smart filter survives a same-session remount, and is shown as a chip */
  await page.locator(`${V}.qs172-stg button[title='Partial']`).click();
  await page.waitForTimeout(500);
  await page.reload();
  await page.locator("[data-qc172='row'], .qc151-emp").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(800);
  const W = await visiblePage(page);
  const chips = await page.evaluate((W) => [...document.querySelectorAll(`${W}.lf-apc`)].map((c) => c.textContent ?? ""), W);
  const visit = await page.evaluate(() => sessionStorage.getItem("qh.qc.filters") ?? "");
  L.check("same visit: the smart filter is back as a chip", chips.some((c) => /Stage: Partial/.test(c)), `${JSON.stringify(chips)} · stored ${visit.slice(visit.indexOf("\"smart\""), visit.indexOf("\"smart\"") + 160)}`);
  /* the sort is kept per device: change it, then a new session keeps it but drops the filter */
  await page.locator(`${W}.qc169-thc.c-ag button`).click();
  await page.waitForTimeout(500);
  const state = await page.context().storageState();
  const ctx = await browser.newContext({ storageState: state });
  const p2 = await ctx.newPage();
  await openRoute(p2, "/queries", WIDE);
  await p2.locator("[data-qc172='row']").first().waitFor({ timeout: 30_000 });
  const X = await visiblePage(p2);
  const n = await p2.evaluate((X) => ({ chips: [...document.querySelectorAll(`${X}.lf-apc`)].map((c) => c.textContent ?? ""), sort: document.querySelector(`${X}[data-qc151='toolbar']`)?.textContent?.match(/Sort:\s*([^↑↓]+[↑↓])/)?.[1]?.trim() ?? "" }), X);
  L.check("a new session: the smart filter is gone", !n.chips.some((c) => /Stage:/.test(c)), JSON.stringify(n.chips));
  L.check("a new session: the sort is kept (per device)", /^Agent/.test(n.sort), n.sort);
  await ctx.close();
  L.done(8);
});

/* ── v172.5 · What's next ──────────────────────────────────────────────────────────────────────────────────────── */

/** the ring's state as the page draws it: its segments, the key's rows and counts, the centre, the header, the toolbar */
const ring = (page: Page, V: string) => page.evaluate((V) => {
  const arcs = [...document.querySelectorAll<SVGCircleElement>(`${V}.qs172-rsvg circle.arc`)].map((c) => ({ k: c.dataset.k ?? "", r: Number(c.getAttribute("r")), op: getComputedStyle(c).opacity, pressed: c.getAttribute("aria-pressed") }));
  const key = [...document.querySelectorAll<HTMLElement>(`${V}.qs172-rb`)].map((b) => ({ k: b.dataset.k ?? "", n: Number(b.querySelector("em")?.textContent ?? NaN), off: !!b.closest("li")?.classList.contains("off") }));
  const big = document.querySelector(`${V}.qs172-rsvg .big`)?.textContent ?? "", sub = document.querySelector(`${V}.qs172-rsvg .sub`)?.textContent ?? "";
  const rows = document.querySelectorAll(`${V}[data-qc172='row']`).length;
  const groups = [...document.querySelectorAll<HTMLElement>(`${V}.qc169 [data-qc1511='group'], ${V}.qc169 [data-qc153='fold']`)].map((e) => e.dataset.k ?? "");
  const actionN = document.querySelectorAll(`${V}[data-qc1511='group'][data-k='action'] [data-qc172='row']`).length;
  return { arcs, key, centre: `${big} / ${sub}`, head: document.querySelector(`${V}.qs172-h small`)?.textContent ?? "", bar: document.querySelector(`${V}[data-qc153='count'] .qc154-tn`)?.textContent ?? "", rows, groups, actionN };
}, V);

test("L18 · the ring at rest: the key sums to the total; the centre and the toolbar read the Action needed count", async ({ page }) => {
  const L = new Ledger("L18");
  const V = await openList(page, WIDE);
  await page.waitForTimeout(900); /* the count-up is 700ms */
  const r = await ring(page, V);
  const parts = r.key.filter((x) => x.k !== "act");
  const act = r.key.find((x) => x.k === "act")?.n ?? NaN;
  const total = Number(/(\d+) in all/.exec(r.bar)?.[1] ?? NaN);
  L.check("population · segments and key rows", r.arcs.length >= 3 && parts.length >= 3, `${r.arcs.length} segments · ${parts.length} parts`);
  L.check("the parts' counts sum to the total", parts.reduce((t, x) => t + x.n, 0) === total, `${parts.map((x) => `${x.k} ${x.n}`).join(", ")} · total ${total}`);
  L.check("a part with 0 has no segment and no key row", parts.every((x) => x.n > 0) && r.arcs.every((a) => parts.some((x) => x.k === a.k)), JSON.stringify(parts));
  L.check("the centre: the Action needed count, need you", r.centre === `${act} / need you`, r.centre);
  L.check("the toolbar: “n need you · N in all”", new RegExp(`^${act} need you · ${total} in all$`).test(r.bar.trim()), r.bar);
  L.check("the toolbar's need is the list's Action needed group", act === r.actionN, `key ${act} · group ${r.actionN}`);
  L.check("the header: “N showing”", r.head === `${total} showing`, r.head);
  L.check("every segment unpicked at rest", r.arcs.every((a) => a.pressed === "false" && a.r === 40), JSON.stringify(r.arcs));
  L.done(8);
});

test("L19 · picking a part: only its rows, the centre “n / of N”, again shows everything; hover names the part", async ({ page }) => {
  const L = new Ledger("L19");
  const V = await openList(page, WIDE);
  await page.waitForTimeout(900);
  const a = await ring(page, V);
  const total = Number(/(\d+) in all/.exec(a.bar)?.[1] ?? NaN);
  const req = a.key.find((x) => x.k === "req");
  L.check("population · Materials requested has rows", !!req && req.n > 0, JSON.stringify(req));
  await page.locator(`${V}.qs172-rb[data-k='req']`).hover();
  await page.waitForTimeout(250);
  const h = await ring(page, V);
  L.check("hovering a key row: its count and short word in the centre", h.centre === `${req?.n} / requested`, h.centre);
  await page.locator(`${V}.qs172-rb[data-k='req']`).click();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
  const b = await ring(page, V);
  L.check("only its rows: the list shows the part's count", b.rows === req?.n, `${b.rows} rows · part ${req?.n}`);
  L.check("only its rows: all in Action needed", JSON.stringify(b.groups) === JSON.stringify(["action"]), JSON.stringify(b.groups));
  L.check("the centre reads “n / of N”", b.centre === `${req?.n} / of ${total}`, b.centre);
  L.check("the toolbar reads “n of N”", b.bar.replace(/\s+/g, " ").trim() === `${req?.n} of ${total}`, b.bar);
  const picked = b.arcs.find((x) => x.k === "req"), other = b.arcs.find((x) => x.k !== "req");
  L.check("the picked segment sits out at r 43, pressed", picked?.r === 43 && picked?.pressed === "true", JSON.stringify(picked));
  L.check("the others fade to .2", other?.op === "0.2" && other?.r === 40, JSON.stringify(other));
  L.check("the chip reads the part", (await page.locator(`${V}.lf-apc`).allTextContents()).some((t) => /Materials requested/.test(t)), (await page.locator(`${V}.lf-apc`).allTextContents()).join(" | "));
  await page.locator(`${V}.qs172-rb[data-k='req']`).click();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(700);
  const c = await ring(page, V);
  L.check("picked again: everything shows", c.rows === a.rows && c.centre === a.centre, `${c.rows} rows (was ${a.rows}) · ${c.centre}`);
  L.done(10);
});

test("L20 · the ring by keyboard: the arrows move between segments, focus shows the hover state, Enter picks", async ({ page }) => {
  const L = new Ledger("L20");
  const V = await openList(page, WIDE);
  await page.waitForTimeout(900);
  const a = await ring(page, V);
  L.check("population · two or more segments", a.arcs.length >= 2, `${a.arcs.length}`);
  await page.locator(`${V}.qs172-rsvg circle.arc`).first().focus();
  const at = () => page.evaluate(() => (document.activeElement as HTMLElement | null)?.dataset?.k ?? "");
  const k0 = await at();
  await page.keyboard.press("ArrowRight");
  const k1 = await at();
  L.check("ArrowRight moves focus to the next segment", k0 === a.arcs[0].k && k1 === a.arcs[1].k, `${k0} → ${k1}`);
  const f = await ring(page, V);
  const n1 = a.key.find((x) => x.k === k1)?.n;
  const ol = await page.evaluate(() => { const el = document.activeElement as Element; const cs = getComputedStyle(el); return `${cs.outlineStyle} ${cs.strokeWidth}`; });
  L.check("a focused segment draws no box, only its own focus (stroke 18)", /^none 18(px)?$/.test(ol), ol);
  L.check("focus shows that part's count in the centre", f.centre.startsWith(`${n1} / `) && !f.centre.endsWith("need you"), f.centre);
  await page.keyboard.press("ArrowLeft");
  L.check("ArrowLeft moves back", (await at()) === k0, await at());
  await page.keyboard.press("ArrowLeft");
  L.check("ArrowLeft from the first wraps to the last", (await at()) === a.arcs[a.arcs.length - 1].k, await at());
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(600);
  const p = await ring(page, V);
  L.check("Enter picks the focused segment", p.arcs.find((x) => x.k === k0)?.pressed === "true" && p.arcs.filter((x) => x.pressed === "true").length === 1, JSON.stringify(p.arcs.map((x) => `${x.k}:${x.pressed}`)));
  await page.keyboard.press(" ");
  await page.waitForTimeout(600);
  const q = await ring(page, V);
  L.check("Space picks it away again: everything shows", q.arcs.every((x) => x.pressed === "false"), JSON.stringify(q.arcs.map((x) => `${x.k}:${x.pressed}`)));
  L.done(8);
});

test("L21 · the folding sections: Stage reached open, the rest shut and inert; 220ms; remembered for the visit; instant under reduced motion", async ({ page, browser }) => {
  const L = new Ledger("L21");
  const V = await openList(page, WIDE);
  /* the harness stills every transition; the 220ms is read with that lifted (and lifted again under reduced motion,
     so the 0s there is the page's own rule, not the harness's) */
  await liftMotionSuppression(page);
  const read = () => page.evaluate((V) => [...document.querySelectorAll<HTMLElement>(`${V}.qs172-fold`)].map((s) => {
    const b = s.querySelector<HTMLElement>(".qs172-fb")!;
    return { id: s.dataset.fold ?? "", exp: s.querySelector(".qs172-ft")?.getAttribute("aria-expanded"), title: s.querySelector(".qs172-ft b")?.textContent ?? "", value: s.querySelector(".qs172-fv")?.textContent ?? "",
      inert: b.hasAttribute("inert"), h: b.getBoundingClientRect().height, dur: getComputedStyle(b).transitionDuration };
  }), V);
  const a = await read();
  const by = (x: typeof a, id: string) => x.find((y) => y.id === id);
  L.check("population · five folding sections", JSON.stringify(a.map((x) => x.id)) === JSON.stringify(["stage", "sent", "date", "sendby", "more"]), JSON.stringify(a.map((x) => x.id)));
  L.check("Stage reached, open", by(a, "stage")?.title === "Stage reached" && by(a, "stage")?.exp === "true" && (by(a, "stage")?.h ?? 0) > 20, JSON.stringify(by(a, "stage")));
  L.check("Sent shut, “any time”, inert, no height", by(a, "sent")?.exp === "false" && by(a, "sent")?.value === "any time" && by(a, "sent")?.inert === true && (by(a, "sent")?.h ?? 1) < 1, JSON.stringify(by(a, "sent")));
  L.check("the others shut", ["date", "sendby", "more"].every((id) => by(a, id)?.exp === "false" && by(a, id)?.inert), JSON.stringify(a.map((x) => `${x.id}:${x.exp}`)));
  L.check("open and shut take 220ms", /0\.22s/.test(by(a, "sent")?.dur ?? ""), by(a, "sent")?.dur ?? "");
  await page.locator(`${V}.qs172-fold[data-fold='sent'] .qs172-ft`).click();
  await page.waitForTimeout(400);
  const b = await read();
  L.check("Sent opens: not inert, its body has height", by(b, "sent")?.exp === "true" && !by(b, "sent")?.inert && (by(b, "sent")?.h ?? 0) > 40, JSON.stringify(by(b, "sent")));
  await page.reload();
  await page.locator("[data-qc172='row']").first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(1200);
  const W = await visiblePage(page);
  const c = await page.evaluate((W) => document.querySelector(`${W}.qs172-fold[data-fold='sent'] .qs172-ft`)?.getAttribute("aria-expanded"), W);
  L.check("remembered for the visit: Sent still open after a reload", c === "true", String(c));
  const ctx = await browser.newContext({ reducedMotion: "reduce", storageState: (await page.context().storageState()) });
  const p2 = await ctx.newPage();
  await openQc(p2, WIDE, { group: "attention" });
  await liftMotionSuppression(p2);
  const X = await visiblePage(p2);
  const d = await p2.evaluate((X) => getComputedStyle(document.querySelector<HTMLElement>(`${X}.qs172-fold .qs172-fb`)!).transitionDuration, X);
  L.check("reduced motion: instant", /^0s(, 0s)*$/.test(d), d);
  await ctx.close();
  L.done(8);
});
