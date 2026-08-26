import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

/**
 * Phase 7 — the grouped board's acceptance, four widths × five ranges.
 *
 * ⚠️ EVERY CLAIM IS CHECKED AT EVERY STOP, not once at 1440. A law that holds at exactly one
 * width is a coincidence, and this pack changed the row head, the row set and the window all at
 * once — three things whose interaction nothing had measured together.
 */
const WIDTHS = [1280, 1440, 1920, 2400];
const STOPS = ["1 week", "2 weeks", "1 month", "3 months", "6 months"];
const ORDER = ["Offers", "Needs you now", "Needs you soon", "Watching brief", "Snoozed", "Recently closed"];

test("Phase 7 — groups, dots, words and the past, at every width and range", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text().slice(0, 140)); });

  let rowsAt900 = "";
  for (const width of WIDTHS) {
    await openRoute(page, "/todo/calendar", { width, height: 900 });
    await page.waitForTimeout(950);
    const slider = page.getByRole("slider", { name: /range/i });
    expect(await slider.count(), `[${width}] no range control found by role`).toBe(1);

    for (let i = 0; i < STOPS.length; i++) {
      await slider.fill(String(i));
      await page.waitForTimeout(600);

      const m = await page.evaluate(() => {
        const all = [...document.querySelectorAll(".tl")] as HTMLElement[];
        const tl = all.find((e) => e.getBoundingClientRect().height > 0)!;
        const vh = document.documentElement.clientHeight;
        const kids = [...tl.children].filter((e) => e.getBoundingClientRect().height > 0);
        const groups: { name: string; stated: number; drawn: number; open: boolean }[] = [];
        let cur: (typeof groups)[number] | null = null;
        let orphan = 0;
        for (const el of kids) {
          if (el.classList.contains("tl-ghead")) {
            cur = {
              name: (el.querySelector(".tl-ghname")?.textContent || "").trim(),
              stated: Number(el.querySelector(".tl-ghn")?.textContent || "-1"),
              open: el.querySelector(".tl-ghbtn")?.getAttribute("aria-expanded") === "true",
              drawn: 0,
            };
            groups.push(cur);
          } else if (el.classList.contains("tl-row") && !el.classList.contains("tl-head")) {
            if (el.classList.contains("tl-row--pin")) continue;
            if (cur) cur.drawn += 1; else orphan += 1;
          }
        }
        const heads = [...tl.querySelectorAll(".tl-rowhead")];
        const lead = heads
          .filter((h) => !h.closest(".tl-row--pin"))
          .map((h) => {
            const first = h.querySelector(".tl-nm")!.firstElementChild as HTMLElement;
            const b = first.getBoundingClientRect();
            return { tag: first.tagName, svg: first.querySelectorAll("svg").length, w: Math.round(b.width) };
          });
        const cols = [...tl.querySelectorAll(".tl-dh")];
        const seg = tl.querySelector(".tl-seg.openleft") as HTMLElement | null;
        const fut = tl.querySelector(".tl-seg.future") as HTMLElement | null;
        return {
          groups, orphan,
          spines: tl.querySelectorAll(".tl-spine").length,
          lead,
          heads: heads.length,
          cols: cols.length,
          past: cols.filter((c) => c.classList.contains("past")).length,
          today: cols.filter((c) => c.classList.contains("today")).length,
          markers: tl.querySelectorAll(".tl-node").length,
          tipsPainted: [...tl.querySelectorAll(".tl-tip")]
            .filter((e) => getComputedStyle(e).opacity !== "0").length,
          tips: tl.querySelectorAll(".tl-tip").length,
          /* ⚠️ A CLAMPED EDGE IS A BORDER, NEVER A MASK — a mask would fade the ink out and say
             "this trails off", where a clamp says "this continues past the board's edge". */
          openleft: seg ? getComputedStyle(seg).borderLeftStyle : null,
          openleftMask: seg ? getComputedStyle(seg).maskImage : null,
          future: fut ? getComputedStyle(fut).borderRightStyle : null,
          futureMask: fut ? getComputedStyle(fut).maskImage : null,
          ink: tl.textContent || "",
          rowsInView: [...tl.querySelectorAll(".tl-row:not(.tl-head)")]
            .filter((r) => r.getBoundingClientRect().bottom <= vh).length,
          headerCount: tl.querySelectorAll(".tl-ghead").length,
        };
      });

      const say = `[${width}] ${STOPS[i].padEnd(9)} ${m.headerCount} groups · ${m.heads} heads` +
        ` · ${m.past}/${m.cols} past · today ${m.today} · ${m.markers} markers · tips ${m.tipsPainted}/${m.tips}`;
      console.log(`  ${say}`);
      if (width === 1440 && i === 0) {
        rowsAt900 = `${m.rowsInView} rows and ${m.headerCount} group headers visible at 1440×900, 1 week`;
      }

      /* ── the spine is gone, everywhere ─────────────────────────────────────────────────── */
      expect(m.spines, `${say} — the today spine is back`).toBe(0);

      /* ── groups: order, counts, no empties, nothing outside a group ────────────────────── */
      expect(m.headerCount, `${say} — no group headers`).toBeGreaterThan(0);
      expect(m.orphan, `${say} — ${m.orphan} rows sit outside every group`).toBe(0);
      const seen = m.groups.map((g) => g.name);
      expect(seen, `${say} — a header that is not one of the six`).toEqual(seen.filter((n) => ORDER.includes(n)));
      expect(seen, `${say} — the groups are out of order`).toEqual(ORDER.filter((n) => seen.includes(n)));
      for (const g of m.groups) {
        expect(g.stated, `${say} — "${g.name}" is an empty group with a header`).toBeGreaterThan(0);
        if (g.open) expect(g.drawn, `${say} — "${g.name}" says ${g.stated}, drew ${g.drawn}`).toBe(g.stated);
        else expect(g.drawn, `${say} — "${g.name}" is collapsed with ${g.drawn} rows on screen`).toBe(0);
        if (g.name === "Snoozed") expect(g.open, `${say} — Snoozed is open at rest`).toBe(false);
      }

      /* ── every row head leads with the locked component at 18 ──────────────────────────── */
      expect(m.lead.length, `${say} — no agent row heads`).toBeGreaterThan(0);
      for (const l of m.lead) {
        expect(l.tag, `${say} — a head leads with <${l.tag}>, not the component`).toBe("SPAN");
        expect(l.svg, `${say} — a head's dot has no glyph, so it is a drawing`).toBeGreaterThan(0);
        expect(l.w, `${say} — a head's dot is ${l.w}px, not 18`).toBe(18);
      }

      /* ── the past slice, and markers in it ─────────────────────────────────────────────── */
      expect(m.past, `${say} — nothing before today`).toBeGreaterThan(0);
      expect(m.past, `${say} — the past is the whole board`).toBeLessThan(m.cols);
      expect(m.today, `${say} — today is not on the board`).toBe(1);
      /* ⚠️ NON-NULL, NOT GUARDED — this is the assertion that silently skipped twenty times. */
      expect(m.markers, `${say} — no marker in view, so the past slice bought nothing`).toBeGreaterThan(0);

      /* ── captions stay hidden until asked for ──────────────────────────────────────────── */
      expect(m.tips, `${say} — no captions exist`).toBeGreaterThan(0);
      expect(m.tipsPainted, `${say} — ${m.tipsPainted} captions painted with nothing hovered`).toBe(0);

      /* ── clamped edges are borders, never masks ────────────────────────────────────────── */
      if (m.openleft) {
        expect(m.openleft, `${say} — the left clamp is not dotted`).toBe("dotted");
        expect(m.openleftMask, `${say} — the left clamp uses a mask`).toBe("none");
      }
      if (m.future) {
        expect(m.future, `${say} — the right clamp is not dashed`).toBe("dashed");
        expect(m.futureMask, `${say} — the right clamp uses a mask`).toBe("none");
      }

      /* ── the words ─────────────────────────────────────────────────────────────────────── */
      const pron = [...m.ink.matchAll(/\b(her|hers|him|his|she|he)\b/gi)].map((x) => x[0]);
      expect(pron.slice(0, 5), `${say} — ${pron.length} pronouns`).toEqual([]);
      for (const banned of ["Reply window", "Your move", "Their move", "Your turn", "overdue", "Nothing this week"]) {
        expect(m.ink.toLowerCase(), `${say} — the board says "${banned}"`).not.toContain(banned.toLowerCase());
      }
    }
  }
  console.log(`  ${rowsAt900}`);
  console.log(`console errors: ${errs.length ? errs.join(" | ") : "none"}`);
  expect(errs, "the board threw").toEqual([]);
});
