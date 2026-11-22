// ---------- build ----------
function screenHtml(){
  if(S.stack.length){const p=S.stack[S.stack.length-1];return `<div class="screen" data-scr="p-${p}">${PAGES[p]()}</div>`;}
  return {home:screenHome2,queries:screenQueries2,todo:screenTodo2,agents:screenAgents2}[S.tab]();
}
function overlayHtml(){
  const o=S.overlay; if(!o) return '';
  switch(o.k){
    case 'action':return ovAction();
    case 'query':return ovQuery(o);
    case 'agent':return ovAgent(o);
    case 'menu':return ovMenu();
    case 'ms':return ovMs();
    case 'birds':return ovBirds();
    case 'feedback':return ovFeedback(o);
    case 'search':return ovSearch(o);
    case 'flow':return ovFlow(o);
    case 'cele':return ovCele(o);
  }
  return '';
}
const SBAR=`<div class="sbar"><span>9:41</span><span class="r"><svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg><span class="bat"></span></span></div>`;
function buildApp(scroll=0){
  return `<div class="app ${isNavy()?'navytop':''} acc-${ACC}">${SBAR}<div class="scroller"><div ${scroll?`style="transform:translateY(-${scroll}px)"`:''}>${screenHtml()}</div></div><nav class="tabbar ${S.stack.length||S.away?'away':''}" style="${S.overlay&&S.overlay.k==='action'?'z-index:33':''}">${tabbar()}</nav><div data-ov>${overlayHtml()}</div><div data-tst>${S.toast?toastHtml(S.toast):''}</div></div>`;
}

// ---------- live phone ----------
let A, SC, TB, OV, TS, toastTimer, lastY=0, scrollMem={};
function mount(){
  const host=document.getElementById('phone');
  host.innerHTML=buildApp();
  A=host.querySelector('.app'); SC=A.querySelector('.scroller'); TB=A.querySelector('.tabbar'); OV=A.querySelector('[data-ov]'); TS=A.querySelector('[data-tst]');
  if(matchMedia('(max-width:520px)').matches) A.classList.add('bleed');
  SC.addEventListener('scroll',onScroll,{passive:true});
  A.addEventListener('click',onClick);
  A.addEventListener('input',onInput);
  A.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='ftext'&&e.target.tagName==='INPUT'){const b=A.querySelector('#fnext');if(b&&!b.disabled)b.click();} if(e.key==='Escape'&&S.overlay){closeOverlay();} const t=e.target.closest('[role="button"][data-act]');if(t&&(e.key==='Enter'||e.key===' ')){e.preventDefault();t.click();}});
  bindSwipe(); bindSheetDrag();
}
const key=()=>S.stack.length?'p-'+S.stack.join('/'):S.tab;
function paintScreen(anim=''){
  scrollMem[curKey]=SC.scrollTop;
  SC.innerHTML=`<div>${screenHtml()}</div>`;
  curKey=key();
  const scr=SC.querySelector('.screen'); if(anim&&scr) scr.classList.add(anim);
  SC.scrollTop=anim?0:(scrollMem[curKey]||0);
  if(anim==='enter-back') SC.scrollTop=scrollMem[curKey]||0;
  S.away=false; paintTab(); onScroll();
}
let curKey='home';
function paintTab(){A.classList.toggle('navytop',isNavy());TB.innerHTML=tabbar();TB.classList.toggle('away',!!(S.stack.length||S.away));TB.style.zIndex=S.overlay&&S.overlay.k==='action'?33:'';}
function paintOverlay(){OV.innerHTML=overlayHtml();paintTab();
  const f=OV.querySelector('#ftext'); if(f&&!('ontouchstart' in window)) setTimeout(()=>f.focus({preventScroll:true}),350);
  const sq=OV.querySelector('#sq'); if(sq){sq.focus();sq.setSelectionRange(sq.value.length,sq.value.length);}
}
function repaint(){paintScreen();paintOverlay();}
function toast(t){S.toast=t;TS.innerHTML=toastHtml(t);clearTimeout(toastTimer);toastTimer=setTimeout(()=>{S.toast=null;TS.innerHTML='';},4200);}
function onScroll(){
  const y=SC.scrollTop; const hd=SC.querySelector('[data-hd]'); if(hd) hd.classList.toggle('stuck',y>6);
  if(!S.stack.length&&!S.overlay){ if(y>lastY+6&&y>90){S.away=true;TB.classList.add('away');} else if(y<lastY-6||y<40){S.away=false;TB.classList.remove('away');} }
  lastY=y;
}
function closeOverlay(){
  const sh=OV.querySelector('[data-sheet]'),fl=OV.querySelector('.flow,.cele');
  if(sh){sh.style.transition='transform .28s cubic-bezier(.4,0,1,1)';sh.style.transform='translateY(100%)';const sc=OV.querySelector('.scrim');if(sc){sc.style.transition='opacity .28s';sc.style.opacity=0;}}
  if(fl){fl.style.transition='transform .28s cubic-bezier(.4,0,1,1),opacity .28s';fl.style.transform='translateY(8%)';fl.style.opacity=0;}
  const was=S.overlay; S.overlay=null;
  setTimeout(()=>{if(!S.overlay){OV.innerHTML='';paintTab();}},sh||fl?260:0);
  if(was&&(was.k==='flow'||was.k==='cele')) paintScreen();
}
function openOverlay(o){S.overlay=o;paintOverlay();}

