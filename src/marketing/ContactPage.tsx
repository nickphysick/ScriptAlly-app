/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact — the public marketing route at /contact. Rebuilt to design-refs/contact-terms-unsubscribe-v1.html
 * (non-workspace v1, Phase 6): the heading and one line, the address and the founding writers' route on
 * the left, and a form whose topic is a row of choices, each with its own prompt.
 *
 * ⚠️ IT IS PUBLIC AND HAS TO BE. Someone locked out of their account, or asking for that account
 * to be deleted, cannot sign in to ask. Putting this behind the auth gate would close the one door
 * that must stay open — which is also why the privacy policy points at it by name.
 *
 * ⚠️ NO PHONE FIELD AND NO FIRST/LAST SPLIT. A name is one field because a name is one thing, and
 * there is no phone to ring.
 *
 * ⚠️ THE TRANSPORT IS A CONSTANT, NOT A BRANCH THIS FILE DECIDES. `CONTACT_TRANSPORT` picks
 * between the mail client and the deployed callable; the form's behaviour is otherwise identical.
 * It is "mailto" today (`sendContactMessage` is not deployed), and the sent panel says so.
 *
 * ⚠️ EVERY STEP'S STATE IS `contactForm.ts`'s REDUCER. This file renders it and moves focus where the
 * reducer says; `ContactFormView` is pure props so a string render can show each state.
 */

import React, { useEffect, useReducer } from "react";
import {
  CONTACT_DOCUMENT_TITLE, CONTACT_H1, CONTACT_LEDE, CONTACT_MAIL_H2, CONTACT_FOUNDING_H2,
  CONTACT_FOUNDING_BODY, CONTACT_TOPICS, CONTACT_TOPIC_DETAIL, CONTACT_PAGE_TOPIC, CONTACT_DATA_TOPIC,
  CONTACT_DATA_WANTS, CONTACT_FORM_H2, CONTACT_FORM_SUB, CONTACT_FORM_SEND, CONTACT_FORM_SENDING,
  CONTACT_FINE_PRINT, CONTACT_FIELD_LABELS, CONTACT_OPTIONAL, CONTACT_PLACEHOLDERS, CONTACT_SENT,
  CONTACT_AGAIN, CONTACT_FAILED_GENERIC, CONTACT_FAILED_TOO_SOON, CONTACT_ART_ALT, ContactTopic,
} from "./contactCopy";
import { usePhone } from "./usePhone";
import { Runs } from "./CopyRuns";
import { SUPPORT_EMAIL } from "../lib/companyInfo";
import {
  CONTACT_TRANSPORT, CONTACT_HONEYPOT_FIELD, CONTACT_LAST_SENT_KEY, CONTACT_MAX,
  ContactDraft, contactExtras, contactMailto, isRateLimited, looksAutomated, validateContact,
} from "../lib/contactTransport";
import {
  CONTACT_IDS, ContactAction, ContactFormState, contactInitial, contactReducer,
} from "./contactForm";

type Nav = (tab: string, subPageName?: string) => void;

/**
 * The Archivist at a writing desk. The version is the first eight hex digits of the file's md5 —
 * nothing under `public/` is fingerprinted by the build, so it is what stops a re-export being
 * served stale.
 */
const ARCHIVIST = { src: "/images/contact-archivist.png", version: "a603d9cb", width: 800, height: 800 };

const EXTRA_TOPICS = { page: CONTACT_PAGE_TOPIC, data: CONTACT_DATA_TOPIC, firstWant: CONTACT_DATA_WANTS[0] };

const readLastSent = (): number | null => {
  try {
    const raw = window.localStorage.getItem(CONTACT_LAST_SENT_KEY);
    return raw ? Number(raw) : null;
  } catch { return null; }
};

/**
 * The form card, or the sent panel in its place — every state the reducer can be in, from props
 * alone. `onSubmit` is the page's send; nothing here reaches a network or a mail client.
 */
