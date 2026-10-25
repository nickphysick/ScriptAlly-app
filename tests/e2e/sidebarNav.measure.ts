/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Sidebar: short labels, Dashboard on its own, Tasks always visible (25 Oct) — the locks, on the rendered shell.
 *
 *   SB1  the sidebar reads "Queries" and "Packages"; the folder tab on /queries reads "Query Centre" and on
 *        /queries/packages "Submission packages"; the palette finds both pages by their full names
 *   SB2  one line: at 1512 and 1280, sidebar expanded, the Packages row is Versions' height and its PRO tag's right
 *        edge is Versions' (±1px)
 *   SB3  no heading above Dashboard
 *   SB4  never hidden: at 1512×982, 1440×900, 1280×800 and 1280×720 (and 1512×1000, where the full card shows), every nav row's box is clear of the feedback
 *        card's box, and the last Tasks row can be scrolled fully into view inside the nav
 *
 * Each was proved red before its green was believed: against the build before the change (`SA_E2E_BASE_URL=dev`
 * while dev served it) and, where named below, under `SB_MUTATE=<lock>`, an in-page break.
 */
import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const DIR = "reports/sidebar-short-labels/ledger";
const MUT = process.env.SB_MUTATE ?? "";
const MUTATIONS: Record<string, string> = {
  /* the reported fault: the FULL card kept up below the height where the column can hold it (the old 920 threshold) */
  SB4: `.ws-fbc { display: flex !important; } .ws-fbb { display: none !important; }`,
  /* …and the fade taken away, so an overflowing nav cuts its last row with nothing to say so */
  /* …and the fold set too high: the button where the full card fits */
  "SB4-hi": `.ws-fbc { display: none !important; } .ws-fbb { display: flex !important; }`,
  "SB4-fade": `.ws-navwrap > [aria-hidden="true"] { display: none !important; }`,
  /* the Packages row grows a second line's height */
  SB2: `button.ws-ni[aria-label="Packages"], button.ws-ni[aria-label="Submission packages"] { height: 48px !important; padding-right: 3px !important; }`,
};

type Row = { where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); }
  done(floor: number) {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(`${DIR}/${MUT ? "mut-" : ""}${this.name}.json`, JSON.stringify(this.rows, null, 1));
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${this.name} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

async function open(page: Page, route: string, size: { width: number; height: number }) {
  await openRoute(page, route, size);
  if (MUTATIONS[MUT]) await page.addStyleTag({ content: MUTATIONS[MUT] });
  await page.locator(".ws-nav:visible").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(1200);
}

/** Every visible nav row: its name and box. */
const navRows = (page: Page) => page.evaluate(() => [...document.querySelectorAll(".ws-nav button.ws-ni")]
  .filter((b) => (b as HTMLElement).offsetParent)
  .map((b) => { const r = b.getBoundingClientRect(); return { name: b.getAttribute("aria-label") ?? "", text: (b.querySelector(".ws-lbl")?.textContent ?? "").trim(), top: r.top, bottom: r.bottom, left: r.left, right: r.right, h: r.height }; }));

/* ── SB1 ── */
test("SB1 short labels in the sidebar, full names everywhere else", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("SB1");
  await open(page, "/queries", { width: 1512, height: 982 });
  const texts = (await navRows(page)).map((r) => r.text);
  L.check("the sidebar reads Queries", texts.includes("Queries") && !texts.includes("Query Centre"), JSON.stringify(texts));
  L.check("the sidebar reads Packages", texts.includes("Packages") && !texts.includes("Submission packages"), JSON.stringify(texts));
  const tabName = () => page.evaluate(() => ([...document.querySelectorAll(".ws-ftn[data-page-name]")].find((e) => (e as HTMLElement).offsetParent)?.textContent ?? "").trim());
  const sibName = (id: string) => page.evaluate((x) => { const e = [...document.querySelectorAll(`.ws-ftsib[data-sib="${x}"]`)].find((y) => (y as HTMLElement).offsetParent); return e ? (e.getAttribute("aria-label") ?? e.textContent ?? "").trim() : null; }, id);
  const qcTab = await tabName();
  L.check("the folder tab on /queries reads Query Centre", qcTab === "Query Centre", qcTab);
  const pkSib = await sibName("q-pkg");
  L.check("…and its Packages sibling is named Submission packages", pkSib === "Submission packages", String(pkSib));
  await page.goto("/queries/packages"); await page.waitForTimeout(1500);
  const pkTab = await tabName();
  L.check("the folder tab on /queries/packages reads Submission packages", pkTab === "Submission packages", pkTab);
  const qcSib = await sibName("q-centre");
  L.check("…and its Queries sibling is named Query Centre", qcSib === "Query Centre", String(qcSib));
  for (const full of ["Query Centre", "Submission packages"]) {
    await page.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k");
    await page.waitForTimeout(400);
    await page.keyboard.type(full); await page.waitForTimeout(500);
    const hits = await page.evaluate(() => [...document.querySelectorAll('[role="option"] .sp-t1')].map((e) => (e.textContent ?? "").trim()));
    L.check(`the palette finds "${full}" by its full name`, hits.some((h) => h === full), JSON.stringify(hits.slice(0, 8)));
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  }
  L.done(8);
});

