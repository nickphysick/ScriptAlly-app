// ---------- toast variants ----------
let TSV='C';
function toastHtml(t){
  const ph=`<img class="tph" src="${ART.placeholder}" alt="Illustration to come">`;
  const undo=t.undo?`<button data-act="undo">Undo</button>`:'';
  const low=S.overlay?'low':'';
  if(TSV==='A') return `<div class="toast ${low}" role="status"><span class="hk">${ph}</span><span class="tx"><b>${esc(t.b)}</b>${t.t?esc(t.t):''}</span>${undo}</div>`;
  if(TSV==='C') return `<div class="snack ${low}" role="status">${ph}<span>${esc(t.b)}</span>${undo}</div>`;
  if(TSV==='D') return `<div class="tban" role="status">${ph}<span class="tx"><b>${esc(t.b)}</b>${t.t?`<small>${esc(t.t)}</small>`:''}</span>${undo}</div>`;
  return `<div class="tcard ${low}" role="status">${ph}<span class="tx"><b>${esc(t.b)}</b>${t.t?`<small>${esc(t.t)}</small>`:''}</span>${undo}${t.undo?'<i class="tbar"></i>':''}</div>`;
}
