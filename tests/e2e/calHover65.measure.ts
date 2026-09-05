/**
 * CALENDAR v65 §A/§B — retire, then hover: lift and reveal, nothing else.
 * Ref: bar-hover-states.html (the matrix), pack §B overriding the ref's compact-peek row —
 * "Comfortable and Compact behave the same"; prose beats artefact where the pack names the rule.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const CAL = "/todo/calendar";

async function board(page: import("@playwright/test").Page) {
  return (await page.evaluateHandle(() =>
    [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!,
  )) as import("@playwright/test").JSHandle<HTMLElement>;
}

test("⚠️ (§A) nothing mounts on hover or click of a bar — tip, pill, pane and peek all gone", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  const bars = await page.locator(".tl-cal .tl-p[data-seg]").count();
  expect(bars, "no bars — the retirement claims are unexercised").toBeGreaterThan(5);
  const bar = page.locator(".tl-cal .tl-p[data-seg]").first();
  const b = (await bar.boundingBox())!;
  await page.mouse.move(b.x + Math.min(60, b.width / 2), b.y + b.height / 2);
  await page.waitForTimeout(300);
  const onHover = await page.evaluate(() => ({
    tip: document.querySelectorAll(".tl-tipp, [data-tip]").length,
    pill: document.querySelectorAll(".tl-sum, .tl-sumpill").length,
    peek: document.querySelectorAll(".tl-peek").length,
    pane: document.querySelectorAll(".tpn, .cal-flow, .tl-split").length,
  }));
  expect(onHover, "something mounted on hover").toEqual({ tip: 0, pill: 0, peek: 0, pane: 0 });
  /* §C gives the click its card — here the claim is that the LEGACY surfaces stay dead */
  await bar.click();
  await page.waitForTimeout(300);
  const onClick = await page.evaluate(() => ({
    pane: document.querySelectorAll(".tpn, .cal-flow, .tl-split, .tdb-ffsheet").length,
    tip: document.querySelectorAll(".tl-tipp").length,
  }));
  expect(onClick, "a legacy surface mounted on click").toEqual({ pane: 0, tip: 0 });
});

test("⚠️ (§B) hover lifts 2px up-right, reveals THE BAR'S OWN action, wakes its symbol — and changes nothing else", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  /* a bar that HAS a paired action — take one the page paired by key */
  const seg = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const acts = [...g.querySelectorAll<HTMLElement>(".tl-act[data-for]")];
    for (const a of acts) {
      const k = a.dataset.for!;
      const bar = g.querySelector<HTMLElement>(`.tl-p[data-seg="${k}"]`);
      if (bar && bar.getBoundingClientRect().width > 40) return k;
    }
    return null;
  });
  expect(seg, "no bar with a paired action — the reveal is unexercised").not.toBeNull();
  const bar = page.locator(`.tl-p[data-seg="${seg}"]`);
  const act = page.locator(`.tl-act[data-for="${seg}"]`);

  const rest = await page.evaluate((k) => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const bar2 = g.querySelector<HTMLElement>(`.tl-p[data-seg="${k}"]`)!;
    const a = g.querySelector<HTMLElement>(`.tl-act[data-for="${k}"]`)!;
    const lab = a.querySelector<HTMLElement>(".tl-actlab"), btn = a.querySelector<HTMLElement>(".tl-actbtn");
    return {
      t: getComputedStyle(bar2).transform,
      labOp: lab ? getComputedStyle(lab).opacity : null,
      btnOp: btn ? getComputedStyle(btn).opacity : null,
      frameSh: getComputedStyle(bar2.querySelector(".tl-frame")!).boxShadow,
      /* the whole row's paint census, for the nothing-else claim */
      others: [...g.querySelectorAll<HTMLElement>(".tl-act.on")].length,
    };
  }, seg);
  /* at rest: hidden action, no shadow */
  expect(rest.labOp, "the label shows at rest").toBe("0");
  expect(rest.btnOp, "the button shows at rest").toBe("0");
  expect(rest.frameSh, "a resting shadow").toBe("none");
  expect(rest.others, "an action is revealed with no pointer anywhere").toBe(0);

  const b = (await bar.boundingBox())!;
  await page.mouse.move(b.x + Math.min(60, b.width / 2), b.y + b.height / 2);
  await page.waitForTimeout(250);
  const hov = await page.evaluate((k) => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    const bar2 = g.querySelector<HTMLElement>(`.tl-p[data-seg="${k}"]`)!;
    const a = g.querySelector<HTMLElement>(`.tl-act[data-for="${k}"]`)!;
    const lab = a.querySelector<HTMLElement>(".tl-actlab"), btn = a.querySelector<HTMLElement>(".tl-actbtn");
    const sym = a.querySelector<HTMLElement>(".tl-actsym");
    return {
      t: getComputedStyle(bar2).transform,
      labOp: lab ? getComputedStyle(lab).opacity : null,
      btnOp: btn ? getComputedStyle(btn).opacity : null,
      symInk: sym ? getComputedStyle(sym).borderColor : null,
      frameSh: getComputedStyle(bar2.querySelector(".tl-frame")!).boxShadow,
      onElsewhere: [...g.querySelectorAll<HTMLElement>(".tl-act.on")].filter((x) => x.dataset.for !== k).length,
      overlays: document.querySelectorAll(".tl-peek, .tl-tipp").length,
    };
  }, seg);
  /* the lift is +2,-2 against the same centring */
  const dx = (t: string) => t.startsWith("matrix(") ? t.slice(7, -1).split(",").map(Number) : null;
  const r0 = dx(rest.t)!, r1 = dx(hov.t)!;
  expect(+(r1[4] - r0[4]).toFixed(1), "the lift's x").toBe(2);
  expect(+(r1[5] - r0[5]).toFixed(1), "the lift's y").toBe(-2);
  expect(r1[0], "hover scales the bar — the v37 lift is back").toBe(1);
  /* the reveal: the paired action only; the symbol wakes to ink */
  expect(hov.labOp, "the label did not reveal").toBe("1");
  expect(hov.btnOp, "the button did not reveal").toBe("1");
  if (hov.symInk) expect(hov.symInk, "the symbol did not wake").toContain("42, 31, 23");
  /* nothing else: no other action, no overlay, no shadow */
  expect(hov.onElsewhere, "another bar's action revealed").toBe(0);
  expect(hov.overlays, "an overlay mounted on hover").toBe(0);
  expect(hov.frameSh, "hover grew a shadow").toBe("none");
  /* leave ends it */
  await page.mouse.move(10, 400);
  await page.waitForTimeout(150);
  expect(await act.evaluate((a) => a.classList.contains("on")), "the reveal survived leave").toBe(false);
});

