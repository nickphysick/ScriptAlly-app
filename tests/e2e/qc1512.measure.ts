/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v151.2 — the QC1512 locks (design-refs/query-centre-v151-2/), on the rendered page at 1280 × 800 and
 * 1512 × 900. Each asserts its population first and was red first: against the v151.1 build it amends (QC1512_BASE=1)
 * and against its named mutation (QC1512_MUTATE=L<n>, applied in the page).
 *
 *   L1 banner · L2 group cards · L3 header colours · L4 tags · L5 pills · L6 next number · L7 buttons · L8 rows
 *   L9 Birds-eye header · L10 bars · L11 filter panel. (L12 is the QC1511 and QC151 suites.)
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(420_000);
const DIR = "reports/qc-v151-2";
const MUT = process.env.QC1512_MUTATE ?? "";
const BASE = process.env.QC1512_BASE === "1";
const ONLY = process.env.QC1512_ONLY ?? "";
const run = (id: string) => !ONLY || ONLY.split(",").includes(id);
const SIZES = [{ width: 1280, height: 800 }, { width: 1512, height: 900 }] as const;
type VP = { width: number; height: number };
const NAVY = "rgb(42, 58, 82)", WHITE = "rgb(255, 255, 255)", LATE = "rgb(138, 58, 40)", FAINT = "rgb(138, 128, 118)";
const SAND = "rgb(230, 217, 198)", PINK = "rgb(243, 211, 198)", LNAVY = "rgb(211, 220, 231)", SAGE = "rgb(203, 217, 190)", GREY = "rgb(241, 240, 238)";
const BLUE = "rgb(197, 208, 221)", STONE = "rgb(227, 219, 207)", FADED = "rgb(241, 239, 236)";
/** the status colour, by status (the brief's table; R&R and Resubmitted with the full, Signed with the offer) */
const STATUS_RGB: Record<string, string> = {
  "Queried": SAND, "Partial Requested": PINK, "Partial Sent": PINK, "Full Requested": LNAVY, "Full Sent": LNAVY,
  "Revise & Resubmit": LNAVY, "Resubmitted": LNAVY, "Offer": SAGE, "Signed": SAGE, "Rejected": GREY, "No Response": GREY, "Withdrawn": GREY,
};
const PALE: Record<string, string> = { [SAND]: "rgb(238, 229, 215)", [PINK]: "rgb(247, 226, 218)", [LNAVY]: "rgb(224, 230, 238)", [SAGE]: SAGE };

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${BASE ? "base-" : MUT ? `mut-${MUT}-` : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 40)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

