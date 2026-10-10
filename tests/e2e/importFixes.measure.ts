/**
 * IF1 · U2 — the walk on dev: set-up from the fork to the dashboard with real files.
 *
 * Signs in as the dedicated empty fixture account, imports a template file through set-up, reads
 * the review and the dashboard, then removes every document the import created and proves the
 * account's document counts match the snapshot taken before. The password is never printed.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test importFixes --project=measure --no-deps --workers=1
 *   IF_SHOTS=1    write the report's screenshots
 *   IF_MUTATE=U2  apply U2's named break in the page (fall back to today when the date is missing)
 */
import { test, expect, type Page, type Browser } from "@playwright/test";
import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { session, snapshot, enterSetup, restore, readImported, ACCOUNT_EMAIL } from "./importFixesAccount.mjs";

const OUT = resolve(process.cwd(), "reports/import-fixes");
const SHOTS = !!process.env.IF_SHOTS;
const MUTATE = process.env.IF_MUTATE ?? "";
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
  appendFileSync(resolve(OUT, `readings${MUTATE ? `-mutated-${MUTATE}` : ""}.jsonl`), JSON.stringify({ lock: "U2", name, value }) + "\n");
};
const shot = async (page: Page, name: string) => {
  if (!SHOTS) return;
  mkdirSync(resolve(OUT, "shots"), { recursive: true });
  await page.screenshot({ path: resolve(OUT, "shots", `${name}.png`) });
};

interface Walk { file: string; tag: string; removeOwen?: boolean }

