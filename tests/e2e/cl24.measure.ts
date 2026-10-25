/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v24 (design-refs/contact-list-v24/) — CL24 A1–D3 and F1, on the rendered page at 1512 × 900 and
 * 1280 × 800 with the shell. E1 and E2 are unit locks (src/lib/contactV24.test.ts). L1 is the existing suites (NB1,
 * QC149, QC1491, QC1492, QC144, QC138.6, HR1), run beside this one.
 *
 * ⚠️ EVERY LOCK PROVES ITS POPULATION IS NON-ZERO BEFORE IT ASSERTS ANYTHING (a probe that finds nothing passes).
 * ⚠️ RED FIRST: `CL24_BASE=1` against the build before v24 (the locks find nothing of v24 and record readings rather
 *    than hang); `CL24_MUTATE=<lock>` applies that lock's named break in the page (CSS) or, for the four logic breaks,
 *    against a build carrying the mutation (see the report).
 */
import { test, type Page } from "@playwright/test";
import { liftMotionSuppression } from "./measure";
import { BASE, Ledger, MUT, SIZES, box, mutate, openCl24, openQc149, scrollTo } from "./cl24Lib";

const T = { timeout: 8000 };

/** read every visible match's box and a few facts, in document order */
async function rows(page: Page, sel: string) {
  return page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].filter((e) => e.getBoundingClientRect().height > 0).map((e) => {
    const r = e.getBoundingClientRect();
    return { id: e.dataset.id ?? "", k: e.dataset.k ?? "", l: r.left, t: r.top, r: r.right, b: r.bottom, n: e.dataset.n ?? "" };
  }), sel);
}
const near = (a: number | undefined, b: number | undefined, d = 1) => a != null && b != null && Math.abs(a - b) <= d;

