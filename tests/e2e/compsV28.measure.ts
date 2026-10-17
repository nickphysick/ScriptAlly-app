/**
 * Comparable titles v28 — the CX28 locks (design-refs/comps-v28/), on the v25 fixture (seedCompsV25.mjs), at 1512×900
 * and 1280×800 unless a lock says otherwise.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test tests/e2e/compsV28.measure.ts --workers=1
 *
 * ⚠️ READINGS, NEVER CRASHES: every probe returns null or [] for a missing element, and the lock names it. On a build
 *    without v28 every lock is red at a named reading (red first).
 * ⚠️ EVERY WRITE IS UNDONE IN THE SAME RUN: a lock that saves re-seeds the fixture in `finally` (delete-before-write).
 * ⚠️ EXPECTED VALUES ARE THE FIXTURE'S OWN FACTS, worked out here from its statuses and dates (see FIX), never read
 *    back off the page they are checking.
 * ⚠️ NO REGEX INSIDE `page.evaluate`: text is returned to Node and matched here.
 */
import { expect, test, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { MS, MS_EMPTY, SIZES, dump, openCx, scrollTo as scrollToRaw, seed, type Vp } from "./cx28Lib";

const LEDGER = "reports/comps-v28/ledger.jsonl";
const FLOOR = 120;
mkdirSync("reports/comps-v28", { recursive: true });
let n = 0;
const note = (lock: string, vp: Vp | null, what: string, value: unknown, ok: boolean) => {
  n++;
  appendFileSync(LEDGER, JSON.stringify({ lock, vp: vp ? `${vp.width}x${vp.height}` : null, what, value, ok }) + "\n");
};
/** expect + ledger in one: the reading is recorded whether it passes or not */
/** key-order-free, as `toEqual` is */
const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as object).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, canon(x)])) : v);
const check = (lock: string, vp: Vp | null, what: string, value: unknown, want: unknown) => {
  const ok = JSON.stringify(canon(value)) === JSON.stringify(canon(want));
  note(lock, vp, what, value, ok);
  expect(value, `${lock} ${vp ? vp.width : ""} · ${what}`).toEqual(want);
};
const truthy = (lock: string, vp: Vp | null, what: string, value: unknown) => {
  note(lock, vp, what, value, !!value);
  expect(value, `${lock} ${vp ? vp.width : ""} · ${what}`).toBeTruthy();
};

/* ── the fixture's facts (seedCompsV25.mjs) ── */
const NOW = new Date().getFullYear();
const FIX = {
  titles: ["The Tidewater Line", "Salt Road", "Nine Miles Out", "Bright Water", "Kestrel Hour", "The Ferry at Dusk", "Last Crossing"],
  year: { "The Tidewater Line": 2021, "Salt Road": 2023, "Nine Miles Out": 2022, "Bright Water": 2024, "Kestrel Hour": 2019, "The Ferry at Dusk": 2025, "Last Crossing": 2023 } as Record<string, number>,
  kind: { "Nine Miles Out": "tv", "Last Crossing": "film" } as Record<string, string>,
  /** where each comp is used: v2 (sent, recorded) names Tidewater and Salt; v3 (unsent) names Tidewater and Last Crossing */
  where: { "The Tidewater Line": "sent", "Salt Road": "sent", "Last Crossing": "unsent" } as Record<string, string>,
  /** the 14 queries' statuses: v1 (5 queries, unrecorded) = 01–05, v2 = 06–14 */
  v1: ["Rejected", "Rejected", "Queried", "Queried", "Partial Sent"],
  v2: ["Partial Requested", "Partial Requested", "Offer", "Full Requested", "Full Sent", "Partial Sent", "Rejected", "Queried", "Queried"],
};
/** the analytics "reached a request" rule, restated as the fixture's statuses can show it (partial, full, R&R, offer) */
const ASKED = new Set(["Partial Requested", "Partial Sent", "Full Requested", "Full Sent", "Revise & Resubmit", "Offer", "Signed"]);
const asked = (xs: string[]) => xs.filter((s) => ASKED.has(s)).length;
const pct = (a: number, b: number) => Math.round((a / b) * 100);
const ALL = [...FIX.v1, ...FIX.v2];

