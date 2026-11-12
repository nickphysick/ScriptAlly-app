/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Help centre home (non-workspace v1, Phase 7; ref: design-refs/help-centre-v1.html, the Redesign view). Search
 * answers in place of the page's middle; otherwise "For you right now" (the page guide you are part-way through) and
 * "Browse by subject". The rail: the Status key, New in QueryHawk, Still stuck?.
 *
 * ⚠️ PUBLISHED ARTICLES ONLY. Every list here reads `HELP_ARTICLE_LIST`, which holds no drafts, so a subject with no
 *    published article is not shown, and a "People often ask" chip that finds nothing is not offered.
 * ⚠️ SIGNED OUT, THIS PAGE IS IN THE PUBLIC SHELL: nothing here that needs an account is drawn (the guide card, the
 *    done ticks, "Everything that's changed"); "Tell us" and "Tell us what's missing" go to the Contact page instead
 *    of the feedback pop-up, which only the app shell mounts.
 * ⚠️ ONE FILLED BUTTON PER VIEW: "Carry on" on the home, "Tell us what's missing" on an empty search (which replaces
 *    the home's middle, so the two never show together). Everything else is `.ph-secondary` or a link.
 *
 * Built from: `.ph-primary` / `.ph-secondary` (shell/pageHeader.css), `StatusDot` (via `StatusKeyList`), the Help
 * Centre's own cards (helpCentre.css), the page-guide model (`guideCard`, `requestGuideOpen`).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { markWhatsNewSeen } from "../../lib/helpArticles";
import { GUIDE_PAGES, guideCard, type GuideCard } from "../../lib/pageChecklist";
import { readSkipped, requestGuideOpen, useGuidesOff } from "../../lib/guideHub";
import { openFeedback } from "../../lib/feedbackStore";
import { HELP_ARTICLE_LIST, articleBySlug } from "../../content/help/articles";
import { HELP_AREAS, readTime, type HelpArticle } from "../../content/help/model";
import { searchArticles } from "../../content/help/search";
import { RAIL_KEY, StatusKeyList, askNick, useGuideFacts } from "./helpShared";

/** The ref's words, in its order. */
export const HELP_HOME = {
  h1: "How can we help?",
  sub: "Short answers and step-by-step guides to QueryHawk.",
  searchLabel: "Search the Help centre",
  clear: "Clear search",
  ask: "People often ask:",
  forYou: "For you right now",
  carryOn: "Carry on",
  start: "Start",
  browse: "Browse by subject",
  hits: (n: number, q: string) => `${n} ${n === 1 ? "answer" : "answers"} for "${q}"`,
  none: (q: string) => `Nothing for "${q}" yet`,
  noneBody: "We haven't written that one. Tell us what you were looking for and we'll add it.",
  noneAct: "Tell us what's missing",
  keyH: "Status key",
  keyLink: "Every ring explained",
  newH: "New in QueryHawk",
  newLink: "Everything that's changed",
  stuckH: "Still stuck?",
  stuckBody: "Tell us and a person will reply within two working days.",
  stuckAct: "Tell us",
} as const;

/** "People often ask" — the ref's four. Each is offered only while it finds a published article. */
export const HELP_CHIPS = ["Partial requested", "Import a spreadsheet", "When to nudge", "Founder's code"] as const;

/** New in QueryHawk — as the ref shows it. */
export const HELP_NEWS: readonly { title: string; line: string }[] = [
  { title: "Agency names survive an import in capitals", line: "Fixed 6 Nov, after a founding writer's note" },
  { title: "Query letters has its own page", line: "Added 12 Nov" },
];

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** The guide the writer is part-way through, else the first not started; null when none has a next step. */
export function guideForNow(cards: readonly GuideCard[]): GuideCard | null {
  const open = cards.filter((c) => !c.finished && c.next);
  return open.find((c) => c.n > 0) ?? open[0] ?? null;
}

function ArticleLink({ a, done, onOpen }: { a: HelpArticle; done: boolean; onOpen: () => void }) {
  return (
    <button type="button" className="hc-alink" data-hc="area-article" data-slug={a.slug} onClick={onOpen}>
      <span className="hc-tk" aria-hidden="true">{done ? "✓" : ""}</span>
      <span className="hc-at">{a.title}</span>
      <span className="hc-lt">{readTime(a)}</span>
    </button>
  );
}

/** The page's middle while a search is typed: the answers, or the ref's empty state with its one filled button. */
export function SearchAnswers({ term, hits, onOpen, onTellMissing }: {
  term: string; hits: readonly HelpArticle[]; onOpen: (slug: string) => void; onTellMissing: () => void;
}) {
  return (
    <>
      <h2 className="hc-h2 hc-h2" aria-live="polite" data-hc="search-head">{hits.length ? HELP_HOME.hits(hits.length, term) : HELP_HOME.none(term)}</h2>
      {hits.length ? (
        <div className="hc-hits" data-hc="results">
          {hits.map((a) => (
            <button key={a.slug} type="button" className="hc-hit" data-hc="result" data-slug={a.slug} onClick={() => onOpen(a.slug)}>
              <b>{a.title}</b>
              <span>{a.lede}</span>
              <small>{HELP_AREAS.find((x) => x.id === a.area)?.name} · {readTime(a)}</small>
            </button>
          ))}
        </div>
      ) : (
        <div className="hc-rcard hc-none" data-hc="no-results">
          <p>{HELP_HOME.noneBody}</p>
          <button type="button" className="ph-primary" data-hc="tell-missing" onClick={onTellMissing}>{HELP_HOME.noneAct}</button>
        </div>
      )}
    </>
  );
}

export function HelpHome() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, counts, articleDone } = useGuideFacts();
  const signedIn = !!user;
  const off = useGuidesOff();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const newsRef = useRef<HTMLElement | null>(null);
  const [q, setQ] = useState("");
  const term = q.trim();
  const hits = useMemo(() => searchArticles(term), [term]);

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

  /* /help#whats-new (the Help menu, the dashboard footer): scroll to New in QueryHawk; /help#search: focus the search */
  useEffect(() => {
    if (location.hash === "#whats-new") {
      markWhatsNewSeen();
      requestAnimationFrame(() => newsRef.current?.scrollIntoView({ block: "center" }));
    } else if (location.hash === "#search") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [location.hash]);

  const open = (slug: string) => navigate(`/help/${slug}`);
  const done = (a: HelpArticle) => signedIn && articleDone(a);
  const chips = HELP_CHIPS.filter((c) => searchArticles(c).length > 0);
  const guide = signedIn && !off ? guideForNow(GUIDE_PAGES.map((g) => guideCard(g, user, counts, readSkipped(g.page)))) : null;
  const areas = HELP_AREAS.map((ar) => ({ ar, list: HELP_ARTICLE_LIST.filter((a) => a.area === ar.id) })).filter((x) => x.list.length > 0);
  const tellUs = () => (signedIn ? openFeedback() : navigate("/contact"));
  const tellMissing = () => (signedIn ? askNick(term) : navigate("/contact"));

  const main = term ? (
    <SearchAnswers term={term} hits={hits} onOpen={open} onTellMissing={tellMissing} />
  ) : (
    <>
      {guide ? (
        <>
          <h2 className="hc-h2 hc-h2">{HELP_HOME.forYou}</h2>
          <div className="hc-now">
            <div className="hc-rcard hc-nowc" data-hc="guide-card" data-page={guide.page} data-n={guide.n} data-total={guide.total}>
              <b>{guide.page} guide: {guide.n} of {guide.total} done</b>
              <div className="hc-gsegs" aria-hidden="true">{guide.segs.map((on, i) => <i key={i} className={on ? "on" : undefined} />)}</div>
              <span>Up next: {lowerFirst(guide.next ?? guide.first)}.</span>
              <button type="button" className="ph-primary" data-hc="guide-start"
                onClick={() => { navigate(guide.route); requestGuideOpen(guide.page); }}>
                {guide.n ? HELP_HOME.carryOn : HELP_HOME.start}
              </button>
            </div>
          </div>
        </>
      ) : null}
      <h2 className="hc-h2 hc-h2">{HELP_HOME.browse}</h2>
      <div className="hc-areas">
        {areas.map(({ ar, list }) => (
          <section key={ar.id} className="hc-area" data-hc="area" data-area={ar.id}>
            <h3 className="hc-ah hc-ah">{ar.name}</h3>
            <p className="hc-asub">{ar.heading}</p>
            <ul>{list.slice(0, 4).map((a) => <li key={a.slug}><ArticleLink a={a} done={done(a)} onOpen={() => open(a.slug)} /></li>)}</ul>
            {list.length > 4
              ? <button type="button" className="hc-all" data-hc="area-all" onClick={() => open(list[0].slug)}>All {list.length} in {ar.name}</button>
              : null}
          </section>
        ))}
      </div>
    </>
  );

  return (
    <div className="hc" data-hc="home">
      <header className="hc-top">
        <div>
          <h1 className="hc-h1 hc-h1">{HELP_HOME.h1}</h1>
          <p className="hc-sub">{HELP_HOME.sub}</p>
          <div className="hc-search" data-hc="search">
            <Search className="hc-sglyph" size={18} aria-hidden="true" />
            <input ref={inputRef} type="text" value={q} aria-label={HELP_HOME.searchLabel} placeholder={HELP_HOME.searchLabel}
              autoComplete="off" data-hc="search-input"
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape" && q) { e.stopPropagation(); setQ(""); } }} />
            {q ? (
              <button type="button" className="hc-clear" aria-label={HELP_HOME.clear} data-hc="clear"
                onClick={() => { setQ(""); inputRef.current?.focus(); }}>×</button>
            ) : null}
          </div>
          {chips.length ? (
            <div className="hc-chips">
              <span className="hc-chiplab">{HELP_HOME.ask}</span>
              {chips.map((c) => <button key={c} type="button" className="hc-chip" data-hc="chip" onClick={() => { setQ(c); inputRef.current?.focus(); }}>{c}</button>)}
            </div>
          ) : null}
        </div>
        <img className="hc-artimg" src="/images/contact-list-archivist.webp" alt="" />
      </header>

      <div className="hc-cols">
        <div className="hc-main" data-hc="main">{main}</div>
        <aside className="hc-rail">
          <section className="hc-rcard">
            <h3 className="hc-rh hc-rh">{HELP_HOME.keyH}</h3>
            <StatusKeyList rows={RAIL_KEY} />
            {articleBySlug("status-key")
              ? <p className="hc-rlink"><button type="button" className="hc-linkb" onClick={() => open("status-key")}>{HELP_HOME.keyLink}</button></p>
              : null}
          </section>
          <section className="hc-rcard" id="whats-new" ref={newsRef} data-hc="whats-new">
            <h3 className="hc-rh hc-rh">{HELP_HOME.newH}</h3>
            <ul className="hc-new">
              {HELP_NEWS.map((n) => <li key={n.title}>{n.title}<small>{n.line}</small></li>)}
            </ul>
            {signedIn
              ? <p className="hc-rlink"><button type="button" className="hc-linkb" data-hc="news-all" onClick={() => navigate("/your-notes")}>{HELP_HOME.newLink}</button></p>
              : null}
          </section>
          <section className="hc-rcard" data-hc="stuck">
            <h3 className="hc-rh hc-rh">{HELP_HOME.stuckH}</h3>
            <p>{HELP_HOME.stuckBody}</p>
            <button type="button" className="ph-secondary" data-hc="give-feedback" onClick={tellUs}>{HELP_HOME.stuckAct}</button>
          </section>
        </aside>
      </div>
    </div>
  );
}
