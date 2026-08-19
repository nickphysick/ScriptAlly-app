/** PHASE E ON THE PAGE — the bulk table, its two fills, its count and its dismissal. */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("the bulk record table", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(6500);

  const opened = await page.evaluate(() => {
    const row = [...document.querySelectorAll(".tdg-row")].find((r) =>
      /queries have no record of what you sent/.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
    if (!row) return false;
    (row as HTMLElement).click();
    return true;
  });
  if (!opened) { writeFileSync("run-artifacts/materials-bulk.txt", "NO BULK CARD"); return; }
  await page.waitForTimeout(1800);

  const read = () => page.evaluate(() => ({
    table: !!document.querySelector(".prs-fills"),
    rows: document.querySelectorAll(".prs-row").length,
    ticks: document.querySelectorAll(".prs-tick").length,
    on: document.querySelectorAll(".prs-tick.on").length,
    editors: document.querySelectorAll(".prs-editor").length,
    caveat: (document.querySelector(".prs-caveat")?.textContent ?? "").trim().slice(0, 46),
    more: (document.querySelector(".prs-more")?.textContent ?? "").trim(),
    prime: (document.querySelector(".psw-prime")?.textContent ?? "").trim(),
    primeOff: (document.querySelector(".psw-prime") as HTMLButtonElement | null)?.disabled,
    dismiss: (document.querySelector(".psw-ghost")?.textContent ?? "").trim(),
    /* the per-row summaries — proof the fills differ per row */
    summaries: [...document.querySelectorAll(".prs-sum")].map((e) => (e.textContent ?? "").trim()),
    sentLines: [...document.querySelectorAll(".prs-sent")].map((e) => (e.textContent ?? "").trim()).slice(0, 3),
    /* who each row is, so an "identical" result can be told apart from a lossy fill */
    who: [...document.querySelectorAll(".prs-row .psw-name")].map((e) => (e.textContent ?? "").trim()),
    /* every tick label per row — the ground truth the summary is derived from */
    perRowTicks: [...document.querySelectorAll(".prs-row")].map((r) =>
      [...r.querySelectorAll(".prs-tick.on")].map((t) => (t.textContent ?? "").trim())),
  }));

  const fresh = await read();
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".prs-fill")].find((x) => /each agent asks for/i.test(x.textContent ?? ""));
    (b as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(700);
  const filled = await read();
  await page.screenshot({ path: "run-artifacts/materials-bulk-1440.png" });

  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".prs-fill")].find((x) => /copy the first row/i.test(x.textContent ?? ""));
    (b as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(700);
  const copied = await read();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(700);
  const mob = await page.evaluate(() => ({
    table: !!document.querySelector(".prs-fills"),
    scroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  }));
  await page.screenshot({ path: "run-artifacts/materials-bulk-390.png" });

  const report = [
    "── the bulk record table (1440×900)",
    `  table present:     ${fresh.table}     rows shown: ${fresh.rows}   (5 + disclosure)`,
    `  disclosure:        ${fresh.more}`,
    `  caveat:            ${fresh.caveat}…`,
    `  ⚠️ ticked on open:  ${fresh.on}   (MUST be 0)`,
    `  editors open:      ${fresh.editors}   (MUST be 0 — on demand only)`,
    `  primary:           "${fresh.prime}"   disabled: ${fresh.primeOff}   (MUST be true at zero)`,
    `  bulk dismissal:    "${fresh.dismiss}"`,
    `  sent dates:        ${JSON.stringify(fresh.sentLines)}`,
    "── after “Start from what each agent asks for”",
    `  ticked:            ${filled.on}`,
    `  primary:           "${filled.prime}"   disabled: ${filled.primeOff}`,
    `  ⚠️ per-row values:  ${JSON.stringify(filled.summaries)}`,
    `  ⚠️ all identical?:  ${new Set(filled.summaries).size === 1 ? "YES" : "NO — they differ"}`,
    `  agents:            ${JSON.stringify(filled.who)}`,
    `  per-row ticks:     ${JSON.stringify(filled.perRowTicks)}`,
    "── after “Copy the first row down”",
    `  primary:           "${copied.prime}"`,
    `  ⚠️ now identical?:  ${new Set(copied.summaries).size === 1 ? "YES — propagated" : "NO"}`,
    "── 390×844",
    `  table present:     ${mob.table}   full-page scroll: ${mob.scroll}px`,
    `  page errors:       ${errors.length}`,
    ...errors.slice(0, 3).map((e) => "   " + e.slice(0, 150)),
  ].join("\n");
  writeFileSync("run-artifacts/materials-bulk.txt", report);
  console.log("\n" + report + "\n");
});