// ---------- undo ----------
let snap=null;
const takeSnap=()=>{snap=JSON.stringify({Q:QUERIES,T:TASKS,N:NOTES,X:AGENTS_EXTRA});};
function undo(){if(!snap)return;const s=JSON.parse(snap);QUERIES=s.Q;TASKS.splice(0,TASKS.length,...s.T);NOTES.splice(0,NOTES.length,...s.N);AGENTS_EXTRA.splice(0,AGENTS_EXTRA.length,...s.X);snap=null;S.toast=null;TS.innerHTML='';paintScreen();if(S.overlay)paintOverlay();toast({art:'logo',b:'Undone.'});}

// ---------- flows ----------
function flow(f,preset={}){S.overlay={k:'flow',f,i:0,d:preset,dir:'in'};paintOverlay();}
function flowNext(){
  const o=S.overlay, st=flowSteps(o);
  if(o.i>=st.length-1){
    takeSnap();
    const r=FLOWS[o.f].finish(o.d)||{};
    if(r.cele){S.overlay=Object.assign({k:'cele'},r.cele);paintOverlay();paintScreen();return;}
    closeOverlay(); if(r.toast) setTimeout(()=>toast(r.toast),200);
    return;
  }
  if(o.ret){o.ret=0;o.i=st.length-1;}else o.i++; o.dir='in'; paintOverlay();
}