test("⚠️ (§B) both densities behave the same; ghosts wake to full opacity and nothing else; the pulse never waits", async ({ page }) => {
  await openRoute(page, CAL, { width: 1440, height: 900 });
  /* compact first — same lift, same reveal */
  await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    ([...g.querySelectorAll<HTMLElement>(".tl-dseg button")].find((x) => /compact/i.test(x.textContent ?? "")))!.click();
  });
  await page.waitForTimeout(200);
  const bar = page.locator(".tl-cal .tl-p[data-seg]").first();
  const b = (await bar.boundingBox())!;
  const t0 = await bar.evaluate((e) => getComputedStyle(e).transform);
  await page.mouse.move(b.x + Math.min(60, b.width / 2), b.y + b.height / 2);
  await page.waitForTimeout(200);
  const t1 = await bar.evaluate((e) => getComputedStyle(e).transform);
  const peeks = await page.evaluate(() => document.querySelectorAll(".tl-peek").length);
  const m = (t: string) => t.slice(7, -1).split(",").map(Number);
  expect(+(m(t1)[4] - m(t0)[4]).toFixed(1), "compact lift x").toBe(2);
  expect(+(m(t1)[5] - m(t0)[5]).toFixed(1), "compact lift y").toBe(-2);
  expect(peeks, "compact still peeks").toBe(0);
  /* back to comfortable; a ghost wakes to 1 and moves nothing */
  await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    ([...g.querySelectorAll<HTMLElement>(".tl-dseg button")].find((x) => /comfortable/i.test(x.textContent ?? "")))!.click();
  });
  await page.waitForTimeout(200);
  const ghost = page.locator(".tl-cal .tl-jc").first();
  if (await ghost.count()) {
    const g0 = await ghost.evaluate((e) => ({ op: getComputedStyle(e).opacity, t: getComputedStyle(e).transform }));
    const gb = (await ghost.boundingBox())!;
    await page.mouse.move(gb.x + gb.width / 2, gb.y + gb.height / 2);
    await page.waitForTimeout(200);
    const g1 = await ghost.evaluate((e) => ({ op: getComputedStyle(e).opacity, t: getComputedStyle(e).transform }));
    expect(Number(g0.op), "a ghost rests at full opacity").toBeLessThan(0.5);
    expect(g1.op, "the ghost did not wake").toBe("1");
    expect(g1.t, "a ghost LIFTED — full opacity is its whole hover").toBe(g0.t);
  } else {
    console.log("⚠️ no ghost on the fixture — the ghost branch ran on zero subjects");
  }
  /* urgent pulse present without any pointer */
  await page.mouse.move(5, 5);
  await page.waitForTimeout(120);
  const pulses = await page.evaluate(() => {
    const g = [...document.querySelectorAll<HTMLElement>(".tl-cal")].find((e) => e.getBoundingClientRect().height > 0)!;
    return [...g.querySelectorAll<HTMLElement>(".tl-pulsedot")].filter((p) => p.getBoundingClientRect().height > 0).length;
  });
  expect(pulses, "no pulse with the pointer parked — the pulse must never wait for hover").toBeGreaterThan(0);
});
