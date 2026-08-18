/**
 * §1/§2 — the query header as a mail header, measured on the running page.
 *
 * ⚠️ THE LONGEST LABEL IS THE CASE, AND IT IS DRIVEN RATHER THAN ASSUMED. `Revise & resubmit` is
 * the label that breaks this layout, and whether the account holds such a query is not something a
 * source lock can know — so the run sweeps the list, reports which statuses it actually saw, and
 * says so when the case went unexercised instead of passing on the ones that fit easily.
 *
 *   SA_E2E_BASE_URL=http://localhost:3000 npx playwright test --project=measure qcMailHeader
 */
import { test, expect, Page } from "@playwright/test";
import { openRoute } from "./measure";

const read = (page: Page) => page.evaluate(() => {
  const r = (n: number) => Math.round(n * 10) / 10;
  const q = (s: string) => document.querySelector(s) as HTMLElement | null;
  const box = (e: Element | null) => e ? e.getBoundingClientRect() : null;
  const card = q(".qc-mail")!;
  const rows = q(".qc-mailrows")!;
  const st = q(".qc-mstatus")!;
  const dot = st.querySelector("svg, .sa-statusdot, span") as HTMLElement | null;
  const labs = [...document.querySelectorAll(".qc-mlead")] as HTMLElement[];
  /* ⚠️ SCOPED TO THE CARD (§1). The send event's materials row reuses `.qc-msub` for its chip
     layout, and a document-wide query put an element from the TIMELINE into the header's rail
     reading — 755 against 773, reported as a broken rail on a card whose rail is fine. */
  const vals = [...card.querySelectorAll(".qc-mval")] as HTMLElement[];
  const subs = [...card.querySelectorAll(".qc-msub")] as HTMLElement[];
  const names = [...document.querySelectorAll(".qc-mname")] as HTMLElement[];
  const chip = (sel: string) => [...document.querySelectorAll(sel)].map((c) => {
    const cs = getComputedStyle(c as HTMLElement); const b = c.getBoundingClientRect();
    const tx = c.querySelector(".qc-mchiptx") as HTMLElement | null;
    return { bg: cs.backgroundColor, bd: cs.borderTopWidth + " " + cs.borderTopColor, rad: cs.borderTopLeftRadius,
             h: r(b.height), w: r(b.width), text: (tx?.textContent ?? "").trim(),
             clipped: tx ? tx.scrollWidth > tx.clientWidth + 0.5 : false, title: c.getAttribute("title") ?? "",
             wrapped: b.height > 30 };
  });
  return {
    cardH: r(box(card)!.height),
    /* ⚠️ ONE RAIL: every value and every sub-row starts at the same x */
    rail: [...vals, ...subs].map((e) => r(box(e)!.left)),
    labelX: labs.map((e) => r(box(e)!.left)),
    /* ⚠️ THE LEADERS' SIZE AND STROKE, not their text — §1 replaced the words with glyphs. */
    leaders: labs.map((e) => { const g = e.querySelector("svg")!; const c = getComputedStyle(g as unknown as Element); const b = g.getBoundingClientRect(); return `${r(b.width)}x${r(b.height)}|${c.strokeWidth}|${c.stroke}`; }),
    leaderBox: labs.map((e) => r(e.getBoundingClientRect().width)),
    leaderPaint: labs.map((e) => { const c = getComputedStyle(e); return `${c.backgroundColor}|${c.borderTopWidth}|${c.borderRadius}`; }),
    /* the two names are peers — same face, size and ink */
    /* ⚠️ FACE AND INK ONLY — §2 made the SIZE the difference between them, so comparing all three
       would fail on the hierarchy it deliberately introduced. */
    nameFaces: names.map((e) => { const c = getComputedStyle(e); return `${c.fontFamily.split(",")[0].replace(/"/g, "")}|${c.color}|${c.fontStyle}`; }),
    nameSizes: names.map((e) => getComputedStyle(e).fontSize),
    contacts: chip(".qc-mchip-con"),
    attachments: chip(".qc-mchip-att"),
    /* §2 — the mark */
    status: {
      label: (q(".qc-mswd")?.textContent ?? "").trim(),
      dotW: dot ? r(box(dot)!.width) : null,
      dotH: dot ? r(box(dot)!.height) : null,
      transform: dot ? getComputedStyle(dot).transform : "—",
      blockTop: r(box(st)!.top), blockH: r(box(st)!.height),
      rowsTop: r(box(rows)!.top), rowsH: r(box(rows)!.height),
      rowsRight: r(box(rows)!.right), stLeft: r(box(st)!.left),
      /* a hairline between the two would show up as a border on either box */
      rowsBorder: getComputedStyle(rows).borderRightWidth, stBorder: getComputedStyle(st).borderLeftWidth,
      textLines: Math.round((box(q(".qc-mswd"))!.height) / parseFloat(getComputedStyle(q(".qc-mswd")!).lineHeight || "1")),
    },
    /* what must NOT be here */
    /* ⚠️ `.qc-mav`, NOT `.f12-bigav` — the disc §5's reset brings back is the header's own, not the
       one the pre-mail-header card used. Reading the old class reported the reset as not landed. */
    hasAvatar: !!document.querySelector(".qc-mail .qc-mav"),
    /* §4a — the rule between the rows, spanning both tracks */
    rule: (() => {
      const e = document.querySelector(".qc-mrule") as HTMLElement | null;
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { h: r(b.height), left: r(b.left), bg: getComputedStyle(e).backgroundColor };
    })(),
    /**
     * ⚠️ THE PINK BUDGET IS TWO, AND `StatusDot`'s OWN PARTS ARE EXEMPT BY NAME — the pack says so:
     * "the status mark's centre fill is not affected". Its internals are unclassed spans with
     * inline styles, one per list row plus the card's, and counting those would be measuring the
     * app's shared status component rather than this page's surfaces.
     * ⚠️ SO THE RULE IS "A SURFACE HAS A NAME": anything painting a warm tint under a class is this
     * page's own decision; an unclassed span is the dot's.
     */
    pinkSurfaces: [...document.querySelectorAll(".qc-wpg [class]")].filter((e) => {
      const cls = (e as HTMLElement).className;
      if (typeof cls !== "string" || !cls.trim()) return false;
      const mm = /rgba?\((\d+), (\d+), (\d+)/.exec(getComputedStyle(e as HTMLElement).backgroundColor);
      if (!mm) return false;
      const [rr, gg, bb] = [1, 2, 3].map((i) => Number(mm[i]));
      return rr > 230 && rr - bb > 12 && rr - gg > 6;
    }).map((e) => `${e.tagName.toLowerCase()}.${((e as HTMLElement).className as string).split(" ")[0]}`),
    sageHead: !!document.querySelector(".qc-mail .f12-chh"),
    cardText: (card.textContent ?? "").trim(),
  };
});

test("§1/§2 — the rows, the rails, the chips and the mark", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const rows = page.locator(".f12-row");
  const n = Math.min(await rows.count(), 14);

  const seen: { label: string; cardH: number; dot: number | null; lines: number; rowsH: number; blockH: number; right: number; chips: number }[] = [];
  let checkedOne = false;

  for (let i = 0; i < n; i++) {
    await rows.nth(i).scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
    await rows.nth(i).click({ timeout: 2500 }).catch(() => {});
    await page.waitForTimeout(140);
    const m = await read(page);
    seen.push({ label: m.status.label, cardH: m.cardH, dot: m.status.dotW, lines: m.status.textLines, rowsH: m.status.rowsH, blockH: m.status.blockH, right: m.status.rowsRight, chips: m.attachments.length + m.contacts.length });

    if (!checkedOne) {
      checkedOne = true;
      console.log(`leaders=${JSON.stringify(m.leaders)} box=${JSON.stringify(m.leaderBox)} rail=${JSON.stringify([...new Set(m.rail)])} labelX=${JSON.stringify([...new Set(m.labelX)])}`);
      console.log(`names=${JSON.stringify(m.nameFaces)} sizes=${JSON.stringify(m.nameSizes)}`);
      console.log(`contacts=${JSON.stringify(m.contacts)}`);
      console.log(`attachments=${JSON.stringify(m.attachments)}`);
      console.log(`status=${JSON.stringify(m.status)}`);

      /**
       * ⚠️ THIS BLOCK IS REWRITTEN BY §5's RESET, and the clauses it drops are dropped BY NAME
       * rather than quietly: the bare 20px leaders (now a monogram disc), the label column and the
       * 773.41px rail they created, the "leader takes no plate" rule (the disc IS a plate), the
       * 56px mark (now 26px and after the words), and "a contact chip reads its value, never the
       * word" — which the reset inverts outright. Every one was true of the layout it was written
       * for; the reset replaces that layout, so restating them would be locking the wrong page.
       *
       * ⚠️ WHAT SURVIVES IS EVERYTHING THAT WAS NEVER ABOUT THE ARRANGEMENT: one face and one ink
       * for the names, the two chip families sharing a size and a radius while differing in ground,
       * the pink-surface limit, and the card's own chassis.
       */

      /* §5 — the monogram disc leads, the agency sits beneath the name */
      expect(m.hasAvatar, "the monogram disc did not come back").toBe(true);

      /* ⚠️ ONE FACE, ONE INK — unchanged by the reset, and the reason the two names read as a pair */
      expect([...new Set(m.nameFaces)], `the two names differ in more than size: ${m.nameFaces.join(" ⁄ ")}`).toHaveLength(1);
      expect(m.nameFaces[0], "the names are not Playfair in the ink, upright").toBe("Playfair Display|rgb(20, 20, 18)|normal");
      expect(m.nameFaces, "the card still names more than the agent").toHaveLength(2);
      expect(parseFloat(m.nameSizes[0]), `the manuscript is not the smaller of the two: ${m.nameSizes.join(" ⁄ ")}`)
        .toBeGreaterThan(parseFloat(m.nameSizes[1]));

      /**
       * ⚠️ THE PINK LIMIT IS NOW A LIMIT ON KINDS, NOT ON INSTANCES — and that is a reformulation
       * rather than a raising. "Two pink surfaces" was countable while the page had two; the reset
       * puts a monogram on every list row, so a count of INSTANCES is a count of queries and says
       * nothing about the design. What the rule was always protecting is that pink means a small
       * number of things: the one primary, the selected row, and identity.
       */
      const pinkKinds = [...new Set(m.pinkSurfaces.map((p) => p.replace(/^\w+\./, "").split(" ")[0]))].sort();
      console.log(`pink surfaces: ${m.pinkSurfaces.length} instances of ${pinkKinds.join(", ")}`);
      expect(pinkKinds, `pink is spent on more than the primary, the selection and identity: ${pinkKinds.join(", ")}`)
        .toEqual(["f12-av", "f12-row", "qc-btn", "qc-mav"]);

      /* the two chip families: same size and radius, different ground */
      expect(m.contacts.length, "no contact chips").toBeGreaterThan(0);
      expect(m.attachments.length, "no attachment chips").toBeGreaterThan(0);
      const heights = new Set([...m.contacts, ...m.attachments].map((c) => c.h));
      const radii = new Set([...m.contacts, ...m.attachments].map((c) => c.rad));
      expect([...heights], `the two chip families differ in height: ${[...heights].join(", ")}`).toHaveLength(1);
      expect([...radii], "the two chip families differ in radius").toHaveLength(1);
      const attBg = new Set(m.attachments.map((c) => c.bg));
      const conBg = new Set(m.contacts.map((c) => c.bg));
      expect([...conBg].some((b) => attBg.has(b)), `the two families share a ground: ${[...conBg]} vs ${[...attBg]}`).toBe(false);

      /**
       * ⚠️ INVERTED BY §5 — THE CONTACT CHIPS READ THEIR LABELS AGAIN. The previous layout showed
       * the address itself and this case forbade the word; the reset shows `Email` / `Website`,
       * with the value in the `title` where it always was and the link still doing the work.
       *
       * ⚠️ AND A MISSING VALUE IS STILL AN ACTION — the dead "No email" pill does not return with
       * the layout. That clause is newer than the reset and outranks it.
       */
      for (const c of m.contacts) {
        expect(c.text, `a contact chip reads "${c.text}"`).toMatch(/^(Email|Website|\+ Add email|\+ Add website)$/);
        expect(c.wrapped, `a contact chip wrapped: "${c.text}"`).toBe(false);
        expect(c.text, "a dead 'No email' pill came back with the layout").not.toMatch(/^No /);
      }

      /* §5 — the mark is small and follows the words */
      expect(m.status.dotW, `the mark is ${m.status.dotW}px — the 56px one is back`).toBeLessThan(34);
      expect(m.status.dotW, "the mark is below StatusDot's own floor").toBeGreaterThanOrEqual(12);
      expect(m.status.transform, "a transform is applied to the mark").toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
      /* no hairline between the rows and the block */
      expect(parseFloat(m.status.rowsBorder), "the rows drew a rule beside the status").toBe(0);
      expect(parseFloat(m.status.stBorder), "the status block drew a rule beside the rows").toBe(0);

      /* ⚠️ THE CHASSIS IS UNTOUCHED BY THIS SECTION — white, square, its sage top edge. */
      expect(m.sageHead, "the sage card header came back").toBe(false);
      expect(m.cardText, "the Materials sent heading came back").not.toContain("Materials sent");
    }
  }

  console.log(seen.map((s) => `  ${s.label}: card ${s.cardH} · rows ${s.rowsH} · block ${s.blockH} · rowsRight ${s.right} · chips ${s.chips} · mark ${s.dot} · lines ${s.lines}`).join("\n"));

  /* ⚠️ THE LONGEST LABEL. Reported when absent rather than passed over. */
  const longest = seen.filter((s) => /revise/i.test(s.label));
  if (!longest.length) {
    console.log("⚠️ NO `Revise & resubmit` QUERY IN THIS ACCOUNT — the longest-label case is unexercised on the page");
  } else {
    console.log(`Revise & resubmit: card ${longest[0].cardH} · mark ${longest[0].dot} · label lines ${longest[0].lines}`);
    /* ⚠️ 26px SINCE §5's RESET — the clause is that the label does not change the mark, not that
       the mark is any particular size, and the size is asserted once above. */
    expect(longest[0].dot, "the longest label shrank the mark").toBeGreaterThanOrEqual(20);
  }
  /* ⚠️ THE ROWS ARE NOT PUSHED — the pack's clause, and the one that failed. The status column is a
     constant reserve, so the rows end at the same x whatever the label says; a `max-width` block
     moved that edge by 77px between `Queried` and `Revise & Resubmit`. */
  expect([...new Set(seen.map((s) => s.right))], `the status label moved the rows' right edge: ${[...new Set(seen.map((s) => s.right))].join(", ")}`).toHaveLength(1);
  expect([...new Set(seen.map((s) => s.rowsH))], `the rows changed height with the status label: ${[...new Set(seen.map((s) => s.rowsH))].join(", ")}`).toHaveLength(1);
  /* whatever labels the account holds, the card is one height and the mark one size */
  expect([...new Set(seen.map((s) => s.dot))], `the mark changed size with the status: ${[...new Set(seen.map((s) => s.dot))].join(", ")}`).toHaveLength(1);
});