// ---------- clicks ----------
let suppress=false;
function onClick(e){
  if(suppress){e.preventDefault();e.stopPropagation();return;}
  const el=e.target.closest('[data-act]'); if(!el){closeSwipes();return;}
  const a=el.dataset.act, v=el.dataset.v, id=el.dataset.id;
  if(openSw&&!el.closest('.acts')&&a!=='dismiss'){const was=openSw;closeSwipes();if(was.contains(el))return;}
  switch(a){
    case 'tab': if(S.overlay) {S.overlay=null;OV.innerHTML='';} S.stack=[]; if(S.tab===v&&!S.stack.length){SC.scrollTo({top:0,behavior:'smooth'});} S.tab=v; paintScreen(); break;
    case 'plus': if(S.overlay&&S.overlay.k==='action'){closeOverlay();} else openOverlay({k:'action'}); break;
    case 'filter': if(S.tab!=='queries'){S.tab='queries';S.stack=[];} S.filter=(S.filter===v&&v!=='all')?'all':v; S.overlay=null; OV.innerHTML=''; paintScreen(); break;
    case 'agfilter': S.agFilter=v; paintScreen(); break;
    case 'todoseg': S.todoSeg=v; paintScreen(); break;
    case 'mseg': S.mseg=v; paintScreen(); break;
    case 'query': if(S.overlay&&S.overlay.k==='cele'){S.overlay=null;} openOverlay({k:'query',id,tab:'track'}); break;
    case 'qtab': S.overlay.tab=v; S.overlay.more=0; paintOverlay(); break;
    case 'qmore': S.overlay.more=!S.overlay.more; paintOverlay(); break;
    case 'agent': openOverlay({k:'agent',id}); break;
    case 'menu': openOverlay({k:'menu'}); break;
    case 'ms': openOverlay({k:'ms'}); break;
    case 'birds': openOverlay({k:'birds'}); break;
    case 'feedback': openOverlay({k:'feedback',v}); break;
    case 'fbkind': S.overlay.v=v; {const tx=(OV.querySelector('#fbtext')||{}).value||'';paintOverlay();const t=OV.querySelector('#fbtext');if(t)t.value=tx;} break;
    case 'fbsend': closeOverlay(); setTimeout(()=>toast({art:'feedback',b:'Thank you. We’ve got it.',t:'It counts towards your next rank.'}),200); break;
    case 'search': openOverlay({k:'search',q:''}); break;
    case 'searchfill': S.overlay.q=v; paintOverlay(); break;
    case 'dismiss': closeOverlay(); break;
    case 'back': S.stack.pop(); paintScreen('enter-back'); break;
    case 'page': {let p=v; if(p==='materials'||p==='comps'){S.mseg=p;p='manuscript';} else if(p==='manuscript'&&el.dataset.seg){S.mseg=el.dataset.seg;} else if(p==='manuscript'&&S.stack[S.stack.length-1]!=='manuscript'){S.mseg='overview';}
      if(S.overlay){S.overlay=null;OV.innerHTML='';}
      if(S.stack[S.stack.length-1]===p){paintScreen();break;} S.stack.push(p); paintScreen('enter'); break;}
    case 'flow': {const pre={}; if(id&&v==='respond'){pre.q=id;pre.qPreset=1;} if(el.dataset.agent){pre.agent=el.dataset.agent;pre.agentPreset=1;} flow(v,pre); break;}
    case 'next': flow('next',{q:id}); break;
    case 'nudge': flow('nudge',{q:id}); break;
    case 'closeq': flow('closeq',{q:id}); break;
    case 'edit': closeOverlay(); setTimeout(()=>toast({art:'quill',b:'Editing opens the same questions,',t:'with your answers filled in.'}),200); break;
    case 'task': {const t=TASKS.find(x=>x.id===id); if(!t)break; if(t.kind==='send')flow('next',{q:t.q}); else if(t.kind==='nudge')flow('nudge',{q:t.q}); else if(t.kind==='close')flow('closeq',{q:t.q}); else if(t.kind==='tidy')openOverlay({k:'query',id:t.q,tab:'agent'}); else {takeSnap();TASKS.splice(TASKS.indexOf(t),1);paintScreen();toast({art:'mentor',b:'Done.',t:'One less thing.',undo:1});} break;}
    case 'later': {takeSnap();const t=TASKS.find(x=>x.id===id);if(t){t.grp='soon';t.s='Tomorrow · '+t.s.replace(/^[^·]*· /,'');}closeSwipes(true);paintScreen();toast({art:'hourglass',b:'Moved to tomorrow.',undo:1});break;}
    case 'fpick': {const o=S.overlay,s=flowSteps(o)[o.i];o.d[s.id]=v;A.querySelectorAll('[data-act="fpick"]').forEach(b=>{const on=b.dataset.v===v;b.setAttribute('aria-pressed',on);const tk=b.querySelector('.tk,.tk2');if(tk)tk.innerHTML=on?IC.check:'';});setTimeout(()=>{if(S.overlay===o)flowNext();},230);break;}
    case 'fmulti': {const o=S.overlay,s=flowSteps(o)[o.i];const arr=o.d[s.id]=o.d[s.id]||[];const i=arr.indexOf(v);i>-1?arr.splice(i,1):arr.push(v);el.setAttribute('aria-pressed',i<0);{const tk=el.querySelector('.tk,.tk2');if(tk)tk.innerHTML=i<0?IC.check:'';}A.querySelector('#fnext').disabled=!arr.length;break;}
    case 'fnext': flowNext(); break;
    case 'fback': S.overlay.i--; S.overlay.dir='back'; paintOverlay(); break;
    case 'undo': undo(); break;
    case 'agseg': S.agSeg=v; paintScreen(); break;
    case 'fjump': {const o=S.overlay,st=flowSteps(o);o.ret=st[st.length-1].type==='review'&&o.i===st.length-1;o.i=+v;o.dir='back';paintOverlay();break;}
    case 'hero': if(el.dataset.m)HS.m=el.dataset.m; if(el.dataset.r)HS.r=el.dataset.r; paintScreen(); break;
    case 'sw': el.setAttribute('aria-checked',el.getAttribute('aria-checked')!=='true'); break;
    case 'share': toast({art:'wallHawk',b:'Your wall is ready to share.',t:'Your saved image hides agent names.'}); break;
    case 'toast': toast({saved:{art:'binoculars',b:'Added to your agents.',t:'Find them under Agents, ready to query.',undo:0},pkg:{art:'boxes',b:'New packages are built one question at a time,',t:'like logging a query.'},comp:{art:'compsArchivist',b:'Comps are added one question at a time.'}}[v]); break;
  }
}
function onInput(e){
  const t=e.target;
  if(t.id==='ftext'&&S.overlay&&S.overlay.k==='flow'){const o=S.overlay,s=flowSteps(o)[o.i];o.d[s.id]=t.value;const b=A.querySelector('#fnext');if(b){if(s.type==='text')b.disabled=!t.value.trim();if(s.type==='area'&&o.i<flowSteps(o).length-1)b.textContent=t.value.trim()?'Continue':'Skip';}}
  if(t.id==='sq'){S.overlay.q=t.value;const r=document.createElement('div');r.innerHTML=ovSearch(S.overlay);A.querySelector('#sres').innerHTML=r.querySelector('#sres').innerHTML;}
  if(t.id==='fbtext'){}
}

