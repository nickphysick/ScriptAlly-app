/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Submission packages v4 — the small parts every surface shares: the icons (the reference's own paths), the
 * split bar, and THE package card. The card is the one component the page's grid AND the drawer's form
 * preview render ("the real card component, not a copy", v3 D2).
 */
import React from "react";
import type { SubmissionPackage } from "../../../types";
import type { MatKind } from "../../../lib/packagesPage";
import { splitLabel, type Split } from "../../../lib/packageReplies";

const sv = (d: React.ReactNode) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
);
export const ICON = {
  letter: sv(<><rect x="2.5" y="4.5" width="15" height="11" rx="1.5" /><path d="m3 5.5 7 5.5 7-5.5" /></>),
  synopsis: sv(<><path d="M5 2.5h7l3.5 3.5v11.5H5z" /><path d="M7.5 9h5M7.5 11.5h5M7.5 14h3" /></>),
  version: sv(<path d="M10 5c-2-1.5-4.5-1.5-7-1v11c2.5-.5 5-.5 7 1 2-1.5 4.5-1.5 7-1V4c-2.5-.5-5-.5-7 1zM10 5v11" />),
  parcel: sv(<><path d="M3 6.5 10 3l7 3.5v7L10 17l-7-3.5z" /><path d="m3 6.5 7 3.5 7-3.5M10 10v7" /></>),
  box: sv(<><rect x="3" y="4" width="14" height="4" rx="1" /><path d="M4.5 8v8h11V8M8 11h4" /></>),
  bars: sv(<path d="M4 16V9M8 16V5M12 16v-4M16 16V7" />),
  lock: (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.4} aria-hidden="true"><rect x="2.2" y="5.2" width="7.6" height="5.3" rx="1" /><path d="M4 5V3.8a2 2 0 0 1 4 0V5" /></svg>
  ),
  chev: <svg viewBox="0 0 10 10" fill="none" strokeWidth={1.5} aria-hidden="true"><path d="m2 3.5 3 3 3-3" /></svg>,
  search: <svg viewBox="0 0 16 16" fill="none" strokeWidth={1.6} aria-hidden="true"><circle cx="7" cy="7" r="5" /><path d="m11 11 3.5 3.5" /></svg>,
  down: sv(<path d="M10 3v13M4.5 11 10 16.5 15.5 11" />),
};
export const KIND_ICON: Record<MatKind, React.ReactNode> = { letter: ICON.letter, synopsis: ICON.synopsis, version: ICON.version };
export const KIND_ONE: Record<MatKind, string> = { letter: "Query letter", synopsis: "Synopsis", version: "Manuscript version" };

/** "14 queries" / "1 query" */
export const qs = (n: number): string => (n === 1 ? "1 query" : `${n} queries`);
export const pkgs = (n: number): string => (n === 1 ? "1 package" : `${n} packages`);

/** The split bar: four segments in key order, each `flex: count`. An unsent row draws the dashed empty bar. */
export const SplitBar: React.FC<{ s: Split | null; className?: string }> = ({ s, className }) => {
  if (!s || !s.sent) return <span className={`pk4-cb pk4-cb--none${className ? ` ${className}` : ""}`} data-pk4="split" data-empty="" aria-hidden="true" />;
  const segs: [keyof Split, string][] = [["requests", "rq"], ["otherReplies", "rp"], ["out", "wt"], ["noReply", "nr"]];
  return (
    <span className={`pk4-cb${className ? ` ${className}` : ""}`} data-pk4="split" role="img" aria-label={splitLabel(s)}>
      {segs.map(([k, c]) => ((s[k] as number) > 0 ? <u key={c} className={`pk4-${c}`} data-seg={c} style={{ flex: `${s[k] as number} 1 0` }} /> : null))}
    </span>
  );
};

export const SplitKey: React.FC<{ long?: boolean }> = ({ long }) => (
  <span className="pk4-key" data-pk4="key">
    <span><u className="pk4-rq" />{long ? "Requests: a partial, a full or an offer" : "Requests"}</span>
    <span><u className="pk4-rp" />{long ? "Other replies: a pass" : "Other replies"}</span>
    <span><u className="pk4-wt" />Still waiting</span>
    <span><u className="pk4-nr" />No reply</span>
  </span>
);

export interface CardSlots { letter: string | null; synopsis: string | null; version: string | null }

/**
 * THE package card. A `<button>` on the page (opens the drawer on What's inside); a `<div>` in the form's
 * preview. `split` is the CURRENT edition's (v3 B1).
 */
export const PkgCard4: React.FC<{
  pkg: Pick<SubmissionPackage, "id" | "packageName" | "status" | "otherMaterials"> & { firstSentAt?: string };
  slots: CardSlots;
  split: Split | null;
  forNew: boolean;
  open?: boolean;
  preview?: boolean;
  onOpen?: () => void;
}> = ({ pkg, slots, split, forNew, open, preview, onOpen }) => {
  const retired = pkg.status === "Retired";
  const sent = !!pkg.firstSentAt;
  const name = pkg.packageName.trim();
  const body = (
    <>
      <span className="pk4-pch">
        <span className={`pk4-pcn${name ? "" : " pk4-pcn--none"}`} data-pk4="card-name">{name || "Your package's name"}</span>
        {forNew ? <span className="pk4-tag pk4-tag--use" data-pk4="tag-use">For new queries</span> : null}
        <span className={`pk4-tag ${retired ? "pk4-tag--ret" : sent ? "pk4-tag--sent" : "pk4-tag--new"}`} data-pk4="tag-state">
          {retired ? "Retired" : sent ? <>{ICON.lock}Sent</> : "Not sent yet"}
        </span>
      </span>
      <span className="pk4-slots">
        {(["letter", "synopsis", "version"] as const).map((k) => (
          <span key={k} className="pk4-slot" data-pk4="slot" data-k={k}>
            <span className="pk4-ti">{KIND_ICON[k]}</span>
            <span className="pk4-sl">
              <span className="pk4-mono">{KIND_ONE[k]}</span>
              {slots[k] ? <strong>{slots[k]}</strong>
                : <em className="pk4-none">{k === "version" ? "Not recorded" : k === "synopsis" ? "No synopsis" : "None"}</em>}
            </span>
          </span>
        ))}
      </span>
      {pkg.otherMaterials?.trim() ? <span className="pk4-also" data-pk4="also"><span className="pk4-mono">Also sends</span>{pkg.otherMaterials.trim()}</span> : null}
      <span className="pk4-pcf" data-pk4="card-foot">
        <span><span className="pk4-mono">Sent with</span><b data-pk4="foot-sent">{split && split.sent ? qs(split.sent) : "–"}</b></span>
        <span><span className="pk4-mono">Replies</span><b data-pk4="foot-replies">{split && split.sent ? split.replies : "–"}</b></span>
        <span><span className="pk4-mono">Requests</span><b data-pk4="foot-requests">{split && split.sent ? split.requests : "–"}</b></span>
        <SplitBar s={split} className="pk4-cb--card" />
      </span>
    </>
  );
  const attrs = { "data-pk4": "card", "data-id": pkg.id, "data-retired": retired ? "" : undefined, "data-open": open ? "" : undefined } as Record<string, string | undefined>;
  if (preview || !onOpen) return <div className="pk4-pc pk4-pc--preview" {...attrs}>{body}</div>;
  return <button type="button" className="pk4-pc" {...attrs} onClick={onOpen}>{body}</button>;
};
