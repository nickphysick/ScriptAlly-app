/**
 * Onboarding v9 — the walk on dev.
 *
 * The dedicated empty fixture account is put back into set-up and walked through each of the four
 * journeys: the three querying ones to the fork, "Just getting started" to the Contact list. Then
 * `template-mixed.csv` is imported through the gated review to the dashboard.
 *
 * Every run that writes removes what it wrote in a `finally`, and the file's `afterAll` proves the
 * account's document counts match the snapshot taken before. The password is never printed.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test onbV9Walk --project=measure --no-deps --workers=1
 *   OB9_SHOTS=1   write the report's screenshots
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { session, snapshot, enterSetup, restore, readImported, ACCOUNT_EMAIL } from "./importFixesAccount.mjs";
import { answerAgents, readStep, stepTotal, showCard } from "./reviewDrive";
import { getDocs, collection } from "firebase/firestore";

const OUT = resolve(process.cwd(), "reports/onb-v9");
const SHOTS = !!process.env.OB9_SHOTS;
const FX = (name: string) => resolve(process.cwd(), "tests/fixtures/import", name);

function readPw(): string {
  if (process.env.SA_E2E_PASSWORD) return process.env.SA_E2E_PASSWORD;
  const file = resolve(process.cwd(), ".env.local");
  if (existsSync(file)) for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*SA_E2E_PASSWORD\s*=\s*(.+)$/.exec(line);
    if (m) return m[1].trim().replace(/^["']|["']$/g, "");
  }
  throw new Error("no SA_E2E_PASSWORD");
}
const record = (name: string, value: unknown) => {
  mkdirSync(OUT, { recursive: true });
  appendFileSync(resolve(OUT, "walk-readings.jsonl"), JSON.stringify({ name, value }) + "\n");
};
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  mkdirSync(resolve(OUT, "shots"), { recursive: true });
  await page.screenshot({ path: resolve(OUT, "shots", `walk-${name}.png`) });
};

async function signIn(browser: Browser, baseURL: string) {
  await assertLocalBundleIsDev();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/#/signin");
  await page.locator("#au-email").fill(ACCOUNT_EMAIL);
  await page.locator("#au-pw").fill(readPw());
  await page.getByRole("button", { name: /^Sign in$/ }).last().click();
  await page.locator('[data-screen="welcome"]').waitFor({ timeout: 40_000 });
  return { ctx, page, errors };
}
/** The welcome, the acknowledgement and the title; returns what the two screens said. */
async function toBook(page: Page, journey: string, title: string | null) {
  const welcome = await page.evaluate(() => ({
    heading: [...document.querySelectorAll("#o9-welcome-h span")].map((s) => s.textContent ?? ""),
    options: [...document.querySelectorAll('[data-o9="welcome-card"] [role="radio"]')].length,
  }));
  await page.getByRole("radio", { name: new RegExp(journey) }).click();
  await page.locator('[data-o9="welcome-card"] .sf-btn').click();
  await page.locator('[data-screen="ack"]').waitFor({ timeout: 20_000 });
  await page.locator('[data-o9="passage"]').click(); // finishes the typing at once
  const ack = await page.evaluate(() => ({
    stamp: document.querySelector('[data-o9="stamp-title"]')?.textContent ?? "",
    passage: (document.querySelector('[data-o9="passage"]')?.textContent ?? "").replace(/\s+/g, " ").trim(),
    tbc: document.querySelectorAll('[data-act="tbc"]').length,
    continueOff: (document.querySelector('[data-o9="title-card"] [data-act="continue"]') as HTMLButtonElement).disabled,
  }));
  if (title === null) await page.locator('[data-act="tbc"]').click();
  else await page.locator("#o9-title").fill(title);
  return { welcome, ack };
}

test.describe.configure({ mode: "serial" });
test.setTimeout(240_000);

let before: Awaited<ReturnType<typeof snapshot>>;
test.beforeAll(async () => {
  await session();
  before = await snapshot();
  record("countsBefore", before.counts);
});
test.afterAll(async () => {
  const after = await restore(before);
  record("countsAfter", after);
  expect(after, "the account's document counts match the snapshot taken before").toEqual(before.counts);
});

