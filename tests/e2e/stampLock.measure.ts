import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";
import { devDb } from "./devWrite";
import { doc, getDoc } from "firebase/firestore";
import { resolve } from "node:path";
test.setTimeout(300_000);
const SHOT = (n: string) => resolve(process.cwd(), `reports/packages-two-state/${n}.png`);
const pkg = async (id: string) => {
  const { db, uid } = await devDb();
  return ((await getDoc(doc(db, "users", uid, "packages", id))).data() ?? {}) as
    { firstSentAt?: string; packageName?: string; synopsisVersionId?: string };
};

test("the lock bites, visibly, and Duplicate & edit is the way on", async ({ page }) => {
  const before = await pkg("seed-pkg-1");
  console.log(`seed-pkg-1 stamped=${before.firstSentAt ?? "NO"} synopsis=${before.synopsisVersionId}`);
  expect(before.firstSentAt, "run stampWiring first — this needs a stamped package").toBeTruthy();

  await openRoute(page, "/manuscripts/packages", { width: 1440, height: 1000 });
  await liftMotionSuppression(page);
  await page.waitForTimeout(1600);
  const root = page.locator(".pkgw-body");            // ⚠️ scoped to the page's own root

  /* D-D3 — the lock is VISIBLE where the editing happens */
  const card = root.locator(".pkgb-pkgcard", { hasText: "Standard UK" }).first();
  const note = card.locator(".pkgb-locked-note");
  const dup = card.locator(".pkgb-dup");
  console.log(`locked note: ${await note.count()} · text "${await note.innerText().catch(() => "")}"`);
  console.log(`Duplicate & edit: ${await dup.count()}`);
  expect(await note.count(), "the card does not say why it is fixed").toBe(1);
  expect(await dup.count(), "no way forward from the lock").toBe(1);
  await page.screenshot({ path: SHOT("lock-1-card") });

  /* the refusal is SHOWN, not silent — open the builder and try to change a slot */
  await card.locator(".pkgb-sopen").click();
  await page.waitForTimeout(900);
  const syn = page.locator("#pkgf-pkg-synopsis");
  const opts = await syn.locator("option").allTextContents();
  const current = await syn.inputValue().catch(() => "");
  /* pick any option that is not the one already selected — the point is that a CHANGE is refused */
  const target = opts.find((o) => o === "Not included") ?? opts.find((o) => o !== current) ?? opts[0];
  console.log(`synopsis options ${JSON.stringify(opts)} · changing to "${target}"`);
  await syn.selectOption({ label: target });
  await page.waitForTimeout(300);
  await page.locator(".pkgf-btn--primary").click();
  await page.waitForTimeout(1800);
  const err = await page.locator(".pkgf-error").innerText().catch(() => "");
  const stillOpen = await page.locator(".pkgf-modal").count();
  console.log(`refusal shown: "${err.replace(/\s+/g, " ").trim()}"`);
  console.log(`modal stayed open: ${stillOpen}`);
  expect(err, "the refusal is silent — this is the F7 bug again").toMatch(/Locked/i);
  expect(stillOpen, "the modal closed on a write it never made").toBe(1);
  await page.screenshot({ path: SHOT("lock-2-refused") });

  const afterTry = await pkg("seed-pkg-1");
  expect(afterTry.synopsisVersionId, "a locked slot changed").toBe(before.synopsisVersionId);
  /* ⚠️ CLOSE VIA THE CONTROL, NOT ESCAPE. The modal's own Escape handler competes with the page's,
     and a backdrop left up silently swallows the next click — which reads as "the button does not
     work" when the button is fine and something invisible is on top of it. */
  await page.locator(".pkgf-close").click().catch(() => {});
  await page.waitForTimeout(800);
  console.log(`modal after close: ${await page.locator(".pkgf-modal").count()}`);

  /* D5 — Duplicate & edit, pre-filled and pre-named */
  /**
   * ⚠️ `force`, AND THE REASON IS THE CARD'S HOVER LIFT — not a broken control. `.pkgb-pkgcard:hover`
   * translates the card up 4px, so moving the pointer onto this button moves the button, and
   * Playwright's "visible, enabled and stable" check retries until it times out. A person is
   * unaffected: the whole card moves together and the cursor stays on the target. Recorded because
   * the log reads exactly like an unclickable button, which is the shape that has cost this build
   * time before.
   */
  /**
   * ⚠️ DISPATCHED ON THE ELEMENT, NOT CLICKED AT A POINT — and `force: true` was WORSE than the
   * timeout it fixed. `.pkgb-pkgcard:hover` lifts the card 4px, so a real click never settles and
   * Playwright retries out; `force` skips that check and fires at the recorded COORDINATES, which
   * by then belong to a neighbouring control. It opened the EDIT builder instead of the duplicate —
   * reported as `title="EDIT PACKAGE"`, and it would have read as "Duplicate & edit is wired to the
   * wrong handler" when the wiring is correct.
   *
   * A person is unaffected either way: the whole card moves together and the cursor stays on target.
   */
  await dup.scrollIntoViewIfNeeded().catch(() => {});
  await dup.evaluate((el) => (el as HTMLButtonElement).click());
  await page.waitForTimeout(900);
  const name = await page.locator("#pkgf-pkg-name").inputValue();
  const letter = await page.locator("#pkgf-pkg-letter").inputValue();
  const title = await page.locator(".pkgf-title").innerText().catch(() => "");
  const saveLbl = await page.locator(".pkgf-btn--primary").innerText().catch(() => "");
  console.log(`duplicate name="${name}" letter-prefilled=${letter ? "yes" : "no"} title="${title}" save="${saveLbl}"`);
  expect(name, "the duplicate is not pre-named vN").toMatch(/ v\d+$/);
  expect(letter, "the duplicate is not pre-filled").toBeTruthy();
  await page.screenshot({ path: SHOT("lock-3-duplicate") });
  await page.keyboard.press("Escape");
});
