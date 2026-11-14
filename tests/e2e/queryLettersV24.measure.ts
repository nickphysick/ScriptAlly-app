/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query letters v2.4 (14 Nov) — the Query Centre's navy header on Query letters (no Top tip), the placeholder drawing,
 * the 48px step, one list + one workspace, and "No text saved". Ref: design-refs/query-letters-v2-4. Fixture:
 * seedQueryLetters.mjs → seedQueryLettersV21.mjs → seedQueryLettersV24.mjs. QL24_SHOTS=<dir> writes the report's
 * screenshots. QL24_QC=write records the Query Centre header snapshot (lock 2's "before"); without it lock 2 compares.
 *
 *   npm run e2e:emu -- tests/e2e/queryLettersV24.measure.ts --project=measure --workers=1
 *
 * Locks (the brief's §5): QL24-1 the same header primitive, equal measurements, the same top · QL24-1b the title block's spacing · QL24-2 the Query Centre's header is
 * unchanged · QL24-3 the drawing sits where the Query Centre's and the Contact list's do · QL24-4 no tip · QL24-6/6a/6b/6c the step and the workspace · QL24-7 day
 * one · QL24-8/9/10 "No text saved". (QL24-5 is src/components/letters/ql24.test.ts.) Every population is counted first.
 */
import { test, expect, type Page } from "@playwright/test";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { openRoute } from "./measure";

const W1440 = { width: 1440, height: 900 };
const W1717 = { width: 1717, height: 1000 };
const W1200 = { width: 1200, height: 900 };
const SHOTS = process.env.QL24_SHOTS ?? "";
const QC_SNAP = "reports/query-letters-v2-4/qc-header-before.json";
const PAPER = "rgb(251, 249, 245)";

async function shot(page: Page, name: string) {
  if (!SHOTS) return;
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SHOTS}/${name}-${page.viewportSize()?.width}.png` });
}
async function openLetters(page: Page, size = W1717, ms = "cv25-ms") {
  await page.addInitScript((id) => { try { localStorage.setItem("scriptally_active_manuscript_id", id as string); } catch { /* */ } }, ms);
  await openRoute(page, "/materials/letters", size);
  await expect(page.locator('[data-ql="page"]')).toBeVisible({ timeout: 30_000 });
}
const P = (page: Page) => page.locator('[data-ql="page"]');
const row = (page: Page, id: string) => P(page).locator(`[data-ql="row"][data-id="${id}"]`);
const rect = (page: Page, sel: string) => page.locator(sel).first().evaluate((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height, b: r.bottom, r: r.right }; });
const css = (page: Page, sel: string, props: string[]) => page.locator(sel).first().evaluate((e, ps) => { const c = getComputedStyle(e); return Object.fromEntries(ps.map((p) => [p, c.getPropertyValue(p)])); }, props);

/** the header's readings the brief names: height, radius, background, headline size, button height */
async function headerReading(page: Page, hd: string) {
  const box = await rect(page, hd);
  const look = await css(page, hd, ["border-top-left-radius", "background-color"]);
  const h1 = await css(page, `${hd} h1.qc1531-t`, ["font-size", "font-family"]);
  const btn = await rect(page, `${hd} .qc1531-b`);
  const n = await css(page, `${hd} .qc1531-b--n`, ["color", "background-color"]);
  const g = await css(page, `${hd} .qc1531-b--g`, ["color", "background-color"]);
  // `top`: where the header starts on the page (the shell above it is the same on every workspace page)
  return { top: Math.round(box.y), height: Math.round(box.h), radius: look["border-top-left-radius"], bg: look["background-color"], h1: h1["font-size"], face: h1["font-family"], button: Math.round(btn.h), primary: n, secondary: g };
}
const QC_HD = '[data-qc151="page"] > .qc1531-hd';
const QL_HD = '[data-ql="page"] .qc151.qc153 > .qc1531-hd';
const CL_HD = '.clv-group.cl27 > .qc1531-hd';

test.describe.configure({ mode: "default" }); // independent: every lock reports its own red or green (one worker, in order)
test.beforeAll(() => {
  for (const s of ["seedQueryLetters", "seedQueryLettersV21", "seedQueryLettersV24"]) execSync(`node tests/e2e/${s}.mjs`, { stdio: "inherit" });
});

test("QL24-1 the page's header is the Query Centre's navy header, measured equal on both pages", async ({ page }) => {
  await openRoute(page, "/queries", W1717);
  await expect(page.locator(QC_HD)).toBeVisible({ timeout: 30_000 });
  const qc = await headerReading(page, QC_HD);
  console.log("[QL24-1] Query Centre", JSON.stringify(qc));
  await openLetters(page, W1717);
  await expect(page.locator(QL_HD)).toHaveCount(1);
  const ql = await headerReading(page, QL_HD);
  console.log("[QL24-1] Query letters", JSON.stringify(ql));
  expect(ql).toEqual(qc);
  await shot(page, "01-rest");
});

/** the title block's rhythm, measured from the header: the headline, the "for" line and the buttons, the gaps between
 *  them, and where the block's middle sits against the header's */
async function titleBlock(page: Page, hd: string) {
  return page.locator(hd).first().evaluate((h) => {
    const hb = h.getBoundingClientRect();
    const r = (sel: string) => (h.querySelector(sel) as HTMLElement).getBoundingClientRect();
    const t = r("h1.qc1531-t"), f = r(".qc1531-for"), a = r(".qc1531-acts"), m = r(".qc1531-main");
    const r1 = (x: number) => Math.round(x * 10) / 10;
    return { titleToFor: r1(f.top - t.bottom), forToButtons: r1(a.top - f.bottom), forMargin: getComputedStyle(h.querySelector(".qc1531-for") as HTMLElement).margin,
      middleOff: r1(m.top + m.height / 2 - (hb.top + hb.height / 2)) };
  });
}

test("QL24-1b the title, the for line and the buttons are spaced as the Contact list's (1440, 1717)", async ({ page }) => {
  for (const vp of [W1440, W1717]) {
    await page.addInitScript(() => { try { localStorage.setItem("scriptally_active_manuscript_id", "cv25-ms"); } catch { /* */ } });
    await openRoute(page, "/agents", vp);
    await expect(page.locator(`${CL_HD} .qc1531-for`)).toBeVisible({ timeout: 30_000 });
    const cl = await titleBlock(page, CL_HD);
    await openLetters(page, vp);
    await expect(page.locator(`${QL_HD} .qc1531-for`)).toBeVisible();
    const ql = await titleBlock(page, QL_HD);
    console.log(`[QL24-1b] ${vp.width}`, JSON.stringify({ cl, ql }));
    // qcv1531's own margins reach the line (the page's reset once wiped them: 0 and 0)
    expect(ql.forMargin).toBe("8px 0px 12px");
    expect(Math.round(ql.titleToFor)).toBe(Math.round(cl.titleToFor));
    expect(Math.round(ql.forToButtons)).toBe(Math.round(cl.forToButtons));
    // the block is centred in the header as the Contact list's is (to the pixel)
    expect(Math.abs(ql.middleOff - cl.middleOff)).toBeLessThanOrEqual(1);
  }
});

test("QL24-2 the Query Centre's header markup and computed styles are unchanged", async ({ page }) => {
  await openRoute(page, "/queries", W1717);
  await expect(page.locator(QC_HD)).toBeVisible({ timeout: 30_000 });
  const snap = await page.locator(QC_HD).evaluate((root) => {
    const PROPS = ["display", "grid-template-columns", "gap", "padding", "margin", "border-radius", "background-color", "box-shadow", "color", "font-size", "font-family", "font-weight", "line-height", "height", "width"];
    const walk = (e: Element, path: string): Record<string, unknown>[] => {
      const c = getComputedStyle(e);
      const out: Record<string, unknown>[] = [{ path, tag: e.tagName, cls: e.getAttribute("class"), ...Object.fromEntries(PROPS.map((p) => [p, c.getPropertyValue(p)])) }];
      [...e.children].forEach((k, i) => out.push(...walk(k, `${path}/${i}`)));
      return out;
    };
    return walk(root, "hd");
  });
  expect(snap.length).toBeGreaterThan(8);
  if (process.env.QL24_QC === "write") {
    mkdirSync("reports/query-letters-v2-4", { recursive: true });
    writeFileSync(QC_SNAP, JSON.stringify(snap, null, 1));
    console.log("[QL24-2] wrote the before snapshot:", snap.length, "elements");
    await shot(page, "qc-header-before");
    return;
  }
  expect(existsSync(QC_SNAP), "the before snapshot exists").toBe(true);
  const before = JSON.parse(readFileSync(QC_SNAP, "utf8"));
  console.log("[QL24-2] elements before", before.length, "after", snap.length);
  expect(snap).toEqual(before);
  await shot(page, "qc-header-after");
});

/** where a header's drawing sits, measured from its own header's top-left: the art cell, and the drawing's box and
 *  centre (the drawing is centred in its cell, so its centre is what the eye lines up) */
async function artReading(page: Page, hd: string) {
  return page.locator(hd).first().evaluate((h) => {
    const hb = h.getBoundingClientRect();
    const cell = h.querySelector(".qc1531-art") as HTMLElement;
    const img = cell.querySelector("img") as HTMLImageElement;
    const c = cell.getBoundingClientRect(), i = img.getBoundingClientRect();
    const r1 = (n: number) => Math.round(n * 10) / 10;
    return {
      cell: { x: r1(c.left - hb.left), y: r1(c.top - hb.top), w: r1(c.width), h: r1(c.height) },
      img: { w: r1(i.width), cx: r1(i.left + i.width / 2 - hb.left), cy: r1(i.top + i.height / 2 - hb.top) },
      loaded: img.complete && img.naturalWidth > 0, natural: img.naturalWidth, hidden: !!img.closest("[aria-hidden='true']"),
    };
  });
}
const art = (r: Awaited<ReturnType<typeof artReading>>) => ({ cell: r.cell, img: r.img });

test("QL24-3 the header's drawing sits where the Query Centre's and the Contact list's do (1440, 1717)", async ({ page }) => {
  for (const vp of [W1440, W1717]) {
    await openRoute(page, "/queries", vp);
    await expect(page.locator(QC_HD)).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction((sel) => { const i = document.querySelector(`${sel} .qc1531-art img`) as HTMLImageElement | null; return !!i && i.complete && i.naturalWidth > 0; }, QC_HD);
    const qc = await artReading(page, QC_HD);
    await openRoute(page, "/agents", vp);
    await expect(page.locator(CL_HD)).toBeVisible({ timeout: 30_000 });
    await page.waitForFunction((sel) => { const i = document.querySelector(`${sel} .qc1531-art img`) as HTMLImageElement | null; return !!i && i.complete && i.naturalWidth > 0; }, CL_HD);
    const cl = await artReading(page, CL_HD);
    await openLetters(page, vp);
    await page.waitForFunction((sel) => { const i = document.querySelector(`${sel} .qc1531-art img`) as HTMLImageElement | null; return !!i && i.complete && i.naturalWidth > 0; }, QL_HD);
    const ql = await artReading(page, QL_HD);
    console.log(`[QL24-3] ${vp.width}`, JSON.stringify({ qc, cl, ql }));
    // the drawing itself: the hawk at the desk, loaded, 190 wide, hidden from readers; no placeholder, no courier
    expect(ql.loaded).toBe(true);
    expect(ql.natural).toBe(400);
    expect(ql.hidden).toBe(true);
    expect(await P(page).locator(".qc1531-hd [data-art]").count()).toBe(0);
    expect(await P(page).locator('.qc1531-hd img[src*="courier"]').count()).toBe(0);
    expect(await P(page).locator('.qc1531-hd img[src*="query-letters-header"]').count()).toBe(1);
    // where it sits: the same cell and the same drawing box and centre as both other headers
    expect(art(ql)).toEqual(art(qc));
    // the Contact list's cell is its own margin recipe's 183.2 (512/523 vs 347/360): equal to the whole pixel
    const px = (r: Awaited<ReturnType<typeof artReading>>) => JSON.parse(JSON.stringify(art(r), (_k, v) => typeof v === "number" ? Math.round(v) : v));
    expect(px(ql)).toEqual(px(cl));
  }
});

test("QL24-4 nothing in the header's right-hand block: no tip, anywhere on the page", async ({ page }) => {
  await openLetters(page, W1717);
  await expect(P(page).locator(".qc1531-hd")).toHaveCount(1);
  for (const probe of ['[data-ql="tip-block"]', '[data-ql="tip"]', '[data-ql="tip-next"]', '[data-ql="tip-marks"]']) await expect(P(page).locator(probe), probe).toHaveCount(0);
  const text = await P(page).innerText();
  expect(text).not.toContain("Top tip");
  expect(text).not.toContain("Next tip");
  expect((await P(page).locator(".qc1531-hd .qc1531-rc").innerText().catch(() => "")).trim()).toBe("");
});

test("QL24-6 the 48px step; the workspace under the headline and level with Your letters (1440, 1717)", async ({ page }) => {
  for (const size of [W1440, W1717]) {
    await openLetters(page, size);
    await expect(P(page).locator('[data-ql="work"]')).toHaveCount(1);
    await expect(P(page).locator('[data-ql="list"]')).toHaveCount(1);
    const hd = await rect(page, QL_HD);
    const desk = await rect(page, '[data-ql="page"] [data-ql="desk"]');
    const h1 = await rect(page, `${QL_HD} h1.qc1531-t`);
    const work = await rect(page, '[data-ql="page"] [data-ql="work"]');
    const list = await rect(page, '[data-ql="page"] [data-ql="list"] .qlp-h2');
    console.log(`[QL24-6] ${size.width}: step ${desk.y - hd.b} headline ${h1.x} work ${work.x} workTop ${work.y} listTop ${list.y}`);
    expect(Math.round(desk.y - hd.b)).toBe(48);
    expect(Math.abs(work.x - h1.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(work.y - list.y)).toBeLessThanOrEqual(1);
  }
});

async function workspaceReading(page: Page) {
  const w = await css(page, '[data-ql="page"] [data-ql="work"]', ["background-color", "border-top-left-radius"]);
  const mid = await rect(page, '[data-ql="page"] [data-ql="work"] [data-ql="letter"]');
  const rail = await rect(page, '[data-ql="page"] [data-ql="work"] [data-ql="rail"]');
  const rc = await css(page, '[data-ql="page"] [data-ql="work"] [data-ql="rail"]', ["border-left-width", "border-left-style", "border-top-width"]);
  const h2 = await css(page, '[data-ql="page"] [data-ql="rail"] .qlp-h2', ["border-bottom-width", "border-bottom-style"]);
  return { bg: w["background-color"], radius: w["border-top-left-radius"], railW: Math.round(rail.w), gap: Math.round(rail.x - mid.r), left: rc["border-left-width"] + " " + rc["border-left-style"], top: rc["border-top-width"], h2: h2["border-bottom-style"] === "none" ? "none" : h2["border-bottom-width"] };
}

test("QL24-6a one workspace: the letter and its panel on one paper-white, 18px surface; the panel 340 with a hairline, reading and editing", async ({ page }) => {
  await openLetters(page, W1717);
  await row(page, "ql1-draft").click();
  const read = await workspaceReading(page);
  console.log("[QL24-6a] reading", JSON.stringify(read));
  expect(read).toEqual({ bg: PAPER, radius: "18px", railW: 340, gap: 0, left: "1px solid", top: "0px", h2: "none" });
  await P(page).locator('[data-ql="edit"]').click();
  await expect(P(page).locator('[data-ql="work"] [data-ql="ed-text"]')).toBeVisible();
  await expect(P(page).locator('[data-ql="rail"]')).toHaveAttribute("data-mode", "write");
  const write = await workspaceReading(page);
  console.log("[QL24-6a] editing", JSON.stringify(write));
  expect(write).toEqual(read);
  await shot(page, "02-editor");
  await page.setViewportSize(W1440);
  await shot(page, "02-editor");
  await P(page).locator('[data-ql="cancel"]').click();
});

test("QL24-6b at 1200 the panel sits under the letter in the same surface, full width, ruled on top", async ({ page }) => {
  await openLetters(page, W1200);
  const work = await rect(page, '[data-ql="page"] [data-ql="work"]');
  const mid = await rect(page, '[data-ql="page"] [data-ql="work"] [data-ql="letter"]');
  const rail = await rect(page, '[data-ql="page"] [data-ql="work"] [data-ql="rail"]');
  const rc = await css(page, '[data-ql="page"] [data-ql="work"] [data-ql="rail"]', ["border-left-width", "border-top-width", "border-top-style", "position"]);
  console.log("[QL24-6b]", JSON.stringify({ work, mid, rail, rc }));
  expect(rail.y).toBeGreaterThanOrEqual(mid.b - 1);
  expect(Math.abs(rail.w - work.w)).toBeLessThanOrEqual(1);
  expect(rc["border-top-width"]).toBe("1px");
  expect(rc["border-left-width"]).toBe("0px");
  expect(rc.position).not.toBe("sticky");
  await shot(page, "07-narrow");
});

test("QL24-6c selecting each letter, and opening and cancelling an editor, never moves or resizes the workspace", async ({ page }) => {
  /* measured against the desk, not the viewport: a row click or the editor's focus may scroll the page */
  const place = async () => {
    const d = await rect(page, '[data-ql="page"] [data-ql="desk"]');
    const w = await rect(page, '[data-ql="page"] [data-ql="work"]');
    return [Math.round(w.x - d.x), Math.round(w.y - d.y), Math.round(w.w)];
  };
  await openLetters(page, W1717);
  const ids = await P(page).locator('[data-ql="row"]').evaluateAll((els) => els.map((e) => e.getAttribute("data-id")));
  expect(ids.length).toBeGreaterThanOrEqual(5);
  const base = await place();
  for (const id of ids) {
    await row(page, id!).click();
    expect(await place(), id!).toEqual(base);
  }
  await row(page, "ql1-draft").click();
  await P(page).locator('[data-ql="edit"]').click();
  await expect(P(page).locator('[data-ql="ed-text"]')).toBeVisible();
  expect(await place(), "editing").toEqual(base);
  await P(page).locator('[data-ql="cancel"]').click();
  await expect(P(page).locator('[data-ql="ed-text"]')).toHaveCount(0);
  expect(await place(), "after cancel").toEqual(base);
  console.log("[QL24-6c] rows", ids.length, "place (x, y from the desk; width)", JSON.stringify(base));
});

test("QL24-7 day one: the same 48px, the headline, no buttons and no tip", async ({ page }) => {
  for (const size of [W1440, W1717]) {
    await openLetters(page, size, "thin-ms");
    await expect(P(page).locator("h1.qc1531-t")).toHaveText("No query letters yet");
    const hd = await rect(page, QL_HD);
    const first = await rect(page, '[data-ql="page"] [data-ql="first"]');
    console.log(`[QL24-7] ${size.width}: step ${first.y - hd.b}`);
    expect(Math.round(first.y - hd.b)).toBe(48);
    await expect(P(page).locator('[data-ql="new"], [data-ql="upload"]')).toHaveCount(0);
    await expect(P(page).locator('[data-ql="tip-block"], [data-ql="tip"]')).toHaveCount(0);
    await shot(page, "05-day-one");
  }
});

test("QL24-8 an unsent letter with no text: 'No text saved', with and without a file name; no lock line", async ({ page }) => {
  await openLetters(page, W1717);
  for (const [id, para] of [
    ["ql21-blank-file", "It's kept in Murphy_query_voice.docx. Paste your letter in, or upload the file."],
    ["ql24-blank-name", "Paste your letter in, or upload the file."],
  ]) {
    await row(page, id).click();
    const sheet = P(page).locator('[data-ql="sheet"]');
    await expect(sheet.locator("h3")).toHaveText("No text saved");
    await expect(sheet.locator("p").first()).toHaveText(para);
    await expect(P(page).locator('[data-ql="lock-line"]')).toHaveCount(0);
    await expect(sheet.locator('[data-ql="paste-text"]')).toHaveText("Paste the text");
    await expect(sheet.locator('[data-ql="upload-for"]')).toHaveText("Upload the file");
  }
  await row(page, "ql21-blank-file").click();
  await shot(page, "04-unsent-no-text");
  await page.setViewportSize(W1440);
  await shot(page, "04-unsent-no-text");
});

test("QL24-9 a sent letter with no text: 'This letter has gone out.', 'No text saved', the paragraph; the old note gone", async ({ page }) => {
  await openLetters(page, W1717);
  await row(page, "ql21-blank-sent").click();
  await expect(P(page).locator('[data-ql="lock-line"]')).toHaveText("This letter has gone out.");
  const sheet = P(page).locator('[data-ql="sheet"]');
  await expect(sheet.locator("h3")).toHaveText("No text saved");
  await expect(sheet.locator("p")).toHaveCount(1);
  await expect(sheet.locator("p")).toHaveText("Add the text you sent, or upload the file. You can do this once, and its results won't change.");
  await expect(P(page)).not.toContainText("You can add it once");
  await expect(sheet.locator('[data-ql="add-text"]')).toHaveText("Add the text you sent");
  await shot(page, "03-sent-no-text");
  await page.setViewportSize(W1440);
  await shot(page, "03-sent-no-text");
});

test("QL24-10 the no-text panel: no image, no colour of its own, a dashed edge, no shadow", async ({ page }) => {
  await openLetters(page, W1717);
  await row(page, "ql21-blank-file").click();
  const c = await css(page, '[data-ql="page"] [data-ql="sheet"]', ["background-image", "background-color", "border-top-style", "border-top-width", "box-shadow", "border-top-left-radius", "min-height"]);
  console.log("[QL24-10]", JSON.stringify(c));
  expect(c["background-image"]).toBe("none");
  expect(c["background-color"]).toBe("rgba(0, 0, 0, 0)");
  expect(c["border-top-style"]).toBe("dashed");
  expect(c["box-shadow"]).toBe("none");
});

test("QL24-L loading: the skeleton takes the two-part shape (render harness, the build's own CSS)", async ({ page }) => {
  const out = `${process.cwd()}/dist-emu/ql2-loading.html`;
  execSync("npx vitest run src/components/letters/qlRender.harness.test.tsx", { stdio: "inherit", env: { ...process.env, QL2_RENDER_OUT: out, QL2_RENDER_DIST: "dist-emu" } });
  for (const size of [W1440, W1717]) {
    await page.setViewportSize(size);
    await page.goto(`file://${out}`);
    const cols = await page.locator('[data-ql="skeleton"]').evaluate((e) => getComputedStyle(e).gridTemplateColumns);
    console.log(`[QL24-L] ${size.width}: skeleton columns "${cols}"`);
    expect(cols.split(" ").length).toBe(2);
    expect(cols.split(" ")[0]).toBe("268px"); // the Query Centre's list column under the same header (the ref drew 270 under a 300 column)
    await expect(page.locator('[data-ql="skeleton"] [data-ql="work"]')).toHaveCount(1);
    await shot(page, "06-loading");
  }
});
