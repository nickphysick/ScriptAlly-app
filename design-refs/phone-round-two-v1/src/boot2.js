// Round 2 board boot: app.html#tab=queries&opt=p3&page=activity&ov=...&seg=...
(function(){
const P=new URLSearchParams(location.hash.slice(1));
const tab=P.get('tab')||'home', ov=P.get('ov'), page=P.get('page'), scroll=+P.get('scroll')||0;
const opts=(P.get('opt')||'').split(',');
const has=o=>opts.includes(o);
document.documentElement.classList.add('fx',...opts.map(o=>'fx-'+o));
const css=`
html.fx body{margin:0;padding:0;background:var(--page);overflow:hidden}
html.fx .chrome,html.fx .notes,html.fx .views{display:none!important}
html.fx .proto{padding:0!important;display:block!important}
html.fx .device{width:100vw!important;height:100vh!important;border-radius:0!important;padding:0!important;box-shadow:none!important}
html.fx .device .app{border-radius:0}
html.fx .app .scroller{top:0}
html.fx .app .tabbar{bottom:14px;background:rgba(255,255,255,.6);backdrop-filter:blur(20px) saturate(1.5);-webkit-backdrop-filter:blur(20px) saturate(1.5)}
html.fx .app::after{content:"";position:absolute;left:0;right:0;bottom:0;height:112px;z-index:19;pointer-events:none;background:linear-gradient(rgba(248,246,242,0),rgba(248,246,242,.9) 55%,var(--page));transition:opacity .3s}
html.fx .app:has(.tabbar.away)::after{opacity:0}
/* the house rule: no green */
html.fx{--st-sage:var(--st-sand)}
/* today's bug, the pills cut at the top */
html.fx-p0 .chips{margin-top:-14px!important;padding-top:0}
/* 1A scrolling pills, fixed */
html.fx-p1 .chips{margin:4px -16px 6px!important;padding:4px 16px 10px;scroll-snap-type:x proximity;-webkit-mask-image:linear-gradient(90deg,#000 calc(100% - 44px),transparent);mask-image:linear-gradient(90deg,#000 calc(100% - 44px),transparent)}
html.fx-p1 .chip{scroll-snap-align:start}
/* 1B segmented counts */
.fseg{display:grid;grid-template-columns:repeat(5,1fr);background:var(--fill);border-radius:16px;padding:3px;margin:4px 0 8px}
.fseg button{border-radius:13px;padding:7px 2px 6px;text-align:center;color:var(--ink-2)}
.fseg b{display:block;font-family:var(--type);font-weight:400;font-size:20px;line-height:1.1;color:var(--ink)}
.fseg span{display:block;font-size:12.5px;font-weight:600;line-height:1.15;margin-top:2px}
.fseg button[aria-pressed="true"]{background:#fff;box-shadow:0 1px 3px rgba(31,38,51,.12)}
/* 1C band tiles */
.btiles{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px}
.btile{border-radius:14px;background:rgba(255,255,255,.1);padding:10px 8px 9px;text-align:left;color:#fff;min-height:70px;display:flex;flex-direction:column;justify-content:space-between}
.btile b{font-family:var(--type);font-weight:400;font-size:26px;line-height:1}
.btile span{font-size:12.5px;line-height:1.15;color:rgba(255,255,255,.82)}
.btile[aria-pressed="true"]{background:#fff;color:var(--ink)}
.btile[aria-pressed="true"] span{color:var(--ink-2)}
.bsum{font-size:14px;color:rgba(255,255,255,.75);margin-top:12px}
.bsum b{color:#fff;font-weight:600}
/* feed */
.fdh{display:flex;align-items:baseline;gap:8px;margin:18px 2px 8px;font-family:var(--type);font-size:16px}
.fdh small{font-family:var(--body,inherit);font-size:13px;color:var(--muted)}
.fit{display:flex;gap:12px;align-items:flex-start;padding:12px 14px;background:#fff;border-radius:14px;box-shadow:var(--sh);margin-bottom:8px}
.fit .tx{flex:1;min-width:0;font-size:15px;line-height:1.35}
.fit .meta{display:block;font-size:13px;color:var(--muted);margin-top:3px}
.fit.req{background:var(--pink-wash);box-shadow:none}
.fit.mine{background:transparent;box-shadow:none;padding:8px 14px}
.fit.mine .tx{font-size:14.5px;color:var(--ink-2)}
.fsum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 4px}
.fsum div{background:#fff;border-radius:14px;box-shadow:var(--sh);padding:10px 12px}
.fsum b{display:block;font-family:var(--type);font-weight:400;font-size:24px;line-height:1}
.fsum span{display:block;font-size:12.5px;color:var(--muted);margin-top:4px;line-height:1.2}
.ring .bdg{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:9px;background:var(--pink);color:#111;font-size:11px;font-weight:700;display:grid;place-items:center;padding:0 4px}
.ring{position:relative}
/* character: query cards */
.qc{display:block;width:100%;text-align:left;background:#fff;border-radius:16px;box-shadow:var(--sh);overflow:hidden;margin-bottom:10px}
.qc .qb{display:flex;justify-content:space-between;padding:7px 14px;font-size:12.5px;font-weight:600}
.qc .qb span:last-child{font-family:var(--type);font-weight:400;font-size:13.5px}
.qc .qm{display:flex;gap:12px;align-items:center;padding:12px 14px 4px}
.qc .qm b{display:block;font-size:16px}
.qc .qt{display:flex;gap:4px;padding:8px 14px 0}
.qc .qt i{flex:1;height:5px;border-radius:3px;background:var(--fill)}
.qc .qt i.on{background:var(--navy)}
.qc .qn{padding:8px 14px 12px;font-size:14px;font-weight:600;display:flex;justify-content:space-between}
.qc .qn span{font-weight:400;color:var(--muted)}
.agt{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.agt .tl{background:#fff;border-radius:16px;box-shadow:var(--sh);padding:14px 12px 12px;text-align:left;display:flex;flex-direction:column;gap:2px;min-width:0}
.agt .av{width:42px;height:42px;border-radius:50%;background:var(--st-sand);display:grid;place-items:center;font-weight:700;font-size:14px;margin-bottom:8px}
.agt b{font-size:15px;line-height:1.2}
.agt .sub{font-size:13px;line-height:1.25}
.agt .ft{font-size:12.5px;color:var(--ink-2);margin-top:8px;padding-top:8px;border-top:1px solid var(--rule)}
/* character: per-tab bands */
.pipe{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:18px;align-items:end}
.pipe div{text-align:left}
.pipe i{display:block;border-radius:8px 8px 3px 3px;background:rgba(255,255,255,.16)}
.pipe i.hi{background:var(--pink)}
.pipe b{display:block;font-family:var(--type);font-weight:400;font-size:24px;color:#fff;margin-top:6px;line-height:1}
.pipe span{font-size:12.5px;color:rgba(255,255,255,.8)}
html.fx-c2 .screen[data-scr="todo"] .band,html.fx-c3 .screen[data-scr="todo"] .band{background:var(--pink);color:#111}
html.fx-c2 .screen[data-scr="agents"] .band,html.fx-c3 .screen[data-scr="agents"] .band{background:var(--st-slate);color:#111}
html.fx-c2 .screen[data-scr="todo"] .band *,html.fx-c3 .screen[data-scr="todo"] .band *,html.fx-c2 .screen[data-scr="agents"] .band *,html.fx-c3 .screen[data-scr="agents"] .band *{color:#111!important;border-color:rgba(17,17,17,.22)!important}
html.fx-c2 .screen[data-scr="todo"] .band .wkd.on,html.fx-c3 .screen[data-scr="todo"] .band .wkd.on{background:#fff}
html.fx-c2 .screen[data-scr="todo"] .band .wdots i,html.fx-c3 .screen[data-scr="todo"] .band .wdots i{background:#111}
html.fx-c2 .screen[data-scr="todo"] .band .avring,html.fx-c3 .screen[data-scr="todo"] .band .avring,html.fx-c2 .screen[data-scr="agents"] .band .avring,html.fx-c3 .screen[data-scr="agents"] .band .avring{background:#fff}
html.fx-c2 .screen[data-scr="todo"] .band .bchip,html.fx-c3 .screen[data-scr="todo"] .band .bchip,html.fx-c2 .screen[data-scr="agents"] .band .bchip,html.fx-c3 .screen[data-scr="agents"] .band .bchip{background:rgba(255,255,255,.55)}
html.fx-c2 .app:has(.screen[data-scr="todo"]) .scroller,html.fx-c3 .app:has(.screen[data-scr="todo"]) .scroller{background:linear-gradient(var(--pink) 0 140px,var(--page) 140px)!important}
html.fx-c2 .app:has(.screen[data-scr="agents"]) .scroller,html.fx-c3 .app:has(.screen[data-scr="agents"]) .scroller{background:linear-gradient(var(--st-slate) 0 140px,var(--page) 140px)!important}
.agring{display:flex;gap:14px;align-items:center;margin-top:16px}
/* to-do */
.focus{background:#fff;border-radius:18px;box-shadow:var(--sh);overflow:hidden;margin-bottom:6px}
.focus .fh{display:flex;justify-content:space-between;align-items:center;padding:9px 16px;background:var(--pink-wash);font-size:13px;font-weight:600;color:#5a3027}
.focus .fb{padding:14px 16px 16px}
.focus .ft{font-size:19px;font-weight:600;line-height:1.25;margin:10px 0 4px}
.focus .why{font-size:14.5px;color:var(--ink-2);line-height:1.4}
.focus .acts2{display:flex;gap:14px;align-items:center;margin-top:14px}
.ck{display:flex;gap:12px;align-items:center;padding:12px 16px;width:100%;text-align:left;position:relative;background:var(--page)}
.ck::after{content:"";position:absolute;left:52px;right:0;bottom:0;height:1px;background:var(--rule)}
.ck .bx{width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1.8px #b9b1a5;flex:none;display:grid;place-items:center}
.ck .bx.done{background:var(--navy);box-shadow:none;color:#fff}
.ck .bx svg{width:14px;height:14px}
.ck .t{flex:1;min-width:0}
.ck .t b{display:block;font-size:15.5px;font-weight:600;line-height:1.25}
.ck .t small{display:block;font-size:13px;color:var(--muted);margin-top:2px}
.ck .t small.late{color:#8a4a3a;font-weight:600}
.ck .when{font-size:13px;color:var(--muted);flex:none}
.ck.isdone b{color:var(--muted);text-decoration:line-through}
.carou{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -16px;padding:2px 16px 12px;scrollbar-width:none}
.carou::-webkit-scrollbar{display:none}
.uc{flex:none;width:82%;scroll-snap-align:center;background:#fff;border-radius:20px;box-shadow:var(--sh);overflow:hidden;display:flex;flex-direction:column}
.uc .uh{padding:9px 16px;font-size:13px;font-weight:600;display:flex;justify-content:space-between}
.uc .ub{padding:14px 16px 16px;display:flex;flex-direction:column;flex:1}
.uc .ub .t{font-size:19px;font-weight:600;line-height:1.25;margin:12px 0 4px}
.uc .ub .why{font-size:14px;color:var(--ink-2);flex:1}
.dots2{display:flex;gap:6px;justify-content:center;margin:-2px 0 6px}
.dots2 i{width:6px;height:6px;border-radius:3px;background:#cfc8bc}
.dots2 i.on{width:16px;background:var(--navy)}
.tl2{display:grid;grid-template-columns:52px 1fr;gap:10px;margin-bottom:14px}
.dt{border-radius:14px;background:#fff;box-shadow:var(--sh);text-align:center;padding:8px 0;height:max-content}
.dt b{display:block;font-family:var(--type);font-weight:400;font-size:22px;line-height:1}
.dt span{display:block;font-size:11.5px;font-weight:600;color:var(--muted);margin-top:3px}
.dt.now{background:var(--navy)}.dt.now b,.dt.now span{color:#fff}
.dt.late{background:var(--pink)}.dt.late span{color:#5a3027}
.tc{background:#fff;border-radius:14px;box-shadow:var(--sh);padding:12px 14px;margin-bottom:8px;display:flex;gap:12px;align-items:center}
.tc .t{flex:1;min-width:0}.tc b{display:block;font-size:15px;line-height:1.25}.tc small{display:block;font-size:13px;color:var(--muted);margin-top:2px}
/* manuscript */
.mtabs{display:flex;gap:2px;background:var(--fill);border-radius:999px;padding:3px;margin:0 0 16px}
.mtabs button{flex:1;height:36px;border-radius:999px;font-size:13.5px;font-weight:600;color:var(--ink-2)}
.mtabs button[aria-pressed="true"]{background:#fff;color:var(--ink);box-shadow:0 1px 3px rgba(31,38,51,.12)}
.mat{display:flex;gap:12px;align-items:center;padding:13px 14px;width:100%;text-align:left}
.mat+.mat{border-top:1px solid var(--rule)}
.mat .ico{width:38px;height:38px}
.mat .t{flex:1;min-width:0}.mat b{display:block;font-size:15.5px;font-weight:600}.mat small{display:block;font-size:13px;color:var(--muted);margin-top:2px}
.cur{display:inline-block;background:var(--navy);color:#fff;border-radius:999px;font-size:12px;font-weight:600;padding:1px 8px;margin-left:6px;vertical-align:2px}
.pin{position:sticky;bottom:96px;margin-top:16px;z-index:2}
.paper{background:#fff;border-radius:6px;box-shadow:0 1px 2px rgba(31,38,51,.08),0 10px 30px rgba(31,38,51,.1);padding:20px 18px;font-family:var(--serif);font-size:14.5px;line-height:1.55;color:var(--ink);max-height:210px;overflow:hidden;position:relative}
.paper::after{content:"";position:absolute;left:0;right:0;bottom:0;height:60px;background:linear-gradient(rgba(255,255,255,0),#fff)}
.acts3{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:14px 0 4px}
.acts3 button{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:var(--ink);padding:10px 2px;border-radius:14px;background:#fff;box-shadow:var(--sh)}
.acts3 svg{width:20px;height:20px}
.slot{display:flex;gap:12px;align-items:center;padding:12px 14px;border-radius:14px;background:#fff;box-shadow:inset 0 0 0 1.5px var(--rule);margin-bottom:8px;width:100%;text-align:left}
.slot .t{flex:1}.slot b{display:block;font-size:15px}.slot small{display:block;font-size:13px;color:var(--muted)}
.slot .sw2{font-size:13.5px;font-weight:600;color:var(--navy)}
.cov{width:64px;height:96px;border-radius:3px 6px 6px 3px;background:var(--st-slate);box-shadow:inset 4px 0 0 rgba(0,0,0,.08),0 6px 14px rgba(31,38,51,.18);display:grid;place-items:center;flex:none;color:#2f4258}
.fld{display:block;margin-bottom:14px}.fld span{display:block;font-size:14.5px;font-weight:600;margin-bottom:6px}
.fld input,.fld textarea{width:100%;border:1px solid rgba(28,19,15,.16);border-radius:14px;background:#fff;min-height:50px;padding:12px 14px;font:inherit;font-size:16px}
.fld textarea{min-height:96px;resize:none}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

// house rule: no green. Sent stages use sand, not sage.


const chev=IC.chev.replace('<svg','<svg style="width:16px;height:16px;color:var(--faint);flex:none"');
const counts=()=>({all:QUERIES.length,you:byCourt('you').length,agent:byCourt('agent').length,quiet:byCourt('quiet').length,closed:byCourt('closed').length});
const STAGE={queried:0,preq:1,psent:1,freq:2,fsent:2,offer:3,rr:1};

// ---------- 1. Queries filters + 3. character ----------
const _q=window.screenQueries2;
function qCard(q){
  const c=courtOf(q), k=STAGE[q.st]??0, cl=c==='closed';
  return `<button class="qc" data-act="query" data-id="${q.id}"><div class="qb" style="background:${COURT[c].bg};color:${COURT[c].fg}"><span>${COURT[c].w}</span><span>Day ${q.day}</span></div>
   <div class="qm">${disc(q.st,40)}<div style="min-width:0;flex:1"><b>${esc(q.name)}</b><span class="sub">${esc(q.agency)}</span></div></div>
   ${cl?'':`<div class="qt">${[0,1,2,3].map(i=>`<i class="${i<=k?'on':''}" style="${i<=k&&c==='you'?'background:var(--pink)':''}"></i>`).join('')}</div>`}
   <div class="qn">${ST[q.st].w}<span>${esc(q.closed||q.next||'')}</span></div></button>`;
}
window.screenQueries2=function(){
  const pick=['p1','p2','p3'].find(has)||'p0';
  const cards=has('c1')||has('c3')||has('c4');
  const pipe=has('c2')||has('c3')||has('c4');
  const c=counts();
  const band0=bandHead('Queries',ringB(IC.eye,'birds','Birds-eye view'));
  const stagesN=[['Queried',QUERIES.filter(q=>courtOf(q)!=='closed').length],['Partial',QUERIES.filter(q=>q.tl.some(s=>s[0]==='preq')).length],['Full',QUERIES.filter(q=>q.tl.some(s=>s[0]==='freq')).length],['Offer',0]];
  const mx=Math.max(...stagesN.map(x=>x[1]));
  let band;
  if(pick==='p3') band=band0+`<div class="btiles">${[['you','With you'],['agent','With the agent'],['quiet','Gone quiet'],['closed','Closed']].map(([k,w])=>`<button class="btile" data-act="filter" data-v="${k}" aria-pressed="${S.filter===k}"><b>${c[k]}</b><span>${w}</span></button>`).join('')}</div><div class="bsum"><b>${c.all}</b> sent · <b>${active().length}</b> active${S.filter!=='all'?' · <button data-act="filter" data-v="all" style="color:#fff;text-decoration:underline;font-weight:600">Show all</button>':''}</div>`;
  else if(pipe) band=band0+`<div class="pipe">${stagesN.map(([w,n],i)=>`<div><i class="${i===2?'hi':''}" style="height:${Math.max(6,n/mx*64)}px"></i><b>${n}</b><span>${w}</span></div>`).join('')}</div>`;
  else band=band0+`<div class="bstats"><span><b class="num">${c.all}</b> sent</span><span><b class="num">${active().length}</b> active</span><span><b class="num">${c.you}</b> with you</span></div>`;
  let sh='';
  if(pick==='p2') sh+=`<div class="fseg">${[['all','All'],['you','You'],['agent','Agent'],['quiet','Quiet'],['closed','Closed']].map(([k,w])=>`<button data-act="filter" data-v="${k}" aria-pressed="${S.filter===k}"><b>${c[k]}</b><span>${w}</span></button>`).join('')}</div>`;
  else if(pick!=='p3') sh+=`<div class="chips" style="margin-top:-2px">${[['all','All'],['you','With you'],['agent','With the agent'],['quiet','Gone quiet'],['closed','Closed']].map(([k,w])=>`<button class="chip" data-act="filter" data-v="${k}" aria-pressed="${S.filter===k}">${w} <b>${c[k]}</b></button>`).join('')}</div>`;
  const shown=S.filter==='all'?['you','agent','quiet','closed']:[S.filter];
  if(cards) sh+=shown.map(k=>{const qs=byCourt(k);if(!qs.length)return '';return `<div class="rowhd" style="padding-left:2px">${COURT[k].w} <span class="n">· ${qs.length}</span></div>`+qs.map(qCard).join('');}).join('');
  else sh+=`<div class="rows">`+shown.map(k=>{const qs=byCourt(k);if(!qs.length)return '';return groupHd(k,qs.length)+qs.map(qRow).join('')}).join('')+`</div>`;
  return bandPage('queries',band,sh);
};

// ---------- Agents character ----------
const _a=window.screenAgents2;
const _agCard=window.agCard;
window.screenAgents2=function(){
  const tiles=has('c1')||has('c3')||has('c4'), band2=has('c2')||has('c3')||has('c4');
  if(!tiles&&!band2) return _a();
  const nv=has('c4');
  const keep=AGR; if(tiles){AGR='C'; window.agCard=a=>`<button class="tl" data-act="agent" data-id="${a.id}" style="background:#fff;border-radius:16px;box-shadow:var(--sh);padding:14px 12px 12px;text-align:left;display:flex;flex-direction:column;gap:2px;min-width:0">${a.q?disc(a.q.st,42):`<span class="av" style="width:42px;height:42px;border-radius:50%;background:var(--pink-wash);display:grid;place-items:center;font-weight:700;font-size:14px">${ini(a.name)}</span>`}<b style="font-size:15px;line-height:1.2;margin-top:8px">${esc(a.name)}</b><span class="sub" style="font-size:13px">${esc(a.agency)}</span><span style="font-size:12.5px;color:var(--ink-2);margin-top:8px;padding-top:8px;border-top:1px solid var(--rule)">${a.q?ST[a.q.st].w+' · Day '+a.q.day:esc(a.reply.replace('Usually ','Replies in '))}</span></button>`;}
  let h=_a(); AGR=keep; window.agCard=_agCard;
  if(band2){const all=agentsAll(),qd=all.filter(a=>a.q),toq=all.length-qd.length,p=qd.length/all.length;
    h=h.replace(/<div class="bstats">[\s\S]*?<\/div>/,`<div class="agring"><svg width="72" height="72" viewBox="0 0 72 72"><circle cx="36" cy="36" r="29" fill="none" stroke="${nv?'rgba(255,255,255,.15)':'rgba(17,17,17,.12)'}" stroke-width="9"/><circle cx="36" cy="36" r="29" fill="none" stroke="${nv?'#e8c8bc':'#2a3a52'}" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(p*182.2).toFixed(1)} 183" transform="rotate(-90 36 36)"/></svg><div style="${nv?'color:#fff':''}"><div style="font-family:var(--type);font-size:24px;line-height:1.1">${qd.length} of ${all.length} queried</div><div style="font-size:14px;margin-top:4px;${nv?'color:rgba(255,255,255,.8)':''}">${toq} on your list still to query</div></div></div>`);}
  return h;
};

