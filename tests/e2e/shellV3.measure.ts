/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * App shell v3 — THE LOCKS (L1–L12), measured on the rendered, signed-in app.
 * Ref: design-refs/shell/app-shell-v3.html (+ geometry json + screens). Prompt and rulings:
 * reports/app-shell-v3/.
 *
 *   npm run build:dev && npx vite preview --port 4431 --host 127.0.0.1 &
 *   SA_E2E_BASE_URL=http://127.0.0.1:4431 npx playwright test shellV3
 *
 * ⚠️ EVERY CHECK IS RECORDED, NOT THROWN AT THE FIRST MISS. A case whose first assertion fails
 * leaves every assertion below it unproved — so each check lands in a ledger row
 * (`lock · route · size · state · ok · detail`), the ledger is written to
 * `reports/app-shell-v3/ledger-<case>.json`, and only THEN does the case assert that no row failed.
 * That is also what makes "red against main" a per-lock statement rather than a per-case one.
 *
 * ⚠️ A LOCK THAT FINDS NO SUBJECT HAS FAILED, NOT SKIPPED. Each probe returns `null` for an element
 * it cannot find, and a null is a failed row naming what was missing. Each case also asserts a floor
 * on the number of rows it wrote, so a run that quietly measured nothing cannot come back green.
 *
 * ⚠️ READS ONLY. The fixture account is never written: the collapsed state is set through
 * localStorage (the app's own persistence key), the themes are swapped on the DOM, and L11's forced
 * failure is a write the server DENIES — the request is re-addressed to a document the signed-in
 * user may not touch, so nothing lands.
 */
import { expect, test, Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

export const SIZES = [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
] as const;

/** Every shell route the prompt names. Settings is the `set-mode` variant: its rail's items are tabs. */
export const ROUTES = [
  { name: "Query Centre", path: "/queries" },
  { name: "Contact list", path: "/agents" },
  { name: "Manuscripts", path: "/manuscripts" },
  { name: "Dashboard", path: "/dashboard" },
  { name: "To-do list", path: "/todo" },
  { name: "Settings", path: "/account/profile", settings: true },
] as const;

const COLLAPSE_KEY = "scriptally:sidebar-collapsed";

/* The mock's values — normative per the prompt's relational rules and lock table. */
const STONE = "rgb(231, 227, 220)";
const RULE = "rgba(28, 19, 15, 0.1)";
const ANTHRACITE = "rgb(42, 58, 82)";
const CREAM = "rgb(253, 249, 245)";
/** Today's exact card surface (`--ws-window`), which ruling 1 says must not move. */
const SURFACE = "rgb(254, 252, 250)";

export type Row = { lock: string; route: string; size: string; state: string; ok: boolean; detail: string };

export class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(lock: string, ctx: { route: string; size: string; state: string }, ok: boolean, detail: string) {
    this.rows.push({ lock, ...ctx, ok: !!ok, detail });
  }
  write() {
    mkdirSync("reports/app-shell-v3", { recursive: true });
    writeFileSync(`reports/app-shell-v3/ledger-${this.name}.json`, JSON.stringify(this.rows, null, 1));
    const byLock: Record<string, { pass: number; fail: number }> = {};
    for (const r of this.rows) {
      byLock[r.lock] ??= { pass: 0, fail: 0 };
      byLock[r.lock][r.ok ? "pass" : "fail"]++;
    }
    console.log(`LEDGER ${this.name}: ${JSON.stringify(byLock)}`);
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 60)) {
      console.log(`  ✗ ${r.lock} · ${r.route} · ${r.size} · ${r.state} — ${r.detail}`);
    }
  }
  failures() { return this.rows.filter((r) => !r.ok); }
}

const near = (a: number | null | undefined, b: number, tol: number) =>
  typeof a === "number" && Number.isFinite(a) && Math.abs(a - b) <= tol;
const f1 = (n: unknown) => (typeof n === "number" ? Math.round(n * 10) / 10 : String(n));

/** Open a route in a given sidebar state, with fonts settled. The state rides the app's own key. */
export async function openShell(page: Page, path: string, vp: { width: number; height: number }, collapsed: boolean) {
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch { /* */ } }, [COLLAPSE_KEY, collapsed ? "1" : "0"]);
  await openRoute(page, path, vp);
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(300);
}

/**
 * THE PROBE — one read of everything the locks need, from measured boxes and computed styles.
 * ⚠️ A real function, not a template string: `page.evaluate` of a template eats regex escapes.
 */