const observe = (body: string) => `(() => { const go = () => { ${body} }; go(); new MutationObserver(go).observe(document.body, { childList: true, subtree: true }); })()`;
/** the named breaks, expressed in the page */
const PAGE_MUT: Record<string, { css?: string; js?: string }> = {
  /* the v151.1 plain title restored */
  L1: { css: `.qc151 .qc1512-ban.qc1512-ban { background: transparent !important; padding: 0 !important; } .qc151 .qc1512-ban.qc1512-ban h1 { color: #1c130f !important; } .qc1512-sub.qc1512-sub { display: none !important; }` },
  /* 8px row spacing restored */
  L2: { css: `.qc151-tbl.qc1511-tbl.qc1511-tbl { border-spacing: 0 8px !important; }` },
  /* every header navy */
  L3: { css: `.qc1512-gh.qc1512-gh td { background: #2a3a52 !important; }` },
  /* every row tagged */
  L4: { js: observe(`for (const r of document.querySelectorAll('[data-qc151="row"]:not([data-m4])')) { r.setAttribute('data-m4', ''); if (r.querySelector('[data-qc1512="tag"]')) continue; const n = r.querySelector('.qc1512-nl'); if (!n) continue; const t = document.createElement('span'); t.className = 'qc1512-tag qc1512-tag--you'; t.setAttribute('data-qc1512', 'tag'); t.setAttribute('data-tag', 'you'); t.textContent = 'Your move'; n.append(t); }`) },
  /* Queried grey */
  L5: { css: `[data-status="Queried"] .qc1512-cap.qc1512-cap { background: #f1f0ee !important; }` },
  /* the v151.1 phrase restored */
  L6: { js: observe(`for (const c of document.querySelectorAll('[data-qc151="next"]:not([data-m6])')) { c.setAttribute('data-m6', ''); const t = c.textContent.replace(/\\s+/g, ' ').trim(); c.textContent = t; }`) },
  /* Birds-eye's buttons left pink */
  L7: { css: `.qc151 .qc150-be .qc150-xa button[data-tone] { background: #f3c8ba !important; color: #1c130f !important; box-shadow: none !important; }` },
  /* tinted row ends restored */
  L8: { css: `.qc1511-tbl td.qc1512-tk { background: #f3e3dc !important; }` },
  /* the white date header restored */
  L9: { css: `.qc151 .qc150-be .qc150-bvh.qc150-bvh { background: #fff !important; } .qc151 .qc150-be .qc150-tdy.qc150-tdy { background: #1c130f !important; color: #f4eee5 !important; }` },
  /* the old bar tints restored */
  L10: { css: `.qc151 .qc150-be .qc150-bar--cur.qc150-bar--cur.qc150-t-q { background: #f4eee4 !important; } .qc151 .qc150-be .qc150-bar--cur.qc150-bar--cur.qc150-t-r { background: #f2e4df !important; } .qc151 .qc150-be .qc150-bar--cur.qc150-bar--cur.qc150-t-s { background: #e4e7e1 !important; } .qc151 .qc150-be .qc150-bar--cur.qc150-bar--cur.qc150-t-o { background: #dde3ea !important; }` },
  /* the colour squares restored */
  L11: { js: observe(`for (const c of document.querySelectorAll('[data-qc141="where-opt"]:not([data-m11])')) { c.setAttribute('data-m11', ''); const s = document.createElement('span'); s.className = 'qc141-m'; s.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:2px;background:#2a3a52;margin-right:6px'; c.prepend(s); }`) },
};
async function mutate(page: Page) {
  const m = PAGE_MUT[MUT];
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) { await page.evaluate(m.js); await page.waitForTimeout(400); }
}

type Open = { group?: string; view?: "list" | "birds" };
async function open(page: Page, vp: VP, o: Open = {}) {
  await page.addInitScript((x: Open) => {
    try {
      sessionStorage.removeItem("qh.qc.filters");
      sessionStorage.removeItem("qh.qc.collapsed1511");
      sessionStorage.setItem("qh.qc.view150", x.view ?? "list");
      localStorage.setItem("qh.qc.view", JSON.stringify({ v: 1, group: x.group ?? "attention", sort: { key: "due", reversed: false }, density: "comfortable" }));
      localStorage.setItem("sa.guide.queries", "1");
      localStorage.setItem("sa.guide.queries-explainer", "1");
      localStorage.removeItem("sa.pinList.queries");
    } catch { /* private mode */ }
  }, o);
  await openRoute(page, "/queries", vp);
  await page.locator("[data-qc151='row'], [data-qc151='birds-card']").first().waitFor({ timeout: 30_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.mouse.move(5, 5);
  await mutate(page);
}
const click = (page: Page, sel: string) => page.evaluate((s) => { const e = [...document.querySelectorAll<HTMLElement>(s)].find((x) => x.getBoundingClientRect().height > 0); e?.click(); return !!e; }, sel);

/** every row's facts, in the list */
const readRows = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")].map((row) => {
  const btn = row.querySelector<HTMLElement>("[data-qc151='move']");
  const bs = btn ? getComputedStyle(btn) : null;
  return {
    id: row.dataset.id ?? "", w: row.dataset.where ?? "", st: row.dataset.status ?? "",
    btn: btn ? { tone: btn.dataset.tone ?? "", label: (btn.childNodes[0]?.textContent ?? "").trim(), bg: bs!.backgroundColor, fg: bs!.color, sh: bs!.boxShadow } : null,
  };
}));