const QUERYING = [
  { journey: "A few queries out", first: "Got it. Your campaign is underway." },
  { journey: "Deep in it", first: "Got it. A lot in flight." },
  { journey: "Had some interest", first: "Got it. Something's on the table." },
];
for (const j of QUERYING) {
  test(`WALK · ${j.journey}: the welcome, the acknowledgement, the book, the fork`, async ({ browser, baseURL }) => {
    await enterSetup();
    const { ctx, page, errors } = await signIn(browser, baseURL!);
    try {
      const { welcome, ack } = await toBook(page, j.journey, "The October Test");
      await page.locator('[data-o9="title-card"] [data-act="continue"]').click();
      await page.locator('[data-o9="book-card"].is-in').waitFor({ timeout: 20_000 });
      const book = await page.evaluate(() => ({
        eyebrow: document.querySelector('[data-o9="book-eyebrow"]')?.textContent ?? "", byline: document.querySelector('[data-o9="byline"]')?.textContent ?? "",
        title: document.querySelector('[data-o9="bookhead"] h1')?.textContent ?? "", pills: document.querySelectorAll('[data-o9="genre"] [data-genre]').length,
      }));
      await page.locator('[data-o9="genre"] [data-genre="thriller"]').click();
      await page.locator('[data-o9="genre"] [data-genre="crime"]').click();
      await page.getByRole("radio", { name: "Adult", exact: true }).click();
      await page.locator("#o9-words").fill("92,000");
      await shot(page, `${j.journey.replace(/\W+/g, "-").toLowerCase()}-book`);
      await page.locator('[data-o9="book-card"] [data-act="continue"]').click();
      await page.locator('[data-screen="fork"]').waitFor({ timeout: 20_000 });
      const fork = await page.evaluate(() => ({
        tiles: [...document.querySelectorAll(".sf-tile")].map((t) => (t as HTMLElement).dataset.tile), ringed: document.querySelectorAll(".sf-tile.is-ringed, .sf-tile[data-ringed='true']").length,
        slots: document.querySelectorAll('.sf-tile [data-o9="slot"]').length,
      }));
      await shot(page, `${j.journey.replace(/\W+/g, "-").toLowerCase()}-fork`);
      const counts = (await snapshot()).counts;
      record(j.journey, { welcome, ack, book, fork, counts, errors });
      expect(errors).toEqual([]);
      expect(welcome.heading[1]).toBe("Let's get you on board.");
      expect(welcome.heading[0]).toMatch(/^Welcome to QueryHawk(, .+)?\.$/);
      expect(welcome.options).toBe(4);
      expect(ack.stamp).toBe(j.journey);
      expect(ack.passage.startsWith(j.first), ack.passage).toBe(true);
      expect(ack.passage.endsWith("First, your manuscript title."), ack.passage).toBe(true);
      expect(ack.tbc, "Title TBC is not offered on a querying journey").toBe(0);
      expect(ack.continueOff, "Continue is off until there is a title").toBe(true);
      expect(book.eyebrow).toBe("— Your book —");
      expect(book.title).toBe("The October Test");
      expect(book.byline).toMatch(/^by .+/);
      expect(book.pills).toBe(9);
      expect(fork.tiles).toEqual(["smart", "template", "byhand"]);
      expect([fork.ringed, fork.slots]).toEqual([0, 3]);
      expect(counts, "reaching the fork writes no document").toEqual(before.counts);
    } finally {
      await ctx.close();
      await restore(before);
    }
  });
}

