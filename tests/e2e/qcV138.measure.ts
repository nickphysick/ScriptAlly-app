/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138 (design-refs/query-centre-v138/query-centre-v138.html) — the QC138 locks, on the rendered page
 * at 1512 × 900 and 1280 × 800 unless a lock says otherwise.
 *
 * A1 header · A2 glyphs · B1 filters · C1 sheet · C2 sort · D1 your move · D2 bands · E1 rows · E2 due · E3 compact ·
 * F1 hover · F2 peek · G1 select · H1 load · I1 empty · J1 discs. (L1 is the other suites, run as they are.)
 *
 * Each was run with its named mutation before its green was believed: `QC138_MUTATE=<lock>` applies the in-page
 * mutations below; C2, D1 and F2 are SOURCE mutations, built in the measurement worktree (reports/qc-v138/).
 *
 * ⚠️ EVERY PROBE STARTS FROM THE VISIBLE GROUP: every workspace page stays mounted.
 * ⚠️ THE HARNESS SUPPRESSES ANIMATION; H1 and F2's timing lift it (`liftMotionSuppression`).
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";

const DIR = "reports/qc-v138";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QC138_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  /* the courier image back in the header */
  A1: { js: `(() => { const r = document.querySelector('[data-qc138="header-row"]'); if (r && !r.querySelector(".qc138-mut")) { const i = document.createElement("img"); i.className = "qc138-mut"; i.src = "/images/qc/hero-courier-map.png"; i.style.width = "120px"; r.appendChild(i); } })()` },
  /* the dashed ring on every glyph */
  A2: { js: `(() => { for (const s of document.querySelectorAll('[data-qc138="glyph-btn"] svg')) { if (!s.querySelector('[data-qc138="dashed"]')) { const c = document.createElementNS("http://www.w3.org/2000/svg", "circle"); c.setAttribute("data-qc138", "dashed"); c.setAttribute("cx", "20"); c.setAttribute("cy", "20"); c.setAttribute("r", "18.6"); c.setAttribute("fill", "none"); c.setAttribute("stroke", "currentColor"); c.setAttribute("stroke-dasharray", "2.6 3.2"); s.prepend(c); } } })()` },
  /* the switch drawn from a copied class: it never shows on, whatever the filter is */
  B1: { js: `(() => { new MutationObserver(() => { for (const s of document.querySelectorAll('[data-qc138="switch"][data-on]')) { s.removeAttribute("data-on"); s.closest('[role="switch"]')?.setAttribute("aria-checked", "false"); } }).observe(document.body, { subtree: true, childList: true, attributes: true }); })()` },
  /* the Sort pill back in the navy row */
  C1: { js: `(() => { const t = document.querySelector('[data-qc138="top"] .qc138-tools'); if (t && !t.querySelector(".qc138-mut")) { const b = document.createElement("button"); b.className = "qc138-mut"; b.setAttribute("data-qcv", "ws-sort"); b.textContent = "Sort: due"; t.prepend(b); } })()` },
  /* the band no longer sticks */
  D2: { css: `.qc138-sheet .qc138-band { position: relative !important; top: auto !important; }` },
  /* circles coloured by court */
  E1: { css: `.qc138-row[data-move="true"] .sa-disc { background: rgb(176, 96, 62) !important; }` },
  /* the dial shown in compact */
  E2: { js: `(() => { for (const d of document.querySelectorAll('.qc138-sheet[data-density="compact"] [data-qcv="row-due"]')) { if (!d.querySelector(".qc138-dial")) { const s = document.createElement("span"); s.className = "qc138-dial"; s.setAttribute("data-qcv", "row-dial"); d.appendChild(s); } } })()` },
  /* the track left visible in compact */
  E3: { css: `.qc138-sheet[data-density="compact"] .qc138-trk { display: flex !important; }` },
  /* the lift's translate skipped */
  F1: { css: `.qc138-sheet .qc138-row:hover { transform: none !important; }` },
  /* the circle's click opens the panel */
  G1: { js: `(() => { document.addEventListener("click", (e) => { const p = e.target.closest && e.target.closest('[data-qcv="row-pick"]'); if (p) { const r = p.closest('[data-qcv="row"]'); setTimeout(() => r && r.click(), 0); } }, true); })()` },
  /* the entrance replays on every change to the list */
  H1: { js: `(() => { const g = [...document.querySelectorAll(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().height > 0); new MutationObserver(() => { if (g && !g.hasAttribute("data-enter138")) g.setAttribute("data-enter138", ""); }).observe(g.querySelector(".qc138-body"), { subtree: true, childList: true }); })()` },
  /* the example's band says "With you" */
  I1: { js: `(() => { for (const b of document.querySelectorAll('[data-qc138="example-band"]')) if (b.textContent === "Your move") b.textContent = "With you"; })()` },
  /* the old grey back on a page rule */
  J1: { css: `.qcw-disc--closed, .qc138-row--closed .qc138-disc { background: #b9b0a8 !important; }` },
};

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, where: string, ok: unknown, detail: string) { this.rows.push({ lock, where, ok: !!ok, detail }); }
  note(lock: string, where: string, detail: string) { console.log(`  · ${lock} ${where} — ${detail}`); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.lock} · ${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const LIB = `
window.__qc = () => {
  const g = [...document.querySelectorAll(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().height > 0);
  if (!g) throw new Error("no visible v138 Query Centre group");
  return { g, sc: g.closest(".wpg-scroll") };
};
window.__box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; };
`;
async function mutate(page: Page, lock: string) {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(120);
}
async function openQC(page: Page, vp: VP, lock: string, opts: { fresh?: boolean } = {}) {
  await page.addInitScript((fresh) => {
    try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ }
    try { if (fresh) sessionStorage.removeItem("sa.qc138.folded"); } catch { /* */ }
  }, !!opts.fresh);
  await openRoute(page, "/queries", vp);
  await expect(page.locator('.qcv-group[data-v138] [data-qcv="row"]').first()).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await page.evaluate(LIB);
  await mutate(page, lock);
}
const setScroll = (page: Page, y: number) => page.evaluate(async (top) => {
  const { sc } = (window as unknown as { __qc: () => { sc: HTMLElement } }).__qc();
  sc.style.scrollBehavior = "auto";
  sc.scrollTop = top;
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  return sc.scrollTop;
}, y);
const unfoldClosed = (page: Page) => page.evaluate(() => {
  const b = document.querySelector<HTMLElement>('.qcv-group[data-v138] [data-qcv="gband"][data-group="closed"]');
  if (b && b.getAttribute("aria-expanded") === "false") b.click();
});

