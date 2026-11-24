/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controls: entry v1 · close-out 2 — ONE DATE PER QUERY ON THE RENDERED TO-DO PAGE (emulator, 1440 × 900), after the
 * ce1 entries are written (tests/e2e/seedCe1.mjs). The page draws a query's date in three places: the tray row's
 * figure, the desk's header figure when the task is open, and the query card inside the desk (its reply note's
 * "Send by" / "Reply expected by" line). Every one is read and turned into a day; they must name the same day.
 *
 * ⚠️ `lib/todoTray` `comingUp` (the "coming up" dates) has NO RENDERED SURFACE today — only its unit test calls it —
 * so its reading through the one check is proved in src/lib/todoComingUpEntry.test.ts, not here.
 *
 * Population: the two ce1 tasks the page should show (fr's send, n's nudge) must be found, and q / rm / ra (dated
 * entries, so no task before their dates) must not be. A run that finds no ce1 row has failed.
 *
 * Writes reports/controls-entry-v1/ledger/todo-one-date.json. Emulator only, self-cleaning:
 *   npm run e2e:emu -- tests/e2e/ce1TodoOneDate.measure.ts --project=measure
 */
import { expect, test, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

test.setTimeout(600_000);
const VP = { width: 1440, height: 900 };
const DAY = 86_400_000;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const seed = (arg = "") => execSync(`node tests/e2e/seedCe1.mjs ${arg}`.trim(), { encoding: "utf8", stdio: "pipe", timeout: 90_000 });
const today = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime(); };
const ymd = (ms: number) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
/** a figure as a day: "10 days left" → today + 10; "180 days past expected" → today − 180; "Today" → today */
const figureDay = (s: string): string | null => {
  if (/^today$/i.test(s.trim())) return ymd(today());
  const m = s.match(/(\d+) days? (left|past expected)/);
  return m ? ymd(today() + (m[2] === "left" ? 1 : -1) * Number(m[1]) * DAY) : null;
};
/** "Send by Fri 4 Dec" / "Reply expected by 15 Jan" → the next such day on or after (today − 1 year) */
const lineDay = (s: string): string | null => {
  const m = s.match(/(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/);
  if (!m) return null;
  const t = new Date(today()); const y = t.getFullYear();
  for (const yy of [y - 1, y, y + 1]) { const d = new Date(yy, MON.indexOf(m[2]), Number(m[1]), 12); if (d.getTime() >= today() - 200 * DAY && d.getTime() <= today() + 365 * DAY) return ymd(d.getTime()); }
  return null;
};

class Ledger {
  rows: { where: string; ok: boolean; detail: string }[] = [];
  check(where: string, ok: unknown, detail: string) { this.rows.push({ where, ok: !!ok, detail }); console.log(`  ${ok ? "✓" : "✗"} ${where} — ${detail}`); }
}

async function readRow(page: Page, key: string) {
  const row = page.locator(`[data-tws-row='${key}']`).first();
  const figure = ((await row.locator(".tws-du").first().innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
  await row.click();
  await page.waitForTimeout(1500);
  return page.evaluate((fig) => {
    const desk = [...document.querySelectorAll<HTMLElement>("[data-tws='desk']")].find((e) => e.getBoundingClientRect().height > 0);
    const text = (desk?.innerText ?? "").replace(/\s+/g, " ").trim();
    const card = desk?.querySelector<HTMLElement>("[data-qc152='card']") ?? null;
    const lines = card ? [...card.querySelectorAll<HTMLElement>(".oc-sub, [data-qc152='reply-sub']")].map((e) => e.innerText.replace(/\s+/g, " ").trim()).filter(Boolean) : [];
    /* the desk header's figure: the first "N days …" / "Today" before the counter "n/N" */
    const head = text.split(/\d+\/\d+ ‹/)[0] ?? "";
    const deskFig = (head.match(/\d+ days? (left|past expected|waiting|since your reminder|quiet)|Today/) ?? [""])[0];
    return { figure: fig, deskFig, lines, hasCard: !!card, text: text.slice(0, 600) };
  }, figure);
}

test("ce1 · one date per query on the To-do page", async ({ page }) => {
  const L = new Ledger();
  await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "seed-ms-1"); } catch { /* */ } });
  seed("--clean"); seed(); seed("--entries");
  const readings: Record<string, unknown> = {};
  try {
    await openRoute(page, "/todo", VP);
    await page.locator('[data-tws="list"]').first().waitFor({ timeout: 60_000 });
    await page.waitForTimeout(2000);
    const keys = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>("[data-tws-row]")].map((r) => r.getAttribute("data-tws-row") ?? "").filter((k) => k.includes("ce1-")));
    L.check("population · fr's send task is on the page", keys.includes("task-full-ce1-fr"), keys.join(", "));
    L.check("population · n's nudge task is on the page", keys.includes("task-nudge-ce1-n"), keys.join(", "));
    L.check("population · no task yet for q, rm or ra (their entries give later dates)", !keys.some((k) => /ce1-(q|rm|ra)$/.test(k)), keys.join(", "));
    for (const k of keys) {
      const r = await readRow(page, k);
      readings[k] = r;
      const days = [["row", figureDay(r.figure)], ["desk", figureDay(r.deskFig)], ...r.lines.map((l) => [`card "${l}"`, lineDay(l)] as const)] as [string, string | null][];
      const named = days.filter(([, d]) => d != null);
      L.check(`${k} · the row, the desk and the card were all read`, r.figure && r.deskFig && r.hasCard, `row "${r.figure}" · desk "${r.deskFig}" · card ${r.hasCard}`);
      L.check(`${k} · one date everywhere on the page`, named.length >= 2 && new Set(named.map(([, d]) => d)).size === 1, named.map(([w, d]) => `${w}: ${d}`).join(" · "));
    }
    const fr = readings["task-full-ce1-fr"] as { lines: string[] } | undefined;
    L.check("fr · the card names the entry's Send by, and it is the row's day", !!fr && fr.lines.some((l) => /^Send by /.test(l) && lineDay(l) === ymd(today() + 10 * DAY)), JSON.stringify(fr?.lines));
  } finally {
    mkdirSync("reports/controls-entry-v1/ledger", { recursive: true });
    writeFileSync("reports/controls-entry-v1/ledger/todo-one-date.json", JSON.stringify({ rows: L.rows, readings }, null, 1));
    seed("--clean");
  }
  expect(L.rows.filter((r) => !r.ok).map((r) => `${r.where} — ${r.detail}`)).toEqual([]);
  expect(L.rows.length).toBeGreaterThanOrEqual(7);
});
