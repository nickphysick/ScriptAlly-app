// Round 3: Smart querying on a phone. Loaded after boot2.js.
(function(){
const P=new URLSearchParams(location.hash.slice(1));
const opts=(P.get('opt')||'').split(',');
const has=o=>opts.includes(o);
const HB='#1d4b63', BERRY='#9b4a57', MPINK='#f7e3e3';
const css=`
.group.fl{height:auto;background:#fff;margin-top:0;flex:none}
:root{--hb:${HB};--berry:${BERRY};--mpink:${MPINK}}
/* navy everywhere, each tab its own hero */
.pipe.nv i{background:rgba(255,255,255,.16)} .pipe.nv i.hi{background:var(--pink)}
/* hub */
.apk{background:#fff;border-radius:18px;box-shadow:0 12px 30px rgba(0,0,0,.22);overflow:hidden;color:var(--ink);margin-top:18px}
.apk .ah{background:var(--hb);color:#fff;padding:10px 16px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:600}
.apk .ah b{font-family:var(--type);font-weight:400;font-size:20px;flex:1}
.apk .ab{padding:12px 16px 14px}
.apk .ap{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.pc{display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;border-radius:999px;font-size:13px;font-weight:600;background:var(--fill);color:var(--ink)}
.pc.l{background:var(--mpink)} .pc.v{background:#e3ebf0;color:#1d3b4d}
.pc svg{width:14px;height:14px}
.shelf{display:flex;gap:10px;overflow-x:auto;margin:0 -16px;padding:2px 16px 10px;scrollbar-width:none;scroll-snap-type:x proximity}
.shelf::-webkit-scrollbar{display:none}
.sheetc{flex:none;width:148px;scroll-snap-align:start;background:#fff;border-radius:4px 14px 14px 14px;box-shadow:var(--sh);padding:12px 12px 11px;text-align:left;position:relative;display:flex;flex-direction:column;min-height:132px}
.sheetc::before{content:"";position:absolute;top:0;right:0;width:18px;height:18px;background:linear-gradient(225deg,var(--page) 50%,rgba(31,38,51,.08) 50%);border-radius:0 14px 0 4px}
.sheetc .k{font-size:12.5px;font-weight:600;color:var(--muted);display:flex;align-items:center;gap:6px}
.sheetc .k svg{width:14px;height:14px}
.sheetc b{display:block;font-size:15.5px;line-height:1.2;margin:8px 0 auto}
.sheetc .s{font-size:12.5px;color:var(--muted);margin-top:10px;line-height:1.3}
.sheetc .s em{font-style:normal;color:var(--ink);font-weight:600}
.sheetc.l{background:linear-gradient(var(--mpink) 0 34px,#fff 34px)}
.sheetc.inuse{box-shadow:0 0 0 2px var(--hb),var(--sh)}
.sheetc.add{background:transparent;box-shadow:inset 0 0 0 1.5px #cdc5b8;align-items:center;justify-content:center;color:var(--muted);font-weight:600;gap:6px}
.sheetc.add::before{display:none}
.inuse-t{display:inline-block;background:var(--hb);color:#fff;font-size:11.5px;font-weight:600;border-radius:999px;padding:1px 7px;margin-left:4px}
.pkrow{display:flex;gap:12px;align-items:center;padding:12px 14px;width:100%;text-align:left}
.pkrow+.pkrow{border-top:1px solid var(--rule)}
.pkic{width:40px;height:40px;border-radius:12px;display:grid;place-items:center;color:#fff;flex:none}
.pkic svg{width:19px;height:19px}
.lc{font-size:12.5px;font-weight:600;border-radius:999px;padding:2px 9px;white-space:nowrap}
.lc.out{background:#e3ebf0;color:#1d3b4d}.lc.ready{background:var(--fill);color:var(--ink)}.lc.draft{background:transparent;box-shadow:inset 0 0 0 1px #cdc5b8;color:var(--muted)}
/* what's landing */
.land{display:flex;gap:12px;overflow-x:auto;margin:0 -16px;padding:4px 16px 14px;scrollbar-width:none;scroll-snap-type:x mandatory}
.land::-webkit-scrollbar{display:none}
.show{flex:none;width:78%;scroll-snap-align:center;position:relative;padding-top:60px}
.show .top{position:absolute;inset:0 0 auto 0;height:110px;border-radius:18px;padding:13px 16px;color:#fff;display:flex;gap:9px;align-items:flex-start;font-weight:600}
.show .top svg{width:19px;height:19px;flex:none}
.show .ov{position:relative;margin:0 12px;background:#fff;border-radius:16px;box-shadow:0 12px 26px rgba(31,38,51,.16);padding:14px 16px}
.show .ov .m{font-family:var(--type);font-size:21px;line-height:1.15}
.show .ov .c{font-size:13.5px;color:var(--muted);margin-top:5px}
.rank{position:absolute;right:16px;top:12px;font-family:var(--type);font-size:13px;opacity:.85}
.h2h{position:relative;height:330px;margin:6px 0 4px}
.h2h .card{position:absolute;width:62%;padding:0;overflow:hidden}
.h2h .hb{padding:8px 14px;font-size:13px;font-weight:600;display:flex;justify-content:space-between}
.h2h .hc{padding:14px}
.h2h .big{font-family:var(--type);font-size:30px;line-height:1}
.vs{position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:46px;height:46px;border-radius:50%;background:var(--navy);color:#fff;display:grid;place-items:center;font-family:var(--type);font-size:17px;z-index:3;box-shadow:0 6px 16px rgba(0,0,0,.25)}
.lg{display:grid;grid-template-columns:28px 1fr 64px;gap:4px 10px;align-items:center;padding:12px 14px}
.lg+.lg{border-top:1px solid var(--rule)}
.lg .n{font-family:var(--type);font-size:20px;color:var(--muted)}
.lg b{font-size:15px}.lg .sub{font-size:12.5px}
.lg .r{text-align:right;font-family:var(--type);font-size:20px}
.lg .bar-h{grid-column:2/4;height:6px}
/* package page */
.funnel{display:grid;gap:8px;margin-top:4px}
.funnel div{display:grid;grid-template-columns:80px 1fr 28px;gap:10px;align-items:center;font-size:14px}
.funnel i{display:block;height:22px;border-radius:6px;background:var(--hb)}
.funnel b{font-family:var(--type);font-weight:400;font-size:18px;text-align:right}
.lockn{display:flex;gap:12px;align-items:flex-start;background:#e3ebf0;border-radius:14px;padding:12px 14px;font-size:14px;line-height:1.4;color:#1d3b4d;margin:14px 0 6px}
.lockn svg{width:18px;height:18px;flex:none;margin-top:1px}
/* builder */
.steps4{display:flex;gap:6px;margin:16px 0 0}
.steps4 span{flex:1;height:34px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:5px;font-size:12.5px;font-weight:600;background:rgba(255,255,255,.12);color:rgba(255,255,255,.85)}
.steps4 span.ok{background:#fff;color:var(--ink)}
.steps4 svg{width:13px;height:13px}
.mail{background:#fff;border-radius:18px;box-shadow:var(--sh);overflow:hidden}
.mail .mh{padding:12px 16px;border-bottom:1px solid var(--rule);font-size:13.5px;line-height:1.6}
.mail .mh span{color:var(--muted);display:inline-block;width:58px}
.mslot{display:flex;gap:12px;align-items:center;padding:12px 16px;width:100%;text-align:left;border-bottom:1px solid var(--rule)}
.mslot .t{flex:1;min-width:0}.mslot b{display:block;font-size:15px}.mslot small{display:block;font-size:13px;color:var(--muted);margin-top:1px}
.mslot .ch{font-size:13.5px;font-weight:600;color:var(--hb)}
.mslot.empty b{color:var(--muted);font-weight:500}
.mslot.now{background:#f3f7f9;box-shadow:inset 3px 0 0 var(--hb)}
.excerpt{padding:12px 16px 14px;font-family:var(--serif);font-size:14px;line-height:1.5;color:var(--ink-2);border-bottom:1px solid var(--rule)}
.att{display:flex;gap:8px;flex-wrap:wrap;padding:12px 16px 14px}
.att .pc{background:#fff;box-shadow:inset 0 0 0 1px var(--rule);height:32px}
/* version */
.chg{display:grid;grid-template-columns:1fr 26px 1fr;gap:6px;align-items:center;margin:4px 0 6px}
.chg .vb{background:#fff;border-radius:14px;box-shadow:var(--sh);padding:10px 12px;font-size:14px;font-weight:600;text-align:center}
.chg .vb.n{background:var(--hb);color:#fff}
.chg .ar{text-align:center;color:var(--muted)}
.chgs{display:flex;flex-direction:column;gap:6px;margin:10px 0 0}
.chgs span{background:#e3ebf0;color:#1d3b4d;border-radius:12px;padding:8px 12px;font-size:14px}
/* comps */
.ixc{background:#fff;border-radius:14px;box-shadow:var(--sh);overflow:hidden;margin-bottom:10px;display:block;width:100%;text-align:left}
.ixc .ih{padding:12px 14px 10px;border-bottom:1.5px solid rgba(162,69,42,.25);display:flex;gap:10px;align-items:center}
.ixc .ih .sub{flex:1}
.age{font-size:12px;font-weight:600;border-radius:999px;padding:2px 8px;background:#f4f1ec;color:var(--ink-2)}
.age.old{background:#f6e2d8;color:#7c3a2a}
.ixc .ibd{padding:10px 14px 12px}
.ixc .ibd b{font-size:17px;display:block}
.ixc .why{font-size:14px;color:var(--ink-2);margin-top:4px}
.ixc .slip{background:#fcfaf7;border-top:1px dashed var(--rule);padding:9px 14px;font-size:13px;color:var(--muted);display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.ixc .slip .pc{height:24px;font-size:12px}
.edbar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--rule)}
.edtx{padding:16px 18px;font-family:var(--serif);font-size:16px;line-height:1.6;color:var(--ink);min-height:420px}
.kbbar{position:absolute;left:0;right:0;bottom:0;background:#f4f1ec;border-top:1px solid var(--rule);display:flex;gap:6px;align-items:center;padding:8px 10px}
.kbbar button{height:36px;min-width:40px;border-radius:10px;background:#fff;font-weight:700;font-size:15px;box-shadow:var(--sh)}
.kbbar span{margin-left:auto;font-size:13px;color:var(--muted)}
.kb{position:absolute;left:0;right:0;bottom:0;height:260px;background:#d1d4d9;display:grid;place-items:center;color:#6b6f76;font-size:13px}
`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);

const chev=IC.chev.replace('<svg','<svg style="width:16px;height:16px;color:var(--faint);flex:none"');
const lockI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const VERS=[['Faster start','In 6 queries · 2 requests',1],['Prologue first','In 4 queries · 1 request'],['Original','In 6 queries · 1 request']];
const LET=[['Letter v3','In 12 queries · 2 requests',1],['Letter v2','In 4 queries · 1 request'],['Letter v1','In 2 queries · none yet']];
const SYN=[['One-page synopsis','In 11 queries · 2 requests',1],['Two-page synopsis','Not sent yet']];
const CMP=[['Hamnet','Maggie O’Farrell · 2020','In 9 queries'],['Shuggie Bain','Douglas Stuart · 2020','In 6 queries'],['The Lighthouse','Alison Moore · 2012','Over five years old']];
const PK=[['Standard UK',HB,'out','Faster start · Letter v3 · One-page synopsis','2 requests from 11',IC.box],['Letter + 10 pages','#3d6b7d','out','Prologue first · Letter v3 · First 10 pages','1 request from 4',IC.doc],['Short and sharp','#5d7f99','ready','Faster start · Letter v3 · No synopsis','Not sent yet',IC.send],['Comps-led letter','#2f5d74','draft','Faster start · Letter v4 (draft)','Not finished',IC.edit]];
const LCW={out:'Out with agents',ready:'Ready',draft:'Draft'};

// ---------- the hub ----------
function shelf(title,kind,items,cls,ico,add){
  return `<div class="shd"><span class="h2">${title}</span><button class="link">See all</button></div><div class="shelf">${items.map(([n,s,inuse])=>`<button class="sheetc ${cls} ${inuse?'inuse':''}" data-act="page" data-v="${kind}"><span class="k">${ico.replace('<svg','<svg')}${kind==='ver'?'Version':kind==='letter'?'Query letter':kind==='syn'?'Synopsis':'Comp'}${inuse?'<span class="inuse-t">In use</span>':''}</span><b>${n}</b><span class="s">${s.replace(/(\d+ requests?)/,'<em>$1</em>')}</span></button>`).join('')}<button class="sheetc add">${IC.plus.replace('<svg','<svg style="width:20px;height:20px"')}${add}</button></div>`;
}
function landing(){
  const lv=P.get('land')||'A';
  if(lv==='B') return `<div class="chips" style="margin-bottom:4px">${['Letters','Packages','Synopses','Versions','Comps'].map((w,i)=>`<button class="chip" aria-pressed="${i===0}">${w}</button>`).join('')}</div>
   <div class="h2h"><div class="card" style="left:0;top:20px;transform:rotate(-4deg);z-index:2"><div class="hb" style="background:var(--mpink)"><span>Letter v3</span><span>12 sent</span></div><div class="hc"><div class="big">17%</div><div class="sub" style="margin-top:4px">asked for more</div><div class="bar-h" style="margin-top:10px;height:8px"><i style="width:17%"></i></div><div class="sub" style="margin-top:8px">2 requests · 4 passes · 6 waiting</div></div></div>
   <div class="vs">vs</div>
   <div class="card" style="right:0;top:118px;transform:rotate(4deg)"><div class="hb" style="background:var(--fill)"><span>Letter v2</span><span>4 sent</span></div><div class="hc"><div class="big">25%</div><div class="sub" style="margin-top:4px">asked for more</div><div class="bar-h" style="margin-top:10px;height:8px"><i style="width:25%"></i></div><div class="sub" style="margin-top:8px">1 request · 2 passes · 1 waiting</div></div></div></div>
   <p class="sub" style="font-size:13.5px;margin:0 2px">Too early to call: Letter v2 has only gone to 4 agents.</p>`;
  if(lv==='C') return `<div class="chips" style="margin-bottom:4px">${['Packages','Letters','Synopses','Versions','Comps'].map((w,i)=>`<button class="chip" aria-pressed="${i===0}">${w}</button>`).join('')}</div><div class="card" style="padding:0">${[['1','Standard UK','Faster start · Letter v3',18,'2 of 11'],['2','Letter + 10 pages','Prologue first · Letter v3',25,'1 of 4'],['3','Short and sharp','Not sent yet',0,'–']].map(([n,a,b,p,r])=>`<div class="lg"><span class="n">${n}</span><span><b>${a}</b><span class="sub" style="display:block">${b}</span></span><span class="r">${p?p+'%':'–'}</span><span class="bar-h"><i style="width:${p*3}%;background:var(--hb)"></i></span></div>`).join('')}</div><p class="sub" style="font-size:13.5px;margin:8px 2px 0">Share of queries where the agent asked for more.</p>`;
  return `<div class="land">${[['Your best package','Standard UK',HB,IC.box,'2 requests from 11','Faster start · Letter v3 · One-page synopsis'],['Your best letter','Letter v3','#9b4a57',IC.doc,'2 requests from 12','Used in Standard UK and Letter + 10 pages'],['Your best version','Faster start',HB,IC.book,'2 requests from 6','Opens on the ferry, no prologue'],['Most named comp','Hamnet','#3a3f4a',IC.pages,'In 9 queries','Named in Letter v2 and v3']].map(([k,n,c,i,m,s],j)=>`<div class="show"><div class="top" style="background:${c}">${i}<span style="flex:1">${n}</span></div><span class="rank" style="color:#fff">${k}</span><div class="ov"><div class="m">${m}</div><div class="c">${s}</div></div></div>`).join('')}</div><div class="dots2"><i class="on"></i><i></i><i></i><i></i></div>`;
}
function hubHtml(withBack){
  const band=`<div class="pband"><div class="bandrow">${withBack?`<button class="ring" data-act="back" aria-label="Back">${IC.back}</button>`:''}<span style="flex:1"></span><button class="ring" data-act="search" aria-label="Search">${IC.search}</button><button class="avring" data-act="menu">${ME.ini}</button></div>
    <div class="bt" style="margin-top:12px">Packages</div><div style="font-size:14.5px;color:rgba(255,255,255,.78);margin-top:6px">What you send agents, and what’s working</div>
    <button class="apk" data-act="page" data-v="pkgpage" style="display:block;width:100%;text-align:left"><div class="ah">${IC.box.replace('<svg','<svg style="width:18px;height:18px"')}<b>Standard UK</b><span>New queries go out with this</span></div><div class="ab"><div class="ap"><span class="pc v">${IC.book}Faster start</span><span class="pc l">${IC.doc}Letter v3</span><span class="pc l">${IC.note}One-page synopsis</span></div><div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:12px"><span style="font-family:var(--type);font-size:19px">2 requests from 11</span><span class="link" style="font-size:13.5px">Change</span></div></div></button></div>`;
  return `<div class="screen" data-scr="hub">${band}<div style="padding:0 0 130px">
    <div class="shd" style="margin-top:6px"><span class="h2">What’s landing</span><button class="link">How it works</button></div>${landing()}
    <div class="shd"><span class="h2">Your packages</span><button class="link" data-act="page" data-v="build">New</button></div>
    <div class="card" style="padding:0">${PK.map(([n,c,l,s,r,i])=>`<button class="pkrow" data-act="page" data-v="pkgpage"><span class="pkic" style="background:${c}">${i}</span><span style="flex:1;min-width:0"><b style="display:block;font-size:15.5px">${n}</b><span class="sub" style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s}</span></span><span class="lc ${l}">${l==='out'?'🔒 ':''}${LCW[l]}</span></button>`).join('')}</div>
    <button class="btn pri blk" data-act="page" data-v="build" style="margin-top:12px;background:var(--hb)">${IC.plus}Build a package</button>
    <div style="margin-top:8px"></div>
    ${shelf('Versions','ver',VERS,'',IC.book,'New version')}
    ${shelf('Query letters','letter',LET,'l',IC.doc,'New letter')}
    ${shelf('Synopses','syn',SYN,'l',IC.note,'New synopsis')}
    ${shelf('Comps','comp',CMP.map(([t,a,u],i)=>[t,a+' · '+u]),'',IC.pages,'Add a comp')}
  </div></div>`;
}
PAGES.hub=()=>hubHtml(true);
const _sh=window.screenHtml;
window.screenHtml=function(){ if(!S.stack.length&&S.tab==='packages') return hubHtml(false); return _sh(); };

