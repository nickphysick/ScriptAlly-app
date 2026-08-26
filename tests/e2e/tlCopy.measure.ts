import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 5 — the board speaks in the writer's words, and its heads fit.
 *
 * ⚠️ THE PRONOUN SWEEP IS OVER RENDERED INK, NOT OVER A COPY TABLE. A unit sweep proves the
 * function cannot produce one; only the page proves nothing else on the board does. Two different
 * claims, and this is the one that covers the bar labels, the drawer and the empty state too.
 */
test("Phase 5 — no pronoun, no derivation name, and the head fits", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);

  const r = await page.evaluate(() => {
    const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
    const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
    const px = (n: number) => Math.round(n * 100) / 100;
    const heads = [...tl.querySelectorAll(".tl-rowhead")].map((h) => {
      const b = h.getBoundingClientRect();
      const say = h.querySelector(".tl-rowsay") as HTMLElement | null;
      return {
        name: (h.querySelector(".tl-nmtxt")?.textContent || "").trim(),
        says: (say?.textContent || "").trim(),
        /* ⚠️ THE HEAD'S OWN CLIP, not the row's. `.tl-rowhead` is what has `overflow: hidden`,
           so this is the box that can silently swallow a line. */
        clipped: h.scrollHeight > h.clientHeight + 1,
        h: px(b.height),
        scrollH: h.scrollHeight, clientH: h.clientHeight,
      };
    });
    return { heads, ink: (tl.textContent || "") };
  });

  for (const h of r.heads) console.log(`  ${h.name.padEnd(16)} "${h.says}"${h.clipped ? "  ⚠ CLIPPED" : ""}`);
  expect(r.heads.length, "no row heads — nothing was measured").toBeGreaterThan(3);

  const speaking = r.heads.filter((h) => h.says);
  expect(speaking.length, "no head said anything").toBeGreaterThan(0);

  /* ⚠️ EVERY SENTENCE IS WHOLE. A head that clips its own sentence is worse than one that says
     nothing: the reader is given half a fact and no sign that there is more. */
  const clipped = r.heads.filter((h) => h.clipped);
  expect(clipped.map((h) => `${h.name} (${h.scrollH} in ${h.clientH})`), "a row head clips its own content").toEqual([]);

  /* ⚠️ SWEPT OVER THE WHOLE BOARD'S INK — heads, bars, captions, the empty state, the drawer's
     keys. A check scoped to `.tl-rowsay` would pass over a bar label that still says "Your move". */
  const ink = r.ink;
  const pron = [...ink.matchAll(/\b(her|hers|him|his|she|he)\b/gi)].map((m) => m[0]);
  expect(pron.slice(0, 6), `${pron.length} pronouns on the board`).toEqual([]);
  for (const banned of ["Reply window", "Your move", "Their move", "Your turn", "overdue", "Nothing this week"]) {
    expect(ink.toLowerCase(), `the board still says "${banned}"`).not.toContain(banned.toLowerCase());
  }

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
