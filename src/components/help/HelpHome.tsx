/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1, Part B — the home: search first, the writer's page guides as cards, the six areas, the rail.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { WHATS_NEW, markWhatsNewSeen } from "../../lib/helpArticles";
import { GUIDE_PAGES, guideCard, type GuideCard } from "../../lib/pageChecklist";
import { readLearned, readSkipped, requestGuideOpen, restartGuideLocal, setGuidesOff, useGuidesOff } from "../../lib/guideHub";
import { lastRouteOutsideHelp } from "../../lib/routeTrail";
import { openFeedback } from "../../lib/feedbackStore";
import { HELP_ARTICLE_LIST } from "../../content/help/articles";
import { HELP_AREAS, readTime, type HelpArticle, type HelpAreaId } from "../../content/help/model";
import { searchHelp, type HelpHit } from "../../content/help/search";
import { StatusKeyList, askNick, longDate, shortDate, useGuideFacts } from "./helpShared";

const CHIPS: readonly { label: string; q: string }[] = [
  { label: "Partial requested", q: "partial" },
  { label: "Import a spreadsheet", q: "import" },
  { label: "Pin the list", q: "pin" },
  { label: "List health", q: "health" },
  { label: "When to nudge", q: "nudge" },
];

function HelpSearch({ inputRef }: { inputRef: React.RefObject<HTMLInputElement | null> }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [k, setK] = useState(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const hits: HelpHit[] = useMemo(() => searchHelp(q), [q]);
  const go = (h: HelpHit) => { setOpen(false); navigate(`/help/${h.slug}`); };

  useEffect(() => {
    const down = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("pointerdown", down);
    return () => window.removeEventListener("pointerdown", down);
  }, []);

  const fill = (v: string) => { setQ(v); setK(-1); setOpen(true); inputRef.current?.focus(); };
  const term = q.trim();
  const mark = (title: string) => {
    const i = title.toLowerCase().indexOf(term.toLowerCase());
    if (!term || i < 0) return title;
    return <>{title.slice(0, i)}<mark>{title.slice(i, i + term.length)}</mark>{title.slice(i + term.length)}</>;
  };

  return (
    <>
      <div className="hc-search" ref={boxRef} data-hc="search">
        <span className="hc-sglyph" aria-hidden="true">⌕</span>
        <input ref={inputRef} type="search" value={q} aria-label="Search help" autoComplete="off" data-hc="search-input"
          placeholder="Try 'partial requested' or 'import a spreadsheet'"
          role="combobox" aria-expanded={open && !!term} aria-controls="hc-results"
          aria-activedescendant={k >= 0 ? `hc-res-${k}` : undefined}
          onChange={(e) => { setQ(e.target.value); setK(-1); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") { if (open && term) { e.stopPropagation(); setOpen(false); } return; }
            if (!hits.length) return;
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault(); setOpen(true);
              setK((x) => (x + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length);
            } else if (e.key === "Enter") {
              e.preventDefault(); go(hits[k >= 0 ? k : 0]);
            }
          }} />
        <kbd className="hc-kbd" aria-hidden="true">/</kbd>
        {open && term ? (
          <div className="hc-results" id="hc-results" role="listbox" data-hc="results">
            {hits.length ? hits.map((h, i) => (
              <button key={`${h.slug}-${h.title}`} id={`hc-res-${i}`} type="button" role="option" aria-selected={i === k}
                className={`hc-res${i === k ? " k" : ""}`} data-hc="result" onMouseEnter={() => setK(i)} onClick={() => go(h)}>
                <small>{h.eyebrow}</small>{mark(h.title)}
              </button>
            )) : (
              <div className="hc-nores" data-hc="no-results">
                Nothing matches "{term}". Try a status name or a page name, or{" "}
                <button type="button" className="hc-linkb" data-hc="ask-nick" onClick={() => { setOpen(false); askNick(term); }}><b>ask Nick</b></button>.
              </div>
            )}
          </div>
        ) : null}
      </div>
      <div className="hc-chips">
        <span className="hc-chiplab">People often ask:</span>
        {CHIPS.map((c) => <button key={c.q} type="button" className="hc-chip" data-hc="chip" onClick={() => fill(c.q)}>{c.label}</button>)}
      </div>
    </>
  );
}

function GuideCardView({ c, cur, learned, onStart, onRestart }: {
  c: GuideCard; cur: boolean; learned: string | null; onStart: () => void; onRestart: () => void;
}) {
  return (
    <div className={`hc-gcard${c.finished ? " fin" : ""}${cur ? " cur" : ""}`} data-hc="guide-card" data-page={c.page}
      data-n={c.n} data-total={c.total}>
      {cur ? <span className="hc-here" data-hc="here">YOU WERE HERE</span> : null}
      <div className="hc-gtop">
        <div><div className="hc-eyb hc-eyb--mute">{c.group}</div><h3 className="hc-gname">{c.page}</h3></div>
        {c.finished ? <span className="hc-stamp">Learned</span> : <span className="hc-gn" data-hc="guide-n">{c.n}/{c.total}</span>}
      </div>
      <div className="hc-gsegs" aria-hidden="true">{c.segs.map((on, i) => <i key={i} className={on ? "on" : undefined} />)}</div>
      <p className="hc-gnext">
        {c.finished
          ? <>{learned ? `Learned ${longDate(learned)}.` : "Learned."} Everything on this page is yours.</>
          : c.n === 0
            ? <>Starts with: <b>{c.first}</b></>
            : <>Up next: <b>{c.next ?? c.first}</b></>}
      </p>
      <div className="hc-gacts">
        {c.finished ? null : (
          <button type="button" className="hc-bnav" data-hc="guide-start" onClick={onStart}>
            {c.n ? "Resume" : "Start"} on {c.page}
          </button>
        )}
        {c.finished || c.n > 0
          ? <button type="button" className="hc-bghost" data-hc="guide-restart" onClick={onRestart}>Restart</button>
          : null}
      </div>
    </div>
  );
}

function AreaCard({ id, articleDone }: { id: HelpAreaId; articleDone: (a: HelpArticle) => boolean }) {
  const navigate = useNavigate();
  const area = HELP_AREAS.find((a) => a.id === id)!;
  const list = HELP_ARTICLE_LIST.filter((a) => a.area === id);
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, 5);
  return (
    <div className="hc-area" data-hc="area" data-area={id}>
      <div className="hc-eyb hc-eyb--mute">{area.eyebrow}</div>
      <h3 className="hc-ah">{area.heading}</h3>
      <ul>
        {shown.map((a) => (
          <li key={a.slug}>
            <button type="button" data-hc="area-article" data-slug={a.slug} onClick={() => navigate(`/help/${a.slug}`)}>
              <span className="hc-tk">{articleDone(a) ? "✓" : ""}</span>
              <span className="hc-at">{a.title}</span>
              <span className="hc-lt">{readTime(a)}</span>
            </button>
          </li>
        ))}
      </ul>
      {list.length > 5 && !all
        ? <button type="button" className="hc-all" data-hc="area-all" onClick={() => setAll(true)}>All {list.length} articles</button>
        : null}
    </div>
  );
}

