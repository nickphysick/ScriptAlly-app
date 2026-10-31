/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WelcomePage — `/welcome`, where a founding writer lands after clicking their confirmation link.
 * Built to Direction A ("The card") of design-refs/founding-welcome/founding-welcome-v1.html.
 *
 * ⚠️ IT READS `v` AND `r` ONCE, THEN TAKES BOTH OUT OF THE ADDRESS, so a refresh, a bookmark or a
 * shared link never replays someone else's welcome. With a reference it asks the server for the
 * writer's number; if that fails, the same state shows without the number, never an error.
 *
 * ⚠️ NOTHING HERE SELLS, AND THERE IS NO WAY INTO THE APP: they have already said yes, and the app
 * isn't open. The only number shown is the writer's own stored number.
 *
 * `WelcomeView` is the drawing (rendered by the tests with fixed data); `WelcomePage` is the reading
 * of the URL and the two calls.
 */
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./welcome.css";
import { FoundingCard } from "./FoundingCard";
import { FoundingSignup } from "./FoundingSignup";
import { fetchWelcome, postAnswers } from "./welcomeData";
import {
  type WelcomeKind, type WelcomeData, type AnswerKey,
  parseWelcomeKind, stateCopy, stepOne, canSend, FRESH_LINK_CTA,
  FOUNDER_PHOTO, FOUNDER_INITIAL, NOTE_THANKS, NOTE_WAITING, NOTE_REPLY, NOTE_SIGN, NOTE_ROLE,
  NEXT_EYEBROW, NEXT_HEADING, STEP_ONE_WHEN, STEP_TWO, STEP_THREE, PERKS,
  PEEK_EYEBROW, PEEK_HEADING, PEEKS, PEEK_FILE, PEEK_DONE,
  TAPS_EYEBROW, TAPS_HEADING, QUESTIONS, TAPS_SEND, TAPS_NOTE, TAPS_THANKS, TAPS_THANKS_SUB, TAPS_FAILED,
  READY_EYEBROW, READY_HEADING, READY_BODY, READY_LIST,
  CLOSE_LINE, CLOSE_WAITING, CLOSE_HAND, WELCOME_DOCUMENT_TITLE,
} from "./welcomeCopy";

type Nav = (tab: string, subPageName?: string) => void;
type SendState = "idle" | "sending" | "sent" | "failed";

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
        <i aria-hidden="true">✓</i>
        <div><b>{TAPS_THANKS}</b><br /><span>{TAPS_THANKS_SUB}</span></div>
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
      <div className="mk-wel-meta">
        <button type="button" className="mk-wel-btn mk-wel-btn--navy" disabled={!ready} onClick={() => void send()}>
          {TAPS_SEND}
        </button>
        <small>{state === "failed" ? <span className="mk-wel-failed" role="alert">{TAPS_FAILED}</span> : TAPS_NOTE}</small>
      </div>
    </div>
  );
};

