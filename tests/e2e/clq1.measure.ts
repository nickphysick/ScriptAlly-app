/**
 * Contact list — Query Centre layout v1 (design-refs/contact-list-qc-layout-v7/contact-list-qc-layout-v7.html), measured
 * on the emulator harness at 1440×900 and 1717×1000.
 *
 *   SA_PHASE=qcbase   the Query Centre "before" screens for L7 (run on the base build, in a measurement worktree)
 *   (default)         the locks L1–L7 and the screens for the report
 *
 *   L1 header parity   Contact list header height = Query Centre header height ±1; the art column, the headline's left x
 *                      and the buttons' height ±1
 *   L2 alignment       the panel's left x = the header's ±1; the bar's left x = the headline's ±1
 *   L3 List health     ring 140 ±1; archivist 118 ±1 wide, its top above the ring's; the pill centred on the ring's foot;
 *                      the ring and Fill the gaps both open Housekeeping (0 gaps → no Fill the gaps: unit-locked)
 *   L4 views           each view's count = the list it shows (population non-zero first); a view then All agents restores
 *                      the total; one view at a time
 *   L5 refine          two genres OR; counts update; "your book" only on the book's genres
 *   L6 border          at the frame's border x, every 4px down the visible card reads #e3d5c9 (ΔE ≤ 3): at rest, after
 *                      600px and back, after the Query Centre and back, and while pinned
 *   L7 QC unchanged    the Query Centre at rest, pixel diff ≤ 0.1% against the base build's screens
 *
 * Ledgers, screens and readings go to reports/cl-qc-layout-v1/.
 */
import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

/* copied, not imported: importing another *.measure.ts runs its tests in this file's scope */
const CL = ".clv-group.cl27";
const QC = ".qc151.qc153";
const DIR = "reports/cl-qc-layout-v1";
const SHOTS = `${DIR}/shots`;
const PHASE = process.env.SA_PHASE === "qcbase" ? "qcbase" : "after";
const SIZES = [{ width: 1440, height: 900 }, { width: 1717, height: 1000 }];
const LINE = [0xe3, 0xd5, 0xc9];
test.setTimeout(900_000);
mkdirSync(SHOTS, { recursive: true });
mkdirSync(`${DIR}/ledger`, { recursive: true });

class Ledger {
  rows: { name: string; ok: boolean; got: string }[] = [];
  constructor(public id: string) {}
  check(name: string, ok: boolean, got: string) { this.rows.push({ name, ok, got }); console.log(`${this.id} ${ok ? "✓" : "✗"} ${name} — ${got}`); }
  done(min: number) {
    writeFileSync(`${DIR}/ledger/${this.id}.json`, JSON.stringify(this.rows, null, 1));
    expect.soft(this.rows.length, `${this.id}: assertions run`).toBeGreaterThanOrEqual(min);
    expect.soft(this.rows.filter((r) => !r.ok).map((r) => `${r.name} — ${r.got}`), `${this.id} reds`).toEqual([]);
  }
}
const near = (a: number, b: number, tol = 1) => Math.abs(a - b) <= tol;
const f1 = (n: number) => n.toFixed(1);

type Box = { x: number; y: number; w: number; h: number; r: number; b: number };
async function boxes(page: Page, root: string, sels: Record<string, string>): Promise<Record<string, Box | null>> {
  return page.evaluate(([root, sels]) => {
    const r = [...document.querySelectorAll<HTMLElement>(root as string)].find((e) => e.getBoundingClientRect().width > 0);
    const out: Record<string, unknown> = {};
    for (const [k, s] of Object.entries(sels as Record<string, string>)) {
      const e = r?.querySelector<HTMLElement>(s);
      if (!e) { out[k] = null; continue; }
      const b = e.getBoundingClientRect();
      out[k] = { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom };
    }
    return out;
  }, [root, sels] as const) as Promise<Record<string, Box | null>>;
}
const SCROLL = (root: string) => `${root}`;
async function scrollTo(page: Page, root: string, y: number) {
  await page.evaluate(([root, y]) => {
    const r = [...document.querySelectorAll<HTMLElement>(root as string)].find((e) => e.getBoundingClientRect().width > 0);
    r?.closest<HTMLElement>(".wpg-scroll")?.scrollTo({ top: y as number, behavior: "instant" as ScrollBehavior });
  }, [SCROLL(root), y] as const);
  await page.waitForTimeout(600);
}
const nav = (page: Page, p: string) => page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, p);