// ---------- swipe rows ----------
let sw=null, openSw=null;
function closeSwipes(instant){if(openSw){const r=openSw.children[1];if(instant)r.classList.add('drag');r.style.transform='';if(instant)requestAnimationFrame(()=>r.classList.remove('drag'));openSw=null;}}
function bindSwipe(){
  SC.addEventListener('pointerdown',e=>{const w=e.target.closest('[data-swipe]');if(!w||e.target.closest('.acts'))return;const el=w.children[1];const m=/translateX\((-?\d+)/.exec(el.style.transform||'');sw={w,el,x0:e.clientX,y0:e.clientY,base:m?+m[1]:0,lock:null,id:e.pointerId,x:0};});
  SC.addEventListener('pointermove',e=>{if(!sw)return;const dx=e.clientX-sw.x0,dy=e.clientY-sw.y0;
    if(sw.lock===null){if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){sw.lock=1;sw.el.classList.add('drag');try{sw.el.setPointerCapture(sw.id)}catch(_){} if(openSw&&openSw!==sw.w)closeSwipes();}else if(Math.abs(dy)>8){sw=null;return;}}
    if(sw.lock){let x=sw.base+dx;if(sw.w.dataset.one==='r'&&x>0)x=0;if(Math.abs(x)>96)x=Math.sign(x)*(96+(Math.abs(x)-96)*.3);sw.x=x;sw.el.style.transform=`translateX(${x}px)`;}});
  const end=()=>{if(!sw)return;if(sw.lock){sw.el.classList.remove('drag');const x=sw.x;const to=x>48?96:x<-48?-96:0;sw.el.style.transform=to?`translateX(${to}px)`:'';openSw=to?sw.w:null;suppress=true;setTimeout(()=>suppress=false,60);}sw=null;};
  SC.addEventListener('pointerup',end);SC.addEventListener('pointercancel',end);
}
// ---------- sheet drag (detents) ----------
function bindSheetDrag(){
  let d=null;
  OV.addEventListener('pointerdown',e=>{const g=e.target.closest('[data-grab],.qband');if(!g)return;const sh=g.closest('[data-sheet]');if(!sh)return;d={sh,y0:e.clientY,h0:sh.offsetHeight,id:e.pointerId,h:sh.offsetHeight};sh.classList.add('drag');try{g.setPointerCapture(e.pointerId)}catch(_){}});
  OV.addEventListener('pointermove',e=>{if(!d)return;const H=A.clientHeight;let h=d.h0-(e.clientY-d.y0);h=Math.min(H-40,Math.max(120,h));d.h=h;d.sh.style.height=h+'px';});
  const end=()=>{if(!d)return;const H=A.clientHeight;d.sh.classList.remove('drag');const h=d.h;
    if(Math.abs(h-d.h0)<4){d=null;return;}
    if(h<d.h0-40&&h<H*.42){d=null;closeOverlay();return;}
    const stops=[H*.64,H-56];const to=stops.reduce((a,b)=>Math.abs(b-h)<Math.abs(a-h)?b:a);d.sh.style.height=to+'px';if(S.overlay)S.overlay.h=to+'px';d=null;};
  OV.addEventListener('pointerup',end);OV.addEventListener('pointercancel',end);
}

