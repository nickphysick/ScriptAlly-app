/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18 §D — THE ROW PEEK, opened after 450ms of hover (or Space on a focused row). v18.3 §C: it shows only
 * how to reach the agent (email, website, social); v18's index card (wishlist, genres, facts, notes) is retired.
 *
 * ⚠️ A CLICK ON A DETAIL NEVER OPENS THE ROW: each detail stops its own click and keys, so the email (which copies,
 *    v18.3.3 §C), the links and the "Add …" items do only what they say.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Agent } from "../../../types";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { materialWords } from "../../../lib/agentPanel";
import { materialRowsFromAgent } from "../../../lib/agentMaterials";

import { copyText, domainOf, hrefOf } from "./ContactCells";
export { copyText, domainOf };

/** the first social handle on record: the repeatable list first, then the mirrored platform fields */
export function socialOf(a: Pick<Agent, "socials" | "twitter" | "bluesky" | "instagram">): string | null {
  const s = (a.socials ?? []).find((x) => (x.handle ?? "").trim());
  if (s) return s.handle.trim();
  return [a.twitter, a.bluesky, a.instagram].map((v) => (v ?? "").trim()).find(Boolean) ?? null;
}

/** what to send, as the panel's index card words it ("Query letter · Synopsis · First 10 pages") */
export function sendThem(a: Pick<Agent, "materialsWanted">): string | null {
  const rows = materialRowsFromAgent(a.materialsWanted).filter((r) => r.on);
  if (!rows.length) return null;
  return rows.map(materialWords).join(" · ");
}


type Edit = (tab: AgentCardTab, focus?: AgentCardField) => void;


/** the copy glyph: two overlapping rounded squares */
const CopyIcon: React.FC = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
    <rect x="5.5" y="5.5" width="8" height="8" rx="1.6" /><path d="M10.5 3.6V3.9A1.4 1.4 0 0 0 9.1 2.5H4A1.5 1.5 0 0 0 2.5 4v5.1a1.4 1.4 0 0 0 1.4 1.4h.2" />
  </svg>
);

/**
 * v18.3.3 §C — THE EMAIL IS THE COPY BUTTON. Hover or focus turns its disc navy with the copy glyph; a click, Enter or
 * Space copies the FULL address (the text may be shortened with "…") and reads "Copied" for 1400ms. It never opens the
 * card: it stops its own click and keys, and the row's click handler ignores it as well.
 */
const CopyEmail: React.FC<{ email: string }> = ({ email }) => {
  const [done, setDone] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const go = () => {
    void copyText(email);
    setDone(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setDone(false), 1400);
  };
  return (
    <span className="cl1833-it cl1833-em" data-cl183="peek-pill" data-k="email" role="button" tabIndex={0}
      aria-label={`Copy email ${email}`} data-done={done ? "" : undefined} title={email}
      onClick={(e) => { e.stopPropagation(); go(); }}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}>
      <i className="cl183-pd"><span className="cl1833-ic"><PkIcon kind="mail" /></span><span className="cl1833-ic cl1833-cp"><CopyIcon /></span></i>
      <span className="cl183-pt" aria-live="polite">{done ? "Copied" : email}</span>
    </span>
  );
};

const PkIcon: React.FC<{ kind: "mail" | "web" | "at" }> = ({ kind }) => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "mail" ? <><rect x="2" y="3.5" width="12" height="9" rx="1.4" /><path d="m2.5 4.3 5.5 4.4 5.5-4.4" /></>
      : kind === "web" ? <><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2.2 2 9.8 0 12M8 2c-2 2.2-2 9.8 0 12" /></>
      : <><circle cx="8" cy="8" r="2.6" /><path d="M10.6 8v1.1a1.9 1.9 0 0 0 3.8 0V8a6.4 6.4 0 1 0-2.5 5.1" /></>}
  </svg>
);

/**
 * Contact list v18.3.3 §A — THE OPEN ROW SITS ON THE ROW'S OWN COLUMNS: one line of contact details laid on the row's
 * grid (a subgrid), no pill shells. The email sits in the Agent column (its disc centred under the avatar, its text on
 * the name's left edge); the website in What they want; the social handle from Replies, running into Query status and
 * stopping 24px short of the next step (§B), which the row passes in as `next`. A missing detail is "Add …" in italic
 * that opens Edit profile on that field.
 *
 * ⚠️ EACH DETAIL STOPS ITS OWN CLICK; THE LINE DOES NOT. Empty space in the open row still opens the card (as the row
 *    does), and the row's own click handler also ignores the details and the next step (belt and braces).
 */
export const ContactPeek: React.FC<{
  agent: Agent;
  onEdit: Edit;
  /** §B — the next step, at the Query status cell's right edge on this line; none when the cell already offers it */
  next?: React.ReactNode;
}> = ({ agent: a, onEdit, next }) => {
  const email = (a.email ?? "").trim();
  const site = (a.website ?? "").trim();
  const social = socialOf(a);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const missing = (k: string, kind: "mail" | "web" | "at", label: string, go: () => void) => (
    <button type="button" className="cl1833-it is-add" data-cl183="peek-pill" data-k={k} data-missing=""
      onClick={(e) => { e.stopPropagation(); go(); }} onKeyDown={stop}>
      <i className="cl183-pd"><PkIcon kind={kind} /></i><span className="cl183-pt">{label}</span>
    </button>
  );
  return (
    <div className="cl183-pk cl1833-pk" data-cl18="peek" data-cl183="peek">
      {email ? (
        <CopyEmail email={email} />
      ) : missing("email", "mail", "Add their email", () => onEdit("who", "email"))}
      {site ? (
        <a className="cl1833-it cl1833-web" data-cl183="peek-pill" data-k="website" href={hrefOf(site)} target="_blank" rel="noopener noreferrer" onClick={stop}>
          <i className="cl183-pd"><PkIcon kind="web" /></i><span className="cl183-pt cl183-dom" title={domainOf(site)}>{domainOf(site)}</span><span className="cl183-ext" data-cl183="ext" aria-hidden="true">↗</span>
        </a>
      ) : missing("website", "web", "Add their website", () => onEdit("who", "website"))}
      <span className="cl1833-tail" data-cl1833="tail">
        {social ? (
          <span className="cl1833-it cl1833-soc" data-cl183="peek-pill" data-k="social" onClick={stop}>
            <i className="cl183-pd"><PkIcon kind="at" /></i><span className="cl183-pt" title={social}>{social}</span>
          </span>
        ) : missing("social", "at", "Add a social handle", () => onEdit("who"))}
        {next}
      </span>
    </div>
  );
};
