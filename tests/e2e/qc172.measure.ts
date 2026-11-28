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
 *   L4 one grouping: the list's group keys (Group = Action) and Birds-eye's are the same, in the same order, Closed
 *      last; the first Needs-action row is an offer when one exists.
 *   L5 the panel: Stage Queried leaves only queries whose furthest stage is Queried; the reply date's "Not dated" count
 *      is Birds-eye's "Waiting, no reply date" count; reply + send-by together never shows fewer than either alone.
 *   L6 the panel's type sizes: every text node is 12, 14, 16, 18 or 20px — the ranges' scale numbers and the icon
 *      glyphs (★ ▾ ▴ ✓) excepted; a pill's words are the shell's filter-pill token (--sp-fpill-size, 14.5px).
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

test("L4 · one grouping: list and Birds-eye share keys and order, Closed last, an offer first", async ({ page }) => {
  const L = new Ledger("L4");
  const V = await openList(page, WIDE);
  const list = await page.evaluate((V) => {
    const keys = [...document.querySelectorAll<HTMLElement>(`${V}.qc169 [data-qc1511='group'], ${V}.qc169 [data-qc153='fold']`)].map((e) => e.dataset.k ?? "");
    const all = [...document.querySelectorAll<HTMLElement>(`${V}[data-qc172='row']`)];
    const first = document.querySelector<HTMLElement>(`${V}[data-qc1511='group'][data-k='action'] [data-qc172='row']`);
    return { keys, offers: all.filter((e) => e.dataset.status === "Offer").length, first: first?.dataset.status ?? null };
  }, V);
  await toView(page, "birds");
  const be = await page.evaluate((V) => [...document.querySelectorAll<HTMLElement>(`${V}[data-qc150='be-group']`)].map((e) => e.dataset.group ?? ""), V);
  L.check("population", list.keys.length >= 2 && be.length >= 2, `list ${JSON.stringify(list.keys)} · birds-eye ${JSON.stringify(be)}`);
  L.check("same keys, same order", JSON.stringify(list.keys) === JSON.stringify(be), `list ${JSON.stringify(list.keys)} · birds-eye ${JSON.stringify(be)}`);
  L.check("the four groups only", list.keys.every((k) => ["action", "window", "nodate", "closed"].includes(k)), JSON.stringify(list.keys));
  L.check("Closed last (list)", !list.keys.includes("closed") || list.keys[list.keys.length - 1] === "closed", JSON.stringify(list.keys));
  L.check("Closed last (birds-eye)", !be.includes("closed") || be[be.length - 1] === "closed", JSON.stringify(be));
  L.check("an offer leads Needs action", list.offers === 0 || list.first === "Offer", `${list.offers} offers; first is ${list.first}`);
  L.done(6);
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
  const m = /(\d+) of (\d+)|All (\d+)/.exec(t ?? "");
  return m ? Number(m[1] ?? m[3]) : NaN;
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
    const sec = [...document.querySelectorAll<HTMLElement>(`${V}.qs172-s`)].find((s) => s.querySelector(".qs172-sh b")?.textContent?.includes("reply date"));
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
        if (/^[★▾▴✓\s]+$/.test(t)) continue;               // icon glyphs
        /* a pill is the shell's standard filter pill: its words are the shell token --sp-fpill-size (primitives.css) */
        const pill = el.closest(".qs172-chip, .qs172-inc") && !el.closest("em") ? parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--sp-fpill-size")) : null;
        out.push({ t: t.slice(0, 24), px: parseFloat(getComputedStyle(el).fontSize), pill });
      }
      return out;
    }, V);
    L.check(`${where} · population`, r.length > 20, `${r.length} text nodes`);
    const bad = r.filter((x) => (x.pill != null ? x.px !== x.pill : ![12, 14, 16, 18, 20].includes(x.px)));
    /* v172.4 — Include closed is a tick now, so the folded panel has no pill; the pills are checked with More filters open */
    if (where !== "folded") L.check(`${where} · pills read the shell token`, r.some((x) => x.pill != null && x.pill > 0), `${r.filter((x) => x.pill != null).length} pill words`);
    L.check(`${where} · sizes`, bad.length === 0, bad.slice(0, 6).map((x) => `"${x.t}" ${x.px}px`).join("; ") || `${r.length} nodes, all in the set`);
  };
  await read("folded");
  await page.locator(`${V}.qs172-more`).click();
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
  await page.locator(`${V}.qs172-more`).click();
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
    const sec = [...document.querySelectorAll<HTMLElement>(`${V}.qs172-s`)].find((s) => s.querySelector(".qs172-sh b")?.textContent?.trim() === "Sent");
    if (!sec) return null;
    const bars = [...sec.querySelectorAll<HTMLElement>(".qs172-hist > i")].map((b) => ({ w: b.getBoundingClientRect().width, h: b.getBoundingClientRect().height }));
    const scale = [...sec.querySelectorAll<HTMLElement>(".qs172-scale span")].map((x) => x.textContent ?? "");
    const now = sec.querySelector(".qs172-now2")?.textContent ?? "";
    const idle = sec.querySelector(".qs172-sh > span")?.textContent ?? "";
    const max = Number(sec.querySelector<HTMLInputElement>('input[aria-label="Sent to"]')?.max ?? NaN);
    return { bars, scale, now, idle, max };
  }, V);
}

test("L10 · the Sent chart on a long campaign: ≤ 26 bars, each counted bar ≥ 3px, a year on the scale, the handle steps", async ({ page }) => {
  const L = new Ledger("L10");
  const V = await openList(page, WIDE);
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
      const sec = [...document.querySelectorAll<HTMLElement>(`${V}.qs172-s`)].find((s) => s.querySelector(".qs172-sh b")?.textContent?.trim() === "Sent")!;
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
    .map((s) => { const sp = [...s.querySelectorAll<HTMLElement>(".qs172-scale span")]; return { t: s.querySelector(".qs172-sh b")?.textContent?.trim(), a: sp[0]?.textContent, b: sp[sp.length - 1]?.textContent }; }), V);
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

test("L14 · the list just ends; Include closed is a tick that adds and removes the Closed group; handles centred on the track's ends", async ({ page }) => {
  const L = new Ledger("L14");
  const V = await openList(page, WIDE);
  const txt = await page.locator(`${V}.qc151`).first().innerText();
  L.check("no “That’s all” under the list", !/That’s all/.test(txt), /That’s all \d+/.exec(txt)?.[0] ?? "none");
  const closedKeys = () => page.evaluate((V) => document.querySelectorAll(`${V}.qc169 [data-qc1511='group'][data-k='closed'], ${V}.qc169 [data-qc153='fold'][data-k='closed']`).length, V);
  const box = page.locator(`${V}.qs172-ck--closed input[type='checkbox']`);
  L.check("Include closed is a checkbox", (await box.count()) === 1, `${await box.count()} .qs172-ck--closed checkbox`);
  if (await box.count()) {
    L.check("ticked by default", await box.isChecked(), String(await box.isChecked()));
    const on = await closedKeys();
    await box.uncheck(); await page.waitForTimeout(600);
    const off = await closedKeys();
    await box.check(); await page.waitForTimeout(600);
    const back = await closedKeys();
    L.check("population · a Closed group with it ticked", on === 1, `${on}`);
    L.check("unticked: no Closed group", off === 0, `${off}`);
    L.check("ticked again: the Closed group is back", back === 1, `${back}`);
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
  await page.locator(`${V}.qs172-seg button`).nth(1).click();
  await page.waitForTimeout(900);
  await page.locator(`${V}.qs172-seg button`).nth(1).click();
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
