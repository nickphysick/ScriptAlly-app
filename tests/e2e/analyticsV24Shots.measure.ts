/**
 * Analytics v24 — the report's screenshots (not a lock): one beside each reference screen at 1512, 1280 and 390, then
 * the page at 1920 and 1024. AN24_SHOTS=1 to run; AN24_ONLY=<name fragment> to take a few. The empty page and the
 * one-query / one-pass / no-stated-time states are seeded and removed in the same run (tests/e2e/seedAn24.mjs).
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { openAn } from "./an17Lib";

const DIR = process.env.AN24_DIR ?? "reports/analytics-v24/shots";
const ONLY = process.env.AN24_ONLY ?? "";
const VP = (w: number) => (w <= 760 ? { width: w, height: 844 } : w === 1280 ? { width: 1280, height: 800 } : { width: w, height: 900 });
test.skip(!process.env.AN24_SHOTS, "AN24_SHOTS=1 to take the report's screenshots");

export async function openMs(page: Page, w: number, ms: string) {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id); } catch { /* */ } }, ms);
  await openAn(page, VP(w));
}
export async function scrollToSec(page: Page, sel: string, off = 30) {
  await page.evaluate(({ sel, off }) => {
    const p = [...document.querySelectorAll<HTMLElement>('[data-a17="page"]')].find((e) => e.getBoundingClientRect().height > 0)!;
    const sc = p.closest(".wpg-scroll") as HTMLElement;
    const t = [...p.querySelectorAll<HTMLElement>(sel)].find((e) => e.getBoundingClientRect().height > 0);
    if (t) sc.scrollTop = t.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - off;
  }, { sel, off });
  await page.waitForTimeout(300);
}

const SECS = [["01-what-happened", 0], ["02-benchmarking", 1], ["03-how-many", 2], ["04-reply-when-said", 3], ["05-still-waiting", 4], ["06-moments", 5], ["07-note", 6]] as const;
const want = (name: string) => !ONLY || ONLY.split(",").some((o) => name.includes(o));

test("populated", async ({ page }) => {
  test.skip(ONLY === "empty" || ONLY === "states", "AN24_ONLY");
  test.setTimeout(600_000);
  mkdirSync(DIR, { recursive: true });
  for (const w of [1512, 1280, 390]) {
    await openMs(page, w, "seed-ms-1");
    if (want(`00-top-${w}`)) await page.screenshot({ path: `${DIR}/00-top-${w}.png` });
    for (const [name, sec] of SECS) {
      if (!want(`${name}-${w}`)) continue;
      await scrollToSec(page, `[data-a17="sec"][data-sec="${sec}"]`);
      await page.screenshot({ path: `${DIR}/${name}-${w}.png` });
    }
  }
  for (const w of [1920, 1024]) {
    if (!want(`top-${w}`)) continue;
    await openMs(page, w, "seed-ms-1");
    await page.screenshot({ path: `${DIR}/top-${w}.png` });
  }
});

/** AN24_PEEK="<selector>|<width>|<name>": one screenshot scrolled to a selector, for checking a part while building. */
test("peek", async ({ page }) => {
  test.skip(!process.env.AN24_PEEK, "AN24_PEEK to take one");
  test.setTimeout(200_000);
  mkdirSync(DIR, { recursive: true });
  const [sel, w, name] = (process.env.AN24_PEEK as string).split("|");
  await openMs(page, Number(w), process.env.AN24_MS ?? "seed-ms-1");
  await scrollToSec(page, sel);
  await page.screenshot({ path: `${DIR}/${name}.png` });
});

/** The empty page beside 08 and 09, at the three widths. Seeds and removes its own manuscript. */
test("empty", async ({ page }) => {
  test.skip(!!ONLY && !ONLY.includes("empty"), "AN24_ONLY");
  test.setTimeout(400_000);
  mkdirSync(DIR, { recursive: true });
  execSync("node tests/e2e/seedAn21.mjs empty", { stdio: "pipe" });
  try {
    for (const w of [1512, 1280, 390]) {
      await openMs(page, w, "seed-an21-empty");
      await page.screenshot({ path: `${DIR}/08-empty-top-${w}.png` });
      await scrollToSec(page, '[data-a24="steps"]');
      await page.screenshot({ path: `${DIR}/09-empty-how-it-works-${w}.png` });
    }
  } finally { execSync("node tests/e2e/seedAn21.mjs restore", { stdio: "pipe" }); }
});

/** Exactly one query (the dev review aid), one reply that is a pass, and no stated times at all: at 1512, top and S1–S5. */
test("states", async ({ page }) => {
  test.skip(!!ONLY && !ONLY.includes("states"), "AN24_ONLY");
  test.setTimeout(600_000);
  mkdirSync(DIR, { recursive: true });
  const take = async (name: string) => {
    await page.screenshot({ path: `${DIR}/${name}-top.png` });
    for (const sec of [0, 1, 3, 4]) { await scrollToSec(page, `[data-a17="sec"][data-sec="${sec}"]`); await page.screenshot({ path: `${DIR}/${name}-s${sec + 1}.png` }); }
  };
  await page.addInitScript(() => { (window as unknown as { __SA_AN_LIMIT?: number }).__SA_AN_LIMIT = 1; });
  await openMs(page, 1512, "seed-ms-1");
  await take("state-one-query");
  for (const [mode, name] of [["pass", "state-one-pass"], ["notime", "state-no-stated-times"]] as const) {
    const ms = execSync(`node tests/e2e/seedAn24.mjs ${mode}`, { encoding: "utf8" }).trim().split("\n").pop()!;
    try {
      const p2 = await page.context().newPage();
      await openMs(p2, 1512, ms);
      const take2 = async () => {
        await p2.screenshot({ path: `${DIR}/${name}-top.png` });
        for (const sec of [0, 1, 3, 4]) { await scrollToSec(p2, `[data-a17="sec"][data-sec="${sec}"]`); await p2.screenshot({ path: `${DIR}/${name}-s${sec + 1}.png` }); }
      };
      await take2();
      await p2.close();
    } finally { execSync("node tests/e2e/seedAn24.mjs restore", { stdio: "pipe" }); }
  }
});

/** The harness account's figures, for the report's "for Nick" (not a lock). */
test("figures", async ({ page }) => {
  test.skip(!!ONLY && !ONLY.includes("figures"), "AN24_ONLY");
  mkdirSync(DIR, { recursive: true });
  await openMs(page, 1512, "seed-ms-1");
  await page.waitForFunction(() => !!(window as unknown as { __SA_AN21?: unknown }).__SA_AN21);
  const f = await page.evaluate(() => {
    const m = (window as unknown as { __SA_AN21: any }).__SA_AN21; // eslint-disable-line @typescript-eslint/no-explicit-any
    const v = m.v24;
    return { sent: m.sent, replies: m.replies, requests: m.requests, offers: m.offers, outcomes: v.outcomes, rate: v.rate, expected: v.expected, bench: v.bench,
      replyNoTime: v.keeping.unplaced, repliesPlaced: v.keeping.placed, waiting: v.waiting.waiting.length, waitingNoTime: v.waiting.noTime,
      readingUndated: v.waiting.reading.filter((r: { askedMs: number | null }) => r.askedMs === null).length, reading: v.waiting.reading.length, month: v.month };
  });
  writeFileSync(`${DIR}/../harness-figures.json`, JSON.stringify(f, null, 1));
});