// ---------- 2. Activity feed ----------
const EV=[
 ['Today',[['freq','agent','<b>Eleanor Whitfield</b> asked for the full manuscript','Greenfield Literary · 9:12','Send the full','q1'],['queried','you','You queried <b>Sofia Lind</b>','Wren &amp; Fable · 8:40']]],
 ['Yesterday',[['rejected','agent','<b>Ruth Abbot</b> passed','Quayside Agency · at query'],['nudge','you','You nudged <b>Hugo Mayne</b>','Larkspur Literary']]],
 ['Tuesday 27 October',[['preq','agent','<b>Jonah Pike</b> asked for the first 3 chapters','Saltmarsh Books','Send your partial','q2'],['add','you','You added <b>Hannah Cole</b> to your list','Fernhill Agency'],['queried','you','You queried <b>Imogen Hart</b>','Calder &amp; Rowe']]],
 ['Monday 26 October',[['psent','you','You sent <b>Leo Marsh</b> the first 3 chapters','Kestrel Literary']]],
];
function feedRow(e){
  const [s,who,tx,meta,act,qid]=e;
  if(who==='you'){const ic=s==='nudge'?IC.bell:s==='add'?IC.person:null;return `<div class="fit mine">${ic?`<span style="width:30px;height:30px;border-radius:50%;background:var(--fill);display:grid;place-items:center;flex:none">${ic.replace('<svg','<svg style="width:15px;height:15px"')}</span>`:disc(s,30)}<div class="tx">${tx}<span class="meta">${meta}</span></div></div>`;}
  return `<div class="fit ${act?'req':''}">${disc(s,36)}<div class="tx">${tx}<span class="meta">${meta}</span>${act?`<button class="btn pri sm" style="margin-top:10px" data-act="query" data-id="${qid}">${act}</button>`:''}</div></div>`;
}
const feedFilter=()=>`<div class="chips" style="margin-bottom:0">${[['all','All'],['agents','From agents'],['you','By you']].map(([k,w],i)=>`<button class="chip" aria-pressed="${i===0}">${w}</button>`).join('')}</div>`;
const feedDays=(n=9)=>{let c=0;return EV.map(([d,es])=>{const take=es.slice(0,Math.max(0,n-c));c+=take.length;if(!take.length)return '';return `<div class="fdh">${d}<small>· ${take.length}</small></div>`+take.map(feedRow).join('');}).join('');};
PAGES.activity=function(){
  const band=`<div class="pband"><div class="bandrow"><button class="ring" data-act="back" aria-label="Back">${IC.back}</button><span style="flex:1"></span><button class="avring" data-act="menu">${ME.ini}</button></div><div class="bt" style="margin-top:14px">Activity</div><div style="font-size:14px;color:rgba(255,255,255,.75);margin-top:6px">Everything that’s happened on ${esc(BOOK.title)}, last 30 days</div></div>`;
  return `<div class="screen nv">${band}<div class="sheetpg"><div class="fsum"><div><b>4</b><span>replies from agents</span></div><div><b>6</b><span>things you did</span></div><div><b>2</b><span>still need you</span></div></div>${feedFilter()}${feedDays(20)}</div></div>`;
};
const _h=window.screenHome2;
window.screenHome2=function(){
  let h=_h();
  if(has('f1')){
    const a=h.indexOf('<div class="shd"><span class="h2">Latest</span>'), b=h.indexOf(foundingCard());
    const feed=`<div class="shd"><span class="h2">Activity</span><button class="link" data-act="page" data-v="activity">See all</button></div>${feedFilter()}${feedDays(5)}<button class="btn sec blk" data-act="page" data-v="activity" style="margin:6px 0 4px">See all activity</button>`;
    if(a>-1&&b>a) h=h.slice(0,a)+feed+h.slice(b);
  }
  if(has('f2')){
    h=h.replace(/<button class="avring"/,`<button class="ring" data-act="page" data-v="activity" aria-label="Activity">${IC.inbox}<span class="bdg">3</span></button><button class="avring"`);
  }
  if(has('f3')){
    const seg=`<div class="seg" style="margin-top:0"><button aria-pressed="${S.homeSeg!=='act'}" data-act="homeseg" data-v="ov">Overview</button><button aria-pressed="${S.homeSeg==='act'}" data-act="homeseg" data-v="act">Activity</button></div>`;
    h=h.replace('<div class="sheetpg">','<div class="sheetpg">'+seg);
    if(S.homeSeg==='act'){const i=h.indexOf(seg)+seg.length;h=h.slice(0,i)+`<div class="fsum"><div><b>4</b><span>replies from agents</span></div><div><b>6</b><span>things you did</span></div><div><b>2</b><span>still need you</span></div></div>${feedFilter()}${feedDays(20)}</div></div>`;}
  }
  return h;
};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act="homeseg"]');if(!b)return;e.stopPropagation();S.homeSeg=b.dataset.v;paintScreen();},true);

