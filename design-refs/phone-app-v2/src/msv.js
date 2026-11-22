// ---------- Manuscript variants ----------
let MSH='B', MSL='B', MSP='A', COV='B';
const PKS=[['Standard UK','Letter v3 · Synopsis · First 3 chapters',11,2,1],['Letter + 10 pages','Letter v3 · First 10 pages',4,1,0],['Letter + 50 pages','Letter v3 · First 50 pages',1,0,0]];
function pkBlock(){
  if(MSP==='B') return `<div class="group">${PKS.map(([n,c,s,r])=>`<div class="li" style="min-height:64px">${disc(r?'preq':'queried',36)}<span class="lt"><span style="display:block;font-weight:600">${n}</span><span class="sub">${c}</span></span><span class="rt" style="flex-direction:column;align-items:flex-end;gap:0"><b class="num" style="color:var(--ink);font-size:17px">${r} of ${s}</b><span style="font-size:12px">requested</span></span></div>`).join('')}</div>`;
  if(MSP==='C') return `<div class="hscroll">${PKS.map(([n,c,s,r])=>`<div class="card pkc"><div class="pstack">${c.split(' · ').map((x,i)=>`<i style="transform:translate(${i*7}px,${i*-6}px) rotate(${[-4,2,-1][i]}deg)"></i>`).join('')}</div><b style="display:block;font-size:15.5px;margin-top:14px">${n}</b><span class="sub">${c}</span><div class="bar-h" style="margin-top:12px"><i style="width:${s?r/s*100:0}%;background:var(--navy)"></i></div><div class="sub" style="margin-top:6px">${r?`${r} request${r>1?'s':''} from ${s} queries`:`${s} quer${s>1?'ies':'y'}, no replies yet`}</div></div>`).join('')}</div>`;
  return `<div class="hscroll">${PKS.map(([n,c,s,r],i)=>`<div style="width:230px;position:relative;padding-top:50px">
     <div class="card" style="position:absolute;inset:0 0 auto 0;height:100px;padding:14px 16px;background:${i===0?'var(--navy)':'#fff'};color:${i===0?'#fff':'inherit'};display:flex;gap:8px;align-items:flex-start">${IC.box.replace('<svg','<svg style="width:20px;height:20px;flex:none"')}<span style="font-weight:600">${n}</span></div>
     <div class="card" style="position:relative;margin:0 10px;box-shadow:0 10px 24px rgba(31,38,51,.14)"><div class="num" style="font-size:19px">${r?`${r} request${r>1?'s':''} from ${s}`:'No replies yet'}</div><div class="sub" style="margin-top:4px">${c}</div></div></div>`).join('')}</div>`;
}
const letters=`<div class="group">${[['Letter v3','Used in 12 queries · current'],['Letter v2','Used in 4 queries'],['Letter v1','Used in 2 queries']].map(([n,s])=>`<div class="li"><span class="ico">${IC.doc}</span><span class="lt">${n}<span class="sub" style="display:block">${s}</span></span>${IC.chev.replace('<svg','<svg class="chev"')}</div>`).join('')}</div>`;
const samples=`<div class="group">${[['One-page synopsis',IC.note],['First 3 chapters',IC.pages],['First 10 pages',IC.pages],['First 50 pages',IC.pages],['Full manuscript',IC.book]].map(([n,i])=>`<div class="li"><span class="ico">${i}</span><span class="lt">${n}</span>${IC.chev.replace('<svg','<svg class="chev"')}</div>`).join('')}</div>`;
const versions=`<div class="card" style="display:flex;gap:10px;align-items:center;background:var(--pink-wash);box-shadow:none;padding:10px 14px"><span class="lock">Pro</span><span style="font-size:13.5px;flex:1">Included for founding writers during the beta.</span></div><div class="group" style="margin-top:10px">${[['Draft 4','Current · in 12 queries · 2 requests'],['Draft 3','In 4 queries · 1 request'],['Draft 2','Not queried']].map(([n,s],i)=>`<div class="li"><span class="ico">${i===0?IC.check:IC.book}</span><span class="lt">${n}<span class="sub" style="display:block">${s}</span></span>${IC.chev.replace('<svg','<svg class="chev"')}</div>`).join('')}</div>`;
const comps=`<div class="group">${[['Hamnet','Maggie O’Farrell · 2020','In 9 queries'],['Shuggie Bain','Douglas Stuart · 2020','In 6 queries'],['The Lighthouse','Alison Moore · 2012','Older than five years']].map(([t,a,u])=>`<div class="li"><span class="ico">${IC.book}</span><span class="lt">${t}<span class="sub" style="display:block">${a}</span></span><span class="rt" style="font-size:13px">${u}</span></div>`).join('')}</div><button class="btn sec blk" style="margin-top:12px" data-act="toast" data-v="comp">${IC.plus}Add a comp</button>`;
const pitch=`<div class="card"><div class="sub" style="font-weight:600;color:var(--ink-2)">Your pitch</div><p style="font-size:15.5px;line-height:1.5;margin:6px 0 0">When the ferry stops running, a lighthouse keeper’s daughter walks the old salt road to find the brother who never came home.</p></div>`;
const details=`<div class="group">${[['Age category','Adult'],['Genre','Literary fiction'],['Word count','94,000'],['Current version','Draft 4']].map(([k,v])=>`<div class="li"><span class="lt mut" style="font-size:15px">${k}</span><span class="rt" style="color:var(--ink)">${v}</span></div>`).join('')}</div>`;
PAGES.manuscript=function(){
  let head='';
  if(MSH==='B'){
    head=`<div class="pband"><div class="bandrow"><button class="ring" data-act="back" aria-label="Back">${IC.back}</button><span style="flex:1"></span>${ringB(IC.edit,'toast','Edit','comp')}<button class="avring" data-act="menu" aria-label="Open menu">${ME.ini}</button></div>
      <div style="display:flex;gap:16px;align-items:center;margin-top:16px">${coverHtml()}<div style="min-width:0"><div class="bt">${esc(BOOK.title)}</div><div style="font-size:14px;color:rgba(255,255,255,.78);margin-top:6px;line-height:1.45">${BOOK.cat}<br>${BOOK.words} · Draft 4</div><div style="font-size:13px;color:rgba(255,255,255,.6);margin-top:6px">Querying since ${BOOK.since}</div></div></div></div>`;
  } else {
    head=bk(BOOK.title)+`<div class="hero" style="margin-top:4px"><div class="sub" style="font-size:14px">Querying since ${BOOK.since}</div><div style="font-family:var(--type);font-size:30px;margin:4px 0 4px">${BOOK.title}</div><div style="font-size:14.5px;color:rgba(255,255,255,.85)">${BOOK.cat} · ${BOOK.words}</div></div>`;
  }
  const stats=`<div class="grid3" style="margin-top:${MSH==='B'?0:12}px">${[['16','queries'],['4','requests'],['3','packages']].map(([n,w])=>`<div class="mini"><span class="num">${n}</span><span class="sub">${w}</span></div>`).join('')}</div>`;
  let body='';
  if(MSL==='A'){
    const seg=S.mseg;
    body=stats+`<div class="seg" style="margin-top:14px">${[['overview','Overview'],['materials','Materials'],['versions','Versions'],['comps','Comps']].map(([k,w])=>`<button data-act="mseg" data-v="${k}" aria-pressed="${seg===k}">${w}</button>`).join('')}</div>`+
      (seg==='materials'?`<div class="shd" style="margin-top:4px"><span class="h2">Packages</span></div>${pkBlock()}<div class="shd"><span class="h2">Query letters</span></div>${letters}`:seg==='versions'?versions:seg==='comps'?comps:pitch+`<div class="gl">Details</div>`+details);
  } else if(MSL==='B'){
    const sec=(t,r='')=>`<div class="shd"><span class="h2">${t}</span>${r}</div>`;
    body=stats+`<div style="margin-top:14px">${pitch}</div>`+sec('Packages','<button class="link" data-act="toast" data-v="pkg">New</button>')+pkBlock()+sec('Query letters','<span class="sub">3</span>')+letters+sec('Synopses and samples')+samples+sec('Versions')+versions+sec('Comparable titles')+comps+sec('Details')+details;
  } else {
    const tile=(t,i,s1,v)=>`<button class="mtile" data-act="mseg" data-v="${v}"><span class="mi">${i}</span><b>${t}</b><span class="sub">${s1}</span></button>`;
    body=stats+`<div style="margin-top:14px">${pitch}</div><div class="mtiles" style="margin-top:14px">${tile('Packages',IC.box,'3 packages · 4 requests','materials')}${tile('Letters and samples',IC.doc,'3 letters · 5 samples','materials')}${tile('Versions',IC.book,'Draft 4 is current','versions')}${tile('Comps',IC.pages,'3 titles','comps')}</div><div class="gl">Details</div>${details}`;
  }
  return head+body;
};

function coverHtml(){
  if(COV==='A') return '';
  if(COV==='C') return `<div class="cov-m"><span>${esc(BOOK.title.replace(/^The /,'')[0])}</span></div>`;
  if(COV==='D') return `<button class="cov-add" data-act="toast" data-v="comp">${IC.plus}<span>Add your cover</span></button>`;
  return `<div class="cov-b"><i class="sp"></i><span class="t">${esc(BOOK.title)}</span><i class="rl"></i><span class="a">${esc(ME.name)}</span></div>`;
}
