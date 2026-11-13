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
 *
 * RE-POINTED (non-workspace v1, Phase 7 / v1.1) at the rebuilt Help centre (design-refs/help-centre-v1.html). Every
 * lock is kept; each now asserts what the new page does. Published articles only are listed, searched or reachable, so:
 *   H2  one "For you right now" card (the guide part-way through), not a card per page; its count is that page's pill's
 *   H3  'agent' → Add an agent first; 'wishlist' (a body word) → Add an agent; 'partial' opens no draft; nonsense →
 *       "Nothing for … yet" and "Tell us what's missing" opens the panel with the search text
 *   C1  the published article (Add an agent): Show me lands with the spotlight and ticks nothing; typing on the page ticks
 *   C2  an unknown or a draft slug → the not-found screen at the same address
 *   C3  "Not really" on the published article
 *   C4  no DRAFT tag is reachable: a draft's URL is not found, and the home lists no draft
 *   C5  a named slug links to its article once published, else to /help; Learn more on a draft target lands on /help
 * The run has not been made since the re-point; only `--list` was checked.
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";
import { ITEM_ARTICLES, PAGE_ARTICLES, LIVE_ARTICLES, articleHref } from "../../src/lib/helpArticles";
import { showDrafts } from "../../src/content/help/model";
import { HELP_ARTICLE_LIST, WRITTEN_ARTICLES, articleBySlug, writtenArticleBySlug } from "../../src/content/help/articles";
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
const PUBLISHED = new Set(HELP_ARTICLE_LIST.map((a) => a.slug));
const DRAFT_SLUGS = WRITTEN_ARTICLES.filter((a) => a.draft).map((a) => a.slug);
/** the not-found screen on screen, and no article */
const notFound = (page: Page) => page.evaluate(() => {
  const nf = [...document.querySelectorAll<HTMLElement>("[data-page='not-found']")].find((e) => e.getBoundingClientRect().height > 0);
  return { nf: !!nf, h: nf?.querySelector("h1")?.textContent ?? null, article: !!document.querySelector("[data-hc='article']") };
});

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

/* RE-POINTED: the home no longer draws a card per guide page. It draws ONE "For you right now" card: the first page in
   sidebar order whose guide is part-way through (else the first not started). Its count is that page's pill's, and its
   one filled button goes to that page. (Old: a card per page, in sidebar order, "n/N", the "you were here" ring — the
   ring has no subject now; replaced by "Carry on lands on the card's page".) */
test("HC1-H2 · guides: one 'For you right now' card, for the guide part-way through, and its count is its pill's", async ({ page }) => {
  test.setTimeout(300_000);
  const L = new Ledger("HC1-H2");
  const c0 = flags("contacts");
  try {
    setGuide("contacts", { seen: true, done: { search: true, pin: true } });
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      /* each page's pill, in sidebar order: the card the home should show is the first started-not-finished one */
      const pills: { page: string; route: string; count: string; state: string }[] = [];
      for (const g of GUIDE_PAGES) {
        await open(page, g.route, vp);
        await vis(page, "[data-pck='pill']").waitFor({ timeout: 20_000 }).catch(() => {});
        const r = await page.evaluate(() => {
          const p = [...document.querySelectorAll<HTMLElement>("[data-pck='pill']")].find((e) => e.getBoundingClientRect().height > 0);
          return { count: p?.querySelector<HTMLElement>("[data-pck='count']")?.innerText.trim() ?? "", state: p?.dataset.state ?? "" };
        });
        pills.push({ page: g.page, route: g.route, ...r });
      }
      const live = pills.filter((p) => p.state === "live");
      const want = live.find((p) => !/^0 of /.test(p.count)) ?? live[0] ?? null;
      await open(page, "/help", vp);
      await vis(page, "[data-hc='home']").waitFor({ timeout: 15_000 }).catch(() => {});
      const cards = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-hc='guide-card']")]
        .filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ page: e.dataset.page, n: e.dataset.n, total: e.dataset.total, text: e.innerText })));
      L.check(`${w} one card at most`, cards.length <= 1, `${cards.length} cards`);
      L.check(`${w} the card is the guide part-way through (${want?.page ?? "none"})`, want ? cards[0]?.page === want.page : cards.length === 0, JSON.stringify({ pills, card: cards[0]?.page }));
      const c = cards[0];
      L.check(`${w} its n of N = the pill's "${want?.count}"`, !!c && !!want && `${c.n} of ${c.total}` === want.count, c ? `${c.n} of ${c.total}` : "no card");
      L.check(`${w} the card states it`, !!c && c.text.includes(`${c.page} guide: ${c.n} of ${c.total} done`) && /Up next: /.test(c.text), JSON.stringify(c?.text));
      L.check(`${w} under "For you right now"`, /For you right now/.test((await hcText(page)) ?? ""), "");
      const filled = await page.locator(".hc .ph-primary").filter({ visible: true }).count();
      L.check(`${w} one filled button on the page (none with no card)`, filled === (cards.length ? 1 : 0), `${filled}`);
      if (c && want) {
        await vis(page, "[data-hc='guide-start']").click();
        await page.waitForTimeout(600);
        L.check(`${w} ${c.n === "0" ? "Start" : "Carry on"} lands on ${want.route}`, (await path(page)) === want.route, await path(page));
      }
    }
  } finally { setGuide("contacts", JSON.parse(c0)); L.done(12); }
});