// ---------- 4. To-do ----------
const _t=window.screenTodo2;
const WHY={t1:'Jonah asked on 24 Oct. Agents usually hope for it within a week.',t2:'Fourteen weeks with no reply. Their usual wait is twelve.',t3:'Eleanor asked two days ago. Send it while it’s fresh.',t4:'Eleven weeks since your query, and their window has passed.',t5:'',t6:'',t7:'',t8:''};
const VERB={send:'Send it',nudge:'Write the nudge',close:'Decide',tidy:'Add it',own:'Mark done'};
const LONG={t1:'Send Jonah the first 3 chapters',t3:'Send Eleanor the full'};
const tq=t=>t.q?qById(t.q):null;
const lead=(t,s=36)=>{const q=tq(t);return q?disc(q.st,s):`<span style="width:${s}px;height:${s}px;border-radius:50%;background:var(--fill);display:grid;place-items:center;flex:none">${IC.todo.replace('<svg','<svg style="width:17px;height:17px"')}</span>`;};
window.screenTodo2=function(){
  const v=['t1','t2','t3'].find(has); if(!v||S.todoSeg==='cork') return _t();
  const orig=_t(); const bandEnd=orig.indexOf('<div class="sheetpg">'); const bandPart=orig.slice(0,bandEnd);
  const g=k=>TASKS.filter(t=>t.grp===k);
  let sh=`<div class="seg" style="margin-top:0"><button data-act="todoseg" data-v="tasks" aria-pressed="true">Tasks</button><button data-act="todoseg" data-v="cork" aria-pressed="false">Corkboard</button></div>`;
  const urgent=[...g('earlier'),...g('today')].filter(t=>t.kind!=='own');
  if(v==='t1'){
    const f=urgent[0];
    sh+=`<div class="focus"><div class="fh"><span>Up next</span><span>1 of ${urgent.length}</span></div><div class="fb"><div style="display:flex;gap:12px;align-items:center">${lead(f,40)}<div><b style="display:block;font-size:15px">${esc(tq(f).name)}</b><span class="sub">${esc(tq(f).agency)}</span></div></div>
      <div class="ft">${esc(f.t)}</div><div class="why">${WHY[f.id]}</div><div class="acts2"><button class="btn pri sm" data-act="task" data-id="${f.id}">${VERB[f.kind]}</button><button class="link" data-act="later" data-id="${f.id}">Not now</button></div></div></div>`;
    const row=(t,late)=>`<button class="ck" data-act="task" data-id="${t.id}"><span class="bx"></span><span class="t"><b>${esc(t.t)}</b><small class="${late?'late':''}">${esc(t.s)}</small></span>${chev}</button>`;
    const sec=(w,ts,late)=>ts.length?`<div class="rowhd">${w} <span class="n">· ${ts.length}</span></div>`+ts.map(t=>row(t,late)).join(''):'';
    sh+=`<div style="margin:0 -16px">${sec('Overdue',g('earlier').filter(t=>t!==f),1)}${sec('Today',g('today').filter(t=>t!==f))}${sec('This week',g('soon'))}${sec('When you have a moment',g('house'))}
      <div class="rowhd">Done today <span class="n">· 2</span></div>${['Logged a reply from Ruth Abbot','Added Hannah Cole to your list'].map(x=>`<div class="ck isdone"><span class="bx done">${IC.check}</span><span class="t"><b>${x}</b></span></div>`).join('')}</div>`;
  }
  if(v==='t2'){
    sh+=`<div class="shd" style="margin-top:4px"><span class="h2">Needs you</span><span class="sub">${urgent.length} tasks</span></div><div class="carou">${urgent.map(t=>{const q=tq(t),late=t.grp==='earlier';return `<div class="uc"><div class="uh" style="background:${late?'var(--pink)':'var(--pink-wash)'};color:#111"><span>${late?'Overdue':'Today'}</span><span>${KIND[t.kind][0]}</span></div><div class="ub"><div style="display:flex;gap:12px;align-items:center">${lead(t,40)}<div><b style="display:block;font-size:15px">${esc(q.name)}</b><span class="sub">${esc(q.agency)}</span></div></div><div class="t">${esc(t.t)}</div><div class="why">${WHY[t.id]}</div><div style="display:flex;gap:14px;align-items:center;margin-top:14px"><button class="btn pri sm" data-act="task" data-id="${t.id}">${VERB[t.kind]}</button><button class="link" data-act="later" data-id="${t.id}">Not now</button></div></div></div>`;}).join('')}</div><div class="dots2">${urgent.map((_,i)=>`<i class="${i===0?'on':''}"></i>`).join('')}</div>`;
    const rest=TASKS.filter(t=>!urgent.includes(t));
    sh+=`<div class="shd"><span class="h2">Everything else</span><span class="sub">${rest.length}</span></div><div style="margin:0 -16px">${rest.map(t=>`<button class="ck" data-act="task" data-id="${t.id}"><span class="bx"></span><span class="t"><b>${esc(t.t)}</b><small>${esc(t.s)}</small></span>${chev}</button>`).join('')}</div>`;
  }
  if(v==='t3'){
    const day=(tile,cls,ts)=>`<div class="tl2"><div class="dt ${cls}">${tile}</div><div>${ts.map(t=>`<div class="tc">${lead(t,34)}<div class="t"><b>${esc(t.t)}</b><small>${esc(t.s.replace(/^[A-Z][a-z]{2} \d+ [A-Z][a-z]{2} · /,''))}</small></div><button class="link" data-act="task" data-id="${t.id}">${KIND[t.kind][2]}</button></div>`).join('')}</div></div>`;
    sh+=day('<b>!</b><span>Overdue</span>','late',g('earlier'))+day('<b>29</b><span>Today</span>','now',g('today'))+day('<b>6</b><span>Fri</span>','',[g('soon')[0]])+day('<b>7</b><span>Sat</span>','',[g('soon')[1]])+`<div class="rowhd" style="padding-left:2px">When you have a moment</div>`+g('house').map(t=>`<div class="tc">${lead(t,34)}<div class="t"><b>${esc(t.t)}</b><small>${esc(t.s)}</small></div><button class="link" data-act="task" data-id="${t.id}">Add</button></div>`).join('');
  }
  return bandPart+`<div class="sheetpg">${sh}</div></div>`;
};

