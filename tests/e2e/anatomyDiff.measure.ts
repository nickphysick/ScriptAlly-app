import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { openTaskInView, assertCount } from "./todoOpen";
import { PARTS, contractCss, propsFor, read, openContract, same, camel, CONTRACT_PATH } from "./anatomy";
import { writeFileSync, rmSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
test.setTimeout(900_000);

/**
 * PHASE 3 — THE CONTRACT, RENDERED, BESIDE THE PAGE.
 *
 * ⚠️ THIS IS THE LOCK THAT WOULD HAVE CAUGHT THE ROUND'S FAULT. Every previous assertion about the
 * drawer asked whether something rendered — and something always did. "It slides", "there is a
 * scrim", "the page does not reflow", "the card is 292 wide": all true, all green, about a drawer
 * with no hero, no chips, and a document squeezed into 384px of its own 640.
 *
 * It asserts nothing of its own. The property NAMES come from the contract's declarations and the
 * VALUES from the contract's render, so a redesign that moves both moves this with it, and a build
 * that drifts from the artefact goes red naming the property and both sides.
 *
 * ⚠️ A MISSING ELEMENT IS A FAILURE, NOT A SKIP. That is the new `CLAUDE.md` rule, and it is the
 * whole reason a diff over an absent `.dhero` must not come back empty.
 */

/** the last recorded assertion count — a run below it is red, whatever its cases say */
const FLOOR = 33;

test("the drawer's anatomy matches the contract, property by property", async ({ page }) => {
  const OUT = "run-artifacts/anatomy-diff.txt";
  rmSync(OUT, { force: true });
  const log: string[] = [];
  let ran = 0;

  const md5 = createHash("md5").update(readFileSync(CONTRACT_PATH)).digest("hex");
  expect(md5, "the contract changed under this lock — re-run the recon before trusting it")
    .toBe("ee08dd45d0735816dacc06a8409c1e33");
  const css = contractCss();

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  /* ticket 1 is a Send — the contract's own `now`/`Agent request` shape. Ticket 0 is an offer,
     whose journey draws no fork at all, so a diff taken there would report the whole fork as
     missing from the app when it is simply not part of that task. */
  await openTaskInView(page, "grid", 1);

  const appVals: Record<string, Awaited<ReturnType<typeof read>>> = {};
  for (const p of PARTS) {
    appVals[p.c] = p.app ? await read(page, p.app, propsFor(css, p)) : { found: false, count: 0, values: {} };
  }

  const cpage = await page.context().newPage();
  await cpage.setViewportSize({ width: 1440, height: 900 });
  await openContract(cpage, "now", "Agent request");
  const conVals: Record<string, Awaited<ReturnType<typeof read>>> = {};
  for (const p of PARTS) conVals[p.c] = await read(cpage, p.cq ?? p.c, propsFor(css, p));
  await cpage.close();

  /* ── one case per part: present, then matching ── */
  const bad: string[] = [];
  let compared = 0, waived = 0;
  for (const p of PARTS) {
    const c = conVals[p.c], a = appVals[p.c];
    if (!c.found) { log.push(`SKIP ${p.c} — the contract does not draw it in this state`); continue; }
    ran++;
    /* ⚠️ A DELIBERATE ABSENCE IS ASSERTED, NOT SKIPPED. Building it later goes red here and the
       decision has to be made again — which is the difference between a deviation and a drift. */
    if (p.absent) {
      expect.soft(a.found, `${p.c} is deliberately NOT built: ${p.absent}\nIf it is built now, say so and remove the entry.`).toBe(false);
      log.push(`ABSENT ${p.c} — ${p.absent}`);
      continue;
    }
    /* ⚠️ SOFT, SO EVERY PART IS MEASURED. A hard `expect` throws on the first offender and the
       parts below it are never compared — which is the "collect every offender rather than
       throwing at the first" rule this repo already records for the Playfair sweep. The run still
       fails: soft failures are reported at the end of the test. */
    expect.soft(a.found, `${p.c} → ${p.app}: MISSING from the drawer. A suite that cannot find its subject has FAILED, not skipped.`).toBe(true);
    if (!a.found) continue;
    const diffs: string[] = [];
    for (const q of propsFor(css, p)) {
      const cv = c.values[q] ?? "", av = a.values[q] ?? "";
      if (same(cv, av)) { compared++; continue; }
      if (p.waive?.[camel(q)] ?? p.waive?.[q]) { waived++; continue; }
      diffs.push(`${q}: contract ${cv || "—"} · dev ${av || "—"}`);
    }
    ran++;
    if (diffs.length) bad.push(`${p.c} → ${p.app}\n    ${diffs.join("\n    ")}`);
    expect.soft(diffs, `${p.c} → ${p.app} differs from the contract`).toEqual([]);
  }

  log.push(`compared ${compared} properties across ${PARTS.length} parts · ${waived} waived · ${bad.length} parts differ`);
  writeFileSync(OUT, log.join("\n") + "\n" + bad.join("\n"));
  assertCount(ran, FLOOR, "anatomyDiff");
  console.log(`\nANATOMY DIFF — ${ran} assertions · ${compared} properties matched · ${waived} waived\n`);
});

/**
 * ⚠️ THE DIFF MUST BE ABLE TO FAIL, AND THAT IS PROVED HERE RATHER THAN ASSERTED.
 *
 * A comparison harness whose two sides happen never to disagree is indistinguishable from one that
 * compares nothing — the vacuous-green family this repo keeps rebuilding. So the contract's own
 * page is mutated in the browser, one declared value at a time, and the diff is required to notice.
 * It is the contract's COPY that is bent, never the app's, so nothing about the page under test
 * moves.
 */
test("the diff can fail — a bent contract value is caught", async ({ page }) => {
  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openTaskInView(page, "grid", 1);
  const css = contractCss();
  const part = PARTS.find((p) => p.c === ".dhero")!;
  const props = propsFor(css, part);
  const appVal = await read(page, part.app!, props);
  expect(appVal.found, "the hero must be on the page for this proof to mean anything").toBe(true);

  const cpage = await page.context().newPage();
  await cpage.setViewportSize({ width: 1440, height: 900 });
  await openContract(cpage, "now", "Agent request");

  const before = await read(cpage, ".dhero", props);
  expect(same(before.values["border-radius"], appVal.values["border-radius"]),
    "precondition: the two agree before the mutation").toBe(true);

  /* bend the contract's radius by 6px — a change no tolerance should absorb */
  await cpage.evaluate(() => {
    const el = document.querySelector(".dhero") as HTMLElement;
    el.style.borderRadius = "20px";
  });
  const after = await read(cpage, ".dhero", props);
  await cpage.close();

  expect(after.values["border-radius"]).toBe("20px");
  expect(same(after.values["border-radius"], appVal.values["border-radius"]),
    "the diff failed to notice a 6px change — it is comparing nothing").toBe(false);
});
