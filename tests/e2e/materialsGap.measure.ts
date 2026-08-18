/**
 * MISSING MATERIALS — does the new task actually reach the page?
 *
 * ⚠️ THIS EXISTS BECAUSE "LANDED IN CODE" IS NOT "LANDED ON THE PAGE". The derivation, its stream
 * mapping and its journey routing are all unit-locked, and every one of those locks would stay
 * green if the card never rendered. This asks the browser — and it is what found the three faults
 * the locks could not: the standing-subject fallback printing "Submission packages" in the
 * subject's slot, `hk: false` on a housekeeping row, and an empty KIND lane.
 *
 * Runs against a LOCAL dev server (SA_E2E_BASE_URL=http://localhost:3000) signed into the dev
 * project, so it verifies unpushed work without a deploy.
 */
import { test } from "@playwright/test";
import { ensureSignedIn, KILL_MOTION_ID } from "./measure";
import { writeFileSync } from "node:fs";

const KILL = `*,*::before,*::after{transition:none!important;animation:none!important}`;

test("the materials task on the To-do page", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`PAGEERROR ${e.message}`));
  const out: string[] = [];

  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await ensureSignedIn(page);
    await page.goto("/todo");
    await page.waitForTimeout(6500);
    await page.addStyleTag({ content: `/*${KILL_MOTION_ID}*/${KILL}` });

    /* ⚠️ SCROLL IT INTO VIEW BEFORE MEASURING OR SHOOTING. The list scrolls internally, so the card
       sits below the fold on a fresh load — and a screenshot that does not contain the subject is
       not evidence of anything. */
    await page.evaluate(() => {
      const row = [...document.querySelectorAll(".tdg-row")].find((e) =>
        (e.textContent || "").includes("have no record of what you sent"));
      row?.scrollIntoView({ block: "center" });
    });
    await page.waitForTimeout(400);

    const r = await page.evaluate(() => {
      const row = [...document.querySelectorAll(".tdg-row")].find((e) =>
        (e.textContent || "").includes("have no record of what you sent")) as HTMLElement | undefined;
      const q = (sel: string) => (row?.querySelector(sel)?.textContent ?? "").trim();
      const rect = row?.getBoundingClientRect();
      return {
        present: !!row,
        key: row?.getAttribute("data-tdgkey") ?? "",
        pill: q(".tdg-bpill"),
        title: q(".tdg-t"),
        sub: q(".tdg-sub"),
        figLabel: q(".tdg-figlab"),
        /* ⚠️ IN THE VIEWPORT, not merely non-zero. A rect with size can still be off-screen, and
           `elementsFromPoint` outside the viewport returns an EMPTY array — which is how an
           assertion written to prove a control was reachable was satisfied by `undefined`. */
        inViewport: !!rect && rect.top >= 0 && rect.left >= 0
          && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
        /* what actually owns the pixels at the row's centre — proof nothing is sealed over it */
        ownerAtCentre: (() => {
          if (!rect) return "none";
          const el = document.elementsFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2)[0];
          return el ? (el.className || el.tagName).toString().slice(0, 60) : "EMPTY (off-screen)";
        })(),
        pageScroll: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
        scrollbar: window.innerWidth - document.documentElement.clientWidth,
      };
    });

    out.push(`── ${vp.width}×${vp.height}
  present:        ${r.present}      key: ${r.key}
  bucket pill:    ${r.pill}
  title:          ${r.title}
  subject line:   ${JSON.stringify(r.sub)}   (must NOT be "Submission packages")
  figure label:   ${r.figLabel}
  in viewport:    ${r.inViewport}
  owns centre px: ${r.ownerAtCentre}
  page scroll:    ${r.pageScroll}px
  scrollbar:      ${r.scrollbar}px`);

    await page.screenshot({ path: `run-artifacts/todo-materials-${vp.width}.png` });
  }

  out.push(`── page errors: ${errors.length}${errors.length ? "\n  " + errors.slice(0, 5).join("\n  ") : ""}`);
  const report = out.join("\n");
  writeFileSync("run-artifacts/materials-gap-measure.txt", report);
  console.log("\n" + report + "\n");
});
