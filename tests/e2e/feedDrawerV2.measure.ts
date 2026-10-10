/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Activity feed drawer v2 (design-refs/dashboard/feed-drawer-v2.html, `.drawer` and `.nf`) — the FD2 locks, on the
 * rendered page at 1512 × 900 and 1280 × 800.
 *
 * A1 float · A2 wash · A3 inside · B1 families · B2 tinted · B3 marks · B4 housekeeping · B5 actions ·
 * B6 untouched · B7 fit. (B8, the "new" rule, is not built: `lib/dashSeen` was retired with the feed card.)
 *
 * Each was red by its named mutation (`FD2_MUTATE=<lock>`: one named thing broken IN THE PAGE) before its green
 * was believed: reports/feed-drawer-v2/mutation-proofs.json.
 *
 * ⚠️ THE HARNESS ACCOUNT IS THE FIXTURE, AND THE RUN SAYS WHICH FAMILIES IT HELD. The drawer is read at
 *    "Everything", and every lock that has branches tallies the branches it entered. Every family's mapping is
 *    also held at unit (src/components/dashboard/v58/feedFamily.test.ts), where the fixture is complete.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { openDrawer, openQc, pixel } from "./qc126Lib";

const DIR = "reports/feed-drawer-v2";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.FD2_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

/** the families' colours, the pack's table */
const FAMILY: Record<string, { c: string; t: string }> = {
  offer: { c: "rgb(184, 134, 47)", t: "rgb(246, 236, 214)" },
  request: { c: "rgb(61, 80, 112)", t: "rgb(226, 231, 239)" },
  queried: { c: "rgb(138, 106, 60)", t: "rgb(244, 234, 217)" },
  sent: { c: "rgb(61, 80, 112)", t: "rgb(226, 231, 239)" },
  nudge: { c: "rgb(162, 69, 42)", t: "rgb(243, 221, 210)" },
  closed: { c: "rgb(124, 113, 104)", t: "rgb(236, 232, 227)" },
  housekeeping: { c: "rgb(163, 156, 148)", t: "rgb(240, 237, 233)" },
};
/** the pack's table again, written from the row's own data attributes: an independent derivation */
function familyOf(r: { app: boolean; atype: string; status: string }): string {
  if (r.app) return "housekeeping";
  if (r.atype === "Nudge Sent") return "nudge";
  if (r.atype === "Offer Accepted") return "offer";
  if (r.atype === "Offer Declined") return "closed";
  if (["Offer", "Signed"].includes(r.status)) return "offer";
  if (["Partial Requested", "Full Requested", "Revise & Resubmit"].includes(r.status)) return "request";
  if (r.status === "Queried") return "queried";
  if (["Partial Sent", "Full Sent", "Resubmitted"].includes(r.status)) return "sent";
  return "closed";
}

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  A1: { css: `.d58-drawer, .bvd, .hdr { top: 0 !important; }` },
  A2: { css: `.d58-wash { top: 8px !important; right: 8px !important; bottom: 8px !important; }` },
  /* the sort popover back on its pill's left edge, where it ran past the viewport */
  A3: { css: `.bvd-pop--sort { left: 0 !important; right: auto !important; }` },
  B1: { js: `document.querySelectorAll('[data-d58="ev"][data-status="Full Requested"]').forEach((e) => e.setAttribute("data-family", "sent"));` },
  B2: { css: `[data-d58="ev"][data-family="sent"] { background: var(--t) !important; }` },
  B3: { css: `[data-d58="ev"] [data-d58="ev-disc"] svg { color: var(--c) !important; }` },
  B4: { js: `document.querySelectorAll('[data-d58="ev"][data-family="housekeeping"]').forEach((e) => { if (e.querySelector(".d58-evtag")) return; const m = e.querySelector(".d58-evmain"); if (!m) return; const t = document.createElement("div"); t.className = "d58-evtop"; t.style.cssText = "display:flex;flex-basis:100%"; t.innerHTML = '<span class="d58-evtag">Agent added</span>'; m.prepend(t); m.style.flexWrap = "wrap"; });` },
  B5: { js: `document.querySelectorAll('[data-d58="ev-act"]').forEach((b) => { if (b.hasAttribute("data-mut")) return; const c = b.cloneNode(true); c.setAttribute("data-mut", ""); b.replaceWith(c); });` },
  B6: { js: `document.querySelectorAll('[data-d58="sum"] b').forEach((b, i) => { const n = String(document.querySelectorAll('[data-d58="ev"][data-family="' + ["request", "sent", "offer"][i] + '"]').length); if (b.textContent !== n) b.textContent = n; });` },
  B7: { css: `[data-d58="ev"] .d58-evsay { white-space: nowrap !important; }` },
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const KILL = "*, *::before, *::after { transition: none !important; animation: none !important; }";
async function prepare(page: Page) {
  const m = MUT ? MUTATIONS[MUT] : undefined;
  if (MUT && !m) throw new Error(`unknown FD2_MUTATE ${MUT}`);
  await page.addInitScript(({ css, js }) => {
    try {
      localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1");
      for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1");
    } catch { /* private mode */ }
    const put = () => {
      const s = document.createElement("style"); s.setAttribute("data-fd2", ""); s.textContent = css; document.documentElement.appendChild(s);
      if (js) { const f = new Function(js); const tick = () => { try { f(); } catch { /* */ } requestAnimationFrame(tick); }; tick(); }
    };
    if (document.documentElement) put(); else document.addEventListener("readystatechange", put, { once: true });
  }, { css: `${KILL}${m?.css ?? ""}`, js: m?.js ?? "" });
}