// ---------- 5. Manuscript ----------
const MT=P.get('seg')||'materials';
const matIco=(i)=>`<span class="ico" style="display:grid;place-items:center;border-radius:12px;background:var(--fill)">${i.replace('<svg','<svg style="width:18px;height:18px"')}</span>`;
function msTabsBody(seg){
  if(seg==='materials') return `<div class="shd" style="margin-top:0"><span class="h2">Query letters</span><span class="sub">3</span></div><div class="card" style="padding:0">${[['Letter v3','In 12 queries · 2 requests',1],['Letter v2','In 4 queries · 1 request'],['Letter v1','In 2 queries · no requests']].map(([n,s,c])=>`<button class="mat" data-act="page" data-v="mat">${matIco(IC.doc)}<span class="t"><b>${n}${c?'<span class="cur">Current</span>':''}</b><small>${s}</small></span>${chev}</button>`).join('')}</div>
   <div class="shd"><span class="h2">Synopses</span><span class="sub">2</span></div><div class="card" style="padding:0">${[['One-page synopsis','In 11 queries · 2 requests',1],['Two-page synopsis','Not used yet']].map(([n,s,c])=>`<button class="mat">${matIco(IC.note)}<span class="t"><b>${n}${c?'<span class="cur">Current</span>':''}</b><small>${s}</small></span>${chev}</button>`).join('')}</div>
   <div class="shd"><span class="h2">Sample pages</span><span class="sub">4</span></div><div class="card" style="padding:0">${[['First 3 chapters','11,800 words · in 11 queries'],['First 10 pages','2,900 words · in 4 queries'],['First 50 pages','14,200 words · in 1 query'],['Full manuscript','94,000 words · Draft 4']].map(([n,s])=>`<button class="mat">${matIco(IC.pages)}<span class="t"><b>${n}</b><small>${s}</small></span>${chev}</button>`).join('')}</div>
   <div class="pin"><button class="btn pri blk">${IC.plus}New letter, synopsis or pages</button></div>`;
  if(seg==='packages') return `<p class="lede" style="margin:0 0 12px">What you send each agent. Tap one to see how it’s doing or change what’s in it.</p>${PKS.map(([n,c,s,r,cur],i)=>`<button class="card tap" data-act="page" data-v="pkg" style="margin-bottom:12px;padding:0;overflow:hidden"><div style="padding:14px 16px;background:${i===0?'var(--navy)':'#fff'};color:${i===0?'#fff':'inherit'};display:flex;gap:10px;align-items:center">${IC.box.replace('<svg','<svg style="width:20px;height:20px;flex:none"')}<b style="flex:1;font-size:16px">${n}</b>${i===0?'<span style="font-size:12.5px;opacity:.8">Most used</span>':''}</div><div style="padding:12px 16px 14px"><div style="font-family:var(--type);font-size:20px">${r?`${r} request${r>1?'s':''} from ${s} queries`:`${s} quer${s>1?'ies':'y'}, no replies yet`}</div><div class="sub" style="margin-top:4px">${c}</div><div class="bar-h" style="margin-top:10px;height:8px"><i style="width:${s?r/s*100:0}%"></i></div></div></button>`).join('')}<div class="pin"><button class="btn pri blk">${IC.plus}Build a package</button></div>`;
  if(seg==='comps') return `<p class="lede" style="margin:0 0 12px">Books you compare yours to in your letter. Agents like comps from the last five years.</p>${[['Hamnet','Maggie O’Farrell','2020','In 9 queries · 2 requests','Grief and family in a vividly drawn place.'],['Shuggie Bain','Douglas Stuart','2020','In 6 queries · 1 request','A child’s-eye view of a parent’s struggle.'],['The Lighthouse','Alison Moore','2012','In 2 queries','Older than five years, so worth swapping.']].map(([t,a,y,u,w],i)=>`<button class="card tap" data-act="page" data-v="comp" style="display:flex;gap:14px;margin-bottom:10px"><span class="cov" style="width:48px;height:72px">${IC.book.replace('<svg','<svg style="width:20px;height:20px"')}</span><span style="flex:1;min-width:0"><b style="display:block;font-size:16px">${t}</b><span class="sub">${a} · ${y}</span><span style="display:block;font-size:14px;margin-top:6px;color:var(--ink-2)">${w}</span><span style="display:block;font-size:13px;color:${i===2?'#8a4a3a':'var(--muted)'};font-weight:${i===2?600:400};margin-top:6px">${u}</span></span></button>`).join('')}<div class="pin"><button class="btn pri blk" data-act="page" data-v="compadd">${IC.plus}Add a comp</button></div>`;
  return '';
}
const _ms=PAGES.manuscript;
PAGES.manuscript=function(){
  if(!has('m2')) return _ms();
  const o=_ms(); const i=o.indexOf('<div class="grid3"'); const j=o.indexOf('<div style="margin-top:14px">',i);
  return o.slice(0,j)+`<div class="mtabs" style="margin-top:14px">${[['overview','Overview'],['materials','Materials'],['packages','Packages'],['comps','Comps']].map(([k,w])=>`<button aria-pressed="${MT===k}">${w}</button>`).join('')}</div>${msTabsBody(MT)}`;
};
const sub=(title,body,right='')=>`<div class="screen"><div class="bk" data-hd><button class="ib" data-act="back" aria-label="Back">${IC.back}</button><span class="t">${esc(title)}</span>${right||'<span style="width:40px"></span>'}</div><div style="padding:6px 16px 120px">${body}</div></div>`;
const ACT=(i,w)=>`<button>${i}${w}</button>`;
PAGES.mat=()=>sub('Letter v3',`<div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 2px 12px"><span class="sub">Edited 12 Oct · 412 words</span><span class="cur" style="margin:0">Current</span></div>
  <div class="paper">Dear [Agent],<br><br>When the ferry stops running, a lighthouse keeper’s daughter walks the old salt road to find the brother who never came home. THE SALT ROAD is a literary novel of 94,000 words, and I think it will sit well beside Maggie O’Farrell’s HAMNET…</div>
  <div class="acts3">${ACT(IC.edit,'Edit')}${ACT(IC.plus,'New version')}${ACT(IC.share,'Share')}${ACT(IC.more,'More')}</div>
  <div class="fsum" style="margin-top:14px"><div><b>12</b><span>queries</span></div><div><b>2</b><span>requests</span></div><div><b>17%</b><span>request rate</span></div></div>
  <div class="shd"><span class="h2">Versions</span><button class="link">Compare</button></div><div class="card" style="padding:0">${[['Letter v3','Current · 12 queries · 2 requests'],['Letter v2','4 queries · 1 request'],['Letter v1','2 queries · no requests']].map(([n,s])=>`<div class="mat">${matIco(IC.doc)}<span class="t"><b>${n}</b><small>${s}</small></span>${chev}</div>`).join('')}</div>
  <div class="shd"><span class="h2">In these packages</span></div><div class="card" style="padding:0">${['Standard UK','Letter + 10 pages','Letter + 50 pages'].map(n=>`<div class="mat">${matIco(IC.box)}<span class="t"><b>${n}</b></span>${chev}</div>`).join('')}</div>`);
