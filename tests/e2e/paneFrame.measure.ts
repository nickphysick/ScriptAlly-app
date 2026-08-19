/**
 * THE PAGE FRAME — §3/§4's assertions, plus Phase 1's [object Object], measured on a real page.
 *
 * ⚠️ COLLECTS RATHER THAN THROWS — one run yields the whole red picture. Every probe is scoped to
 * the visible page (`offsetParent !== null`); seven other pages stay mounted.
 */
import { test, expect } from "@playwright/test";
import { ensureSignedIn } from "./measure";
import { writeFileSync } from "node:fs";

type R = { id: string; ok: boolean; note: string };

const JOURNEYS: { key: string; row: RegExp; enters: boolean }[] = [
  { key: "close",  row: /^Log the close/,                          enters: true  },
  { key: "send",   row: /^Send your full/,                         enters: true  },
  { key: "decide", row: /^Answer the offer/,                       enters: true  },
  { key: "note",   row: /^Nudge /,                                 enters: true  },
  { key: "bulk",   row: /queries have no record of what you sent/, enters: false },
];

test("page frame", async ({ page }) => {
  const out: R[] = [];
  const add = (id: string, ok: boolean, note = "") => out.push({ id, ok, note });
  await ensureSignedIn(page);

  /* ── frame geometry at 1440 ─────────────────────────────────────────────────────────────── */
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/todo");
  await page.waitForTimeout(7000);

  const frame = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const w = (el: Element | null) => (el ? Math.round((el as HTMLElement).getBoundingClientRect().width) : -1);
    const list = [...document.querySelectorAll(".tdg")].find(vis) ?? null;
    const listCard = list ? (list.closest("[class*='tdw-rail'], [class*='tdw-']") ?? list) : null;
    const pane = [...document.querySelectorAll(".tdk-w")].find(vis) ?? null;
    const doc = document.documentElement;
    /* ellipsised list rows: deed or agent line clipped */
    const clippedRows = [...document.querySelectorAll(".tdg-t, .tdg-sub")].filter((e) => {
      const el = e as HTMLElement;
      if (!vis(el)) return false;
      const c = getComputedStyle(el);
      return (c.textOverflow === "ellipsis" && el.scrollWidth > el.clientWidth + 1)
          || el.scrollWidth > el.clientWidth + 2;
    }).map((e) => (e.textContent ?? "").trim().slice(0, 36));
    return {
      list: w(list), listCard: w(listCard), pane: w(pane),
      hScroll: doc.scrollWidth - doc.clientWidth,
      clippedRows,
    };
  });
  add("F1 list card is 372 ± 2", Math.abs(frame.listCard - 372) <= 2, `list=${frame.list} listCard=${frame.listCard}`);
  add("F2 task pane ≥ 900 (brief) — see report for the honest ceiling", frame.pane >= 900, `pane=${frame.pane}`);
  add("F3 no horizontal scrollbar on documentElement", frame.hScroll <= 0, `overflowX=${frame.hScroll}px`);
  add("F4 no list row deed/agent line ellipsised", frame.clippedRows.length === 0, JSON.stringify(frame.clippedRows));

  /* ── per-journey: [object Object], containers, tiles ────────────────────────────────────── */
  for (const j of JOURNEYS) {
    await page.goto("/todo");
    await page.waitForTimeout(6500);
    const picked = await page.evaluate((src) => {
      const rx = new RegExp(src);
      const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
      const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
        .find((r) => rx.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
      if (row) (row as HTMLElement).click();
      return !!row;
    }, j.row.source);
    if (!picked) { add(`${j.key}: reachable`, false, "no card"); continue; }
    await page.waitForTimeout(1400);

    /* the card state FIRST (tiles live here) */
    const cardState = await page.evaluate(() => {
      const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
      const pane = [...document.querySelectorAll(".tdk-w")].find(vis) as HTMLElement | undefined;
      if (!pane) return null;
      const tiles = [...pane.querySelectorAll(".tdk-tile")].filter(vis) as HTMLElement[];
      return {
        objectObject: /\[object /.test(pane.innerText || ""),
        tiles: tiles.length,
        tileTops: [...new Set(tiles.map((t) => Math.round(t.getBoundingClientRect().top)))],
      };
    });
    if (!cardState) { add(`${j.key}: pane`, false, "no pane"); continue; }
    add(`P1 ${j.key} · no [object Object] anywhere in the pane`, !cardState.objectObject,
        cardState.objectObject ? "FOUND" : "clean");
    if (["close", "send", "decide"].includes(j.key)) {
      add(`T1 ${j.key} · all tiles share one offsetTop (one row)`,
          cardState.tiles > 0 && cardState.tileTops.length === 1,
          `tiles=${cardState.tiles} tops=${JSON.stringify(cardState.tileTops)}`);
    }

    if (j.enters) {
      await page.evaluate(() => {
        const b = [...document.querySelectorAll("[class*='tdk-'] button")]
          .find((x) => /^(Record|Action|Close|Send|Mark|Log)/.test((x.textContent ?? "").trim()));
        (b as HTMLElement | undefined)?.click();
      });
      await page.waitForTimeout(1400);
      const inJourney = await page.evaluate(() => {
        const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
        const pane = [...document.querySelectorAll(".tdk-w")].find(vis) as HTMLElement | undefined;
        if (!pane) return null;
        const form = pane.querySelector(".tdk-jform") as HTMLElement | null;
        const story = pane.querySelector(".tdk-story--card") as HTMLElement | null;
        const box = (e: HTMLElement | null) => (e ? { w: Math.round(e.getBoundingClientRect().width), top: Math.round(e.getBoundingClientRect().top) } : null);
        return { objectObject: /\[object /.test(pane.innerText || ""), form: box(form), story: box(story) };
      });
      if (inJourney) {
        add(`P1 ${j.key} · no [object Object] in the journey`, !inJourney.objectObject,
            inJourney.objectObject ? "FOUND" : "clean");
        if (["close", "send", "decide"].includes(j.key) && inJourney.form && inJourney.story) {
          add(`J1 ${j.key} · form and timeline side by side at 1440 (same offsetTop)`,
              inJourney.form.top === inJourney.story.top,
              `form=${JSON.stringify(inJourney.form)} story=${JSON.stringify(inJourney.story)}`);
          add(`J2 ${j.key} · timeline 300 ± 2 and form ≥ 420`,
              Math.abs(inJourney.story.w - 300) <= 2 && inJourney.form.w >= 420,
              `story.w=${inJourney.story.w} form.w=${inJourney.form.w}`);
          add(`J3 ${j.key} · neither card is 0px`,
              inJourney.form.w > 0 && inJourney.story.w > 0,
              `form=${inJourney.form.w} story=${inJourney.story.w}`);
        }
      }
    }
  }

  /* ── 390: stacked, nothing overflows ────────────────────────────────────────────────────── */
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/todo");
  await page.waitForTimeout(6500);
  await page.evaluate(() => {
    const vis = (e: Element) => (e as HTMLElement).offsetParent !== null;
    const row = [...document.querySelectorAll(".tdg-row")].filter(vis)
      .find((r) => /^Log the close/.test((r.querySelector(".tdg-t")?.textContent ?? "").trim()));
    (row as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(1200);
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("[class*='tdk-'] button")]
      .find((x) => /^(Close)/.test((x.textContent ?? "").trim()));
    (b as HTMLElement | undefined)?.click();
  });
  await page.waitForTimeout(1400);
  const narrow = await page.evaluate(() => {
    const vis = (e: Element | null) => !!e && (e as HTMLElement).offsetParent !== null;
    const pane = [...document.querySelectorAll(".tdk-w")].find(vis) as HTMLElement | undefined;
    const form = pane?.querySelector(".tdk-jform") as HTMLElement | null;
    const story = pane?.querySelector(".tdk-story--card") as HTMLElement | null;
    const doc = document.documentElement;
    const top = (e: HTMLElement | null) => (e ? Math.round(e.getBoundingClientRect().top) : -1);
    const w = (e: HTMLElement | null) => (e ? Math.round(e.getBoundingClientRect().width) : -1);
    return { formTop: top(form), storyTop: top(story), formW: w(form), storyW: w(story),
             hScroll: doc.scrollWidth - doc.clientWidth };
  });
  add("N1 390 · form and timeline stacked (different offsetTop)",
      narrow.formTop !== -1 && narrow.storyTop !== -1 && narrow.formTop !== narrow.storyTop,
      `formTop=${narrow.formTop} storyTop=${narrow.storyTop}`);
  add("N2 390 · neither overflows and neither is 0px",
      narrow.hScroll <= 0 && narrow.formW > 0 && narrow.storyW > 0,
      `hScroll=${narrow.hScroll} formW=${narrow.formW} storyW=${narrow.storyW}`);

  const red = out.filter((r) => !r.ok);
  const lines = [`── page frame · ${out.length} assertions · ${red.length} RED · ${out.length - red.length} green`];
  for (const r of out) lines.push(`  ${r.ok ? "green" : "RED  "}  ${r.id}\n           ${r.note}`);
  const report = lines.join("\n");
  writeFileSync(process.env.SA_FRAME_OUT ?? "run-artifacts/pane-frame.txt", report);
  console.log("\n" + report + "\n");
  expect(red, `${red.length} red`).toHaveLength(0);
});
