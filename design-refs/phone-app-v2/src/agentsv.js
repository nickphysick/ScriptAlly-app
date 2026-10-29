// ---------- Agents variants ----------
let AGR='B', AGS='D', AGD='C', ADC='B';
const SUBS=a=>a.how.startsWith('Online form')?'Online form':a.how.startsWith('Email')?'By email':'—';
function agRow(a){
  const status=a.q?stLabel(a.q.st):'<span class="tag" style="background:var(--pink-wash)">To query</span>';
  if(AGR==='B'){
    const lead=a.q?disc(a.q.st,40):`<span class="av">${ini(a.name)}</span>`;
    const rt=a.q?`<span class="st">${ST[a.q.st].w}</span><span class="when" style="display:block">Day ${a.q.day}</span>`:`<span class="st" style="color:var(--ink-2)">${esc(a.reply.replace('Usually ',''))}</span><span class="when" style="display:block">${SUBS(a)}</span>`;
    return `<div class="sw"><button class="row" data-act="agent" data-id="${a.id}">${lead}<span class="mid"><span class="nm" style="display:block">${esc(a.name)}</span><span class="ag" style="display:block">${esc(a.agency)}</span></span><span class="rt">${rt}</span></button></div>`;
  }
  return `<div class="sw"><button class="row" data-act="agent" data-id="${a.id}"><span class="av">${ini(a.name)}</span><span class="mid"><span class="nm" style="display:block">${esc(a.name)}</span><span class="ag" style="display:block">${esc(a.agency)}</span></span><span class="rt">${status}</span></button></div>`;
}
function agCard(a){
  return `<button class="agc" data-act="agent" data-id="${a.id}"><span class="av lg">${ini(a.name)}</span><b>${esc(a.name)}</b><span class="sub">${esc(a.agency)}</span>${a.q?`<span class="st" style="justify-content:center;margin-top:6px">${glyph(a.q.st,16)}${ST[a.q.st].w}</span>`:'<span class="tag" style="background:var(--pink-wash);margin-top:6px">To query</span>'}</button>`;
}
function scoutBlock(){
  if(AGD==='A') return `<button class="card tap" data-act="page" data-v="discover" style="display:flex;gap:12px;align-items:center;padding:12px 14px;margin-bottom:12px">${spot('scout',52,'var(--page)')}<span style="flex:1;min-width:0"><b style="display:block;font-size:15.5px">The Scout found 3 agents</b><span class="sub">Verified agents looking for books like ${esc(BOOK.title)}</span></span>${IC.chev.replace('<svg','<svg style="width:18px;height:18px;color:var(--faint);flex:none"')}</button>`;
  if(AGD==='B') return `<div class="shd" style="margin-top:0"><span class="h2" style="display:flex;align-items:center;gap:8px">${spot('scout',30,'var(--pink-wash)')}From the Scout</span><button class="link" data-act="page" data-v="discover">See all</button></div>
    <div class="hscroll" style="margin-bottom:6px">${SCOUT.map(s=>`<div class="card scard"><div style="display:flex;gap:10px;align-items:center"><span class="av">${ini(s.name)}</span><div style="min-width:0"><b style="display:flex;align-items:center;gap:4px;font-size:15px">${esc(s.name)}${IC.verified.replace('<svg','<svg style="width:15px;height:15px;color:var(--navy);flex:none" aria-label="Verified"')}</b><span class="sub">${esc(s.agency)}</span></div></div><p style="font-size:14px;line-height:1.4;margin:10px 0">${esc(s.looking)}.</p><div style="display:flex;gap:6px;align-items:center"><span class="tag" style="background:var(--st-slate)">${s.open}</span><button class="btn pri sm" style="margin-left:auto;height:34px;padding:0 12px" data-act="toast" data-v="saved">Add</button></div></div>`).join('')}</div>`;
  return '';
}
function screenAgents2(){
  const all=agentsAll(), toq=all.filter(a=>!a.q), qd=all.filter(a=>a.q);
  const band=bandHead('Agents')+`<div class="bstats"><span><b class="num">${all.length}</b> on your list</span><span><b class="num">${toq.length}</b> to query</span></div>`;
  let sh='';
  if(AGD==='C') sh+=`<div class="seg" style="margin-top:0"><button aria-pressed="${S.agSeg!=='disc'}" data-act="agseg" data-v="list">Your list</button><button aria-pressed="${S.agSeg==='disc'}" data-act="agseg" data-v="disc">Discover <span class="sub">3 new</span></button></div>`;
  if(AGD==='C'&&S.agSeg==='disc'){ sh+=discList(); return bandPage('agents',band,sh);}
  sh+=scoutBlock();
  sh+=`<div class="chips">${[['all','All',all.length],['toq','To query',toq.length],['qd','Queried',qd.length]].map(([k,w,c])=>`<button class="chip" data-act="agfilter" data-v="${k}" aria-pressed="${S.agFilter===k}">${w} <b>${c}</b></button>`).join('')}</div>`;
  const list=(t,arr)=>AGR==='C'?`<div class="rowhd" style="padding-left:2px">${t} <span class="n">· ${arr.length}</span></div><div class="agrid">${arr.map(agCard).join('')}</div>`:`<div class="rowhd">${t} <span class="n">· ${arr.length}</span></div>`+arr.map(agRow).join('');
  sh+=`<div class="${AGR==='C'?'':'rows'}">`;
  if(S.agFilter!=='qd') sh+=list('To query',toq);
  if(S.agFilter!=='toq') sh+=list('Queried',qd);
  sh+='</div>';
  return bandPage('agents',band,sh);
}