/* ── page probes (return plain data; null when absent) ── */
/** the subject must be on the page before anything scrolls to it or clicks it: its absence is a named red, never a crash or a timeout */
const need = async (page: Page, lock: string, vp: Vp, sel: string, what: string) => {
  const ok = await page.evaluate((x) => { try { return !!(window as any).__q(x); } catch { return false; } }, sel);
  note(lock, vp, `${what} is on the page`, ok, ok);
  expect(ok, `${lock} ${vp.width} · ${what} is on the page`).toBe(true);
};
const scrollTo = async (page: Page, sel: string, top = 12) => {
  const ok = await page.evaluate((x) => { try { return !!(window as any).__q(x); } catch { return false; } }, sel);
  if (ok) await scrollToRaw(page, sel, top);
};
const q = (page: Page, sel: string) => page.evaluate((s) => { try { const e = (window as any).__q(s) as HTMLElement | null; return e ? (e.textContent ?? "").replace(/\s+/g, " ").trim() : null; } catch { return null; } }, sel);
const has = (page: Page, sel: string) => page.evaluate((s) => { try { return !!(window as any).__q(s); } catch { return false; } }, sel);
const count = (page: Page, sel: string) => page.evaluate((s) => { try { return ((window as any).__qa(s) as Element[]).length; } catch { return -1; } }, sel);
const anyDoc = (page: Page, sel: string) => page.evaluate((s) => [...document.querySelectorAll(s)].some((e) => (e as HTMLElement).getBoundingClientRect().height > 0), sel);
const cardTitles = (page: Page) => page.evaluate(() => { try { return ((window as any).__qa('[data-cx="card"]') as HTMLElement[]).map((e) => e.getAttribute("aria-label")); } catch { return []; } });
const card = (page: Page, title: string) => page.locator(`[data-cv="page"]:visible [data-cx="card"][aria-label="${title}"]`);
const active = (page: Page) => page.evaluate(() => { const a = document.activeElement as HTMLElement | null; return a ? (a.getAttribute("data-cx-key") ?? a.getAttribute("data-cv") ?? a.tagName) : null; });

/* not serial: a red lock must not stop the others (red first runs every lock on the base). One worker keeps the order. */
test.setTimeout(300_000);
/* ⚠️ ONCE PER RUN, NOT PER WORKER: a failing test restarts the worker and runs beforeAll again, which would wipe the
   readings already taken. The runner's pid (the worker's parent) names the run. */
const RUN = "reports/comps-v28/.ledger-run";
test.beforeAll(() => {
  const id = String(process.ppid);
  if (!existsSync(RUN) || readFileSync(RUN, "utf8") !== id) { writeFileSync(LEDGER, ""); writeFileSync(RUN, id); }
  seed("--empty");
});
test.afterAll(() => { seed("--empty"); });

/* ═══ H1 · the same header ═══ */
test("H1 · same header: LightHeader when populated, EmptyPanel when empty; no v27 title panel; Analytics' values where it has one", async ({ page }) => {
  for (const vp of SIZES) {
    await openCx(page, vp);
    truthy("H1", vp, "populated: the shared LightHeader is the header", await has(page, '[data-slh="header"].slh.cx-lh'));
    check("H1", vp, "populated: no EmptyPanel", await has(page, '[data-epn="panel"]'), false);
    check("H1", vp, "populated: no v27 title panel", await has(page, '[data-hp3="title"], .cv-panel'), false);
    const mine = await page.evaluate(() => {
      const w = window as any, cs = (s: string) => { const e = w.__q(s) as HTMLElement | null; return e ? getComputedStyle(e) : null; };
      const h = cs(".slh-h1"), k = cs(".slh-k"), by = cs(".slh-by"), b = cs(".slh-p1"), c = cs(".slh-card"), hd = cs(".slh");
      return h && k && by && b && c && hd ? { h1: [h.fontFamily, h.fontSize], k: [k.fontSize, k.letterSpacing, k.color], by: by.fontSize, btn: [b.fontSize, b.paddingTop, b.paddingLeft], card: c.borderTopLeftRadius, pad: [hd.paddingTop, hd.paddingBottom] } : null;
    });
    truthy("H1", vp, "populated: the header's values were read", mine);
    await openCx(page, vp, { ms: MS_EMPTY });
    truthy("H1", vp, "empty: the shared EmptyPanel is the header", await has(page, '[data-epn="panel"].epn.cx-empty-panel'));
    check("H1", vp, "empty: no LightHeader", await has(page, '[data-slh="header"]'), false);
    check("H1", vp, "empty: no v27 title panel", await has(page, '[data-hp3="title"], .cv-panel'), false);
    /* Analytics' light header, where this build has one (Analytics v21+ is on dev; main's Analytics is v17) */
    await page.goto("/queries/analytics");
    await page.waitForTimeout(2500);
    const an = await page.evaluate(() => {
      const root = [...document.querySelectorAll('[data-a21="header"]')].find((e) => (e as HTMLElement).getBoundingClientRect().height > 0) as HTMLElement | undefined;
      if (!root) return null;
      const cs = (s: string) => { const e = root.querySelector(s) as HTMLElement | null; return e ? getComputedStyle(e) : null; };
      const h = cs("h1"), k = cs(".a21-k"), by = cs(".a21-by"), b = cs(".a21-p1"), c = getComputedStyle(root.querySelector(".a21-card")!), hd = getComputedStyle(root);
      return h && k && by && b ? { h1: [h.fontFamily, h.fontSize], k: [k.fontSize, k.letterSpacing, k.color], by: by.fontSize, btn: [b.fontSize, b.paddingTop, b.paddingLeft], card: c.borderTopLeftRadius, pad: [hd.paddingTop, hd.paddingBottom] } : null;
    });
    note("H1", vp, "Analytics' light header on this build", an ? "present" : "absent", true);
    if (an && mine) check("H1", vp, "comps' header values equal Analytics'", mine, an);
  }
});

