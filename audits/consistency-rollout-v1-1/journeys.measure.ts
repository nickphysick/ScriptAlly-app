/**
 * Consistency roll-out v1.1, Phase 6 — the text fields inside Log a query and Record a response.
 *
 * Both journeys show their boxed fields only in later steps, so this walks each one forward WITHOUT EVER SAVING:
 *   Log a query: who (the first agent ready to query) → when (Today) → what (the first package, else the first
 *     material) → how (the first way) → nudge (the first chip when Continue needs one) → check, where "+ Add a note"
 *     opens the note box. "Log query" and "Log and start another" are never pressed; the journey is left with
 *     Escape and its "Discard" answer.
 *   Record a response: "Record a response" → the first waiting row in Who replied → the "asked for more" tile, which
 *     shows the "What they asked for" input and the "Their words" box. Nothing is saved; the composer is cancelled
 *     and its draft discarded.
 * For each visible field: its box, type, radius, edge and padding at rest, then the same with it focused. One JSON per
 * width to $CA_OUT/journeys@<w>.json, and at 1512 a crop of each field (rest and focus) to $CA_RULE_SHOTS/$CA_LABEL.
 * The emulator imports a fixed snapshot and exports nothing, so even an accidental write cannot outlive the run.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { STORAGE_STATE } from "../../playwright.config";
import { ensureSignedIn, KILL_MOTION, KILL_MOTION_ID } from "../../tests/e2e/measure";

const OUT = resolve(process.cwd(), process.env.CA_OUT || "audits/consistency-rollout-v1-1/.run");
const SHOTS = resolve(process.env.CA_RULE_SHOTS || "audits/consistency-rollout-v1-1/.shots", process.env.CA_LABEL || "run");
const VIEWPORTS = [{ w: 1512, h: 982 }, { w: 1920, h: 1080 }]
  .filter((v) => !process.env.CA_VIEWPORTS || process.env.CA_VIEWPORTS.split(",").includes(String(v.w)));
/* the buttons that save: never pressed */
const SAVES = /^(Log query|Log and start another|Logging|Save|Record|Mark )/;

type Field = Record<string, unknown>;
async function fields(page: Page, root: string): Promise<Field[]> {
  return page.evaluate((rootSel) => {
    const r0 = document.querySelector(rootSel);
    if (!r0) return [];
    const vis = (e: Element) => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 1 && r.height > 1 && c.visibility !== "hidden" && c.display !== "none"; };
    const read = (e: HTMLElement) => {
      const c = getComputedStyle(e), r = e.getBoundingClientRect();
      return { h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10, x: Math.round(r.left * 10) / 10, y: Math.round(r.top * 10) / 10,
        font: `${c.fontWeight} ${c.fontSize} ${c.fontFamily.split(",")[0].replace(/["']/g, "")}`, lh: c.lineHeight, radius: c.borderTopLeftRadius,
        border: `${c.borderTopWidth} ${c.borderTopStyle} ${c.borderTopColor}`, shadow: c.boxShadow, pad: c.padding, bg: c.backgroundColor, outline: `${c.outlineWidth} ${c.outlineStyle}` };
    };
    return [...r0.querySelectorAll<HTMLElement>("input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=hidden]), textarea")].filter(vis).map((e, i) => {
      const rest = read(e);
      e.focus({ preventScroll: true });
      const focus = read(e);
      e.blur();
      const id = e.getAttribute("data-qls") || e.getAttribute("data-qc1522") || e.getAttribute("aria-label") || e.className || `f${i}`;
      /* the field's label (the grid's cell before the field's own cell) and the nearest scroller's offset, so a move
         can be told apart from a scroll */
      const cell = e.closest("div"); const lab = cell?.previousElementSibling as HTMLElement | null;
      const lr = lab && lab.tagName === "LABEL" ? lab.getBoundingClientRect() : null;
      let sc: Element | null = e.parentElement; while (sc && !(sc.scrollHeight > sc.clientHeight + 1 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
      const scr = sc ? { top: Math.round(sc.scrollTop * 10) / 10, y: Math.round(sc.getBoundingClientRect().top * 10) / 10 } : null;
      const row = cell ? cell.getBoundingClientRect() : null;
      return { id: String(id).slice(0, 40), tag: e.tagName.toLowerCase(), cls: String(e.className).slice(0, 60), placeholder: (e.getAttribute("placeholder") || "").slice(0, 50), rest, focus: { shadow: focus.shadow, border: focus.border, outline: focus.outline },
        label: lr ? { y: Math.round(lr.top * 10) / 10, h: Math.round(lr.height * 10) / 10 } : null, cell: row ? { y: Math.round(row.top * 10) / 10, h: Math.round(row.height * 10) / 10 } : null, scroller: scr };
    });
  }, root);
}
async function crop(page: Page, sel: string, name: string, vw: number) {
  if (vw !== 1512) return;
  mkdirSync(SHOTS, { recursive: true });
  const loc = page.locator(sel).locator("visible=true").first();
  if (!(await loc.count())) return;
  await loc.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => {});
  const b = await loc.boundingBox(); if (!b) return;
  const vp = page.viewportSize()!; const pad = 40; const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  const clip = { x, y, width: Math.min(b.width + pad * 2, 760, vp.width - x), height: Math.min(b.height + pad * 2, 300, vp.height - y) };
  await page.screenshot({ path: resolve(SHOTS, `${name}.png`), clip, animations: "disabled" });
  await loc.focus().catch(() => {});
  await page.screenshot({ path: resolve(SHOTS, `${name}-focus.png`), clip, animations: "disabled" });
  await loc.blur().catch(() => {});
}
const vis = (page: Page, sel: string) => page.locator(sel).locator("visible=true").first();
async function clickIf(page: Page, sel: string): Promise<boolean> {
  const l = vis(page, sel);
  if (!(await l.count())) return false;
  const t = ((await l.innerText().catch(() => "")) || "").trim();
  if (SAVES.test(t)) throw new Error(`refused to press a save button: ${t}`);
  await l.click();
  await page.waitForTimeout(450);
  return true;
}

