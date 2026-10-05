/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERY ACTIONS v1 — the remaining §H locks on the built app: the tick never commits (H9), blocks
 * stop and checks never do (H2), the date field (H5), and reduced motion (H7).
 */
import { test, expect, type Page } from "@playwright/test";
import { collection, getDocs } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";

let asserted = 0;
const ok = (c: unknown, m: string) => { asserted++; expect(c, m).toBeTruthy(); };

async function openDrawer(page: Page, req: Record<string, unknown>) {
  await page.evaluate((r) => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => Promise<void> } }).__saQueryDrawer.open(r), req);
  await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
}
async function accountFingerprint(): Promise<string> {
  const { db, uid } = await harnessDb();
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const feed = await getDocs(collection(db, "users", uid, "activities"));
  const flags = await getDocs(collection(db, "users", uid, "taskFlags"));
  const tasks = await getDocs(collection(db, "users", uid, "tasks"));
  const parts = qs.docs.map((d) => `${d.id}:${JSON.stringify(d.data(), Object.keys(d.data()).sort())}`).sort();
  return `${parts.join("|")}#${feed.size}#${flags.size}#${tasks.size}`;
}
async function agents() {
  const { db, uid } = await harnessDb();
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  const ags = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  return { qs, ags };
}

test("H9 — ticking a query task on the dashboard opens the drawer and writes NOTHING", async ({ page }) => {
  test.setTimeout(240_000);
  await ensureSignedIn(page);
  await openRoute(page, "/dashboard", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const reqRow = page.locator('[data-probe="todo-row"][data-category="req"]').first();
  await expect(reqRow, "no request row on the dashboard's to-do card").toBeVisible({ timeout: 20_000 });
  const before = await accountFingerprint();
  await reqRow.locator('[data-probe="todo-tick"]').click();
  await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(1500);
  ok((await accountFingerprint()) === before, "the tick wrote something — only the drawer may write");
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-qad-drawer]")).toHaveCount(0, { timeout: 5_000 });
  ok((await accountFingerprint()) === before, "cancelling the drawer wrote something");
});

test("H2 — a block stops Next and turns the review rust; a check stops nothing; a block's dot is not rust before it is reached", async ({ page }) => {
  test.setTimeout(240_000);
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const { qs, ags } = await agents();
  const TERMINAL = new Set(["Rejected", "Withdrawn", "No Response", "Signed"]);
  const msId = String(qs[0]?.manuscriptId);
  const live = new Set(qs.filter((q) => q.manuscriptId === msId && !TERMINAL.has(String(q.status))).map((q) => String(q.agentId)));
  const agent = ags.find((a) => !live.has(a.id) && !a.setAside);
  await openDrawer(page, { mode: "log", agentId: agent!.id, manuscriptId: msId });
  /* step 2 (What you sent) is not blocked yet and must not look it */
  ok((await page.locator('[data-qad-step="2"]').getAttribute("data-qad-state")) !== "blk", "a step shows rust before it was reached");
  await page.locator("[data-qad-primary]").click(); // → Sending
  /* a CHECK: choose a method the agent does not take — Next stays enabled */
  const other = page.locator('[data-qad-chips="via"] .qad-chip:not(.on)').first();
  await other.click();
  ok(await page.locator("[data-qad-primary]").isEnabled(), "a check disabled Next");
  await page.locator("[data-qad-primary]").click(); // → What you sent
  /* a BLOCK: nothing marked as sent */
  for (const t of ["ql", "syn"]) {
    const tg = page.locator(`[data-qad-toggle="${t}"]`);
    if ((await tg.getAttribute("aria-pressed")) === "true") await tg.click();
  }
  await page.locator('[data-qad-sample="log"] .qad-seg button', { hasText: "None" }).click();
  ok(await page.locator("[data-qad-primary]").isDisabled(), "a block did not disable Next");
  /* the review, reached through the stepper, shows the rust verdict and disables the action */
  await page.locator(`[data-qad-step="5"]`).click();
  await expect(page.locator('[data-qad-verdict="blk"]')).toBeVisible();
  ok(await page.locator("[data-qad-primary]").isDisabled(), "the review's action is enabled over a block");
  ok((await page.locator('[data-qad-step="2"]').getAttribute("data-qad-state")) === "blk", "a reached block's dot is not rust");
  /* decision 8 (Agent card v1): Escape on a drawer WITH answers parks it now — ✕ is what asks to discard */
  await page.locator(".qad-dx").click();
  await page.getByRole("button", { name: "Discard" }).click();
});

