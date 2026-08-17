/**
 * §2 — the agent name is the larger of the two, and the longest name still fits.
 *
 * ⚠️ THE LONGEST NAME IS THE CASE, AND THE PACK NAMES IT: `Penhallow Literary` with `Agent not
 * specified`. Whether this account holds it is not something a source lock can know, so the run
 * sweeps the list, reports every name it saw with its measured width, and says so if that one is
 * absent rather than passing on the short ones.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§2 — the agent name is larger, and the longest one does not crowd the status", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 14);
  const seen: { name: string; nameW: number; agency: string; valW: number; free: number; fs: string; msFs: string; rowsRight: number; cardH: number; italic: string; colour: string }[] = [];

  for (let i = 0; i < n; i++) {
    await rows.nth(i).scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await rows.nth(i).click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(140);
    seen.push(await page.evaluate(() => {
      const r = (x: number) => Math.round(x * 10) / 10;
      const names = [...document.querySelectorAll(".qc-mname")] as HTMLElement[];
      const val = document.querySelector(".qc-mval") as HTMLElement;
      const sec = val.querySelector(".qc-msec") as HTMLElement | null;
      const rowsEl = document.querySelector(".qc-mailrows") as HTMLElement;
      const cs = getComputedStyle(names[0]);
      return {
        name: names[0].textContent?.trim() ?? "", nameW: r(names[0].getBoundingClientRect().width),
        agency: sec?.textContent?.trim() ?? "",
        valW: r(val.getBoundingClientRect().width),
        /* ⚠️ THE FREE SPACE ON THE VALUE LINE — what "crowd the status block" actually means here.
           The status column is a fixed reserve, so crowding shows up as the name and the agency
           filling their own row, not as the block moving. */
        free: r(val.getBoundingClientRect().width - names[0].getBoundingClientRect().width - (sec?.getBoundingClientRect().width ?? 0)),
        fs: cs.fontSize, msFs: getComputedStyle(names[1]).fontSize,
        italic: cs.fontStyle, colour: cs.color,
        rowsRight: r(rowsEl.getBoundingClientRect().right),
        cardH: r((document.querySelector(".qc-mail") as HTMLElement).getBoundingClientRect().height),
      };
    }));
  }

  for (const s of seen) console.log(`  ${s.name} / ${s.agency}: name ${s.nameW} + agency in ${s.valW} → free ${s.free} · ${s.fs}/${s.msFs} · card ${s.cardH}`);

  const first = seen[0];
  /* ⚠️ INVERTED BY §4 — THE TWO NAMES MATCH, AND THE CARD DIFFERENTIATES INSTEAD. The earlier
     pack's argument for a larger agent was sound and the MECHANISM was not: type carrying the
     hierarchy survives neither a long title, a short one, nor any later change to the scale. A rule
     between the rows and a disc on one leader hold whatever the words are. */
  /* ⚠️ THE STEP RETURNS ON THE MANUSCRIPT (2b), REVERSING THE STRUCTURAL PACK'S §4. That pack was
     right that type carrying the hierarchy ALONE does not survive a long title; it is not alone
     now — the icon discs say which KIND each row is, so the size is free to say which is the
     SUBJECT. Two devices, two jobs. */
  expect(first.fs, "the agent name moved off its step").toBe("23px");
  expect(first.msFs, "the manuscript did not step down").toBe("19px");
  expect(parseFloat(first.fs), "the manuscript is not the smaller of the two").toBeGreaterThan(parseFloat(first.msFs));
  /* ⚠️ THE NAME MUST NOT BE THE ONE THAT TRUNCATES. §4's equal 23px pushed the manuscript row past
     its width and clipped the TITLE — "The Smoke T…" beside "92,000 WOR…". The name is its row's
     subject; the qualifier beside it is what gives way. */
  const clipped = await page.evaluate(() => [...document.querySelectorAll(".qc-mname")]
    .map((e) => ({ t: (e.textContent ?? "").trim(), clipped: e.scrollWidth > e.clientWidth + 0.5 })));
  console.log(`name clipping: ${clipped.map((c) => `${c.t}=${c.clipped}`).join(" | ")}`);
  for (const c of clipped) expect(c.clipped, `"${c.t}" is truncated — the meta beside it should give way first`).toBe(false);

  /**
   * ⚠️ 2a · THE DESCENDERS. Playfair's `y` and `p` need more room than a 1.15 line-height gives
   * them, and the row is `align-items: baseline` inside a card that CLIPS — so what overflowed was
   * cut rather than merely overlapping. Measured as the line box against the face: a 23px Playfair
   * needs more than 26.4px, which is what 1.15 was giving it.
   * ⚠️ ASSERTED ON BOTH NAMES. The agent's is the same face at a larger size and was clipping
   * without it being obvious — the pack says to check it, so it is checked rather than assumed.
   */
  const desc = await page.evaluate(() => [...document.querySelectorAll(".qc-mname")].map((e) => {
    const c = getComputedStyle(e as HTMLElement);
    const fs = parseFloat(c.fontSize), lh = parseFloat(c.lineHeight);
    return { t: (e.textContent ?? "").trim().slice(0, 16), fs, lh, ratio: Math.round((lh / fs) * 100) / 100,
             pb: c.paddingBottom, box: Math.round(e.getBoundingClientRect().height * 10) / 10 };
  }));
  console.log(`descenders: ${desc.map((d) => `${d.t} ${d.fs}px lh${d.lh}(${d.ratio}) pb${d.pb} box${d.box}`).join(" | ")}`);
  for (const d of desc) {
    expect(d.ratio, `"${d.t}" has a ${d.ratio} line-height — Playfair's descenders need more`).toBeGreaterThanOrEqual(1.3);
    /* the line box must clear the face with room to spare, which is what the ratio buys */
    expect(d.box, `"${d.t}" box ${d.box} against a ${d.fs}px face`).toBeGreaterThanOrEqual(d.fs * 1.3);
  }

  /* ⚠️ 2c · A REAL CONTROL, IN TAB ORDER, WITH THE APP'S OWN RING — and no underline at rest. */
  const link = await page.evaluate(() => {
    const e = document.querySelector(".qc-mname--ms") as HTMLElement;
    return { tag: e.tagName, tabIndex: e.tabIndex, rest: getComputedStyle(e).textDecorationLine, colour: getComputedStyle(e).color };
  });
  console.log(JSON.stringify(link));
  expect(link.tag, "the title is not a real control").toBe("BUTTON");
  expect(link.tabIndex, "the title is not in tab order").toBeGreaterThanOrEqual(0);
  expect(link.rest, "the title is underlined at rest").toBe("none");
  expect(link.colour, "the title took a colour of its own — not burgundy, not italic").toBe("rgb(20, 20, 18)");
  await page.locator(".qc-mname--ms").hover();
  await page.waitForTimeout(150);
  const hov = await page.evaluate(() => getComputedStyle(document.querySelector(".qc-mname--ms") as HTMLElement).textDecorationLine);
  console.log(`underline on hover: ${hov}`);
  expect(hov, "hovering the title shows no underline").toBe("underline");
  expect(first.italic, "the agent name is italic").toBe("normal");
  /* ⚠️ AND NOT BURGUNDY — the outgoing status colour, which on this card would read as a second status */
  expect(first.colour, "a name took the status colour").toBe("rgb(20, 20, 18)");

  /* the card does not reflow with the name */
  expect([...new Set(seen.map((s) => s.rowsRight))], `a name moved the rows' right edge: ${[...new Set(seen.map((s) => s.rowsRight))].join(", ")}`).toHaveLength(1);
  expect([...new Set(seen.map((s) => s.cardH))], `a name changed the card's height: ${[...new Set(seen.map((s) => s.cardH))].join(", ")}`).toHaveLength(1);

  const longest = seen.reduce((a, b) => (b.nameW > a.nameW ? b : a));
  console.log(`longest rendered: "${longest.name}" at ${longest.nameW}px, ${longest.free}px free beside its agency`);
  const named = seen.find((s) => /penhallow/i.test(s.name));
  if (!named) console.log("⚠️ `Penhallow Literary` IS NOT IN THIS ACCOUNT — the pack's named worst case is unexercised; the widest present is above");
  else console.log(`Penhallow Literary / ${named.agency}: name ${named.nameW}, free ${named.free}`);
  /* ⚠️ REPORTED, NOT SILENTLY REDUCED. The pack says to report the measurement rather than drop the
     size unilaterally, so this fails loudly only when the line actually overflows. */
  expect(longest.free, `"${longest.name}" leaves ${longest.free}px on its value line — it has overflowed`).toBeGreaterThan(-0.5);
});

