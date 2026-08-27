import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";
test("/todo is untouched by the calendar pass", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  await page.waitForTimeout(1500);
  const o = await page.evaluate(`(() => {
    const vis = (s) => [...document.querySelectorAll(s)].filter(e => e.getBoundingClientRect().height > 0);
    const title = vis(".wsh-title")[0];
    return {
      title: title ? title.textContent : null,
      work: vis(".tdw-work").length, rail: vis(".tdw-rail").length,
      cards: vis(".tdb-card, .tdb-col").length,
      calendarRows: vis(".tl-rrow").length,
    };
  })()`) as any;
  console.log("  /todo: " + JSON.stringify(o));
  expect(o.title, "the visible masthead is not To-do").toMatch(/to-?do/i);
  expect(o.work + o.rail, "the To-do workspace did not render").toBeGreaterThan(1);
  /* the calendar's own rows must NOT be on this page — the two share no derivation now and
     must not start sharing a surface either */
  expect(o.calendarRows, "calendar rows are visible on /todo").toBe(0);
  expect(errors, `console errors on /todo: ${errors.join(" | ")}`).toEqual([]);
});
