/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Query card v158 §3 (design-refs/query-card-v158/query-card-v158.html, "Profile, facts first") — the slide-out card's
 * Agent tab while reading: three fact boxes (Replies in, Takes queries, Last heard), the contact row (Copy email, the
 * website), what the agent asks for as a checklist, the wishlist, and two links. The editing view (AgentEditPane) is
 * QcCard152's, untouched.
 *
 * ⚠️ THE AGENT IS ALWAYS NAMED. Never "he", "she" or "they": the shared method words' "Through their submission form" is
 *    said "By online form" here (`takesWords`).
 * ⚠️ AN UNRECORDED VALUE IS A LINK, never a dash: it opens the agent's card at that detail (`onField`).
 * ⚠️ COPY EMAIL KEEPS THE PAGE'S BEHAVIOUR AND TOAST (`onCopyEmail`); the contact row never wraps, the address is cut.
 */
import React from "react";
import type { AskChip } from "../../../lib/qcThread152";
import { dayLabel } from "../../../lib/qcThread152";

type Field = "wishlist" | "email" | "website" | "method" | "reply" | "materials" | null;
type Dbl = (k: "weeks" | "asks" | "method" | "wishlist" | "email" | "website") => Record<string, unknown>;

export interface AgentTab158Props {
  first: string;
  nowMs: number;
  weeks: number | null;
  nrmn: boolean | null;
  how: string | null;
  queriedVia: string | null;
  sentMs: number | null;
  lastHeardMs: number | null;
  asks: { chips: AskChip[]; missing: string[] };
  hasAsks: boolean;
  wishlist: string;
  email: string;
  website: string;
  websiteHref: string | null;
  onCopyEmail: () => void;
  onField: (f: Field) => void;
  onEdit: () => void;
  dbl: Dbl;
}

/** "Through their submission form" (lib/agentPanel methodAnswer) names the agent by a pronoun: the box says it plainly */
export const takesWords = (how: string | null): string | null => (how === "Through their submission form" ? "By online form" : how);
const days = (a: number, b: number) => Math.max(0, Math.round((a - b) / 86_400_000));
const pl = (n: number, one: string) => `${n} ${n === 1 ? one : `${one}s`}`;
/** "Query letter" → "Query letter"; "FIRST 5 CHAPTERS" → "First 5 chapters" */
export const sentenceCase = (s: string): string => { const t = s.trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : t; };

export const MAIL = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><rect x="2" y="3.5" width="12" height="9" rx="1.5" /><path d="m2.5 4.5 5.5 4 5.5-4" /></svg>;
export const WEB = <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true"><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" /></svg>;
export const TICK = <svg viewBox="0 0 12 12" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m3 6.2 2 2 4-4.4" /></svg>;

/* Agent card v2 — the presentational parts the agent card shares (lifted, not copied): a fact box, Copy email, the
   website button. Their DOM is the query card's own; the agent card draws them inside its own `.qc152` root. */
export const NxBox: React.FC<{ k: string; label: string; value: React.ReactNode; sub?: React.ReactNode; extra?: Record<string, unknown> }> = ({ k, label, value, sub, extra }) => (
  <div className="nx-box" data-qc158="box" data-k={k} {...extra}>
    <small>{label}</small>
    <b data-qc158="value">{value}</b>
    {sub ? <i>{sub}</i> : null}
  </div>
);
export const NxCopyEmail: React.FC<{ email: string; onCopy: () => void; extra?: Record<string, unknown> }> = ({ email, onCopy, extra }) => (
  <button type="button" className="nx-btn" data-qc158="copy-email" onClick={onCopy} {...extra}>{MAIL}Copy email<small data-qc158="address">{email}</small></button>
);
export const NxSite: React.FC<{ label: string; href: string | null; extra?: Record<string, unknown> }> = ({ label, href, extra }) => (href
  ? <a className="nx-btn gh" data-qc158="website" href={href} target="_blank" rel="noreferrer" {...extra}>{WEB}{label}</a>
  : <span className="nx-btn gh" data-qc158="website" {...extra}>{WEB}{label}</span>);

