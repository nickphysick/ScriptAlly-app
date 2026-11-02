/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WelcomePage — `/welcome`, where a founding writer lands after clicking their confirmation link.
 * Welcome page v1 (2 Nov; ref design-refs/welcome-page-v1.html): the landing page's navy drawer with
 * the writer's pass, then bands for Nick's note, what happens next, the perks, the optional three
 * taps and a get-ready list. Every word is in `welcomeCopy.ts`.
 *
 * ⚠️ THE MECHANICS ARE UNCHANGED FROM THE FIRST VERSION:
 *   - `v` and `r` are read ONCE, then taken out of the address, so a refresh, a bookmark or a shared
 *     link never replays someone else's welcome;
 *   - with a reference the page asks the server for the writer's number (`fetchWelcome`); if that
 *     fails the same state shows WITHOUT a number, never an error, and no number is ever estimated;
 *   - the three taps exist only with a reference (`postAnswers` needs one);
 *   - a link that held nothing offers the fresh-link form (`FoundingSignup`, source `founders-hero`).
 *
 * ⚠️ NOTHING HERE SELLS AND NOTHING LEAVES: the only link is Privacy (the shell's /welcome mode draws
 * the bar as the logo alone and the footer as one line). No small capitals, no mono labels.
 *
 * `WelcomeView` is the drawing (rendered by the tests with fixed data); `WelcomePage` is the reading
 * of the URL and the two calls.
 */
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./welcome.css";
import { FoundingSignup } from "./FoundingSignup";
import { PASS_BIRD, ticketGets } from "./FoundingTicket";
import { ILLUSTRATIONS } from "./FeatureRows";
import { BRAND_MARK_SMALL, artUrl } from "./brandArt";
import { fetchWelcome, postAnswers } from "./welcomeData";
import {
  type WelcomeKind, type WelcomeData, type AnswerKey,
  parseWelcomeKind, heroCopy, nextSteps, canSend, ordinal, longDate, FRESH_LINK_CTA,
  PASS_LABEL, PASS_LABEL_WAITING, passBig, PASS_OF, PASS_IN_LINE, STAMP_CONFIRMED, STAMP_RESERVE, GHOST_BIG, GHOST_STRIP,
  NOTE, NOTE_WAITING, NOTE_SIGN, NOTE_ROLE, NEXT_HEADING, GET_HEADING,
  TAPS_HEADING, TAPS_LEAD, QUESTIONS, TAPS_SEND, TAPS_NOTE, TAPS_THANKS, TAPS_THANKS_SUB, TAPS_FAILED,
  READY_HEADING, READY_LEAD, READY_LIST, CLOSE_LINE, CLOSE_SIGN, WELCOME_DOCUMENT_TITLE,
} from "./welcomeCopy";

type Nav = (tab: string, subPageName?: string) => void;
type SendState = "idle" | "sending" | "sent" | "failed";

/** The Smart Import picture the landing page's "Bring your list across" row draws. */
const IMPORT_ART = "/images/journey-so-far.png";

