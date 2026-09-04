/**
 * v60c Phases 3–4 — the in-card trail, and the past stages.
 *
 * ⚠️ THE POPULATIONS DIFFER BY AN ORDER OF MAGNITUDE AND BOTH ARE REPORTED. Every card carries a
 * trail; the harness account holds in-window history on ONE row. So the trail's claim is asserted
 * over the whole board, and the stage's RENDERING is asserted over what exists while its GRAMMAR —
 * the part that could be wrong in a thousand ways — is exhausted in `stageSentence.test.ts`. A
 * rendered sweep of one row would be a monoculture wearing a census's clothes.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

test.describe("v60c · the trail", () => {
  test("⚠️ the fill ends on today — or on the card's end, whichever comes first", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const line = document.querySelector<HTMLElement>(".tl-todayline");
      const todayX = line ? line.getBoundingClientRect().left : null;
      const out: { name: string; sec: string; want: number; got: number; cardR: number; tone: string; trackR: number }[] = [];
      for (const c of document.querySelectorAll<HTMLElement>(".tl-p")) {
        const r = c.getBoundingClientRect();
        if (r.height < 1 || todayX == null) continue;
        const fill = c.querySelector<HTMLElement>(".tl-ctrail");
        const track = c.querySelector<HTMLElement>(".tl-ctrack");
        if (!fill || !track) continue;
        out.push({
          name: c.querySelector(".tl-fnm")?.textContent ?? "?",
          sec: (c.closest(".tl-grp") as HTMLElement | null)?.dataset.sec ?? "",
          /* ⚠️ THE CLAIM IS `min(today, the card's end)`, NOT "today". A card that ended in the
             past is a finished wait: its trail is full, and asserting it against today would fail
             on every closed row for being correct. */
          want: Math.min(todayX, r.right),
          got: fill.getBoundingClientRect().right,
          cardR: r.right,
          tone: getComputedStyle(fill).backgroundColor,
          trackR: track.getBoundingClientRect().right,
        });
      }
      return out;
    });
    expect(f.length, "no card carries a trail").toBeGreaterThan(5);
    /* ⚠️ BOTH BRANCHES ENTERED, or the claim cannot discriminate: a board where every card runs to
       today would pass a "fill ends at today" check that a closed row would break. */
    const running = f.filter((c) => Math.abs(c.cardR - Math.max(...f.map((x) => x.want))) < 400 && c.cardR >= c.want - 2);
    const finished = f.filter((c) => c.cardR < c.want + 2 && c.cardR < 800);
    expect(f.filter((c) => c.cardR > c.want + 2).length + f.filter((c) => c.cardR <= c.want + 2).length)
      .toBe(f.length);
    expect(finished.length, "no finished card — the min() half is untested").toBeGreaterThan(0);
    expect(running.length, "no running card — the today half is untested").toBeGreaterThan(0);
    for (const c of f) {
      expect(Math.abs(c.got - c.want),
        `${c.name}'s trail ends ${Math.round((c.got - c.want) * 10) / 10}px from where it should`)
        .toBeLessThanOrEqual(2);
      /* the track stops short of the card's end — a gauge inside the card, not a second border */
      expect(c.trackR, `${c.name}'s track runs to the card's edge`).toBeLessThan(c.cardR - 6);
    }
    /* ⚠️ THE TONE IS THE SECTION'S, so a trail cannot disagree with the section it is drawn in.
       Distinct tones across sections is what proves it reads the token rather than a constant. */
    const bySec = new Map<string, Set<string>>();
    for (const c of f) {
      const s = bySec.get(c.sec) ?? new Set<string>();
      s.add(c.tone); bySec.set(c.sec, s);
    }
    for (const [sec, tones] of bySec) {
      expect(tones.size, `${sec} draws ${tones.size} trail tones`).toBe(1);
    }
    expect(bySec.size, "only one section on the board — the per-section claim is untested")
      .toBeGreaterThan(1);
    const all = new Set([...bySec.values()].map((s) => [...s][0]));
    expect(all.size, `${bySec.size} sections share ${all.size} trail tone(s)`).toBe(bySec.size);
  });
});

test.describe("v60c · past stages", () => {
  test("⚠️ a past stage is dotted, drained and sentenced — population REPORTED, not assumed", async ({ page }) => {
    await openRoute(page, CAL, { width: 1440, height: 900 });
    const f = await page.evaluate(() => {
      const rows: { row: string; stages: { w: number; stage: string; sentence: string; dot: boolean; op: number; bd: string; sh: string }[] }[] = [];
      let marks = 0;
      for (const r of document.querySelectorAll<HTMLElement>(".tl-rrow")) {
        if (r.getBoundingClientRect().height < 1) continue;
        marks += r.querySelectorAll(".tl-mk2").length;
        const jc = [...r.querySelectorAll<HTMLElement>(".tl-jc")];
        if (!jc.length) continue;
        rows.push({
          row: r.querySelector(".tl-fnm")?.textContent ?? "?",
          stages: jc.map((e) => {
            const med = e.querySelector<HTMLElement>(".tl-jmed");
            const cs = getComputedStyle(e);
            return {
              w: e.getBoundingClientRect().width,
              stage: e.querySelector(".tl-js")?.textContent ?? "",
              sentence: e.querySelector(".tl-jd")?.textContent ?? "",
              dot: !!med?.querySelector("svg"),
              op: med ? Number(getComputedStyle(med).opacity) : 1,
              bd: cs.borderStyle, sh: cs.boxShadow,
            };
          }),
        });
      }
      return { rows, marks };
    });
    const stages = f.rows.flatMap((r) => r.stages);
    /* ⚠️ THE COUNT IS PRINTED WHETHER OR NOT IT PASSES. This account holds one in-window stage; a
       green here means "the one that exists behaves", and saying so is the point. The grammar is
       exhausted in `stageSentence.test.ts` over 1,500+ pairs, which is where the real coverage is. */
    console.log(`past stages rendered: ${stages.length} on ${f.rows.length} row(s); ${f.marks} prior marks on the board`);
    expect(f.marks, "no prior events at all — nothing could produce a stage").toBeGreaterThan(0);
    expect(stages.length, "no past stage rendered").toBeGreaterThan(0);
    for (const s of stages) {
      expect(s.bd, "a past stage is not dotted").toBe("dotted");
      expect(s.sh, "a past stage is lifted — history is settled, not present").toBe("none");
      expect(s.dot, "a past stage has no StatusDot").toBe(true);
      /* drained, not removed: the glyph still says which status the stage WAS */
      expect(s.op, `a past stage's badge sits at ${s.op}`).toBeLessThan(0.4);
      expect(s.op, "a past stage's badge is invisible rather than drained").toBeGreaterThan(0);
      expect(s.stage.length, "a past stage has no name").toBeGreaterThan(2);
      expect(s.sentence, `a stage reads "${s.sentence}"`).toMatch(/\b(after|in|No reply in|Lasted)\b/);
      /* ⚠️ AND IT IS WIDE ENOUGH TO BE ONE. Before the day-gate, two of three stages rendered 2px
         wide with a 54px badge hanging off them — narrower than their own dotted border. */
      expect(s.w, `a stage is ${Math.round(s.w)}px wide`).toBeGreaterThan(40);
    }
  });
});