// ---------- gallery ----------
const G=[
 ['The main tabs'],
 ['Home','The navy band holds the hero. Switch Active, Sent, Replies or Requests, and 1M, 3M or All. Then where your queries stand, Up next, the latest replies and the founding card.',{tab:'home'}],
 ['Home, hero switched','The same chart showing replies since you started.',{tab:'home',hero:['replies','All']}],
 ['Home, scrolled','The floating tab bar tucks away as you read, and comes back the moment you scroll up.',{tab:'home',away:true},620],
 ['Queries','The band carries the counts, which stay fixed while the chips filter. Grouped by whose move it is.',{tab:'queries'}],
 ['Queries, filtered','One tap on a chip. The same chips are where the Home cards land you.',{tab:'queries',filter:'agent'}],
 ['Swipe a query','Swipe right for the relevant action (nudge, or the next step). Swipe left to close. Both open a focused flow, never a one-tap change.',{tab:'queries',demoSwipe:'q5'}],
 ['To-do','Today’s date and the counts sit in the band. Ticking a task opens the right flow; it never writes on its own.',{tab:'todo'}],
 ['Corkboard','Your notes, under To-do, as on desktop.',{tab:'todo',todoSeg:'cork'}],
 ['Agents','The Scout leads, then who you still want to query, then who you have.',{tab:'agents'}],
 ['Sheets and details'],
 ['Query, half sheet','Tap a row: the landing-page query card pulls up over the list. Drag up for the whole story, down to put it away.',{tab:'queries',overlay:{k:'query',id:'q1',tab:'track'}}],
 ['Query, full sheet','Your next step stays pinned at the bottom, whatever tab you’re on.',{tab:'queries',overlay:{k:'query',id:'q1',tab:'track',h:'770px'}}],
 ['Query, waiting on the agent','When it’s with the agent, the foot says what you’re waiting for.',{tab:'queries',overlay:{k:'query',id:'q3',tab:'track'}}],
 ['Query, more actions','Record a response, log a nudge, edit or close, from the ••• button.',{tab:'queries',overlay:{k:'query',id:'q4',tab:'mat',more:1}}],
 ['Agent sheet','Who they are, what they want and how to submit, with Log a query at your thumb.',{tab:'agents',overlay:{k:'agent',id:'a1'}}],
 ['Birds-eye view','From the eye icon on Queries. How far each query has come towards its next step.',{tab:'queries',overlay:{k:'birds'}}],
 ['Search','Tap the search bar on any tab. Queries, agents and notes in one place.',{tab:'home',overlay:{k:'search',q:'har'}}],
 ['Logging and replies'],
 ['The + button','Thumb-reach action sheet. The + turns into a close button.',{tab:'home',overlay:{k:'action'}}],
 ['Log a query: who','One question per screen. Picking an answer moves you on.',{tab:'home',overlay:{k:'flow',f:'log',i:0,d:{}}}],
 ['Log a query: what you sent','Uses the agent’s own guidelines as the hint.',{tab:'home',overlay:{k:'flow',f:'log',i:1,d:{agent:'a1'}}}],
 ['Log a query: how','Two-up choices where the answers are short.',{tab:'home',overlay:{k:'flow',f:'log',i:3,d:{agent:'a1',sent:'std',when:'today'}}}],
 ['Log a query: check','Everything on one card before it’s saved.',{tab:'home',overlay:{k:'flow',f:'log',i:5,d:{agent:'a1',sent:'std',when:'today',how:'email',reply:'8'}}}],
 ['Logged','The hawk reacts, with Undo.',{tab:'queries',toast:{art:'courier',b:'Logged. That’s 17 queries out.',t:'We’ll keep an eye on Hannah’s reply window.',undo:1}}],
 ['An agent replied','Pick what they said. Requests and offers get a moment; passes stay gentle.',{tab:'home',overlay:{k:'flow',f:'respond',i:0,d:{q:'q3',qPreset:1}}}],
 ['A full request','A big moment gets a big screen.',{tab:'home',overlay:{k:'cele',art:'offGround',t:'Marcus wants the full!',p:'That’s your 3rd full request. We’ve added “Send the full” to your list.',id:'q3'}}],
 ['Mark sent','Opened from Your next step, a swipe or a task. Two questions.',{tab:'todo',overlay:{k:'flow',f:'next',i:0,d:{q:'q1'}}}],
 ['Close a query','Why, in one tap. It stays in your records.',{tab:'queries',overlay:{k:'flow',f:'closeq',i:0,d:{q:'q9'}}}],
 ['Everything else'],
 ['Menu','Tap your initials, top right. Everything that isn’t a tab lives here, grouped.',{tab:'home',overlay:{k:'menu'}}],
 ['Manuscript switcher','Tap the book name in the band on any tab.',{tab:'home',overlay:{k:'ms'}}],
 ['Responses and the Wall of no','Requests to swipe through, then the wall: light stats, a share button.',{stack:['responses']}],
 ['Analytics','Big number, small unit, compared with your own past. Medians, not averages.',{stack:['analytics']}],
 ['Streaks and goals','Weekly goal, milestones and the founding ranks.',{stack:['goals']}],
 ['Manuscript','The book as a navy card, then Overview, Materials, Versions and Comps.',{stack:['manuscript']}],
 ['Materials and packages','Each package card with its result card overlaid.',{stack:['manuscript'],mseg:'materials'}],
 ['Comps','Comparable titles, with how many queries used each one.',{stack:['manuscript'],mseg:'comps'}],
 ['Discover','The Scout’s verified agents, one card each.',{stack:['discover']}],
 ['Import','Smart import, the template, or one by hand.',{stack:['import']}],
 ['Settings','The seven desktop sections, grouped.',{stack:['settings']}],
 ['Notifications','One example section opened.',{stack:['settings','notifications']}],
 ['Plan and billing','',{stack:['plan']}],
 ['Help centre','Getting started progress, then the guides.',{stack:['help']}],
 ['Feedback','The speech bubble in every header. Pick a kind, then write.',{tab:'home',overlay:{k:'feedback',v:'idea'}}],
 ['A brand-new account'],
 ['Home, empty','Never blank: the three ways in, then getting-started steps.',{tab:'home',empty:true}],
 ['Queries, empty','What a query card will hold, with example rows.',{tab:'queries',empty:true}],
];
function renderGallery(){
  const save=S; let h='';
  G.forEach((g,i)=>{
    if(g.length===1){h+=`<div class="ghd">${g[0]}</div>`;return;}
    S=Object.assign(S0(),g[2]);const hs0=[HS.m,HS.r];if(S.hero){HS.m=S.hero[0];HS.r=S.hero[1];}
    let html=buildApp(g[3]||0);
    if(S.demoSwipe) html=html.replace(`data-act="query" data-id="${S.demoSwipe}">`,`data-act="query" data-id="${S.demoSwipe}" style="transform:translateX(96px)">`);
    HS.m=hs0[0];HS.r=hs0[1];h+=`<div class="gcell"><div class="gframe"><div class="scale">${html}</div></div><div class="gcap"><b>${g[0]}</b>${g[1]?`<span>${g[1]}</span>`:''}<button data-try="${i}">Try it in the prototype</button></div></div>`;
  });
  S=save;
  document.getElementById('gallery').innerHTML=h;
}

