/**
 * CALENDAR v64 ADDENDUM — masthead CTA, no action strip.
 *
 * §1 The action strip is deleted; the container starts at the masthead's standard gap and its
 *    bottom bound is unchanged (calFid63 item 2 owns the 24px). §2 `New task` is the masthead
 *    CTA, in the CTA style the other pages use (Query Centre's `Log new query` is the
 *    reference), opening the To-do list's own composer through the `sa.todoCompose` one-shot.
 *    §D the calendar's masthead against the To-do list page's — same elements, same readings.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

test("⚠️ (§1) no strip — nothing between the masthead and the container but the chassis's one gap", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const cal = await page.evaluate(() => {
    const wsh = [...document.querySelectorAll<HTMLElement>(".wsh")].find((e) => e.getBoundingClientRect().height > 0)!;
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const wb = wsh.getBoundingClientRect(), gb = g.getBoundingClientRect();
    /* every rendered element whose box sits wholly between the masthead's bottom and the
       container's top — the strip used to be exactly this.
       ⚠️ `.wpg-reclaim` IS the spec gap: margins collapse, so the grid's gap is an ELEMENT (the
       masthead format's own law) — it is the one thing allowed to stand here. */
    const between = [...document.querySelectorAll<HTMLElement>("body *")].filter((e) => {
      const b = e.getBoundingClientRect();
      return b.height > 1 && b.top >= wb.bottom - 0.5 && b.bottom <= gb.top + 0.5
        && b.width > 40 && !e.contains(g) && !g.contains(e) && !e.contains(wsh)
        && !e.classList.contains("wpg-reclaim");
    }).map((e) => String(e.className).slice(0, 30));
    /* ⚠️ THE STRIP SWEEP IS SCOPED TO THIS PAGE'S OWN ROOT — every workspace page stays MOUNTED,
       and the task pane legitimately says "Add a note for your file" on a hidden surface. */
    const root = g.closest(".cal-timeline") ?? g;
    return { gap: +(gb.top - wb.bottom).toFixed(1), between: [...new Set(between)],
      tools: root.querySelectorAll(".tpl-tools").length,
      strip: (root.textContent ?? "").includes("Go to to-do list") };
  });
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  const todo = await page.evaluate(() => {
    const wsh = [...document.querySelectorAll<HTMLElement>(".wsh")].find((e) => e.getBoundingClientRect().height > 0)!;
    /* the To-do list's first CONTENT after its masthead is its own column (`.tdb-centre`) — the
       list passes no toolbar either, so both pages show the bare chassis gap */
    const first = [...document.querySelectorAll<HTMLElement>(".tdb-centre")].find((e) => e.getBoundingClientRect().height > 0);
    return first ? +(first.getBoundingClientRect().top - wsh.getBoundingClientRect().bottom).toFixed(1) : null;
  });
  console.log(`calendar gap ${cal.gap} · to-do list gap ${todo} · between ${JSON.stringify(cal.between)}`);
  expect(cal.strip, "the action strip's words are still on the calendar").toBe(false);
  expect(cal.tools, "the calendar still renders a toolbar row").toBe(0);
  expect(cal.between, `something stands between the masthead and the container: ${JSON.stringify(cal.between)}`).toEqual([]);
  /* the spec gap is the CHASSIS's, not a number typed here: the same slot spacing the To-do list
     puts between its masthead and its first row */
  expect(todo, "the To-do list gave no gap to compare").not.toBeNull();
  expect(Math.abs(cal.gap - todo!), `the calendar's gap ${cal.gap} vs the chassis's ${todo}`).toBeLessThanOrEqual(1);
});

test("⚠️ (§2) `New task` wears the masthead CTA set — measured against Query Centre's, never literals", async ({ page }) => {
  const read = () => page.evaluate(() => {
    const wsh = [...document.querySelectorAll<HTMLElement>(".wsh")].find((e) => e.getBoundingClientRect().height > 0)!;
    const cta = wsh.querySelector<HTMLElement>(".wsh-cta");
    if (!cta) return null;
    const cs = getComputedStyle(cta);
    return { label: cta.textContent?.trim(),
      set: [cs.backgroundColor, cs.borderTopWidth, cs.borderTopColor, cs.borderRadius,
        cs.padding, cs.fontSize, cs.fontWeight, cs.color, cs.fontFamily].join(" | ") };
  });
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const qc = await read();
  expect(qc, "Query Centre renders no CTA — the reference is gone").not.toBeNull();
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const cal = await read();
  expect(cal, "the calendar renders no masthead CTA").not.toBeNull();
  expect(cal!.label, "the CTA is not `New task`").toBe("New task");
  expect(cal!.set, "the CTA's computed set differs from the reference").toBe(qc!.set);
});

