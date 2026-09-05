/**
 * THE DIFFERENCE LIST — the gate the locks cannot be.
 *
 * ⚠️ A LOCK ASSERTS WHAT SOMEBODY THOUGHT TO ASSERT. This renders the ref and dev at the same
 * viewport and compares the same readings from both, so a difference nobody anticipated still
 * shows up. If a lock passes and this reports a difference, the lock is wrong and the screen is
 * right — dev must look like the ref.
 *
 * ⚠️ AND IT REPORTS RATHER THAN THROWS. A thrown assertion stops at the first difference and hides
 * the rest; the whole point is the LIST. It prints every difference with both readings and the run
 * fails at the end if the list is non-empty for the elements the section owns.
 */
import { test, expect } from "@playwright/test";
import { openRoute } from "./measure";

const REF = "file:///Users/nickphysick/ScriptAlly-app/design-refs/timeline-v64.html";

/** the readings both surfaces can answer, taken the same way from each */
const PROBE = `(() => {
  const isRef = !!document.querySelector('#rows .card');
  const S = isRef
    ? { card: '#rows .card', band: '.sseg', dot: '.sseg svg', word: '.sseg .sw', holder: '.sseg .sh',
        name: '.fnm', agency: '.fag', fact: '.ffx', tail: '.feb', row: '#rows .row', bang: '.bang' }
    : { card: '.tl-p', band: '.tl-sband', dot: '.tl-sband svg', word: '.tl-sw', holder: '.tl-sh',
        name: '.tl-fnm', agency: '.tl-fag', fact: '.tl-ffx', tail: '.tl-feb', row: '.tl-rrow', bang: '.tl-bang' };
  const root = isRef ? document : ([...document.querySelectorAll('.tl-cal')].find(e => e.getBoundingClientRect().height > 0) || document);
  const one = (sel) => root.querySelector(sel);
  const px = (e, p) => e ? getComputedStyle(e)[p] : null;
  const num = (v) => v == null ? null : Math.round(parseFloat(v) * 10) / 10;
  const card = one(S.card), band = one(S.band), row = one(S.row);
  const rect = (e) => { if (!e) return null; const r = e.getBoundingClientRect();
    return { w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10 }; };
  return {
    'row height':            num(px(row, 'height')) ?? (row ? rect(row).h : null),
    'row border-top':        px(row, 'borderTopWidth'),
    'row background':        px(row, 'backgroundColor'),
    'card height':           num(px(card, 'height')),
    'card border':           px(card ? (isRef ? card.querySelector('.frame') : card.querySelector('.tl-frame')) : null, 'borderTopWidth'),
    'card shadow':           px(card ? (isRef ? card.querySelector('.frame') : card.querySelector('.tl-frame')) : null, 'boxShadow'),
    'band height':           num(px(band, 'height')),
    'band radius':           px(band, 'borderTopLeftRadius'),
    'band padding':          px(band, 'padding'),
    'band gap':              px(band, 'gap'),
    /* rounded to the pixel — the ref's svg is exactly 14 and StatusDot renders 14.1; a tenth of a
       pixel is not a visible difference and pinning it makes the gate fail on rendering noise */
    'dot width':             Math.round(rect(one(S.dot))?.w ?? 0) || null,
    'status size':           px(one(S.word), 'fontSize'),
    'status weight':         px(one(S.word), 'fontWeight'),
    'status family':         (px(one(S.word), 'fontFamily') || '').split(',')[0].replace(/["']/g, ''),
    'holder size':           px(one(S.holder), 'fontSize'),
    'holder tracking':       px(one(S.holder), 'letterSpacing'),
    'name size':             px(one(S.name), 'fontSize'),
    'name weight':           px(one(S.name), 'fontWeight'),
    'name family':           (px(one(S.name), 'fontFamily') || '').split(',')[0].replace(/["']/g, ''),
    'agency size':           px(one(S.agency), 'fontSize'),
    'agency style':          px(one(S.agency), 'fontStyle'),
    'fact size':             px(one(S.fact), 'fontSize'),
    'fact transform':        px(one(S.fact), 'textTransform'),
    'tail size':             px(one(S.tail), 'fontSize'),
    'tail transform':        px(one(S.tail), 'textTransform'),
    'ring width':            px(one(S.bang), 'width'),
    /* ── §E · the action ─────────────────────────────────────────────────────────────── */
    'action ring size':      (() => { const e = root.querySelector(isRef ? '.nlab:not(.od) .sym' : '.tl-act:not(.tl-act--od) .tl-actsym');
                               return e ? Math.round(e.getBoundingClientRect().width) : null; })(),
    'action ring border':    px(root.querySelector(isRef ? '.nlab:not(.od) .sym' : '.tl-act:not(.tl-act--od) .tl-actsym'), 'borderTopColor'),
    'action ring colour':    px(root.querySelector(isRef ? '.nlab:not(.od) .sym' : '.tl-act:not(.tl-act--od) .tl-actsym'), 'color'),
    'action label family':   (px(root.querySelector(isRef ? '.nlab .tr' : '.tl-actlab'), 'fontFamily') || '').split(',')[0].replace(/["']/g, ''),
    'action label size':     px(root.querySelector(isRef ? '.nlab .tr' : '.tl-actlab'), 'fontSize'),
    'urgent label colour':   px(root.querySelector(isRef ? '.nlab.od .tr' : '.tl-act--od .tl-actlab'), 'color'),
    'action button bg':      px(root.querySelector(isRef ? '.nlab .tl' : '.tl-actbtn'), 'backgroundColor'),
    'action button size':    px(root.querySelector(isRef ? '.nlab .tl' : '.tl-actbtn'), 'fontSize'),
    'action button case':    px(root.querySelector(isRef ? '.nlab .tl' : '.tl-actbtn'), 'textTransform'),
    'action button pad':     px(root.querySelector(isRef ? '.nlab .tl' : '.tl-actbtn'), 'padding'),
    'urgent hidden at rest': px(root.querySelector(isRef ? '.nlab.od' : '.tl-act--od'), 'opacity'),
    'gradients on cards':    [...root.querySelectorAll(S.card)].filter(c =>
                               [...c.querySelectorAll('*')].concat([c]).some(e => {
                                 const s = getComputedStyle(e);
                                 return /gradient/.test(s.backgroundImage) || (s.maskImage && s.maskImage !== 'none')
                                   || (s.webkitMaskImage && s.webkitMaskImage !== 'none');
                               })).length,
  };
})()`;

