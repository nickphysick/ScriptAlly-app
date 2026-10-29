// ---------- state ----------
const S0=()=>({tab:'home',stack:[],filter:'all',agFilter:'all',todoSeg:'tasks',mseg:'overview',empty:false,overlay:null,toast:null,away:false,open:null});
let S=S0();

// ---------- helpers ----------
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
const ini=n=>n.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
const img=(k,cls='',alt='')=>`<img src="${ART[k]}" class="${cls}" alt="${alt}" draggable="false">`;
const active=()=>QUERIES.filter(q=>courtOf(q)!=='closed');
const byCourt=c=>QUERIES.filter(q=>courtOf(q)===c);
const qById=id=>QUERIES.find(q=>q.id===id);
const disc=(k,size=36)=>`<span style="width:${size}px;height:${size}px;border-radius:50%;background:${stFill(k)};display:grid;place-items:center;flex:none">${glyph(k,Math.round(size*.56))}</span>`;
function agentsAll(){
  const seen={};const out=[];
  QUERIES.forEach(q=>{if(!seen[q.name]){seen[q.name]=1;out.push({id:'q:'+q.id,name:q.name,agency:q.agency,q:q,looking:'Literary and book club fiction',how:'Email · letter, synopsis, first 3 chapters',reply:'Usually 8–12 weeks'})}});
  AGENTS_EXTRA.forEach(a=>out.push(Object.assign({},a)));
  return out.sort((a,b)=>a.name.localeCompare(b.name));
}
const agentById=id=>agentsAll().find(a=>a.id===id);

// ---------- shell parts ----------
function hdr(title,right='',subl=BOOK.title){
  return `<header class="hd" data-hd>
    <button class="me" data-act="menu" aria-label="Open menu">${ME.ini}</button>
    <div class="ttl"><h1>${esc(title)}</h1><button class="ms" data-act="ms">${esc(subl)} ${IC.down}</button></div>
    ${right}
    <button class="ib" data-act="feedback" aria-label="Send feedback">${IC.chat}</button>
  </header>`;
}
const searchPill=ph=>`<button class="search" data-act="search">${IC.search}<span>${ph}</span></button>`;
function bkOld(title,right=''){
  return `<div class="bk" data-hd><button class="ib" data-act="back" aria-label="Back">${IC.back}</button><span class="t">${esc(title)}</span>${right||'<span style="width:40px"></span>'}</div>`;
}
function tabbar(){
  const tabs=[['home','Home',IC.home],['queries','Queries',IC.queries],null,['todo','To-do',IC.todo],['agents','Agents',IC.agents]];
  const plusOpen=S.overlay&&S.overlay.k==='action';
  const badge=S.empty?0:TASKS.filter(t=>t.grp==='earlier'||t.grp==='today').length;
  return tabs.map(t=>t?`<button class="tb" data-act="tab" data-v="${t[0]}" ${S.tab===t[0]&&!S.stack.length?'aria-current="page"':''}><span class="i">${t[0]==='home'&&typeof BRAND!=='undefined'&&BRAND==='C'?`<img src="${ART.hawkhead}" alt="" style="width:26px;height:26px;border-radius:50%;background:#f4f0e9">`:t[2]}</span>${t[1]}${t[0]==='todo'&&badge?`<span class="badge">${badge}</span>`:''}</button>`
    :`<button class="plus" data-act="plus" aria-label="Log something" aria-expanded="${plusOpen}">${IC.plus}</button>`).join('');
}