test("WALK · Just getting started: Title TBC, the book, then the Contact list", async ({ browser, baseURL }) => {
  await enterSetup();
  const { ctx, page, errors } = await signIn(browser, baseURL!);
  try {
    const { ack } = await toBook(page, "Just getting started", null);
    const title = await page.locator("#o9-title").inputValue();
    const lit = !(await page.locator('[data-o9="title-card"] [data-act="continue"]').isDisabled().catch(() => true));
    const readiness = await page.locator('[data-o9="title-card"] [role="radio"]').count();
    await page.getByRole("radio", { name: /Still being written/ }).click();
    const note = (await page.locator('[data-sf="still-writing"]').textContent()) ?? "";
    await shot(page, "starting-title");
    await page.locator('[data-o9="title-card"] [data-act="continue"]').click();
    await page.locator('[data-o9="book-card"].is-in').waitFor({ timeout: 20_000 });
    const bookTitle = (await page.locator('[data-o9="bookhead"] h1').textContent()) ?? "";
    await page.locator('[data-o9="genre"] [data-genre="fantasy"]').click();
    await page.locator('[data-o9="book-card"] [data-act="continue"]').click();
    await page.waitForURL(/\/agents/, { timeout: 60_000 });
    await page.waitForTimeout(2500);
    await shot(page, "starting-contact-list");
    const { db, uid } = await session();
    const made = (await getDocs(collection(db, "users", uid, "manuscripts"))).docs.filter((d) => !before.ids.manuscripts.includes(d.id)).map((d) => d.data());
    record("Just getting started", { ack, title, lit, readiness, note, bookTitle, url: new URL(page.url()).pathname, manuscripts: made.map((m) => ({ title: m.title, status: m.status, genre: m.genre, subGenres: m.subGenres ?? null, ageCategory: m.ageCategory ?? null, wordCount: m.wordCount ?? null })), errors });
    expect(errors).toEqual([]);
    expect(ack.stamp).toBe("Just getting started");
    expect(ack.passage.startsWith("Got it. You're at the start."), ack.passage).toBe(true);
    expect(ack.tbc, "Title TBC is offered here").toBe(1);
    expect(title, "Title TBC fills the field").toBe("Untitled manuscript");
    expect(lit || readiness > 0, "Continue lights once the title is in (and the readiness question is answered)").toBe(true);
    expect(note).toContain("Still writing?");
    expect(bookTitle).toBe("Untitled manuscript");
    expect(new URL(page.url()).pathname, "it ends at the Contact list, not the fork").toBe("/agents");
    expect(made.length, "one manuscript was written, at the end of set-up").toBe(1);
    expect(made[0].title).toBe("Untitled manuscript");
    expect(made[0].status).toBe("Drafting");
    expect(made[0].genre).toBe("Fantasy");
  } finally {
    await ctx.close();
    await restore(before);
  }
});

