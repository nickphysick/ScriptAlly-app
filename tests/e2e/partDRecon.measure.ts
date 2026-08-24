import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(600_000);

test("R-A / D8 census — stored shape against what the pane renders", async ({ page }) => {
  /* ── the stored side ─────────────────────────────────────────────────────────────────── */
  const { db, uid } = await devDb();
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const kindOf = (d: { packageId?: string; materialsWanted?: unknown[] }) => {
    const mats = d.materialsWanted ?? [];
    const marked = mats.some((m) => typeof m !== "string" && !!(m as { fromPackageId?: string }).fromPackageId);
    if (d.packageId) return marked ? "BOTH(!)" : "link";
    if (marked) return "snapshot";
    return mats.length ? "loose" : "none";
  };
  const tally: Record<string, number> = {};
  for (const d of qs.docs) {
    const k = kindOf(d.data() as never);
    tally[k] = (tally[k] ?? 0) + 1;
  }
  console.log(`STORED: ${JSON.stringify(tally)} across ${qs.docs.length} queries`);

  /* ── the rendered side ───────────────────────────────────────────────────────────────── */
  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  /* ⚠️ THE LIST IS MANUSCRIPT-SCOPED, so a census taken in the default scope silently omits every
     query on another manuscript — which is exactly where a stale render would hide. Widen to All
     first, and say how many rows that produced. */
  const all = qc.getByRole("button", { name: /^all$/i }).first();
  if (await all.count()) { await all.click(); await page.waitForTimeout(900); }
  const rows = qc.locator(".f12-row");
  const n = Math.min(await rows.count(), 60);
  console.log(`rows on screen: ${n}`);

  const census: Record<string, number> = {};
  const offenders: unknown[] = [];
  let sampled = 0;
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click();
    await page.waitForTimeout(330);
    const s = await qc.evaluate((r) => {
      const strip = r.querySelectorAll(".qc-strip--packed").length;
      const loose = r.querySelectorAll(".qc-loose").length;
      const fork = r.querySelectorAll(".qc-fork").length;
      const eyebrows = [...r.querySelectorAll(".qc-strip--packed .qc-mchipeye")].map((e) => (e as HTMLElement).innerText);
      const chips = [...r.querySelectorAll(".qc-strip--packed .qc-mchip, .qc-strip-items *")]
        .map((e) => (e as HTMLElement).innerText?.trim()).filter(Boolean).slice(0, 6);
      /* D11 — no editing affordance inside a packaged strip */
      const editsInStrip = r.querySelectorAll(".qc-strip--packed .qc-mchipx, .qc-strip--packed .qc-addmat").length;
      /* the two pointer controls (D1/D2) */
      const ptrs = [...r.querySelectorAll(".qc-strip-ptr")].map((e) => (e as HTMLElement).innerText.trim());
      const lock = !!r.querySelector(".qc-strip-lock");
      return { strip, loose, fork, eyebrows, chips, editsInStrip, ptrs, lock };
    });
    sampled++;
    const key = `strip${s.strip}-loose${s.loose}-fork${s.fork}`;
    census[key] = (census[key] ?? 0) + 1;
    /* D8: exactly one attachment block, never a fork beside one */
    if (s.strip + s.loose + s.fork !== 1) offenders.push({ row: i, ...s });
    if (s.strip && s.editsInStrip) offenders.push({ row: i, note: "edit control inside a packaged strip", ...s });
    if (i < 4) console.log(`  row ${i}: ${JSON.stringify(s)}`);
  }
  console.log(`SAMPLED: ${sampled}`);
  console.log(`D8 CENSUS: ${JSON.stringify(census)}`);
  console.log(`OFFENDERS: ${offenders.length}`);
  for (const o of offenders.slice(0, 4)) console.log(`  ${JSON.stringify(o)}`);

  await page.screenshot({ path: resolve(process.cwd(), "reports/packages-two-state/recon-1440.png") });
  expect(sampled, "nothing was sampled — the census proves nothing").toBeGreaterThan(10);
  expect(offenders, "a query renders the wrong number of attachment blocks").toEqual([]);
});