test("the difference list — ref against dev, same viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(REF);
  await page.waitForTimeout(700);
  const ref = await page.evaluate(PROBE) as Record<string, unknown>;

  await openRoute(page, "/todo/calendar", { width: 1440, height: 900 });
  const dev = await page.evaluate(PROBE) as Record<string, unknown>;

  /**
   * ⚠️ ONE INSTRUCTED EXCEPTION, NAMED RATHER THAN SILENTLY TOLERATED. §D correction 1 DELETES the
   * dissolve on both edges; the ref still draws its `.fov` overlays, so the ref has gradients on
   * four cards and dev has none. Dev is right and the ref is superseded here — by the instruction,
   * not by preference. It is listed as an exception so the difference is visible in every run
   * rather than absent from the list.
   */
  const INSTRUCTED: Record<string, string> = {
    'gradients on cards': '§D correction 1 deletes the dissolve; the ref still draws it. dev must be 0.',
  };
  const diffs: string[] = [];
  const exceptions: string[] = [];
  for (const k of Object.keys(ref)) {
    const a = JSON.stringify(ref[k]), b = JSON.stringify(dev[k]);
    if (a === b) continue;
    if (INSTRUCTED[k]) { exceptions.push(`${k.padEnd(22)} ref ${String(a).padEnd(10)} dev ${String(b).padEnd(10)} — ${INSTRUCTED[k]}`); continue; }
    diffs.push(`${k.padEnd(22)} ref ${String(a).padEnd(22)} dev ${b}`);
  }
  console.log("\n══ DIFFERENCE LIST ══\n" + (diffs.length ? diffs.join("\n") : "(empty)"));
  console.log("\n══ INSTRUCTED EXCEPTIONS ══\n" + (exceptions.length ? exceptions.join("\n") : "(none)") + "\n");
  console.log("ref:", JSON.stringify(ref));
  console.log("dev:", JSON.stringify(dev));
  /* ⚠️ THE POPULATION FIRST — an empty list over two pages that rendered nothing is not agreement */
  expect(Object.keys(ref).length, "the probe read nothing from the ref").toBeGreaterThan(20);
  expect(ref["card height"], "the ref drew no card").not.toBeNull();
  expect(dev["card height"], "dev drew no card").not.toBeNull();
  /* the exception must be REAL — if dev grew a gradient the exception stops being one */
  expect(dev["gradients on cards"], "a card in dev carries a gradient or a mask").toBe(0);
  expect(diffs, `${diffs.length} differences`).toEqual([]);
});
