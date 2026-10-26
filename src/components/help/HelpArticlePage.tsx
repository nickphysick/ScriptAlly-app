/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Help Centre v1, Part C — one article at /help/{slug}.
 *
 * ⚠️ "SHOW ME" NEVER TICKS. It navigates and asks the page's guide to spotlight the item (`requestGuideStep`); only the
 *    writer's own action on that page marks it done.
 * ⚠️ "Did this help? Not really" sends kind "Article", which the function accepts and the feedback panel never offers.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { StatusDot } from "../StatusDot";
import { GUIDE_PAGES } from "../../lib/pageChecklist";
import { requestGuideStep } from "../../lib/guideHub";
import { lastRouteOutsideHelp } from "../../lib/routeTrail";
import { appVersionLabel, describeBrowser } from "../../lib/beta";
import { HELP_ARTICLE_LIST, articleBySlug } from "../../content/help/articles";
import { HELP_AREAS, guidesOf, readTime, type HelpArticle } from "../../content/help/model";
import { BUILD, DRAFTS, Runs, STATUS_KEY, longDate, useGuideFacts } from "./helpShared";

function Helpful({ slug }: { slug: string }) {
  const [state, setState] = useState<"ask" | "yes" | "no" | "sending" | "sent" | "failed">("ask");
  const [msg, setMsg] = useState("");
  const inRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { setState("ask"); setMsg(""); }, [slug]);
  useEffect(() => { if (state === "no") inRef.current?.focus(); }, [state]);
  const send = async () => {
    const m = msg.trim();
    if (!m || state === "sending") return;
    setState("sending");
    try {
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const call = httpsCallable(getFunctions(undefined, "europe-west2"), "sendBetaFeedback");
      /* ⚠️ "Article" is a kind the FUNCTION accepts and the feedback panel never offers (lock HC1-C3) */
      await call({
        kind: "Article", message: m, severity: "", wantsReply: false, pageName: `help/${slug}`,
        route: typeof location === "undefined" ? "" : location.pathname,
        viewport: typeof window === "undefined" ? "" : `${window.innerWidth} × ${window.innerHeight}`,
        browser: typeof navigator === "undefined" ? "" : navigator.userAgent,
        browserName: typeof navigator === "undefined" ? "" : describeBrowser(navigator.userAgent),
        appVersion: appVersionLabel(BUILD), screenshotPath: "",
      });
      setState("sent");
    } catch {
      setState("failed");
    }
  };
  return (
    <div className="hc-helpful" data-hc="helpful">
      {state === "ask" ? (
        <><span>Did this help?</span>
          <button type="button" className="hc-bghost" data-hc="helpful-yes" onClick={() => setState("yes")}>Yes</button>
          <button type="button" className="hc-bghost" data-hc="helpful-no" onClick={() => setState("no")}>Not really</button></>
      ) : state === "yes" ? (
        <span data-hc="helpful-thanks">Thanks. That helps us know what to keep.</span>
      ) : state === "sent" ? (
        <span data-hc="helpful-sent">Thanks. That goes straight to us.</span>
      ) : (
        <>
          <label htmlFor="hc-missing">What was missing?</label>
          <input id="hc-missing" ref={inRef} className="hc-missing" value={msg} placeholder="One line is plenty" data-hc="helpful-input"
            maxLength={600} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void send(); } }} />
          <button type="button" className="hc-bnav" data-hc="helpful-send" disabled={!msg.trim() || state === "sending"} onClick={() => void send()}>Send</button>
          {state === "failed" ? <span className="hc-fail" role="alert">That didn't send. Try again in a moment.</span> : null}
        </>
      )}
    </div>
  );
}