/**
 * ⚠️ THE ELLIPSIS, EXERCISED DIRECTLY BECAUSE THE DATA CANNOT REACH IT. Every address on this
 * account measures ~129px against a 270px cap, so the truncation branch renders green by never
 * running — the failure this repo has a rule about. Here the rendered chip is given a long value
 * and re-measured, then put back. That is a probe of the REAL rule on the REAL page, not a harness
 * reconstruction: what it proves is that the CSS truncates rather than wraps, which is the clause.
 * What it cannot prove is that any agent in this account has such an address, and it does not claim to.
 */
test("§1 — a long contact truncates and never wraps", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  await page.locator(".f12-row").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(250);

  const m = await page.evaluate(() => {
    const r = (n: number) => Math.round(n * 10) / 10;
    const chip = document.querySelector(".qc-mchip-con:not(.off)") as HTMLElement;
    const tx = chip.querySelector(".qc-mchiptx") as HTMLElement;
    const rowH = (document.querySelector(".qc-msub") as HTMLElement).getBoundingClientRect().height;
    const was = tx.textContent ?? "";
    const before = { w: r(chip.getBoundingClientRect().width), h: r(chip.getBoundingClientRect().height), rowH: r(rowH) };
    tx.textContent = "a.very.long.editorial.assistant.address@an-exceedingly-long-agency-domain-name.co.uk";
    const after = {
      w: r(chip.getBoundingClientRect().width), h: r(chip.getBoundingClientRect().height),
      rowH: r((document.querySelector(".qc-msub") as HTMLElement).getBoundingClientRect().height),
      clipped: tx.scrollWidth > tx.clientWidth + 0.5,
      overflow: getComputedStyle(tx).textOverflow, wrap: getComputedStyle(tx).whiteSpace,
    };
    tx.textContent = was;
    return { before, after };
  });
  console.log(JSON.stringify(m));

  expect(m.after.w, `a long address ran past the 270px cap: ${m.after.w}`).toBeLessThanOrEqual(270.5);
  expect(m.after.h, "a long address made the chip taller — the TEXT wrapped").toBe(m.before.h);
  /* ⚠️ THE SUB-ROW MAY REFLOW, AND THAT IS NOT THE CLAUSE. "Never wrap" is about the address: a
     wrapped address turns a chip into a paragraph and moves everything under it. A second chip
     dropping to its own line is the sub-row's `flex-wrap` doing the job it exists for — the
     attachments row already uses it for four or five chips. Measured here: at the 270px cap the
     row went 24 → 54 in a ~388px column, which is two chips on two lines, not a wrapped address.
     I asserted the row's height first and it failed for this reason; the assertion was wrong, not
     the rule. */
  expect(m.after.rowH, "the sub-row collapsed rather than reflowing").toBeGreaterThanOrEqual(m.before.rowH);
  expect(m.after.clipped, "the long address was not clipped at all").toBe(true);
  expect(m.after.overflow, "the clipped text has no ellipsis").toBe("ellipsis");
  expect(m.after.wrap, "the chip's text may wrap").toBe("nowrap");
});