/* ═══ H2 · the card ═══ */
test("H2 · card: the three counts are the shelf's partition and sum to the comp count; the ring is logged ÷ sent; a row filters", async ({ page }) => {
  const want = { sent: FIX.titles.filter((t) => FIX.where[t] === "sent").length, draft: FIX.titles.filter((t) => FIX.where[t] === "unsent").length };
  const shelf = FIX.titles.length - want.sent - want.draft;
  const ring = pct(FIX.v2.length, ALL.length);
  for (const vp of SIZES) {
    await openCx(page, vp);
    const rows = await page.evaluate(() => { try { return ((window as any).__qa('[data-slh="row"]') as HTMLElement[]).map((r) => [r.getAttribute("data-k"), Number(r.querySelector('[data-slh="n"]')?.textContent)]); } catch { return []; } });
    check("H2", vp, "the card's rows", rows, [["sent", want.sent], ["draft", want.draft], ["shelf", shelf]]);
    check("H2", vp, "the title's number", await q(page, '[data-slh="title"] b'), String(FIX.titles.length));
    const byWhere = await page.evaluate(() => { const o: Record<string, number> = {}; for (const c of (window as any).__qa('[data-cx="card"]') as HTMLElement[]) { const w = c.getAttribute("data-where")!; o[w] = (o[w] ?? 0) + 1; } return o; });
    check("H2", vp, "the cards' own where-used, counted", byWhere, { sent: want.sent, unsent: want.draft, none: shelf });
    check("H2", vp, "the ring", await q(page, '[data-slh="ring-pct"]'), `${ring}%`);
    check("H2", vp, "the ring's line", await q(page, '[data-slh="ring-sub"]'), `${FIX.v2.length} of ${ALL.length} sent name their comps`);
    await page.locator('[data-cv="page"]:visible [data-slh="row"][data-k="draft"] button').click();
    await page.waitForTimeout(400);
    check("H2", vp, "pressed: the row's aria-pressed", await page.evaluate(() => (window as any).__q('[data-slh="row"][data-k="draft"] button')?.getAttribute("aria-pressed")), "true");
    check("H2", vp, "pressed: the shelf's segment follows", await page.evaluate(() => (window as any).__q('[data-cx="seg-btn"][data-f="draft"]')?.getAttribute("aria-pressed")), "true");
    check("H2", vp, "pressed: the cards shown", await cardTitles(page), FIX.titles.filter((t) => FIX.where[t] === "unsent"));
    await scrollTo(page, '[data-cx="header"]', 0);
    await page.locator('[data-cv="page"]:visible [data-slh="row"][data-k="draft"] button').click();
    await page.waitForTimeout(300);
    check("H2", vp, "pressed again: cleared", (await cardTitles(page)).length, FIX.titles.length);
  }
});

/* ═══ H3 · the empty page ═══ */
test("H3 · empty: the panel and the steps card only; b1 opens the first-comp form with the explainer; b2 the explainer pop-up", async ({ page }) => {
  for (const vp of SIZES) {
    await openCx(page, vp, { ms: MS_EMPTY });
    truthy("H3", vp, "the panel", await has(page, '[data-cx="empty-panel"]'));
    truthy("H3", vp, "the steps card", await has(page, '[data-cv="empty"] [data-cv="steps"]'));
    check("H3", vp, "the steps' foot line", await q(page, '[data-cv="steps-note"]'), "Two or three comps in a letter is usual. Keep more on your shelf to choose from.");
    check("H3", vp, "no door into the picker under the card", await has(page, '[data-cv="empty"] [data-cv="how-pick"]'), false);
    check("H3", vp, "no notice, shelf or band", [await has(page, '[data-cx="notice"]'), await has(page, '[data-cx="shelf"]'), await has(page, '[data-cx="landing"]')], [false, false, false]);
    check("H3", vp, "no Scout tab", await anyDoc(page, '[data-ftab="scout"]'), false);
    await page.locator('[data-cv="page"]:visible [data-cx="add-first"]').click();
    await page.waitForTimeout(600);
    check("H3", vp, "b1: the form's title", await page.evaluate(() => document.querySelector('[data-cv="drawer-title"]')?.textContent ?? null), "Add your first comp");
    truthy("H3", vp, "b1: the explainer is open", await anyDoc(page, '[data-cf="explain"]'));
    await page.keyboard.press("Escape"); await page.waitForTimeout(500);
    await page.locator('[data-cv="page"]:visible [data-cx="explain"]').click();
    await page.waitForTimeout(500);
    truthy("H3", vp, "b2: the explainer pop-up", await anyDoc(page, '[data-cx="explain-pop"] [data-cf="explain"]'));
    check("H3", vp, "b2: the pop-up has no hide link", await anyDoc(page, '[data-cx="explain-pop"] [data-cf="explain-hide"]'), false);
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  }
});

