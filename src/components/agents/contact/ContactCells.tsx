/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contact list v19 §C — THE ROW'S CONTACT CELLS: Date added, Website and Email, each in its own column (or website
 * and email stacked in one, when the two do not both fit). They answer their own clicks and never open the card:
 * each stops its click and keys, and the row's click handler ignores them as well (`data-cl19` below).
 *
 *   Website  serif, ink; a 13px navy ↗ shows on hover (it keeps its room, so nothing moves); opens in a new tab.
 *   Email    the address IS the copy button (v18.3.3 §C, moved here from the open row): click, Enter or Space copies
 *            the FULL address; for 1400ms the address is replaced IN PLACE by "✓ Copied" in green italics. The
 *            address stays laid out underneath, hidden, so the column never changes width.
 *   Missing  "Add email" / "Add website" with its icon, opening today's add flow (the agent card at that field).
 */
import React, { useEffect, useRef, useState } from "react";
import type { Agent } from "../../../types";
import { addedParts } from "../../../lib/contactList";

/** "agency.co.uk" for a website, without the scheme, a leading www. or a trailing slash */
export const domainOf = (url: string): string => url.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "");
export const hrefOf = (url: string): string => (/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`);

/** Copies `text`: the Clipboard API, falling back to a selected textarea and `execCommand("copy")` (an insecure
    origin, or a browser that refuses the API) */
export async function copyText(text: string): Promise<boolean> {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch { /* fall back */ }
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0"; ta.style.pointerEvents = "none";
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand("copy"); ta.remove(); return ok;
  } catch { return false; }
}

/** how long "✓ Copied" stands in for the address */
export const COPIED_MS = 1400;

export const CellIcon: React.FC<{ kind: "mail" | "web" }> = ({ kind }) => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {kind === "mail" ? <><rect x="2" y="3.5" width="12" height="9" rx="1.4" /><path d="m2.5 4.3 5.5 4.4 5.5-4.4" /></>
      : <><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2.2 2 9.8 0 12M8 2c-2 2.2-2 9.8 0 12" /></>}
  </svg>
);

/** the Date added cell: "12 May" in ink, the year at 45%; nothing when the record has no readable date */
export const DateAdded: React.FC<{ agent: Pick<Agent, "dateAdded"> }> = ({ agent }) => {
  const p = addedParts(agent);
  return p ? <span className="cl19-dt" data-cl19="date">{p.dm} <span className="cl19-yr">{p.y}</span></span> : <span className="cl19-dt" data-cl19="date" data-none="" />;
};

export const Website: React.FC<{ url: string }> = ({ url }) => (
  <a className="cl19-web" data-cl19="website" href={hrefOf(url)} target="_blank" rel="noopener noreferrer"
    onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
    <span className="cl19-wt">{domainOf(url)}</span><i className="cl19-ext" aria-hidden="true">↗</i>
  </a>
);

export const CopyEmail: React.FC<{ email: string }> = ({ email }) => {
  const [done, setDone] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const go = () => {
    void copyText(email);
    setDone(true); window.clearTimeout(t.current); t.current = window.setTimeout(() => setDone(false), COPIED_MS);
  };
  return (
    <span className="cl19-em" data-cl19="email" role="button" tabIndex={0} title="Copy email" aria-label={`Copy email ${email}`}
      data-done={done ? "" : undefined}
      onClick={(e) => { e.stopPropagation(); go(); }}
      onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } }}>
      <span className="cl19-et">{email}</span>
      {done ? <span className="cl19-copied" data-cl19="copied" aria-live="polite">✓ Copied</span> : null}
    </span>
  );
};

export const AddContact: React.FC<{ kind: "email" | "website"; onPress: () => void }> = ({ kind, onPress }) => (
  <button type="button" className="cl19-miss" data-cl19={`add-${kind}`}
    onClick={(e) => { e.stopPropagation(); onPress(); }} onKeyDown={(e) => e.stopPropagation()}>
    <CellIcon kind={kind === "email" ? "mail" : "web"} /><span>{kind === "email" ? "Add email" : "Add website"}</span>
  </button>
);