async function openFeed(page: Page, vp: VP, everything = true) {
  await openRoute(page, "/dashboard", vp);
  await page.locator('[data-d58="page"][data-loading="0"]').first().waitFor({ timeout: 25_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.locator('[data-d58="tab"]').click({ timeout: 6000 });
  await page.locator('[data-d58="drawer"]').waitFor({ timeout: 6000 });
  if (everything) await page.locator('[data-d58="drawer-range"]').selectOption("all", { timeout: 4000 });
  await page.waitForTimeout(500);
}

/** A drawer's box against the viewport, its radius, its header's colour, and the width its own rule asks for. */
async function drawerBox(page: Page, sel: string, headSel: string) {
  return page.evaluate(({ sel, headSel }) => {
    const e = [...document.querySelectorAll<HTMLElement>(sel)].find((x) => x.getBoundingClientRect().height > 0);
    if (!e) return null;
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    const head = e.querySelector<HTMLElement>(headSel);
    const main = document.querySelector(".ws-main")?.getBoundingClientRect();
    return {
      top: r.top, right: window.innerWidth - r.right, bottom: window.innerHeight - r.bottom, w: r.width, l: r.left,
      radius: cs.borderTopRightRadius, overflow: cs.overflow, headBg: head ? getComputedStyle(head).backgroundColor : null,
      vw: window.innerWidth, vh: window.innerHeight, mainW: main?.width ?? 0, mainL: main?.left ?? 0,
    };
  }, { sel, headSel });
}
const rgbOf = (s: string | null) => (s?.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
const far = (p: number[], q: number[]) => p.length === 3 && q.length === 3 && Math.max(...p.map((v, i) => Math.abs(v - q[i]))) > 30;

/* ───────────────────────── A1 · A2 · A3 ───────────────────────── */
test("FD2 A1 A2 A3 · every half-screen drawer floats", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger(MUT && /^A/.test(MUT) ? MUT : "A1-A3");
  await prepare(page);
  for (const vp of SIZES) {
    const at = `@${vp.width}`;
    const float = async (name: string, sel: string, headSel: string, want: (b: NonNullable<Awaited<ReturnType<typeof drawerBox>>>) => number) => {
      const b = await drawerBox(page, sel, headSel);
      L.check("A1 precondition: the drawer is open", `${name} ${at}`, !!b, b ? `${b.w.toFixed(0)} wide` : "absent");
      if (!b) return;
      L.check("A1 8 from the top, right and bottom (±1)", `${name} ${at}`, near(b.top, 8, 1) && near(b.right, 8, 1) && near(b.bottom, 8, 1), `${b.top.toFixed(1)} / ${b.right.toFixed(1)} / ${b.bottom.toFixed(1)}`);
      L.check("A1 radius 12, clipped", `${name} ${at}`, b.radius === "12px" && b.overflow === "hidden", `${b.radius} · overflow ${b.overflow}`);
      L.check("A1 the width is the one it had (±1)", `${name} ${at}`, near(b.w, want(b), 1), `${b.w.toFixed(1)} vs ${want(b).toFixed(1)}`);
      /* one pixel in from the box's top-right corner is OUTSIDE the 12px arc: it must be the wash or dim, not the header */
      const corner = await pixel(page, b.vw - 8 - 2, 8 + 1), head = rgbOf(b.headBg);
      L.check("A1 the header's top corner is cut to the radius", `${name} ${at}`, head.length === 3 && far(corner, head), `corner rgb(${corner.join(", ")}) · header ${b.headBg}`);
    };
    /* the feed drawer */
    await openFeed(page, vp, false);
    await float("feed", '[data-d58="drawer"]', '[data-d58="drawer-head"]', (b) => Math.min(640, b.mainW * 0.52));
    const wash = await page.evaluate(() => {
      const w = document.querySelector<HTMLElement>('[data-d58="wash"]'); const m = document.querySelector(".ws-main")?.getBoundingClientRect();
      if (!w || !m) return null; const r = w.getBoundingClientRect();
      return { l: r.left, t: r.top, r: r.right, b: r.bottom, mainL: m.left, vw: window.innerWidth, vh: window.innerHeight, bg: getComputedStyle(w).backgroundColor };
    });
    L.check("A2 the wash runs from the main column's left to the viewport's right, top to bottom", `feed ${at}`, !!wash && near(wash.l, wash.mainL, 1) && near(wash.r, wash.vw, 0.5) && near(wash.t, 0, 0.5) && near(wash.b, wash.vh, 0.5), JSON.stringify(wash));
    L.check("A2 the wash is the light wash it was", `feed ${at}`, wash?.bg === "rgba(242, 238, 232, 0.55)", `${wash?.bg}`);
    await page.keyboard.press("Escape");
    /* the Birds-eye drawer */
    await openQc(page, vp);
    await openDrawer(page);
    await float("birds-eye", '[data-qcv="bvd"]', ".bvd-head", (b) => Math.min(1120, b.vw * 0.74));
    const dim = await page.evaluate(() => { const d = document.querySelector<HTMLElement>('[data-qcv="bvd-dim"]'); if (!d) return null; const r = d.getBoundingClientRect(); return { l: r.left, t: r.top, w: r.width, h: r.height, vw: window.innerWidth, vh: window.innerHeight }; });
    L.check("A2 the Birds-eye dim still covers the viewport", `birds-eye ${at}`, !!dim && dim.l === 0 && dim.t === 0 && near(dim.w, dim.vw, 0.5) && near(dim.h, dim.vh, 0.5), JSON.stringify(dim));
    let pops = 0;
    for (const k of ["filter", "group", "sort"]) {
      await page.locator(`[data-qcv="bvd-pill"][data-k="${k}"]`).first().click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(250);
      const p = await page.evaluate((kk) => {
        const e = [...document.querySelectorAll<HTMLElement>(`[data-qcv="bvd-pop"][data-k="${kk}"], [data-qcv="bvd-pop"]`)].find((x) => x.getBoundingClientRect().height > 0);
        const d = document.querySelector<HTMLElement>('[data-qcv="bvd"]')?.getBoundingClientRect();
        if (!e || !d) return null; const r = e.getBoundingClientRect();
        return { l: r.left, t: r.top, r: r.right, b: r.bottom, vw: window.innerWidth, vh: window.innerHeight, dl: d.left, dr: d.right, db: d.bottom };
      }, k);
      if (p) pops++;
      L.check("A3 the popover lies wholly inside the viewport and the drawer", `${k} ${at}`, !!p && p.l >= Math.max(0, p.dl) - 0.5 && p.r <= Math.min(p.vw, p.dr) + 0.5 && p.t >= 0 && p.b <= Math.min(p.vh, p.db) + 0.5, p ? `${p.l.toFixed(0)}–${p.r.toFixed(0)} × ${p.t.toFixed(0)}–${p.b.toFixed(0)} in drawer ${p.dl.toFixed(0)}–${p.dr.toFixed(0)}` : "no popover opened");
      await page.keyboard.press("Escape"); await page.waitForTimeout(150);
    }
    L.check("A3 population: the three popovers opened", `birds-eye ${at}`, pops === 3, `${pops}`);
    /* Housekeeping */
    await openRoute(page, "/agents", vp);
    await page.locator(".clv-row").first().waitFor({ timeout: 25_000 }).catch(() => {});
    await page.waitForTimeout(1200);
    await page.mouse.click(5, 5).catch(() => {});
    for (let i = 0; i < 3 && !(await page.locator('[data-hdr="housekeeping"]').isVisible().catch(() => false)); i++) {
      await page.keyboard.press("h");
      await page.locator('[data-hdr="housekeeping"]').waitFor({ state: "visible", timeout: 4000 }).catch(() => {});
    }
    await page.waitForTimeout(400);
    await float("housekeeping", '[data-hdr="housekeeping"]', '[data-hdr="head"] > *', (b) => Math.min(780, b.vw * 0.56));
    await page.keyboard.press("Escape");
  }
  L.done(SIZES.length * 18);
});
