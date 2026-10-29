// ---------- sheets ----------
const chevR=IC.chev.replace('<svg','<svg class="chev"');
function sheet(inner,{h='62%',white=false,foot='',drag=true,cls='',z=''}={}){
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet ${white?'white':''} ${cls}" data-sheet style="height:${h};${z}">${drag?'<div class="grab" data-grab></div>':''}${inner}${foot?`<div class="foot">${foot}</div>`:''}</div>`;
}
function ovAction(){
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet" data-sheet style="height:auto;padding-bottom:100px;z-index:31"><div class="grab"></div><div class="body" style="overflow:visible">
    <div class="sh-t">What happened?</div>
    <div class="tiles">
      <button class="tile warm" data-act="flow" data-v="log">${img('courierCut')}<span class="ic" style="background:#fff">${IC.send}</span><b>I sent a query<small>Log it in a few taps</small></b></button>
      <button class="tile warm" data-act="flow" data-v="respond">${img('discHawk')}<span class="ic" style="background:#fff">${IC.reply}</span><b>An agent replied<small>A request, a pass, an offer</small></b></button>
      <button class="tile" data-act="flow" data-v="agent"><span class="ic">${IC.agents}</span><b>Add an agent<small>Someone to query</small></b></button>
      <button class="tile" data-act="flow" data-v="task"><span class="ic">${IC.todo}</span><b>Add a task or note<small>For you to do later</small></b></button>
    </div>
    <div class="group" style="margin-top:12px"><button class="li" data-act="page" data-v="import"><span class="ico">${IC.upload}</span><span class="lt">Import queries from a spreadsheet</span>${chevR}</button></div>
  </div></div>`;
}
const MAT_IC={'Letter':IC.doc,'Synopsis':IC.note,'First':IC.pages,'Full':IC.book};
const matIc=n=>{for(const k in MAT_IC) if(n.startsWith(k)) return MAT_IC[k]; return IC.pages;};
function ovQuery(o){
  const q=qById(o.id); const c=courtOf(q); const band=q.st==='offer'?COURT.offer:COURT[c];
  const tab=o.tab||'track';
  let body='';
  if(tab==='track'){
    body=`<ol class="steps">${q.tl.map(([k,t,d,att])=>`<li class="step">${k==='nudge'?`<span style="width:24px;height:24px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 0 0 3px #fff">${IC.bell.replace('<svg','<svg style="width:18px;height:18px"')}</span>`:glyph(k,24)}<span class="t">${esc(t)} ${k==='queried'?`<i>${q.how}</i>`:''}</span><span class="d">${d}</span>${att.length?`<span class="att">${att.map(a=>`<span>${matIc(a)}${esc(a)}</span>`).join('')}</span>`:''}</li>`).join('')}
    ${c!=='closed'?`<li class="step next"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#bdb6aa" stroke-width="1.6" stroke-dasharray="3 3"><circle cx="12" cy="12" r="10"/></svg><span class="t">${q.st==='freq'?'Full sent':q.st==='preq'?'Partial sent':'Their reply'}</span><span class="d">Next</span></li>`:''}</ol>`;
  } else if(tab==='agent'){
    const a=agentById('q:'+q.id);
    body=`<dl class="kv" style="margin:14px 0">
      <dt>Agency</dt><dd>${esc(q.agency)}</dd><dt>Looking for</dt><dd>${esc(a.looking)}</dd><dt>How to submit</dt><dd>${esc(a.how)}</dd><dt>Reply time</dt><dd>${esc(a.reply)}</dd></dl>
      <button class="btn sec blk" data-act="agent" data-id="q:${q.id}">Open ${esc(q.name.split(' ')[0])}’s profile</button>`;
  } else {
    const p=PKG[q.pkg];
    body=`<div class="card" style="margin-top:14px;box-shadow:none;background:var(--page)"><div style="display:flex;align-items:center;gap:10px">${IC.box.replace('<svg','<svg style="width:22px;height:22px"')}<b style="font-size:16px">${p.n}</b><span class="sub" style="margin-left:auto">Package</span></div>
      <div class="att" style="margin-top:12px">${p.items.map(a=>`<span style="background:#fff">${matIc(a)}${a}</span>`).join('')}</div></div>
      <p class="sub" style="margin:12px 2px">Sent ${q.how} on ${q.sent}. Packages and versions live in Materials.</p>
      <button class="btn sec blk" data-act="page" data-v="manuscript" data-seg="materials">Open Materials</button>`;
  }
  let foot='';
  if(c==='you'){
    foot=`<div class="nextstep">${img('talon')}<div class="tx"><b>${esc(q.next)}</b><small>${q.name.split(' ')[0]} asked on ${q.tl[q.tl.length-1][2]}</small><button class="btn pri sm" data-act="next" data-id="${q.id}">Mark as sent</button></div></div>`;
  } else if(c==='closed'){
    foot=`<div class="nextstep wait"><div class="tx"><b>${esc(q.closed)}</b><small>It’s on your Wall of no</small><button class="btn sec sm" data-act="page" data-v="responses">View the wall</button></div></div>`;
  } else {
    foot=`<div class="nextstep wait">${img('hourglass')}<div class="tx"><b>${esc(q.next)}</b><small>Day ${q.day} · waiting on ${q.name.split(' ')[0]}</small><button class="btn sec sm" data-act="flow" data-v="respond" data-id="${q.id}">${q.name.split(' ')[0]} replied</button></div></div>`;
  }
  const more=o.more?`<div class="card" style="position:absolute;right:14px;top:70px;z-index:5;padding:6px 0;width:220px;box-shadow:0 16px 40px rgba(31,38,51,.22)">
     ${[['respond','Record a response',IC.reply],['nudge','Log a nudge',IC.bell],['edit','Edit query',IC.edit],['closeq','Close query',IC.closeq]].map(([a,w,i])=>`<button class="li" style="min-height:46px;font-size:15px" data-act="${a==='respond'?'flow':a}" data-v="${a==='respond'?'respond':''}" data-id="${q.id}"><span class="ico">${i}</span>${w}</button>`).join('')}</div>`:'';
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet white" data-sheet style="height:${o.h||'64%'}">
    <div style="background:${band.bg};color:${band.fg};flex:none"><div class="grab" data-grab></div><div class="qband"><span>${band.w}</span><span class="day">Day ${q.day}</span></div></div>
    <div class="body" style="padding-top:2px">
      <div class="qhead"><span class="av lg">${ini(q.name)}</span><div style="flex:1;min-width:0"><div class="nm">${esc(q.name)}</div><div class="sub" style="font-size:14px;margin-top:3px">${esc(q.agency)}</div></div><button class="ib" style="box-shadow:none;background:var(--page)" data-act="qmore" aria-label="More actions">${IC.more}</button></div>
      <div>${stPill(q.st)}</div>
      <div class="tabs" role="tablist">${[['track','Tracking'],['agent','Agent'],['mat','Materials']].map(([k,w])=>`<button role="tab" data-act="qtab" data-v="${k}" aria-selected="${tab===k}">${w}</button>`).join('')}</div>
      ${body}
    </div>
    <div class="foot" style="padding-top:10px">${foot}</div>${more}
  </div>`;
}
function ovAgentA(o){
  const a=agentById(o.id);
  const qs=QUERIES.filter(q=>q.name===a.name);
  return sheet(`<div class="body">
    <div class="qhead" style="padding-top:4px"><span class="av lg">${ini(a.name)}</span><div style="flex:1;min-width:0"><div class="nm" style="font-family:var(--type);font-weight:700;font-size:22px">${esc(a.name)}</div><div class="sub" style="font-size:14px;margin-top:3px">${esc(a.agency)}</div></div></div>
    <div class="pillrow" style="margin-bottom:16px"><span class="tag">Adult</span><span class="tag">Literary fiction</span><span class="tag">Book club</span></div>
    <div class="card" style="box-shadow:none;background:var(--page)"><div class="sub" style="font-weight:600;color:var(--ink-2)">What they’re looking for</div><p style="margin:6px 0 0;font-size:15.5px;line-height:1.45">${esc(a.looking)}.</p></div>
    <dl class="kv" style="margin:16px 2px"><dt>How to submit</dt><dd>${esc(a.how)}</dd><dt>Reply time</dt><dd>${esc(a.reply)}</dd><dt>Website</dt><dd style="color:var(--navy);font-weight:600">${a.agency.toLowerCase().replace(/[^a-z]+/g,'')}.co.uk</dd></dl>
    ${qs.length?`<div class="gl" style="margin-top:6px">Your query</div><div class="rows" style="margin:0">${qs.map(qRow).join('')}</div>`:`<div class="card" style="box-shadow:none;background:var(--pink-wash);display:flex;gap:10px;align-items:center"><span style="flex:1;font-size:14.5px">You haven’t queried ${esc(a.name.split(' ')[0])} yet.</span></div>`}
  </div>`,{h:o.h||'78%',white:true,foot:`<div style="display:flex;gap:10px;align-items:center">${qs.length?`<button class="btn pri" style="flex:1" data-act="query" data-id="${qs[0].id}">Open query</button>`:`<button class="btn pri" style="flex:1" data-act="flow" data-v="log" data-agent="${a.id}">${IC.send}Log a query</button>`}<button class="btn sec">${IC.globe}Website</button></div>`});
}
function ovMenuA(){
  const it=(v,w,i,r='')=>`<button class="li" data-act="page" data-v="${v}"><span class="ico">${i}</span><span class="lt">${w}</span><span class="rt">${r}${chevR}</span></button>`;
  return sheet(`<div class="body">
    <div class="card" style="display:flex;gap:14px;align-items:center;margin-top:4px">
      <span class="me" style="width:54px;height:54px;font-size:18px">${ME.ini}</span>
      <div style="flex:1;min-width:0"><div style="font-family:var(--type);font-weight:700;font-size:20px">${ME.name}</div><div class="sub" style="margin-top:2px">Founding writer · Fledgling</div></div>
      <button class="ib plain" data-act="dismiss" aria-label="Close">${IC.close}</button>
    </div>
    <button class="hero card tap" data-act="page" data-v="manuscript" style="margin-top:12px;display:flex;gap:14px;align-items:center;padding:14px 16px;text-align:left">
      <span style="width:44px;height:58px;border-radius:4px 8px 8px 4px;background:#f4f0e9;display:grid;place-items:center;flex:none;box-shadow:inset 4px 0 0 rgba(0,0,0,.12)">${IC.book.replace('<svg','<svg style="width:22px;height:22px;color:#2a3a52"')}</span>
      <span style="flex:1"><span class="sub" style="display:block">Querying</span><b style="font-family:var(--type);font-size:19px;display:block;margin-top:2px">${BOOK.title}</b><span class="sub" style="display:block;margin-top:3px">${BOOK.cat} · ${BOOK.words}</span></span>${IC.chev.replace('<svg','<svg style="width:18px;height:18px;opacity:.7"')}</button>
    <div class="gl">Your campaign</div><div class="group">${it('responses','Responses',IC.inbox,'8')}${it('analytics','Analytics',IC.chart)}${it('goals','Streaks &amp; goals',IC.flame,'4 weeks')}</div>
    <div class="gl">Your book</div><div class="group">${it('manuscript','Manuscript',IC.book)}${it('materials','Materials and packages',IC.box)}${it('comps','Comparable titles',IC.pages)}</div>
    <div class="gl">Agents</div><div class="group">${it('discover','Discover agents',IC.scope,'3 new')}</div>
    <div class="gl">Help and tools</div><div class="group">${it('import','Import queries',IC.upload)}${it('help','Help centre',IC.help)}<button class="li" data-act="feedback"><span class="ico">${IC.chat}</span><span class="lt">Send feedback</span><span class="rt">${chevR}</span></button></div>
    <div class="gl">Account</div><div class="group">${it('settings','Settings',IC.gear)}${it('plan','Plan &amp; billing',IC.card,'Founding')}</div>
    <button class="btn sec blk" style="margin-top:20px">${IC.signout}Sign out</button>
    <p class="sub" style="text-align:center;margin:16px 0 8px">QueryHawk beta</p>
  </div>`,{h:'94%'});
}
function ovMs(){
  return sheet(`<div class="body"><div class="sh-t">Your manuscripts</div>
    <div class="group"><button class="li" data-act="dismiss"><span class="ico">${IC.book}</span><span class="lt"><b style="font-weight:600">${BOOK.title}</b><span class="sub" style="display:block">${BOOK.cat} · ${BOOK.words}</span></span><span class="rt" style="color:var(--navy)">${IC.check.replace('<svg','<svg style="width:20px;height:20px"')}</span></button>
    <div class="li" style="opacity:.6"><span class="ico">${IC.plus}</span><span class="lt">Add a manuscript</span><span class="lock">Coming soon</span></div></div>
    <p class="sub" style="margin:14px 4px">During the beta, QueryHawk tracks one manuscript per writer.</p></div>`,{h:'auto',z:'padding-bottom:20px'});
}
function ovBirds(){
  const pct={queried:.35,psent:.55,fsent:.7,preq:.85,freq:.9};
  const row=q=>{const c=courtOf(q);const p=c==='quiet'?1:(pct[q.st]||.4);const [from,to]=c==='you'?[q.tl[q.tl.length-1][2],'Your move']:c==='quiet'?[q.sent,'Window ended']:[q.tl[q.tl.length-1][2],q.next.replace(/^(Reply expected by|Reply window ends|Nudge from) /,'')];
    return `<button class="card tap" data-act="query" data-id="${q.id}" style="padding:12px 14px;margin-bottom:8px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">${glyph(q.st,20)}<b style="flex:1;font-size:15px">${esc(q.name)}</b><span class="sub">Day ${q.day}</span></div><div class="bar-h"><i style="width:${p*100}%;background:${c==='you'?'var(--pink)':'var(--navy)'}"></i></div><div style="display:flex;justify-content:space-between;margin-top:6px" class="sub"><span>${from}</span><span>${to}</span></div></button>`;};
  return sheet(`<div class="body" style="padding-top:4px">${img('beHead','','').replace('<img','<img style="width:64px;height:62px;object-fit:contain;float:right;margin:-4px 0 0 8px"')}
    <div class="sh-t" style="margin-bottom:4px">Birds-eye view</div><p class="sub" style="margin:0 0 16px;font-size:14px">How far each active query has come towards its next step.</p>
    ${['you','agent','quiet'].map(c=>`<div class="gl" style="clear:both">${COURT[c].w}</div>`+byCourt(c).map(row).join('')).join('')}</div>`,{h:'92%'});
}
function ovFeedback(o){
  const k=o.v||'';
  return sheet(`<div class="body">
    <div style="display:flex;gap:12px;align-items:center">${img('feedback','','').replace('<img','<img style="width:76px;height:76px;object-fit:contain"')}<div><div class="sh-t" style="margin:0 0 4px">Tell us what you think</div><div class="sub" style="font-size:14px">We read every message.</div></div></div>
    <div class="pillrow" style="margin:18px 0 12px">${[['like','Something I like',IC.thumbUp],['dislike','Something I don’t',IC.thumbDown],['idea','An idea',IC.bulb]].map(([v,w,i])=>`<button class="chip" data-act="fbkind" data-v="${v}" aria-pressed="${k===v}">${i.replace('<svg','<svg style="width:16px;height:16px"')}${w}</button>`).join('')}</div>
    <textarea class="field" id="fbtext" placeholder="${k==='idea'?'What would make QueryHawk better for you?':k==='dislike'?'What got in your way?':'What’s working for you?'}"></textarea>
  </div>`,{h:'72%',white:true,foot:`<button class="btn pri blk" data-act="fbsend" ${k?'':'disabled'}>Send to us</button>`});
}
function ovSearch(o){
  const t=(o.q||'').toLowerCase();
  let res='';
  if(t){
    const qs=QUERIES.filter(q=>(q.name+q.agency).toLowerCase().includes(t));
    const as=agentsAll().filter(a=>!a.q&&(a.name+a.agency).toLowerCase().includes(t));
    const ns=NOTES.filter(n=>n.t.toLowerCase().includes(t));
    res=(qs.length?`<div class="gl">Queries</div><div class="rows" style="margin:0 -16px">${qs.map(qRow).join('')}</div>`:'')+
      (as.length?`<div class="gl">Agents to query</div><div class="group">${as.map(a=>`<button class="li" data-act="agent" data-id="${a.id}"><span class="av" style="width:32px;height:32px;font-size:12px">${ini(a.name)}</span><span class="lt">${esc(a.name)}<span class="sub" style="display:block">${esc(a.agency)}</span></span>${chevR}</button>`).join('')}</div>`:'')+
      (ns.length?`<div class="gl">Notes</div>${ns.map(n=>`<div class="card" style="margin-bottom:8px;font-size:14.5px">${esc(n.t)}</div>`).join('')}`:'')||`<p class="sub" style="text-align:center;margin-top:40px;font-size:15px">Nothing matches “${esc(o.q)}”.</p>`;
  } else {
    res=`<div class="gl">Try</div><div class="pillrow">${['Greenfield','Partial requested','Eleanor','Harbour Lane'].map(s=>`<button class="chip" data-act="searchfill" data-v="${s}">${s}</button>`).join('')}</div>
      <div class="gl">Jump to</div><div class="group">${[['responses','Responses',IC.inbox],['analytics','Analytics',IC.chart],['manuscript','Manuscript',IC.book]].map(([v,w,i])=>`<button class="li" data-act="page" data-v="${v}"><span class="ico">${i}</span><span class="lt">${w}</span>${chevR}</button>`).join('')}</div>`;
  }
  return `<div class="flow" style="animation:fade .2s ease">
    <div style="display:flex;gap:8px;align-items:center;padding:6px 12px 8px"><div class="search" style="margin:0;flex:1;width:auto;min-width:0;color:var(--ink)">${IC.search}<input id="sq" value="${esc(o.q||'')}" placeholder="Search queries, agents and notes" style="border:0;outline:0;background:transparent;flex:1;min-width:0;font-size:16px" autocomplete="off"></div><button class="link" style="padding:8px 4px" data-act="dismiss">Cancel</button></div>
    <div class="q" id="sres" style="padding:0 16px 30px">${res}</div></div>`;
}

