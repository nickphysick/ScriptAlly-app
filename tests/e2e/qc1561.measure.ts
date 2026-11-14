/**
 * Query Centre v156.1 — streak-led top right, lined-up card boxes, the arrow chip (design-refs/query-centre-v156-1.html),
 * measured on the emulator harness at 1920 and 1440.
 *
 *   SA_PHASE=before  Step 0: the Sent and Next boxes' top, height and padding on a waiting card with a nudge line and
 *                    a "your move" card; the Next box's fill at rest and hovered; before screens.
 *   (default)        W1 the top-right block in its three situations (dev aid __SA_QC156_GOAL), and the collapsed bar;
 *                    W2 the boxes line up; W3 the chip. Screens to reports/qc-v156-1/.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const PAGE = ".qc151.qc153";
const SCROLL = ".ws-window .qc-wpg.qc-wpg--v11 > .wpg-scroll";
const PHASE = process.env.SA_PHASE === "before" ? "before" : "after";
const DIR = "reports/qc-v156-1";
const SHOTS = `${DIR}/shots`;
const SIZES = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }];
test.setTimeout(900_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect(this.rows.length, "assertions run").toBeGreaterThanOrEqual(min);
    expect(this.rows.filter((r) => !r.ok).map((r) => r.name)).toEqual([]);
  }
}

async function openQc(page: Page, vp: { width: number; height: number }, goal?: "streak" | "none" | "met") {
  await page.addInitScript((g) => {
    try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ }
    (window as unknown as Record<string, unknown>).__SA_QC156_GOAL = g ?? undefined;
  }, goal ?? null);
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${PAGE} [data-qc153="bar"]`, { timeout: 60_000 });
  const b = page.locator(`${PAGE} [data-qc153="bar"] button[data-v="list"]`);
  if ((await b.getAttribute("aria-pressed")) !== "true" && await b.isEnabled()) await b.click();
  await expect(page.locator(`${PAGE} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(600);
  await page.mouse.move(2, 2);
}
const scrollTo = async (page: Page, y: number) => {
  await page.evaluate(([sel, v]) => { const s = document.querySelector<HTMLElement>(sel as string); if (s) s.scrollTop = v as number; }, [SCROLL, y]);
  await page.waitForTimeout(450);
};

/** the card ids for a waiting card with a nudge line, and a "your move" (hot) card */
const pickCards = (page: Page) => page.evaluate((sel) => {
  const cards = [...document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]`)];
  const wait = cards.find((c) => c.querySelector("[data-qc154='nudge-on']")) ?? cards.find((c) => c.querySelector("[data-qc154='fact'][data-k='next'][data-state='wait']"));
  const hot = cards.find((c) => c.querySelector("[data-qc154='fact'][data-k='next'][data-hot]"));
  return { wait: wait?.dataset.id ?? null, hot: hot?.dataset.id ?? null, nudgeLines: document.querySelectorAll(`${sel} [data-qc154='nudge-on']`).length, waits: document.querySelectorAll(`${sel} [data-qc154='fact'][data-state='wait']`).length };
}, PAGE);
const boxes = (page: Page, id: string) => page.evaluate(([sel, cid]) => {
  const c = document.querySelector<HTMLElement>(`${sel} [data-qc154="card"][data-id="${cid}"]`)!;
  return [...c.querySelectorAll<HTMLElement>("[data-qc154='fact']")].map((f) => {
    const r = f.getBoundingClientRect(); const cs = getComputedStyle(f);
    return { k: f.dataset.k, top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), h: +r.height.toFixed(2), pad: cs.padding, bg: cs.backgroundColor };
  });
}, [PAGE, id]);

test.describe("Query Centre v156.1", () => {
  test("Step 0 — the boxes and the hover today", async ({ page }) => {
    test.skip(PHASE !== "before", "Step 0 only");
    const out: Record<string, unknown> = {};
    for (const vp of SIZES) {
      await openQc(page, vp);
      const ids = await pickCards(page);
      out[`${vp.width}-ids`] = ids;
      for (const [k, id] of Object.entries(ids)) {
        if (typeof id !== "string") continue;
        out[`${vp.width}-${k}`] = await boxes(page, id);
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${id}"]`).scrollIntoViewIfNeeded();
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${id}"]`).hover();
        await page.waitForTimeout(400);
        out[`${vp.width}-${k}-hover-next`] = await page.evaluate(([sel, cid]) => {
          const n = document.querySelector<HTMLElement>(`${sel} [data-qc154="card"][data-id="${cid}"] [data-qc154='act-wrap']`);
          return n ? { bg: getComputedStyle(n).backgroundColor, op: getComputedStyle(n).opacity, label: n.textContent } : null;
        }, [PAGE, id]);
        if (vp.width === 1920) await page.locator(`${PAGE} [data-qc154="card"][data-id="${id}"]`).screenshot({ path: `${SHOTS}/before-${k}-hover-1920.png` });
        await page.mouse.move(2, 2);
      }
      await scrollTo(page, 0);
      if (vp.width === 1920) {
        const hd = await page.locator(`${PAGE} [data-qc1531='header']`).boundingBox();
        if (hd) await page.screenshot({ path: `${SHOTS}/before-header-1920.png`, clip: { x: hd.x - 20, y: hd.y - 20, width: hd.width + 40, height: hd.height + 60 } });
        await page.screenshot({ path: `${SHOTS}/before-page-1920.png` });
      }
    }
    writeFileSync(`${DIR}/step0-readings.json`, JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1));
  });
  /* W1 (§1) — the three situations (dev aid: streak = six met weeks and one short, met = this week met too, none = one
     last week and one this week): the flame, the streak, its line, the dot's colour and roundness, the caption; the
     collapsed bar's right side; screens of both. */
  test("W1 — the streak leads the top right", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const L = new Ledger("W1");
    const want = {
      streak: { flame: true, st: "6 week streak", sl: "1 more this week to keep it going.", dot: "rgb(221, 116, 70)" },
      met: { flame: true, st: "7 week streak", sl: "You’ve hit your target this week.", dot: "rgb(221, 116, 70)" },
      none: { flame: false, st: "No streak yet", sl: "2 more this week starts one.", dot: "rgb(244, 238, 229)" },
    } as const;
    for (const vp of SIZES) {
      for (const g of ["streak", "met", "none"] as const) {
        await openQc(page, vp, g);
        const r = await page.evaluate((sel) => {
          const q = (x: string) => document.querySelector<HTMLElement>(`${sel} ${x}`);
          const fl = q(".qc1561-fl"), st = q("[data-qc1561='streak']"), sl = q("[data-qc1561='line']"), dot = q(".qc1561-dot");
          const b = (e: Element | null) => e ? e.getBoundingClientRect() : null;
          const fb = b(fl), sb = b(st), lb = b(q(".qc1561-hd")), gb = b(q(".qc1561-gr"));
          return {
            flame: !!fl && (fl as unknown as SVGElement).tagName === "svg", fw: fb?.width, fh: fb?.height, gap: fb && sb ? sb.left - fb.right : null,
            st: st?.textContent, stFont: st ? `${getComputedStyle(st).fontSize} ${getComputedStyle(st).fontFamily.split(",")[0]} ${getComputedStyle(st).color}` : "",
            sl: sl?.textContent, slFont: sl ? `${getComputedStyle(sl).fontSize} ${getComputedStyle(sl).fontStyle} ${getComputedStyle(sl).color}` : "",
            toGraph: lb && gb ? gb.top - lb.bottom : null,
            dot: dot ? getComputedStyle(dot).backgroundColor : null, dotW: b(dot)?.width, dotH: b(dot)?.height,
            cap: q("[data-qc156='caption']")?.textContent, alt: q("[data-qc156='line']")?.getAttribute("aria-label"),
            old: !!q(".qc156-big") || !!q(".qc156-ft"),
          };
        }, PAGE);
        const w = want[g]; const t = `${vp.width} ${g}`;
        L.check(`${t}: ${w.flame ? "the 38 × 48 flame" : "no flame"}`, w.flame ? (r.flame && Math.abs((r.fw ?? 0) - 38) < 0.5 && Math.abs((r.fh ?? 0) - 48) < 0.5 && Math.abs((r.gap ?? 0) - 14) < 1) : !r.flame, `${r.flame} ${r.fw}×${r.fh} gap ${r.gap}`);
        L.check(`${t}: "${w.st}" / "${w.sl}"`, r.st === w.st && r.sl === w.sl, `${r.st} / ${r.sl}`);
        L.check(`${t}: type — streak 32px Special Elite cream, line 15.5px italic`, /^32px "?Special Elite"? rgb\(251, 247, 240\)$/.test(r.stFont) && r.slFont === "15.5px italic rgba(244, 238, 229, 0.88)", `${r.stFont} · ${r.slFont}`);
        L.check(`${t}: 6px to the graph; the dot ${w.dot}, round`, Math.abs((r.toGraph ?? 0) - 6) < 1 && r.dot === w.dot && r.dotW === r.dotH, `${r.toGraph} · ${r.dot} ${r.dotW}×${r.dotH}`);
        L.check(`${t}: caption "your target · 3 a week"; alt names the streak; no v156 headline or footer`, (r.cap ?? "").includes("your target · 3 a week") && (r.alt ?? "").startsWith(`${w.st}. ${w.sl} Queries sent per week`) && !r.old, `${r.cap} · ${r.alt}`);
        if (vp.width === 1920) {
          const hd = await page.locator(`${PAGE} [data-qc1531='header']`).boundingBox();
          if (hd) await page.screenshot({ path: `${SHOTS}/w1-header-${g}-1920.png`, clip: { x: hd.x - 20, y: hd.y - 20, width: hd.width + 40, height: hd.height + 60 } });
        }
        await scrollTo(page, 900);
        const sl = await page.evaluate((sel) => {
          const q = (x: string) => document.querySelector<HTMLElement>(`${sel} ${x}`);
          const fl = q(".qc1561-sfl"); const fb = fl?.getBoundingClientRect();
          return { shown: q("[data-qc156='slim']")?.hasAttribute("data-shown"), flame: !!fl, fw: fb?.width, fh: fb?.height, st: q("[data-qc156='slim-streak']")?.textContent, sl: q("[data-qc156='slim-line']")?.textContent, text: q("[data-qc156='slim']")?.textContent ?? "" };
        }, PAGE);
        L.check(`${t}: collapsed bar — ${w.flame ? "17 × 22 flame, " : "no flame, "}"${w.st}", its line; no "n of goal"`, !!sl.shown && sl.flame === w.flame && (!w.flame || (Math.abs((sl.fw ?? 0) - 17) < 0.5 && Math.abs((sl.fh ?? 0) - 22) < 0.5)) && sl.st === w.st && sl.sl === w.sl && !/\d of \d|this week$/.test(sl.text.replace(w.sl, "")), `${sl.shown} ${sl.flame} ${sl.fw}×${sl.fh} ${sl.st} / ${sl.sl}`);
        if (vp.width === 1920) await page.screenshot({ path: `${SHOTS}/w1-slim-${g}-1920.png`, clip: { x: 80, y: 100, width: 1840, height: 120 } });
      }
    }
    L.done(36);
  });
  /* W2 (§2) — in every row of cards, all the Sent and Next boxes share one top and one bottom (within 1px), are 86px
     at least, padded 10 12 11; no value or line is cut short by the new padding. Screens of each group. */
  test("W2 — the boxes line up", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const L = new Ledger("W2");
    for (const vp of SIZES) {
      await openQc(page, vp);
      /* open the folded groups so every card is measured */
      const more = page.locator(`${PAGE} [data-qc153='show-all']`);
      for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
      await page.waitForTimeout(500);
      const r = await page.evaluate((sel) => {
        const rows = new Map<string, { top: number; bottom: number; h: number; pad: string; mixed: string }[]>();
        let cut = 0; const cuts: string[] = [];
        document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="grid"]`).forEach((g, gi) => {
          g.querySelectorAll<HTMLElement>(`[data-qc154="card"]`).forEach((c) => {
            const key = `${gi}:${Math.round(c.getBoundingClientRect().top)}`;
            c.querySelectorAll<HTMLElement>("[data-qc154='fact']").forEach((f) => {
              const b = f.getBoundingClientRect();
              const list = rows.get(key) ?? []; rows.set(key, list);
              list.push({ top: b.top, bottom: b.bottom, h: b.height, pad: getComputedStyle(f).padding, mixed: f.querySelector("[data-qc154='nudge-on']") ? "nudge" : f.querySelector("[data-qc154='window']") ? "bar" : "plain" });
              f.querySelectorAll<HTMLElement>(":scope > b, :scope > em").forEach((t) => { if (t.scrollWidth > t.clientWidth + 1) { cut++; if (cuts.length < 5) cuts.push(`${c.dataset.id}: ${t.textContent}`); } });
            });
          });
        });
        const out = [...rows.entries()].map(([k, l]) => ({ k, n: l.length, dTop: Math.max(...l.map((x) => x.top)) - Math.min(...l.map((x) => x.top)), dBot: Math.max(...l.map((x) => x.bottom)) - Math.min(...l.map((x) => x.bottom)), minH: Math.min(...l.map((x) => x.h)), pads: [...new Set(l.map((x) => x.pad))], kinds: [...new Set(l.map((x) => x.mixed))] }));
        return { rows: out, cut, cuts };
      }, PAGE);
      const bad = r.rows.filter((x) => x.dTop > 1 || x.dBot > 1);
      const mixed = r.rows.filter((x) => x.kinds.length > 1);
      L.check(`${vp.width}: ${r.rows.length} rows — every box shares its row's top and bottom within 1px`, r.rows.length > 0 && bad.length === 0, bad.length ? JSON.stringify(bad.slice(0, 3)) : `worst ${Math.max(...r.rows.map((x) => Math.max(x.dTop, x.dBot))).toFixed(2)}px`);
      L.check(`${vp.width}: ${mixed.length} rows mix box contents (${[...new Set(mixed.flatMap((x) => x.kinds))].join(", ")}) and still line up`, mixed.length > 0 && mixed.every((x) => x.dTop <= 1 && x.dBot <= 1), JSON.stringify(mixed.slice(0, 2)));
      const pad = vp.width === 1920 ? "10px 12px 11px" : "10px 8px 11px"; /* the narrow card keeps 8px at the sides */
      L.check(`${vp.width}: every box at least 86px, one padding per row (${pad})`, r.rows.every((x) => x.minH >= 85.5 && x.pads.length === 1 && x.pads[0] === pad), JSON.stringify([...new Set(r.rows.flatMap((x) => x.pads))]) + ` min ${Math.min(...r.rows.map((x) => x.minH)).toFixed(2)}`);
      L.check(`${vp.width}: no value or line cut short`, r.cut === 0, `${r.cut} ${r.cuts.join(" | ")}`);
      if (vp.width === 1920) {
        const groups = await page.locator(`${PAGE} [data-qc1511="group"]`).all();
        for (const [i, g] of groups.entries()) await g.screenshot({ path: `${SHOTS}/w2-group-${i + 1}-${await g.getAttribute("data-k")}-1920.png` });
      }
    }
    L.done(8);
  });
  /* W3 (§3) — the arrow chip: the Next box keeps its fill on hover; the chip hidden at rest, shown (32px, 8px in) on
     hover and on keyboard focus; named by the action's label; a click runs the action (the card opens on that action's
     composer) rather than only opening the card. One card per action kind, hovered, and the focused chip, on screen. */
  test("W3 — the arrow chip", async ({ page }) => {
    test.skip(PHASE === "before", "after only");
    const L = new Ledger("W3");
    for (const vp of SIZES) {
      const w = vp.width;
      await openQc(page, vp);
      const more = page.locator(`${PAGE} [data-qc153='show-all']`);
      for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
      await page.waitForTimeout(400);
      /* one card per action kind */
      const kinds = await page.evaluate((sel) => {
        const seen = new Map<string, { id: string; label: string }>();
        document.querySelectorAll<HTMLElement>(`${sel} [data-qc154="card"]`).forEach((c) => {
          const b = c.querySelector<HTMLElement>(".qc1561-chip"); if (!b) return;
          const k = `${b.dataset.mode}:${b.getAttribute("aria-label")}`;
          if (!seen.has(k)) seen.set(k, { id: c.dataset.id!, label: b.getAttribute("aria-label")! });
        });
        return [...seen.entries()].map(([k, v]) => ({ k, ...v }));
      }, PAGE);
      L.check(`${w}: chips on the page — ${kinds.map((x) => x.label).join(", ")}`, kinds.length >= 2, `${kinds.length}`);
      for (const { k, id, label } of kinds) {
        const card = page.locator(`${PAGE} [data-qc154="card"][data-id="${id}"]`);
        const chip = card.locator(".qc1561-chip");
        await card.scrollIntoViewIfNeeded();
        await page.mouse.move(2, 2);
        await page.waitForTimeout(250);
        const rest = await card.evaluate((c) => { const n = c.querySelector<HTMLElement>("[data-qc154='fact'][data-k='next']")!; const b = c.querySelector<HTMLElement>(".qc1561-chip")!; return { bg: getComputedStyle(n).backgroundColor, op: getComputedStyle(b).opacity }; });
        await card.locator("[data-qc154='band']").hover();
        await page.waitForTimeout(350);
        const hov = await card.evaluate((c) => {
          const n = c.querySelector<HTMLElement>("[data-qc154='fact'][data-k='next']")!; const b = c.querySelector<HTMLElement>(".qc1561-chip")!;
          const nb = n.getBoundingClientRect(), bb = b.getBoundingClientRect(); const cs = getComputedStyle(b);
          return { bg: getComputedStyle(n).backgroundColor, op: cs.opacity, w: bb.width, h: bb.height, r: nb.right - bb.right, bt: nb.bottom - bb.bottom, fill: cs.backgroundColor, radius: cs.borderRadius, shadow: cs.boxShadow, overlay: !!c.querySelector(".qc154-act") };
        });
        L.check(`${w} ${k}: the Next box keeps its fill on hover (${rest.bg})`, rest.bg === hov.bg && !hov.overlay, `${rest.bg} → ${hov.bg}`);
        L.check(`${w} ${k}: hidden at rest, shown on hover — 32px navy disc, 8px in, the soft shadow`, rest.op === "0" && hov.op === "1" && Math.abs(hov.w - 32) < 0.5 && Math.abs(hov.h - 32) < 0.5 && Math.abs(hov.r - 8) < 1 && Math.abs(hov.bt - 8) < 1 && hov.fill === "rgb(42, 58, 82)" && hov.radius === "50%" && /rgba\(28, 19, 15, 0\.45\) 0px 6px 14px -6px/.test(hov.shadow), JSON.stringify({ rest: rest.op, ...hov }));
        await expect(chip).toHaveAccessibleName(label);
        L.check(`${w} ${k}: its accessible name is the action's label`, true, label);
        if (w === 1920) await card.screenshot({ path: `${SHOTS}/w3-hover-${k.split(":")[0]}-1920.png` });
      }
      /* keyboard: Tab from the card reaches its chip, which shows while focused */
      const first = kinds[0];
      await page.mouse.move(2, 2);
      const card = page.locator(`${PAGE} [data-qc154="card"][data-id="${first.id}"]`);
      await card.focus();
      let focused = "";
      for (let i = 0; i < 4 && focused !== "chip"; i++) {
        await page.keyboard.press("Tab");
        focused = await page.evaluate(() => (document.activeElement?.classList.contains("qc1561-chip") ? "chip" : document.activeElement?.className ?? ""));
      }
      const kb = await card.evaluate((c) => { const b = c.querySelector<HTMLElement>(".qc1561-chip")!; return { op: getComputedStyle(b).opacity, ring: getComputedStyle(b).outlineStyle, tip: getComputedStyle(b.querySelector(".qc1561-tip")!).opacity }; });
      L.check(`${w}: Tab reaches the chip; focused, it shows with a ring and its tooltip`, focused === "chip" && kb.op === "1" && kb.ring === "solid" && kb.tip === "1", `${focused} ${JSON.stringify(kb)}`);
      if (w === 1920) await card.screenshot({ path: `${SHOTS}/w3-focus-chip-1920.png` });
      /* a click runs the action: the card opens on the action's composer (not just the card) */
      const act = kinds.find((x) => !x.k.startsWith("open"));
      if (act) {
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${act.id}"] [data-qc154='band']`).hover();
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${act.id}"] .qc1561-chip`).click();
        await page.waitForTimeout(1200);
        const comp = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-qc1522='composer']")].some((e) => e.getBoundingClientRect().width > 0));
        L.check(`${w}: clicking "${act.label}" runs the action — the card opens on its composer`, comp, `${comp}`);
        if (w === 1920) await page.screenshot({ path: `${SHOTS}/w3-after-click-1920.png` });
        await page.keyboard.press("Escape"); await page.waitForTimeout(300); await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      }
      const plain = kinds.find((x) => x.k.startsWith("open"));
      if (plain) {
        await openQc(page, vp);
        for (let i = 0; i < 6 && (await more.count()) > 0; i++) await more.first().click({ timeout: 5_000 });
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${plain.id}"]`).scrollIntoViewIfNeeded();
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${plain.id}"] [data-qc154='band']`).hover();
        await page.locator(`${PAGE} [data-qc154="card"][data-id="${plain.id}"] .qc1561-chip`).click();
        await page.waitForTimeout(1200);
        const st = await page.evaluate(() => ({ open: /[?&]q=/.test(location.href) || [...document.querySelectorAll<HTMLElement>("[data-qc1522]")].some((e) => e.getBoundingClientRect().width > 0), comp: [...document.querySelectorAll<HTMLElement>("[data-qc1522='composer']")].some((e) => e.getBoundingClientRect().width > 0) }));
        L.check(`${w}: "Open the card" opens the card, with no composer`, st.open && !st.comp, JSON.stringify(st));
        await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      }
    }
    L.done(12);
  });
});