// ---------- navigation options ----------
const boxI=IC.box;
const _tb=window.tabbar;
window.tabbar=function(){
  let h=_tb();
  if(has('n2')) h=h.replace(/<button class="tb" data-act="tab" data-v="todo"[\s\S]*?<\/button>/,`<button class="tb" data-act="tab" data-v="packages" ${S.tab==='packages'&&!S.stack.length?'aria-current="page"':''}><span class="i">${boxI}</span>Packages</button>`);
  if(has('n3')) h=h.replace(/<button class="tb" data-act="tab" data-v="agents"[\s\S]*?<\/button>/,`<button class="tb" data-act="tab" data-v="packages" ${S.tab==='packages'&&!S.stack.length?'aria-current="page"':''}><span class="i">${boxI}</span>Packages</button>`);
  return h;
};
const _home=window.screenHome2;
window.screenHome2=function(){
  let h=_home();
  if(has('n1')){
    const card=`<button class="card tap" data-act="page" data-v="hub" style="margin-top:14px;padding:0;overflow:hidden"><div style="background:${HB};color:#fff;padding:12px 16px;display:flex;gap:10px;align-items:center">${IC.box.replace('<svg','<svg style="width:19px;height:19px"')}<b style="flex:1;font-family:var(--type);font-weight:400;font-size:19px">Packages</b><span style="font-size:13px;opacity:.85">Smart querying</span></div><div style="padding:12px 16px 14px"><div style="font-size:14px;color:var(--muted)">New queries go out with</div><div style="font-weight:600;font-size:16px;margin-top:2px">Standard UK</div><div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:10px"><span style="font-family:var(--type);font-size:18px">Letter v3 is landing best</span>${chev}</div></div></button>`;
    const i=h.indexOf('<div class="nextc">'); const j=h.indexOf('<div class="shd">',i);
    if(i>-1&&j>-1) h=h.slice(0,j)+card+h.slice(j);
  }
  if(has('n2')){
    const g=TASKS.filter(t=>t.grp==='earlier'||t.grp==='today');
    const list=`<div class="shd"><span class="h2">To-do</span><button class="link" data-act="page" data-v="todopage">See all ${TASKS.length}</button></div><div class="card" style="padding:0">${g.slice(0,4).map(t=>`<button class="ck" style="background:transparent"><span class="bx"></span><span class="t"><b>${esc(t.t)}</b><small>${esc(t.s)}</small></span>${chev}</button>`).join('')}</div>`;
    const i=h.indexOf('<div class="shd">',h.indexOf('<div class="nextc">'));
    if(i>-1) h=h.slice(0,i)+list+h.slice(i);
  }
  return h;
};

