/**
 * §3 — the notes composer's height, on the running page.
 *
 * ⚠️ A ROW COUNT IS A MEASUREMENT, NOT A READING OF THE CSS. The rule can say `line-height: 1.6`
 * and the field still open two rows tall, because what decides it is `scrollHeight` against the
 * box the browser actually gives the element — padding, borders and box-sizing included. This
 * opens the thread, types nothing, types one line, then types until it wraps, and reports the
 * height at each.
 *
 *   npx playwright test --project=measure qcComposer
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§3 — the composer opens at one row and grows only when the text wraps", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(500);

  const ta = page.locator(".qn-ta");
  await expect(ta, "no notes composer on this query").toHaveCount(1);

  const read = async (note: string) => {
    const m = await page.evaluate(() => {
      const el = document.querySelector(".qn-ta") as HTMLTextAreaElement;
      const c = getComputedStyle(el);
      const send = document.querySelector(".qn-send") as HTMLElement | null;
      return {
        h: Math.round(el.getBoundingClientRect().height),
        scroll: el.scrollHeight, client: el.clientHeight,
        lh: c.lineHeight, box: c.boxSizing, pad: `${c.paddingTop}/${c.paddingBottom}`, border: c.borderTopWidth,
        overflowing: el.scrollHeight > el.clientHeight + 1,
        send: send ? { on: getComputedStyle(send).opacity, disabled: (send as HTMLButtonElement).disabled || send.getAttribute("aria-disabled") === "true" } : null,
      };
    });
    console.log(`  ${note.padEnd(14)} h ${String(m.h).padStart(3)} · scrollHeight ${m.scroll} · client ${m.client} · line-height ${m.lh} · ${m.box} · padding ${m.pad} · border ${m.border} · Save ${m.send ? `opacity ${m.send.on}${m.send.disabled ? " inert" : " live"}` : "ABSENT"}`);
    return m;
  };

  /* ⚠️ THE WHOLE COMPOSER, NOT ONLY THE FIELD — the jump this section is about was the box around
     the textarea growing when the Save row arrived, while the field itself never moved. Measuring
     only the field would have reported the page as correct, which is exactly what it did. */
  const box = () => page.evaluate(() => Math.round((document.querySelector(".qn-compose") as HTMLElement).getBoundingClientRect().height));
  const boxEmpty = await box();
  const empty = await read("empty");
  await ta.click();
  await ta.type("A short note.");
  await page.waitForTimeout(150);
  const one = await read("one line");
  const boxOne = await box();
  /* a run long enough to wrap in a ~300px column whatever the exact width is */
  await ta.type(" " + "and then it keeps going until the words run past the end of the line and wrap".repeat(2));
  await page.waitForTimeout(150);
  const wrapped = await read("wrapped");

  const boxWrapped = await box();
  console.log(`\n  composer box: empty ${boxEmpty} · one line ${boxOne} · wrapped ${boxWrapped}`);
  expect(boxOne, `the composer grew ${boxOne - boxEmpty}px on the first character`).toBe(boxEmpty);
  expect(boxWrapped, "the composer did not grow when the text wrapped").toBeGreaterThan(boxOne);

  const rows = (m: { h: number; lh: string }) => m.h / parseFloat(m.lh);
  console.log(`\n  rows: empty ${rows(empty).toFixed(2)} · one line ${rows(one).toFixed(2)} · wrapped ${rows(wrapped).toFixed(2)}`);

  /* ⚠️ THE FAULT WAS A FIELD THAT OPENED TWO ROWS TALL AND STAYED THERE. Asserted as a ratio to
     the line height rather than in pixels, so it cannot be satisfied by a type-size change. */
  expect(rows(empty), `the empty composer is ${rows(empty).toFixed(2)} rows tall`).toBeLessThan(1.35);
  expect(rows(one), "one line of text grew the field").toBeCloseTo(rows(empty), 1);
  expect(rows(wrapped), "wrapping text did not grow the field").toBeGreaterThan(rows(one) + 0.8);
  expect(rows(wrapped), "the field grew past a few rows instead of scrolling inside itself").toBeLessThan(8);

  /* ⚠️ AND SAVE IS ALWAYS THERE. It appeared with the first character before, so the row it sits in
     arrived under the pointer as you typed. */
  expect(empty.send, "Save is absent from an empty composer").not.toBeNull();
  expect(empty.send!.disabled, "Save is live with nothing to send").toBe(true);
  expect(Number(empty.send!.on), "Save is not faded with nothing to send").toBeLessThan(1);
  expect(one.send!.disabled, "Save is still inert with something to send").toBe(false);
  expect(Number(one.send!.on), "Save did not light with something to send").toBe(1);

  /* leave the field as it was found */
  await ta.press("Escape");
});
