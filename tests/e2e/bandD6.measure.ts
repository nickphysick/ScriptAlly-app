import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(420_000);

test("D6 — a long name and a fourth material", async ({ page }) => {
  const { db, uid } = await devDb();
  const pk = await getDocs(collection(db, "users", uid, "packages"));
  const target = pk.docs[0];
  const wasName = (target.data() as { packageName?: string }).packageName!;
  const LONG = "The Complete Autumn Submission Bundle for Literary Agents";
  await updateDoc(doc(db, "users", uid, "packages", target.id), { packageName: LONG });
  console.log(`seeded "${wasName}" → "${LONG}"`);

  const read = async (w: number) => {
    await openRoute(page, "/queries", { width: w, height: 1000 });
    await liftMotionSuppression(page);
    await page.waitForTimeout(2500);
    const qc = page.locator(".qc-wpg");
    const rows = qc.locator(".f12-row");
    for (let i = 0; i < 25; i++) {
      await rows.nth(i).click(); await page.waitForTimeout(300);
      const n = await qc.evaluate((r) => (r.querySelector(".qc-stat-head h4") as HTMLElement)?.innerText ?? "");
      if (n.startsWith("The Complete")) break;
    }
    return qc.evaluate((r) => {
      const h4 = r.querySelector(".qc-stat-head h4") as HTMLElement;
      const lbl = r.querySelector(".qc-stat-l") as HTMLElement;
      const head = r.querySelector(".qc-stat-head") as HTMLElement;
      const hr = h4.getBoundingClientRect(), lr = lbl.getBoundingClientRect();
      return {
        name: h4.innerText.slice(0, 30) + "…",
        lines: Math.round(hr.height / (parseFloat(getComputedStyle(h4).lineHeight) || 22)),
        collide: hr.right > lr.left + 1,
        labelWhole: lr.width > 60,
        nameOverflow: +(h4.scrollHeight - hr.height).toFixed(2),
        headWraps: hr.bottom > lr.bottom + 1,
        pills: r.querySelectorAll(".qc-stat-body .qc-mchip").length,
        bodyRows: new Set([...r.querySelectorAll(".qc-stat-body .qc-mchip")]
          .map((e) => Math.round(e.getBoundingClientRect().top))).size,
      };
    });
  };
  for (const w of [1440, 1920]) {
    const m = await read(w);
    console.log(`@${w} LONG NAME: ${JSON.stringify(m)}`);
    expect(m.collide, `@${w} the name collides with the label`).toBe(false);
    expect(m.labelWhole, `@${w} the label was squeezed away`).toBe(true);
    expect(m.nameOverflow, `@${w} the name is cropping`).toBeLessThan(1);
    await page.locator(".qc-attach").first().screenshot({ path: resolve(process.cwd(), `reports/band/longname-${w}.png`) });
  }

  await updateDoc(doc(db, "users", uid, "packages", target.id), { packageName: wasName });
  console.log(`restored "${wasName}"`);
});