// ---------- rows ----------
function qRow(q){
  const c=courtOf(q), swipe=c!=='closed';
  const lAct=c==='you'?['next','Next step',IC.send]:['nudge','Nudge',IC.bell];
  const when=q.closed||q.next||'';
  const row=`<button class="row" data-act="query" data-id="${q.id}">
     <span class="av">${ini(q.name)}</span>
     <span class="mid"><span class="nm" style="display:block">${esc(q.name)}</span><span class="ag" style="display:block">${esc(q.agency)}</span></span>
     <span class="rt">${stLabel(q.st)}<span class="when ${q.mv?'mv':''}" style="display:block">${esc(when)}</span></span>
   </button>`;
  if(!swipe) return `<div class="sw">${row}</div>`;
  return `<div class="sw" data-swipe><div class="acts"><button class="l" data-act="${lAct[0]}" data-id="${q.id}">${lAct[2]}${lAct[1]}</button><button class="r" data-act="closeq" data-id="${q.id}">${IC.closeq}Close</button></div>${row}</div>`;
}
const groupHd=(c,n)=>`<div class="rowhd"><span>${COURT[c].w}</span><span class="n">· ${n}</span></div>`;

// ---------- HOME ----------
function sparkPath(vals,w,h,pad=4){
  const max=Math.max(...vals),min=0;const dx=w/(vals.length-1);
  const pts=vals.map((v,i)=>[i*dx,h-pad-(v-min)/(max-min||1)*(h-pad*2)]);
  let d=`M${pts[0][0]} ${pts[0][1]}`;
  for(let i=1;i<pts.length;i++){const [x0,y0]=pts[i-1],[x1,y1]=pts[i];const cx=(x0+x1)/2;d+=` C${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`;}
  return {d,pts};
}
function screenHome(){
  const act=active().length, you=byCourt('you'), ag=byCourt('agent'), qu=byCourt('quiet');
  let h=hdr(BOOK.title,'','Querying since 6 Sep')+searchPill('Search queries, agents and notes');
  if(S.empty){
    h+=`<div class="card" style="padding:18px 18px 8px">
      ${img('courierMap','empty-art','')}
      <div class="h2" style="font-size:22px">Let’s log your first query</div>
      <p class="lede" style="margin:6px 0 10px">Bring in the queries you’ve already sent, or start fresh. It takes a minute.</p>
      <div class="group" style="box-shadow:none;margin:0 -16px">
        <button class="li" data-act="page" data-v="import"><span class="ico">${IC.upload}</span><span class="lt">Smart import<span class="sub" style="display:block">Drop in any tracker spreadsheet</span></span>${IC.chev.replace('<svg','<svg class="chev"')}</button>
        <button class="li" data-act="page" data-v="import"><span class="ico">${IC.doc}</span><span class="lt">Use our template<span class="sub" style="display:block">Fill it in, then upload</span></span>${IC.chev.replace('<svg','<svg class="chev"')}</button>
        <button class="li" data-act="flow" data-v="log"><span class="ico">${IC.plus}</span><span class="lt">Log one by hand<span class="sub" style="display:block">One question at a time</span></span>${IC.chev.replace('<svg','<svg class="chev"')}</button>
      </div></div>
      <div class="shd"><span class="h2">Getting started</span><span class="sub">1 of 4 done</span></div>
      <div class="group">${[['Add your manuscript',1],['Log your first query',0],['Add an agent you want to query',0],['Set your weekly goal',0]].map(([t,d])=>`<div class="task" style="background:#fff"><span class="tick" style="${d?'background:var(--navy);box-shadow:none;color:#fff':''}">${d?IC.check.replace('<svg','<svg style="opacity:1"'):''}</span><span class="lt"><b style="${d?'color:var(--muted);text-decoration:line-through':''}">${t}</b></span></div>`).join('')}</div>`;
  } else {
    const vals=[2,3,3,4,5,5,6,7,7,8,9,10,9,10,11,11];
    const {d,pts}=sparkPath(vals,320,64);const last=pts[pts.length-1];
    h+=`<button class="hero card tap" data-act="tab" data-v="queries" style="display:block;width:100%;text-align:left;padding:18px 18px 14px;background:var(--navy);color:#fff">
       <div style="display:flex;justify-content:space-between;align-items:center"><span class="sub" style="font-size:14px">Active queries</span><span class="sub" style="font-size:13px">Since ${BOOK.since.replace(' 2026','')}</span></div>
       <div style="display:flex;align-items:baseline;gap:10px;margin-top:6px"><span class="num" style="font-size:54px;line-height:.9">${act}</span><span style="font-size:15px;color:rgba(255,255,255,.8)">out with agents<br>or waiting on you</span></div>
       <svg class="spark" viewBox="0 0 320 64" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="hg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="${d} L320 64 L0 64Z" fill="url(#hg)"/><path d="${d}" fill="none" stroke="#fff" stroke-width="2.2"/><circle cx="${last[0]-3}" cy="${last[1]}" r="5" fill="#f3d2cc" stroke="#2a3a52" stroke-width="2"/></svg>
       <div style="display:flex;gap:18px;margin-top:10px;font-size:13.5px;color:rgba(255,255,255,.8)"><span><b class="num" style="color:#fff;font-size:16px">${QUERIES.length}</b> sent</span><span><b class="num" style="color:#fff;font-size:16px">8</b> replies</span><span><b class="num" style="color:#fff;font-size:16px">4</b> requests</span></div>
     </button>
     <div class="grid3" style="margin-top:10px">
      ${[['you','freq',you.length,'With you'],['agent','psent',ag.length,'With the agent'],['quiet','queried',qu.length,'Gone quiet']].map(([c,g,n,w])=>`<button class="mini" data-act="filter" data-v="${c}"><span class="g">${disc(g,30)}</span><span class="num">${n}</span><span class="sub">${w}</span></button>`).join('')}
     </div>`;
    const t=TASKS.find(x=>x.id==='t3');
    h+=`<div class="shd"><span class="h2">Up next</span><button class="link" data-act="tab" data-v="todo">See all ${TASKS.length}</button></div>
      <div class="yourmove">
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:#7a4a3f">Your move</div><div style="font-size:18px;font-weight:600;line-height:1.25;margin:3px 0 4px">${t.t}</div><div class="sub" style="color:#6d5d58">${t.s}</div>
        <button class="btn pri sm" style="margin-top:12px" data-act="query" data-id="q1">View task</button></div>
        ${img('talon','art','')}
      </div>`;
    h+=`<div class="shd"><span class="h2">Latest</span><button class="link" data-act="page" data-v="responses">Responses</button></div>
      <div class="card feed" style="padding:4px 16px">${FEED.slice(0,3).map(([g,t,w])=>`<div class="it">${disc(g,32)}<div class="tx">${t}<small>${w}</small></div></div>`).join('')}</div>`;
  }
  h+=foundingCard();
  return `<div class="screen" data-scr="home">${h}</div>`;
}
function foundingCard(){
  return `<div class="shd"><span class="h2">Founding writer</span><button class="link" data-act="page" data-v="goals">How it works</button></div>
  <div class="card" style="padding:0;overflow:hidden">
    <div style="height:70px;background:repeating-linear-gradient(135deg,var(--pink) 0 14px,var(--pink-wash) 14px 28px);position:relative">
      ${img('tierFounding','','').replace('<img','<img style="position:absolute;right:10px;bottom:-26px;width:96px;height:96px;object-fit:contain"')}
    </div>
    <div style="padding:14px 16px 16px">
      <div class="sub">QueryHawk founding writer</div>
      <div style="font-family:var(--type);font-weight:700;font-size:21px;margin-top:2px">${ME.name}</div>
      <div style="display:flex;align-items:center;gap:10px;margin:12px 0 6px"><span class="tag" style="background:var(--navy);color:#fff">Fledgling</span><span class="sub">2 of 5 to Archivist</span></div>
      <div class="bar-h"><i style="width:40%"></i></div>
      <p style="font-size:14.5px;line-height:1.4;margin:14px 0 12px;color:var(--ink-2)">Your feedback shapes QueryHawk. Tell us what works, what doesn’t, and what you’d add.</p>
      <div style="display:flex;gap:8px">
        <button class="btn sec sm" data-act="feedback" data-v="like" aria-label="Something I like">${IC.thumbUp}</button>
        <button class="btn sec sm" data-act="feedback" data-v="dislike" aria-label="Something I don’t like">${IC.thumbDown}</button>
        <button class="btn sec sm" data-act="feedback" data-v="idea">${IC.bulb}An idea</button>
      </div>
    </div>
  </div>`;
}