/* ═══ N1 · the notice ═══ */
test("N1 · notice: one banner, its copy by the one/several rule, its button opens the picker on the first unrecorded letter", async ({ page }) => {
  for (const vp of SIZES) {
    await openCx(page, vp);
    check("N1", vp, "one letter: banners", await count(page, '[data-cx="notice"]'), 1);
    check("N1", vp, "one letter: the copy", await q(page, '[data-cx="notice"] p'), `Query letter v1 went out with ${FIX.v1.length} queries before its comps were logged. Log what it named and those queries count too.`);
    check("N1", vp, "one letter: the button", await q(page, '[data-cx="notice-log"]'), "Log it now");
    await page.locator('[data-cv="page"]:visible [data-cx="notice-log"]').click();
    await page.waitForTimeout(500);
    check("N1", vp, "the picker opens on that letter", await page.evaluate(() => document.querySelector('[data-cv="picker"]')?.getAttribute("data-letter") ?? null), "cv25-let-1");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  }
  try {
    seed("--variant", "two-unrecorded");
    for (const vp of SIZES) {
      await openCx(page, vp);
      check("N1", vp, "two letters: still one banner", await count(page, '[data-cx="notice"]'), 1);
      check("N1", vp, "two letters: the copy", await q(page, '[data-cx="notice"] p'), `2 letters went out with ${ALL.length} queries before their comps were logged. Log what they named and those queries count too.`);
      check("N1", vp, "two letters: the button", await q(page, '[data-cx="notice-log"]'), "Log them now");
      await page.locator('[data-cv="page"]:visible [data-cx="notice-log"]').click();
      await page.waitForTimeout(500);
      check("N1", vp, "two letters: the picker opens on the first", await page.evaluate(() => document.querySelector('[data-cv="picker"]')?.getAttribute("data-letter") ?? null), "cv25-let-1");
      await page.keyboard.press("Escape"); await page.waitForTimeout(300);
    }
  } finally { seed("--empty"); }
});

/* ═══ S1 · the grid and the toolbar ═══ */
test("S1 · grid: 3 columns at 1512, 2 at 1280; the toolbar one row, no overflow, at 1024/1280/1512; the add card last, gone while filtered", async ({ page }) => {
  for (const vp of [...SIZES, { width: 1024, height: 768 }]) {
    await openCx(page, vp);
    const g = await page.evaluate(() => {
      const w = window as any, grid = w.__q('[data-cx="grid"]') as HTMLElement | null, tools = w.__q('[data-cx="tools"]') as HTMLElement | null;
      if (!grid || !tools) return null;
      const kids = [...tools.children].filter((e) => (e as HTMLElement).offsetWidth > 0 && !(e as HTMLElement).classList.contains("cx-grow")) as HTMLElement[];
      const find = tools.querySelector('[data-cx="find"]') as HTMLElement;
      const rows = new Set(kids.filter((k) => k !== find).map((k) => Math.round(k.getBoundingClientRect().top)));
      return {
        cols: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        overflow: tools.scrollWidth - tools.clientWidth,
        rowsBesideFind: rows.size,
        findBesideRest: Math.round(find.getBoundingClientRect().top) === [...rows][0],
        findW: Math.round(find.getBoundingClientRect().width),
        spare: Math.round((tools.querySelector(".cx-grow") as HTMLElement | null)?.getBoundingClientRect().width ?? 0),
        last: (grid.lastElementChild as HTMLElement | null)?.getAttribute("data-cx") ?? null,
      };
    });
    truthy("S1", vp, "the grid and toolbar were read", g);
    if (!g) continue;
    if (vp.width !== 1024) check("S1", vp, "grid columns", g.cols, vp.width >= 1300 ? 3 : 2);
    check("S1", vp, "the toolbar overflows by", g.overflow <= 0 ? 0 : g.overflow, 0);
    check("S1", vp, "the toolbar's rows (find aside)", g.rowsBesideFind, 1);
    check("S1", vp, "find shares the row (it may wrap below 1100 only)", g.findBesideRest, vp.width >= 1100);
    /* flex 0 1 230px: never wider than 230, and exactly 230 whenever the row has room to spare (the spacer is wider than
       nothing). "Between 150 and 230" alone passed `flex: 1`, which shares the spare with the spacer and settles at 150. */
    if (vp.width >= 1100) check("S1", vp, "find: 230 when the row has room, never wider, never under 150", g.findW <= 230 && g.findW >= 150 && (g.spare === 0 || g.findW === 230), true);
    note("S1", vp, "find width · the row's spare", [g.findW, g.spare], true);
    check("S1", vp, "the add card is last", g.last, "add-card");
    await page.locator('[data-cv="page"]:visible [data-cx="find-input"]').fill("Salt");
    await page.waitForTimeout(300);
    check("S1", vp, "filtered: no add card", await has(page, '[data-cx="add-card"]'), false);
  }
});

