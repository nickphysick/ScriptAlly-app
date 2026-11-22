// Board boot: app.html#tab=queries&ov=birds&opt=b4&scroll=400
(function(){
const P=new URLSearchParams(location.hash.slice(1));
const tab=P.get('tab')||'home', ov=P.get('ov'), opt=P.get('opt')||'', scroll=+P.get('scroll')||0;
document.documentElement.classList.add('fx','fx-'+opt);
const st=document.createElement('style');
st.textContent=`
html.fx body{margin:0;padding:0;background:var(--page);overflow:hidden}
html.fx .chrome,html.fx .notes,html.fx .views{display:none!important}
html.fx .proto{padding:0!important;display:block!important}
html.fx .device{width:100vw!important;height:100vh!important;border-radius:0!important;padding:0!important;box-shadow:none!important}
html.fx .device .app{border-radius:0}
html.fx .app .scroller{top:0}
html.fx .app .tabbar{bottom:14px}
/* every fix: the page scrolls to its end and clears the bar */


/* 1 · TODAY (the bug, as reported) */
html.fx-b0 .tabbar{background:#fff;backdrop-filter:none;-webkit-backdrop-filter:none}
html.fx-b0 .app::after{content:"";position:absolute;left:0;right:0;bottom:104px;height:64px;z-index:19;pointer-events:none;background:linear-gradient(rgba(248,246,242,0),#fff 85%)}

/* 1A frosted, no fade (the prototype) */
html.fx-b1 .tabbar{background:rgba(255,255,255,.6);backdrop-filter:blur(20px) saturate(1.5);-webkit-backdrop-filter:blur(20px) saturate(1.5)}
/* 1B frosted + fade anchored to the screen edge */
html.fx-b2 .tabbar{background:rgba(255,255,255,.6);backdrop-filter:blur(20px) saturate(1.5);-webkit-backdrop-filter:blur(20px) saturate(1.5)}
html.fx-b2 .app::after{content:"";position:absolute;left:0;right:0;bottom:0;height:112px;z-index:19;pointer-events:none;background:linear-gradient(rgba(248,246,242,0),rgba(248,246,242,.9) 55%,var(--page));transition:opacity .3s}
html.fx-b2 .app:has(.tabbar.away)::after{opacity:0}
/* 1C solid bar, content scrolls behind it */
html.fx-b3 .tabbar{background:#fff;backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:0 10px 30px rgba(31,38,51,.2),0 0 0 1px rgba(31,38,51,.06)}

/* 3B search as a tall sheet */
html.fx-s2 .flow{top:7%;border-radius:22px 22px 0 0;padding-top:10px;box-shadow:var(--sh-up)}
html.fx-s2 .flow::before{content:"";align-self:center;width:38px;height:5px;border-radius:3px;background:rgba(31,38,51,.18);margin-bottom:6px;flex:none}
html.fx-s2 .app:has(.flow)::before{content:"";position:absolute;inset:0;background:rgba(21,24,30,.38);z-index:34}
/* 3C search in the navy band */
html.fx-s3 .flow>div:first-child{background:var(--navy);padding:6px 12px 18px!important;margin-top:-48px;padding-top:54px!important}
html.fx-s3 .flow>div:first-child .search{background:#fff}
html.fx-s3 .flow>div:first-child .link{color:#fff}
html.fx-s3 .flow #sres{padding-top:6px!important}

/* 4 Birds-eye extras */
.be-trk{position:relative;height:10px;border-radius:5px;background:var(--fill);margin:4px 0 0}
.be-trk>i{position:absolute;left:0;top:0;bottom:0;border-radius:5px}
.be-stops{display:flex;justify-content:space-between;margin-top:6px;font-size:11.5px;color:var(--muted)}
.be-stops span.on{color:var(--ink);font-weight:600}
.be-dot{position:absolute;top:50%;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%);background:#fff;box-shadow:0 0 0 2px var(--fill)}
.be-dot.on{box-shadow:none}
.be-row{display:grid;grid-template-columns:1fr 92px;gap:4px 12px;align-items:center;padding:11px 2px;border-bottom:1px solid rgba(31,38,51,.07);text-align:left;width:100%}
.be-row .bar-h{height:8px}

/* 5 Log a query */
html.fx-l1 .lc-band{padding:12px 16px}
html.fx-l1 .lc-band span:first-child{font-family:var(--type);font-size:22px;font-weight:400;color:var(--ink)}
html.fx-l2 .fband .lcard .lc-band span:first-child{display:none}
html.fx-l2 .fband .lcard .lc-band{justify-content:flex-end}
.fx-nqh{font-family:var(--type);font-size:30px;line-height:1.1;color:#fff;margin:4px 0 14px}
html.fx-l3 .fband .lcard .lc-band{display:none}
.fx-nqc{display:flex;justify-content:space-between;align-items:baseline;padding:14px 16px 2px}
.fx-nqc b{font-family:var(--type);font-weight:400;font-size:26px;color:var(--ink)}
.fx-nqc span{font-family:var(--type);font-size:14px;color:var(--muted)}
/* "today": opens scrolled */
`;
document.head.appendChild(st);

// Birds-eye variants
const STOPS=[['queried','Queried'],['psent','Partial'],['fsent','Full'],['offer','Offer']];
const stopIdx=q=>({queried:0,psent:1,preq:1,fsent:2,freq:2,offer:3}[q.st]??0);
if(opt==='e2'){ // stage track
  window.ovBirds=function(){
    const row=q=>{const c=courtOf(q),k=stopIdx(q),col=c==='you'?'var(--pink)':c==='quiet'?'#c9c1b3':'var(--navy)';
      const p=k/3*100+(c==='quiet'?0:8);
      return `<button class="card tap" data-act="query" data-id="${q.id}" style="padding:12px 14px 10px;margin-bottom:8px;display:block;width:100%;text-align:left"><div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">${glyph(q.st,20)}<b style="flex:1;font-size:15px">${esc(q.name)}</b><span class="sub">Day ${q.day}</span></div>
      <div class="be-trk"><i style="width:${Math.min(p,100)}%;background:${col}"></i>${STOPS.map((s,i)=>`<span class="be-dot ${i<=k?'on':''}" style="left:${i===0?6:i===3?'calc(100% - 6px)':(i/3*100)+'%'};${i<=k?'background:'+col:''}"></span>`).join('')}</div>
      <div class="be-stops">${STOPS.map((s,i)=>`<span class="${i===k?'on':''}">${s[1]}</span>`).join('')}</div></button>`;};
    return sheet(`<div class="body" style="padding-top:4px"><div class="sh-t" style="margin-bottom:4px">Birds-eye view</div><p class="sub" style="margin:0 0 16px;font-size:14px">Where each active query has reached.</p>
      ${['you','agent','quiet'].map(c=>`<div class="gl">${COURT[c].w}</div>`+byCourt(c).map(row).join('')).join('')}</div>`,{h:'92%'});
  };
}
if(opt==='e3'){ // compact rows
  window.ovBirds=function(){
    const pct={queried:.35,psent:.55,fsent:.7,preq:.85,freq:.9};
    const row=q=>{const c=courtOf(q);const p=c==='quiet'?1:(pct[q.st]||.4);
      return `<button class="be-row" data-act="query" data-id="${q.id}"><span style="min-width:0"><b style="display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(q.name)}</b><span class="sub" style="font-size:12.5px">${esc(q.next||'')}</span></span><span><span class="bar-h" style="display:block"><i style="width:${p*100}%;background:${c==='you'?'var(--pink)':c==='quiet'?'#c9c1b3':'var(--navy)'}"></i></span><span class="sub" style="display:block;text-align:right;font-size:12px;margin-top:4px">Day ${q.day}</span></span></button>`;};
    return sheet(`<div class="body" style="padding-top:4px"><div class="sh-t" style="margin-bottom:4px">Birds-eye view</div><p class="sub" style="margin:0 0 6px;font-size:14px">How far each active query has come towards its next step.</p>
      ${['you','agent','quiet'].map(c=>`<div class="gl">${COURT[c].w}</div><div class="card" style="padding:0 14px">`+byCourt(c).map(row).join('')+`</div>`).join('')}</div>`,{h:'92%'});
  };
}
// Log a query variants: wrap liveCard
if(opt==='l2'||opt==='l3'){
  const lc=window.liveCard;
  window.liveCard=function(o,st){let h=lc(o,st); if(!h||o.f!=='log')return h;
    if(opt==='l2') return `<div class="fx-nqh">New query</div>`+h;
    return h.replace('<div class="lcard">',`<div class="lcard"><div class="fx-nqc"><b>New query</b><span>Day 0</span></div>`);
  };
}

{const _f=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(o){return _f.call(this,Object.assign({},o||{},{preventScroll:true}));};}
function go(){
  S.tab=tab; S.stack=[]; S.overlay=null; paintScreen();
  if(ov==='birds') openOverlay({k:'birds'});
  else if(ov==='search') openOverlay({k:'search',q:P.get('q')||''});
  else if(ov==='log') flow('log',{});
  if(scroll){SC.scrollTop=scroll; setTimeout(()=>{S.away=false;TB.classList.remove('away');lastY=SC.scrollTop;},50);}
  if(ov==='log'&&opt==='l0'){const q=OV.querySelector('.fsheet')||OV.querySelector('.q');const f=OV.querySelector('.flow');if(f)f.scrollTop=9999;if(q)q.scrollTop=9999;const b=OV.querySelector('.fband');if(b)b.style.marginTop='-170px';}
  const sq=document.getElementById('sq'); if(sq) sq.blur();
}
setTimeout(go,60);
})();