test("consistency roll-out v1.1 — journey fields", async ({ browser }) => {
  test.setTimeout(30 * 60 * 1000);
  mkdirSync(OUT, { recursive: true });
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({ storageState: STORAGE_STATE, viewport: { width: vp.w, height: vp.h } });
    const page = await ctx.newPage();
    await page.goto("/dashboard");
    await ensureSignedIn(page);
    const out: Record<string, unknown> = { vw: vp.w };
    const steps: string[] = [];

    /* ── Log a query ── */
    try {
      await page.goto("/queries", { waitUntil: "domcontentloaded" });
      await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` }).catch(() => {});
      await page.getByRole("button", { name: /^Log a query$/ }).locator("visible=true").first().click({ timeout: 30_000 });
      await vis(page, ".laq").waitFor({ timeout: 15_000 });
      const perStep: Record<string, Field[]> = {};
      for (let i = 0; i < 12; i++) {
        if (await vis(page, "[data-qls='log']").count()) { steps.push("laq:check"); break; }
        const at = await page.evaluate(() => {
          const q = (s: string) => [...document.querySelectorAll(s)].some((e) => (e as HTMLElement).offsetParent);
          return q("[data-qls='find']") ? "who" : q("[data-qls='when-opt']") ? "when" : q("[data-qls='fork']") ? "fork" : q("[data-qls='package']") ? "package"
            : q("[data-qls='pieces']") ? "pieces" : q("[data-qls='how-opt']") ? "how" : q("[data-qls='nudge-continue']") ? "nudge" : "unknown";
        });
        steps.push(`laq:${at}`);
        perStep[at] = await fields(page, ".laq");
        if (at === "who") {
          await vis(page, ".laq-big button").waitFor({ timeout: 15_000 }).catch(() => {});
          if (!(await clickIf(page, ".laq-big button"))) throw new Error("no agent row");
        }
        else if (at === "when") await clickIf(page, "[data-qls='when-opt'][data-k='today']");
        else if (at === "fork") { if (!(await clickIf(page, "[data-qls='fork'] button:not([disabled])"))) throw new Error("no fork tile"); }
        else if (at === "package") await clickIf(page, "[data-qls='package']");
        else if (at === "pieces") { await clickIf(page, "[data-qls='pieces'] button"); await clickIf(page, "[data-qls='pieces-continue']"); }
        else if (at === "how") await clickIf(page, "[data-qls='how-opt']");
        else if (at === "nudge") {
          await crop(page, ".laq [data-qls='weeks'] input:not([type=range]), .laq [data-qls='weeks']", "laq-weeks", vp.w);
          if (await vis(page, "[data-qls='nudge-continue'][disabled]").count()) await clickIf(page, "[data-qls='nudge-chip']");
          await clickIf(page, "[data-qls='nudge-continue']");
        } else throw new Error("an unknown step");
      }
      if (await clickIf(page, "[data-qls='add-note']")) {
        perStep.check = await fields(page, ".laq");
        await crop(page, ".laq [data-qls='note']", "laq-note", vp.w);
      }
      out.laq = perStep;
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      await clickIf(page, "[data-qls='leave-discard']");
    } catch (e) { out.laqError = String((e as Error).message).slice(0, 200); }

    /* ── Record a response ── */
    try {
      await page.goto("/queries", { waitUntil: "domcontentloaded" });
      await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL_MOTION}` }).catch(() => {});
      await page.getByRole("button", { name: /^Record a response/ }).locator("visible=true").first().click({ timeout: 30_000 });
      await vis(page, "[data-qcrr='picker']").waitFor({ timeout: 15_000 });
      steps.push("rr:picker");
      out.rrPicker = await fields(page, "[data-qcrr='picker']");
      if (!(await clickIf(page, "[data-qcrr='row']"))) throw new Error("no waiting row");
      await vis(page, "[data-qc1522='composer']").waitFor({ timeout: 15_000 });
      steps.push("rr:composer");
      if (!(await clickIf(page, "[data-qc161='tile'][data-v='more']"))) throw new Error("no 'more' tile");
      steps.push("rr:more");
      out.rr = await fields(page, "[data-qc1522='composer']");
      await crop(page, "[data-qc1522='composer'] .qc1522-in", "rr-what", vp.w);
      await crop(page, "[data-qc1522='composer'] .qc1522-ta", "rr-words", vp.w);
      await clickIf(page, "[data-qc1522='cancel']") || await clickIf(page, "[data-qc1522='composer-x']");
      await clickIf(page, "[data-qc1522='discard']");
    } catch (e) { out.rrError = String((e as Error).message).slice(0, 200); }

    out.steps = steps;
    writeFileSync(resolve(OUT, `journeys@${vp.w}.json`), JSON.stringify(out, null, 1));
    console.log(`[jr] ${vp.w}: ${steps.join(" → ")}${out.laqError ? ` · laq: ${out.laqError}` : ""}${out.rrError ? ` · rr: ${out.rrError}` : ""}`);
    await ctx.close();
  }
});
