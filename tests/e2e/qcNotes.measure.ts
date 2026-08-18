/**
 * §1 — Notes as a thread, on the running page.
 *
 * ⚠️ THE TWO FAULTS THIS EXISTS FOR ARE INVISIBLE TO SOURCE AND TO jsdom: a broken `min-height: 0`
 * chain (the scroller grows instead of scrolling) and a dock that is not `flex: 0 0 auto` (the
 * composer thins as the thread fills). Both took a browser pass to find on the to-do board.
 *
 * ⚠️ AND IT SEEDS ITS OWN THREAD, because no query in the dev account has a single note — so every
 * assertion about a scroller would otherwise be made against an empty state that renders no
 * scroller at all. It writes through the app's own composer and deletes everything it wrote.
 *
 *   npx playwright test --project=measure qcNotes
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const STAMP = "qcNotes measure —";

async function write(page: Page, text: string) {
  await page.locator(".qn-ta").fill(text);
  await page.locator(".qn-send").click();
  await page.waitForTimeout(700);
}

/** Delete every note this walk wrote, through the row's own control. */
async function cleanUp(page: Page) {
  for (let i = 0; i < 14; i++) {
    const mine = page.locator(".qn-note", { hasText: STAMP }).first();
    if (!(await mine.count())) break;
    await mine.hover();
    await mine.locator('button:text-is("Delete")').click();
    await page.waitForTimeout(350);
    await page.locator('button:has-text("Delete")').last().click();
    await page.waitForTimeout(900);
  }
  return page.locator(".qn-note", { hasText: STAMP }).count();
}