/* ═════════ A · the header, the banner, the view row ═════════ */
test("CL24-A1 A2 A3 · the header against the Query Centre's; the banner is Housekeeping's; the chips are the sets", async ({ page }) => {
  const A1 = new Ledger("A1"), A2 = new Ledger("A2"), A3 = new Ledger("A3");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    /* the Query Centre's boxes */
    await openQc149(page, vp);
    const qc = {
      card: await box(page, ".qc149-card"), ban: await box(page, ".qc149-ban"), vr: await box(page, ".qc149-vr"), sheet: await box(page, ".qc138-sheet"),
    };
    /* the Contact list's */
    await openCl24(page, vp);
    await mutate(page, "A1", ".clv-group[data-v24] > .cl24-hd { margin-left: calc(50% - var(--cl24-w) / 2 + 40px) !important; }");
    const cl = {
      card: await box(page, "[data-cl24='hd-card']"), ban: await box(page, "[data-cl24='banner']"), vr: await box(page, "[data-cl24='views-row']"), sheet: await box(page, "[data-cl24='sheet']"),
    };
    A1.check(`${at} population`, !!(qc.card && qc.vr && qc.sheet && cl.card && cl.vr && cl.sheet), `qc ${JSON.stringify(qc)} cl ${JSON.stringify(cl)}`);
    for (const k of ["card", "ban", "vr", "sheet"] as const) {
      if (!qc[k] || !cl[k]) { A1.check(`${at} ${k}`, false, `missing (qc ${!!qc[k]}, cl ${!!cl[k]})`); continue; }
      A1.check(`${at} ${k} left`, near(qc[k]!.l, cl[k]!.l), `qc ${qc[k]!.l.toFixed(1)} cl ${cl[k]!.l.toFixed(1)}`);
      A1.check(`${at} ${k} right`, near(qc[k]!.r, cl[k]!.r), `qc ${qc[k]!.r.toFixed(1)} cl ${cl[k]!.r.toFixed(1)}`);
    }
    A1.check(`${at} card top`, near(qc.card?.t, cl.card?.t), `qc ${qc.card?.t} cl ${cl.card?.t}`);
    if (qc.ban && cl.ban && qc.card && cl.card && qc.vr && cl.vr) {
      A1.check(`${at} card→banner gap`, near(qc.ban.t - qc.card!.b, cl.ban.t - cl.card!.b), `qc ${(qc.ban.t - qc.card!.b).toFixed(1)} cl ${(cl.ban.t - cl.card!.b).toFixed(1)}`);
      A1.check(`${at} banner→row gap`, near(qc.vr!.t - qc.ban.b, cl.vr!.t - cl.ban.b), `qc ${(qc.vr!.t - qc.ban.b).toFixed(1)} cl ${(cl.vr!.t - cl.ban.b).toFixed(1)}`);
    }
    const g = (x: typeof qc) => (x.sheet && x.vr ? x.sheet.t - x.vr.b : NaN);
    A1.check(`${at} row→sheet gap`, near(g(qc), g(cl)), `qc ${g(qc).toFixed(1)} cl ${g(cl).toFixed(1)}`);

    /* A2 — the banner's figures against Housekeeping's drawer */
    const ban = await page.evaluate(() => {
      const t = (s: string) => document.querySelector<HTMLElement>(s);
      return { pct: t("[data-cl24='banner-pct']")?.textContent ?? null, n: Number(t("[data-cl24='banner-n']")?.dataset.n ?? NaN), k: Number(t("[data-cl24='banner-k']")?.dataset.n ?? NaN), ring: t("[data-cl24='ring'] [data-cl17='ring-pct']")?.textContent ?? null };
    });
    A2.check(`${at} population`, ban.pct != null && ban.n > 0 && ban.k > 0, JSON.stringify(ban));
    await page.locator("[data-cl24='fill']").first().click(T).catch(() => {});
    await page.waitForTimeout(900);
    const hk = await page.evaluate(() => {
      const pct = document.querySelector<HTMLElement>("[data-hk8='pct']")?.textContent ?? null;
      const gaps = document.querySelector<HTMLElement>("[data-hk8='tile'][data-k='gaps'] b")?.textContent ?? null;
      return { pct: pct ? pct.replace("%", "") : null, gaps: gaps != null ? Number(gaps) : NaN };
    });
    A2.check(`${at} drawer read`, hk.pct != null && Number.isFinite(hk.gaps), JSON.stringify(hk));
    A2.check(`${at} ring % = Housekeeping's`, ban.pct === hk.pct && (ban.ring ?? "").replace("%", "") === hk.pct, `banner ${ban.pct} ring ${ban.ring} drawer ${hk.pct}`);
    A2.check(`${at} n = Housekeeping's gaps`, ban.n === hk.gaps, `banner ${ban.n} drawer ${hk.gaps}`);
    A2.check(`${at} k agents, at least one and no more than the gaps`, ban.k >= 1 && ban.k <= ban.n, `k ${ban.k} n ${ban.n}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    /* A3 — each chip's count is the agents in that set; a chip shows exactly those; chips and Filters combine */
    const chips = await rows(page, "[data-cl24='view']");
    const all = await rows(page, "[data-cl24='row']");
    A3.check(`${at} population`, chips.length === 5 && all.length > 0, `chips ${chips.length} rows ${all.length}`);
    const total = Number(chips.find((c) => c.k === "all")?.n ?? NaN);
    A3.check(`${at} All = every row`, total === all.length, `All ${total} rows ${all.length}`);
    for (const k of ["you", "agent", "none", "closed"]) {
      const n = Number(chips.find((c) => c.k === k)?.n ?? NaN);
      A3.check(`${at} ${k} count = its rows`, n === all.filter((r) => r.k === k).length, `chip ${n} rows ${all.filter((r) => r.k === k).length}`);
    }
    await page.locator("[data-cl24='view'][data-k='you']").first().click(T).catch(() => {});
    await page.waitForTimeout(400);
    const you = await rows(page, "[data-cl24='row']");
    const youN = Number(chips.find((c) => c.k === "you")?.n ?? NaN);
    A3.check(`${at} Your move shows exactly its agents`, you.length === youN && you.every((r) => r.k === "you"), `rows ${you.length} (${[...new Set(you.map((r) => r.k))].join(",")}) chip ${youN}`);
    /* AND with Filters: Open to queries only */
    await page.locator("[data-cl24='filters']").first().click(T).catch(() => {});
    await page.locator("[data-nb1='open-only']").first().click(T).catch(() => {});
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const both = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='row']")].map((r) => ({ k: r.dataset.k, open: !!r.querySelector(".cl24-door--open") })));
    A3.check(`${at} chip AND Filters`, both.length > 0 && both.length <= you.length && both.every((r) => r.k === "you" && r.open), `rows ${both.length} ${JSON.stringify(both.slice(0, 4))}`);
  }
  A1.done(BASE ? 1 : 26); A2.done(BASE ? 1 : 10); A3.done(BASE ? 1 : 16);
});

test("CL24-A2 · the banner is absent when nothing is missing", async ({ page }) => {
  const L = new Ledger("A2-none");
  await page.addInitScript(() => { (window as unknown as { __SA_HK_ALL_FILLED: boolean }).__SA_HK_ALL_FILLED = true; });
  await openCl24(page, SIZES[0]);
  const s = await page.evaluate(() => ({ header: !!document.querySelector("[data-cl24='hd-card']"), banner: !!document.querySelector("[data-cl24='banner']") }));
  L.check("population: the header drew", s.header, JSON.stringify(s));
  L.check("no banner at no gaps", !s.banner, JSON.stringify(s));
  L.done(2);
});

/* ═════════ B · the switch, List, Cards ═════════ */
test("CL24-B1 B2 B3 · the switch in the bar; the grouped table; the cards", async ({ page }) => {
  const B1 = new Ledger("B1"), B2 = new Ledger("B2"), B3 = new Ledger("B3");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp);
    await mutate(page, "B2", ".cl24-th > [data-col], .cl24-tr > [data-col] { display: block !important; }");
    await mutate(page, "B3", ".cl24-grid { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)) !important; }");
    await mutate(page, "B3x", ".cl24-grid { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)) !important; }");
    /* B1 — in the bar, on the left */
    const bar = await box(page, "[data-cl24='bar']"), sw = await box(page, "[data-cl24='switch']");
    B1.check(`${at} population`, !!bar && !!sw, `bar ${!!bar} switch ${!!sw}`);
    B1.check(`${at} switch inside the navy bar, at its left`, !!bar && !!sw && sw.t >= bar.t && sw.b <= bar.b && sw.l - bar.l < 40, `bar ${JSON.stringify(bar)} sw ${JSON.stringify(sw)}`);
    /* B2 — headings in order, discs match their group, the narrow columns, one-line toolbar */
    await scrollTo(page, 0);
    const heads = await rows(page, "[data-cl24='group-head']");
    const order = ["you", "agent", "none", "closed"];
    B2.check(`${at} population`, heads.length > 0, `heads ${heads.length}`);
    B2.check(`${at} headings in the order Your move, Querying, Not queried, Closed`, heads.map((h) => order.indexOf(h.k)).every((v, i, a) => v >= 0 && (i === 0 || v > a[i - 1])), heads.map((h) => h.k).join(","));
    const mismatch = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='group']")].flatMap((g) =>
      [...g.querySelectorAll<HTMLElement>("[data-cl24='row']")].filter((r) => r.querySelector<HTMLElement>("[data-cl24='disc']")?.dataset.k !== g.dataset.k).map((r) => r.dataset.id)));
    B2.check(`${at} every row's disc is its group's set`, mismatch.length === 0, `${mismatch.length} mismatched`);
    const cols = await page.evaluate(() => {
      const r = document.querySelector<HTMLElement>("[data-cl24='row']");
      const shown = (c: string) => { const e = r?.querySelector<HTMLElement>(`[data-col='${c}']`); return !!e && getComputedStyle(e).display !== "none"; };
      return { replies: shown("3"), added: shown("6") };
    });
    if (vp.width <= 1440) B2.check(`${at} Replies in and Added hidden`, !cols.replies && !cols.added, JSON.stringify(cols));
    else B2.check(`${at} Replies in and Added shown`, cols.replies && cols.added, JSON.stringify(cols));
    const tops = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-cl24='bar'] > *")].filter((e) => e.getBoundingClientRect().width > 0).map((e) => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; }));
    B2.check(`${at} the toolbar is one line`, tops.length >= 4 && Math.max(...tops) - Math.min(...tops) < 2 && near(bar?.h, 52), `centres ${tops.map((t) => t.toFixed(1)).join(",")} bar ${bar?.h}`);
    /* B1 — switching keeps Find and the sort */
    await page.locator("[data-cl24='find'] input").first().fill("a").catch(() => {});
    await page.locator("[data-cl24='heads'] button", { hasText: "Your query" }).first().click(T).catch(() => {});
    await page.waitForTimeout(300);
    const before = await rows(page, "[data-cl24='row']");
    await page.locator("[data-cl24='view-tab'][data-v='cards']").first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    /* B3 — card order is the rows' order, and how many across */
    const cards = await rows(page, "[data-cl24='card']");
    B3.check(`${at} population`, cards.length > 0 && before.length > 0, `cards ${cards.length} rows ${before.length}`);
    B3.check(`${at} card order = row order`, cards.map((c) => c.id).join() === before.map((r) => r.id).join(), `cards ${cards.slice(0, 5).map((c) => c.id)} rows ${before.slice(0, 5).map((r) => r.id)}`);
    const across = await page.evaluate(() => {
      const g = document.querySelector<HTMLElement>("[data-cl24='card-group'] .cl24-grid, [data-cl24='cards'] .cl24-grid");
      if (!g) return 0;
      const ls = [...g.children].map((c) => Math.round((c as HTMLElement).getBoundingClientRect().left));
      return new Set(ls).size;
    });
    B3.check(`${at} ${vp.width >= 1512 ? 3 : 2} across`, across === (vp.width >= 1512 ? 3 : 2), `across ${across}`);
    await page.locator("[data-cl24='view-tab'][data-v='list']").first().click(T).catch(() => {});
    await page.waitForTimeout(400);
    const after = await rows(page, "[data-cl24='row']");
    const find = await page.locator("[data-cl24='find'] input").first().inputValue().catch(() => "");
    const sortOn = await page.evaluate(() => document.querySelector("[data-cl24='heads'] button.on")?.textContent ?? "");
    B1.check(`${at} switching keeps Find, the filters and the sort`, find === "a" && /Your query/.test(sortOn) && after.map((r) => r.id).join() === before.map((r) => r.id).join(), `find "${find}" sort "${sortOn}" rows ${before.length}→${after.length}`);
  }
  /* B1 — the view survives a reload, with no flash of the other view */
  await page.addInitScript(() => {
    const w = window as unknown as { __cl24seen: string[] };
    w.__cl24seen = [];
    new MutationObserver(() => { const s = document.querySelector<HTMLElement>("[data-cl24='sheet']"); if (s && w.__cl24seen[w.__cl24seen.length - 1] !== s.dataset.view) w.__cl24seen.push(s.dataset.view ?? ""); })
      .observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-view"] });
  });
  await openCl24(page, SIZES[0], { view: "cards" });
  const seen = await page.evaluate(() => (window as unknown as { __cl24seen: string[] }).__cl24seen);
  B1.check("reload opens Cards with no flash of List", seen.length > 0 && seen.every((v) => v === "cards"), `seen ${seen.join(",")}`);
  B1.done(BASE ? 1 : 7); B2.done(BASE ? 1 : 10); B3.done(BASE ? 1 : 6);
});

/* ═════════ C · the agent card ═════════ */
const TONE: Record<string, string> = { you: "rgb(245, 230, 223)", agent: "rgb(226, 230, 224)", closed: "rgb(228, 225, 219)", none: "rgb(245, 241, 234)" };
test("CL24-C1 C2 · the card in the Query Centre's panel; its actions", async ({ page }) => {
  const C1 = new Ledger("C1"), C2 = new Ledger("C2");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    /* the Query Centre's panel box */
    await openQc149(page, vp);
    await page.locator(".qc138-sheet [data-qcv='row']").first().click(T).catch(() => {});
    await page.waitForTimeout(900);
    const qp = await box(page, ".spanel.qsp");
    /* a your-move agent's call box: the journey the Query Centre would open for the same query */
    await openCl24(page, vp);
    await mutate(page, "C1", ".spanel-scrim { opacity: 1 !important; pointer-events: auto !important; }");
    const you = (await rows(page, "[data-cl24='row'][data-k='you']"))[0];
    C1.check(`${at} population`, !!qp && !!you, `qc panel ${!!qp} your-move row ${!!you}`);
    if (!you) continue;
    await page.locator(`[data-cl24='row'][data-id='${you.id}'] .cl24-whot`).first().click(T).catch(() => {});
    await page.waitForTimeout(900);
    const p = await box(page, "[data-cl24='panel']");
    C1.check(`${at} the panel is the Query Centre's box`, !!p && !!qp && near(p.l, qp.l) && near(p.r, qp.r) && near(p.t, qp.t) && near(p.b, qp.b), `cl ${JSON.stringify(p)} qc ${JSON.stringify(qp)}`);
    const scrim = await page.evaluate(() => { const s = document.querySelector<HTMLElement>("[data-side-scrim]"); return s ? Number(getComputedStyle(s).opacity) : -1; });
    C1.check(`${at} no scrim`, scrim === 0 || scrim === -1, `scrim opacity ${scrim}`);
    const band = await page.evaluate(() => { const b = document.querySelector<HTMLElement>("[data-cl24='panel'] [data-cl24='band']"); return b ? { k: b.dataset.k ?? "", bg: getComputedStyle(b).backgroundColor } : null; });
    C1.check(`${at} the band is CARD_TONE for its set`, !!band && band.k === "you" && band.bg === TONE.you, JSON.stringify(band));
    /* ‹ › in the drawn order */
    const drawn = (await rows(page, "[data-cl24='row']")).map((r) => r.id);
    await page.locator("[data-cl24='panel'] [data-cl24='next']").first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    const now = await page.evaluate(() => document.querySelector<HTMLElement>("[data-cl24='agent-card']")?.dataset.id ?? "");
    C1.check(`${at} › steps to the next row`, now === drawn[drawn.indexOf(you.id) + 1], `now ${now} expected ${drawn[drawn.indexOf(you.id) + 1]}`);
    await page.locator("[data-cl24='panel'] [data-cl24='prev']").first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    /* C2 — the call box opens the same journey the Query Centre's does */
    const call = await page.evaluate(() => document.querySelector<HTMLElement>("[data-cl24='panel'] [data-cl24='call-btn']")?.dataset.mode ?? null);
    const qid = await page.evaluate(() => document.querySelector<HTMLElement>("[data-cl24='panel'] [data-cl24='hist-row']")?.dataset.id ?? null);
    C2.check(`${at} population`, !!call && !!qid, `call ${call} query ${qid}`);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    C1.check(`${at} Esc closes`, !(await box(page, "[data-cl24='panel']")), "panel still open");
    if (qid) {
      await page.goto(`/queries?q=${encodeURIComponent(qid)}`);
      await page.locator("[data-qc149c='card']").first().waitFor({ timeout: 20_000 }).catch(() => {});
      await page.locator("[data-qc149c='strip-btn']").first().click(T).catch(() => {});
      await page.waitForTimeout(900);
      const qcMode = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qad-drawer]")].find((e) => e.getBoundingClientRect().height > 0)?.dataset.qadDrawer ?? null);
      C2.check(`${at} the call box's journey = the Query Centre's`, !!qcMode && qcMode === call, `cl ${call} qc ${qcMode}`);
      await page.keyboard.press("Escape");
    }
    /* a closed agent: no primary, and the footer says "See the query" */
    await openCl24(page, vp);
    const closed = (await rows(page, "[data-cl24='row'][data-k='closed']"))[0];
    C2.check(`${at} a closed agent exists`, !!closed, "no closed row");
    if (closed) {
      await page.locator(`[data-cl24='row'][data-id='${closed.id}'] .cl24-whot`).first().click(T).catch(() => {});
      await page.waitForTimeout(800);
      const f = await page.evaluate(() => ({
        primary: !!document.querySelector("[data-cl24='panel'] [data-cl24='call-btn']"),
        links: [...document.querySelectorAll<HTMLElement>("[data-cl24='panel'] [data-cl24='link']")].map((l) => l.textContent),
      }));
      C2.check(`${at} closed: no primary, "See the query", no "Record a response"`, !f.primary && f.links[0] === "See the query" && !f.links.includes("Record a response"), JSON.stringify(f));
    }
  }
  C1.done(BASE ? 1 : 12); C2.done(BASE ? 1 : 8);
});

