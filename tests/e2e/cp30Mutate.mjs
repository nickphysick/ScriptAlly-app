/**
 * Comparable titles v30 — each CP30 lock's named mutation: the fault the lock exists to catch, applied to the
 * rendered page. `CP30_PROVE=1` runs every lock a second time with its mutation and requires it to go red
 * (tests/e2e/cp30.measure.ts). The unit locks' source mutations are in reports/comps-v30/REPORT.md §F.
 */
export const MUTATIONS = {
  /* RETIRED (Workspace headers v1, 14 Nov): H1 is retired in cp30.measure.ts (v30's title card is gone) and is skipped there.
     Successor: tests/e2e/wsHeaders.measure.ts H3 "comps" (its own break: the page's old column). Kept for the record. */
  /* the shelf states a width of its own and stops on the column's right edge */
  H1: { css: ".cp30 .cp30-grid { margin-right: 40px; }" },
  /* the ready state loses its pill */
  /* RE-POINTED (Workspace headers v1, 14 Nov): the pill is the navy header's ring figure now */
  H2: { js: "document.querySelector('[data-wsnh-page=\"comps\"] [data-wsnh=\"ring-pct\"]')?.remove()" },
  /* a pill drawn when it is too soon to say */
  /* RE-POINTED (Workspace headers v1, 14 Nov): the disc is gone; the break draws a ring into the navy header instead */
  "H2-early": { js: "(() => { const d = document.querySelector('[data-wsnh-page=\"comps\"]'); const b = document.createElement('span'); b.setAttribute('data-wsnh', 'ring'); b.textContent = '33%'; d.appendChild(b); })()" },
  /* RETIRED (Workspace headers v1, 14 Nov): H3 is retired in cp30.measure.ts (`[data-cp="lead"]` is gone) and is skipped there;
     this break's target no longer exists. Successor: tests/e2e/wsHeaders.measure.ts H6 "comps". Kept for the record. */
  /* a figure where the rule says a word */
  H3: { js: "(() => { const p = document.querySelector('[data-cp=\"lead\"]'); for (const n of p.childNodes) if (n.nodeType === 3) n.textContent = n.textContent.replace('Two have', '2 have'); })()" },
  /* the toolbar wraps onto a second row */
  S1: { css: ".cp30 .cp30-tool { flex-wrap: wrap; } .cp30 .cp30-find { flex: 0 0 760px; }" },
  /* a band coloured green */
  S2: { css: ".cp30 .cp30-card[data-w=\"draft\"] .cp30-band { background: rgb(110, 160, 110); }" },
  /* the sent card names the draft that also holds it */
  S3: { js: "(() => { const s = document.querySelector('[data-cp=\"card\"][data-key=\"cmp_cp30tide\"] [data-cp=\"stat-line\"]'); s.append(' and Query letter v3'); })()" },
  /* the list reads its own order */
  S4: { js: "(() => { const f = document.querySelector('.cp30-lst .cp30-fr'); if (!f) return; [...f.querySelectorAll('[data-cp=\"row\"]')].reverse().forEach((r) => f.appendChild(r)); })()" },
  /* a control nested inside a button */
  S5: { js: "(() => { const b = document.querySelector('[data-cp=\"add-card\"]'); const i = document.createElement('button'); i.textContent = 'x'; b.appendChild(i); })()" },
  /* the drafts first */
  L1: { js: "(() => { const g = document.querySelector('[data-cp=\"letter-grid\"]'); g.appendChild(g.firstElementChild); })()" },
  /* the letter's own rate, computed a second way */
  L2: { js: "(() => { const k = document.querySelector('[data-letter=\"cp30-let-2\"] [data-cp=\"letter-rate\"]'); k.firstChild.textContent = '66'; })()" },
  /* the ✕'s glyph off centre */
  D1: { css: ".cp30-layer .cp30-x { place-items: start; padding: 2px 0 0 2px; }" },
  /* the drawer's title takes the toolbar dot's width again */
  D1t: { css: ".cp30-layer.cp30-dh h3.cp30-dtl { width: 9px; }" },
  /* v28's small uppercase mono labels come back */
  D2: { css: ".cp30 .cp30-pill { text-transform: uppercase; font-family: var(--font-mono) !important; font-size: 10px; }" },
  /* the empty page grows a shelf */
  E1: { js: "(() => { const d = document.createElement('section'); d.setAttribute('data-cp', 'shelf'); document.querySelector('[data-cp=\"page\"]').insertBefore(d, document.querySelector('[data-cp=\"page\"] .af')); })()" },
  /* the floating tab comes back */
  SC1: { js: "(() => { const t = document.createElement('button'); t.setAttribute('data-ftab', 'scout'); document.body.appendChild(t); })()" },
};