// ---------- detail pages ----------
const sub=(title,body,right='')=>`<div class="screen"><div class="bk" data-hd><button class="ib" data-act="back" aria-label="Back">${IC.back}</button><span class="t">${esc(title)}</span>${right||'<span style="width:40px"></span>'}</div><div style="padding:6px 16px 130px">${body}</div></div>`;
const ACT=(i,w)=>`<button>${i}${w}</button>`;
const mi=(i,bg='var(--fill)')=>`<span style="width:38px;height:38px;border-radius:12px;background:${bg};display:grid;place-items:center;flex:none">${i.replace('<svg','<svg style="width:18px;height:18px"')}</span>`;
PAGES.pkgpage=()=>`<div class="screen"><div class="pband" style="background:${HB}"><div class="bandrow"><button class="ring" data-act="back" aria-label="Back">${IC.back}</button><span style="flex:1"></span><button class="ring">${IC.share}</button><button class="ring">${IC.more}</button></div>
  <div style="display:flex;gap:14px;align-items:center;margin-top:14px"><span class="pkic" style="width:52px;height:52px;border-radius:16px;background:rgba(255,255,255,.14)">${IC.box}</span><div><div class="bt">Standard UK</div><div style="font-size:14px;color:rgba(255,255,255,.8);margin-top:4px">🔒 Out with agents · new queries use it</div></div></div></div>
  <div style="padding:0 0 130px"><div class="fsum"><div><b>11</b><span>queries</span></div><div><b>2</b><span>asked for more</span></div><div><b>18%</b><span>request rate</span></div></div>
  <div class="shd"><span class="h2">How far it gets</span><span class="sub">11 sent</span></div><div class="card"><div class="funnel">${[['Queried',11],['Partial',3],['Full',2],['Offer',0]].map(([w,n])=>`<div><span>${w}</span><i style="width:${Math.max(n/11*100,2)}%;${n?'':'background:var(--fill)'}"></i><b>${n}</b></div>`).join('')}</div><p class="sub" style="margin:12px 0 0;font-size:13.5px">4 passed and 5 are still waiting.</p></div>
  <div class="shd"><span class="h2">What’s in it</span></div><div class="card" style="padding:0">${[['Faster start','Version · the first 3 chapters come from this',IC.book,'#e3ebf0'],['Letter v3','Query letter · names Hamnet and Shuggie Bain',IC.doc,MPINK],['One-page synopsis','Synopsis',IC.note,MPINK]].map(([n,s,i,bg])=>`<button class="mslot">${mi(i,bg)}<span class="t"><b>${n}</b><small>${s}</small></span>${chev}</button>`).join('')}</div>
  <div class="lockn">${lockI}<span>It’s gone out, so it’s locked: changing it would muddle its numbers. Make a copy to try something different.</span></div>
  <div style="display:flex;gap:10px"><button class="btn pri" style="flex:1;background:${HB}">Make a copy</button><button class="btn sec" style="flex:1">Stop using it</button></div>
  <div class="shd"><span class="h2">Queries it went with</span><span class="sub">11</span></div><div class="rows" style="margin:0 -16px">${QUERIES.filter(q=>q.pkg==='std').slice(0,5).map(qRow).join('')}</div></div></div>`;