export async function probeShell(page: Page) {
  return page.evaluate(() => {
    const cs = (el: Element, pseudo?: string) => getComputedStyle(el, pseudo);
    const box = (el: Element | null) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom, cx: r.x + r.width / 2, cy: r.y + r.height / 2 };
    };
    const shown = (el: Element | null) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const s = cs(el);
      return r.width > 0.5 && r.height > 0.5 && s.visibility !== "hidden" && s.display !== "none" && parseFloat(s.opacity) > 0.02;
    };
    /** Split a computed box-shadow into its layers (commas outside parentheses). */
    const shadows = (v: string) => {
      if (!v || v === "none") return [] as { color: string; nums: number[]; inset: boolean }[];
      const out: string[] = []; let depth = 0; let cur = "";
      for (const ch of v) {
        if (ch === "(") depth++;
        if (ch === ")") depth--;
        if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else cur += ch;
      }
      if (cur.trim()) out.push(cur.trim());
      return out.map((s) => {
        const m = s.match(/(rgba?\([^)]*\))/);
        const color = m ? m[1] : "";
        const rest = s.replace(color, "");
        const nums = (rest.match(/-?\d*\.?\d+px/g) ?? []).map((n) => parseFloat(n));
        return { color, nums, inset: /inset/.test(s) };
      });
    };
    const borders = (el: Element) => {
      const s = cs(el);
      return (["Top", "Right", "Bottom", "Left"] as const).map((side) => ({
        side,
        w: parseFloat(s.getPropertyValue(`border-${side.toLowerCase()}-width`)),
        color: s.getPropertyValue(`border-${side.toLowerCase()}-color`),
        style: s.getPropertyValue(`border-${side.toLowerCase()}-style`),
      })).filter((b) => b.w > 0 && b.style !== "none" && !/rgba\([^)]*,\s*0\)$/.test(b.color) && b.color !== "transparent");
    };
    const radii = (el: Element) => {
      const s = cs(el);
      return ["border-top-left-radius", "border-top-right-radius", "border-bottom-left-radius", "border-bottom-right-radius"]
        .map((p) => parseFloat(s.getPropertyValue(p)) || 0);
    };
    const surfaceOf = (el: Element) => ({
      bg: cs(el).backgroundColor,
      img: cs(el).backgroundImage,
      borders: borders(el),
      shadows: shadows(cs(el).boxShadow).filter((x) => !/rgba\([^)]*,\s*0\)$/.test(x.color)),
      radii: radii(el),
      after: (() => {
        const a = cs(el, "::after");
        if (a.content === "none" || a.display === "none" || parseFloat(a.opacity) < 0.02) return [];
        return shadows(a.boxShadow).filter((x) => !/rgba\([^)]*,\s*0\)$/.test(x.color));
      })(),
    });

    const side = document.getElementById("ws-sidebar");
    const main = document.querySelector(".ws-main");
    const bar = document.querySelector('[data-probe="navrow"]');
    const winwrap = document.querySelector(".ws-winwrap");
    const win = document.querySelector(".ws-window");
    const wbody = document.querySelector(".ws-wbody");
    const work = document.querySelector(".ws-work");
    const settings = !!document.querySelector(".ws-app.set-mode");

    /* ── bar sequence: the classified controls, in DOM order, visible only ── */
    const classify = (el: Element): string | null => {
      if (el.matches('[aria-controls="ws-sidebar"]')) return "collapse";
      if (el.matches('nav[aria-label="Breadcrumb"]')) return "breadcrumb";
      if (el.matches(".ws-sync")) return "whisper";
      if (el.matches(".ws-vdiv")) return "divider";
      if (el.matches('[data-shell="spacer"]')) return "spacer";
      if (el.matches('.sp-search, [aria-label^="Search"]')) return "search";
      if (el.matches('[data-probe="feedback"]')) return "feedback";
      if (el.matches('.sp-help, [aria-label="Help"], [aria-label="Help centre"]')) return "help";
      if (el.matches(".ws-backapp")) return "back";
      return null;
    };
    const seq: string[] = [];
    if (bar) {
      const walk = (el: Element) => {
        for (const c of Array.from(el.children)) {
          const k = classify(c);
          if (k) { if (k === "spacer" ? (c.getBoundingClientRect().width > 0) : shown(c)) seq.push(k); continue; }
          walk(c);
        }
      };
      walk(bar);
    }
    const find = (k: string) => {
      if (!bar) return null;
      const all = Array.from(bar.querySelectorAll("*"));
      return all.find((e) => classify(e) === k && shown(e)) ?? null;
    };
    const collapseBtn = find("collapse");
    const crumb = find("breadcrumb");
    const search = find("search");
    const feedback = find("feedback");
    const help = find("help");

    /* ── the sidebar's nav + active item ── */
    const navItems = side ? Array.from(side.querySelectorAll("nav .ws-ni")) : [];
    const activeNav = side ? Array.from(side.querySelectorAll('nav [aria-current="page"]')).filter(shown) : [];
    const activeTab = side ? Array.from(side.querySelectorAll('.set-rail [role="tab"][aria-selected="true"]')).filter(shown) : [];
    const active = settings ? activeTab : activeNav;
    const labels = side ? Array.from(side.querySelectorAll(".ws-glabel")) : [];
    const lbl = navItems[0]?.querySelector(".ws-lbl") ?? navItems[0] ?? null;
    const faceLoaded = (fam: string) => Array.from(document.fonts).some((f) => f.family.replace(/["']/g, "") === fam && f.status === "loaded");
    const mark = side?.querySelector(".ws-bmark") ?? null;

    const text = (document.body.textContent ?? "").toLowerCase();
    const theme = document.querySelector(".t-capp, .t-bold, .t-edn");

    return {
      settings,
      theme: theme ? (theme.className.match(/\bt-(capp|bold|edn)\b/) ?? [""])[0] : null,
      vp: { w: window.innerWidth, h: window.innerHeight },
      side: side && {
        box: box(side), bg: cs(side).backgroundColor, shadows: shadows(cs(side).boxShadow), borders: borders(side),
        scrollW: side.scrollWidth, clientW: side.clientWidth,
        navScrolls: (() => { const n = side.querySelector("nav.ws-nav"); return n ? n.scrollHeight > n.clientHeight + 1 : null; })(),
      },
      main: main && { box: box(main), bg: cs(main).backgroundColor },
      bar: bar && { box: box(bar), bg: cs(bar).backgroundColor, shadows: shadows(cs(bar).boxShadow), borders: borders(bar) },
      frame: [winwrap, win, wbody, work].map((el) => el && { cls: (el.className || "").toString().split(" ")[0], box: box(el), ...surfaceOf(el) }),
      seq,
      collapse: box(collapseBtn), crumb: box(crumb), search: box(search), feedback: box(feedback), help: box(help),
      searchText: search ? (search as HTMLElement).innerText.trim() : null,
      searchName: search ? search.getAttribute("aria-label") : null,
      feedbackStyle: feedback && { bg: cs(feedback).backgroundColor, shadow: cs(feedback).boxShadow, radius: cs(feedback).borderTopLeftRadius, font: cs(feedback).fontFamily, size: cs(feedback).fontSize },
      crumbFont: crumb ? { fam: cs(crumb).fontFamily, size: cs(crumb).fontSize } : null,
      navCount: navItems.length,
      active: active.map((a) => ({ box: box(a), bg: cs(a).backgroundColor, fg: cs(a).color, weight: cs(a).fontWeight })),
      nav: lbl ? { fam: cs(lbl).fontFamily, size: cs(lbl).fontSize } : null,
      glabel: labels[0] ? { fam: cs(labels[0]).fontFamily } : null,
      glabelCount: labels.length,
      loadedSerif: faceLoaded("Source Serif 4"),
      loadedMono: faceLoaded("JetBrains Mono"),
      names: navItems.map((n) => ({ aria: n.getAttribute("aria-label"), title: n.getAttribute("title") })),
      labelsHidden: navItems.map((n) => { const l = n.querySelector(".ws-lbl"); if (!l) return false; const s = cs(l); return parseFloat(s.opacity) < 0.02 || l.getBoundingClientRect().width < 0.5 || s.display === "none"; }),
      navClip: navItems.map((n) => { const l = n.querySelector(".ws-lbl") as HTMLElement | null; return l ? l.scrollWidth - l.clientWidth : 0; }),
      mark: box(mark),
      savedText: text.includes("all changes saved"),
    };
  });
}