/* ═══ S2 · the card's slip ═══ */
test("S2 · card: the slip by state (sent, draft, shelf-ready, not ready); no hover action buttons", async ({ page }) => {
  const salt = FIX.v2;
  for (const vp of SIZES) {
    await openCx(page, vp);
    const slip = (t: string) => page.evaluate((title) => {
      const c = ((window as any).__qa('[data-cx="card"]') as HTMLElement[]).find((e) => e.getAttribute("aria-label") === title);
      if (!c) return null;
      const s = c.querySelector('[data-cx="slip"]') as HTMLElement;
      return { kind: s.getAttribute("data-slip"), row2: (s.querySelector('[data-cx="slip-2"]')?.textContent ?? "").replace(/\s+/g, " ").trim(), buttons: [...c.querySelectorAll("button")].map((b) => b.getAttribute("data-cx")) };
    }, t);
    check("S2", vp, "sent (Salt Road)", await slip("Salt Road"), { kind: "sent", row2: `${salt.length} queries${asked(salt)} asked for more${pct(asked(salt), salt.length)}%`, buttons: [] });
    check("S2", vp, "draft (Last Crossing)", await slip("Last Crossing"), { kind: "draft", row2: "Waiting to go out with QL v3", buttons: [] });
    check("S2", vp, "shelf, ready (Bright Water)", await slip("Bright Water"), { kind: "shelf", row2: "On your shelf, ready for a letterLog in a letter", buttons: ["slip-pick"] });
    check("S2", vp, "not ready (The Ferry at Dusk)", await slip("The Ferry at Dusk"), { kind: "notready", row2: "!A letter can name it once it has a publisher.Add publisher", buttons: ["slip-edit"] });
    const extra = await page.evaluate(() => ((window as any).__qa('[data-cx="card"] button') as HTMLElement[]).map((b) => b.getAttribute("data-cx")).filter((x) => x !== "slip-pick" && x !== "slip-edit"));
    check("S2", vp, "buttons on cards other than the slip's link", extra, []);
  }
});

/* ═══ S3 · the age chip ═══ */
test("S3 · age: the chip's text and tone from the year (render); no year, no chip", async ({ page }) => {
  for (const vp of SIZES) {
    await openCx(page, vp);
    const chips = await page.evaluate(() => ((window as any).__qa('[data-cx="card"]') as HTMLElement[]).map((c) => { const a = c.querySelector('[data-cx="age"]'); return [c.getAttribute("aria-label"), a ? a.textContent : null, a ? a.getAttribute("data-tone") : null, a ? a.getAttribute("title") : null]; }));
    const want = FIX.titles.map((t) => {
      const age = Math.max(0, NOW - FIX.year[t]);
      const tone = age > 5 ? "old" : age <= 1 ? "new" : "mid";
      return [t, age === 0 ? "This year" : age === 1 ? "1 yr old" : `${age} yrs old`, tone, tone === "old" ? "Agents usually look for comps from the last five years" : `Published ${FIX.year[t]}`];
    });
    check("S3", vp, "every card's chip", chips, want);
    note("S3", vp, "branches the fixture enters", [...new Set(want.map((w) => w[2]))].sort(), true);
  }
});

/* ═══ S4 · the sort ═══ */
test("S4 · sort: each order as the table says; Best response puts never-sent comps last", async ({ page }) => {
  const sentT = FIX.titles.filter((t) => FIX.where[t] === "sent");
  const rest = FIX.titles.filter((t) => FIX.where[t] !== "sent");
  const az = [...FIX.titles].sort((a, b) => a.replace(/^The /, "").localeCompare(b.replace(/^The /, "")));
  const newest = FIX.titles.map((t, i) => ({ t, i })).sort((a, b) => FIX.year[b.t] - FIX.year[a.t] || a.i - b.i).map((x) => x.t);
  const want: Record<string, string[]> = { own: FIX.titles, queries: [...sentT, ...rest], rate: [...sentT, ...rest], newest, az };
  for (const vp of SIZES) {
    await openCx(page, vp);
    await need(page, "S4", vp, '[data-cx="sort-btn"]', "the sort button");
    for (const k of ["queries", "rate", "newest", "az", "own"]) {
      await page.locator('[data-cv="page"]:visible [data-cx="sort-btn"]').click();
      await page.locator(`[data-cv="page"]:visible [data-cx="sort-menu"] [data-sort="${k}"]`).click();
      await page.waitForTimeout(250);
      check("S4", vp, `sorted by ${k}`, await cardTitles(page), want[k]);
    }
  }
});