/* RE-POINTED: the search lists published articles in place of the page's middle. 'partial' (a status whose article is a
   draft) now opens no draft; 'agent' → "Add an agent" first; the body word is 'wishlist' (Add an agent's steps) because
   the template article is a draft; nonsense → the ref's empty state, and its button opens the panel as "ask us" did. */
test("HC1-H3 · search: 'agent' lists Add an agent first; a body word is found; nonsense says 'Nothing for … yet'", async ({ page }) => {
  test.setTimeout(240_000);
  const L = new Ledger("HC1-H3");
  const results = (page: Page) => page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-hc='result']")]
    .filter((e) => e.getBoundingClientRect().height > 0).map((e) => ({ slug: e.dataset.slug ?? "", text: e.innerText })));
  const head = (page: Page) => page.evaluate(() => (document.querySelector("[data-hc='search-head']") as HTMLElement | null)?.innerText ?? "");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/help", vp);
      const input = vis(page, "[data-hc='search-input']");
      await input.waitFor({ timeout: 15_000 });
      await input.fill("partial");
      await page.waitForTimeout(150);
      const partial = await results(page);
      L.check(`${w} 'partial' opens no draft`, partial.every((r) => PUBLISHED.has(r.slug)), JSON.stringify(partial));
      await input.fill("agent");
      await page.waitForTimeout(150);
      const ag = await results(page);
      L.check(`${w} 'agent' → Add an agent first`, ag[0]?.slug === "add-an-agent" && /Add an agent/.test(ag[0]?.text ?? ""), JSON.stringify(ag[0]));
      L.check(`${w} every hit is published`, ag.length > 0 && ag.every((r) => PUBLISHED.has(r.slug)), JSON.stringify(ag.map((r) => r.slug)));
      await input.fill("wishlist");
      await page.waitForTimeout(150);
      const wl = await results(page);
      L.check(`${w} a word only in a body is found`, wl.length === 1 && wl[0].slug === "add-an-agent", JSON.stringify(wl));
      L.check(`${w} and counted`, (await head(page)) === '1 answer for "wishlist"', JSON.stringify(await head(page)));
      await input.fill("zzqxv");
      await page.waitForTimeout(150);
      L.check(`${w} nonsense: the heading`, (await head(page)) === 'Nothing for "zzqxv" yet', JSON.stringify(await head(page)));
      const nores = await page.evaluate(() => (document.querySelector("[data-hc='no-results']") as HTMLElement | null)?.innerText ?? "");
      L.check(`${w} nonsense: the line and its button`, nores.includes("We haven't written that one. Tell us what you were looking for and we'll add it.") && nores.includes("Tell us what's missing"), JSON.stringify(nores));
      await vis(page, "[data-hc='tell-missing']").click();
      await page.locator("[data-fb='panel']").waitFor({ timeout: 8000 }).catch(() => {});
      const fb = await page.evaluate(() => ({
        kind: (document.querySelector("[data-fb='kind'][aria-checked='true']") as HTMLElement | null)?.dataset.k ?? null,
        msg: (document.querySelector("[data-fb='message']") as HTMLTextAreaElement | null)?.value ?? null,
      }));
      L.check(`${w} Tell us what's missing opens the panel on Something's confusing`, fb.kind === "Something's confusing", JSON.stringify(fb));
      L.check(`${w} with the search text as the message`, fb.msg === "zzqxv", JSON.stringify(fb));
      await page.keyboard.press("Escape");
      await page.evaluate(() => { try { sessionStorage.clear(); } catch { /* none */ } });
    }
  } finally { L.done(18); }
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

/* RE-POINTED: Add an agent is the one published article. Its meta is "{n} to read · Checked {date}" now (no "✓ You've done
   this" line); the credit shows as the ✓ beside it in the subject list. "Find an agent" is a draft, so its Show me has no
   subject: "showing ticks nothing" is asserted on Add an agent's Show me (no done flag written by it), and "the writer's
   own action ticks" on the Contact list's own search. "Show me again" is replaced by: the button's words never change. */