type Probe = Awaited<ReturnType<typeof probeShell>>;

/** ⚠️ exactly one 1px RULE-coloured rule on the named edge, and nothing else painted by the element. */
function oneRule(el: { shadows: { color: string; nums: number[]; inset: boolean }[]; borders: { side: string; w: number; color: string }[] } | null, edge: "Right" | "Bottom") {
  if (!el) return { ok: false, why: "element missing" };
  const live = el.shadows.filter((s) => !/rgba\([^)]*,\s*0\)$/.test(s.color));
  const ruleShadows = live.filter((s) => s.inset && s.color === RULE && (edge === "Right" ? s.nums[0] === -1 && s.nums[1] === 0 : s.nums[0] === 0 && s.nums[1] === -1) && (s.nums[2] ?? 0) === 0);
  const ruleBorders = el.borders.filter((b) => b.side === edge && b.w === 1 && b.color === RULE);
  const rules = ruleShadows.length + ruleBorders.length;
  const others = live.length - ruleShadows.length + el.borders.length - ruleBorders.length;
  return { ok: rules === 1 && others === 0, why: `rules=${rules} others=${others} shadows=${JSON.stringify(live)} borders=${JSON.stringify(el.borders)}` };
}

/** Every lock that reads one probe. Returns nothing; writes the ledger. */
export function judge(L: Ledger, p: Probe, ctx: { route: string; size: string; state: string }, collapsed: boolean, is1280: boolean) {
  const c = (lock: string, ok: boolean, detail: string) => L.check(lock, ctx, ok, detail);

  /* L1 tone */
  c("L1 tone", p.side?.bg === STONE, `sidebar bg ${p.side?.bg}`);

  /* L2 one-divide */
  const sr = oneRule(p.side, "Right");
  c("L2 one-divide · sidebar edge", sr.ok, sr.why);
  const br = oneRule(p.bar, "Bottom");
  c("L2 one-divide · top-bar edge", br.ok, br.why);
  const pageBg = p.main?.bg ?? "";
  for (const f of p.frame) {
    if (!f) { c("L2 one-divide · frame", false, "frame element missing"); continue; }
    c(`L2 one-divide · ${f.cls} unframed`, f.borders.length === 0 && f.shadows.length === 0 && f.after.length === 0,
      `borders=${JSON.stringify(f.borders)} shadows=${JSON.stringify(f.shadows)} after=${JSON.stringify(f.after)}`);
  }
  c("L2 one-divide · bar bg = page bg", !!p.bar && p.bar.bg === pageBg && !/rgba\([^)]*,\s*0\)$/.test(pageBg) && pageBg !== "transparent",
    `bar ${p.bar?.bg} · page ${pageBg}`);

  /* L3 active */
  c("L3 active · exactly one", p.active.length === 1, `active count ${p.active.length}`);
  const a = p.active[0];
  c("L3 active · colours", !!a && a.bg === ANTHRACITE && a.fg === CREAM, `bg ${a?.bg} fg ${a?.fg}`);
  if (!p.settings && !collapsed) c("L3 active · weight 600", !!a && Number(a.weight) === 600, `weight ${a?.weight}`);

  /* L4 nav-type */
  c("L4 nav-type · serif 14.5", !!p.nav && /^"?Source Serif 4"?/.test(p.nav.fam) && p.nav.size === "14.5px", `nav ${JSON.stringify(p.nav)}`);
  c("L4 nav-type · labels mono", p.glabelCount > 0 && !!p.glabel && /^"?JetBrains Mono"?/.test(p.glabel.fam), `glabel ${JSON.stringify(p.glabel)} n=${p.glabelCount}`);
  if (!p.settings) c("L4 nav-type · faces loaded", p.loadedSerif && p.loadedMono, `serif ${p.loadedSerif} mono ${p.loadedMono}`);

  /* L5 top-bar */
  const want = p.settings
    ? ["collapse", "breadcrumb", "spacer", "back", "feedback", "help"]
    : ["collapse", "breadcrumb", "spacer", "search", "feedback", "help"];
  c("L5 top-bar · order", JSON.stringify(p.seq) === JSON.stringify(want), `seq ${JSON.stringify(p.seq)}`);
  c("L5 top-bar · no save whisper", !p.savedText, `"all changes saved" in DOM: ${p.savedText}`);

  /* L6 search (geometry + name; the open-on-click/⌘K half is its own case) */
  if (!p.settings) {
    c("L6 search · 36×36", !!p.search && near(p.search.w, 36, 0.6) && near(p.search.h, 36, 0.6), `search ${f1(p.search?.w)}×${f1(p.search?.h)}`);
    c("L6 search · no visible text", p.searchText === "", `text ${JSON.stringify(p.searchText)}`);
    c("L6 search · name", p.searchName === "Search (⌘K)", `aria-label ${JSON.stringify(p.searchName)}`);
  }

  /* L7 no-inner-card — the page frame's boxes: no border, shadow, radius; page ground or transparent */
  for (const f of p.frame) {
    if (!f) { c("L7 no-inner-card", false, "frame element missing"); continue; }
    const bgOk = f.bg === pageBg || /rgba\([^)]*,\s*0\)$/.test(f.bg) || f.bg === "transparent";
    c(`L7 no-inner-card · ${f.cls}`, f.borders.length === 0 && f.shadows.length === 0 && f.after.length === 0 && f.radii.every((r) => r === 0) && bgOk && f.img === "none",
      `bg ${f.bg} (page ${pageBg}) radii ${f.radii.join("/")} borders ${f.borders.length} shadows ${f.shadows.length} after ${f.after.length}`);
  }

  /* L8 geometry */
  const s = p.side?.box; const bar = p.bar?.box; const win = p.frame[1]?.box ?? null;
  c("L8 geometry · sidebar width", !!s && near(s.w, collapsed ? 68 : 248, 1), `sidebar ${f1(s?.w)}`);
  c("L8 geometry · sidebar right = window left", !!s && !!win && near(win.x, s.r, 1), `side.r ${f1(s?.r)} win.x ${f1(win?.x)}`);
  c("L8 geometry · bar bottom = window top", !!bar && !!win && near(win.y, bar.b, 0.5), `bar.b ${f1(bar?.b)} win.y ${f1(win?.y)}`);
  c("L8 geometry · bar height 64", !!bar && near(bar.h, 64, 1), `bar.h ${f1(bar?.h)}`);
  c("L8 geometry · bar left = sidebar right", !!bar && !!s && near(bar.x, s.r, 1), `bar.x ${f1(bar?.x)} side.r ${f1(s?.r)}`);
  c("L8 geometry · help right clearance 24", !!bar && !!p.help && near(bar.r - p.help.r, 24, 1), `clearance ${f1(bar && p.help ? bar.r - p.help.r : null)}`);
  const trio = p.settings ? [p.feedback, p.help] : [p.search, p.feedback, p.help];
  c("L8 geometry · controls centred", !!bar && trio.every((t) => !!t && near(t.cy, bar.cy, 1)), `bar.cy ${f1(bar?.cy)} · ${trio.map((t) => f1(t?.cy)).join("/")}`);
  if (!p.settings) c("L8 geometry · search→feedback 10", !!p.search && !!p.feedback && near(p.feedback.x - p.search.r, 10, 1), `gap ${f1(p.search && p.feedback ? p.feedback.x - p.search.r : null)}`);
  c("L8 geometry · feedback→help 10", !!p.feedback && !!p.help && near(p.help.x - p.feedback.r, 10, 1), `gap ${f1(p.feedback && p.help ? p.help.x - p.feedback.r : null)}`);
  c("L8 geometry · crumb = collapse + 14", !!p.crumb && !!p.collapse && near(p.crumb.x - p.collapse.r, 14, 2), `gap ${f1(p.crumb && p.collapse ? p.crumb.x - p.collapse.r : null)}`);
  const act = p.active[0]?.box;
  if (!collapsed) {
    c("L8 geometry · active inset 14", !!act && !!s && near(act.x - s.x, 14, 1) && near(s.r - act.r, 14, 1), `left ${f1(act && s ? act.x - s.x : null)} right ${f1(act && s ? s.r - act.r : null)}`);
  } else if (!p.settings) {
    c("L8 geometry · active 40×34 centred", !!act && !!s && near(act.w, 40, 1) && near(act.h, 34, 1) && near(act.cx, s.cx, 1), `${f1(act?.w)}×${f1(act?.h)} cx ${f1(act?.cx)} side.cx ${f1(s?.cx)}`);
  }
  if (collapsed && !p.settings) {
    /* ⚠️ NOT IN SETTINGS MODE: the app nav layer, brand included, is hidden and shifted there. */
    c("L8 geometry · mark centred collapsed", !!p.mark && !!s && near(p.mark.cx, s.cx, 1), `mark.cx ${f1(p.mark?.cx)} side.cx ${f1(s?.cx)}`);
  } else if (!p.settings) {
    c("L8 geometry · mark at mock position", !!p.mark && !!s && near(p.mark.x - s.x, 20, 1) && near(p.mark.y - s.y, 16, 1) && near(p.mark.w, 30, 1),
      `mark at +${f1(p.mark && s ? p.mark.x - s.x : null)},+${f1(p.mark && s ? p.mark.y - s.y : null)} size ${f1(p.mark?.w)}`);
  }
  if (is1280 && !collapsed) {
    c("L8 geometry · 1280 no horizontal clip", !!p.side && p.side.scrollW <= p.side.clientW + 0.5 && p.navClip.every((d) => d <= 0.5),
      `scrollW ${p.side?.scrollW} clientW ${p.side?.clientW} label overflow ${JSON.stringify(p.navClip.filter((d) => d > 0.5))} · nav scrolls vertically: ${p.side?.navScrolls}`);
  }

  /* L9 collapse (the persistence guard is its own case) */
  if (collapsed && !p.settings) {
    c("L9 collapse · labels hidden", p.labelsHidden.length > 0 && p.labelsHidden.every(Boolean), `hidden ${p.labelsHidden.filter(Boolean).length}/${p.labelsHidden.length}`);
  }
  if (!p.settings) {
    /* ⚠️ THE NAME IS AN EXPLICIT `aria-label`, NOT THE LABEL SPAN — collapsed, that span is 0px wide.
       The tooltip half is the portalled rail tip, asserted by hover in the matrix (native `title`
       would put a second tooltip on the same hover). */
    c("L9 collapse · every link named", p.names.length > 0 && p.names.every((n) => (n.aria ?? "").trim() !== ""),
      `unnamed ${p.names.filter((n) => !(n.aria ?? "").trim()).length}/${p.names.length}`);
  }
}


