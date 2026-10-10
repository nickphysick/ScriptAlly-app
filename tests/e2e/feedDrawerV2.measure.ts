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
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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

/* ───────────────────────── B · the feed rows ───────────────────────── */
const BASELINE = "tests/e2e/fixtures/fd2-untouched.json";

/** Every row of the open feed drawer, read once. A real function, never a template. */
async function readRows(page: Page) {
  return page.evaluate(() => {
    const dr = document.querySelector<HTMLElement>('[data-d58="drawer"]'); const body = document.querySelector<HTMLElement>('[data-d58="drawer-body"]');
    if (!dr || !body) return null;
    const bb = body.getBoundingClientRect();
    const rows = [...body.querySelectorAll<HTMLElement>('[data-d58="ev"]')].map((e) => {
      const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      const tag = e.querySelector<HTMLElement>(".d58-evtag"), say = e.querySelector<HTMLElement>(".d58-evsay"), meta = e.querySelector<HTMLElement>(".d58-evmeta");
      const disc = e.querySelector<HTMLElement>('[data-d58="ev-disc"]'), time = e.querySelector<HTMLElement>("time"), who = say?.querySelector<HTMLElement>("b") ?? null;
      const dotSvg = disc?.querySelector<SVGElement>("span svg") ?? null, glyph = disc?.querySelector<SVGElement>(":scope > svg") ?? null;
      const ds = disc ? getComputedStyle(disc) : null;
      return {
        family: e.getAttribute("data-family") ?? "", app: e.getAttribute("data-app") === "1", atype: e.getAttribute("data-atype") ?? "", status: e.getAttribute("data-status") ?? "",
        need: e.getAttribute("data-need") === "1", met: e.getAttribute("data-met") === "1",
        h: r.height, l: r.left, r: r.right, bg: cs.backgroundColor, c: cs.getPropertyValue("--c").trim(), t: cs.getPropertyValue("--t").trim(),
        before: getComputedStyle(e, "::before").content, beforeW: parseFloat(getComputedStyle(e, "::before").width) || 0,
        tag: tag ? { color: getComputedStyle(tag).color, text: (tag.textContent ?? "").trim(), size: parseFloat(getComputedStyle(tag).fontSize) } : null,
        saySize: say ? parseFloat(getComputedStyle(say).fontSize) : null, sayOver: say ? say.scrollWidth - say.clientWidth : 0, sayText: (say?.textContent ?? "").trim(),
        whoWeight: who ? getComputedStyle(who).fontWeight : null, meta: !!meta,
        disc: disc && ds ? { w: disc.getBoundingClientRect().width, bg: ds.backgroundColor, ring: ds.boxShadow } : null,
        dot: dotSvg ? { w: dotSvg.getBoundingClientRect().width, color: getComputedStyle(dotSvg).color } : null,
        glyph: glyph ? { kind: glyph.getAttribute("data-d58") ?? "", w: glyph.getBoundingClientRect().width, color: getComputedStyle(glyph).color } : null,
        timeH: time ? time.getBoundingClientRect().height : null, timeLh: time ? parseFloat(getComputedStyle(time).lineHeight) : null, timeR: time ? time.getBoundingClientRect().right : null,
        act: e.querySelector<HTMLElement>('[data-d58="ev-act"]')?.textContent?.trim() ?? null, done: e.querySelector<HTMLElement>('[data-d58="ev-done"]')?.textContent?.trim() ?? null,
      };
    });
    return {
      rows, bodyL: bb.left, bodyR: bb.right, bodyOver: body.scrollWidth - body.clientWidth,
      spines: [...body.querySelectorAll(".d58-evcard, .d58-evline, .d58-evdot")].length,
      untouched: {
        filter: [...dr.querySelectorAll<HTMLElement>("[data-d58-seg]")].map((b) => `${b.textContent?.trim()}${b.getAttribute("aria-pressed") === "true" ? "*" : ""}`),
        sum: [...dr.querySelectorAll<HTMLElement>('[data-d58="sum"]')].map((d) => (d.textContent ?? "").replace(/\s+/g, " ").trim()),
        days: [...dr.querySelectorAll<HTMLElement>('[data-d58="day"]')].map((d) => (d.textContent ?? "").replace(/\s+/g, " ").trim()),
        end: (dr.querySelector<HTMLElement>('[data-d58="drawer-end"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
      },
    };
  });
}

const INK = "rgb(28, 19, 15)";
const hexRgb = (h: string) => { const m = h.replace("#", "").match(/../g) ?? []; return `rgb(${m.map((x) => parseInt(x, 16)).join(", ")})`; };

if (process.env.FD2_CAPTURE) {
  test("FD2 capture · the untouched parts, on the build before the pack", async ({ page }) => {
    await prepare(page);
    const got: Record<string, unknown> = {};
    for (const vp of SIZES) {
      await openFeed(page, vp, false);
      got[`${vp.width}`] = await page.evaluate(() => {
        const dr = document.querySelector<HTMLElement>('[data-d58="drawer"]')!;
        return {
          filter: [...dr.querySelectorAll<HTMLElement>("[data-d58-seg]")].map((b) => `${b.textContent?.trim()}${b.getAttribute("aria-pressed") === "true" ? "*" : ""}`),
          sum: [...dr.querySelectorAll<HTMLElement>('[data-d58="sum"]')].map((d) => (d.textContent ?? "").replace(/\s+/g, " ").trim()),
          days: [...dr.querySelectorAll<HTMLElement>('[data-d58="day"]')].map((d) => (d.textContent ?? "").replace(/\s+/g, " ").trim()),
          end: (dr.querySelector<HTMLElement>('[data-d58="drawer-end"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
        };
      });
      await page.keyboard.press("Escape");
    }
    mkdirSync("tests/e2e/fixtures", { recursive: true });
    writeFileSync(BASELINE, JSON.stringify(got, null, 1));
    console.log(`captured ${Object.keys(got).length} sizes`);
  });
}

test("FD2 B1 B2 B3 B4 B7 · the rows: families, tints, marks, housekeeping, fit", async ({ page }) => {
  test.skip(!!process.env.FD2_CAPTURE, "capture run");
  test.setTimeout(300_000);
  const L = new Ledger(MUT && /^B[12347]$/.test(MUT) ? MUT : "B1-B7");
  await prepare(page);
  for (const vp of SIZES) {
    await openFeed(page, vp, true);
    const d = await readRows(page); const at = `@${vp.width}`;
    L.check("B precondition: the drawer holds rows", at, !!d && d.rows.length >= 8, `${d?.rows.length ?? 0} rows`);
    if (!d) continue;
    const tally: Record<string, number> = {};
    for (const r of d.rows) tally[r.family] = (tally[r.family] ?? 0) + 1;
    console.log(`  FD2 ${at}: ${d.rows.length} rows — ${Object.entries(tally).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
    L.check("B1 population: at least five families are on the account", at, Object.keys(tally).length >= 5, JSON.stringify(tally));
    L.check("B1 population: a request, a closed and a housekeeping row are there", at, (tally.request ?? 0) > 0 && (tally.closed ?? 0) > 0 && (tally.housekeeping ?? 0) > 0, JSON.stringify(tally));
    const badFam = d.rows.filter((r) => r.family !== familyOf(r));
    L.check("B1 every row's family is the table's", at, badFam.length === 0, badFam.slice(0, 3).map((r) => `${r.status || r.atype} → ${r.family}, want ${familyOf(r)}`).join(" · ") || `${d.rows.length} rows agree`);
    const badCol = d.rows.filter((r) => !FAMILY[r.family] || hexRgb(r.c) !== FAMILY[r.family].c || (r.tag && r.tag.color !== FAMILY[r.family].c));
    L.check("B1 the tag's colour is the family's", at, badCol.length === 0, badCol.slice(0, 3).map((r) => `${r.family}: tag ${r.tag?.color} · --c ${r.c}`).join(" · ") || "all agree");
    L.check("B1 nothing has a spine, a card or a one-line row", at, d.spines === 0 && d.rows.every((r) => r.before === "none" || r.beforeW === 0), `${d.spines} old parts`);
    /* B2 */
    const tinted = d.rows.filter((r) => r.family === "offer" || r.family === "request"), plain = d.rows.filter((r) => r.family !== "offer" && r.family !== "request" && r.family !== "housekeeping");
    L.check("B2 population: tinted and plain rows both", at, tinted.length > 0 && plain.length > 0, `${tinted.length} tinted · ${plain.length} plain`);
    const badT = tinted.filter((r) => r.bg !== FAMILY[r.family].t || r.disc?.bg !== "rgb(255, 255, 255)" || !near(r.saySize, 17, 0.5));
    L.check("B2 offers and requests: the family's tint, a white disc, a 17px sentence", at, badT.length === 0, badT.slice(0, 2).map((r) => `${r.family}: ${r.bg} · disc ${r.disc?.bg} · ${r.saySize}`).join(" · ") || `${tinted.length} rows`);
    const badP = d.rows.filter((r) => r.family !== "offer" && r.family !== "request").filter((r) => r.bg !== "rgba(0, 0, 0, 0)" || (r.family !== "housekeeping" && !near(r.saySize, 15.5, 0.5)));
    L.check("B2 every other row is untinted, its sentence 15.5px", at, badP.length === 0, badP.slice(0, 2).map((r) => `${r.family}: ${r.bg} · ${r.saySize}`).join(" · ") || `${plain.length} rows`);
    /* B3 */
    const withStatus = d.rows.filter((r) => r.status && r.family !== "housekeeping" && r.family !== "nudge");
    const badDot = withStatus.filter((r) => !r.dot || !near(r.dot.w, 24, 1) || r.dot.color !== INK || !near(r.disc?.w, 34, 0.5));
    L.check("B3 population: rows with a status", at, withStatus.length >= 5, `${withStatus.length}`);
    L.check("B3 a row with a status holds a 24px StatusDot in ink, on a 34px disc", at, badDot.length === 0, badDot.slice(0, 2).map((r) => `${r.status}: ${JSON.stringify(r.dot)} disc ${r.disc?.w}`).join(" · ") || `${withStatus.length} dots`);
    const nudges = d.rows.filter((r) => r.family === "nudge"), house = d.rows.filter((r) => r.family === "housekeeping");
    L.check("B3 a nudge holds the bell, housekeeping the gear, both in ink", at, nudges.every((r) => r.glyph?.kind === "ev-bell" && near(r.glyph.w, 16, 0.5) && r.glyph.color === INK) && house.length > 0 && house.every((r) => r.glyph?.kind === "ev-gear" && near(r.glyph.w, 11, 0.5) && r.glyph.color === INK), `${nudges.length} nudges · ${house.length} housekeeping`);
    /* B4 */
    const badH = house.filter((r) => r.h > 36 || r.tag || r.meta || (r.whoWeight !== null && Number(r.whoWeight) >= 600) || !near(r.saySize, 13, 0.5));
    L.check("B4 housekeeping is one line: 36 tall at most, no tag, no meta, the person not bold", at, house.length > 0 && badH.length === 0, badH.slice(0, 2).map((r) => `${r.h.toFixed(1)} tall · tag ${!!r.tag} · meta ${r.meta} · weight ${r.whoWeight}`).join(" · ") || `${house.length} rows, tallest ${Math.max(...house.map((r) => r.h)).toFixed(1)}`);
    /* B7 */
    if (vp.width === 1280) {
      const over = d.rows.filter((r) => r.r > d.bodyR + 0.5 || r.l < d.bodyL - 0.5 || /* a housekeeping line is cut with an ellipsis on purpose */ (r.family !== "housekeeping" && r.sayOver > 1) || (r.timeR ?? 0) > d.bodyR + 0.5);
      L.check("B7 no row overflows the drawer at 1280", at, over.length === 0 && d.bodyOver <= 1, over.slice(0, 2).map((r) => `"${r.sayText.slice(0, 30)}" over ${r.sayOver}`).join(" · ") || `body overflow ${d.bodyOver}`);
      const wrapT = d.rows.filter((r) => r.timeH !== null && r.timeLh !== null && r.timeH > r.timeLh * 1.5);
      L.check("B7 no time wraps", at, wrapT.length === 0, `${wrapT.length} wrapped`);
    }
    await page.keyboard.press("Escape");
  }
  L.done(SIZES.length * 11);
});

test("FD2 B5 B6 · the actions still act, and the parts around the rows are untouched", async ({ page }) => {
  test.skip(!!process.env.FD2_CAPTURE, "capture run");
  test.setTimeout(300_000);
  const L = new Ledger(MUT && /^B[56]$/.test(MUT) ? MUT : "B5-B6");
  await prepare(page);
  const base = existsSync(BASELINE) ? (JSON.parse(readFileSync(BASELINE, "utf8")) as Record<string, { filter: string[]; sum: string[]; days: string[]; end: string }>) : null;
  expect(base, "B6 baseline missing: capture it against a build of the base (FD2_CAPTURE=1)").not.toBeNull();
  for (const vp of SIZES) {
    const at = `@${vp.width}`;
    /* B6, at the default window, as the baseline was read */
    await openFeed(page, vp, false);
    const d0 = await readRows(page); const b = base![`${vp.width}`];
    L.check("B6 the filter reads as on the baseline", at, JSON.stringify(d0?.untouched.filter) === JSON.stringify(b.filter), `${d0?.untouched.filter.join(" | ")}`);
    L.check("B6 the summary figures are the baseline's", at, JSON.stringify(d0?.untouched.sum) === JSON.stringify(b.sum), `${d0?.untouched.sum.join(" | ")} vs ${b.sum.join(" | ")}`);
    L.check("B6 the day headings and counts are the baseline's", at, JSON.stringify(d0?.untouched.days) === JSON.stringify(b.days), `${d0?.untouched.days.length} days vs ${b.days.length}`);
    L.check("B6 the end line is the baseline's", at, d0?.untouched.end === b.end, `"${d0?.untouched.end}" vs "${b.end}"`);
    /* B5, at Everything */
    await page.locator('[data-d58="drawer-range"]').selectOption("all", { timeout: 4000 });
    await page.waitForTimeout(400);
    const d = await readRows(page);
    const needs = d?.rows.filter((r) => r.need) ?? [], mets = d?.rows.filter((r) => r.met) ?? [];
    console.log(`  FD2 B5 ${at}: ${needs.length} open (${needs.filter((r) => r.family === "offer").length} offers) · ${mets.length} met`);
    L.check("B5 population: an open request or offer, and a met one", at, needs.length > 0 && mets.length > 0, `${needs.length} open · ${mets.length} met`);
    L.check("B5 every open one shows its action, in a tinted row", at, needs.every((r) => !!r.act && /→$/.test(r.act) && !r.done && (r.family === "offer" || r.family === "request")), needs.slice(0, 3).map((r) => `${r.family}: ${r.act}`).join(" · "));
    L.check("B5 every met one shows the day it went", at, mets.every((r) => !r.act && /^✓ Sent on \d/.test(r.done ?? "")), mets.slice(0, 3).map((r) => r.done).join(" · "));
    /* press a request's action: the query drawer opens in the built mode, and nothing is written (it is closed untouched) */
    for (const fam of ["request", "offer"] as const) {
      const btn = page.locator(`[data-d58="ev"][data-family="${fam}"] [data-d58="ev-act"]`).first();
      if (!(await btn.count())) { if (fam === "request") L.check("B5 a request's action opens the send journey", at, false, "no open request on the account"); else console.log(`  FD2 B5 ${at}: no open offer on the account — the offer mode is held at unit`); continue; }
      await btn.scrollIntoViewIfNeeded();
      await btn.click({ timeout: 4000 });
      const qad = page.locator("[data-qad-drawer]:visible").first();
      await qad.waitFor({ timeout: 5000 }).catch(() => {});
      const mode = (await qad.count()) ? await qad.getAttribute("data-qad-drawer") : null;
      L.check(fam === "request" ? "B5 a request's action opens the send journey" : "B5 an offer's action opens the offer journey", at, mode === (fam === "request" ? "sent" : "offer"), `mode ${mode}`);
      if (mode) { await page.locator('[data-qad-drawer]:visible button[aria-label="Close"], [data-qad-drawer]:visible [data-qad="close"]').first().click({ timeout: 3000 }).catch(() => page.keyboard.press("Escape")); await page.waitForTimeout(400); }
      if (!(await page.locator('[data-d58="drawer"]').count())) { await page.locator('[data-d58="tab"]').click({ timeout: 4000 }).catch(() => {}); await page.locator('[data-d58="drawer-range"]').selectOption("all", { timeout: 4000 }).catch(() => {}); await page.waitForTimeout(400); }
    }
    await page.keyboard.press("Escape");
  }
  L.done(SIZES.length * 8);
});
