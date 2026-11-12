/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One Help article at /help/{slug} (non-workspace v1, Phase 7; ref: design-refs/help-centre-v1.html, the Redesign
 * view's article). Left: "Help centre" back to the home, the subject's name, its published articles. Right: the title,
 * the lede, "{n} to read · Checked {date}", "Show me on the page", the steps, the tip, "Did this help?", Related.
 *
 * ⚠️ "SHOW ME" NEVER TICKS. It navigates and asks the page's guide to spotlight the item (`requestGuideStep`); only the
 *    writer's own action on that page marks it done. Signed out there is no page to show, so it is not drawn.
 * ⚠️ "Did this help? Not really" sends kind "Article" through `sendBetaFeedback`, the one existing write path (the
 *    function accepts the kind; the feedback panel never offers it). It needs an account, so signed out the question is
 *    not asked.
 * ⚠️ ONE FILLED BUTTON: "Show me on the page". "Send" under "What was missing?" is `.ph-secondary` for that reason.
 * ⚠️ PUBLISHED ONLY: the subject list and Related read `HELP_ARTICLE_LIST` / `articleBySlug`, which hold no drafts.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, Play } from "lucide-react";
import { StatusDot } from "../StatusDot";
import { GUIDE_PAGES } from "../../lib/pageChecklist";
import { requestGuideStep } from "../../lib/guideHub";
import { lastRouteOutsideHelp } from "../../lib/routeTrail";
import { appVersionLabel, describeBrowser } from "../../lib/beta";
import { HELP_ARTICLE_LIST, articleBySlug } from "../../content/help/articles";
import { HELP_AREAS, guidesOf, readTime, type HelpArticle } from "../../content/help/model";
import { BUILD, Runs, STATUS_KEY, checkedDate, useGuideFacts } from "./helpShared";

/** The ref's words. */
export const HELP_ARTICLE = {
  crumb: "Help centre",
  showMe: "Show me on the page",
  helped: "Did this help?",
  yes: "Yes",
  no: "Not really",
  thanks: "Thanks. Glad it helped.",
  missing: "What was missing?",
  missingHint: "For example: step 3 doesn't match what I see",
  send: "Send",
  skip: "Skip",
  sent: "Thanks. That's gone to us as a note. We'll fix the article.",
  failed: "That didn't send. Try again in a moment.",
  related: "Related",
  meta: (read: string, iso: string) => `${read} to read · Checked ${checkedDate(iso)}`,
} as const;

