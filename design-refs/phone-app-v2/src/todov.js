// ---------- To-do variants ----------
let TDB='B', TDG='A', TDR='B';
const KIND={send:['To send',IC.send,'Send'],nudge:['To nudge',IC.bell,'Nudge'],close:['To decide',IC.closeq,'Decide'],tidy:['Tidy up',IC.edit,'Add'],own:['Your tasks',IC.todo,'Done']};
function taskRowV(t){
  const q=t.q?qById(t.q):null;
  if(TDR==='B'){
    const lead=q?disc(q.st,40):`<span class="ico2" style="width:40px;height:40px">${KIND[t.kind][1]}</span>`;
    return `<div class="sw" data-swipe data-one="r"><div class="acts"><span></span><button class="r" data-act="later" data-id="${t.id}">${IC.later}Later</button></div>
      <div class="task" ${q?`data-act="query" data-id="${q.id}"`:''} role="button" tabindex="0">${lead}<span class="lt"><b>${esc(t.t)}</b><small>${esc(t.s)}</small></span><button class="btn ${t.kind==='send'?'pri':'quiet'} sm tverb" data-act="task" data-id="${t.id}">${KIND[t.kind][2]}</button></div></div>`;
  }
  if(TDR==='C'){
    return `<div class="sw" data-swipe data-one="r"><div class="acts"><span></span><button class="r" data-act="later" data-id="${t.id}">${IC.later}Later</button></div>
      <div class="task" data-act="task" data-id="${t.id}" role="button" tabindex="0"><span class="tick" aria-hidden="true">${IC.check}</span><span class="lt"><b>${esc(t.t)}</b><small style="${t.grp==='earlier'?'color:var(--ink-2);font-weight:600':''}">${esc(t.s)}</small></span>${IC.chev.replace('<svg','<svg style="width:16px;height:16px;color:var(--faint);flex:none"')}</div></div>`;
  }
  return taskRow(t);
}
function screenTodo2(){
  const g=k=>TASKS.filter(t=>t.grp===k);
  const days=[['Mon',26,1],['Tue',27,0],['Wed',28,2],['Thu',29,3],['Fri',30,0],['Sat',31,1],['Sun',1,0]];
  let bandBody='';
  if(S.todoSeg==='cork') bandBody=`<div class="bstats"><span><b class="num">${NOTES.length}</b> notes pinned</span></div>`;
  else if(TDB==='B') bandBody=`<div class="wk">${days.map(([d,n,c])=>`<button class="wkd ${n===29?'on':''}"><span class="wd">${d}</span><span class="wn num">${n}</span><span class="wdots">${'<i></i>'.repeat(Math.min(c,3))}</span></button>`).join('')}</div>
      <div class="bstats" style="margin-top:14px"><span><b class="num">${g('earlier').length}</b> from earlier</span><span><b class="num">${g('today').length}</b> today</span><span><b class="num">${g('soon').length}</b> coming up</span></div>`;
  else if(TDB==='C'){const done=3,tot=done+g('earlier').length+g('today').length;const pct=done/tot;
    bandBody=`<div style="display:flex;align-items:center;gap:16px;margin-top:18px"><svg width="76" height="76" viewBox="0 0 76 76"><circle cx="38" cy="38" r="31" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="9"/><circle cx="38" cy="38" r="31" fill="none" stroke="#e8c8bc" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(pct*194.8).toFixed(1)} 195" transform="rotate(-90 38 38)"/><text x="38" y="44" text-anchor="middle" font-family="Special Elite" font-size="19" fill="#fff">${done}/${tot}</text></svg>
      <div><div style="font-size:14px;color:rgba(255,255,255,.72)">Thursday 29 October</div><div style="font-family:var(--type);font-size:22px;margin-top:3px">${tot-done} to do today</div><div style="font-size:13.5px;color:rgba(255,255,255,.72);margin-top:4px">${done} done · ${g('soon').length} coming up</div></div></div>`;}
  else bandBody=`<div style="margin-top:18px;color:#fff"><div style="font-size:14px;color:rgba(255,255,255,.72)">Thursday</div><div class="num" style="font-size:32px;line-height:1.05;margin-top:2px">29 October</div></div>
      <div class="bstats" style="margin-top:12px"><span><b class="num">${g('earlier').length}</b> from earlier</span><span><b class="num">${g('today').length}</b> today</span><span><b class="num">${g('soon').length}</b> coming up</span></div>`;
  const band=bandHead('To-do')+bandBody;
  let sh=`<div class="seg" style="margin-top:0"><button data-act="todoseg" data-v="tasks" aria-pressed="${S.todoSeg==='tasks'}">Tasks</button><button data-act="todoseg" data-v="cork" aria-pressed="${S.todoSeg==='cork'}">Corkboard</button></div>`;
  if(S.todoSeg==='cork'){
    sh+=`<p class="lede" style="margin:0 0 16px">Notes to yourself. Pin anything you want to remember about agents, materials or your book.</p>
      <div class="grid2" style="gap:18px 14px">${NOTES.map(n=>`<div class="note" style="background:${n.c};transform:rotate(${n.r}deg)">${esc(n.t)}<small>${n.d}</small></div>`).join('')}
      <button class="note nopin" data-act="flow" data-v="note" style="background:transparent;box-shadow:inset 0 0 0 1.5px #cdc5b8;display:grid;place-items:center;color:var(--muted);font-weight:600">${IC.plus.replace('<svg','<svg style="width:22px;height:22px"')}<span>Add a note</span></button></div>`;
    return bandPage('todo',band,sh);
  }
  const sec=(w,ts)=>ts.length?`<div class="rowhd">${w} <span class="n">· ${ts.length}</span></div>`+ts.map(taskRowV).join(''):'';
  if(TDG==='B'){
    const order=['send','nudge','close','tidy','own'];
    sh+=`<div class="rows" style="margin-top:-8px">${order.map(k=>sec(KIND[k][0],TASKS.filter(t=>t.kind===k))).join('')}</div>`;
  } else if(TDG==='C'){
    const first=g('earlier')[0]||g('today')[0], q=first&&first.q?qById(first.q):null;
    const rest=TASKS.filter(t=>t!==first);
    sh+=`<div class="nextc" style="margin-top:2px"><div class="nh"><span class="h2" style="font-size:18px">Do this first</span><span class="sub">${rest.length} more</span></div>
      <div class="nb" style="flex-direction:column;align-items:stretch;gap:12px"><div style="display:flex;gap:12px;align-items:center">${q?disc(q.st,44):''}<div style="flex:1;min-width:0"><div style="font-size:18px;font-weight:600;line-height:1.25">${esc(first.t)}</div><div class="sub" style="margin-top:3px">${esc(first.s)}</div></div></div>
      <div style="display:flex;gap:8px"><button class="btn pri" style="flex:1" data-act="task" data-id="${first.id}">${KIND[first.kind][2]}</button><button class="btn quiet" data-act="later" data-id="${first.id}">Later</button></div></div></div>
      <div class="rows">${sec('Then',rest.filter(t=>t.grp!=='soon'&&t.grp!=='house'))}${sec('Coming up',rest.filter(t=>t.grp==='soon'))}${sec('When you have a moment',rest.filter(t=>t.grp==='house'))}</div>`;
  } else {
    sh+=`<div class="rows" style="margin-top:-8px">${sec('From earlier',g('earlier'))}${sec('Today',g('today'))}${sec('Coming up',g('soon'))}${sec('When you have a moment',g('house'))}</div>`;
  }
  return bandPage('todo',band,sh);
}
