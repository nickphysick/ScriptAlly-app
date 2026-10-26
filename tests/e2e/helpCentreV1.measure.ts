/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1 — locks HC1 H1–H4 and C1–C5 (design-refs/help-system-v1, the Help Centre and Article views), on the
 * rendered page at 1512 × 900 and 1280 × 800. L1 is every earlier page lock, run as they stand.
 *
 * Every lock was run green here, RED against the build before this pack (6a7a0715), and RED against its named break: a
 * `src` mutation made and undone in the measurement worktree from a path-derived backup (`tests/e2e/hc1Mutate.py`), with
 * `HC1_MUTATE` naming the ledger only. Ledgers in reports/help-centre-v1/ledger.
 *
 * ⚠️ THE GUIDES' STATE IS THE ACCOUNT'S: a test that needs one sets it with guideFlags.mjs and puts back exactly what it
 *    found, in a finally.
 * ⚠️ NOTHING HERE SENDS FEEDBACK: the article's send is answered by a route stub that records the request, so no
 *    document is written and no email goes.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { ITEM_ARTICLES, PAGE_ARTICLES, LIVE_ARTICLES, articleHref } from "../../src/lib/helpArticles";
import { showDrafts } from "../../src/content/help/model";
import { GUIDE_PAGES } from "../../src/lib/pageChecklist";

const DIR = "reports/help-centre-v1";
const MUT = process.env.HC1_MUTATE ?? "";
const SIZES = [{ width: 1512, height: 900 }, { width: 1280, height: 800 }] as const;
type VP = { width: number; height: number };
const sh = (c: string) => execSync(c, { encoding: "utf8" });
const flags = (pg: "contacts" | "queries", args = "") => sh(`node tests/e2e/guideFlags.mjs --page ${pg} ${args}`).trim().split("\n").pop()!;
const setGuide = (pg: "contacts" | "queries", v: unknown) => flags(pg, `--restore '${JSON.stringify(v)}'`);

type Row = { lock: string; where: string; ok: boolean; detail: string };
class Ledger {
  rows: Row[] = [];
  constructor(public name: string) {}
  check(where: string, ok: unknown, detail: string) { this.rows.push({ lock: this.name, where, ok: !!ok, detail }); }
  flush() {
    mkdirSync(`${DIR}/ledger`, { recursive: true });
    writeFileSync(`${DIR}/ledger/${MUT === this.name ? `mut-${MUT}` : MUT ? `${this.name}.under-${MUT}` : this.name}.json`, JSON.stringify(this.rows, null, 1));
  }
  done(floor: number) {
    this.flush();
    for (const r of this.rows.filter((x) => !x.ok).slice(0, 30)) console.log(`  ✗ ${r.lock} · ${r.where} — ${r.detail}`);
    console.log(`[${this.name}] ${this.rows.filter((r) => r.ok).length}/${this.rows.length} green`);
    expect(this.rows.length, `${this.name}: fewer readings than it claims`).toBeGreaterThanOrEqual(floor);
    expect(this.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  }
}

/** every open: per-device guide memory cleared, one auto-open already spent (nothing opens over the lock) */
const open = async (page: Page, route: string, vp: VP) => {
  const token = `t${Date.now()}${Math.floor(Math.random() * 1e6)}`;
  await page.context().addCookies([{ name: "hc1", value: token, url: process.env.SA_E2E_BASE_URL === "dev" ? "https://scriptally-dev.web.app" : process.env.SA_E2E_BASE_URL! }]);
  await page.addInitScript(({ token }) => {
    try {
      if (!document.cookie.split("; ").includes(`hc1=${token}`)) return;
      if (sessionStorage.getItem("__hc1_init") === token) return;
      sessionStorage.setItem("__hc1_init", token);
      for (const k of Object.keys(localStorage)) if (/^sa\.guide\..*\.(skipped|last|learned|restart)$/.test(k) || k === "sa.guides.off" || k === "sa.whatsNew.seen") localStorage.removeItem(k);
      sessionStorage.setItem("sa.guide.autoOpened", "1");
    } catch { /* private mode */ }
  }, { token });
  await openRoute(page, route, vp);
  await page.evaluate(() => document.fonts.ready);
};
const vis = (page: Page, sel: string) => page.locator(sel).filter({ visible: true }).first();
const hcText = (page: Page) => page.evaluate(() => {
  const el = [...document.querySelectorAll<HTMLElement>(".hc")].find((e) => e.getBoundingClientRect().height > 0);
  return el ? el.innerText : null;
});
const path = (page: Page) => page.evaluate(() => location.pathname);

/* ───────────────────────── H · the home ───────────────────────── */

test("HC1-H1 · retired: no FAQ topics, no cheat sheet, no verdict words, no shortcuts button", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("HC1-H1");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/help", vp);
      await vis(page, "[data-hc='home']").waitFor({ timeout: 15_000 }).catch(() => {});
      const t = await hcText(page);
      L.check(`${w} the new home is on screen`, t !== null && /How can we help\?/.test(t), t === null ? "no .hc" : "");
      /* what is on screen in the stage: every workspace page stays mounted, so `textContent` would read ten pages'; the
         rendered text (`innerText`) leaves out the hidden ones */
      const all = await page.evaluate(() => (document.querySelector<HTMLElement>("#app-stage-scroll") ?? document.body).innerText);
      L.check(`${w} read some text`, all.length > 200, `${all.length} chars`);
      for (const word of ["Fortnight in Focus", "Query Pipeline", "Agent Discovery", "Manuscript Packages", "Cheat Sheet", "overdue", "urgent", "Keyboard shortcuts"]) {
        L.check(`${w} "${word}" is gone`, !all.toLowerCase().includes(word.toLowerCase()), "");
      }
    }
  } finally { L.done(20); }
});