test("H5 — the date field: past strikes the future, future marks weekends, reminders move off the weekend, chips follow their base", async ({ page }) => {
  test.setTimeout(240_000);
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const { qs, ags } = await agents();
  const TERMINAL = new Set(["Rejected", "Withdrawn", "No Response", "Signed"]);
  const msId = String(qs[0]?.manuscriptId);
  const live = new Set(qs.filter((q) => q.manuscriptId === msId && !TERMINAL.has(String(q.status))).map((q) => String(q.agentId)));
  const agent = ags.find((a) => !live.has(a.id) && !a.setAside);
  await openDrawer(page, { mode: "log", agentId: agent!.id, manuscriptId: msId });
  await page.locator("[data-qad-primary]").click(); // → Sending
  await page.locator('[data-qad-date="logSent"] [data-qad-cal-toggle]').click();
  const cal = page.locator('[data-qad-date="logSent"] .qad-cal');
  await expect(cal).toBeVisible();
  const struck = await cal.locator(".grid button.no").count();
  const now = new Date();
  const dim = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  ok(struck === dim - now.getDate(), `past field strikes ${struck} future days, expected ${dim - now.getDate()}`);
  /* choose the 1st of this month as the sent date: the reply-expected chip must follow it */
  await page.keyboard.press("Escape"); // closes only the calendar
  await expect(page.locator("[data-qad-drawer]")).toBeVisible();
  await page.locator('[data-qad-date="logSent"] [data-qad-chip="y"]').click();
  await page.locator("[data-qad-primary]").click(); // → What you sent
  await page.locator("[data-qad-primary]").click(); // → Response expectations
  const usual = await page.locator('[data-qad-date="logExpect"] [data-qad-chip="usual"] small').textContent();
  await page.locator("[data-qad-back], .qad-back").first().click();
  await page.locator(".qad-back").first().click(); // back to Sending
  await page.locator('[data-qad-date="logSent"] [data-qad-chip="t"]').click();
  await page.locator("[data-qad-primary]").click();
  await page.locator("[data-qad-primary]").click();
  const usual2 = await page.locator('[data-qad-date="logExpect"] [data-qad-chip="usual"] small').textContent();
  ok(usual !== usual2, `the reply chip did not follow the sent date (${usual} → ${usual2})`);
  /* the future field marks weekends */
  await page.locator('[data-qad-date="logExpect"] [data-qad-cal-toggle]').click();
  ok((await page.locator('[data-qad-date="logExpect"] .qad-cal .grid button.wk').count()) > 0, "no weekend dots on a future field");
  await page.keyboard.press("Escape");
  /* reminders are never on a weekend: every nudge chip is a weekday */
  await page.locator("[data-qad-primary]").click(); // → If they don't reply
  await page.locator('[data-qad-chips="ifno"] [data-qad-chip="nudge"]').click();
  const subs = await page.locator('[data-qad-date="logNudge"] .qad-chip small').allTextContents();
  for (const s of subs) {
    const d = new Date(`${s} ${new Date().getFullYear()}`);
    if (!isNaN(d.getTime())) ok(d.getDay() !== 0 && d.getDay() !== 6, `a reminder chip lands on a weekend: ${s}`);
  }
  /* decision 8 (Agent card v1): Escape on a drawer WITH answers parks it now — ✕ is what asks to discard */
  await page.locator(".qad-dx").click();
  await page.getByRole("button", { name: "Discard" }).click();
});

