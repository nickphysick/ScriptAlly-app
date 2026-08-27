/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ══ THE ATTACHMENTS PANEL IS ON THE PAGE ══════════════════════════════════════════════════════
 *
 * ⚠️ THE CLAIM A SOURCE LOCK CANNOT MAKE. `attachmentsPanel.test.tsx` reads the component's source
 * because rendering it would pull in Firebase and stop the file loading; this opens the real page
 * and asks the browser. It is what caught the panel being a disabled stub for three amendments.
 *
 * ⚠️ AND IT MEASURES THE EMPTY STATE ON PURPOSE, because that is the only state reachable: Firebase
 * Storage is not provisioned on dev and the attachment rules are not deployed, so nothing can be
 * uploaded and no record can be written. A populated sweep is impossible until both land.
 */
import { test, expect } from "@playwright/test";
import { openRoute, liftMotionSuppression } from "./measure";

test("the attachments panel is live on the page", async ({ page }) => {
  await openRoute(page, "/manuscripts?m=seed-ms-empty", { width: 1440, height: 900 });
  await liftMotionSuppression(page);
  const out = await page.evaluate(() => {
    const side = document.querySelector(".msv-wpg .msp-ovside") as HTMLElement | null;
    if (!side) return { error: "no attachments panel" };
    const add = side.querySelector(".msp-attadd") as HTMLButtonElement | null;
    const input = side.querySelector('input[type="file"]') as HTMLInputElement | null;
    return {
      heading: side.querySelector("h2")?.textContent?.trim() ?? null,
      meta: side.querySelector(".sa-secmeta")?.textContent?.trim() ?? null,
      empty: side.querySelector(".msp-empty")?.textContent?.trim() ?? null,
      addLabel: add?.textContent?.trim() ?? null,
      addDisabled: add?.disabled ?? null,
      hasFileInput: !!input,
      rows: side.querySelectorAll(".msp-attrow").length,
      footnote: side.querySelector(".msp-footnote")?.textContent?.trim().slice(0, 46) ?? null,
    };
  });
  console.log("PANEL " + JSON.stringify(out, null, 1));
  const p = out as Record<string, unknown>;
  expect(p.error).toBeUndefined();
  expect(p.heading, "the panel lost its heading").toBe("Attachments");
  /* ⚠️ THE ASSERTION THAT WOULD HAVE CAUGHT THE STUB. It was `disabled` for three amendments while
     every other property looked right — a panel that says what will live here and cannot act. */
  expect(p.addDisabled, "the add control is inert — the panel is a stub again").toBe(false);
  expect(p.hasFileInput, "nothing to pick a file with").toBe(true);
  /* No rows, and that is honest rather than empty-by-accident: nothing can be uploaded yet. */
  expect(p.rows).toBe(0);
  expect(p.empty).toContain("Nothing kept with this manuscript yet.");
});
