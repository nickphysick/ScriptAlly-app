/**
 * THE COHORT'S TICKS — do they reach the model, and does the journey complete?
 *
 * ⚠️ NO BACKTICKS INSIDE ANY page.evaluate TEMPLATE, and `\\s` NEVER `\s`: a template literal eats
 * the backslash, so `.replace(/\s+/g, " ")` compiles into "replace every s with a space". Four
 * rounds of reports read "No re pon e from Ro alind Vale" before that was noticed.
 *
 * ⚠️ THE CLICKS ARE PLAYWRIGHT'S, NOT `el.click()`. The fault this measures left `aria-pressed`
 * untouched, which a DOM-dispatched click cannot tell apart from an unbound handler.
 */
import { test } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync, rmSync, mkdirSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };
const OUT = "run-artifacts/popup-bulk.txt";
rmSync(OUT, { force: true });
mkdirSync("reports/chase-round", { recursive: true });

const VIS = `(e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }`;
const READ = `(() => {
  const vis = ${VIS};
  const all = (s) => [...document.querySelectorAll(s)].filter(vis);
  const t = all(".tpn .bulk")[0];
  const ticks = t ? [...t.querySelectorAll("button.tick")].filter(vis) : [];
  return {
    primary: ((all(".tpn .ab.go")[0] || {}).textContent || "").replace(/\\s+/g, " ").trim(),
    disabled: !!(all(".tpn .ab.go")[0] || {}).disabled,
    will: ((all(".tpn .willrec")[0] || {}).textContent || "").replace(/\\s+/g, " ").trim(),
    pressed: ticks.map((b) => b.getAttribute("aria-pressed")),
    ticks: ticks.length,
    toast: all(".tdb-toast").map((x) => (x.textContent || "").replace(/\\s+/g, " ").trim()).join(" | "),
    dialogs: all("[role=dialog],[role=alertdialog],[aria-modal=true],.tdb-ff,.dlg").map((e) => String(e.className)),
  };
})()`;

test("bulk ticks", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForSelector(".tlc .row", { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(4500);

  const opened = await page.evaluate(`(() => {
    const vis = ${VIS};
    const r = [...document.querySelectorAll(".tlc .row")].filter(vis)
      .find((x) => (x.textContent || "").indexOf("missing their materials") > -1);
    if (!r) return null;
    r.click();
    return (r.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 56);
  })()`);
  if (!opened) { add("P4.0 the cohort card", false, "NOT RUN — no cohort row on the page"); }
  await page.waitForTimeout(2600);

  const before = await page.evaluate(READ) as { primary: string; ticks: number; pressed: string[] };
  add("P4.0 the cohort opens with its table and nothing ticked", before.ticks > 0 && before.primary.startsWith("Log 0"),
    before.ticks + " ticks · primary: " + before.primary);

  /* ⚠️ A REAL POINTER CLICK, AND THEN TIME. The fault never flipped at 80ms OR at 2500ms; a probe
     that read once could not tell "never fired" from "fired and was wiped". */
  const tick = (n: number) => page.locator(".tpn .bulk button.tick").nth(n);
  await tick(0).click();
  await page.waitForTimeout(120);
  const early = await page.evaluate(READ) as { pressed: string[]; primary: string };
  await page.waitForTimeout(2500);
  const late = await page.evaluate(READ) as { pressed: string[]; primary: string; will: string };

  add("P4.1 a real click flips the tick", early.pressed[0] === "true",
    "at 120ms: aria-pressed=" + early.pressed[0]);
  add("P4.2 and it survives 2.5s", late.pressed[0] === "true",
    "at 2.6s: aria-pressed=" + late.pressed[0]);
  add("P4.3 the primary counts one", /Log 1 quer/.test(late.primary), "primary: " + late.primary);
  add("P4.4 the will-record sentence tracks", late.will.length > 0 && !/^This records\s*$/.test(late.will),
    "will: " + late.will.slice(0, 80));

  /* a second row — the count must be rows, not ticks */
  await tick(2).click();
  await page.waitForTimeout(1200);
  const two = await page.evaluate(READ) as { primary: string; disabled: boolean; pressed: string[] };
  add("P4.5 ticking a second row makes it two", /Log 2 quer/.test(two.primary), "primary: " + two.primary);
  add("P4.6 the primary is enabled", two.disabled === false, "disabled=" + two.disabled);

  await page.screenshot({ path: "reports/chase-round/bulk-ticked.png" });

  await page.evaluate(`(() => {
    const b = document.querySelector(".tpn .ab.go");
    if (b) b.click();
  })()`);
  await page.waitForTimeout(1600);
  const receipt = await page.evaluate(READ) as { toast: string; dialogs: string[] };
  add("P4.7 pressing writes, and says so", /Recorded|Done|queries/i.test(receipt.toast),
    receipt.toast ? receipt.toast.slice(0, 76) : "no receipt at all");
  add("P4.8 nothing opened over the page", receipt.dialogs.length === 0,
    receipt.dialogs.length ? receipt.dialogs.join(", ") : "none");
  await page.waitForTimeout(3200);
  await page.screenshot({ path: "reports/chase-round/bulk-done.png" });

  const lines = out.map((r) => (r.ok ? "PASS  " : "FAIL  ") + r.id + (r.note ? "   [" + r.note + "]" : ""));
  writeFileSync(OUT, lines.join("\n") + "\n\n" + out.filter((r) => r.ok).length + " / " + out.length + " green\n");
});
