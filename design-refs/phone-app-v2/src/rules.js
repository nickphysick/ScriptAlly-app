function renderRules(){
  const sw=(c,n,r)=>`<div class="sw-c"><i style="background:${c};${c==='#ffffff'?'box-shadow:inset 0 -1px 0 var(--rule)':''}"></i><div><b>${n}</b>${r}</div></div>`;
  const glyphs=Object.keys(ST).map(k=>`<div style="display:flex;align-items:center;gap:10px;min-width:210px">${disc(k,40)}<span><b style="font-size:14.5px">${ST[k].w}</b><span class="sub" style="display:block">${{you:'With you',agent:'With the agent',closed:'Closed'}[ST[k].court]}</span></span></div>`).join('');
  const icons=['home','queries','todo','agents','search','chat','eye','bell','send','reply','doc','pages','book','box','chart','inbox','flame','scope','upload','help','gear','card','calendar','clock','globe','mail','later','closeq','edit','verified','share','thumbUp','bulb'].map(k=>`<span title="${k}" style="width:46px;height:46px;border-radius:12px;background:var(--page);display:grid;place-items:center">${IC[k].replace('<svg','<svg style="width:22px;height:22px"')}</span>`).join('');
  document.getElementById('rules').innerHTML=`
  <h2 style="margin-top:12px">The mobile rulebook</h2>
  <p>This is the single reference for the QueryHawk phone app. It records every pick you made between 28 and 29 October, the rules I’ve set so the screens work as one app, and what is left for later. The prototype follows it exactly. Anything here can be changed with a sentence.</p>

  <h2>Your picks, by area</h2>
  <table class="picks">${[
    ['Shell','Floating tab bar that tucks away on scroll · Home, Queries, +, To-do, Agents · everything else in a menu behind your initials'],
    ['Style','Pill buttons · white cards with a soft shadow · Special Elite titles, phone font for body · navy-led · your status glyphs · thin outline icons · standard corners and density · light only at launch'],
    ['Accent','Blush, the desktop’s own · no green, no harsh red'],
    ['Header','Navy band holding each page’s key figure · the book as a chip under the page name · warm off-white page'],
    ['Home','Hero chart in the band with a Strava-style switch · split-bar stat card with a closed-queries line · Up next as a white card with a blush strip · founding writer card headed “[name] · Founding writer”'],
    ['Queries','Rows lead with the status glyph · chip filters with an All chip · counts that ignore filters · Birds-eye view from the eye icon'],
    ['The + sheet','Two big rows (I sent a query, An agent replied) with three small pills beneath'],
    ['Query sheet','Landing-page card header · one scrolling page · stage track, then the latest steps · Your next step pinned at the bottom'],
    ['Logging','One question per screen · answers as one list, no picture · answers-so-far chips · agent search first · the query card builds itself in the navy band · a check card you can tap to change'],
    ['Confirmations','Snackbar: one navy pill with a small picture, one line and Undo'],
    ['To-do','This-week strip in the band · tasks grouped by when · glyph and a verb button (Send, Nudge, Decide)'],
    ['Corkboard','Pinned notes, slightly tilted, in your note colours'],
    ['Agents','Glyph rows with useful facts · Your list / Discover switch · Discover cards like the query card · agent profile with a navy header of key facts'],
    ['Menu','Tiles with live numbers · menu pages open with the navy band, like the tabs'],
    ['Brand','App icon: the hawk on navy · launch screen: navy with the hawk and name · no logo inside the app'],
    ['Responses','Requests as mini query cards · the Wall of no as a real wall of pinned paper cards'],
    ['Manuscript','The book in the band as a proper little paperback cover · one scrolling page · packages as cards with results overlaid'],
    ['Analytics','Headline figure in the band (“50% heard back”) with the same time switch · stage track, weekly columns and record cards'],
    ['Streaks &amp; goals','Weekly goal ring · streak dots by week · milestone badges in a grid, greyed until earned · founding writer ranks'],
    ['First run','Home: the real page faded behind “Let’s start tracking your campaign” and a Log your first query button, plus a getting-started card · Queries: a first-query card and a faded preview'],
    ['Celebrations','Navy screen with confetti, the query card and the news stamped across it in the typewriter face']
  ].map(([a,b])=>`<tr><th>${a}</th><td>${b}</td></tr>`).join('')}</table>

  <div class="adj"><h3>Where I adjusted your picks for quality</h3><ul>
    <li><b>Navy goes in the band, not everywhere.</b> Navy carries the band, primary buttons, selections, snackbars and celebrations. Cards stay white, so the screen doesn’t get heavy.</li>
    <li><b>Status glyphs always come with words.</b> On their own, the glyphs need learning. In rows they sit beside the status name. On cards and filters they sit in a disc of the status colour.</li>
    <li><b>Special Elite is for titles and numbers only, at 15px or more, always at weight 400.</b> The phone must never fake a bold version of it. Body text, buttons and lists use the phone’s own font.</li>
    <li><b>Pills are for buttons and chips only.</b> Cards, rows and sheets keep 14–24px corners. Pill-shaped cards look like toys.</li>
    <li><b>Illustrations are small spots.</b> Your artist’s pieces sit in a 48–96px circle rather than large and cropped. A dashed placeholder holds the slot where a piece isn’t ready.</li>
    <li><b>The + sits inside the floating tab bar.</b> When the sheet is open, the + turns into a close button, as in Instagram and Strava.</li>
  </ul></div>

  <h2>Structure</h2>
  <ul class="r">
    <li><b>Five tab slots: Home, Queries, +, To-do, Agents.</b> These are what writers open the app to do.</li>
    <li><b>The menu behind your initials</b> holds Responses, Analytics, Streaks &amp; goals, Manuscript, Discover, Import, Help, Settings, Notifications and Plan. Each tile shows its live number.</li>
    <li><b>The Corkboard lives inside To-do</b> as a second segment, as it does on desktop. The separate Calendar page stays retired.</li>
    <li><b>The book chip</b> sits in the band on every tab and opens the switcher, with “Add a manuscript: coming soon” during the beta.</li>
    <li><b>Search, feedback and your initials</b> are round buttons in every band. The founding card’s thumbs open the same feedback sheet.</li>
    <li><b>Status changes always go through a flow.</b> Swipes, ticks and “Mark sent” open one or two questions. Nothing changes a query in one tap, matching the desktop rule.</li>
  </ul>

  <h2>Header</h2><p>Every page starts in a navy band. On the tabs, the band holds the page name, the book chip and the page’s key figure: the hero chart on Home, the counts on Queries and Agents, and this week on To-do. Pages from the menu use the same band with a back arrow, and their figure goes in it (Manuscript’s cover, Analytics’ headline, the goal ring). The page then sits on a warm off-white sheet with rounded top corners, like Monzo, Revolut and Hargreaves Lansdown.</p>

  <h2>Colour</h2><p>The page is a warm off-white with white cards on it. Navy and blush are the only accents. Text on navy is always white, and text on blush is always black. There is no green and no red anywhere. The burgundy stamp on celebrations is the one exception, and it only ever appears there.</p>
  <div class="swatches">${sw('#f8f6f2','Page','App ground, sheets')}${sw('#ffffff','Card','Every card, rows on sheets')}${sw('#2a3a52','Navy','Band, primary pill, selected tab and chip, snackbar, celebration')}${sw('#e8c8bc','Blush','The +, swipe actions, badges, key buttons on navy')}${sw('#f5e6df','Blush wash','Up next strip, light highlights')}${sw('#1f2633','Ink','Text')}${sw('#6b6f78','Muted','Secondary text')}${sw('#ece7de','Fill','Secondary pills, tracks, tags')}</div>
  <p style="margin-top:16px">The five locked query fills only ever appear behind a status glyph or as a query card’s band.</p>
  <div class="swatches">${sw('#f7efe3','Sand','Queried')}${sw('#e0e5dd','Sage','Partial or full sent')}${sw('#f5e6df','Pink','Requested, R&amp;R')}${sw('#d7e0e8','Slate','Offer, Verified by the Scout')}${sw('#e4e1db','Grey','Closed')}</div>

  <h2>Type</h2><p>Special Elite, your app’s typewriter face, is used for page titles, card titles and numbers. The phone’s own font is used for everything people read or tap. The scale grows with the phone’s text-size setting.</p>
  <div class="demo" style="display:block">
    <div class="typerow"><span>Page title · 22</span><span style="font-family:var(--type);font-weight:400;font-size:22px">Queries</span></div>
    <div class="typerow"><span>Section · 18–19</span><span style="font-family:var(--type);font-weight:400;font-size:19px">Up next</span></div>
    <div class="typerow"><span>Hero number · 54</span><span class="num" style="font-size:54px;line-height:1">11</span></div>
    <div class="typerow"><span>Row name · 16 semibold</span><span style="font-size:16px;font-weight:600">Eleanor Whitfield</span></div>
    <div class="typerow"><span>Body · 15–15.5</span><span style="font-size:15.5px">Send the full by 12 Nov</span></div>
    <div class="typerow" style="border:0"><span>Secondary · 13</span><span class="sub">Greenfield Literary · queried 5 Sep</span></div>
  </div>

  <h2>Buttons, chips and controls</h2><p>Pills throughout, with one primary button per screen. Every target is at least 44px tall.</p>
  <div class="demo"><button class="btn pri">Log query</button><button class="btn pink">Your move</button><button class="btn sec">Website</button><button class="btn quiet">Later</button><button class="btn pri sm">Send</button></div>
  <div class="demo page"><div class="chips" style="margin:0;padding:0;flex-wrap:wrap"><button class="chip" aria-pressed="true">All <b>16</b></button><button class="chip">With you <b>2</b></button><button class="chip">With the agent <b>6</b></button></div><div class="seg" style="width:280px;margin:0"><button aria-pressed="true">Tasks</button><button>Corkboard</button></div><button class="toggle-sw" role="switch" aria-checked="true" aria-label="Example switch"></button></div>

  <h2>Cards and surfaces</h2><p>Cards are white, with a soft shadow and 14px corners. Accent colour goes on one part of a card, never the whole card. Up next gets its blush strip, and a query card gets its status band. Sheets have 24px top corners and pull up from the bottom. Rows sit on the page with hairlines between them, so lists stay dense.</p>

  <h2>Status glyphs</h2><p>These are your app’s own StatusDot set. The ring fills as a query goes deeper, and a dashed ring means the agent has asked something of you.</p>
  <div class="demo" style="gap:18px 26px">${glyphs}</div>

  <h2>Icons</h2><p>Thin outline icons, with a 1.6px stroke on a 24px grid. The selected tab gets a navy pill behind its icon.</p>
  <div class="demo" style="gap:8px">${icons}</div>

  <h2>Illustration and brand</h2>
  <ul class="r">
    <li>Illustrations sit in a round spot: 48px in rows, 56–64px on cards, 76px at the top of a flow question and 96px on a celebration sheet.</li>
    <li>Snackbars use a small placeholder picture until your artist’s spots are ready.</li>
    <li>Where the right piece doesn’t exist yet (the pointing talon, the hourglass, the courier map), a dashed placeholder holds the slot.</li>
    <li>Never the same illustration twice on one screen.</li>
    <li>The hawk-on-navy mark appears on the app icon and the launch screen only. Inside the app, the menu ends with a quiet sign-off: the hawk, the wordmark and “Beta · made in the UK”.</li>
  </ul>

  <h2>Screen by screen</h2>
  <ul class="r">
    <li><b>Home.</b> The band holds the hero chart with its Active / Sent / Replies / Requests switch and its time range. Below it come the split-bar stat card (with you, with the agent, gone quiet) with the closed-queries line at its foot, Up next, then the founding writer card.</li>
    <li><b>Queries.</b> The band holds “x sent · x active · x with you”, and those counts never change with the filters. Below it come the chips, then rows grouped by whose move it is. Each row shows the glyph, the agent and agency on the left, and the status and next date on the right. Swipe right for the next action in blush, or left for Close in navy.</li>
    <li><b>Query sheet.</b> Opens at two-thirds height and drags to full. It shows the landing-page card header, the stage track, the latest steps and the full timeline, with Your next step pinned at the bottom.</li>
    <li><b>Logging and responding.</b> The navy band shows the query card filling in as you answer. The question and answers sit on the sheet below. Single-choice answers move you on, and text uses Continue. The check card comes before anything is saved.</li>
    <li><b>To-do.</b> The band holds this week as a strip of days. Tasks are grouped by when they’re due, and each row has a verb button. The Corkboard segment shows pinned, slightly tilted notes and an Add a note card.</li>
    <li><b>Agents.</b> Your list / Discover switch. Rows show the glyph and useful facts. A profile on your list opens with a navy header of key facts. Discover cards carry a slate “Verified by the Scout” band, the wishlist and quick facts.</li>
    <li><b>Responses.</b> Requests appear as mini query cards. The Wall of no is a real wall of pinned paper cards, under a banner that’s informational, not a verdict.</li>
    <li><b>Manuscript.</b> The paperback cover sits in the band with the book’s details, followed by one scroll of materials and packages. The packages show their results overlaid.</li>
    <li><b>Analytics.</b> The headline sits in the band with the same time switch as Home. Below it come the stage track with a count at each stage, weekly columns and record cards to swipe.</li>
    <li><b>Streaks &amp; goals.</b> Shows the weekly goal ring, a streak of week dots with your best run, a badge grid for milestones (greyed until earned) and the founding writer ranks.</li>
    <li><b>First run.</b> Home shows the real page faded behind “Let’s start tracking your campaign”, a Log your first query button and an import link. The split bar is tagged Example, and the getting-started card has a Start button. Queries shows a first-query card with Log a query and Import a spreadsheet, then a faded preview of real rows.</li>
    <li><b>Celebrations.</b> For requests and offers only. A navy screen shows confetti, the query card, the news stamped across it, one line on what happens next and See your next step. Everything else gets a snackbar.</li>
    <li><b>Settings, Help and Import.</b> These use the navy page band with grouped white lists. They need no special treatment.</li>
  </ul>

  <h2>Behaviour</h2>
  <ul class="r">
    <li><b>The floating tab bar</b> hides as you scroll down and comes back when you scroll up. It is hidden on pages opened from the menu, which use a back arrow.</li>
    <li><b>Sheets</b> open at about two-thirds height and snap to full when dragged up. Dragging down past halfway, or tapping outside, closes them.</li>
    <li><b>Every save gets a snackbar with Undo.</b> Requests and offers get the celebration instead.</li>
    <li><b>Motion</b> uses one spring curve. The phone’s reduced-motion setting turns it all off, including confetti and the stamp.</li>
  </ul>

  <h2>Words</h2>
  <ul class="r"><li>Facts, never verdicts: no “overdue”, no “late”, no scores. “Gone quiet” and “Consider closing” are as strong as it gets.</li><li>UK spelling and UK publishing terms.</li><li>Agents by first name, never “he” or “she”.</li><li>Plain, warm and short. No lines that sound written by a machine (“Your campaign chart starts here” became “Let’s start tracking your campaign”).</li><li>No small uppercase labels above headings.</li><li>QueryHawk records and reminds. It never writes letters or nudges for the writer.</li><li>No greeting on working pages. Counts don’t change with filters.</li></ul>

  <h2>Not in this pass</h2>
  <ul class="r"><li>Dark mode, as you chose.</li><li>Every Settings section opened. Notifications shows the pattern.</li><li>Editing materials and building packages on the phone. They’re reachable and readable here, but I’d keep heavy editing on desktop for launch.</li><li>The public Wall of no share image.</li><li>Your artist’s final spot illustrations, in place of the placeholders.</li></ul>
  `;
}
renderRules();