export const ContactFormView: React.FC<{
  state: ContactFormState;
  dispatch: (a: ContactAction) => void;
  onSubmit: () => void;
  onNavigate: Nav;
}> = ({ state, dispatch, onSubmit, onNavigate }) => {
  const { draft, errors, status } = state;

  if (status === "sent") {
    const words = CONTACT_SENT[CONTACT_TRANSPORT];
    return (
      <section className="mk-formcard mk-cdone" aria-labelledby="cf-done-h" role="status">
        <h2 id="cf-done-h" className="mk-formh2">{words.heading}</h2>
        <p className="mk-csub">{words.body(state.sentTo)}</p>
        {words.fallback && (
          <p className="mk-csub">{words.fallback}<a className="mk-cmail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.</p>
        )}
        <button id={CONTACT_IDS.again} type="button" className="mk-btn mk-cagain" onClick={() => dispatch({ type: "again" })}>
          {CONTACT_AGAIN}
        </button>
      </section>
    );
  }

  const topic = draft.topic as ContactTopic;
  const detail = CONTACT_TOPIC_DETAIL[topic] ?? CONTACT_TOPIC_DETAIL[CONTACT_TOPICS[0]];
  const set = (field: keyof ContactDraft) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => dispatch({ type: "edit", field, value: e.target.value });

  /* Arrow keys move the choice (and focus) round the row, as a radio group does. */
  const onTopicKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const i = CONTACT_TOPICS.indexOf(topic);
    const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    dispatch({ type: "topic", topic: CONTACT_TOPICS[(i + step + CONTACT_TOPICS.length) % CONTACT_TOPICS.length] });
  };

  const err = (field: "name" | "email" | "message", id: string) =>
    errors[field] ? <span id={`${id}-err`} className="mk-fielderr">{errors[field]}</span> : null;

  /* ⚠️ A REAL <form>, so Enter sends from any field and the region is named by its own heading.
     `noValidate` because the words come from `validateContact`, not from the browser's bubbles. */
  return (
    <form
      className="mk-formcard"
      aria-labelledby="cf-title"
      noValidate
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      <h2 id="cf-title" className="mk-formh2">{CONTACT_FORM_H2}</h2>
      <p className="mk-csub">{CONTACT_FORM_SUB}</p>

      <div className="mk-field">
        <span id="cf-topic-l" className="mk-flabel">{CONTACT_FIELD_LABELS.topic}</span>
        <div className="mk-jychips" role="radiogroup" aria-labelledby="cf-topic-l">
          {CONTACT_TOPICS.map((t) => (
            <button
              key={t} id={CONTACT_IDS.topic(t)} type="button" className="mk-jychip" role="radio"
              aria-checked={t === topic} tabIndex={t === topic ? 0 : -1}
              onClick={() => dispatch({ type: "topic", topic: t })} onKeyDown={onTopicKey}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {detail.tip && (
        <div className="mk-callout">
          <span className="mk-corule" aria-hidden="true" />
          <p>{detail.tip}</p>
        </div>
      )}

      <div className="mk-field">
        <label htmlFor={CONTACT_IDS.name}>{CONTACT_FIELD_LABELS.name}</label>
        <input
          id={CONTACT_IDS.name} type="text" autoComplete="name" maxLength={CONTACT_MAX.name}
          value={draft.name} onChange={set("name")}
          aria-invalid={!!errors.name} aria-describedby={errors.name ? "cf-name-err" : undefined}
        />
        {err("name", CONTACT_IDS.name)}
      </div>

      <div className="mk-field">
        <label htmlFor={CONTACT_IDS.email}>{CONTACT_FIELD_LABELS.email}</label>
        <input
          id={CONTACT_IDS.email} type="email" autoComplete="email" maxLength={CONTACT_MAX.email}
          placeholder={CONTACT_PLACEHOLDERS.email} value={draft.email} onChange={set("email")}
          aria-invalid={!!errors.email} aria-describedby={errors.email ? "cf-email-err" : undefined}
        />
        {err("email", CONTACT_IDS.email)}
      </div>

      {topic === CONTACT_PAGE_TOPIC && (
        <div className="mk-field">
          <label htmlFor={CONTACT_IDS.page}>
            {CONTACT_FIELD_LABELS.page} <span className="mk-foptional">{CONTACT_OPTIONAL}</span>
          </label>
          <input
            id={CONTACT_IDS.page} type="text" maxLength={CONTACT_MAX.name}
            placeholder={CONTACT_PLACEHOLDERS.page} value={draft.page ?? ""} onChange={set("page")}
          />
        </div>
      )}
      {topic === CONTACT_DATA_TOPIC && (
        <div className="mk-field">
          <label htmlFor={CONTACT_IDS.want}>{CONTACT_FIELD_LABELS.want}</label>
          <select id={CONTACT_IDS.want} value={draft.want || CONTACT_DATA_WANTS[0]} onChange={set("want")}>
            {CONTACT_DATA_WANTS.map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </div>
      )}

      <div className="mk-field">
        <label htmlFor={CONTACT_IDS.message}>{CONTACT_FIELD_LABELS.message}</label>
        <textarea
          id={CONTACT_IDS.message} maxLength={CONTACT_MAX.message}
          placeholder={detail.placeholder} value={draft.message} onChange={set("message")}
          aria-invalid={!!errors.message} aria-describedby={errors.message ? "cf-msg-err" : undefined}
        />
        {err("message", CONTACT_IDS.message)}
      </div>

      {/* ⚠️ THE HONEYPOT. Off-screen rather than `display:none` — some bots skip hidden
          fields but fill positioned ones — labelled for anyone reading the markup, and
          excluded from the tab order and the accessibility tree so no person meets it. */}
      <div className="mk-trap" aria-hidden="true">
        <label htmlFor="cf-website">Leave this field empty</label>
        <input
          id="cf-website" name={CONTACT_HONEYPOT_FIELD} type="text" tabIndex={-1}
          autoComplete="off" value={draft.trap ?? ""} onChange={set("trap")}
        />
      </div>

      <button type="submit" className="mk-cbtn" disabled={status === "sending"}>
        {status === "sending" ? CONTACT_FORM_SENDING : CONTACT_FORM_SEND}
      </button>

      {status === "failed" && (
        <p id={CONTACT_IDS.notice} className="mk-cstate mk-cstate--bad" role="alert" tabIndex={-1}>{state.notice}</p>
      )}

      <p className="mk-cfine"><Runs runs={CONTACT_FINE_PRINT} onNavigate={onNavigate} /></p>
    </form>
  );
};

export const ContactPage: React.FC<{ onNavigate: Nav }> = ({ onNavigate }) => {
  const [state, dispatch] = useReducer(contactReducer, undefined, contactInitial);
  /* ⚠️ ON A PHONE THE TOP OF THE PAGE IS PRICING'S (public pages on phones v1, Nick's pick 7B): a white
     card over the navy holding the heading and the lede, with the desk hawk perched on its corner. It
     wears Pricing's own classes, and `.mk-sheet:has(.mk-pvm)` starts the sheet below the navy exactly
     as it does there. The desktop render (and every unit test) is unchanged by it. */
  const phone = usePhone();

  useEffect(() => {
    const prev = document.title;
    document.title = CONTACT_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  /* Focus goes where the reducer's last step says: the first field that needs something, the sent
     panel's button, the message box, the chosen topic, or the failure's own sentence. Keyed on the
     whole state, so pressing Send twice on the same mistake moves focus back to it twice; an edit
     sets `focus` to null, so typing never moves it. */
  useEffect(() => {
    if (state.focus) document.getElementById(state.focus)?.focus({ preventScroll: state.focus.startsWith("cf-topic-") });
  }, [state]);

  const send = async () => {
    const draft = state.draft;
    /* A bot sees success and learns nothing. The draft is not sent and nothing is recorded. */
    if (looksAutomated(draft)) { dispatch({ type: "sent" }); return; }

    const found = validateContact(draft);
    if (Object.keys(found).length > 0) { dispatch({ type: "invalid", errors: found }); return; }

    if (isRateLimited(readLastSent(), Date.now())) {
      dispatch({ type: "failed", notice: CONTACT_FAILED_TOO_SOON });
      return;
    }

    const extras = contactExtras(draft, EXTRA_TOPICS);

    if (CONTACT_TRANSPORT === "mailto") {
      /* The mail client is the transport: the writer's own outbox is the record, and the sent
         panel says the message is waiting there — nothing is claimed to have been delivered. */
      window.location.href = contactMailto(SUPPORT_EMAIL, draft, extras);
      try { window.localStorage.setItem(CONTACT_LAST_SENT_KEY, String(Date.now())); } catch { /* private mode */ }
      dispatch({ type: "sent" });
      return;
    }

    dispatch({ type: "sending" });
    try {
      /* `getFunctions(undefined, …)` — the repo's own shape for every callable, which resolves the
         default app rather than importing one. Loaded lazily so a public page that will usually
         never send does not pull the functions SDK into the marketing bundle. */
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const call = httpsCallable(getFunctions(undefined, "europe-west2"), "sendContactMessage");
      await call({
        name: draft.name,
        email: draft.email,
        topic: draft.topic,
        message: [draft.message.trim(), ...extras].join("\n\n"),
        [CONTACT_HONEYPOT_FIELD]: draft.trap ?? "",
      });
      try { window.localStorage.setItem(CONTACT_LAST_SENT_KEY, String(Date.now())); } catch { /* private mode */ }
      dispatch({ type: "sent" });
    } catch (e) {
      /* ⚠️ A FAILURE SAYS SO AND KEEPS THE WORDS — the reducer's "failed" touches no field. */
      dispatch({ type: "failed", notice: (e as { message?: string })?.message || CONTACT_FAILED_GENERIC });
    }
  };

  return (
    <div>
      {phone && (
        <div className="mk-pvm mk-pvm--contact">
          <section className="mk-pvbox" aria-labelledby="mk-ch1">
            <img className="mk-pvart" src={ARCHIVIST.src + "?v=" + ARCHIVIST.version} alt=""
                 width={ARCHIVIST.width} height={ARCHIVIST.height} />
            <div className="mk-pvin">
              <h1 id="mk-ch1" className="mk-pvh1">{CONTACT_H1}</h1>
              <p className="mk-pvsub">{CONTACT_LEDE}</p>
            </div>
          </section>
        </div>
      )}
      <main className="mk-contact">
        <div className="mk-contactsplit">
          <div className="mk-cleft">
            {!phone && (<>
              <h1 className="mk-ch1">{CONTACT_H1}</h1>
              <p className="mk-clede">{CONTACT_LEDE}</p>
            </>)}
            <div className="mk-cways">
              <h2 className="mk-wayh">{CONTACT_MAIL_H2}</h2>
              <p className="mk-waybody"><a className="mk-cmail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></p>
              <h2 className="mk-wayh">{CONTACT_FOUNDING_H2}</h2>
              <p className="mk-waybody">{CONTACT_FOUNDING_BODY}</p>
            </div>

            {/* On a phone the hawk perches on the opening card instead (above), so it is drawn once. */}
            {!phone && (
              <img
                className="mk-cart"
                src={ARCHIVIST.src + "?v=" + ARCHIVIST.version}
                alt={CONTACT_ART_ALT}
                width={ARCHIVIST.width}
                height={ARCHIVIST.height}
                loading="lazy"
              />
            )}
          </div>

          <ContactFormView state={state} dispatch={dispatch} onSubmit={() => void send()} onNavigate={onNavigate} />
        </div>
      </main>
    </div>
  );
};