PAGES.pkg=()=>sub('Standard UK',`<div style="position:relative;padding-top:56px;margin:6px 0 4px"><div class="card" style="position:absolute;inset:0 0 auto 0;height:96px;background:var(--navy);color:#fff;display:flex;gap:10px;align-items:flex-start">${IC.box.replace('<svg','<svg style="width:20px;height:20px;flex:none"')}<b style="font-size:16px">Standard UK</b></div><div class="card" style="position:relative;margin:0 12px;box-shadow:0 10px 24px rgba(31,38,51,.14)"><div style="font-family:var(--type);font-size:22px">2 requests from 11</div><div class="sub" style="margin-top:4px">1 full, 1 partial · your best package</div></div></div>
  <div class="acts3">${ACT(IC.send,'Use it')}${ACT(IC.plus,'Copy')}${ACT(IC.share,'Share')}${ACT(IC.more,'More')}</div>
  <div class="shd"><span class="h2">What’s in it</span><span class="sub">Tap to swap</span></div>
  ${[['Letter v3','Query letter',IC.doc],['One-page synopsis','Synopsis',IC.note],['First 3 chapters','Sample pages',IC.pages]].map(([n,k,i])=>`<button class="slot">${matIco(i)}<span class="t"><b>${n}</b><small>${k}</small></span><span class="sw2">Swap</span></button>`).join('')}
  <button class="slot" style="box-shadow:inset 0 0 0 1.5px var(--rule);border:0;background:transparent;color:var(--muted);justify-content:center;font-weight:600">${IC.plus.replace('<svg','<svg style="width:18px;height:18px"')} Add something else</button>
  <div class="shd"><span class="h2">Sent with</span><span class="sub">11 queries</span></div><div class="rows" style="margin:0 -16px">${QUERIES.filter(q=>q.pkg==='std').slice(0,4).map(qRow).join('')}</div>`);