test("HC1-H2 · guides: a card per page that registers a guide, and the Contact list card's count is its pill's", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HC1-H2");
  const c0 = flags("contacts");
  try {
    setGuide("contacts", { seen: true, done: { search: true, pin: true } });
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/agents", vp);
      const pill = vis(page, "[data-pck='pill']");
      await pill.waitFor({ timeout: 20_000 });
      const pillN = (await vis(page, "[data-pck='pill'] [data-pck='count']").innerText()).trim();
      await open(page, "/help", vp);
      await vis(page, "[data-hc='guides']").waitFor({ timeout: 15_000 }).catch(() => {});
      const cards = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-hc='guide-card']")]
        .filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ page: e.dataset.page, n: e.dataset.n, total: e.dataset.total, text: e.innerText })));
      L.check(`${w} one card per page with a guide (${GUIDE_PAGES.length})`, cards.length === GUIDE_PAGES.length, `${cards.length} cards`);
      L.check(`${w} the cards are those pages, in sidebar order`, JSON.stringify(cards.map((c) => c.page)) === JSON.stringify(GUIDE_PAGES.map((g) => g.page)), cards.map((c) => c.page).join(","));
      const cl = cards.find((c) => c.page === "Contact list");
      L.check(`${w} Contact list card n of N = the pill's "${pillN}"`, !!cl && `${cl.n} of ${cl.total}` === pillN, cl ? `${cl.n} of ${cl.total}` : "no card");
      L.check(`${w} the card states it`, !!cl && cl.text.includes(`${cl.n}/${cl.total}`), "");
      L.check(`${w} the card the writer came from is ringed`, await page.evaluate(() => !!document.querySelector("[data-hc='guide-card'][data-page='Contact list'] [data-hc='here']")), "");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); L.done(10); }
});

