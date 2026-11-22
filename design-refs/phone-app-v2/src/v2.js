// ---------- v2: navy band header, split bar, white Up next, spot illustrations ----------
// placeholder art: dashed disc, labelled
(function(){
  const ph=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><circle cx="60" cy="60" r="57" fill="#f6efe9" stroke="#c9b9ae" stroke-width="2.5" stroke-dasharray="7 6"/><path d="M38 70l14-15 12 12 8-8 14 14" fill="none" stroke="#b9a497" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="74" cy="46" r="6" fill="#b9a497"/></svg>`;
  ART.placeholder='data:image/svg+xml;utf8,'+encodeURIComponent(ph);
  ART.talon=ART.placeholder; ART.hourglass=ART.placeholder; ART.courierMap=ART.placeholder;
})();
const spot=(k,size=56,bg='var(--pink-wash)')=>k==='placeholder'||ART[k]===ART.placeholder
  ?`<img class="spot" src="${ART.placeholder}" alt="Illustration to come" style="width:${size}px;height:${size}px" draggable="false">`
  :`<span class="spot" style="width:${size}px;height:${size}px;background:${bg}"><img src="${ART[k]}" alt="" draggable="false"></span>`;

// hero (Strava-style toggle)
const HS={m:'active',r:'3M'};
const SERIES={
  active:{n:'active queries',v:[1,2,3,4,5,6,8,9,10,11,11,12,12,11,11,11]},
  sent:{n:'queries sent',v:[1,2,3,4,6,7,8,9,10,11,12,13,14,14,15,16]},
  replies:{n:'replies',v:[0,0,0,0,1,1,1,2,2,3,4,5,5,6,7,8]},
  requests:{n:'requests',v:[0,0,0,0,0,0,0,0,0,1,2,2,3,3,3,4]},
};
const MNAME={active:'Active',sent:'Sent',replies:'Replies',requests:'Requests'};
const RANGE={'1M':[5,'in the last month'],'3M':[13,'in the last 3 months'],'All':[16,'since 13 Jul']};
function heroBand(){
  const s=SERIES[HS.m],[n,phr]=RANGE[HS.r],v=s.v.slice(-n),cur=v[v.length-1],d=cur-v[0];
  const {d:path,pts}=sparkPath(v,320,74,6),last=pts[pts.length-1];
  return `<div style="display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px">${Object.keys(SERIES).map(k=>`<button data-act="hero" data-m="${k}" style="height:32px;padding:0 13px;border-radius:999px;font-size:13.5px;font-weight:600;flex:none;${HS.m===k?'background:#fff;color:var(--navy)':'background:rgba(255,255,255,.12);color:#fff'}" aria-pressed="${HS.m===k}">${MNAME[k]}</button>`).join('')}</div>
   <button data-act="tab" data-v="queries" style="display:block;width:100%;text-align:left;color:#fff;margin-top:16px">
   <span style="display:flex;align-items:baseline;gap:10px"><span class="num" style="font-size:54px;line-height:.9">${cur}</span><span style="font-size:16px;color:rgba(255,255,255,.75)">${s.n}</span></span>
   <span style="font-size:14px;margin-top:9px;color:rgba(255,255,255,.75);display:flex;align-items:center;gap:6px">${d>0?`<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#f3d2cc" stroke-width="1.8" stroke-linecap="round"><path d="M6 10V2M2.5 5.5 6 2l3.5 3.5"/></svg><b style="color:#fff">+${d}</b>`:'<b style="color:#fff">No change</b>'} ${phr}</span>
   <svg viewBox="0 0 320 74" preserveAspectRatio="none" style="display:block;width:100%;height:74px;margin-top:12px" aria-hidden="true"><defs><linearGradient id="hb" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="${path} L320 74 L0 74Z" fill="url(#hb)"/><path d="${path}" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="${last[0]-4}" cy="${last[1]}" r="5" fill="#f3d2cc" stroke="#2a3a52" stroke-width="2"/></svg></button>
   <div style="display:flex;justify-content:space-around;margin-top:8px">${Object.keys(RANGE).map(k=>`<button data-act="hero" data-r="${k}" style="height:32px;min-width:56px;border-radius:999px;font-size:13.5px;font-weight:600;${HS.r===k?'background:rgba(255,255,255,.16);color:#fff':'color:rgba(255,255,255,.7)'}" aria-pressed="${HS.r===k}">${k}</button>`).join('')}</div>`;
}

// band + sheet
const ringB=(i,act,lbl,v='')=>`<button class="ring" data-act="${act}" ${v?`data-v="${v}"`:''} aria-label="${lbl}">${i}</button>`;
function bandRow(left,extra=''){
  return `<div class="bandrow">${left}${extra}${ringB(IC.search,'search','Search')}${ringB(IC.chat,'feedback','Send feedback')}<button class="avring" data-act="menu" aria-label="Open menu">${ME.ini}</button></div>`;
}
const msBtn=(t,cls='')=>`<button class="msb ${cls}" data-act="ms">${esc(t)}<span class="chv">${IC.down}</span></button>`;
const titleLeft=(t,sub)=>`<div class="bl"><div class="bt">${esc(t)}</div>${msBtn(sub,'small')}</div>`;
function bandPage(key,band,sheet){
  return `<div class="screen nv" data-scr="${key}"><div class="band">${band}</div><div class="sheetpg">${sheet}</div></div>`;
}

// ---------- HOME ----------
function screenHome2(){
  const greet=`<div class="bl"><div class="bg">Afternoon, ${ME.first}</div>${msBtn(BOOK.title)}</div>`;
  if(S.empty){
    return bandPage('home',bandHead(null)+`<div class="bandtx">Your campaign chart starts with your first query.</div>`,
     `<div class="card" style="padding:18px"><div style="display:flex;gap:14px;align-items:center">${spot('placeholder',64)}<div class="h2" style="font-size:21px;flex:1">Let’s log your first query</div></div>
      <p class="lede" style="margin:12px 0 6px">Bring in the queries you’ve already sent, or start fresh. It takes a minute.</p>
      <div class="group" style="box-shadow:none;margin:0 -16px">
        <button class="li" data-act="page" data-v="import"><span class="ico">${IC.upload}</span><span class="lt">Smart import<span class="sub" style="display:block">Drop in any tracker spreadsheet</span></span>${chevR}</button>
        <button class="li" data-act="page" data-v="import"><span class="ico">${IC.doc}</span><span class="lt">Use our template<span class="sub" style="display:block">Fill it in, then upload</span></span>${chevR}</button>
        <button class="li" data-act="flow" data-v="log"><span class="ico">${IC.plus}</span><span class="lt">Log one by hand<span class="sub" style="display:block">One question at a time</span></span>${chevR}</button>
      </div></div>
      <div class="shd"><span class="h2">Getting started</span><span class="sub">1 of 4 done</span></div>
      <div class="group">${[['Add your manuscript',1],['Log your first query',0],['Add an agent you want to query',0],['Set your weekly goal',0]].map(([t,d])=>`<div class="task" style="background:#fff"><span class="tick" style="${d?'background:var(--navy);box-shadow:none;color:#fff':''}">${d?IC.check.replace('<svg','<svg style="opacity:1"'):''}</span><span class="lt"><b style="${d?'color:var(--muted);text-decoration:line-through':''}">${t}</b></span></div>`).join('')}</div>${foundingCard()}`);
  }
  const SC2=[['you','With you','var(--pink)'],['agent','With the agent','var(--navy)'],['quiet','Gone quiet','#c9c2b6']];
  const n=k=>byCourt(k).length, tot=SC2.reduce((a,[k])=>a+n(k),0);
  const t=TASKS.find(x=>x.grp==='today'&&x.kind==='send')||TASKS[0];
  const tq=t.q?qById(t.q):null;
  let sh=`<div class="card">
     <div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:16px">Where they stand</b><span class="sub">${tot} active</span></div>
     <div style="display:flex;gap:3px;height:14px;margin:12px 0 4px">${SC2.map(([k,,col])=>`<i style="flex:${n(k)};background:${col};border-radius:4px"></i>`).join('')}</div>
     <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 -8px">${SC2.map(([k,w,col])=>`<button data-act="filter" data-v="${k}" style="text-align:left;padding:8px;border-radius:12px"><span style="display:flex;align-items:center;gap:7px"><i style="width:10px;height:10px;border-radius:3px;background:${col}"></i><span class="num" style="font-size:26px">${n(k)}</span></span><span class="sub" style="display:block;margin-top:2px">${w}</span></button>`).join('')}</div>
     <button data-act="filter" data-v="closed" class="closedline">${glyph('rejected',18)}<span style="flex:1;text-align:left"><b>${byCourt('closed').length} closed</b> · ${byCourt('closed').filter(q=>q.st==='rejected').length} passed, ${byCourt('closed').filter(q=>q.st==='noresp').length} no response</span>${IC.chev.replace('<svg','<svg style="width:16px;height:16px;color:var(--faint)"')}</button></div>
   <div class="nextc"><div class="nh"><span class="h2" style="font-size:18px">Up next</span><button class="link" data-act="tab" data-v="todo" style="display:flex;align-items:center;gap:2px">See all ${TASKS.length}${IC.chev.replace('<svg','<svg style="width:14px;height:14px"')}</button></div>
     <div class="nb"><div style="flex:1;min-width:0"><div style="font-size:18px;font-weight:600;line-height:1.25">${esc(t.t)}</div><div class="sub" style="margin-top:3px">${esc(t.s)}</div>
       <button class="btn pri sm" style="margin-top:12px" data-act="${tq?'query':'task'}" data-id="${tq?tq.id:t.id}">View task</button></div>${spot('placeholder',64)}</div></div>
   <div class="shd"><span class="h2">Latest</span><button class="link" data-act="page" data-v="responses">Responses</button></div>
   <div class="card feed" style="padding:4px 16px">${FEED.slice(0,3).map(([g,tx,w])=>`<div class="it">${disc(g,32)}<div class="tx">${tx}<small>${w}</small></div></div>`).join('')}</div>`+foundingCard();
  return bandPage('home',bandHead(null)+`<div style="margin-top:22px">${heroBand()}</div>`,sh);
}

// ---------- QUERIES ----------
function screenQueries2(){
  const band=bandHead('Queries',ringB(IC.eye,'birds','Birds-eye view'));
  if(S.empty) return bandPage('queries',band+`<div class="bandtx">Nothing logged yet.</div>`,
    `<div class="card"><div style="display:flex;gap:14px;align-items:center">${spot('placeholder',64)}<div class="h2" style="font-size:21px;flex:1">Let’s log your first query</div></div>
     <p class="lede" style="margin:12px 0 14px">Every query you log gets its own card: what you sent, when to nudge and what happens next.</p>
     <button class="btn pri blk" data-act="flow" data-v="log">${IC.plus}Log a query</button><button class="btn sec blk" style="margin-top:10px" data-act="page" data-v="import">${IC.upload}Import a spreadsheet</button></div>
     <div class="shd"><span class="h2">What you’ll see here</span><span class="sub">Examples</span></div><div class="rows" style="opacity:.55;pointer-events:none">${[QUERIES[0],QUERIES[2],QUERIES[4]].map(qRow).join('')}</div>`);
  const counts={all:QUERIES.length,you:byCourt('you').length,agent:byCourt('agent').length,quiet:byCourt('quiet').length,closed:byCourt('closed').length};
  const bandStats=`<div class="bstats"><span><b class="num">${QUERIES.length}</b> sent</span><span><b class="num">${active().length}</b> active</span><span><b class="num">${counts.you}</b> with you</span></div>`;
  let sh=`<div class="chips" style="margin-top:-2px">${[['all','All'],['you','With you'],['agent','With the agent'],['quiet','Gone quiet'],['closed','Closed']].map(([k,w])=>`<button class="chip" data-act="filter" data-v="${k}" aria-pressed="${S.filter===k}">${w} <b>${counts[k]}</b></button>`).join('')}</div>`;
  const shown=S.filter==='all'?['you','agent','quiet','closed']:[S.filter];
  sh+=`<div class="rows">`+shown.map(c=>{const qs=byCourt(c);if(!qs.length)return '';return groupHd(c,qs.length)+qs.map(qRow).join('')}).join('')+`</div>`;
  if(S.filter==='closed'||S.filter==='all') sh+=`<button class="card tap" data-act="page" data-v="responses" style="margin-top:18px;display:flex;gap:12px;align-items:center">${spot('wallHawk',48)}<span style="flex:1"><b style="display:block;font-size:15.5px">See your Wall of no</b><span class="sub">Every pass, in one place you can share</span></span>${IC.chev.replace('<svg','<svg style="width:18px;height:18px;color:var(--faint)"')}</button>`;
  return bandPage('queries',band+bandStats,sh);
}

// ---------- TO-DO ----------
function screenTodo2(){
  const g=k=>TASKS.filter(t=>t.grp===k);
  const band=bandHead('To-do')+(S.todoSeg==='cork'
    ?`<div class="bstats"><span><b class="num">${NOTES.length}</b> notes pinned</span></div>`
    :`<div style="margin-top:18px;color:#fff"><div style="font-size:14px;color:rgba(255,255,255,.72)">Thursday</div><div class="num" style="font-size:32px;line-height:1.05;margin-top:2px">29 October</div></div>
      <div class="bstats" style="margin-top:12px"><span><b class="num">${g('earlier').length}</b> from earlier</span><span><b class="num">${g('today').length}</b> today</span><span><b class="num">${g('soon').length}</b> coming up</span></div>`);
  let sh=`<div class="seg" style="margin-top:0"><button data-act="todoseg" data-v="tasks" aria-pressed="${S.todoSeg==='tasks'}">Tasks</button><button data-act="todoseg" data-v="cork" aria-pressed="${S.todoSeg==='cork'}">Corkboard</button></div>`;
  if(S.todoSeg==='cork'){
    sh+=`<p class="lede" style="margin:0 0 16px">Notes to yourself. Pin anything you want to remember about agents, materials or your book.</p>
      <div class="grid2" style="gap:18px 14px">${NOTES.map(n=>`<div class="note" style="background:${n.c};transform:rotate(${n.r}deg)">${esc(n.t)}<small>${n.d}</small></div>`).join('')}
      <button class="note nopin" data-act="flow" data-v="note" style="background:transparent;box-shadow:inset 0 0 0 1.5px #cdc5b8;display:grid;place-items:center;color:var(--muted);font-weight:600">${IC.plus.replace('<svg','<svg style="width:22px;height:22px"')}<span>Add a note</span></button></div>`;
  } else {
    const sec=(k,w)=>{const ts=g(k);if(!ts.length)return '';return `<div class="rowhd">${w} <span class="n">· ${ts.length}</span></div>`+ts.map(taskRow).join('');};
    sh+=`<div class="rows" style="margin-top:-8px">${sec('earlier','From earlier')}${sec('today','Today')}${sec('soon','Coming up')}${sec('house','When you have a moment')}</div>`;
  }
  return bandPage('todo',band,sh);
}

// ---------- AGENTS ----------
function screenAgents2(){
  const all=agentsAll(), toq=all.filter(a=>!a.q), qd=all.filter(a=>a.q);
  const band=bandHead('Agents')+`<div class="bstats"><span><b class="num">${all.length}</b> on your list</span><span><b class="num">${toq.length}</b> to query</span></div>`;
  let sh=`<button class="card tap" data-act="page" data-v="discover" style="display:flex;gap:12px;align-items:center;padding:12px 14px;margin-bottom:12px">${spot('scout',52,'var(--page)')}
    <span style="flex:1;min-width:0"><b style="display:block;font-size:15.5px">The Scout found 3 agents</b><span class="sub">Verified agents looking for books like ${esc(BOOK.title)}</span></span>${IC.chev.replace('<svg','<svg style="width:18px;height:18px;color:var(--faint);flex:none"')}</button>`;
  sh+=`<div class="chips">${[['all','All',all.length],['toq','To query',toq.length],['qd','Queried',qd.length]].map(([k,w,c])=>`<button class="chip" data-act="agfilter" data-v="${k}" aria-pressed="${S.agFilter===k}">${w} <b>${c}</b></button>`).join('')}</div>`;
  const row=a=>`<div class="sw"><button class="row" data-act="agent" data-id="${a.id}"><span class="av">${ini(a.name)}</span><span class="mid"><span class="nm" style="display:block">${esc(a.name)}</span><span class="ag" style="display:block">${esc(a.agency)}</span></span><span class="rt">${a.q?stLabel(a.q.st):'<span class="tag" style="background:var(--pink-wash)">To query</span>'}</span></button></div>`;
  sh+='<div class="rows">';
  if(S.agFilter!=='qd') sh+=`<div class="rowhd">To query <span class="n">· ${toq.length}</span></div>`+toq.map(row).join('');
  if(S.agFilter!=='toq') sh+=`<div class="rowhd">Queried <span class="n">· ${qd.length}</span></div>`+qd.map(row).join('');
  sh+='</div>';
  return bandPage('agents',band,sh);
}
const NAVY_OFF=['flow','cele','search'];
const isNavy=()=>(!S.stack.length||(typeof PH!=='undefined'&&PH==='B'))&&!(S.overlay&&NAVY_OFF.includes(S.overlay.k)&&!(S.overlay.k==='flow'&&typeof FL!=='undefined'&&(FL==='B'||FL==='D'||FL==='E')));

// ---------- band head variants ----------
let HV='C';
const avBtn=`<button class="avring" data-act="menu" aria-label="Open menu">${ME.ini}</button>`;
const bookChip=()=>`<button class="bchip" data-act="ms">${IC.book}<span class="mt">${esc(BOOK.title)}</span>${IC.down}</button>`;
function bandHead(page,extra=''){
  const S_=ringB(IC.search,'search','Search'), F_=ringB(IC.chat,'feedback','Send feedback');
  const hello=`Afternoon, ${ME.first}`;
  const markB=(!page&&typeof BRAND!=='undefined'&&BRAND==='B')?`<img src="${ART.hawkhead}" alt="QueryHawk" style="width:34px;height:34px;border-radius:50%;background:#f4f0e9;flex:none">`:'';
  if(HV==='A'){ // stacked: tools on their own row, name gets the full width
    return `<div class="bandrow">${avBtn}<span style="flex:1"></span>${extra}${S_}${F_}</div>
      <div class="hA">${page?`<div class="bt">${esc(page)}</div><button class="msb small" data-act="ms"><span class="mt">${esc(BOOK.title)}</span><span class="chv">${IC.down}</span></button>`
        :`<div class="bg">${hello}</div><button class="msb wrap" data-act="ms"><span class="mt">${esc(BOOK.title)}</span><span class="chv">${IC.down}</span></button>`}</div>`;
  }
  if(HV==='B'){ // fewer buttons: feedback moves into the menu
    return `<div class="bandrow" style="align-items:flex-start">${page?`<div class="bl"><div class="bt">${esc(page)}</div><button class="msb small" data-act="ms"><span class="mt">${esc(BOOK.title)}</span><span class="chv">${IC.down}</span></button></div>`
      :`<div class="bl"><div class="bg">${hello}</div><button class="msb wrap" data-act="ms"><span class="mt">${esc(BOOK.title)}</span><span class="chv">${IC.down}</span></button></div>`}${extra}${S_}${avBtn}</div>`;
  }
  if(HV==='C'){ // book as a chip on its own line
    return `<div class="bandrow">${markB}<div class="bl">${page?`<div class="bt">${esc(page)}</div>`:`<div class="bt" style="font-size:22px">${hello}</div>`}</div>${extra}${S_}${F_}${avBtn}</div><div style="margin-top:12px">${bookChip()}</div>`;
  }
  // D: one line, shorter and truncated
  return `<div class="bandrow">${page?`<div class="bl"><div class="bt">${esc(page)}</div><button class="msb small" data-act="ms"><span class="mt">${esc(BOOK.title)}</span><span class="chv">${IC.down}</span></button></div>`
    :`<div class="bl"><div class="bg">${hello}</div><button class="msb trunc" data-act="ms"><span class="mt">${esc(BOOK.title)}</span><span class="chv">${IC.down}</span></button></div>`}${extra}${S_}${F_}${avBtn}</div>`;
}

// founding card: no section title; header reads "[name] · Founding writer"
function foundingCard(){
  return `<div class="card" style="padding:0;overflow:hidden;margin-top:22px">
    <div class="fstripe" style="background:repeating-linear-gradient(135deg,var(--pink) 0 14px,var(--pink-wash) 14px 28px);padding:14px 16px;display:flex;align-items:center;gap:12px">
      <div style="flex:1;min-width:0"><div style="font-family:var(--type);font-size:21px;line-height:1.15;color:#111">${ME.name}</div><div style="font-size:13.5px;font-weight:600;color:#111;margin-top:2px">Founding writer</div></div>
      ${spot('tierFounding',58,'#fff')}
    </div>
    <div style="padding:14px 16px 16px">
      <div style="display:flex;align-items:center;gap:10px;margin:0 0 6px"><span class="tag" style="background:var(--navy);color:#fff">Fledgling</span><span class="sub">2 of 5 to Archivist</span></div>
      <div class="bar-h"><i style="width:40%"></i></div>
      <p style="font-size:14.5px;line-height:1.4;margin:14px 0 12px;color:var(--ink-2)">Your feedback shapes QueryHawk. Tell us what works, what doesn’t, and what you’d add.</p>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn sec sm" data-act="feedback" data-v="like" aria-label="Something I like">${IC.thumbUp}</button>
        <button class="btn sec sm" data-act="feedback" data-v="dislike" aria-label="Something I don’t like">${IC.thumbDown}</button>
        <button class="btn sec sm" data-act="feedback" data-v="idea">${IC.bulb}An idea</button>
        <button class="link" style="margin-left:auto;white-space:nowrap" data-act="page" data-v="goals">How it works</button>
      </div>
    </div>
  </div>`;
}

// ---------- accent / rows / action sheet variants ----------
let ACC='B', QROW='B', ACT='C';
function qRow(q){
  const c=courtOf(q), swipe=c!=='closed';
  const lAct=c==='you'?['next','Next step',IC.send]:['nudge','Nudge',IC.bell];
  const when=q.closed||q.next||'';
  const lead=QROW==='B'?disc(q.st,40):QROW==='C'?`<span class="av badged">${ini(q.name)}<span class="bd" style="background:${stFill(q.st)}">${glyph(q.st,15)}</span></span>`:`<span class="av">${ini(q.name)}</span>`;
  const status=QROW==='A'?stLabel(q.st):`<span class="st">${ST[q.st].w}</span>`;
  const row=`<button class="row" data-act="query" data-id="${q.id}">${lead}
     <span class="mid"><span class="nm" style="display:block">${esc(q.name)}</span><span class="ag" style="display:block">${esc(q.agency)}</span></span>
     <span class="rt">${status}<span class="when ${q.mv?'mv':''}" style="display:block">${esc(when)}</span></span></button>`;
  if(!swipe) return `<div class="sw">${row}</div>`;
  return `<div class="sw" data-swipe><div class="acts"><button class="l" data-act="${lAct[0]}" data-id="${q.id}">${lAct[2]}${lAct[1]}</button><button class="r" data-act="closeq" data-id="${q.id}">${IC.closeq}Close</button></div>${row}</div>`;
}
const ACT_ITEMS=[['log','I sent a query','Log it in a few taps',()=>disc('queried',44)],['respond','An agent replied','A request, a pass or an offer',()=>disc('freq',44)],['agent','Add an agent','Someone you want to query',()=>`<span class="ico2">${IC.agents}</span>`],['task','Add a task or note','Something for later',()=>`<span class="ico2">${IC.todo}</span>`]];
function ovAction(){
  let b='';
  if(ACT==='A'){
    b=`<div class="tiles">${ACT_ITEMS.map(([v,t,s],i)=>`<button class="tile ${i<2?'warm':''}" data-act="flow" data-v="${v}">${img(['courierCut','discHawk'][i]||'logo').replace('<img','<img style="'+(i<2?'':'display:none')+'"')}<span class="ic" style="background:#fff">${[IC.send,IC.reply,IC.agents,IC.todo][i]}</span><b>${t}<small>${s}</small></b></button>`).join('')}</div>`;
  } else if(ACT==='B'){
    b=`<div class="group">${ACT_ITEMS.map(([v,t,s,ic])=>`<button class="li" style="min-height:70px;gap:14px" data-act="flow" data-v="${v}">${ic()}<span class="lt"><span style="display:block;font-weight:600">${t}</span><span class="sub">${s}</span></span>${chevR}</button>`).join('')}<button class="li" style="min-height:62px;gap:14px" data-act="page" data-v="import"><span class="ico2">${IC.upload}</span><span class="lt"><span style="display:block;font-weight:600">Import a spreadsheet</span><span class="sub">Bring in queries you’ve already sent</span></span>${chevR}</button></div>`;
  } else if(ACT==='C'){
    b=`<div style="display:flex;flex-direction:column;gap:10px">${ACT_ITEMS.slice(0,2).map(([v,t,s,ic])=>`<button class="actrow" data-act="flow" data-v="${v}">${ic()}<span class="lt"><b>${t}</b><small>${s}</small></span>${chevR}</button>`).join('')}</div>
      <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">${[...ACT_ITEMS.slice(2).map(([v,t])=>[v,t,'flow']),['import','Import','page']].map(([v,t,a],i)=>`<button class="chip" style="height:42px;padding:0 16px" data-act="${a}" data-v="${v}">${[IC.agents,IC.todo,IC.upload][i].replace('<svg','<svg style="width:17px;height:17px"')}${t.replace('Add a task or note','Task or note')}</button>`).join('')}</div>`;
  } else {
    b=`<div class="qa4">${ACT_ITEMS.map(([v,t],i)=>`<button data-act="flow" data-v="${v}"><span class="ico2" style="${i<2?'background:var(--navy);color:#fff':''}">${[IC.send,IC.reply,IC.agents,IC.todo][i]}</span>${['Sent a query','Agent replied','Add agent','Task or note'][i]}</button>`).join('')}</div>
      <div class="group" style="margin-top:18px"><button class="li" data-act="page" data-v="import"><span class="ico">${IC.upload}</span><span class="lt">Import queries from a spreadsheet</span>${chevR}</button></div>`;
  }
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet" data-sheet style="height:auto;padding-bottom:100px;z-index:31"><div class="grab"></div><div class="body" style="overflow:visible"><div class="sh-t">What happened?</div>${b}</div></div>`;
}