/* ── SB2 ── */
for (const size of [{ width: 1512, height: 982 }, { width: 1280, height: 832 }]) {
  test(`SB2 the Packages row is one line like Versions at ${size.width}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`SB2-${size.width}`);
    await open(page, "/queries/packages", size);
    const r = await page.evaluate(() => ["Packages", "Submission packages", "Versions"].map((n) => {
      const b = [...document.querySelectorAll(`button.ws-ni[aria-label="${n}"]`)].find((e) => (e as HTMLElement).offsetParent) as HTMLElement | undefined;
      if (!b) return null;
      const t = b.querySelector(".ws-qpro"), l = b.querySelector(".ws-lbl") as HTMLElement;
      return { n, h: b.getBoundingClientRect().height, tagR: t?.getBoundingClientRect().right ?? null, tagL: t?.getBoundingClientRect().left ?? null, lblR: l.getBoundingClientRect().right, cut: l.scrollWidth > l.clientWidth + 0.5 };
    }));
    const pk = r[0] ?? r[1], ver = r[2];
    L.check("both rows are on screen", !!pk && !!ver, JSON.stringify(r));
    if (pk && ver) {
      L.check("same height as Versions (±1)", Math.abs(pk.h - ver.h) <= 1, `${pk.h} vs ${ver.h}`);
      L.check("PRO tag's right edge where Versions' is (±1)", pk.tagR != null && ver.tagR != null && Math.abs(pk.tagR - ver.tagR) <= 1, `${pk.tagR} vs ${ver.tagR}`);
      L.check("the label is whole, not cut", !pk.cut, JSON.stringify(pk));
      L.check("the label stops before its tag", pk.tagL != null && pk.lblR <= pk.tagL + 0.5, `${pk.lblR} vs ${pk.tagL}`);
    }
    L.done(5);
  });
}

/* ── SB3 ── */
test("SB3 no heading above Dashboard", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("SB3");
  await open(page, "/dashboard", { width: 1512, height: 982 });
  const r = await page.evaluate(() => {
    const nav = [...document.querySelectorAll(".ws-nav")].find((e) => (e as HTMLElement).offsetParent) as HTMLElement;
    const kids = [...nav.querySelectorAll(".ws-glabel, button.ws-ni")].filter((e) => (e as HTMLElement).offsetParent || e.classList.contains("ws-glabel"));
    const first = kids[0];
    const heads = [...nav.querySelectorAll(".ws-glabel")].map((h) => (h.textContent ?? "").trim());
    const sw = document.querySelector("#ws-sidebar .ws-ms")?.getBoundingClientRect();
    const d = (first as HTMLElement | undefined)?.getBoundingClientRect();
    const h = nav.querySelector(".ws-glabel")?.getBoundingClientRect();
    return { first: first?.className ?? "", firstName: first?.getAttribute("aria-label") ?? first?.textContent ?? "", heads,
      above: sw && d ? d.top - sw.bottom : null, below: d && h ? h.top - d.bottom : null };
  });
  L.check("the first thing in the nav is the Dashboard row", /ws-ni/.test(r.first) && r.firstName === "Dashboard", JSON.stringify(r));
  L.check("no WORKSPACE heading", !r.heads.some((h) => /workspace/i.test(h)), JSON.stringify(r.heads));
  L.check("the four group headings, in order", JSON.stringify(r.heads.map((h) => h.toUpperCase())) === JSON.stringify(["QUERIES", "AGENTS", "YOUR BOOK", "TASKS"]), JSON.stringify(r.heads));
  /* the ref's spacing: Dashboard 11px under the selector, the first heading 15px under Dashboard */
  L.check("Dashboard sits 11px under the manuscript selector (±1)", r.above != null && Math.abs(r.above - 11) <= 1, String(r.above));
  L.check("the first heading sits 15px under Dashboard (±1)", r.below != null && Math.abs(r.below - 15) <= 1, String(r.below));
  L.done(5);
});

/* ── SB4 ── */
for (const size of [{ width: 1512, height: 1000 }, { width: 1512, height: 982 }, { width: 1440, height: 900 }, { width: 1280, height: 800 }, { width: 1280, height: 720 }]) {
  test(`SB4 no nav row under the feedback card at ${size.width}×${size.height}`, async ({ page }) => {
    test.setTimeout(180_000);
    const L = new Ledger(`SB4-${size.width}x${size.height}`);
    await open(page, "/queries/packages", size);
    const fb = await page.evaluate(() => {
      const f = [...document.querySelectorAll('[data-shell="feedback"]')].find((e) => (e as HTMLElement).offsetParent) as HTMLElement | undefined;
      const vis = f ? [...f.children].find((c) => getComputedStyle(c).display !== "none") as HTMLElement | undefined : undefined;
      const r = (vis ?? f)?.getBoundingClientRect();
      return r ? { top: r.top, bottom: r.bottom, form: vis?.className ?? "" } : null;
    });
    const rows = await navRows(page);
    const navBox = await page.evaluate(() => { const n = [...document.querySelectorAll(".ws-nav")].find((e) => (e as HTMLElement).offsetParent)!.getBoundingClientRect(); return { top: n.top, bottom: n.bottom }; });
    L.check("the card and the rows are on screen", !!fb && rows.length >= 12, JSON.stringify({ fb, rows: rows.length }));
    /* a row inside the nav's scroll region but scrolled out of its box is hidden by the region, not the card */
    const inView = rows.filter((r) => r.bottom > navBox.top + 0.5 && r.top < navBox.bottom - 0.5);
    /* a row's VISIBLE box is its box clipped by the nav's scroll region — what a reader can see of it */
    const under = fb ? inView.map((r) => ({ ...r, top: Math.max(r.top, navBox.top), bottom: Math.min(r.bottom, navBox.bottom) }))
      .filter((r) => r.bottom > fb.top + 0.5 && r.top < fb.bottom - 0.5) : [];
    L.check("no nav row's box meets the feedback card's", under.length === 0, JSON.stringify({ fb, under: under.map((r) => [r.name, r.top, r.bottom]) }));
    L.check("the nav region ends above the card", !!fb && navBox.bottom <= fb.top + 0.5, JSON.stringify({ navBox, fb }));
    /* the fold: wherever the FULL card shows, every row is wholly visible; where the nav must scroll, its edge fade says so */
    const st = await page.evaluate(() => {
      const n = [...document.querySelectorAll(".ws-nav")].find((e) => (e as HTMLElement).offsetParent) as HTMLElement;
      /* the fades are EdgeFadeScroll's two overlays in the nav's own frame — nothing else counts as one */
      const wrap = n.parentElement as HTMLElement;
      const fades = wrap.classList.contains("ws-navwrap") ? ([...wrap.children].filter((c) => c !== n && getComputedStyle(c).display !== "none") as HTMLElement[]) : [];
      return { over: n.scrollHeight - n.clientHeight, top: n.scrollTop, bottomFade: fades.length ? getComputedStyle(fades[fades.length - 1]).opacity : null };
    });
    const fullCard = fb?.form === "ws-fbc";
    L.check(fullCard ? "the full card shows only where every row fits" : "the folded button where the full card would cut a row",
      fullCard ? st.over <= 1 : true, JSON.stringify({ form: fb?.form, ...st }));
    /* …and the card is not folded where it fits: 1000 tall is above the derived 995 */
    L.check("where the column holds it (≥995 tall), the full card shows", size.height < 995 || fullCard, JSON.stringify({ h: size.height, form: fb?.form }));
    L.check("an overflowing nav shows its bottom edge fade", st.over <= 3 || st.bottomFade === "1", JSON.stringify(st));
    /* the last Tasks row, scrolled into view inside the nav, is wholly visible */
    const last = await page.evaluate(() => {
      const nav = [...document.querySelectorAll(".ws-nav")].find((e) => (e as HTMLElement).offsetParent) as HTMLElement;
      const rows = [...nav.querySelectorAll("button.ws-ni")];
      const b = rows[rows.length - 1] as HTMLElement;
      b.scrollIntoView({ block: "nearest" });
      const n = nav.getBoundingClientRect(), r = b.getBoundingClientRect();
      return { name: b.getAttribute("aria-label"), top: r.top, bottom: r.bottom, navTop: n.top, navBottom: n.bottom };
    });
    await page.waitForTimeout(200);
    L.check("the last Tasks row can be scrolled fully into view", last.top >= last.navTop - 0.5 && last.bottom <= last.navBottom + 0.5 && (!fb || last.bottom <= fb.top + 0.5), JSON.stringify(last));
    L.done(7);
  });
}
