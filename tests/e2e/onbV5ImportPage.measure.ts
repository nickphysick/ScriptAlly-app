/**
 * IP1 — the Import page (onboarding v5, part 3).
 *
 *   SA_E2E_BASE_URL=http://127.0.0.1:<port> npx playwright test onbV5ImportPage --project=measure --no-deps
 *   IP1_CAPTURE=1   write lock P1's fixture (done once, on the build before Phase 1)
 *   IP1_MUTATE=<lock>   apply that lock's named break in the page
 *   IP1_SHOTS=1     write the report's screenshots
 */
import { test, expect, type Page } from "@playwright/test";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { assertLocalBundleIsDev } from "./bundleGuard";
import { FIX, MUTATE, lab, capture, record, vpName } from "./ip1Lib";

test.setTimeout(120_000);

/* ════ P1 · Phase 1 changes nothing a writer can see ════════════════════════════════════════════
   Every import screen on the lab, as rendered by the build BEFORE the import was lifted out of
   BranchB, against the same screen now. Static screens compare their whole markup; the two loaders
   compare their structure (their text and inline styles move with time). */
interface Screen { id: string; q: string; mode: "full" | "skeleton"; steps?: Array<"primary" | "import">; wait?: string }
const P1_SCREENS: Screen[] = [
  { id: "book", q: "s=book", mode: "full" },
  { id: "book-filled", q: "s=book&filled=1", mode: "full" },
  { id: "fork", q: "s=fork", mode: "full" },
  { id: "confirm", q: "s=confirm", mode: "full" },
  { id: "used-free", q: "s=used-free", mode: "full" },
  { id: "used-pro", q: "s=used-pro", mode: "full" },
  { id: "unreadable", q: "s=unreadable", mode: "full" },
  { id: "nothing", q: "s=nothing", mode: "full" },
  { id: "unloaded", q: "s=unloaded", mode: "full" },
  { id: "reading-work", q: "s=reading&hold=work", mode: "skeleton" },
  { id: "reading-done", q: "s=reading&hold=done", mode: "skeleton" },
  { id: "importing", q: "s=importing", mode: "skeleton" },
  { id: "flow-overview-review", q: "s=flow&fx=review", mode: "full" },
  { id: "flow-overview-dupes", q: "s=flow&fx=dupes", mode: "full" },
  { id: "flow-overview-clear", q: "s=flow&fx=clear", mode: "full" },
  { id: "flow-duplicates", q: "s=flow&fx=dupes", mode: "full", steps: ["primary"] },
  { id: "flow-agents", q: "s=flow&fx=review", mode: "full", steps: ["primary"] },
  { id: "flow-queries", q: "s=flow&fx=review", mode: "full", steps: ["primary", "primary"] },
  { id: "flow-importing", q: "s=flow&fx=clear&floor=60000", mode: "skeleton", steps: ["primary", "primary", "import"] },
  { id: "flow-nothing", q: "s=flow&fx=clear&none=1&floor=50", mode: "full", steps: ["primary", "primary", "import"], wait: '[data-screen="nothing"], [data-sf="chip"]' },
];
const P1_VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const CAPTURE = !!process.env.IP1_CAPTURE;
const P1_FILE = resolve(FIX, "p1-before.json");

async function reach(page: Page, s: Screen) {
  await lab(page, s.q);
  for (const step of s.steps ?? []) {
    await page.locator('[data-im="primary"]').first().click();
    await page.waitForTimeout(step === "import" ? 500 : 250);
  }
  if (s.wait) await page.waitForSelector(s.wait, { timeout: 15_000 });
  await page.waitForTimeout(300);
  if (MUTATE === "P1") {
    /* the named break: reorder two children in the summary */
    await page.evaluate(() => { const pops = document.querySelector(".im-pops"); if (pops && pops.children.length > 1) pops.appendChild(pops.children[0]); });
  }
}

for (const vp of P1_VIEWPORTS) {
  test.describe(`P1 ${vpName(vp)}`, () => {
    test.use({ viewport: vp });
    test("P1 every import screen renders as it did before the move", async ({ page }) => {
      await assertLocalBundleIsDev();
      const before: Record<string, { html: string; boxes: unknown[] }> = !CAPTURE && existsSync(P1_FILE) ? JSON.parse(readFileSync(P1_FILE, "utf8")) : {};
      const now: Record<string, { html: string; boxes: unknown[] }> = {};
      const diffs: string[] = [];
      for (const s of P1_SCREENS) {
        await reach(page, s);
        const c = await capture(page, '[data-sf="sheet"]', s.mode);
        expect(c, `${s.id}: the sheet is on screen`).toBeTruthy();
        expect(c!.html.length, `${s.id}: the screen has markup`).toBeGreaterThan(200);
        now[`${s.id}@${vp.width}`] = c!;
        if (CAPTURE) continue;
        const was = before[`${s.id}@${vp.width}`];
        if (!was) { diffs.push(`${s.id}: no capture to compare with`); continue; }
        if (was.html !== c!.html) {
          let i = 0; while (i < was.html.length && was.html[i] === c!.html[i]) i += 1;
          diffs.push(`${s.id}: markup differs at ${i}: was "${was.html.slice(Math.max(0, i - 40), i + 60)}" now "${c!.html.slice(Math.max(0, i - 40), i + 60)}"`);
        }
        const a = was.boxes as [string, number, number, number, number][]; const b = c!.boxes as [string, number, number, number, number][];
        if (a.length !== b.length) diffs.push(`${s.id}: ${a.length} boxes before, ${b.length} now`);
        else for (let k = 0; k < a.length; k++) {
          if (a[k][0] !== b[k][0] || [1, 2, 3, 4].some((j) => Math.abs((a[k][j] as number) - (b[k][j] as number)) > 0.5)) { diffs.push(`${s.id}: box ${k} ${JSON.stringify(a[k])} → ${JSON.stringify(b[k])}`); break; }
        }
      }
      if (CAPTURE) {
        mkdirSync(FIX, { recursive: true });
        const all = existsSync(P1_FILE) ? JSON.parse(readFileSync(P1_FILE, "utf8")) : {};
        writeFileSync(P1_FILE, JSON.stringify({ ...all, ...now }, null, 0) + "\n");
        return;
      }
      record("P1", vpName(vp), "screens", { compared: Object.keys(now).length, diffs });
      expect(Object.keys(now).length, "every screen was compared").toBe(P1_SCREENS.length);
      expect(diffs).toEqual([]);
    });
  });
}
