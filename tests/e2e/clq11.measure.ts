/**
 * Contact list — QC layout v1.1 (design-refs/contact-list-pinned-v8/contact-list-pinned-v8.html): the pinned state and the
 * panel's type, as on the Query Centre. Emulator harness, 1440×900 and 1717×1000.
 *
 *   SA_PHASE=step0    Step 0's readings on both pages (asserts nothing): (a) the computed faces, (b) the collapsed bar at
 *                     600px, (c) the pixels 1px outside the list column beside the pinned bar
 *   SA_PHASE=qcbase   the Query Centre "before" screens for T5 (at rest and at 600px), on the base build
 *   (default)         the locks T1–T5 and the report's screens
 *
 *   T1  type: each text role in the Views panel, the bar and the collapsed bar has the Query Centre's computed face,
 *       size and weight
 *   T2  collapsed bar at 600px: 60 ±1 tall, title 24px, button 40 ±1, ground the sheet's full width ±1; = the Query Centre's
 *   T3  beside the bar at 600px: 1px and 6px outside the list column read the page's ground (ΔE ≤ 2), every 4px from the
 *       strip's top to the headings' top
 *   T4  pinned at 300, 600 and 1200px: the frame's line and the white edge unbroken from the headings' top down
 *   T4b the corners pinned at 600px: outside each curve the page's ground; the lines follow the curve; the pinned top
 *       matches the top at rest (≤ 0.5%)
 *   T5  the Query Centre at rest and at 600px: 0.0% against the base build
 */
import { test, expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const { PNG } = createRequire(import.meta.url)("playwright-core/lib/utilsBundle") as { PNG: { sync: { read(b: Buffer): { width: number; height: number; data: Buffer } } } };

/* copied, not imported: importing another *.measure.ts runs its tests in this file's scope */
const CL = ".clv-group.cl27";
const QC = ".qc151.qc153";
const DIR = "reports/cl-qc-layout-v1-1";
const SHOTS = `${DIR}/shots`;
const PHASE = process.env.SA_PHASE === "step0" ? "step0" : process.env.SA_PHASE === "qcbase" ? "qcbase" : "after";
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

async function openPage(page: Page, route: string, root: string, vp: { width: number; height: number }) {
  await page.addInitScript(() => { try { for (const k of ["sa.guide.queries", "sa.guide.queries-explainer", "sa.guide.contacts"]) localStorage.setItem(k, "1"); } catch { /* private */ } });
  await openRoute(page, route, vp);
  await expect(page.locator(`${root} .qc153-bar >> visible=true`).first()).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.fonts.ready);
  await page.mouse.move(2, 2);
}
const nav = (page: Page, p: string) => page.evaluate((p) => { history.pushState({}, "", p); dispatchEvent(new PopStateEvent("popstate")); }, p);
async function scrollTo(page: Page, root: string, y: number) {
  await page.evaluate(([root, y]) => {
    const r = [...document.querySelectorAll<HTMLElement>(root as string)].find((e) => e.getBoundingClientRect().width > 0);
    r?.closest<HTMLElement>(".wpg-scroll")?.scrollTo({ top: y as number, behavior: "instant" as ScrollBehavior });
  }, [root, y] as const);
  await page.waitForTimeout(700);
}

