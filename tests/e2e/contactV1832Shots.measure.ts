/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18.3.2 — the report's screenshots beside each design-refs/contact-list-v18-3-2/screens/* file: the full,
 * sparse and not-queried rows with the peek open, at 1512 and 1280. The full and sparse rows get the locks' fixture
 * (mock-like contact details on Theo Abara; the lock uses longer ones to force shortening, a website on Sun-hee Park), read
 * first and put back exactly. The guide is marked seen for the run, so its first-visit checklist does not cover a row, and
 * its state is put back after.
 */
import { test, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { deleteField, doc, getDoc, updateDoc } from "firebase/firestore";
import { openContacts16 } from "./cl16Lib";
import { harnessDb } from "./harnessDocs";

const DIR = "reports/contact-list-v18-3/shots-v18-3-2";
const FULL = "msv12-agent-4", SPARSE = "msv12-agent-5", BARE = "clv181-bare";
const CONTACT = ["email", "website", "socials", "twitter", "bluesky", "instagram"] as const;

const shot = async (page: Page, id: string, name: string) => {
  const row = page.locator(`.aglist [data-clv='row'][data-agent-card="${id}"]`).filter({ visible: true }).first();
  await row.scrollIntoViewIfNeeded(); await page.mouse.move(5, 5); await page.waitForTimeout(350);
  const b = await row.boundingBox(); await page.mouse.move(b!.x + 60, b!.y + 20); await page.waitForTimeout(900);
  const bb = (await row.boundingBox())!;
  mkdirSync(DIR, { recursive: true });
  await page.screenshot({ path: `${DIR}/${name}.png`, clip: { x: 248, y: bb.y - 8, width: page.viewportSize()!.width - 248, height: bb.height + 16 } });
};

test("shots · full, sparse and not queried, peek open, 1512 and 1280", async ({ page }) => {
  test.setTimeout(300_000);
  const { db, uid } = await harnessDb();
  const ref = (id: string) => doc(db, "users", uid, "agents", id);
  const before: Record<string, Record<string, unknown>> = {};
  for (const id of [FULL, SPARSE]) { const d = (await getDoc(ref(id))).data() ?? {}; before[id] = Object.fromEntries(CONTACT.map((k) => [k, d[k]])); }
  const g0 = execSync("node tests/e2e/guideFlags.mjs", { encoding: "utf8" }).trim().split("\n").pop()!;
  try {
    execSync("node tests/e2e/guideFlags.mjs --seen");
    await updateDoc(ref(FULL), { email: "theo@abaragrant.co.uk", website: "https://www.abaragrantliterary.co.uk", socials: [{ platform: "bluesky", handle: "@theo.abara.bsky.social" }] });
    await updateDoc(ref(SPARSE), { website: "https://parkliterary.example" });
    for (const [vp, n] of [[{ width: 1512, height: 900 }, [1, 2, 3]], [{ width: 1280, height: 800 }, [4, 5, 6]]] as const) {
      await openContacts16(page, vp);
      await shot(page, FULL, `0${n[0]}-hover-peek-full-${vp.width}`);
      await shot(page, SPARSE, `0${n[1]}-hover-peek-sparse-${vp.width}`);
      await shot(page, BARE, `0${n[2]}-hover-peek-not-queried-${vp.width}`);
    }
  } finally {
    for (const id of [FULL, SPARSE]) await updateDoc(ref(id), Object.fromEntries(CONTACT.map((k) => [k, before[id][k] === undefined ? deleteField() : before[id][k]])));
    execSync(`node tests/e2e/guideFlags.mjs --restore '${g0}'`);
  }
});