// ---------- QUERIES ----------
function screenQueries(){
  let h=hdr('Queries',`<button class="ib" data-act="birds" aria-label="Birds-eye view">${IC.eye}</button>`)+searchPill('Find an agent or agency');
  if(S.empty){
    return `<div class="screen" data-scr="queries">${h}
      <div class="card" style="text-align:left">${img('courierMap','empty-art','')}<div class="h2" style="font-size:22px">Let’s log your first query</div>
      <p class="lede" style="margin:6px 0 14px">Every query you log gets its own card: what you sent, when to nudge and what happens next.</p>
      <button class="btn pri blk" data-act="flow" data-v="log">${IC.plus}Log a query</button>
      <button class="btn sec blk" style="margin-top:10px" data-act="page" data-v="import">${IC.upload}Import a spreadsheet</button></div>
      <div class="shd"><span class="h2">What you’ll see here</span></div>
      <div class="rows" style="opacity:.55;pointer-events:none">${[QUERIES[0],QUERIES[2],QUERIES[4]].map(qRow).join('')}</div>
      <p class="sub" style="text-align:center;margin-top:8px">Example queries</p></div>`;
  }
  const counts={all:QUERIES.length,you:byCourt('you').length,agent:byCourt('agent').length,quiet:byCourt('quiet').length,closed:byCourt('closed').length};
  h+=`<div class="sub" style="margin:-4px 2px 10px">${QUERIES.length} sent · ${active().length} active</div>
  <div class="chips">${[['all','All'],['you','With you'],['agent','With the agent'],['quiet','Gone quiet'],['closed','Closed']].map(([k,w])=>`<button class="chip" data-act="filter" data-v="${k}" aria-pressed="${S.filter===k}">${w} <b>${counts[k]}</b></button>`).join('')}</div>`;
  const order=['you','agent','quiet','closed'];
  const shown=S.filter==='all'?order:[S.filter];
  h+=`<div class="rows">`+shown.map(c=>{const qs=byCourt(c);if(!qs.length)return '';return groupHd(c,qs.length)+qs.map(qRow).join('')}).join('')+`</div>`;
  if(S.filter==='closed'||S.filter==='all') h+=`<button class="card tap" data-act="page" data-v="responses" style="margin-top:18px;display:flex;gap:12px;align-items:center">${img('wallHawk','','').replace('<img','<img style="width:62px;height:56px;object-fit:contain;flex:none"')}<span style="flex:1"><b style="display:block;font-size:15.5px">See your Wall of no</b><span class="sub">Every pass, in one place you can share</span></span>${IC.chev.replace('<svg','<svg style="width:18px;height:18px;color:var(--faint)"')}</button>`;
  return `<div class="screen" data-scr="queries">${h}</div>`;
}