for (const vp of SIZES) {
  test.describe(`QC1512 @ ${vp.width}`, () => {
    test("L1 · banner: navy, the white title, the subline with figures, two pill buttons; the week card 18 under it", async ({ page }) => {
      test.skip(!run("L1"));
      const L = new Ledger(`L1-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => {
        const h = document.querySelector<HTMLElement>("[data-qc151='header']");
        const t = h?.querySelector<HTMLElement>("h1");
        const sub = h?.querySelector<HTMLElement>("[data-qc1512='subline']");
        const log = h?.querySelector<HTMLElement>("[data-qc151='log']"), rec = h?.querySelector<HTMLElement>("[data-qc151='record']");
        const sum = document.querySelector<HTMLElement>("[data-qc1511='summary']");
        const cs = (e?: HTMLElement | null) => (e ? getComputedStyle(e) : null);
        return {
          h: !!h, bg: cs(h)?.backgroundColor, radius: cs(h)?.borderTopLeftRadius,
          title: t?.textContent?.trim(), tColor: cs(t)?.color, tFont: cs(t)?.fontFamily, tSize: cs(t)?.fontSize,
          sub: sub?.textContent?.replace(/\s+/g, " ").trim() ?? "", figs: sub ? [...sub.querySelectorAll("b")].map((b) => b.textContent) : [],
          subItalic: cs(sub)?.fontStyle, figWhite: sub ? [...sub.querySelectorAll("b")].every((b) => getComputedStyle(b).color === "rgb(255, 255, 255)" && getComputedStyle(b).fontStyle === "normal") : false,
          log: log ? { bg: cs(log)!.backgroundColor, fg: cs(log)!.color, h: log.getBoundingClientRect().height, r: cs(log)!.borderTopLeftRadius } : null,
          rec: rec ? { bg: cs(rec)!.backgroundColor, fg: cs(rec)!.color, sh: cs(rec)!.boxShadow, h: rec.getBoundingClientRect().height, r: cs(rec)!.borderTopLeftRadius } : null,
          gap: h && sum ? sum.getBoundingClientRect().top - h.getBoundingClientRect().bottom : null,
        };
      });
      L.check("population", r.h && !!r.log && !!r.rec, JSON.stringify(r));
      L.check("navy block, 22px corners", r.bg === "rgb(42, 58, 82)" && r.radius === "22px", `${r.bg} ${r.radius}`);
      L.check("Your queries in white Special Elite 44", r.title === "Your queries" && r.tColor === "rgb(255, 255, 255)" && /Special Elite/.test(r.tFont ?? "") && r.tSize === "44px", `${r.title} ${r.tColor} ${r.tFont} ${r.tSize}`);
      L.check("the subline: … N sent · N active · N% heard back", /\d+ sent · \d+ active · \d+% heard back$/.test(r.sub) && r.figs.length === 3, r.sub);
      L.check("the subline italic, its figures white upright", r.subItalic === "italic" && r.figWhite, `${r.subItalic} ${r.figWhite}`);
      L.check("Log: white with navy text, a 46px pill", !!r.log && r.log.bg === "rgb(255, 255, 255)" && r.log.fg === "rgb(42, 58, 82)" && Math.abs(r.log.h - 46) <= 1 && parseFloat(r.log.r) >= 23, JSON.stringify(r.log));
      L.check("Record: outlined white, a 46px pill", !!r.rec && r.rec.bg === "rgba(0, 0, 0, 0)" && r.rec.fg === "rgb(255, 255, 255)" && /rgba\(255, 255, 255, 0\.35\)/.test(r.rec.sh) && Math.abs(r.rec.h - 46) <= 1 && parseFloat(r.rec.r) >= 23, JSON.stringify(r.rec));
      L.check("the week card 18 ±1 under it", r.gap != null && Math.abs(r.gap - 18) <= 1, `${r.gap}`);
      L.done(8);
    });

    test("L2 · group cards: one card per group, rows touching, 22 between cards, 18px outer corners", async ({ page }) => {
      test.skip(!run("L2"));
      const L = new Ledger(`L2-${vp.width}`);
      await open(page, vp);
      const g = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")].map((gr) => {
        const h = gr.querySelector<HTMLElement>("[data-qc1511='group-header']");
        const rows = [...gr.querySelectorAll<HTMLElement>("[data-qc151='row']")];
        const hr = h?.getBoundingClientRect();
        const first = rows[0]?.firstElementChild as HTMLElement | undefined, lastRow = rows[rows.length - 1];
        return {
          k: gr.dataset.k, n: rows.length,
          edges: rows.map((r) => [r.getBoundingClientRect().left - (hr?.left ?? 0), r.getBoundingClientRect().right - (hr?.right ?? 0)]),
          gaps: rows.map((r, i) => (i ? r.getBoundingClientRect().top - rows[i - 1].getBoundingClientRect().bottom : r.getBoundingClientRect().top - (hr?.bottom ?? 0))),
          top: hr?.top ?? 0, bottom: lastRow?.getBoundingClientRect().bottom ?? hr?.bottom ?? 0,
          rTL: h ? getComputedStyle(h.firstElementChild as HTMLElement).borderTopLeftRadius : "", rTR: h ? getComputedStyle(h.lastElementChild as HTMLElement).borderTopRightRadius : "",
          rBL: lastRow ? getComputedStyle(lastRow.firstElementChild as HTMLElement).borderBottomLeftRadius : "", rBR: lastRow ? getComputedStyle(lastRow.lastElementChild as HTMLElement).borderBottomRightRadius : "",
          first: !!first,
        };
      }));
      L.check("population", g.length >= 3 && g.every((x) => x.n > 0), JSON.stringify(g.map((x) => [x.k, x.n])));
      for (const x of g) {
        L.check(`${x.k}: rows share the header's edges ±1`, x.edges.every(([l, r]) => Math.abs(l) <= 1 && Math.abs(r) <= 1), JSON.stringify(x.edges.filter(([l, r]) => Math.abs(l) > 1 || Math.abs(r) > 1).slice(0, 3)));
        L.check(`${x.k}: 0 between rows`, x.gaps.every((d) => Math.abs(d) <= 0.5), JSON.stringify([...new Set(x.gaps.map((d) => Math.round(d * 10) / 10))]));
        L.check(`${x.k}: outer corners 18 ±1`, [x.rTL, x.rTR, x.rBL, x.rBR].every((v) => Math.abs(parseFloat(v) - 18) <= 1), `${x.rTL} ${x.rTR} ${x.rBL} ${x.rBR}`);
      }
      for (let i = 1; i < g.length; i++) L.check(`${g[i - 1].k} → ${g[i].k}: 22 ±2`, Math.abs(g[i].top - g[i - 1].bottom - 22) <= 2, `${(g[i].top - g[i - 1].bottom).toFixed(1)}`);
      L.done(10);
    });

    test("L3 · header colours follow the grouping: who, next action, status, package", async ({ page }) => {
      test.skip(!run("L3"));
      const L = new Ledger(`L3-${vp.width}`);
      const heads = () => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc1511='group']")].map((gr) => {
        const td = gr.querySelector<HTMLElement>("[data-qc1511='group-header'] td");
        const gn = gr.querySelector<HTMLElement>("[data-qc151='section']");
        return { k: gr.dataset.k ?? "", label: gn?.textContent ?? "", bg: td ? getComputedStyle(td).backgroundColor : "", fg: gn ? getComputedStyle(gn).color : "", glyph: !!gr.querySelector(".qc1512-gg svg") };
      }));
      await open(page, vp);
      const who = await heads();
      /* re-pointed by v152 §1.1: the six states; Gone quiet's title cell is a gradient (QC152 L2 holds it), so its colour is clear */
      const WHO: Record<string, string> = { offer: NAVY, materials: NAVY, nudge: BLUE, agent: STONE, quiet: "rgba(0, 0, 0, 0)", closed: FADED };
      L.check("who: population", who.length >= 3, JSON.stringify(who.map((x) => x.k)));
      for (const h of who) L.check(`who · ${h.label}`, WHO[h.k] === h.bg && (h.bg === NAVY ? h.fg === WHITE : h.fg !== WHITE), `${h.bg} ${h.fg}`);
      await open(page, vp, { group: "action" });
      const na = await heads();
      /* re-pointed by v152 §1.5: Gone quiet's next action is "Close it", in its own gradient (clear here) */
      const ORDER = ["Answer the offer", "Send your full", "Send your partial", "Send your revision", "Nudge", "Reply due soon", "Waiting to hear", "Close it", "Nothing to do"];
      const NA: Record<string, string> = { "Answer the offer": NAVY, "Send your full": NAVY, "Send your partial": NAVY, "Send your revision": NAVY, "Nudge": BLUE, "Reply due soon": STONE, "Waiting to hear": STONE, "Close it": "rgba(0, 0, 0, 0)", "Nothing to do": FADED };
      L.check("next action: population", na.length >= 3, JSON.stringify(na.map((x) => x.label)));
      L.check("next action: in the brief's order", na.every((h, i) => i === 0 || ORDER.indexOf(h.label) > ORDER.indexOf(na[i - 1].label)) && na.every((h) => ORDER.includes(h.label)), JSON.stringify(na.map((x) => x.label)));
      for (const h of na) L.check(`next action · ${h.label}`, NA[h.label] === h.bg, h.bg);
      await open(page, vp, { group: "status" });
      const st = await heads();
      L.check("status: population", st.length >= 3, JSON.stringify(st.map((x) => x.k)));
      for (const h of st) L.check(`status · ${h.k}`, STATUS_RGB[h.k] === h.bg && h.glyph, `${h.bg} glyph ${h.glyph}`);
      await open(page, vp, { group: "package" });
      const pk = await heads();
      L.check("package: population", pk.length >= 1, JSON.stringify(pk.map((x) => x.k)));
      L.check("package: all stone", pk.every((h) => h.bg === STONE), JSON.stringify([...new Set(pk.map((h) => h.bg))]));
      L.done(12);
    });

    test("L4 · tags: Your move (navy) on your-move rows, Gone quiet (outlined) on gone-quiet rows, none else; no With column", async ({ page }) => {
      test.skip(!run("L4"));
      const L = new Ledger(`L4-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => ({
        rows: [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")].map((row) => {
          const t = [...row.querySelectorAll<HTMLElement>("[data-qc1512='tag']")];
          const cs = t[0] ? getComputedStyle(t[0]) : null;
          return { w: row.dataset.where ?? "", n: t.length, text: t[0]?.textContent ?? "", bg: cs?.backgroundColor ?? "", fg: cs?.color ?? "", sh: cs?.boxShadow ?? "", h: t[0]?.getBoundingClientRect().height ?? 0 };
        }),
        withCol: [...document.querySelectorAll<HTMLElement>("[data-qc1511='label']")].some((l) => /^With/.test((l.textContent ?? "").trim())),
      }));
      const by = (w: string) => r.rows.filter((x) => x.w === w);
      L.check("population", by("you").length > 0 && by("quiet").length > 0 && by("agent").length > 0 && by("closed").length > 0, JSON.stringify(["you", "quiet", "agent", "closed"].map((w) => by(w).length)));
      /* re-pointed by v152 §1.5: Your move holds Nudge due too, whose tag is "Nudge due" in the light blue */
      L.check("Your move rows: one tag, 20 tall — navy Your move, or light-blue Nudge due", by("you").every((x) => x.n === 1 && Math.abs(x.h - 20) <= 1 && ((x.text === "Your move" && x.bg === NAVY && x.fg === WHITE) || (x.text === "Nudge due" && x.bg === "rgb(197, 208, 221)" && x.fg !== WHITE))), JSON.stringify(by("you").filter((x) => !(x.n === 1)).slice(0, 2)));
      L.check("Gone quiet rows: one outlined tag", by("quiet").every((x) => x.n === 1 && x.text === "Gone quiet" && x.bg === "rgba(0, 0, 0, 0)" && /rgb\(207, 197, 183\)/.test(x.sh)), JSON.stringify(by("quiet").slice(0, 2)));
      L.check("With the agent and Closed rows: no tag", [...by("agent"), ...by("closed")].every((x) => x.n === 0), `${[...by("agent"), ...by("closed")].filter((x) => x.n).length} tagged`);
      L.check("no With column", !r.withCol, "");
      L.done(5);
    });

    test("L5 · status pills: a white tag with a cap in the status colour; Queried sand; Closed grey text", async ({ page }) => {
      test.skip(!run("L5"));
      const L = new Ledger(`L5-${vp.width}`);
      await open(page, vp);
      const p = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")].map((row) => {
        const pill = row.querySelector<HTMLElement>("[data-qc1511='stand-pill']");
        const cap = pill?.querySelector<HTMLElement>("[data-qc1512='cap']");
        const tx = pill?.querySelector<HTMLElement>(".qc1512-wt");
        return {
          st: row.dataset.status ?? "", w: row.dataset.where ?? "", body: pill ? getComputedStyle(pill).backgroundColor : "", cap: cap ? getComputedStyle(cap).backgroundColor : "",
          capW: cap?.getBoundingClientRect().width ?? 0, h: pill?.getBoundingClientRect().height ?? 0, fg: tx ? getComputedStyle(tx).color : "",
        };
      }));
      L.check("population", p.length > 5 && p.some((x) => x.st === "Queried") && p.some((x) => x.w === "closed"), `${p.length}`);
      L.check("every cap is its status colour", p.every((x) => STATUS_RGB[x.st] === x.cap), JSON.stringify(p.filter((x) => STATUS_RGB[x.st] !== x.cap).slice(0, 3)));
      L.check("every body white, 30 tall, a 34px cap", p.every((x) => x.body === WHITE && Math.abs(x.h - 30) <= 1 && Math.abs(x.capW - 34) <= 1), JSON.stringify(p.slice(0, 2)));
      L.check("Queried's cap is sand, not grey", p.filter((x) => x.st === "Queried").every((x) => x.cap === SAND), "");
      L.check("Closed text #8a8076; open text ink", p.filter((x) => x.w === "closed").every((x) => x.fg === FAINT) && p.filter((x) => x.w !== "closed").every((x) => x.fg === "rgb(28, 19, 15)"), "");
      L.done(5);
    });

    test("L6 · Next: a Special Elite number at 26px and a two-line label; late and overdue rust, with the agent faint", async ({ page }) => {
      test.skip(!run("L6"));
      const L = new Ledger(`L6-${vp.width}`);
      await open(page, vp);
      const n = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")].map((row) => {
        const cell = row.querySelector<HTMLElement>("[data-qc151='next']");
        const b = cell?.querySelector<HTMLElement>("[data-qc1512='next-n']"), s = cell?.querySelector<HTMLElement>("[data-qc1512='next-l']");
        const lh = s ? parseFloat(getComputedStyle(s).lineHeight) : 0;
        return {
          w: row.dataset.where ?? "", text: (cell?.textContent ?? "").trim(), num: !!b, font: b ? getComputedStyle(b).fontFamily : "", size: b ? getComputedStyle(b).fontSize : "",
          lines: s && lh ? Math.round(s.getBoundingClientRect().height / lh) : 0, label: (s?.innerText ?? "").replace(/\n/g, " / "),
          nc: b ? getComputedStyle(b).color : "", lc: s ? getComputedStyle(s).color : "",
        };
      }));
      const nums = n.filter((x) => x.num);
      L.check("population", nums.length > 5, `${nums.length}`);
      L.check("Special Elite 26px", nums.every((x) => /Special Elite/.test(x.font) && x.size === "26px"), JSON.stringify([...new Set(nums.map((x) => `${x.font} ${x.size}`))]));
      L.check("a two-line label", nums.every((x) => x.lines === 2 && / \/ /.test(x.label)), JSON.stringify(nums.filter((x) => x.lines !== 2).slice(0, 2)));
      const late = nums.filter((x) => /late$|overdue$|no reply$/.test(x.label));
      L.check("late and overdue in rust", late.length > 0 && late.every((x) => x.nc === LATE && x.lc === LATE), `${late.length}`);
      const agent = nums.filter((x) => x.w === "agent");
      L.check("with the agent: #8a8076", agent.length > 0 && agent.every((x) => x.nc === FAINT && /to reply$/.test(x.label)), JSON.stringify(agent.slice(0, 2)));
      L.check("closed: —", n.filter((x) => x.w === "closed").every((x) => x.text === "—"), "");
      L.done(6);
    });

    test("L7 · buttons: navy yours, outlined Nudge, none else; Birds-eye's hover button is the list's", async ({ page }) => {
      test.skip(!run("L7"));
      const L = new Ledger(`L7-${vp.width}`);
      await open(page, vp);
      const rows = await readRows(page);
      const by = (w: string) => rows.filter((x) => x.w === w);
      L.check("population", by("you").length > 0 && by("quiet").length > 0, JSON.stringify(["you", "quiet", "agent", "closed"].map((w) => by(w).length)));
      const navy = rows.filter((x) => x.btn?.tone === "navy"), nudge = rows.filter((x) => x.btn?.tone === "nudge");
      L.check("navy buttons: navy, white text", navy.length > 0 && navy.every((x) => x.btn!.bg === NAVY && x.btn!.fg === WHITE), JSON.stringify(navy.slice(0, 2)));
      /* re-pointed by v152 §1.5: the outlined button is Nudge on Nudge due and "Close it" on Gone quiet */
      L.check("Nudge / Close it: white, navy text, outlined #c9cfd8", nudge.length > 0 && nudge.every((x) => (x.btn!.label === "Nudge" || x.btn!.label === "Close it") && x.btn!.bg === WHITE && x.btn!.fg === NAVY && /rgb\(201, 207, 216\)/.test(x.btn!.sh)), JSON.stringify(nudge.slice(0, 2)));
      L.check("every Your move row has a button; gone quiet's is Close it", by("you").every((x) => !!x.btn) && by("quiet").every((x) => x.btn?.tone === "nudge" && x.btn?.label === "Close it"), "");
      L.check("With the agent and Closed: none", [...by("agent"), ...by("closed")].every((x) => !x.btn), "");
      const list = new Map(rows.map((x) => [x.id, x]));
      await click(page, "[data-qc151='switch'] [data-v='birds']"); await page.waitForTimeout(1500);
      const be = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row']")].map((row) => {
        const b = row.querySelector<HTMLElement>("[data-qc150='be-act']");
        const cs = b ? getComputedStyle(b) : null;
        return { id: row.dataset.id ?? "", b: b ? { tone: b.dataset.tone ?? "", label: (b.childNodes[0]?.textContent ?? "").trim(), bg: cs!.backgroundColor, fg: cs!.color, sh: cs!.boxShadow } : null };
      }));
      L.check("Birds-eye population", be.length > 3 && be.filter((x) => x.b).length > 3, `${be.length}`);
      const bad = be.filter((x) => {
        const l = list.get(x.id);
        if (!l || !x.b) return false;
        if (!l.btn) return !(x.b.tone === "plain" && x.b.label === "Record a response" && x.b.bg === WHITE && x.b.fg === "rgb(91, 79, 71)");
        return !(x.b.tone === l.btn.tone && x.b.label === l.btn.label && x.b.bg === l.btn.bg && x.b.fg === l.btn.fg);
      });
      L.check("Birds-eye: the list's colour and words for the same query", bad.length === 0, JSON.stringify(bad.slice(0, 3).map((x) => [x.b, list.get(x.id)?.btn])));
      L.done(7);
    });

    test("L8 · rows: every row 68 ±1, closed too; no tinted start", async ({ page }) => {
      test.skip(!run("L8"));
      const L = new Ledger(`L8-${vp.width}`);
      await open(page, vp);
      const r = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='row']")].map((row) => ({
        w: row.dataset.where ?? "", h: row.getBoundingClientRect().height, start: getComputedStyle(row.firstElementChild as HTMLElement).backgroundColor,
      })));
      L.check("population", r.length > 5 && r.some((x) => x.w === "closed"), `${r.length}`);
      L.check("every row 68 ±1", r.every((x) => Math.abs(x.h - 68) <= 1), JSON.stringify([...new Set(r.map((x) => Math.round(x.h * 10) / 10))]));
      L.check("closed rows 68 ±1", r.filter((x) => x.w === "closed").every((x) => Math.abs(x.h - 68) <= 1), "");
      L.check("no tinted start", r.every((x) => x.start === WHITE), JSON.stringify([...new Set(r.map((x) => x.start))]));
      L.done(4);
    });

    test("L9 · Birds-eye's date header is navy; TODAY white; today's line on the TODAY tag after load, a drag and each zoom", async ({ page }) => {
      test.skip(!run("L9"));
      const L = new Ledger(`L9-${vp.width}`);
      await open(page, vp, { view: "birds" });
      await page.waitForTimeout(800);
      const look = await page.evaluate(() => {
        const h = document.querySelector<HTMLElement>("[data-qc150='daterow']"), t = document.querySelector<HTMLElement>("[data-qc150='today-tag']");
        const mo = [...document.querySelectorAll<HTMLElement>("[data-qc150='month'] span")].map((s) => getComputedStyle(s).color);
        return { h: !!h, bg: h ? getComputedStyle(h).backgroundColor : "", tBg: t ? getComputedStyle(t).backgroundColor : "", tFg: t ? getComputedStyle(t).color : "", mo };
      });
      L.check("population", look.h && look.mo.length > 0, JSON.stringify(look));
      L.check("the date header navy", look.bg === NAVY, look.bg);
      L.check("TODAY white with navy text", look.tBg === WHITE && look.tFg === NAVY, `${look.tBg} ${look.tFg}`);
      L.check("month names white", look.mo.every((c) => c === WHITE), JSON.stringify([...new Set(look.mo)]));
      const align = async (w: string) => {
        const a = await page.evaluate(() => {
          const line = document.querySelector<HTMLElement>("[data-qc150='today-line']")?.getBoundingClientRect();
          const tag = document.querySelector<HTMLElement>("[data-qc150='today-tag']")?.getBoundingClientRect();
          const ax = document.querySelector<HTMLElement>("[data-qc150='axis']")?.getBoundingClientRect();
          return line && tag && ax ? { line: line.left, tag: tag.left + tag.width / 2, inView: tag.left >= ax.left && tag.right <= ax.right } : null;
        });
        L.check(`${w}: today's line on the TODAY tag ±1`, !!a && a.inView && Math.abs(a.line - a.tag) <= 1, JSON.stringify(a));
      };
      await align("load");
      const ax = await page.locator("[data-qc150='axis']").first().boundingBox({ timeout: 5_000 }).catch(() => null);
      if (ax) { await page.mouse.move(ax.x + ax.width / 2, ax.y + 40); await page.mouse.down(); await page.mouse.move(ax.x + ax.width / 2 - 140, ax.y + 40, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(1200); }
      await align("drag");
      for (const z of ["6w", "6m", "3m"]) {
        await page.evaluate((zz) => ([...document.querySelectorAll<HTMLElement>("[data-qc150='zoom'] button")].find((b) => b.textContent?.trim().toLowerCase() === zz))?.click(), z);
        await page.waitForTimeout(1000);
        await align(`zoom ${z}`);
      }
      L.done(9);
    });

    test("L10 · bars: the current stage in its status colour (paler on watch-and-wait); the past grey", async ({ page }) => {
      test.skip(!run("L10"));
      const L = new Ledger(`L10-${vp.width}`);
      await open(page, vp);
      const status = new Map((await readRows(page)).map((x) => [x.id, x.st]));
      await click(page, "[data-qc151='switch'] [data-v='birds']"); await page.waitForTimeout(1500);
      const b = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc150='be-row']")].map((row) => ({
        id: row.dataset.id ?? "", when: row.dataset.when ?? "",
        cur: [...row.querySelectorAll<HTMLElement>("[data-qc150='be-bar']")].map((e) => getComputedStyle(e).backgroundColor),
        past: [...row.querySelectorAll<HTMLElement>("[data-qc150='be-past']")].map((e) => getComputedStyle(e).backgroundColor),
      })));
      const cur = b.filter((x) => x.cur.length && status.has(x.id));
      L.check("population", cur.length > 4 && cur.some((x) => x.when === "watch") && cur.some((x) => x.when !== "watch"), `${cur.length}`);
      const bad = cur.filter((x) => { const c = STATUS_RGB[status.get(x.id)!]; return x.cur[0] !== (x.when === "watch" ? PALE[c] : c); });
      L.check("current bars: the status colour", bad.length === 0, JSON.stringify(bad.slice(0, 3).map((x) => [status.get(x.id), x.when, x.cur[0]])));
      const past = b.flatMap((x) => x.past);
      L.check("past bars grey", past.length > 0 && past.every((c) => c === "rgb(233, 233, 228)"), JSON.stringify([...new Set(past)]));
      L.done(3);
    });

    test("L11 · filter panel: the Where it stands chips have no colour squares", async ({ page }) => {
      test.skip(!run("L11"));
      const L = new Ledger(`L11-${vp.width}`);
      await open(page, vp);
      await click(page, "[data-qc151='filters']"); await page.waitForTimeout(500);
      const r = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc151='panel'] [data-qc141='where-opt']")].map((c) => ({
        k: c.dataset.k, sq: [...c.querySelectorAll<HTMLElement>("*")].filter((e) => {
          const cs = getComputedStyle(e), rr = e.getBoundingClientRect();
          return rr.width > 0 && rr.width <= 16 && rr.height <= 16 && cs.backgroundColor !== "rgba(0, 0, 0, 0)";
        }).length,
      })));
      L.check("population", r.length === 4, JSON.stringify(r));
      L.check("no colour squares", r.every((x) => x.sq === 0), JSON.stringify(r));
      L.done(2);
    });
  });
}