test.describe("Query Centre v138", () => {
  test("A1 · header: no illustration, '{N} queries sent', inset, shadow", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await openQC(page, vp, "A1");
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const hd = g.querySelector<HTMLElement>('[data-qc138="header"]')!;
        const h1 = hd.querySelector<HTMLElement>("h1[data-page-title]")!;
        const tb = hd.querySelector<HTMLElement>('[data-qc138="title-block"]')!.getBoundingClientRect();
        const gr = hd.querySelector<HTMLElement>('[data-qc138="glyphs"]')!.getBoundingClientRect();
        const hb = hd.getBoundingClientRect();
        const cs = getComputedStyle(h1);
        const sh = hd.querySelector<HTMLElement>('[data-qc138="shadow"]');
        const sum = [...hd.querySelectorAll('[data-qc138="glyph-n"]')].reduce((n, e) => n + Number(e.textContent), 0);
        return {
          imgs: [...hd.querySelectorAll("img")].filter((i) => !i.classList.contains("qc138-shadow")).length,
          name: h1.getAttribute("aria-label") ?? "", size: parseFloat(cs.fontSize), face: cs.fontFamily, h: h1.getBoundingClientRect().height, lh: parseFloat(cs.lineHeight),
          wide: !!document.querySelector(".ws-app.sheet-wide"), hw: hb.width, tbL: tb.left - hb.left, grR: hb.right - gr.right,
          shadow: sh ? Number(getComputedStyle(sh).opacity) : -1, sum,
        };
      });
      const w = `${vp.width}`;
      const inset = r.hw < 900 ? 0 : r.wide ? Math.max(64, (r.hw - 1080) / 2) : Math.max(40, (r.hw - 900) / 2);
      L.check("A1", `${w} no illustration`, r.imgs === 0, `${r.imgs} images besides the shadow`);
      L.check("A1", `${w} title`, r.name === `${r.sum} ${r.sum === 1 ? "query sent" : "queries sent"}`, `"${r.name}" (glyphs sum ${r.sum})`);
      L.check("A1", `${w} title size`, near(r.size, r.wide ? 50 : 44, 1) && /Special Elite/.test(r.face), `${r.size} · wide ${r.wide}`);
      L.check("A1", `${w} one line`, r.h <= r.lh * 1.5, `${r.h} tall at ${r.lh} a line`);
      L.check("A1", `${w} title at the inset`, near(r.tbL, inset, 1), `${r.tbL.toFixed(1)} against ${inset}`);
      L.check("A1", `${w} glyphs at the inset`, near(r.grR, inset, 1), `${r.grR.toFixed(1)} against ${inset}`);
      L.check("A1", `${w} shadow`, near(r.shadow, 0.15, 0.01), `${r.shadow}`);
    }
    L.done(14);
  });

  test("A2 · glyphs: seven, counts sum to N, dashed on your move, press filters and shares the Stage pill", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("A2");
    for (const vp of SIZES) {
      await openQC(page, vp, "A2");
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const b = [...g.querySelectorAll<HTMLElement>('[data-qc138="glyph-btn"]')];
        return {
          labels: b.map((e) => (e.querySelector(".qc138-sgl")?.textContent ?? "").trim()),
          dashed: b.map((e) => `${e.dataset.k}:${e.querySelectorAll('[data-qc138="dashed"]').length}`),
          sum: b.reduce((n, e) => n + Number(e.querySelector('[data-qc138="glyph-n"]')!.textContent), 0),
          name: g.querySelector("h1[data-page-title]")!.getAttribute("aria-label"),
          aria: b.map((e) => e.getAttribute("aria-label")),
        };
      });
      L.check("A2", `${w} labels`, JSON.stringify(r.labels) === JSON.stringify(["Queried", "Partialrequested", "Partialsent", "Fullrequested", "Fullsent", "Offer", "Closed"]), r.labels.join("|"));
      L.check("A2", `${w} sum`, r.name === `${r.sum} queries sent`, `${r.sum} against "${r.name}"`);
      L.check("A2", `${w} dashed`, JSON.stringify(r.dashed) === JSON.stringify(["q:0", "pr:1", "ps:0", "fr:1", "fs:0", "of:1", "cl:0"]), r.dashed.join(" "));
      L.check("A2", `${w} aria`, r.aria.every((a) => /^[A-Z][a-z ]+, \d+$/.test(a ?? "")), r.aria.join(" | "));
      await page.locator('.qcv-group[data-v138] [data-qc138="glyph-btn"][data-k="fr"]').click();
      await page.waitForTimeout(400);
      const p = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const b = [...g.querySelectorAll<HTMLElement>('[data-qc138="glyph-btn"]')];
        const fr = b.find((e) => e.dataset.k === "fr")!;
        return {
          pressed: fr.getAttribute("aria-pressed"), others: b.filter((e) => e !== fr).map((e) => Number(getComputedStyle(e).opacity)),
          pill: g.querySelector('[data-qc138="pill"][data-k="stage"] [data-qc138="pill-label"]')?.textContent,
          statuses: [...new Set([...g.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((e) => e.dataset.status))],
          count: Number(fr.querySelector('[data-qc138="glyph-n"]')!.textContent),
          rows: g.querySelectorAll('[data-qcv="row"]').length,
        };
      });
      L.check("A2", `${w} pressed`, p.pressed === "true", `${p.pressed}`);
      L.check("A2", `${w} others fade`, p.others.every((o) => near(o, 0.3, 0.02)), p.others.join(","));
      L.check("A2", `${w} pill`, p.pill === "Full requested", `"${p.pill}"`);
      L.check("A2", `${w} filters`, p.statuses.every((s) => s === "Full Requested" || s === "Revise & Resubmit") && p.rows === p.count, `${p.statuses.join(",")} · ${p.rows} rows / ${p.count}`);
      await page.locator('.qcv-group[data-v138] [data-qc138="glyph-btn"][data-k="fr"]').click();
      await page.waitForTimeout(300);
      const c = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        return { pill: g.querySelector('[data-qc138="pill"][data-k="stage"] [data-qc138="pill-label"]')?.textContent, on: g.querySelectorAll('[data-qc138="glyph-btn"][aria-pressed="true"]').length };
      });
      L.check("A2", `${w} clears`, c.pill === "Stage" && c.on === 0, `${c.pill} · ${c.on} pressed`);
      await page.locator('.qcv-group[data-v138] [data-qc138="glyph-btn"][data-k="cl"]').click();
      await page.waitForTimeout(300);
      await unfoldClosed(page);
      await page.waitForTimeout(300);
      const cl = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        return [...new Set([...g.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((e) => e.dataset.status))];
      });
      L.check("A2", `${w} closed`, cl.length > 0 && cl.every((s) => ["Rejected", "No Response", "Withdrawn"].includes(s ?? "")) && cl.includes("Rejected"), cl.join(","));
      await page.locator('.qcv-group[data-v138] [data-qc138="glyph-btn"][data-k="cl"]').click();
    }
    L.done(20);
  });

  test("B1 · filters: present, one line, the switches read the real state", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await openQC(page, vp, "B1");
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const f = g.querySelector<HTMLElement>('[data-qc138="filters"]')!;
        /* EDITED (v138.1 §F): the search lives in the sheet's navy row, so the filter row is the pills alone */
        const parts = [...f.querySelectorAll<HTMLElement>('[data-qc138="pill"]')];
        const hd = g.querySelector<HTMLElement>('[data-qc138="header"]')!.getBoundingClientRect();
        return {
          keys: [...f.querySelectorAll<HTMLElement>('[data-qc138="pill"]')].map((e) => e.dataset.k), find: (g.querySelector('[data-qc138="top"] [data-qc138="search"] input') as HTMLInputElement)?.placeholder,
          tops: [...new Set(parts.map((e) => Math.round(e.getBoundingClientRect().top)))], right: Math.max(...parts.map((e) => e.getBoundingClientRect().right)), hdR: hd.right,
        };
      });
      L.check("B1", `${w} present`, JSON.stringify(r.keys) === JSON.stringify(["stage", "dueWeek", "offers", "sent", "more"]) && r.find === "Find an agent or agency", `${r.keys.join(",")} · "${r.find}"`);
      L.check("B1", `${w} one line`, r.tops.length === 1 && r.right <= r.hdR + 0.5, `tops ${r.tops.join(",")} · right ${r.right.toFixed(1)} / ${r.hdR.toFixed(1)}`);
      await page.locator('.qcv-group[data-v138] [data-qc138="pill"][data-k="more"] .qc138-fp').click();
      await page.waitForTimeout(250);
      await page.locator('[data-qc138="panel"] [data-opt="more:past"]').click();
      await page.waitForTimeout(400);
      await mutate(page, "B1");
      await page.waitForTimeout(200);
      const s = await page.evaluate(() => {
        const sw = document.querySelector<HTMLElement>('[data-qc138="panel"] [data-opt="more:past"]')!;
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        return { checked: sw.getAttribute("aria-checked"), on: sw.querySelector('[data-qc138="switch"]')!.hasAttribute("data-on"), chip: Number(sw.querySelector('[data-qc138="opt-count"]')!.textContent), rows: g.querySelectorAll('[data-qcv="row"]').length, pill: g.querySelector('[data-qc138="pill"][data-k="more"]')!.hasAttribute("data-on") };
      });
      L.check("B1", `${w} switch reads the filter`, s.checked === "true" && s.on && s.pill, `aria-checked ${s.checked} · data-on ${s.on} · pill on ${s.pill}`);
      L.check("B1", `${w} switch filters`, s.rows === s.chip, `${s.rows} rows against its count ${s.chip}`);
      await page.keyboard.press("Escape");
      await page.locator('.qcv-group[data-v138] [data-qc138="pill"][data-k="more"] [data-qc138="pill-clear"]').click();
    }
    L.done(8);
  });

  test("C1 · sheet: navy row, no sort control, mono headings over their columns", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("C1");
    for (const vp of SIZES) {
      await openQC(page, vp, "C1");
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const top = g.querySelector<HTMLElement>('[data-qc138="top"]')!;
        const say = top.querySelector<HTMLElement>('[data-qc138="showing"]')!;
        const tb = top.getBoundingClientRect(), sb = say.getBoundingClientRect();
        const heads = g.querySelector<HTMLElement>('[data-qc138="headings"]')!;
        const row = g.querySelector<HTMLElement>('[data-qcv="row"]')!;
        const cell: Record<string, string> = { agent: ".qc138-agt", first: ".qc138-fqd", stage: ".qc138-ws1", sent: ".qc138-mats", next: ".qc138-nxt", due: ".qc138-due" };
        const al = [...heads.querySelectorAll<HTMLElement>('[data-qc138="heading"]')].map((h) => {
          const k = h.dataset.k!; const b = h.querySelector("button")!.getBoundingClientRect(); const c = row.querySelector<HTMLElement>(cell[k])!.getBoundingClientRect();
          return { k, d: k === "due" ? b.right - c.right : b.left - c.left };
        });
        const hb = heads.querySelector("button")!;
        return {
          bg: getComputedStyle(top).backgroundColor, dy: (sb.top + sb.bottom) / 2 - (tb.top + tb.bottom) / 2,
          sort: [...g.querySelectorAll<HTMLElement>('[data-qc138="sheet"] button, [data-qc138="sheet"] [role="button"]')].filter((b) => /^\s*sort\b/i.test(b.textContent ?? "") || b.dataset.qcv === "ws-sort" || b.getAttribute("aria-label")?.match(/direction|reverse/i)).length,
          hbg: getComputedStyle(heads).backgroundColor, face: getComputedStyle(hb).fontFamily, tt: getComputedStyle(hb).textTransform, al,
        };
      });
      L.check("C1", `${w} navy`, r.bg === "rgb(45, 58, 80)", r.bg);
      L.check("C1", `${w} centred`, Math.abs(r.dy) <= 2, `${r.dy.toFixed(1)}`);
      L.check("C1", `${w} no sort control`, r.sort === 0, `${r.sort}`);
      L.check("C1", `${w} headings`, r.hbg === "rgb(233, 237, 243)" && /Mono/i.test(r.face) && r.tt === "uppercase", `${r.hbg} · ${r.face} · ${r.tt}`);
      for (const a of r.al) L.check("C1", `${w} heading ${a.k}`, Math.abs(a.d) <= 2, `${a.d.toFixed(1)}`);
    }
    L.done(20);
  });

  test("C2 · sort: each heading sorts within groups, again reverses, aria-sort follows, Due ascending by default", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("C2");
    const vp = SIZES[0];
    await openQC(page, vp, "C2");
    const read = () => page.evaluate(() => {
      const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
      const sur = (n: string) => (n.trim().split(/\s+/).pop() ?? "").toLowerCase();
      const STAGE: Record<string, number> = { Queried: 0, "Partial Requested": 1, "Partial Sent": 2, "Full Requested": 3, "Revise & Resubmit": 3.5, "Full Sent": 4, Resubmitted: 4.5, Offer: 5, Signed: 5.5, Rejected: 6, "No Response": 7, Withdrawn: 8 };
      const groups = [...g.querySelectorAll<HTMLElement>('[data-qcv="grp"]')].map((gr) => [...gr.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((r) => ({
        agent: sur(r.dataset.name ?? "") || null, first: r.dataset.first ? Number(r.dataset.first) : null, stage: STAGE[r.dataset.status ?? ""] ?? 0, due: r.dataset.due ? Number(r.dataset.due) : null,
      })));
      const sorts = Object.fromEntries([...g.querySelectorAll<HTMLElement>('[data-qc138="heading"]')].map((h) => [h.dataset.k, h.getAttribute("aria-sort")]));
      return { groups, sorts };
    });
    const ordered = (groups: { [k: string]: string | number | null }[][], key: string, rev: boolean) => groups.every((rows) => {
      const vals = rows.map((r) => r[key]);
      const firstNull = vals.findIndex((v) => v == null);
      if (firstNull >= 0 && vals.slice(firstNull).some((v) => v != null)) return false;
      const live = vals.filter((v) => v != null) as (string | number)[];
      for (let i = 1; i < live.length; i += 1) {
        const c = typeof live[i] === "number" ? (live[i] as number) - (live[i - 1] as number) : String(live[i]).localeCompare(String(live[i - 1]));
        if (rev ? c > 0 : c < 0) return false;
      }
      return true;
    });
    const d = await read();
    L.check("C2", "default due ascending", d.sorts.due === "ascending" && ordered(d.groups, "due", false), `due ${d.sorts.due}`);
    for (const k of ["agent", "first", "stage", "due"]) {
      const h = page.locator(`.qcv-group[data-v138] [data-qc138="heading"][data-k="${k}"] button`);
      if (k !== "due") { await h.click(); await page.waitForTimeout(250); }
      else { await h.click(); await page.waitForTimeout(250); }
      let a = await read();
      /* a heading pressed after another key sorts ascending; only the default's own key reverses on its first press */
      const rev1 = false;
      L.check("C2", `${k} first press`, a.sorts[k] === (rev1 ? "descending" : "ascending") && ordered(a.groups, k, rev1), `${a.sorts[k]}`);
      await h.click(); await page.waitForTimeout(250);
      a = await read();
      L.check("C2", `${k} second press`, a.sorts[k] === (rev1 ? "ascending" : "descending") && ordered(a.groups, k, !rev1), `${a.sorts[k]}`);
    }
    const keyed = await page.evaluate(() => {
      const b = document.querySelector<HTMLElement>('.qcv-group[data-v138] [data-qc138="heading"][data-k="agent"] button')!;
      b.focus();
      return document.activeElement === b;
    });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(200);
    const k1 = await read();
    L.check("C2", "Enter sorts", keyed && k1.sorts.agent !== "none", `${k1.sorts.agent}`);
    L.done(10);
  });

  test("D1 · your move: a lapsed waiting query is the writer's move; no window stays waiting; no 'No reply yet'", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("D1");
    const vp = SIZES[0];
    await openQC(page, vp, "D1", { fresh: true });
    await page.evaluate(() => { for (const b of document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="gband"][aria-expanded="false"]')) b.click(); });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const rows = [...g.querySelectorAll<HTMLElement>('[data-qcv="row"]')].map((r) => ({ grp: r.closest<HTMLElement>('[data-qcv="grp"]')!.dataset.group, court: r.dataset.court, due: r.dataset.due ? Number(r.dataset.due) : null, now: Date.now() }));
      return {
        lapsed: rows.filter((x) => x.court === "agent" && x.due != null && x.due <= x.now),
        nodate: rows.filter((x) => x.court === "agent" && x.due == null),
        bands: [...g.querySelectorAll<HTMLElement>('[data-qcv="gband"]')].map((b) => b.textContent ?? ""),
        you: g.querySelector<HTMLElement>('[data-qcv="gband"][data-group="you"] [data-qcv="gband-n"]')?.textContent ?? "",
      };
    });
    L.check("D1", "lapsed waiting rows exist", r.lapsed.length > 0, `${r.lapsed.length}`);
    L.check("D1", "lapsed waiting rows are in Your move", r.lapsed.every((x) => x.grp === "you"), r.lapsed.map((x) => x.grp).join(","));
    L.check("D1", "no-window rows exist", r.nodate.length > 0, `${r.nodate.length}`);
    L.check("D1", "no-window rows are in Waiting", r.nodate.every((x) => x.grp === "waiting"), r.nodate.map((x) => x.grp).join(","));
    L.check("D1", "no 'No reply yet' group", !r.bands.some((b) => /no reply yet|past the date/i.test(b)), r.bands.join(" | "));
    /* the To-do list's Your move count is task cards, not queries (see the report): read and recorded, not asserted equal.
       RE-POINTED (To-do list v5): the v2 tiles became the header card's three rows. */
    await openRoute(page, "/todo", vp);
    await page.waitForTimeout(2500);
    const todo = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-td5="card-row"]')].filter((e) => e.getBoundingClientRect().height > 0).map((e) => (e.textContent ?? "").replace(/\s+/g, " ").trim()).slice(0, 3));
    L.note("D1", "to-do v5 card rows", `${JSON.stringify(todo)} against the Query Centre's "${r.you}"`);
    L.done(5);
  });

  test("D2 · bands: three in order, tints, Closed folded, Waiting sticks under the pinned row and the headings", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("D2");
    for (const vp of SIZES) {
      await openQC(page, vp, "D2", { fresh: true });
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        return [...g.querySelectorAll<HTMLElement>('[data-qcv="gband"]')].map((b) => ({ k: b.dataset.group, bg: getComputedStyle(b).backgroundColor, ex: b.getAttribute("aria-expanded") }));
      });
      L.check("D2", `${w} order`, r.map((b) => b.k).join(",") === "you,waiting,closed", r.map((b) => b.k).join(","));
      L.check("D2", `${w} tints`, r[0]?.bg === "rgb(246, 226, 216)" && r[1]?.bg === "rgb(226, 231, 239)" && r[2]?.bg === "rgb(236, 232, 227)", r.map((b) => b.bg).join(" | "));
      L.check("D2", `${w} closed folded`, r[2]?.ex === "false", `${r[2]?.ex}`);
      const s = await page.evaluate(async () => {
        const { g, sc } = (window as never as { __qc: () => { g: HTMLElement; sc: HTMLElement } }).__qc();
        const band = g.querySelector<HTMLElement>('[data-qcv="gband"][data-group="waiting"]')!;
        sc.style.scrollBehavior = "auto";
        sc.scrollTop += band.getBoundingClientRect().top - sc.getBoundingClientRect().top + 260;
        await new Promise((res) => setTimeout(res, 300));
        const pin = document.querySelector<HTMLElement>('[data-qc138="pinned"][data-on]');
        const heads = g.querySelector<HTMLElement>('[data-qc138="headings"]')!;
        return { band: band.getBoundingClientRect().top, want: (pin ? pin.getBoundingClientRect().bottom : NaN) + heads.getBoundingClientRect().height };
      });
      L.check("D2", `${w} sticky`, near(s.band, s.want, 1), `${s.band.toFixed(1)} against ${s.want.toFixed(1)}`);
    }
    L.done(8);
  });

  test("E1 · rows: circles by standing, no YOUR MOVE chip, no 'day ' in a detail line, years only outside this year", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("E1");
    for (const vp of SIZES) {
      await openQC(page, vp, "E1");
      await unfoldClosed(page);
      await page.waitForTimeout(300);
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const rows = [...g.querySelectorAll<HTMLElement>('[data-qcv="row"]')];
        const y = new Date().getFullYear();
        return {
          open: rows.filter((r) => r.dataset.court !== "closed").map((r) => getComputedStyle(r.querySelector(".sa-disc")!).backgroundColor),
          closed: rows.filter((r) => r.dataset.court === "closed").map((r) => getComputedStyle(r.querySelector(".sa-disc")!).backgroundColor),
          chip: rows.filter((r) => /YOUR MOVE/.test(r.textContent ?? "")).length,
          day: rows.flatMap((r) => [...r.querySelectorAll<HTMLElement>('[data-qcv="row-standline"], [data-qcv="row-nextline"]')].map((e) => e.textContent ?? "")).filter((t) => /\bday /i.test(t)),
          years: rows.filter((r) => r.dataset.first).map((r) => { const yr = new Date(Number(r.dataset.first)).getFullYear(); const t = r.querySelector('[data-qcv="row-first-date"]')!.textContent ?? ""; return /\b\d{4}\b/.test(t) === (yr !== y); }),
        };
      });
      L.check("E1", `${w} open circles navy`, r.open.length > 0 && r.open.every((c) => c === "rgb(42, 58, 82)"), [...new Set(r.open)].join(","));
      L.check("E1", `${w} closed circles stone`, r.closed.length > 0 && r.closed.every((c) => c === "rgb(179, 172, 165)"), [...new Set(r.closed)].join(","));
      L.check("E1", `${w} no YOUR MOVE chip`, r.chip === 0, `${r.chip}`);
      L.check("E1", `${w} no day in a detail`, r.day.length === 0, r.day.slice(0, 3).join(" | "));
      L.check("E1", `${w} years`, r.years.length > 0 && r.years.every(Boolean), `${r.years.filter((x) => !x).length} wrong of ${r.years.length}`);
    }
    L.done(10);
  });

  test("E2 · due: a rust disc when over, an arc in proportion, text in compact", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("E2");
    const vp = SIZES[0];
    await openQC(page, vp, "E2");
    const r = await page.evaluate(() => {
      const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const now = Date.now();
      const rows = [...g.querySelectorAll<HTMLElement>('[data-qcv="row"]')].filter((r) => r.dataset.due && r.dataset.court !== "closed");
      const day = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
      const over = rows.filter((r) => day(Number(r.dataset.due)) < t0.getTime()).map((r) => { const d = r.querySelector<HTMLElement>(".qc138-dial")!; return { bg: getComputedStyle(d).backgroundColor, ring: d.querySelectorAll("svg").length }; }); /* EDITED (v138.1 §E): an overdue dial is a ring on white, never a fill (qcV1381 E1 holds the ring) */
      const ahead = rows.filter((r) => day(Number(r.dataset.due)) >= t0.getTime()).map((r) => {
        const due = Number(r.dataset.due), from = Number(r.dataset.from);
        const want = Math.min(1, Math.max(0.04, due - from > 0 ? (now - from) / (due - from) : 1));
        const arc = r.querySelector<SVGCircleElement>(".qc138-dial-arc");
        const got = arc ? parseFloat(arc.getAttribute("stroke-dasharray")!) / (2 * Math.PI * 22) : -1;
        return { want, got };
      });
      return { over, ahead };
    });
    L.check("E2", "overdue dials exist", r.over.length > 0, `${r.over.length}`);
    L.check("E2", "overdue: a ring on white, no fill", r.over.every((o) => o.bg === "rgb(255, 255, 255)" && o.ring === 1), JSON.stringify(r.over.slice(0, 2)));
    L.check("E2", "waiting dials exist", r.ahead.length > 0, `${r.ahead.length}`);
    L.check("E2", "arc in proportion", r.ahead.every((a) => Math.abs(a.got - a.want) <= 0.02), JSON.stringify(r.ahead.filter((a) => Math.abs(a.got - a.want) > 0.02).slice(0, 3)));
    await page.locator('.qcv-group[data-v138] [data-d="compact"]').click();
    await page.waitForTimeout(300);
    await mutate(page, "E2");
    const c = await page.evaluate(() => {
      const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
      const t0 = new Date(); t0.setHours(0, 0, 0, 0);
      const day = (ms: number) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };
      const rows = [...g.querySelectorAll<HTMLElement>('[data-qcv="row"]')].filter((r) => r.dataset.due && r.dataset.court !== "closed");
      return {
        dials: g.querySelectorAll(".qc138-dial").length,
        colours: rows.map((r) => {
          const t = r.querySelector<HTMLElement>('[data-qcv="row-due-text"]');
          const dd = Math.round((day(Number(r.dataset.due)) - t0.getTime()) / 86400000);
          const want = dd < 0 ? "rgb(162, 69, 42)/600" : dd <= 7 ? "rgb(176, 96, 62)" : "rgba(28, 19, 15, 0.7)";
          const cs = t ? getComputedStyle(t) : null;
          const got = cs ? (dd < 0 ? `${cs.color}/${cs.fontWeight}` : cs.color) : "none";
          return got === want;
        }),
      };
    });
    L.check("E2", "compact: no dial", c.dials === 0, `${c.dials}`);
    L.check("E2", "compact: coloured text", c.colours.length > 0 && c.colours.every(Boolean), `${c.colours.filter((x) => !x).length} wrong of ${c.colours.length}`);
    await page.locator('.qcv-group[data-v138] [data-d="comfortable"]').click();
    L.done(6);
  });

  test("E3 · compact: rows at most 44 tall, no track or detail line", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("E3");
    for (const vp of SIZES) {
      await openQC(page, vp, "");
      await page.locator('.qcv-group[data-v138] [data-d="compact"]').click();
      await page.waitForTimeout(300);
      await mutate(page, "E3");
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const { g } = (window as never as { __qc: () => { g: HTMLElement } }).__qc();
        const rows = [...g.querySelectorAll<HTMLElement>('[data-qcv="row"]')];
        const shown = (sel: string) => [...g.querySelectorAll<HTMLElement>(sel)].filter((e) => e.getBoundingClientRect().height > 0).length;
        return { max: Math.max(...rows.map((r) => r.getBoundingClientRect().height)), track: shown('[data-qcv="row-track"]'), detail: shown('[data-qcv="row-standline"], [data-qcv="row-nextline"]') };
      });
      L.check("E3", `${w} height`, r.max <= 44, `${r.max}`);
      L.check("E3", `${w} no track`, r.track === 0, `${r.track}`);
      L.check("E3", `${w} no detail`, r.detail === 0, `${r.detail}`);
      await page.locator('.qcv-group[data-v138] [data-d="comfortable"]').click();
    }
    L.done(6);
  });

  test("F1 · hover: lifted, shadowed, circle 1.08, tray shown, due faded", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("F1");
    for (const vp of SIZES) {
      await openQC(page, vp, "F1");
      const w = `${vp.width}`;
      const row = page.locator('.qcv-group[data-v138] [data-qcv="row"]').nth(1);
      await page.mouse.move(2, 2);
      await row.hover({ position: { x: 300, y: 18 } });
      await page.waitForTimeout(200);
      const r = await row.evaluate((el) => {
        const cs = getComputedStyle(el);
        const m = new DOMMatrix(cs.transform);
        return {
          ty: m.m42, shadow: cs.boxShadow, disc: new DOMMatrix(getComputedStyle(el.querySelector(".sa-disc")!).transform).a,
          tray: [...el.querySelectorAll<HTMLElement>('[data-qcv="row-tray"] > *')].map((b) => Number(getComputedStyle(b).opacity)),
          due: Number(getComputedStyle(el.querySelector('[data-qcv="row-due"]')!).opacity),
        };
      });
      L.check("F1", `${w} lift`, near(r.ty, -2, 0.1), `${r.ty}`);
      L.check("F1", `${w} shadow`, r.shadow !== "none" && /rgba\(28, 19, 15, 0\.45\)/.test(r.shadow), r.shadow.slice(0, 60));
      L.check("F1", `${w} circle`, near(r.disc, 1.08, 0.005), `${r.disc}`);
      L.check("F1", `${w} tray`, r.tray.length > 0 && r.tray.every((o) => o === 1), r.tray.join(","));
      L.check("F1", `${w} due fades`, r.due === 0, `${r.due}`);
    }
    L.done(10);
  });

  test("F2 · peek: after 450ms, a chain that never overlaps or overflows", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("F2");
    await openQC(page, SIZES[0], "F2");
    await liftMotionSuppression(page);
    const row = page.locator('.qcv-group[data-v138] [data-qcv="row"]').nth(2);
    await page.mouse.move(2, 2);
    await row.hover({ position: { x: 300, y: 18 } });
    await page.waitForTimeout(400);
    const at400 = await row.evaluate((el) => !!el.querySelector('[data-qcv="peek"]'));
    await page.waitForTimeout(400);
    const at800 = await row.evaluate((el) => !!el.querySelector('[data-qcv="peek-chain"]'));
    L.check("F2", "none before 400ms", !at400, `${at400}`);
    L.check("F2", "open by 800ms", at800, `${at800}`);
    await page.mouse.move(2, 2);
    /* the five cases of screens/10, forced through the dev review aid, at 1512 and 1100 */
    const D = 86_400_000;
    const now = Date.now();
    const t = (days: number) => now + days * D;
    const cases = [
      { events: [{ name: "Queried", ms: t(-3906) }], due: t(-3846), yours: true },
      { events: [{ name: "Queried", ms: t(-7) }, { name: "Partial requested", ms: t(-6) }], due: t(-5), yours: true },
      { events: [{ name: "Queried", ms: now - 3_600_000 }], due: now, yours: false },
      { events: [{ name: "Queried", ms: t(-2777) }, { name: "Full sent", ms: t(-2) }], due: t(355), yours: false },
      { events: [{ name: "Queried", ms: t(-37) }, { name: "Partial requested", ms: t(-30) }, { name: "Partial sent", ms: t(-29) }, { name: "Full requested", ms: t(-20) }, { name: "Full sent", ms: t(-19) }, { name: "Offer", ms: t(-3) }], due: now, yours: true },
    ];
    for (const vp of [{ width: 1512, height: 900 }, { width: 1100, height: 800 }]) {
      await page.addInitScript((c) => { (window as unknown as { __SA_QC138_PEEK_LAB: unknown }).__SA_QC138_PEEK_LAB = c; }, cases);
      await openQC(page, vp, "F2");
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const out: { stops: number; events: number; overlap: boolean; overflow: boolean; segOut: boolean; over: boolean; bg: string }[] = [];
        for (const c of document.querySelectorAll<HTMLElement>('[data-qc138="peek-case"]')) {
          if (c.getBoundingClientRect().height === 0) continue;
          const pk = c.querySelector<HTMLElement>('[data-qcv="peek"]')!;
          const box = pk.getBoundingClientRect();
          const stops = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"]')].map((s) => s.getBoundingClientRect());
          let overlap = false;
          for (let i = 1; i < stops.length; i += 1) if (stops[i].left < stops[i - 1].right - 0.5) overlap = true;
          const labels = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-name"], [data-qcv="peek-date"], [data-qcv="peek-seg-label"]')];
          const overflow = labels.some((l) => { const b = l.getBoundingClientRect(); return b.left < box.left - 0.5 || b.right > box.right + 0.5 || l.scrollWidth > l.clientWidth + 1; });
          const segOut = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-seg"]')].some((s) => { const sb = s.getBoundingClientRect(); const lb = s.querySelector("em")!.getBoundingClientRect(); return lb.left < sb.left - 0.5 || lb.right > sb.right + 0.5; });
          out.push({ stops: stops.length, events: pk.querySelectorAll('[data-qcv="peek-stop"][data-kind="event"]').length, overlap, overflow, segOut, over: pk.hasAttribute("data-over"), bg: getComputedStyle(pk).backgroundColor });
        }
        return out;
      });
      L.check("F2", `${w} five cases`, r.length === 5, `${r.length}`);
      r.forEach((c, i) => {
        /* EDITED v138.4: the five-stop cap is gone — the track holds every stop at its date and the label lanes fold
           what cannot be named into "+n earlier" (QC138.4 C1) — so a stop count is no longer a claim */
        L.check("F2", `${w} case ${i + 1} no overlap`, !c.overlap, `${c.overlap}`);
        L.check("F2", `${w} case ${i + 1} no overflow`, !c.overflow, `${c.overflow}`);
        L.check("F2", `${w} case ${i + 1} labels in segments`, !c.segOut, `${c.segOut}`);
        /* EDITED (v138.1 §D): the peek has no container; its colours are qcV1381 D1's (a blush Was due card) */
        L.check("F2", `${w} case ${i + 1} no container`, c.bg === "rgba(0, 0, 0, 0)", `${c.bg} · over ${c.over}`);
      });
      /* EDITED v138.4: same-day EVENTS still merge (QC138.4 C1's "+1 same day"), but Today is its own stop now, as in
         the reference, rather than an event on today's day taking its place: case 3 is one event, Today and its date */
      L.check("F2", `${w} same-day: one event stop`, r[2]?.events === 1, `case 3 has ${r[2]?.events} event stops`);
    }
    L.done(40); /* EDITED v138.4: ten stop-count readings retired with the five-stop cap */
  });

  test("G1 · select: the circle ticks without opening; the bar counts; ✕ and a refilter clear", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("G1");
    await openQC(page, SIZES[0], "G1");
    const picks = page.locator('.qcv-group[data-v138] [data-qcv="row-pick"]');
    const url0 = page.url();
    await picks.nth(0).click();
    await picks.nth(1).click();
    await page.waitForTimeout(400);
    const a = await page.evaluate(() => ({ bar: document.querySelector('[data-qc138="bulk-count"]')?.textContent ?? "", panel: !!document.querySelector(".qsp, [data-qp]") }));
    L.check("G1", "no panel", !a.panel && page.url() === url0, `panel ${a.panel} · ${page.url()}`);
    L.check("G1", "two selected", a.bar === "2 selected", `"${a.bar}"`);
    /* ⚠️ a panel opened by the circle would cover the bar: the readings below are taken whatever happens, so a red
       is a reading, never a timeout */
    const tryClick = async (sel: string) => { try { await page.locator(sel).first().click({ timeout: 5_000 }); return true; } catch { return false; } };
    const cleared = await tryClick('[data-qc138="bulk-clear"]');
    await page.waitForTimeout(200);
    L.check("G1", "✕ clears", cleared && (await page.locator('[data-qc138="bulk"]').count()) === 0, `clicked ${cleared}`);
    const picked = await tryClick('.qcv-group[data-v138] [data-qcv="row-pick"]');
    await page.waitForTimeout(200);
    const filtered = await tryClick('.qcv-group[data-v138] [data-qc138="pill"][data-k="offers"] .qc138-fp');
    await page.waitForTimeout(300);
    L.check("G1", "a refilter clears", picked && filtered && (await page.locator('[data-qc138="bulk"]').count()) === 0, `picked ${picked} · filtered ${filtered}`);
    if (filtered) await tryClick('.qcv-group[data-v138] [data-qc138="pill"][data-k="offers"] .qc138-fp');
    L.done(4);
  });

  test("H1 · load: one entrance, gone by 2s, never replayed; reduced motion is still", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("H1");
    await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
    await openRoute(page, "/dashboard", SIZES[0]);
    await page.waitForTimeout(1500);
    await liftMotionSuppression(page);
    await page.getByRole("button", { name: "Query Centre", exact: true }).first().click();
    const row = page.locator('.qcv-group[data-v138] [data-qcv="row"]').first();
    await row.waitFor({ state: "attached", timeout: 30_000 });
    const t0 = Date.now();
    const op = () => row.evaluate((e) => Number(getComputedStyle(e).opacity));
    await page.waitForTimeout(Math.max(0, 600 - (Date.now() - t0)));
    const o600 = await op();
    await page.waitForTimeout(Math.max(0, 2000 - (Date.now() - t0)));
    const o2000 = await op();
    await page.waitForTimeout(Math.max(0, 3000 - (Date.now() - t0)));
    await page.evaluate(LIB);
    await mutate(page, "H1");
    const anim3000 = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getAnimations().some((a) => (a as CSSAnimation).animationName?.startsWith("qc138-"))).length);
    L.check("H1", "rising at 600ms", o600 < 1, `${o600}`);
    L.check("H1", "landed by 2000ms", o2000 === 1, `${o2000}`);
    L.check("H1", "no row animation at 3000ms", anim3000 === 0, `${anim3000}`);
    await page.locator('.qcv-group[data-v138] [data-qc138="heading"][data-k="agent"] button').click();
    await page.mouse.move(2, 2);
    await page.waitForTimeout(150);
    const replay = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getAnimations().some((a) => (a as CSSAnimation).animationName?.startsWith("qc138-"))).length);
    L.check("H1", "a sort does not replay", replay === 0, `${replay} rows animating`);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    const r2 = page.locator('.qcv-group[data-v138] [data-qcv="row"]').first();
    await r2.waitFor({ state: "attached", timeout: 60_000 });
    const o0 = await r2.evaluate((e) => Number(getComputedStyle(e).opacity));
    const enter = await page.evaluate(() => !!document.querySelector(".qcv-group[data-enter138]"));
    L.check("H1", "reduced motion: there at once", o0 === 1 && !enter, `${o0} · entrance ${enter}`);
    L.done(5);
  });

  test("I1 · empty: no list, filters or glyphs; three dashed stops; 'Your move'; nothing counted", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("I1");
    for (const vp of SIZES) {
      await page.addInitScript(() => { (window as unknown as { __SA_LH_COUNT: number }).__SA_LH_COUNT = 0; });
      await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
      await openRoute(page, "/queries", vp);
      await expect(page.locator('[data-qc138="empty"]')).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(400);
      await mutate(page, "I1");
      const w = `${vp.width}`;
      const r = await page.evaluate(() => {
        const e = [...document.querySelectorAll<HTMLElement>('[data-qc138="empty"]')].find((x) => x.getBoundingClientRect().height > 0)!;
        const scope = e.closest(".wpg-scroll") ?? document;
        return {
          rows: scope.querySelectorAll('[data-qcv="row"]').length, filters: scope.querySelectorAll('[data-qc138="filters"]').length, glyphs: scope.querySelectorAll('[data-qc138="glyphs"]').length,
          dashed: [...e.querySelectorAll('[data-qc138="example-stop"]')].filter((s) => s.querySelector('[data-qc138="dashed"]')).length,
          bands: [...e.querySelectorAll('[data-qc138="example-band"]')].map((b) => b.textContent),
          disc: getComputedStyle(e.querySelector('[data-qc138="example"] .sa-disc')!).backgroundColor,
        };
      });
      L.check("I1", `${w} no list, filters or glyphs`, r.rows + r.filters + r.glyphs === 0, `${r.rows}/${r.filters}/${r.glyphs}`);
      L.check("I1", `${w} three dashed stops`, r.dashed === 3, `${r.dashed}`);
      L.check("I1", `${w} 'Your move'`, r.bands.includes("Your move") && !r.bands.includes("With you"), r.bands.join(","));
      L.check("I1", `${w} navy example disc`, r.disc === "rgb(42, 58, 82)", r.disc);
    }
    L.done(8);
  });

  test("J1 · discs: every initials circle is an AgentDisc, painted only by its own sheet, with one grey", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("J1");
    const ALLOWED: Record<string, string> = { none: "rgb(244, 238, 229)", querying: "rgb(42, 58, 82)", closed: "rgb(179, 172, 165)" };
    for (const route of ["/dashboard", "/queries", "/agents", "/agents/discover"]) {
      await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); } catch { /* */ } });
      /* RE-POINTED (Discover v1, 18 Oct): Discover's discs are on its LIVE face (the picks), which prod gates behind
         DISCOVER_LIVE; the coming-soon face draws none, by design. The dev review aid's fixture puts the live face on
         screen, so the law is held where the circles are. */
      if (route === "/agents/discover") await page.addInitScript(() => { (window as unknown as Record<string, unknown>).__SA_DV_STATE = "live"; });
      await openRoute(page, route, SIZES[0]);
      await page.waitForTimeout(2500);
      if (route === "/queries") { await page.evaluate(LIB); await unfoldClosed(page); await page.waitForTimeout(300); }
      await mutate(page, "J1");
      const r = await page.evaluate(() => {
        const vis = (e: Element) => e.getBoundingClientRect().width > 0;
        const discs = [...document.querySelectorAll<HTMLElement>(".sa-disc")].filter(vis);
        const bad = discs.filter((d) => d.dataset.tone !== "agency" && !d.hasAttribute("data-selected")).map((d) => ({ s: d.dataset.disc ?? "", bg: getComputedStyle(d).backgroundColor }));
        /* any other round box holding two capital letters is an initials circle that is not an AgentDisc */
        const stray = [...document.querySelectorAll<HTMLElement>("span, i, div, b")].filter((e) => vis(e) && !e.closest(".sa-disc") && !e.classList.contains("sa-disc") && e.children.length === 0
          && /^[A-Z]{2}$/.test((e.textContent ?? "").trim()) && parseFloat(getComputedStyle(e).borderTopLeftRadius) >= e.getBoundingClientRect().width / 2 - 1).length;
        return { n: discs.length, bad, stray };
      });
      L.check("J1", `${route} has discs`, r.n > 0, `${r.n}`);
      L.check("J1", `${route} paint`, r.bad.every((d) => ALLOWED[d.s] === d.bg), JSON.stringify(r.bad.filter((d) => ALLOWED[d.s] !== d.bg).slice(0, 3)));
      L.check("J1", `${route} no stray circle`, r.stray === 0, `${r.stray}`);
    }
    L.done(12);
  });
});
