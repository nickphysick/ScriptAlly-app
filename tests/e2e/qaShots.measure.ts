/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * QUERY ACTIONS v1 — the report's pictures: every journey's steps and its review at 1440, in the
 * app and in the mock, walked the same way. READ-ONLY: every drawer is discarded with Escape, and
 * nothing is saved. Shots land in reports/query-actions-v1/shots/journeys/.
 *
 * The walk is generic on both sides: screenshot, then press Next while it says Next; where Next is
 * disabled, choose the first unchosen option in the step and try again. It stops at the review.
 */
import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { collection, getDocs } from "firebase/firestore";
import { ensureSignedIn, openRoute, liftMotionSuppression } from "./measure";
import { harnessDb } from "./harnessDocs";

const OUT = "reports/query-actions-v1/shots/journeys";
const MOCK = "http://127.0.0.1:4610/query-actions-v11.html";
mkdirSync(OUT, { recursive: true });

type Side = { primary: string; opt: string; review: string };
const APP: Side = { primary: "[data-qad-primary]", opt: ".qad-body .qad-chip:not(.on), .qad-body .qad-rad:not(.on)", review: "[data-qad-review]" };
const REF: Side = { primary: "#mSave", opt: "#mBody .chip:not(.on), #mBody .rad:not(.on)", review: "#rvp .rv, #mBody .rv, .rvw" };

async function walk(page: Page, side: Side, name: string) {
  const shots: string[] = [];
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(450);
    const f = `${OUT}/${name}-${i}.png`;
    await page.screenshot({ path: f });
    shots.push(f);
    const btn = page.locator(side.primary).first();
    const label = ((await btn.textContent()) || "").trim();
    if (!/^Next/i.test(label)) break;
    if (await btn.isDisabled()) {
      const o = page.locator(side.opt).first();
      if (!(await o.count())) break;
      await o.click();
      await page.waitForTimeout(250);
      if (await btn.isDisabled()) break;
    }
    await btn.click();
  }
  return shots;
}

const JOURNEYS: { key: string; ref: string; refIdx: number | null; pick: (qs: Array<Record<string, unknown> & { id: string }>) => (Record<string, unknown> & { id: string }) | undefined }[] = [
  { key: "resp", ref: "resp", refIdx: 0, pick: (qs) => qs.find((q) => q.status === "Queried") },
  { key: "late", ref: "resp", refIdx: 6, pick: (qs) => qs.find((q) => q.status === "No Response") },
  { key: "sent", ref: "matsent", refIdx: 1, pick: (qs) => qs.find((q) => q.status === "Partial Requested") },
  { key: "nudge", ref: "nudge", refIdx: 2, pick: (qs) => qs.find((q) => q.status === "Queried") },
  { key: "close", ref: "close", refIdx: 0, pick: (qs) => qs.find((q) => q.status === "Queried") },
  { key: "offer", ref: "offer", refIdx: 5, pick: (qs) => qs.find((q) => q.status === "Offer") },
];
const MODE: Record<string, string> = { resp: "resp", late: "resp", sent: "sent", nudge: "nudge", close: "close", offer: "offer" };

test("journey pictures — app vs mock at 1440", async ({ page, browser }) => {
  test.setTimeout(900_000);
  await ensureSignedIn(page);
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const { db, uid } = await harnessDb();
  const qs = (await getDocs(collection(db, "users", uid, "queries"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  const ags = (await getDocs(collection(db, "users", uid, "agents"))).docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) }) as Record<string, unknown> & { id: string });
  const open = async (req: Record<string, unknown>) => {
    await page.evaluate((r) => (window as unknown as { __saQueryDrawer: { open: (r: unknown) => Promise<void> } }).__saQueryDrawer.open(r), req);
    await expect(page.locator("[data-qad-drawer]")).toBeVisible({ timeout: 10_000 });
  };
  const discard = async () => {
    /* decision 8 (Agent card v1): Escape with answers PARKS now — ✕ is the way out, asking first only when there are answers */
    await page.locator(".qad-dx").click();
    const d = page.getByRole("button", { name: "Discard" });
    if (await d.count()) await d.click();
    await expect(page.locator("[data-qad-drawer]")).toHaveCount(0, { timeout: 5_000 });
    await expect(page.locator("[data-qad-park-chip]")).toHaveCount(0);
  };

  const ref = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await ref.goto(MOCK);
  const refOpen = async (mode: string, idx: number | null) => {
    await ref.evaluate(([m, x]) => {
      const w = window as unknown as { openCard: (x: number) => void; openDrawer: (m: string, x: number | null, c?: boolean) => void };
      if (x !== null) { w.openCard(x as number); w.openDrawer(m as string, x as number, true); } else w.openDrawer(m as string, null);
    }, [mode, idx] as const);
  };
  const refClose = async () => { await ref.goto(MOCK); };

  const made: string[] = [];
  /* D1 — log */
  const TERMINAL = new Set(["Rejected", "Withdrawn", "No Response", "Signed"]);
  const msId = String(qs[0]?.manuscriptId);
  const live = new Set(qs.filter((q) => q.manuscriptId === msId && !TERMINAL.has(String(q.status))).map((q) => String(q.agentId)));
  const agent = ags.find((a) => !live.has(a.id) && !a.setAside);
  await open({ mode: "log", agentId: agent!.id, manuscriptId: msId });
  made.push(...(await walk(page, APP, "app-log")));
  await discard();
  await refOpen("log", null);
  await ref.evaluate(() => (window as unknown as { pickAg: (id: string) => void }).pickAg("SD"));
  made.push(...(await walk(ref, REF, "ref-log")));
  await refClose();

  for (const j of JOURNEYS) {
    const q = j.pick(qs);
    if (!q) { console.log(`no ${j.key} fixture on the account`); continue; }
    await open({ mode: MODE[j.key], queryId: q.id });
    made.push(...(await walk(page, APP, `app-${j.key}`)));
    await discard();
    await refOpen(j.ref, j.refIdx);
    made.push(...(await walk(ref, REF, `ref-${j.key}`)));
    await refClose();
  }
  console.log(`SHOTS ${made.length}`);
  expect(made.length).toBeGreaterThan(14);
});