async function openQc(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.queries", "1"); localStorage.setItem("sa.guide.queries-explainer", "1"); } catch { /* private */ } });
  await openRoute(page, "/queries", vp);
  await page.waitForSelector(`${QC} [data-qc153="bar"]`, { timeout: 60_000 });
  await expect(page.locator(`${QC} [data-qc154="card"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
async function openCl(page: Page, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { localStorage.setItem("sa.guide.contacts", "1"); } catch { /* private */ } });
  await openRoute(page, "/agents", vp);
  await expect(page.locator(`${CL}:not([data-loading]) [data-cl26="row"]`).first()).toBeVisible({ timeout: 60_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(800);
  await page.mouse.move(2, 2);
}
const vis = (root: string, sel: string) => `${root} ${sel} >> visible=true`;

/** ΔE (CIE76) between two sRGB colours */
function deltaE(a: number[], b: number[]): number {
  const lab = (c: number[]) => {
    const [r, g, bl] = c.map((v) => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; });
    const X = (r * 0.4124 + g * 0.3576 + bl * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + bl * 0.0722, Z = (r * 0.0193 + g * 0.1192 + bl * 0.9505) / 1.08883;
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
    return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
  };
  const p = lab(a), q = lab(b);
  return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

/** L6 — the frame's two border lines, every 4px down what is visible of the card (below anything pinned over it) */
async function lineReading(page: Page, label: string, led: Ledger, shot: string) {
  const b = await boxes(page, CL, { frame: "[data-cl26='frame']", strip: "[data-clq='toolbar']", pin: "[data-cl26='pin']", slim: ":scope > .clh2-slim[data-shown]" });
  /* the scrollport's foot: below it is the app's own frame (the shell), not the page */
  const portFoot = await page.evaluate((cl) => {
    const r = [...document.querySelectorAll<HTMLElement>(cl)].find((e) => e.getBoundingClientRect().width > 0);
    return r?.closest<HTMLElement>(".wpg-scroll")?.getBoundingClientRect().bottom ?? Infinity;
  }, CL);
  const fr = b.frame!;
  const vp = page.viewportSize()!;
  const buf = await page.screenshot({ path: shot });
  const png = PNG.sync.read(buf);
  const px = (x: number, y: number) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
  /* the strip covers the card above the pin once it is stuck (its solid part ends 22px above its box's foot, where the
     pin starts): sample from there down */
  const stuck = await page.locator(`${CL} [data-clq='toolbar'][data-qc156-stuck]`).count() > 0;
  const stripFoot = b.strip && stuck ? b.strip.b - 22 : 0;
  /* v1.1 — the frame's line begins at the cap's rounded top (`.clq-captop`), below the cap's white 10px edge */
  const capTop = await page.evaluate((cl) => {
    const r = [...document.querySelectorAll<HTMLElement>(cl)].find((e) => e.getBoundingClientRect().width > 0);
    const t = r?.querySelector<HTMLElement>("[data-clq='cap'] .clq-captop");
    return t ? t.getBoundingClientRect().top : null;
  }, CL);
  const top = Math.ceil(Math.max(fr.y + 14, capTop !== null ? capTop + 14 : 0, stuck ? stripFoot + 1 : 0, b.slim ? b.slim.b + 1 : 0));
  const bot = Math.floor(Math.min(fr.b - 14, vp.height - 2, portFoot - 2));
  let worst = 0, worstAt = "", n = 0;
  for (const side of ["left", "right"] as const) {
    const x0 = side === "left" ? Math.floor(fr.x) : Math.ceil(fr.r) - 1;
    for (let y = top; y <= bot; y += 4) {
      /* the line's own pixel: the closest of the column and its neighbours (a fractional x splits a 1px line) */
      const d = Math.min(...[x0 - 1, x0, x0 + 1].map((x) => deltaE(px(x, y), LINE)));
      n += 1;
      if (d > worst) { worst = d; worstAt = `${side} y=${y} rgb(${px(x0, y).join(",")})`; }
    }
  }
  led.check(`${label}: the frame's line, ${n} samples from y=${top} to ${bot} (frame x ${f1(fr.x)}–${f1(fr.r)}), ΔE ≤ 3`, n > 20 && worst <= 3, `worst ΔE ${worst.toFixed(2)} at ${worstAt || "—"}`);
}

if (PHASE === "qcbase") {
  test("L7 · the Query Centre before (base build)", async ({ page }) => {
    for (const vp of SIZES) {
      await openQc(page, vp);
      await page.screenshot({ path: `${SHOTS}/qc-before-${vp.width}.png` });
    }
  });
} else {
  for (const vp of SIZES) {
    test(`Contact list QC layout v1 — ${vp.width}`, async ({ page }) => {
      const W = vp.width;
      /* ── the Query Centre's readings (L1) and its screen (L7) ── */
      await openQc(page, vp);
      const qc = await boxes(page, QC, { hd: ":scope > .qc1531-hd", art: ":scope > .qc1531-hd .qc1531-art", h1: ":scope > .qc1531-hd h1", btn: ":scope > .qc1531-hd .qc1531-acts button", panel: ".qc153-rail", bar: ".qc153-bar" });
      const qcShot = `${SHOTS}/qc-after-${W}.png`;
      await page.screenshot({ path: qcShot });

      /* ── L7 · the Query Centre unchanged ── */
      const L7 = new Ledger(`L7-${W}`);
      const before = `${SHOTS}/qc-before-${W}.png`;
      if (!existsSync(before)) L7.check("the base build's screen exists (run SA_PHASE=qcbase on the base first)", false, before);
      else {
        const A = PNG.sync.read(readFileSync(before)), B = PNG.sync.read(readFileSync(qcShot));
        let diff = 0;
        if (A.width === B.width && A.height === B.height) {
          for (let i = 0; i < A.data.length; i += 4) {
            if (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]) > 24) diff += 1;
          }
        }
        const pct = (diff / (A.width * A.height)) * 100;
        L7.check(`the Query Centre at rest, base vs this build (${A.width}×${A.height})`, A.width === B.width && A.height === B.height && pct <= 0.1, `${diff} px differ = ${pct.toFixed(4)}%`);
      }
      L7.done(1);

      /* ── the Contact list ── */
      await openCl(page, vp);
      await page.screenshot({ path: `${SHOTS}/cl-rest-${W}.png` });
      const cl = await boxes(page, CL, {
        hd: ":scope > .qc1531-hd", art: ":scope > .qc1531-hd .qc1531-art", h1: ":scope > .qc1531-hd h1", btn: ":scope > .qc1531-hd .qc1531-acts button",
        panel: ".qc153-rail", bar: ".qc153-bar", ring: "[data-cl26='ring']", arch: "[data-cl26='archivist']", pct: "[data-cl26='pct']",
      });
      writeFileSync(`${DIR}/readings-${W}.json`, JSON.stringify({ qc, cl }, null, 1));

      /* ── L1 · header parity ── */
      const L1 = new Ledger(`L1-${W}`);
      L1.check("header height = the Query Centre's ±1", near(cl.hd!.h, qc.hd!.h), `CL ${f1(cl.hd!.h)} · QC ${f1(qc.hd!.h)}`);
      L1.check("art column x and width ±1", near(cl.art!.x, qc.art!.x) && near(cl.art!.w, qc.art!.w), `CL ${f1(cl.art!.x)}/${f1(cl.art!.w)} · QC ${f1(qc.art!.x)}/${f1(qc.art!.w)}`);
      L1.check("headline's left x ±1", near(cl.h1!.x, qc.h1!.x), `CL ${f1(cl.h1!.x)} · QC ${f1(qc.h1!.x)}`);
      L1.check("buttons' height ±1", near(cl.btn!.h, qc.btn!.h), `CL ${f1(cl.btn!.h)} · QC ${f1(qc.btn!.h)}`);
      L1.check("header top = the Query Centre's ±1", near(cl.hd!.y, qc.hd!.y), `CL ${f1(cl.hd!.y)} · QC ${f1(qc.hd!.y)}`);
      L1.done(5);

      /* ── L2 · alignment ── */
      const L2 = new Ledger(`L2-${W}`);
      L2.check("the panel's left x = the header's ±1", near(cl.panel!.x, cl.hd!.x), `panel ${f1(cl.panel!.x)} · header ${f1(cl.hd!.x)}`);
      L2.check("the bar's left x = the headline's ±1", near(cl.bar!.x, cl.h1!.x), `bar ${f1(cl.bar!.x)} · headline ${f1(cl.h1!.x)}`);
      L2.check("the panel's and the bar's tops = the Query Centre's ±1", near(cl.panel!.y, qc.panel!.y) && near(cl.bar!.y, qc.bar!.y), `CL ${f1(cl.panel!.y)}/${f1(cl.bar!.y)} · QC ${f1(qc.panel!.y)}/${f1(qc.bar!.y)}`);
      L2.done(3);

      /* ── L3 · List health ── */
      const L3 = new Ledger(`L3-${W}`);
      L3.check("ring 140 ±1", near(cl.ring!.w, 140) && near(cl.ring!.h, 140), `${f1(cl.ring!.w)}×${f1(cl.ring!.h)}`);
      L3.check("archivist 118 ±1 wide", near(cl.arch!.w, 118), f1(cl.arch!.w));
      L3.check("the archivist's top is above the ring's top", cl.arch!.y < cl.ring!.y - 0.5, `archivist ${f1(cl.arch!.y)} · ring ${f1(cl.ring!.y)}`);
      const pcx = cl.pct!.x + cl.pct!.w / 2, rcx = cl.ring!.x + cl.ring!.w / 2;
      L3.check("the pill centred on the ring (x ±1) and straddling its foot", near(pcx, rcx) && cl.pct!.y < cl.ring!.b && cl.pct!.b > cl.ring!.b, `pill cx ${f1(pcx)} y ${f1(cl.pct!.y)}–${f1(cl.pct!.b)} · ring cx ${f1(rcx)} foot ${f1(cl.ring!.b)}`);
      const hk = page.locator('[data-hdr="housekeeping"].is-in');
      await page.locator(vis(CL, "[data-cl26='ring']")).click();
      const ringOpens = await hk.waitFor({ timeout: 10_000 }).then(() => true, () => false);
      L3.check("clicking the ring opens Housekeeping", ringOpens, String(ringOpens));
      await page.keyboard.press("Escape"); await page.waitForTimeout(800);
      const gaps = Number((await page.locator(vis(CL, "[data-cl26='missing'] em")).first().textContent().catch(() => "0")) || 0);
      const fill = page.locator(vis(CL, "[data-cl26='fill']"));
      if (gaps > 0) {
        await fill.click();
        const fillOpens = await hk.waitFor({ timeout: 10_000 }).then(() => true, () => false);
        L3.check(`Fill the gaps opens Housekeeping (${gaps} gaps on the harness)`, fillOpens, String(fillOpens));
        await page.keyboard.press("Escape"); await page.waitForTimeout(800);
      } else L3.check("at 0 gaps there is no Fill the gaps", (await fill.count()) === 0, `${await fill.count()} buttons`);
      L3.done(6);

      /* ── L4 · views ── */
      const L4 = new Ledger(`L4-${W}`);
      const shown = async () => Number(await page.locator(vis(CL, "[data-clq='count']")).getAttribute("data-n"));
      const rows = async () => page.locator(`${CL} [data-cl26='row'] >> visible=true`).count();
      const total = await shown();
      L4.check("the population is not empty", total > 0 && (await rows()) === total, `${total} agents, ${await rows()} rows`);
      const viewN = async (k: string) => Number(await page.locator(vis(CL, `[data-clq='view'][data-k='${k}']`)).getAttribute("data-n"));
      const checkedViews = async () => page.locator(`${CL} [data-clq='view'][aria-checked='true'] >> visible=true`).count();
      for (const k of ["you", "ready", "wait", "missing"]) {
        const n = await viewN(k);
        if (n === 0) { L4.check(`${k}: 0, faded and not pressable`, await page.locator(vis(CL, `[data-clq='view'][data-k='${k}']`)).isDisabled(), "disabled"); continue; }
        await page.locator(vis(CL, `[data-clq='view'][data-k='${k}']`)).click();
        await page.waitForTimeout(500);
        const s = await shown(), r = await rows();
        L4.check(`${k}: its count = the list it shows`, s === n && r === n, `view ${n} · bar ${s} · rows ${r}`);
        L4.check(`${k}: one view at a time`, (await checkedViews()) === 1 && (await page.locator(vis(CL, `[data-clq='view'][data-k='${k}']`)).getAttribute("aria-checked")) === "true", `${await checkedViews()} checked`);
        if (k === "missing") await page.screenshot({ path: `${SHOTS}/cl-view-${W}.png` });
      }
      await page.locator(vis(CL, "[data-clq='view'][data-k='all']")).click();
      await page.waitForTimeout(500);
      L4.check("a view, then All agents, restores the total", (await shown()) === total && (await viewN("all")) === total, `${await shown()} of ${total}`);
      L4.done(6);

      /* ── L5 · refine ── */
      const L5 = new Ledger(`L5-${W}`);
      const genres = page.locator(`${CL} [data-clq='genre'] >> visible=true`);
      const gs: { k: string; label: string; n: number; hit: boolean }[] = [];
      for (let i = 0; i < await genres.count(); i++) {
        const g = genres.nth(i);
        const label = await g.locator(".qc156-vct").evaluate((e) => [...e.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join("").trim().toLowerCase());
        gs.push({ k: (await g.getAttribute("data-k"))!, label, n: Number(await g.getAttribute("data-n")), hit: (await g.locator("[data-clq='your-book']").count()) > 0 });
      }
      const two = gs.filter((g) => g.n > 0).slice(0, 2);
      L5.check("at least two genres with agents on the harness", two.length === 2, gs.map((g) => `${g.k}:${g.n}`).join(" "));
      if (two.length === 2) {
        const tick = (k: string) => page.locator(vis(CL, `[data-clq='genre'][data-k='${k}']`)).click().then(() => page.waitForTimeout(500));
        await tick(two[0].k);
        const nA = await shown();
        L5.check(`${two[0].k} alone shows its count`, nA === two[0].n, `${nA} vs ${two[0].n}`);
        L5.check("counts update: All agents is the list under the genre", (await viewN("all")) === nA, `All agents ${await viewN("all")}`);
        await tick(two[1].k);
        const nAB = await shown();
        const nB = Number(await page.locator(vis(CL, `[data-clq='genre'][data-k='${two[1].k}']`)).getAttribute("data-n"));
        L5.check(`${two[0].k} OR ${two[1].k}: at least either, at most both`, nAB >= Math.max(nA, nB) && nAB <= nA + nB && nAB > nA - 1, `A ${nA} · B ${nB} · A∪B ${nAB}`);
        /* every row shown carries one of the two (its chips name them; a folded "+n" counts as unknown, never as a miss) */
        const rowsOk = await page.evaluate(([cl, a, b]) => {
          const norm = (s: string) => s.replace(/^✓\s*/, "").trim().toLowerCase();
          const rs = [...document.querySelectorAll<HTMLElement>(`${cl} [data-cl26='row']`)].filter((r) => r.getBoundingClientRect().height > 0);
          return rs.every((r) => {
            const chips = [...r.querySelectorAll<HTMLElement>("[data-cl252='pill']")].map((c) => norm(c.textContent ?? ""));
            return chips.includes(a as string) || chips.includes(b as string) || !!r.querySelector("[data-cl252='pill-more']:not([data-n='0'])");
          });
        }, [CL, two[0].label, two[1].label] as const);
        L5.check("every row shown carries one of the two genres", rowsOk, String(rowsOk));
        await page.screenshot({ path: `${SHOTS}/cl-genres-${W}.png` });
        await tick(two[0].k); await tick(two[1].k);
        L5.check("unticking both restores the total", (await shown()) === total, `${await shown()} of ${total}`);
      }
      /* "your book": exactly the genres whose chips the list ticks (✓) */
      const ticked = await page.evaluate((cl) => {
        const norm = (s: string) => s.replace(/^✓\s*/, "").trim().toLowerCase();
        return [...new Set([...document.querySelectorAll<HTMLElement>(`${cl} [data-cl252='pill'][data-hit]`)].filter((e) => e.getBoundingClientRect().height > 0).map((e) => norm(e.textContent ?? "")))];
      }, CL);
      const tagged = gs.filter((g) => g.hit).map((g) => g.label);
      L5.check("\"your book\" shows on every genre the rows tick, and on no other", ticked.every((k) => tagged.includes(k)) && tagged.every((k) => ticked.includes(k)), `tagged [${tagged.join(", ")}] · ticked in rows [${ticked.join(", ")}]`);
      L5.done(5);

      /* the screen of a view picked with a genre ticked (Waiting to hear back, then the first genre with agents in it) */
      await page.locator(vis(CL, "[data-clq='view'][data-k='wait']")).click(); await page.waitForTimeout(400);
      const g1 = page.locator(`${CL} [data-clq='genre']:not([disabled]) >> visible=true`).first();
      await g1.click(); await page.waitForTimeout(500);
      await page.screenshot({ path: `${SHOTS}/cl-view-genre-${W}.png` });
      await g1.click(); await page.waitForTimeout(300);
      await page.locator(vis(CL, "[data-clq='view'][data-k='all']")).click(); await page.waitForTimeout(400);

      /* the More filters screen */
      const more = page.locator(vis(CL, "[data-clq='more']"));
      if ((await more.getAttribute("aria-expanded")) !== "true") { await more.click(); await page.waitForTimeout(400); }
      await page.screenshot({ path: `${SHOTS}/cl-more-${W}.png` });
      await more.click(); await page.waitForTimeout(400);
      console.log(`More filters after closing: aria-expanded=${await more.getAttribute("aria-expanded")}`);

      /* ── L6 · the card's line ── */
      const L6 = new Ledger(`L6-${W}`);
      await scrollTo(page, CL, 0);
      await lineReading(page, "at rest", L6, `${SHOTS}/cl-l6-rest-${W}.png`);
      await scrollTo(page, CL, 600);
      const pinned = await page.evaluate((cl) => {
        const r = [...document.querySelectorAll<HTMLElement>(cl)].find((e) => e.getBoundingClientRect().width > 0)!;
        const pin = r.querySelector<HTMLElement>("[data-cl26='pin']")!, tb = r.querySelector<HTMLElement>("[data-clq='toolbar']")!;
        return { pinTop: pin.getBoundingClientRect().top, stickyTop: parseFloat(getComputedStyle(pin).top), port: r.closest<HTMLElement>(".wpg-scroll")!.getBoundingClientRect().top, stuck: tb.hasAttribute("data-qc156-stuck") };
      }, CL);
      L6.check("while scrolled 600px the bar's strip is stuck and the card's pin is pinned", pinned.stuck && near(pinned.pinTop - pinned.port, pinned.stickyTop), JSON.stringify(pinned));
      await lineReading(page, "while pinned (600px)", L6, `${SHOTS}/cl-pinned-${W}.png`);
      await scrollTo(page, CL, 0);
      await lineReading(page, "after 600px and back", L6, `${SHOTS}/cl-l6-back-${W}.png`);
      await nav(page, "/queries"); await page.waitForTimeout(1500);
      await nav(page, "/agents"); await page.waitForTimeout(1500);
      await lineReading(page, "after the Query Centre and back", L6, `${SHOTS}/cl-l6-qcback-${W}.png`);
      await scrollTo(page, CL, 600);
      await lineReading(page, "after the Query Centre and back, pinned", L6, `${SHOTS}/cl-l6-qcback-pinned-${W}.png`);
      await scrollTo(page, CL, 0);
      L6.done(6);
    });
  }
}