// ---------- page chrome ----------
function setView(v){
  document.querySelectorAll('.views button').forEach(b=>b.setAttribute('aria-pressed',b.dataset.view===v));
  document.querySelectorAll('[data-view-panel]').forEach(p=>p.hidden=p.dataset.viewPanel!==v);
  if(v==='screens'&&!document.getElementById('gallery').innerHTML) renderGallery();
  try{localStorage.setItem('qh-proto-view',v)}catch(_){}
  window.scrollTo(0,0);
}
document.querySelector('.views').addEventListener('click',e=>{const b=e.target.closest('button');if(b)setView(b.dataset.view);});
document.getElementById('gallery').addEventListener('click',e=>{const b=e.target.closest('[data-try]');if(!b)return;const g=G[+b.dataset.try];S=Object.assign(S0(),g[2]);if(S.hero){HS.m=S.hero[0];HS.r=S.hero[1];}delete S.demoSwipe;S.away=false;setView('proto');paintScreen();paintOverlay();if(S.toast)toast(S.toast);});
document.getElementById('emptyToggle').addEventListener('change',e=>{S.empty=e.target.checked;S.stack=[];S.overlay=null;OV.innerHTML='';paintScreen();});
document.getElementById('resetBtn').addEventListener('click',()=>location.reload());
mount();
let v0='proto';try{v0=localStorage.getItem('qh-proto-view')||'proto'}catch(_){}
setView(v0);
