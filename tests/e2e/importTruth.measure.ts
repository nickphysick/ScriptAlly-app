/**
 * IT1 · R1 and N3 (rendered), with A2 and M1 seen on the way — the walk on dev.
 * N3: an import made from the Import page shows its skipped-rows notice on the dashboard with no reload.
 *
 * Signs in as the dedicated empty fixture account and imports `template-iso.csv` (through set-up,
 * which creates the manuscript), then the SAME file again from the Import page, then
 * `template-mixed.csv` from the Import page. It reads what the app shows and what the store holds
 * after each, then removes every document the walk created and proves the account's document
 * counts match the snapshot taken before. The password is never printed.
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test importTruth --project=measure --no-deps --workers=1
 *   IT_SHOTS=1        write the report's screenshots
 * Its mutation is made in the source and rebuilt (drop the duplicate check in lib/importDuplicates),
 * never by a hook in the product: the walk then leaves ten queries where one import leaves five.
 */
import { walkSetupToFork, answerAgents, answerQueries, readStep, stepTotal } from "./reviewDrive";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync, existsSync, mkdirSync, appendFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { session, snapshot, enterSetup, restore, ACCOUNT_EMAIL } from "./importFixesAccount.mjs";

const OUT = resolve(process.cwd(), "reports/import-truth");
const SHOTS = !!process.env.IT_SHOTS;
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
  await page.screenshot({ path: resolve(OUT, "shots", `${name}.png`) });
};