for (const vp of SIZES) {
  for (const collapsed of [false, true]) {
    const state = collapsed ? "collapsed" : "expanded";
    test(`shell v3 · ${vp.width} · ${state}`, async ({ page }) => {
      const L = new Ledger(`${vp.width}-${state}`);
      for (const r of ROUTES) {
        await openShell(page, r.path, vp, collapsed);
        const p = await probeShell(page);
        judge(L, p, { route: r.name, size: `${vp.width}`, state }, collapsed, vp.width === 1280);
        /* L9 tooltip: collapsed, hovering a link shows the rail tip carrying its name */
        if (collapsed && !("settings" in r)) {
          const item = page.locator("#ws-sidebar nav .ws-ni").nth(1);
          const name = await item.getAttribute("aria-label");
          await item.hover();
          const tip = page.locator(".dk-tip--rail");
          const shown = await tip.first().waitFor({ state: "visible", timeout: 2000 }).then(() => true).catch(() => false);
          const text = shown ? ((await tip.first().textContent()) ?? "").trim() : "";
          L.check("L9 collapse · tooltip on hover", { route: r.name, size: `${vp.width}`, state }, shown && !!name && text.startsWith(name), `tip ${JSON.stringify(text)} name ${JSON.stringify(name)}`);
          await page.mouse.move(vp.width - 5, vp.height - 5);
        }
      }
      L.write();
      expect(L.rows.length, "population floor").toBeGreaterThan(ROUTES.length * 20);
      expect(L.failures().map((f) => `${f.lock} · ${f.route} — ${f.detail}`)).toEqual([]);
    });
  }
}

