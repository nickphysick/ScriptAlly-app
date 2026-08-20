/**
 * §2 — setting the expected date in place.
 *
 * ⚠️ THIS SECTION IS UNREACHABLE ON THE DEV ACCOUNT, AND THE REASON IS WORTH MORE THAN THE WALK.
 * The offer appears only where the agency has stated no response time; every agent here states one.
 * A first version of this probe tried to make the state — clearing an agent's stated weeks through
 * the agent card's own editor — and the clear did not take: the card's queries still read
 * "advised 8 weeks" afterwards. That is either a denied write or a commit the editor did not make,
 * and it is a finding about the agent editor rather than about this section, so it is reported
 * rather than worked around.
 *
 * ⚠️ IT ALSO SURFACED THE SCHEMA QUESTION IN §2's REPORT: `responseDeadline` is written by
 * `addQuery` from the AGENT's window, so a stored date is not evidence the writer set it.
 *
 * So the probe asserts what it can reach and states plainly what it could not.
 *
 *   npx playwright test --project=measure qcSetWindow
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2 — the offer and the control, where a query has no stated window", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  await rows.first().click({ timeout: 8000 });
  await page.waitForTimeout(400);

  let found = -1;
  const n = Math.min(await rows.count(), 12);
  for (let i = 0; i < n; i++) {
    if (i >= await rows.count()) break;
    await rows.nth(i).click({ timeout: 6000 });
    await page.waitForTimeout(350);
    if (await page.locator(".tl-ask").count()) { found = i; break; }
  }

  /**
   * ⚠️ IF NOTHING OFFERS, MAKE THE STATE — the offer appears only where the agency states nothing,
   * and every agent on this account states a time. Clearing one agency's weeks is now possible
   * (§2 found the clear was never broken; a class was), so the section is finally reachable, and
   * the agent is put back in a `finally`.
   */
  let cleared: { agent: string; weeks: string } | null = null;
  if (found < 0) {
    const agent = await page.evaluate(() => {
      const t = (document.querySelector(".f12-row.f12-sel")?.textContent || "").replace(/\s+/g, " ");
      return (t.match(/[A-Z][a-z]+ [A-Z][a-z]+/) || [""])[0];
    });
    if (!agent) { console.log("  ⚠️ could not read an agent name to clear — unexercised"); return; }
    await openRoute(page, "/agents", { width: 1440, height: 900 });
    await page.waitForTimeout(1500);
    await page.locator(".agl-acard", { hasText: agent }).first().locator(".agl-pencil").click({ timeout: 8000 });
    await page.waitForTimeout(900);
    const weeks = (await page.locator("#agl-weeks").inputValue()).trim();
    await page.locator("#agl-weeks").fill("");
    await page.locator(".agl-done").click({ timeout: 8000 });
    await page.waitForTimeout(2000);
    cleared = { agent, weeks };
    console.log(`  cleared "${agent}"'s stated ${weeks} weeks to reach the offer`);
    await openRoute(page, "/queries", { width: 1440, height: 900 });
    await page.locator(".f12-row", { hasText: agent }).first().click({ timeout: 8000 });
    await page.waitForTimeout(700);
    found = 0;
  }

  try {
  console.log(`  a query offers a date`);
  await page.locator(".tl-ask-a").click();
  await page.waitForTimeout(400);
  const ed = await page.evaluate(() => {
    const e = document.querySelector<HTMLElement>(".tl-setwin");
    if (!e) return null;
    const rg = e.querySelector<HTMLInputElement>('input[type="range"]');
    return {
      eyebrow: (e.querySelector(".sa-label")?.textContent || "").trim(),
      value: (e.querySelector(".tl-setwin-val")?.textContent || "").replace(/\s+/g, " ").trim(),
      readout: (e.querySelector(".sa-wk-read")?.textContent || "").trim(),
      /* §1 — the hint is retired; the foot's two buttons say what it said. */
      hint: e.querySelectorAll(".tl-setwin-k").length,
      cancel: (e.querySelector(".tl-setwin-cancel")?.textContent || "").trim(),
      save: (e.querySelector(".qn-send")?.textContent || "").trim(),
      saveOff: !!e.querySelector(".qn-send.qn-send--off"),
      saveDisabled: (e.querySelector(".qn-send") as HTMLButtonElement | null)?.disabled ?? null,
      range: !!rg,
      /* §4 — the SHARED slider, so its id must be instance-unique and not the old constant */
      rangeId: rg?.id || "",
      dupes: rg ? document.querySelectorAll(`#${CSS.escape(rg.id)}`).length : 0,
      ticks: [],
      offerStillThere: !!document.querySelector(".tl-ask"),
    };
  });
  console.log(`  editor · "${ed?.eyebrow}" · readout "${ed?.readout}" · "${ed?.value}" · save "${ed?.save}"/faded=${ed?.saveOff} · cancel "${ed?.cancel}" · range #${ed?.rangeId} ×${ed?.dupes}`);
  expect(ed, "the offer opened nothing").not.toBeNull();
  expect(ed!.range, "the control is not a slider").toBe(true);
  expect(ed!.eyebrow, "the eyebrow does not keep the estimate the writer's").toBe("Your expected response time");
  expect(ed!.readout, "the slider does not state its value").toMatch(/\d+ weeks?/);
  expect(ed!.value, "the control does not resolve to a date").toMatch(/^around \w/);
  /* ⚠️ §4 · THE SHARED SLIDER, AND ITS ID IS ITS OWN. The constant `sa-wk` is the reason a second
     slider was built; a duplicate here would mean the reuse recreated the fault it removed. */
  expect(ed!.rangeId, "the shared slider is back on its hardcoded id").not.toBe("sa-wk");
  expect(ed!.dupes, "two elements share this slider's id").toBe(1);
  /**
   * §1 — SAVE AND CANCEL ARE BUTTONS NOW, and the printed hint is gone. Keyboard-only commit is an
   * accelerator, never the only route; this control was the one editor in the pane behaving that
   * way while the notes composer below it has a visible Save.
   *
   * ⚠️ SAVE IS PRESENT BUT INERT AT OPEN, not absent — a control that appears as you interact moves
   * the thing under the pointer. Asserted as BOTH faded and disabled, because either alone is a
   * different bug: faded-but-live commits on a click the writer read as unavailable, and
   * disabled-but-solid says nothing about why it will not respond.
   */
  expect(ed!.hint, "the retired hint line is still rendered").toBe(0);
  expect(ed!.cancel, "the foot has no Cancel").toBe("Cancel");
  expect(ed!.save, "the foot has no Save").toBe("Save");
  expect(ed!.saveOff, "Save is not faded at open — it offers to write what is already there").toBe(true);
  expect(ed!.saveDisabled, "Save looks inert but would still commit").toBe(true);

  /**
   * ⚠️ AND IT COMES ALIVE ON A CHANGE — driven as a WRITER would, with the keyboard on the focused
   * slider, not by assigning `.value` in the page.
   *
   * ⚠️ THAT FIRST ATTEMPT FAILED AND THE CODE WAS FINE. Assigning `input.value` directly does not
   * reach a React controlled input: React tracks the node's value and the synthetic `onChange`
   * never fires, so the probe changed the DOM, watched Save stay faded, and reported it as the
   * feature not working. A range input answers arrow keys natively, which is both the real path and
   * the one that cannot lie about it.
   */
  const live = await page.locator(".tl-setwin input[type=range]").count() > 0;
  if (live) {
    await page.locator(".tl-setwin input[type=range]").focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => ({
      off: !!document.querySelector(".tl-setwin .qn-send.qn-send--off"),
      disabled: (document.querySelector(".tl-setwin .qn-send") as HTMLButtonElement | null)?.disabled ?? null,
    }));
    console.log(`  after a change · faded=${after.off} disabled=${after.disabled}`);
    expect(after.off, "Save stayed faded after the value changed").toBe(false);
    expect(after.disabled, "Save stayed inert after the value changed").toBe(false);
  }
  /* ⚠️ IT TAKES THE OFFER'S PLACE rather than opening beside it — the offer's whole job was to
     ask a question the control now answers. */
  expect(ed!.offerStillThere, "the control opened beside the offer instead of replacing it").toBe(false);

  await page.keyboard.press("Escape");
  } finally {
    if (cleared) {
      await openRoute(page, "/agents", { width: 1440, height: 900 });
      await page.waitForTimeout(1500);
      await page.locator(".agl-acard", { hasText: cleared.agent }).first().locator(".agl-pencil").click({ timeout: 8000 });
      await page.waitForTimeout(900);
      await page.locator("#agl-weeks").fill(cleared.weeks);
      await page.locator(".agl-done").click({ timeout: 8000 });
      await page.waitForTimeout(1500);
      console.log(`  restored "${cleared.agent}" to ${cleared.weeks} weeks`);
    }
  }
});
