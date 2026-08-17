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
    hasAvatar: !!document.querySelector(".qc-mail .f12-bigav"),
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

      /* §1 — one rail for every value and every sub-row */
      expect([...new Set(m.rail)], `values and sub-rows start at different x: ${[...new Set(m.rail)].join(", ")}`).toHaveLength(1);
      expect([...new Set(m.labelX)], "the labels are not in one column").toHaveLength(1);
      /* ⚠️ ONE SIZE AND ONE STROKE ON BOTH — read from the rendered glyphs, not from the rule.
         §4b gives the agent's a pink disc and burgundy ink, so the COLOUR differs by design now;
         the drawing and its weight must not, which is what makes the pair a differentiator rather
         than two different icons. */
      expect([...new Set(m.leaders.map((l) => l.split("|").slice(0, 2).join("|")))],
        `the leaders differ in size or stroke: ${m.leaders.join(" ⁄ ")}`).toHaveLength(1);
      expect(m.leaders[0], "the leaders are not 20px").toContain("20x20");
      /* ⚠️ BACK TO BARE, AND §4b's REASON IS WHAT TAKES IT AWAY. The disc existed so the card's TWO
         rows could be told apart without the type doing it; §1 leaves one row, so it had nothing to
         distinguish and was a second circle competing with the 56px mark. The status mark is the
         card's only circular element again. */
      expect(m.leaderPaint, "the card has more than one leader").toHaveLength(1);
      expect(m.leaderPaint[0], `the leader took a plate: ${m.leaderPaint[0]}`).toMatch(/^rgba\(0, 0, 0, 0\)\|0px\|0px$/);
      /* ⚠️ AND THE RAIL DID NOT MOVE. Browser-read before §1: the label track was 30.41px and the
         rail sat at 773.41. The leaders take 30, so the sub-rows keep their indent within half a
         pixel — the pack's clause, checked against the recorded figure rather than against itself. */
      expect(Math.abs(m.rail[0] - 773.41), `the sub-rows' indent moved: ${m.rail[0]} against 773.41`).toBeLessThan(1);

      /* ⚠️ ONE FACE, ONE INK, AND THE SIZE IS THE HIERARCHY (§2). The agent is what the card
         confirms first — the list row you clicked was an agent — so it takes the larger step;
         everything else about the two is identical, and neither is italic or burgundy. */
      expect([...new Set(m.nameFaces)], `the two names differ in more than size: ${m.nameFaces.join(" ⁄ ")}`).toHaveLength(1);
      expect(m.nameFaces[0], "the names are not Playfair in the ink, upright").toBe("Playfair Display|rgb(20, 20, 18)|normal");
      /* the agent's is the card's only name now — the manuscript's is on the send rung */
      expect(m.nameFaces, "the card still names more than the agent").toHaveLength(2);
      /* ⚠️ THE STEP RETURNS ON THE MANUSCRIPT, and this is the third position the pair has held.
         The structural pack removed it because type carrying the hierarchy ALONE survives neither
         a long title nor a later change to the scale — which was right. It is not alone now: the
         icon discs say which KIND each row is, so the size is free to say which is the SUBJECT.
         Two devices, two jobs. Face and ink stay identical, which is asserted above. */
      expect(parseFloat(m.nameSizes[0]), `the manuscript is not the smaller of the two: ${m.nameSizes.join(" ⁄ ")}`)
        .toBeGreaterThan(parseFloat(m.nameSizes[1]));
      /* ⚠️ AND THEY ARE ON DIFFERENT SURFACES NOW — the agent's in the header, the manuscript's on
         the send rung — which is why `names` is read document-wide while the rail is read from the
         card. Two scopes, deliberately, and each says which it is. */
      /* ⚠️ §4a's RULE IS GONE WITH THE SECOND ROW (§1) — it divided two statements, and there is
         one. Asserted absent, because a hairline through a single-row card would be a divider
         dividing nothing. */
      expect(m.rule, "the rule between the rows survives with one row to divide").toBeNull();
      /* ⚠️ TWO PINK SURFACES, AND THAT IS THE STATED LIMIT */
      console.log(`pink surfaces: ${m.pinkSurfaces.join(", ")}`);
      expect(m.pinkSurfaces.length, `more than two pink surfaces: ${m.pinkSurfaces.join(", ")}`).toBeLessThanOrEqual(2);

      /* the two chip families: same size and radius, different ground */
      expect(m.contacts.length, "no contact chips").toBeGreaterThan(0);
      expect(m.attachments.length, "no attachment chips").toBeGreaterThan(0);
      const heights = new Set([...m.contacts, ...m.attachments].map((c) => c.h));
      const radii = new Set([...m.contacts, ...m.attachments].map((c) => c.rad));
      expect([...heights], `the two chip families differ in height: ${[...heights].join(", ")}`).toHaveLength(1);
      expect([...radii], "the two chip families differ in radius").toHaveLength(1);
      const conBg = new Set(m.contacts.filter((c) => !c.text.startsWith("No ")).map((c) => c.bg));
      const attBg = new Set(m.attachments.map((c) => c.bg));
      expect([...conBg].some((b) => attBg.has(b)), `the two families share a ground: ${[...conBg]} vs ${[...attBg]}`).toBe(false);
      expect([...conBg][0], "a contact chip is not white").toBe("rgb(255, 255, 255)");
      /* ⚠️ THE RIM IS TRANSPARENT, NOT ABSENT — and that is what makes "same size" true. `border: 0`
         on the attachments would make them 2px shorter than the contacts, so the two families would
         differ in the one dimension the pack says they must share. What must not happen is a rim
         with a COLOUR, which is what a shared `.on` modifier gave them before the rename. */
      for (const c of m.attachments) {
        expect(c.bd, `an attachment chip grew a visible rim: ${c.bd}`).toMatch(/rgba\(0, 0, 0, 0\)|transparent/);
        expect(parseFloat(c.bd), "the attachment chips lost the width that keeps both families one size").toBe(1);
      }

      /* contacts show their value, never wrap, and carry the whole thing in `title` */
      for (const c of m.contacts) {
        expect(c.text, `a contact chip reads "${c.text}" — the word, not the value`).not.toMatch(/^(Email|Website)$/);
        expect(c.wrapped, `a contact chip wrapped: "${c.text}"`).toBe(false);
        expect(c.w, `a contact chip ran past the 270px cap: ${c.w}`).toBeLessThanOrEqual(270.5);
        expect(c.title, "a contact chip has no full value in `title`").toBeTruthy();
        if (c.clipped) expect(c.title.length, "a truncated chip's title is no longer than what it shows").toBeGreaterThan(c.text.length - 2);
      }
      /* ⚠️ WHETHER THE TRUNCATION RAN AT ALL DEPENDS ON THIS ACCOUNT'S ADDRESSES. Reported rather
         than assumed: a green on chips that all fit says nothing about the ellipsis. */
      if (!m.contacts.some((c) => c.clipped)) {
        console.log(`⚠️ NO CONTACT LONG ENOUGH TO TRUNCATE on this query (widths ${m.contacts.map((c) => c.w).join(", ")} against a 270 cap) — the ellipsis is unexercised here`);
      }

      /* §2 — the locked component, larger and otherwise untouched */
      expect(m.status.dotW, "the mark is not ~56px").toBeGreaterThan(50);
      expect(m.status.dotW, "the mark is not ~56px").toBeLessThan(62);
      expect(m.status.transform, "a transform is applied to the mark").toMatch(/^(none|matrix\(1, 0, 0, 1, 0, 0\))$/);
      /* no hairline between the rows and the block */
      expect(parseFloat(m.status.rowsBorder), "the rows drew a rule beside the status").toBe(0);
      expect(parseFloat(m.status.stBorder), "the status block drew a rule beside the rows").toBe(0);

      /* the removals */
      expect(m.hasAvatar, "the initials avatar came back").toBe(false);
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
    expect(longest[0].dot, "the longest label shrank the mark").toBeGreaterThan(50);
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
