/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact — the public marketing route at /contact (ref: design-refs/scriptally-contact.html).
 *
 * ⚠️ IT IS PUBLIC AND HAS TO BE. Someone locked out of their account, or asking for that account
 * to be deleted, cannot sign in to ask. Putting this behind the auth gate would close the one door
 * that must stay open — which is also why the privacy policy points at it by name.
 *
 * ⚠️ NO PHONE FIELD AND NO FIRST/LAST SPLIT. Both are in the drawer of things a contact form
 * habitually asks for and never uses; a name is one field because a name is one thing, and there
 * is no phone to ring.
 *
 * ⚠️ THE TRANSPORT IS A CONSTANT, NOT A BRANCH THIS FILE DECIDES. `CONTACT_TRANSPORT` picks
 * between the mail client and the deployed callable; the form's behaviour is otherwise identical,
 * so neither path is the one that only gets exercised in production.
 */

import React, { useState } from "react";
import { useEffect } from "react";
import {
  CONTACT_DOCUMENT_TITLE, CONTACT_EYEBROW, CONTACT_H1, CONTACT_LEDE, CONTACT_WAYS,
  CONTACT_TOPICS, CONTACT_FORM_EYEBROW, CONTACT_FORM_H2, CONTACT_FORM_SUB, CONTACT_FORM_SEND,
  CONTACT_FINE_PRINT, CONTACT_FIELD_LABELS, CONTACT_PLACEHOLDERS,
} from "./contactCopy";
import { Runs } from "./CopyRuns";
import { MarketingFooter } from "./MarketingFooter";
import { ContactWayPlate } from "./marketingMarks";
import { LEGAL_ENTITY_NAME, REGISTERED_ADDRESS, SUPPORT_EMAIL } from "../lib/companyInfo";
import {
  CONTACT_TRANSPORT, CONTACT_HONEYPOT_FIELD, CONTACT_LAST_SENT_KEY, CONTACT_MAX,
  ContactDraft, ContactField, contactMailto, isRateLimited, looksAutomated, validateContact,
} from "../lib/contactTransport";

type SendState = "idle" | "sending" | "sent" | "failed";

const EMPTY: ContactDraft = { name: "", email: "", topic: CONTACT_TOPICS[0], message: "", trap: "" };

const readLastSent = (): number | null => {
  try {
    const raw = window.localStorage.getItem(CONTACT_LAST_SENT_KEY);
    return raw ? Number(raw) : null;
  } catch { return null; }
};

