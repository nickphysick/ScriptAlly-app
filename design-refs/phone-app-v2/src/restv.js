// ---------- remaining sections: first run, goals, corkboard, celebrations ----------
let FRH='C', FRQ='A', GLV='B', CBV='A', CEV='C';
const chevS=IC.chev.replace('<svg','<svg class="chev"');
const startRows=`<div class="group">
  <button class="li" style="min-height:64px" data-act="page" data-v="import"><span class="ico">${IC.upload}</span><span class="lt"><span style="display:block;font-weight:600">Smart import</span><span class="sub">Drop in any tracker spreadsheet</span></span>${chevS}</button>
  <button class="li" style="min-height:64px" data-act="page" data-v="import"><span class="ico">${IC.doc}</span><span class="lt"><span style="display:block;font-weight:600">Use our template</span><span class="sub">Fill it in, then upload</span></span>${chevS}</button>
  <button class="li" style="min-height:64px" data-act="flow" data-v="log"><span class="ico">${IC.plus}</span><span class="lt"><span style="display:block;font-weight:600">Log one by hand</span><span class="sub">One question at a time</span></span>${chevS}</button></div>`;
const STEPS=[['Add your manuscript',1],['Log your first query',0],['Add an agent you want to query',0],['Set your weekly goal',0]];
const stepsList=()=>`<div class="group">${STEPS.map(([t,d])=>`<div class="task" style="background:#fff"><span class="tick" style="${d?'background:var(--navy);box-shadow:none;color:#fff':''}">${d?IC.check.replace('<svg','<svg style="opacity:1"'):''}</span><span class="lt"><b style="${d?'color:var(--muted);text-decoration:line-through':''}">${t}</b></span></div>`).join('')}</div>`;
const exTag='<span class="extag">Example</span>';

function homeEmpty(){
  const greet=`<div class="bl"><div class="bg">Afternoon, ${ME.first}</div>${msBtn(BOOK.title)}</div>`;
  if(FRH==='A') return null;
  if(FRH==='B'){
    const band=bandHead(null)+`<div style="display:flex;gap:14px;align-items:center;margin-top:20px">${spot('placeholder',64,'#fff')}<div><div style="font-family:var(--type);font-size:22px">Welcome to QueryHawk</div><div style="font-size:14px;color:rgba(255,255,255,.75);margin-top:4px">1 of 4 set-up steps done</div></div></div><div class="bar-h" style="margin-top:14px;background:rgba(255,255,255,.15)"><i style="width:25%;background:var(--pink)"></i></div>`;
    return bandPage('home',band,`<div class="shd" style="margin-top:0"><span class="h2">Bring your queries in</span></div>${startRows}<div class="shd"><span class="h2">Getting started</span><span class="sub">1 of 4</span></div>${stepsList()}${foundingCard()}`);
  }
  // C: the real layout with a faded example and one clear action
  const band=bandHead(null)+`<div class="exwrap" style="margin-top:22px"><div class="exfade">${heroBand()}</div><div class="excta"><div style="font-family:var(--type);font-size:20px;color:#fff;text-align:center">Let’s start tracking your campaign</div><button class="btn pink" data-act="flow" data-v="log">${IC.plus}Log your first query</button><button class="link" style="color:#fff" data-act="page" data-v="import">or import a spreadsheet</button></div></div>`;
  const sh=`<div class="card"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:16px">Where they stand</b>${exTag}</div>
      <div style="display:flex;gap:3px;height:14px;margin:12px 0 10px;opacity:.35"><i style="flex:2;background:var(--pink);border-radius:4px"></i><i style="flex:6;background:var(--navy);border-radius:4px"></i><i style="flex:3;background:#c9c2b6;border-radius:4px"></i></div>
      <p class="sub" style="margin:0;font-size:13.5px">Once you log queries, this splits them into with you, with the agent and gone quiet.</p></div>
    <div class="nextc"><div class="nh"><span class="h2" style="font-size:18px">Getting started</span><span class="sub">1 of 4</span></div><div style="padding:4px 0">${STEPS.map(([t,d],i)=>`<div class="task" style="background:#fff;padding:11px 16px"><span class="tick" style="${d?'background:var(--navy);box-shadow:none;color:#fff':''}">${d?IC.check.replace('<svg','<svg style="opacity:1"'):''}</span><span class="lt"><b style="${d?'color:var(--muted);text-decoration:line-through':''}">${t}</b></span>${i===1?'<button class="btn pri sm tverb" data-act="flow" data-v="log">Start</button>':''}</div>`).join('')}</div></div>${foundingCard()}`;
  return bandPage('home',band,sh);
}
function queriesEmpty(){
  if(FRQ==='A') return null;
  const band=bandHead('Queries',ringB(IC.eye,'birds','Birds-eye view'))+`<div class="bstats"><span><b class="num">0</b> sent</span><span>Nothing logged yet</span></div>`;
  const neat=[QUERIES[0],QUERIES[2],QUERIES[4]].map(q=>`<div class="exrow">${disc(q.st,28)}<span style="flex:1;min-width:0"><b>${esc(q.name)}</b><span class="sub" style="display:block">${esc(q.agency)}</span></span><span class="sub">${ST[q.st].w}</span></div>`).join('');
  const birds=[[.9,'Eleanor','var(--pink)'],[.55,'Marcus','var(--navy)'],[.35,'Priya','var(--navy)']].map(([p,n,c])=>`<div style="margin-bottom:8px"><div class="sub" style="display:flex;justify-content:space-between"><span>${n}</span><span>${Math.round(p*100)}%</span></div><div class="bar-h" style="height:8px"><i style="width:${p*100}%;background:${c}"></i></div></div>`).join('');
  return bandPage('queries',band,`<div class="h2" style="font-size:22px;margin:2px 2px 4px">Let’s log your first query</div><p class="lede" style="margin:0 2px 14px">Bring in the queries you’ve already sent, or start fresh.</p>${startRows}
    <div class="feat"><div class="ftop"><b>The Neat List</b>${exTag}</div><p class="sub">Every query, grouped by whose move it is.</p><div class="frame">${neat}</div></div>
    <div class="feat"><div class="ftop"><b>The Birds-eye View</b>${exTag}</div><p class="sub">How close each query is to its next step.</p><div class="frame">${birds}</div></div>`);
}
// hook the empty states in
const _sh2=screenHome2, _sq2=screenQueries2;
screenHome2=function(){ if(S.empty){const h=homeEmpty(); if(h) return h;} return _sh2(); };
screenQueries2=function(){ if(S.empty){const h=queriesEmpty(); if(h) return h;} return _sq2(); };

