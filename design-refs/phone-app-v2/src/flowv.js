// ---------- logging flow variants ----------
let FQ='B', FP='C', FA='B', FE='C';
function flowSteps(o){return FLOWS[o.f].steps.filter(s=>!(s.skip&&s.skip(o.d))&&!(FE==='B'&&s.type==='review'));}
function ansLabel(s,d){
  const v=d[s.id]; if(v==null||v===''||(Array.isArray(v)&&!v.length)) return null;
  if(s.type==='text'||s.type==='area') return String(v).slice(0,22);
  if(s.type==='multi') return v.length+' pieces';
  const o=(s.opts?s.opts(d):[]).find(x=>x.v===v); if(!o) return null;
  return o.l.replace('Their online form','Online form').replace('Someone not on my list','New agent');
}
function ovFlow(o){
  const st=flowSteps(o), s=st[o.i], last=o.i===st.length-1, d=o.d;
  const pct=Math.round((o.i+1)/st.length*100);
  const isPick=s.type==='pick'||s.type==='grid';
  const lead=op=>op.av?`<span class="av" style="width:36px;height:36px;font-size:12.5px">${ini(op.av)}</span>`:op.glyph?disc(op.glyph,36):op.icon?`<span class="av" style="width:36px;height:36px;background:var(--page);box-shadow:none">${op.icon.replace('<svg','<svg style="width:19px;height:19px"')}</span>`:'';
  const on=(op,multi)=>multi?(d[s.id]||[]).includes(op.v):d[s.id]===op.v;
  const act=multi=>multi?'fmulti':'fpick';
  let body='';
  const opts=(s.opts?s.opts(d):[]);
  if(s.type==='pick'||s.type==='grid'||s.type==='multi'){
    const multi=s.type==='multi';
    let list=opts;
    if(FA==='B'&&s.id==='agent'){
      body+=`<div class="search" style="margin:0 0 16px;color:var(--ink);box-shadow:0 0 0 1px var(--rule)">${IC.search}<input id="agsearch" placeholder="Search your agents" style="border:0;outline:0;background:transparent;flex:1;min-width:0;font-size:16px" autocomplete="off"></div><div class="gl" style="margin:0 4px 8px">Saved, not queried yet</div>`;
    }
    if(FQ==='B'){
      body+=`<div class="group fl">${list.map(op=>`<button class="li" style="min-height:62px;gap:12px" data-act="${act(multi)}" data-v="${esc(op.v)}" data-s="${esc((op.l+' '+(op.s||'')).toLowerCase())}" aria-pressed="${on(op,multi)}">${lead(op)}<span class="lt"><span style="display:block;font-weight:500">${esc(op.l)}</span>${op.s?`<span class="sub">${esc(op.s)}</span>`:''}</span><span class="tk2">${on(op,multi)?IC.check:''}</span></button>`).join('')}</div>`;
    } else if(FQ==='C'){
      body+=`<div class="opts two">${list.map(op=>`<button class="opt" data-act="${act(multi)}" data-v="${esc(op.v)}" data-s="${esc((op.l+' '+(op.s||'')).toLowerCase())}" aria-pressed="${on(op,multi)}">${lead(op)||`<span class="av" style="width:36px;height:36px;background:var(--page);box-shadow:none">${IC.check.replace('<svg','<svg style="width:16px;height:16px;opacity:'+(on(op,multi)?1:0)+'"')}</span>`}<span class="lt">${esc(op.l)}${op.s?`<small>${esc(op.s)}</small>`:''}</span></button>`).join('')}</div>`;
    } else {
      body+=`<div class="opts ${s.type==='grid'?'two':''}">${list.map(op=>`<button class="opt" data-act="${act(multi)}" data-v="${esc(op.v)}" data-s="${esc((op.l+' '+(op.s||'')).toLowerCase())}" aria-pressed="${on(op,multi)}">${lead(op)}<span class="lt">${esc(op.l)}${op.s?`<small>${esc(op.s)}</small>`:''}</span>${multi||s.type!=='grid'?`<span class="tk">${on(op,multi)?IC.check:''}</span>`:''}</button>`).join('')}</div>`;
    }
  }
  if(s.type==='text') body=`<input class="field" id="ftext" value="${esc(d[s.id]||'')}" placeholder="${esc(s.ph||'')}" autocomplete="off">`;
  if(s.type==='area') body=`<textarea class="field" id="ftext" placeholder="${esc(s.ph||'')}">${esc(d[s.id]||'')}</textarea>`;
  if(s.type==='review'){
    const rows=s.rows(d);
    if(FE==='C'){
      const idx=k=>st.findIndex(x=>({Agent:'agent',Sent:'sent',When:'when',How:'how','Expect a reply':'reply'})[k]===x.id);
      body=`<div class="review">${rows.map(([k,v])=>`<button class="rv rvb" data-act="fjump" data-v="${idx(k)}"><span>${k}</span><span>${esc(v||'')}${IC.chev.replace('<svg','<svg style="width:15px;height:15px;color:var(--faint);margin-left:6px;vertical-align:-2px"')}</span></button>`).join('')}</div><p class="sub" style="margin:10px 4px 0">Tap anything to change it.</p>`;
    } else body=`<div class="review">${rows.map(([k,v])=>`<div class="rv"><span>${k}</span><span>${esc(v||'')}</span></div>`).join('')}</div>`;
  }
  // progress
  let prog='';
  if(FP==='A') prog=`<div class="prog" role="progressbar" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>`;
  if(FP==='B') prog=`<div style="flex:1;display:flex;flex-direction:column;gap:6px;align-items:center"><div style="display:flex;gap:4px;width:100%">${st.map((_,j)=>`<i style="flex:1;height:4px;border-radius:2px;background:${j<=o.i?'var(--navy)':'var(--fill)'}"></i>`).join('')}</div><span class="sub" style="font-size:12.5px">${o.i+1} of ${st.length}</span></div>`;
  if(FP==='C') prog=`<div style="flex:1"></div>`;
  const trail=FP==='C'&&s.type!=='review'?(()=>{const done=st.slice(0,o.i).map((x,j)=>[j,ansLabel(x,d)]).filter(x=>x[1]);return done.length?`<div class="trail">${done.map(([j,l])=>`<button class="tchip" data-act="fjump" data-v="${j}">${esc(l)}</button>`).join('')}</div>`:''})():'';
  const art=FQ==='A'&&s.art?`<div class="art">${img(s.art)}</div>`:'<div style="height:8px"></div>';
  const needsBtn=['multi','text','area','review'].includes(s.type);
  const ok=s.type==='multi'?(d[s.id]||[]).length>0:s.type==='text'?!!(d[s.id]||'').trim():true;
  const label=last?FLOWS[o.f].done:(s.type==='area'&&!(d[s.id]||'').trim()?'Skip':'Continue');
  const topRow=`<div class="top">${o.i>0?`<button class="ib plain" data-act="fback" aria-label="Back">${IC.back}</button>`:`<span style="width:40px"></span>`}${prog}<button class="ib plain" data-act="dismiss" aria-label="Close">${IC.close}</button></div>`;
  const h2=`<h2 ${FQ!=='A'?'style="font-size:25px"':''}>${esc(s.q(d))}</h2>${s.help?`<p class="help">${esc(s.help(d))}</p>`:'<div style="height:10px"></div>'}`;
  const bottom=needsBtn||last&&!isPick?`<div class="bottom"><button class="btn pri blk" data-act="fnext" id="fnext" ${ok?'':'disabled'}>${label}</button></div>`:'';
  if(FL==='B') return `<div class="scrim" data-act="dismiss"></div><div class="flow insheet" data-flow><div class="grab"></div>${topRow}<div class="q ${o.dir||''}">${trail}${h2}${body}</div>${bottom}</div>`;
  if(FL==='C'){const card=liveCard(o,st);return `<div class="flow" data-flow>${topRow}<div class="q ${o.dir||''}">${card||trail}${h2}${body}</div>${bottom}</div>`;}
  if(FL==='E'){const card=liveCard(o,st);return `<div class="flow fb" data-flow><div class="fband">${topRow}${card||trail}</div><div class="q fsheet ${o.dir||''}">${h2}${body}</div>${bottom}</div>`;}
  if(FL==='D') return `<div class="flow fb" data-flow><div class="fband">${topRow}${trail}${h2}</div><div class="q fsheet ${o.dir||''}">${body}</div>${bottom}</div>`;
  return `<div class="flow" data-flow>${topRow}<div class="q ${o.dir||''}">${trail}${art}${h2}${body}</div>${bottom}</div>`;
}
let FL='E';
// the query card builds itself as you answer
function liveCard(o,st){
  const d=o.d, f=o.f;
  const slot=(id,txt)=>{const j=st.findIndex(x=>x.id===id);return j>-1&&j<o.i?`<button class="lc-f on" data-act="fjump" data-v="${j}">${txt}</button>`:`<span class="lc-f ${j===o.i?'now':''}">${txt}</span>`;};
  if(f==='log'){
    const a=d.agent&&d.agent!=='new'?agentById(d.agent):null, name=a?a.name:(d.newname||''), agency=a?a.agency:'';
    const sent=d.sent?(d.sent==='pick'?(d.mats||[]).join(', ')||'':PKG[d.sent].n):'';
    const when=d.when?{today:'Today',yesterday:'Yesterday',week:'This week',pick:'29 Oct'}[d.when]:'';
    const how=d.how?{email:'By email',form:'Online form',post:'By post',event:'At an event'}[d.how]:'';
    const rep=d.reply?(d.reply==='none'?'No reply means no':`Reply in ${d.reply} wks`):'';
    const ai=st.findIndex(x=>x.id==='agent');
    return `<div class="lcard"><div class="lc-band"><span>${name?'With the agent':'New query'}</span><span>Day 0</span></div>
      <div class="lc-ag">${name?`<span class="av">${ini(name)}</span>`:`<span class="av lc-empty"></span>`}<div style="min-width:0;flex:1">${name?`<${ai>-1&&ai<o.i?`button data-act="fjump" data-v="${ai}"`:'div'} class="lc-nm">${esc(name)}</${ai>-1&&ai<o.i?'button':'div'}><div class="sub">${esc(agency)}</div>`:`<div class="lc-ph" style="width:60%"></div><div class="lc-ph" style="width:40%;margin-top:6px"></div>`}</div>${glyph('queried',22)}</div>
      <div class="lc-tray"><div class="sub" style="font-size:12px">${esc(BOOK.title)}</div><div class="lc-fs">${slot('sent',sent||'What you sent')}${slot('when',when||'When')}${slot('how',how||'How')}${slot('reply',rep||'Reply window')}</div></div></div>`;
  }
  if(d.q){const q=qById(d.q);if(!q)return '';
    return `<div class="lcard"><div class="lc-band" style="background:${COURT[courtOf(q)].bg};color:${COURT[courtOf(q)].fg}"><span>${COURT[courtOf(q)].w}</span><span>Day ${q.day}</span></div><div class="lc-ag"><span class="av">${ini(q.name)}</span><div style="flex:1;min-width:0"><div class="lc-nm">${esc(q.name)}</div><div class="sub">${esc(q.agency)}</div></div>${stPill(q.st)}</div></div>`;}
  return '';
}
// agent search filter
document.addEventListener('input',e=>{if(e.target.id!=='agsearch')return;const t=e.target.value.toLowerCase().trim();e.target.closest('.flow').querySelectorAll('[data-s]').forEach(b=>{b.hidden=!!t&&!b.dataset.s.includes(t)&&b.dataset.v!=='new';});});