test("HC1-C1 · show me: the article's button lands on the page with the spotlight; only the writer's own action ticks", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("HC1-C1");
  const c0 = flags("contacts");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      setGuide("contacts", { seen: true, done: {} });
      await open(page, "/help/add-an-agent", vp);
      await vis(page, "[data-hc='showme-go']").waitFor({ timeout: 15_000 });
      const meta = await vis(page, "[data-hc='meta']").innerText();
      L.check(`${w} add-an-agent: the meta line`, /^\d+ (min|sec) to read · Checked \d{1,2} [A-Z][a-z]+ \d{4}$/.test(meta.trim()), JSON.stringify(meta));
      const tick = await page.evaluate(() => (document.querySelector("[data-hc='toc'][data-slug='add-an-agent']") as HTMLElement | null)?.innerText ?? "");
      L.check(`${w} add-an-agent: ✓ in the subject list (an agent is on file)`, tick.includes("✓"), JSON.stringify(tick));
      L.check(`${w} the button reads "Show me on the page"`, (await vis(page, "[data-hc='showme-go']").innerText()).trim() === "Show me on the page", "");
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
      await page.waitForTimeout(800);
      L.check(`${w} showing it ticked nothing`, Object.keys(JSON.parse(flags("contacts")).done ?? {}).length === 0, flags("contacts"));
      await page.keyboard.press("Escape");

      /* the writer's own action: searching on the Contact list ticks "Search for an agent" */
      L.check(`${w} search not done before`, !JSON.parse(flags("contacts")).done?.search, flags("contacts"));
      const input = page.locator("input[aria-label='Find an agent']");
      if (!(await input.evaluateAll((els) => els.some((e) => e.getBoundingClientRect().width > 4)))) await vis(page, "[data-cl19='find-wrap']").click();
      await vis(page, "input[aria-label='Find an agent']").fill("ab");
      let ticked = false;
      for (let i = 0; i < 20 && !ticked; i++) { await page.waitForTimeout(500); ticked = !!JSON.parse(flags("contacts")).done?.search; }
      L.check(`${w} typing ticks it`, ticked, flags("contacts"));
      await vis(page, "input[aria-label='Find an agent']").fill("");
      /* "Find an agent" is a draft: its article is not reachable, so the guide teaches it on the page alone */
      await open(page, "/help/find-an-agent", vp);
      await page.waitForTimeout(600);
      const nf = await notFound(page);
      L.check(`${w} find-an-agent (a draft) is the not-found screen`, nf.nf && !nf.article, JSON.stringify(nf));
      await open(page, "/help/add-an-agent", vp);
      await vis(page, "[data-hc='showme-go']").waitFor({ timeout: 15_000 });
      L.check(`${w} and Add an agent's button still reads "Show me on the page"`, (await vis(page, "[data-hc='showme-go']").innerText()).trim() === "Show me on the page", "");
    }
  } finally { setGuide("contacts", JSON.parse(c0)); L.done(24); }
});

/* RE-POINTED: an unknown slug, and a draft's, used to go to /help; now each shows the not-found screen at its own address. */
test("HC1-C2 · an unknown or a draft slug shows the not-found screen", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("HC1-C2");
  try {
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      for (const slug of ["nope", DRAFT_SLUGS[0]]) {
        await open(page, `/help/${slug}`, vp);
        await page.locator("[data-page='not-found']").filter({ visible: true }).first().waitFor({ timeout: 15_000 }).catch(() => {});
        const nf = await notFound(page);
        L.check(`${w} /help/${slug}: the address stays`, (await path(page)) === `/help/${slug}`, await path(page));
        L.check(`${w} /help/${slug}: the not-found screen`, nf.nf && nf.h === "We can't find that page.", JSON.stringify(nf));
        L.check(`${w} /help/${slug}: no blank article`, !nf.article, "");
      }
    }
  } finally { L.done(12); }
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
      await open(page, "/help/add-an-agent", vp); /* re-pointed: list-health is a draft */
      await vis(page, "[data-hc='helpful-no']").click();
      await vis(page, "[data-hc='helpful-input']").fill("A worked example would help");
      await vis(page, "[data-hc='helpful-send']").click();
      await vis(page, "[data-hc='helpful-sent']").waitFor({ timeout: 10_000 }).catch(() => {});
      const s = sent[0];
      L.check(`${w} one send`, sent.length === 1, `${sent.length}`);
      L.check(`${w} kind Article`, s?.kind === "Article", JSON.stringify(s));
      L.check(`${w} pageName help/add-an-agent`, s?.pageName === "help/add-an-agent", JSON.stringify(s));
      L.check(`${w} the thanks`, (await page.evaluate(() => (document.querySelector("[data-hc='helpful-sent']") as HTMLElement | null)?.innerText ?? "")).startsWith("Thanks. That's gone to us as a note."), "");
      L.check(`${w} the writer's words`, s?.message === "A worked example would help", JSON.stringify(s));
      await vis(page, ".ws-fbtn, .ws-fbb, .ws-fbi").click();
      await page.locator("[data-fb='panel']").waitFor({ timeout: 8000 });
      const kinds = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-fb='panel'] [data-fb='kind']")].map((e) => e.dataset.k));
      L.check(`${w} the panel offers four kinds`, kinds.length === 4, JSON.stringify(kinds));
      L.check(`${w} and never Article`, !kinds.includes("Article"), JSON.stringify(kinds));
      await page.keyboard.press("Escape");
    }
  } finally { L.done(14); }
});