function Helpful({ slug }: { slug: string }) {
  const [state, setState] = useState<"ask" | "yes" | "no" | "sending" | "sent" | "failed">("ask");
  const [msg, setMsg] = useState("");
  const inRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => { setState("ask"); setMsg(""); }, [slug]);
  useEffect(() => { if (state === "no") inRef.current?.focus(); }, [state]);
  const send = async () => {
    const m = msg.trim();
    if (!m) { inRef.current?.focus(); return; }
    if (state === "sending") return;
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
  if (state === "ask") {
    return (
      <div className="hc-helpful" data-hc="helpful">
        <h2 className="hc-hh hc-hh">{HELP_ARTICLE.helped}</h2>
        <button type="button" className="ph-secondary" data-hc="helpful-yes" onClick={() => setState("yes")}>{HELP_ARTICLE.yes}</button>
        <button type="button" className="ph-secondary" data-hc="helpful-no" onClick={() => setState("no")}>{HELP_ARTICLE.no}</button>
      </div>
    );
  }
  if (state === "yes" || state === "sent") {
    return (
      <div className="hc-helpful" data-hc="helpful">
        <p data-hc={state === "yes" ? "helpful-thanks" : "helpful-sent"}>{state === "yes" ? HELP_ARTICLE.thanks : HELP_ARTICLE.sent}</p>
      </div>
    );
  }
  return (
    <div className="hc-helpful hc-helpful--ask" data-hc="helpful">
      <h2 className="hc-hh hc-hh"><label htmlFor="hc-missing">{HELP_ARTICLE.missing}</label></h2>
      <textarea id="hc-missing" ref={inRef} className="hc-missing" value={msg} placeholder={HELP_ARTICLE.missingHint} data-hc="helpful-input"
        maxLength={600} onChange={(e) => setMsg(e.target.value)} />
      <div className="hc-acts">
        <button type="button" className="ph-secondary" data-hc="helpful-send" disabled={state === "sending"} onClick={() => void send()}>{HELP_ARTICLE.send}</button>
        <button type="button" className="ph-secondary" data-hc="helpful-skip" onClick={() => { setState("ask"); setMsg(""); }}>{HELP_ARTICLE.skip}</button>
      </div>
      {state === "failed" ? <p className="hc-fail" role="alert">{HELP_ARTICLE.failed}</p> : null}
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
  const { user, articleDone } = useGuideFacts();
  const signedIn = !!user;
  const area = HELP_AREAS.find((x) => x.id === a.area)!;
  const siblings = HELP_ARTICLE_LIST.filter((x) => x.area === a.area);
  const links = guidesOf(a);
  /* one article on two pages: "Show me" goes to the page the writer came from, else the first */
  const from = (location.state as { from?: string } | null)?.from ?? lastRouteOutsideHelp();
  const link = signedIn ? links.find((l) => GUIDE_PAGES.find((g) => g.page === l.page)?.route === from) ?? links[0] ?? null : null;
  const guidePage = link ? GUIDE_PAGES.find((g) => g.page === link.page) ?? null : null;
  const related = a.related.map(articleBySlug).filter((x): x is HelpArticle => !!x).slice(0, 4);
  const topRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const sc = topRef.current?.closest<HTMLElement>("#app-stage-scroll");
    if (sc) sc.scrollTop = 0;
    else if (typeof window !== "undefined") window.scrollTo?.(0, 0);
  }, [a.slug]);

  const showMe = useCallback(() => {
    if (!link || !guidePage) return;
    navigate(guidePage.route);
    requestGuideStep(link.page, link.key);
  }, [link, guidePage, navigate]);

  return (
    <div className="hc hc--art" data-hc="article" data-slug={a.slug}>
      <div className="hc-art">
        <nav className="hc-toc" aria-label={area.name}>
          <button type="button" className="hc-crumb" data-hc="crumb" onClick={() => navigate("/help")}>
            <ChevronLeft size={16} aria-hidden="true" />{HELP_ARTICLE.crumb}
          </button>
          <h3 className="hc-toch hc-toch">{area.name}</h3>
          {siblings.map((x) => (
            <button key={x.slug} type="button" className="hc-tocl" aria-current={x.slug === a.slug ? "page" : undefined} data-hc="toc" data-slug={x.slug}
              onClick={() => navigate(`/help/${x.slug}`)}>
              <span className="hc-tk" aria-hidden="true">{signedIn && articleDone(x) ? "✓" : ""}</span>{x.title}
            </button>
          ))}
        </nav>
        <article ref={topRef}>
          <h1 className="hc-ah1 hc-ah1">{a.title}</h1>
          <p className="hc-lede">{a.lede}</p>
          <p className="hc-meta2" data-hc="meta">{HELP_ARTICLE.meta(readTime(a), a.updated)}</p>
          {link ? (
            <button type="button" className="ph-primary hc-showme" data-hc="showme-go" onClick={showMe}>
              <Play size={14} aria-hidden="true" />{HELP_ARTICLE.showMe}
            </button>
          ) : null}
          {a.steps?.length ? (
            <ol className="hc-steps">
              {a.steps.map((s) => <li key={s.title}><div><h3 className="hc-sh hc-sh">{s.title}</h3><p><Runs text={s.body} /></p></div></li>)}
            </ol>
          ) : null}
          {a.body ? <div className="hc-body">{a.body.split(/\n\n+/).map((p, i) => <p key={i}><Runs text={p} /></p>)}</div> : null}
          {a.slug === "status-key" ? <StatusKeyArticle /> : null}
          {a.tip ? <div className="hc-tip"><b>{a.tip.label}</b> <Runs text={a.tip.text} /></div> : null}
          {signedIn ? <Helpful slug={a.slug} /> : null}
          {related.length ? (
            <div className="hc-related" data-hc="related-list">
              <h2 className="hc-hh hc-hh">{HELP_ARTICLE.related}</h2>
              {related.map((r) => <button key={r.slug} type="button" data-hc="related" onClick={() => navigate(`/help/${r.slug}`)}>{r.title}</button>)}
            </div>
          ) : null}
        </article>
      </div>
    </div>
  );
}
