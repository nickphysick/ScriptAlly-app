import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, getDoc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(300_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/packages-two-state/${n}.png`);
const stamp = async (id: string) => {
  const { db, uid } = await devDb();
  return ((await getDoc(doc(db, "users", uid, "packages", id))).data() as { firstSentAt?: string } | undefined)?.firstSentAt ?? null;
};
/** The packages page's derived figures — D5's before/after. */
const figures = async (page: import("@playwright/test").Page) => {
  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1500);
  return page.evaluate(() => {
    const t = ((document.querySelector(".ws-main") as HTMLElement)?.innerText ?? "").replace(/\s+/g, " ");
    const cards = [...document.querySelectorAll(".pkgb-pkgcard")].map((c) => ({
      name: (c.querySelector(".pkgb-pkgname") as HTMLElement)?.innerText?.trim(),
      score: [...c.querySelectorAll(".pkgb-n")].map((n) => (n as HTMLElement).innerText.trim()),
      idle: !!c.querySelector(".pkgb-score--idle"),
    }));
    /* ⚠️ CASE-INSENSITIVE. `innerText` returns what the CSS renders and this heading is NOT
       uppercased, so an uppercase search found nothing and reported `null` — a probe reading a
       string the page does not contain. Third instance of this trap in two runs. */
    const U = t.toUpperCase();
    const i = U.indexOf("REQUESTS BY MATERIAL");
    const j = U.indexOf("LATEST ACTIVITY", i + 1);
    return { cards, byMaterial: i < 0 ? null : t.slice(i, j < 0 ? t.length : j).trim() };
  });
};

test("Ruling 1 — the pointer moves, and the contribution moves with it", async ({ page }) => {
  const before = await figures(page);
  console.log(`BEFORE cards: ${JSON.stringify(before.cards)}`);
  console.log(`BEFORE byMaterial: ${before.byMaterial}`);
  expect(before.byMaterial, "Requests by material did not parse").toBeTruthy();
  console.log(`BEFORE stamps: pkg-1=${await stamp("seed-pkg-1")} pkg-2=${await stamp("seed-pkg-2")}`);

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2200);
  const qc = page.locator(".qc-wpg");                  // ⚠️ scoped — every workspace page stays mounted

  /* find a linked query */
  const rows = qc.locator(".f12-row");
  let idx = -1;
  for (let i = 0; i < 20; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(520);
    if (await qc.locator(".qc-strip--packed").count()) { idx = i; break; }
  }
  expect(idx, "no linked query").toBeGreaterThan(-1);

  /* PART 2 — exactly ONE attachment block, and no agent fallback beside it */
  const blocks = await qc.evaluate((r) => ({
    packed: r.querySelectorAll(".qc-strip--packed").length,
    loose: r.querySelectorAll(".qc-loose").length,
    looseChips: [...r.querySelectorAll(".qc-loose .qc-mchiptx")].map((e) => (e as HTMLElement).innerText),
    /* ⚠️ VISIBLE ONLY. `querySelectorAll` counts hidden nodes, and the first attempt at suppressing
       this used the `hidden` attribute — which `.f12-popwrap { display: flex }` overrides anyway.
       Counting the DOM would have reported the control present either way. */
    attachBtn: [...r.querySelectorAll(".qc-mchip-add")].filter((e) => (e as HTMLElement).offsetParent !== null).length,
    attachInsideStrip: r.querySelectorAll(".qc-strip--packed .qc-mchip-add").length,
    promoteLink: r.querySelectorAll(".qc-loose-promote").length,
  }));
  console.log(`LINKED blocks: ${JSON.stringify(blocks)}`);
  expect(blocks.packed, "not exactly one packaged strip").toBe(1);
  expect(blocks.loose, "the agent fallback is still rendering beside the package").toBe(0);
  /* D11 — nothing edits the package's contents from the query */
  expect(blocks.attachInsideStrip, "a + Attach inside a packaged strip").toBe(0);
  /* D11 — and none offered anywhere on a packaged query: it could only produce the forbidden state */
  expect(blocks.attachBtn, "+ Attach is still offered on a packaged query").toBe(0);

  /* PART 1 — the footer carries both facts */
  const foot = await qc.locator(".qc-strip--packed").first().evaluate((el) => ({
    lock: (el.querySelector(".qc-strip-lock") as HTMLElement)?.innerText ?? null,
    ptrs: [...el.querySelectorAll(".qc-strip-ptr")].map((b) => ({
      t: (b as HTMLElement).innerText.trim(), title: b.getAttribute("title") })),
  }));
  console.log(`FOOTER: ${JSON.stringify(foot)}`);
  /* ⚠️ CASE-INSENSITIVE — `innerText` returns what the CSS renders, and these are
     `text-transform: uppercase`. Comparing against the source string asks about words nobody sees;
     this is the second time in two runs, so it is worth the sentence. */
  expect(foot.ptrs.map((p) => p.t.toLowerCase())).toEqual(["change package", "remove"]);
  /* D2 — the pane's in-place grammar: every title begins "Change" */
  for (const p of foot.ptrs) expect(p.title ?? "", `title does not match the pane's grammar: ${p.title}`).toMatch(/^Change /);
  await page.screenshot({ path: SHOT("ptr-1-strip") });

  /* change the package */
  const wasName = await qc.locator(".qc-strip-name").first().innerText();
  await qc.locator(".qc-strip-ptr", { hasText: "Change package" }).first().click();
  await page.waitForTimeout(800);
  const pick = page.locator("[role='dialog'] button, .pkgpick-row").filter({ hasNotText: /cancel|close|manage/i });
  const names = await pick.allTextContents();
  console.log(`picker offers: ${JSON.stringify(names.slice(0, 6))}`);
  /* ⚠️ PICK ONE THAT IS NOT THE CURRENT PACKAGE. `nth(1)` happened to be the package the query
     already carried — the previous run had changed it — so the "change" was a no-op and the test
     reported the control broken. Which row is which is DATA; choose by name. */
  let target = -1;
  for (let i = 0; i < names.length; i++) {
    if (!names[i].startsWith(wasName)) { target = i; break; }
  }
  console.log(`current "${wasName}" → picking row ${target}`);
  expect(target, "no other package to move to").toBeGreaterThan(-1);
  await pick.nth(target).click();
  await page.waitForTimeout(2200);
  const nowName = await qc.locator(".qc-strip-name").first().innerText();
  console.log(`package: "${wasName}" → "${nowName}"`);
  expect(nowName).not.toBe(wasName);
  await page.screenshot({ path: SHOT("ptr-2-changed") });

  console.log(`AFTER stamps: pkg-1=${await stamp("seed-pkg-1")} pkg-2=${await stamp("seed-pkg-2")}`);
  const after = await figures(page);
  console.log(`AFTER cards: ${JSON.stringify(after.cards)}`);
  console.log(`AFTER byMaterial: ${after.byMaterial}`);

  /* D5 — the contribution MOVED. Both figures are derived, so this is the proof they follow. */
  expect(JSON.stringify(after.cards), "no scorecard changed — the contribution did not move")
    .not.toBe(JSON.stringify(before.cards));
});