/** the computed type of each text role, found by role on either page */
async function typeRoles(page: Page, root: string) {
  return page.evaluate((root) => {
    const r = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
    const t = (e: Element | null) => { if (!e) return null; const c = getComputedStyle(e); return { family: c.fontFamily, size: c.fontSize, weight: c.fontWeight, style: c.fontStyle }; };
    const q = (s: string) => r.querySelector(s);
    const ph = (e: Element | null) => { if (!e) return null; const c = getComputedStyle(e, "::placeholder"); return { family: c.fontFamily, size: c.fontSize, weight: c.fontWeight, style: c.fontStyle }; };
    const slim = q(":scope > .qc156-slim");
    return {
      /* List filters v1 — the Filter panel's roles (shell/FilterPanel, one component on both pages); the Views panel's
         rows (views, Refine, tick boxes, More filters, the foot's export) retired with it */
      "panel heading": t(q(".fp-t")),
      "Clear all": t(q(".fp-clr")),
      "section title": t(q(".fp-st > b")),
      "tile label": t(q(".fp-tile:not(.fp-tile--wide) .fp-tx")),
      "tile count": t(q(".fp-tile:not(.fp-tile--wide) .fp-n")),
      "pill label": t(q(".fp-pill:not(.fp-pill--more)")),
      "foot": t(q(".fp-ft")),
      "bar count": t(q(".qc153-cnt")),
      "bar count figure": t(q(".qc153-cnt b")),
      "Find input": t(q(".qc153-find input")),
      "Find placeholder": ph(q(".qc153-find input")),
      "chip label (Sort)": t(q(".qc153-bar .qc153-dd b")),
      "chip label (Group)": t(q(".qc153-bar .qc153-dd:last-of-type b")),
      "slim title": t(slim?.querySelector(".qc156-st b") ?? null),
      "slim subline": t(slim?.querySelector(".qc156-st i") ?? null),
      "slim right figure": t(slim?.querySelector(".qc156-sa :is(.qc1561-sw, .qc156-sw) b") ?? null),
      "slim right words": t(slim?.querySelector(".qc156-sa :is(.qc1561-sw, .qc156-sw) em") ?? null),
      "slim button": t(slim?.querySelector(".qc156-sb, .clh2-sadd") ?? null),
    };
  }, root);
}

/** the collapsed bar: whichever the page has */
async function slimReading(page: Page, root: string) {
  return page.evaluate((root) => {
    const r = [...document.querySelectorAll<HTMLElement>(root)].find((e) => e.getBoundingClientRect().width > 0)!;
    const s = r.querySelector<HTMLElement>(":scope > .qc156-slim[data-shown], :scope > .clh2-slim[data-shown]");
    const sc = r.closest<HTMLElement>(".wpg-scroll")!;
    if (!s) return null;
    const b = s.getBoundingClientRect(), sb = sc.getBoundingClientRect();
    const title = s.querySelector<HTMLElement>(".qc156-st b, .clh2-stt");
    const btn = s.querySelector<HTMLElement>(".qc156-sb, .clh2-sadd");
    const g = getComputedStyle(s, "::before");
    const gl = b.left - (parseFloat(g.left) || 0) * -1; /* ::before left is negative */
    return {
      cls: s.className, h: +b.height.toFixed(1), titleSize: title ? getComputedStyle(title).fontSize : null, btnH: btn ? +btn.getBoundingClientRect().height.toFixed(1) : null,
      groundLeft: +(b.left + (parseFloat(g.left) || 0)).toFixed(1), groundRight: +(b.right - (parseFloat(g.right) || 0)).toFixed(1),
      sheetLeft: +sb.left.toFixed(1), sheetRight: +(sb.left + sc.clientWidth).toFixed(1), _gl: gl,
    };
  }, root);
}

/** ΔE (CIE76) */
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
async function shot(page: Page, path: string) {
  const buf = await page.screenshot({ path });
  const png = PNG.sync.read(buf);
  const px = (x: number, y: number) => { const i = (Math.round(y) * png.width + Math.round(x)) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
  return { png, px };
}
async function clBoxes(page: Page) {
  return page.evaluate((cl) => {
    const r = [...document.querySelectorAll<HTMLElement>(cl)].find((e) => e.getBoundingClientRect().width > 0)!;
    const bx = (e: Element | null) => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, r: b.right, b: b.bottom, w: b.width, h: b.height }; };
    const sc = r.closest<HTMLElement>(".wpg-scroll")!;
    const page = getComputedStyle(document.querySelector(".ws-main") ?? document.body).getPropertyValue("--ws-page").trim();
    return {
      col: bx(r.querySelector("[data-cl27='list-column']")), strip: bx(r.querySelector("[data-clq='toolbar']")), heads: bx(r.querySelector("[data-cl26='heads']")),
      card: bx(r.querySelector("[data-cl26='card']")), frame: bx(r.querySelector("[data-cl26='frame']")), cap: bx(r.querySelector("[data-clq='cap']")),
      capin: bx(r.querySelector("[data-clq='cap'] .clq-capin")), captop: bx(r.querySelector("[data-clq='cap'] .clq-captop")),
      panel: bx(r.querySelector(".qc153-rail")), port: { top: sc.getBoundingClientRect().top, bottom: sc.getBoundingClientRect().bottom }, page,
    };
  }, CL);
}