test("WALK · template-mixed.csv through the gated review to the dashboard", async ({ browser, baseURL }) => {
  await enterSetup();
  const { ctx, page, errors } = await signIn(browser, baseURL!);
  try {
    await toBook(page, "A few queries out", "The Salt Road");
    await page.locator('[data-o9="title-card"] [data-act="continue"]').click();
    await page.locator('[data-o9="book-card"].is-in').waitFor({ timeout: 20_000 });
    await page.locator('[data-o9="genre"] [data-genre="thriller"]').click();
    await page.locator('[data-o9="book-card"] [data-act="continue"]').click();
    await page.locator('[data-act="upload"]').waitFor({ timeout: 20_000 });
    await page.locator('input[type="file"][data-picker="template"]').setInputFiles(FX("template-mixed.csv"));

    // the summary
    await page.locator('[data-im="summary"]').waitFor({ timeout: 30_000 });
    const summary = await page.evaluate(() => ({
      title: document.querySelector('[data-im="title"]')?.textContent ?? "", line: document.querySelector('[data-im="read-line"]')?.textContent ?? "",
      agents: document.querySelector('[data-im="card-agents"] [data-im="total"]')?.textContent, queries: document.querySelector('[data-im="card-queries"] [data-im="total"]')?.textContent,
      lead: document.querySelector('[data-im="lead"]')?.textContent ?? "", mark: document.querySelectorAll('[data-im="summary"] [data-o9="gomark"]').length,
      tiers: [...document.querySelectorAll('.im-tiers [data-tier="ask"] p')].map((p) => p.textContent ?? ""),
    }));
    await shot(page, "import-summary");
    await page.locator('[data-im="primary"]').click();

    // the agents step: two questions, and the primary waits
    await page.locator('[data-im="review"][data-step="agents"]').waitFor({ timeout: 20_000 });
    const agents = { total: await stepTotal(page), primary: ((await page.locator('[data-im="primary"]').textContent()) ?? "").trim(), off: await page.locator('[data-im="primary"]').isDisabled(), cards: await readStep(page) };
    await shot(page, "import-agents");
    await answerAgents(page); // Owen Hale carries on without an agency; the row with no agent and no agency is removed
    await page.locator('[data-im="primary"]').click();

    // the queries step: the unreadable date and the blank date are both asked
    await page.locator('[data-im="review"][data-step="queries"]').waitFor({ timeout: 20_000 });
    const queries = { total: await stepTotal(page), primary: ((await page.locator('[data-im="primary"]').textContent()) ?? "").trim(), off: await page.locator('[data-im="primary"]').isDisabled(), cards: await readStep(page) };
    await shot(page, "import-queries");
    const clara = await showCard(page, (await page.locator('[data-im="deck-card"]').evaluateAll((cs) => cs.map((c) => c.getAttribute("data-card")))).find(Boolean)!);
    void clara;
    /* Clara Voss ("sometime in May"): I don't have this date. Jamal Carter (blank): a date is typed. */
    for (let i = 0; i < 4 && (await page.locator('[data-im="primary"]').isDisabled()); i++) {
      const card = page.locator('[data-im="deck-card"]');
      const who = (await card.locator(".o9-qwho b").textContent()) ?? "";
      if (/Jamal/.test(who)) { await card.locator('input[type="date"]').fill("2026-03-01"); await card.getByRole("button", { name: "Save date" }).click(); }
      else await card.getByRole("button", { name: "I don't have this date" }).click();
    }
    const done = { head: await page.locator('[data-im="all-head"]').textContent(), line: await page.locator('[data-im="all-line"]').textContent(), primary: ((await page.locator('[data-im="primary"]').textContent()) ?? "").trim() };
    await shot(page, "import-queries-done");
    await page.locator('[data-im="primary"]').click();

    // the importing loader, then the dashboard
    await page.locator(".os-root.d58:not(.is-ghost)").first().waitFor({ timeout: 60_000 });
    await page.locator('[data-probe-text="chart-title"]').first().waitFor({ timeout: 30_000 });
    /* the set-up frame hands over to the app; the notice is read once the frame has gone */
    await page.waitForFunction(() => !document.querySelector(".sf-sheet"), null, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2500);
    const dash = await page.evaluate(() => {
      const vis = (el: Element) => (el as HTMLElement).offsetParent !== null;
      const root = [...document.querySelectorAll(".os-root.d58")].find(vis) ?? document.body;
      return {
        title: [...root.querySelectorAll('[data-probe-text="chart-title"]')].find(vis)?.textContent ?? "",
        notice: [...root.querySelectorAll('[data-d58="notice"]')].find(vis)?.textContent?.replace(/\s+/g, " ").trim() ?? "",
      };
    });
    await shot(page, "import-dashboard");
    const stored = await readImported(before);
    const after = (await snapshot()).counts;
    const rows = stored.queries.map((q: Record<string, unknown>) => ({ status: q.status, dateSent: typeof q.dateSent === "string" ? q.dateSent.slice(0, 10) : null })).sort((a: { status: unknown }, b: { status: unknown }) => String(a.status).localeCompare(String(b.status)));
    record("import", { summary, agents: { ...agents, cards: agents.cards.map((c) => [c.text.slice(0, 60), c.chip, c.asks]) }, queries: { ...queries, cards: queries.cards.map((c) => [c.text.slice(0, 60), c.chip, c.asks]) }, done, dash, rows, lines: stored.lines, countsAfterImport: after, errors });
    expect(errors).toEqual([]);
    expect(summary.title).toBe("We've read your file.");
    expect(summary.line).toBe("4 rows, read and sorted. Nothing is saved yet.");
    expect(summary.mark).toBe(1);
    expect([summary.agents, summary.queries]).toEqual(["4", "4"]);
    expect(summary.lead).toBe("Most of it's ready to go. 2 agents need an answer and 2 queries need an answer. Each one is a quick pick, and then everything lands at once.");
    expect(summary.tiers).toEqual(["1 has no agency. Add it, or say you're carrying on without one. 1 row has no agent or agency. Name it, or remove it.", "2 dates missing. One pick each."]);
    expect([agents.total, agents.off, agents.primary]).toEqual([4, true, "Continue to queries · 2 to answer first"]);
    expect(agents.cards.filter((c) => c.asks === "1").map((c) => c.chip).sort()).toEqual(["No agency name", "No agent or agency"]);
    expect([queries.total, queries.off, queries.primary], "three queries are left once the nameless row is removed").toEqual([3, true, "Import and get started · 2 to answer first"]);
    expect(queries.cards.filter((c) => c.asks === "1").map((c) => c.chip), "the unreadable date and the blank date").toEqual(["Date needed", "Date needed"]);
    expect(done).toEqual({ head: "All 2 answered.", line: "1 date added, 1 left blank on purpose.", primary: "Import and get started" });
    expect(rows, "the chosen date is written; the other stays undated").toEqual([
      { status: "Full Requested", dateSent: "2026-03-01" }, { status: "Partial Requested", dateSent: null }, { status: "Queried", dateSent: "2026-03-14" },
    ]);
    expect(after.queries - before.counts.queries).toBe(3);
    expect(after.agents - before.counts.agents).toBe(3);
    expect(after.manuscripts - before.counts.manuscripts).toBe(1);
    expect(dash.notice).toContain("1 row from your file wasn't imported. It had no agent or agency name.");
    expect(stored.lines).toEqual(["Template import · 3 agents added, 3 queries logged"]);
  } finally {
    await ctx.close();
    await restore(before);
  }
});