/* ── L6 behaviour: the icon opens the same palette, and ⌘K is unchanged ── */
test("L6 search · click and ⌘K both open the palette", async ({ page }) => {
  const L = new Ledger("L6-open");
  for (const r of ROUTES.filter((x) => !("settings" in x))) {
    await openShell(page, r.path, { width: 1440, height: 900 }, false);
    const ctx = { route: r.name, size: "1440", state: "expanded" };
    const pal = page.locator(".sp-pal");
    const btn = page.locator('[data-probe="navrow"] [aria-label="Search (⌘K)"]');
    const has = (await btn.count()) === 1;
    L.check("L6 search · icon button present", ctx, has, `count ${await btn.count()}`);
    if (has) {
      await btn.click();
      await page.waitForTimeout(250);
      L.check("L6 search · click opens palette", ctx, await pal.isVisible(), "click");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
    }
    await page.locator("body").click({ position: { x: 5, y: 5 } }).catch(() => {});
    await page.keyboard.press("ControlOrMeta+k");
    await page.waitForTimeout(250);
    L.check("L6 search · ⌘K opens palette (guard)", ctx, await pal.isVisible(), "keyboard");
    await page.keyboard.press("Escape");
  }
  L.write();
  expect(L.rows.length).toBeGreaterThan(9);
  expect(L.failures().map((f) => `${f.lock} · ${f.route}`)).toEqual([]);
});