test("H7 — reduced motion: the drawer fades, nothing is transformed or animated", async ({ page }) => {
  test.setTimeout(180_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  await openDrawer(page, { mode: "log" });
  const probe = await page.evaluate(() => {
    const d = document.querySelector("[data-qad-drawer]") as HTMLElement;
    const img = document.querySelector(".qad-qwrap img") as HTMLElement;
    const running = document.getAnimations().filter((a) => {
      const t = (a.effect as KeyframeEffect | null)?.target as Element | null;
      /* the FADE is the one motion reduced motion keeps: a CSS transition on opacity is allowed */
      /* a transition of opacity or of a colour moves nothing, so it is allowed; one that moves a box is not */
      const tp = (a as unknown as { transitionProperty?: string }).transitionProperty;
      const fade = !!tp && !/^(transform|translate|rotate|scale|left|top|right|bottom|width|height|inset|margin(-[a-z]+)?)$/.test(tp);
      return !!t && !!t.closest(".qad-root") && !fade && ((a.effect as KeyframeEffect).getComputedTiming().duration as number) > 5;
    }).map((a) => (a as unknown as { animationName?: string; transitionProperty?: string }).animationName || `transition:${(a as unknown as { transitionProperty?: string }).transitionProperty}`);
    return { transform: getComputedStyle(d).transform, dip: getComputedStyle(img).animationDuration, running };
  });
  ok(probe.transform === "none", `the drawer is transformed under reduced motion: ${probe.transform}`);
  ok(probe.running.length === 0, `${probe.running.length} animations still run under reduced motion: ${probe.running.join(", ")}`);
  await page.keyboard.press("Escape");
});

test("D7 — Delete query: the confirm, the delete, and an Undo that brings every document back", async ({ page }) => {
  test.setTimeout(240_000);
  const { doc, getDoc, getDocs: gd, collection: col, query: fq, where: wh } = await import("firebase/firestore");
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const { db, uid } = await harnessDb();
  const read = async (id: string) => {
    const out: string[] = [];
    const q = await getDoc(doc(db, "users", uid, "queries", id));
    if (q.exists()) out.push(`${q.ref.path}=${JSON.stringify(q.data(), Object.keys(q.data()).sort())}`);
    for (const c of [col(db, "users", uid, "queries", id, "activity")]) (await gd(c)).forEach((d) => out.push(`${d.ref.path}=${JSON.stringify(d.data(), Object.keys(d.data()).sort())}`));
    for (const name of ["activities", "taskFlags"]) (await gd(fq(col(db, "users", uid, name), wh("queryId", "==", id)))).forEach((d) => out.push(`${d.ref.path}=${JSON.stringify(d.data(), Object.keys(d.data()).sort())}`));
    return out.sort().join("\n");
  };
  const row = page.locator('.qcv-page [data-qcv="row"]').first();
  await expect(row).toBeVisible({ timeout: 20_000 });
  const id = await row.getAttribute("data-id");
  ok(!!id, "a row with an id");
  const before = await read(id!);
  await row.click();
  await page.locator('[data-qcv="open-del"]').click();
  await expect(page.locator('[data-qcv="open-delc"]')).toBeVisible();
  await page.locator('[data-qcv="open-del-go"]').click();
  await expect(page.locator('[data-qad-toast="on"]')).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => (await getDoc(doc(db, "users", uid, "queries", id!))).exists(), { timeout: 15_000 }).toBe(false);
  await page.locator("[data-qad-undo]").click();
  await expect(page.locator('[data-qad-toast="done"]')).toBeVisible({ timeout: 20_000 });
  await expect.poll(async () => read(id!), { timeout: 20_000, message: "Undo did not bring the query back exactly" }).toBe(before);
  asserted++;
});