function buildPage(){
  const bv=P.get('build')||'B';
  if(bv==='A'){
    return `<div class="screen"><div class="pband" style="padding-bottom:40px"><div class="bandrow"><button class="ring" data-act="back">${IC.close}</button><span style="flex:1;color:rgba(255,255,255,.8);font-size:14px;text-align:center">Step 2 of 4</span><span style="width:44px"></span></div>
     <div class="apk" style="margin-top:12px"><div class="ah">${IC.box.replace('<svg','<svg style="width:18px;height:18px"')}<b>Short and sharp</b><span>Draft</span></div><div class="ab"><div class="ap"><span class="pc v">${IC.book}Faster start</span><span class="pc" style="background:transparent;box-shadow:inset 0 0 0 1.5px #b9c9d4;color:var(--hb)">Query letter</span><span class="pc" style="background:transparent;box-shadow:inset 0 0 0 1px var(--rule);color:var(--muted)">Synopsis</span><span class="pc" style="background:transparent;box-shadow:inset 0 0 0 1px var(--rule);color:var(--muted)">Also sends</span></div></div></div></div>
     <div style="padding:0 0 130px"><div class="h2" style="font-size:24px;margin:4px 2px 6px">Which query letter?</div><p class="sub" style="font-size:14.5px;margin:0 2px 14px">The letter agents read first.</p>
     <div class="card" style="padding:0">${LET.map(([n,s,c],i)=>`<button class="mslot" style="${i===0?'background:#f3f7f9;box-shadow:inset 3px 0 0 var(--hb)':''}">${mi(IC.doc,MPINK)}<span class="t"><b>${n}${c?' <span class="inuse-t">In use</span>':''}</b><small>${s}</small></span>${i===0?IC.check.replace('<svg','<svg style="width:20px;height:20px;color:var(--hb)"'):''}</button>`).join('')}<button class="mslot" style="border:0">${mi(IC.plus)}<span class="t"><b>Write a new letter</b><small>Opens the editor, then comes back here</small></span></button></div></div></div>`;
  }
  return `<div class="screen"><div class="pband" style="padding-bottom:40px"><div class="bandrow"><button class="ring" data-act="back">${IC.close}</button><span style="flex:1"></span><button class="btn onnavy sm">Save draft</button></div>
   <div class="bt" style="margin-top:12px">Short and sharp</div><div style="font-size:14px;color:rgba(255,255,255,.75);margin-top:4px">Tap the name to rename it</div>
   <div class="steps4">${[['Version',1],['Letter',1],['Synopsis',0],['Extras',0]].map(([w,ok])=>`<span class="${ok?'ok':''}">${ok?IC.check:''}${w}</span>`).join('')}</div></div>
   <div style="padding:0 0 130px"><div class="shd" style="margin-top:2px"><span class="h2">What an agent receives</span></div>
   <div class="mail"><div class="mh"><div><span>To</span>the agent’s email or form</div><div><span>Subject</span>Query: THE SALT ROAD (literary fiction, 94,000 words)</div></div>
   <button class="mslot">${mi(IC.doc,MPINK)}<span class="t"><b>Letter v3</b><small>Query letter · in the email</small></span><span class="ch">Change</span></button>
   <div class="excerpt">Dear [Agent], When the ferry stops running, a lighthouse keeper’s daughter walks the old salt road…</div>
   <button class="mslot now">${mi(IC.note,'#fff')}<span class="t"><b>Add a synopsis</b><small>Most UK agents ask for one. Skip it if this agent doesn’t.</small></span><span class="ch">Choose</span></button>
   <button class="mslot">${mi(IC.book,'#e3ebf0')}<span class="t"><b>First 3 chapters</b><small>From Faster start · 11,800 words</small></span><span class="ch">Change</span></button>
   <button class="mslot empty" style="border:0">${mi(IC.plus)}<span class="t"><b>Also sends</b><small>Author bio, a cover note, anything else</small></span><span class="ch">Add</span></button></div>
   <button class="btn pri blk" style="margin-top:16px;background:${HB}">Mark as ready</button><p class="sub" style="text-align:center;font-size:13px;margin-top:8px">You can still change it until it goes out with a query.</p></div></div>`;
}
PAGES.build=buildPage;
PAGES.letter=()=>sub('Letter v3',`<div style="display:flex;justify-content:space-between;align-items:baseline;margin:6px 2px 12px"><span class="sub">Edited 12 Oct · 412 words</span><span class="inuse-t">In use</span></div>
  <div class="paper">Dear [Agent],<br><br>When the ferry stops running, a lighthouse keeper’s daughter walks the old salt road to find the brother who never came home. THE SALT ROAD is a literary novel of 94,000 words, and I think it will sit well beside Maggie O’Farrell’s HAMNET and Douglas Stuart’s SHUGGIE BAIN…</div>
  <div class="acts3">${ACT(IC.edit,'Edit')}${ACT(IC.plus,'New version')}${ACT(IC.share,'Copy text')}${ACT(IC.more,'More')}</div>
  <div class="fsum" style="margin-top:14px"><div><b>12</b><span>queries</span></div><div><b>2</b><span>asked for more</span></div><div><b>17%</b><span>request rate</span></div></div>
  <div class="shd"><span class="h2">Comps it names</span><button class="link" data-act="page" data-v="compslog">Change</button></div><div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pc">${IC.pages}Hamnet</span><span class="pc">${IC.pages}Shuggie Bain</span></div>
  <div class="shd"><span class="h2">In these packages</span></div><div class="card" style="padding:0">${PK.slice(0,3).map(([n,c,l,s,r,i])=>`<div class="pkrow"><span class="pkic" style="background:${c};width:34px;height:34px">${i}</span><span style="flex:1"><b style="font-size:15px">${n}</b></span><span class="lc ${l}">${LCW[l]}</span></div>`).join('')}</div>
  <div class="shd"><span class="h2">Earlier versions</span><button class="link">Compare</button></div><div class="card" style="padding:0">${LET.slice(1).map(([n,s])=>`<div class="mslot" style="border:0">${mi(IC.doc,MPINK)}<span class="t"><b>${n}</b><small>${s}</small></span>${chev}</div>`).join('')}</div>`);
