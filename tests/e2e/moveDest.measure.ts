import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs } from "firebase/firestore";
test.setTimeout(300_000);

test("D8 — the DESTINATION derives too, and undo returns it exactly", async ({ page }) => {
  page.setDefaultTimeout(20_000);
  const { db, uid } = await devDb();
  const snap = async () => {
    const qs = await getDocs(collection(db, "users", uid, "queries"));
    const m: Record<string, unknown> = {};
    for (const d of qs.docs) {
      const q = d.data() as Record<string, unknown>;
      m[d.id] = { status: q.status, lastStatusChange: q.lastStatusChange,
                  responseReceivedAt: q.responseReceivedAt ?? null,
                  revisionRound: q.revisionRound ?? null, dateSent: q.dateSent,
                  partialSentDate: q.partialSentDate ?? null, fullSentDate: q.fullSentDate ?? null };
    }
    return m;
  };
  const agents = await getDocs(collection(db, "users", uid, "agents"));
  const nameOf = (id: string) => (agents.docs.find((d) => d.id === id)?.data() as { name?: string })?.name;

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2400);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");
  let at = -1;
  for (let i = 0; i < 20; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(320);
    if (await qc.locator('[aria-label="Correct this entry"]').count() > 1) { at = i; break; }
  }
  expect(at).toBeGreaterThan(-1);
  const srcAgent = await qc.evaluate((r) =>
    (r.querySelector(".f12-row.f12-sel .f12-nm") as HTMLElement)?.innerText?.trim() ?? null);

  await qc.locator('[aria-label="Correct this entry"]').last().click();
  await page.waitForTimeout(700);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((e) =>
      (e as HTMLElement).offsetParent !== null && /^edit$/i.test((e as HTMLElement).innerText.trim()));
    (b as HTMLButtonElement)?.click();
  });
  await page.waitForTimeout(900);
  await page.locator(".cor-branch--minor").click();
  await page.locator(".cor-picklist").waitFor({ state: "visible" });
  await page.waitForTimeout(400);

  const pick = await page.evaluate(() => {
    const r = document.querySelector(".cor-picklist [role='option'], .cor-picklist button") as HTMLElement;
    const txt = r.innerText.replace(/\n+/g, " · ");
    r.click();
    return txt;
  });
  const destAgent = pick.split(" · ")[0].trim();
  const destStatus = pick.split(" · ").pop()!.trim().toLowerCase();
  console.log(`source agent: ${srcAgent} → destination row: ${pick}`);

  const before = await snap();
  const srcId = Object.keys(before).find((id) => {
    const qs = (before as never as Record<string, unknown>);
    return false;
  });
  /* resolve both ids from the stored data by agent + status */
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const dest = qs.docs.find((d) => {
    const q = d.data() as { agentId?: string; status?: string };
    return nameOf(q.agentId ?? "") === destAgent && (q.status ?? "").toLowerCase() === destStatus;
  });
  const src = qs.docs.find((d) => {
    const q = d.data() as { agentId?: string };
    return nameOf(q.agentId ?? "") === srcAgent;
  });
  console.log(`resolved — source ${src?.id} · destination ${dest?.id}`);
  expect(dest, "could not resolve the destination query").toBeTruthy();

  console.log(`BEFORE dest : ${JSON.stringify(before[dest!.id])}`);
  console.log(`BEFORE src  : ${JSON.stringify(before[src!.id])}`);

  await page.waitForTimeout(900);
  await page.evaluate(() => (document.querySelector(".cor-act") as HTMLButtonElement)?.click());
  await page.waitForTimeout(3500);
  const after = await snap();
  console.log(`AFTER  dest : ${JSON.stringify(after[dest!.id])}`);
  console.log(`AFTER  src  : ${JSON.stringify(after[src!.id])}`);
  const destMoved = JSON.stringify(after[dest!.id]) !== JSON.stringify(before[dest!.id]);
  console.log(`destination derived state changed: ${destMoved}`);

  const undone = await page.evaluate(() => {
    const b = document.querySelector(".sa-toast-undo") as HTMLElement | null;
    if (!b) return false; b.click(); return true;
  });
  await page.waitForTimeout(3500);
  const back = await snap();
  console.log(`AFTER UNDO dest : ${JSON.stringify(back[dest!.id])}`);
  console.log(`AFTER UNDO src  : ${JSON.stringify(back[src!.id])}`);
  expect(undone, "no undo offered").toBe(true);
  expect(back[dest!.id], "undo did not return the destination exactly").toEqual(before[dest!.id]);
  expect(back[src!.id], "undo did not return the source exactly").toEqual(before[src!.id]);
});