test("§1 — the chain, the dock, the foot, the tint and the pin", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 5000 });
  await page.waitForTimeout(500);

  /* ── seed until the scroller genuinely overflows ── */
  let overflow = 0;
  for (let i = 1; i <= 10 && overflow < 60; i++) {
    await write(page, `${STAMP} note ${i}. Enough words in this one that a few of them together will outgrow the card and give the scroller something to do.`);
    overflow = await page.evaluate(() => {
      const sc = document.querySelector<HTMLElement>(".qn-scroll");
      return sc ? sc.scrollHeight - sc.clientHeight : 0;
    });
  }
  const seeded = await page.locator(".qn-note").count();
  console.log(`\nseeded ${seeded} notes · ${overflow}px of overflow`);
  expect(overflow, "the thread never overflowed, so nothing below is about a scroller").toBeGreaterThan(20);

  try {
    /* ── the flex chain, link by link, from the scroller UP to the card ── */
    const chain = await page.evaluate(() => {
      const out: { el: string; minHeight: string; flex: string; overflowY: string; h: number }[] = [];
      let el: HTMLElement | null = document.querySelector<HTMLElement>(".qn-scroll");
      while (el) {
        const c = getComputedStyle(el);
        out.push({
          el: String(el.className).split(" ")[0] || el.tagName.toLowerCase(),
          minHeight: c.minHeight, flex: `${c.flexGrow} ${c.flexShrink} ${c.flexBasis}`,
          overflowY: c.overflowY, h: Math.round(el.getBoundingClientRect().height),
        });
        if (el.classList.contains("f12-card")) break;
        el = el.parentElement;
      }
      return out;
    });
    console.log("flex chain, scroller → card:");
    chain.forEach((c) => console.log(`  ${c.el.padEnd(12)} min-height ${c.minHeight.padEnd(6)} flex ${c.flex.padEnd(14)} overflow-y ${c.overflowY.padEnd(8)} ${c.h}px`));
    expect(chain[0]?.el, "the walk did not start at the scroller — the thread is empty").toBe("qn-scroll");
    expect(chain[chain.length - 1]?.el, "the walk never reached the card").toBe("f12-card");
    /* ⚠️ EVERY FLEX LINK NEEDS `min-height: 0` — an `auto` minimum is the content's height, which is
       exactly what makes a scroller grow instead of scroll. */
    for (const link of chain) {
      expect(link.minHeight, `${link.el} has no min-height:0 — the chain is broken there`).toBe("0px");
    }
    expect(chain[0].overflowY, "the scroller does not scroll").toBe("auto");

    const dock = await page.locator(".qn-dock").evaluate((el) => {
      const c = getComputedStyle(el);
      return { flex: `${c.flexGrow} ${c.flexShrink} ${c.flexBasis}`, h: Math.round(el.getBoundingClientRect().height) };
    });
    console.log(`  dock: flex ${dock.flex} · ${dock.h}px`);
    expect(dock.flex, "the dock can shrink — it will thin as the thread fills").toBe("0 0 auto");

    /* ── §1b · at the foot on MOUNT — reloaded, so this is a first paint rather than a re-render ── */
    await page.reload();
    await page.waitForTimeout(1800);
    await page.locator(".f12-row").first().click({ timeout: 5000 });
    await page.waitForTimeout(800);
    const mounted = await page.locator(".qn-scroll").evaluate((el) => ({
      top: Math.round(el.scrollTop), max: Math.round(el.scrollHeight - el.clientHeight),
      dockH: Math.round(document.querySelector(".qn-dock")!.getBoundingClientRect().height),
    }));
    console.log(`  on mount: scrollTop ${mounted.top} of ${mounted.max} · dock ${mounted.dockH}px`);
    expect(mounted.max, "the reloaded thread does not overflow, so its scroll position says nothing").toBeGreaterThan(20);
    expect(Math.abs(mounted.max - mounted.top), `the thread mounted at ${mounted.top} of ${mounted.max}`).toBeLessThanOrEqual(2);
    expect(mounted.dockH, "the dock collapsed under a full thread").toBeGreaterThan(60);

    /* ── §1b · and back to the foot after a save, from a scrolled-away position ── */
    await page.locator(".qn-scroll").evaluate((el) => { el.scrollTop = 0; });
    await page.waitForTimeout(200);
    const away = await page.locator(".qn-scroll").evaluate((el) => Math.round(el.scrollTop));
    const last = `${STAMP} the newest one`;
    await write(page, last);
    await page.waitForTimeout(700);
    const after = await page.evaluate((text) => {
      const sc = document.querySelector<HTMLElement>(".qn-scroll")!;
      const notes = [...document.querySelectorAll<HTMLElement>(".qn-note")];
      const mine = notes.find((n) => (n.textContent || "").includes(text));
      return {
        top: Math.round(sc.scrollTop), max: Math.round(sc.scrollHeight - sc.clientHeight),
        isLast: mine ? mine === notes[notes.length - 1] : false,
        tinted: mine ? getComputedStyle(mine).backgroundColor : "",
        plain: notes[0] ? getComputedStyle(notes[0]).backgroundColor : "",
        draft: (document.querySelector(".qn-ta") as HTMLTextAreaElement).value,
        days: document.querySelectorAll(".qn-day").length,
        sticky: document.querySelector(".qn-day") ? getComputedStyle(document.querySelector(".qn-day")!).position : "",
      };
    }, last);
    console.log(`  after save: scrollTop ${away} → ${after.top} of ${after.max} · newest is last: ${after.isLast}`);
    console.log(`  tint ${after.tinted} vs an older note ${after.plain} · ${after.days} day separator(s), ${after.sticky}`);
    expect(after.isLast, "the saved note is not at the foot — the thread is not oldest-first").toBe(true);
    expect(Math.abs(after.max - after.top), `the thread did not return to its foot: ${after.top} of ${after.max}`).toBeLessThanOrEqual(2);
    /* §1f — it lands in the tint */
    expect(after.tinted, "the new note did not land tinted").not.toBe(after.plain);
    expect(after.draft, "the composer kept its text after saving").toBe("");
    /* §1d — the separators stick */
    expect(after.days, "no day separator rendered").toBeGreaterThan(0);
    expect(after.sticky, "the day separator does not stick").toBe("sticky");

    /**
     * §4 — ⚠️ AN EMPTY COMPOSER IS A FIELD AND NOTHING ELSE, and the shortcut it stopped printing
     * still works. Both halves, because removing a hint is only safe if the thing it advertised
     * survives — and the keystroke is exactly what a source lock cannot check.
     */
    const emptyState = await page.evaluate(() => {
      const ta = document.querySelector<HTMLTextAreaElement>(".qn-ta")!;
      ta.value = "";
      return {
        hints: document.querySelectorAll(".qn-hint").length,
        saveButtons: document.querySelectorAll(".qn-send").length,
        placeholder: ta.placeholder,
        text: (document.querySelector(".qn-dock")?.textContent || "").trim(),
      };
    });
    console.log(`\n  empty composer: "${emptyState.text}" · placeholder "${emptyState.placeholder}" · ${emptyState.hints} hints · ${emptyState.saveButtons} save buttons`);
    expect(emptyState.hints, "the printed hint is still rendered").toBe(0);
    expect(emptyState.text, "the empty composer prints something besides its placeholder").toBe("");
    expect(emptyState.placeholder, "the placeholder went with the hint").toBe("Write a note…");

    /* ⌘+Enter still saves — driven, not asserted at source */
    const beforeKbd = await page.locator(".qn-note").count();
    const kbdText = `${STAMP} saved with the keyboard`;
    await page.locator(".qn-ta").fill(kbdText);
    await page.waitForTimeout(200);
    const withText = await page.locator(".qn-send").count();
    await page.locator(".qn-ta").press("Meta+Enter");
    await page.waitForTimeout(1200);
    const afterKbd = await page.locator(".qn-note").count();
    console.log(`  Save appears with text: ${withText === 1} · ⌘+Enter: ${beforeKbd} → ${afterKbd} notes`);
    expect(withText, "the Save button does not appear once there is content").toBe(1);
    expect(afterKbd, "⌘+Enter no longer saves").toBe(beforeKbd + 1);

    /* ── §1c · the pinned note is held ABOVE the scroller ── */
    const first = page.locator(".qn-note").first();
    await first.hover();
    await first.locator('button:text-is("Pin")').click();
    await page.waitForTimeout(1300);
    const pinnedText = await page.locator(".qn-pinnedtx").innerText().catch(() => "");
    console.log(`  pinned strip: "${pinnedText.slice(0, 54)}"`);
    expect(pinnedText.length, "pinning rendered no strip — the write may have been denied").toBeGreaterThan(0);
    const geo = await page.evaluate(() => {
      const sc = document.querySelector<HTMLElement>(".qn-scroll")!;
      sc.scrollTop = sc.scrollHeight;
      const strip = document.querySelector<HTMLElement>(".qn-pinned")!;
      const r = strip.getBoundingClientRect(), s = sc.getBoundingClientRect();
      return { inside: sc.contains(strip), stripBottom: Math.round(r.bottom), scrollTop: Math.round(s.top), visible: r.height > 0 };
    });
    console.log(`  strip ends ${geo.stripBottom}, scroller starts ${geo.scrollTop} · inside the scroller: ${geo.inside}`);
    /* ⚠️ ABOVE THE SCROLLER, NOT INSIDE IT — in thread order the pinned note is buried by everything
       written since, which is the whole reason it is held out. */
    expect(geo.inside, "the pinned note is inside the scroller — it scrolls away").toBe(false);
    expect(geo.visible && geo.stripBottom <= geo.scrollTop + 1, "the strip does not hold its place above the scroller").toBe(true);
    await page.locator(".qn-unpin").click();
    await page.waitForTimeout(1000);
    expect(await page.locator(".qn-pinned").count(), "the strip survived unpinning").toBe(0);
  } finally {
    const left = await cleanUp(page);
    console.log(`\ncleaned up · ${left} of the walk's notes left`);
    expect(left, "the measure left its own notes on the account").toBe(0);
  }
});