/* ── L9 persistence (guard): the toggle's state survives a reload, both ways, on the same key ── */
test("L9 collapse · persistence behaves as before (guard)", async ({ page }) => {
  const L = new Ledger("L9-persist");
  const ctx = { route: "Query Centre", size: "1440", state: "toggle" };
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.evaluate((k) => localStorage.setItem(k, "0"), COLLAPSE_KEY);
  await page.reload(); await page.waitForTimeout(1500);
  const toggle = page.locator('[aria-controls="ws-sidebar"]');
  L.check("L9 persist · toggle present", ctx, (await toggle.count()) === 1, "");
  const w0 = await page.evaluate(() => document.getElementById("ws-sidebar")!.getBoundingClientRect().width);
  await toggle.click(); await page.waitForTimeout(400);
  const stored1 = await page.evaluate((k) => localStorage.getItem(k), COLLAPSE_KEY);
  await page.reload(); await page.waitForTimeout(1500);
  const w1 = await page.evaluate(() => document.getElementById("ws-sidebar")!.getBoundingClientRect().width);
  const exp1 = await toggle.getAttribute("aria-expanded");
  L.check("L9 persist · collapse survives reload", ctx, stored1 === "1" && w1 < w0 && exp1 === "false", `stored ${stored1} w ${w0}→${w1} expanded ${exp1}`);
  await toggle.click(); await page.waitForTimeout(400);
  await page.reload(); await page.waitForTimeout(1500);
  const w2 = await page.evaluate(() => document.getElementById("ws-sidebar")!.getBoundingClientRect().width);
  const stored2 = await page.evaluate((k) => localStorage.getItem(k), COLLAPSE_KEY);
  L.check("L9 persist · expand survives reload", ctx, stored2 === "0" && Math.abs(w2 - w0) < 1, `stored ${stored2} w ${w2}`);
  L.write();
  expect(L.rows.length).toBe(3);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

/* ── L10 themes: under .t-bold and .t-edn the shell's colours are non-transparent and come from tokens ── */
test("L10 themes · bold and editorial resolve the shell tokens", async ({ page }) => {
  const L = new Ledger("L10-themes");
  await openShell(page, "/queries", { width: 1440, height: 900 }, false);
  for (const theme of ["t-capp", "t-bold", "t-edn"]) {
    const ctx = { route: "Query Centre", size: "1440", state: theme };
    const r = await page.evaluate((t) => {
      const root = document.querySelector(".t-capp, .t-bold, .t-edn");
      if (!root) return null;
      root.classList.remove("t-capp", "t-bold", "t-edn");
      root.classList.add(t);
      const side = document.getElementById("ws-sidebar")!;
      const act = side.querySelector('nav [aria-current="page"]');
      const s = getComputedStyle(side);
      const tok = (n: string) => s.getPropertyValue(n).trim();
      /* resolve a token to a computed colour through a scratch element under the sidebar */
      const probe = document.createElement("i");
      side.appendChild(probe);
      const res = (n: string) => { probe.style.color = `var(${n})`; return getComputedStyle(probe).color; };
      const out = {
        tokens: { side: tok("--shell-side"), rule: tok("--shell-rule"), activeBg: tok("--shell-active-bg"), activeFg: tok("--shell-active-fg") },
        resolved: { side: res("--shell-side"), rule: res("--shell-rule"), activeBg: res("--shell-active-bg"), activeFg: res("--shell-active-fg") },
        sideBg: s.backgroundColor, sideShadow: s.boxShadow,
        activeBg: act ? getComputedStyle(act).backgroundColor : null, activeFg: act ? getComputedStyle(act).color : null,
      };
      probe.remove();
      return out;
    }, theme);
    const transparent = (v: string | null | undefined) => !v || v === "transparent" || /rgba\([^)]*,\s*0\)$/.test(v);
    L.check("L10 themes · root found", ctx, !!r, "");
    if (!r) continue;
    L.check("L10 themes · tokens declared", ctx, Object.values(r.tokens).every((v) => v !== ""), JSON.stringify(r.tokens));
    L.check("L10 themes · surface from token", ctx, !transparent(r.sideBg) && r.sideBg === r.resolved.side, `bg ${r.sideBg} token ${r.resolved.side}`);
    L.check("L10 themes · rule from token", ctx, !transparent(r.resolved.rule) && r.sideShadow.includes(r.resolved.rule), `shadow ${r.sideShadow} token ${r.resolved.rule}`);
    L.check("L10 themes · active from tokens", ctx, !transparent(r.activeBg) && r.activeBg === r.resolved.activeBg && r.activeFg === r.resolved.activeFg,
      `active ${r.activeBg}/${r.activeFg} tokens ${r.resolved.activeBg}/${r.resolved.activeFg}`);
    console.log(`THEME ${theme} ${JSON.stringify(r)}`);
  }
  L.write();
  expect(L.rows.length).toBe(15);
  expect(L.failures().map((f) => `${f.lock} · ${f.state} — ${f.detail}`)).toEqual([]);
});

/* ── L11 save-failure (guard): a forced failed save still shows the writer an error ──
   ⚠️ THE FAILURE IS REAL AND WRITES NOTHING. The Firestore write stream is re-addressed from the
   signed-in user's own document to one they may not touch, so the server answers PERMISSION_DENIED
   and the SDK rejects the write — the same rejection a rules denial or a stale deploy produces. */
test("L11 save-failure · a denied display-name save shows an error (guard)", async ({ page }) => {
  const L = new Ledger("L11-save-failure");
  const ctx = { route: "Settings", size: "1440", state: "denied write" };
  await openShell(page, "/account/profile", { width: 1440, height: 900 }, false);
  const input = page.locator("#account-name");
  const saved = await input.inputValue();
  let rewrote = 0;
  await page.route(/google\.firestore\.v1\.Firestore\/Write\/channel/, async (route) => {
    const body = route.request().postData();
    if (body && /documents(%2F|\/)users(%2F|\/)/.test(body)) {
      rewrote++;
      await route.continue({ postData: body.replace(/(documents(?:%2F|\/)users(?:%2F|\/))([A-Za-z0-9]+)/g, "$1sa-e2e-denied-probe") });
    } else await route.continue();
  });
  await input.fill(saved + " x");
  await page.locator('#acct-panel button:has-text("Save")').click();
  const err = page.locator("#account-name-error");
  const shown = await err.waitFor({ state: "visible", timeout: 20_000 }).then(() => true).catch(() => false);
  L.check("L11 save-failure · write was re-addressed", ctx, rewrote > 0, `rewrote ${rewrote}`);
  L.check("L11 save-failure · error shown", ctx, shown, shown ? (await err.textContent()) ?? "" : "no error element");
  await page.unroute(/google\.firestore\.v1\.Firestore\/Write\/channel/);
  await page.locator('#acct-panel button:has-text("Discard")').click().catch(() => {});
  await page.reload(); await page.waitForTimeout(2500);
  L.check("L11 save-failure · nothing was written", ctx, (await page.locator("#account-name").inputValue()) === saved, "name unchanged after reload");
  L.write();
  expect(L.rows.length).toBe(3);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

/* ── L12 surfaces (ruling 1): splitting the window token moves no card or control surface ──
   ⚠️ TODAY'S EXACT COLOUR, STATED. The one LIVE surface reading the old token is the settings bar's
   "Back to app" hover (`.qc-card` has no renderer; `.sa-inline` and the Manuscripts cards render
   only inside the unrouted AllManuscripts). It is read, and must equal what it painted before. */
test("L12 surfaces · card and control surfaces keep today's colour", async ({ page }) => {
  const L = new Ledger("L12-surfaces");
  await openShell(page, "/account/profile", { width: 1440, height: 900 }, false);
  const back = page.locator(".ws-backapp");
  L.check("L12 surfaces · back-to-app present", { route: "Settings", size: "1440", state: "hover" }, (await back.count()) === 1, "");
  await back.hover();
  await page.waitForTimeout(150);
  const hoverBg = await back.evaluate((e) => getComputedStyle(e).backgroundColor);
  L.check("L12 surfaces · back-to-app hover", { route: "Settings", size: "1440", state: "hover" }, hoverBg === SURFACE, `bg ${hoverBg}`);
  L.write();
  expect(L.rows.length).toBeGreaterThan(1);
  expect(L.failures().map((f) => `${f.lock} — ${f.detail}`)).toEqual([]);
});

/* ── L13 page title (Phase 6, D8): the Contact list's title is Special Elite at the Query Centre's size ──
   ⚠️ THE TWO ARE MEASURED AGAINST EACH OTHER, NEVER A LITERAL ON BOTH SIDES, so a change to one title
   without the other goes red. Each page's narrow state (the QC's `--narrow` head, the Contact hero's
   stack) steps its title down on its own condition, so equality is asserted when both are in the same
   state and the pair is REPORTED otherwise. The Query Centre is confirmed, not changed. */
test("L13 page title · the Contact list's title matches the Query Centre's", async ({ page }) => {
  const L = new Ledger("L13-title");
  const read = (sel: string, narrowSel: string) => page.evaluate(([s, n]) => {
    const el = [...document.querySelectorAll(s)].find((e) => e.getBoundingClientRect().width > 0) as HTMLElement | undefined;
    if (!el) return null;
    const cs = getComputedStyle(el);
    const parent = el.parentElement!;
    return {
      fam: cs.fontFamily, size: cs.fontSize, narrow: !!el.closest(n),
      overflow: el.scrollWidth - el.clientWidth, right: el.getBoundingClientRect().right, parentRight: parent.getBoundingClientRect().right,
      hero: (el.closest(".clv-hero") as HTMLElement | null)?.getBoundingClientRect().width ?? 0,
    };
  }, [sel, narrowSel]);
  for (const vp of SIZES) for (const collapsed of [false, true]) {
    const ctx = { route: "Contact list", size: `${vp.width}`, state: collapsed ? "collapsed" : "expanded" };
    await openShell(page, "/queries", vp, collapsed);
    const qc = await read(".qcv-title", ".qcv-page--narrow");
    await openShell(page, "/agents", vp, collapsed);
    const cl = await read(".clv-hero-t", ".clv-hero--stack");
    L.check("L13 title · both found", ctx, !!qc && !!cl, `qc ${JSON.stringify(qc)} cl ${JSON.stringify(cl)}`);
    if (!qc || !cl) continue;
    L.check("L13 title · Special Elite", ctx, /^"?Special Elite"?/.test(cl.fam), `contact ${cl.fam}`);
    L.check("L13 title · QC confirmed Special Elite", ctx, /^"?Special Elite"?/.test(qc.fam), `qc ${qc.fam}`);
    /* ⚠️ THE QC'S SIZE IS A CEILING, REACHED WHEREVER THE HERO CAN HOLD IT. Beside the Archivist the Contact
       hero caps its text column at about a third of its width, so the title scales with the hero
       (contactV11.css) — never above the QC's, and equal to it from a 962px hero up. */
    const q = parseFloat(qc.size), c2 = parseFloat(cl.size);
    L.check("L13 title · never above the QC's size", ctx, c2 <= q + 0.1, `qc ${qc.size} contact ${cl.size}`);
    if (!qc.narrow && !cl.narrow && cl.hero >= 962) L.check("L13 title · the QC's size where the hero holds it", ctx, Math.abs(c2 - q) < 0.1, `qc ${qc.size} contact ${cl.size} hero ${cl.hero}`);
    console.log(`L13 ${vp.width} ${ctx.state}: qc ${qc.size} narrow=${qc.narrow} · contact ${cl.size} stacked=${cl.narrow} hero ${cl.hero}`);
    L.check("L13 title · never overflows its column", ctx, cl.overflow <= 0.5 && cl.right <= cl.parentRight + 0.5, `overflow ${cl.overflow} right ${cl.right} parent ${cl.parentRight}`);
  }
  L.write();
  expect(L.rows.length, "population floor").toBeGreaterThanOrEqual(26);
  expect(L.rows.filter((r) => r.lock === "L13 title · the QC's size where the hero holds it").length, "the equality branch ran").toBeGreaterThan(1);
  expect(L.failures().map((f) => `${f.lock} · ${f.size} ${f.state} — ${f.detail}`)).toEqual([]);
});
