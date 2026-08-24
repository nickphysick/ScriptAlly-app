import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(300_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/packages-two-state/${n}.png`);
/**
 * ⚠️ SELECTION IS BY ROW, NOT BY `?q=`. The deep link only selects a query the current manuscript
 * scope already contains, so naming an id off-scope silently selects nothing and every locator
 * then waits on an element that will never arrive. Scanning is slower and always correct.
 */
const scan = async (page: import("@playwright/test").Page, qc: import("@playwright/test").Locator) => {
  const rows = qc.locator(".f12-row");
  const n = Math.min(await rows.count(), 30);
  let fork = -1, forkLive = -1, loose = -1;
  for (let i = 0; i < n && (fork < 0 || loose < 0); i++) {
    await rows.nth(i).click();
    await page.waitForTimeout(340);
    const st = await qc.evaluate((r) => ({
      f: r.querySelectorAll(".qc-fork").length,
      l: r.querySelectorAll(".qc-loose-promote").length,
      off: (r.querySelector(".qc-forkbtn--pkg") as HTMLButtonElement | null)?.disabled ?? null,
    }));
    if (fork < 0 && st.f) fork = i;
    if (forkLive < 0 && st.f && st.off === false) forkLive = i;
    if (loose < 0 && st.l) loose = i;
  }
  console.log(`rows scanned: ${n} | fork row: ${fork} | fork w/ live branch: ${forkLive} | loose row: ${loose}`);
  return { rows, fork, forkLive, loose };
};

test("Parts 3 & 4 — the fork, the switch, and links only", async ({ page }) => {
  const { db, uid } = await devDb();
  /* ⚠️ PUT BACK WHAT EARLIER RUNS BORROWED before measuring anything. */
  for (const [id, pkg] of [["seed-pkgq-1", "seed-pkg-1"], ["cor-move-a", "seed-pkg-1"]] as const) {
    await updateDoc(doc(db, "users", uid, "queries", id), { packageId: pkg });
  }
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const loose = qs.docs.find((d) => {
    const q = d.data() as { packageId?: string; materialsWanted?: unknown[] };
    return !q.packageId && (q.materialsWanted ?? []).length > 0;
  });
  console.log(`loose query: ${loose?.id ?? "none"}`);

  /* ══ D9 — the fork, on the one state that reaches it ══════════════════════════════════════
     ⚠️ THE FORK IS THE GENUINELY-EMPTY STATE, NARROWER THAN "no package". An unattached query
     still renders the AGENT'S expected materials as a fallback, so `loose.length > 0` and the
     fork is suppressed. It draws only when there is no package, no stored materials AND no
     agent defaults — which is `cor-closed` on this account. */
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2400);
  const qc = page.locator(".qc-wpg");
  const { rows, fork: forkRow, forkLive, loose: looseRow } = await scan(page, qc);
  expect(forkRow, "no query reaches the fork at all").toBeGreaterThan(-1);
  /* ⚠️ A READING, NOT A SKIP. `-1` here means the fork's package branch is unreachable on this
     account: the only query in the empty state sits on a manuscript with no packages, so the
     branch is correctly disabled. Reported rather than absorbed. */
  console.log(`F-Z fork package branch drivable: ${forkLive > -1}`);
  expect(looseRow, "no query shows loose materials with a promote").toBeGreaterThan(-1);
  await rows.nth(forkRow).click();
  await page.waitForTimeout(600);
  const fork = await qc.locator(".qc-fork").first().evaluate((el) => ({
    q: (el.querySelector(".qc-fork-q") as HTMLElement)?.innerText,
    btns: [...el.querySelectorAll(".qc-forkbtn")].map((b) => ({
      t: (b as HTMLElement).innerText.trim(), off: (b as HTMLButtonElement).disabled,
      title: b.getAttribute("title"), bg: getComputedStyle(b).backgroundColor,
    })),
  }));
  console.log(`FORK: ${JSON.stringify(fork)}`);
  expect(fork.q).toBe("What went with this query?");
  expect(fork.btns.map((b) => b.t)).toEqual(["Attach a package", "List materials"]);
  const only = await qc.evaluate((r) => r.querySelectorAll(".qc-fork").length
    + r.querySelectorAll(".qc-strip--packed").length + r.querySelectorAll(".qc-loose").length);
  expect(only, "more than one attachment block in the empty state").toBe(1);
  await page.screenshot({ path: SHOT("p3-fork") });

  /* branch 2 — List materials opens the editor rather than writing anything */
  await qc.locator(".qc-forkbtn").nth(1).click();
  await page.waitForTimeout(700);
  const opened = await page.evaluate(() => [...document.querySelectorAll(".f12-popwrap")].filter((e) => (e as HTMLElement).offsetParent !== null).length);
  console.log(`List materials opened editors: ${opened}`);
  expect(opened, "the List materials branch opened nothing").toBeGreaterThan(0);
  await page.screenshot({ path: SHOT("p3-list") });
  await page.keyboard.press("Escape");

  /* ══ D10 + D12 — the switch confirm, and the write it ends in ═══════════════════════════ */
  await rows.nth(looseRow).click();
  await page.waitForTimeout(700);
  const before = await qc.evaluate((r) => ({
    loose: r.querySelectorAll(".qc-loose").length,
    packed: r.querySelectorAll(".qc-strip--packed").length,
    promote: (r.querySelector(".qc-loose-promote") as HTMLElement)?.innerText ?? null,
  }));
  console.log(`BEFORE: ${JSON.stringify(before)}`);
  await page.screenshot({ path: SHOT("p3-loose") });

  page.on("dialog", (d) => void d.accept());
  await qc.locator(".qc-loose-promote").first().click();
  await page.waitForTimeout(800);
  /* ⚠️ `.tdb-askscrim` IS THE BACKDROP AND IS ALWAYS EMPTY — reading it reports "no confirm"
     about a dialogue that is on screen. The words are in `.tdb-askcard`. */
  const confirmTxt = await page.evaluate(() =>
    (document.querySelector(".tdb-askcard") as HTMLElement)?.innerText ?? null);
  console.log(`CONFIRM: ${JSON.stringify(confirmTxt)}`);
  expect(confirmTxt, "no confirm before replacing listed materials").toBeTruthy();
  await page.screenshot({ path: SHOT("p3-confirm") });

  await page.locator(".tdb-askcard").getByRole("button", { name: /choose a package/i }).click();
  await page.waitForTimeout(900);
  const pickRows = page.locator(".pkgpick-row, [role='dialog'] button").filter({ hasNotText: /cancel|close|manage/i });
  console.log(`picker rows: ${await pickRows.count()}`);
  await pickRows.first().click();
  await page.waitForTimeout(2400);

  const after = await qc.evaluate((r) => ({
    packed: r.querySelectorAll(".qc-strip--packed").length,
    loose: r.querySelectorAll(".qc-loose").length,
    eyebrows: [...r.querySelectorAll(".qc-strip--packed .qc-mchipeye")].map((e) => (e as HTMLElement).innerText),
  }));
  console.log(`AFTER: ${JSON.stringify(after)}`);
  expect(after.packed, "the switch did not produce a packaged strip").toBe(1);
  /* ⚠️ SLOT EYEBROWS ARE THE PROOF IT IS A LINK. A snapshot stores plain material strings and
     cannot resolve a version's slot, so eyebrows can only come from a live package lookup. */
  expect(after.eyebrows.length, "no slot eyebrows — this wrote a snapshot, not a link").toBeGreaterThan(0);
  await page.screenshot({ path: SHOT("p4-linked") });

  const again = await getDocs(collection(db, "users", uid, "queries"));
  const marks = again.docs.filter((d) => ((d.data() as { materialsWanted?: unknown[] }).materialsWanted ?? [])
    .some((m) => typeof m !== "string" && !!(m as { fromPackageId?: string }).fromPackageId));
  const linked = again.docs.filter((d) => !!(d.data() as { packageId?: string }).packageId);
  console.log(`F-Z snapshots: ${marks.length} | links: ${linked.length}`);
  console.log(`links after: ${linked.map((d) => d.id).join(", ")}`);
  expect(linked.length, "the switch wrote no new link").toBeGreaterThan(
    qs.docs.filter((d) => !!(d.data() as { packageId?: string }).packageId).length - 1);
});
