/**
 * Two-door import v1 — the page locks (D1, D2, H2, Q1, Q2), measured on the rendered page.
 *
 * `#/onb-lab` (fixtures inside the real SetupFrame; no writes) for the fork, the headings route and
 * the review; `/import` signed in for D2's second half. No Smart Import call is made by any of them:
 * H2 asserts it. `TDI_MUTATE=<name>` applies a page break (threetiles, tplpicker); the behaviour
 * breaks (callsmart, keepasgiven, gateopen) are source changes (scripts/tdi-mutate.mjs) and a rebuild.
 * Readings: reports/two-door-import/readings*.jsonl. The e2e password is never printed.
 */
import { test, expect, type Page } from "@playwright/test";
import { appendFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { openRoute } from "./measure";
import { answerQueries, answerQuery, showCard } from "./reviewDrive";

const OUT = resolve("reports/two-door-import");
const MUTATE = process.env.TDI_MUTATE ?? "";
const WIDE = { width: 1440, height: 900 };
const FIX = (name: string) => resolve("tests/fixtures/import", name);

function record(lock: string, value: unknown) {
  mkdirSync(OUT, { recursive: true });
  appendFileSync(resolve(OUT, `readings${MUTATE ? `-mutated-${MUTATE}` : ""}.jsonl`), JSON.stringify({ lock, at: new Date().toISOString(), value }) + "\n");
}
async function lab(page: Page, q: string) {
  await page.setViewportSize(WIDE);
  await page.goto("/#/onb-lab?" + q, { waitUntil: "load" });
  await page.reload({ waitUntil: "load" });
  await page.locator(".sf").first().waitFor({ state: "visible", timeout: 20_000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
}
/** Every file input on the page and what it is for, and every visible button's label. */
const pickers = (page: Page) => page.evaluate(() => ({
  inputs: [...document.querySelectorAll<HTMLInputElement>('input[type="file"]')].map((i) => ({ picker: i.dataset.picker ?? "", accept: i.accept })),
  buttons: [...document.querySelectorAll<HTMLElement>("button")].filter((b) => b.offsetParent !== null).map((b) => (b.textContent ?? "").trim()),
}));

/* ════ D1 · the fork: two doors, one filled navy button ════ */
test("D1 the fork renders exactly two tiles and exactly one filled navy button", async ({ page }) => {
  await lab(page, "s=fork");
  if (MUTATE === "threetiles") {
    await page.evaluate(() => { const t = document.querySelector(".sf-doors .sf-tile")!; t.parentElement!.appendChild(t.cloneNode(true)); });
  }
  const r = await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).offsetParent !== null && e.getBoundingClientRect().width > 0;
    const tiles = [...document.querySelectorAll('[data-screen="fork"] .sf-tile')].filter(vis);
    const probe = document.createElement("button"); probe.className = "sf-btn"; probe.style.position = "absolute"; probe.style.visibility = "hidden";
    document.querySelector(".sf")!.appendChild(probe);
    const navy = getComputedStyle(probe).backgroundColor; probe.remove();
    const btns = [...document.querySelectorAll<HTMLElement>('[data-screen="fork"] button')].filter(vis);
    const filled = btns.filter((b) => getComputedStyle(b).backgroundColor === navy).map((b) => (b.textContent ?? "").trim());
    return { tiles: tiles.length, navy, filled, titles: tiles.map((t) => t.querySelector("h2")?.textContent ?? ""), ringed: document.querySelectorAll('[data-screen="fork"] .is-ringed').length };
  });
  record("D1", r);
  expect(r.navy, "the filled button's navy resolves").toMatch(/^rgb\(/);
  expect(r.tiles, "two doors").toBe(2);
  expect(r.titles).toEqual(["I have a list", "I'm starting fresh"]);
  expect(r.filled, "one filled navy button, and it is Upload a file").toEqual(["Upload a file"]);
  expect(r.ringed).toBe(0);
});

/* ════ D2 · no template-only picker, on the fork or on /import ════ */
test("D2 no element on the fork or /import opens a template-only picker", async ({ page }) => {
  await lab(page, "s=photos");
  if (MUTATE === "tplpicker") {
    await page.evaluate(() => { const i = document.createElement("input"); i.type = "file"; i.dataset.picker = "template"; i.style.display = "none"; document.body.appendChild(i); });
  }
  const fork = await pickers(page);
  await openRoute(page, "/import", WIDE);
  await page.locator(".impg").first().waitFor({ state: "attached", timeout: 20_000 });
  await page.waitForTimeout(800);
  if (MUTATE === "tplpicker") {
    await page.evaluate(() => { const i = document.createElement("input"); i.type = "file"; i.dataset.picker = "template"; i.style.display = "none"; document.querySelector(".impg")!.appendChild(i); });
  }
  const imp = await pickers(page);
  record("D2", { fork, import: imp });
  for (const [where, p] of [["fork", fork], ["/import", imp]] as const) {
    const sheets = p.inputs.filter((i) => !i.accept.startsWith("image/"));
    expect(sheets.map((i) => i.picker), `${where}: one spreadsheet picker, the import's own`).toEqual(["smart"]);
    expect(p.buttons, `${where}: no template upload button`).not.toContain("Upload my sheet");
  }
});

/* ════ H2 · the headings route makes no Smart Import call and never shows the confirm ════ */
test("H2 a headings file goes straight to the read screen: no callable request, no ConfirmScreen", async ({ page }) => {
  const calls: string[] = [];
  page.on("request", (req) => { if (/smartImportMap|cloudfunctions|europe-west2-/.test(req.url())) calls.push(req.url()); });
  await lab(page, "s=photos");
  await page.evaluate(() => {
    const w = window as Window & { __tdiConfirm?: number };
    w.__tdiConfirm = 0;
    new MutationObserver(() => { if (document.querySelector('[data-screen="confirm"]')) w.__tdiConfirm = (w.__tdiConfirm ?? 0) + 1; })
      .observe(document.body, { childList: true, subtree: true });
  });
  await page.locator('input[type="file"][data-picker="smart"]').setInputFiles(FIX("template-dmy.csv"));
  const reached = await page.locator('[data-im="summary"]').waitFor({ timeout: 15_000 }).then(() => true, () => false);
  const r = await page.evaluate(() => ({
    confirmMounts: (window as Window & { __tdiConfirm?: number }).__tdiConfirm ?? -1,
    readLine: document.querySelector('[data-im="read-line"]')?.textContent ?? "",
    title: document.querySelector('[data-im="title"]')?.textContent ?? "",
  }));
  record("H2", { reached, ...r, calls });
  expect(reached, "the read screen opens").toBe(true);
  expect(r.confirmMounts, "ConfirmScreen never mounts").toBe(0);
  expect(calls, "no request to the Smart Import callable").toEqual([]);
  expect(r.title).toBe("We've read your file");
  expect(r.readLine).toBe("Your headings matched ours, so it was read straight in and checked against QueryHawk's rules. No wait.");
});

/** The lab's review over the two-door fixture, on its queries step. */
async function toQueries(page: Page) {
  await lab(page, "s=review&fx=twodoor");
  const primary = page.locator('[data-im="review"] [data-im="primary"]');
  if ((await page.locator('[data-im="review"]').getAttribute("data-step")) === "agents") { await primary.click(); }
  await page.locator('[data-im="review"][data-step="queries"]').waitFor({ timeout: 10_000 });
  return primary;
}

/* ════ Q1 · dates out of order: no way past but to fix them ════ */
test("Q1 the out-of-order card's button is disabled until the dates run in order, then the model holds them", async ({ page }) => {
  await toQueries(page);
  const card = await showCard(page, "q-q0");
  const confirm = card.locator('[data-order="confirm"]');
  const before = { disabled: await confirm.isDisabled(), label: ((await confirm.textContent()) ?? "").trim(), ask: ((await card.locator('[data-im="deck-ask"]').textContent()) ?? "").trim(), chip: ((await card.locator('[data-im="deck-chip"]').textContent()) ?? "").trim() };
  /* change the full request's date to 15/9/2026, as the mock's note asks */
  await card.locator('.o9-stop[data-step]:not([data-step="sent"]):not([data-step="new"])').first().click();
  await card.locator('[data-strip="date"]').fill("15/9/2026");
  await card.locator('[data-strip="save"]').click();
  const after = { disabled: await confirm.isDisabled(), label: ((await confirm.textContent()) ?? "").trim() };
  await confirm.click();
  await answerQueries(page);
  await page.locator('[data-im="review"] [data-im="primary"]').click();
  const result = await page.evaluate(() => (window as Window & { __onbLab?: { result?: { agents: { ref: string }[]; queries: { agentRef: string; timeline?: { type: string; date: string | null }[] }[] } } }).__onbLab?.result ?? null);
  const kirsten = result?.queries.find((q) => q.agentRef === "kv") ?? null;
  record("Q1", { before, after, kirsten });
  expect(before.chip).toBe("Dates out of order");
  expect(before.ask).toBe("A full was requested before the query was sent. Which date needs changing?");
  expect(before.disabled, "disabled while out of order").toBe(true);
  expect(before.label).toBe("Press a date to change it");
  expect(after.disabled, "enabled once in order").toBe(false);
  expect(after.label).toBe("Yes, that's right");
  expect(kirsten?.timeline?.find((e) => e.type === "Full Requested")?.date?.slice(0, 10), "the corrected date is what is imported").toBe("2026-09-15");
});

/* ════ Q2 · the gate counts the new questions ════ */
test("Q2 each new card opens the gate and closes it when answered; the primary waits with the count", async ({ page }) => {
  const primary = await toQueries(page);
  const read = async () => ({ disabled: await primary.isDisabled(), label: ((await primary.textContent()) ?? "").trim(), title: ((await page.locator('[data-im="title"]').textContent()) ?? "").replace(/\s+/g, " ").trim() });
  const steps = [await read()];
  const chips: string[] = [];
  for (const key of ["q-q0", "q-q1", "q-q2"]) {
    const card = await showCard(page, key);
    chips.push(((await card.locator('[data-im="deck-chip"]').textContent()) ?? "").trim());
    await answerQuery(card.locator("[data-reason]").first());
    await page.waitForTimeout(300);
    steps.push(await read());
  }
  record("Q2", { chips, steps });
  expect(steps[0]).toMatchObject({ disabled: true, label: "Answer 3 questions to import" });
  expect(steps[0].title).toMatch(/^3 questions for you Everything else is ready\. Nothing is saved until you import\.$/);
  expect(chips).toEqual(["Dates out of order", "Date to confirm", "Outcome missing"]);
  expect(steps.map((x) => x.label), "one fewer to answer with each card").toEqual(["Answer 3 questions to import", "Answer 2 questions to import", "Answer 1 question to import", "Import 6 agents and 6 queries"]);
  const last = steps[steps.length - 1];
  expect(last.disabled, "every question answered: the primary lights").toBe(false);
  expect(last.label).toBe("Import 6 agents and 6 queries");
});