/* ═════════ D · full screen ═════════ */
test("CL24-D1 D2 D3 · the band, the book, the slide", async ({ page }) => {
  const D1 = new Ledger("D1"), D2 = new Ledger("D2"), D3 = new Ledger("D3");
  for (const vp of SIZES) {
    const at = `${vp.width}`;
    await openCl24(page, vp, { full: true });
    await page.locator("[data-cl24='book-row']").first().waitFor({ timeout: 15_000 }).catch(() => {});
    await mutate(page, "D1", ".cl24-fart { height: 80px !important; }");
    await mutate(page, "D2", ".cl24-fsl { background: #2a3a52 !important; } .cl24-br[aria-current='true'] { background: #2a3a52 !important; }");
    const band = await box(page, "[data-cl24='band']"), tools = await box(page, "[data-cl24='book-tools']"), art = await box(page, "[data-cl24='book-art']");
    D1.check(`${at} population`, !!band && !!tools && !!art, `band ${!!band} row ${!!tools} art ${!!art}`);
    D1.check(`${at} the archivist breaks out below the band`, !!art && !!band && art.b > band.b + 1, `art bottom ${art?.b} band bottom ${band?.b}`);
    D1.check(`${at} the cream row sits under the band`, !!band && !!tools && near(tools.t, band.b), `row top ${tools?.t} band bottom ${band?.b}`);
    /* a segment filters the book to its set */
    const segs = await rows(page, "[data-cl24='band-seg']");
    const you = segs.find((s) => s.k === "you");
    await page.locator("[data-cl24='band-seg'][data-k='you']").first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    const brs = await rows(page, "[data-cl24='book-row']");
    D1.check(`${at} Your move filters the book to its agents`, !!you && brs.length === Number(you.n) && brs.every((r) => r.k === "you"), `rows ${brs.length} seg ${you?.n} sets ${[...new Set(brs.map((r) => r.k))]}`);
    await page.locator("[data-cl24='band-count']").first().click(T).catch(() => {});
    await page.waitForTimeout(400);
    /* D2 — the list column, the pale selected row, the A–Z strip, the wide card's columns */
    const col = await box(page, "[data-cl24='book-list']");
    D2.check(`${at} population`, !!col && (await rows(page, "[data-cl24='book-row']")).length > 0, `col ${!!col}`);
    D2.check(`${at} list column ${vp.width <= 1440 ? 330 : 372}`, near(col?.w, vp.width <= 1440 ? 330 : 372), `width ${col?.w}`);
    const sel = await page.evaluate(() => { const r = document.querySelector<HTMLElement>("[data-cl24='book-row'][aria-current='true']"); if (!r) return null; const cs = getComputedStyle(r); return { bg: cs.backgroundColor, sh: cs.boxShadow }; });
    D2.check(`${at} selected row pale with a navy edge`, !!sel && sel.bg === "rgb(238, 242, 247)" && /rgb\(42, 58, 82\).*inset|inset.*rgb\(42, 58, 82\)/.test(sel.sh), JSON.stringify(sel));
    const letter = await page.evaluate(() => {
      const on = [...document.querySelectorAll<HTMLButtonElement>("[data-cl24='alpha'] button")].filter((b) => !b.disabled).map((b) => b.dataset.j ?? "");
      return on.includes("M") ? "M" : on[Math.floor(on.length / 2)] ?? "";
    });
    await page.locator(`[data-cl24='alpha'] button[data-j='${letter}']`).first().click(T).catch(() => {});
    await page.waitForTimeout(300);
    const land = await page.evaluate((l) => {
      const sc = document.querySelector<HTMLElement>("[data-cl24='book-names']");
      const h = document.querySelector<HTMLElement>(`[data-cl24='book-head'][data-label='${l}']`);
      if (!sc || !h) return null;
      return { gap: h.getBoundingClientRect().top - sc.getBoundingClientRect().top, room: sc.scrollHeight - sc.clientHeight - sc.scrollTop };
    }, letter);
    D2.check(`${at} the A–Z strip lands "${letter}" at the top`, !!land && (Math.abs(land.gap) <= 2 || land.room <= 1), JSON.stringify(land));
    const cols = await page.evaluate(() => new Set([...document.querySelectorAll<HTMLElement>("[data-cl24='col']")].map((c) => Math.round(c.getBoundingClientRect().left))).size);
    D2.check(`${at} the wide card has ${vp.width <= 1440 ? 2 : 3} columns`, cols === (vp.width <= 1440 ? 2 : 3), `columns ${cols}`);
    /* D3 — the slide on a change of agent; none under reduced motion */
    await liftMotionSuppression(page);
    const second = (await rows(page, "[data-cl24='book-row']")).find((r) => !r.k || true);
    const other = (await rows(page, "[data-cl24='book-row']"))[1];
    await page.locator(`[data-cl24='book-row'][data-id='${other?.id ?? second?.id}']`).first().click(T).catch(() => {});
    const anim = await page.evaluate(() => { const s = document.querySelector<HTMLElement>("[data-cl24='slide']"); return s ? s.getAnimations().map((a) => ({ name: (a as CSSAnimation).animationName, d: (a.effect?.getTiming().duration as number) })) : null; });
    D3.check(`${at} the card slides in (240ms)`, !!anim && anim.some((a) => a.name === "cl24Slide" && a.d === 240), JSON.stringify(anim));
  }
  /* reduced motion */
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openCl24(page, SIZES[0], { full: true });
  await mutate(page, "D3", "@media (prefers-reduced-motion: reduce) { .cl24-slide { animation: cl24Slide 240ms ease-out !important; } }");
  await liftMotionSuppression(page);
  const r2 = (await rows(page, "[data-cl24='book-row']"))[2];
  D3.check("reduced motion: population", !!r2, "no rows");
  if (r2) await page.locator(`[data-cl24='book-row'][data-id='${r2.id}']`).first().click(T).catch(() => {});
  const still = await page.evaluate(() => { const s = document.querySelector<HTMLElement>("[data-cl24='slide']"); return s ? s.getAnimations().length : -1; });
  D3.check("reduced motion: no slide", still === 0, `animations ${still}`);
  await page.emulateMedia({ reducedMotion: null });
  D1.done(BASE ? 1 : 8); D2.done(BASE ? 1 : 10); D3.done(BASE ? 1 : 4);
});