test("HC1-H3 · search: 'partial' lists Partial requested first; a body word is found; nonsense asks Nick", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("HC1-H3");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/help", vp);
      const input = vis(page, "[data-hc='search-input']");
      await input.waitFor({ timeout: 15_000 });
      await input.fill("partial");
      await page.waitForTimeout(150);
      const first = await page.evaluate(() => (document.querySelector("[data-hc='result']") as HTMLElement | null)?.innerText ?? "");
      L.check(`${w} 'partial' → Partial requested first`, /Partial requested/.test(first), JSON.stringify(first));
      const n = await page.locator("[data-hc='result']").count();
      L.check(`${w} at most seven`, n > 0 && n <= 7, `${n}`);
      await input.fill("QueryHawk-template");
      await page.waitForTimeout(150);
      const tpl = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-hc='result']")].map((e) => e.innerText).join(" | "));
      L.check(`${w} a word only in a body is found`, /Download the template/.test(tpl), JSON.stringify(tpl));
      await input.fill("zzqxv");
      await page.waitForTimeout(150);
      const nores = await page.evaluate(() => (document.querySelector("[data-hc='no-results']") as HTMLElement | null)?.innerText ?? "");
      L.check(`${w} nonsense: the no-result line`, /Nothing matches "zzqxv"\. Try a status name or a page name, or ask us\./.test(nores), JSON.stringify(nores));
      await vis(page, "[data-hc='ask-nick']").click();
      await page.locator("[data-fb='panel']").waitFor({ timeout: 8000 }).catch(() => {});
      const fb = await page.evaluate(() => ({
        kind: (document.querySelector("[data-fb='kind'][aria-checked='true']") as HTMLElement | null)?.dataset.k ?? null,
        msg: (document.querySelector("[data-fb='message']") as HTMLTextAreaElement | null)?.value ?? null,
      }));
      L.check(`${w} ask us opens the panel on Something's confusing`, fb.kind === "Something's confusing", JSON.stringify(fb));
      L.check(`${w} with the search text as the message`, fb.msg === "zzqxv", JSON.stringify(fb));
      await page.keyboard.press("Escape");
      await page.evaluate(() => { try { sessionStorage.clear(); } catch { /* none */ } });
    }
  } finally { L.done(12); }
});

test("HC1-H4 · '/' anywhere focuses the search", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("HC1-H4");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/help", vp);
      await vis(page, "[data-hc='search-input']").waitFor({ timeout: 15_000 });
      await page.mouse.click(vp.width - 40, vp.height - 40);
      await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
      await page.keyboard.press("/");
      const r = await page.evaluate(() => ({ focused: (document.activeElement as HTMLElement | null)?.dataset?.hc ?? null, value: (document.querySelector("[data-hc='search-input']") as HTMLInputElement | null)?.value }));
      L.check(`${w} '/' focuses the search`, r.focused === "search-input", JSON.stringify(r));
      L.check(`${w} and types nothing into it`, r.value === "", JSON.stringify(r));
    }
  } finally { L.done(4); }
});

/* ───────────────────────── C · articles ───────────────────────── */