PAGES.editor=()=>`<div class="screen" style="background:#fff;height:100vh;padding:0;position:relative;overflow:hidden"><div class="edbar"><button class="link">Cancel</button><b style="font-size:15px">Letter v3</b><button class="btn pri sm" style="height:34px">Save as v4</button></div>
  <div style="background:#e3ebf0;color:#1d3b4d;font-size:13.5px;padding:9px 16px">Letter v3 has gone out, so this saves as Letter v4. v3 stays as it was sent.</div>
  <div class="edtx">Dear [Agent],<br><br>When the ferry stops running, a lighthouse keeper’s daughter walks the old salt road to find the brother who never came home.<br><br>THE SALT ROAD is a literary novel of 94,000 words. It will sit well beside Maggie O’Farrell’s HAMNET<span style="border-left:2px solid var(--navy);margin-left:1px"></span></div>
  <div class="kb" style="bottom:0">Keyboard</div><div class="kbbar" style="bottom:260px"><button><b>B</b></button><button><i>I</i></button><button>•</button><button>[ ]</button><span>418 words</span></div></div>`;
PAGES.ver=()=>sub('Faster start',`<div style="display:flex;gap:8px;align-items:center;margin:6px 2px 14px"><span class="inuse-t" style="margin:0">In use</span><span class="sub">Saved 2 Oct · 94,000 words</span></div>
  <div class="card"><div class="sub" style="font-weight:600;color:var(--ink-2);margin-bottom:10px">What changed</div><div class="chg"><span class="vb">Prologue first</span><span class="ar">→</span><span class="vb n">Faster start</span></div><div class="chgs"><span>Cut the prologue</span><span>Opens on the ferry</span><span>Chapter 2 split in two</span></div></div>
  <div class="fsum" style="margin-top:14px"><div><b>6</b><span>queries</span></div><div><b>2</b><span>asked for more</span></div><div><b>33%</b><span>request rate</span></div></div>
  <div class="shd"><span class="h2">How far it gets</span></div><div class="card"><div class="funnel">${[['Queried',6],['Partial',2],['Full',1],['Offer',0]].map(([w,n])=>`<div><span>${w}</span><i style="width:${Math.max(n/6*100,2)}%;${n?'':'background:var(--fill)'}"></i><b>${n}</b></div>`).join('')}</div></div>
  <div class="acts3" style="grid-template-columns:repeat(3,1fr)">${ACT(IC.edit,'Edit')}${ACT(IC.check,'In use')}${ACT(IC.closeq,'Archive')}</div>
  <div class="shd"><span class="h2">Its queries and where they stand</span></div><div class="rows" style="margin:0 -16px">${QUERIES.slice(0,4).map(qRow).join('')}</div>`);
