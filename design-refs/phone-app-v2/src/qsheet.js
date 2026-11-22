// ---------- query sheet variants ----------
let QH='B', QB='B', QL='B', QN='A';
const STAGES=[['queried','Queried'],['psent','Partial'],['fsent','Full'],['offer','Offer']];
function stageIdx(q){const s=q.st;if(s==='offer')return 3;if(s==='freq'||s==='fsent')return 2;if(s==='preq'||s==='psent'||s==='rr')return 1;if(ST[s].court==='closed'){const t=q.tl.map(x=>x[0]);return t.includes('fsent')?2:t.includes('psent')?1:0;}return 0;}
function stageTrack(q){
  const i=stageIdx(q), closed=courtOf(q)==='closed';
  return `<div class="stg">${STAGES.map(([k,w],j)=>`<div class="stg-i ${j<=i?'on':''} ${j===i?'now':''}"><span class="stg-d">${j<=i?glyph(j===i?q.st:k,20,j===i?'#fff':'currentColor'):''}</span><span class="stg-w">${j===i?ST[q.st].w.replace('Partial requested','Partial asked').replace('Full requested','Full asked'):w}</span></div>`).join('<i class="stg-l"></i>')}</div>${closed?`<p class="sub" style="margin:8px 0 0">${esc(q.closed)}</p>`:''}`;
}
function tlList(q,limit){
  const items=q.tl.slice().reverse(); const shown=limit?items.slice(0,limit):items;
  return `<ol class="steps rev">${shown.map(([k,t,d,att])=>`<li class="step">${k==='nudge'?`<span style="width:24px;height:24px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 0 0 3px #fff">${IC.bell.replace('<svg','<svg style="width:18px;height:18px"')}</span>`:glyph(k,24)}<span class="t">${esc(t)} ${k==='queried'?`<i>${q.how}</i>`:''}</span><span class="d">${d}</span>${att.length?`<span class="att">${att.map(a=>`<span>${matIc(a)}${esc(a)}</span>`).join('')}</span>`:''}</li>`).join('')}</ol>
   ${limit&&items.length>limit?`<button class="link" style="margin:2px 0 4px 36px">Show all ${items.length} steps</button>`:''}`;
}
function nextBlock(q,mode){
  const c=courtOf(q), f=q.name.split(' ')[0];
  let t,s,btn;
  if(c==='you'){t=q.next;s=`${f} asked on ${q.tl[q.tl.length-1][2]}`;btn=`<button class="btn pri ${mode==='C'?'blk':'sm'}" data-act="next" data-id="${q.id}">Mark as sent</button>`;}
  else if(c==='closed'){t=q.closed;s='It’s on your Wall of no';btn=`<button class="btn sec ${mode==='C'?'blk':'sm'}" data-act="page" data-v="responses">View the wall</button>`;}
  else {t=q.next;s=`Day ${q.day} · waiting on ${f}`;btn=`<button class="btn sec ${mode==='C'?'blk':'sm'}" data-act="flow" data-v="respond" data-id="${q.id}">${f} replied</button>`;}
  if(mode==='C') return `<div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:10px"><b style="font-size:15.5px">${esc(t)}</b><span class="sub" style="white-space:nowrap">${esc(s.split(' · ')[0])}</span></div>${btn}`;
  return `<div class="nextstep ${c==='you'?'':'wait'}"><div class="tx"><span class="sub" style="font-weight:600;color:var(--ink-2)">Your next step</span><b style="margin-top:2px">${esc(t)}</b><small>${esc(s)}</small>${btn}</div></div>`;
}
function ovQuery(o){
  const q=qById(o.id), c=courtOf(q), band=q.st==='offer'?COURT.offer:COURT[c], tab=o.tab||'track', f=q.name.split(' ')[0];
  const moreBtn=`<button class="ib" style="box-shadow:none;background:var(--page)" data-act="qmore" aria-label="More actions">${IC.more}</button>`;
  // header
  let head='';
  if(QH==='A'){
    head=`<div style="background:${band.bg};color:${band.fg};flex:none"><div class="grab" data-grab></div><div class="qband"><span>${band.w}</span><span class="day">Day ${q.day}</span></div></div>`;
  } else if(QH==='B'){
    head=`<div style="background:${band.bg};color:${band.fg};flex:none"><div class="grab" data-grab></div><div class="qband"><span>${band.w}</span><span class="day" style="font-size:17px">Day ${q.day}</span></div></div>`;
  } else {
    head=`<div class="grab" data-grab></div>`;
  }
  let top='';
  if(QH==='A') top=`<div class="qhead"><span class="av lg">${ini(q.name)}</span><div style="flex:1;min-width:0"><div class="nm">${esc(q.name)}</div><div class="sub" style="font-size:14px;margin-top:3px">${esc(q.agency)}</div></div>${moreBtn}</div><div>${stPill(q.st)}</div>`;
  if(QH==='B') top=`<div class="qhead"><span class="av lg">${ini(q.name)}</span><div style="flex:1;min-width:0"><div class="nm">${esc(q.name)}</div><div class="sub" style="font-size:14px;margin-top:3px">${esc(q.agency)}</div></div>${moreBtn}</div>
     <div class="msblk"><div class="sub">${PKG[q.pkg].n} · sent ${q.how}</div><div style="font-family:var(--type);font-size:22px;margin:4px 0 8px">${esc(BOOK.title)}</div><div class="pillrow"><span class="tag" style="background:#fff">Adult</span><span class="tag" style="background:#fff">Literary fiction</span>${stPill(q.st)}</div></div>`;
  if(QH==='C') top=`<div style="display:flex;gap:14px;align-items:center;padding:6px 0 4px">${disc(q.st,58)}<div style="flex:1;min-width:0"><div style="font-family:var(--type);font-size:23px;line-height:1.1">${ST[q.st].w}</div><div class="sub" style="font-size:13.5px;margin-top:4px">${band.w} · Day ${q.day}</div></div>${moreBtn}</div>
     <div class="card" style="box-shadow:none;background:var(--page);display:flex;gap:12px;align-items:center;padding:12px 14px;margin-top:10px"><span class="av">${ini(q.name)}</span><div style="flex:1;min-width:0"><b style="display:block;font-size:16px">${esc(q.name)}</b><span class="sub">${esc(q.agency)}</span></div>${IC.chev.replace('<svg','<svg style="width:16px;height:16px;color:var(--faint)"')}</div>`;
  // sections
  const track=(QL==='B'?`<div style="margin:16px 0 4px">${stageTrack(q)}</div>`:'')+tlList(q,QL==='B'?2:0);
  const a=agentById('q:'+q.id);
  const agent=`<dl class="kv" style="margin:12px 0"><dt>Looking for</dt><dd>${esc(a.looking)}</dd><dt>How to submit</dt><dd>${esc(a.how)}</dd><dt>Reply time</dt><dd>${esc(a.reply)}</dd></dl>`;
  const p=PKG[q.pkg];
  const mat=`<div class="att" style="margin:12px 0 6px">${p.items.map(x=>`<span>${matIc(x)}${x}</span>`).join('')}</div><p class="sub" style="margin:6px 0 0">${p.n}, sent ${q.how} on ${q.sent}.</p>`;
  let body='';
  const nb=QN==='B'?`<div style="margin:14px 0 4px">${nextBlock(q,'A')}</div>`:'';
  if(QB==='A'){
    body=nb+`<div class="tabs" role="tablist">${[['track','Tracking'],['agent','Agent'],['mat','Materials']].map(([k,w])=>`<button role="tab" data-act="qtab" data-v="${k}" aria-selected="${tab===k}">${w}</button>`).join('')}</div>`+(tab==='track'?track:tab==='agent'?agent:mat);
  } else {
    const sec=t=>`<div class="qsec">${t}</div>`;
    body=nb+sec('Where it’s got to')+track+sec('What you sent')+mat+sec(`About ${f}`)+agent;
  }
  const foot=QN==='B'?'':`<div class="foot" style="padding-top:10px">${nextBlock(q,QN)}</div>`;
  const more=o.more?`<div class="card" style="position:absolute;right:14px;top:70px;z-index:5;padding:6px 0;width:220px;box-shadow:0 16px 40px rgba(31,38,51,.22)">
     ${[['respond','Record a response',IC.reply],['nudge','Log a nudge',IC.bell],['edit','Edit query',IC.edit],['closeq','Close query',IC.closeq]].map(([a2,w,i])=>`<button class="li" style="min-height:46px;font-size:15px" data-act="${a2==='respond'?'flow':a2}" data-v="${a2==='respond'?'respond':''}" data-id="${q.id}"><span class="ico">${i}</span>${w}</button>`).join('')}</div>`:'';
  return `<div class="scrim" data-act="dismiss"></div><div class="sheet white" data-sheet style="height:${o.h||'64%'}">${head}
    <div class="body" style="padding-top:2px">${top}${body}</div>${foot}${more}</div>`;
}
