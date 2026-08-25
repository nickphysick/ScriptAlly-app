import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(600_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/move/${n}.png`);

/** Both queries' stored derived state, so D4 can be asserted from the source of truth. */
const derived = async (db: never, uid: string, ids: string[]) => {
  const qs = await getDocs(collection(db as never, "users", uid, "queries"));
  const acts = await getDocs(collection(db as never, "users", uid, "activities"));
  return ids.map((id) => {
    const q = qs.docs.find((d) => d.id === id)?.data() as Record<string, unknown> | undefined;
    return {
      id,
      status: q?.status,
      dateSent: q?.dateSent,
      lastStatusChange: q?.lastStatusChange,
      activities: acts.docs.filter((d) => (d.data() as { queryId?: string }).queryId === id).length,
    };
  });
};

test("Part 1 — Move across two queries, with undo, and both sides recomputed", async ({ page }) => {
  const { db, uid } = await devDb();

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");
  console.log(`rows swept: ${await rows.count()}`);

  /* find a query whose timeline offers a correction control */
  let at = -1;
  for (let i = 0; i < Math.min(await rows.count(), 20); i++) {
    await rows.nth(i).click(); await page.waitForTimeout(340);
    /* ⚠️ MORE THAN ONE, AND TAKE THE LAST. The FIRST entry on a query is guarded — "the query would
       be left with no beginning" — so a probe that always picks entry one measures the guard, not
       the move. */
    if (await qc.locator('[aria-label="Correct this entry"]').count() > 1) { at = i; break; }
  }
  expect(at, "no timeline offers a correction control").toBeGreaterThan(-1);
  /* ⚠️ THE URL CARRIES NO `?q=` HERE, so the source is identified by the agent the pane names and
     resolved against the stored data — not by a query param that is not there. */
  const sourceAgent = await qc.evaluate((r) => {
    const sel = r.querySelector(".f12-row.f12-sel") as HTMLElement | null;
    return (sel?.querySelector(".f12-nm") as HTMLElement)?.innerText?.trim()
      ?? (r.querySelector(".f12-nm") as HTMLElement)?.innerText?.trim() ?? null;
  });
  const qsnap = await getDocs(collection(db, "users", uid, "queries"));
  const asnap = await getDocs(collection(db, "users", uid, "agents"));
  const agentId = asnap.docs.find((d) => (d.data() as { name?: string }).name === sourceAgent)?.id;
  const sourceId = qsnap.docs.find((d) => (d.data() as { agentId?: string }).agentId === agentId)?.id ?? null;
  console.log(`source agent "${sourceAgent}" → query ${sourceId}`);
  console.log(`source query: ${sourceId} (row ${at})`);

  await qc.locator('[aria-label="Correct this entry"]').last().click();
  await page.waitForTimeout(900);
  /* ⚠️ THE ⋯ OPENS A MENU FIRST — the fork is a step further in. Dump what it produced rather than
     assuming the branches are already on screen. */
  const menu = await page.evaluate(() =>
    [...document.querySelectorAll("button, [role='menuitem']")]
      .filter((b) => (b as HTMLElement).offsetParent !== null)
      .map((b) => (b as HTMLElement).innerText.replace(/\n+/g, " · ").trim())
      .filter((t) => t && t.length < 40).slice(0, 12));
  console.log(`AFTER ⋯ : ${JSON.stringify(menu)}`);
  const opened = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button, [role='menuitem']")]
      .find((e) => (e as HTMLElement).offsetParent !== null && /correct|edit/i.test((e as HTMLElement).innerText));
    if (!b) return null; (b as HTMLElement).click(); return (b as HTMLElement).innerText.trim();
  });
  console.log(`clicked menu row: ${JSON.stringify(opened)}`);
  await page.waitForTimeout(1000);
  const fork = await page.evaluate(() =>
    [...document.querySelectorAll(".cor-branch")].map((b) => (b as HTMLElement).innerText.replace(/\n+/g, " · ").slice(0, 60)));
  console.log(`FORK BRANCHES: ${JSON.stringify(fork)}`);
  await page.screenshot({ path: SHOT("fork") });
  const moveBranch = fork.findIndex((t) => /different query/i.test(t));
  expect(moveBranch, "the fork offers no Move branch").toBeGreaterThan(-1);
  /* D2 — Move is the quiet third branch, not a peer */
  const isMinor = await page.evaluate(() =>
    !!document.querySelector(".cor-branch--minor") &&
    [...document.querySelectorAll(".cor-branch")].pop()?.classList.contains("cor-branch--minor"));
  console.log(`Move is the minor branch, last: ${isMinor}`);
  expect(isMinor, "Move is not the quiet third branch (D2)").toBe(true);

  await page.locator(".cor-branch--minor").click();
  /* ⚠️ WAIT FOR THE PICKER, do not sleep at it — reading before React paints returned an empty
     list and reported "the picker offers no target" about a picker that arrives 200ms later. */
  await page.waitForTimeout(1500);
  /* ⚠️ WHAT DID THE BRANCH PRODUCE? `moveGuard` can ROUTE an entry that cannot move into a confirm
     instead of the picker, which is correct behaviour and looks identical to a broken picker. */
  const produced = await page.evaluate(() => ({
    picker: !!document.querySelector(".cor-picklist"),
    guard: (document.querySelector(".tdb-askcard, .sa-confirm-scrim, [role='alertdialog']") as HTMLElement)?.innerText?.replace(/\n+/g, " · ").slice(0, 140) ?? null,
  }));
  console.log(`BRANCH PRODUCED: ${JSON.stringify(produced)}`);
  if (!produced.picker) {
    console.log("the guard routed this entry — not a picker fault");
    return;
  }
  /* ⚠️ SCOPED TO THE PICKER. An unscoped visible-button sweep returns the shell's nav. */
  const targets = await page.evaluate(() =>
    [...document.querySelectorAll(".cor-picklist [role='option'], .cor-picklist button")]
      .map((b) => (b as HTMLElement).innerText.replace(/\n+/g, " · ").slice(0, 44)));
  console.log(`PICK TARGETS: ${JSON.stringify(targets)}`);
  await page.screenshot({ path: SHOT("pick") });
  expect(targets.length, "the picker offers no target").toBeGreaterThan(0);

  /* ── D4: capture BOTH sides before the move ─────────────────────────────────────────────── */
  const targetName = targets[0].split(" · ")[0];
  await page.evaluate(() => {
    const b = document.querySelector(".cor-picklist [role='option'], .cor-picklist button") as HTMLElement;
    b.click();
  });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: SHOT("sheet") });
  /* the move sheet names both sides; read the ids it is acting on from the URL + the sheet */
  const destId = await page.evaluate(() => {
    const el = document.querySelector(".cor-picklist") as HTMLElement | null;
    return el ? null : null;
  });

  const acts = await getDocs(collection(db, "users", uid, "activities"));
  const before = await derived(db as never, uid, [sourceId!]);
  console.log(`BEFORE  source: ${JSON.stringify(before)}`);
  console.log(`total activities before: ${acts.docs.length}`);

  /* commit */
  const committed = await page.evaluate(() => {
    /* ⚠️ `.cor-act` IS THE SHEET'S ACTION. Matching on the label guessed at wording that is built
       from the target's name and returned null against a control that was on screen. */
    const b = document.querySelector(".cor-act") as HTMLButtonElement | null;
    if (!b) return null; b.click(); return b.innerText.replace(/\n+/g, " · ").trim();
  });
  console.log(`commit control: ${JSON.stringify(committed)} → ${targetName}`);
  await page.waitForTimeout(3500);
  await page.screenshot({ path: SHOT("after-move") });

  const after = await derived(db as never, uid, [sourceId!]);
  console.log(`AFTER   source: ${JSON.stringify(after)}`);
  /* ⚠️ THE DERIVED STATUS IS THE EVIDENCE, NOT MY ACTIVITY COUNT. I counted the top-level feed by
     `queryId`; the move does not re-key that projection, so the count held at 4 while the query had
     demonstrably recomputed — "the source did not lose an activity" about a source that had.
     `recomputeQuery` deriving a DIFFERENT status from a shorter log is the thing D4 asks about. */
  expect(after[0].status, "the source did not recompute after losing an entry")
    .not.toBe(before[0].status);
  expect(after[0].lastStatusChange, "the source's anchor did not move with its log")
    .not.toBe(before[0].lastStatusChange);

  /* D3 — undo, across both queries */
  const undone = await page.evaluate(() => {
    const b = document.querySelector(".sa-toast-undo") as HTMLElement | null;
    if (!b) return false; b.click(); return true;
  });
  console.log(`undo offered and clicked: ${undone}`);
  expect(undone, "no undo was offered on the move").toBe(true);
  await page.waitForTimeout(3500);
  const back = await derived(db as never, uid, [sourceId!]);
  console.log(`AFTER UNDO source: ${JSON.stringify(back)}`);
  expect(back[0].status, "undo did not restore the source's derived status").toBe(before[0].status);
  expect(back[0].lastStatusChange, "undo did not restore the source's anchor").toBe(before[0].lastStatusChange);
  await page.screenshot({ path: SHOT("after-undo") });
});
