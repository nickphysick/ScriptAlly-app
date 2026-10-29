// Submission packages v39.2 — read the ref's COMPUTED values for the delta (the header's pattern, "Your packages", the
// materials folder tab and its rows) at 1512 and 1280. Run from the repo root: node scripts/pk392/probe-ref.cjs
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const REF = 'file://' + process.cwd() + '/design-refs/submission-packages-v39-2/submission-packages-v39-2.html';
const P = ['position','top','left','right','bottom','width','height','padding','margin-top','border-radius','background-color','background-image','background-size','opacity','mask-image','z-index','font-family','font-size','font-weight','font-style','line-height','color','letter-spacing','text-transform','display','grid-template-columns','gap','align-items','box-shadow','white-space','overflow','text-overflow','-webkit-line-clamp'];
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1512, 982], [1280, 832]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(REF); await p.waitForTimeout(1500);
    const out = await p.evaluate((P) => {
      const pick = (e, ps) => { if (!e) return null; const cs = getComputedStyle(e, ps || null); const o = {}; for (const k of P) { let v = cs.getPropertyValue(k); if (k === 'background-image' && v.length > 120) v = v.slice(0, 120) + '…'; o[k] = v; } if (!ps) { const r = e.getBoundingClientRect(); o.box = [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10) / 10); } return o; };
      const q = (s) => document.querySelector(s);
      const rows = [...document.querySelectorAll('#libList .lr')].slice(0, 4).map((r) => ({ cls: r.className, txt: r.innerText.replace(/\n/g, ' | '), self: pick(r), b: pick(r.querySelector('b')), small: pick(r.querySelector('small')), m: pick(r.querySelector('.lr-m')), add: pick(r.querySelector('.lr-add')), ed: pick(r.querySelector('.lr-ed')) }));
      return {
        eh2: pick(q('.eh2')), eh2b: pick(q('.eh2'), '::before'), h1: pick(q('.eh2 h1')),
        pklk: pick(q('.pkl-k')), pklh: pick(q('.pkl-h')), pklsub: pick(q('.pkl-sub')), pklill: pick(q('.pkl-k .ill-s')),
        grid: pick(q('#pbGrid')), lib: pick(q('.pb-lib')), libb: pick(q('.pb-lib'), '::before'), top: pick(q('.pb-lib .lib-top')), topa: pick(q('.pb-lib .lib-top'), '::after'),
        h3: pick(q('.lib-top h3')), h3b: pick(q('.lib-top h3'), '::before'), tabs: pick(q('.lib-tabs')), open: pick(q('.pk-open')), left: pick(q('.pb-left')),
        lin: pick(q('.lr-in')), rows,
      };
    }, P);
    console.log('=== ' + w); console.log(JSON.stringify(out, null, 0));
    await p.close();
  }
  await b.close();
})();