/** The rust ring-and-tick the landing page's lists use. */
const Tick: React.FC = () => (
  <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" focusable="false">
    <circle cx="10" cy="10" r="8" fill="none" stroke="#a2452a" strokeWidth="1.6" />
    <path d="M6.2 10.3 8.8 12.8 13.8 7.6" fill="none" stroke="#a2452a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── The pass ── */
const Pass: React.FC<{ kind: WelcomeKind; data: WelcomeData | null; loading?: boolean }> = ({ kind, data, loading }) => {
  const bird = <img className="mk-wpass-bird" src={`${PASS_BIRD.src}?v=${PASS_BIRD.version}`} alt="" width={PASS_BIRD.width} height={PASS_BIRD.height} />;
  if (kind === "expired" || kind === "unknown") {
    return (
      <div className="mk-wpass mk-wpass--ghost" data-probe="pass">
        <div className="mk-wpass-stub">
          <div className="mk-wpass-tx">
            <small>{PASS_LABEL}</small>
            <b className="mk-wpass-big" data-probe="pass-big">{GHOST_BIG[0]}<br />{GHOST_BIG[1]}</b>
          </div>
          {bird}
        </div>
        <div className="mk-wpass-tear" />
        <div className="mk-wpass-strip"><span className="mk-wpass-ghostline">{GHOST_STRIP}</span></div>
      </div>
    );
  }
  const waiting = kind === "waiting";
  const n = waiting ? data?.reserveNumber : data?.foundingNumber;
  const date = longDate(data?.confirmedOn);
  return (
    <div className={"mk-wpass" + (loading ? " is-loading" : "")} data-probe="pass">
      <div className="mk-wpass-stub">
        <div className="mk-wpass-tx">
          <small>{waiting ? PASS_LABEL_WAITING : PASS_LABEL}</small>
          {/* ⚠️ THE WRITER'S STORED NUMBER OR NOTHING. While it loads, and if it never comes, the line
              keeps its height empty, so the pass does not move when the number lands. */}
          <span className="mk-wpass-line">
            {n ? (<>
              <b className="mk-wpass-big" data-probe="pass-big">{waiting ? ordinal(n) : passBig(n)}</b>
              <em>{waiting ? PASS_IN_LINE : PASS_OF}</em>
            </>) : <b className="mk-wpass-big mk-wpass-big--empty" data-probe="pass-big" aria-hidden="true">&nbsp;</b>}
          </span>
        </div>
        {bird}
      </div>
      <div className="mk-wpass-tear" />
      <div className="mk-wpass-strip">
        <span className="mk-wpass-brand"><img src={artUrl(BRAND_MARK_SMALL)} alt="" width={BRAND_MARK_SMALL.width} height={BRAND_MARK_SMALL.height} />QueryHawk</span>
        <span className="mk-wpass-stamp" data-probe="stamp">
          <span>{waiting ? STAMP_RESERVE : STAMP_CONFIRMED}</span>
          {/* The date line is always there, empty until the lookup answers, so the stamp keeps its size. */}
          <i aria-hidden={date ? undefined : true}>{date ?? " "}</i>
        </span>
      </div>
    </div>
  );
};

/* ── The three quick taps ── */
const Taps: React.FC<{ onSend: (a: Record<AnswerKey, string>) => Promise<boolean> }> = ({ onSend }) => {
  const [answers, setAnswers] = useState<Partial<Record<AnswerKey, string>>>({});
  const [state, setState] = useState<SendState>("idle");
  const ready = canSend(answers) && state !== "sending";
  const send = async () => {
    if (!canSend(answers)) return;
    setState("sending");
    /* On failure the answers stay chosen, so a retry is one click. */
    setState((await onSend(answers as Record<AnswerKey, string>)) ? "sent" : "failed");
  };
  if (state === "sent") {
    return (
      <div className="mk-wel-thanks" role="status">
        <Tick />
        <p><b>{TAPS_THANKS}</b> {TAPS_THANKS_SUB}</p>
      </div>
    );
  }
  return (
    <div className="mk-wel-qs">
      {QUESTIONS.map((q) => (
        <div className="mk-wel-q" key={q.key}>
          <p className="mk-wel-qlabel" id={`mk-wel-q-${q.key}`}>{q.label}</p>
          <div className="mk-wel-opts" role="group" aria-labelledby={`mk-wel-q-${q.key}`}>
            {q.options.map(([value, label]) => (
              <button
                key={value} type="button" className="mk-wel-opt"
                aria-pressed={answers[q.key] === value}
                onClick={() => { setAnswers((a) => ({ ...a, [q.key]: value })); if (state === "failed") setState("idle"); }}
              >{label}</button>
            ))}
          </div>
        </div>
      ))}
      <div className="mk-wel-send">
        <button type="button" className="mk-wel-sendbtn" disabled={!ready} onClick={() => void send()}>{TAPS_SEND}</button>
        <p>{state === "failed" ? <span className="mk-wel-failed" role="alert">{TAPS_FAILED}</span> : TAPS_NOTE}</p>
      </div>
    </div>
  );
};

/** A band: the page's alternating grounds, a typewriter heading over the 52 × 3 navy rule. */
const Band: React.FC<{ tone: 1 | 2; heading?: string; first?: boolean; split?: boolean; children: React.ReactNode }> =
  ({ tone, heading, first, split, children }) => (
    <section className={`mk-wel-band mk-wel-band--${tone}` + (first ? " mk-wel-band--first" : "")}>
      <div className={"mk-wel-in" + (split ? " mk-wel-split" : " mk-wel-in--narrow")}>
        {heading ? <div><h2 className="mk-wel-h2">{heading}</h2>{children}</div> : children}
      </div>
    </section>
  );

export const WelcomeView: React.FC<{
  kind: WelcomeKind;
  data: WelcomeData | null;
  loading?: boolean;
  /** The reference, when there is one: the three taps can only be sent against it. */
  welcomeRef?: string | null;
  onNavigate: Nav;
  onSendAnswers?: (a: Record<AnswerKey, string>) => Promise<boolean>;
}> = ({ kind, data, loading, welcomeRef, onNavigate, onSendAnswers }) => {
  const d = data ?? {};
  const hero = heroCopy(kind, d);
  const bad = kind === "expired" || kind === "unknown";
  const waiting = kind === "waiting";
  const steps = nextSteps(kind, d);
  const taps = !!(welcomeRef && onSendAnswers);
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headRef.current?.focus(); }, []);

  /* The bands alternate from the note down, whatever is left out. */
  const bands: Array<(tone: 1 | 2) => React.ReactNode> = [];
  if (!bad) {
    bands.push((t) => (
      <Band tone={t} first key="note">
        <section className="mk-wel-note" aria-label="A note from Nick">
          {(waiting ? NOTE_WAITING : NOTE).map((p) => <p key={p}>{p}</p>)}
          <div className="mk-wel-sig">{NOTE_SIGN}</div>
          <div className="mk-wel-role">{NOTE_ROLE}</div>
        </section>
      </Band>
    ));
    bands.push((t) => (
      <Band tone={t} heading={NEXT_HEADING} key="next">
        <ol className="mk-wel-steps">
          {steps.map((s, i) => (
            <li key={s.title} className={i === 0 ? "is-done" : undefined}>
              <span className="mk-wel-dot" aria-hidden="true">{i === 0 ? "✓" : i + 1}</span>
              <div><h3 className="mk-wel-h3">{s.title}</h3><p>{s.body}</p></div>
            </li>
          ))}
        </ol>
      </Band>
    ));
    if (!waiting) bands.push((t) => (
      <Band tone={t} heading={GET_HEADING} key="get">
        <ul className="mk-wel-ticks">
          {ticketGets().map((g) => (
            <li key={typeof g === "string" ? g : g.b}><Tick />{typeof g === "string" ? <span>{g}</span> : <span><b>{g.b}</b>{g.rest}</span>}</li>
          ))}
        </ul>
      </Band>
    ));
    if (taps) bands.push((t) => (
      <Band tone={t} heading={TAPS_HEADING} key="taps">
        <p className="mk-wel-lead">{TAPS_LEAD}</p>
        <Taps onSend={onSendAnswers!} />
      </Band>
    ));
    if (!waiting) bands.push((t) => (
      <Band tone={t} split key="ready">
        <div>
          <h2 className="mk-wel-h2">{READY_HEADING}</h2>
          <p className="mk-wel-lead">{READY_LEAD}</p>
          <ul className="mk-wel-ticks">{READY_LIST.map((r) => <li key={r}><Tick /><span>{r}</span></li>)}</ul>
        </div>
        <div className="mk-wel-art">
          <img src={`${IMPORT_ART}?v=${ILLUSTRATIONS[IMPORT_ART].version}`} alt="" width={ILLUSTRATIONS[IMPORT_ART].width} height={ILLUSTRATIONS[IMPORT_ART].height} loading="lazy" />
        </div>
      </Band>
    ));
  }

  return (
    <div className="mk-wel" data-welcome={kind}>
      <header className="mk-wel-hero">
        <div className="mk-wel-in mk-wel-heroin">
          <div className="mk-wel-htx" role="status">
            <h1 className="mk-wel-h1" ref={headRef} tabIndex={-1}>{hero.heading}</h1>
            <p className="mk-wel-lede">{hero.lede}</p>
            {hero.line && (
              <p className="mk-wel-line"><span className="mk-wel-env" aria-hidden="true">✉</span>{hero.line}</p>
            )}
            {bad && (
              <div className="mk-wel-form">
                <FoundingSignup idPrefix="mk-welcome" ctaLabel={FRESH_LINK_CTA} source="founders-hero"
                  formClass="mk-wl-form" onNavigate={onNavigate} />
              </div>
            )}
          </div>
          <div className="mk-wel-passcol"><Pass kind={kind} data={data} loading={loading} /></div>
        </div>
      </header>
      {bands.map((b, i) => b(i % 2 === 0 ? 1 : 2))}
      {!bad && (
        <section className={`mk-wel-close mk-wel-band--${bands.length % 2 === 0 ? 1 : 2}`}>
          <p>{CLOSE_LINE}</p>
          <div className="mk-wel-closesign">{CLOSE_SIGN}</div>
        </section>
      )}
    </div>
  );
};

export const WelcomePage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => {
  const [params, setParams] = useSearchParams();
  const [kind] = useState<WelcomeKind>(() => parseWelcomeKind(params.get("v")));
  const [welcomeRef] = useState<string | null>(() => params.get("r"));
  const person = (kind === "verified" || kind === "already" || kind === "waiting") && !!welcomeRef;
  const [data, setData] = useState<WelcomeData | null>(null);
  const [loading, setLoading] = useState(person);

  useEffect(() => {
    const prev = document.title;
    document.title = WELCOME_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  /* Read once (above), then out of the address. */
  useEffect(() => {
    if (!params.has("v") && !params.has("r")) return;
    const next = new URLSearchParams(params);
    next.delete("v");
    next.delete("r");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!person || !welcomeRef) return;
    let live = true;
    void fetchWelcome(welcomeRef).then((d) => { if (live) { setData(d); setLoading(false); } });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WelcomeView
      kind={kind} data={data} loading={loading}
      welcomeRef={person ? welcomeRef : null}
      onNavigate={onNavigate}
      onSendAnswers={person && welcomeRef ? (a) => postAnswers(welcomeRef, a) : undefined}
    />
  );
};
