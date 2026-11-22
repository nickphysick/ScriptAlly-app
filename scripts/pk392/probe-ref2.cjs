// Submission packages v39.2 (replacement) — read the ref's COMPUTED values for the page pattern, the packages panel and
// the version-first packing list, at 1512 and 1280. Run from the repo root: node scripts/pk392/probe-ref2.cjs
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const REF = 'file://' + process.cwd() + '/design-refs/submission-packages-v39-2/submission-packages-v39-2.html';
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1512, 982], [1280, 832]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(REF); await p.waitForTimeout(1500);
    const out = await p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      const bx = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10) / 10); };
      const cs = (e, ps, ks) => { if (!e) return null; const c = getComputedStyle(e, ps || null); return Object.fromEntries(ks.map((k) => [k, c.getPropertyValue(k).slice(0, 140)])); };
      const page = q('.ms25.pb'), wrap = q('.pkc-wrap');
      const slots = [...document.querySelectorAll('.mf > .mr')].map((r) => ({ cls: r.className, lab: r.querySelector('.mr-l')?.innerText.replace(/\n/g, ' | '), box: bx(r), pad: cs(r, null, ['padding-top', 'padding-bottom', 'box-shadow']), b: cs(r.querySelector('.mr-tx b'), null, ['font-size']), em: cs(r.querySelector('.mr-l em'), null, ['color', 'font-style', 'max-width', 'line-height', 'font-size']) }));
      return {
        vpk: q('#vPk')?.getAttribute('data-pc'), page: bx(page), pageB: cs(page, '::before', ['opacity', 'background-size', 'background-color', 'z-index', 'position', 'inset']),
        ground: cs(page, null, ['background-color']),
        header: bx(q('.eh2')), headerBg: cs(q('.eh2'), null, ['background-color', 'background-image']),
        tip: bx(q('.pk-tip')), wrap: bx(wrap), wrapS: cs(wrap, null, ['padding', 'border-radius', 'background-color', 'box-shadow', 'margin']),
        pkl: bx(q('.pkl')), build: bx(q('.pb-build')), kicker: bx(q('.bk-k')), grid: bx(q('#pbGrid')), band: bx(q('.bnr') || q('[class*=bnr]')),
        slots, libTabs: [...document.querySelectorAll('#libTabs button')].map((b) => [b.innerText.replace(/\n/g, ' '), b.getAttribute('aria-selected')]),
        rlTabs: [...document.querySelectorAll('.rl-tabs button')].map((b) => [b.innerText, b.getAttribute('aria-selected')]),
        ag3k: [...document.querySelectorAll('.ag3-k')].map((e) => e.innerText),
        tipText: q('.pk-tip')?.innerText,
      };
    });
    console.log('=== ' + w); console.log(JSON.stringify(out, null, 1));
    await p.close();
  }
  await b.close();
})();