/** From sign-in to the dashboard. Returns what the review and the dashboard showed. */
async function walk(browser: Browser, baseURL: string, w: Walk) {
  await assertLocalBundleIsDev();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL, storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto("/#/signin");
    await page.locator("#au-email").fill(ACCOUNT_EMAIL);
    await page.locator("#au-pw").fill(readPw());
    await page.getByRole("button", { name: /^Sign in$/ }).last().click();

    // set-up: the journey question, the book, the fork
    await page.getByText("A few queries out").first().click({ timeout: 30_000 });
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await page.getByPlaceholder("e.g. The Salt Path Home").fill("The Salt Road", { timeout: 20_000 });
    await page.getByText("Select…").first().click();
    await page.getByText("Thriller", { exact: true }).last().click();
    await page.getByRole("button", { name: /^Continue$/ }).click();
    await page.locator('[data-act="upload"]').waitFor({ timeout: 20_000 });
    await page.locator('input[type="file"]').nth(1).setInputFiles(FX(w.file));

    // the summary
    await page.locator('[data-im="summary"]').waitFor({ timeout: 30_000 });
    const summary = await page.evaluate(() => ({
      agents: document.querySelector('[data-im="card-agents"] [data-im="total"]')?.textContent,
      queries: document.querySelector('[data-im="card-queries"] [data-im="total"]')?.textContent,
      lead: document.querySelector('[data-im="lead"]')?.textContent,
      file: document.querySelector('[data-im="file"]')?.textContent,
    }));
    await shot(page, `${w.tag}-summary-1440`);
    await page.locator('[data-im="primary"]').click();

    // the agents step
    await page.locator('[data-im="review"][data-step="agents"]').waitFor({ timeout: 20_000 });
    const agentRows = await page.locator('[data-im="rows"] [data-row-id]').count();
    await shot(page, `${w.tag}-review-agents-1440`);
    if (w.removeOwen) await page.locator('[data-row-id]', { hasText: "Owen Hale" }).getByTitle("Don't import").click();
    await page.locator('[data-im="primary"]').click();

    // the queries step
    await page.locator('[data-im="review"][data-step="queries"]').waitFor({ timeout: 20_000 });
    const queries = await page.evaluate(() => [...document.querySelectorAll('[data-im="rows"] [data-row-id]')].map((r) => ({
      text: (r.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 220),
      chip: r.querySelector('[data-im="row-chip"]')?.textContent?.trim() ?? "",
      asks: r.getAttribute("data-asks"),
    })));
    const chips = await page.evaluate(() => ({
      ready: document.querySelector('[data-im="chip-ready"]')?.textContent ?? "",
      open: document.querySelector('[data-im="chip-open"]')?.textContent ?? "",
    }));
    await shot(page, `${w.tag}-review-queries-1440`);
    // answer every open date question with the writer's "Leave undated"
    for (let i = 0; i < 6; i++) {
      const leave = page.getByRole("button", { name: "Leave undated" }).first();
      if (!(await leave.isVisible().catch(() => false))) {
        const openRow = page.locator('[data-row-id][data-asks]:not([data-asks="0"])').first();
        if (!(await openRow.count())) break;
        await openRow.click({ position: { x: 60, y: 20 } }).catch(() => {});
        if (!(await leave.isVisible().catch(() => false))) break;
      }
      await leave.click();
      await page.waitForTimeout(150);
    }
    const importLabel = ((await page.locator('[data-im="primary"]').textContent()) ?? "").trim();
    await page.locator('[data-im="primary"]').click();

    // the importing loader, then the dashboard
    await page.locator(".os-root.d58:not(.is-ghost)").first().waitFor({ timeout: 60_000 });
    await page.locator('[data-probe-text="chart-title"]').first().waitFor({ timeout: 30_000 });
    await page.waitForFunction(() => !document.querySelector('.sf-sheet'), null, { timeout: 30_000 }).catch(() => {});
    await page.waitForTimeout(2500);
    if (MUTATE === "U2") {
      /* The named break: where a date is missing, say today. Applied to what the page shows. */
      await page.evaluate(() => {
        for (const el of document.querySelectorAll("*")) if (el.children.length === 0 && el.textContent === "Waiting on you") el.textContent = "Asked today";
      });
    }
    const dash = await page.evaluate(() => {
      const vis = (el: Element) => (el as HTMLElement).offsetParent !== null;
      const root = [...document.querySelectorAll(".os-root.d58")].find(vis) ?? document.body;
      const text = (root.textContent ?? "").replace(/\s+/g, " ");
      return {
        title: [...root.querySelectorAll('[data-probe-text="chart-title"]')].find(vis)?.textContent ?? "",
        waiting: (text.match(/Waiting on you/g) ?? []).length,
        askedToday: (text.match(/Asked today/g) ?? []).length,
        asked: text.match(/Asked [^.]{1,24}? ago/g) ?? [],
        notice: [...root.querySelectorAll('[data-d58="notice"]')].find(vis)?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        today: (text.match(/\btoday\b/gi) ?? []).length,
      };
    });
    await shot(page, `${w.tag}-dashboard-1440`);
    return { summary, agentRows, queries, chips, importLabel, dash, errors };
  } catch (e) {
    /* say where the walk stopped, in the language of the page */
    const at = await page.evaluate(() => ({
      url: location.href,
      h: [...document.querySelectorAll("h1,h2")].filter((x) => (x as HTMLElement).offsetParent !== null).map((x) => x.textContent?.trim().slice(0, 60)),
      buttons: [...document.querySelectorAll("button")].filter((x) => (x as HTMLElement).offsetParent !== null).map((x) => x.textContent?.trim().slice(0, 40)).slice(0, 24),
      alerts: [...document.querySelectorAll('[role="alert"], .sf-err, .au-err')].map((x) => x.textContent?.trim().slice(0, 120)),
    })).catch(() => null);
    console.log("WALK STOPPED AT", JSON.stringify(at), "page errors:", JSON.stringify(errors));
    throw e;
  } finally {
    await ctx.close();
  }
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

async function run(browser: Browser, baseURL: string, w: Walk) {
  await enterSetup();
  try {
    const seen = await walk(browser, baseURL, w);
    const stored = await readImported(before);
    return { ...seen, stored };
  } finally {
    await restore(before);
  }
}

