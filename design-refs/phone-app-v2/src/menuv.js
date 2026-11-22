// ---------- menu + pushed page variants ----------
let MV='B', PH='B';
const MITEMS=[['responses','Responses',IC.inbox,'8 replies','4 requests'],['analytics','Analytics',IC.chart,'50% heard back','Median 5 wks'],['goals','Streaks & goals',IC.flame,'4-week streak','3 of 5 this week'],['manuscript','Manuscript',IC.book,'Draft 4','94,000 words'],['materials','Materials',IC.box,'3 packages','3 letters'],['comps','Comparable titles',IC.pages,'3 comps','In 15 queries'],['discover','Discover agents',IC.scope,'3 new','From the Scout']];
function ovMenu(){
  const chevR2=IC.chev.replace('<svg','<svg class="chev"');
  const tools=`<div class="gl">Help and tools</div><div class="group">${[['import','Import queries',IC.upload],['help','Help centre',IC.help]].map(([v,w,i])=>`<button class="li" data-act="page" data-v="${v}"><span class="ico">${i}</span><span class="lt">${w}</span>${chevR2}</button>`).join('')}<button class="li" data-act="feedback"><span class="ico">${IC.chat}</span><span class="lt">Send feedback</span>${chevR2}</button></div>
    <div class="gl">Account</div><div class="group">${[['settings','Settings',IC.gear,''],['plan','Plan & billing',IC.card,'Founding']].map(([v,w,i,r])=>`<button class="li" data-act="page" data-v="${v}"><span class="ico">${i}</span><span class="lt">${esc(w)}</span><span class="rt">${r}${chevR2}</span></button>`).join('')}</div>
    <button class="btn sec blk" style="margin-top:20px">${IC.signout}Sign out</button><div class="msign"><img src="${ART.hawkhead}" alt=""><img class="wm" src="${ART.wordmark}" alt="QueryHawk"><span>Beta · made in the UK</span></div>`;
  if(MV==='A') return ovMenuA();
  const me=`<div style="display:flex;gap:14px;align-items:center"><span class="avring" style="width:52px;height:52px;font-size:17px">${ME.ini}</span><div style="flex:1;min-width:0"><div style="font-family:var(--type);font-size:22px;color:#fff">${ME.name}</div><div style="font-size:13.5px;color:rgba(255,255,255,.75);margin-top:2px">Founding writer · Fledgling</div></div><button class="ring" data-act="dismiss" aria-label="Close">${IC.close}</button></div>
    <button class="bchip" data-act="ms" style="margin-top:14px">${IC.book}<span class="mt">${esc(BOOK.title)}</span>${IC.down}</button>`;
  let body='';
  if(MV==='B'){
    body=`<div class="mtiles">${MITEMS.map(([v,w,i,s1,s2])=>`<button class="mtile" data-act="page" data-v="${v}"><span class="mi">${i}</span><b>${esc(w)}</b><span class="sub">${s1}</span></button>`).join('')}<button class="mtile" data-act="feedback"><span class="mi">${IC.chat}</span><b>Feedback</b><span class="sub">2 sent</span></button></div>`;
  } else {
    body=`<div class="gl" style="margin-top:4px">Your campaign and book</div><div class="group">${MITEMS.map(([v,w,i,s1,s2])=>`<button class="li" style="min-height:62px" data-act="page" data-v="${v}"><span class="ico">${i}</span><span class="lt">${esc(w)}<span class="sub" style="display:block">${s1} · ${s2}</span></span>${chevR2}</button>`).join('')}</div>`;
  }
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet" data-sheet style="height:94%"><div class="mband"><div class="grab" data-grab style="filter:invert(1)"></div>${me}</div><div class="body" style="padding-top:16px;margin-top:-20px;background:var(--page);border-radius:22px 22px 0 0;position:relative">${body}${tools}</div></div>`;
}
function bk(title,right=''){
  if(PH!=='B') return `<div class="bk" data-hd><button class="ib" data-act="back" aria-label="Back">${IC.back}</button><span class="t">${esc(title)}</span>${right||'<span style="width:40px"></span>'}</div>`;
  return `<div class="pband"><div class="bandrow"><button class="ring" data-act="back" aria-label="Back">${IC.back}</button><span style="flex:1"></span>${ringB(IC.search,'search','Search')}<button class="avring" data-act="menu" aria-label="Open menu">${ME.ini}</button></div><div class="bt" style="margin-top:14px">${esc(title)}</div></div>`;
}

let BRAND='A';
