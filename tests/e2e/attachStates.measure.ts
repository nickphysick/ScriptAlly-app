import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, doc, updateDoc, deleteField } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(420_000);

const census = (page: import("@playwright/test").Page) => page.locator(".qc-wpg").evaluate((r) => {
  /* ⚠️ `offsetParent !== null` IS NOT A VISIBILITY TEST ON ITS OWN — `visibility: hidden` keeps an
     offset parent, so an element taken off the page still counts. The D10 control is hidden that
     way ON PURPOSE (its ref must stay clickable for the fork's List materials), and the first run
     reported it as surviving. Check the computed visibility too. */
  const vis = (s: string) => [...r.querySelectorAll(s)].filter((e) => {
    const el = e as HTMLElement;
    return el.offsetParent !== null && getComputedStyle(el).visibility !== "hidden";
  }).length;
  return {
    packedStrip: vis(".qc-strip--packed"),
    looseRow: vis(".qc-loose"),
    fork: vis(".qc-fork"),
    goneMsg: vis(".qc-gonelink"),
    /* the four removals */
    promote: vis(".qc-loose-promote"),
    looseSlot: [...r.querySelectorAll(".qc-loose .pkgb-plate")].length,
    attachChip: vis(".qc-mchip-add"),
    lockNote: vis(".qc-strip-lock"),
    /* what must survive */
    parcel: [...r.querySelectorAll(".qc-strip--packed .pkgb-plate")].length,
    seal: vis(".qc-strip-seal"),
    ptrs: [...r.querySelectorAll(".qc-strip-ptr")].map((e) => (e as HTMLElement).innerText.trim()),
  };
});

test("all four attachment states, counted", async ({ page }) => {
  const { db, uid } = await devDb();
  const qs = await getDocs(collection(db, "users", uid, "queries"));
  const linked = qs.docs.find((d) => !!(d.data() as { packageId?: string }).packageId)!;
  const loose = qs.docs.find((d) => { const q = d.data() as never as { packageId?: string; materialsWanted?: unknown[] };
    return !q.packageId && (q.materialsWanted ?? []).length > 0; })!;
  /* a query whose package was removed — a dangling pointer */
  const gone = qs.docs.find((d) => d.id !== linked.id && !!(d.data() as { packageId?: string }).packageId);
  await updateDoc(doc(db, "users", uid, "queries", gone!.id), { packageId: "pkg-vanished" });

  await openRoute(page, "/queries", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(2600);
  const qc = page.locator(".qc-wpg");
  const rows = qc.locator(".f12-row");
  const n = await rows.count();
  const seen: Record<string, unknown> = {};
  for (let i = 0; i < n; i++) {
    await rows.nth(i).click(); await page.waitForTimeout(300);
    const c = await census(page);
    const key = c.packedStrip ? "packaged" : c.goneMsg ? "package-removed" : c.looseRow ? "loose" : c.fork ? "unattached" : "none";
    if (!seen[key]) {
      seen[key] = c;
      await page.screenshot({ path: resolve(process.cwd(), `reports/attach/${key}.png`) });
    }
  }
  console.log(`rows swept: ${n} of ${qs.docs.length} stored`);
  for (const [k, v] of Object.entries(seen)) console.log(`  ${k.padEnd(16)} ${JSON.stringify(v)}`);

  for (const [k, v] of Object.entries(seen)) {
    const c = v as ReturnType<typeof Object> as never as Record<string, number>;
    expect(c.promote, `${k}: SAVE AS PACKAGE survives (D7)`).toBe(0);
    expect(c.looseSlot, `${k}: the loose row still draws a slot (D8)`).toBe(0);
    expect(c.lockNote, `${k}: the lock notice survives (D11)`).toBe(0);
  }
  const packaged = seen["packaged"] as never as Record<string, unknown>;
  if (packaged) {
    expect(packaged.parcel, "the packaged strip lost its slot (D9)").toBe(1);
    expect(packaged.seal, "the packaged strip lost its seal (D9)").toBe(1);
    expect((packaged.ptrs as string[]).map((t) => t.toLowerCase()))
      .toEqual(["change package", "remove"]);
  }
  const unatt = seen["unattached"] as never as Record<string, number>;
  if (unatt) expect(unatt.attachChip, "the third + Attach survives beside the fork (D10)").toBe(0);
  await updateDoc(doc(db, "users", uid, "queries", gone!.id), { packageId: (gone!.data() as { packageId?: string }).packageId! });
  console.log("restored the borrowed query");
});
