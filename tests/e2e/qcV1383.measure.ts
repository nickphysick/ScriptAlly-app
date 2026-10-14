/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query Centre v138.3 (design-refs/query-centre-v138-3/query-centre-v138-3.html) — the QC138.3 locks, on the rendered
 * page at 1512 × 900 and 1280 × 800 with the shell.
 *
 * A1 bars · B1 glyphs · C1 axis · D1 open row · E1 tray · F1 art.
 *
 * Each was run with its named mutation before its green was believed: `QC1383_MUTATE=<lock>` applies it in the page.
 * A1–C1 read the dev-only peek lab (`window.__SA_QC138_PEEK_LAB`), fed screens/03's cases with their stages.
 */
import { test, expect, type Page, type Locator } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute, liftMotionSuppression } from "./measure";
import { refCases } from "./qc1383Cases";

const DIR = "reports/qc-v138-3";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const MUT = process.env.QC1383_MUTATE ?? "";
const near = (a: unknown, b: number, t: number) => typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= t;

const MUTATIONS: Record<string, { css?: string; js?: string }> = {
  A1: { css: `.qc138-sheet .qc138-seg { flex-grow: 1 !important; }` },
  B1: { js: `document.querySelectorAll('[data-qcv="peek-stop"][data-kind="event"] [data-qcv="peek-mark"]').forEach((m) => { m.innerHTML = '<i class="qc138-mk-dot"></i>'; })` },
  C1: { js: `document.querySelectorAll('[data-qcv="peek"]').forEach((p) => { const d = document.createElement("div"); d.textContent = "1 tick = 1 week"; p.appendChild(d); })` },
  D1: { css: `.qc138-sheet .qc138-row.qc138-row[data-peek="over"] { background: #fcf3ee !important; box-shadow: none !important; } .qc138-sheet .qc138-row.qc138-row[data-peek="wait"] { background: #f3f5f9 !important; } .qc138-sheet .qc138-drw { border-top-style: dashed !important; }` },
  E1: { css: `.qc138-sheet .qc138-row:hover .qc138-nxm { opacity: 1 !important; }` },
  F1: { css: `.qc138-sheet .qc138-gimg { display: none !important; } .qc138-sheet .qc138-gart { visibility: visible !important; }` },
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
async function mutate(page: Page, lock: string) {
  const m = MUT === lock ? MUTATIONS[lock] : null;
  if (!m) return;
  if (m.css) await page.addStyleTag({ content: m.css });
  if (m.js) await page.evaluate(m.js);
  await page.waitForTimeout(150);
}
async function openQC(page: Page, vp: VP, opts: { lab?: boolean } = {}) {
  await page.addInitScript(() => { try { for (const k of ["contacts", "queries", "manuscripts"]) localStorage.setItem(`sa.guide.${k}`, "1"); sessionStorage.setItem("sa.qc138.folded", "[]"); } catch { /* */ } });
  if (opts.lab) await page.addInitScript((c) => { (window as unknown as { __SA_QC138_PEEK_LAB: unknown }).__SA_QC138_PEEK_LAB = c; }, refCases());
  await openRoute(page, "/queries", vp);
  await expect(page.locator('.qcv-group[data-v138] [data-qcv="row"]').first()).toBeVisible({ timeout: 30_000 });
  if (opts.lab) await expect(page.locator('[data-qc138="peek-lab"] [data-qcv="peek-chain"]').first()).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(700);
}
/** the lab cases' measurements, in order */
const readLab = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-qc138="peek-case"]')].filter((c) => c.getBoundingClientRect().height > 0).map((c) => {
  const pk = c.querySelector<HTMLElement>('[data-qcv="peek"]')!;
  const stops = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-stop"]')];
  const segs = [...pk.querySelectorAll<HTMLElement>('[data-qcv="peek-seg"]')];
  return {
    text: pk.textContent ?? "",
    cards: pk.querySelectorAll(".qc138-card").length,
    stops: stops.map((s) => {
      const svg = s.querySelector<SVGElement>('[data-qcv="peek-mark"] svg');
      const tick = s.querySelector<HTMLElement>(".qc138-mk-tick");
      return {
        kind: s.dataset.kind ?? "", name: s.querySelector('[data-qcv="peek-name"]')?.textContent ?? "", glyph: svg?.dataset.k ?? null,
        dashed: !!svg?.querySelector('[data-qc138="dashed"]'), tickW: tick ? tick.getBoundingClientRect().width : null,
        over: s.querySelector('[data-qcv="peek-over"]')?.textContent ?? null,
      };
    }),
    segs: segs.map((s) => {
      const ln = s.querySelector<HTMLElement>(".qc138-seg-ln")!;
      const cs = getComputedStyle(ln);
      const sb = s.getBoundingClientRect();
      return {
        kind: s.dataset.kind ?? "", days: Number(s.dataset.days), w: sb.width, floor: Number(s.dataset.floor ?? "64"),
        h: ln.getBoundingClientRect().height, bg: cs.backgroundColor, img: cs.backgroundImage, label: !!s.querySelector('[data-qcv="peek-seg-label"]'),
        axis: [...s.querySelectorAll<HTMLElement>('[data-qcv="peek-axis"] b')].map((b) => { const r = b.getBoundingClientRect(); return { lab: b.textContent ?? "", c: (r.left + r.right) / 2 - sb.left }; }),
      };
    }),
  };
}));
const rowOf = async (page: Page, tone: "over" | "wait"): Promise<Locator> => {
  const id = await page.evaluate((tn) => {
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    return [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getBoundingClientRect().height > 0).find((r) => {
      if (r.dataset.court === "closed" || r.dataset.due == null) return false;
      const d = new Date(Number(r.dataset.due)); d.setHours(0, 0, 0, 0);
      return tn === "over" ? d.getTime() < t0.getTime() : d.getTime() >= t0.getTime() && r.dataset.court === "agent";
    })?.dataset.qid ?? null;
  }, tone);
  expect(id, `a ${tone} row`).not.toBeNull();
  return page.locator(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${id}"]`);
};
async function hoverRow(page: Page, row: Locator) {
  await row.scrollIntoViewIfNeeded();
  await page.mouse.move(2, 2);
  await page.waitForTimeout(150);
  const b = (await row.boundingBox())!;
  await page.mouse.move(b.x + 300, b.y + 18);
}

test.describe("Query Centre v138.3", () => {
  test("A1 · bars: no cards, 10px bars at true scale, coloured by whose turn it was", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("A1");
    for (const vp of SIZES) {
      await openQC(page, vp, { lab: true });
      await mutate(page, "A1");
      await page.waitForTimeout(300);
      const cs = await readLab(page);
      const w = `${vp.width}`;
      L.check("A1", `${w} cases`, cs.length === 5, `${cs.length}`);
      L.check("A1", `${w} no stop cards`, cs.every((c) => c.cards === 0), cs.map((c) => c.cards).join(","));
      L.check("A1", `${w} every bar 10 ±1`, cs.every((c) => c.segs.every((s) => near(s.h, 10, 1))), cs.flatMap((c) => c.segs.map((s) => s.h.toFixed(1))).join(","));
      /* true scale: two gaps both wider than their floor keep the ratio of their days */
      let pairs = 0, worst = 0;
      for (const c of cs) {
        const free = c.segs.filter((s) => s.w > s.floor + 0.5 && s.days > 0);
        for (let a = 0; a < free.length; a += 1) for (let b = a + 1; b < free.length; b += 1) { pairs += 1; worst = Math.max(worst, Math.abs((free[a].w / free[b].w) / (free[a].days / free[b].days) - 1)); }
      }
      L.check("A1", `${w} precondition: a pair of free gaps`, pairs > 0, `${pairs}`);
      L.check("A1", `${w} widths follow days`, worst <= 0.08, `worst ${(worst * 100).toFixed(1)}% over ${pairs} pairs`);
      const clara = cs[0], sophie = cs[1];
      L.check("A1", `${w} a gap opened by Partial requested is rust`, clara.segs[1]?.bg === "rgb(176, 96, 62)", `${clara.segs[1]?.bg}`);
      L.check("A1", `${w} a gap opened by Partial sent is navy`, sophie.segs[1]?.bg === "rgb(61, 80, 112)", `${sophie.segs[1]?.bg}`);
      const over = clara.segs.find((s) => s.kind === "over");
      L.check("A1", `${w} the overdue gap has the hatch`, !!over && /repeating-linear-gradient/.test(over.img), `${over?.img.slice(0, 40)}`);
    }
    L.done(16);
  });

  test("B1 · glyphs: events draw their stage glyph, the dashed ring only on your move; Today a 3px tick with '{d} over'", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("B1");
    for (const vp of SIZES) {
      await openQC(page, vp, { lab: true });
      await mutate(page, "B1");
      const cs = await readLab(page);
      const w = `${vp.width}`;
      const all = cs.flatMap((c) => c.stops);
      const by = (n: string) => all.find((s) => s.name === n);
      const WANT: Record<string, string> = { "Partial requested": "pr", "Full sent": "fs", Offer: "of", "Partial sent": "ps", Queried: "q", Passed: "cl" };
      for (const [n, k] of Object.entries(WANT)) L.check("B1", `${w} ${n} draws the ${k} glyph`, by(n)?.glyph === k, `${by(n)?.glyph}`);
      const events = all.filter((s) => s.kind === "event");
      const dashed = events.filter((s) => s.dashed).map((s) => s.name).sort();
      L.check("B1", `${w} only your-move events are dashed`, JSON.stringify(dashed) === JSON.stringify(["Offer", "Partial requested"]), dashed.join(","));
      const today = cs[0].stops.find((s) => s.kind === "today");
      L.check("B1", `${w} Today is a 3 ±1px tick`, !!today && near(today.tickW, 3, 1), `${today?.tickW}`);
      L.check("B1", `${w} an overdue Today reads '{d} over'`, !!today?.over && / over$/.test(today.over), `${today?.over}`);
      L.check("B1", `${w} no overdue gap has a label`, cs.every((c) => c.segs.filter((s) => s.kind === "over").every((s) => !s.label)), "");
    }
    L.done(20);
  });

  test("C1 · axis: no tick key; Aug under Clara's first gap; labels 34px apart and clear of the gap's start", async ({ page }) => {
    test.setTimeout(240_000);
    const L = new Ledger("C1");
    for (const vp of SIZES) {
      await openQC(page, vp, { lab: true });
      await mutate(page, "C1");
      const cs = await readLab(page);
      const w = `${vp.width}`;
      L.check("C1", `${w} no '1 tick ='`, cs.every((c) => !c.text.includes("1 tick =")), "");
      L.check("C1", `${w} Aug under Clara's first gap`, cs[0].segs[0]?.axis.some((a) => a.lab === "Aug"), JSON.stringify(cs[0].segs[0]?.axis));
      const labs = cs.flatMap((c) => c.segs.map((s) => s.axis));
      L.check("C1", `${w} precondition: labels drawn`, labs.flat().length > 2, `${labs.flat().length}`);
      L.check("C1", `${w} no two labels within 34px`, labs.every((a) => a.every((x, i) => i === 0 || x.c - a[i - 1].c >= 33.5)), "");
      L.check("C1", `${w} none within 52px of its gap's start`, labs.every((a) => a.every((x) => x.c >= 51.5)), JSON.stringify(labs.flat().map((x) => Math.round(x.c))));
    }
    L.done(10);
  });

  test("D1 · open row: an outline and a faint wash in the state's colour; a solid rule", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("D1");
    for (const vp of SIZES) {
      await openQC(page, vp);
      await liftMotionSuppression(page);
      await mutate(page, "D1");
      for (const tone of ["over", "wait"] as const) {
        const row = await rowOf(page, tone);
        await hoverRow(page, row);
        await expect(row.locator('[data-qcv="peek-drawer"]')).toBeVisible({ timeout: 5000 });
        await page.waitForTimeout(700);
        const r = await row.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, sh: getComputedStyle(el).boxShadow, rule: getComputedStyle(el.querySelector<HTMLElement>('[data-qcv="peek-drawer"]')!).borderTopStyle }));
        const w = `${vp.width} ${tone}`;
        if (tone === "over") {
          L.check("D1", `${w} wash`, r.bg === "rgb(253, 248, 245)", r.bg);
          L.check("D1", `${w} outline`, r.sh.includes("rgba(162, 69, 42, 0.5)"), r.sh);
        } else {
          L.check("D1", `${w} wash`, r.bg === "rgb(249, 250, 252)", r.bg);
          L.check("D1", `${w} outline`, r.sh.includes("rgba(45, 58, 80, 0.45)"), r.sh);
        }
        L.check("D1", `${w} solid rule`, r.rule === "solid", r.rule);
      }
    }
    L.done(12);
  });

  test("E1 · tray: the Next move text fades under it, and it never reaches What you sent", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("E1");
    for (const vp of SIZES) {
      await openQC(page, vp);
      await mutate(page, "E1");
      const ids = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.qcv-group[data-v138] [data-qcv="row"]')].filter((r) => r.getBoundingClientRect().height > 0).slice(0, 8).map((r) => r.dataset.qid!));
      L.check("E1", `${vp.width} rows`, ids.length >= 6, `${ids.length}`);
      for (const id of ids) {
        const row = page.locator(`.qcv-group[data-v138] [data-qcv="row"][data-qid="${id}"]`);
        await hoverRow(page, row);
        await page.waitForTimeout(250);
        const r = await row.evaluate((el) => {
          const sheet = el.closest<HTMLElement>(".qc138-sheet")!;
          const sent = sheet.querySelector<HTMLElement>('.qc138-h[data-k="sent"]')!.getBoundingClientRect();
          const tray = el.querySelector<HTMLElement>('[data-qcv="row-tray"]')!.getBoundingClientRect();
          return { op: Number(getComputedStyle(el.querySelector<HTMLElement>(".qc138-nxm")!).opacity), trayL: tray.left, trayW: tray.width, sentR: sent.right };
        });
        L.check("E1", `${vp.width} ${id} next move hidden`, r.op === 0, `${r.op}`);
        L.check("E1", `${vp.width} ${id} tray clear of What you sent`, r.trayW > 0 && r.trayL >= r.sentR - 0.5, `tray ${r.trayL.toFixed(1)} vs sent ${r.sentR.toFixed(1)}`);
      }
    }
    L.done(26);
  });

  test("F1 · art: the talon and the hourglass break out of their bands; none in compact or the pinned row; still under reduced motion", async ({ page }) => {
    test.setTimeout(300_000);
    const L = new Ledger("F1");
    const art = () => page.evaluate(() => {
      const g = [...document.querySelectorAll<HTMLElement>(".qcv-group[data-v138]")].find((e) => e.getBoundingClientRect().height > 0)!;
      const one = (tone: string) => {
        const b = g.querySelector<HTMLElement>(`.qc138-band--${tone}`);
        const img = b?.querySelector<HTMLImageElement>('[data-qcv="gband-art"]');
        const circ = b?.querySelector<HTMLElement>(".qc138-gart");
        /* offsetWidth: the talon is rotated −6°, so its bounding box is wider than its layout box */
        return { band: !!b, w: img ? img.offsetWidth : null, shown: !!img && getComputedStyle(img).display !== "none", src: img?.currentSrc ?? "", anim: img ? getComputedStyle(img).animationName : "", circle: circ ? getComputedStyle(circ).visibility : "" };
      };
      return { you: one("you"), wait: one("waiting"), pinned: document.querySelectorAll('[data-qc138="pinned"] [data-qcv="gband-art"]').length };
    });
    for (const vp of SIZES) {
      await openQC(page, vp);
      await liftMotionSuppression(page);
      await mutate(page, "F1");
      const a = await art();
      const w = `${vp.width}`;
      L.check("F1", `${w} Your move: the talon, 46 ±1`, a.you.shown && near(a.you.w, 46, 1) && /your-move-talon\.webp/.test(a.you.src), `${a.you.shown} ${a.you.w} ${a.you.src.split("/").pop()}`);
      L.check("F1", `${w} Your move: no white circle`, a.you.circle === "hidden", a.you.circle);
      L.check("F1", `${w} Waiting: the hourglass, 54 ±1`, a.wait.shown && near(a.wait.w, 54, 1) && /waiting-hourglass\.webp/.test(a.wait.src), `${a.wait.shown} ${a.wait.w}`);
      L.check("F1", `${w} both move`, a.you.anim !== "none" && a.wait.anim !== "none", `${a.you.anim} ${a.wait.anim}`);
      L.check("F1", `${w} none in the pinned row`, a.pinned === 0, `${a.pinned}`);
      /* compact keeps the small icons */
      await page.locator('.qcv-group[data-v138] [data-d="compact"]').click();
      await page.waitForTimeout(300);
      const c = await art();
      L.check("F1", `${w} compact: no art`, !c.you.shown && !c.wait.shown, `${c.you.shown} ${c.wait.shown}`);
      await page.locator('.qcv-group[data-v138] [data-d="comfortable"]').click();
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openQC(page, SIZES[0]);
    await liftMotionSuppression(page);
    await mutate(page, "F1");
    const r = await art();
    L.check("F1", "reduced motion: no animation", r.you.anim === "none" && r.wait.anim === "none", `${r.you.anim} ${r.wait.anim}`);
    L.done(13);
  });
});