test("HC1-C1 · show me: the article's button lands on the page with the spotlight; only the writer's own action ticks", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("HC1-C1");
  const c0 = flags("contacts");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      setGuide("contacts", { seen: true, done: {} });
      /* Add an agent: credited by an agent on file, so the article says so and offers "Show me again" */
      await open(page, "/help/add-an-agent", vp);
      await vis(page, "[data-hc='showme-go']").waitFor({ timeout: 15_000 });
      const meta = await vis(page, "[data-hc='meta']").innerText();
      L.check(`${w} add-an-agent: "✓ You've done this" (an agent is on file)`, meta.includes("✓ You've done this"), JSON.stringify(meta));
      await vis(page, "[data-hc='showme-go']").click();
      await page.waitForFunction(() => location.pathname === "/agents", undefined, { timeout: 10_000 }).catch(() => {});
      L.check(`${w} lands on the Contact list`, (await path(page)) === "/agents", await path(page));
      await page.locator("[data-pck='spot'] [data-pck='card']").waitFor({ timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(500);
      const spot = await page.evaluate(() => {
        const hole = document.querySelector<HTMLElement>("[data-pck='spot'] [data-pck='dim']")?.dataset.hole;
        const title = document.querySelector<HTMLElement>("[data-pck='spot'] [data-pck='card'] b")?.innerText ?? null;
        const btn = [...document.querySelectorAll<HTMLElement>("button")].find((b) => /\+\s*Add an agent/.test(b.innerText) && b.getBoundingClientRect().height > 0);
        const r = btn?.getBoundingClientRect();
        return { title, hole: hole ? JSON.parse(hole) : null, btn: r ? { left: r.left, top: r.top, width: r.width, height: r.height } : null };
      });
      L.check(`${w} the spotlight is on "Add an agent"`, spot.title === "Add an agent", JSON.stringify(spot.title));
      const inHole = !!spot.hole && !!spot.btn && spot.btn.left >= spot.hole.left - 1 && spot.btn.top >= spot.hole.top - 1
        && spot.btn.left + spot.btn.width <= spot.hole.left + spot.hole.width + 1 && spot.btn.top + spot.btn.height <= spot.hole.top + spot.hole.height + 1;
      L.check(`${w} its hole is round "+ Add an agent"`, inHole, JSON.stringify(spot));
      await page.keyboard.press("Escape");

      /* Find an agent: not done; Show me points; nothing ticks until the writer types */
      await open(page, "/help/find-an-agent", vp);
      await vis(page, "[data-hc='showme-go']").waitFor({ timeout: 15_000 });
      L.check(`${w} find-an-agent before: "Part of the Contact list guide"`, (await vis(page, "[data-hc='meta']").innerText()).includes("Part of the Contact list guide"), "");
      await vis(page, "[data-hc='showme-go']").click();
      await page.locator("[data-pck='spot'] [data-pck='card']").waitFor({ timeout: 15_000 }).catch(() => {});
      const t2 = await page.evaluate(() => document.querySelector<HTMLElement>("[data-pck='spot'] [data-pck='card'] b")?.innerText ?? null);
      L.check(`${w} spotlight on "Search for an agent"`, t2 === "Search for an agent", JSON.stringify(t2));
      await page.waitForTimeout(800);
      L.check(`${w} showing it ticked nothing`, !JSON.parse(flags("contacts")).done?.search, flags("contacts"));
      await page.keyboard.press("Escape");
      const input = page.locator("input[aria-label='Find an agent']");
      if (!(await input.evaluateAll((els) => els.some((e) => e.getBoundingClientRect().width > 4)))) await vis(page, "[data-cl19='find-wrap']").click();
      await vis(page, "input[aria-label='Find an agent']").fill("ab");
      let ticked = false;
      for (let i = 0; i < 20 && !ticked; i++) { await page.waitForTimeout(500); ticked = !!JSON.parse(flags("contacts")).done?.search; }
      L.check(`${w} typing ticks it`, ticked, flags("contacts"));
      await vis(page, "input[aria-label='Find an agent']").fill("");
      await open(page, "/help/find-an-agent", vp);
      await vis(page, "[data-hc='meta']").waitFor({ timeout: 15_000 });
      L.check(`${w} find-an-agent after: "✓ You've done this"`, (await vis(page, "[data-hc='meta']").innerText()).includes("✓ You've done this"), "");
      L.check(`${w} and "Show me again"`, (await vis(page, "[data-hc='showme-go']").innerText()).trim() === "Show me again", "");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); L.done(20); }
});

test("HC1-C2 · an unknown slug goes to /help", async ({ page }) => {
  test.setTimeout(120_000);
  const L = new Ledger("HC1-C2");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/help/nope", vp);
      await page.waitForTimeout(600);
      L.check(`${w} the address is /help`, (await path(page)) === "/help", await path(page));
      L.check(`${w} the home is on screen`, /How can we help\?/.test((await hcText(page)) ?? ""), "");
      L.check(`${w} no blank article`, await page.evaluate(() => !document.querySelector("[data-hc='article']")), "");
    }
  } finally { L.done(6); }
});