/** The Status key article's body: each status's glossary entry, with its ring. */
function StatusKeyArticle() {
  return (
    <dl className="hc-skey" data-hc="status-key">
      {STATUS_KEY.map((e) => (
        <div key={e.id} className="hc-skrow">
          <dt><StatusDot status={e.status!} overrideSize={20} decorative /><span>{e.title}</span></dt>
          <dd>{e.body}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ArticlePage({ a }: { a: HelpArticle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemDone, articleDone } = useGuideFacts();
  const area = HELP_AREAS.find((x) => x.id === a.area)!;
  const siblings = HELP_ARTICLE_LIST.filter((x) => x.area === a.area);
  const links = guidesOf(a);
  /* one article on two pages: "Show me" goes to the page the writer came from, else the first */
  const from = (location.state as { from?: string } | null)?.from ?? lastRouteOutsideHelp();
  const link = links.find((l) => GUIDE_PAGES.find((g) => g.page === l.page)?.route === from) ?? links[0] ?? null;
  const guidePage = link ? GUIDE_PAGES.find((g) => g.page === link.page) ?? null : null;
  const done = link ? itemDone(link.page, link.key) : false;
  const related = a.related.map(articleBySlug).filter((x): x is HelpArticle => !!x).slice(0, 4);
  const topRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const sc = topRef.current?.closest<HTMLElement>("#app-stage-scroll");
    if (sc) sc.scrollTop = 0;
  }, [a.slug]);

  const showMe = useCallback(() => {
    if (!link || !guidePage) return;
    navigate(guidePage.route);
    requestGuideStep(link.page, link.key);
  }, [link, guidePage, navigate]);

  return (
    <div className="hc hc--art" data-hc="article" data-slug={a.slug}>
      <div className="hc-art">
        <nav className="hc-toc" aria-label={`${area.name} articles`}>
          <div className="hc-eyb hc-eyb--mute">{area.name}</div>
          {siblings.map((x) => (
            <button key={x.slug} type="button" aria-current={x.slug === a.slug ? "page" : undefined} data-hc="toc" data-slug={x.slug}
              onClick={() => navigate(`/help/${x.slug}`)}>
              <span className="hc-tk">{articleDone(x) ? "✓" : ""}</span>{x.title}
            </button>
          ))}
        </nav>
        <article ref={topRef}>
          <div className="hc-crumb" data-hc="crumb">
            <button type="button" onClick={() => navigate("/help")}>Help Centre</button> › {area.name}
            {link ? <> › {link.page}</> : null}
          </div>
          <h1 className="hc-ah1">{a.title}</h1>
          <p className="hc-lede">{a.lede}</p>
          <div className="hc-meta2" data-hc="meta">
            <span>{readTime(a)} read</span><span>·</span><span>Updated {longDate(a.updated)}</span>
            {link ? <><span>·</span>{done
              ? <span className="hc-done" data-hc="done">✓ You've done this</span>
              : <span data-hc="part-of">Part of the {link.page} guide</span>}</> : null}
            {a.draft && DRAFTS ? <span className="hc-draft" data-hc="draft">DRAFT</span> : null}
          </div>
          {link ? (
            <div className="hc-showme" data-hc="showme">
              <p><b>See it on your {link.page}</b>We'll point to the button. You do the rest.</p>
              <button type="button" className="hc-bnav" data-hc="showme-go" onClick={showMe}>{done ? "Show me again" : "Show me in the app"}</button>
            </div>
          ) : null}
          {a.steps?.length ? (
            <ol className="hc-steps">
              {a.steps.map((s) => <li key={s.title}><div><h3 className="hc-sh">{s.title}</h3><p><Runs text={s.body} /></p></div></li>)}
            </ol>
          ) : null}
          {a.body ? <div className="hc-body">{a.body.split(/\n\n+/).map((p, i) => <p key={i}><Runs text={p} /></p>)}</div> : null}
          {a.slug === "status-key" ? <StatusKeyArticle /> : null}
          {a.figure ? <div className="hc-fig">{a.figure}</div> : null}
          {a.tip ? <div className="hc-tip"><b>{a.tip.label}</b><Runs text={a.tip.text} /></div> : null}
          <Helpful slug={a.slug} />
        </article>
        <aside className="hc-related" aria-label="Related articles">
          <h3 className="hc-relh">RELATED</h3>
          {related.map((r) => <button key={r.slug} type="button" data-hc="related" onClick={() => navigate(`/help/${r.slug}`)}>{r.title}</button>)}
        </aside>
      </div>
    </div>
  );
}

