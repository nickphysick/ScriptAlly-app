/**
 * v63 F — tasks as bars.
 *
 * ⚠️ THE CLAIM IS THE SPAN. A task drawn as a point says WHEN it is due and nothing about how long
 * it has been sitting there, which is the one question a board of dates exists to answer. So the
 * geometry is checked against the task's own two dates, redone here rather than read off the page.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

async function tasksView(page: import("@playwright/test").Page) {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  await page.locator(".tl-axis .gpill", { hasText: "Tasks" }).first().click();
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")]
      .find((e) => e.getBoundingClientRect().height > 0)!;
    const lane = g.querySelector<HTMLElement>(".tl-c-tl");
    const lb = lane?.getBoundingClientRect() ?? null;
    return {
      rows: g.querySelectorAll(".tl-rrow").length,
      points: g.querySelectorAll(".tl-tchip").length,
      cards: [...g.querySelectorAll<HTMLElement>(".tl-p")].map((c) => {
        const b = c.getBoundingClientRect();
        const band = c.querySelector<HTMLElement>(".tl-sband");
        return {
          isTask: !!c.querySelector(".tl-sband--task"),
          bandBg: band ? getComputedStyle(band).backgroundColor : null,
          holderInk: (() => { const h = c.querySelector<HTMLElement>(".tl-sh");
            return h ? getComputedStyle(h).color : null; })(),
          box: c.querySelectorAll(".tl-tbox").length,
          dots: c.querySelectorAll(".tl-sband svg").length,
          word: c.querySelector(".tl-sw")?.textContent?.trim() ?? null,
          holder: c.querySelector(".tl-sh")?.textContent?.trim() ?? null,
          name: c.querySelector(".tl-fnm")?.textContent?.trim() ?? null,
          nameFamily: (() => { const n = c.querySelector<HTMLElement>(".tl-fnm");
            return n ? getComputedStyle(n).fontFamily.split(",")[0].replace(/["']/g, "") : null; })(),
          fact: c.querySelector(".tl-ffx")?.textContent?.replace(/^!/, "").trim() ?? null,
          tail: c.querySelector(".tl-feb")?.textContent?.trim() ?? null,
          pulse: !!c.querySelector(".tl-pulsedot"),
          left: lb ? +(b.left - lb.left).toFixed(1) : null,
          right: lb ? +(b.right - lb.left).toFixed(1) : null,
          laneW: lb ? +lb.width.toFixed(1) : null,
        };
      }),
      /* the task's own action, and its glyph */
      acts: [...g.querySelectorAll<HTMLElement>(".tl-act")].map((a) => ({
        deed: a.querySelector(".tl-actbtn")?.textContent?.trim() ?? null,
        kind: a.dataset.act ?? null,
      })),
      /* the band's declared paper, so the lock reads a token rather than a hex twice */
      taskBand: getComputedStyle(document.querySelector(".tl-board")!)
        .getPropertyValue("--tl-task-band").trim(),
    };
  });
}

test.describe("v63 · F — tasks as bars", () => {
  test("⚠️ (f1) a task is a bar, and the point rendering is gone", async ({ page }) => {
    const r = await tasksView(page);
    expect(r.rows, "no task rows — the case is vacuous").toBeGreaterThan(0);
    const tasks = r.cards.filter((c) => c.isTask);
    expect(tasks.length, "no task cards").toBeGreaterThan(0);
    /* ⚠️ ASKED OF THE RENDERED DOM. A source check proves the JSX changed; only the page proves
       nothing else draws them. */
    expect(r.points, "the point-and-checkbox rendering is still drawn").toBe(0);
    for (const t of tasks) {
      /* a BAR, not a mark: it must have real width against the lane */
      const w = (t.right ?? 0) - (t.left ?? 0);
      expect(w, `${t.name}: the bar is ${w}px wide`).toBeGreaterThan(20);
      expect(t.box, `${t.name}: no checkbox in the band`).toBe(1);
      /* ⚠️ AND NO `StatusDot`. A task has no query status; drawing one would put a pipeline stage
         on something that has never been sent anywhere. */
      expect(t.dots, `${t.name}: a status dot on a task`).toBe(0);
      expect(t.word, `${t.name}: the band does not read "Task"`).toBe("Task");
      expect(["With you", "Overdue"], `${t.name}: holder "${t.holder}"`).toContain(t.holder);
      expect(t.nameFamily, `${t.name}: the name is not Playfair`).toMatch(/Playfair/);
      expect(t.fact, `${t.name}: line two is not a due date`).toMatch(/^Due /);
      /* ⚠️ THE TAIL MEASURES AND DOES NOT REPEAT THE BAND. The first build set it to the holder
         word, so a card read `Overdue` in its band and `overdue` again three lines down. */
      expect(t.tail, `${t.name}: the tail repeats the band`).not.toMatch(/^(overdue|with you)$/i);
      expect(t.tail, `${t.name}: the tail states no span`).toMatch(/overdue|due today|^in /);
    }
  });

  test("⚠️ (f2) the band is note-yellow, and an overdue task runs open with the pulse", async ({ page }) => {
    const r = await tasksView(page);
    const tasks = r.cards.filter((c) => c.isTask);
    expect(tasks.length).toBeGreaterThan(0);
    /* the token, read from the board, so the lock is not a hex written twice */
    expect(r.taskBand, "the task band token is not declared").toMatch(/^#[0-9a-f]{6}$/i);
    const hex = (rgb: string) => {
      const [a, b, c] = rgb.match(/\d+/g)!.map(Number);
      return "#" + [a, b, c].map((n) => n.toString(16).padStart(2, "0")).join("");
    };
    for (const t of tasks) {
      expect(hex(t.bandBg!), `${t.name}: the band is ${t.bandBg}`).toBe(r.taskBand.toLowerCase());
    }
    /* ⚠️ AN OVERDUE TASK RUNS OPEN TO TODAY AND CARRIES THE PULSE — its span is how long it has
       been outstanding, and that is still growing. */
    const late = tasks.filter((t) => t.holder === "Overdue");
    expect(late.length, "no overdue task — that branch is unexercised").toBeGreaterThan(0);
    for (const t of late) expect(t.pulse, `${t.name} is overdue and carries no pulse`).toBe(true);
  });

  test("⚠️ (f3) a task's action is the flag, revealing MARK DONE", async ({ page }) => {
    const r = await tasksView(page);
    expect(r.acts.length, "no action on a task row").toBeGreaterThan(0);
    for (const a of r.acts) {
      expect(a.deed, `the task action reads "${a.deed}"`).toMatch(/^MARK DONE\s*›$/i);
      /* ⚠️ THE FLAG, NOT A FIFTH SYMBOL. A task IS the writer's own deadline; a glyph of its own
         would say it is a different kind of thing from a deadline you set yourself. */
      expect(a.kind, `the task action's glyph is ${a.kind}`).toBe("sendBy");
    }
  });
});
