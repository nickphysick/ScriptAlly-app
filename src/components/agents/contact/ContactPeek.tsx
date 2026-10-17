/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18 §D — THE ROW PEEK, opened after 450ms of hover (or Space on a focused row). v18.3 §C: it shows only
 * how to reach the agent (email, website, social); v18's index card (wishlist, genres, facts, notes) is retired.
 *
 * ⚠️ A CLICK INSIDE THE PEEK NEVER OPENS THE ROW: it stops every click and key from reaching the row, so Copy, the
 *    links and the "Add …" pills do only what they say.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Agent } from "../../../types";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { materialWords } from "../../../lib/agentPanel";
import { materialRowsFromAgent } from "../../../lib/agentMaterials";

/** "agency.co.uk" for a website, without the scheme or a trailing slash */
export const domainOf = (url: string): string => url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
const hrefOf = (url: string): string => (/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

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


const Copy: React.FC<{ text: string }> = ({ text }) => {
  const [done, setDone] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  return (
    <button type="button" className="cl18-copy" data-cl18="peek-copy" onClick={() => {
      void navigator.clipboard?.writeText(text).catch(() => undefined);
      setDone(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setDone(false), 1400);
    }}>{done ? "Copied" : "Copy"}</button>
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
 * Contact list v18.3 §C — THE PEEK IS HOW TO REACH THE AGENT, AND NOTHING ELSE: one line of three pills (email,
 * website, social) under the row's main line, starting at the agent's name. A missing one is a dashed "Add …" pill that
 * opens Edit profile on that field. The open row keeps its own background: no tint, lift, shadow or radius change.
 */
export const ContactPeek: React.FC<{
  agent: Agent;
  onEdit: Edit;
}> = ({ agent: a, onEdit }) => {
  const email = (a.email ?? "").trim();
  const site = (a.website ?? "").trim();
  const social = socialOf(a);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const missing = (k: string, kind: "mail" | "web" | "at", label: string, go: () => void) => (
    <button type="button" className="cl183-pp is-add" data-cl183="peek-pill" data-k={k} data-missing="" onClick={go}>
      <i className="cl183-pd"><PkIcon kind={kind} /></i><span>{label}</span>
    </button>
  );
  return (
    <div className="cl183-pk" data-cl18="peek" data-cl183="peek" onClick={stop} onKeyDown={stop} onMouseDown={stop}>
      {email ? (
        <span className="cl183-pp" data-cl183="peek-pill" data-k="email">
          <i className="cl183-pd"><PkIcon kind="mail" /></i><a href={`mailto:${email}`} className="cl183-pt" title={email}>{email}</a><Copy text={email} />
        </span>
      ) : missing("email", "mail", "Add their email", () => onEdit("who", "email"))}
      {site ? (
        <a className="cl183-pp" data-cl183="peek-pill" data-k="website" href={hrefOf(site)} target="_blank" rel="noopener noreferrer">
          <i className="cl183-pd"><PkIcon kind="web" /></i><span className="cl183-pt cl183-dom" title={domainOf(site)}>{domainOf(site)}</span><span className="cl183-ext" data-cl183="ext" aria-hidden="true">↗</span>
        </a>
      ) : missing("website", "web", "Add their website", () => onEdit("who", "website"))}
      {social ? (
        <span className="cl183-pp" data-cl183="peek-pill" data-k="social">
          <i className="cl183-pd"><PkIcon kind="at" /></i><span className="cl183-pt" title={social}>{social}</span>
        </span>
      ) : missing("social", "at", "Add a social handle", () => onEdit("who"))}
    </div>
  );
};