/* RE-POINTED: drafts are unreachable, so no DRAFT tag can be shown on any build. "A drafted article carries DRAFT" is
   replaced by: a draft's URL is the not-found screen, with no tag on screen, and the home lists no draft. */
test("HC1-C4 · drafts: unreachable on every build, so no DRAFT tag is ever on screen", async ({ page }) => {
  test.setTimeout(180_000);
  const L = new Ledger("HC1-C4");
  try {
    L.check("production never shows it", showDrafts("production") === false, "");
    L.check("a dev build would", showDrafts("development") === true, "");
    for (const vp of SIZES) {
      const w = `@${vp.width}`;
      await open(page, "/help/find-an-agent", vp);
      await page.waitForTimeout(600);
      const nf = await notFound(page);
      L.check(`${w} a drafted article's URL is not found`, nf.nf && !nf.article, JSON.stringify(nf));
      L.check(`${w} and carries no DRAFT`, await page.locator("[data-hc='draft']").filter({ visible: true }).count() === 0, "");
      await open(page, "/help/add-an-agent", vp);
      await vis(page, "[data-hc='meta']").waitFor({ timeout: 15_000 });
      L.check(`${w} the reviewed article carries none`, await page.locator("[data-hc='draft']").filter({ visible: true }).count() === 0, "");
      await open(page, "/help", vp);
      await vis(page, "[data-hc='home']").waitFor({ timeout: 15_000 }).catch(() => {});
      const draftSet = new Set(DRAFT_SLUGS);
      const listed = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-hc] [data-slug]")].map((e) => e.dataset.slug ?? ""));
      L.check(`${w} the home lists no draft`, listed.length > 0 && listed.every((s) => !draftSet.has(s)), JSON.stringify(listed));
    }
  } finally { L.done(10); }
});

/* RE-POINTED: a named slug must be WRITTEN; it is live and links to /help/{slug} only once published, else to /help. A
   published one renders its article; a draft's URL is the not-found screen. "Search for an agent → Learn more" names
   find-an-agent, a draft, so it now lands on the Help centre home. */
test("HC1-C5 · live: every slug a link names is written; published ones have a page, and a draft's Learn more lands on /help", async ({ page }) => {
  test.setTimeout(420_000);
  const L = new Ledger("HC1-C5");
  const c0 = flags("contacts");
  try {
    const named = [...new Set([...Object.values(ITEM_ARTICLES).flatMap((m) => Object.values(m)), ...Object.values(PAGE_ARTICLES).flat()])];
    for (const s of named) {
      const pub = !!articleBySlug(s);
      L.check(`${s} is written`, !!writtenArticleBySlug(s), "");
      L.check(`${s} is live only if published (${pub})`, LIVE_ARTICLES.has(s) === pub, "");
      L.check(`${s} links to ${pub ? `/help/${s}` : "/help"}`, articleHref(s) === (pub ? `/help/${s}` : "/help"), articleHref(s));
    }
    const vp = SIZES[0];
    for (const s of named) {
      await open(page, `/help/${s}`, vp);
      await page.waitForTimeout(300);
      const got = await page.evaluate(() => ({ p: location.pathname, slug: document.querySelector<HTMLElement>("[data-hc='article']")?.dataset.slug ?? null,
        nf: [...document.querySelectorAll<HTMLElement>("[data-page='not-found']")].some((e) => e.getBoundingClientRect().height > 0) }));
      if (articleBySlug(s)) L.check(`/help/${s} renders that article`, got.p === `/help/${s}` && got.slug === s && !got.nf, JSON.stringify(got));
      else L.check(`/help/${s} (a draft) is the not-found screen`, got.p === `/help/${s}` && got.slug === null && got.nf, JSON.stringify(got));
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
      const got = await page.evaluate(() => ({ p: location.pathname, home: !!document.querySelector("[data-hc='home']"), article: !!document.querySelector("[data-hc='article']") }));
      L.check(`${w} Search for an agent → Learn more → /help (find-an-agent is a draft)`, got.p === "/help" && got.home && !got.article, JSON.stringify(got));
    }
  } finally { setGuide("contacts", JSON.parse(c0)); L.done(45); }
});
