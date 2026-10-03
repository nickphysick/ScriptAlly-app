/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The Contact list with nothing in it (living headers §3; ref living-headers-v2.html, State Empty).
 *
 * ⚠️ NO PAGE TITLE AND NO RULE, AND EVERYTHING ELSE IN THE SAME PLACE. The eyebrow names the page; the
 * heading is the situation; the two buttons and the hawk stand where they stand on the populated
 * page, because this renders the same shared header in the same `.clv-group` box.
 *
 * ⚠️ ONLY FOR AN ACCOUNT WITH NO AGENTS. A list filtered to nothing keeps its hero and says "No agents
 * match." inside the list; the page decides that on the account's own count, never on visible rows.
 */
import React from "react";
import { PageHeader } from "../../shell/PageHeader";
import type { LivingRun } from "../../../lib/livingLine";
import { CONTACT_HAWK } from "./ContactHeader";
import "../../shell/livingExhibit.css";

export const CONTACT_EMPTY_HEADING = "No agents on your list yet";

export function contactEmptySubline(manuscriptTitle: string | null): LivingRun[] {
  return manuscriptTitle
    ? ["Add the agents you’re considering for ", { ms: manuscriptTitle }, ", with what each one asks for."]
    : ["Add the agents you’re considering, with what each one asks for."];
}

/* the genre nouns a reader counts ("thrillers"); everything else reads as a mass noun ("fantasy") */
const COUNTED: Record<string, string> = { thriller: "thrillers", mystery: "mysteries", western: "westerns", memoir: "memoirs", romance: "romance" };

/** "Find agents who want thrillers ›" — the book's own genre, or no genre named. */
export function discoverHintText(genre: string | null | undefined): string {
  const g = (genre ?? "").trim().toLowerCase();
  if (!g) return "Find agents in Discover ›";
  return `Find agents who want ${COUNTED[g] ?? g} ›`;
}

export interface ContactEmptyProps {
  manuscriptTitle: string | null;
  genre: string | null;
  onAdd: () => void;
  /** Discover, when the page can reach it — the line is OMITTED when it cannot (§3). */
  onDiscover?: () => void;
  addRef?: React.Ref<HTMLButtonElement>;
  actionsPopover?: React.ReactNode;
  exhibition?: React.ReactNode;
}

/* v12 P2 (3 Oct): the "Paste a link" pill retired with the quick-add (the go-ahead's ask 2),
   and the empty state's secondary is the SAME Discover pill the populated header wears —
   LH7's same-size claim is what holds the two states to one shape. */
export const ContactEmpty: React.FC<ContactEmptyProps> = ({ manuscriptTitle, genre, onAdd, onDiscover, addRef, actionsPopover, exhibition }) => (
  <div className="clv-group" data-clv-empty="">
    <PageHeader
      variant="full"
      title="Contact list"
      living={{ count: 0, copy: () => ({ headline: "", subline: [] }), empty: { heading: CONTACT_EMPTY_HEADING, subline: contactEmptySubline(manuscriptTitle) } }}
      primaryRef={addRef}
      primary={{ label: "+ Add an agent", onClick: onAdd }}
      secondary={onDiscover ? { label: "Discover agents", onClick: onDiscover } : undefined}
      art={<img src={`${CONTACT_HAWK.src}?v=${CONTACT_HAWK.version}`} width={CONTACT_HAWK.width} height={CONTACT_HAWK.height} alt="" />}
      actionsPopover={actionsPopover}
    />
    <div className="clv-empty-below">
      {exhibition}
      {onDiscover && (
        <p className="lh-hint" data-lh="hint">
          <a className="lh-hint-link" href="/agents/discover" onClick={(e) => { e.preventDefault(); onDiscover(); }}>{discoverHintText(genre)}</a>
        </p>
      )}
    </div>
  </div>
);
