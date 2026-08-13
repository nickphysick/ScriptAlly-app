/**
 * §3 — TONE, after the box went.
 *
 * ⚠️ NOTHING WAS RE-TINTED, AND THE MEASUREMENT IS WHY. `.f12-body` never painted a fill — three
 * separate locks forbade it ("the frame must never gain a fill") — so every element's ground was
 * the white `.ws-work` BEFORE the flatten and is the same white now. Removing a border cannot
 * change what a child sits against. This file exists to keep that true: the moment the working
 * area gains a surface, every tint below it is being judged against the wrong ground, and a
 * flattening has quietly become a recolouring.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

test("§3 — tone recon", async ({ page }) => {
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  /* the takeover's own surfaces need the journey open */
  const openJourney = async () => {
    await page.getByRole("button", { name: /^Log query$/i }).first().click();
    await page.waitForTimeout(800);
  };
  console.log(await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
    const rgb = (c: string) => (c.match(/\d+/g) ?? []).slice(0, 3).map(Number);
    const lum = (c: string) => { const [r, gg, b] = rgb(c); return r === undefined ? -1 : Math.round(0.2126 * r + 0.7152 * gg + 0.0722 * b); };
    const bgOf = (el: Element | null) => {
      let n = el as HTMLElement | null;
      while (n) { const c = getComputedStyle(n).backgroundColor; if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c; n = n.parentElement; }
      return "none";
    };
    const report = (sel: string, label: string) => {
      const el = g.querySelector(sel) as HTMLElement | null;
      if (!el) return `${label} (${sel}): ABSENT`;
      const c = getComputedStyle(el);
      const own = c.backgroundColor;
      const ground = bgOf(el.parentElement);
      return `${label} (${sel}): own ${own === "rgba(0, 0, 0, 0)" ? "transparent" : own}${own !== "rgba(0, 0, 0, 0)" ? ` L${lum(own)}` : ""} · on ${ground} L${lum(ground)} · border ${c.borderTopWidth} ${c.borderTopColor} / bottom ${c.borderBottomWidth} ${c.borderBottomColor}`;
    };
    return [
      report(".f12-body", "working area"),
      report(".f12-list", "list column"),
      report(".f12-row:not(.f12-sel)", "list row (RESTING)"),
      report(".f12-row:not(.f12-sel):hover", "list row (hover rule exists?)"),
      report(".f12-row.f12-sel", "list row (selected)"),
      report(".f12-lsearch", "list search field"),
      report(".f12-pill", "filter/sort pill"),
      report(".f12-lhtitle", "list head"),
      report(".f12-ctl", "toolbar"),
      report(".f12-hero", "agent hero"),
      report(".f12-card", "sage-headed card"),
      report(".f12-chh", "sage header band"),
      report(".qc-sec", "collapsed step row"),
      report(".qc-ref", "glance panel"),
    ].join("\n");
  }));

  await openJourney();
  console.log("\n── takeover ──\n" + await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
    const lum = (c: string) => { const m = (c.match(/\d+/g) ?? []).slice(0, 3).map(Number); return m[0] === undefined ? -1 : Math.round(0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]); };
    const bgOf = (el: Element | null) => { let n = el as HTMLElement | null; while (n) { const c = getComputedStyle(n).backgroundColor; if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c; n = n.parentElement; } return "none"; };
    const rep = (sel: string, label: string) => {
      const el = g.querySelector(sel) as HTMLElement | null;
      if (!el) return `${label} (${sel}): ABSENT`;
      const c = getComputedStyle(el);
      return `${label} (${sel}): own ${c.backgroundColor} L${lum(c.backgroundColor)} · on ${bgOf(el.parentElement)} L${lum(bgOf(el.parentElement))} · border ${c.borderTopWidth} ${c.borderTopColor}`;
    };
    return [rep(".qc-sec", "collapsed step row"), rep(".qc-stack", "step stack"), rep(".qc-pick", "quick pick"),
            rep(".qc-pickfield", "picker field"), rep(".qch", "journey header")].join("\n");
  }));

  /* ══ the gate ══════════════════════════════════════════════════════════════════════════════ */
  await openRoute(page, "/queries", { width: 1440, height: 900 });
  const tone = await page.evaluate(() => {
    const g = [...document.querySelectorAll(".wpg")].find((x) => x.getBoundingClientRect().height > 0) as HTMLElement;
    const L = (c: string) => { const m = (c.match(/\d+/g) ?? []).slice(0, 3).map(Number); return m[0] === undefined ? -1 : 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
    const el = (s: string) => g.querySelector(s) as HTMLElement | null;
    const groundOf = (n0: HTMLElement | null) => { let n = n0; while (n) { const c = getComputedStyle(n).backgroundColor; if (c !== "rgba(0, 0, 0, 0)" && c !== "transparent") return c; n = n.parentElement; } return "rgb(255,255,255)"; };
    const sel = el(".f12-row.f12-sel");
    const rest = el(".f12-row:not(.f12-sel)");
    return {
      bodyFill: getComputedStyle(el(".f12-body")!).backgroundColor,
      restingRowSeam: rest ? getComputedStyle(rest).borderBottomWidth : "none",
      selLift: sel ? Math.abs(L(getComputedStyle(sel).backgroundColor) - L(groundOf(sel.parentElement))) : -1,
      keptRims: [".f12-hero", ".f12-card"].map((s) => { const e = el(s); return e ? getComputedStyle(e).borderTopWidth : "ABSENT"; }),
    };
  });
  console.log("\n── gate ──\n" + JSON.stringify(tone));
  /* ⚠️ THE ONE THAT MATTERS. A fill here changes the ground under every tint on the page. */
  expect(tone.bodyFill, "the working area gained a surface — every tint below it is now judged against the wrong ground")
    .toBe("rgba(0, 0, 0, 0)");
  expect(tone.restingRowSeam, "resting rows lost the hairline that separates them — with no card around them there is nothing else").toBe("1px");
  expect(tone.selLift, "the selected row no longer separates from the page").toBeGreaterThan(10);
  expect(tone.keptRims, "a real object lost its container — those are the boundaries that MEAN something").toEqual(["1px", "1px"]);
});