/**
 * ⚠️ THE PACK'S NAMED WORST CASE, MEASURED RATHER THAN ESTIMATED. `Penhallow Literary` with `Agent
 * not specified` is not in this account, and arithmetic from a shorter name ("18 characters over
 * 14, so about 196px") is the guess-wearing-a-measurement's-clothes this repo has a rule about.
 * The rendered card is given those exact strings and re-read, then put back. That is a probe of
 * the real rule at the real size; what it cannot prove is that such an agent exists.
 */
test("§2 — the pack's longest name, measured on the rendered card", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);

  const m = await page.evaluate(() => {
    const r = (x: number) => Math.round(x * 10) / 10;
    /* ⚠️ `--lg` IS RETIRED (§4) — the two names match and the CARD differentiates. The agent's is
       simply the first `.qc-mname` on the card now. */
    const name = document.querySelector(".qc-mname") as HTMLElement;
    const val = name.closest(".qc-mval") as HTMLElement;
    const sec = val.querySelector(".qc-msec") as HTMLElement;
    const card = document.querySelector(".qc-mail") as HTMLElement;
    const rows = document.querySelector(".qc-mailrows") as HTMLElement;
    const wasN = name.textContent, wasS = sec.textContent;
    const snap = () => ({
      nameW: r(name.getBoundingClientRect().width), secW: r(sec.getBoundingClientRect().width),
      valW: r(val.getBoundingClientRect().width), cardH: r(card.getBoundingClientRect().height),
      rowsRight: r(rows.getBoundingClientRect().right),
      /* ⚠️ CLIPPED IS THE REAL QUESTION. Both are `text-overflow: ellipsis`, so "does not crowd"
         means neither has had to truncate — an overflow here is silent, not a broken layout. */
      nameClipped: name.scrollWidth > name.clientWidth + 0.5,
      secClipped: sec.scrollWidth > sec.clientWidth + 0.5,
    });
    const before = snap();
    name.textContent = "Penhallow Literary";
    sec.textContent = "Agent not specified";
    const after = snap();
    name.textContent = wasN; sec.textContent = wasS;
    return { before, after, free: r(after.valW - after.nameW - after.secW) };
  });
  console.log(`Penhallow Literary / Agent not specified → name ${m.after.nameW} + agency ${m.after.secW} in ${m.after.valW} · free ${m.free} · clipped name=${m.after.nameClipped} agency=${m.after.secClipped}`);
  console.log(`  (for comparison, the query's own: name ${m.before.nameW} + agency ${m.before.secW}, card ${m.before.cardH})`);

  expect(m.after.rowsRight, "the long name moved the rows' right edge").toBe(m.before.rowsRight);
  expect(m.after.cardH, "the long name reflowed the card").toBe(m.before.cardH);
  expect(m.after.nameClipped, `"Penhallow Literary" is truncated at 24px — report before reducing the size`).toBe(false);
  expect(m.free, `the value line has ${m.free}px left — the name crowds the agency`).toBeGreaterThan(0);
});