/* ═══ S5 · the filters ═══ */
test("S5 · filters: where, type and find compose (AND); the type toggles hide in compact; Clear restores all", async ({ page }) => {
  for (const vp of SIZES) {
    await openCx(page, vp);
    const wide = vp.width >= 1300;
    check("S5", vp, "type toggles shown (three types on the shelf; hidden in compact)", await page.evaluate(() => { const t = (window as any).__q('[data-cx="types"]') as HTMLElement | null; return !!t && t.offsetWidth > 0; }), wide);
    const seg = (f: string) => page.locator(`[data-cv="page"]:visible [data-cx="seg-btn"][data-f="${f}"]`).click();
    await seg("shelf"); await page.waitForTimeout(200);
    check("S5", vp, "on your shelf", await cardTitles(page), FIX.titles.filter((t) => !FIX.where[t]));
    if (wide) {
      await page.locator('[data-cv="page"]:visible [data-cx="type-btn"][data-k="tv"]').click(); await page.waitForTimeout(200);
      check("S5", vp, "on your shelf AND TV", await cardTitles(page), ["Nine Miles Out"]);
      await seg("sent"); await page.waitForTimeout(200);
      check("S5", vp, "in a sent letter AND TV: none", [await cardTitles(page), await has(page, '[data-cx="no-match"]')], [[], true]);
    }
    await seg("shelf"); await page.waitForTimeout(150);
    await page.locator('[data-cv="page"]:visible [data-cx="find-input"]').fill("orion"); await page.waitForTimeout(250);
    check("S5", vp, "where AND find (publisher)", await cardTitles(page), wide ? [] : ["Kestrel Hour"]);
    check("S5", vp, "the showing line", await q(page, '[data-cx="showing"]'), wide ? `Showing 0 of ${FIX.titles.length}Clear` : `Showing 1 of ${FIX.titles.length}Clear`);
    await page.locator('[data-cv="page"]:visible [data-cx="clear"]').click(); await page.waitForTimeout(250);
    check("S5", vp, "Clear restores all", (await cardTitles(page)).length, FIX.titles.length);
  }
});

/* ═══ D1 · by comp ═══ */
test("D1 · landing: by-comp rows are each sent comp's queries, asked and rate, by queries; the marker at your average; hollow under five", async ({ page }) => {
  const v2 = FIX.v2;
  const avg = pct(asked(ALL), ALL.length);
  const readRows = () => page.evaluate(() => ((window as any).__qa('[data-cx="land-row"]') as HTMLElement[]).map((r) => [r.querySelector("b")?.textContent, Number(r.dataset.queries), Number(r.dataset.asked), Number(r.dataset.pct), r.querySelector('[data-cx="land-dot"]')?.getAttribute("data-light")]));
  const marker = () => page.evaluate(() => { const t = (window as any).__q('[data-cx="land-track"]') as HTMLElement | null; const a = t?.querySelector('[data-cx="land-avg"]') as HTMLElement | null; return t && a ? { track: t.getBoundingClientRect().width, at: a.getBoundingClientRect().left - t.getBoundingClientRect().left } : null; });
  for (const vp of SIZES) {
    await openCx(page, vp);
    await need(page, "D1", vp, '[data-cx="landing"]', "What's landing");
    await scrollTo(page, '[data-cx="landing"]', 0);
    check("D1", vp, "rows", await readRows(), [["The Tidewater Line", v2.length, asked(v2), pct(asked(v2), v2.length), "false"], ["Salt Road", v2.length, asked(v2), pct(asked(v2), v2.length), "false"]]);
    check("D1", vp, "the average's label", await q(page, '[data-cx="land-avg-label"]'), `Your average, ${avg}% of all queries`);
    const m = await marker();
    truthy("D1", vp, "the marker was read", m);
    if (m) check("D1", vp, "the marker sits at the average (±1px)", Math.abs(m.at - (m.track * avg) / 100) <= 1, true);
    check("D1", vp, "the band's tag", await q(page, '[data-cx="landing-tag"]'), `From ${ALL.length} sent queries`);
  }
  try {
    /* the light variant: v1b names Nine Miles Out and carries queries 13 and 14 (both Queried), so v2 keeps 7 */
    seed("--variant", "light");
    const v2b = FIX.v2.slice(0, 7);
    for (const vp of SIZES) {
      await openCx(page, vp);
      await scrollTo(page, '[data-cx="landing"]', 0);
      check("D1", vp, "light: rows, hollow under five", await readRows(), [
        ["The Tidewater Line", v2b.length, asked(v2b), pct(asked(v2b), v2b.length), "false"],
        ["Salt Road", v2b.length, asked(v2b), pct(asked(v2b), v2b.length), "false"],
        ["Nine Miles Out", 2, 0, 0, "true"],
      ]);
    }
  } finally { seed("--empty"); }
});

/* ═══ D2 · by letter ═══ */
test("D2 · landing: by-letter blocks sent → unrecorded → unsent; Log them opens the picker; rates are asked ÷ queries", async ({ page }) => {
  for (const vp of SIZES) {
    await openCx(page, vp);
    await need(page, "D2", vp, '[data-cx="landing"]', "What's landing");
    await scrollTo(page, '[data-cx="landing"]', 0);
    const b = await page.evaluate(() => ((window as any).__qa('[data-cx="land-letter"]') as HTMLElement[]).map((e) => [e.dataset.letter, e.dataset.group, e.querySelector('[data-cx="land-letter-rate"]')?.getAttribute("data-pct") ?? null, !!e.querySelector('[data-cx="land-unrecorded"]'), !!e.querySelector('[data-cx="in-use"]')]));
    check("D2", vp, "blocks", b, [
      ["cv25-let-2", "sent", String(pct(asked(FIX.v2), FIX.v2.length)), false, false],
      ["cv25-let-1", "unrecorded", String(pct(asked(FIX.v1), FIX.v1.length)), true, false],
      ["cv25-let-3", "unsent", null, false, true],
    ]);
    await page.locator('[data-cv="page"]:visible [data-cx="land-log"]').click();
    await page.waitForTimeout(500);
    check("D2", vp, "Log them opens the picker on that letter", await page.evaluate(() => document.querySelector('[data-cv="picker"]')?.getAttribute("data-letter") ?? null), "cv25-let-1");
    await page.keyboard.press("Escape"); await page.waitForTimeout(300);
  }
});