// ---------- AGENTS ----------
function screenAgents(){
  const all=agentsAll(), toq=all.filter(a=>!a.q), qd=all.filter(a=>a.q);
  let h=hdr('Agents')+searchPill('Find an agent or agency');
  h+=`<button class="card tap" data-act="page" data-v="discover" style="display:flex;gap:12px;align-items:center;padding:12px 14px;margin-bottom:12px">
    <span style="width:58px;height:58px;border-radius:50%;overflow:hidden;flex:none;background:var(--page)">${img('scout','','').replace('<img','<img style="width:100%;height:100%;object-fit:cover"')}</span>
    <span style="flex:1;min-width:0"><b style="display:block;font-size:15.5px">The Scout found 3 agents</b><span class="sub">Verified agents looking for books like ${esc(BOOK.title)}</span></span>${IC.chev.replace('<svg','<svg style="width:18px;height:18px;color:var(--faint);flex:none"')}</button>`;
  h+=`<div class="chips">${[['all','All',all.length],['toq','To query',toq.length],['qd','Queried',qd.length]].map(([k,w,n])=>`<button class="chip" data-act="agfilter" data-v="${k}" aria-pressed="${S.agFilter===k}">${w} <b>${n}</b></button>`).join('')}</div>`;
  const row=a=>`<div class="sw"><button class="row" data-act="agent" data-id="${a.id}"><span class="av">${ini(a.name)}</span><span class="mid"><span class="nm" style="display:block">${esc(a.name)}</span><span class="ag" style="display:block">${esc(a.agency)}</span></span><span class="rt">${a.q?stLabel(a.q.st):'<span class="tag" style="background:var(--pink-wash)">To query</span>'}</span></button></div>`;
  h+='<div class="rows">';
  if(S.agFilter!=='qd') h+=`<div class="rowhd">To query <span class="n">· ${toq.length}</span></div>`+toq.map(row).join('');
  if(S.agFilter!=='toq') h+=`<div class="rowhd">Queried <span class="n">· ${qd.length}</span></div>`+qd.map(row).join('');
  h+='</div>';
  return `<div class="screen" data-scr="agents">${h}</div>`;
}