test("HC1-C3 · Did this help? Not really: kind Article, pageName help/{slug}; the panel keeps four kinds", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("HC1-C3");
  const sent: { kind?: string; pageName?: string; message?: string }[] = [];
  await page.route(/sendBetaFeedback/, async (r) => {
    try { sent.push(JSON.parse(r.request().postData() ?? "{}").data ?? {}); } catch { /* none */ }
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ result: { ok: true, emailed: true } }) });
  });
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      sent.length = 0;
      await open(page, "/help/list-health", vp);
      await vis(page, "[data-hc='helpful-no']").click();
      await vis(page, "[data-hc='helpful-input']").fill("A worked example would help");
      await vis(page, "[data-hc='helpful-send']").click();
      await vis(page, "[data-hc='helpful-sent']").waitFor({ timeout: 10_000 }).catch(() => {});
      const s = sent[0];
      L.check(`${w} one send`, sent.length === 1, `${sent.length}`);
      L.check(`${w} kind Article`, s?.kind === "Article", JSON.stringify(s));
      L.check(`${w} pageName help/list-health`, s?.pageName === "help/list-health", JSON.stringify(s));
      L.check(`${w} the writer's words`, s?.message === "A worked example would help", JSON.stringify(s));
      await vis(page, ".ws-fbtn, .ws-fbb, .ws-fbi").click();
      await page.locator("[data-fb='panel']").waitFor({ timeout: 8000 });
      const kinds = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-fb='panel'] [data-fb='kind']")].map((e) => e.dataset.k));
      L.check(`${w} the panel offers four kinds`, kinds.length === 4, JSON.stringify(kinds));
      L.check(`${w} and never Article`, !kinds.includes("Article"), JSON.stringify(kinds));
      await page.keyboard.press("Escape");
    }
  } finally { L.done(12); }
});

test("HC1-C4 · drafts: a DRAFT tag on this dev build, none on a reviewed article, never in production", async ({ page }) => {
  test.setTimeout(120_000);
  const L = new Ledger("HC1-C4");
  try {
    L.check("production never shows it", showDrafts("production") === false, "");
    L.check("a dev build does", showDrafts("development") === true, "");
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/help/find-an-agent", vp);
      await vis(page, "[data-hc='meta']").waitFor({ timeout: 15_000 });
      L.check(`${w} a drafted article carries DRAFT`, await page.locator("[data-hc='draft']").filter({ visible: true }).count() === 1, "");
      await open(page, "/help/add-an-agent", vp);
      await vis(page, "[data-hc='meta']").waitFor({ timeout: 15_000 });
      L.check(`${w} the reviewed article does not`, await page.locator("[data-hc='draft']").filter({ visible: true }).count() === 0, "");
    }
  } finally { L.done(6); }
});

test("HC1-C5 · live: every slug a link names has a page, and a guide row's Learn more lands on its article", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("HC1-C5");
  const c0 = flags("contacts");
  try {
    const named = [...new Set([...Object.values(ITEM_ARTICLES).flatMap((m) => Object.values(m)), ...Object.values(PAGE_ARTICLES).flat()])];
    for (const s of named) {
      L.check(`${s} is live`, LIVE_ARTICLES.has(s), "");
      L.check(`${s} links to /help/${s}`, articleHref(s) === `/help/${s}`, articleHref(s));
    }
    const vp = SIZES[0];
    for (const s of named) {
      await open(page, `/help/${s}`, vp);
      await page.waitForTimeout(300);
      const got = await page.evaluate(() => ({ p: location.pathname, slug: document.querySelector<HTMLElement>("[data-hc='article']")?.dataset.slug ?? null }));
      L.check(`/help/${s} renders that article`, got.p === `/help/${s}` && got.slug === s, JSON.stringify(got));
    }
    setGuide("contacts", { seen: true, done: {} });
    for (const v of SIZES) {
      const w = `@${v.width}`;
      await open(page, "/agents", v);
      await vis(page, "[data-pck='pill']").waitFor({ timeout: 20_000 });
      await vis(page, "[data-pck='pill']").click();
      await page.locator("[data-pck='popover']").waitFor({ timeout: 8000 });
      await page.locator("[data-pck='item'][data-k='search'] [data-pck='learn']").evaluate((e) => (e as HTMLElement).click());
      await page.waitForTimeout(600);
      const got = await page.evaluate(() => ({ p: location.pathname, t: document.querySelector<HTMLElement>("[data-hc='article'] h1")?.innerText ?? null }));
      L.check(`${w} Search for an agent → Learn more → /help/find-an-agent`, got.p === "/help/find-an-agent" && got.t === "Find an agent", JSON.stringify(got));
    }
  } finally { setGuide("contacts", JSON.parse(c0)); L.done(35); }
});
