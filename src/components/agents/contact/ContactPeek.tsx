/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v18 §D — THE ROW PEEK: the index card a row opens downwards onto after 450ms of hover (or Space on a
 * focused row). Everything the row does not show: their own words on the left, the facts on the right, the latest
 * note along the foot.
 *
 * ⚠️ ONLY WHAT THE AGENT RECORD HOLDS. There is no "not for them" (exclusions) field and no submission-form or
 *    QueryManager address on an agent, so neither is drawn: a field that cannot be stored is left out, never shown
 *    as a gap to fill. "Query via" therefore names the method and links nothing.
 * ⚠️ A CLICK INSIDE THE CARD NEVER OPENS THE ROW: the card stops every click and key from reaching the row, so Copy,
 *    the links and the "+ Add" pills do only what they say.
 */
import React, { useEffect, useRef, useState } from "react";
import type { Agent } from "../../../types";
import type { AgentCardField, AgentCardTab } from "../../../lib/agentCardStore";
import { materialWords, methodAnswer } from "../../../lib/agentPanel";
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

export const replyPolicy = (a: Pick<Agent, "noResponseMeansNo">): string | null =>
  a.noResponseMeansNo === true ? "no reply means no" : a.noResponseMeansNo === false ? "replies to every query" : null;

type Edit = (tab: AgentCardTab, focus?: AgentCardField) => void;

const Add: React.FC<{ label: string; onPress: () => void; probe: string }> = ({ label, onPress, probe }) => (
  <button type="button" className="cl18-add" data-cl18="peek-add" data-k={probe} onClick={onPress}>{label}</button>
);

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

export const ContactPeek: React.FC<{
  agent: Agent;
  /** the genres as the row orders them, and whether each is the manuscript's */
  genres: { label: string; hit: boolean }[];
  onEdit: Edit;
  onProfile: () => void;
}> = ({ agent: a, genres, onEdit, onProfile }) => {
  const wish = (a.mswlNotes ?? "").trim();
  const source = a.fieldSources?.mswlNotes?.source?.trim() || null;
  const email = (a.email ?? "").trim();
  const site = (a.website ?? "").trim();
  const social = socialOf(a);
  const via = methodAnswer(a.submissionMethod);
  const send = sendThem(a);
  const w = a.responseTimeWeeks;
  const weeks = typeof w === "number" && w > 0 ? w : null;
  const policy = replyPolicy(a);
  const note = (a.notePreview ?? "").trim();
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const row = (k: string, label: string, value: React.ReactNode) => (
    <React.Fragment key={k}><dt data-cl18="peek-label" data-k={k}>{label}</dt><dd data-cl18="peek-value" data-k={k}>{value}</dd></React.Fragment>
  );
  return (
    <div className="cl18-pk" data-cl18="peek" onClick={stop} onKeyDown={stop} onMouseDown={stop}>
      <div className="cl18-pk-l" data-cl18="peek-words">
        <h4>In their words</h4>
        {wish ? (
          <>
            <blockquote className="cl18-pk-wish" data-cl18="peek-wish">{wish}</blockquote>
            {source ? <p className="cl18-pk-src" data-cl18="peek-source">From {source}</p> : null}
          </>
        ) : <Add probe="wishlist" label="+ Add their wishlist" onPress={() => onEdit("want", "wishlist")} />}
        {genres.length ? (
          <span className="clv-gch cl18-pk-g" data-cl18="peek-genres">
            {genres.map((g) => <span key={g.label} className={g.hit ? "clv-hit" : undefined}>{g.label}</span>)}
          </span>
        ) : <Add probe="genres" label="+ Add their genres" onPress={() => onEdit("want", "genres")} />}
      </div>
      <i className="cl18-pk-rule" aria-hidden="true" />
      <dl className="cl18-pk-r" data-cl18="peek-facts">
        {row("email", "Email", email ? <><a href={`mailto:${email}`}>{email}</a><Copy text={email} /></> : <Add probe="email" label="+ Add their email" onPress={() => onEdit("who", "email")} />)}
        {row("website", "Website", site ? <a href={hrefOf(site)} target="_blank" rel="noopener noreferrer">{domainOf(site)} ↗</a> : <Add probe="website" label="+ Add their website" onPress={() => onEdit("who", "website")} />)}
        {row("social", "Social", social ?? <Add probe="social" label="+ Add a social handle" onPress={() => onEdit("who")} />)}
        {row("via", "Query via", via ?? <Add probe="via" label="+ Add how they take queries" onPress={() => onEdit("work", "method")} />)}
        {row("send", "Send them", send ?? <Add probe="send" label="+ Add what they ask for" onPress={() => onEdit("want", "materials")} />)}
        {row("replies", "Replies", weeks ? <>~{weeks} {weeks === 1 ? "week" : "weeks"}{policy ? <em className="cl18-pk-pol">{policy[0].toUpperCase() + policy.slice(1)}</em> : null}</> : <Add probe="replies" label="+ Add their reply time" onPress={() => onEdit("work", "reply")} />)}
      </dl>
      <div className="cl18-pk-f" data-cl18="peek-foot">
        <span className="cl18-pk-n"><b>Your notes</b>{note ? <i data-cl18="peek-note">{note}</i> : <i className="none" data-cl18="peek-note">No notes yet</i>}</span>
        <button type="button" className="cl18-pk-open" data-cl18="peek-open" onClick={onProfile}>Open their profile →</button>
      </div>
    </div>
  );
};
