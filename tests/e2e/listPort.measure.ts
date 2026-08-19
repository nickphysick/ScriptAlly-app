/**
 * THE TASK LIST, AGAINST `design-refs/todo-tasklist-contract.html`.
 *
 * ⚠️ EVERY ASSERTION IS PROVEN RED BEFORE THE PORT. A green-before assertion is a broken
 * assertion — and two of these had to be rewritten to earn their red: "no checkbox" was green
 * over a `<button class="tdg-tick">` that is a checkbox in everything but tag name, and
 * "no show-more" was green over a control that only renders once a group overflows.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

type R = { id: string; ok: boolean; note: string };

/** the contract's own values, read from it rather than typed here */
const REF = readFileSync(join(process.cwd(), "design-refs/todo-tasklist-contract.html"), "utf8");
const refRule = (sel: string): string => {
  const i = REF.indexOf(sel + "{");
  return i < 0 ? "" : REF.slice(i, REF.indexOf("}", i));
};
const hexOf = (rule: string, prop: string): string =>
  (new RegExp(prop + ":\\s*(#[0-9a-fA-F]{3,8})").exec(rule) ?? ["", ""])[1].toLowerCase();
const rgb = (hex: string): string => {
  const h = hex.length === 4 ? "#" + [...hex.slice(1)].map((c) => c + c).join("") : hex;
  const n = parseInt(h.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
};

const RETIRED_VERBS = ["log", "record", "mark", "chase"];

test("list port", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });

  await ensureSignedIn(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  /** the list card, whichever era is rendering: the contract's `.listcard` or the current `.tdg` */
  /* ⚠️ THE SELECTORS NAME BOTH ERAS, AND EACH ONE WAS CHECKED AGAINST THE CURRENT LIST BEFORE THE
     RED RUN WAS BELIEVED. The first draft guessed `.tdg-head` and `.tdg-pill`, neither of which
     exists — so "every task renders" compared 12 rows against a group sum of ZERO and "each pill's
     fill" reported `checked ` with nothing checked. A probe that matches nothing does not fail
     honestly; it reports whatever the empty case happens to satisfy. */
  const SEL = { card: ".tlc, .tdw-rail", row: ".tlc .row, .tdg-row", grp: ".tlc .grp, .tdg-sect",
                meta: ".r-meta, .tdg-sub", fig: ".r-fig, .tdg-figstack", foot: ".l-foot, .tdw-foot",
                body: ".l-body, .tpl-zone", pill: ".pill, .tdg-bpill" };

  const probe = await page.evaluate((S) => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const all = (s: string) => [...document.querySelectorAll(s)].filter(vis) as HTMLElement[];
    const rows = all(S.row);
    const card = all(S.card)[0];
    const foot = all(S.foot)[0];
    const INTERACTIVE = "button, a[href], input, select, textarea, [role=button], [tabindex]";
    return {
      rowCount: rows.length,
      /* 1 · a checkbox by BEHAVIOUR, not by tag: anything in a row that toggles doneness */
      checkboxish: rows.reduce((n, r) => n + r.querySelectorAll(
        'input[type=checkbox], [role=checkbox], [aria-checked], .tdg-tick, [aria-label*="done" i], [aria-label*="Undo" i]').length, 0),
      /* 2 · interactive descendants at rest (hover measured separately) */
      restInteractive: rows.reduce((n, r) => n + r.querySelectorAll(INTERACTIVE).length, 0),
      /* 3 · what the group heads claim, summed */
      groupSum: all(S.grp).reduce((n, g) => {
        const m = /(\d+)/.exec(g.textContent ?? "");
        return n + (m ? Number(m[1]) : 0);
      }, 0),
      /* 4 · the footer */
      footText: (foot?.textContent ?? "").replace(/\s+/g, " ").trim(),
      /* 5 · a show-more control anywhere in the list */
      showMore: all(S.card + " *").filter((e) =>
        /show\s+\d+\s+more|show more|\+\s*\d+\s+more/i.test(e.textContent ?? "") && e.children.length === 0).length,
      /* 6 · meta lines: one line box each */
      /* ⚠️ `getClientRects().length` IS ALWAYS 1 ON A BLOCK ELEMENT, whatever its text does — the
         first form of this reported 0 wrapped over rows that visibly wrap, which is a probe
         answering a question it was never asked. Height against line-height is the real test. */
      metaWrapped: all(S.meta).filter((m) => {
        const lh = parseFloat(getComputedStyle(m).lineHeight) || parseFloat(getComputedStyle(m).fontSize) * 1.4;
        return m.getBoundingClientRect().height > lh * 1.6;
      }).length,
      metaCount: all(S.meta).length,
      /* 7 · the right column */
      figs: all(S.fig).slice(0, 40).map((f) => {
        const b = f.querySelector("b");
        const cs = b ? getComputedStyle(b) : null;
        return { text: (f.textContent ?? "").replace(/\s+/g, " ").trim(),
                 cls: f.className, hasB: !!b,
                 font: cs?.fontFamily ?? "", size: cs?.fontSize ?? "" };
      }),
      /* 8 · deeds, paired with their pill */
      deeds: rows.slice(0, 40).map((r) => ({
        pill: (r.querySelector(S.pill)?.textContent ?? "").trim(),
        deed: (r.querySelector(".r-deed, .tdg-t")?.textContent ?? "").trim(),
        meta: (r.querySelector(".r-meta, .tdg-sub")?.textContent ?? "").replace(/\s+/g, " ").trim(),
      })),
      /* 9 · every user-facing word in the list */
      listText: (card?.innerText ?? "").toLowerCase(),
      /* 11 · scroll ownership */
      docOverflow: document.documentElement.scrollHeight - document.documentElement.clientHeight,
      bodyScrolls: (() => { const b = all(S.body)[0]; return b ? `${b.clientHeight}/${b.scrollHeight}` : "ABSENT"; })(),
      /* 12 · pill fills */
      /* ⚠️ THE SELECTOR IS THE PILL'S OWN, NOT A COMPOSED ONE. The first form built
         `".tlc, .tdw-rail .pill, …"` by string-joining, which matched the CARD and keyed the map on
         its entire text — so every `wantPill[key]` was undefined and the check passed having
         compared nothing. A vacuous green, produced by a selector rather than by a wrong value. */
      pills: [...new Map(all(".pill").map((p) => {
        const key = (p.textContent ?? "").trim().toLowerCase();
        return [key, { key, bg: getComputedStyle(p).backgroundColor }];
      })).values()],
      /* the card's own frame */
      cardStyle: card ? (() => { const c = getComputedStyle(card);
        return { bg: c.backgroundColor, radius: c.borderRadius, display: c.display, dir: c.flexDirection }; })() : null,
    };
  }, SEL);

  /* ── 1 ─────────────────────────────────────────────────────────────────────────────────── */
  add("1 · no checkbox control renders in any row", probe.checkboxish === 0,
      `${probe.checkboxish} tick/checkbox controls across ${probe.rowCount} rows`);

  /* ── 2 · rest vs hover ─────────────────────────────────────────────────────────────────── */
  const firstRow = page.locator(SEL.row).first();
  await firstRow.hover();
  await page.waitForTimeout(400);
  const hoverInteractive = await page.evaluate((S) => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const r = [...document.querySelectorAll(S.row)].filter(vis)[0] as HTMLElement | undefined;
    if (!r) return -1;
    return [...r.querySelectorAll("button, a[href], input, select, textarea, [role=button], [tabindex]")]
      .filter(vis).length;
  }, SEL);
  const restFirst = await page.evaluate((S) => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const r = [...document.querySelectorAll(S.row)].filter(vis)[0] as HTMLElement | undefined;
    return r ? [...r.querySelectorAll("button, a[href], input, select, textarea, [role=button], [tabindex]")].filter(vis).length : -1;
  }, SEL);
  add("2 · a row gains no controls on hover — the row is the only control",
      hoverInteractive === 0 && restFirst === 0,
      `rest=${restFirst} hover=${hoverInteractive} (want 0/0 — the row div carries the click)`);

  /* ── 3 · everything renders ────────────────────────────────────────────────────────────── */
  add("3 · every task renders — rows equal what the group heads claim",
      probe.rowCount > 0 && probe.rowCount === probe.groupSum,
      `rows=${probe.rowCount} groupSum=${probe.groupSum}`);

  /* ── 4 · the footer ────────────────────────────────────────────────────────────────────── */
  const footN = Number((/(\d+)/.exec(probe.footText) ?? ["", "-1"])[1]);
  add("4 · the footer states that same number, and never 'of'",
      footN === probe.rowCount && !/\bof\b/i.test(probe.footText),
      `foot="${probe.footText}" n=${footN} rows=${probe.rowCount}`);

  /* ── 5 · no show-more ──────────────────────────────────────────────────────────────────── */
  /* ⚠️ THE RENDERED CONTROL IS DATA-DEPENDENT AND THE MECHANISM IS NOT. This account's groups do
     not currently overflow the slice threshold, so a DOM-only check passed over `groupSlice` and
     `showMoreLabel` sitting in the list untouched — green today, red the day someone imports 40
     queries. The brief says delete the mechanism, not its trigger, so the mechanism is what is
     asserted, alongside the DOM. */
  const listSrc = readFileSync(join(process.cwd(), "src/components/todo/TaskList.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
  const mech = ["groupSlice", "showMoreLabel", "hkExpanded", "onToggleHk"].filter((m) => listSrc.includes(m));
  add("5 · no show-more control renders, and the mechanism is gone from the source",
      probe.showMore === 0 && mech.length === 0,
      `dom=${probe.showMore} · source still holds: ${mech.join(" ") || "nothing"}`);

  /* ── 6 · meta never wraps ──────────────────────────────────────────────────────────────── */
  add("6 · every meta line is a single line box at 1440",
      probe.metaCount > 0 && probe.metaWrapped === 0,
      `${probe.metaWrapped} of ${probe.metaCount} wrapped`);

  /* ── 7 · the right-hand grammar ────────────────────────────────────────────────────────── */
  const dated = probe.figs.filter((f) => f.hasB);
  const absent = probe.figs.filter((f) => /absent/.test(f.cls));
  add("7a · a dated row's figure is Playfair 15px",
      dated.length > 0 && dated.every((f) => /Playfair/i.test(f.font) && f.size === "15px"),
      dated.length ? `${dated.length} dated · first font=${dated[0].font} size=${dated[0].size}` : "no dated rows found");
  add("7b · an absent row carries no figure at all",
      absent.length > 0 && absent.every((f) => !f.hasB),
      absent.length ? `${absent.length} absent, ${absent.filter((f) => f.hasB).length} still carry a figure` : "no absent rows found");
  /* the fragment grammar: two lines, the second naming a unit */
  const FRAG = /^(waiting|open|quiet for|added|no date|no date set|\d+ queries)/i;
  const offGrammar = probe.figs.filter((f) => !FRAG.test(f.text));
  add("7c · every right cell reads as the contract's sentence fragment",
      probe.figs.length > 0 && offGrammar.length === 0,
      offGrammar.length ? `${offGrammar.length} off-grammar, e.g. "${offGrammar[0]?.text}"` : `${probe.figs.length} cells`);

  /* ── 8 · the deeds ─────────────────────────────────────────────────────────────────────── */
  const DEED: Record<string, string> = {
    send: "Send your full manuscript", decide: "Reply to the offer", chase: "Worth a nudge",
    close: "Consider closing", fix: "Fill in what you sent",
  };
  const seen = new Map<string, string>();
  for (const d of probe.deeds) if (d.pill && !seen.has(d.pill.toLowerCase())) seen.set(d.pill.toLowerCase(), d.deed);
  const wrong = [...seen].filter(([p, d]) => DEED[p] && d !== DEED[p] && !(p === "send" && /^Send your (partial|full manuscript)$/.test(d)));
  add("8 · each bucket's deed is the contract's string",
      seen.size > 0 && wrong.length === 0,
      wrong.length ? wrong.map(([p, d]) => `${p}: "${d}" ≠ "${DEED[p]}"`).join(" · ") : `checked ${[...seen.keys()].join(",")}`);

  /* ── 9 · retired verbs ─────────────────────────────────────────────────────────────────── */
  /* ⚠️ SCOPED TO THE DEED AND THE META, and two of the four verbs are the CONTRACT'S OWN WORDS.
     The brief retires "log · record · mark · chase" as user-facing text; the contract nonetheless
     ships `<span class="pill chase">Chase</span>` as the bucket's pill and `no date on record` as
     the absent fragment. Where the two disagree the contract wins, so the pill labels and the
     right-hand fragments are out of this check and the disagreement is in the report. What is
     asserted is what §6 is actually about: no deed and no meta line says log, record, mark or
     chase. */
  const prose = probe.deeds.map((d) => `${d.deed} ${d.meta}`).join(" ").toLowerCase();
  const found = RETIRED_VERBS.filter((v) => new RegExp(`\\b${v}\\b`).test(prose));
  add("9 · no deed or meta line uses a retired verb", found.length === 0,
      found.length ? `found: ${found.join(" ")}` : `checked ${probe.deeds.length} rows`);

  /* ── 10 · sticky group heads ───────────────────────────────────────────────────────────── */
  const sticky = await page.evaluate((S) => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const body = [...document.querySelectorAll(S.body)].filter(vis)[0] as HTMLElement | undefined;
    const card = [...document.querySelectorAll(S.card)].filter(vis)[0] as HTMLElement | undefined;
    if (!body || !card) return { ok: false, note: "no body/card" };
    body.scrollTop = 400;
    const heads = [...document.querySelectorAll(S.grp)].filter(vis) as HTMLElement[];
    const cardTop = card.getBoundingClientRect().top;
    const inside = heads.filter((h) => {
      const r = h.getBoundingClientRect();
      return r.top >= cardTop - 2 && r.top <= cardTop + body.clientHeight;
    });
    const pos = heads.map((h) => getComputedStyle(h).position);
    body.scrollTop = 0;
    return { ok: inside.length > 0 && pos.every((p) => p === "sticky"), note: `heads=${heads.length} position=${[...new Set(pos)].join("/")} visible-after-scroll=${inside.length}` };
  }, SEL);
  add("10 · group heads are sticky and stay in the card after a 400px scroll", sticky.ok, sticky.note);

  /* ── 11 · the list never scrolls the page ──────────────────────────────────────────────── */
  add("11 · the list body scrolls; the document does not",
      probe.docOverflow <= 0 && /\d+\/\d+/.test(probe.bodyScrolls),
      `docOverflow=${probe.docOverflow} body=${probe.bodyScrolls}`);

  /* ── 12 · pill tints ───────────────────────────────────────────────────────────────────── */
  const wantPill: Record<string, string> = {};
  for (const b of ["send", "decide", "chase", "close", "fix", "note"]) {
    wantPill[b] = rgb(hexOf(refRule(".pill." + b), "background"));
  }
  const badPills = probe.pills.filter((p) => wantPill[p.key] && p.bg !== wantPill[p.key]);
  add("12 · each pill's fill is the contract's hex",
      probe.pills.length > 0 && badPills.length === 0,
      badPills.length ? badPills.map((p) => `${p.key}: ${p.bg} ≠ ${wantPill[p.key]}`).join(" · ")
                      : `checked ${probe.pills.map((p) => p.key).join(",")}`);

  /* ── 6b · the narrow width ─────────────────────────────────────────────────────────────── */
  /* ⚠️ THE NARROW CHECK NEEDS THE CARD TO BE AT ITS DESIGN WIDTH, OR IT PROVES NOTHING. §9.6 asks
     that a meta line fits on one line at 392px. The first form set the VIEWPORT to 392 and asked
     whether any `.r-meta` wrapped — and it passed, because at that viewport the list column is
     ~97px and every meta is ellipsised to almost nothing. Not wrapping because there is no room to
     wrap in is not the claim. So the card's own width is asserted FIRST, and the wrap check only
     means something above it.

     ⚠️ AND AT 390 THE PAGE IS NOT ADAPTED — measured on the deployed site: card 97px, all nine
     deeds on three lines, split tracks `99px 159px`. That is the mobile state of `/todo`, which
     this repo's own notes record as parked, and it is out of this brief's scope. Reported rather
     than asserted away: this case now says so instead of passing quietly. */
  await page.setViewportSize({ width: 392, height: 900 });
  await page.waitForTimeout(1200);
  const narrowWrap = await page.evaluate((S) => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const card = [...document.querySelectorAll(S.card)].filter(vis)[0] as HTMLElement | undefined;
    const m = [...document.querySelectorAll(S.meta)].filter(vis) as HTMLElement[];
    const lh = (e: HTMLElement) =>
      parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.4;
    return {
      cardW: card ? Math.round(card.getBoundingClientRect().width) : -1,
      total: m.length,
      wrapped: m.filter((x) => x.getBoundingClientRect().height > lh(x) * 1.6).length,
    };
  }, SEL);
  /* the design width is 392; anything under ~300 is the parked mobile layout, not this claim */
  const atDesignWidth = narrowWrap.cardW >= 300;
  add("6b · at the card's design width, meta lines still do not wrap",
      atDesignWidth ? narrowWrap.wrapped === 0 : false,
      atDesignWidth
        ? `card=${narrowWrap.cardW}px · ${narrowWrap.wrapped} of ${narrowWrap.total} wrapped`
        : `NOT PROVEN — card is ${narrowWrap.cardW}px at a 392 viewport, so nothing can wrap. `
          + `/todo is not adapted below the shell's breakpoint (parked); out of this brief's scope.`);


  const red = out.filter((r) => !r.ok);
  const lines = [`── list port · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(process.env.SA_LIST_OUT ?? "run-artifacts/list-port.txt", report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
