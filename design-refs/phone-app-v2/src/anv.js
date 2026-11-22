// ---------- Analytics variants ----------
let ANT='B', ANC='B';
PAGES.analytics=function(){
  const fun=[['queried','Queried',16],['psent','Partial',6],['fsent','Full',3],['offer','Offer',0]];
  const weeks=[1,0,2,1,0,3,2,1,0,2,1,1,0,2];
  let top='';
  if(ANT==='B'){
    top=`<div class="pband"><div class="bandrow"><button class="ring" data-act="back" aria-label="Back">${IC.back}</button><span style="flex:1"></span>${ringB(IC.search,'search','Search')}<button class="avring" data-act="menu" aria-label="Open menu">${ME.ini}</button></div>
      <div class="bt" style="margin-top:14px">Analytics</div>
      <div style="display:flex;gap:6px;margin-top:16px">${['All time','Last 90 days'].map((w,i)=>`<button style="height:32px;padding:0 13px;border-radius:999px;font-size:13.5px;font-weight:600;${i?'background:rgba(255,255,255,.12);color:#fff':'background:#fff;color:var(--navy)'}">${w}</button>`).join('')}</div>
      <div style="display:flex;align-items:baseline;gap:10px;margin-top:16px"><span class="num" style="font-size:54px;line-height:.9">50%</span><span style="font-size:16px;color:rgba(255,255,255,.75)">heard back</span></div>
      <div style="font-size:14px;color:rgba(255,255,255,.75);margin-top:8px">8 replies from 16 queries · median wait 5 weeks</div></div>`;
  } else {
    const stat=(n,u,c,dark)=>`<div class="card" style="width:200px;${dark?'background:var(--navy);color:#fff':''}"><div class="num" style="font-size:40px;line-height:1">${n}</div><div style="font-size:14.5px;margin-top:6px">${u}</div><div class="sub" style="margin-top:10px">${c}</div></div>`;
    top=bk('Analytics')+`<div class="big">Analytics</div><div class="seg"><button aria-pressed="true">All time</button><button>Last 90 days</button></div>`;
    top+=ANT==='C'?`<div class="grid2">${[['16','queries sent','4 in the last 30 days'],['50%','heard back','8 of 16'],['5 wks','median reply','From 8 replies'],['4','requests','First on 18 Sep']].map(([n,u,c])=>`<div class="mini" style="padding:14px"><span class="num" style="font-size:30px">${n}</span><span class="sub" style="font-size:13.5px;color:var(--ink)">${u}</span><span class="sub">${c}</span></div>`).join('')}</div>`
      :`<div class="hscroll">${stat(16,'queries sent','4 in the last 30 days',1)}${stat('50%','heard back','8 of 16 queries')}${stat('5 wks','median reply','From 8 replies')}${stat('4','requests','First on 18 Sep')}</div>`;
  }
  let body='';
  if(ANC==='B'){
    body=`<div class="card" style="${ANT==='B'?'':'margin-top:12px'}"><div class="h2" style="font-size:17px">Where your queries got to</div>
      <div class="ftrack">${fun.map(([g,w,n],i)=>`<div class="fst"><span class="fd ${n?'on':''}">${glyph(g,20,n?'#fff':'currentColor')}</span><b class="num">${n||'–'}</b><span>${w}</span></div>`).join('<i class="fl"></i>')}</div>
      <p class="sub" style="margin:12px 0 0">6 of 16 got a request to read more. 3 went to a full read.</p></div>
      <div class="card" style="margin-top:12px"><div class="h2" style="font-size:17px">Queries sent, week by week</div><p class="sub" style="margin:4px 0 12px">The last 14 weeks</p>
      <div style="display:flex;align-items:flex-end;gap:5px;height:90px">${weeks.map((w,i)=>`<i style="flex:1;height:${w?w*28:3}px;border-radius:5px;background:${i===13?'var(--pink)':w?'var(--navy)':'var(--fill)'}"></i>`).join('')}</div>
      <div style="display:flex;justify-content:space-between;margin-top:8px" class="sub"><span>21 Jul</span><span>This week</span></div></div>
      <div class="shd"><span class="h2">Firsts and records</span></div>
      <div class="hscroll">${[['First request','18 Sep','Jonah Pike'],['Fastest reply','9 days','Ruth Abbot'],['Longest wait','98 days','Tom Okafor'],['Busiest week','3 queries','w/c 25 Aug']].map(([w,n,s])=>`<div class="card" style="width:150px"><div class="sub">${w}</div><div class="num" style="font-size:22px;margin-top:6px">${n}</div><div class="sub" style="margin-top:4px">${s}</div></div>`).join('')}</div>`;
  } else {
    body=`<div class="card" style="margin-top:12px"><div class="h2" style="font-size:17px">Where your queries got to</div>
     <div style="display:flex;flex-direction:column;gap:12px;margin-top:14px">${[['Queried',16,'queried'],['Partial or full requested',6,'preq'],['Full requested',3,'freq'],['Offer',0,'offer']].map(([w,n,g])=>`<div><div style="display:flex;justify-content:space-between;font-size:14px;margin-bottom:6px"><span style="display:flex;gap:6px;align-items:center">${glyph(g,16)}${w}</span><b class="num">${n?n:'Not yet'}</b></div><div class="bar-h"><i style="width:${n/16*100}%"></i></div></div>`).join('')}</div></div>
     <div class="card" style="margin-top:12px"><div class="h2" style="font-size:17px">Queries sent, week by week</div><p class="sub" style="margin:4px 0 12px">The last 14 weeks</p>
     <div style="display:flex;align-items:flex-end;gap:5px;height:80px">${weeks.map((w,i)=>`<div style="flex:1;display:flex;flex-direction:column-reverse;gap:3px;height:100%">${Array.from({length:w}).map(()=>`<i style="display:block;height:18px;border-radius:4px;background:${i===13?'var(--pink)':'var(--navy)'}"></i>`).join('')||'<i style="display:block;height:4px;border-radius:2px;background:var(--fill)"></i>'}</div>`).join('')}</div></div>
     <div class="card" style="margin-top:12px"><div class="h2" style="font-size:17px">Firsts and records</div><div style="font-size:14.5px;line-height:1.7;margin-top:6px">First request · 18 Sep<br>Fastest reply · 9 days<br>Longest wait so far · 98 days</div></div>`;
  }
  return top+body+`<div class="card" style="margin-top:12px;background:var(--page);box-shadow:none"><b style="font-size:15px">Reading the numbers</b><p class="sub" style="font-size:14px;line-height:1.45;margin:6px 0 0">Medians, not averages, so one slow reply doesn’t skew the picture. Small numbers say how many queries they come from.</p></div>`;
};
