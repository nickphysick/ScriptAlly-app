/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Search field v1 — the bar's search field is 280px when every tab keeps its name beside it, 168px when they only fit
 * beside that, and its 38px icon after; its right edge never moves (reports/search-field-v1.md). The rendered locks,
 * measured on the page and not read from the declaration, at 1512 × 900 and 1280 × 800 on Dashboard (one tab) and
 * Letters (five tabs):
 *
 *   SF-R1  the field is 280, 168 or 38 — and never narrower than the room allows (280 whenever the tabs fit beside 280
 *          with the 24px gap; 168 whenever they fit beside that)
 *   SF-R2  the field's right edge, and Log a query's left edge, are one x on both pages at one window size
 *   SF-R3  every tab keeps its name wherever the field is 280 or 168
 *   SF-R4  the last tab ends at least 24px before the field
 *
 * Each lock also runs against a mutation of its own and must see it (so a lock the base already satisfies is still
 * proved able to fail). SF-R1 is red on the base itself: there the field is 168 on every page.
 */
import { test, expect, type Page } from "@playwright/test";
import { openRoute } from "./measure";

const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }];
const PAGES = [{ name: "Dashboard", route: "/dashboard" }, { name: "Letters", route: "/materials/letters" }];
const WIDE = 280, OPEN = 168, ICON = 38, GAP = 24;

type Bar = {
  field: { left: number; right: number; w: number; label: boolean } | null;
  cap: number | null;
  tabs: { id: string; mode: string; right: number; named: boolean }[];
};

async function readBar(page: Page): Promise<Bar> {
  return page.evaluate(() => {
    const vis = (e: Element | null | undefined): e is HTMLElement => !!e && (e as HTMLElement).getBoundingClientRect().width > 0 && getComputedStyle(e as HTMLElement).visibility !== "hidden";
    const bar = [...document.querySelectorAll<HTMLElement>(".ws-pagebar")].find(vis) ?? null;
    const sf = bar?.querySelector<HTMLElement>(".ws-sfield");
    const sl = sf?.querySelector<HTMLElement>(".ws-sfield-l");
    const cap = [...(bar?.querySelectorAll<HTMLElement>(".ws-capb, .ws-cap--bar") ?? [])].find(vis);
    const nav = bar?.querySelector<HTMLElement>('[data-shell="tabs"]');
    const tabs = [...(nav?.querySelectorAll<HTMLElement>("[data-tab], .ws-ftmore") ?? [])].filter(vis).map((t) => {
      const label = t.querySelector<HTMLElement>(".ws-ftn, .ws-fttl");
      const mode = t.classList.contains("ws-ftmore") ? "more" : (t.dataset.mode ?? (t.classList.contains("is-cur") ? "cur" : "full"));
      const named = (mode === "cur" || mode === "full") && vis(label) && (label!.textContent ?? "").trim().length > 0 && label!.scrollWidth <= label!.clientWidth + 0.5;
      return { id: t.dataset.tab ?? "more", mode, right: t.getBoundingClientRect().right, named };
    });
    const r = sf && vis(sf) ? sf.getBoundingClientRect() : null;
    return {
      field: r ? { left: r.left, right: r.right, w: r.width, label: vis(sl) } : null,
      cap: cap ? cap.getBoundingClientRect().left : null,
      tabs,
    };
  });
}

const near = (a: number, b: number) => Math.abs(a - b) <= 0.75;
const which = (b: Bar) => (!b.field ? "none" : near(b.field.w, WIDE) ? "280" : near(b.field.w, OPEN) ? "168" : near(b.field.w, ICON) ? "38" : `${b.field.w.toFixed(1)}?`);
const lastRight = (b: Bar) => Math.max(0, ...b.tabs.map((t) => t.right));

