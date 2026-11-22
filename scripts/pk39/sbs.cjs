// Submission packages v39 — side-by-sides for the report: the ref's screen (design-refs/submission-packages-v39/screens,
// @2x) beside the app's (reports/submission-packages-v39/app, @1x), each scaled to the same width, labelled.
// Run from the repo root: node scripts/pk39/sbs.cjs 01-top 02-builder 04-icon-colour-picker 07-every-package 09-every-piece-letters 13-how-it-works-3
const { chromium } = require(process.cwd() + '/node_modules/playwright');
const fs = require('fs');
const OUT = 'reports/submission-packages-v39/side-by-side';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const name of process.argv.slice(2)) {
    for (const w of [1512, 1280]) {
      const ref = `design-refs/submission-packages-v39/screens/${name}-${w}@2x.png`, app = `reports/submission-packages-v39/app/${name}-${w}.png`;
      if (!fs.existsSync(ref) || !fs.existsSync(app)) { console.log('missing', name, w); continue; }
      const a64 = fs.readFileSync(ref).toString('base64'), b64 = fs.readFileSync(app).toString('base64');
      const png = await p.evaluate(async ({ a64, b64, w }) => {
        const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = 'data:image/png;base64,' + s; });
        const [A, B] = await Promise.all([load(a64), load(b64)]);
        const ah = A.height * (w / A.width), bh = B.height * (w / B.width), head = 36, gap = 24;
        const c = new OffscreenCanvas(w * 2 + gap, head + Math.max(ah, bh)); const x = c.getContext('2d');
        x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
        x.fillStyle = '#1c130f'; x.font = '600 18px sans-serif';
        x.fillText('Ref (v39)', 8, 24); x.fillText('App', w + gap + 8, 24);
        x.drawImage(A, 0, head, w, ah); x.drawImage(B, w + gap, head, w, bh);
        const blob = await c.convertToBlob(); const u = new Uint8Array(await blob.arrayBuffer());
        let s = ''; for (let k = 0; k < u.length; k++) s += String.fromCharCode(u[k]); return btoa(s);
      }, { a64, b64, w });
      fs.writeFileSync(`${OUT}/${name}-${w}.png`, Buffer.from(png, 'base64'));
      console.log('wrote', name, w);
    }
  }
  await b.close();
})();