test("U2 · template-iso.csv: every date arrives, and nothing is dated today", async ({ browser, baseURL }) => {
  const r = await run(browser, baseURL!, { file: "template-iso.csv", tag: "iso" });
  record("iso", { summary: r.summary, chips: r.chips, dash: r.dash, lines: r.stored.lines, sent: r.stored.queries.map((q: any) => q.dateSent?.slice(0, 10)).sort() });
  expect(r.errors).toEqual([]);
  expect(r.summary.agents).toBe("5");
  expect(r.summary.queries).toBe("5");
  expect(r.queries.length, "five query rows in the review").toBe(5);
  expect(r.queries.every((q) => q.chip === "Ready"), "every date was read, so nothing is asked").toBe(true);
  expect(r.stored.queries.map((q: any) => q.dateSent?.slice(0, 10)).sort()).toEqual(["2025-11-05", "2026-01-23", "2026-03-14", "2026-05-03", "2026-08-02"]);
  const jamal = r.stored.queries.find((q: any) => q.status === "Partial Requested");
  expect(jamal.partialRequestedDate?.slice(0, 10), "the response date the file gave is the stage's date").toBe("2026-04-02");
  expect(jamal.lastStatusChange?.slice(0, 10)).toBe("2026-04-02");
  expect(r.dash.title).toBe("4 active queries");
  expect(r.dash.askedToday, "no row says Asked today").toBe(0);
  expect(r.dash.asked.length, "the dated request says how long ago it was asked").toBeGreaterThanOrEqual(1);
  expect(r.dash.notice, "nothing was left out").toBe("");
  expect(r.stored.lines).toEqual(["Template import · 5 agents added, 5 queries logged"]);
});

test("U2 · template-mixed.csv: undated stays undated, and the nameless row is stated", async ({ browser, baseURL }) => {
  const r = await run(browser, baseURL!, { file: "template-mixed.csv", tag: "mixed" });
  record("mixed", { summary: r.summary, chips: r.chips, queries: r.queries, dash: r.dash, lines: r.stored.lines, stored: r.stored.queries.map((q: any) => ({ status: q.status, dateSent: q.dateSent ?? null, partialRequestedDate: q.partialRequestedDate ?? null, fullRequestedDate: q.fullRequestedDate ?? null, lastStatusChange: q.lastStatusChange ?? null })) });
  expect(r.errors).toEqual([]);
  expect([r.summary.agents, r.summary.queries], "the summary counts what the review shows").toEqual(["3", "3"]);
  expect(r.agentRows).toBe(3);
  expect(r.queries.length).toBe(3);
  const clara = r.queries.find((q) => q.text.includes("Clara Voss"))!;
  expect(clara.chip, "the unreadable date is asked about").toBe("Date needed");
  expect(r.chips.open).toBe("1 to sharpen");
  expect(r.queries.find((q) => q.text.includes("Owen Hale"))!.text).toContain("No agency");
  expect(r.queries.some((q) => q.text.includes("Agency only"))).toBe(false);
  // the store: no date the file did not give
  const undated = r.stored.queries.filter((q: any) => q.status !== "Queried");
  expect(undated.length, "two undated requests were imported").toBe(2);
  for (const q of undated) {
    expect(q.dateSent ?? null).toBeNull();
    expect(q.partialRequestedDate ?? null).toBeNull();
    expect(q.fullRequestedDate ?? null).toBeNull();
    expect(q.lastStatusChange ?? null).toBeNull();
  }
  // the dashboard
  expect(r.dash.askedToday, "no row says Asked today").toBe(0);
  expect(r.dash.waiting, "the undated requests read Waiting on you").toBeGreaterThanOrEqual(1);
  expect(r.dash.title, "Owen Hale's query is dated, so one can be drawn").toBe("1 active query");
  expect(r.dash.notice).toContain("1 row from your file wasn't imported. It had no agent or agency name.");
  expect(r.stored.lines).toEqual(["Template import · 3 agents added, 3 queries logged"]);
});

test("U2 · with nothing the chart can place, the card says how many and why", async ({ browser, baseURL }) => {
  const r = await run(browser, baseURL!, { file: "template-mixed.csv", tag: "undated", removeOwen: true });
  record("undatedOnly", { dash: r.dash, lines: r.stored.lines });
  expect(r.stored.queries.length).toBe(2);
  expect(r.dash.title).toBe("2 active queries have no sent date yet.");
  expect(r.dash.askedToday).toBe(0);
  expect(r.dash.notice, "the row removed on purpose is not listed; the nameless one is").toContain("1 row from your file wasn't imported.");
});