function r1(b: Bar): string[] {
  if (!b.field) return ["no search field"];
  const w = which(b);
  if (w.endsWith("?") ) return [`the field is ${w} — not 280, 168 or 38`];
  const out: string[] = [];
  const end = lastRight(b) + GAP;
  /* the widest the room allows: 280 when the tabs end 24px short of where a 280 field would start */
  if (w === "168" && end <= b.field.right - WIDE + 0.5) out.push(`168 where 280 fits (tabs end ${(end - GAP).toFixed(1)}, a 280 field would start ${(b.field.right - WIDE).toFixed(1)})`);
  if (w === "38" && end <= b.field.right - OPEN + 0.5) out.push(`folded where 168 fits (tabs end ${(end - GAP).toFixed(1)})`);
  if (w !== "38" && !b.field.label) out.push(`the ${w} field hides its "Search" word`);
  return out;
}
function r3(b: Bar): string[] {
  if (!b.field || which(b) === "38") return [];
  return b.tabs.filter((t) => !t.named).map((t) => `${t.id} has lost its name (${t.mode}) beside a ${which(b)} field`);
}
function r4(b: Bar): string[] {
  if (!b.field || !b.tabs.length) return b.field ? [] : ["no search field"];
  const gap = b.field.left - lastRight(b);
  return gap < GAP - 0.5 ? [`the last tab ends ${gap.toFixed(1)}px before the field (< ${GAP})`] : [];
}
function r2(a: Bar, b: Bar): string[] {
  const out: string[] = [];
  if (!a.field || !b.field) return ["no search field"];
  if (!near(a.field.right, b.field.right)) out.push(`the field's right edge is ${a.field.right.toFixed(1)} on Dashboard, ${b.field.right.toFixed(1)} on Letters`);
  if (a.cap === null || b.cap === null) out.push("Log a query is not drawn");
  else if (!near(a.cap, b.cap)) out.push(`Log a query starts at ${a.cap.toFixed(1)} on Dashboard, ${b.cap.toFixed(1)} on Letters`);
  return out;
}

async function addBreak(page: Page, css: string) {
  await page.evaluate((c) => { const st = document.createElement("style"); st.dataset.sfBreak = ""; st.textContent = c; document.head.appendChild(st); }, css);
  await page.waitForTimeout(400);
}
async function dropBreaks(page: Page) {
  await page.evaluate(() => document.querySelectorAll("style[data-sf-break]").forEach((s) => s.remove()));
  await page.waitForTimeout(400);
}

/* each lock's own mutation: what it must see */
const BREAK_R1 = `.ws-pagebar .ws-sfield, .ws-pagebar .ws-sfield[data-wide] { width: 200px !important; }`;
const BREAK_R2 = `.ws-pagebar .ws-appctl { margin-right: 20px !important; }`;
const BREAK_R3 = `.ws-pagebar [data-shell="tabs"] .ws-ftn, .ws-pagebar [data-shell="tabs"] .ws-fttl { display: inline-block !important; max-width: 12px !important; overflow: hidden !important; }`;
/* the strip pushed under the field (a transform, so the fit never re-plans for it) */
const BREAK_R4 = `.ws-pagebar [data-shell="tabs"] { transform: translateX(1200px) !important; }`;

for (const size of SIZES) {
  test(`SF-R1…R4 · the search field at ${size.width} × ${size.height}: 280 / 168 / 38, right edge fixed, tabs named, 24px clear`, async ({ page }) => {
    test.setTimeout(240_000);
    const bars: Record<string, Bar> = {};
    const problems: string[] = [];
    const misses: string[] = [];
    for (const p of PAGES) {
      await openRoute(page, p.route, size);
      const b = await readBar(page);
      bars[p.name] = b;
      console.log(`[SF ${size.width}] ${p.name}: field ${which(b)} (left ${b.field?.left.toFixed(1)}, right ${b.field?.right.toFixed(1)}) · Log a query at ${b.cap?.toFixed(1)} · tabs ${b.tabs.map((t) => `${t.id}:${t.mode}${t.named ? "" : "!"}`).join(" ")} · clear by ${b.field ? (b.field.left - lastRight(b)).toFixed(1) : "-"}`);
      problems.push(...[...r1(b), ...r3(b), ...r4(b)].map((s) => `${p.name}: ${s}`));
      /* the mutations, one at a time, on this page */
      for (const [label, css, fn] of [["R1", BREAK_R1, r1], ["R3", BREAK_R3, r3], ["R4", BREAK_R4, r4]] as const) {
        if (label === "R3" && which(b) === "38") continue;
        await addBreak(page, css);
        const broken = fn(await readBar(page));
        await dropBreaks(page);
        console.log(`[SF ${size.width}] ${p.name} ${label} under its mutation: ${JSON.stringify(broken)}`);
        if (!broken.length) misses.push(`${p.name} ${label} did not see its own mutation`);
      }
      if (p.name === "Letters") {
        await addBreak(page, BREAK_R2);
        const broken = r2(bars.Dashboard, await readBar(page));
        await dropBreaks(page);
        console.log(`[SF ${size.width}] R2 under its mutation: ${JSON.stringify(broken)}`);
        if (!broken.length) misses.push("R2 did not see its own mutation");
      }
    }
    problems.push(...r2(bars.Dashboard, bars.Letters));
    console.log(`[SF ${size.width}] problems ${JSON.stringify(problems)}`);
    console.log(`[SF ${size.width}] mutation misses ${JSON.stringify(misses)}`);
    expect(problems, "the locks on the clean page").toEqual([]);
    expect(misses, "every lock sees its own mutation").toEqual([]);
  });
}