function ovAgentB(o){
  const a=agentById(o.id), qs=QUERIES.filter(q=>q.name===a.name), q=qs[0], f=a.name.split(' ')[0];
  const asks=(a.how.split('· ')[1]||'letter, synopsis, first 3 chapters');
  const court=q?COURT[courtOf(q)]:{w:'To query',bg:'var(--pink-wash)',fg:'#5a3027'};
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet white" data-sheet style="height:${o.h||'80%'}">
    <div style="background:${court.bg};color:${court.fg};flex:none"><div class="grab" data-grab></div><div class="qband"><span>${court.w}</span><span class="day">${q?'Day '+q.day:esc(a.reply.replace('Usually ',''))}</span></div></div>
    <div class="body" style="padding-top:2px">
      <div class="qhead"><span class="av lg">${ini(a.name)}</span><div style="flex:1;min-width:0"><div class="nm">${esc(a.name)}</div><div class="sub" style="font-size:14px;margin-top:3px">${esc(a.agency)}</div></div><button class="ib" style="box-shadow:none;background:var(--page)" aria-label="More">${IC.more}</button></div>
      <div class="msblk"><div class="sub">What they’re looking for</div><p style="margin:4px 0 8px;font-size:15.5px;line-height:1.45">${esc(a.looking)}.</p><div class="pillrow"><span class="tag" style="background:#fff">Adult</span><span class="tag" style="background:#fff">Literary fiction</span><span class="tag" style="background:#fff">Book club</span></div></div>
      <div class="qsec">How to submit</div>
      <div class="group" style="box-shadow:none;background:var(--page);margin-top:8px">
        <div class="li"><span class="ico">${a.how.startsWith('Online')?IC.globe:IC.mail}</span><span class="lt">${SUBS(a)}<span class="sub" style="display:block">${esc(a.agency.toLowerCase().replace(/[^a-z]+/g,''))}.co.uk</span></span></div>
        <div class="li"><span class="ico">${IC.box}</span><span class="lt">They ask for ${esc(asks)}<span class="sub" style="display:block">Pick the matching package when you log it</span></span></div>
        <div class="li"><span class="ico">${IC.clock}</span><span class="lt">${esc(a.reply)}</span></div>
      </div>
      ${q?`<div class="qsec">Your query</div><div class="rows" style="margin:6px -16px 0">${qRow(q)}</div>`:''}
      <div class="qsec">Your notes</div><div class="card" style="box-shadow:none;background:var(--page);margin-top:8px;font-size:14.5px;color:var(--muted)">Nothing yet. Add what you learn: who they’ve signed, what they said at an event.</div>
    </div>
    <div class="foot">${q?`<button class="btn pri blk" data-act="query" data-id="${q.id}">Open your query to ${esc(f)}</button>`:`<button class="btn pri blk" data-act="flow" data-v="log" data-agent="${a.id}">${IC.send}Log a query to ${esc(f)}</button>`}</div></div>`;
}

const SCOUT_X=[{reply:'Usually 6 weeks',how:'By email',asks:'Letter, synopsis, first 3 chapters',signed:'Recent debut: The Tidewater Year'},{reply:'Usually 10 weeks',how:'Online form',asks:'Letter, first 10 pages',signed:'Recent debut: Saltgrass'},{reply:'Usually 8 weeks',how:'By email',asks:'Letter, first 50 pages',signed:'Recent debut: A Quiet House'}];

function discList(){
  const intro=`<div style="display:flex;gap:12px;align-items:center;margin:2px 0 14px">${spot('scout',44,'var(--pink-wash)')}<p class="sub" style="font-size:14px;margin:0;flex:1">Verified agents who have told the Scout they’re looking for books like ${esc(BOOK.title)}.</p></div>`;
  if(ADC==='D'){
    const s0=SCOUT[0],x=SCOUT_X[0];
    return intro+`<div style="position:relative;height:440px">
      <div class="card dcard" style="position:absolute;inset:16px 14px auto;transform:scale(.94);opacity:.5;height:380px"></div>
      <div class="card dcard" style="position:absolute;inset:8px 7px auto;transform:scale(.97);opacity:.75;height:390px"></div>
      <div class="card dcard" style="position:absolute;inset:0;padding:0;overflow:hidden">${dcB(s0,x,true)}</div></div>
      <div style="display:flex;gap:10px;margin-top:8px"><button class="btn sec" style="flex:1">Not for me</button><button class="btn pri" style="flex:1" data-act="toast" data-v="saved">${IC.plus}Add</button></div><p class="sub" style="text-align:center;margin-top:10px">1 of ${SCOUT.length}</p>`;
  }
  return intro+SCOUT.map((s,i)=>{const x=SCOUT_X[i];
    if(ADC==='A') return `<div class="card" style="margin-bottom:12px"><div style="display:flex;gap:12px;align-items:center"><span class="av lg">${ini(s.name)}</span><div style="flex:1;min-width:0"><b style="font-size:16.5px;display:flex;align-items:center;gap:5px">${esc(s.name)}${IC.verified.replace('<svg','<svg style="width:17px;height:17px;color:var(--navy)" aria-label="Verified"')}</b><span class="sub">${esc(s.agency)}</span></div></div><p style="font-size:15px;line-height:1.45;margin:12px 0 10px">${esc(s.looking)}.</p><div class="pillrow">${s.tags.map(t=>`<span class="tag">${t}</span>`).join('')}<span class="tag" style="background:var(--st-slate)">${s.open}</span></div><button class="btn pri sm" style="margin-top:14px;width:100%" data-act="toast" data-v="saved">Add to my agents</button></div>`;
    if(ADC==='C') return `<div class="card dcc" style="margin-bottom:14px;padding:0;overflow:hidden"><div class="dcc-top"><span class="dcc-mono">${ini(s.name)}</span><div style="min-width:0"><div style="font-family:var(--type);font-size:22px;color:#fff;line-height:1.1">${esc(s.name)}</div><div style="font-size:13.5px;color:rgba(255,255,255,.75);margin-top:3px;display:flex;align-items:center;gap:5px">${esc(s.agency)} ${IC.verified.replace('<svg','<svg style="width:15px;height:15px;color:#e8c8bc" aria-label="Verified"')}</div></div></div>
      <div style="padding:14px 16px 16px"><p class="dcc-q">“${esc(s.looking)}.”</p><div class="pillrow" style="margin:10px 0 14px">${s.tags.map(t=>`<span class="tag">${t}</span>`).join('')}<span class="tag" style="background:var(--st-slate)">${s.open}</span></div><div style="display:flex;gap:8px"><button class="btn pri sm" style="flex:1" data-act="toast" data-v="saved">${IC.plus}Add</button><button class="btn sec sm">Profile</button></div></div></div>`;
    return `<div class="card dcard" style="margin-bottom:14px;padding:0;overflow:hidden">${dcB(s,x)}</div>`;
  }).join('');
}
function dcB(s,x,big){
  return `<div class="qband" style="background:var(--st-slate);color:#2f4258;padding:8px 16px"><span style="display:flex;align-items:center;gap:5px">${IC.verified.replace('<svg','<svg style="width:15px;height:15px"')}Verified by the Scout</span><span>${s.open}</span></div>
    <div style="padding:12px 16px 16px">
    <div style="display:flex;gap:12px;align-items:center"><span class="av lg">${ini(s.name)}</span><div style="flex:1;min-width:0"><div style="font-family:var(--type);font-size:20px;line-height:1.1">${esc(s.name)}</div><div class="sub" style="font-size:14px;margin-top:3px">${esc(s.agency)}</div></div></div>
    <div class="msblk" style="margin-top:12px"><div class="sub">Looking for</div><p style="margin:4px 0 8px;font-size:15px;line-height:1.45">${esc(s.looking)}.</p><div class="pillrow">${s.tags.map(t=>`<span class="tag" style="background:#fff">${t}</span>`).join('')}</div></div>
    <div class="dfacts"><span>${IC.clock}${esc(x.reply.replace('Usually ',''))}</span><span>${x.how==='By email'?IC.mail:IC.globe}${x.how}</span><span>${IC.book}${esc(x.signed.replace('Recent debut: ',''))}</span></div>
    ${big?'':`<div style="display:flex;gap:8px;margin-top:14px"><button class="btn pri sm" style="flex:1" data-act="toast" data-v="saved">${IC.plus}Add to my agents</button><button class="btn sec sm">Profile</button></div>`}</div>`;
}
// ---------- agent profile variants (C, D, E) ----------
function agParts(o){
  const a=agentById(o.id), qs=QUERIES.filter(q=>q.name===a.name), q=qs[0], f=a.name.split(' ')[0];
  const asks=(a.how.split('· ')[1]||'letter, synopsis, first 3 chapters');
  const site=a.agency.toLowerCase().replace(/[^a-z]+/g,'')+'.co.uk';
  return {a,q,f,asks,site};
}
const agFoot=(p)=>`<div class="foot">${p.q?`<button class="btn pri blk" data-act="query" data-id="${p.q.id}">Open your query to ${esc(p.f)}</button>`:`<button class="btn pri blk" data-act="flow" data-v="log" data-agent="${p.a.id}">${IC.send}Log a query to ${esc(p.f)}</button>`}</div>`;
const askList=asks=>asks.split(/, | and /).map(x=>`<span class="tag" style="background:#fff">${esc(x.charAt(0).toUpperCase()+x.slice(1))}</span>`).join('');
const agHistory=p=>p.q?`<div class="qsec">Your query</div><div class="card" style="box-shadow:none;background:var(--page);margin-top:8px;padding:12px 14px">${stageTrack(p.q)}</div>`:'';
const agNotes=`<div class="qsec">Your notes</div><button class="card" style="box-shadow:none;background:var(--page);margin-top:8px;font-size:14.5px;color:var(--muted);width:100%;text-align:left;display:flex;gap:10px;align-items:center">${IC.plus.replace('<svg','<svg style="width:18px;height:18px;flex:none"')}Add a note: who they’ve signed, what they said at an event</button>`;
function ovAgentC(o){ // contact card
  const p=agParts(o);
  const act=(i,w,attr='')=>`<button class="cact" ${attr}><span>${i}</span>${w}</button>`;
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet white" data-sheet style="height:${o.h||'84%'}"><div class="grab" data-grab></div>
    <div class="body">
      <div style="text-align:center;padding:6px 0 4px"><span class="av" style="width:76px;height:76px;font-size:24px;margin:0 auto">${ini(p.a.name)}</span>
        <div style="font-family:var(--type);font-size:24px;margin-top:12px">${esc(p.a.name)}</div><div class="sub" style="font-size:14.5px;margin-top:3px">${esc(p.a.agency)}</div>
        <div style="margin-top:10px">${p.q?stPill(p.q.st):'<span class="tag" style="background:var(--pink-wash)">To query</span>'}</div></div>
      <div class="cacts">${act(p.q?IC.eye:IC.send,p.q?'Query':'Log query',p.q?`data-act="query" data-id="${p.q.id}"`:`data-act="flow" data-v="log" data-agent="${p.a.id}"`)}${act(IC.globe,'Website')}${act(p.a.how.startsWith('Online')?IC.doc:IC.mail,p.a.how.startsWith('Online')?'Form':'Email')}${act(IC.note,'Note')}</div>
      <div class="group" style="margin-top:16px">
        <div class="li" style="align-items:flex-start;padding-top:12px;padding-bottom:12px"><span class="lt"><span class="sub">Looking for</span><span style="display:block;margin-top:2px">${esc(p.a.looking)}</span></span></div>
        <div class="li"><span class="lt"><span class="sub">They ask for</span><span style="display:block;margin-top:2px">${esc(p.asks.charAt(0).toUpperCase()+p.asks.slice(1))}</span></span></div>
        <div class="li"><span class="lt"><span class="sub">Reply time</span><span style="display:block;margin-top:2px">${esc(p.a.reply)}</span></span></div>
        <div class="li"><span class="lt"><span class="sub">Website</span><span style="display:block;margin-top:2px;color:var(--navy);font-weight:600">${p.site}</span></span></div>
      </div>${agHistory(p)}${agNotes}
    </div></div>`;
}
function ovAgentD(o){ // navy hero
  const p=agParts(o);
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet white" data-sheet style="height:${o.h||'84%'}">
    <div class="ahero"><div class="grab" data-grab style="filter:invert(1)"></div>
      <div style="display:flex;gap:14px;align-items:center;padding:4px 18px 0"><span class="dcc-mono">${ini(p.a.name)}</span><div style="flex:1;min-width:0"><div style="font-family:var(--type);font-size:23px;line-height:1.1">${esc(p.a.name)}</div><div style="font-size:14px;color:rgba(255,255,255,.75);margin-top:3px">${esc(p.a.agency)}</div></div><button class="ring" aria-label="More">${IC.more}</button></div>
      <div class="astats"><div><b>${esc(p.a.reply.replace('Usually ','').replace(' weeks',' wks'))}</b><span>Reply time</span></div><div><b>${p.a.how.startsWith('Online')?'Form':'Email'}</b><span>Submissions</span></div><div><b>${p.q?ST[p.q.st].w.split(' ')[0]:'Not yet'}</b><span>Your query</span></div></div></div>
    <div class="body" style="padding-top:16px">
      <div class="sub" style="font-weight:600;color:var(--ink-2)">What they’re looking for</div><p class="dcc-q" style="margin:6px 0 10px">“${esc(p.a.looking)}.”</p>
      <div class="pillrow"><span class="tag">Adult</span><span class="tag">Literary fiction</span><span class="tag">Book club</span></div>
      <div class="qsec">They ask for</div><div class="pillrow" style="margin-top:8px">${askList(p.asks)}</div><p class="sub" style="margin:8px 0 0">${p.a.how.startsWith('Online')?'Through their online form':'By email'} · ${p.site}</p>
      ${agHistory(p)}${agNotes}
    </div>${agFoot(p)}</div>`;
}
function ovAgentE(o){ // fact tiles
  const p=agParts(o);
  const tile=(i,b,s)=>`<div class="atile">${i}<b>${b}</b><span>${s}</span></div>`;
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet white" data-sheet style="height:${o.h||'84%'}"><div class="grab" data-grab></div>
    <div class="body">
      <div class="qhead" style="padding-top:2px"><span class="av lg">${ini(p.a.name)}</span><div style="flex:1;min-width:0"><div class="nm">${esc(p.a.name)}</div><div class="sub" style="font-size:14px;margin-top:3px">${esc(p.a.agency)}</div></div>${p.q?stPill(p.q.st):'<span class="tag" style="background:var(--pink-wash)">To query</span>'}</div>
      <div class="atiles">${tile(IC.clock,esc(p.a.reply.replace('Usually ','')),'Reply time')}${tile(p.a.how.startsWith('Online')?IC.globe:IC.mail,p.a.how.startsWith('Online')?'Online form':'Email','How to submit')}${tile(IC.box,p.asks.split(', ').length+' pieces','They ask for')}</div>
      <div class="msblk" style="margin-top:14px"><div class="sub">Looking for</div><p style="margin:4px 0 8px;font-size:15.5px;line-height:1.45">${esc(p.a.looking)}.</p><div class="pillrow">${askList(p.asks)}</div></div>
      ${agHistory(p)}${agNotes}
    </div>${agFoot(p)}</div>`;
}
function ovAgent(o){return AGS==='C'?ovAgentC(o):AGS==='D'?ovAgentD(o):AGS==='E'?ovAgentE(o):AGS==='B'?ovAgentB(o):ovAgentA(o);}