// ---------- Streaks & goals ----------
const _goalsA=PAGES.goals;
PAGES.goals=function(){
  if(GLV==='A') return _goalsA();
  const wks=[1,1,0,1,1,1,1,1];
  const badges=[['queried','First query','5 Jul',1],['psent','10 out','2 Sep',1],['preq','First request','18 Sep',1],['freq','First full','19 Sep',1],['fsent','25 out','16 of 25',0],['offer','First offer','Ahead',0]];
  return bk('Streaks & goals')+`<div class="card" style="display:flex;gap:16px;align-items:center">
     <svg width="92" height="92" viewBox="0 0 92 92"><circle cx="46" cy="46" r="38" fill="none" stroke="var(--fill)" stroke-width="10"/><circle cx="46" cy="46" r="38" fill="none" stroke="var(--navy)" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(0.6*238.8).toFixed(1)} 239" transform="rotate(-90 46 46)"/><text x="46" y="52" text-anchor="middle" font-family="Special Elite" font-size="22" fill="#1f2633">3/5</text></svg>
     <div><div class="sub">This week’s goal</div><div style="font-family:var(--type);font-size:21px;margin-top:2px">2 more queries</div><div class="sub" style="margin-top:4px">Resets on Monday</div></div></div>
   <div class="card" style="margin-top:12px"><div style="display:flex;justify-content:space-between;align-items:baseline"><b style="font-size:16px;display:flex;gap:6px;align-items:center">${IC.flame.replace('<svg','<svg style="width:18px;height:18px"')}4-week streak</b><span class="sub">Best: 5 weeks</span></div>
     <div style="display:flex;gap:6px;margin-top:14px">${wks.map((w,i)=>`<div style="flex:1;text-align:center"><span class="wdot ${w?'on':''} ${i===7?'now':''}">${w?IC.check:''}</span><div class="sub" style="font-size:11px;margin-top:4px">${['8 Sep','15','22','29','6 Oct','13','20','27'][i]}</div></div>`).join('')}</div></div>
   <div class="shd"><span class="h2">Milestones</span><span class="sub">4 of 6</span></div>
   <div class="bgrid">${badges.map(([g,w,s,d])=>`<div class="badge ${d?'':'off'}">${disc(g,44)}<b>${w}</b><span class="sub">${s}</span></div>`).join('')}</div>
   <div class="shd"><span class="h2">Founding writer ranks</span></div>
   <div class="card"><div style="display:flex;justify-content:space-between;gap:4px">${['Fledgling','Archivist','Scout','Mentor','QueryHawk'].map((r,i)=>`<div style="text-align:center;flex:1"><span style="width:30px;height:30px;border-radius:50%;margin:0 auto 6px;display:grid;place-items:center;${i===0?'background:var(--navy);color:#fff':'background:var(--fill)'}" class="num">${i+1}</span><span style="font-size:11.5px;${i?'color:var(--muted)':'font-weight:600'}">${r}</span></div>`).join('')}</div>
   <p class="sub" style="font-size:14px;line-height:1.45;margin:14px 0 0">Feedback that changes something counts as a contribution. Reach QueryHawk rank and there’s a thank-you gift waiting at launch.</p></div>`;
};