if (PHASE === "step0") {
  test("Step 0 — the readings", async ({ page }) => {
    const out: Record<string, unknown> = {};
    for (const vp of SIZES) {
      const W = vp.width;
      for (const [name, route, root] of [["qc", "/queries", QC], ["cl", "/agents", CL]] as const) {
        await openPage(page, route, root, vp);
        out[`${name}-${W}-type`] = await typeRoles(page, root);
        /* T5's "before": this phase runs on the unmodified base build */
        if (name === "qc") await page.screenshot({ path: `${SHOTS}/qc-before-rest-${W}.png` });
        await page.screenshot({ path: `${SHOTS}/step0-${name}-rest-${W}.png` });
        await scrollTo(page, root, 600);
        if (name === "qc") await page.screenshot({ path: `${SHOTS}/qc-before-600-${W}.png` });
        out[`${name}-${W}-slim`] = await slimReading(page, root);
        out[`${name}-${W}-slimType`] = await typeRoles(page, root);
        const s = await shot(page, `${SHOTS}/step0-${name}-600-${W}.png`);
        if (name === "cl") {
          const b = await clBoxes(page);
          const bg = s.px(b.col!.x - 20 > b.panel!.r ? b.col!.x - 20 : b.col!.x - 2, b.strip!.y + 30);
          const rows: string[] = [];
          for (let y = Math.ceil(b.strip!.y); y < (b.heads?.y ?? b.strip!.b); y += 4) {
            const L = s.px(b.col!.x - 1, y), R = s.px(b.col!.r, y);
            rows.push(`y=${y} L(${L.join(",")}) R(${R.join(",")})`);
          }
          out[`cl-${W}-beside`] = { col: b.col, strip: b.strip, heads: b.heads, ground: bg, rows };
        }
      }
    }
    writeFileSync(`${DIR}/step0-readings.json`, JSON.stringify(out, null, 1));
    console.log(JSON.stringify(out, null, 1).slice(0, 20000));
  });
} else if (PHASE === "qcbase") {
  test("T5 · the Query Centre before (base build)", async ({ page }) => {
    for (const vp of SIZES) {
      await openPage(page, "/queries", QC, vp);
      await page.screenshot({ path: `${SHOTS}/qc-before-rest-${vp.width}.png` });
      await scrollTo(page, QC, 600);
      await page.screenshot({ path: `${SHOTS}/qc-before-600-${vp.width}.png` });
    }
  });
}

/* ═════════════════════════════ the locks ═════════════════════════════ */
const T1_ROLES = ["view label", "view label (on)", "view count", "sub-heading (Refine)", "sub-heading note", "sub-label", "tick-box label", "tick-box count",
  "More filters", "foot showing", "foot export", "bar count", "Find placeholder", "Find input", "chip label (Sort)", "chip label (Group)",
  "slim title", "slim subline", "slim button"] as const;
const same = (a: Record<string, string> | null, b: Record<string, string> | null) => !!a && !!b && a.family === b.family && a.size === b.size && a.weight === b.weight;
const fmt = (a: Record<string, string> | null) => (a ? `${a.family.split(",")[0]} ${a.size} ${a.weight}${a.style === "italic" ? " italic" : ""}` : "absent");
const rgb = (s: string) => (s.match(/\d+/g) ?? []).slice(0, 3).map(Number);