/* ── The drawn previews (CSS only: no screenshots of real data) ── */
const Peek: React.FC = () => (
  <div className="mk-wel-peek">
    <div className="mk-wel-shot">
      <div className="mk-wel-scr" aria-hidden="true">
        <div className="mui-bar"><i /><i /><i /></div>
        {["", "late", "q", "c"].map((v, i) => (
          <div className="mui-row" key={i}>
            <div className={`d ${v === "q" ? "q" : v === "c" ? "c" : ""}`} />
            <div><div className="l" /><div className="l2" /></div>
            <div className={`t ${v === "q" ? "t--sage" : v === "c" ? "t--stone" : ""}`} />
            <div className={`r ${v === "late" ? "late" : v === "c" ? "r--off" : ""}`} />
          </div>
        ))}
      </div>
      <div className="mk-wel-cap"><b>{PEEKS[0].title}</b><span>{PEEKS[0].body}</span></div>
    </div>
    <div className="mk-wel-shot">
      <div className="mk-wel-scr" aria-hidden="true">
        {[[1, 1, 0, 0], [0, 0, 0, 0], [1, 1, 1, 0]].map((bars, i) => (
          <div className="mui-card" key={i}>
            <div className={`av${i === 1 ? " av--q" : ""}`} />
            <div className="ln"><i /><i /></div>
            <div className="tr">{bars.map((b, j) => <b key={j} className={b ? "" : "o"} />)}</div>
          </div>
        ))}
      </div>
      <div className="mk-wel-cap"><b>{PEEKS[1].title}</b><span>{PEEKS[1].body}</span></div>
    </div>
    <div className="mk-wel-shot">
      <div className="mk-wel-scr" aria-hidden="true">
        <div className="mui-file"><div className="sheetico" />{PEEK_FILE}</div>
        <div className="mui-arrow">↓</div>
        <div className="mui-done"><span>✓</span>{PEEK_DONE}</div>
      </div>
      <div className="mk-wel-cap"><b>{PEEKS[2].title}</b><span>{PEEKS[2].body}</span></div>
    </div>
  </div>
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
  const copy = stateCopy(kind, data ?? {});
  const bad = kind === "expired" || kind === "unknown";
  const waiting = kind === "waiting";
  const step = stepOne(kind, data ?? {});
  const headRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headRef.current?.focus(); }, []);

  return (
    <div className="mk-wel" data-welcome={kind}>
      <div className="mk-wel-wrap">
        <header className="mk-wel-hero">
          <div className="mk-wel-herotext" role="status">
            <span className={`mk-wel-chip mk-wel-chip--${copy.chipTone} mk-wel-rise`}>{copy.chip}</span>
            <h1 className="mk-wel-h1 mk-wel-rise mk-wel-d1" ref={headRef} tabIndex={-1}>{copy.headline}</h1>
            <p className="mk-wel-lede mk-wel-rise mk-wel-d2">{copy.lede}</p>
            {bad && (
              <div className="mk-wel-form mk-wel-rise mk-wel-d3">
                <FoundingSignup idPrefix="mk-welcome" ctaLabel={FRESH_LINK_CTA} source="founders-hero"
                  formClass="mk-claimform" onNavigate={onNavigate} />
              </div>
            )}
            {copy.sub && <div className="mk-wel-sub mk-wel-rise mk-wel-d3">{copy.sub}</div>}
          </div>
          <div className="mk-wel-cardcol">
            <FoundingCard kind={kind} data={data} loading={loading} />
            <div className="mk-wel-cardcap">{copy.cardCaption}</div>
          </div>
        </header>

        {!bad && (
          <>
            <section className="mk-wel-note mk-wel-rise mk-wel-d4" aria-label="A note from Nick">
              <div className="mk-wel-photo">
                {FOUNDER_PHOTO ? <img src={FOUNDER_PHOTO} alt="Nick, QueryHawk's founder" /> : <span aria-hidden="true">{FOUNDER_INITIAL}</span>}
              </div>
              <div className="mk-wel-notebody">
                <p>{waiting ? NOTE_WAITING : NOTE_THANKS}</p>
                <p>{NOTE_REPLY}</p>
                <div className="mk-wel-sig">{NOTE_SIGN}</div>
                <div className="mk-wel-role">{NOTE_ROLE}</div>
              </div>
            </section>

            <section className="mk-wel-sec">
              <div className="mk-wel-eyebrow">{NEXT_EYEBROW}</div>
              <h2 className="mk-wel-h2">{NEXT_HEADING}</h2>
              <div className="mk-wel-steps">
                <div className="mk-wel-step is-done">
                  <div className="mk-wel-n" aria-hidden="true">✓</div>
                  <h3 className="mk-wel-h3">{step.title}</h3><p>{step.body}</p>
                  <div className="mk-wel-when">{STEP_ONE_WHEN}</div>
                </div>
                {[STEP_TWO, STEP_THREE].map((s, i) => (
                  <div className="mk-wel-step" key={s.title}>
                    <div className="mk-wel-n" aria-hidden="true">{i + 2}</div>
                    <h3 className="mk-wel-h3">{s.title}</h3><p>{s.body}</p>
                    <div className="mk-wel-when">{s.when}</div>
                  </div>
                ))}
              </div>
              {!waiting && (
                <ul className="mk-wel-perks">
                  {PERKS.map((p) => <li className="mk-wel-perk" key={p}><i aria-hidden="true">✓</i>{p}</li>)}
                </ul>
              )}
            </section>

            <section className="mk-wel-sec">
              <div className="mk-wel-eyebrow">{PEEK_EYEBROW}</div>
              <h2 className="mk-wel-h2">{PEEK_HEADING}</h2>
              <Peek />
            </section>

            <section className="mk-wel-sec">
              <div className="mk-wel-two">
                {welcomeRef && onSendAnswers && (
                  <div className="mk-wel-shape">
                    <div className="mk-wel-eyebrow">{TAPS_EYEBROW}</div>
                    <h2 className="mk-wel-h2 mk-wel-h2--sm">{TAPS_HEADING}</h2>
                    <Taps onSend={onSendAnswers} />
                  </div>
                )}
                <div className="mk-wel-ready">
                  <div className="mk-wel-eyebrow">{READY_EYEBROW}</div>
                  <h3 className="mk-wel-h3">{READY_HEADING}</h3>
                  <p>{READY_BODY}</p>
                  <ul>{READY_LIST.map((r) => <li key={r}><i aria-hidden="true">→</i>{r}</li>)}</ul>
                </div>
              </div>
            </section>

            <div className="mk-wel-close">
              <p>{waiting ? CLOSE_WAITING : CLOSE_LINE}</p>
              <div className="mk-wel-hand">{CLOSE_HAND}</div>
            </div>
          </>
        )}
      </div>
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
