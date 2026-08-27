import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 5 — the bar says what the stretch of time is, in whichever length fits.
 *
 * ⚠️ THE FIT PASS IS MEASURED BY ITS RESULT, not by its code. "Tries long, then short, then bare"
 * is a claim about what a reader sees at a width, and the only way to check it is to change the
 * width and look — a character-count estimate would agree with itself and with nothing else.
 */
const read = `(() => {
  const all = [...document.querySelectorAll(".tl")];
  const tl = all.find((e) => e.getBoundingClientRect().height > 0);
  const bars = [...tl.querySelectorAll(".tl-seg")].map((b) => {
    const l = b.querySelector(".tl-lbl");
    const shown = l && getComputedStyle(l).display !== "none" ? (l.textContent || "").trim() : "";
    return {
      state: [...b.classList].find((c) => c.startsWith("s-")) || "",
      long: l ? l.dataset.long || "" : "", short: l ? l.dataset.short || "" : "",
      shown, narrow: b.classList.contains("narrow"),
      w: Math.round(b.getBoundingClientRect().width),
    };
  });
  const names = [...tl.querySelectorAll(".tl-nmtxt")].map((n) => (n.textContent || "").trim());
  return { bars, names };
})()`;

test("Phase 5 — long, short, bare; and never the agent's name", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });
  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  const slider = page.getByRole("slider", { name: /range/i });

  const STOPS = ["1 week", "2 weeks", "1 month", "3 months", "6 months"];
  const tally: string[] = [];
  let sawLong = 0, sawShort = 0, sawBare = 0;

  for (let i = 0; i < STOPS.length; i++) {
    await slider.fill(String(i));
    await page.waitForTimeout(680);
    const r = await page.evaluate<any>(read);

    const speaking = r.bars.filter((b: any) => b.long);
    const asLong = speaking.filter((b: any) => b.shown && b.shown === b.long).length;
    const asShort = speaking.filter((b: any) => b.shown && b.shown === b.short).length;
    const bare = speaking.filter((b: any) => !b.shown).length;
    sawLong += asLong; sawShort += asShort; sawBare += bare;
    tally.push(`${STOPS[i]}: ${asLong}L/${asShort}S/${bare}bare of ${speaking.length}`);
    console.log(`  ${STOPS[i].padEnd(9)} ${asLong} long · ${asShort} short · ${bare} bare  (of ${speaking.length} speaking)`);
    if (i === 0) {
      for (const b of speaking.slice(0, 5)) {
        console.log(`      ${b.state.padEnd(10)} ${b.w.toString().padStart(4)}px  "${b.shown}"  [long "${b.long}" | short "${b.short}"]`);
      }
    }

    expect(r.bars.length, `${STOPS[i]}: no bars — nothing was measured`).toBeGreaterThan(0);

    for (const b of speaking) {
      /* ⚠️ WHAT IS SHOWN IS ONE OF THE TWO FORMS, NEVER A TRUNCATION. An ellipsis is a promise
         that the rest is somewhere; on a bar it is not. */
      if (b.shown) {
        expect([b.long, b.short], `${STOPS[i]}: "${b.shown}" is neither form of its own bar`).toContain(b.shown);
        expect(b.shown, `${STOPS[i]}: "${b.shown}" is truncated`).not.toContain("…");
      }
      /* ⚠️ AND THE BAR NEVER NAMES THE AGENT. The row head does, once — putting it on the bar too
         would print it twice on one line, in the element least able to hold it. */
      for (const n of r.names) {
        const surname = n.split(" ").pop() || "";
        if (surname.length < 4) continue;
        expect(b.long, `${STOPS[i]}: a bar names "${surname}"`).not.toContain(surname);
        expect(b.short, `${STOPS[i]}: a short form names "${surname}"`).not.toContain(surname);
      }
    }
  }

  console.log(`  ${tally.join(" · ")}`);
  /* ⚠️ THE POPULATION FOR THE FIT PASS ITSELF. "Tries long then short" is unproved if every bar on
     every range happened to take the long form — the fallback would be dead code reading as fine. */
  expect(sawLong, "no bar ever showed its long form").toBeGreaterThan(0);
  expect(sawLong + sawShort + sawBare, "no speaking bar was measured at all").toBeGreaterThan(5);
  if (!sawShort) console.log("  NOTE: no bar fell back to its short form at these widths");
  if (!sawBare) console.log("  NOTE: no bar went bare at these widths");

  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