async function pinnedState(page: Page) {
  return page.evaluate((cl) => {
    const r = [...document.querySelectorAll<HTMLElement>(cl)].find((e) => e.getBoundingClientRect().width > 0)!;
    const cap = r.querySelector<HTMLElement>("[data-clq='cap']")!, tb = r.querySelector<HTMLElement>("[data-clq='toolbar']")!;
    const port = r.closest<HTMLElement>(".wpg-scroll")!.getBoundingClientRect().top;
    return { capTop: cap.getBoundingClientRect().top - port, sticky: parseFloat(getComputedStyle(cap).top), stripFoot: tb.getBoundingClientRect().bottom - 22 - port, stuck: tb.hasAttribute("data-qc156-stuck") };
  }, CL);
}

if (PHASE === "after") {
  for (const vp of SIZES) {
    test(`Contact list QC layout v1.1 — ${vp.width}`, async ({ page }) => {
      const W = vp.width;
      /* ── the Query Centre: its roles (T1), its collapsed bar (T2), its screens (T5) ── */
      await openPage(page, "/queries", QC, vp);
      const qcType = await typeRoles(page, QC);
      const qcRest = `${SHOTS}/qc-after-rest-${W}.png`;
      await page.screenshot({ path: qcRest });
      await scrollTo(page, QC, 600);
      const qcSlimType = await typeRoles(page, QC);
      const qcSlim = await slimReading(page, QC);
      const qc600 = `${SHOTS}/qc-after-600-${W}.png`;
      await page.screenshot({ path: qc600 });

      /* ── T5 · the Query Centre unchanged: 0.0% (every pixel equal) ──
         ⚠️ THIS HARNESS'S RENDERER IS NOT DETERMINISTIC AT 1440: the same, unchanged Query Centre measured 0, 2734 and 102
         differing pixels (glyph edges) on three runs of one build. So each state gets up to three fresh renders (a new
         navigation each), and passes only on an EXACT match; every attempt's count is recorded. A code change that moves
         a pixel can never match. */
      const T5 = new Ledger(`T5-${W}`);
      /* the Query Centre's own sheet (its scroller's box); the shell's rail beside it is not the page, and its avatar and
         icons re-render by a level or two between runs */
      const sheet = await page.evaluate((qc) => {
        const r = [...document.querySelectorAll<HTMLElement>(qc)].find((e) => e.getBoundingClientRect().width > 0)!;
        const b = r.closest<HTMLElement>(".wpg-scroll")!.getBoundingClientRect();
        return { x0: Math.floor(b.left), y0: Math.floor(b.top), x1: Math.ceil(b.right), y1: Math.ceil(b.bottom) };
      }, QC);
      const diffOf = (before: string, after: string) => {
        const A = PNG.sync.read(readFileSync(before)), B = PNG.sync.read(readFileSync(after));
        if (A.width !== B.width || A.height !== B.height) return -1;
        let d = 0;
        for (let y = sheet.y0; y < Math.min(sheet.y1, A.height); y++) for (let x = sheet.x0; x < Math.min(sheet.x1, A.width); x++) {
          const i = (y * A.width + x) * 4;
          if (A.data[i] !== B.data[i] || A.data[i + 1] !== B.data[i + 1] || A.data[i + 2] !== B.data[i + 2]) d += 1;
        }
        return d;
      };
      for (const [label, before, after, y] of [["at rest", `${SHOTS}/qc-before-rest-${W}.png`, qcRest, 0], ["at 600px", `${SHOTS}/qc-before-600-${W}.png`, qc600, 600]] as const) {
        if (!existsSync(before)) { T5.check(`${label}: the base screen exists`, false, before); continue; }
        const tries = [diffOf(before, after)];
        while (tries[tries.length - 1] !== 0 && tries.length < 3) {
          await openPage(page, "/queries", QC, vp);
          if (y) await scrollTo(page, QC, y);
          await page.screenshot({ path: after });
          tries.push(diffOf(before, after));
        }
        T5.check(`${label}: base vs this build, 0.0% of the sheet (${sheet.x1 - sheet.x0}×${sheet.y1 - sheet.y0}; an exact render within 3 attempts)`, tries[tries.length - 1] === 0, `attempts: ${tries.map((d) => `${d} px`).join(", ")}`);
      }
      T5.done(2);

      /* ── the Contact list ── */
      await openPage(page, "/agents", CL, vp);
      const clType = await typeRoles(page, CL);
      await page.screenshot({ path: `${SHOTS}/cl-rest-${W}.png` });
      const rest = await clBoxes(page);
      const restShot = await shot(page, `${SHOTS}/cl-rest-raw-${W}.png`);

      /* ── T1 · type ── */
      await scrollTo(page, CL, 600);
      const clSlimType = await typeRoles(page, CL);
      const T1 = new Ledger(`T1-${W}`);
      for (const role of T1_ROLES) {
        const slim = role.startsWith("slim");
        const q = (slim ? qcSlimType : qcType)[role as keyof typeof qcType] as Record<string, string> | null;
        const c = (slim ? clSlimType : clType)[role as keyof typeof clType] as Record<string, string> | null;
        if (!q && role === "slim subline") {
          /* the harness's Query Centre draws no "for …" line (no book in scope): its rule is `.qc156-st i`, italic 16px serif */
          T1.check(`${role}: the Query Centre's rule (it draws none on the harness)`, !!c && /Source Serif 4/.test(c.family) && c.size === "16px" && c.style === "italic", `CL ${fmt(c)}`);
          continue;
        }
        T1.check(`${role}: face, size and weight = the Query Centre's`, same(q, c), `QC ${fmt(q)} · CL ${fmt(c)}`);
      }
      /* the Contact list's own nodes inside the shared pieces keep the faces they were given */
      const own = await page.evaluate((cl) => {
        const r = [...document.querySelectorAll<HTMLElement>(cl)].find((e) => e.getBoundingClientRect().width > 0)!;
        const f = (s: string) => { const e = r.querySelector(s); return e ? getComputedStyle(e).fontFamily.split(",")[0] : null; };
        return { yourBook: f("[data-clq='your-book']"), healthTitle: f(".clq-rc .cl26-ht"), healthMissing: f(".clq-rc .cl26-hm"), ruled: f(".qc1531-for > span"), slimHealth: f("[data-clh2='slim-health'] b"), slimHealthWords: f("[data-clh2='slim-health'] em") };
      }, CL);
      T1.check("the Contact list's own nodes: your book serif, List health typewriter + serif, the ruled line serif, the slim ring's words the streak type",
        /Serif/.test(own.yourBook ?? "") && /Special Elite/.test(own.healthTitle ?? "") && /Serif/.test(own.healthMissing ?? "") && /Serif/.test(own.ruled ?? "") && /Special Elite/.test(own.slimHealth ?? "") && /Serif/.test(own.slimHealthWords ?? ""),
        JSON.stringify(own));
      T1.done(T1_ROLES.length + 1);

      /* ── T2 · the collapsed bar ── */
      const clSlim = await slimReading(page, CL);
      const T2 = new Ledger(`T2-${W}`);
      for (const [name, s] of [["Query Centre", qcSlim], ["Contact list", clSlim]] as const) {
        T2.check(`${name}: shown at 600px, the shared bar`, !!s && s.cls.includes("qc156-slim"), s ? s.cls : "absent");
        if (!s) continue;
        T2.check(`${name}: 60 ±1 tall, title 24px, button 40 ±1`, near(s.h, 60) && s.titleSize === "24px" && near(s.btnH ?? 0, 40), `${s.h} · ${s.titleSize} · ${s.btnH}`);
        T2.check(`${name}: its ground from the sheet's left edge to its right ±1`, near(s.groundLeft, s.sheetLeft) && near(s.groundRight, s.sheetRight), `ground ${s.groundLeft}–${s.groundRight} · sheet ${s.sheetLeft}–${s.sheetRight}`);
      }
      if (qcSlim && clSlim) T2.check("the Contact list's equals the Query Centre's", near(qcSlim.h, clSlim.h, 0.5) && qcSlim.titleSize === clSlim.titleSize && near(qcSlim.btnH ?? 0, clSlim.btnH ?? 0, 0.5), `CL ${clSlim.h}/${clSlim.titleSize}/${clSlim.btnH} · QC ${qcSlim.h}/${qcSlim.titleSize}/${qcSlim.btnH}`);
      T2.done(7);

      /* ── T3 · nothing of the card beside the bar ── */
      const T3 = new Ledger(`T3-${W}`);
      const b6 = await clBoxes(page);
      const s6 = await shot(page, `${SHOTS}/cl-600-${W}.png`);
      const ground = rgb(b6.page);
      const ps = await pinnedState(page);
      T3.check("at 600px the strip is stuck and the cap pinned directly under its ground (±1)", ps.stuck && near(ps.capTop, ps.sticky) && near(ps.capTop, ps.stripFoot), JSON.stringify(ps));
      let worst = 0, at = "", n = 0;
      /* to the card's own top: its white top's ring (1px above it) is the card, which pinned begins there */
      const cardTop = b6.capin!.y - 1;
      for (let y = Math.ceil(b6.strip!.y); y < Math.floor(cardTop); y += 4) {
        for (const x of [b6.col!.x - 1, b6.col!.x - 6, b6.col!.r, b6.col!.r + 5]) {
          const d = deltaE(s6.px(x, y), ground); n += 1;
          if (d > worst) { worst = d; at = `x=${f1(x)} y=${y} rgb(${s6.px(x, y).join(",")})`; }
        }
      }
      T3.check(`1px and 6px outside the column, strip top ${f1(b6.strip!.y)} to the card's top ${f1(cardTop)} (headings ${f1(b6.heads!.y)}), ${n} samples, ΔE ≤ 2 from the ground rgb(${ground.join(",")})`, n > 20 && worst <= 2, `worst ΔE ${worst.toFixed(2)} ${at}`);
      T3.done(2);

      /* ── T4 · the lines while pinned ── */
      const T4 = new Ledger(`T4-${W}`);
      for (const y0 of [300, 600, 1200]) {
        await scrollTo(page, CL, y0);
        const b = await clBoxes(page), s = await shot(page, `${SHOTS}/cl-pinned-${y0}-${W}.png`), p = await pinnedState(page);
        T4.check(`${y0}px: pinned`, p.stuck && near(p.capTop, p.sticky), JSON.stringify(p));
        const top = Math.ceil(b.heads!.y), bot = Math.floor(Math.min(b.card!.b - 14, b.port.bottom - 2));
        let wl = 0, ww = 0, wa = "", k = 0;
        for (const side of ["left", "right"] as const) {
          const lx = side === "left" ? Math.floor(b.frame!.x) : Math.ceil(b.frame!.r) - 1;
          const wx = side === "left" ? b.card!.x + 5 : b.card!.r - 6;
          for (let y = top; y <= bot; y += 4) {
            const dl = Math.min(...[lx - 1, lx, lx + 1].map((x) => deltaE(s.px(x, y), LINE)));
            const dw = deltaE(s.px(wx, y), [255, 255, 255]); k += 1;
            if (dl > wl) { wl = dl; wa = `${side} line y=${y}`; }
            if (dw > ww) { ww = dw; wa += ` / white y=${y}`; }
          }
        }
        T4.check(`${y0}px: the frame's line (#e3d5c9, ΔE ≤ 3) and the white edge (ΔE ≤ 2) unbroken from the headings' top (${top}) to ${bot}, ${k} rows`, k > 20 && wl <= 3 && ww <= 2, `worst line ΔE ${wl.toFixed(2)}, white ΔE ${ww.toFixed(2)} ${wa}`);
      }
      T4.done(6);

      /* ── T4b · the corners while pinned (600px) ── */
      await scrollTo(page, CL, 600);
      const T4b = new Ledger(`T4b-${W}`);
      const bc = await clBoxes(page), sc = await shot(page, `${SHOTS}/cl-corners-600-${W}.png`);
      const pageRgb = rgb(bc.page);
      for (const side of ["left", "right"] as const) {
        const ci = bc.capin!, ct = bc.captop!;
        const sx = side === "left" ? 1 : -1;
        /* the 22px outer corner: centre 22px in from the white top's corner */
        const ox = side === "left" ? ci.x + 22 : ci.r - 22, oy = ci.y + 22;
        const at = (cx: number, cy: number, rad: number) => [cx - sx * rad * Math.SQRT1_2, cy - rad * Math.SQRT1_2] as const;
        const outside = [at(ox, oy, 27), [side === "left" ? ci.x + 2 : ci.r - 3, ci.y + 2] as const];
        const dOut = Math.max(...outside.map(([x, y]) => deltaE(sc.px(x, y), pageRgb)));
        const dIn = deltaE(sc.px(...at(ox, oy, 17)), [255, 255, 255]);
        T4b.check(`${side} 22px corner: outside the curve is the page's ground (ΔE ≤ 2), inside it white`, dOut <= 2 && dIn <= 2, `outside ΔE ${dOut.toFixed(2)}, inside ΔE ${dIn.toFixed(2)}`);
        /* the 13px frame corner */
        const fx = side === "left" ? ct.x + 13 : ct.r - 13, fy = ct.y + 13;
        /* the arc is where the frame's line meets the navy index row, so its pixels are the line anti-aliased into navy:
           they must be the arc's pixels at rest (the same offsets from the white top's corner), and white outside it */
        const rx = side === "left" ? rest.captop!.x + 13 : rest.captop!.r - 13, ry = rest.captop!.y + 13 + (Math.round(rest.capin!.y) - rest.capin!.y) - (Math.round(ci.y) - ci.y);
        const dLine = Math.max(...[11, 12, 12.5, 13, 14].map((r) => deltaE(sc.px(...at(fx, fy, r)), restShot.px(...at(rx, ry, r)))));
        const dWhite = deltaE(sc.px(...at(fx, fy, 17)), [255, 255, 255]);
        T4b.check(`${side} 13px frame corner: the arc's pixels are its pixels at rest (ΔE ≤ 3), white outside it`, dLine <= 3 && dWhite <= 2, `arc ΔE ${dLine.toFixed(2)}, outside it ΔE ${dWhite.toFixed(2)}`);
      }
      /* the pinned top vs the top at rest: the corner band (14px above the white top to 14px into it) and the heading row */
      /* the card itself: its white top, edge to edge (its corners included) */
      const bandDiff = (y0r: number, y0p: number, h: number) => {
        const x0 = Math.floor(bc.capin!.x), x1 = Math.ceil(bc.capin!.r);
        let d = 0, t = 0;
        for (let y = 0; y < h; y++) for (let x = x0; x < x1; x++) {
          const a = restShot.px(x, y0r + y), b = sc.px(x, y0p + y); t += 1;
          if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 24) d += 1;
        }
        return { d, t, pct: (d / t) * 100 };
      };
      const top = bandDiff(Math.round(rest.capin!.y - 1), Math.round(bc.capin!.y - 1), 12);
      const heads = bandDiff(Math.round(rest.heads!.y), Math.round(bc.heads!.y), Math.round(bc.heads!.h));
      T4b.check("the pinned top (its ring row, the white top and the frame's top line, corners included) matches the top at rest (≤ 0.5%)", top.pct <= 0.5, `${top.d}/${top.t} px = ${top.pct.toFixed(3)}%`);
      T4b.check("the pinned heading row matches the row at rest (≤ 0.5%)", heads.pct <= 0.5, `${heads.d}/${heads.t} px = ${heads.pct.toFixed(3)}%`);
      writeFileSync(`${DIR}/corners-${W}.json`, JSON.stringify({ capin: bc.capin, captop: bc.captop, rest: { capin: rest.capin, heads: rest.heads } }, null, 1));
      T4b.done(6);
      await scrollTo(page, CL, 0);
    });
  }
}