PAGES.comps=()=>sub('Comps',`<p class="lede" style="margin:4px 2px 14px">Books your letter compares yours to. Agents like comps from the last five years.</p>${[['Hamnet','Maggie O’Farrell','2020',6,'Grief and family in a vividly drawn place.',['Letter v3','Letter v2'],'9 queries · 2 asked for more'],['Shuggie Bain','Douglas Stuart','2020',6,'A child’s-eye view of a parent’s struggle.',['Letter v3'],'6 queries · 1 asked for more'],['The Lighthouse','Alison Moore','2012',14,'Quiet, coastal, unsettling.',['Letter v1'],'2 queries']].map(([t,a,y,age,w,ls,u])=>`<button class="ixc"><div class="ih">${mi(IC.book)}<span class="sub">Book · ${y}</span><span class="age ${age>5?'old':''}">${age} yrs old</span></div><div class="ibd"><b>${t}</b><span class="sub">${a}</span><div class="why">${w}</div></div><div class="slip">Named in ${ls.map(l=>`<span class="pc l">${l}</span>`).join('')}<span style="margin-left:auto">${u}</span></div></button>`).join('')}<button class="btn pri blk" style="margin-top:6px">${IC.plus}Add a comp</button>`);
PAGES.compslog=()=>sub('Comps in Letter v3',`<p class="lede" style="margin:4px 2px 14px">Tick the comps this letter names, so you can see which ones agents respond to.</p><div class="card" style="padding:0">${CMP.map(([t,a,u],i)=>`<button class="ck" style="background:transparent"><span class="bx ${i<2?'done':''}">${i<2?IC.check:''}</span><span class="t"><b>${t}</b><small>${a}${i===2?' · over five years old':''}</small></span></button>`).join('')}<button class="ck" style="background:transparent">${IC.plus.replace('<svg','<svg style="width:22px;height:22px;color:var(--navy)"')}<span class="t"><b>Add a comp</b></span></button></div><button class="btn pri blk" style="margin-top:16px">Save</button>`);