// ---------- TO-DO ----------
function screenTodo(){
  let h=hdr('To-do');
  h+=`<div class="seg" style="margin-top:4px"><button data-act="todoseg" data-v="tasks" aria-pressed="${S.todoSeg==='tasks'}">Tasks</button><button data-act="todoseg" data-v="cork" aria-pressed="${S.todoSeg==='cork'}">Corkboard</button></div>`;
  if(S.todoSeg==='cork'){
    h+=`<p class="lede" style="margin:0 0 16px">Notes to yourself. Pin anything you want to remember about agents, materials or your book.</p>
      <div class="grid2" style="gap:18px 14px">${NOTES.map(n=>`<div class="note" style="background:${n.c};transform:rotate(${n.r}deg)">${esc(n.t)}<small>${n.d}</small></div>`).join('')}
      <button class="note nopin" data-act="flow" data-v="note" style="background:transparent;box-shadow:inset 0 0 0 1.5px #cdc5b8;display:grid;place-items:center;color:var(--muted);font-weight:600">${IC.plus.replace('<svg','<svg style="width:22px;height:22px"')}<span>Add a note</span></button></div>`;
    return `<div class="screen" data-scr="todo">${h}</div>`;
  }
  const g=k=>TASKS.filter(t=>t.grp===k);
  h+=`<div class="card" style="display:flex;align-items:center;gap:14px;padding:16px 16px">
      <div style="flex:1"><div class="sub" style="font-size:14px">Thursday</div><div class="num" style="font-size:30px;line-height:1.05">29 October</div>
      <div class="sub" style="margin-top:8px;font-size:13.5px">${g('earlier').length} from earlier · ${g('today').length} today · ${g('soon').length} coming up</div></div>
      ${img('todoSun','','').replace('<img','<img style="width:64px;height:64px;object-fit:contain"')}
    </div>`;
  const sec=(k,w)=>{const ts=g(k);if(!ts.length)return '';return `<div class="rowhd">${w} <span class="n">· ${ts.length}</span></div>`+ts.map(taskRow).join('');};
  h+=`<div class="rows">${sec('earlier','From earlier')}${sec('today','Today')}${sec('soon','Coming up')}${sec('house','When you have a moment')}</div>`;
  return `<div class="screen" data-scr="todo">${h}</div>`;
}
function taskRow(t){
  const q=t.q?qById(t.q):null;
  return `<div class="sw" data-swipe data-one="r"><div class="acts"><span></span><button class="r" data-act="later" data-id="${t.id}">${IC.later}Later</button></div>
   <div class="task" data-act="task" data-id="${t.id}" role="button" tabindex="0"><span class="tick" aria-hidden="true">${IC.check}</span><span class="lt"><b>${esc(t.t)}</b><small>${esc(t.s)}</small></span>${q?glyph(q.st,18):''}</div></div>`;
}