export function HelpHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { db, user, counts, articleDone } = useGuideFacts();
  const off = useGuidesOff();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const newsRef = useRef<HTMLDivElement | null>(null);
  const [said, setSaid] = useState("");
  const [, bump] = useState(0);

  /* "/" anywhere on the page focuses the search (not while typing somewhere else) */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  /* /help#whats-new: scroll to it; /help#search: focus the search. What's new is seen when it is opened by its link or
     scrolled into view. */
  useEffect(() => {
    if (location.hash === "#whats-new") {
      markWhatsNewSeen();
      requestAnimationFrame(() => newsRef.current?.scrollIntoView({ block: "center" }));
    } else if (location.hash === "#search") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [location.hash]);
  useEffect(() => {
    const el = newsRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { markWhatsNewSeen(); io.disconnect(); } });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const from = (location.state as { from?: string } | null)?.from ?? lastRouteOutsideHelp();
  const cards = GUIDE_PAGES.map((g) => ({ g, c: guideCard(g, user, counts, readSkipped(g.page)) }));
  const steps = cards.reduce((t, x) => t + x.c.n, 0);
  const total = cards.reduce((t, x) => t + x.c.total, 0);
  const learned = cards.filter((x) => x.c.finished).length;

  const start = (page: string, route: string) => { navigate(route); requestGuideOpen(page); };
  const restart = (page: string) => {
    const g = GUIDE_PAGES.find((x) => x.page === page)!;
    restartGuideLocal(page);
    void db.updateUserPaths(g.restart).catch(() => { /* the next visit still shows it (the local flag) */ });
    setSaid(""); window.setTimeout(() => setSaid(`${page} guide restarted`), 30);
    bump((n) => n + 1);
  };

  return (
    <div className="hc" data-hc="home">
      <div className="hc-top">
        <div>
          <div className="hc-eyb">Help Centre</div>
          <h1 className="hc-h1">How can we help?</h1>
          <p className="hc-sub">Guides for every page, short answers, and a key to every status. Search, or pick up a guide where you left it.</p>
          <HelpSearch inputRef={inputRef} />
        </div>
        <div className="hc-artslot" aria-hidden="true">Illustration slot<br />The Archivist with a lamp, reading the manual</div>
      </div>

      <div className="hc-sech">
        <h2 className="hc-h2">Your guides</h2>
        <span className="hc-meta" data-hc="guides-meta"><b>{steps}/{total}</b> steps · {learned} of {cards.length} pages learned</span>
        <span className="hc-sp" />
        <button type="button" className="hc-linkb" data-hc="guides-off" onClick={() => setGuidesOff(!off)}>
          {off ? "Turn page guides back on" : "Turn off page guides"}
        </button>
      </div>
      <div className="hc-guides" data-hc="guides">
        {cards.map(({ g, c }) => (
          <GuideCardView key={g.page} c={c} cur={!!from && from === g.route} learned={readLearned(g.page)}
            onStart={() => start(g.page, g.route)} onRestart={() => restart(g.page)} />
        ))}
      </div>

      <div className="hc-cols">
        <div>
          <div className="hc-sech"><h2 className="hc-h2">Browse by part of the app</h2></div>
          <div className="hc-areas">
            {HELP_AREAS.map((a) => <AreaCard key={a.id} id={a.id} articleDone={articleDone} />)}
          </div>
        </div>
        <aside className="hc-rail">
          <div className="hc-rcard">
            <h3 className="hc-rh">Status key</h3>
            <StatusKeyList />
          </div>
          <div className="hc-rcard" id="whats-new" ref={newsRef} data-hc="whats-new">
            <h3 className="hc-rh">What's new</h3>
            <ul className="hc-new">
              {WHATS_NEW.slice(0, 3).map((e) => <li key={e.id}><span className="hc-d">{shortDate(e.date)}</span>{e.title}</li>)}
            </ul>
          </div>
          <div className="hc-rcard ink" data-hc="stuck">
            <h3 className="hc-rh">Still stuck?</h3>
            <p>QueryHawk is in beta and every message reaches the founder. Replies usually within a day.</p>
            <button type="button" className="hc-bw" data-hc="give-feedback" onClick={() => openFeedback()}>Give feedback</button>
          </div>
        </aside>
      </div>
      <div className="hc-live" aria-live="polite">{said}</div>
    </div>
  );
}