// ---------- log a query: what did you send ----------
const sent=FLOWS.log.steps.find(s=>s.id==='sent');
if(sent){
  sent.q=()=>`What did you send Hannah?`;
  sent.help=()=>`Fernhill Agency asks for a letter, a synopsis and the first 3 chapters.`;
  sent.opts=()=>[{v:'std',l:'Standard UK',s:'The package you’re using now · matches what they ask for',icon:IC.box},{v:'short',l:'Letter + 10 pages',s:'Prologue first · Letter v3 · First 10 pages',icon:IC.box},{v:'full',l:'Short and sharp',s:'Faster start · Letter v3 · no synopsis',icon:IC.box},{v:'pick',l:'Something different',s:'Choose the letter, synopsis and pages',icon:IC.pages}];
}

// boot
const pg=P.get('page3');
setTimeout(()=>{
  if(P.get('tab3')) {S.tab=P.get('tab3');S.stack=[];}
  if(pg){S.stack=[pg];}
  if(P.get('tab3')||pg) paintScreen();
  const sc=+P.get('scroll')||0; if(sc) setTimeout(()=>{SC.scrollTop=sc;S.away=false;TB.classList.remove('away');lastY=SC.scrollTop;},60);
  if(P.get('ov3')==='logsent'){flow('log',{agent:'a1',agentPreset:1});const st=flowSteps(S.overlay);S.overlay.i=Math.max(0,st.findIndex(s=>s.id==='sent'));S.overlay.d.agent='a1';paintOverlay();}
},140);
})();