/* ═════════ F · words and the guide ═════════ */
test("CL24-F1 · no Pin/Unpin; every Getting started spotlight finds its target", async ({ page }) => {
  const F1 = new Ledger("F1");
  await openCl24(page, SIZES[0]);
  await page.evaluate(() => { try { localStorage.removeItem("sa.guide.contacts"); } catch { /* */ } });
  await mutate(page, "F1", "[data-cl24='full'] { display: none !important; }");
  const words = await page.evaluate(() => {
    const t = [...document.querySelectorAll<HTMLElement>(".aglist")].map((e) => e.innerText).join(" ");
    const labels = [...document.querySelectorAll<HTMLElement>(".aglist [aria-label], .aglist [title]")].map((e) => `${e.getAttribute("aria-label") ?? ""} ${e.getAttribute("title") ?? ""}`).join(" ");
    return { len: t.length, hits: (`${t} ${labels}`.match(/\b(Pin|Unpin)\b/g) ?? []).length };
  });
  F1.check("population: the page's text", words.len > 200, `chars ${words.len}`);
  F1.check("no Pin or Unpin on the Contact list", words.hits === 0, `hits ${words.hits}`);
  const keys = ["add", "search", "pin", "open", "edit", "hk"];
  const found: string[] = [];
  for (const k of keys) {
    await page.locator("[data-pck='pill']").first().click(T).catch(() => {});
    await page.waitForTimeout(500);
    const item = page.locator(`[data-pck='item'][data-k='${k}'] button`).first();
    const ok = await item.count();
    F1.check(`${k}: the item is listed`, ok > 0, "missing item");
    if (!ok) continue;
    await item.click(T).catch(() => {});
    await page.waitForTimeout(700);
    const spot = await page.evaluate(() => !!document.querySelector("[data-pck='spot'] [data-pck='card']"));
    F1.check(`${k}: the spotlight finds its target`, spot, "no spotlight");
    if (spot) found.push(k);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }
  console.log(`[F1] spotlights found: ${found.join(", ")}`);
  F1.done(BASE ? 1 : 14);
});

void MUT;
