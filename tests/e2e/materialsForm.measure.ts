/**
 * PHASE D ON THE PAGE — the single-query materials form.
 *
 * ⚠️ The bulk card is what the harness account renders (10 gaps ≥ threshold 3), so the SINGLE
 * journey is reached by forcing the threshold high in a scratch build. Here we drive whatever
 * single card exists; if none does, the probe says so rather than passing on nothing.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

test("the materials form", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
  await page.setViewportSize({ width: 1440, height: 900 });
  await ensureSignedIn(page);
  await page.goto("/todo");
  await page.waitForTimeout(6500);

  // open the single materials card
  const opened = await page.evaluate(() => {
    const row = [...document.querySelectorAll(".tdg-row")].find((r) =>
      /^No record of what you sent/.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
    if (!row) return false;
    (row as HTMLElement).click();
    return true;
  });
  if (!opened) {
    writeFileSync("run-artifacts/materials-form.txt", "NO SINGLE MATERIALS CARD ON THIS ACCOUNT — bulk is showing.");
    console.log("NO SINGLE CARD");
    return;
  }
  await page.waitForTimeout(1200);

  // enter the journey via the pane's primary
  const primary = await page.evaluate(() => {
    /* ⚠️ SCOPED TO THE PANE. An unscoped search matches shell chrome — the rail, the search box —
       and reports a click that never reached the surface under test. */
    const pane = [...document.querySelectorAll("[class*='tdk-'] button")];
    const all = pane.map((x) => (x.textContent ?? "").trim()).filter(Boolean);
    const b = pane.find((x) => /^(Record|Action)$/.test((x.textContent ?? "").trim()));
    (b as HTMLElement | undefined)?.click();
    return { clicked: (b?.textContent ?? "").trim() || "NONE", buttons: all.slice(0, 24) };
  });
  await page.waitForTimeout(1500);

  const r = await page.evaluate(() => {
    const has = (sel: string) => !!document.querySelector(sel);
    const txt = document.body.innerText || "";
    return {
      form: has(".pj-rec"),
      askRow: has(".pj-recask"),
      rows: document.querySelectorAll(".pj-rec .pj-orow").length,
      ticked: document.querySelectorAll('.pj-rec .pj-orow[aria-pressed="true"]').length,
      willStrip: (document.querySelector(".pj-recwill")?.textContent ?? "").trim(),
      dateLine: (document.querySelector(".pj-recdate")?.textContent ?? "").trim(),
      escape: (document.querySelector(".pj-recescape")?.textContent ?? "").trim().slice(0, 60),
      noDateField: !document.querySelector(".pj-rec input[type='date']"),
      stepTitle: /What went with it/i.test(txt),
      /* ⚠️ the duplicate-row check: "Other" and "Something else" are the same row */
      rowLabels: [...document.querySelectorAll(".pj-rec .pj-otx")].map((e) => (e.textContent ?? "").trim()),
      commitLabel: ([...document.querySelectorAll("button")].find((b) => /Record what you sent/.test(b.textContent ?? ""))?.textContent ?? "").trim(),
    };
  });

  /* ── INTERACTION: nothing is inferred until the writer presses the button ── */
  await page.evaluate(() => {
    const b = [...document.querySelectorAll(".pj-recstart")][0] as HTMLElement | undefined;
    b?.click();
  });
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    ticked: document.querySelectorAll('.pj-rec .pj-orow[aria-pressed="true"], .pj-rec .pj-recsamplehd[aria-pressed="true"]').length,
    will: (document.querySelector(".pj-recwill")?.textContent ?? "").trim(),
  }));
  await page.screenshot({ path: "run-artifacts/materials-form-1440.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  const mob = await page.evaluate(() => ({
    form: !!document.querySelector(".pj-rec"),
    pageScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
  }));
  await page.screenshot({ path: "run-artifacts/materials-form-390.png" });

  const report = [
    "── the materials form (1440×900)",
    `  form present:        ${r.form}`,
    `  "asks for" row:      ${r.askRow}`,
    `  material rows:       ${r.rows}`,
    `  ⚠️ ticked by default: ${r.ticked}   (MUST be 0)`,
    `  Will-record strip:   ${r.willStrip}`,
    `  date statement:      ${r.dateLine}`,
    `  no date FIELD:       ${r.noDateField}`,
    `  escape hatch:        ${r.escape}…`,
    `  step title rendered: ${r.stepTitle}`,
    `  row labels:          ${JSON.stringify(r.rowLabels)}`,
    `  commit button:       ${r.commitLabel}`,
    `  primary clicked:     ${primary.clicked}`,
    `  buttons seen:        ${JSON.stringify(primary.buttons)}`,
    "── after pressing “Start from this”",
    `  rows now ticked:     ${after.ticked}   (MUST be > 0 — and only after the press)`,
    `  Will-record strip:   ${after.will}`,
    "── 390×844",
    `  form present:        ${mob.form}`,
    `  full-page scroll:    ${mob.pageScroll}px`,
    `  page errors:         ${errors.length}`,
    ...errors.slice(0, 4).map((e) => "   " + e.slice(0, 160)),
  ].join("\n");
  writeFileSync("run-artifacts/materials-form.txt", report);
  console.log("\n" + report + "\n");
});