PAGES.comp=()=>sub('Hamnet',`<div style="display:flex;gap:16px;align-items:center;margin:8px 0 14px"><span class="cov" style="width:80px;height:120px">${IC.book}</span><div><div style="font-family:var(--type);font-size:26px;line-height:1.1">Hamnet</div><div style="margin-top:6px">Maggie O’Farrell</div><div class="sub">2020 · Literary fiction</div></div></div>
  <div class="card"><div class="sub" style="font-weight:600;color:var(--ink-2)">Why it’s a comp</div><p style="margin:6px 0 0;font-size:15.5px;line-height:1.5">Grief and family in a vividly drawn place, written for book club readers.</p></div>
  <div class="acts3">${ACT(IC.edit,'Edit')}${ACT(IC.sort,'Move up')}${ACT(IC.closeq,'Remove')}${ACT(IC.more,'More')}</div>
  <div class="fsum" style="margin-top:14px"><div><b>9</b><span>queries</span></div><div><b>2</b><span>requests</span></div><div><b>5</b><span>years old</span></div></div>
  <div class="shd"><span class="h2">In these letters</span></div><div class="card" style="padding:0">${['Letter v3','Letter v2'].map(n=>`<div class="mat">${matIco(IC.doc)}<span class="t"><b>${n}</b></span>${chev}</div>`).join('')}</div>`);