export const ContactPage: React.FC<{
  onNavigate: (tab: string, subPageName?: string) => void;
}> = ({ onNavigate }) => {
  const [draft, setDraft] = useState<ContactDraft>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [state, setState] = useState<SendState>("idle");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const prev = document.title;
    document.title = CONTACT_DOCUMENT_TITLE;
    return () => { document.title = prev; };
  }, []);

  const set = (key: keyof ContactDraft) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  const send = async () => {
    /* A bot sees success and learns nothing. The draft is not sent and nothing is recorded. */
    if (looksAutomated(draft)) { setState("sent"); return; }

    const found = validateContact(draft);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    if (isRateLimited(readLastSent(), Date.now())) {
      setState("failed");
      setNotice("That's already on its way — give it a moment before sending another.");
      return;
    }

    if (CONTACT_TRANSPORT === "mailto") {
      /* The mail client is the transport: the writer's own outbox is the record, and nothing is
         claimed to have been delivered that has not been. */
      window.location.href = contactMailto(SUPPORT_EMAIL, draft);
      try { window.localStorage.setItem(CONTACT_LAST_SENT_KEY, String(Date.now())); } catch { /* private mode */ }
      setState("sent");
      return;
    }

    setState("sending");
    try {
      /* `getFunctions(undefined, …)` — the repo's own shape for every callable (smartImport,
         suggestComps, extractFromEmail, assistAgentData), which resolves the default app rather
         than importing one. Loaded lazily so a public page that will usually never send does not
         pull the functions SDK into the marketing bundle. */
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const call = httpsCallable(getFunctions(undefined, "europe-west2"), "sendContactMessage");
      await call({
        name: draft.name,
        email: draft.email,
        topic: draft.topic,
        message: draft.message,
        [CONTACT_HONEYPOT_FIELD]: draft.trap ?? "",
      });
      try { window.localStorage.setItem(CONTACT_LAST_SENT_KEY, String(Date.now())); } catch { /* private mode */ }
      setState("sent");
    } catch (e) {
      /* ⚠️ A FAILURE SAYS SO AND KEEPS THE WORDS. Clearing the form on an error would lose the
         message the writer just typed, which is the one thing they cannot get back. */
      setState("failed");
      setNotice(
        (e as { message?: string })?.message ||
        "That didn't send. Please try again, or email us directly.",
      );
    }
  };

  return (
    <div>
      <main>
        <div className="mk-contactsplit">
          <div className="mk-cleft">
            <div className="mk-eyebrow">{CONTACT_EYEBROW}</div>
            <h1>{CONTACT_H1}</h1>
            <p className="mk-clede">{CONTACT_LEDE}</p>
            <a className="mk-cmail" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>

            <div className="mk-ways">
              {CONTACT_WAYS.map((way) => (
                <div className="mk-way" key={way.key}>
                  <ContactWayPlate way={way.key} />
                  <div>
                    <strong>{way.heading}</strong>
                    <span>{way.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mk-formcard">
            <div className="mk-eyebrow">{CONTACT_FORM_EYEBROW}</div>
            <h2>{CONTACT_FORM_H2}</h2>
            <p className="mk-csub">{CONTACT_FORM_SUB}</p>

            <div className="mk-field">
              <label htmlFor="cf-name">{CONTACT_FIELD_LABELS.name}</label>
              <input
                id="cf-name" type="text" autoComplete="name" maxLength={CONTACT_MAX.name}
                placeholder={CONTACT_PLACEHOLDERS.name} value={draft.name} onChange={set("name")}
              />
              {errors.name && <span className="mk-fielderr">{errors.name}</span>}
            </div>

            <div className="mk-field">
              <label htmlFor="cf-email">{CONTACT_FIELD_LABELS.email}</label>
              <input
                id="cf-email" type="email" autoComplete="email" maxLength={CONTACT_MAX.email}
                placeholder={CONTACT_PLACEHOLDERS.email} value={draft.email} onChange={set("email")}
                aria-invalid={!!errors.email}
              />
              {errors.email && <span className="mk-fielderr">{errors.email}</span>}
            </div>

            <div className="mk-field">
              <label htmlFor="cf-topic">{CONTACT_FIELD_LABELS.topic}</label>
              <select id="cf-topic" value={draft.topic} onChange={set("topic")}>
                {CONTACT_TOPICS.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            </div>

            <div className="mk-field">
              <label htmlFor="cf-msg">{CONTACT_FIELD_LABELS.message}</label>
              <textarea
                id="cf-msg" maxLength={CONTACT_MAX.message} placeholder={CONTACT_PLACEHOLDERS.message}
                value={draft.message} onChange={set("message")} aria-invalid={!!errors.message}
              />
              {errors.message && <span className="mk-fielderr">{errors.message}</span>}
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

            <button
              type="button" className="mk-cbtn" onClick={send}
              disabled={state === "sending" || state === "sent"}
            >
              {state === "sending" ? "Sending…" : state === "sent" ? "Sent" : CONTACT_FORM_SEND}
            </button>

            {state === "sent" && (
              <p className="mk-cstate" role="status">
                {CONTACT_TRANSPORT === "mailto"
                  ? "Your mail client should have opened with the message ready to send."
                  : "Thank you — that's with us. You'll hear back within two working days."}
              </p>
            )}
            {state === "failed" && <p className="mk-cstate mk-cstate--bad" role="alert">{notice}</p>}

            <p className="mk-cfine"><Runs runs={CONTACT_FINE_PRINT} onNavigate={onNavigate} /></p>
          </div>
        </div>

        <div className="mk-svcline">
          <p>
            <strong>Service information.</strong> ScriptAlly is operated by {LEGAL_ENTITY_NAME},{" "}
            {REGISTERED_ADDRESS}, United Kingdom.
          </p>
        </div>
      </main>

      <MarketingFooter onNavigate={onNavigate} />
    </div>
  );
};