test("⚠️ (§2) the CTA opens the To-do list's OWN composer, in task mode", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  await page.locator(".wsh-cta", { hasText: "New task" }).evaluate((e) => (e as HTMLElement).click());
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({
    path: location.pathname,
    composer: !!document.querySelector(".tdb-nc.tdb-nc--task"),
    /* the one-shot is SPENT — a gesture, not an address */
    key: (() => { try { return sessionStorage.getItem("sa.todoCompose"); } catch { return "unreadable"; } })(),
  }));
  expect(r.path, "the CTA did not land on the To-do list").toBe("/todo");
  expect(r.composer, "the task composer did not open").toBe(true);
  expect(r.key, "the one-shot key survived its own use").toBeNull();
});

test("⚠️ (§D) the masthead difference list — calendar against the To-do list page", async ({ page }) => {
  const profile = () => page.evaluate(() => {
    const wsh = [...document.querySelectorAll<HTMLElement>(".wsh")].find((e) => e.getBoundingClientRect().height > 0)!;
    const el = (sel: string) => {
      const e = sel === ".wsh" ? wsh : wsh.querySelector<HTMLElement>(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect(); const s = getComputedStyle(e);
      return { w: +b.width.toFixed(1), h: +b.height.toFixed(1),
        bw: s.borderTopWidth, bg: s.backgroundColor,
        ff: (s.fontFamily || "").split(",")[0].replace(/["']/g, ""), fs: s.fontSize, fw: s.fontWeight };
    };
    return { wsh: el(".wsh"), rule: el(".wsh-toprule"), row: el(".wsh-row"),
      title: el(".wsh-title"), sub: el(".wsh-sub"), cta: el(".wsh-cta") };
  });
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const cal = await profile();
  await openRoute(page, "/todo", { width: 1440, height: 900 });
  const todo = await profile();
  /* ⚠️ NAMED DIFFERENCES, LISTED EVERY RUN: the CTA (the calendar's page primary — the To-do
     list's `Add a task` is its list's own control), and the row/wsh heights it grows by — the
     40.3px pill exceeds the 37.1px title line on a description-less masthead, and the format's
     row is max(children); described pages absorb it (Manuscripts with and without a CTA measure
     identically). Everything else must be EQUAL. */
  const entries: string[] = [];
  const named: string[] = [];
  for (const k of ["wsh", "rule", "row", "title", "sub", "cta"] as const) {
    const a = cal[k], b = todo[k];
    if (k === "cta") { named.push(`cta: ${a ? "present (page primary)" : "absent"} vs ${b ? "present" : "absent — Add a task is the list's own control"}`); continue; }
    if (!a && !b) { named.push(`${k}: absent on both`); continue; }
    if (!a || !b) { entries.push(`${k}: present on ${a ? "calendar only" : "to-do only"}`); continue; }
    for (const p of Object.keys(a) as (keyof typeof a)[]) {
      const va = a[p], vb = b[p];
      const differs = typeof va === "number" && typeof vb === "number"
        ? Math.abs(va - vb) > 1 : String(va) !== String(vb);
      if (!differs) continue;
      if ((k === "wsh" || k === "row") && p === "h") {
        named.push(`${k}.h ${va} vs ${vb} — the CTA pill exceeds the title line on a description-less masthead`);
        continue;
      }
      if (k === "title" && p === "w") {
        named.push(`title.w ${va} vs ${vb} — the CTA shares the row, and the title's flex basis gives it the room`);
        continue;
      }
      entries.push(`${k}.${p}: cal ${va} vs todo ${vb}`);
    }
  }
  console.log("── masthead diff (calendar vs to-do list) ──");
  for (const e of entries) console.log("  " + e);
  console.log("── named ──");
  for (const n of named) console.log("  " + n);
  expect(cal.title, "no calendar masthead measured").not.toBeNull();
  expect(entries, `the mastheads differ beyond the named set: ${JSON.stringify(entries)}`).toEqual([]);
});
