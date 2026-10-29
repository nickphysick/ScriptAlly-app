// ---------- icons (thin outline, 24 grid, 1.6 stroke) ----------
const sv=(p,sw=1.6)=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const IC={
  home:sv('<path d="M3.5 10.5 12 4l8.5 6.5V20a.5.5 0 0 1-.5.5h-5v-6h-6v6H4a.5.5 0 0 1-.5-.5z"/>'),
  queries:sv('<path d="M4 6h16M4 12h16M4 18h10"/>'),
  todo:sv('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="m8.5 12 2.4 2.4L15.5 9.8"/>'),
  agents:sv('<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 19.5c.6-3.4 3.2-5.2 6.5-5.2s5.9 1.8 6.5 5.2"/><path d="M16 5.2a3.3 3.3 0 0 1 0 6.6M18.5 14.6c1.7.7 2.7 2.4 3 4.9"/>'),
  plus:sv('<path d="M12 5v14M5 12h14"/>',2.2),
  search:sv('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',1.8),
  back:sv('<path d="M15 5 8 12l7 7"/>',2),
  close:sv('<path d="M6 6l12 12M18 6 6 18"/>',2),
  chev:sv('<path d="m9 5 7 7-7 7"/>',2),
  down:sv('<path d="m6 9 6 6 6-6"/>',2),
  more:sv('<circle cx="5.5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor"/>'),
  chat:sv('<path d="M5 18.5V7a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 19 7v6.5a2.5 2.5 0 0 1-2.5 2.5H9z"/><path d="M9 9.5h6M9 12.5h4"/>'),
  bell:sv('<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>'),
  eye:sv('<path d="M3 15c2-3.5 5.2-5.5 9-5.5s7 2 9 5.5"/><path d="M8 5.5 12 9l4-3.5"/><circle cx="12" cy="15" r="1.6"/>'),
  send:sv('<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>'),
  reply:sv('<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 6 6v1"/>'),
  person:sv('<circle cx="12" cy="8" r="4"/><path d="M4.5 20c.9-4 3.8-6 7.5-6s6.6 2 7.5 6"/>'),
  note:sv('<path d="M6 3.5h9l4 4V20a.5.5 0 0 1-.5.5h-12A.5.5 0 0 1 6 20z"/><path d="M14.5 3.5V8h4.5M9 12h6M9 15.5h4"/>'),
  doc:sv('<path d="M6.5 3.5h11v17h-11z"/><path d="M9.5 8h5M9.5 11.5h5M9.5 15h3"/>'),
  pages:sv('<path d="M8 3.5h11v14H8z"/><path d="M5 6.5v14h11"/>'),
  book:sv('<path d="M12 6.5C10 5 7.5 4.5 4 4.5v13c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2v-13c-3.5 0-6 .5-8 2z"/><path d="M12 6.5v13"/>'),
  box:sv('<path d="M3.5 8 12 4l8.5 4v8.5L12 20.5l-8.5-4z"/><path d="M3.5 8 12 12l8.5-4M12 12v8.5"/>'),
  chart:sv('<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>'),
  inbox:sv('<path d="M3.5 13.5 6 5h12l2.5 8.5V19a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5z"/><path d="M3.5 13.5H9a3 3 0 0 0 6 0h5.5"/>'),
  flame:sv('<path d="M12 21c-3.6 0-6-2.3-6-5.6 0-3.6 3-5.4 3.6-9.4 2.8 1.8 4 4.4 3.8 6.6 1-.6 1.6-1.6 1.8-2.8 1.6 1.4 2.8 3.4 2.8 5.6 0 3.3-2.4 5.6-6 5.6z"/>'),
  scope:sv('<circle cx="7" cy="14" r="4"/><circle cx="17" cy="14" r="4"/><path d="M11 13h2M5 10l2-5h3l1 4M19 10l-2-5h-3l-1 4"/>'),
  upload:sv('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v4.5a.5.5 0 0 0 .5.5h15a.5.5 0 0 0 .5-.5V15"/>'),
  help:sv('<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.4 2.4c-.6.3-1 .8-1 1.5v.4"/><circle cx="12" cy="16.8" r=".9" fill="currentColor"/>'),
  gear:sv('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>'),
  card:sv('<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>'),
  heart:sv('<path d="M12 19.5s-7.5-4.4-7.5-10A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.5c0 5.6-7.5 10-7.5 10z"/>'),
  thumbUp:sv('<path d="M7.5 10.5v9h-3v-9zM7.5 10.5l3.5-6.5a2 2 0 0 1 2.5 2.3l-.7 3.2h5.4a2 2 0 0 1 2 2.4l-1.2 6a2 2 0 0 1-2 1.6H7.5"/>'),
  thumbDown:sv('<path d="M16.5 13.5v-9h3v9zM16.5 13.5 13 20a2 2 0 0 1-2.5-2.3l.7-3.2H5.8a2 2 0 0 1-2-2.4l1.2-6a2 2 0 0 1 2-1.6h9.5"/>'),
  bulb:sv('<path d="M9 17.5h6M10 20.5h4M12 3.5a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1v.5h6v-.5c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3.5z"/>'),
  check:sv('<path d="m5 12.5 4.5 4.5L19 7.5"/>',2.4),
  clock:sv('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  calendar:sv('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'),
  globe:sv('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5s-1.1 6.1-3.5 8.5c-2.4-2.4-3.5-5.2-3.5-8.5S9.6 5.9 12 3.5z"/>'),
  mail:sv('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 6.5 8 6.5 8-6.5"/>'),
  shield:sv('<path d="M12 3.5 19 6v6c0 4.2-3 7.3-7 8.5-4-1.2-7-4.3-7-8.5V6z"/>'),
  sliders:sv('<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'),
  data:sv('<ellipse cx="12" cy="6" rx="7.5" ry="2.8"/><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8"/>'),
  pin:sv('<path d="M9 3.5h6l-1 6 3 3H7l3-3zM12 12.5v8"/>'),
  later:sv('<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5V13l2.5 1.5M9 3h6"/>'),
  closeq:sv('<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>'),
  edit:sv('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>'),
  verified:sv('<path d="m12 3 2.3 1.7 2.8-.2.9 2.7 2.3 1.6-.9 2.7.9 2.7-2.3 1.6-.9 2.7-2.8-.2L12 21l-2.3-1.7-2.8.2-.9-2.7-2.3-1.6.9-2.7-.9-2.7 2.3-1.6.9-2.7 2.8.2z"/><path d="m8.8 12.2 2.2 2.2 4.2-4.4"/>'),
  share:sv('<path d="M12 4v11M7.5 8.5 12 4l4.5 4.5"/><path d="M5 13v6.5a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5V13"/>'),
  sort:sv('<path d="M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5"/>'),
  signout:sv('<path d="M10 4.5H5.5a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1H10M15 8l4 4-4 4M19 12H9.5"/>'),
};

// ---------- status glyphs (the app's StatusDot set) ----------
const ST={
  queried:{w:'Queried',ring:'solid',c:'none',court:'agent'},
  preq:{w:'Partial requested',ring:'dashed',c:'half',court:'you'},
  psent:{w:'Partial sent',ring:'solid',c:'half',court:'agent'},
  freq:{w:'Full requested',ring:'dashed',c:'full',court:'you'},
  fsent:{w:'Full sent',ring:'solid',c:'full',court:'agent'},
  rr:{w:'Revise & resubmit',ring:'dashed',c:'none',court:'you'},
  offer:{w:'Offer',doc:1,court:'you'},
  rejected:{w:'Passed',ring:'solid',c:'bar',court:'closed'},
  noresp:{w:'No response',ring:'solid',c:'bar',court:'closed'},
  withdrawn:{w:'Withdrawn',ring:'solid',c:'bar',court:'closed'},
};
function glyph(k,size=20,col='currentColor'){
  const s=ST[k]; let inner='';
  if(s.doc) inner=`<path d="M7 3.5h7l4 4V20.5H7z" stroke-linejoin="round"/><path d="M10 12h5M10 15.5h5" stroke-linecap="round"/>`;
  else{
    inner=`<circle cx="12" cy="12" r="10" ${s.ring==='dashed'?'stroke-dasharray="6 4"':''}/>`;
    if(s.c==='half') inner+=`<path d="M12 12L12 5.5A6.5 6.5 0 0 1 12 18.5Z" fill="${col}" stroke="none"/>`;
    if(s.c==='full') inner+=`<circle cx="12" cy="12" r="6.5" fill="${col}" stroke="none"/>`;
    if(s.c==='bar') inner+=`<path d="M7.5 12h9" stroke-linecap="round"/>`;
  }
  return `<svg class="sd" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${col}" stroke-width="1.7" role="img" aria-label="${s.w}">${inner}</svg>`;
}
const COURT={you:{w:'With you',bg:'var(--st-pink)',fg:'#5a3027'},agent:{w:'With the agent',bg:'var(--st-sand)',fg:'#5d4b2f'},quiet:{w:'Gone quiet',bg:'var(--st-grey)',fg:'#4f4943'},closed:{w:'Closed',bg:'var(--st-grey)',fg:'#4f4943'},offer:{w:'Offer',bg:'var(--st-slate)',fg:'#2f4258'}};
const stFill=k=>{const s=ST[k];if(k==='offer')return 'var(--st-slate)';if(s.court==='you')return 'var(--st-pink)';if(s.court==='closed')return 'var(--st-grey)';if(k==='psent'||k==='fsent')return 'var(--st-sage)';return 'var(--st-sand)';};
const stLabel=k=>`<span class="st">${glyph(k,18)}${ST[k].w}</span>`;
const stPill=k=>`<span class="stp" style="background:${stFill(k)}">${glyph(k,18)}${ST[k].w}</span>`;

// ---------- sample campaign (examples, not real data) ----------
const ME={first:'Alex',name:'Alex Morgan',ini:'AM'};
const BOOK={title:'The Salt Road',cat:'Adult · Literary fiction',words:'94,000 words',since:'6 Sep 2026'};
const PKG={
  std:{n:'Standard UK',items:['Letter v3','Synopsis','First 3 chapters']},
  short:{n:'Letter + 10 pages',items:['Letter v3','First 10 pages']},
  full:{n:'Full manuscript',items:['Full manuscript']},
};
let QUERIES=[
 {id:'q1',name:'Eleanor Whitfield',agency:'Greenfield Literary',st:'freq',day:54,sent:'5 Sep',how:'by email',pkg:'std',next:'Send the full by 12 Nov',mv:1,
   tl:[['queried','Query sent','5 Sep',['Letter v3','Synopsis','First 3 chapters']],['preq','Partial requested','18 Sep',['First 50 pages']],['psent','Partial sent','20 Sep',['First 50 pages']],['nudge','You nudged Eleanor','14 Oct',['Reminder in 2 weeks']],['freq','Full requested','27 Oct',['Full manuscript']]]},
 {id:'q2',name:'Jonah Pike',agency:'Saltmarsh Books',st:'preq',day:31,sent:'28 Sep',how:'via their form',pkg:'short',next:'Send the first 3 chapters',mv:1,
   tl:[['queried','Query sent','28 Sep',['Letter v3','First 10 pages']],['preq','Partial requested','24 Oct',['First 3 chapters']]]},
 {id:'q3',name:'Marcus Reed',agency:'Bloomsbury Quill',st:'psent',day:47,sent:'12 Sep',how:'by email',pkg:'std',next:'Reply expected by 12 Nov',
   tl:[['queried','Query sent','12 Sep',['Letter v3','Synopsis','First 3 chapters']],['preq','Partial requested','2 Oct',['First 100 pages']],['psent','Partial sent','4 Oct',['First 100 pages']]]},
 {id:'q4',name:'Hugo Mayne',agency:'Larkspur Literary',st:'fsent',day:61,sent:'29 Aug',how:'by email',pkg:'std',next:'Nudge from 6 Nov',
   tl:[['queried','Query sent','29 Aug',['Letter v3','Synopsis','First 3 chapters']],['freq','Full requested','19 Sep',['Full manuscript']],['fsent','Full sent','21 Sep',['Full manuscript']]]},
 {id:'q5',name:'Priya Anand',agency:'Harbour Lane',st:'queried',day:21,sent:'8 Oct',how:'by email',pkg:'std',next:'Reply window ends 31 Dec',tl:[['queried','Query sent','8 Oct',['Letter v3','Synopsis','First 3 chapters']]]},
 {id:'q6',name:'Sofia Lind',agency:'Wren & Fable',st:'queried',day:5,sent:'24 Oct',how:'via their form',pkg:'short',next:'Reply window ends 16 Jan',tl:[['queried','Query sent','24 Oct',['Letter v3','First 10 pages']]]},
 {id:'q7',name:'Imogen Hart',agency:'Calder & Rowe',st:'queried',day:12,sent:'17 Oct',how:'by email',pkg:'std',next:'Add their reply window',tl:[['queried','Query sent','17 Oct',['Letter v3','Synopsis','First 3 chapters']]]},
 {id:'q8',name:'Leo Marsh',agency:'Kestrel Literary',st:'psent',day:40,sent:'19 Sep',how:'by email',pkg:'std',next:'Reply expected by 20 Dec',tl:[['queried','Query sent','19 Sep',['Letter v3','Synopsis','First 3 chapters']],['preq','Partial requested','10 Oct',['First 3 chapters']],['psent','Partial sent','11 Oct',['First 3 chapters']]]},
 {id:'q9',name:'Tom Okafor',agency:'Northgate Agency',st:'queried',day:98,quiet:1,sent:'23 Jul',how:'by email',pkg:'std',next:'Consider closing',tl:[['queried','Query sent','23 Jul',['Letter v2','Synopsis','First 3 chapters']]]},
 {id:'q10',name:'Ada Brennan',agency:'Coldharbour Agency',st:'queried',day:77,quiet:1,sent:'13 Aug',how:'by email',pkg:'std',next:'Nudge today',tl:[['queried','Query sent','13 Aug',['Letter v2','Synopsis','First 3 chapters']]]},
 {id:'q11',name:'Maya Lowe',agency:'Penrose Agency',st:'queried',day:70,quiet:1,sent:'20 Aug',how:'via their form',pkg:'short',next:'Their window ended 15 Oct',tl:[['queried','Query sent','20 Aug',['Letter v2','First 10 pages']]]},
 {id:'q12',name:'Ravi Desai',agency:'Mercer Literary',st:'rejected',day:64,sent:'26 Aug',how:'by email',pkg:'std',closed:'Passed on 22 Oct',tl:[['queried','Query sent','26 Aug',['Letter v2','Synopsis','First 3 chapters']],['rejected','Ravi passed','22 Oct',[]]]},
 {id:'q13',name:'Nina Shah',agency:'Ashdown Agency',st:'rejected',day:50,sent:'9 Sep',how:'by email',pkg:'std',closed:'Passed on the partial, 15 Oct',tl:[['queried','Query sent','9 Sep',['Letter v3','Synopsis','First 3 chapters']],['preq','Partial requested','22 Sep',['First 50 pages']],['psent','Partial sent','23 Sep',['First 50 pages']],['rejected','Nina passed','15 Oct',[]]]},
 {id:'q14',name:'Clara Benn',agency:'Tidewater Agency',st:'noresp',day:110,sent:'11 Jul',how:'by email',pkg:'std',closed:'Closed, no response, 10 Oct',tl:[['queried','Query sent','11 Jul',['Letter v1','Synopsis','First 3 chapters']],['noresp','You closed it','10 Oct',[]]]},
 {id:'q15',name:'Oliver Grant',agency:'Fairhaven Literary',st:'rejected',day:40,sent:'18 Jul',how:'via their form',pkg:'short',closed:'Passed on 27 Aug',tl:[['queried','Query sent','18 Jul',['Letter v1','First 10 pages']],['rejected','Oliver passed','27 Aug',[]]]},
 {id:'q16',name:'Ruth Abbot',agency:'Quayside Agency',st:'rejected',day:9,sent:'2 Aug',how:'by email',pkg:'std',closed:'Passed on 11 Aug',tl:[['queried','Query sent','2 Aug',['Letter v1','Synopsis','First 3 chapters']],['rejected','Ruth passed','11 Aug',[]]]},
];
const courtOf=q=>{const s=ST[q.st];if(s.court==='closed')return 'closed';if(q.quiet)return 'quiet';return s.court;};
const AGENTS_EXTRA=[
 {id:'a1',name:'Hannah Cole',agency:'Fernhill Agency',looking:'Literary fiction, book club, coastal settings',how:'Email · letter, synopsis, first 3 chapters',reply:'Usually 6–8 weeks'},
 {id:'a2',name:'Felix Ward',agency:'Ashgrove & Vale',looking:'Upmarket fiction, historical',how:'Online form · letter, first 10 pages',reply:'Usually 12 weeks'},
 {id:'a3',name:'Grace Okoro',agency:'Linden Literary',looking:'Literary fiction, debut voices',how:'Email · letter, synopsis, first 50 pages',reply:'Usually 8 weeks'},
 {id:'a4',name:'Isla Brook',agency:'Brook & Heron',looking:'Book club, family sagas',how:'Email · letter, first 3 chapters',reply:'No reply means no'},
 {id:'a5',name:'Sam Holt',agency:'Northlight Agency',looking:'Crime, literary crime',how:'Online form · letter, synopsis, 10,000 words',reply:'Usually 10 weeks'},
];
const SCOUT=[
 {name:'Rosa Calder',agency:'Calder & Lane',looking:'Literary fiction with a strong sense of place',open:'Open to submissions',tags:['Adult','Literary']},
 {name:'Daniel Frost',agency:'Frost Literary',looking:'Debut literary and book club fiction',open:'Open until 30 Nov',tags:['Adult','Book club']},
 {name:'Amira Khan',agency:'Northlight Agency',looking:'Quiet, character-led novels',open:'Open to submissions',tags:['Adult','Literary']},
];
let TASKS=[
 {id:'t1',grp:'earlier',kind:'send',q:'q2',t:'Send Jonah the first 3 chapters',s:'Saltmarsh Books · requested 24 Oct'},
 {id:'t2',grp:'earlier',kind:'close',q:'q9',t:'Close your query to Tom Okafor?',s:'Northgate Agency · 14 weeks, no reply'},
 {id:'t3',grp:'today',kind:'send',q:'q1',t:'Send Eleanor the full',s:'Greenfield Literary · requested 27 Oct'},
 {id:'t4',grp:'today',kind:'nudge',q:'q10',t:'Nudge Ada Brennan',s:'Coldharbour Agency · queried 13 Aug'},
 {id:'t5',grp:'today',kind:'own',t:'Research five more agents',s:'Your task'},
 {id:'t6',grp:'soon',kind:'nudge',q:'q4',t:'Nudge Hugo Mayne',s:'Fri 6 Nov · Larkspur Literary'},
 {id:'t7',grp:'soon',kind:'own',t:'Tighten synopsis to one page',s:'Sat 7 Nov · Your task'},
 {id:'t8',grp:'house',kind:'tidy',q:'q7',t:'Add Imogen’s reply window',s:'Calder & Rowe · so we can remind you'},
];
const NOTES=[
 {c:'var(--st-pink)',t:'Eleanor mentioned she loved the lighthouse chapter. Keep it in the opening 50.',d:'27 Oct',r:-2},
 {c:'var(--st-sand)',t:'Ask the writing group about comps for book club readers.',d:'21 Oct',r:1.5},
 {c:'var(--st-slate)',t:'Harbour Lane reopens to submissions in January.',d:'15 Oct',r:2},
 {c:'#fff',t:'Synopsis: cut the subplot with the ferry.',d:'9 Oct',r:-1.2},
];
const FEED=[
 ['freq','Eleanor asked for the full','2 days ago'],
 ['queried','You queried Sofia Lind','5 days ago'],
 ['preq','Jonah asked for the first 3 chapters','5 days ago'],
 ['rejected','Ravi Desai passed','1 week ago'],
];