/** From the summary to the dashboard: the summary's counts, the review's rows, then Import. */
async function throughReview(page: Page, tag: string) {
  await page.locator('[data-im="summary"]').waitFor({ timeout: 30_000 });
  const summary = await page.evaluate(() => ({
    agents: document.querySelector('[data-im="card-agents"] [data-im="total"]')?.textContent ?? "",
    queries: document.querySelector('[data-im="card-queries"] [data-im="total"]')?.textContent ?? "",
  }));
  await shot(page, `${tag}-summary-1440`);
  await page.locator('[data-im="primary"]').click();
  await page.locator('[data-im="review"][data-step="agents"]').waitFor({ timeout: 20_000 });
  const agentRows = await stepTotal(page);
  /* v9: the deck asks. No agency: carry on without one. No agent and no agency: remove the row. */
  await answerAgents(page);
  await page.locator('[data-im="primary"]').click();
  await page.locator('[data-im="review"][data-step="queries"]').waitFor({ timeout: 20_000 });
  const queryRows = (await readStep(page)).map((r) => r.text.slice(0, 160));
  await shot(page, `${tag}-review-queries-1440`);
  await answerQueries(page, { undated: true });
  await page.locator('[data-im="primary"]').click();
  await page.locator(".os-root.d58:not(.is-ghost)").first().waitFor({ timeout: 60_000 });
  await page.locator('[data-probe-text="chart-title"]').first().waitFor({ timeout: 30_000 });
  await page.waitForTimeout(2500);
  return { summary, agentRows, queryRows };
}
async function readDashboard(page: Page) {
  /* the loading title states no figure; wait for the loaded one, on the dashboard that is on screen */
  await page.waitForFunction(() => {
    const vis = (el: Element) => (el as HTMLElement).offsetParent !== null;
    const t = [...document.querySelectorAll('.os-root.d58:not(.is-ghost) [data-probe-text="chart-title"]')].find(vis)?.textContent ?? "";
    return t !== "" && t !== "Active queries";
  }, null, { timeout: 60_000 });
  await page.waitForTimeout(800);
  const toggle = page.locator('[data-d58="notice-toggle"]').first();
  if (await toggle.isVisible().catch(() => false)) { if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click(); await page.waitForTimeout(200); }
  return page.evaluate(() => {
    const vis = (el: Element) => (el as HTMLElement).offsetParent !== null;
    const root = [...document.querySelectorAll(".os-root.d58")].find(vis) ?? document.body;
    return {
      title: [...root.querySelectorAll('[data-probe-text="chart-title"]')].find(vis)?.textContent ?? "",
      more: [...root.querySelectorAll('[data-probe-text="chart-undated"]')].find(vis)?.textContent ?? null,
      notice: ([...root.querySelectorAll('[data-d58="notice"]')].find(vis)?.querySelector("p, span, strong")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      noticeText: ([...root.querySelectorAll('[data-d58="notice"]')].find(vis)?.textContent ?? "").replace(/\s+/g, " ").trim(),
      noticeRows: [...root.querySelectorAll('[data-d58="notice-row"]')].filter(vis).map((r) => (r.textContent ?? "").replace(/\s+/g, " ").trim()),
    };
  });
}
/** Open the Import page and hand the template tile a file. */
async function uploadFromImportPage(page: Page, file: string) {
  await page.goto("/import");
  await page.locator('[data-impg="tile"][data-tile="template"] [data-act="upload"]').waitFor({ timeout: 30_000 });
  await page.waitForTimeout(600);
  await page.locator('input[type="file"]').nth(1).setInputFiles(FX(file));
}

test.describe.configure({ mode: "serial" });
test.setTimeout(420_000);

let before: Awaited<ReturnType<typeof snapshot>>;
test.beforeAll(async () => { await session(); before = await snapshot(); record("countsBefore", before.counts); });
test.afterAll(async () => {
  const after = await restore(before);
  record("countsAfter", after);
  expect(after, "the account's document counts match the snapshot taken before").toEqual(before.counts);
});

test("R1 · the same sheet twice leaves one import's worth; then a mixed sheet", async ({ browser, baseURL }) => {
  await assertLocalBundleIsDev();
  await enterSetup();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL: baseURL!, storageState: { cookies: [], origins: [] } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    try {
      // ── sign in; set-up: the journey question, the book, the fork ──
      await page.goto("/#/signin");
      await page.locator("#au-email").fill(ACCOUNT_EMAIL);
      await page.locator("#au-pw").fill(readPw());
      await page.getByRole("button", { name: /^Sign in$/ }).last().click();
      /* v9: set-up's book step is the acknowledgement, the title and "Your book" (one walker). */
      await walkSetupToFork(page);

      // ── 1 · template-iso.csv ──
      await page.locator('input[type="file"]').nth(1).setInputFiles(FX("template-iso.csv"));
      const first = await throughReview(page, "1-iso");
      const afterOne = (await snapshot()).counts;
      const dashOne = await readDashboard(page);
      record("first", { ...first, dash: dashOne, counts: afterOne });
      expect([first.summary.agents, first.summary.queries]).toEqual(["5", "5"]);
      expect(afterOne.queries - before.counts.queries, "five queries were written").toBe(5);
      expect(afterOne.agents - before.counts.agents).toBe(5);
      expect(dashOne.title).toBe("4 active queries");
      expect(dashOne.more, "every live query is dated, so there is no line").toBeNull();

      // ── A2 · the Contact list: an imported agent's status is not known ──
      await page.goto("/agents");
      await page.locator(".clv-row").first().waitFor({ timeout: 30_000 });
      await page.waitForTimeout(1500);
      const contacts = await page.evaluate(() => {
        const vis = (el: Element) => (el as HTMLElement).offsetParent !== null;
        const rows = [...document.querySelectorAll(".clv-row[data-door]")].filter(vis);
        return {
          rows: rows.length,
          doors: rows.map((r) => r.getAttribute("data-door")),
          notKnown: rows.filter((r) => r.querySelector('[data-clv="door-unknown"]')?.textContent === "Not known").length,
          openWords: rows.filter((r) => /Open to queries/.test(r.textContent ?? "")).length,
        };
      });
      record("contactList", contacts);
      await page.locator(".clv-row[data-door]").first().scrollIntoViewIfNeeded();
      await page.evaluate(() => { for (const el of document.querySelectorAll<HTMLElement>("[data-guide-card], .pg-card")) el.style.display = "none"; });
      await page.waitForTimeout(300);
      await shot(page, "1-contact-list-1440");
      expect(contacts.rows, "the five imported agents are listed").toBe(5);
      expect(contacts.notKnown, "each reads Not known").toBe(5);
      expect(contacts.openWords, "none reads Open").toBe(0);
      expect(contacts.doors.every((d) => d === "unknown")).toBe(true);

      // ── 2 · the same file again, from the Import page ──
      await uploadFromImportPage(page, "template-iso.csv");
      await page.locator('[data-dead="nothing"]').waitFor({ timeout: 30_000 });
      const nothing = ((await page.locator('[data-dead="nothing"]').textContent()) ?? "").replace(/\s+/g, " ").trim();
      await shot(page, "2-iso-again-nothing-imported-1440");
      const afterTwo = (await snapshot()).counts;
      record("second", { screen: nothing, counts: afterTwo });
      expect(afterTwo, "the account's counts equal one import").toEqual(afterOne);
      expect(nothing, "it does not say the import failed").toContain("Nothing new to import.");
      expect(nothing).not.toContain("That didn't work.");
      expect(nothing).toContain("0 queries imported · 0 agents added");
      expect(nothing).toContain("5 rows were skipped: already in your queries.");
      await page.locator('[data-dead="nothing"] [data-act="review"]').click();
      await page.locator('[data-impg="tiles"]').waitFor({ timeout: 10_000 });
      /* N3 · BACK TO THE DASHBOARD WITHOUT A RELOAD. The page was loaded once, at /import; the mark set
         here is lost by any reload, and it is still there when the notice is read. */
      await page.evaluate(() => { (window as unknown as Record<string, unknown>).__noReload = "second"; });
      await page.getByRole("button", { name: /^Dashboard$/ }).first().click();
      await page.locator(".os-root.d58:not(.is-ghost)").first().waitFor({ timeout: 60_000 });
      await page.waitForTimeout(1500);
      const dashTwo = await readDashboard(page);
      expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__noReload), "the page was not reloaded").toBe("second");
      record("secondDashboard", dashTwo);
      await shot(page, "2-iso-again-dashboard-notice-1440");
      expect(dashTwo.noticeRows.length, "every row of the file is listed").toBe(5);
      expect(dashTwo.noticeRows.every((r) => r.includes("Already in your queries")), JSON.stringify(dashTwo.noticeRows)).toBe(true);
      expect(dashTwo.noticeText, "the no-name sentence is not said").not.toContain("no agent or agency name");
      expect(dashTwo.title).toBe("4 active queries");

      // ── 3 · template-mixed.csv, from the Import page ──
      await uploadFromImportPage(page, "template-mixed.csv");
      await page.evaluate(() => { (window as unknown as Record<string, unknown>).__noReload = "third"; });
      const third = await throughReview(page, "3-mixed");
      expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__noReload), "the page was not reloaded on the way to the dashboard").toBe("third");
      const afterThree = (await snapshot()).counts;
      const dashThree = await readDashboard(page);
      record("third", { ...third, dash: dashThree, counts: afterThree });
      await shot(page, "3-mixed-dashboard-1440");
      /* v9: the nameless row is counted and asked about; the walk removes it, so three are written */
      expect([third.summary.agents, third.summary.queries], "the nameless row is asked about; three queries are new").toEqual(["4", "4"]);
      expect(afterThree.queries - afterOne.queries, "three queries were written, two of them undated").toBe(3);
      expect(afterThree.agents - afterOne.agents, "Owen Hale is new; Clara Voss and Jamal Carter are not added again").toBe(1);
      // M1, on the page: the chart draws the dated ones and says how many more it cannot place
      expect(dashThree.title).toBe("5 active queries");
      expect(dashThree.more).toBe("2 more have no sent date yet.");
      /* N3 · the import ended on the dashboard by the app's own navigation, with no reload, and the
         notice is the one THIS import saved: one nameless row, and none of the five from before. */
      record("thirdNotice", { headline: dashThree.notice, rows: dashThree.noticeRows });
      expect(dashThree.noticeText).toContain("1 row from your file wasn't imported. It had no agent or agency name.");
      expect(dashThree.noticeRows.length, "the count is this import's").toBe(1);
      expect(dashThree.noticeRows.some((r) => r.includes("Already in your queries")), "the earlier notice is gone").toBe(false);
      expect(errors).toEqual([]);
    } catch (e) {
      const at = await page.evaluate(() => ({
        url: location.href,
        h: [...document.querySelectorAll("h1,h2")].filter((x) => (x as HTMLElement).offsetParent !== null).map((x) => x.textContent?.trim().slice(0, 60)),
        buttons: [...document.querySelectorAll("button")].filter((x) => (x as HTMLElement).offsetParent !== null).map((x) => x.textContent?.trim().slice(0, 40)).slice(0, 24),
      })).catch(() => null);
      console.log("WALK STOPPED AT", JSON.stringify(at), "page errors:", JSON.stringify(errors));
      throw e;
    }
  } finally {
    await ctx.close();
    /* whatever happened, the account goes back to what it held */
    await restore(before);
  }
});