// ---------- pushed pages ----------
const PAGES={
 responses(){
   const reqs=QUERIES.filter(q=>q.tl.some(s=>s[0]==='preq'||s[0]==='freq'));
   const nos=QUERIES.filter(q=>q.st==='rejected'||q.st==='noresp');
   return bk('Responses')+`<div class="big">Responses</div>
   <div class="hero" style="display:flex;align-items:center;gap:16px"><div style="flex:1"><div class="sub" style="font-size:14px">Heard back from</div><div><span class="num" style="font-size:46px">8</span><span style="font-size:16px;color:rgba(255,255,255,.8)"> of ${QUERIES.length} agents</span></div><div class="sub" style="margin-top:4px">4 requests · 4 passes · median reply 5 weeks</div></div></div>
   <div class="shd"><span class="h2">Requests</span><span class="sub">${reqs.length}</span></div>
   <div class="hscroll">${reqs.map(q=>{const r=q.tl.find(s=>s[0]==='freq')||q.tl.find(s=>s[0]==='preq');return `<button class="card tap" data-act="query" data-id="${q.id}" style="width:240px;background:var(--pink-wash)"><div style="display:flex;align-items:center;gap:10px">${disc(r[0],40)}<div style="min-width:0"><b style="display:block;font-size:15.5px">${esc(q.name)}</b><span class="sub">${esc(q.agency)}</span></div></div><div style="font-family:var(--type);font-weight:700;font-size:18px;margin-top:14px">${r[1]}</div><div class="sub" style="margin-top:2px">${r[2]} · ${ST[q.st].w}</div></button>`}).join('')}</div>
   <div class="shd"><span class="h2">Wall of no</span><button class="link" data-act="share">${IC.share.replace('<svg','<svg style="width:15px;height:15px;vertical-align:-2px"')} Share</button></div>
   <div style="border-radius:var(--r-lg);background:#141925 url(${ART.wallTile}) center/320px;padding:16px;color:#fff;display:flex;gap:12px;align-items:center;overflow:hidden;box-shadow:var(--sh)">
     <div style="flex:1"><div class="num" style="font-size:40px;line-height:1">${nos.length}</div><div style="font-size:15px;margin-top:4px;line-height:1.35">nos so far. Every writer collects them on the way to a yes.</div></div>
     ${img('wallHawk','','').replace('<img','<img style="width:118px;height:108px;object-fit:contain;margin:-6px -8px -18px 0;align-self:flex-end"')}
   </div>
   <div class="rows" style="margin-top:6px">${nos.map(qRow).join('')}</div>`;
 },
 analytics(){
   const stat=(n,u,c,dark)=>`<div class="card" style="width:200px;${dark?'background:var(--navy);color:#fff':''}"><div class="num" style="font-size:40px;line-height:1">${n}</div><div style="font-size:14.5px;margin-top:6px;${dark?'color:rgba(255,255,255,.85)':''}">${u}</div><div class="sub" style="margin-top:10px;${dark?'color:rgba(255,255,255,.65)':''}">${c}</div></div>`;
   const fun=[['Queried',16,'queried'],['Partial or full requested',6,'preq'],['Full requested',3,'freq'],['Offer',0,'offer']];
   const weeks=[1,0,2,1,0,3,2,1,0,2,1,1,0,2];
   return bk('Analytics')+`<div class="big">Analytics</div><p class="lede">Patterns and records from your own querying. Figures are for ${BOOK.title}.</p>
   <div class="seg"><button aria-pressed="true">All time</button><button>Last 90 days</button></div>
   <div class="hscroll">${stat(QUERIES.length,'queries sent','4 in the last 30 days',1)}${stat('50%','heard back','8 of 16 queries')}${stat('5 wks','median reply','From 8 replies')}${stat('4','requests','First on 18 Sep')}</div>
   <div class="card" style="margin-top:6px"><div class="h2" style="font-size:17px">Where your queries got to</div>
     <div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">${fun.map(([w,n,g])=>`<div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px"><span style="display:flex;gap:6px;align-items:center">${glyph(g,16)}${w}</span><b class="num">${n?n:'Not yet'}</b></div><div class="bar-h"><i style="width:${n/16*100}%"></i></div></div>`).join('')}</div></div>
   <div class="card" style="margin-top:12px"><div class="h2" style="font-size:17px">Queries sent, week by week</div><p class="sub" style="margin:4px 0 12px">The last 14 weeks</p>
     <div style="display:flex;align-items:flex-end;gap:5px;height:80px">${weeks.map((w,i)=>`<div style="flex:1;display:flex;flex-direction:column-reverse;gap:3px;height:100%">${Array.from({length:w}).map(()=>`<i style="display:block;height:18px;border-radius:4px;background:${i===13?'var(--pink)':'var(--navy)'}"></i>`).join('')||'<i style="display:block;height:4px;border-radius:2px;background:var(--fill)"></i>'}</div>`).join('')}</div>
     <div style="display:flex;justify-content:space-between;margin-top:8px" class="sub"><span>21 Jul</span><span>This week</span></div></div>
   <div class="card" style="margin-top:12px;display:flex;gap:14px;align-items:center">${img('analyticsArchivist','','').replace('<img','<img style="width:96px;height:84px;object-fit:contain;flex:none"')}<div><div class="h2" style="font-size:17px">Firsts and records</div><div style="font-size:14.5px;line-height:1.6;margin-top:6px">First request · 18 Sep<br>Fastest reply · 9 days<br>Longest wait so far · 98 days</div></div></div>
   <div class="card" style="margin-top:12px;background:var(--page);box-shadow:none"><b style="font-size:15px">Reading the numbers</b><p class="sub" style="font-size:14px;line-height:1.45;margin:6px 0 0">Medians, not averages, so one slow reply doesn’t skew the picture. Small numbers say how many queries they come from.</p></div>`;
 },
 goals(){
   const ms=[['First query sent',1,'5 Jul'],['10 queries out',1,'2 Sep'],['First request',1,'18 Sep'],['First full request',1,'19 Sep'],['25 queries out',0,'16 of 25'],['First offer',0,'Ahead of you']];
   return bk('Streaks & goals')+`<div class="big">Streaks &amp; goals</div>
   <div class="hero" style="display:flex;gap:12px;align-items:center;overflow:visible"><div style="flex:1"><div class="sub" style="font-size:14px">This week</div><div style="margin:4px 0"><span class="num" style="font-size:44px">3</span><span style="font-size:16px;color:rgba(255,255,255,.8)"> of 5 queries</span></div><div class="bar-h" style="background:rgba(255,255,255,.18)"><i style="width:60%;background:var(--pink)"></i></div><div class="sub" style="margin-top:8px">${IC.flame.replace('<svg','<svg style="width:15px;height:15px;vertical-align:-2px"')} 4 weeks in a row</div></div>${img('mentorLook','','').replace('<img','<img style="width:84px;height:130px;object-fit:contain;margin:-30px -6px -14px 0"')}</div>
   <div class="shd"><span class="h2">Milestones</span><span class="sub">4 of 6</span></div>
   <div class="group">${ms.map(([w,d,s])=>`<div class="li"><span class="ico" style="border-radius:50%;${d?'background:var(--navy);color:#fff':'box-shadow:inset 0 0 0 1.5px var(--rule)'}">${d?IC.check.replace('<svg','<svg style="width:15px;height:15px"'):''}</span><span class="lt" style="${d?'':'color:var(--ink-2)'}">${w}</span><span class="rt">${s}</span></div>`).join('')}</div>
   <div class="shd"><span class="h2">Your goals</span><button class="link" data-act="flow" data-v="task">Add</button></div>
   <div class="card" style="display:flex;gap:12px;align-items:center"><span style="flex:1;font-size:15px">Send 5 queries a week</span><span class="sub">Weekly</span></div>
   <div class="shd"><span class="h2">Founding writer ranks</span></div>
   <div class="card"><div style="display:flex;justify-content:space-between;gap:4px">${['Fledgling','Archivist','Scout','Mentor','QueryHawk'].map((r,i)=>`<div style="text-align:center;flex:1"><span style="width:30px;height:30px;border-radius:50%;margin:0 auto 6px;display:grid;place-items:center;${i===0?'background:var(--navy);color:#fff':'background:var(--fill)'}" class="num">${i+1}</span><span style="font-size:11.5px;${i?'color:var(--muted)':'font-weight:600'}">${r}</span></div>`).join('')}</div>
   <p class="sub" style="font-size:14px;line-height:1.45;margin:14px 0 0">Feedback that changes something counts as a contribution. Reach QueryHawk rank and there’s a thank-you gift waiting at launch.</p></div>`;
 },
 manuscript(){
   const seg=S.mseg;
   let b='';
   if(seg==='overview'){
     b=`<div class="card"><div class="sub" style="font-weight:600;color:var(--ink-2)">Your pitch</div><p style="font-size:15.5px;line-height:1.5;margin:6px 0 0">When the ferry stops running, a lighthouse keeper’s daughter walks the old salt road to find the brother who never came home.</p></div>
       <div class="grid3" style="margin-top:12px">${[['16','queries'],['4','requests'],['3','packages']].map(([n,w])=>`<div class="mini"><span class="num">${n}</span><span class="sub">${w}</span></div>`).join('')}</div>
       <div class="gl">Details</div><div class="group">${[['Age category','Adult'],['Genre','Literary fiction'],['Word count','94,000'],['Current version','Draft 4']].map(([k,v])=>`<div class="li"><span class="lt mut" style="font-size:15px">${k}</span><span class="rt" style="color:var(--ink)">${v}</span></div>`).join('')}</div>`;
   } else if(seg==='materials'){
     const pk=[['Standard UK','2 requests from 11','Letter v3 · Synopsis · First 3 chapters',1],['Letter + 10 pages','1 request from 4','Letter v3 · First 10 pages',0],['Letter + 50 pages','No replies yet','Letter v3 · First 50 pages · 1 query',0]];
     b=`<div class="shd" style="margin-top:4px"><span class="h2">Packages</span><button class="link" data-act="toast" data-v="pkg">New</button></div>
       <div class="hscroll">${pk.map(([n,m,c,dk])=>`<div style="width:230px;position:relative;padding-top:50px">
          <div class="card" style="position:absolute;inset:0 0 auto 0;height:100px;padding:14px 16px;background:${dk?'var(--navy)':'#fff'};color:${dk?'#fff':'inherit'};display:flex;gap:8px;align-items:flex-start">${IC.box.replace('<svg','<svg style="width:20px;height:20px;flex:none"')}<span style="font-weight:600">${n}</span></div>
          <div class="card" style="position:relative;margin:0 10px;box-shadow:0 10px 24px rgba(31,38,51,.14)"><div class="num" style="font-size:19px">${m}</div><div class="sub" style="margin-top:4px">${c}</div></div></div>`).join('')}</div>
       <div class="shd"><span class="h2">Query letters</span><span class="sub">3</span></div>
       <div class="group">${[['Letter v3','Used in 12 queries · current'],['Letter v2','Used in 4 queries'],['Letter v1','Used in 2 queries']].map(([n,s])=>`<div class="li"><span class="ico">${IC.doc}</span><span class="lt">${n}<span class="sub" style="display:block">${s}</span></span>${chevR}</div>`).join('')}</div>
       <div class="shd"><span class="h2">Synopses and samples</span></div>
       <div class="group">${[['One-page synopsis',IC.note],['First 3 chapters',IC.pages],['First 10 pages',IC.pages],['First 50 pages',IC.pages],['Full manuscript',IC.book]].map(([n,i])=>`<div class="li"><span class="ico">${i}</span><span class="lt">${n}</span>${chevR}</div>`).join('')}</div>`;
   } else if(seg==='versions'){
     b=`<div class="card" style="display:flex;gap:12px;align-items:center;background:var(--pink-wash)"><span class="lock">Pro</span><span style="font-size:14px;flex:1">Included for founding writers during the beta.</span></div>
       <div class="group" style="margin-top:12px">${[['Draft 4','Current · in 12 queries · 2 requests'],['Draft 3','In 4 queries · 1 request'],['Draft 2','Not queried']].map(([n,s],i)=>`<div class="li"><span class="ico">${i===0?IC.check:IC.book}</span><span class="lt">${n}<span class="sub" style="display:block">${s}</span></span>${chevR}</div>`).join('')}</div>`;
   } else {
     b=`<div class="card" style="display:flex;gap:12px;align-items:center">${img('compsArchivist','','').replace('<img','<img style="width:80px;height:74px;object-fit:contain;flex:none"')}<span style="font-size:14.5px;line-height:1.4">Books an agent would shelve beside yours. Keep them recent, ideally the last five years.</span></div>
       <div class="group" style="margin-top:12px">${[['Hamnet','Maggie O’Farrell · 2020','In 9 queries'],['Shuggie Bain','Douglas Stuart · 2020','In 6 queries'],['The Lighthouse','Alison Moore · 2012','Older than five years']].map(([t,a,u])=>`<div class="li"><span class="ico">${IC.book}</span><span class="lt">${t}<span class="sub" style="display:block">${a}</span></span><span class="rt" style="font-size:13px">${u}</span></div>`).join('')}</div>
       <button class="btn sec blk" style="margin-top:14px" data-act="toast" data-v="comp">${IC.plus}Add a comp</button>`;
   }
   return bk(BOOK.title)+`<div class="hero" style="margin-top:4px"><div class="sub" style="font-size:14px">Querying since ${BOOK.since}</div><div style="font-family:var(--type);font-weight:700;font-size:30px;margin:4px 0 4px">${BOOK.title}</div><div style="font-size:14.5px;color:rgba(255,255,255,.85)">${BOOK.cat} · ${BOOK.words}</div></div>
   <div class="seg" style="margin-top:14px">${[['overview','Overview'],['materials','Materials'],['versions','Versions'],['comps','Comps']].map(([k,w])=>`<button data-act="mseg" data-v="${k}" aria-pressed="${seg===k}">${w}</button>`).join('')}</div>${b}`;
 },
 discover(){
   return bk('Discover')+`<div class="big">Discover agents</div>
   <div class="card" style="display:flex;gap:12px;align-items:center">${img('binoculars','','').replace('<img','<img style="width:84px;height:84px;object-fit:contain;flex:none"')}<span style="font-size:14.5px;line-height:1.45">The Scout brings you verified agents who are looking for books like ${BOOK.title}.</span></div>
   <div class="chips" style="margin-top:14px"><button class="chip" aria-pressed="true">For you <b>3</b></button><button class="chip">Open now <b>12</b></button><button class="chip">New this month <b>5</b></button></div>
   ${SCOUT.map(a=>`<div class="card" style="margin-bottom:12px"><div style="display:flex;gap:12px;align-items:center"><span class="av lg">${ini(a.name)}</span><div style="flex:1;min-width:0"><b style="font-size:16.5px;display:flex;align-items:center;gap:5px">${esc(a.name)}${IC.verified.replace('<svg','<svg style="width:17px;height:17px;color:var(--navy)" aria-label="Verified"')}</b><span class="sub">${esc(a.agency)}</span></div></div>
     <p style="font-size:15px;line-height:1.45;margin:12px 0 10px">${esc(a.looking)}.</p><div class="pillrow">${a.tags.map(t=>`<span class="tag">${t}</span>`).join('')}<span class="tag" style="background:var(--st-slate)">${a.open}</span></div>
     <div style="display:flex;gap:8px;margin-top:14px"><button class="btn pri sm" style="flex:1" data-act="toast" data-v="saved">Add to my agents</button><button class="btn sec sm">Profile</button></div></div>`).join('')}`;
 },
 import(){
   return bk('Import')+`<div class="big">Bring your queries in</div><p class="lede">Already tracking in a spreadsheet? Bring it in and we’ll match the columns for you.</p>
   <div class="card" style="text-align:center;padding:22px 18px">${img('tipHawk','','').replace('<img','<img style="width:120px;height:120px;object-fit:contain;margin:0 auto 6px;display:block"')}<b style="font-size:17px">Smart import</b><p class="sub" style="font-size:14px;margin:6px 0 16px">Any spreadsheet or CSV. You check every row before anything is saved.</p><button class="btn pri blk">${IC.upload}Choose a file</button></div>
   <div class="group" style="margin-top:14px"><div class="li"><span class="ico">${IC.doc}</span><span class="lt">Use our template<span class="sub" style="display:block">Download, fill in, upload</span></span>${chevR}</div><button class="li" data-act="flow" data-v="log"><span class="ico">${IC.plus}</span><span class="lt">Log one by hand</span>${chevR}</button></div>`;
 },
 help(){
   return bk('Help centre')+`<div class="big">Help centre</div>${searchPill('Search the guides')}
   <div class="card" style="display:flex;gap:14px;align-items:center">${img('writers','','').replace('<img','<img style="width:70px;height:88px;object-fit:contain;flex:none"')}<div style="flex:1"><b style="font-size:16px">Getting started</b><div class="bar-h" style="margin:10px 0 6px"><i style="width:50%"></i></div><span class="sub">3 of 6 steps done</span></div></div>
   <div class="gl">Guides</div><div class="group">${['Logging a query','Recording a response','Nudging and closing','Packages and versions','Smart import','Your Wall of no'].map(g=>`<div class="li"><span class="ico">${IC.note}</span><span class="lt">${g}</span>${chevR}</div>`).join('')}</div>
   <div class="gl">Still stuck?</div><div class="group"><button class="li" data-act="feedback"><span class="ico">${IC.chat}</span><span class="lt">Ask us</span>${chevR}</button></div>`;
 },
 settings(){
   const it=(w,i,v)=>`<button class="li" ${v?`data-act="page" data-v="${v}"`:''}><span class="ico">${i}</span><span class="lt">${w}</span>${chevR}</button>`;
   return bk('Settings')+`<div class="big">Settings</div>
   <div class="group">${it('Profile',IC.person)}${it('Sign-in &amp; security',IC.shield)}${it('Plan &amp; billing',IC.card,'plan')}</div>
   <div class="group" style="margin-top:14px">${it('Notifications',IC.bell,'notifications')}${it('Preferences',IC.sliders)}${it('Tasks',IC.todo)}</div>
   <div class="group" style="margin-top:14px">${it('Your data',IC.data)}</div>`;
 },
 notifications(){
   const t=(w,s,on)=>`<div class="li" style="min-height:64px"><span class="lt">${w}<span class="sub" style="display:block">${s}</span></span><button class="toggle-sw" role="switch" aria-checked="${on}" data-act="sw" aria-label="${w}"></button></div>`;
   return bk('Notifications')+`<div class="big">Notifications</div>
   <div class="group">${t('Nudge reminders','When a query reaches its nudge date',true)}${t('Reply windows','When an agent’s usual reply time passes',true)}${t('Weekly round-up','Monday morning, by email',false)}${t('Founding news','What your feedback changed',true)}</div>`;
 },
 plan(){
   return bk('Plan & billing')+`<div class="big">Plan &amp; billing</div>
   <div class="card" style="text-align:center;padding:20px">${img('tierFounding','','').replace('<img','<img style="width:130px;height:130px;object-fit:contain;display:block;margin:0 auto"')}<div style="font-family:var(--type);font-weight:700;font-size:22px;margin-top:6px">Founding writer</div><p class="sub" style="font-size:14.5px;margin:6px 0 0">Full access to everything, including Pro features, for the whole beta.</p></div>
   <div class="group" style="margin-top:14px">${['Unlimited queries and agents','Versions and packages','Smart import','Analytics'].map(f=>`<div class="li"><span class="ico" style="color:var(--navy)">${IC.check}</span><span class="lt">${f}</span></div>`).join('')}</div>`;
 },
};
PAGES.materials=()=>{S.mseg='materials';return PAGES.manuscript();};
PAGES.comps=()=>{S.mseg='comps';return PAGES.manuscript();};
const PAGE_T={responses:'Responses',analytics:'Analytics',goals:'Streaks & goals',manuscript:BOOK.title,materials:BOOK.title,comps:BOOK.title,discover:'Discover',import:'Import',help:'Help centre',settings:'Settings',notifications:'Notifications',plan:'Plan & billing'};