export const AgentTab158: React.FC<AgentTab158Props> = (p) => {
  const add = (label: string, f: Field, k: string) => (
    <button type="button" className="nx-lk" data-qc158="add" data-k={k} onClick={() => p.onField(f)}>{label}</button>
  );
  const how = takesWords(p.how);
  const site = p.website.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return (
    <div className="nx" data-qc152="agent-pane" data-qc158="agent">
      <div className="nx-boxes" data-qc158="boxes">
        <NxBox k="reply" label="Replies in" extra={p.dbl("weeks")}
          value={p.weeks != null ? <>About {pl(p.weeks, "week")}</> : add("Add reply time", "reply", "reply")}
          sub={p.nrmn === true ? "no reply means no" : p.nrmn === false ? "always replies" : null} />
        <NxBox k="method" label="Takes queries" extra={p.dbl("method")}
          value={how ? how : add(`Add how ${p.first} takes queries`, "method", "method")}
          sub={p.queriedVia ? <>you queried {p.queriedVia}</> : null} />
        <NxBox k="heard" label="Last heard"
          value={p.lastHeardMs != null ? dayLabel(p.lastHeardMs, p.nowMs) : "Not yet"}
          sub={p.lastHeardMs != null ? (days(p.nowMs, p.lastHeardMs) === 0 ? "today" : `${pl(days(p.nowMs, p.lastHeardMs), "day")} ago`)
            : p.sentMs != null ? <>since {dayLabel(p.sentMs, p.nowMs)}</> : null} />
      </div>

      <div className="nx-reach" data-qc158="contact">
        {p.email
          ? <NxCopyEmail email={p.email} onCopy={p.onCopyEmail} extra={p.dbl("email")} />
          : <button type="button" className="nx-btn gh" data-qc158="add" data-k="email" onClick={() => p.onField("email")}>+ Add an email</button>}
        {site
          ? <NxSite label={site} href={p.websiteHref} extra={p.dbl("website")} />
          : <button type="button" className="nx-btn gh" data-qc158="add" data-k="website" onClick={() => p.onField("website")}>+ Add a website</button>}
      </div>

      <section data-qc158="asks" {...p.dbl("asks")}>
        <h4>What {p.first} asks for</h4>
        {p.hasAsks ? <>
          <ul className="nx-list">
            {p.asks.chips.map((c) => (
              <li key={c.label} data-qc158="ask" data-sent={c.sent ? "" : undefined}>
                <span className={`nx-tick${c.sent ? "" : " no"}`} aria-hidden="true">{TICK}</span>
                {sentenceCase(c.label)}
                <span className="r">{c.sent ? "sent with your query" : "not sent"}</span>
              </li>
            ))}
          </ul>
          <p className="nx-sum" data-qc158="ask-sum">{p.asks.missing.length
            ? `You didn’t send ${p.asks.missing.map((x) => x.toLowerCase()).join(", ")}.`
            : `You sent everything ${p.first} asks for.`}</p>
        </> : <p className="nx-empty">Nothing saved yet. {add(`Add what ${p.first} asks for`, "materials", "asks")}</p>}
      </section>

      <section data-qc158="wishlist" {...p.dbl("wishlist")}>
        <h4>Wishlist <em>in {p.first}’s words</em></h4>
        {p.wishlist ? <p className="nx-quote" data-qc152="wishlist">{p.wishlist}</p>
          : <p className="nx-empty">Nothing saved yet. {add(`Add ${p.first}’s wishlist`, "wishlist", "wishlist")}</p>}
      </section>

      <div className="nx-foot">
        <button type="button" className="nx-lk" data-qc152="open-agent" onClick={() => p.onField(null)}>Open {p.first}’s full card</button>
        <button type="button" className="nx-lk" data-qc158="edit-details" onClick={p.onEdit}>Edit these details</button>
      </div>
    </div>
  );
};