// ---------- Corkboard ----------
const _todoV=screenTodo2;
screenTodo2=function(){
  if(S.todoSeg!=='cork'||CBV==='A') return _todoV();
  const g=k=>TASKS.filter(t=>t.grp===k);
  const band=bandHead('To-do')+`<div class="bstats"><span><b class="num">${NOTES.length}</b> notes pinned</span></div>`;
  const col=['var(--pink)','#e7cf9e','#9fb4cc','#c9c2b6'];
  let sh=`<div class="seg" style="margin-top:0"><button data-act="todoseg" data-v="tasks" aria-pressed="false">Tasks</button><button data-act="todoseg" data-v="cork" aria-pressed="true">Corkboard</button></div>`;
  sh+=`<div class="ncols">${NOTES.map((n,i)=>`<div class="ncard" style="--nc:${col[i%4]}">${esc(n.t)}<small>${n.d}</small></div>`).join('')}<button class="ncard nadd" data-act="flow" data-v="note">${IC.plus.replace('<svg','<svg style="width:20px;height:20px"')}Add a note</button></div>`;
  return bandPage('todo',band,sh);
};

// ---------- celebrations ----------
function ovCele(o){
  const q=qById(o.id)||{name:'',agency:'',st:'freq'};
  const cols=['#e8c8bc','#f4f0e9','#f7efe3','#d7e0e8'];
  const conf=Array.from({length:34},(_,i)=>`<i style="left:${(i*37)%100}%;background:${cols[i%4]};animation-delay:${(i%9)*.12}s;animation-duration:${2.2+(i%5)*.3}s"></i>`).join('');
  const stampW=(o.t||'').includes('offer')?'Offer':(o.t||'').includes('full')?'Full requested':'Partial requested';
  if(CEV==='B') return `<div class="scrim"></div><div class="sheet" style="height:auto;padding:8px 20px 34px;text-align:center"><div class="grab"></div><div style="display:flex;justify-content:center;margin:8px 0 12px">${spot('placeholder',96)}</div><h2 style="font-family:var(--type);font-weight:400;font-size:26px;margin:0 0 8px">${esc(o.t)}</h2><p class="sub" style="font-size:15px;line-height:1.45;margin:0 0 20px">${esc(o.p)}</p><button class="btn pri blk" data-act="query" data-id="${o.id}">See your next step</button><button class="btn blk" data-act="dismiss" style="margin-top:6px">Done</button></div>`;
  if(CEV==='C') return `<div class="cele" style="background:var(--navy);color:#fff"><div class="conf">${conf}</div>
      <div class="ccard"><div class="qband" style="background:var(--st-pink);color:#5a3027;padding:8px 14px"><span>With you</span><span>Day ${q.day||''}</span></div><div style="padding:14px;display:flex;gap:12px;align-items:center;color:var(--ink)"><span class="av">${ini(q.name||'A B')}</span><div style="text-align:left"><div style="font-family:var(--type);font-size:18px">${esc(q.name)}</div><div class="sub">${esc(q.agency)}</div></div></div><span class="stamp">${stampW}</span></div>
      <h2 style="color:#fff;font-weight:400">${esc(o.t)}</h2><p style="color:rgba(255,255,255,.8)">${esc(o.p)}</p>
      <button class="btn pink blk" data-act="query" data-id="${o.id}" style="max-width:320px">See your next step</button><button class="btn blk" data-act="dismiss" style="max-width:320px;margin-top:6px;color:#fff">Done</button></div>`;
  return `<div class="cele"><div class="conf">${conf}</div>${spot('placeholder',170)}<h2 style="font-weight:400">${esc(o.t)}</h2><p>${esc(o.p)}</p>
    <button class="btn pri blk" data-act="query" data-id="${o.id}" style="max-width:320px">See your next step</button><button class="btn blk" data-act="dismiss" style="max-width:320px;margin-top:6px">Done</button></div>`;
}