PAGES.compadd=()=>sub('Add a comp',`<p class="lede" style="margin:4px 0 16px">A recent book your readers would also love.</p>
  <label class="fld"><span>Title</span><input value="Hamnet"></label><label class="fld"><span>Author</span><input value="Maggie O’Farrell"></label><label class="fld"><span>Year published</span><input value="2020" inputmode="numeric"></label><label class="fld"><span>Why it’s a comp</span><textarea>Grief and family in a vividly drawn place.</textarea></label>
  <label class="fld" style="display:flex;gap:12px;align-items:center"><input type="checkbox" checked style="width:22px;height:22px;min-height:0;flex:none"><span style="margin:0;font-weight:400">Add it to Letter v3</span></label>
  <button class="btn pri blk" style="margin-top:8px">Save comp</button>`);

function go(){
  S.tab=tab; S.stack=page?[page]:[]; S.overlay=null;
  if(P.get('filter')) S.filter=P.get('filter'); if(P.get('hseg')) S.homeSeg=P.get('hseg');
  paintScreen();
  if(ov==='birds') openOverlay({k:'birds'});
  if(scroll) setTimeout(()=>{SC.scrollTop=scroll;S.away=false;TB.classList.remove('away');lastY=SC.scrollTop;},40);
}
{const _f=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(o){return _f.call(this,Object.assign({},o||{},{preventScroll:true}));};}
setTimeout(go,60);
})();
