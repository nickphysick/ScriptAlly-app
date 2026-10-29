// ---------- one question per screen ----------
const first=n=>n.split(' ')[0];
const agName=d=>{if(d.agent==='new')return d.newname||'the agent';const a=agentById(d.agent);return a?a.name:'the agent';};
const qOf=d=>qById(d.q)||{};
const WHEN=[['today','Today'],['yesterday','Yesterday'],['week','Earlier this week'],['pick','Pick a date']];
const FLOWS={
 log:{done:'Log query',steps:[
   {id:'agent',type:'pick',art:'courierCut',q:()=>'Who did you query?',help:()=>'Agents you’ve saved but not queried yet.',skip:d=>d.agentPreset,
     opts:()=>AGENTS_EXTRA.map(a=>({v:a.id,l:a.name,s:a.agency,av:a.name})).concat([{v:'new',l:'Someone not on my list',s:'Add them as you go',icon:IC.plus}])},
   {id:'newname',type:'text',art:'courierCut',q:()=>'What’s the agent’s name?',help:()=>'You can add the rest of their details later.',ph:'e.g. Hannah Cole',skip:d=>d.agent!=='new'},
   {id:'sent',type:'pick',art:'inkwell',q:d=>`What did you send ${first(agName(d))}?`,help:d=>{const a=agentById(d.agent);return a?`${a.agency} asks for: ${a.how.split('· ')[1]||a.how}.`:'Pick a package, or choose the pieces yourself.'},
     opts:()=>Object.entries(PKG).map(([k,p])=>({v:k,l:p.n,s:p.items.join(' · '),icon:IC.box})).concat([{v:'pick',l:'Choose the pieces',s:'Letter, synopsis, pages…',icon:IC.pages}])},
   {id:'mats',type:'multi',art:'inkwell',q:()=>'Which pieces went out?',help:()=>'Pick everything you sent.',skip:d=>d.sent!=='pick',
     opts:()=>['Letter v3','One-page synopsis','First 10 pages','First 3 chapters','First 50 pages','Full manuscript'].map(x=>({v:x,l:x}))},
   {id:'when',type:'pick',art:'quill',q:()=>'When did it go?',help:()=>'This starts the clock on their reply window.',opts:()=>WHEN.map(([v,l])=>({v,l,icon:IC.calendar}))},
   {id:'how',type:'grid',art:'discHawk',q:()=>'How did you send it?',opts:()=>[{v:'email',l:'By email',icon:IC.mail},{v:'form',l:'Their online form',icon:IC.globe},{v:'post',l:'By post',icon:IC.send},{v:'event',l:'At an event',icon:IC.person}]},
   {id:'reply',type:'pick',art:'hourglass',q:d=>`When should we expect a reply?`,help:d=>{const a=agentById(d.agent);return a?`${a.agency}: ${a.reply.toLowerCase()}.`:'Check their website if you’re not sure.'},
     opts:()=>[['6','6 weeks'],['8','8 weeks'],['12','12 weeks'],['16','16 weeks'],['none','No reply means no']].map(([v,l])=>({v,l,icon:IC.clock}))},
   {id:'review',type:'review',art:null,q:()=>'Look right?',rows:d=>[['Agent',agName(d)],['Sent',d.sent==='pick'?(d.mats||[]).join(', '):PKG[d.sent].n],['When',(WHEN.find(w=>w[0]===d.when)||['','Today'])[1]],['How',{email:'By email',form:'Their online form',post:'By post',event:'At an event'}[d.how]],['Expect a reply',d.reply==='none'?'No reply means no':`Within ${d.reply} weeks`]]},
 ],finish(d){
   const a=agentById(d.agent); const name=a?a.name:(d.newname||'New agent'); const agency=a?a.agency:'Agency to add';
   QUERIES.unshift({id:'q'+Date.now(),name,agency,st:'queried',day:0,sent:'29 Oct',how:{email:'by email',form:'via their form',post:'by post',event:'at an event'}[d.how],pkg:d.sent==='pick'?'std':d.sent,next:d.reply==='none'?'No reply means no':`Reply window ends ${{6:'10 Dec',8:'24 Dec',12:'21 Jan',16:'18 Feb'}[d.reply]}`,
     tl:[['queried','Query sent','29 Oct',d.sent==='pick'?(d.mats||[]):PKG[d.sent].items]]});
   const i=AGENTS_EXTRA.findIndex(x=>x.id===d.agent); if(i>-1) AGENTS_EXTRA.splice(i,1);
   S.empty=false;
   return {toast:{art:'courier',b:`Logged. That’s ${QUERIES.length} queries out.`,t:`We’ll keep an eye on ${first(name)}’s reply window.`,undo:1}};
 }},
 respond:{done:'Save',steps:[
   {id:'q',type:'pick',art:'archivistLook',q:()=>'Who replied?',skip:d=>d.qPreset,opts:()=>active().map(q=>({v:q.id,l:q.name,s:q.agency,glyph:q.st}))},
   {id:'what',type:'grid',art:'discHawk',q:d=>`What did ${first(qOf(d).name||'they')} say?`,opts:()=>[{v:'preq',l:'Asked for a partial',glyph:'preq'},{v:'freq',l:'Asked for the full',glyph:'freq'},{v:'rr',l:'Revise and resubmit',glyph:'rr'},{v:'offer',l:'Made an offer',glyph:'offer'},{v:'rejected',l:'Passed',glyph:'rejected'},{v:'other',l:'Something else',icon:IC.chat}]},
   {id:'when',type:'pick',art:'quill',q:()=>'When did it arrive?',opts:()=>WHEN.map(([v,l])=>({v,l,icon:IC.calendar}))},
   {id:'note',type:'area',art:'writers',q:()=>'Anything to remember?',help:()=>'Optional. Their words, a deadline, what they liked.',ph:'e.g. Loved the opening, asked for the full by 30 Nov'},
 ],finish(d){
   const q=qOf(d); if(!q.id) return {};
   const w={preq:'Partial requested',freq:'Full requested',rr:'Revise & resubmit',offer:'Offer',rejected:`${first(q.name)} passed`,other:'Reply noted'}[d.what];
   if(d.what!=='other'){q.st=d.what; q.quiet=0; q.tl.push([d.what,w,'29 Oct',[]]);}
   if(['preq','freq','rr','offer'].includes(d.what)){q.mv=1;q.next=d.what==='preq'?'Send the partial':d.what==='freq'?'Send the full':d.what==='rr'?'Revise and resubmit':'Decide on the offer';
     return {cele:{art:d.what==='offer'?'story':'offGround',t:d.what==='offer'?`${first(q.name)} made an offer!`:d.what==='freq'?`${first(q.name)} wants the full!`:d.what==='preq'?`${first(q.name)} wants to read more!`:`${first(q.name)} wants a revision`,
       p:d.what==='freq'?`That’s your ${ordinal(QUERIES.filter(x=>x.tl.some(s=>s[0]==='freq')).length)} full request. We’ve added “Send the full” to your list.`:'We’ve added your next step to your list.',id:q.id}};}
   if(d.what==='rejected'){q.closed='Passed on 29 Oct';return {toast:{art:'wallHawk',b:'Added to your Wall of no.',t:'Every writer collects them on the way to a yes.',undo:1}};}
   return {toast:{art:'quill',b:'Noted.',t:`It’s on ${first(q.name)}’s timeline.`}};
 }},
 agent:{done:'Add agent',steps:[
   {id:'name',type:'text',art:'archivistLook',q:()=>'Who’s the agent?',ph:'Their full name'},
   {id:'agency',type:'text',art:'archivistLook',q:d=>`Where does ${first(d.name||'they')} work?`,ph:'Agency name'},
   {id:'how',type:'grid',art:'discHawk',q:()=>'How do they take submissions?',opts:()=>[{v:'email',l:'By email',icon:IC.mail},{v:'form',l:'Online form',icon:IC.globe},{v:'closed',l:'Closed right now',icon:IC.clock},{v:'unsure',l:'Not sure yet',icon:IC.help}]},
   {id:'looking',type:'multi',art:'binoculars',q:()=>'What are they looking for?',help:()=>'Pick all that apply.',opts:()=>['Literary fiction','Book club','Upmarket','Historical','Crime','Debut voices'].map(x=>({v:x,l:x}))},
 ],finish(d){AGENTS_EXTRA.push({id:'a'+Date.now(),name:d.name||'New agent',agency:d.agency||'',looking:(d.looking||[]).join(', ')||'To add',how:'To add',reply:'To add'});return {toast:{art:'archivistLook',b:`${first(d.name||'They')}’s on your list.`,t:'Find them under Agents, ready to query.',undo:1}};}},
 task:{done:'Add task',steps:[
   {id:'t',type:'text',art:'mentor',q:()=>'What do you need to do?',ph:'e.g. Research five more agents'},
   {id:'when',type:'pick',art:'mentor',q:()=>'When?',opts:()=>[['today','Today'],['tomorrow','Tomorrow'],['weekend','This weekend'],['next','Next week'],['none','No date']].map(([v,l])=>({v,l,icon:IC.calendar}))},
 ],finish(d){TASKS.splice(4,0,{id:'t'+Date.now(),grp:d.when==='today'?'today':d.when==='none'?'house':'soon',kind:'own',t:d.t||'New task',s:'Your task'});return {toast:{art:'mentor',b:'Added to your list.',undo:1}};}},
 note:{done:'Pin it',steps:[{id:'t',type:'area',art:'quill',q:()=>'What do you want to remember?',ph:'Write anything'}],
   finish(d){NOTES.unshift({c:'var(--st-sand)',t:d.t||'New note',d:'29 Oct',r:-1});S.todoSeg='cork';return {toast:{art:'quill',b:'Pinned to your corkboard.'}};}},
 next:{done:'Mark as sent',steps:[
   {id:'what',type:'pick',art:'inkwell',q:d=>`What did you send ${first(qOf(d).name)}?`,help:d=>`${first(qOf(d).name)} asked for ${qOf(d).st==='freq'?'the full manuscript':'more pages'}.`,
     opts:d=>(qOf(d).st==='freq'?[['full','Full manuscript'],['fullsyn','Full manuscript and synopsis']]:[['p3','First 3 chapters'],['p50','First 50 pages']]).map(([v,l])=>({v,l,icon:IC.book}))},
   {id:'when',type:'pick',art:'quill',q:()=>'When did it go?',opts:()=>WHEN.map(([v,l])=>({v,l,icon:IC.calendar}))},
 ],finish(d){const q=qOf(d);const full=q.st==='freq';q.st=full?'fsent':'psent';q.mv=0;q.next='Nudge from 24 Dec';q.tl.push([q.st,full?'Full sent':'Partial sent','29 Oct',[full?'Full manuscript':'First 3 chapters']]);
   const i=TASKS.findIndex(t=>t.q===q.id&&t.kind==='send');if(i>-1)TASKS.splice(i,1);
   return {toast:{art:'courier',b:'Sent. Over to '+first(q.name)+'.',t:'We’ll remind you to nudge in 8 weeks.',undo:1}};}},
 nudge:{done:'Save',steps:[
   {id:'when',type:'pick',art:'mentor',q:d=>`When did you nudge ${first(qOf(d).name)}?`,opts:()=>WHEN.map(([v,l])=>({v,l,icon:IC.calendar}))},
   {id:'again',type:'pick',art:'hourglass',q:()=>'Remind you again in…',opts:()=>[['2','2 weeks'],['4','4 weeks'],['no','Don’t remind me']].map(([v,l])=>({v,l,icon:IC.bell}))},
 ],finish(d){const q=qOf(d);q.quiet=0;q.tl.push(['nudge',`You nudged ${first(q.name)}`,'29 Oct',d.again==='no'?[]:[`Reminder in ${d.again} weeks`]]);q.next=d.again==='no'?'Waiting':'Reply expected by '+(d.again==='2'?'12 Nov':'26 Nov');
   const i=TASKS.findIndex(t=>t.q===q.id&&t.kind==='nudge');if(i>-1)TASKS.splice(i,1);
   return {toast:{art:'mentor',b:'Nudge logged.',t:d.again==='no'?'':'We’ll check back in '+d.again+' weeks.',undo:1}};}},
 closeq:{done:'Close query',steps:[
   {id:'why',type:'pick',art:'hourglass',q:d=>`Why are you closing ${first(qOf(d).name)}’s query?`,help:()=>'Closed queries stay in your records and analytics.',opts:()=>[{v:'noresp',l:'No reply in their window',glyph:'noresp'},{v:'rejected',l:'They passed',glyph:'rejected'},{v:'withdrawn',l:'I withdrew it',glyph:'withdrawn'}]},
 ],finish(d){const q=qOf(d);q.st=d.why;q.quiet=0;q.mv=0;q.closed={noresp:'Closed, no response, 29 Oct',rejected:'Passed on 29 Oct',withdrawn:'Withdrawn on 29 Oct'}[d.why];q.tl.push([d.why,{noresp:'You closed it',rejected:`${first(q.name)} passed`,withdrawn:'You withdrew it'}[d.why],'29 Oct',[]]);
   const i=TASKS.findIndex(t=>t.q===q.id);if(i>-1)TASKS.splice(i,1);
   return {toast:{art:'wallHawk',b:'Query closed.',t:d.why==='withdrawn'?'It stays in your records.':'It’s on your Wall of no.',undo:1}};}},
};
const ordinal=n=>n+(['th','st','nd','rd'][(n%100-20)%10]||['th','st','nd','rd'][n%100]||'th');
function flowSteps(o){return FLOWS[o.f].steps.filter(s=>!(s.skip&&s.skip(o.d)));}
function ovFlow(o){
  const st=flowSteps(o), s=st[o.i], last=o.i===st.length-1, d=o.d;
  const pct=Math.round((o.i+1)/st.length*100);
  let body='';
  const optHtml=(op,multi)=>{const on=multi?(d[s.id]||[]).includes(op.v):d[s.id]===op.v;
    const lead=op.av?`<span class="av" style="width:36px;height:36px;font-size:12.5px">${ini(op.av)}</span>`:op.glyph?disc(op.glyph,36):op.icon?`<span class="av" style="width:36px;height:36px;background:var(--page);box-shadow:none">${op.icon.replace('<svg','<svg style="width:19px;height:19px"')}</span>`:'';
    return `<button class="opt" data-act="${multi?'fmulti':'fpick'}" data-v="${esc(op.v)}" aria-pressed="${on}">${lead}<span class="lt">${esc(op.l)}${op.s?`<small>${esc(op.s)}</small>`:''}</span>${multi||!s.type.startsWith('grid')?`<span class="tk">${on?IC.check:''}</span>`:''}</button>`;};
  if(s.type==='pick') body=`<div class="opts">${s.opts(d).map(o=>optHtml(o)).join('')}</div>`;
  if(s.type==='grid') body=`<div class="opts two">${s.opts(d).map(o=>optHtml(o)).join('')}</div>`;
  if(s.type==='multi') body=`<div class="opts">${s.opts(d).map(o=>optHtml(o,1)).join('')}</div>`;
  if(s.type==='text') body=`<input class="field" id="ftext" value="${esc(d[s.id]||'')}" placeholder="${esc(s.ph||'')}" autocomplete="off">`;
  if(s.type==='area') body=`<textarea class="field" id="ftext" placeholder="${esc(s.ph||'')}">${esc(d[s.id]||'')}</textarea>`;
  if(s.type==='review') body=`<div class="review">${s.rows(d).map(([k,v])=>`<div class="rv"><span>${k}</span><span>${esc(v||'')}</span></div>`).join('')}</div>`;
  const needsBtn=['multi','text','area','review'].includes(s.type);
  const ok=s.type==='multi'?(d[s.id]||[]).length>0:s.type==='text'?!!(d[s.id]||'').trim():true;
  const label=last?FLOWS[o.f].done:(s.type==='area'&&!(d[s.id]||'').trim()?'Skip':'Continue');
  return `<div class="flow" data-flow>
    <div class="top">${o.i>0?`<button class="ib plain" data-act="fback" aria-label="Back">${IC.back}</button>`:`<span style="width:40px"></span>`}<div class="prog" role="progressbar" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div><button class="ib plain" data-act="dismiss" aria-label="Close">${IC.close}</button></div>
    <div class="q ${o.dir||''}">${s.art?`<div class="art">${img(s.art)}</div>`:'<div style="height:12px"></div>'}<h2>${esc(s.q(d))}</h2>${s.help?`<p class="help">${esc(s.help(d))}</p>`:'<div style="height:10px"></div>'}${body}</div>
    ${needsBtn||last&&s.type!=='pick'&&s.type!=='grid'?`<div class="bottom"><button class="btn pri blk" data-act="fnext" id="fnext" ${ok?'':'disabled'}>${label}</button></div>`:''}
  </div>`;
}
function ovCele(o){
  const cols=['#2a3a52','#f3d2cc','#f7efe3','#d7e0e8','#e3a79b'];
  const conf=Array.from({length:34},(_,i)=>`<i style="left:${(i*37)%100}%;background:${cols[i%5]};animation-delay:${(i%9)*.12}s;animation-duration:${2.2+(i%5)*.3}s"></i>`).join('');
  return `<div class="cele"><div class="conf">${conf}</div>${img(o.art)}<h2>${esc(o.t)}</h2><p>${esc(o.p)}</p>
    <button class="btn pri blk" data-act="query" data-id="${o.id}" style="max-width:320px">See your next step</button><button class="btn blk" data-act="dismiss" style="max-width:320px;margin-top:6px">Done</button></div>`;
}
function toastHtml(t){
  return `<div class="toast ${S.overlay?'low':''}" role="status"><span class="hk">${img(t.art)}</span><span class="tx"><b>${esc(t.b)}</b>${t.t?esc(t.t):''}</span>${t.undo?'<button data-act="undo">Undo</button>':''}</div>`;
}