/* ═══ E1 · back to the detail ═══ */
test("E1 · back: from the drawer's Edit, Cancel, ✕ and Escape return to the detail; Save returns with the new values; the scrim closes all", async ({ page }) => {
  const detail = () => page.evaluate(() => ({ view: !!document.querySelector('[data-cv="drawer-body"]'), edit: !!document.querySelector('[data-cv="drawer-title"]') && (document.querySelector('[data-cv="drawer-title"]')!.textContent ?? "").startsWith("Edit "), open: !!document.querySelector('[data-hdr="comp"]') }));
  try {
    for (const vp of SIZES) {
      await openCx(page, vp);
      await need(page, "E1", vp, '[data-cx="card"][aria-label="Salt Road"]', "Salt Road's card");
      await scrollTo(page, '[data-cx="shelf"]', 24);
      for (const how of ["cancel", "close", "escape"]) {
        await card(page, "Salt Road").click(); await page.waitForTimeout(450);
        await page.locator('[data-cv="drawer-edit"]').click(); await page.waitForTimeout(400);
        check("E1", vp, `${how}: in the edit form`, (await detail()).edit, true);
        if (how === "cancel") await page.locator('[data-hdr="foot"] button', { hasText: "Cancel" }).click();
        else if (how === "close") await page.locator('[data-cv="drawer-close"]').click();
        else await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
        check("E1", vp, `${how}: back on the detail`, await detail(), { view: true, edit: false, open: true });
        await page.keyboard.press("Escape"); await page.waitForTimeout(400);
        check("E1", vp, `${how}: Escape on the detail closes`, (await detail()).open, false);
      }
      await card(page, "Salt Road").click(); await page.waitForTimeout(450);
      await page.locator('[data-cv="drawer-edit"]').click(); await page.waitForTimeout(400);
      const line = `A line from E1 at ${vp.width}.`;
      await page.locator("#cpv-f-note").fill(line);
      await page.locator('[data-hdr="foot"] button', { hasText: "Save changes" }).click();
      await page.waitForTimeout(900);
      check("E1", vp, "Save: back on the detail", (await detail()).view, true);
      check("E1", vp, "Save: the detail shows the new line", await page.evaluate(() => document.querySelector('[data-hdr="comp"] .cv-why')?.textContent ?? null), line);
      await page.locator('[data-cv="drawer-edit"]').click(); await page.waitForTimeout(400);
      await page.locator('[data-hdr-of="comp"]').click({ position: { x: 20, y: 300 } });
      await page.waitForTimeout(450);
      check("E1", vp, "the scrim from the edit form closes everything", (await detail()).open, false);
    }
  } finally { seed("--empty"); }
});

/* ═══ E2 · focus returns ═══ */
test("E2 · focus: back to the card after the drawer; to the card after a picker Save from its link; to the opener after either pop-up", async ({ page }) => {
  try {
    for (const vp of SIZES) {
      await openCx(page, vp);
      await need(page, "E2", vp, '[data-cx="card"][aria-label="Salt Road"]', "Salt Road's card");
      await scrollTo(page, '[data-cx="shelf"]', 24);
      await card(page, "Salt Road").focus();
      await page.keyboard.press("Enter"); await page.waitForTimeout(500);
      await page.locator('[data-cv="drawer-close"]').click(); await page.waitForTimeout(400);
      check("E2", vp, "drawer closed: focus", await active(page), "card:cmp_cv25salt");
      await card(page, "Bright Water").locator('[data-cx="slip-pick"]').click(); await page.waitForTimeout(600);
      check("E2", vp, "the link's picker pre-ticks the comp on the unsent letter", await page.evaluate(() => document.querySelector('[data-cv="picker-comp"][data-key="cmp_cv25brit"]')?.getAttribute("aria-checked") ?? null), "true");
      await page.locator('[data-cv="picker-save"]').click(); await page.waitForTimeout(1200);
      check("E2", vp, "picker saved: focus (the link is gone, so its card)", await active(page), "card:cmp_cv25brit");
      seed("--empty");
      await openCx(page, vp);
      await page.locator('[data-cv="page"]:visible [data-cx="how-link"]').click(); await page.waitForTimeout(500);
      await page.keyboard.press("Escape"); await page.waitForTimeout(400);
      check("E2", vp, "how-it-works closed: focus", await active(page), "how-link");
      await openCx(page, vp, { ms: MS_EMPTY });
      await page.locator('[data-cv="page"]:visible [data-cx="explain"]').click(); await page.waitForTimeout(500);
      await page.locator('[data-cx="explain-close"]').click(); await page.waitForTimeout(400);
      check("E2", vp, "explainer closed: focus", await active(page), "explain");
    }
  } finally { seed("--empty"); }
});

/* ═══ E3 · the picker ═══ */
test("E3 · picker: records and ages; four ticked with one old shows both tips; Save stays enabled and writes that letter only", async ({ page }) => {
  try {
    for (const vp of SIZES) {
      const before = dump();
      await openCx(page, vp);
      await need(page, "E3", vp, '[data-cx="pick"]', "the header's Log comps in a letter");
      await page.locator('[data-cv="page"]:visible [data-cx="pick"]').click(); await page.waitForTimeout(600);
      check("E3", vp, "opens on the current letter", await page.evaluate(() => document.querySelector('[data-cv="picker"]')?.getAttribute("data-letter") ?? null), "cv25-let-3");
      const recs = await page.evaluate(() => [...document.querySelectorAll('[data-cv="picker-comp"]')].map((li) => [li.querySelector("b")?.textContent, li.querySelector('[data-cv="picker-record"]')?.getAttribute("data-kind") ?? null, (li.querySelector('[data-cv="picker-record"]')?.textContent ?? "").replace(/\s+/g, " ").trim()]));
      const v2 = FIX.v2;
      const want = FIX.titles.map((t) => {
        if (FIX.where[t] === "sent") return [t, "rate", `${pct(asked(v2), v2.length)}%of ${v2.length} asked for more`];
        const age = NOW - FIX.year[t];
        return age > 5 ? [t, "old", `${age} yrs old`] : [t, "unsent", "Not sent yet"];
      });
      check("E3", vp, "each row's record", recs, want);
      for (const t of ["Salt Road", "Kestrel Hour"]) await page.locator('[data-cv="picker-comp"]', { hasText: t }).click();
      await page.waitForTimeout(200);
      check("E3", vp, "the count", await page.evaluate(() => document.querySelector('[data-cv="picker-count"]')?.textContent ?? null), "4 comps named");
      check("E3", vp, "the tip", await page.evaluate(() => (document.querySelector('[data-cv="picker-tip"]')?.textContent ?? "").replace(/\s+/g, " ").trim()),
        "4 comps is more than most letters name. Two or three usually reads cleaner. Kestrel Hour is more than five years old. Agents tend to prefer recent comps.");
      check("E3", vp, "Save stays enabled", await page.evaluate(() => (document.querySelector('[data-cv="picker-save"]') as HTMLButtonElement | null)?.disabled ?? null), false);
      await page.locator('[data-cv="picker-save"]').click(); await page.waitForTimeout(1500);
      const after = dump();
      const ids = (titles: string[]) => titles.map((t) => after.comps.find((c) => c.title === t)?.id as string).sort();
      check("E3", vp, "v3 records the four", [...(after.letters["cv25-let-3"].compIds ?? [])].sort(), ids(["The Tidewater Line", "Last Crossing", "Salt Road", "Kestrel Hour"]));
      check("E3", vp, "the other letters are unchanged", [after.letters["cv25-let-1"].compIds, after.letters["cv25-let-2"].compIds], [before.letters["cv25-let-1"].compIds, before.letters["cv25-let-2"].compIds]);
      seed("--empty");
    }
  } finally { seed("--empty"); }
});

/* ═══ L0 · no jump ═══ */
test("L0 · loading: the header's loading state only; no flash of the empty panel on a seeded account", async ({ page }) => {
  for (const vp of SIZES) {
    await page.addInitScript(() => {
      (window as any).__sawEmpty = false; (window as any).__sawLoading = false; (window as any).__sawShelfWhileLoading = false;
      new MutationObserver(() => {
        if (document.querySelector('[data-cx="empty-panel"]')) (window as any).__sawEmpty = true;
        const loading = document.querySelector('[data-slh="header"][data-loading]');
        if (loading) { (window as any).__sawLoading = true; if (document.querySelector('[data-cx="shelf"], [data-cx="notice"], [data-cx="landing"]')) (window as any).__sawShelfWhileLoading = true; }
      }).observe(document, { subtree: true, childList: true, attributes: true });
    });
    await openCx(page, vp, { hold: 1500 });
    const w = await page.evaluate(() => [(window as any).__sawEmpty, (window as any).__sawLoading, (window as any).__sawShelfWhileLoading]);
    check("L0", vp, "saw: the empty panel · the loading header · the shelf while loading", w, [false, true, false]);
  }
});

test("CX28 · the run measured enough", () => {
  const lines = existsSync(LEDGER) ? readFileSync(LEDGER, "utf8").trim().split("\n").filter(Boolean) : [];
  const locks = new Set(lines.map((l) => JSON.parse(l).lock));
  note("CX28", null, "readings", lines.length, lines.length >= FLOOR);
  expect(lines.length, `the ledger holds ${lines.length} readings; the floor is ${FLOOR}`).toBeGreaterThanOrEqual(FLOOR);
  expect([...locks].sort(), "every lock wrote readings").toEqual(["D1", "D2", "E1", "E2", "E3", "H1", "H2", "H3", "L0", "N1", "S1", "S2", "S3", "S4", "S5"]);
});
void MS;
